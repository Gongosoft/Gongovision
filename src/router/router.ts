import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			name: 'Home',
			path: '/',
			component: async () => import('@/views/Menu.vue'),
			meta: { menu: 'home' }
		},
		{
			name: 'Clips',
			path: '/clips/:title?',
			component: async () => import('@/views/Clips.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'Community',
			path: '/community',
			component: async () => import('@/views/Menu.vue'),
			meta: { menu: 'community' }
		},
		{
			name: 'Congo Bongo',
			path: '/congobongo',
			alias: '/gongobongo',
			component: async () => import('@/views/CongoBongo.vue')
		},
		{
			name: 'Content',
			path: '/content',
			component: async () => import('@/views/Menu.vue'),
			meta: { menu: 'content' }
		},
		{
			name: 'Radio',
			path: '/content/radio',
			alias: '/radio',
			component: async () => import('@/views/Radio.vue'),
			meta: { menu: 'radio', muted: true }
		},
		{
			name: 'YouTube Links',
			path: '/content/youtube',
			alias: '/youtube',
			component: async () => import('@/views/Menu.vue'),
			meta: { menu: 'youtube' }
		},
		{
			name: 'Emote Wall Settings',
			path: '/emotewall',
			component: async () => import('@/views/EmoteWallSettings.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'Fingal',
			path: '/fingal',
			alias: '/fingalfunny',
			component: async () => import('@/views/Fingal.vue')
		},
		{
			name: 'Gongo (real)',
			path: '/gongo',
			component: async () => import('@/views/Gongo.vue')
		},
		{
			name: 'Gongoizer',
			path: '/gongoizer',
			component: async () => import('@/views/Gongoizer.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'Holomatch',
			path: '/holomatch',
			component: async () => import('@/views/Holomatch.vue')
		},
		{
			name: 'Neo Turf Masters',
			path: '/neoturfmasters',
			alias: '/ondagween',
			component: async () => import('@/views/NeoTurfMasters.vue')
		},
		{
			name: 'Notifications',
			path: '/notifications',
			component: async () => import('@/views/Menu.vue'),
			meta: { menu: 'notifications' }
		},
		{
			name: 'Stream',
			path: '/stream',
			component: async () => import('@/views/Stream.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'Stream (Video Only)',
			path: '/stream/video',
			component: async () => import('@/views/StreamVideo.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'VODs',
			path: '/vods',
			component: async () => import('@/views/VODs.vue')
		},
		{
			name: 'VOD Player',
			path: '/vods/:title',
			component: async () => import('@/views/VODPlayer.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'Not Found',
			path: '/:pathMatch(.*)*',
			component: async () => import('@/views/404.vue')
		}
	]
});

export default router;
