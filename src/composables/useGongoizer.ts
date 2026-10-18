import { useRoute } from 'vue-router';
import { useRouteQuery } from '@vueuse/router';
import { GROUPS } from '@/lib/gongoizer/schema.ts';
import { GongoizerShader } from '@/lib/gongoizer/engine.ts';
import { shuffleGroups } from '@/lib/gongoizer/randomize.ts';
import { fitParam, fitPreset, formatParam } from '@/lib/gongoizer/validate.ts';
import { onScopeDispose, reactive, ref, shallowRef, toValue, watch } from 'vue';
import { BASE, DEFAULT_PRESET, PRESETS, registerPresets, resolvePreset } from '@/lib/gongoizer/presets.ts';
import { useDisplayMedia, useIntervalFn, useLocalStorage, useThrottleFn, useUserMedia } from '@vueuse/core';
import type { LocationQuery } from 'vue-router';
import type { MaybeRefOrGetter, Ref } from 'vue';
import type { AudioSource, GongoizerParams, RandomizeMode } from '@/types/gongoizer.d.ts';

export const PARAMS_STORAGE_KEY = 'gongoizer:params';
export const PRESETS_STORAGE_KEY = 'gongoizer:presets';

const UNDO_LIMIT = 40;

/** read parameter overrides from a query string, fitted to the panel's own bounds */
function readUrlParams(query: LocationQuery): Partial<GongoizerParams> | null {
	const patch: Record<string, number | string> = {};
	for (const [key, base] of Object.entries(BASE)) {
		const raw = query[key];
		if (typeof raw !== 'string' || raw === '') {
			continue;
		}
		const fitted = fitParam(key, typeof base === 'number' ? Number(raw) : raw);
		if (fitted !== undefined) {
			patch[key] = fitted;
		}
	}
	return Object.keys(patch).length > 0 ? patch : null;
}

interface UseGongoizerOptions {
	/** the canvas element to render into (a ref, becomes available after mount) */
	canvas: MaybeRefOrGetter<HTMLCanvasElement | null | undefined>;
	/** preset key to start from */
	preset?: MaybeRefOrGetter<string>;
	/** extra params merged over the preset */
	params?: MaybeRefOrGetter<Partial<GongoizerParams> | undefined>;
	/** remember panel tweaks in localStorage (the page background must not share them) */
	persist?: boolean;
	/** block engine creation until this is true (waiting for params to arrive) */
	gate?: MaybeRefOrGetter<boolean>;
	maxPixels?: number;
	seed?: number | null;
}

export interface UseGongoizerReturn {
	/** the single source of truth for the look (mutated in place, never replaced) */
	params: GongoizerParams;
	/** true once shaders are compiled and the field exists */
	ready: Ref<boolean>;
	/** set when the engine fails (WebGL2 missing, shader compile error...) */
	error: Ref<unknown>;
	/** current adaptive quality scale (1 = full) */
	quality: Ref<number>;
	/** simulation grid size, e.g. "300×134" */
	simSize: Ref<string>;
	/** the preset currently shown in the panel's dropdown ('' once the look has been edited) */
	preset: Ref<string>;
	paused: Ref<boolean>;
	/** the reactive audio feed when listening */
	audioSource: Ref<AudioSource | null>;
	apply: (changes: Partial<GongoizerParams>) => void;
	/** crossfade to a named preset */
	loadPreset: (key: string) => void;
	/** whole-look randomizer / nudge */
	random: () => void;
	variant: () => void;
	/** per-section randomizer / nudge */
	randomSection: (name: string) => void;
	variantSection: (name: string) => void;
	undo: () => void;
	/** restart the field (with crossfade) */
	restart: () => void;
	/** back to the initial preset, forgetting panel tweaks */
	restoreDefaults: () => void;
	/** toggle mic/desktop audio; resolves to the new source (null = off) */
	toggleAudio: (source: AudioSource) => Promise<AudioSource | null>;
	/** save the current look as a named preset (returns the key it was stored under) */
	savePreset: (name: string) => string;
}

