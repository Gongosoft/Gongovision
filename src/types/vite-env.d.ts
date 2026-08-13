/// <reference types="vite/client" />

import type { NotificationPayload } from '@/types/notification.d.ts';

declare global {
	const ANGELTHUMP: {
		API: string;
		CDN: {
			amsterdam: { label: string; subdomain: string };
			frankfurt: { label: string; subdomain: string };
			newyork: { label: string; subdomain: string };
			sanfrancisco: { label: string; subdomain: string };
			singapore: { label: string; subdomain: string };
		};
		CHANNEL: string;
		IDENTIFIER: string;
		PLAYER: string;
		VIGOR: string;
		WS: string;
	};
	const BASE_URL: string;
	const LIVE_NOTIFICATION: NotificationPayload;
	const TWITCH_CHANNEL: string;
}
