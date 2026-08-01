export interface NotificationPayload extends NotificationOptions {
	title: string;
	image?: string;
	timestamp?: number;
	data: { url: string };
}

export interface LiveBroadcastMessage {
	type: 'live';
	payload: NotificationPayload;
	timestamp: number;
}

export interface RetryPayload {
	endpoint: string;
	payload: NotificationPayload;
}

export interface PushSubscription {
	endpoint: string;
	expirationTime: number | null;
	keys: { p256dh: string; auth: string };
}

export interface EmailSubscription {
	email: string;
	token: string;
	confirmed: boolean;
}

export interface NotificationState {
	subscriptions: PushSubscription[];
	emailSubs: EmailSubscription[];
	isLive: boolean;
	lastEmailsSentAt: number;
}
