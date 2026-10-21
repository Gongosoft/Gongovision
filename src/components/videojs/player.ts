import { videoFeatures } from '@videojs/html/video';
import { createPlayer, liveFeature } from '@videojs/html';

const { PlayerElement } = createPlayer({ features: [...videoFeatures, liveFeature] });

export type LiveStreamPlayerElement = InstanceType<typeof PlayerElement>;

if (!customElements.get('gongo-player')) {
	customElements.define('gongo-player', PlayerElement);
}
