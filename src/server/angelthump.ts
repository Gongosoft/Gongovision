import { env } from 'cloudflare:workers';
import { writeXmltv } from '@iptv/xmltv';
import type { Xmltv, XmltvProgramme } from '@iptv/xmltv';
import type { AngelThumpStreamResponse, AngelThumpVigorResponse } from '@/types/angelthump.d.ts';

export async function checkLiveStatus(): Promise<boolean> {
	try {
		const res = await fetch(`${ANGELTHUMP.API}/streams?username=${encodeURIComponent(ANGELTHUMP.CHANNEL)}`);
		if (!res.ok) {
			return false;
		}
		const data = await res.json<AngelThumpStreamResponse[]>();
		return data.length > 0 && data[0]?.type === 'live';
	} catch {
		return false;
	}
}

export async function getToken(): Promise<AngelThumpVigorResponse | null> {
	const res = await fetch(`${ANGELTHUMP.VIGOR}/${ANGELTHUMP.CHANNEL}/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'Identifier': ANGELTHUMP.IDENTIFIER }
	});

	if (!res.ok) {
		return null;
	}

	const data = await res.json<AngelThumpVigorResponse>();
	if (!data.token) {
		return null;
	}

	return data;
}

export function getHLS(token: string): string {
	return `${ANGELTHUMP.VIGOR}/hls/${ANGELTHUMP.CHANNEL}.m3u8?token=${encodeURIComponent(token)}`;
}

export async function getM3U8(request: Request, region?: string | null): Promise<Response> {
	const tokenResult = await getToken();
	const token = tokenResult?.token;
	if (!token) {
		return new Response(null, { status: 502 });
	}

	const headers = new Headers();
	const ip = request.headers.get('CF-Connecting-IP');
	if (ip) {
		headers.set('X-Forwarded-For', ip);
	}

	const res = await fetch(getHLS(token), { headers });

	if (!res.ok) {
		return new Response(null, { status: 502 });
	}

	const text = await res.text();
	if (!text.trimStart().startsWith('#EXTM3U')) {
		console.error('getM3U8: response does not start with #EXTM3U', text.slice(0, 200));
		return new Response(null, { status: 502 });
	}

	const cdn = region ? ANGELTHUMP.CDN[region as keyof typeof ANGELTHUMP.CDN] : undefined;
	const manifest = cdn
		? text.replace(/https?:\/\/[^/\s]+\.angelthump\.com\//g, `https://${cdn.subdomain}.angelthump.com/`)
		: text;

	return new Response(manifest, {
		status: res.status,
		headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
	});
}

async function getStreamInfo(): Promise<Response> {
	const cacheKey = `${ANGELTHUMP.CHANNEL}-stream-info`;
	const cached = await env.CONFIG.get(cacheKey, 'json');
	const parsed = cached as AngelThumpStreamResponse | null;
	if (parsed?.createdAt) {
		return Response.json(parsed);
	}

	try {
		const res = await fetch(`${ANGELTHUMP.API}/streams?username=${encodeURIComponent(ANGELTHUMP.CHANNEL)}`);
		if (!res.ok) {
			return new Response(null, { status: 502 });
		}
		const [stream] = await res.json<AngelThumpStreamResponse[]>();
		if (!stream || stream.type !== 'live') {
			return new Response(null, { status: 502 });
		}

		await env.CONFIG.put(cacheKey, JSON.stringify(stream), { expirationTtl: 300 });
		return Response.json(stream);
	} catch {
		return new Response(null, { status: 502 });
	}
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

export async function handleStreamRequest(pathname: string, request: Request): Promise<Response | null> {
	switch (pathname) {
		case '/stream/direct': {
			const result = await getToken();
			if (!result?.token) {
				return new Response(null, { status: 502 });
			}
			return new Response(null, {
				status: 307,
				headers: {
					'Location': getHLS(result.token),
					'Cache-Control': 'no-store'
				}
			});
		}
		case '/stream/info': {
			return getStreamInfo();
		}
		case '/stream/m3u': {
			const result = await getToken();
			if (!result?.token) {
				return new Response(null, { status: 502 });
			}
			const body = `#EXTM3U\n#EXTINF:-1, GreatSphynx\n${getHLS(result.token)}`;
			return new Response(body, {
				headers: {
					'Content-Type': 'application/vnd.apple.mpegurl',
					'Cache-Control': 'no-store'
				}
			});
		}
		case '/stream/m3u8': {
			const region = new URL(request.url).searchParams.get('region');
			const upstream = await getM3U8(request, region);
			return new Response(upstream.body, {
				status: upstream.status,
				headers: {
					'Content-Type': 'application/vnd.apple.mpegurl',
					'Cache-Control': 'no-store'
				}
			});
		}
		case '/stream/xmltv': {
			return new Response(getXMLTV(), {
				headers: {
					'Content-Type': 'application/xml; charset=utf-8',
					'Cache-Control': 'public, max-age=86400'
				}
			});
		}
		default: {
			return null;
		}
	}
}
