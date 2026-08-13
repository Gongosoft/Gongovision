import { computed } from 'vue';
import { get, useFetch } from '@vueuse/core';
import type { Ref } from 'vue';
import type { B2Object } from '@/types/b2.d.ts';

interface UseClipsReturn {
	clips: Ref<B2Object[]>;
	loading: Ref<boolean>;
	errorMessage: Ref<string | null>;
}

export function useClips(): UseClipsReturn {
	const { data, error, isFetching } = useFetch('/clips/list').get().json<B2Object[]>();

	return {
		clips: computed(() => get(data) ?? []),
		loading: isFetching,
		errorMessage: computed(() => (get(error) ? String(get(error)) : null))
	};
}
