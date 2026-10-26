<script setup lang="ts">
import Blotter from '@/components/Blotter.vue';
import RadioPlayer from '@/components/RadioPlayer.vue';
import RadioHistory from '@/components/RadioHistory.vue';
import STOPTAPE from '@/assets/images/emotes/7tv/STOPTAPE.avif';
import { useHead, useSeoMeta } from '@unhead/vue';
import { computed, ref, useTemplateRef } from 'vue';
import { useRadioSong } from '@/composables/useRadioSong.ts';
import { useDiamondLines } from '@/composables/useDiamondLines.ts';
import { useDiamondHeader } from '@/composables/useDiamondHeader.ts';
import { get, useFavicon, useLocalStorage, useMediaQuery } from '@vueuse/core';

const { np, status, elapsed, duration } = useRadioSong();

const station = computed(() => get(np)?.station ?? null);
const song = computed(() => get(np)?.now_playing?.song ?? null);
const history = computed(() => get(np)?.song_history ?? []);

const offline = computed(() => {
	const now = get(np);
	return now ? !now.is_online : get(status) === 'CLOSED';
});

const art = computed(() => {
	if (get(offline)) {
		return STOPTAPE;
	}
	const now = get(np);
	return now ? now.live.art || get(song)?.art || STOPTAPE : null;
});

/** the diamond's header shows the track title; null falls back to LIVE / OFFLINE */
const headerTitle = computed(() => (get(offline) ? null : get(song)?.title || get(song)?.text || null));
useDiamondHeader().claim(headerTitle);

const isDesktop = useMediaQuery('(min-width: 900px)');
const {
	texts: lineTexts,
	sizes: lineSizes,
	height: linesHeight
} = useDiamondLines({
	lines: () => [get(song)?.album ?? '', get(song)?.artist ?? ''],
	maxSizes: () => (get(isDesktop) ? [56, 38] : [28, 20]),
	target: useTemplateRef<HTMLElement>('lines')
});

const streams = computed(() => {
	const s = get(station);
	return s ? [...s.mounts, ...s.remotes] : [];
});

const selectedUrl = useLocalStorage<string | null>('radio:stream', null);
const streamUrl = computed(
	() =>
		get(streams).find(({ url }) => url === get(selectedUrl))?.url ??
		get(station)?.listen_url ??
		get(streams)[0]?.url ??
		null
);

const historyOpen = ref(false);

useFavicon(art);

useHead({ title: computed(() => get(song)?.text || 'gongo.fm') });

useSeoMeta({
	description: 'gongo.fm',
	ogUrl: '/content/radio',
	ogAudio: computed(() => get(streamUrl) ?? undefined)
});
</script>

<template>
	<div id="radio" :class="{ titled: headerTitle }" :style="{ '--lines-height': `${linesHeight}px` }">
		<img class="art" :src="art ?? undefined" :title="offline ? 'OFFLINE' : song?.album || undefined" />

		<RadioPlayer
			v-if="!offline && streamUrl"
			class="player"
			:src="streamUrl"
			:song="song"
			:elapsed="elapsed"
			:duration="duration"
			@history="historyOpen = true">
			<select v-if="streams.length > 1" v-model="selectedUrl" class="stream-select" title="Stream">
				<option v-for="stream in streams" :key="stream.url" :value="stream.url">{{ stream.name }}</option>
			</select>
		</RadioPlayer>

		<div v-if="!offline && lineTexts.length" ref="lines" class="lines">
			<Blotter
				:text="lineTexts"
				:font-size="lineSizes"
				:material-uniforms="{ uSpeed: 0.16, uVolatility: 0.01 }"
				material="liquidDistort"
				font-family="VCR OSD" />
		</div>
	</div>

	<RadioHistory v-model:open="historyOpen" :history="history" />
</template>

<style scoped>
/*
 * art, player and lines stacked under the diamond's header; positions are offsets from the screen
 * centre (the diamond's), since a % inside --art-size would resolve against the column's width
 */
#radio {
	--gap: calc(var(--menu-row-gap) * 0.25);
	--margin: calc(12 * var(--menu-unit));
	--player-height: 40px;

	--top: calc(var(--menu-top-offset) - var(--menu-header-gap) + var(--margin));
	/* below this the rhombus is too narrow to write the album and artist in */
	--floor: calc(var(--diamond-height) * 0.38);

	/* the art is the only row that shrinks to fit; --lines-height is reserved by the script */
	--art-room: calc(var(--floor) - var(--top) - var(--player-height) - var(--lines-height) - 2 * var(--gap));
	--art-size: min(72%, calc(var(--diamond-height) * 0.25), max(0px, var(--art-room)));

	align-items: center;
	display: flex;
	flex-direction: column;
	gap: var(--gap);
	/* centred without a transform, which would become the volume popover's containing block */
	inset-inline: 0;
	margin-inline: auto;
	position: fixed;
	top: calc(50% + var(--top));
	width: min(90vw, calc(3 * var(--menu-tile-width) + 2 * var(--menu-column-gap)));
	z-index: 3;

	/* the song title in the header sits one gap higher than LIVE / OFFLINE */
	&.titled {
		--top: calc(var(--menu-top-offset) - var(--menu-header-gap) * 2 + var(--margin));
	}

	& .art {
		aspect-ratio: 1;
		display: block;
		object-fit: cover;
		width: var(--art-size);
	}

	& .player {
		width: var(--art-size);
	}

	& .stream-select {
		background: transparent;
		border: 0;
		color: var(--color-text-secondary);
		font: inherit;
		max-width: 40%;
		min-width: 0;

		& option {
			background: var(--color-surface);
			color: var(--color-text);
		}
	}

	/* full column width, so the width the lines are fitted to never depends on what they drew */
	& .lines {
		align-self: stretch;
		filter: drop-shadow(3px 0 0 #000) drop-shadow(-3px 0 0 #000) drop-shadow(0 3px 0 #000)
			drop-shadow(0 -3px 0 #000);
	}

	@media (max-width: 899px) {
		--margin: calc(8 * var(--menu-unit));

		& .player {
			width: min(90%, 14rem);
		}
	}
}
</style>
