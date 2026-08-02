import { useDisplayMedia } from '@vueuse/core';
import type { UseDisplayMediaReturn } from '@vueuse/core';

const { stream, enabled, isSupported, start, stop } = useDisplayMedia();

export function useScreenShare(): UseDisplayMediaReturn {
	return { stream, enabled, isSupported, start, stop };
}
