import isURL from 'validator/lib/isURL';
import globalBadges from '@/assets/images/badges/global.json';
import { computed, toValue } from 'vue';
import { getStreamerEmotes } from 'streamer-emotes';
import { get, useAsyncState, useFetch } from '@vueuse/core';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type {
	ChatBadge,
	ChatBadges,
	ChatJSON,
	ChatLine,
	ChatPart,
	Comment,
	Commenter,
	Message
} from '@/types/chat.d.ts';

const MAX_VISIBLE = 150;

// 7TV/BTTV/FFZ emotes are plain words, Twitch ones are stored as emote fragments
const localEmotes = new Map(
	Object.entries(
		import.meta.glob<string>(
			[
				'../assets/images/emotes/7tv/*',
				'../assets/images/emotes/bttv/*',
				'../assets/images/emotes/ffz/*',
				'../assets/images/emotes/twitch/*'
			],
			{ eager: true, import: 'default', query: '?no-inline' }
		)
	).map(([path, url]) => [
		path
			.split('/')
			.pop()!
			.replace(/\.[^.]+$/, ''),
		url
	])
);

const subBadges = Object.entries(
	import.meta.glob<string>('../assets/images/badges/*.png', { eager: true, import: 'default', query: '?no-inline' })
)
	.map(([path, url]) => [Number(path.split('/').pop()!.replace('.png', '')), url] as const)
	.toSorted(([a], [b]) => a - b);

function badge(id: string, version: string): ChatBadge | undefined {
	const known = (globalBadges as ChatBadges)[id]?.[version];
	if (id !== 'subscriber') {
		return known;
	}
	const months = Math.max(1, Number(version));
	const url = subBadges.findLast(([tier]) => tier <= months)?.[1] ?? known?.url;
	return url ? { title: `Subscriber (${months} ${months === 1 ? 'month' : 'months'})`, url } : undefined;
}

type EmoteMap = Map<string, string>;

async function loadRemoteEmotes(): Promise<EmoteMap> {
	const map: EmoteMap = new Map();
	try {
		const providers = await getStreamerEmotes(TWITCH_CHANNEL, { bttv: true, ffz: true, sevenTV: true });
		for (const { channel, global = [] } of Object.values(providers)) {
			for (const { name, images } of [...global, ...channel]) {
				const image = images.find(({ version }) => version.startsWith('2x')) ?? images.at(-1);
				if (image) {
					map.set(name, image.url);
				}
			}
		}
	} catch (error) {
		console.error('remote emotes unavailable:', error);
	}
	return map;
}

const remoteEmotesPromise = loadRemoteEmotes();

const mentionRegex = /^@(?<mentioned>\w{1,25})(?<rest>.*)$/;

function viewerCard(username: string): string {
	return `https://www.twitch.tv/popout/${TWITCH_CHANNEL}/viewercard/${encodeURIComponent(username.toLowerCase())}`;
}

