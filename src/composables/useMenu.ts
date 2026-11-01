import Emails from '@/components/Emails.vue';
import WebPush from '@/components/WebPush.vue';
import atSVG from '@/assets/images/at.svg?raw';
import gongoIcon from '@/assets/images/g.avif';
import rssSVG from '@/assets/images/rss.svg?raw';
import bankSVG from '@/assets/images/bank.svg?raw';
import gridSVG from '@/assets/images/grid.svg?raw';
import playSVG from '@/assets/images/play.svg?raw';
import starSVG from '@/assets/images/star.svg?raw';
import musicSVG from '@/assets/images/music.svg?raw';
import steamSVG from '@/assets/images/steam.svg?raw';
import floppySVG from '@/assets/images/floppy.svg?raw';
import gamingSVG from '@/assets/images/gaming.svg?raw';
import folderSVG from '@/assets/images/folder.svg?raw';
import githubSVG from '@/assets/images/github.svg?raw';
import peopleSVG from '@/assets/images/people.svg?raw';
import twitchSVG from '@/assets/images/twitch.svg?raw';
import blueskySVG from '@/assets/images/bluesky.svg?raw';
import commentSVG from '@/assets/images/comment.svg?raw';
import discordSVG from '@/assets/images/discord.svg?raw';
import patreonSVG from '@/assets/images/patreon.svg?raw';
import twitterSVG from '@/assets/images/twitter.svg?raw';
import youtubeSVG from '@/assets/images/youtube.svg?raw';
import spotifySVG from '@/assets/images/spotify.svg?raw';
import bandcampSVG from '@/assets/images/bandcamp.svg?raw';
import bullhornSVG from '@/assets/images/bullhorn.svg?raw';
import holomatchIcon from '@/assets/images/holomatch.avif';
import playlistSVG from '@/assets/images/playlist.svg?raw';
import analyticsSVG from '@/assets/images/analytics.svg?raw';
import radioSVG from '@/assets/images/cassette-tape.svg?raw';
import DiscordWebhook from '@/components/DiscordWebhook.vue';
import congobongoIcon from '@/assets/images/congo-bongo.avif';
import neoturfIcon from '@/assets/images/emotes/7tv/takenoL.avif';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ComputedRef } from 'vue';
import type { MenuItem, MenuName } from '@/types/menu.d.ts';

