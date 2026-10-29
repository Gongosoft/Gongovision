/** Every display style, in the order the settings pane lists them. */
export type EmoteStyle =
	| 'Still'
	| 'StraightLine'
	| 'Rise'
	| 'Bounce'
	| 'Speed'
	| 'Drop'
	| 'Crazy'
	| 'Confetti'
	| 'Throw'
	| 'Pop'
	| 'Cube'
	| 'Fountain';

/** Every kappagen. */
export type KappaStyle =
	| 'StraightLine'
	| 'Rise'
	| 'Speed'
	| 'Crazy'
	| 'Burst'
	| 'Fireworks'
	| 'Spiral'
	| 'Pyramid'
	| 'SmallPyramid'
	| 'CodeLines'
	| 'Fountain'
	| 'Stampede'
	| 'Confetti'
	| 'Conga'
	| 'Coaster'
	| 'TheCube'
	| 'Text';

/** The third-party emote providers the wall matches words against. */
export type ThirdParty = '7tv' | 'bttv' | 'ffz';

/** Seeded stand-in for the original's `shared.rnd`: no arg → [0, 1), `m < 1` → [0, m), else an integer in [0, m). */
export type Rnd = (m?: number) => number;

export interface WallSettings {
	styles: EmoteStyle[];
	kappaStyles: KappaStyle[];
	/** Most copies of one emote taken from a single message; 0 shows every copy. */
	duplicates: number;
	holidayZWE: boolean;
	shadow: boolean;
	/** The Cube, shared by the display style and the kappagen. */
	cube: {
		size: number;
		center: boolean;
		rotations: number;
		faces: boolean;
	};
	kappa: {
		count: number;
		congaContagious: boolean;
		congaTime: number;
		congaAvoidMiddle: boolean;
		textMessages: string[];
		textTime: number;
	};
	emote: {
		time: number;
		ratioNormal: number;
		ratioSmall: number;
		fadeIn: boolean;
		zoomIn: boolean;
		fadeOut: boolean;
		zoomOut: boolean;
	};
}

export interface WallEmote {
	url: string;
	/** Zero-width overlay URLs, drawn on top of this emote in order. */
	zwe: string[];
	/** Classes the base image takes so its overlays fit around it; `zweHat` reserves headroom for a hat. */
	baseCls?: string[];
}

/** One emote the catalogue knows. The map key is the word that triggers it. */
export interface CatalogEmote {
	url: string;
	scope: 'global' | 'channel';
	zeroWidth: boolean;
}

export interface Catalog {
	byService: Record<ThirdParty, Map<string, CatalogEmote>>;
	/** Channel emotes for kappagens triggered without any emotes. */
	fallback: WallEmote[];
}

/** An emote with the name it is triggered by. */
export interface NamedEmote {
	name: string;
	url: string;
}

/** 7TV emotes also say whether they overlay their neighbours instead of taking a slot. */
export interface SevenTvEmote extends NamedEmote {
	zeroWidth: boolean;
}

/**
 * `/emotes/list`: the channel's own third-party emotes, grouped by the provider they came from. Globals are left
 * out, since they belong to every channel rather than this one. Only 7TV reports zero-width: it is the one
 * provider whose emote data carries the flag, so BTTV and FFZ entries have no such field.
 */
export interface EmoteList {
	'7tv': SevenTvEmote[];
	'bttv': NamedEmote[];
	'ffz': NamedEmote[];
}

/** One property animation: the keyframes and the options they run with. */
export interface AnimSpec {
	keyframes: Keyframe[];
	options: KeyframeAnimationOptions;
}

/** One emote about to be drawn, with everything the stage needs to mount and animate it. */
export interface SpawnSpec {
	at?: number;
	life: number;
	eH: number;
	eW?: number;
	style: Record<string, string>;
	anims: AnimSpec[];
	cubeAnims?: AnimSpec[];
	emote: WallEmote;
	cube?: WallEmote[];
	dancer?: boolean;
	box?: number;
	/** Screen-sized offsets of the copies that keep a path seamless across the edges. */
	copies?: [number, number][];
}

interface WallEventBase {
	/** Drives every random choice on the client, so all viewers render the same effect. */
	seed: number;
	/** Server epoch ms; clients convert with their clock offset. */
	startAt: number;
}

export interface WallEmoteEvent extends WallEventBase {
	kind: 'emote';
	style: EmoteStyle;
	emote: WallEmote;
}

export interface WallKappaEvent extends WallEventBase {
	kind: 'kappa';
	style: KappaStyle;
	count: number;
	emotes: WallEmote[];
	text?: string;
}

export type WallEvent = WallEmoteEvent | WallKappaEvent;

export type EmoteWallServerMessage =
	| { type: 'hi gongo'; now: number; settings: WallSettings }
	| { type: 'pong'; now: number; sentAt: number }
	| { type: 'events'; events: WallEvent[] }
	| { type: 'settings'; settings: WallSettings };

export interface EmoteWallClientMessage {
	type: 'ping';
	sentAt: number;
}
