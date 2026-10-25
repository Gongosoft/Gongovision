<script setup lang="ts">
import closeSVG from '@/assets/images/window-close.svg?raw';
import { formatTimeAgo, get, useIntervalFn, useNow } from '@vueuse/core';
import { useTemplateRef, watch } from 'vue';
import type { ApiNowPlayingSongHistory, ApiSong } from '@/types/azuracast.d.ts';

defineProps<{ history: ApiNowPlayingSongHistory[] }>();

const open = defineModel<boolean>('open', { default: false });

const dialog = useTemplateRef<HTMLDialogElement>('dialog');

watch(open, (value) => {
	const element = get(dialog);
	if (value && !element?.open) {
		element?.showModal();
	} else if (!value) {
		element?.close();
	}
});

function byline({ artist, album }: ApiSong): string {
	return [artist, album].filter(Boolean).join(' - ');
}

const now = useNow({ scheduler: (update) => useIntervalFn(update, 30_000) });

function timeAgo(unixSeconds: number): string {
	return formatTimeAgo(new Date(unixSeconds * 1000), {}, get(now));
}
</script>

<template>
	<dialog
		ref="dialog"
		class="media-skin radio-history"
		data-theme="default"
		data-preset="live-audio"
		@click.self="open = false"
		@close="open = false">
		<header>
			<h2>Song History</h2>
			<button type="button" class="radio-history-close" title="Close" aria-label="Close" @click="open = false">
				<span v-html="closeSVG" />
			</button>
		</header>
		<p v-if="!history.length" class="radio-status">no records to display.</p>
		<ol v-else>
			<li v-for="row in history" :key="row.sh_id">
				<img v-if="row.song.art" :src="row.song.art" alt="" loading="lazy" />
				<div class="radio-meta">
					<span class="radio-title">{{ row.song.title ?? row.song.text }}</span>
					<span class="radio-byline">{{ byline(row.song) }}</span>
				</div>
				<small>{{ timeAgo(row.played_at) }}</small>
			</li>
		</ol>
	</dialog>
</template>

<style scoped>
.radio-status {
	color: var(--color-text-muted);
	margin: 0;
	text-align: center;
}

.radio-history {
	background: var(--media-controls);
	backdrop-filter: var(--media-backdrop-filter-surface);
	border: 0;
	border-radius: calc(var(--media-spacing) * 5);
	box-shadow:
		0 0 0 1px var(--media-surface-border, var(--media-border)),
		var(--media-shadow-surface);
	color: var(--media-controls-foreground);
	font-size: 14px;
	margin: auto;
	max-height: 70vh;
	padding: calc(var(--media-spacing) * 3) calc(var(--media-spacing) * 4) calc(var(--media-spacing) * 2);
	width: min(90vw, 32rem);

	&::backdrop {
		background: color-mix(in oklab, var(--media-backdrop) 65%, transparent);
	}

	& header {
		align-items: center;
		display: flex;
		gap: calc(var(--media-spacing) * 2);
		justify-content: space-between;
		margin-bottom: calc(var(--media-spacing) * 2);
	}

	& h2 {
		color: var(--media-muted-foreground);
		font-size: inherit;
		font-weight: normal;
		letter-spacing: 1px;
		margin: 0;
		text-transform: uppercase;
	}

	& .radio-history-close {
		align-items: center;
		background: none;
		border: 0;
		border-radius: var(--media-control-radius);
		color: var(--media-muted-foreground);
		cursor: pointer;
		display: flex;
		justify-content: center;
		padding: calc(var(--media-spacing) * 2);
		transition:
			background-color var(--media-duration-fast) ease,
			color var(--media-duration-fast) ease;

		&:hover {
			background: var(--media-muted);
			color: var(--media-controls-foreground);
		}

		& :deep(svg) {
			display: block;
			fill: currentColor;
			height: calc(var(--media-spacing) * 5);
			width: calc(var(--media-spacing) * 5);
		}
	}

	& ol {
		display: flex;
		flex-direction: column;
		gap: calc(var(--media-spacing) * 0.5);
		list-style: none;
		margin: 0;
		max-height: 55vh;
		overflow-y: auto;
		padding: 0;
	}

	& li {
		align-items: center;
		border-radius: var(--media-menu-item-radius);
		display: flex;
		gap: calc(var(--media-spacing) * 3);
		padding: calc(var(--media-spacing) * 2) calc(var(--media-spacing) * 1.5);

		&:hover {
			background: var(--media-muted);
		}
	}

	& img {
		background: var(--media-muted);
		border-radius: calc(var(--media-spacing) * 2);
		flex-shrink: 0;
		height: calc(var(--media-spacing) * 11);
		object-fit: cover;
		width: calc(var(--media-spacing) * 11);
	}

	& small {
		color: var(--media-muted-foreground);
		flex-shrink: 0;
		font-size: inherit;
	}

	& .radio-meta {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 2px;
		min-width: 0;

		& .radio-title,
		& .radio-byline {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		& .radio-byline {
			color: var(--media-muted-foreground);
		}
	}
}
</style>
