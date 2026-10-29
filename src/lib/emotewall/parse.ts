import { cfg } from '@/lib/emotewall/config.ts';
import type { Catalog, WallEmote } from '@/types/emotewall.d.ts';

interface Match {
	name: string;
	url: string;
	pos: number;
	rank: number;
	zeroWidth: boolean;
}

interface MonthDay {
	month: number;
	day: number;
}

/** BTTV hat drawn over every emote during a date range; `cls` goes on the base emote so it leaves room */
interface Holiday {
	min: MonthDay;
	max: MonthDay;
	cls: string[];
}

const twitchEmoteURL = (id: string): string => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`;

const bttvEmoteURL = (id: string): string => `https://cdn.betterttv.net/emote/${id}/3x`;

const bttvHoliday: Readonly<Record<string, Holiday>> = {
	// Talk Like a Pirate Day
	'5802e7a5d336345f3d4e1ed5': { min: { month: 9, day: 19 }, max: { month: 9, day: 19 }, cls: ['zweHat'] },
	// Halloween
	'5801777f8faabf4b3d008434': { min: { month: 10, day: 31 }, max: { month: 10, day: 31 }, cls: ['zweHat'] },
	// Christmas
	'58487cc6f52be01a7ee5f205': {
		min: { month: 12, day: 24 },
		max: { month: 12, day: 25 },
		cls: ['zweHat', 'zweLPad']
	},
	// New Years
	'5849c9c8f52be01a7ee5f79e': { min: { month: 12, day: 31 }, max: { month: 12, day: 31 }, cls: ['zweHat'] }
};

/** code-point -> UTF-16 offset (IRC `emotes` ranges count code points, so graphemes are the wrong unit) */
function utf16Offset(text: string, codePoint: number): number {
	// oxlint-disable-next-line typescript/no-misused-spread
	return [...text].slice(0, codePoint).join('').length;
}

function allowedCopies(seen: Map<string, number>, name: string): boolean {
	const count = seen.get(name) ?? 0;
	const limit = cfg.display.duplicates;
	if (limit > 0 && count >= limit) {
		return false;
	}
	seen.set(name, count + 1);
	return true;
}

// lower rank wins a clash: Twitch, then channel third-party, then global
function twitchMatches(text: string, emotes: Map<string, string[]>): Match[] {
	const matches: Match[] = [];
	for (const [id, ranges] of emotes) {
		const seen = new Map<string, number>();
		for (const range of ranges) {
			const [start, end] = range.split('-').map(Number);
			if (start === undefined || end === undefined) {
				continue;
			}
			const pos = utf16Offset(text, start);
			const name = text.slice(pos, utf16Offset(text, end + 1));
			if (!allowedCopies(seen, name)) {
				break;
			}
			matches.push({
				name,
				url: twitchEmoteURL(id),
				pos,
				rank: 1,
				zeroWidth: false
			});
		}
	}
	return matches;
}

function thirdPartyMatches(text: string, catalog: Catalog): Match[] {
	const matches: Match[] = [];
	for (const [priority, svc] of cfg.display.extended.priority.entries()) {
		const seen = new Map<string, number>();
		let pos = 0;
		for (const word of text.split(' ')) {
			const emote = catalog.byService[svc].get(word);
			if (emote && allowedCopies(seen, word)) {
				matches.push({
					name: word,
					url: emote.url,
					pos,
					rank: (emote.scope === 'channel' ? 10 : 20) + priority,
					zeroWidth: emote.zeroWidth
				});
			}
			pos += word.length + 1;
		}
	}
	return matches;
}

/** every occurrence of a name comes from the single best-ranked source that matched it */
function overlapPriority(matches: Match[]): Match[] {
	const winner = new Map<string, number>();
	for (const match of matches) {
		winner.set(match.name, Math.min(winner.get(match.name) ?? Infinity, match.rank));
	}
	return matches.filter((match) => winner.get(match.name) === match.rank);
}

function attachZeroWidth(text: string, matches: Match[]): WallEmote[] {
	const zweNames = new Set(matches.filter((match) => match.zeroWidth).map((match) => match.name));
	const result: WallEmote[] = [];
	let lastEnd = 0;
	for (const match of matches.toSorted((a, b) => a.pos - b.pos)) {
		const base = result.at(-1);
		if (match.zeroWidth && base) {
			const gap = text
				.slice(lastEnd, match.pos)
				.split(' ')
				.filter((word) => word && !zweNames.has(word));
			if (gap.length === 0) {
				base.zwe.push(match.url);
				continue;
			}
		}
		// a zero-width emote with nothing to sit on is drawn as an ordinary emote
		result.push({ url: match.url, zwe: [] });
		lastEnd = match.pos + match.name.length;
	}
	return result;
}

export function parseEmotes(text: string, twitchEmotes: Map<string, string[]>, catalog: Catalog): WallEmote[] {
	return attachZeroWidth(
		text,
		overlapPriority([...twitchMatches(text, twitchEmotes), ...thirdPartyMatches(text, catalog)])
	);
}

/** returns a copy with the day's holiday hats overlaid, judged by the server's UTC date */
export function withHolidayZWE(emote: WallEmote, now: Date): WallEmote {
	if (!cfg.display.extended.holidayZWE) {
		return emote;
	}
	const month = now.getUTCMonth() + 1;
	const day = now.getUTCDate();
	const after = (m: number, d: number): boolean => month > m || (month === m && day >= d);
	const before = (m: number, d: number): boolean => month < m || (month === m && day <= d);
	const hats = Object.entries(bttvHoliday)
		.filter(([, { min, max }]) => after(min.month, min.day) && before(max.month, max.day))
		.map(([id, { cls }]) => ({ url: bttvEmoteURL(id), cls }));
	if (hats.length === 0) {
		return emote;
	}
	return {
		...emote,
		zwe: [...emote.zwe, ...hats.map((hat) => hat.url)],
		baseCls: [...new Set([...(emote.baseCls ?? []), ...hats.flatMap((hat) => hat.cls)])]
	};
}

export function parseKappagenCommand(
	text: string,
	offsets: Map<string, string[]>
): { args: string; emotes: Map<string, string[]> } | null {
	const alias = '!kappagen';
	if (text.slice(0, alias.length).toLowerCase() !== alias) {
		return null;
	}
	if (text.length !== alias.length && text.at(alias.length) !== ' ') {
		return null;
	}
	const args = text.slice(alias.length).trimStart();
	const cut = text.length - args.length;
	const emotes = new Map<string, string[]>();
	for (const [id, ranges] of offsets) {
		const kept = ranges
			.map((range) => range.split('-').map(Number) as [number, number])
			.filter(([start]) => start >= cut)
			.map(([start, end]) => `${start - cut}-${end - cut}`);
		if (kept.length > 0) {
			emotes.set(id, kept);
		}
	}
	return { args, emotes };
}
