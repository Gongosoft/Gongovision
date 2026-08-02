import { env } from 'cloudflare:workers';
import { ApiClient } from '@twurple/api';
import { AppTokenAuthProvider } from '@twurple/auth';

const authProvider = new AppTokenAuthProvider(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET);
const api = new ApiClient({ authProvider });

export async function getTwitchLiveChannels(channels: string[]): Promise<string[]> {
	if (!channels.length) {
		return [];
	}
	const streams = await api.streams.getStreamsByUserNames(channels);
	const liveLogins = new Set(streams.map((stream) => stream.userName.toLowerCase()));
	return channels.filter((ch) => liveLogins.has(ch.toLowerCase()));
}
