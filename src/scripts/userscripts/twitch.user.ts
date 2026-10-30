/// <reference types="vite-plugin-monkey/global" />

import css from '@/styles/twitch.user.css?inline';
import avatarImage from '@/assets/images/emotes/7tv/Gongor.avif';
import type { StreamInfoResponse } from '@/types/stream.d.ts';

/**
 * URLS & custom element IDs, and CSS selectors
 */
const AVATAR_IMAGE = avatarImage;
const STREAM_URL = 'https://gongo.tv/stream';
const STREAM_INFO_URL = 'https://gongo.tv/stream/info';
const OWNCAST_THUMBNAIL = `${OWNCAST.HOST}/thumbnail.jpg`;
const FALLBACK_THUMBNAIL = `https://thumbnail.angelthump.com/thumbnails/${ANGELTHUMP.CHANNEL}.jpeg`;

const CARD_ID = 'gongo-live-card';
const ICON_ID = 'gongo-live-icon';
const GRID_ID = 'gongo-live-grid';
const STYLE_ID = 'gongo-live-style';

const CARD_TITLE = `#${CARD_ID} [data-gongo-title]`;
const CARD_THUMBNAIL = `#${CARD_ID} [data-gongo-thumbnail]`;

/**
 * Twitch CSS selectors
 */
const SIDEBAR_SECTION = 'div.side-nav-section';
const SIDEBAR_CARD = '.side-nav-card';
const TRANSITION_GROUP = '.tw-transition-group';
const LIVE_CHANNELS_HEADER = '[data-a-target="live-channels-header"]';
const CARD_TOWER = '.tw-tower';
const CATEGORY_MAIN = '#directory-game-main-content';
const FILTER_SORT = '#browse-root-filter-sort-options';

/**
 * timings
 */
const TICK_MS = 500;
const REFRESH_MS = 60_000;
const STALE_MS = 15_000;

/**
 * custom elements
 */
const ICON_HTML = `
	<div id="${ICON_ID}">
		<a href="${STREAM_URL}" aria-label="gongo live">
			<img alt="" src="${AVATAR_IMAGE}">
			<div class="gongo-live-info">
				<div class="gongo-live-streamer">GreatSphynx</div>
				<div class="gongo-live-category">Gongo</div>
			</div>
		</a>
	</div>
`;

const CARD_HTML = `
	<div class="gongo-live-thumb">
		<a href="${STREAM_URL}" aria-label="gongo live">
			<img data-gongo-thumbnail alt="">
			<span class="gongo-live-badge">LIVE</span>
		</a>
	</div>
	<div class="gongo-live-meta">
		<div class="gongo-live-avatar">
			<a href="${STREAM_URL}" aria-label="gongo live">
				<img alt="" src="${AVATAR_IMAGE}">
			</a>
		</div>
		<div class="gongo-live-info">
			<a data-gongo-title class="gongo-live-title" href="${STREAM_URL}">GONGO</a>
			<p class="gongo-live-streamer">
				<a href="${STREAM_URL}">GreatSphynx</a>
			</p>
			<a class="gongo-live-category" href="/directory/category/gongo">Gongo</a>
		</div>
	</div>
`;

/**
 * state
 */
let stream: StreamInfoResponse | null = null;
let checkedAt = 0;
let requestPending = false;
let lastPath = window.location.pathname;

/**
 * status helpers
 */
function isLive(status: StreamInfoResponse): boolean {
	return status.owncast?.online === true || Boolean(status.angelthump);
}

function streamTitle(status: StreamInfoResponse): string {
	return status.owncast?.streamTitle || status.angelthump?.user.title || 'GONGO';
}

function thumbnailURL(status: StreamInfoResponse): string {
	const url =
		status.owncast?.online === true ? OWNCAST_THUMBNAIL : (status.angelthump?.thumbnail_url ?? FALLBACK_THUMBNAIL);
	try {
		const thumbnail = new URL(url);
		thumbnail.searchParams.set('t', String(checkedAt));
		return thumbnail.toString();
	} catch {
		return url;
	}
}

/**
 * page helpers for finding where in Twitch's markup our custom elements belong
 */
function showsCard(): boolean {
	const { pathname } = window.location;
	return pathname.startsWith('/directory/following') || pathname === '/directory/category/gongo';
}

function followedList(section: Element): Element | null {
	let node: Element | null = section.querySelector(SIDEBAR_CARD);
	while (node && node.parentElement !== section) {
		node = node.parentElement;
	}
	return node ?? section.querySelector(TRANSITION_GROUP);
}

