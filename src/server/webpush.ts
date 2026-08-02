import { env } from 'cloudflare:workers';
import webpush from 'web-push';
import type { NotificationPayload, PushSubscription } from '@/types/notification';

let initialized = false;

export function init(): void {
	if (initialized) {
		return;
	}
	webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
	initialized = true;
}

export async function send(
	sub: PushSubscription,
	payload: NotificationPayload
): Promise<{ ok: true } | { ok: false; status: number }> {
	try {
		await webpush.sendNotification(sub, JSON.stringify(payload));
		return { ok: true };
	} catch (error: unknown) {
		const status = error instanceof webpush.WebPushError ? error.statusCode : 0;
		return { ok: false, status };
	}
}
