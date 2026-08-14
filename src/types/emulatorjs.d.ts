type EJSAlignStartButton = 'top' | 'center' | 'bottom';

type EJSAdMode = 0 | 1 | 2;

type EJSBrowserMode = 1 | 2 | 'mobile' | 'desktop';

type EJSControlScheme =
	| '3do'
	| 'arcade'
	| 'atari2600'
	| 'atari7800'
	| 'gb'
	| 'gba'
	| 'jaguar'
	| 'lynx'
	| 'mame'
	| 'n64'
	| 'nds'
	| 'nes'
	| 'sega32x'
	| 'segaCD'
	| 'segaGG'
	| 'segaMD'
	| 'segaMS'
	| 'segaSaturn'
	| 'snes'
	| 'vb';

type EJSCheat = [name: string, value: string];

type EJSVideoRotation = 0 | 1 | 2 | 3;

interface EJSButtonOptions {
	displayName?: string;
	icon?: string;
	visible?: boolean;
	callback?: () => void;
}

/** Each toolbar button takes a boolean (visibility) or an options object; custom names are allowed. */
type EJSButtons = Record<string, boolean | EJSButtonOptions>;

/** IndexedDB cache config. Documented; not in 4.2.3. */
interface EJSCacheConfig {
	/** Minutes before cache entries expire. @default 7200 */
	cacheMaxAgeMins?: number;
	/** Maximum cache size in MB. @default 4096 */
	cacheMaxSizeMB?: number;
	/** Whether caching is enabled. @default true */
	enabled?: boolean;
}

/** An ICE (STUN/TURN) server used for WebRTC netplay. */
interface EJSNetplayICEServer {
	urls: string;
}

/** Toolbar screenshot and video-recording defaults. */
interface EJSScreenCapture {
	photo?: {
		format?: 'jpeg' | 'png' | 'webp';
		source?: 'canvas' | 'retroarch';
		upscale?: number;
	};
	video?: {
		audioBitrate?: number;
		format?: 'detect' | 'mp4' | 'webm';
		fps?: 30 | 60;
		upscale?: number;
		videoBitrate?: number;
	};
}

interface EJSDefaultControl {
	value?: string;
	value2?: string;
}

/** Default controller mapping, keyed by player index then input index. */
type EJSDefaultControls = Record<number, Record<number, EJSDefaultControl>>;

/** Settings-menu defaults. */
interface EJSDefaultOptions {
	'save-state-location'?: string;
	'save-state-slot'?: number;
	'shader'?: string;
	[key: string]: string | number | boolean | undefined;
}

interface EJSSaveEvent {
	screenshot: Blob;
	format: string;
}

/** Payload for `EJS_onSaveState`. */
interface EJSSaveStateEvent extends EJSSaveEvent {
	state: Uint8Array;
}

/** Payload for `EJS_onSaveSave`. */
interface EJSSaveSaveEvent extends EJSSaveEvent {
	save: Uint8Array | null;
}

/** Payload for `EJS_onSaveUpdate` (documented; not in 4.2.3). */
interface EJSSaveUpdateEvent {
	format?: string;
	hash?: string;
	save?: Uint8Array;
	screenshot?: Blob;
}

/** IndexedDB store backed by `EJS_STORAGE`. */
interface EJSStorage<T = unknown> {
	get: (key: string) => Promise<T | undefined>;
	put: (key: string, data: T) => Promise<void>;
	remove: (key: string) => Promise<void>;
	getSizes: () => Promise<Record<string, number>>;
}

/** Emscripten module. */
interface EJSModule {
	AL?: { currentCtx?: { sources?: { gain: { value: number } }[] } };
	callbacks?: Record<string, unknown>;
	FS?: {
		filesystems: { IDBFS: unknown };
		analyzePath: (path: string) => { exists: boolean };
		mkdir: (path: string) => void;
		mount: (filesystem: unknown, options: unknown, mountpoint: string) => void;
		readFile: (path: string) => Uint8Array;
		stat: (path: string) => { size?: number; isFolder?: boolean };
		syncfs: (populate: boolean, callback?: () => void) => void;
		unlink: (path: string) => void;
		unmount: (mountpoint: string) => void;
		writeFile: (path: string, data: unknown) => void;
	};
	HEAPU8?: Uint8Array;
	abort?: () => void;
	callMain?: (args: string[]) => void;
	cwrap?: (name: string, returnType: string, argTypes: string[]) => (...args: unknown[]) => unknown;
	postMainLoop?: () => void;
	resumeMainLoop?: () => void;
}

