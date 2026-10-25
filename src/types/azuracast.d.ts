// https://github.com/AzuraCast/AzuraCast/blob/main/frontend/entities/ApiInterfaces.ts

export interface ApiSong {
	id?: string;
	/** The song title, usually "Artist - Title" */
	text?: string;
	artist?: string | null;
	title?: string | null;
	album?: string | null;
	genre?: string | null;
	art?: string;
}

export interface ApiNowPlayingListeners {
	total: number;
	unique: number;
	current: number;
}

export interface ApiNowPlayingLive {
	/** Whether the stream is known to currently have a live DJ. */
	is_live: boolean;
	/** The current active streamer/DJ, if one is available. */
	streamer_name: string;
	/** The start timestamp of the current broadcast, if one is available. */
	broadcast_start: number | null;
	/** URL to the streamer artwork, if available. */
	art: string | null;
}

export interface ApiNowPlayingSongHistory {
	/** Song history unique identifier */
	sh_id: number;
	/** UNIX timestamp when playback started. */
	played_at: number;
	/** Duration of the song in seconds */
	duration: number;
	/** The playlist the song was played from, if available. */
	playlist: string | null;
	/** The streamer that was connected when the song played, if available. */
	streamer: string | null;
	/** Whether the song is a listener request. */
	is_request: boolean;
	song: ApiSong;
}

export type ApiNowPlayingCurrentSong = ApiNowPlayingSongHistory & {
	/** Time elapsed since playback started, in seconds. */
	elapsed: number;
	/** Remaining time in the song, in seconds. */
	remaining: number;
};

export interface ApiNowPlayingStationQueue {
	/** UNIX timestamp when the AutoDJ is expected to queue the song for playback. */
	cued_at: number;
	/** UNIX timestamp when playback is expected to start. */
	played_at: number | null;
	/** Duration of the song in seconds */
	duration: number;
	/** The playlist the song was picked from, if available. */
	playlist: string | null;
	/** Whether the song is a listener request. */
	is_request: boolean;
	song: ApiSong;
}

export interface ApiNowPlayingStationRemote {
	id: number;
	name: string;
	url: string;
	/** Bitrate (kbps) of the broadcast audio, if known */
	bitrate: number | null;
	/** Audio encoding format of the broadcast audio, if known */
	format: string | null;
	listeners: ApiNowPlayingListeners;
}

export type ApiNowPlayingStationMount = ApiNowPlayingStationRemote & {
	/** The relative path that corresponds to this mount point */
	path: string;
	/** Whether this mount is the station's default */
	is_default: boolean;
};

export interface ApiNowPlayingStation {
	id: number;
	name: string;
	shortcode: string;
	description: string;
	listen_url: string;
	url: string | null;
	public_player_url: string;
	playlist_pls_url: string;
	playlist_m3u_url: string;
	requests_enabled: boolean;
	mounts: ApiNowPlayingStationMount[];
	remotes: ApiNowPlayingStationRemote[];
	hls_enabled: boolean;
	hls_is_default: boolean;
	hls_url: string | null;
}

export interface ApiNowPlaying {
	station: ApiNowPlayingStation;
	listeners: ApiNowPlayingListeners;
	live: ApiNowPlayingLive;
	now_playing: ApiNowPlayingCurrentSong | null;
	playing_next: ApiNowPlayingStationQueue | null;
	song_history: ApiNowPlayingSongHistory[];
	is_online: boolean;
}

/** Centrifugo publication on `/api/live/nowplaying/sse` */
export interface NowPlayingPublication {
	data: {
		np: ApiNowPlaying;
		/** UNIX seconds */
		current_time?: number;
	};
}

/** Centrifugo SSE messages; anything else (e.g. `{}` pings) is ignored */
export type NowPlayingSseMessage =
	| {
			connect: {
				/** UNIX milliseconds */
				time?: number;
				subs: Record<string, { publications?: NowPlayingPublication[] }>;
			};
	  }
	| { pub: NowPlayingPublication };
