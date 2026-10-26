import { env } from 'cloudflare:workers';
import { Feed } from 'feed';
import type { StreamEvent } from '@/types/stream.d.ts';

const FEED_ITEMS = 50;

export async function recordStreamEvent(db: D1Database, event: Omit<StreamEvent, 'id'>): Promise<boolean> {
	const result = await db
		.prepare(
			`INSERT INTO stream_events (status, source, occurred_at)
			SELECT ?1, ?2, ?3
			WHERE (SELECT status FROM stream_events ORDER BY id DESC LIMIT 1) IS NOT ?1`
		)
		.bind(event.status, event.source, event.occurredAt)
		.run();

	return (result.meta.changes ?? 0) > 0;
}

async function getStreamEvents(db: D1Database, limit: number = FEED_ITEMS): Promise<StreamEvent[]> {
	const { results } = await db
		.prepare('SELECT id, status, source, occurred_at AS occurredAt FROM stream_events ORDER BY id DESC LIMIT ?')
		.bind(limit)
		.all<StreamEvent>();

	return results;
}

async function getETag(body: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
	const hex = Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, '0'));

	return `W/"${hex.join('')}"`;
}

/** `If-None-Match` may carry a comma-separated list, and weak/strong forms are equal */
function etagMatches(header: string | null, etag: string): boolean {
	if (header === null) {
		return false;
	}

	const bare = etag.replace(/^W\//, '');
	return header.split(',').some((value) => value.trim() === '*' || value.trim().replace(/^W\//, '') === bare);
}

export function buildStreamFeed(events: StreamEvent[], origin: string): string {
	const streamURL = `${origin}/stream`;

	const feed = new Feed({
		id: streamURL,
		title: 'GreatSphynx Streams',
		description: 'Live/offline notifications for streams on gongo.tv',
		link: streamURL,
		language: 'en',
		ttl: 1,
		updated: new Date(events[0]?.occurredAt ?? Date.now()),
		generator: false,
		feedLinks: { rss: `${streamURL}/rss` },
		favicon: `${origin}/favicon/favicon.webp`
	});

	for (const event of events) {
		feed.addItem({
			title: `GreatSphynx has ${event.status === 'online' ? 'started' : 'stopped'} streaming!`,
			id: `urn:gongo:stream:${event.id}`,
			link: streamURL,
			description: event.status === 'online' ? LIVE_NOTIFICATION.title : "gongo'd",
			date: new Date(event.occurredAt),
			category: [{ name: event.status }]
		});
	}

	return feed.rss2();
}

export async function handleStreamRssRequest(request: Request): Promise<Response> {
	try {
		const events = await getStreamEvents(env.DB);
		const body = buildStreamFeed(events, new URL(request.url).origin);
		const etag = await getETag(body);

		if (etagMatches(request.headers.get('If-None-Match'), etag)) {
			return new Response(null, {
				status: 304,
				headers: { 'ETag': etag, 'Cache-Control': 'public, max-age=60' }
			});
		}

		return new Response(body, {
			headers: {
				'Content-Type': 'application/rss+xml; charset=utf-8',
				'Cache-Control': 'public, max-age=60',
				'ETag': etag
			}
		});
	} catch (error) {
		console.error('handleStreamRssRequest failed:', error);
		return new Response('stream status feed unavailable', {
			status: 503,
			headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' }
		});
	}
}
