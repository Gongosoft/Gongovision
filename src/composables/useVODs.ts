import { computed } from 'vue';
import { useFetch } from '@vueuse/core';
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

export function useVODs(): {
	vods: Ref<VOD[]>;
	loading: Ref<boolean>;
	errorMessage: Ref<string | null>;
	refresh: () => Promise<void>;
} {
	const { data, error, isFetching, execute } = useFetch('/vods/list').get().json<VOD[]>();

	return {
		vods: computed(() => (data.value ?? []).toSorted((a, b) => b.title.localeCompare(a.title))),
		loading: isFetching,
		errorMessage: computed(() => (error.value ? String(error.value) : null)),
		refresh: execute
	};
}
