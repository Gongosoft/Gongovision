import avatar_url from '@/assets/images/emotes/7tv/Gongor.avif?no-inline';
import { env } from 'cloudflare:workers';
import type { DiscordRetryPayload } from '@/types/discord.d.ts';
import type { APIEmbed, RESTPostAPIWebhookWithTokenJSONBody } from 'discord-api-types/v10';

const WEBHOOK_REGEX =
	/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/(?<id>\d{17,20})\/(?<token>[A-Za-z0-9._-]{50,120})\/?$/;

const REQUEST_TIMEOUT = 5000;
const DEFAULT_RETRY_SECONDS = 60;
const MAX_RETRY_SECONDS = 900;
const MAX_WEBHOOKS = 100;

/** #fffc3f as a Discord embed colour */
const LIVE_COLOR = 16_776_255;

/** 401 = token regenerated, 404/410 = webhook deleted */
const GONE_STATUSES = new Set([401, 404, 410]);

const COLUMNS = 'id, url, created_at AS createdAt, last_sent_at AS lastSentAt, last_error AS lastError';

interface DiscordWebhookRecord {
	id: number;
	url: string;
	createdAt: number;
	lastSentAt: number | null;
	lastError: string | null;
}

interface SendResult {
	ok: boolean;
	/** `null` when the request never completed */
	status: number | null;
	/** seconds Discord asked us to wait (429 only) */
	retryAfter: number | null;
}

interface DiscordResult {
	ok: boolean;
	message: string;
}

function message(embed: APIEmbed): RESTPostAPIWebhookWithTokenJSONBody {
	return {
		username: 'gongo',
		allowed_mentions: { parse: [] },
		embeds: [embed],
		avatar_url: `${BASE_URL}${avatar_url}`
	};
}

function liveMessage(occurredAt: number): RESTPostAPIWebhookWithTokenJSONBody {
	return message({
		title: LIVE_NOTIFICATION.title,
		url: `${BASE_URL}/${LIVE_NOTIFICATION.data.url}`,
		description: LIVE_NOTIFICATION.body,
		color: LIVE_COLOR,
		timestamp: new Date(occurredAt).toISOString()
	});
}

function confirmationMessage(): RESTPostAPIWebhookWithTokenJSONBody {
	return message({
		title: 'notifications enabled',
		url: `${BASE_URL}/${LIVE_NOTIFICATION.data.url}`,
		description: 'yay',
		color: LIVE_COLOR,
		timestamp: new Date().toISOString()
	});
}

function parseWebhookUrl(raw: string): string | null {
	const match = WEBHOOK_REGEX.exec(raw.trim());
	const id = match?.groups?.id;
	const token = match?.groups?.token;

	return id && token ? `https://discord.com/api/webhooks/${id}/${token}` : null;
}

/** Discord puts a float `retry_after` in the 429 body; the standard header is the fallback */
async function retryAfterSeconds(response: Response): Promise<number | null> {
	try {
		const { retry_after: seconds } = await response.json<{ retry_after?: number }>();
		if (typeof seconds === 'number') {
			return seconds;
		}
	} catch {
		/*_*/
	}

	const header = Number.parseFloat(response.headers.get('retry-after') ?? '');
	return Number.isFinite(header) ? header : null;
}

async function send(url: string, body: RESTPostAPIWebhookWithTokenJSONBody): Promise<SendResult> {
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'User-Agent': 'DiscordBot (https://gongo.tv, 1.0)' },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT)
		});

		if (response.ok) {
			return { ok: true, status: response.status, retryAfter: null };
		}

		return {
			ok: false,
			status: response.status,
			retryAfter: response.status === 429 ? await retryAfterSeconds(response) : null
		};
	} catch {
		return { ok: false, status: null, retryAfter: null };
	}
}

function retryDelay(result: SendResult): number | null {
	if (result.status === null || result.status >= 500) {
		return DEFAULT_RETRY_SECONDS;
	}
	if (result.status === 429) {
		return Math.min(MAX_RETRY_SECONDS, Math.max(1, Math.ceil(result.retryAfter ?? DEFAULT_RETRY_SECONDS)));
	}
	return null;
}

