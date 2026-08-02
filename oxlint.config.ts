import { defineConfig } from 'oxlint';

// https://oxc.rs/docs/guide/usage/linter/config-file-reference.html
export default defineConfig({
	categories: {
		correctness: 'warn',
		perf: 'warn',
		restriction: 'warn',
		style: 'warn',
		suspicious: 'warn'
	},
	env: {
		browser: true,
		vue: true
	},
	ignorePatterns: ['**/*.js', '**/*.jsx', '**/*.mjs', '/public/', '/src/lib/*/'],
	options: {
		maxWarnings: 42,
		typeAware: true,
		typeCheck: true
	},
	overrides: [
		{
			files: ['*.config.ts', 'src/scripts/*.ts'],
			rules: {
				'import/no-nodejs-modules': 'off',
				'unicorn/import-style': 'off'
			}
		},
		{
			files: ['ox*.config.ts'],
			rules: {
				'eslint/sort-keys': 'warn'
			}
		},
		{
			files: ['src/main.ts'],
			rules: {
				'eslint/new-cap': 'off'
			}
		},
		{
			files: ['src/components/Emails.vue', 'src/components/WebPush.vue'],
			rules: {
				'eslint/no-alert': 'off'
			}
		},
		{
			files: ['src/router/router.ts'],
			rules: {
				'typescript/explicit-function-return-type': 'off'
			}
		},
		{
			files: ['src/scripts/syncEmotes.ts'],
			rules: {
				'no-await-in-loop': 'off'
			}
		},
		{
			files: ['src/server/notifications.ts', 'src/server/worker.ts'],
			rules: {
				'eslint/complexity': 'off'
			}
		},
		{
			files: ['src/sw.ts'],
			rules: {
				'eslint/no-underscore-dangle': ['warn', { allow: ['__WB_MANIFEST'] }],
				'no-await-in-loop': 'off'
			}
		}
	],
	plugins: ['eslint', 'oxc', 'import', 'jsdoc', 'promise', 'typescript', 'unicorn', 'vue'],
	rules: {
		'eslint/capitalized-comments': 'off',
		'eslint/func-style': 'off',
		'eslint/id-length': 'off',
		'eslint/max-params': 'off',
		'eslint/max-statements': 'off',
		'eslint/no-console': 'off',
		'eslint/no-continue': 'off',
		'eslint/no-duplicate-imports': ['warn', { allowSeparateTypeImports: true }],
		'eslint/no-magic-numbers': 'off',
		'eslint/no-plusplus': 'off',
		'eslint/no-ternary': 'off',
		'eslint/no-undefined': 'off',
		'eslint/no-void': 'off',
		'eslint/sort-imports': ['warn', { ignoreCase: true, ignoreDeclarationSort: true }],
		'eslint/sort-keys': 'off',
		'import/exports-last': 'off',
		'import/group-exports': 'off',
		'import/no-default-export': 'off',
		'import/no-named-export': 'off',
		'import/no-unassigned-import': 'off',
		'import/prefer-default-export': 'off',
		'import/unambiguous': 'off',
		'oxc/no-async-await': 'off',
		'oxc/no-optional-chaining': 'off',
		'oxc/no-rest-spread-properties': 'off',
		'typescript/no-non-null-assertion': 'off',
		'typescript/no-unsafe-type-assertion': 'off',
		'unicorn/filename-case': 'off',
		'unicorn/no-null': 'off',
		'unicorn/number-literal-case': 'off',
		'unicorn/prefer-global-this': 'off',
		'unicorn/prefer-node-protocol': 'off',
		'vue/max-props': 'off'
	}
});
