import { computed } from 'vue';
import { get, useFetch } from '@vueuse/core';
import type { Ref } from 'vue';

export interface VOD {
	title: string;
	videoURL: string;
	thumbnailURL?: string | null;
	size: number;
}

const thumbnails = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>('../assets/images/thumbnails/*.avif', {
			eager: true,
			import: 'default',
			query: '?no-inline'
		})
	).map(([key, url]) => [
		key
			.split('/')
			.pop()!
			.replace(/\.[^.]+$/, ''),
		url
	])
);

export function stripVODExtension(filename: string): string {
	return filename.replace(/\.[^.]+$/, '');
}

export function stripVODPrefix(filename: string): string {
	return filename.replace(/^vods\//, '');
}

function resolveThumbnail(title: string): string | null {
	const baseName = stripVODExtension(decodeURIComponent(stripVODPrefix(title)));
	return thumbnails[baseName] ?? null;
}

interface UseVODsReturn {
	vods: Ref<VOD[]>;
	loading: Ref<boolean>;
	errorMessage: Ref<string | null>;
	refresh: () => Promise<void>;
}

export function useVODs(): UseVODsReturn {
	const { data, error, isFetching, execute } = useFetch('/vods/list').get().json<VOD[]>();

	return {
		vods: computed(() =>
			(get(data) ?? [])
				.toSorted((a, b) => b.title.localeCompare(a.title))
				.map((vod) => Object.assign(vod, { thumbnailURL: resolveThumbnail(vod.title) }))
		),
		loading: isFetching,
		errorMessage: computed(() => (get(error) ? String(get(error)) : null)),
		refresh: execute
	};
}
