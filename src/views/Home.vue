<script setup lang="ts">
import atSVG from '@/assets/images/at.svg?raw';
import rssSVG from '@/assets/images/rss.svg?raw';
import bankSVG from '@/assets/images/bank.svg?raw';
import folderSVG from '@/assets/images/folder.svg?raw';
import githubSVG from '@/assets/images/github.svg?raw';
import blueskySVG from '@/assets/images/bluesky.svg?raw';
import youtubeSVG from '@/assets/images/youtube.svg?raw';
import discordSVG from '@/assets/images/discord.svg?raw';
import calendarSVG from '@/assets/images/calendar.svg?raw';
import cameraSVG from '@/assets/images/video-camera.svg?raw';
import letterboxdSVG from '@/assets/images/letterboxd.svg?raw';
import notificationSVG from '@/assets/images/bullhorn.svg?raw';
import { useTemplateRef } from 'vue';
import { RouterLink } from 'vue-router';
import { get, useEventListener } from '@vueuse/core';
import { useScreenShare } from '@/composables/useScreenShare.ts';

const webcal = `webcal://${location.hostname}/schedule.ics`;
const randomized = new WeakSet<Element>();
const iconRowRef = useTemplateRef<HTMLElement>('iconRowRef');

const { stream: screenStream, start: startScreenShare, stop: stopScreenShare } = useScreenShare();

async function onCameraClick(): Promise<void> {
	if (get(screenStream)) {
		stopScreenShare();
	}
	await startScreenShare();
	if (get(screenStream)) {
		useEventListener(get(screenStream), 'inactive', stopScreenShare, { once: true });
	}
}

useEventListener(iconRowRef, 'mouseover', (e) => {
	const svg = (e.target as Element).closest?.('svg');
	if (svg instanceof SVGElement && !randomized.has(svg)) {
		randomized.add(svg);
		svg.style.setProperty('animation-delay', `-${Math.random() * 30}s`);
	}
});
</script>

<template>
	<div ref="iconRowRef" class="icon-row">
		<a title="GitHub" href="https://github.com/Gongosoft/Gongovision" target="_blank" @click.stop>
			<span class="icon icon-animated" v-html="githubSVG" />
		</a>
		<a title="Contact" href="mailto:sphynxiscool@gmail.com" @click.stop>
			<span class="icon icon-animated" v-html="atSVG" />
		</a>
		<a
			title="Internet Archive"
			href="https://archive.org/details/@berg_bok/lists/1/gongo"
			target="_blank"
			@click.stop>
			<span class="icon icon-animated" v-html="bankSVG" />
		</a>
		<a title="Letterboxd" href="https://letterboxd.com/bergbok/list/gongo" target="_blank" @click.stop>
			<span class="icon icon-animated" v-html="letterboxdSVG" />
		</a>

		<a title="Bluesky Feed" href="https://bsky.app/profile/bergbok.computer/feed/gongo" target="_blank" @click.stop>
			<span class="icon icon-animated" :style="{ '--icon-fill': '#1185fe' }" v-html="blueskySVG" />
		</a>
		<RouterLink title="RSS" to="/rss" @click.stop>
			<span class="icon icon-animated" :style="{ '--icon-fill': '#fc8900' }" v-html="rssSVG" />
		</RouterLink>
		<a title="Discord" href="https://discord.gg/yRahnWpyDa" target="_blank" @click.stop>
			<span class="icon icon-animated" :style="{ '--icon-fill': '#5865f2' }" v-html="discordSVG" />
		</a>
		<a title="YouTube" href="https://www.youtube.com/@GongoLive" target="_blank" @click.stop>
			<span class="icon icon-animated" :style="{ '--icon-fill': '#ff0033' }" v-html="youtubeSVG" />
		</a>

		<RouterLink title="Notifications" to="/notifications" @click.stop>
			<span class="icon icon-animated" v-html="notificationSVG" />
		</RouterLink>
		<a title="Schedule" :href="webcal" @click.stop>
			<span class="icon icon-animated" v-html="calendarSVG" />
		</a>
		<RouterLink title="VODs" to="/vods" @click.stop>
			<span class="icon icon-animated" v-html="folderSVG" />
		</RouterLink>
		<button type="button" title="Start streaming!" class="icon-button" @click.stop="onCameraClick">
			<span class="icon icon-animated" v-html="cameraSVG" />
		</button>
	</div>
</template>

<style scoped>
.icon-row {
	align-content: center;
	display: grid;
	gap: 1.25rem 2rem;
	grid-template-columns: repeat(4, auto);
	grid-template-rows: repeat(3, auto);
	justify-content: center;
	left: 50%;
	position: fixed;
	top: 50%;
	transform: translate(-50%, -50%);
	z-index: 4;

	@media (max-width: 480px) {
		gap: 0.75rem 1.25rem;
	}

	& :deep(.icon svg) {
		width: 2.5rem;
		height: 2.5rem;

		@media (max-width: 480px) {
			width: 2rem;
			height: 2rem;
		}
	}

	& .icon-button {
		all: unset;
		cursor: pointer;
	}
}
</style>
