import type { CSSProperties } from 'vue';

export interface ChatBadge {
	title: string;
	url: string;
}

/** [global.json](../assets/images/badges/global.json) badge set ID -> version ID -> badge */
export type ChatBadges = Record<string, Record<string, ChatBadge>>;

export type ChatPart =
	| { type: 'text'; text: string }
	| ChatEmotePart
	| { type: 'link' | 'mention'; text: string; href: string };

/** a 7TV zero-width emote stacked on top of another emote */
export interface ChatOverlay {
	name: string;
	url: string;
}

export interface ChatEmotePart {
	type: 'emote';
	name: string;
	url: string;
	/** zero-width emotes drawn over this one */
	overlays?: ChatOverlay[];
	/** styles for the box holding the emote and its overlays */
	style?: CSSProperties;
	/** styles for the base image alone, e.g. the wide modifier */
	imgStyle?: CSSProperties;
}

/** a message prepared for rendering */
export interface ChatLine {
	id: string;
	offset: number;
	name: string;
	/** Twitch viewercard popout */
	profileURL: string;
	color: string;
	badges: ChatBadge[];
	parts: ChatPart[];
	/** `/me` message */
	action: boolean;
	/** sub/resub/gift announcement */
	notice: boolean;
}

/** https://github.com/lay295/TwitchDownloader/blob/master/TwitchDownloaderCore/Chat/ChatJson.cs */
export interface ChatJSON {
	FileInfo: FileInfo;
	streamer: Streamer;
	clipper: null;
	video: Video;
	comments: Comment[];
	embeddedData: null;
}

export interface FileInfo {
	Version: Version;
	CreatedAt: Date;
	UpdatedAt: string;
}

export interface Version {
	Major: number;
	Minor: number;
	Patch: number;
}

export interface Comment {
	_id: string;
	created_at: Date;
	channel_id: string;
	content_type: ContentType;
	content_id: string;
	content_offset_seconds: number;
	commenter: Commenter;
	message: Message;
}

export interface Commenter {
	display_name: string;
	_id: string;
	name: string;
	bio: null | string;
	created_at: Date;
	updated_at: Date;
	logo: string;
}

export type ContentType = 'video';

export interface Message {
	body: string;
	bits_spent: number;
	fragments: Fragment[];
	user_badges: UserBadge[];
	user_color: null | string;
	emoticons: EmoticonElement[];
	is_action?: boolean;
}

export interface EmoticonElement {
	_id: string;
	begin: number;
	end: number;
}

export interface Fragment {
	text: string;
	emoticon: FragmentEmoticon | null;
}

export interface FragmentEmoticon {
	emoticon_id: string;
}

export interface UserBadge {
	_id: string;
	version: string;
}

export interface Streamer {
	name: string;
	login: string;
	id: number;
}

export interface Video {
	title: string;
	description: null;
	id: string;
	created_at: Date;
	start: number;
	end: number;
	length: number;
	viewCount: number;
	game: string;
	chapters: Chapter[];
}

export interface Chapter {
	id: string;
	startMilliseconds: number;
	lengthMilliseconds: number;
	type: string;
	description: string;
	subDescription: string;
	thumbnailUrl: null;
	gameId: string;
	gameDisplayName: string;
	gameBoxArtUrl: string;
}
