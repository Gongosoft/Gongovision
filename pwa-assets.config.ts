import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
	headLinkOptions: {
		preset: '2023'
	},
	preset: {
		...preset,
		apple: {
			...preset.apple,
			resizeOptions: { background: 'transparent' }
		},
		maskable: {
			...preset.maskable,
			resizeOptions: { background: 'transparent' }
		}
	},
	images: ['public/pwa.webp']
});
