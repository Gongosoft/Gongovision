/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

interface ExtendedNotificationOptions extends NotificationOptions {
	image?: string;
}

self.addEventListener('install', () => {
	void self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		(async (): Promise<void> => {
			try {
				const cacheNames = await caches.keys();
				for (const cacheName of cacheNames) {
					await caches.delete(cacheName);
				}
			} catch {
				/*_*/
			}
			await self.clients.claim();
		})()
	);
});

self.addEventListener('push', (event: PushEvent) => {
	let payload: Record<string, unknown> = {};

	try {
		payload = event.data?.json() as Record<string, unknown>;
	} catch {
		payload = { body: event.data?.text() };
	}

	const title = (payload.title as string) || 'Gongo';
	const options: ExtendedNotificationOptions = {
		body: (payload.body as string) || '',
		icon: (payload.icon as string) || undefined,
		badge: (payload.badge as string) || undefined,
		image: (payload.image as string) || undefined,
		tag: (payload.tag as string) || undefined,
		data: payload.data as Record<string, string> | undefined,
		requireInteraction: true,
		silent: false
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
	event.notification.close();

	const location = (event.notification.data as Record<string, string> | undefined)?.url ?? '/stream';

	const handleClick = async (): Promise<void> => {
		const windowClients = await self.clients.matchAll({
			type: 'window',
			includeUncontrolled: true
		});
		for (const client of windowClients) {
			if (client.url.includes(location) && 'focus' in client) {
				await client.focus();
				return;
			}
		}
		if (self.clients.openWindow) {
			await self.clients.openWindow(location);
		}
	};

	event.waitUntil(handleClick());
});
