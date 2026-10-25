import type { MenuName } from '@/types/menu.d.ts';

declare module 'vue-router' {
	interface RouteMeta {
		/** renders on its own, without the background, diamond or overlay */
		fullscreen?: boolean;
		/** the menu Menu.vue shows; menu pages also show the diamond */
		menu?: MenuName;
		/** if the diamond's stream should be muted, for when the page plays its own audio */
		muted?: boolean;
	}
}
