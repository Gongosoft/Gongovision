import { env, waitUntil } from 'cloudflare:workers';
import type { AngelThumpStreamResponse, AngelThumpVigorResponse } from '@/types/angelthump.d.ts';

const TOKEN_CACHE_KEY = `${ANGELTHUMP.CHANNEL}-token`;

export async function getAngelThumpLiveStatus(): Promise<boolean | null> {
	try {
		const res = await fetch(`${ANGELTHUMP.API}/streams?username=${encodeURIComponent(ANGELTHUMP.CHANNEL)}`);
		if (!res.ok) {
			return null;
		}
		const data = await res.json<AngelThumpStreamResponse[]>();
		return data.length > 0 && data[0]?.type === 'live';
	} catch {
		return null;
	}
}

async function cacheToken(token: AngelThumpVigorResponse): Promise<void> {
	const cached = await env.KV.get<AngelThumpVigorResponse>(TOKEN_CACHE_KEY, 'json');
	if (cached?.token !== token.token) {
		await env.KV.put(TOKEN_CACHE_KEY, JSON.stringify(token));
	}
}

export async function getToken(): Promise<AngelThumpVigorResponse | null> {
	try {
		const res = await fetch(`${ANGELTHUMP.VIGOR}/${ANGELTHUMP.CHANNEL}/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Identifier': ANGELTHUMP.IDENTIFIER },
			signal: AbortSignal.timeout(3000)
		});

		if (res.ok) {
			const data = await res.json<AngelThumpVigorResponse>();
			if (data.token) {
				waitUntil(cacheToken(data));
				return data;
			}
		}
	} catch {
		/*_*/
	}

	try {
		return await env.KV.get<AngelThumpVigorResponse>(TOKEN_CACHE_KEY, 'json');
	} catch {
		return null;
	}
}

function getHLS(token: string): string {
	return `${ANGELTHUMP.VIGOR}/hls/${ANGELTHUMP.CHANNEL}.m3u8?token=${encodeURIComponent(token)}`;
}

export async function getAngelThumpM3U8(request: Request, region?: string | null): Promise<string | null> {
	const tokenResult = await getToken();
	const token = tokenResult?.token;
	if (!token) {
		return null;
	}

	const headers = new Headers();
	const ip = request.headers.get('CF-Connecting-IP');
	if (ip) {
		headers.set('X-Forwarded-For', ip);
	}

	const res = await fetch(getHLS(token), { headers });

	if (!res.ok) {
		return null;
	}

	const text = await res.text();
	if (!text.trimStart().startsWith('#EXTM3U')) {
		console.error('getAngelThumpM3U8: response does not start with #EXTM3U', text.slice(0, 200));
		return null;
	}

	const cdn = region ? ANGELTHUMP.CDN[region as keyof typeof ANGELTHUMP.CDN] : undefined;
	return cdn
		? text.replace(/https?:\/\/[^/\s]+\.angelthump\.com\//g, `https://${cdn.subdomain}.angelthump.com/`)
		: text;
}

export async function getAngelThumpStreamInfo(): Promise<AngelThumpStreamResponse | null> {
	const cacheKey = `${ANGELTHUMP.CHANNEL}-stream-info`;
	const cached = await env.KV.get<AngelThumpStreamResponse>(cacheKey, 'json');
	if (cached?.createdAt) {
		return cached;
	}

	try {
		const res = await fetch(`${ANGELTHUMP.API}/streams?username=${encodeURIComponent(ANGELTHUMP.CHANNEL)}`);
		if (!res.ok) {
			return null;
		}
		const [stream] = await res.json<AngelThumpStreamResponse[]>();
		if (!stream || stream.type !== 'live') {
			return null;
		}

		await env.KV.put(cacheKey, JSON.stringify(stream), { expirationTtl: 300 });
		return stream;
	} catch {
		return null;
	}
}
