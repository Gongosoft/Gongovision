<script setup lang="ts">
import '@/styles/status.css';
import shuffleSVG from '@/assets/images/shuffle.svg?raw';
import fallbackThumb from '@/assets/images/thumbnail-fallback.avif';
import { ref, watch } from 'vue';
import { useHead } from '@unhead/vue';
import { RouterLink, useRouter } from 'vue-router';
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
	const list = vods.value;
	if (list.length === 0) {
		return;
	}
	const pick = list[Math.floor(Math.random() * list.length)]!;
	router.push(formatPath(pick));
}

const delays = ref<number[]>([]);

watch(vods, (list) => {
	delays.value = list.map(() => Math.random() * 30);
});
</script>

<template>
	<button title="Shuffle" class="shuffle-button" @click="shuffle">
		<span class="icon icon-animated" v-html="shuffleSVG" />
	</button>
	<div class="vods-page">
		<div v-if="loading"></div>
		<div v-else-if="errorMessage" class="status status-fill status-muted">
			<span class="status-error">{{ errorMessage }}</span>
			<button class="status-retry" @click="refresh">retry</button>
		</div>
		<div v-else-if="vods.length === 0" class="status status-fill status-muted">
			<span>no VODs available.</span>
		</div>
		<div v-else class="grid">
			<RouterLink
				v-for="(vod, i) in vods"
				:key="vod.title"
				:to="formatPath(vod)"
				class="card"
				:style="{ animationDelay: `-${delays[i] ?? 0}s` }">
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
.shuffle-button {
	all: unset;
	cursor: pointer;
	position: fixed;
	top: 1rem;
	left: 50%;
	transform: translateX(-50%);
	z-index: 100;

	& :deep(.icon svg) {
		width: 2rem;
		height: 2rem;
	}
}

.vods-page {
	position: fixed;
	inset: 0;
	z-index: 0;
	overflow-y: auto;
	padding: 5rem 2rem 6rem 2rem;
	display: flex;
	flex-direction: column;

	& .grid {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 20rem));
		gap: 1.5rem;
		justify-content: center;
		align-content: center;
	}

	& .card {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
		background: var(--color-surface);
		text-decoration: none;
		color: inherit;

		&:hover {
			animation: borderShift 30s linear infinite;
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
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	& .vod-size {
		font-size: 0.7rem;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
}
</style>
