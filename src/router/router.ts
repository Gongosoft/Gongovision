import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			name: 'Home',
			path: '/',
			component: async () => import('@/views/Home.vue')
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
			name: 'Holomatch',
			path: '/holomatch',
			component: async () => import('@/views/Holomatch.vue')
		},
		{
			name: 'Gongo',
			path: '/stream',
			component: async () => import('@/views/Stream.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'Chat',
			path: '/stream/chat',
			component: async () => import('@/components/TwitchChat.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'StreamVideo',
			path: '/stream/video',
			component: async () => import('@/views/StreamVideo.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'Notifications',
			path: '/notifications',
			component: async () => import('@/views/Notifications.vue')
		},
		{
			name: 'VODs',
			path: '/vods',
			component: async () => import('@/views/VODs.vue')
		},
		{
			name: 'VODPlayer',
			path: '/vods/:title',
			component: async () => import('@/views/VODPlayer.vue'),
			meta: { fullscreen: true }
		},
		{
			name: 'NotFound',
			path: '/:pathMatch(.*)*',
			component: async () => import('@/views/404.vue')
		}
	]
});

export default router;
