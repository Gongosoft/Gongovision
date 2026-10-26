<script setup lang="ts">
import OSMO from '@/assets/audio/OSMO.opus?url';
import daxMugSrc from '@/assets/images/emotes/bttv/daxMug.webp';
import omoLurkSrc from '@/assets/images/emotes/7tv/omoLurk.avif';
import { Howl } from 'howler';
import { computed, ref, watch } from 'vue';
import {
	get,
	TransitionPresets,
	useDocumentVisibility,
	useIdle,
	useImage,
	useTimeoutFn,
	useTransition
} from '@vueuse/core';
import type { CubicBezierPoints, EasingFunction } from '@vueuse/core';

const { effects = {}, contained = false } = defineProps<{
	effects?: { omoLurk?: boolean; daxMug?: boolean };
	contained?: boolean;
}>();

const showOmoLurk = computed(() => effects.omoLurk ?? true);
const showDaxMug = computed(() => effects.daxMug ?? true);

const { idle } = useIdle(10_000);

const documentVisibility = useDocumentVisibility();

const { isLoading: daxLoading } = useImage({ src: daxMugSrc }, { immediate: get(showDaxMug), delay: 5000 });
const daxRetry = ref(false);
const daxVisibility = ref(false);
const daxTimeout = useTimeoutFn(() => {
	daxVisibility.value = false;
}, 150);

const omoVisibility = ref(0);
const omoClick = get(showOmoLurk)
	? new Howl({
			src: OSMO,
			format: ['opus'],
			volume: 0.42
		})
	: null;
const omoDuration = ref(1500);
const omoEasing = ref<EasingFunction | CubicBezierPoints>(TransitionPresets.easeInCubic);

const output = useTransition(omoVisibility, { duration: omoDuration, transition: omoEasing });

watch(idle, (isIdle) => {
	if (!get(showOmoLurk)) {
		return;
	}
	if (isIdle) {
		omoDuration.value = 1500;
		omoEasing.value = TransitionPresets.easeInCubic;
		omoVisibility.value = 1;
	} else {
		omoDuration.value = 200;
		omoEasing.value = TransitionPresets.linear;
		omoVisibility.value = 0;
	}
});

watch(documentVisibility, (current, previous) => {
	if (!get(showDaxMug)) {
		return;
	}
	if (current === 'visible' && previous === 'hidden') {
		if (Math.random() >= 0.99) {
			if (get(daxRetry) || !get(daxLoading)) {
				daxVisibility.value = true;
				daxRetry.value = false;
			} else {
				daxRetry.value = true;
			}
		}
		daxTimeout.start();
	}
});
</script>

<template>
	<div v-if="showDaxMug && daxVisibility" id="daxMug" :class="{ contained }">
		<img :src="daxMugSrc" alt="..." />
	</div>
	<img v-if="showOmoLurk" id="omoLurk" :class="{ contained }" :src="omoLurkSrc" alt="..." @click="omoClick?.play()" />
</template>

<style scoped>
#daxMug,
#omoLurk {
	position: fixed;

	&.contained {
		position: absolute;
	}
}

#daxMug {
	inset: 0;
	overflow: hidden;
	pointer-events: none;
	z-index: 1;

	& img {
		object-fit: contain;
		width: 100%;
		height: 100%;
	}
}

#omoLurk {
	bottom: 0;
	cursor: pointer;
	left: 50%;
	pointer-events: auto;
	transform: v-bind('`translateX(-50%) translateY(${(1 - output) * 110}%)`');
	user-select: none;
	z-index: 1;
}
</style>
