import { env } from 'cloudflare:workers';
import { writeM3U } from '@iptv/playlist';
import { routeAgentRequest } from 'agents';
import { getXMLTV } from '@/server/xmltv.ts';
import { handleRssRequest } from '@/server/rss.ts';
import { handleB2Request, listObjects } from '@/server/b2.ts';
import { getOwncastLiveStatus, getOwncastStreamInfo } from '@/server/owncast.ts';
import { getAngelThumpM3U8, getAngelThumpStreamInfo } from '@/server/angelthump.ts';
import type { StreamInfoResponse } from '@/types/stream.d.ts';

export { Notifications } from '@/server/notifications.ts';

const osmos = Object.values(
	import.meta.glob<string>('@osmo/*', {
		eager: true,
		import: 'default',
		query: '?no-inline'
	})
);

export default {
	async fetch(request: Request): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (pathname.startsWith('/b2/')) {
			return handleB2Request(request);
		}

		if (pathname === '/clips/list') {
			const objects = await listObjects('clips/');
			return Response.json(objects ?? [], { status: objects ? 200 : 502 });
		}

		if (pathname.startsWith('/notification/')) {
			const doID = env.CALLOFTHEGONGO.idFromName('singleton');
			return env.CALLOFTHEGONGO.get(doID).fetch(request);
		}

		if (pathname === '/osmo') {
			const osmo = new URL(osmos[Math.floor(Math.random() * osmos.length)]!, request.url);
			return Response.redirect(osmo.toString(), 307);
		}

		if (pathname.startsWith('/r2/')) {
			const object = await env.R2.get(pathname.slice('/r2/'.length));
			if (!object) {
				return new Response('daxMug', { status: 404 });
			}
			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set('etag', object.httpEtag);
			return new Response('body' in object ? object.body : undefined, {
				status: 'body' in object ? 200 : 412,
				headers
			});
		}

		if (pathname.match(/\/rss\/(?:(?:html)|(?:opml)|(?:xml))/g)) {
			return handleRssRequest(request);
		}

		switch (pathname) {
			case '/stream/info': {
				const [owncast, angelthump] = await Promise.all([getOwncastStreamInfo(), getAngelThumpStreamInfo()]);
				return Response.json({ owncast, angelthump } satisfies StreamInfoResponse);
			}
			case '/stream/m3u': {
				const { origin } = new URL(request.url);
				const body = writeM3U({
					channels: [
						{ name: 'GreatSphynx (AngelThump)', url: `${origin}/stream/m3u8` },
						{ name: 'GreatSphynx (Owncast)', url: `${OWNCAST.HOST}/hls/stream.m3u8` }
					]
				});
				return new Response(body, {
					headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' }
				});
			}
			case '/stream/m3u8': {
				if ((await getOwncastLiveStatus()) === true) {
					return new Response(null, {
						status: 307,
						headers: {
							'Location': `${OWNCAST.HOST}/hls/stream.m3u8`,
							'Cache-Control': 'no-store'
						}
					});
				}
				const region = new URL(request.url).searchParams.get('region');
				const manifest = await getAngelThumpM3U8(request, region);
				if (manifest === null) {
					return new Response(null, { status: 502 });
				}
				return new Response(manifest, {
					headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' }
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
				break;
			}
		}

		if (pathname === '/vods/list') {
			const objects = await listObjects('twitch_vods/');
			if (!objects) {
				return new Response(null, { status: 502 });
			}
			return Response.json(
				objects.filter((object) => !object.name.includes('/') && !object.name.endsWith('.thumb'))
			);
		}

		if (pathname === '/.well-known/did.json' || pathname.startsWith('/xrpc/')) {
			const serverURL = new URL(request.url);
			serverURL.protocol = 'http:';
			return env.GONGSKY.fetch(new Request(serverURL, request));
		}

		const agentResponse = await routeAgentRequest(request, env);
		if (agentResponse) {
			return agentResponse;
		}

		return env.ASSETS.fetch(request);
	}
} satisfies ExportedHandler<Env>;
