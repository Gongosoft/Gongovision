import agents from 'agents/vite';
import vue from '@vitejs/plugin-vue';
import unfonts from 'unplugin-fonts/vite';
import fflateZip from 'vite-plugin-fflate-zip';
import vueDevTools from 'vite-plugin-vue-devtools';
import emulatorJS from './src/scripts/buildEmulatorJS.ts';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';
import { VitePWA as pwa } from 'vite-plugin-pwa';
import { Unhead as unhead } from '@unhead/vue/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { cloudflareRedirect } from 'vite-plugin-cloudflare-redirect';
import type { CustomFontFace } from 'unplugin-fonts/types';

const ᱻ = import.meta.dirname;

// https://vite.dev/config
export default defineConfig({
	appType: 'spa',
	build: {
		chunkSizeWarningLimit: 6969
	},
	define: {
		ANGELTHUMP: JSON.stringify({
			API: 'https://api.angelthump.com/v3',
			CDN: {
				amsterdam: { label: 'Amsterdam', subdomain: 'ams1' },
				frankfurt: { label: 'Frankfurt', subdomain: 'fra1' },
				newyork: { label: 'New York', subdomain: 'nyc1' },
				sanfrancisco: { label: 'San Francisco', subdomain: 'sfo1' },
				singapore: { label: 'Singapore', subdomain: 'sgp1' }
			},
			CHANNEL: 'greatsphynx',
			IDENTIFIER: 'SwnpX0RnA99YdRj0SPqs',
			PLAYER: 'https://player.angelthump.com',
			VIGOR: 'https://vigor.angelthump.com',
			WS: 'wss://uws.angelthump.com/ws'
		}),
		BASE_URL: JSON.stringify('https://gongo.tv'),
		LIVE_NOTIFICATION: JSON.stringify({
			title: 'the pull of the gongo compels you',
			body: 'GreatSphynx started streaming',
			icon: '/notification/icon',
			badge: '/notification/badge',
			image: '/notification/image',
			tag: 'call-of-the-gongo',
			data: { url: '/stream' },
			requireInteraction: true
		}),
		TWITCH_CHANNEL: JSON.stringify('fakesphynx')
	},
	plugins: [
		agents(),
		cloudflare({
			// remoteBindings: false
		}),
		cloudflareRedirect(),
		emulatorJS({
			inDir: 'node_modules/@emulatorjs/emulatorjs/data',
			outDir: 'public/emulatorjs'
		}),
		fflateZip({
			inDir: 'src/assets/images/emotes',
			outDir: 'dist/client',
			zipName: 'emotes',
			excludedFiles: ['picmin.svg']
		}),
		pwa({
			devOptions: {
				enabled: true,
				type: 'module'
			},
			filename: 'sw.ts',
			injectRegister: false,
			manifest: {
				name: 'Gongo',
				description:
					'Gongo is a 2D side-scrolling platformer where the player goes through levels killing enemies and saving the princess. Each level has amazing hand-picked worlds. On each of the levels, a princess is hidden, which must be rescued and delivered to your castle, cleaning up enemies along the way.',
				theme_color: '#fffc3f',
				background_color: '#d41212',
				display: 'standalone'
			},
			pwaAssets: {
				config: 'pwa-assets.config.ts'
			},
			registerType: 'autoUpdate',
			srcDir: 'src',
			strategies: 'injectManifest',
			workbox: {
				cleanupOutdatedCaches: true,
				globPatterns: ['**/*.{js,css,html,png,avif,svg,woff2,opus,webp,gif}']
			}
		}),
		unfonts({
			inlineFontFace: true,
			custom: {
				display: 'block',
				preload: false,
				families: [
					{
						name: 'Gohu',
						local: 'GohuFont 14 Nerd Font',
						src: './src/assets/fonts/gohu.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Heavy Data',
						local: 'HeavyData Nerd Font',
						src: './src/assets/fonts/heavy-data.woff2'
					},
					{
						name: 'VCR OSD',
						local: 'VCR OSD Mono',
						src: './src/assets/fonts/vcr-osd-mono.woff2'
					},
					{
						name: 'RuneScape',
						local: 'RuneScape',
						src: './src/assets/fonts/runescape/regular.woff2'
					},
					{
						name: 'RuneScape Bold',
						local: 'RuneScape',
						src: './src/assets/fonts/runescape/bold.woff2'
					},
					{
						name: 'Trek Alien Bajoran',
						local: 'ST Bajoran Ideogram',
						src: './src/assets/fonts/trek/alien/bajoran.woff2'
					},
					{
						name: 'Trek Alien Cardassian',
						local: 'ST Cardassian',
						src: './src/assets/fonts/trek/alien/cardassian.woff2'
					},
					{
						name: 'Trek Alien Dominion',
						local: 'ST Dominion',
						src: './src/assets/fonts/trek/alien/dominion.woff2'
					},
					{
						name: 'Trek Alien Fabrini',
						local: 'Fabrini',
						src: './src/assets/fonts/trek/alien/fabrini.woff2',
						transform(font): CustomFontFace {
							font.weight = 700;
							return font;
						}
					},
					{
						name: 'Trek Alien Ferengi',
						local: 'ST Ferengi R',
						src: './src/assets/fonts/trek/alien/ferengi.woff2'
					},
					{
						name: 'Trek Alien Klingon',
						local: 'KlingonTNG',
						src: './src/assets/fonts/trek/alien/klingon.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Alien Romulan',
						local: 'Romulan',
						src: './src/assets/fonts/trek/alien/romulan.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Alien Tholian',
						local: 'Tholian',
						src: './src/assets/fonts/trek/alien/tholian.woff2',
						transform(font): CustomFontFace {
							font.weight = 100;
							return font;
						}
					},
					{
						name: 'Trek Alien Trill',
						local: 'Trill',
						src: './src/assets/fonts/trek/alien/trill.woff2'
					},
					{
						name: 'Trek Alien Vulcan',
						local: 'Modern vulcan 1.1',
						src: './src/assets/fonts/trek/alien/vulcan.woff2'
					},
					{
						name: 'Trek Text Beijing',
						local: 'Beijing SSi',
						src: './src/assets/fonts/trek/text/beijing.woff2'
					},
					{
						name: 'Trek Text Context Ultra Condensed',
						local: 'Context Ultra Condensed SSi',
						src: './src/assets/fonts/trek/text/context-ultra-condensed.woff2'
					},
					{
						name: 'Trek Text Context Ultra Condensed Bold',
						local: 'Context Ultra Condensed SSi',
						src: './src/assets/fonts/trek/text/context-ultra-condensed-bold.woff2'
					},
					{
						name: 'Trek Text Federation',
						local: 'Federation',
						src: './src/assets/fonts/trek/text/federation.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Text Federation Wide',
						local: 'FederationWide',
						src: './src/assets/fonts/trek/text/federation-wide.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Text Starfleet 1',
						local: 'Deusex',
						src: './src/assets/fonts/trek/text/starfleet-1.woff2'
					},
					{
						name: 'Trek Text Starfleet 2',
						local: 'FederationStarfleet',
						src: './src/assets/fonts/trek/text/starfleet-2.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Text TNG Monitors',
						local: 'Trek TNG Monitors',
						src: './src/assets/fonts/trek/text/trek-tng-monitors.woff2'
					},
					{
						name: 'Trek Text Trek Bats',
						local: 'Trekbats',
						src: './src/assets/fonts/trek/text/trekbats.woff2',
						transform(font): CustomFontFace {
							font.weight = 100;
							return font;
						}
					},
					{
						name: 'Trek Titles DS9 Credits',
						local: 'Trek',
						src: './src/assets/fonts/trek/titles/ds9-credits.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Titles DS9 Title',
						local: 'FederationDS9Title',
						src: './src/assets/fonts/trek/titles/ds9-title.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Titles Final Frontier',
						local: 'Final Frontier',
						src: './src/assets/fonts/trek/titles/final-frontier.woff2'
					},
					{
						name: 'Trek Titles Jefferies',
						local: 'Jefferies',
						src: './src/assets/fonts/trek/titles/jefferies.woff2',
						transform(font): CustomFontFace {
							font.style = 'italic';
							return font;
						}
					},
					{
						name: 'Trek Titles Montalban',
						local: 'Montalban',
						src: './src/assets/fonts/trek/titles/montalban.woff2'
					},
					{
						name: 'Trek Titles Nova Light Ultra',
						local: 'Nova Light Ultra SSi',
						src: './src/assets/fonts/trek/titles/nova-light-ultra.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Titles Nova Light Ultra Thin',
						local: 'Nova Light Ultra SSi',
						src: './src/assets/fonts/trek/titles/nova-light-ultra-thin.woff2',
						transform(font): CustomFontFace {
							font.weight = 400;
							return font;
						}
					},
					{
						name: 'Trek Titles TNG Credits',
						local: 'Krupper',
						src: './src/assets/fonts/trek/titles/tng-credits.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Titles TNG Title',
						local: 'Federation',
						src: './src/assets/fonts/trek/titles/tng-title.woff2',
						transform(font): CustomFontFace {
							font.weight = 500;
							return font;
						}
					},
					{
						name: 'Trek Titles TOS Title',
						local: 'Trek',
						src: './src/assets/fonts/trek/titles/tos-title.woff2',
						transform(font): CustomFontFace {
							// font.stretch = 'condensed';
							return font;
						}
					},
					{
						name: 'Trek Titles Movie 1',
						local: 'Berette',
						src: './src/assets/fonts/trek/titles/trek-movie-1.woff2'
					},
					{
						name: 'Trek Titles Movie 2',
						local: 'Trek Generation 1',
						src: './src/assets/fonts/trek/titles/trek-movie-2.woff2'
					}
				]
			}
		}),
		unhead(),
		vue({
			features: {
				optionsAPI: false
			},
			template: {
				compilerOptions: {
					isCustomElement: (tag) => tag.includes('-')
				}
			}
		}),
		vueDevTools()
	],
	preview: {
		allowedHosts: ['.trycloudflare.com']
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('/src', import.meta.url)),
			'@osmo': resolve(ᱻ, 'src/assets/images/osmo'),
			'@videojs/html/icons/element/default': resolve(
				ᱻ,
				'node_modules/@videojs/html/dist/default/icons/element/default/index.js'
			)
		}
	}
});