const MENUS: Record<MenuName, MenuItem[]> = {
	home: [
		{ icon: playSVG, label: 'Watch', to: '/stream' },
		{ icon: folderSVG, label: 'VODs', to: '/vods' },
		{ icon: patreonSVG, label: 'Patreon', href: 'https://patreon.com/GreatSphynx' },
		{ icon: gridSVG, label: 'Content', to: '/content' },
		{ icon: peopleSVG, label: 'Community', to: '/community' },
		{ icon: bullhornSVG, label: 'Notifs', title: 'Notifications', to: '/notifications' }
	],
	community: [
		{ icon: discordSVG, label: 'Discord', fill: '#5865f2', href: 'https://discord.gg/yRahnWpyDa' },
		{
			icon: blueskySVG,
			label: 'Bluesky',
			fill: '#1185fe',
			href: 'https://bsky.app/profile/greatsphynx.bsky.social'
		},
		{ icon: twitterSVG, label: 'Twitter', fill: '#1da1f2', href: 'https://twitter.com/Great_Sphynx' },
		{ icon: rssSVG, label: 'RSS', fill: '#fc8900', href: '/rss' },
		{ icon: commentSVG, label: 'Chat', href: '/stream/chat' },
		{ icon: atSVG, label: 'Email', title: 'Contact', href: 'mailto:contact@gongo.tv' }
	],
	content: [
		{ icon: githubSVG, label: 'GitHub', href: 'https://github.com/Gongosoft/Gongovision' },
		{ icon: youtubeSVG, label: 'YouTube', fill: '#ff0033', to: '/youtube' },
		{
			icon: bankSVG,
			label: 'Archive',
			title: 'Internet Archive',
			href: 'https://archive.org/details/@great_sphynx'
		},
		{ icon: musicSVG, label: 'Music', to: '/music' },
		{ icon: gamingSVG, label: 'Games', to: '/games' },
		{ icon: analyticsSVG, label: 'Uptime', href: 'https://status.gongo.tv' }
	],
	games: [
		{ icon: steamSVG, label: 'Steam', href: 'steam://url/SteamIDPage/76561197980678743' },
		{ icon: gongoIcon, label: 'Gongo', to: '/gongo' },
		{ icon: neoturfIcon, label: 'Neo Turf Masters', to: '/neoturfmasters' },
		{ icon: holomatchIcon, label: 'Holomatch', to: '/holomatch' },
		{ icon: congobongoIcon, label: 'Congo Bongo', to: '/congobongo' }
	],
	music: [
		{
			icon: youtubeSVG,
			label: 'YouTube',
			title: 'YouTube Playlist',
			fill: '#ff0033',
			href: 'https://youtube.com/playlist?list=PL28y8g5R15Wp60snlRsQkCcEGzu7eDJU5'
		},
		{
			icon: spotifySVG,
			label: 'Spotify',
			fill: '#1ed760',
			href: 'https://open.spotify.com/playlist/7FmvSjvbSviRWgLACnP9yt'
		},
		{ icon: radioSVG, label: 'Radio', title: 'AzuraCast', to: '/music/radio' },
		{ icon: bandcampSVG, label: 'Bandcamp', fill: '#1da0c3', href: 'https://greatsphynx.bandcamp.com' }
	],
	notifications: [
		{
			icon: discordSVG,
			label: 'Discord',
			title: 'Discord',
			fill: '#5865f2',
			href: 'https://discord.com/channels/847280020622671933/1158478340336914572'
		},
		{ icon: rssSVG, label: 'RSS', fill: '#fc8900', href: '/stream/rss' },
		{ icon: twitchSVG, label: 'Userscript', fill: '#a970ff', href: '/userscripts/gongo-twitch.user.js' },
		{ component: WebPush },
		{ component: Emails },
		{ component: DiscordWebhook }
	],
	radio: [],
	youtube: [
		{
			icon: youtubeSVG,
			label: 'Channel',
			title: 'YouTube Channel',
			fill: '#ff0033',
			href: 'https://youtube.com/GreatSphynx'
		},
		{
			icon: playlistSVG,
			label: 'Music',
			title: 'Music Playlist',
			href: 'https://youtube.com/playlist?list=PL28y8g5R15Wp60snlRsQkCcEGzu7eDJU5'
		},
		{
			icon: starSVG,
			label: 'Best Of',
			title: 'Best of Gongo',
			href: 'https://youtube.com/playlist?list=PL28y8g5R15WpQA-ZdjTT4HLHLlFi_iSMa'
		},
		{
			icon: floppySVG,
			label: 'Vintage CGI',
			href: 'https://youtube.com/playlist?list=PL28y8g5R15Wqg3J8765PDIRQ2zVKJ1MBo'
		}
	]
};

interface UseMenuReturn {
	items: ComputedRef<MenuItem[]>;
	/** false on the home menu, which has nowhere to go back to */
	canGoBack: ComputedRef<boolean>;
	/** step back through navigation history */
	back: () => void;
}

export function useMenu(): UseMenuReturn {
	const route = useRoute();
	const router = useRouter();

	const parent = computed(() => {
		const [record] = route.matched;
		const path = record?.aliasOf?.path ?? record?.path ?? '/';
		return path.replace(/\/[^/]+\/?$/, '') || '/';
	});

	function back(): void {
		if (typeof router.options.history.state.back === 'string') {
			router.back();
			return;
		}
		void router.replace(parent.value);
	}

	return {
		items: computed(() => MENUS[route.meta.menu ?? 'home']),
		canGoBack: computed(() => route.meta.menu !== 'home'),
		back
	};
}