/** Bridges EmulatorJS to the emulated core. */
interface EJSGameManager {
	FS: NonNullable<EJSModule['FS']>;
	functions?: Record<string, (...args: unknown[]) => unknown>;
	createCueFile: (fileNames: string[]) => string | null;
	getCoreOptions: () => string;
	getCurrentDisk: () => number;
	getDiskCount: () => number;
	getFrameNum: () => number;
	getSaveFile: (save?: boolean) => Uint8Array | null;
	getSaveFilePath: () => string;
	getState: () => Uint8Array;
	getVideoDimensions: (type: string) => number | undefined;
	loadSaveFiles: () => void;
	loadState: (state: Uint8Array) => void;
	mkdir: (path: string) => void;
	quickLoad: (slot?: number) => void;
	quickSave: (slot?: number) => boolean;
	resetCheat: () => void;
	restart: () => void;
	saveSaveFiles: () => void;
	screenshot: () => Promise<Uint8Array>;
	setCheat: (index: number, enabled: boolean, code: string) => void;
	setCurrentDisk: (disk: number) => void;
	setFastForwardRatio: (ratio: number) => void;
	setKeyboardEnabled: (enabled: boolean) => void;
	setRewindGranularity: (value: number) => void;
	setSlowMotionRatio: (ratio: number) => void;
	setVariable: (option: string, value: string) => void;
	setVideoRotation: (rotation: number) => void;
	setVSync: (enabled: boolean) => void;
	simulateInput: (player: number, index: number, value: number) => void;
	supportsStates: () => boolean;
	toggleFastForward: (active: boolean) => void;
	toggleMainLoop: (playing: number) => void;
	toggleShader: (active: number) => void;
	toggleSlowMotion: (active: boolean) => void;
	writeFile: (path: string, data: unknown) => void;
}

/** Netplay state (socket.io only in 4.2.3). */
interface EJSNetplay {
	name?: string;
	owner?: boolean;
	url?: string;
	getOpenRooms?: () => Promise<Record<string, { room_name: string; current: number; max: number }>>;
}

/** EmulatorJS instance (`window.EJS_emulator`). */
interface EJSEmulator {
	config?: { defaultOptions?: EJSDefaultOptions; disableLocalStorage?: boolean; videoRotation?: number };
	debug?: boolean;
	failedToStart?: boolean;
	gameManager?: EJSGameManager;
	gamepad?: { terminate: () => void };
	isNetplay?: boolean;
	/** Translation strings requested but missing from the loaded language file. */
	missingLang?: string[];
	Module?: EJSModule;
	netplay?: EJSNetplay;
	paused?: boolean;
	rewindEnabled?: boolean;
	/** Emulator settings, e.g. `save-state-slot`. */
	settings: Record<string, unknown>;
	started?: boolean;
	storage?: {
		bios: EJSStorage<{ 'content-length': string; 'data': Uint8Array; 'type': string }>;
		core: EJSStorage<{ version: string; data: Uint8Array }>;
		rom: EJSStorage<{ 'content-length': string; 'data': Uint8Array; 'type': string }>;
		states: EJSStorage<Uint8Array>;
	};
	videoRotation?: number;
	/** Volume, `0` muted to `1` max. */
	volume?: number;
	callEvent: (event: string, data?: unknown) => number;
	displayMessage: (message: string, time?: number) => void;
	getBaseFileName: (force?: boolean) => string | null;
	getCoreSettings: () => string;
	on: (event: string, func: (data?: unknown) => void) => void;
	pause: (dontUpdate?: boolean) => void;
	play: (dontUpdate?: boolean) => void;
	preGetSetting: (setting: string) => unknown;
	saveInBrowserSupported: () => boolean;
	screenshot: (callback: (blob: Blob, format: string) => void) => void;
	selectFile: () => Promise<File>;
	takeScreenshot: (source?: string, format?: string, upscale?: number) => Promise<{ blob: Blob; format: string }>;
	toggleFullscreen: (fullscreen: boolean) => void;
}

interface Window {
	/**
	 * When to show ads: `0` start screen only, `1` loading only, `2` both.
	 *
	 * @default 2
	 */
	EJS_AdMode?: EJSAdMode;

	/** Ad size as `[width, height]`. @default `['300px', '250px']` */
	EJS_AdSize?: [string, string];

	/**
	 * Milliseconds before the ad auto-closes; `0` disables, `-1` closes immediately.
	 *
	 * @default 10000
	 */
	EJS_AdTimer?: number;

	/** URL to an ad page shown on load. */
	EJS_AdUrl?: string;

	/**
	 * Aligns the start button: `top`, `center`, or `bottom`.
	 *
	 * @default `'bottom'`
	 */
	EJS_alignStartButton?: EJSAlignStartButton;

	/**
	 * Confirms before exiting via the exit button. Documented; not in 4.2.3.
	 *
	 * @default `true`
	 */
	EJS_askBeforeExit?: boolean;

