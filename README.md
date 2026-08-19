> [!IMPORTANT]
> Gongo is a 2D side-scrolling platformer where the player goes through levels killing enemies and saving the princess. Each level has amazing hand-picked worlds. On each of the levels, a princess is hidden, which must be rescued and delivered to your castle, cleaning up enemies along the way.

### Features

- AngelThump player using video.js v10 & hls.js
- [Bluesky feed](https://github.com/Gongosoft/Gongsky)
- [Clips](https://gongo.tv/clips) and [VODs](https://gongo.tv/vods) via [B2](https://backblaze.com/cloud-storage)
- [Emotes](https://gongo.tv/emotes) via [R2](https://www.cloudflare.com/products/r2)
- [Fingal](https://gongo.tv/fingal)
- [Gongo](https://gongo.tv/gongo)
- [Holomatch](https://gongo.tv/holomatch)
- [Neo Turf Masters](https://gongo.tv/neoturfmasters)
- [Notifications](https://gongo.tv/notifications) via browser and email
- [Osmo](https://gongo.tv/osmo)
- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) support
- [M3U](https://gongo.tv/stream/m3u) / [M3U8](https://gongo.tv/stream/m3u8) / [XMLTV](https://gongo.tv/stream/xmltv)
- RSS via [HTML](https://gongo.tv/rss/html) / [OPML](https://gongo.tv/rss/opml) / [XML](https://gongo.tv/rss/xml)
- [Webcal](webcal://gongo.tv/schedule.ics)

> [!TIP]
>
> Add [#iframe](https://gongo.tv/stream#iframe) to `/stream` to use [AngelThump's player](https://github.com/AngelThump/Player).
>
> If your browser supports HLS[^http-live-streaming] you can use that functionality via [/stream/direct](https://gongo.tv/stream/direct).
>
> If using M3U8, use `?region` to pick your CDN, like [?region=amsterdam](https://gongo.tv/stream/m3u8?region=amsterdam).
> Click <a href='./vite.config.ts#L27'><img src='./src/assets/images/emotes/7tv/THIS.avif' alt='THIS' title='THIS' width=21 /></a> for available options.

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

[^http-live-streaming]: https://caniuse.com/http-live-streaming
