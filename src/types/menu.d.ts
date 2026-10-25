import type { Component } from 'vue';

export type MenuName = 'home' | 'community' | 'content' | 'notifications' | 'radio' | 'youtube';

export interface MenuTileProps {
	/** raw svg markup (a `?raw` import) */
	icon?: string;
	label: string;
	/** hover tooltip, defaults to the label */
	title?: string;
	/** brand colour for the icon */
	fill?: string;
	/** animate the icon colour; off for icons whose colour signals state */
	animated?: boolean;
	/** a page on this site */
	to?: string;
	/** anywhere else; https links open in a new tab */
	href?: string;
}

/** a component that renders its own MenuTile, for buttons with behaviour (e.g. Emails.vue) */
export interface MenuWidget {
	component: Component;
}

export type MenuItem = MenuTileProps | MenuWidget;
