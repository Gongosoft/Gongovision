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
				try {
					await fetch(swURL, { cache: 'no-store' });
					await registration.update();
				} catch {
					/*_*/
				}
			},
			60 * 60 * 1000
		);
	}
});
</script>

<template />
