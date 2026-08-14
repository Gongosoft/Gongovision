<script setup lang="ts">
import bellSVG from '@/assets/images/bell.svg?raw';
import unsubscribeSVG from '@/assets/images/bell-mute.svg?raw';
import exclaimSVG from '@/assets/images/bell-exclaimation.svg?raw';
import { computed, onMounted, ref } from 'vue';
import { get, usePermission, useWebNotification } from '@vueuse/core';

const { isLive } = defineProps<{ isLive: boolean | null }>();

const { isSupported } = useWebNotification();
const permission = usePermission('notifications');
const permissionState = computed(() => (get(isSupported) ? get(permission) : 'unsupported'));

async function getServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!('serviceWorker' in navigator)) {
		return null;
	}
	try {
		return await navigator.serviceWorker.ready;
	} catch {
		return null;
	}
}

const isSubscribed = ref(false);
const isLoading = ref(false);
const isHovered = ref(false);

const currentSVG = computed(() => {
	if (!get(isSubscribed)) {
		return exclaimSVG;
	}
	if (get(isHovered)) {
		return unsubscribeSVG;
	}
	return bellSVG;
});

const iconFill = computed(() => {
	if (get(isHovered)) {
		if (get(isSubscribed)) {
			return 'var(--color-error)';
		}
		return 'var(--color-accent)';
	}
	return 'var(--color-text)';
});

const iconTitle = computed(() => {
	if (get(permissionState) === 'unsupported') {
		return 'Notifications unsupported.';
	}
	if (get(permissionState) === 'denied') {
		return 'Notifications blocked.';
	}
	if (!get(isSubscribed)) {
		return 'Click to enable push notifications.';
	}
	if (get(isHovered)) {
		return 'Click to disable push notifications.';
	}
	return 'Push notifications active.';
});

async function subscribe(): Promise<void> {
	isLoading.value = true;

	try {
		const pkRes = await fetch('/notification/publickey');
		if (!pkRes.ok) {
			throw new Error(`server error (${pkRes.status})`);
		}
		const { publicKey } = (await pkRes.json()) as { publicKey: string };

		const sw = await getServiceWorker();
		if (!sw) {
			throw new Error('no active service worker. try refreshing.');
		}

		const keyBytes = Uint8Array.fromBase64(publicKey, { alphabet: 'base64url' });
		const sub = await sw.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: keyBytes
		});

		const subJson = sub.toJSON();
		const saveRes = await fetch('/notification/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(subJson)
		});
		if (!saveRes.ok) {
			throw new Error(`failed to save subscription (${saveRes.status})`);
		}

		isSubscribed.value = true;

		if (isLive && Notification.permission === 'granted') {
			void new Notification(LIVE_NOTIFICATION.title, {
				body: LIVE_NOTIFICATION.body,
				icon: LIVE_NOTIFICATION.icon,
				badge: LIVE_NOTIFICATION.badge,
				// @ts-expect-error
				image: LIVE_NOTIFICATION.image,
				tag: LIVE_NOTIFICATION.tag,
				data: LIVE_NOTIFICATION.data,
				requireInteraction: LIVE_NOTIFICATION.requireInteraction
			});
		}
	} catch (error) {
		alert(error instanceof Error ? error.message : 'subscription failed');
	} finally {
		isLoading.value = false;
	}
}

async function unsubscribe(): Promise<void> {
	isLoading.value = true;

	try {
		const sw = await getServiceWorker();
		const sub = await sw?.pushManager.getSubscription();
		if (sub) {
			await sub.unsubscribe();
			await fetch('/notification/unsubscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ endpoint: sub.endpoint })
			});
		}
		isSubscribed.value = false;
	} catch (error) {
		alert(error instanceof Error ? error.message : 'unsubscribe failed');
	} finally {
		isLoading.value = false;
	}
}

function onClick(): void {
	if (get(isSubscribed)) {
		unsubscribe();
	} else {
		subscribe();
	}
}

onMounted(async () => {
	const sw = await getServiceWorker();
	const sub = await sw?.pushManager.getSubscription();
	if (sub) {
		isSubscribed.value = true;
	}
});
</script>

<template>
	<button
		class="icon-button"
		:title="iconTitle"
		:disabled="isLoading"
		:style="{ color: iconFill }"
		@click="onClick"
		@mouseenter="isHovered = true"
		@mouseleave="isHovered = false">
		<span class="icon" v-html="currentSVG" />
	</button>
</template>

<style scoped>
.icon-button {
	all: unset;
	cursor: pointer;
	display: flex;

	& :deep(.icon svg) {
		display: block;
		fill: currentColor;
		transition: fill 0.15s;
		width: 2.5rem;
		height: 2.5rem;

		& * {
			fill: inherit;
		}

		@media (max-width: 480px) {
			width: 2rem;
			height: 2rem;
		}
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}
}
</style>
