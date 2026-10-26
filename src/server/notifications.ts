import isEmail from 'validator/lib/isEmail';
import { Agent, callable } from 'agents';
import { getOwncastLiveStatus } from '@/server/owncast.ts';
import { getAngelThumpLiveStatus } from '@/server/angelthump.ts';
import { init as initPush, send as sendPush } from '@/server/webpush.ts';
import { confirmationEmail, liveNotificationEmail, sendEmail } from '@/server/email.ts';
import { recordStreamEvent } from '@/server/rss.ts';
import {
	countDiscordWebhooks,
	deliverLiveNotification,
	registerDiscordWebhook,
	retryDiscordWebhook
} from '@/server/discord.ts';
import type { StreamStatus } from '@/types/stream.d.ts';
import type { DiscordRetryPayload } from '@/types/discord.d.ts';
import type {
	LiveBroadcastMessage,
	NotificationPayload,
	NotificationState,
	PushSubscription,
	RetryPayload
} from '@/types/notification.d.ts';

function getPayload(): NotificationPayload {
	return { ...LIVE_NOTIFICATION, timestamp: Date.now() };
}

function emailParam(url: URL): string {
	return url.searchParams.get('email')?.toLowerCase().trim() ?? '';
}

function tokenParam(url: URL): string {
	return url.searchParams.get('token') ?? '';
}

export class Notifications extends Agent<Env, NotificationState> {
	public override initialState: NotificationState = {
		subscriptions: [],
		emailSubs: [],
		isLive: false,
		lastEmailsSentAt: 0
	};

	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private angelthumpLive: boolean | null = null;
	private owncastLive: boolean | null = null;

	private get liveStatus(): StreamStatus | null {
		if (this.angelthumpLive === null && this.owncastLive === null) {
			return null;
		}
		return this.angelthumpLive === true || this.owncastLive === true ? 'online' : 'offline';
	}

	public override async onStart(): Promise<void> {
		initPush();
		await this.pollStreams();
		this.openWebSocket();
		await this.scheduleEvery(60, 'pollStreams');
	}

	private openWebSocket(): void {
		this.closeWebSocket();
		this.ws = new WebSocket(ANGELTHUMP.WS);

		this.ws.addEventListener('open', () => {
			this.ws!.send(JSON.stringify({ action: 'subscribe', channel: ANGELTHUMP.CHANNEL }));
		});

		this.ws.addEventListener('message', (event) => {
			if (typeof event.data !== 'string') {
				return;
			}
			try {
				const data = JSON.parse(event.data) as { action: string; live?: boolean };
				if (data.action === 'live') {
					this.angelthumpLive = data.live === true;
					void this.onLiveChange('ws');
				}
			} catch {
				/*_*/
			}
		});

		this.ws.addEventListener('close', () => {
			this.ws = null;
			this.scheduleReconnect();
		});

		this.ws.addEventListener('error', () => {
			this.ws?.close();
		});
	}

