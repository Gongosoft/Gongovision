import { Stage } from '@/lib/emotewall/stage.ts';
import { useIntervalFn, useWebSocket } from '@vueuse/core';
import { onScopeDispose, shallowRef, toValue, watch } from 'vue';
import { applySettings, DEFAULT_SETTINGS } from '@/lib/emotewall/config.ts';
import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import type { EmoteWallClientMessage, EmoteWallServerMessage, WallSettings } from '@/types/emotewall.d.ts';

const PING_MS = 30_000;

const url = new URL('/emotewall/ws', location.href);
url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

export function useEmoteWall(root: MaybeRefOrGetter<HTMLElement | null | undefined>): {
	stage: ShallowRef<Stage | null>;
	settings: ShallowRef<WallSettings>;
} {
	const stage = shallowRef<Stage | null>(null);
	const settings = shallowRef<WallSettings>(DEFAULT_SETTINGS);
	// server clock minus local clock, from the lowest latency ping
	let offset = 0;
	let bestRTT = Infinity;

	const { send, close } = useWebSocket(url, {
		autoReconnect: { retries: Infinity, delay: 5000 },
		onConnected: (ws) => {
			bestRTT = Infinity;
			ws.send(JSON.stringify({ type: 'ping', sentAt: Date.now() } satisfies EmoteWallClientMessage));
		},
		onMessage: (_ws, { data }) => {
			if (typeof data !== 'string') {
				return;
			}
			let message: EmoteWallServerMessage | null = null;
			try {
				message = JSON.parse(data) as EmoteWallServerMessage;
			} catch {
				/*_*/
			}
			if (!message) {
				return;
			}
			switch (message.type) {
				case 'hi gongo':
				case 'settings': {
					if (message.type === 'hi gongo' && bestRTT === Infinity) {
						offset = message.now - Date.now();
					}
					applySettings(message.settings);
					settings.value = message.settings;
					break;
				}
				case 'pong': {
					const now = Date.now();
					const rtt = now - message.sentAt;
					if (rtt <= bestRTT) {
						bestRTT = rtt;
						offset = message.now + rtt / 2 - now;
					}
					break;
				}
				case 'events': {
					if (!stage.value || document.visibilityState !== 'visible') {
						break;
					}
					for (const event of message.events) {
						stage.value.play(event, offset);
					}
					break;
				}
				default: {
					break;
				}
			}
		}
	});

	useIntervalFn(() => {
		send(JSON.stringify({ type: 'ping', sentAt: Date.now() } satisfies EmoteWallClientMessage));
	}, PING_MS);

	watch(
		() => toValue(root),
		(el) => {
			stage.value?.destroy();
			stage.value = el ? new Stage(el) : null;
		},
		{ immediate: true }
	);

	onScopeDispose(() => {
		stage.value?.destroy();
		close();
	});

	return { stage, settings };
}
