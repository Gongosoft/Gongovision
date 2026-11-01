import type { Component } from 'vue';

export type MenuName = 'home' | 'community' | 'content' | 'games' | 'music' | 'notifications' | 'radio' | 'youtube';

export interface MenuTileProps {
	/** raw SVG (tinted with `fill`) or raster image */
	icon?: string;
	/** rendered text */
	label: string;
	/** hover tooltip, defaults to the label */
	title?: string;
	/** brand colour for a markup icon */
	fill?: string;
	/** animate a markup icon's colour; off for icons whose colour signals state */
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
