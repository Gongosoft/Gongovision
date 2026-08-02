import { env } from 'cloudflare:workers';

function rewriteURL(raw: string, origin: string): string {
	const decoded = raw.replaceAll('&amp;', '&');
	const parsed = new URL(decoded, origin);
	const format = parsed.searchParams.get('f') || 'html';
	parsed.searchParams.delete('user');
	parsed.searchParams.delete('t');
	parsed.searchParams.delete('f');

	const path = format === 'rss' ? '/rss/xml' : `/rss/${format}`;
	const query = parsed.searchParams.toString();
	return query ? `${origin}${path}?${query}` : `${origin}${path}`;
}

async function rewriteRSS(response: Response, request: Request): Promise<Response> {
	const { origin } = new URL(request.url);
	const ct = response.headers.get('Content-Type') || '';

	if (ct.includes('html')) {
		return new HTMLRewriter()
			.on('a[href^="https://rss."], a[href*="user="]', {
				element(element: {
					getAttribute: (name: string) => string | null;
					setAttribute: (name: string, value: string) => unknown;
				}): void {
					const href = element.getAttribute('href');
					if (href) {
						element.setAttribute('href', rewriteURL(href, origin));
					}
				}
			})
			.on('form[action^="https://rss."]', {
				element(element: {
					getAttribute: (name: string) => string | null;
					setAttribute: (name: string, value: string) => unknown;
				}): void {
					const action = element.getAttribute('action');
					if (action) {
						element.setAttribute('action', rewriteURL(action, origin));
					}
				}
			})
			.transform(response);
	}

	if (ct.includes('xml') || ct.includes('rss') || ct.includes('opml')) {
		let text = await response.text();
		text = text.replace(/https:\/\/rss\.[^\s"'<>]+?\/api\/query\.php\?[^\s"'<>]+/g, (match) =>
			rewriteURL(match, origin)
		);
		if (ct.includes('opml')) {
			text = text.replace(/http:\/\/[^/\s"'<>]+\//g, 'http://rss-bridge/');
		}
		return new Response(text, {
			headers: { 'Content-Type': ct }
		});
	}

	return response;
}

export async function handleRssRequest(request: Request): Promise<Response> {
	const incoming = new URL(request.url);
	const format = incoming.pathname.split('/').pop()?.replace('xml', 'rss') || 'html';
	const target = new URL(
		`/api/query.php?user=${env.FRESHRSS_USERNAME}&t=${env.FRESHRSS_QUERY_TOKEN}&f=${format}`,
		request.url
	);
	for (const [key, value] of incoming.searchParams) {
		target.searchParams.append(key, value);
	}
	target.protocol = 'http:';
	const rss = await env.FRESHRSS.fetch(new Request(target, request));
	return rewriteRSS(rss, request);
}
