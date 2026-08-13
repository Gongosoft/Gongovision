import { computed } from 'vue';
import { get, useFetch } from '@vueuse/core';
import type { Ref } from 'vue';
import type { VOD } from '@/types/b2.d.ts';

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

function resolveThumbnail(title: string): string | null {
	return thumbnails[title] ?? null;
}

interface UseVODsReturn {
	vods: Ref<VOD[]>;
	totalSize: Ref<number>;
	loading: Ref<boolean>;
	errorMessage: Ref<string | null>;
	refresh: () => Promise<void>;
}

export function useVODs(): UseVODsReturn {
	const { data, error, isFetching, execute } = useFetch('/vods/list').get().json<VOD[]>();

	return {
		vods: computed(() =>
			(get(data) ?? [])
				.toSorted((a, b) => b.name.localeCompare(a.name))
				.map((vod) => Object.assign(vod, { thumbnail: resolveThumbnail(vod.name) }))
		),
		totalSize: computed(() => (get(data) ?? []).reduce((sum, vod) => sum + vod.size, 0)),
		loading: isFetching,
		errorMessage: computed(() => (get(error) ? String(get(error)) : null)),
		refresh: execute
	};
}
