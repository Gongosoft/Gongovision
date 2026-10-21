import Hls from 'hls.js';
import { ref } from 'vue';
import { BufferSource, BufferTarget, Conversion, Input, Mp4OutputFormat, MPEG_TS, Output } from 'mediabunny';
import type { Ref } from 'vue';
import type {
	FragmentLoaderConstructor,
	FragmentLoaderContext,
	HlsConfig,
	Loader,
	LoaderCallbacks,
	LoaderConfiguration
} from 'hls.js';

const CLIP_SECONDS = 60;
const KEEP_SECONDS = CLIP_SECONDS + 30;

interface Segment {
	start: number;
	end: number;
	level: number;
	data: ArrayBuffer;
}

interface UseClipRecorderReturn {
	fLoader: FragmentLoaderConstructor;
	saving: Ref<boolean>;
	save: (currentTime: number, name: string) => Promise<void>;
	clear: () => void;
}

export function useClipRecorder(): UseClipRecorderReturn {
	const segments: Segment[] = [];
	const saving = ref(false);

	function keep(context: FragmentLoaderContext, data: ArrayBuffer): void {
		const { frag, part } = context;
		const { type }: { type: string } = frag;
		if (part || frag.sn === 'initSegment' || type !== 'main') {
			return;
		}
		const segment = { start: frag.start, end: frag.end, level: frag.level, data: structuredClone(data) };
		const index = segments.findIndex((s) => Math.abs(s.start - segment.start) < 0.05);
		if (index === -1) {
			segments.push(segment);
			segments.sort((a, b) => a.start - b.start);
		} else {
			segments[index] = segment;
		}
		const newest = segments.at(-1)!.end;
		while (segments.length > 1 && segments[0]!.end < newest - KEEP_SECONDS) {
			segments.shift();
		}
	}

	const Base = Hls.DefaultConfig.loader as unknown as new (config: HlsConfig) => Loader<FragmentLoaderContext>;

	class ClipFragmentLoader extends Base {
		public override load(
			context: FragmentLoaderContext,
			config: LoaderConfiguration,
			callbacks: LoaderCallbacks<FragmentLoaderContext>
		): void {
			super.load(context, config, {
				...callbacks,
				onSuccess: (response, stats, ctx, details) => {
					if (response.data instanceof ArrayBuffer) {
						keep(ctx, response.data);
					}
					callbacks.onSuccess(response, stats, ctx, details);
				}
			});
		}
	}

	async function save(currentTime: number, name: string): Promise<void> {
		if (saving.value) {
			return;
		}
		const from = currentTime - CLIP_SECONDS;
		const window = segments.filter((s) => s.end > from && s.start < currentTime);
		const level = window.at(-1)?.level;
		const picked = window.slice(window.findLastIndex((s) => s.level !== level) + 1);
		if (!picked.length) {
			return;
		}
		saving.value = true;
		try {
			const blob = await new Blob(picked.map((s) => s.data)).arrayBuffer();
			const input = new Input({ formats: [MPEG_TS], source: new BufferSource(blob) });
			const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
			const offset = (await input.getFirstTimestamp()) - picked[0]!.start;
			const conversion = await Conversion.init({
				input,
				output,
				trim: { start: Math.max(picked[0]!.start, from) + offset, end: currentTime + offset },
				copy: { mode: 'forced', shiftTolerance: Infinity }
			});
			if (!conversion.isValid) {
				throw new Error(`clip conversion failed: ${JSON.stringify(conversion.discardedTracks)}`);
			}
			await conversion.execute();
			const url = URL.createObjectURL(new Blob([output.target.buffer!], { type: 'video/mp4' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = `${name}.mp4`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} finally {
			saving.value = false;
		}
	}

	return {
		fLoader: ClipFragmentLoader,
		saving,
		save,
		clear: () => {
			segments.length = 0;
		}
	};
}
