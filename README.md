> [!IMPORTANT]
> Gongo is a 2D side-scrolling platformer where the player goes through levels killing enemies and saving the princess. Each level has amazing hand-picked worlds. On each of the levels, a princess is hidden, which must be rescued and delivered to your castle, cleaning up enemies along the way.

### Features

- Custom AngelThump player using video.js v10 & hls.js

> [!TIP]
> Add [#iframe](https://gongo.tv/stream#iframe) to the URL to use the official player instead

- [Bluesky feed](https://github.com/Gongosoft/Gongsky)
- [Emotes](https://gongo.tv/emotes) via [R2](https://www.cloudflare.com/products/r2)
- [Fingal](https://gongo.tv/fingal)
- [Gongo](https://gongo.tv/gongo)
- [Holomatch](https://gongo.tv/holomatch)
- [Notifications](https://gongo.tv/notifications) via browser and email
- [Osmo](https://gongo.tv/osmo)
- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) support
- [VODs](https://gongo.tv/vods) via [B2](https://backblaze.com/cloud-storage)
- RSS ([HTML](https://gongo.tv/rss/html) / [OPML](https://gongo.tv/rss/opml) / [XML](https://gongo.tv/rss/xml))
- [M3U](https://gongo.tv/stream/m3u) / [M3U8](https://gongo.tv/stream/m3u8) / [XMLTV](https://gongo.tv/stream/xmltv)
- [Webcal](webcal://gongo.tv/schedule.ics)

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
