<script setup lang="ts">
import MenuTile from '@/components/MenuTile.vue';
import linkSVG from '@/assets/images/link.svg?raw';
import { ref } from 'vue';

const isLoading = ref(false);

async function subscribe(): Promise<void> {
	const url = prompt(
		'paste a Discord webhook URL:\n\nchannel settings -> integrations -> webhooks -> copy webhook URL'
	);
	if (!url) {
		return;
	}

	isLoading.value = true;
	try {
		const res = await fetch('/notification/discord/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ webhook: url })
		});
		const data = (await res.json()) as { message: string };
		alert(data.message);
	} catch {
		alert('network error. please try again.');
	} finally {
		isLoading.value = false;
	}
}
</script>

<template>
	<MenuTile
		:disabled="isLoading"
		:icon="linkSVG"
		label="Webhook"
		title="Discord Webhook Integration"
		@click="subscribe" />
</template>