function liveChannelsTower(): Element | null {
	const header = document.querySelector(LIVE_CHANNELS_HEADER)?.closest('header');
	if (!header) {
		return document.querySelector(CARD_TOWER);
	}
	const labelled = header.id
		? document.querySelector(`[aria-labelledby="${CSS.escape(header.id)}"] ${CARD_TOWER}`)
		: null;
	return labelled ?? header.parentElement?.querySelector(CARD_TOWER) ?? null;
}

function injectStyles(): void {
	if (document.getElementById(STYLE_ID)) {
		return;
	}
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = css;
	document.head.appendChild(style);
}

/**
 * keep the nodes in place and up to date. twitch sizes the tower's children, so the card wrapper
 * stays classless and width-free; when nobody streams the gongo category it has no tower at all, so we
 * insert our own grid under its filter controls
 */
function insertIcon(): void {
	const section = document.querySelector(SIDEBAR_SECTION);
	const list = section ? followedList(section) : null;
	if (!list) {
		return;
	}
	injectStyles();
	const icon = document.getElementById(ICON_ID);
	if (icon?.parentElement === list && list.firstElementChild === icon) {
		return;
	}
	icon?.remove();
	list.insertAdjacentHTML('afterbegin', ICON_HTML);
}

function categoryResults(section: Element): Element | null {
	const options = section.querySelector(FILTER_SORT);
	if (!options) {
		return null;
	}
	const existing = document.getElementById(GRID_ID);
	if (existing) {
		return existing;
	}
	const grid = document.createElement('div');
	grid.id = GRID_ID;
	grid.className = 'gongo-live-grid';
	options.insertAdjacentElement('afterend', grid);
	return grid;
}

function cardSlot(): Element | null {
	const section = document.querySelector(CATEGORY_MAIN);
	if (section && window.location.pathname === '/directory/category/gongo') {
		const tower = section.querySelector(CARD_TOWER);
		return tower?.firstElementChild ? tower : categoryResults(section);
	}
	const tower = liveChannelsTower();
	return tower?.firstElementChild ? tower : null;
}

function insertCard(): void {
	if (document.getElementById(CARD_ID)) {
		return;
	}
	const container = cardSlot();
	if (!container) {
		return;
	}
	const card = document.createElement('div');
	card.id = CARD_ID;
	card.innerHTML = CARD_HTML;
	container.insertBefore(card, container.firstChild);
}

function removeCard(): void {
	document.getElementById(CARD_ID)?.remove();
	document.getElementById(GRID_ID)?.remove();
}

function fillCard(): void {
	if (stream === null) {
		return;
	}
	const thumbnail = document.querySelector<HTMLImageElement>(CARD_THUMBNAIL);
	const src = thumbnailURL(stream);
	if (thumbnail && thumbnail.getAttribute('src') !== src) {
		thumbnail.src = src;
	}
	const title = document.querySelector<HTMLAnchorElement>(CARD_TITLE);
	if (title) {
		const text = streamTitle(stream);
		if (title.textContent !== text) {
			title.textContent = text;
			title.title = text;
		}
	}
}

function syncDom(): void {
	if (stream === null || !isLive(stream)) {
		document.getElementById(ICON_ID)?.remove();
		removeCard();
		return;
	}
	insertIcon();
	if (showsCard()) {
		insertCard();
		fillCard();
	}
}

/**
 * networking
 */
function warn(reason: string): void {
	console.warn(`[gongo] live check failed: ${reason}`);
	syncDom();
}

function refresh(): void {
	if (requestPending) {
		return;
	}
	requestPending = true;
	GM_xmlhttpRequest({
		method: 'GET',
		url: STREAM_INFO_URL,
		headers: { Accept: 'application/json' },
		timeout: 10_000,
		onload(event) {
			requestPending = false;
			if (event.status < 200 || event.status >= 300) {
				warn(`${event.status} ${event.statusText}`);
				return;
			}
			try {
				stream = JSON.parse(event.responseText) as StreamInfoResponse;
				checkedAt = Date.now();
				syncDom();
			} catch (error) {
				warn(String(error));
			}
		},
		onerror(event) {
			requestPending = false;
			warn(event.error);
		},
		ontimeout() {
			requestPending = false;
			warn('timed out');
		}
	});
}

/**
 * lifecycle
 */
function tick(): void {
	const { pathname } = window.location;
	if (pathname !== lastPath) {
		lastPath = pathname;
		if (showsCard()) {
			if (Date.now() - checkedAt >= STALE_MS) {
				refresh();
			}
		} else {
			removeCard();
		}
	}
	syncDom();
}

refresh();
setInterval(tick, TICK_MS);

document.addEventListener('visibilitychange', () => {
	if (!document.hidden && Date.now() - checkedAt >= STALE_MS) {
		refresh();
	}
});
setInterval(() => {
	if (!document.hidden) {
		refresh();
	}
}, REFRESH_MS);
