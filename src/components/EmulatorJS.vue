<script setup lang="ts">
import { useScript } from '@unhead/vue';
import { onBeforeUnmount, onMounted } from 'vue';

const loader = useScript({ src: '/emulatorjs/loader.js', key: crypto.randomUUID() }, { trigger: 'manual' });

onMounted(() => {
	window.EJS_backgroundColor = '#000';
	window.EJS_Buttons = { exitEmulation: false };
	window.EJS_color = '#4e85ff';
	window.EJS_pathtodata = '/emulatorjs/';
	window.EJS_player = '#game';
	window.EJS_startOnLoaded = true;

	void loader.load();
});

onBeforeUnmount(() => {
	const emulator = window.EJS_emulator;
	if (emulator?.Module) {
		emulator.Module.abort = (): void => undefined;
	}
	emulator?.callEvent('exit');
	loader.remove();
});
</script>

<template>
	<div id="game" />
</template>

<style scoped>
#game {
	animation: ejsPrimaryShift 30s linear infinite;
	background: #000;
	width: 100%;
	height: 100%;
}
</style>
