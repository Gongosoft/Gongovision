<script setup lang="ts">
import '@/styles/status.css';
import heartSVG from '@/assets/images/heart.svg?raw';
import backSVG from '@/assets/images/arrow-left.svg?raw';
import shuffleSVG from '@/assets/images/shuffle.svg?raw';
import fallbackThumb from '@/assets/images/thumbnails/fallback.avif';
import { useHead } from '@unhead/vue';
import { computed, useTemplateRef } from 'vue';
import { useVODs } from '@/composables/useVODs.ts';
import { RouterLink, useRouter } from 'vue-router';
import { get, useEventListener } from '@vueuse/core';
import type { VOD } from '@/types/b2.d.ts';

const router = useRouter();
const { vods, totalSize, loading, errorMessage, refresh } = useVODs();

const formatPath = (vod: VOD): string => `/vods/${encodeURIComponent(vod.name)}`;
const formatSize = (bytes: number): string =>
	bytes ? `${bytes / 1e9 >= 0.1 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`}` : '';

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

useHead({ title: computed(() => formatSize(get(totalSize)) || 'VODs') });
</script>

<template>
	<div id="vods-navbar">
		<RouterLink title="Back" to="/">
			<span class="icon icon-animated" v-html="backSVG" />
		</RouterLink>
		<RouterLink title="Clips" to="/clips">
			<span class="icon icon-animated" v-html="heartSVG" />
		</RouterLink>
		<button title="Shuffle" id="shuffle-vod" @click="shuffle">
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
			<RouterLink v-for="vod in vods" :key="vod.name" :to="formatPath(vod)" class="card">
				<div class="thumbnail">
					<img :src="vod.thumbnail ?? fallbackThumb" :alt="vod.name" loading="lazy" />
				</div>
				<div class="card-info">
					<span class="vod-title">{{ vod.name }}</span>
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
	inset: 0;
	overflow-y: auto;
	padding: 5rem 2rem 6rem;
	position: fixed;

	& .grid {
		align-content: center;
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		justify-content: center;
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
		flex-direction: column;
		flex: 0 1 20rem;
		max-width: 20rem;
		min-width: 18rem;
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
		background: var(--color-surface-alt);
		overflow: hidden;

		& img {
			display: block;
			object-fit: cover;
			width: 100%;
			height: 100%;
		}
	}

	& .card-info {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		padding: 0.75rem 1rem;
	}

	& .vod-title {
		animation: colorShift 30s linear infinite;
		animation-delay: var(--delay);
		animation-play-state: paused;
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
		animation-delay: var(--delay);
		animation-play-state: paused;
		color: var(--color-text-muted);
		flex-shrink: 0;
		font-size: 0.7rem;
	}
}
</style>