	/**
	 * Blurs the background image to fit all aspect ratios; overrides `EJS_backgroundColor`.
	 *
	 * @default `false`
	 */
	EJS_backgroundBlur?: boolean;

	/**
	 * Background color of the start/loading screens.
	 *
	 * @default `'#333'`
	 */
	EJS_backgroundColor?: string;

	/** Background shown on the Play Now screen; absolute or relative to `pathtodata`. */
	EJS_backgroundImage?: string;

	/** URL to a BIOS file. */
	EJS_biosUrl?: string | ArrayBuffer | Uint8Array | Blob;

	/** Forces the mobile or desktop UI instead of auto-detecting. Documented; not in 4.2.3. */
	EJS_browserMode?: EJSBrowserMode;

	/** Toolbar button visibility/config; each button takes a boolean or an options object. */
	EJS_Buttons?: EJSButtons;

	/** IndexedDB cache config. Documented; not in 4.2.3. */
	EJS_cacheConfig?: EJSCacheConfig;

	/**
	 * @deprecated in versions after 4.2.3. Per-ROM cache limit in bytes.
	 * @default 1073741824 (1 GB)
	 */
	EJS_CacheLimit?: number;

	/** Base URL the cheat manager loads cheat files from. Documented; not in 4.2.3. */
	EJS_cheatPath?: string;

	/**
	 * Default cheats for the cheat manager, as `[name, value]` pairs.
	 *
	 * @default `[]`
	 */
	EJS_cheats?: EJSCheat[];

	/**
	 * Emulator hex color theme.
	 *
	 * @default `'#1AAFFF'`
	 */
	EJS_color?: string;

	/** Controller scheme override; defaults to the core name. */
	EJS_controlScheme?: EJSControlScheme;

	/** Desired target system, e.g. `'nes'` or `'arcade'`. */
	EJS_core?: string;

	/**
	 * Verbose logs and the unminified scripts.
	 *
	 * @default `false`
	 */
	EJS_DEBUG_XX?: boolean;

	/** Default controller mapping; see the control-mapping docs. */
	EJS_defaultControls?: EJSDefaultControls;

	/** Default settings-menu options, e.g. `shader` or `save-state-slot`. */
	EJS_defaultOptions?: EJSDefaultOptions;

	/**
	 * Disables automatic language detection.
	 *
	 * @default `false`
	 */
	EJS_disableAutoLang?: boolean;

	/** Keeps the core loaded after exit instead of unloading. Documented; not in 4.2.3. */
	EJS_disableAutoUnload?: boolean;

	/** Disables the DOS core's batched bootup process. Documented; not in 4.2.3. */
	EJS_disableBatchBootup?: boolean;

	/** Disables automatic `.cue` file generation for disc-based systems. */
	EJS_disableCue?: boolean;

	/** Disables the IndexedDB core/ROM caches. */
	EJS_disableDatabases?: boolean;

	/** Disables persisting emulator settings to `localStorage`. */
	EJS_disableLocalStorage?: boolean;

	/** Writes the BIOS file as-is instead of decompressing it. */
	EJS_dontExtractBIOS?: boolean;

	EJS_emulator?: EJSEmulator;

	/** Enables netplay together with debug mode. */
	EJS_EXPERIMENTAL_NETPLAY?: boolean;

	/**
	 * Places external files in the EJS filesystem; archives are extracted when the key ends with `/`.
	 * Extraction keys require string URLs.
	 *
	 * @default `{}`
	 */
	EJS_externalFiles?: Record<string, string | ArrayBuffer | Uint8Array | Blob>;

	/** Flushes the save file every N ms and disables the UI save-interval options. Documented; not in 4.2.3. */
	EJS_fixedSaveInterval?: number;

	/** Forces the WebGL 1 legacy cores even when WebGL 2 is supported. */
	EJS_forceLegacyCores?: boolean;

	/** Starts the game in fullscreen when `true`. */
	EJS_fullscreenOnLoaded?: boolean;

	/**
	 * Unique numeric ID keeping saves, save states, and cached files separate between games; required for netplay.
	 *
	 * @default 1
	 */
	EJS_gameID?: number;

	/**
	 * Title of the game, used for save states and screenshots.
	 *
	 * @default The ROM filename
	 */
	EJS_gameName?: string;

	/** URL to game parent data for additional files the game needs. */
	EJS_gameParentUrl?: string;

	/** URL to a game patch file. */
	EJS_gamePatchUrl?: string;

	/** URL to the ROM file. */
	EJS_gameUrl?: string | ArrayBuffer | Uint8Array | Blob;

	/** Settings-menu IDs to hide. */
	EJS_hideSettings?: string[];

