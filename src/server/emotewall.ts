import { ChatClient } from '@twurple/chat';
import { DurableObject } from 'cloudflare:workers';
import { WallScheduler } from '@/lib/emotewall/scheduler.ts';
import { emptyCatalog, listEmotes, loadCatalog } from '@/lib/emotewall/catalog.ts';
import { parseEmotes, parseKappagenCommand, withHolidayZWE } from '@/lib/emotewall/parse.ts';
import { applySettings, DEFAULT_SETTINGS, sanitizeSettings } from '@/lib/emotewall/config.ts';
import type { ChatMessage } from '@twurple/chat';
import type {
	Catalog,
	EmoteWallClientMessage,
	EmoteWallServerMessage,
	WallEmote,
	WallEvent,
	WallSettings
} from '@/types/emotewall.d.ts';

const BATCH_MS = 100;
const HEARTBEAT_MS = 60_000;
const CATALOG_TTL_MS = 30 * 60_000;

function send(ws: WebSocket, payload: string): void {
	try {
		ws.send(payload);
	} catch {
		/*_*/
	}
}

export class EmoteWall extends DurableObject<Env> {
	private chat: ChatClient | null = null;
	private batch: WallEvent[] = [];
	private batchTimer: ReturnType<typeof setTimeout> | null = null;
	private catalog: Catalog = emptyCatalog();
	private catalogLoadedAt = 0;
	private settings: WallSettings = DEFAULT_SETTINGS;
	private loading: Promise<void> | null = null;
	private readonly scheduler = new WallScheduler((event) => this.queue(event));

	public override async fetch(request: Request): Promise<Response> {
		await this.loadSettings();

		const { pathname } = new URL(request.url);
		if (pathname === '/emotes/list') {
			return this.emotesRequest();
		}
		if (pathname === '/emotewall/settings') {
			return this.settingsRequest(request);
		}
		if (pathname !== '/emotewall/ws') {
			return new Response('Not Found', { status: 404 });
		}

		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected Upgrade: websocket', { status: 426 });
		}

		const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
		this.ctx.acceptWebSocket(server);
		send(server, JSON.stringify({ type: 'hi gongo', now: Date.now(), settings: this.settings }));

		this.connectChat();
		if ((await this.ctx.storage.getAlarm()) === null) {
			await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
		}

		return new Response(null, { status: 101, webSocket: client });
	}

	public override webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): void {
		if (typeof raw !== 'string') {
			return;
		}
		let message: EmoteWallClientMessage | null = null;
		try {
			message = JSON.parse(raw) as EmoteWallClientMessage;
		} catch {
			/*_*/
		}
		if (message?.type === 'ping') {
			this.connectChat();
			send(ws, JSON.stringify({ type: 'pong', now: Date.now(), sentAt: message.sentAt }));
		}
	}

	public override webSocketClose(): void {
		this.disconnectIfIdle();
	}

	public override webSocketError(): void {
		this.disconnectIfIdle();
	}

	/** keeps the chat client alive (or restores it after eviction) while anyone observes */
	public override async alarm(): Promise<void> {
		if (this.viewers() === 0) {
			this.disconnectChat();
			return;
		}
		this.connectChat();
		if (Date.now() - this.catalogLoadedAt > CATALOG_TTL_MS) {
			await this.refreshCatalog();
		}
		await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
	}

	private async loadSettings(): Promise<void> {
		this.loading ??= (async (): Promise<void> => {
			try {
				this.settings = sanitizeSettings(await this.ctx.storage.get('settings'));
				applySettings(this.settings);
			} catch (error) {
				console.error('EmoteWall settings unavailable:', error);
				this.loading = null;
			}
		})();
		await this.loading;
	}

	/** `/emotewall/settings`: read or replace the wall settings */
	private async settingsRequest(request: Request): Promise<Response> {
		if (request.method === 'GET') {
			return Response.json(this.settings, { headers: { 'Cache-Control': 'no-store' } });
		}
		if (request.method !== 'PUT') {
			return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, PUT' } });
		}
		const body: unknown = await request.json().catch(() => null);
		if (typeof body !== 'object' || body === null || Array.isArray(body)) {
			return new Response('Expected a settings object', { status: 400 });
		}
		this.settings = sanitizeSettings(body);
		applySettings(this.settings);
		await this.ctx.storage.put('settings', this.settings);
		this.broadcast({ type: 'settings', settings: this.settings });
		return Response.json(this.settings, { headers: { 'Cache-Control': 'no-store' } });
	}

	/** `/emotes/list`: active channel's emotes */
	private async emotesRequest(): Promise<Response> {
		if (this.catalogLoadedAt === 0) {
			await this.refreshCatalog();
		}
		return Response.json(listEmotes(this.catalog));
	}

	/** a failed fetch leaves the timestamp alone, so the next alarm or connect tries again */
	private async refreshCatalog(): Promise<void> {
		try {
			this.catalog = await loadCatalog(TWITCH_CHANNEL);
			this.catalogLoadedAt = Date.now();
		} catch (error) {
			console.error('EmoteWall catalog unavailable:', error);
		}
	}

	private viewers(): number {
		return this.ctx.getWebSockets().length;
	}

	private connectChat(): void {
		if (this.chat) {
			return;
		}
		if (this.catalogLoadedAt === 0) {
			void this.refreshCatalog();
		}
		const chat = new ChatClient({ channels: [TWITCH_CHANNEL], readOnly: true, webSocket: true });
		chat.onMessage(async (_channel, _user, text, msg) => {
			try {
				await this.onChat(text, msg);
			} catch (error) {
				console.error('EmoteWall chat message failed:', error);
			}
		});
		chat.onDisconnect((manually, reason) => {
			if (!manually) {
				console.warn('EmoteWall chat disconnected:', reason?.message);
			}
		});
		chat.connect();
		this.chat = chat;
	}

	private async onChat(text: string, msg: ChatMessage): Promise<void> {
		await this.loadSettings();
		const now = Date.now();
		const holiday = (emote: WallEmote): WallEmote => withHolidayZWE(emote, new Date(now));
		const command = parseKappagenCommand(text, msg.emoteOffsets);
		if (command) {
			const emotes = parseEmotes(command.args, command.emotes, this.catalog);
			this.scheduler.addKappa((emotes.length > 0 ? emotes : this.catalog.fallback).map(holiday), now);
		} else {
			this.scheduler.addEmotes(parseEmotes(text, msg.emoteOffsets, this.catalog).map(holiday), now);
		}
	}

	private disconnectChat(): void {
		this.chat?.quit();
		this.chat = null;
		if (this.batchTimer !== null) {
			clearTimeout(this.batchTimer);
		}
		this.batchTimer = null;
		this.batch = [];
	}

	private disconnectIfIdle(): void {
		setTimeout(() => {
			if (this.viewers() === 0) {
				this.disconnectChat();
			}
		}, 0);
	}

	private queue(event: WallEvent): void {
		this.batch.push(event);
		this.batchTimer ??= setTimeout(() => {
			this.batchTimer = null;
			this.broadcast({ type: 'events', events: this.batch });
			this.batch = [];
		}, BATCH_MS);
	}

	private broadcast(message: EmoteWallServerMessage): void {
		const payload = JSON.stringify(message);
		for (const ws of this.ctx.getWebSockets()) {
			send(ws, payload);
		}
	}
}