function failureReason(result: SendResult): string {
	return result.status === null ? 'network error' : `HTTP ${result.status}`;
}

async function findWebhookByID(id: number): Promise<DiscordWebhookRecord | null> {
	return env.DB.prepare(`SELECT ${COLUMNS} FROM discord_webhooks WHERE id = ?`)
		.bind(id)
		.first<DiscordWebhookRecord>();
}

/** null when the URL is already stored */
async function insertWebhook(url: string): Promise<DiscordWebhookRecord | null> {
	return env.DB.prepare(
		`INSERT INTO discord_webhooks (url) VALUES (?) ON CONFLICT (url) DO NOTHING RETURNING ${COLUMNS}`
	)
		.bind(url)
		.first<DiscordWebhookRecord>();
}

async function removeWebhook(id: number): Promise<void> {
	await env.DB.prepare('DELETE FROM discord_webhooks WHERE id = ?').bind(id).run();
}

async function markSent(id: number): Promise<void> {
	await env.DB.prepare('UPDATE discord_webhooks SET last_sent_at = ?, last_error = NULL WHERE id = ?')
		.bind(Date.now(), id)
		.run();
}

async function markFailed(id: number, reason: string): Promise<void> {
	await env.DB.prepare('UPDATE discord_webhooks SET last_error = ? WHERE id = ?').bind(reason, id).run();
}

async function recordOutcome(webhook: DiscordWebhookRecord, result: SendResult): Promise<number | null> {
	if (result.ok) {
		await markSent(webhook.id);
		return null;
	}

	await markFailed(webhook.id, failureReason(result));

	if (result.status !== null && GONE_STATUSES.has(result.status)) {
		await removeWebhook(webhook.id);
		return null;
	}

	return retryDelay(result);
}

export async function countDiscordWebhooks(): Promise<number> {
	const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM discord_webhooks').first<{ total: number }>();
	return row?.total ?? 0;
}

export async function registerDiscordWebhook(raw: string): Promise<DiscordResult> {
	const url = parseWebhookUrl(raw);
	if (!url) {
		return { ok: false, message: 'invalid Discord webhook URL' };
	}

	if ((await countDiscordWebhooks()) >= MAX_WEBHOOKS) {
		return { ok: false, message: 'too many Discord webhooks subscribed, try again later' };
	}

	const inserted = await insertWebhook(url);
	if (!inserted) {
		return { ok: true, message: 'this webhook is already subscribed' };
	}

	const test = await send(inserted.url, confirmationMessage());
	if (!test.ok) {
		await removeWebhook(inserted.id);

		return {
			ok: false,
			message:
				test.status !== null && GONE_STATUSES.has(test.status)
					? 'Discord did not recognise that webhook'
					: `Discord rejected the test message (${failureReason(test)})`
		};
	}

	return { ok: true, message: 'Discord webhook registered!' };
}

async function attemptDelivery(
	webhook: DiscordWebhookRecord,
	payload: RESTPostAPIWebhookWithTokenJSONBody,
	occurredAt: number
): Promise<DiscordRetryPayload | null> {
	const delay = await recordOutcome(webhook, await send(webhook.url, payload));

	return delay === null ? null : { webhookId: webhook.id, occurredAt, delay };
}

export async function deliverLiveNotification(occurredAt: number): Promise<DiscordRetryPayload[]> {
	const { results } = await env.DB.prepare(
		`SELECT ${COLUMNS} FROM discord_webhooks ORDER BY id ASC`
	).all<DiscordWebhookRecord>();

	const payload = liveMessage(occurredAt);
	const retries = await Promise.all(results.map(async (webhook) => attemptDelivery(webhook, payload, occurredAt)));

	return retries.filter((retry) => retry !== null);
}

export async function retryDiscordWebhook(retry: DiscordRetryPayload): Promise<void> {
	const webhook = await findWebhookByID(retry.webhookId);
	if (!webhook) {
		return;
	}

	await recordOutcome(webhook, await send(webhook.url, liveMessage(retry.occurredAt)));
}