	private closeWebSocket(): void {
		if (this.reconnectTimer !== null) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer !== null) {
			return;
		}
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.openWebSocket();
		}, 5000);
	}

	public async pollStreams(): Promise<void> {
		const [angelthumpLive, owncastLive] = await Promise.all([getAngelThumpLiveStatus(), getOwncastLiveStatus()]);

		if ((this.ws === null || this.angelthumpLive === null) && angelthumpLive !== null) {
			this.angelthumpLive = angelthumpLive;
		}
		if (owncastLive !== null) {
			this.owncastLive = owncastLive;
		}

		await this.onLiveChange('poll');
	}

	private async onLiveChange(source: 'ws' | 'poll'): Promise<void> {
		const status = this.liveStatus;
		if (status === null || this.state.isLive === (status === 'online')) {
			return;
		}

		const live = status === 'online';
		console.info('onLiveChange:', {
			from: this.state.isLive,
			to: live,
			source,
			angelthumpLive: this.angelthumpLive,
			owncastLive: this.owncastLive
		});
		this.setState({ ...this.state, isLive: live });

		await this.recordLiveFeedEvent(status, source);

		if (live) {
			await Promise.allSettled([this.notifyDiscord(), this.sendNotifications(), this.sendEmailNotifications()]);
		}
	}

	private async recordLiveFeedEvent(status: StreamStatus, source: 'ws' | 'poll'): Promise<void> {
		try {
			await recordStreamEvent(this.env.DB, { status, source, occurredAt: Date.now() });
		} catch (error) {
			console.error('recordStreamEvent failed:', error);
		}
	}

	private async notifyDiscord(): Promise<void> {
		try {
			const retries = await deliverLiveNotification(Date.now());
			await Promise.all(
				retries.map(
					async (retry) =>
						await this.schedule(retry.delay, 'retryDiscordNotification', retry, { idempotent: true })
				)
			);
		} catch (error) {
			console.error('notifyDiscord failed:', error);
		}
	}

	public async retryDiscordNotification(retry: DiscordRetryPayload): Promise<void> {
		if (!this.state.isLive) {
			return;
		}

		try {
			await retryDiscordWebhook(retry);
		} catch (error) {
			console.error('retryDiscordNotification failed:', error);
		}
	}

	private async sendNotifications(): Promise<void> {
		const subs = this.state.subscriptions;
		if (subs.length === 0) {
			return;
		}

		const payload = getPayload();
		const deadEndpoints: string[] = [];

		await Promise.all(
			subs.map(async (sub) => {
				const result = await sendPush(sub, payload);
				if (!result.ok) {
					if (result.status === 404 || result.status === 410) {
						deadEndpoints.push(sub.endpoint);
					} else if (result.status >= 500) {
						await this.schedule(
							60,
							'retrySendNotification',
							{ endpoint: sub.endpoint, payload } satisfies RetryPayload,
							{ idempotent: true }
						);
					}
				}
			})
		);

		if (deadEndpoints.length > 0) {
			this.setState({
				...this.state,
				subscriptions: subs.filter((s) => !deadEndpoints.includes(s.endpoint))
			});
		}

		this.broadcast(
			JSON.stringify({
				type: 'live',
				payload,
				timestamp: payload.timestamp ?? Date.now()
			} satisfies LiveBroadcastMessage)
		);
	}

	public async retrySendNotification(retry: RetryPayload): Promise<void> {
		const sub = this.state.subscriptions.find((s) => s.endpoint === retry.endpoint);
		if (!sub) {
			return;
		}

		const result = await sendPush(sub, retry.payload);
		if (!result.ok && (result.status === 404 || result.status === 410)) {
			this.setState({
				...this.state,
				subscriptions: this.state.subscriptions.filter((s) => s.endpoint !== retry.endpoint)
			});
		}
	}

	private async sendEmailNotifications(): Promise<void> {
		const now = Date.now();
		if (now - this.state.lastEmailsSentAt < 5 * 60 * 1000) {
			console.info('Email cooldown active, skipping');
			return;
		}

		const confirmed = this.state.emailSubs.filter((s) => s.confirmed);
		if (confirmed.length === 0) {
			return;
		}

		this.setState({ ...this.state, lastEmailsSentAt: now });

		await Promise.allSettled(
			confirmed.map(async (sub) => {
				const opts = liveNotificationEmail(sub.email, sub.token);
				await sendEmail(opts);
			})
		);
	}

	private async addEmailSub(email: string, token: string): Promise<{ ok: boolean; message: string }> {
		const existing = this.state.emailSubs.find((s) => s.email === email);
		if (existing) {
			if (existing.confirmed) {
				return { ok: true, message: 'already subscribed and confirmed.' };
			}
			const opts = confirmationEmail(email, existing.token);
			const sent = await sendEmail(opts);
			if (!sent) {
				return { ok: false, message: 'failed to send confirmation email.' };
			}
			return { ok: true, message: 'confirmation email resent.' };
		}

		this.setState({
			...this.state,
			emailSubs: [...this.state.emailSubs, { email, token, confirmed: false }]
		});

		const opts = confirmationEmail(email, token);
		const sent = await sendEmail(opts);
		if (!sent) {
			return { ok: false, message: 'failed to send confirmation email.' };
		}

		return { ok: true, message: 'confirmation email sent. check your inbox!' };
	}

	private confirmEmailSub(email: string, token: string): { ok: boolean; message: string } {
		const INVALID_LINK = 'invalid or expired confirmation link.';
		const idx = this.state.emailSubs.findIndex((s) => s.email === email && s.token === token);
		if (idx === -1) {
			return { ok: false, message: INVALID_LINK };
		}

		const updated = [...this.state.emailSubs];
		const existing = updated[idx];
		if (!existing) {
			return { ok: false, message: INVALID_LINK };
		}
		updated[idx] = { email: existing.email, token: existing.token, confirmed: true };
		this.setState({ ...this.state, emailSubs: updated });

		return { ok: true, message: 'email confirmed! you will now receive live notifications.' };
	}

	private removeEmailSub(email: string, token: string): { ok: boolean; message: string } {
		const idx = this.state.emailSubs.findIndex((s) => s.email === email && s.token === token);
		if (idx === -1) {
			return { ok: false, message: 'invalid unsubscribe link. the token does not match this email.' };
		}

		const updated = [...this.state.emailSubs];
		updated.splice(idx, 1);
		this.setState({ ...this.state, emailSubs: updated });

		return { ok: true, message: 'unsubscribed successfully. you will no longer receive live notifications.' };
	}

	public override async onRequest(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (request.method === 'POST' && path.endsWith('/discord/subscribe')) {
			const { webhook } = await request.json<{ webhook?: string }>();
			const result = await registerDiscordWebhook(webhook ?? '');
			return Response.json(result, { status: result.ok ? 200 : 400 });
		}

		if (request.method === 'POST' && path.endsWith('/email/subscribe')) {
			const { email } = await request.json<{ email: string }>();
			if (!isEmail(email)) {
				return Response.json({ ok: false, message: 'valid email required.' }, { status: 400 });
			}
			const token = crypto.randomUUID();
			const result = await this.addEmailSub(email.toLowerCase().trim(), token);
			return Response.json(result);
		}

		if (request.method === 'GET' && path.endsWith('/email/confirm')) {
			const result = this.confirmEmailSub(emailParam(url), tokenParam(url));
			return new Response(result.message, { status: result.ok ? 200 : 400 });
		}

		if ((request.method === 'GET' || request.method === 'POST') && path.endsWith('/email/unsubscribe')) {
			const result = this.removeEmailSub(emailParam(url), tokenParam(url));
			return new Response(result.message, { status: result.ok ? 200 : 400 });
		}

		if (request.method === 'GET' && path.endsWith('/publickey')) {
			return Response.json({ publicKey: this.env.VAPID_PUBLIC_KEY });
		}

		if (request.method === 'POST' && path.endsWith('/subscribe')) {
			const sub: PushSubscription = await request.json();
			return Response.json(this.subscribe(sub));
		}

		if (request.method === 'POST' && path.endsWith('/unsubscribe')) {
			const { endpoint } = await request.json<{ endpoint: string }>();
			return Response.json(this.unsubscribe(endpoint));
		}

		if (request.method === 'GET' && path.endsWith('/live')) {
			return Response.json(this.getLiveStatus(), {
				headers: { 'Cache-Control': 'no-store' }
			});
		}

		if (request.method === 'GET' && path.endsWith('/stats')) {
			return Response.json(await this.getStats());
		}

		return new Response('daxMug', { status: 404 });
	}

	@callable()
	public getVapidPublicKey(): string {
		return this.env.VAPID_PUBLIC_KEY;
	}

	@callable()
	public subscribe(subscription: PushSubscription): { ok: boolean } {
		const exists = this.state.subscriptions.some((s) => s.endpoint === subscription.endpoint);
		if (!exists) {
			this.setState({
				...this.state,
				subscriptions: [...this.state.subscriptions, subscription]
			});
		}
		return { ok: true };
	}

	@callable()
	public unsubscribe(endpoint: string): { ok: boolean } {
		this.setState({
			...this.state,
			subscriptions: this.state.subscriptions.filter((s) => s.endpoint !== endpoint)
		});
		return { ok: true };
	}

	@callable()
	public getLiveStatus(): { isLive: boolean; angelthump: boolean | null; owncast: boolean | null } {
		return { isLive: this.state.isLive, angelthump: this.angelthumpLive, owncast: this.owncastLive };
	}

	@callable()
	public async getStats(): Promise<{
		isLive: boolean;
		pushSubscriptions: number;
		emailSubscriptions: number;
		emailConfirmed: number;
		discordWebhooks: number;
		lastEmailsSentAt: number;
	}> {
		const discordWebhooks = await countDiscordWebhooks().catch((error: unknown) => {
			console.error('countDiscordWebhooks failed:', error);
			return 0;
		});

		return {
			isLive: this.state.isLive,
			pushSubscriptions: this.state.subscriptions.length,
			emailSubscriptions: this.state.emailSubs.length,
			emailConfirmed: this.state.emailSubs.filter((s) => s.confirmed).length,
			discordWebhooks,
			lastEmailsSentAt: this.state.lastEmailsSentAt
		};
	}
}
