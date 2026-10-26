import isURL from 'validator/lib/isURL';
import globalBadges from '@/assets/images/badges/global.json';
import { computed, toValue } from 'vue';
import { getStreamerEmotes } from 'streamer-emotes';
import { get, useAsyncState, useFetch } from '@vueuse/core';
import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue';
import type {
	ChatBadge,
	ChatBadges,
	ChatEmotePart,
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

interface RemoteEmote {
	url: string;
	/** 7TV zero-width emotes overlay the previous emote instead of taking a slot */
	zeroWidth: boolean;
}

type EmoteMap = Map<string, RemoteEmote>;

async function loadRemoteEmotes(): Promise<EmoteMap> {
	const map: EmoteMap = new Map();
	try {
		const providers = await getStreamerEmotes(TWITCH_CHANNEL, { bttv: true, ffz: true, sevenTV: true });
		for (const { channel, global = [] } of Object.values(providers)) {
			for (const { name, images, zeroWidth } of [...global, ...channel]) {
				const image = images.find(({ version }) => version.startsWith('2x')) ?? images.at(-1);
				if (image) {
					map.set(name, { url: image.url, zeroWidth: zeroWidth ?? false });
				}
			}
		}
	} catch (error) {
		console.error('remote emotes unavailable:', error);
	}
	return map;
}

const remoteEmotesPromise = loadRemoteEmotes();

type EmoteEffect = 'cursed' | 'wide' | 'flipX' | 'flipY';

// BTTV codes go before their emote, FFZ's are emotes of their own that go after
const modifiers = new Map<string, { effect: EmoteEffect; prefix: boolean }>([
	['c!', { effect: 'cursed', prefix: true }],
	['w!', { effect: 'wide', prefix: true }],
	['h!', { effect: 'flipX', prefix: true }],
	['v!', { effect: 'flipY', prefix: true }],
	['ffzCursed', { effect: 'cursed', prefix: false }],
	['ffzW', { effect: 'wide', prefix: false }],
	['ffzX', { effect: 'flipX', prefix: false }],
	['ffzY', { effect: 'flipY', prefix: false }]
]);

const mentionRegex = /^@(?<mentioned>\w{1,25})(?<rest>.*)$/;

function viewerCard(username: string): string {
	return `https://www.twitch.tv/popout/${TWITCH_CHANNEL}/viewercard/${encodeURIComponent(username.toLowerCase())}`;
}

interface EmoteToken {
	kind: 'emote';
	name: string;
	url: string;
	zeroWidth: boolean;
	effects: Set<EmoteEffect>;
}

type Token =
	| { kind: 'space' }
	| { kind: 'text'; text: string }
	| { kind: 'part'; part: ChatPart }
	| { kind: 'modifier'; name: string; effect: EmoteEffect; prefix: boolean; url?: string }
	| EmoteToken;

function emoteToken(name: string, url: string, zeroWidth = false): EmoteToken {
	return { kind: 'emote', name, url, zeroWidth, effects: new Set() };
}

/** word -> the emote, modifier, mention, link or text it represents */
function wordToken(word: string, remote: EmoteMap): Token[] {
	const remoteEmote = remote.get(word);
	const url = localEmotes.get(word) ?? remoteEmote?.url;

	const modifier = modifiers.get(word);
	if (modifier) {
		// the art is only shown when a suffix modifier has nothing to modify
		return [{ kind: 'modifier', name: word, url, ...modifier }];
	}

	if (url) {
		return [emoteToken(word, url, remoteEmote?.zeroWidth ?? false)];
	}

	const { mentioned = '', rest = '' } = mentionRegex.exec(word)?.groups ?? {};
	if (mentioned) {
		const tokens: Token[] = [
			{ kind: 'part', part: { type: 'mention', text: `@${mentioned}`, href: viewerCard(mentioned) } }
		];
		if (rest) {
			tokens.push({ kind: 'text', text: rest });
		}
		return tokens;
	}

	if (isURL(word)) {
		const href = /^https?:\/\//i.test(word) ? word : `https://${word}`;
		return [{ kind: 'part', part: { type: 'link', text: word, href } }];
	}

	return [{ kind: 'text', text: word }];
}

function tokenize(message: Message, remote: EmoteMap): Token[] {
	const tokens: Token[] = [];
	for (const { text, emoticon } of message.fragments) {
		if (emoticon?.emoticon_id) {
			const url =
				localEmotes.get(text) ??
				`https://static-cdn.jtvnw.net/emoticons/v2/${emoticon.emoticon_id}/default/dark/2.0`;
			tokens.push(emoteToken(text, url, remote.get(text)?.zeroWidth ?? false));
			continue;
		}
		for (const word of text.split(/(?<space>\s+)/)) {
			if (!word) {
				continue;
			}
			if (/^\s/.test(word)) {
				tokens.push({ kind: 'space' });
			} else {
				tokens.push(...wordToken(word, remote));
			}
		}
	}
	return tokens;
}

/** BTTV codes precede their emote, so fold them into the target token and drop the separators */
function resolvePrefixes(tokens: Token[]): Token[] {
	const out: Token[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i]!;
		if (token.kind !== 'modifier' || !token.prefix) {
			out.push(token);
			continue;
		}

		const effects: EmoteEffect[] = [];
		let next = i;
		for (let code = tokens[next]; code; code = tokens[++next]) {
			if (code.kind === 'space') {
				continue;
			}
			if (code.kind !== 'modifier' || !code.prefix) {
				break;
			}
			effects.push(code.effect);
		}

		const target = tokens[next];
		if (target?.kind !== 'emote') {
			out.push(token);
			continue;
		}

		for (const effect of effects) {
			target.effects.add(effect);
		}
		out.push(target);
		i = next;
	}

	return out;
}

