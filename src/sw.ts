/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import type { PrecacheEntry } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: (PrecacheEntry | string)[];
};

interface ExtendedNotificationOptions extends NotificationOptions {
	image?: string;
}

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
	void self.skipWaiting();
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

	const urlToOpen = (event.notification.data as Record<string, string> | undefined)?.url ?? '/stream';

	const handleClick = async (): Promise<void> => {
		const windowClients = await self.clients.matchAll({
			type: 'window',
			includeUncontrolled: true
		});
		for (const client of windowClients) {
			if (client.url.includes(urlToOpen) && 'focus' in client) {
				await client.focus();
				return;
			}
		}
		if (self.clients.openWindow) {
			await self.clients.openWindow(urlToOpen);
		}
	};

	event.waitUntil(handleClick());
});
