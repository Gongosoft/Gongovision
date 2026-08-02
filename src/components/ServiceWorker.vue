<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { get, useIntervalFn, useOnline } from '@vueuse/core';

const online = useOnline();

useRegisterSW({
	immediate: true,
	onRegisteredSW(swURL, registration) {
		if (!registration) {
			return;
		}
		useIntervalFn(
			async () => {
				if (!get(online)) {
					return;
				}
				const response = await fetch(swURL, { cache: 'no-store' });
				if (response.status === 200) {
					await registration.update();
				}
			},
			60 * 60 * 1000
		);
	}
});
</script>

<template />
