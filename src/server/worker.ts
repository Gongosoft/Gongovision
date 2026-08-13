import { env } from 'cloudflare:workers';
import { routeAgentRequest } from 'agents';
import { handleRssRequest } from '@/server/rss.ts';
import { handleStreamRequest } from '@/server/angelthump.ts';
import { handleB2Request, listObjects } from '@/server/b2.ts';

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

		if (pathname.startsWith('/stream/')) {
			const streamResponse = await handleStreamRequest(pathname, request);
			if (streamResponse) {
				return streamResponse;
			}
		}

		if (pathname === '/vods/list') {
			const objects = await listObjects('vods/');
			return Response.json(objects ?? [], { status: objects ? 200 : 502 });
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
