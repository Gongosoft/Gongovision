<script setup lang="ts">
import isEmail from 'validator/lib/isEmail';
import MenuTile from '@/components/MenuTile.vue';
import envelopeSVG from '@/assets/images/envelope.svg?raw';

async function subscribe(): Promise<void> {
	const email = prompt('enter your email address:');
	if (!email) {
		return;
	}
	if (!isEmail(email)) {
		alert('please enter a valid email address.');
		return;
	}
	const confirmed = confirm(`is this correct?\n\n${email}`);
	if (!confirmed) {
		return;
	}

	try {
		const res = await fetch('/notification/email/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});
		const data = (await res.json()) as { ok: boolean; message: string };
		alert(data.message);
	} catch {
		alert('network error. please try again.');
	}
}
</script>

<template>
	<MenuTile :icon="envelopeSVG" label="Email" title="Email notifications" @click="subscribe" />
</template>
