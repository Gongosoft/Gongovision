import { env } from 'cloudflare:workers';
import { writeXmltv } from '@iptv/xmltv';
import type { Xmltv, XmltvProgramme } from '@iptv/xmltv';

interface AngelThumpStream {
	type?: string;
}

export async function checkLiveStatus(channel: string): Promise<boolean> {
	try {
		const res = await fetch(`${ANGELTHUMP.API}/streams?username=${encodeURIComponent(channel)}`);
		if (!res.ok) {
			return false;
		}
		const data = await res.json<AngelThumpStream[]>();
		return data.length > 0 && data[0]?.type === 'live';
	} catch {
		return false;
	}
}

export async function getToken(): Promise<{ token: string; expiresAt: number } | null> {
	const cached = await env.CONFIG.get('angelthump-token', 'json');
	const parsed = cached as { token: string; expiresAt: number } | null;

	if (parsed?.token && parsed?.expiresAt && Date.now() < parsed.expiresAt - 60_000) {
		return parsed;
	}

	const res = await fetch(`${ANGELTHUMP.VIGOR}/${ANGELTHUMP.CHANNEL}/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'Identifier': ANGELTHUMP.IDENTIFIER }
	});

	if (!res.ok) {
		return null;
	}

	const data = await res.json<{ token?: string; expiresIn?: number }>();
	if (!data.token) {
		return null;
	}

	const expiresAt = data.expiresIn ?? Date.now() + 86_400_000;
	const ttl = Math.max(60, Math.floor((expiresAt - Date.now()) / 1000) - 60);

	await env.CONFIG.put('angelthump-token', JSON.stringify({ token: data.token, expiresAt }), { expirationTtl: ttl });

	return { token: data.token, expiresAt };
}

export function getHLS(token: string): string {
	return `${ANGELTHUMP.VIGOR}/hls/${ANGELTHUMP.CHANNEL}.m3u8?token=${encodeURIComponent(token)}`;
}

export async function getM3U8(token: string): Promise<Response> {
	return await fetch(getHLS(token));
}

export function getXMLTV(): string {
	const NOW = new Date();
	const TODAY = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()));

	const programmes: XmltvProgramme[] = [];
	for (let day = 0; day < 7; day++) {
		const offset = day * 86_400_000;
		const start = new Date(TODAY.getTime() + offset + 5.5 * 3_600_000);
		const stop = new Date(TODAY.getTime() + offset + 11.5 * 3_600_000);

		programmes.push({
			channel: 'threadfin-f8110edc26333d001f1c131c79d1e9ca',
			start,
			stop,
			title: [{ _value: 'GreatSphynx', lang: 'en' }],
			subTitle: [{ _value: 'no guarantee', lang: 'en' }],
			desc: [
				{
					_value: 'Gongo is a 2D side-scrolling platformer where the player goes through levels killing enemies and saving the princess. Each level has amazing hand-picked worlds. On each of the levels, a princess is hidden, which must be rescued and delivered to your castle, cleaning up enemies along the way.',
					lang: 'en'
				}
			],
			category: [{ _value: 'Series', lang: 'en' }],
			icon: [{ src: 'https://cdn.bergbok.computer/images/Spingus.webp' }],
			previouslyShown: {}
		});
	}

	const xmltv: Xmltv = {
		date: NOW,
		generatorInfoName: 'Cloudflare Workers',
		channels: [
			{
				id: 'threadfin-f8110edc26333d001f1c131c79d1e9ca',
				displayName: [{ _value: 'GreatSphynx' }, { _value: '420420' }, { _value: 'Gongo' }],
				icon: [{ src: 'https://cdn.bergbok.computer/images/Spingus.webp' }]
			}
		],
		programmes
	};

	return writeXmltv(xmltv);
}

export async function handleStreamRequest(pathname: string): Promise<Response | null> {
	if (pathname === '/stream/direct') {
		const result = await getToken();
		if (!result) {
			return new Response(null, { status: 502 });
		}
		const maxAge = Math.max(0, Math.floor((result.expiresAt - Date.now()) / 1000) - 3600);
		return new Response(null, {
			status: 307,
			headers: {
				'Location': getHLS(result.token),
				'Cache-Control': `public, max-age=${maxAge}`
			}
		});
	}

	if (pathname === '/stream/m3u') {
		const result = await getToken();
		if (!result) {
			return new Response(null, { status: 502 });
		}
		const hlsUrl = getHLS(result.token);
		const maxAge = Math.max(0, Math.floor((result.expiresAt - Date.now()) / 1000) - 3600);
		const body = `#EXTM3U\n#EXTINF:-1, GreatSphynx\n${hlsUrl}`;
		return new Response(body, {
			headers: {
				'Content-Type': 'application/vnd.apple.mpegurl',
				'Cache-Control': `public, max-age=${maxAge}`
			}
		});
	}

	if (pathname === '/stream/m3u8') {
		const result = await getToken();
		if (!result) {
			return new Response(null, { status: 502 });
		}
		const upstream = await getM3U8(result.token);
		const maxAge = Math.max(0, Math.floor((result.expiresAt - Date.now()) / 1000) - 3600);
		return new Response(upstream.body, {
			status: upstream.status,
			headers: {
				'Content-Type': 'application/vnd.apple.mpegurl',
				'Cache-Control': `public, max-age=${maxAge}`
			}
		});
	}

	if (pathname === '/stream/xmltv') {
		return new Response(getXMLTV(), {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=86400'
			}
		});
	}

	return null;
}
