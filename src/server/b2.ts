import { env } from 'cloudflare:workers';
import { AwsClient } from 'aws4fetch';

const FORWARD_HEADERS = ['range', 'if-range', 'if-match', 'if-none-match', 'if-modified-since', 'if-unmodified-since'];

let b2Client: AwsClient | null = null;

function b2(): AwsClient {
	if (b2Client) {
		return b2Client;
	}
	b2Client = new AwsClient({
		accessKeyId: env.B2_APPLICATION_KEY_ID,
		secretAccessKey: env.B2_APPLICATION_KEY,
		service: 's3'
	});
	return b2Client;
}

export async function handleB2Request(request: Request): Promise<Response> {
	if (!['GET', 'HEAD'].includes(request.method)) {
		return new Response(null, { status: 405, statusText: 'daxMug' });
	}

	const url = new URL(request.url);
	url.pathname = url.pathname.replace(/^\/b2\//, '/');
	url.protocol = 'https:';
	url.port = '443';
	url.hostname = `${env.B2_BUCKET_NAME}.${env.B2_ENDPOINT}`;

	const proxyHeaders = new Headers();
	for (const header of FORWARD_HEADERS) {
		const value = request.headers.get(header);
		if (value) {
			proxyHeaders.set(header, value);
		}
	}

	const signed = await b2().sign(url.toString(), { method: 'GET', headers: proxyHeaders });
	const res = await fetch(signed.url, { method: signed.method, headers: signed.headers });

	if (!res.ok) {
		const body = await res.text();
		console.error(`B2 ${res.status} (${signed.url}):\n${body}`);
		return new Response(body, { status: res.status, headers: res.headers });
	}

	if (request.method === 'HEAD') {
		return new Response(null, { status: res.status, statusText: res.statusText, headers: res.headers });
	}

	const headers = new Headers(res.headers);
	headers.set('Cache-Control', 'public, max-age=31536000');
	headers.set('Accept-Ranges', 'bytes');

	return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function listVODs(): Promise<Response> {
	const b2URL = new URL(`https://${env.B2_BUCKET_NAME}.${env.B2_ENDPOINT}/`);
	b2URL.searchParams.set('list-type', '2');
	b2URL.searchParams.set('prefix', 'vods/');

	const signed = await b2().sign(b2URL.toString(), { method: 'GET', headers: new Headers() });
	const res = await fetch(signed);
	if (!res.ok) {
		console.error(`B2 listVODs failed: ${res.status}`);
		return Response.json([], { status: 502 });
	}

	const xml = await res.text();
	const keys: string[] = [];
	const sizes: number[] = [];

	for (const m of xml.matchAll(/<Key>vods\/(?<key>.+?)<\/Key>/g)) {
		if (m.groups?.key && !m.groups.key.endsWith('/')) {
			keys.push(m.groups.key);
		}
	}
	for (const m of xml.matchAll(/<Size>(?<size>\d+)<\/Size>/g)) {
		if (m.groups?.size) {
			sizes.push(Number(m.groups.size));
		}
	}

	const thumbList = await env.THUMBNAILS.list({ prefix: '' });
	const thumbKeys = new Set(thumbList.keys.map((k) => k.name));

	const vods = keys.map((key, i) => {
		const title = decodeURIComponent(key);
		const baseName = title.replace(/\.[^.]+$/, '');

		let thumbnailURL: string | null = null;
		for (const tKey of thumbKeys) {
			if (tKey.replace(/\.[^.]+$/, '') === baseName) {
				thumbnailURL = `/vods/thumbnail/${encodeURIComponent(tKey)}`;
				break;
			}
		}

		return { title, videoURL: `/b2/vods/${encodeURIComponent(key)}`, thumbnailURL, size: sizes[i] ?? 0 };
	});

	return Response.json(vods);
}
