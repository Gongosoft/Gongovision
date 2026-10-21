<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import type { LiveStreamPlayerElement } from '@/components/videojs/player.ts';

const KEY_STEP = 5;

const { player } = defineProps<{ player: LiveStreamPlayerElement | null }>();

type Store = LiveStreamPlayerElement['store'];

const state = shallowRef<Pick<Store, 'buffered' | 'currentTime' | 'seekable'> | null>(null);
const slider = ref<HTMLElement | null>(null);
const pointer = ref<number | null>(null);

let unsubscribe: (() => void) | undefined = undefined;

watch(
	() => player?.store,
	(store) => {
		unsubscribe?.();
		if (!store) {
			return;
		}
		const sync = (): void => {
			state.value = { buffered: store.buffered, currentTime: store.currentTime, seekable: store.seekable };
		};
		unsubscribe = store.subscribe(sync);
		sync();
	},
	{ immediate: true }
);

onScopeDispose(() => unsubscribe?.());

/** the slider spans the stream's current seekable window rather than everything since playback began */
const range = computed(() => {
	const last = state.value?.seekable.at(-1);
	if (!last || !Number.isFinite(last[1]) || last[1] <= last[0]) {
		return null;
	}
	return { start: last[0], end: last[1] };
});

function toFraction(time: number): number {
	const r = range.value;
	return r ? Math.min(1, Math.max(0, (time - r.start) / (r.end - r.start))) : 0;
}

const fill = computed(() => toFraction(state.value?.currentTime ?? 0));

const buffer = computed(() => {
	const now = state.value?.currentTime ?? 0;
	const current = state.value?.buffered.find(([start, end]) => start <= now + 0.5 && end >= now);
	return toFraction(current?.[1] ?? now);
});

const behind = computed(() => (range.value ? Math.max(0, range.value.end - (state.value?.currentTime ?? 0)) : 0));

function fractionAt(event: PointerEvent): number {
	const rect = slider.value!.getBoundingClientRect();
	return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
}

function seekTo(fraction: number): void {
	const r = range.value;
	if (r) {
		void player?.store.seek(r.start + fraction * (r.end - r.start));
	}
}

function onPointerDown(event: PointerEvent): void {
	if (event.button !== 0 || !range.value) {
		return;
	}
	slider.value!.setPointerCapture(event.pointerId);
	pointer.value = fractionAt(event);
}

function onPointerMove(event: PointerEvent): void {
	if (pointer.value !== null) {
		pointer.value = fractionAt(event);
	}
}

function onPointerUp(): void {
	if (pointer.value !== null) {
		seekTo(pointer.value);
		pointer.value = null;
	}
}

function onKeyDown(event: KeyboardEvent): void {
	const r = range.value;
	if (!r) {
		return;
	}
	const now = state.value?.currentTime ?? r.start;
	const targets: Record<string, number> = {
		ArrowLeft: now - KEY_STEP,
		ArrowRight: now + KEY_STEP,
		Home: r.start,
		End: r.end
	};
	const target = targets[event.key];
	if (target === undefined) {
		return;
	}
	event.preventDefault();
	event.stopPropagation();
	void player?.store.seek(Math.min(r.end, Math.max(r.start, target)));
}

const percent = (fraction: number): string => `${fraction * 100}%`;
</script>

<template>
	<div
		ref="slider"
		class="media-slider media-time-slider"
		role="slider"
		tabindex="0"
		aria-label="Seek"
		aria-valuemin="0"
		:aria-valuemax="Math.round((range?.end ?? 0) - (range?.start ?? 0))"
		:aria-valuenow="Math.round((state?.currentTime ?? 0) - (range?.start ?? 0))"
		:aria-valuetext="behind < 1 ? 'Live' : `${Math.round(behind)} seconds behind live`"
		data-orientation="horizontal"
		:data-disabled="range ? undefined : ''"
		:data-dragging="pointer === null ? undefined : ''"
		:style="{
			'--media-slider-fill': percent(fill),
			'--media-slider-buffer': percent(buffer),
			'--media-slider-pointer': percent(pointer ?? fill)
		}"
		@pointerdown="onPointerDown"
		@pointermove="onPointerMove"
		@pointerup="onPointerUp"
		@pointercancel="pointer = null"
		@keydown="onKeyDown">
		<div class="media-slider-track" data-orientation="horizontal">
			<div class="media-slider-buffer" data-orientation="horizontal"></div>
			<div class="media-slider-fill" data-orientation="horizontal"></div>
		</div>
		<div class="media-slider-thumb" data-orientation="horizontal"></div>
	</div>
</template>
