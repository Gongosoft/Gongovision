import mime from 'mime/lite';
import { env } from 'cloudflare:workers';
import { routeAgentRequest } from 'agents';
import { handleRssRequest } from '@/server/rss.ts';
import { getTwitchLiveChannels } from '@/server/twitch.ts';
import { handleB2Request, listVODs } from '@/server/b2.ts';
import { checkLiveStatus, handleStreamRequest } from '@/server/angelthump.ts';

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
		const { pathname, searchParams } = new URL(request.url);

		if (pathname.startsWith('/b2/')) {
			return handleB2Request(request);
		}

		if (pathname === '/livestreams') {
			const twitch = await getTwitchLiveChannels(
				(searchParams.get('channels') || (await env.CONFIG.get('twitch')))?.split(',').filter(Boolean) ?? []
			);

			let angelthump: string[] = [];
			if (await checkLiveStatus()) {
				angelthump = ['GreatSphynx'];
			}

			return Response.json({ twitch, angelthump });
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

		if (pathname.startsWith('/stream/')) {
			const streamResponse = await handleStreamRequest(pathname, request);
			if (streamResponse) {
				return streamResponse;
			}
		}

		if (pathname === '/vods/list') {
			return listVODs();
		}

		if (pathname.startsWith('/vods/thumbnail/')) {
			const thumbKey = decodeURIComponent(pathname.replace('/vods/thumbnail/', ''));
			const object = await env.THUMBNAILS.get(thumbKey, { type: 'arrayBuffer' });
			if (!object) {
				return new Response(null, { status: 404 });
			}
			const ext = thumbKey.split('.').pop()?.toLowerCase() ?? '';
			return new Response(object, {
				headers: { 'Content-Type': mime.getType(ext) ?? 'application/octet-stream' }
			});
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
