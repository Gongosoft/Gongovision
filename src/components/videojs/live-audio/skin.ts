import '../styles/audio/base.css';
import './skin.css';
import '@videojs/html/ui/container';
import '@videojs/html/ui/error-dialog';
import '@videojs/html/ui/dialog-backdrop';
import '@videojs/html/ui/dialog-popup';
import '@videojs/html/ui/dialog-title';
import '@videojs/html/ui/dialog-description';
import '@videojs/html/ui/dialog-close';
import '@videojs/html/ui/controls';
import '@videojs/html/ui/controls-content';
import '@videojs/html/ui/tooltip-group';
import '@videojs/html/ui/controls-group';
import '@videojs/html/ui/buffering-indicator';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/tooltip';
import '@videojs/html/ui/tooltip-label';
import '@videojs/html/ui/tooltip-shortcut';
import '@videojs/html/ui/live-button';
import '@videojs/html/ui/mute-button';
import '@videojs/html/ui/volume-popover';
import '@videojs/html/ui/volume-slider';
import '@videojs/html/ui/slider-track';
import '@videojs/html/ui/slider-fill';
import '@videojs/html/ui/slider-thumb';
import '@videojs/html/ui/hotkey';
import '@videojs/html/ui/status-announcer';
import {
	pauseIcon,
	playIcon,
	registerIcons,
	restartIcon,
	spinnerIcon,
	volumeHighIcon,
	volumeLowIcon,
	volumeOffIcon
} from '@videojs/html/icons';

registerIcons('default', {
	'pause': pauseIcon,
	'play': playIcon,
	'restart': restartIcon,
	'spinner': spinnerIcon,
	'volume-high': volumeHighIcon,
	'volume-low': volumeLowIcon,
	'volume-off': volumeOffIcon
});
