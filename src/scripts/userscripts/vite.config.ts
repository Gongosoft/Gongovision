import { resolve } from 'path';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const ᱻ = resolve(import.meta.dirname, '../../..');

export default defineConfig({
	build: {
		cssMinify: false,
		minify: false,
		outDir: 'dist/client/userscripts',
		rolldownOptions: {
			output: { comments: true }
		}
	},
	define: {
		ANGELTHUMP: JSON.stringify({ CHANNEL: 'greatsphynx' }),
		OWNCAST: JSON.stringify({ HOST: 'https://live.gongo.tv' })
	},
	plugins: [
		monkey({
			entry: 'src/scripts/userscripts/twitch.user.ts',
			build: {
				fileName: 'gongo-twitch.user.js'
			},
			userscript: {
				'name': 'gongo live indicator for Twitch',
				'description': 'adds entries to the Twitch sidebar, following page and gongo category page when live',
				'author': 'xhiggy + bergbok',
				'connect': ['gongo.tv'],
				'grant': ['GM_xmlhttpRequest'],
				'icon': 'https://gongo.tv/favicon/favicon.webp',
				'license': 'ISC',
				'match': ['https://www.twitch.tv/*'],
				'namespace': 'gongo',
				'noframes': true,
				'run-at': 'document-idle',
				'updateURL': 'https://gongo.tv/userscripts/gongo-twitch.user.js',
				'version': '3.0'
			}
		})
	],
	publicDir: false,
	resolve: {
		alias: {
			'@': resolve(ᱻ, 'src')
		}
	},
	root: ᱻ
});
