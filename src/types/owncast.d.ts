// https://github.com/owncast/owncast/blob/develop/web/interfaces/server-status.model.ts
export interface OwncastStatus {
	online: boolean;
	viewerCount?: number;
	lastConnectTime?: string | null;
	lastDisconnectTime?: string | null;
	versionNumber?: string;
	streamTitle?: string;
	serverTime: string;
}