/** inline styles for one emote, given the effects layered on it */
function effectStyles(effects: Set<EmoteEffect>): Pick<ChatEmotePart, 'style' | 'imgStyle'> {
	const transform = [effects.has('flipX') ? 'scaleX(-1)' : '', effects.has('flipY') ? 'scaleY(-1)' : '']
		.filter(Boolean)
		.join(' ');

	const style: CSSProperties = {};
	if (transform) {
		style.transform = transform;
	}
	if (effects.has('cursed')) {
		style.filter = 'grayscale(1) brightness(0.7) contrast(2.5)';
	}

	return {
		style: Object.keys(style).length ? style : undefined,
		imgStyle: effects.has('wide') ? { height: '1.75rem', objectFit: 'fill', width: '7rem' } : undefined
	};
}

function toEmotePart(token: EmoteToken): ChatEmotePart {
	return { type: 'emote', name: token.name, url: token.url, ...effectStyles(token.effects) };
}

function resolveTokens(tokens: Token[]): ChatPart[] {
	const parts: ChatPart[] = [];
	/** the emote and modifier emotes effects attached to it */
	let stack: { effects: Set<EmoteEffect>; part: ChatEmotePart } | null = null;
	let gap = false;

	function push(part: ChatPart): void {
		if (gap) {
			const last = parts.at(-1);
			if (last?.type === 'text') {
				last.text += ' ';
			} else {
				parts.push({ type: 'text', text: ' ' });
			}
			gap = false;
		}
		const last = parts.at(-1);
		if (part.type === 'text' && last?.type === 'text') {
			last.text += part.text;
		} else {
			parts.push(part);
		}
	}

	function emitEmote(token: EmoteToken): ChatEmotePart {
		const part = toEmotePart(token);
		push(part);
		return part;
	}

	for (const token of tokens) {
		if (token.kind === 'space') {
			gap = true;
			continue;
		}

		if (token.kind === 'emote') {
			if (token.zeroWidth && stack) {
				stack.part.overlays ??= [];
				stack.part.overlays.push({ name: token.name, url: token.url });
				continue;
			}
			stack = { effects: token.effects, part: emitEmote(token) };
			continue;
		}

		if (token.kind === 'modifier') {
			if (!token.prefix && stack) {
				stack.effects.add(token.effect);
				Object.assign(stack.part, effectStyles(stack.effects));
			} else if (!token.prefix && token.url) {
				// a suffix modifier with nothing before it is just its own emote
				const alone = emoteToken(token.name, token.url);
				stack = { effects: alone.effects, part: emitEmote(alone) };
			} else {
				push({ type: 'text', text: token.name });
				stack = null;
			}
			continue;
		}

		if (token.kind === 'text') {
			push({ type: 'text', text: token.text });
			stack = null;
			continue;
		}

		push(token.part);
		stack = null;
	}

	// spaces between emotes would split multi-part emotes
	return parts.filter((part, i) => {
		const isGap = part.type === 'text' && !part.text.trim();
		return !(isGap && parts[i - 1]?.type === 'emote' && parts[i + 1]?.type === 'emote');
	});
}

function parseMessage(message: Message, remote: EmoteMap): ChatPart[] {
	return resolveTokens(resolvePrefixes(tokenize(message, remote)));
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
