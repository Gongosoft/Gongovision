import App from '@/App.vue';
import router from '@/router/router.ts';
import { createApp } from 'vue';
import { createHead } from '@unhead/vue/client';
import { CanonicalPlugin, InferSeoMetaPlugin } from '@unhead/vue/plugins';

const app = createApp(App);
const head = createHead({
	plugins: [
		CanonicalPlugin({
			canonicalHost: BASE_URL
		}),
		InferSeoMetaPlugin()
	]
});

app.use(head);
app.use(router);
app.mount(document.body);