	/**
	 * Sets the emulator UI language.
	 *
	 * @default `en-US`
	 */
	EJS_language?: string;

	/** URL to a save state loaded on game start. */
	EJS_loadStateURL?: string | ArrayBuffer | Uint8Array | Blob;

	/** ICE (STUN/TURN) servers for the WebRTC netplay connection. Documented; not in 4.2.3. */
	EJS_netplayICEServers?: EJSNetplayICEServer[];

	/** Netplay server URL; requires `EJS_gameID`. */
	EJS_netplayServer?: string;

	/** Prevents the emulator from auto-focusing its container element. */
	EJS_noAutoFocus?: boolean;

	/** Overrides the URLs of the files the emulator loads (`loader.js`, `emulator.min.js`, ...). */
	EJS_paths?: Record<string, string>;

	/**
	 * Path to the data folder. 4.0+ falls back to the loader.js folder when unset.
	 *
	 * @default `'data/'`
	 */
	EJS_pathtodata?: string;

	/** Selector of the element to place the emulator in. */
	EJS_player?: string;

	/** Defaults for the toolbar screenshot and video-recording buttons. */
	EJS_screenCapture?: EJSScreenCapture;

	/** Logs missing translations to the console, for adding new languages. */
	EJS_settingsLanguage?: boolean;

	/** Built-in shaders, assigned by the runtime; merged with `EJS_shaders`. */
	EJS_SHADERS?: Record<string, string>;

	/** Custom shaders merged with the built-ins; key is the name, value is the source. */
	EJS_shaders?: Record<string, string>;

	/** Auto-resets the console after this many seconds. The docs claim a boolean; the code reads a number. */
	EJS_softLoad?: number;

	/**
	 * Custom text for the start button.
	 *
	 * @default `Start Game`
	 */
	EJS_startButtonName?: string;

	/**
	 * Starts the game on page load. The emulator freezes until the user interacts.
	 *
	 * @default `false`
	 */
	EJS_startOnLoaded?: boolean;

	/**
	 * Runs the core with threads; requires the COOP/COEP headers exposing `SharedArrayBuffer`.
	 *
	 * @default `false`
	 */
	EJS_threads?: boolean;

	/**
	 * Rotates the video: `0` none, `1` 90°, `2` 180°, `3` 270°.
	 *
	 * @default 0
	 */
	EJS_videoRotation?: EJSVideoRotation;

	/** Virtual gamepad button placement; see the virtual-gamepad-settings docs. */
	EJS_VirtualGamepadSettings?: Record<string, unknown>;

	/**
	 * Default volume: `0` is muted, `1` is max.
	 *
	 * @default 0.5
	 */
	EJS_volume?: number;

	// Callbacks and runtime-provided globals (assigned by the EJS scripts).

	/** Changes the ad URL on the fly (`url`) or deletes it (`del: true`). Assigned by loader.js. */
	EJS_adBlocked?: (url: string, del?: boolean) => void;

	/** Decompresses archives; assigned by `compression.js`. */
	EJS_COMPRESSION?: new (emu: unknown) => { decompress: (data: Uint8Array) => Promise<Record<string, Uint8Array>> };

	/** No-op storage used when the IndexedDB caches are disabled; assigned by `storage.js`. */
	EJS_DUMMYSTORAGE?: new () => EJSStorage;

	/** Game manager class; assigned by `GameManager.js`. */
	EJS_GameManager?: new (module: EJSModule, emu: EJSEmulator) => EJSGameManager;

	/** Called when the emulator exits. Documented; not in 4.2.3, use `EJS_emulator.on('exit', ...)`. */
	EJS_onExit?: () => void;

	/** Called when the game starts. */
	EJS_onGameStart?: () => void;

	/** Overrides the default file picker when load-SAV-files is pressed. */
	EJS_onLoadSave?: () => void;

	/** Called when the load-state button is pressed. */
	EJS_onLoadState?: () => void;

	/** Called when save-SAV-files is pressed; overrides the default download. */
	EJS_onSaveSave?: (event: EJSSaveSaveEvent) => void;

	/** Called when the save-state button is pressed. */
	EJS_onSaveState?: (event: EJSSaveStateEvent) => void;

	/** Called when a game-save change is detected. Documented; not in 4.2.3. */
	EJS_onSaveUpdate?: (event: EJSSaveUpdateEvent) => void;

	/** Called when the emulator is ready. */
	EJS_ready?: () => void;

	/** Boots the Emscripten module; assigned by the core runtime. */
	EJS_Runtime?: (options: unknown) => Promise<EJSModule>;

	/** IndexedDB cache store; assigned by `storage.js`. */
	EJS_STORAGE?: new (name: string, type: string) => EJSStorage;
}
