import { env } from 'cloudflare:workers';
import type { OwncastStatus } from '@/types/owncast.d.ts';

export async function getOwncastStreamInfo(): Promise<OwncastStatus | null> {
	const url = new URL('/api/status', OWNCAST.HOST);
	url.protocol = 'http:';
	try {
		const res = await env.OWNCAST.fetch(url);
		if (!res.ok) {
			return null;
		}
		return await res.json<OwncastStatus>();
	} catch {
		return null;
	}
}

export async function getOwncastLiveStatus(): Promise<boolean | null> {
	const status = await getOwncastStreamInfo();
	return status?.online ?? null;
}
