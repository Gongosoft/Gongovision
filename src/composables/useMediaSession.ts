import { onScopeDispose, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

export function useMediaSession(metadata: MaybeRefOrGetter<MediaMetadataInit | null>): void {
	if (!('mediaSession' in navigator)) {
		return;
	}

	watch(
		() => toValue(metadata),
		(current) => {
			navigator.mediaSession.metadata = current ? new MediaMetadata(current) : null;
		},
		{ immediate: true }
	);

	onScopeDispose(() => {
		navigator.mediaSession.metadata = null;
	});
}
