import { computed } from 'vue';
import { get, useFetch } from '@vueuse/core';
import type { Ref } from 'vue';

export interface VOD {
	title: string;
	videoURL: string;
	thumbnailURL: string | null;
	size: number;
}

export function stripVODExtension(filename: string): string {
	return filename.replace(/\.[^.]+$/, '');
}

export function stripVODPrefix(filename: string): string {
	return filename.replace(/^vods\//, '');
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
		vods: computed(() => (get(data) ?? []).toSorted((a, b) => b.title.localeCompare(a.title))),
		loading: isFetching,
		errorMessage: computed(() => (get(error) ? String(get(error)) : null)),
		refresh: execute
	};
}
