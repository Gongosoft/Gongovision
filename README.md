### Features

- [Bluesky feed](https://github.com/Gongosoft/Gongsky)
- [Emotes](https://gongo.bergbok.workers.dev/emotes) via [R2](https://www.cloudflare.com/products/r2)
- [Fingal](https://gongo.bergbok.workers.dev/fingal)
- [Gongo](https://gongo.bergbok.workers.dev/gongo)
- [Holomatch](https://gongo.bergbok.workers.dev/holomatch)
- [Notifications](https://gongo.bergbok.workers.dev/notifications) (via browser and email)
- [Osmo](https://gongo.bergbok.workers.dev/osmo)
- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) support
- [VODs](https://gongo.bergbok.workers.dev/vods) via [B2](https://backblaze.com/cloud-storage)
- RSS ([HTML](https://gongo.bergbok.workers.dev/rss/html) / [OPML](https://gongo.bergbok.workers.dev/rss/opml) / [XML](https://gongo.bergbok.workers.dev/rss/xml))
- [M3U](https://gongo.bergbok.workers.dev/stream/m3u) / [M3U8](https://gongo.bergbok.workers.dev/stream/m3u8) / [XMLTV](https://gongo.bergbok.workers.dev/stream/xmltv)
- [Webcal](webcal://gongo.bergbok.workers.dev/schedule.ics)

<div align='center'>
	<picture>
		<img width="228" src="https://cdn.bergbok.computer/images/gongoVision.avif" />
	</picture>
	<p>work in progress</p>
</div>

### Running Locally

```bash
git clone https://github.com/Gongosoft/Gongovision.git && cd Gongovision
bun install
bun typegen
cp .dev.vars.example .dev.vars
sed -ie 's/\/\/ remoteBindings/remoteBindings/g' vite.config.ts
bun dev
```

<div align='center'>
	<picture>
		<img src='./src/assets/images/emotes/7tv/WatchingStream.avif' alt='WatchingStream' width=42 />
	</picture>
</div>
