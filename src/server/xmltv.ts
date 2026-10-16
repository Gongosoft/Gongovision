import { writeXmltv } from '@iptv/xmltv';
import type { Xmltv, XmltvProgramme } from '@iptv/xmltv';

export function getXMLTV(): string {
	const NOW = new Date();
	const TODAY = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()));

	const programmes: XmltvProgramme[] = [];
	for (let day = 0; day < 7; day++) {
		const offset = day * 86_400_000;
		const start = new Date(TODAY.getTime() + offset + 5.5 * 3_600_000);
		const stop = new Date(TODAY.getTime() + offset + 11.5 * 3_600_000);

		programmes.push({
			channel: 'gongo',
			start,
			stop,
			title: [{ _value: 'GreatSphynx', lang: 'en' }],
			subTitle: [{ _value: 'no guarantee', lang: 'en' }],
			desc: [
				{
					_value: 'Gongo is a 2D side-scrolling platformer where the player goes through levels killing enemies and saving the princess. Each level has amazing hand-picked worlds. On each of the levels, a princess is hidden, which must be rescued and delivered to your castle, cleaning up enemies along the way.',
					lang: 'en'
				}
			],
			category: [{ _value: 'Series', lang: 'en' }],
			icon: [{ src: 'https://cdn.bergbok.computer/images/Spingus.webp' }],
			previouslyShown: {}
		});
	}

	const xmltv: Xmltv = {
		date: NOW,
		generatorInfoName: 'Cloudflare Workers',
		channels: [
			{
				id: 'gongo',
				displayName: [{ _value: 'GreatSphynx' }, { _value: '420420' }, { _value: 'Gongo' }],
				icon: [{ src: 'https://cdn.bergbok.computer/images/Spingus.webp' }]
			}
		],
		programmes
	};

	return writeXmltv(xmltv);
}
