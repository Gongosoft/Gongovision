export interface AngelThumpStreamResponse {
	id: string;
	ingest: {
		server: string;
		id: string;
		mediamtx: boolean;
	};
	userId: string;
	type: string;
	viewer_count: string;
	thumbnail_url: string;
	createdAt: string;
	updatedAt: string;
	user: {
		id: string;
		username: string;
		display_name: string;
		type: string;
		isVerified: boolean;
		title: string;
		angel: boolean;
		banned: boolean;
		password_protect: boolean;
		nsfw: boolean;
		unlist: boolean;
		offline_banner_url: string;
		profile_logo_url: string;
		followers: string;
		createdAt: string;
		updatedAt: string;
	};
	transcode: {
		streamId: string;
		outputs: {
			name: string;
			variant: string;
			bandwidth: number;
			audio_bandwidth: string;
			video_bandwidth: string;
			width: number;
			height: number;
			framerate: number;
		}[];
		transcoding: boolean;
		droplet_id: string;
		createdAt: string;
		updatedAt: string;
	};
}

export interface AngelThumpVigorResponse {
	token?: string;
	// unix timestamp in ms
	expiresIn?: number;
}
