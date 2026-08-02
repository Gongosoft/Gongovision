<script setup lang="ts">
import Emails from '@/components/Emails.vue';
import WebPush from '@/components/WebPush.vue';
import backSVG from '@/assets/images/arrow-left.svg?raw';
import { RouterLink } from 'vue-router';
import { useStreamSource } from '@/composables/useStreamSource.ts';

const { isGreatSphynxLive } = useStreamSource();
</script>

<template>
	<div class="icon-row">
		<RouterLink title="Back" to="/">
			<span class="icon icon-animated" v-html="backSVG" />
		</RouterLink>
		<Emails />
		<WebPush :is-live="isGreatSphynxLive" />
	</div>
</template>

<style scoped>
.icon-row {
	align-items: center;
	display: flex;
	gap: 2rem;
	justify-content: center;
	left: 50%;
	position: fixed;
	top: 50%;
	transform: translate(-50%, -50%);
	z-index: 4;

	& :deep(.icon svg) {
		width: 2.5rem;
		height: 2.5rem;

		@media (max-width: 480px) {
			width: 2rem;
			height: 2rem;
		}
	}
}
</style>
