import { resolve } from 'path';
import { transform } from 'lightningcss';
import { minifySync } from 'rolldown/utils';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import type { Plugin } from 'vite';

const ᱻ = resolve(import.meta.dirname, '../..');

/** must match `scripts` from [loader.js](../../public/emulatorjs/loader.js) */
const emulatorJSScripts = [
	'emulator.js',
	'nipplejs.js',
	'shaders.js',
	'storage.js',
	'gamepad.js',
	'GameManager.js',
	'socket.io.min.js',
	'compression.js'
];

export default function emulatorJS(options: { inDir: string; outDir: string }): Plugin {
	const inDir = resolve(ᱻ, options.inDir);
	const outDir = resolve(ᱻ, options.outDir);

	function minify(): void {
		const scripts = emulatorJSScripts.map((file) => readFileSync(resolve(inDir, 'src', file), 'utf8'));
		const js = minifySync('emulator.min.js', scripts.join('\n'));
		const css = transform({
			filename: 'emulator.css',
			code: readFileSync(resolve(inDir, 'emulator.css')),
			minify: true
		});
		const problems = [
			...js.errors.map((error) => `Rolldown: ${error.message}`),
			...css.warnings.map((warning) => `LightningCSS: ${warning.message}`)
		];
		if (problems.length) {
			const reason = `minify failed:\n${problems.join('\n')}`;
			throw new Error(reason);
		}
		mkdirSync(outDir, { recursive: true });
		writeFileSync(resolve(outDir, 'emulator.min.js'), js.code);
		writeFileSync(resolve(outDir, 'emulator.min.css'), css.code);
	}

	return {
		name: 'minify:emulatorjs',
		buildStart() {
			minify();
		},
		configureServer() {
			minify();
		}
	};
}
