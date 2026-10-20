import { ref, toValue, watch } from 'vue';
import { get, useDevicePixelRatio, useElementBounding, useThrottleFn, useWindowSize } from '@vueuse/core';
import type { CSSProperties, MaybeRefOrGetter, Ref } from 'vue';

interface ScanlineBorderOptions {
	/** scanlines across the full screen height (240 for 240p) */
	lines: number;
	/** border thickness, in scanlines */
	width: number;
	/** how soft the ends of each scanline are, in scanlines */
	blur: number;
	/** any css colour */
	color: string;
}

/** where the canvas sits and what it covers, in device pixels */
interface Frame {
	left: number;
	top: number;
	columns: number;
	rows: number;
	/** device pixels per scanline (a whole number, so every line is the same height) */
	lineHeight: number;
	centreX: number;
	centreY: number;
	halfWidth: number;
	halfHeight: number;
}

/** viewport-relative box of the target, in css pixels */
interface TargetBounds {
	left: number;
	top: number;
	width: number;
	height: number;
}

function measure(rect: TargetBounds, dpr: number, screenHeight: number, options: ScanlineBorderOptions): Frame {
	const lineHeight = Math.max(1, Math.round((screenHeight * dpr) / options.lines));
	const margin = (options.width + options.blur) * lineHeight;
	const left = Math.floor(rect.left * dpr - margin);
	const top = Math.floor(rect.top * dpr - margin);

	return {
		left,
		top,
		columns: Math.ceil(rect.width * dpr + margin * 2),
		rows: Math.ceil((rect.height * dpr + margin * 2) / lineHeight),
		lineHeight,
		centreX: (rect.left + rect.width / 2) * dpr - left,
		centreY: (rect.top + rect.height / 2) * dpr - top,
		halfWidth: (rect.width * dpr) / 2,
		halfHeight: (rect.height * dpr) / 2
	};
}

/**
 * one canvas row per scanline, sampled at the row's centre, so the edge steps down a line at a time
 */
function paint(ctx: CanvasRenderingContext2D, frame: Frame, options: ScanlineBorderOptions): void {
	const { columns, rows, lineHeight, centreX, centreY, halfWidth, halfHeight } = frame;
	const thickness = options.width * lineHeight;
	const diagonal = Math.hypot(halfWidth, halfHeight);
	// turns |x| / halfWidth + |y| / halfHeight - 1 (zero on the edge) into a distance from the edge
	const toDistance = (halfWidth * halfHeight) / diagonal;
	// a horizontal blur softens the slanted edge by this much, measured across it
	const softness = Math.max(0.5, (options.blur * lineHeight * halfHeight) / diagonal);
	const reach = (thickness / 2 + softness) / toDistance;
	const image = ctx.createImageData(columns, rows);

	for (let row = 0; row < rows; row++) {
		const dy = Math.abs((row + 0.5) * lineHeight - centreY) / halfHeight;
		// only the stretch of this row near the edge can be lit, on each side of the centre
		const outer = halfWidth * (1 - dy + reach);
		const inner = Math.max(0, halfWidth * (1 - dy - reach));
		if (outer <= 0) {
			continue;
		}
		const spans: [number, number][] =
			inner === 0
				? [[-outer, outer]]
				: [
						[-outer, -inner],
						[inner, outer]
					];
		for (const [from, to] of spans) {
			const end = Math.min(columns, Math.ceil(centreX + to));
			for (let x = Math.max(0, Math.floor(centreX + from)); x < end; x++) {
				const dx = Math.abs(x + 0.5 - centreX) / halfWidth;
				const distance = (dx + dy - 1) * toDistance;
				const alpha = Math.min(1, Math.max(0, (thickness / 2 - Math.abs(distance)) / softness + 0.5));
				image.data[(row * columns + x) * 4 + 3] = alpha * 255;
			}
		}
	}

	// the image is just a coverage mask; colour it in one go so any css colour works
	ctx.putImageData(image, 0, 0);
	ctx.globalCompositeOperation = 'source-in';
	ctx.fillStyle = options.color;
	ctx.fillRect(0, 0, columns, rows);
	ctx.globalCompositeOperation = 'source-over';
}

interface UseScanlineBorderReturn {
	/** places the canvas over the target; bind it to the canvas element */
	style: Ref<CSSProperties>;
}

/**
 * Draws a border around the diamond inscribed in `target` the way it looks on stream, where the picture goes
 * through a low-res NTSC mixer and a line doubler: hard steps one scanline tall, soft along each line.
 * Only redrawn when the target or the screen size changes.
 */
export function useScanlineBorder(
	canvas: MaybeRefOrGetter<HTMLCanvasElement | null>,
	target: MaybeRefOrGetter<HTMLElement | null>,
	options: MaybeRefOrGetter<ScanlineBorderOptions>
): UseScanlineBorderReturn {
	const bounds = useElementBounding(target);
	const { pixelRatio } = useDevicePixelRatio();
	const { height: screenHeight } = useWindowSize();
	const style = ref<CSSProperties>({});

	const draw = useThrottleFn(
		() => {
			const element = toValue(canvas);
			const ctx = element?.getContext('2d');
			if (!element || !get(bounds.width) || !ctx) {
				return;
			}
			const rect = {
				left: get(bounds.left),
				top: get(bounds.top),
				width: get(bounds.width),
				height: get(bounds.height)
			};
			const dpr = get(pixelRatio);
			const frame = measure(rect, dpr, get(screenHeight), toValue(options));
			element.width = frame.columns;
			element.height = frame.rows;
			style.value = {
				left: `${frame.left / dpr}px`,
				top: `${frame.top / dpr}px`,
				width: `${frame.columns / dpr}px`,
				height: `${(frame.rows * frame.lineHeight) / dpr}px`
			};
			paint(ctx, frame, toValue(options));
		},
		100,
		true
	);

	watch(
		[
			bounds.width,
			bounds.height,
			bounds.left,
			bounds.top,
			pixelRatio,
			screenHeight,
			(): ScanlineBorderOptions => toValue(options)
		],
		() => {
			void draw();
		},
		{ deep: true, immediate: true }
	);

	return { style };
}
