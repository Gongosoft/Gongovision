import { getStreamerEmotes } from 'streamer-emotes';
import type { Catalog, CatalogEmote, EmoteList, ThirdParty } from '@/types/emotewall.d.ts';

interface Image {
	url: string;
	version: string;
}

interface ProviderEmote {
	name: string;
	images: Image[];
	zeroWidth?: boolean;
}

interface ProviderResponse {
	channel: ProviderEmote[];
	global?: ProviderEmote[];
}

const PREFERRED = ['4x.avif', '4', '3x', '3.0'];
const HIDDEN = new Set(['ffzCursed', 'ffzW', 'ffzX', 'ffzY', 'c!', 'h!', 'l!', 'p!', 'r!', 's!', 'v!', 'w!', 'z!']);

function largest(images: Image[]): string | undefined {
	for (const version of PREFERRED) {
		const image = images.find((candidate) => candidate.version === version);
		if (image) {
			return image.url;
		}
	}
	return images.at(-1)?.url;
}

export function emptyCatalog(): Catalog {
	return { byService: { 'ffz': new Map(), 'bttv': new Map(), '7tv': new Map() }, fallback: [] };
}

export async function loadCatalog(channel: string): Promise<Catalog> {
	const catalog = emptyCatalog();
	const providers = await getStreamerEmotes(channel, { bttv: true, ffz: true, sevenTV: true });
	const services: [ThirdParty, ProviderResponse | undefined][] = [
		['7tv', providers.sevenTV],
		['bttv', providers.bttv],
		['ffz', providers.ffz]
	];
	for (const [svc, response] of services) {
		for (const scope of ['global', 'channel'] as const) {
			for (const { name, images, zeroWidth } of response?.[scope] ?? []) {
				const url = largest(images);
				if (url && !HIDDEN.has(name)) {
					catalog.byService[svc].set(name, { url, scope, zeroWidth: zeroWidth ?? false });
					if (scope === 'channel' && !zeroWidth) {
						catalog.fallback.push({ url, zwe: [] });
					}
				}
			}
		}
	}
	return catalog;
}

export function listEmotes({ byService }: Catalog): EmoteList {
	const own = (svc: ThirdParty): [string, CatalogEmote][] =>
		[...byService[svc]].filter(([, emote]) => emote.scope === 'channel');
	return {
		'7tv': own('7tv').map(([name, { url, zeroWidth }]) => ({ name, url, zeroWidth })),
		'bttv': own('bttv').map(([name, { url }]) => ({ name, url })),
		'ffz': own('ffz').map(([name, { url }]) => ({ name, url }))
	};
}
