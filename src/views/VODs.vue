<script setup lang="ts">
import '@/styles/status.css';
import backSVG from '@/assets/images/arrow-left.svg?raw';
import shuffleSVG from '@/assets/images/shuffle.svg?raw';
import fallbackThumb from '@/assets/images/thumbnails/fallback.avif';
import { useTemplateRef } from 'vue';
import { useHead } from '@unhead/vue';
import { RouterLink, useRouter } from 'vue-router';
import { get, useEventListener } from '@vueuse/core';
import { stripVODExtension, stripVODPrefix, useVODs } from '@/composables/useVODs.ts';
import type { VOD } from '@/composables/useVODs.ts';

useHead({ title: 'VODs' });

const router = useRouter();
const { vods, loading, errorMessage, refresh } = useVODs();

const formatPath = (vod: VOD): string =>
	`/vods/${encodeURIComponent(decodeURIComponent(vod.title).replace(/^vods\//, ''))}`;
const formatSize = (bytes: number): string =>
	bytes ? `${bytes / 1e9 >= 0.1 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`}` : '';
const formatTitle = (vod: VOD): string => stripVODExtension(decodeURIComponent(stripVODPrefix(vod.title)));

function shuffle(): void {
	const list = get(vods);
	if (list.length === 0) {
		return;
	}
	const pick = list[Math.floor(Math.random() * list.length)]!;
	router.push(formatPath(pick));
}

const randomized = new WeakSet<Element>();
const gridRef = useTemplateRef<HTMLElement>('gridRef');

useEventListener(gridRef, 'mouseover', (e) => {
	const card = (e.target as Element).closest?.('.card');
	if (card instanceof HTMLElement && !randomized.has(card)) {
		randomized.add(card);
		card.style.setProperty('--delay', `-${Math.random() * 30}s`);
	}
});
</script>

<template>
	<div id="vods-navbar">
		<RouterLink title="Back" to="/">
			<span class="icon icon-animated" v-html="backSVG" />
		</RouterLink>
		<button title="Shuffle" class="shuffle-button" @click="shuffle">
			<span class="icon icon-animated" v-html="shuffleSVG" />
		</button>
	</div>
	<div id="vods">
		<div v-if="loading"></div>
		<div v-else-if="errorMessage" class="status status-fill status-muted">
			<span class="status-error">{{ errorMessage }}</span>
			<button class="status-retry" @click="refresh">retry</button>
		</div>
		<div v-else-if="vods.length === 0" class="status status-fill status-muted">
			<span>no VODs available.</span>
		</div>
		<div v-else ref="gridRef" class="grid">
			<RouterLink v-for="vod in vods" :key="vod.title" :to="formatPath(vod)" class="card">
				<div class="thumbnail">
					<img :src="vod.thumbnailURL ?? fallbackThumb" :alt="formatTitle(vod)" loading="lazy" />
				</div>
				<div class="card-info">
					<span class="vod-title">{{ formatTitle(vod) }}</span>
					<span v-if="vod.size" class="vod-size">{{ formatSize(vod.size) }}</span>
				</div>
			</RouterLink>
		</div>
	</div>
</template>

<style scoped>
#vods-navbar {
	align-items: center;
	display: flex;
	gap: 1.5rem;
	left: 50%;
	position: fixed;
	top: 1rem;
	transform: translateX(-50%);
	z-index: 3;

	& :deep(.icon svg) {
		width: 2rem;
		height: 2rem;
	}

	& #shuffle-vod {
		all: unset;
		cursor: pointer;

		& :deep(.icon svg) {
			width: 2.42rem;
			height: 2.42rem;
		}
	}
}

#vods {
	position: fixed;
	inset: 0;
	overflow-y: auto;
	padding: 5rem 2rem 6rem;

	& .grid {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		justify-content: center;
		align-content: center;
		min-height: 100%;
	}

	& .card {
		animation: borderShift 30s linear infinite;
		animation-delay: var(--delay);
		animation-play-state: paused;
		background: var(--color-surface);
		border-radius: 6px;
		border: 1px solid var(--color-border);
		color: inherit;
		display: flex;
		flex: 0 1 20rem;
		flex-direction: column;
		min-width: 18rem;
		max-width: 20rem;
		overflow: hidden;
		text-decoration: none;

		&:hover {
			animation-play-state: running;

			& .vod-title,
			& .vod-size {
				animation-play-state: running;
			}
		}
	}

	& .thumbnail {
		aspect-ratio: 16 / 9;
		overflow: hidden;
		background: var(--color-surface-alt);

		& img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
	}

	& .card-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		gap: 0.5rem;
	}

	& .vod-title {
		animation: colorShift 30s linear infinite;
		animation-play-state: paused;
		animation-delay: var(--delay);
		color: var(--color-text-secondary);
		flex: 1;
		font-size: 0.85rem;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	& .vod-size {
		animation: colorShift 30s linear infinite;
		animation-play-state: paused;
		animation-delay: var(--delay);
		color: var(--color-text-muted);
		flex-shrink: 0;
		font-size: 0.7rem;
	}
}
</style>