function parseWord(word: string, remote: EmoteMap): ChatPart[] {
	const emote = localEmotes.get(word) ?? remote.get(word);
	if (emote) {
		return [{ type: 'emote', name: word, url: emote }];
	}
	const { mentioned = '', rest = '' } = mentionRegex.exec(word)?.groups ?? {};
	if (mentioned) {
		const parts: ChatPart[] = [{ type: 'mention', text: `@${mentioned}`, href: viewerCard(mentioned) }];
		if (rest) {
			parts.push({ type: 'text', text: rest });
		}
		return parts;
	}
	if (isURL(word)) {
		return [{ type: 'link', text: word, href: /^https?:\/\//i.test(word) ? word : `https://${word}` }];
	}
	return [{ type: 'text', text: word }];
}

function parseMessage(message: Message, remote: EmoteMap): ChatPart[] {
	const parts: ChatPart[] = [];

	function push(part: ChatPart): void {
		const last = parts.at(-1);
		if (part.type === 'text' && last?.type === 'text') {
			last.text += part.text;
		} else {
			parts.push(part);
		}
	}

	for (const { text, emoticon } of message.fragments) {
		if (emoticon?.emoticon_id) {
			push({
				type: 'emote',
				name: text,
				url:
					localEmotes.get(text) ??
					`https://static-cdn.jtvnw.net/emoticons/v2/${emoticon.emoticon_id}/default/dark/2.0`
			});
			continue;
		}
		for (const word of text.split(/(?<space>\s+)/)) {
			if (!word) {
				continue;
			}
			if (/^\s/.test(word)) {
				push({ type: 'text', text: word });
			} else {
				for (const part of parseWord(word, remote)) {
					push(part);
				}
			}
		}
	}

	// spaces between emotes would split multi-part emotes
	return parts.filter((part, i) => {
		const isGap = part.type === 'text' && !part.text.trim();
		return !(isGap && parts[i - 1]?.type === 'emote' && parts[i + 1]?.type === 'emote');
	});
}

const subRegex = /^(?:subscribed (?:at Tier \d|with Prime)|is gifting|gifted a|is continuing the gift sub)/;

/** sub/gift notices repeat the author name, which the line already shows; returns a trimmed copy, or null */
function systemMessage(message: Message, commenter: Commenter): Message | null {
	const author = [commenter.display_name, commenter.name].find((name) => name && message.body.startsWith(`${name} `));
	if (!author || !subRegex.test(message.body.slice(author.length + 1))) {
		return null;
	}
	const [first, ...rest] = message.fragments;
	if (!first || first.emoticon || !first.text.startsWith(author)) {
		return message;
	}
	return {
		...message,
		fragments: [{ ...first, text: first.text.slice(author.length).trimStart() }, ...rest]
	};
}

function buildLine(
	{ _id: id, commenter, content_offset_seconds: offset, message }: Comment,
	remote: EmoteMap
): ChatLine {
	const name = commenter.display_name || commenter.name;
	const system = systemMessage(message, commenter);
	return {
		id,
		offset,
		name,
		profileURL: viewerCard(commenter.name || name),
		color: message.user_color ?? '#fff',
		badges: message.user_badges.flatMap(({ _id: badgeId, version }) => badge(badgeId, version) ?? []),
		parts: parseMessage(system ?? message, remote),
		action: Boolean(message.is_action),
		notice: system !== null
	};
}

/** index of the first comment posted after `time` */
function upperBound(comments: Comment[], time: number): number {
	let low = 0;
	let high = comments.length;
	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		if (comments[mid]!.content_offset_seconds <= time) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}
	return low;
}

interface UseChatReplayReturn {
	available: ComputedRef<boolean>;
	visible: ComputedRef<ChatLine[]>;
}

/** loads a TwitchDownloader chat archive and returns the messages posted up to `time` */
export function useChatReplay(
	url: MaybeRefOrGetter<string | null>,
	time: MaybeRefOrGetter<number>
): UseChatReplayReturn {
	const { data } = useFetch(() => toValue(url) ?? '', {
		refetch: true,
		beforeFetch: ({ cancel }) => {
			if (!toValue(url)) {
				cancel();
			}
		}
	})
		.get()
		.json<ChatJSON | Comment[]>();

	const { state: remoteEmotes } = useAsyncState<EmoteMap>(remoteEmotesPromise, new Map());

	const messages = computed(() => {
		const json = get(data);
		return (Array.isArray(json) ? json : json?.comments) ?? [];
	});

	// resolves to a plain number so dependents only recompute when a new message is crossed
	const endIndex = computed(() => upperBound(get(messages), toValue(time)));

	// the emote map doubles as the cache key, when it arrives every row is rebuilt
	const parsed = new WeakMap<Comment, { remote: EmoteMap; line: ChatLine }>();

	function parse(comment: Comment, remote: EmoteMap): ChatLine {
		const cached = parsed.get(comment);
		if (cached?.remote === remote) {
			return cached.line;
		}
		const line = buildLine(comment, remote);
		parsed.set(comment, { remote, line });
		return line;
	}

	return {
		available: computed(() => get(messages).length > 0),
		visible: computed(() => {
			const all = get(messages);
			const end = get(endIndex);
			const start = Math.max(0, end - MAX_VISIBLE);
			const remote = get(remoteEmotes);
			return all.slice(start - (start % 2), end).map((comment) => parse(comment, remote));
		})
	};
}
