import '@/components/videojs/styles/theme.css';
import '@/components/videojs/skins/live-video/skin.css';
import '@videojs/html/ui/container';
import '@videojs/html/ui/poster';
import '@videojs/html/ui/buffering-indicator';
import '@videojs/html/ui/error-dialog';
import '@videojs/html/ui/dialog-backdrop';
import '@videojs/html/ui/dialog-popup';
import '@videojs/html/ui/dialog-title';
import '@videojs/html/ui/dialog-description';
import '@videojs/html/ui/dialog-close';
import '@videojs/html/ui/controls';
import '@videojs/html/ui/controls-backdrop';
import '@videojs/html/ui/controls-content';
import '@videojs/html/ui/tooltip-group';
import '@videojs/html/ui/controls-group';
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
import '@videojs/html/ui/captions-button';
import '@videojs/html/ui/menu';
import '@videojs/html/ui/menu-content';
import '@videojs/html/ui/captions-radio-group';
import '@videojs/html/ui/menu-radio-item';
import '@videojs/html/ui/menu-item-indicator';
import '@videojs/html/ui/cast-button';
import '@videojs/html/ui/airplay-button';
import '@videojs/html/ui/pip-button';
import '@videojs/html/ui/fullscreen-button';
import '@videojs/html/ui/hotkey';
import '@videojs/html/ui/gesture';
import '@videojs/html/ui/status-announcer';
import '@videojs/html/ui/volume-indicator';
import '@videojs/html/ui/volume-indicator-fill';
import '@videojs/html/ui/volume-indicator-value';
import '@videojs/html/ui/status-indicator';
import '@videojs/html/ui/status-indicator-value';
import {
	airPlayEnterIcon,
	airPlayExitIcon,
	captionsOffIcon,
	captionsOnIcon,
	castEnterIcon,
	castExitIcon,
	checkIcon,
	fullscreenEnterIcon,
	fullscreenExitIcon,
	pauseIcon,
	pipEnterIcon,
	pipExitIcon,
	playIcon,
	registerIcons,
	restartIcon,
	spinnerIcon,
	volumeHighIcon,
	volumeLowIcon,
	volumeOffIcon
} from '@videojs/html/icons';

registerIcons('default', {
	'airplay-enter': airPlayEnterIcon,
	'airplay-exit': airPlayExitIcon,
	'captions-off': captionsOffIcon,
	'captions-on': captionsOnIcon,
	'cast-enter': castEnterIcon,
	'cast-exit': castExitIcon,
	'check': checkIcon,
	'fullscreen-enter': fullscreenEnterIcon,
	'fullscreen-exit': fullscreenExitIcon,
	'pause': pauseIcon,
	'pip-enter': pipEnterIcon,
	'pip-exit': pipExitIcon,
	'play': playIcon,
	'restart': restartIcon,
	'spinner': spinnerIcon,
	'volume-high': volumeHighIcon,
	'volume-low': volumeLowIcon,
	'volume-off': volumeOffIcon
});
