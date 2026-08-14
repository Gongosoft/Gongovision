<script setup lang="ts">
import isEmail from 'validator/lib/isEmail';
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
	<button class="icon-button" title="Email notifications" @click="subscribe">
		<span class="icon" v-html="envelopeSVG" />
	</button>
</template>

<style scoped>
.icon-button {
	all: unset;
	cursor: pointer;
	display: flex;

	& :deep(.icon svg) {
		display: block;
		fill: var(--color-text);
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

	&:hover :deep(.icon svg) {
		fill: var(--color-accent);
	}
}
</style>