export function useGongoizer(options: UseGongoizerOptions): UseGongoizerReturn {
	const engine = shallowRef<GongoizerShader | null>(null);
	const errorRef = ref<unknown>(null);
	const ready = ref(false);
	const quality = ref(1);
	const simSize = ref('');
	const paused = ref(false);
	const audioSource = ref<AudioSource | null>(null);

	/** the two audio inputs; both stay stopped (and unprompted) until the panel asks for them */
	const mic = useUserMedia({
		constraints: { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }
	});
	const desktop = useDisplayMedia({
		audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
		video: true
	});

	watch([mic.enabled, desktop.enabled], ([micOn, desktopOn]) => {
		const active = audioSource.value;
		if ((active === 'mic' && !micOn) || (active === 'desktop' && !desktopOn)) {
			engine.value?.disableAudio();
			audioSource.value = null;
		}
	});

	const initialPreset = ref(toValue(options.preset) ?? DEFAULT_PRESET);
	const preset = ref('');

	const paramsStorage = toValue(options.persist)
		? useLocalStorage<Partial<GongoizerParams>>(PARAMS_STORAGE_KEY, {})
		: null;
	const userPresets = toValue(options.persist)
		? useLocalStorage<Record<string, Partial<GongoizerParams>>>(PRESETS_STORAGE_KEY, {})
		: null;
	if (userPresets) {
		registerPresets(userPresets.value);
	}

	const urlRefs = new Map<string, Ref<string>>();
	for (const [key, base] of Object.entries(BASE)) {
		urlRefs.set(key, useRouteQuery<string>(key, String(base)));
	}
	const urlPatch = readUrlParams(useRoute().query);
	const fromUrl = urlPatch !== null;

	const params = reactive<GongoizerParams>({
		...BASE,
		...(fromUrl ? {} : fitPreset(PRESETS[resolvePreset(initialPreset.value)] ?? PRESETS[DEFAULT_PRESET]!)),
		...(fromUrl ? {} : toValue(options.params)),
		...(fromUrl ? {} : fitPreset(paramsStorage?.value ?? {})),
		...urlPatch
	});

	let applyingPreset = false;
	let shown: GongoizerParams = { ...params };
	watch(
		params,
		() => {
			const edited = Object.keys(params).some((key) => {
				const k = key as keyof GongoizerParams;
				const value = params[k];
				const before = shown[k];
				return typeof value === 'number' && typeof before === 'number'
					? Math.abs(value - before) > 1e-9
					: value !== before;
			});
			shown = { ...params };
			if (edited && !applyingPreset) {
				preset.value = '';
			}
		},
		{ deep: true, flush: 'sync' }
	);

	const writeUrl = useThrottleFn(() => {
		for (const [key, urlRef] of urlRefs) {
			const value = params[key as keyof GongoizerParams];
			const next = typeof value === 'number' ? formatParam(key, value) : value;
			if (urlRef.value !== next) {
				urlRef.value = next;
			}
		}
	}, 400);
	watch(params, writeUrl, { deep: true });

	const history: GongoizerParams[] = [];

	function remember(): void {
		history.push({ ...params });
		if (history.length > UNDO_LIMIT) {
			history.shift();
		}
	}

	async function createEngine(canvas: HTMLCanvasElement | null | undefined, gate: boolean): Promise<void> {
		if (!canvas || !gate || engine.value) {
			return;
		}
		try {
			const shader = new GongoizerShader(canvas, {
				preset: initialPreset.value,
				params: { ...params },
				maxPixels: options.maxPixels,
				seed: options.seed
			});
			shader.onError = (err): void => {
				errorRef.value = err;
			};
			engine.value = shader;
			shader.attachInput();
			shader.start();
			await shader.whenReady();
			ready.value = true;
		} catch (error) {
			errorRef.value = error;
		}
	}

	watch(
		[
			(): HTMLCanvasElement | null | undefined => toValue(options.canvas),
			(): boolean => toValue(options.gate ?? true)
		],
		([canvas, gate]): void => {
			void createEngine(canvas, gate);
		},
		{ immediate: true }
	);

	watch(
		params,
		() => {
			engine.value?.setParams({ ...params });
		},
		{ deep: true }
	);

	/** the engine keeps quality/grid internally, so poll it */
	const refreshStats = useThrottleFn(() => {
		const e = engine.value;
		if (!e) {
			return;
		}
		quality.value = e.quality;
		simSize.value = `${e.simW}x${e.simH}`;
	}, 500);
	watch(
		[engine, ready],
		(): void => {
			void refreshStats();
		},
		{ immediate: true }
	);
	useIntervalFn(refreshStats, 500);

	watch(paused, (p): void => {
		if (p) {
			engine.value?.stop();
		} else {
			engine.value?.start();
		}
	});

	onScopeDispose(() => {
		mic.stop();
		desktop.stop();
		engine.value?.destroy();
		engine.value = null;
	});

	let persistBlockedUntil = 0;
	if (paramsStorage) {
		const persist = useThrottleFn(() => {
			if (performance.now() < persistBlockedUntil) {
				return;
			}
			paramsStorage.value = { ...params };
		}, 300);
		watch(params, persist, { deep: true });
	}

	function apply(changes: Partial<GongoizerParams>): void {
		const before = params.flowMode;
		if (changes.ampTo !== undefined || changes.ampFrom !== undefined) {
			const from = changes.ampFrom ?? params.ampFrom;
			const to = changes.ampTo ?? params.ampTo;
			if (to < from + 0.1) {
				changes.ampTo = Number((from + 0.1 + Math.random() * 0.4).toFixed(2));
			}
		}
		remember();
		Object.assign(params, changes);
		if (params.flowMode !== before) {
			engine.value?.reset();
		}
	}

	function loadPreset(key: string): void {
		const resolved = resolvePreset(key);
		remember();
		applyingPreset = true;
		Object.assign(params, fitPreset(PRESETS[resolved] ?? PRESETS[DEFAULT_PRESET]!));
		applyingPreset = false;
		preset.value = resolved;
		engine.value?.switchTo({ ...params });
	}

	function randomizeAll(mode: RandomizeMode): void {
		const changes = shuffleGroups(GROUPS, { ...params }, mode);
		apply(changes);
	}

	function randomizeSection(name: string, mode: RandomizeMode): void {
		const group = GROUPS.find((g) => g.name === name);
		if (group) {
			apply(shuffleGroups([group], { ...params }, mode));
		}
	}

	function undo(): void {
		const prev = history.pop();
		if (!prev) {
			return;
		}
		Object.assign(params, prev);
	}

	function restoreDefaults(): void {
		if (paramsStorage) {
			paramsStorage.value = null;
			persistBlockedUntil = performance.now() + 500;
		}
		loadPreset(initialPreset.value);
	}

	async function toggleAudio(source: AudioSource): Promise<AudioSource | null> {
		const e = engine.value;
		if (!e) {
			return null;
		}
		if (audioSource.value === source) {
			e.disableAudio();
			(source === 'mic' ? mic : desktop).stop();
			audioSource.value = null;
			return null;
		}
		mic.stop();
		desktop.stop();
		try {
			const stream = await (source === 'mic' ? mic.start() : desktop.start());
			if (!stream) {
				throw new Error(source === 'mic' ? 'microphone unavailable' : 'screen sharing unavailable');
			}
			if (source === 'desktop') {
				for (const track of stream.getVideoTracks()) {
					track.stop();
				}
				if (!stream.getAudioTracks().length) {
					throw new Error('no audio was shared - tick "share system audio" (or tab audio) in the picker');
				}
			}
			await e.enableAudio(stream, source);
			audioSource.value = source;
			if (!params.audio || !params.reactive) {
				apply({ audio: params.audio || 1, reactive: 1 });
			}
			return source;
		} catch (error) {
			mic.stop();
			desktop.stop();
			audioSource.value = null;
			throw error;
		}
	}

	function savePreset(name: string): string {
		const key = name.trim();
		if (!key || PRESETS[key]) {
			return '';
		}
		const diff: Partial<GongoizerParams> = {};
		for (const [k, v] of Object.entries(params)) {
			const base = BASE[k as keyof GongoizerParams];
			if (base !== v) {
				(diff as Record<string, unknown>)[k] = v;
			}
		}
		registerPresets({ [key]: diff });
		if (userPresets) {
			userPresets.value = { ...userPresets.value, [key]: diff };
		}
		return key;
	}

	return {
		params,
		ready,
		error: errorRef,
		quality,
		simSize,
		preset,
		paused,
		audioSource,
		apply,
		loadPreset,
		random: () => randomizeAll('random'),
		variant: () => randomizeAll('variant'),
		randomSection: (name) => randomizeSection(name, 'random'),
		variantSection: (name) => randomizeSection(name, 'variant'),
		undo,
		restart: () => engine.value?.reset(),
		restoreDefaults,
		toggleAudio,
		savePreset
	};
}
