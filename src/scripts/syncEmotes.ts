import pLimit from 'p-limit';
import { resolve } from 'path';
import { getStreamerEmotes } from 'streamer-emotes';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';

interface Emote {
	name: string;
	id: string;
	images: { url: string; version: string }[];
}

interface ManifestEntry {
	name: string;
	id: string;
	url: string;
	ext: string;
}

type Manifest = Record<string, ManifestEntry[]>;

function getExtension(url: string, contentType: string | null, provider: string): string {
	if (provider === '7tv') {
		return '.avif';
	}
	if (contentType?.includes('webp')) {
		return '.webp';
	}
	if (contentType?.includes('gif')) {
		return '.gif';
	}
	if (contentType?.includes('png')) {
		return '.png';
	}
	return /\.(?<ext>\w+)(?:\?|$)/.exec(url)?.groups?.ext ?? '.idk';
}

async function downloadEmote(emote: Emote, provider: string, dir: string): Promise<ManifestEntry | null> {
	const safeName = emote.name.length > 200 ? `${emote.name.slice(0, 190)}...${emote.id.slice(-8)}` : emote.name;

	const url =
		provider === '7tv'
			? emote.images.find((i) => i.version === '4x.avif')?.url
			: (emote.images.find((i) => i.version === '3x')?.url ??
				emote.images.find((i) => i.version === '2x')?.url ??
				emote.images.at(-1)?.url);
	if (!url) {
		return null;
	}

	for (const ext of ['.avif', '.webp', '.gif', '.png']) {
		try {
			await stat(resolve(dir, safeName + ext));
			return { name: safeName, id: emote.id, url, ext };
		} catch {
			/*_*/
		}
	}

	const res = await fetch(url, {
		headers: provider !== '7tv' ? { Accept: 'image/webp,image/avif,image/gif,image/png' } : undefined
	});
	if (!res.ok) {
		console.error(`HTTP ${res.status} - ${safeName} - (${provider})`);
		return null;
	}

	const ext = getExtension(url, res.headers.get('Content-Type'), provider);
	const buf = new Uint8Array(await res.arrayBuffer());
	await writeFile(resolve(dir, safeName + ext), buf);
	return { name: safeName, id: emote.id, url, ext };
}

const emotesDir = resolve(import.meta.dirname, '../assets/images/emotes');
const manifestPath = resolve(emotesDir, 'list.json');

let manifest: Manifest = {};
manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;

const { bttv, ffz, sevenTV } = await getStreamerEmotes('fakesphynx', {
	bttv: { globals: false },
	ffz: { globals: false },
	sevenTV: { globals: false }
});

const providers: [string, Emote[] | undefined][] = [
	['7tv', sevenTV?.channel],
	['bttv', bttv?.channel],
	['ffz', ffz?.channel]
];

const emoteURL: Record<string, (id: string) => string> = {
	'7tv': (id) => `https://7tv.app/emotes/${id}`,
	'bttv': (id) => `https://betterttv.com/emotes/${id}`,
	'ffz': (id) => `https://www.frankerfacez.com/emoticon/${id}`
};

for (const [provider, emotes] of providers) {
	if (!emotes?.length) {
		continue;
	}

	const dir = resolve(emotesDir, provider);
	await mkdir(dir, { recursive: true });

	const limit = pLimit(10);
	const results = await Promise.all(emotes.map(async (e) => limit(async () => downloadEmote(e, provider, dir))));
	const entries = results.filter((e): e is ManifestEntry => e !== null);

	const oldIDs = new Set((manifest[provider] ?? []).map((e) => e.id));
	const newIDs = new Set(entries.map((e) => e.id));
	const missing = (manifest[provider] ?? []).filter((e) => !newIDs.has(e.id));

	console.log(`${provider}: ${entries.length}/${emotes.length} synced`);

	if (missing.length > 0) {
		const link = emoteURL[provider];
		console.log(`\n${provider}: ${missing.length} no longer present:`);
		for (const m of missing) {
			console.log(`- [${m.name}](${link ? link(m.id) : m.id})`);
		}
	}

	for (const e of entries) {
		if (!oldIDs.has(e.id)) {
			manifest[provider]!.push(e);
		}
	}
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`);
