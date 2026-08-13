import { AwsClient } from 'aws4fetch';
import { env } from 'cloudflare:workers';
import { XMLParser } from 'fast-xml-parser';
import type { B2ListResponse, B2Object } from '@/types/b2.d.ts';

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

export async function listObjects(
	prefix: string,
	continuationToken?: string,
	objects: B2Object[] = []
): Promise<B2Object[] | null> {
	const b2URL = new URL(`https://${env.B2_BUCKET_NAME}.${env.B2_ENDPOINT}/`);
	b2URL.searchParams.set('list-type', '2');
	b2URL.searchParams.set('prefix', prefix);
	if (continuationToken) {
		b2URL.searchParams.set('continuation-token', continuationToken);
	}

	const signed = await b2().sign(b2URL.toString(), { method: 'GET', headers: new Headers() });
	const res = await fetch(signed);
	if (!res.ok) {
		console.error(`B2 listObjects (${prefix}) failed: ${res.status}`);
		return null;
	}

	const xml = await res.text();
	const parser = new XMLParser({
		isArray: (tag: string): boolean => tag === 'Contents'
	});
	const parsed: B2ListResponse = parser.parse(xml);
	const result = parsed.ListBucketResult;

	for (const item of result.Contents ?? []) {
		if (!item.Key || item.Key.endsWith('/')) {
			continue;
		}
		const key = item.Key.replace(new RegExp(`^${prefix}`), '');
		objects.push({
			name: key.replace(/\.[^.]+$/, ''),
			url: `/b2/${prefix}${encodeURIComponent(key)}`,
			size: item.Size || 0
		});
	}

	if (result.IsTruncated && result.NextContinuationToken) {
		return listObjects(prefix, result.NextContinuationToken, objects);
	}

	return objects;
}
