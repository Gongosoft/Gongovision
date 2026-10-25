import { onScopeDispose, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';

/** what the Diamond's Blotter header draws instead of LIVE / OFFLINE; null means the default */
const title = ref<string | null>(null);

interface UseDiamondHeaderReturn {
	/** the text currently drawn in the header, if a page has claimed it */
	title: Ref<string | null>;
	/** draw `value` in the header until the calling component unmounts */
	claim: (value: MaybeRefOrGetter<string | null>) => void;
}

export function useDiamondHeader(): UseDiamondHeaderReturn {
	function claim(value: MaybeRefOrGetter<string | null>): void {
		watch(
			() => toValue(value),
			(next) => {
				title.value = next || null;
			},
			{ immediate: true }
		);

		onScopeDispose(() => {
			title.value = null;
		});
	}

	return { title, claim };
}
