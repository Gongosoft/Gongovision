<script setup lang="ts">
import '@videojs/html/global.css';
import '@/components/videojs/player.ts';
import '@videojs/html/ui/menu-radio-group';
import '@/components/videojs/video/skin.ts';
import LiveTimeSlider from '@/components/videojs/LiveTimeSlider.vue';
import { ref, useTemplateRef } from 'vue';
import { useVolumeWheel } from '@/composables/useVolumeWheel.ts';
import { usePlayerSettings } from '@/composables/usePlayerSettings.ts';
import type { LiveStreamPlayerElement } from '@/components/videojs/player.ts';

const { showPlaybackRate = true, uptime = null } = defineProps<{
	showPlaybackRate?: boolean;
	/** when set, the right-hand time display toggles between time behind live and this */
	uptime?: string | null;
}>();

const container = useTemplateRef<HTMLElement>('container');
const player = useTemplateRef<LiveStreamPlayerElement>('player');
const showUptime = ref(false);

usePlayerSettings(player);
useVolumeWheel(container, player);

const vSkinTemplates = {
	created(el: Element): void {
		for (const template of el.querySelectorAll('template')) {
			while (template.firstChild) {
				template.content.appendChild(template.firstChild);
			}
		}
	}
};
</script>

<template>
	<gongo-player ref="player">
		<media-container
			ref="container"
			v-skin-templates
			class="media-skin media-container video-skin"
			data-theme="default"
			data-preset="video">
			<slot name="media"></slot>
			<media-poster class="media-poster">
				<slot name="poster"></slot>
			</media-poster>
			<media-buffering-indicator class="media-buffering-indicator">
				<media-icon name="spinner" class="media-buffering-indicator-spinner-icon"> </media-icon>
			</media-buffering-indicator>
			<media-error-dialog class="media-dialog-root">
				<media-dialog-backdrop class="media-dialog-backdrop"> </media-dialog-backdrop>
				<media-dialog-popup class="media-dialog-popup">
					<div class="media-dialog-content">
						<media-dialog-title class="media-dialog-title"> </media-dialog-title>
						<media-dialog-description class="media-dialog-description"> </media-dialog-description>
					</div>
					<div class="media-dialog-actions">
						<media-dialog-close class="media-button media-dialog-close"> </media-dialog-close>
					</div>
				</media-dialog-popup>
			</media-error-dialog>
			<slot name="overlay"></slot>
			<media-controls>
				<media-controls-backdrop class="video-controls-backdrop"> </media-controls-backdrop>
				<media-controls-content class="video-controls video-controls-content">
					<media-tooltip-group>
						<media-controls-group class="video-controls-primary">
							<media-play-button class="media-button media-play-button" id="vjs-6EpYm0RN-0-trigger">
								<media-icon name="restart" class="media-button-icon media-play-button-restart-icon">
								</media-icon>
								<media-icon name="play" class="media-button-icon media-play-button-play-icon">
								</media-icon>
								<media-icon name="pause" class="media-button-icon media-play-button-pause-icon">
								</media-icon>
							</media-play-button>
							<media-tooltip
								trigger="vjs-6EpYm0RN-0-trigger"
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-tooltip-label> </media-tooltip-label>
								<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
							</media-tooltip>
							<media-mute-button
								commandfor="vjs-9Jipq7XQ-0-popup"
								class="media-button media-mute-button video-controls-volume-button"
								id="vjs-6EpYm0RN-0-2-trigger">
								<media-icon name="volume-off" class="media-button-icon media-mute-button-off-icon">
								</media-icon>
								<media-icon name="volume-low" class="media-button-icon media-mute-button-low-icon">
								</media-icon>
								<media-icon name="volume-high" class="media-button-icon media-mute-button-high-icon">
								</media-icon>
							</media-mute-button>
							<media-tooltip
								trigger="vjs-6EpYm0RN-0-2-trigger"
								delay="0"
								disabled
								sticky
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-tooltip-label> </media-tooltip-label>
								<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
							</media-tooltip>
							<media-volume-popover
								open-on-hover
								delay="200"
								close-delay="100"
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-volume-popover"
								id="vjs-9Jipq7XQ-0-popup">
								<media-volume-slider
									class="media-slider media-volume-slider"
									thumb-alignment="edge"
									orientation="vertical">
									<media-slider-track class="media-slider-track">
										<media-slider-fill class="media-slider-fill"> </media-slider-fill>
									</media-slider-track>
									<media-slider-thumb class="media-slider-thumb media-volume-slider-thumb">
									</media-slider-thumb>
								</media-volume-slider>
							</media-volume-popover>
							<media-controls-group class="video-time-slider-group">
								<media-live-button class="media-button media-live-button"> </media-live-button>
								<LiveTimeSlider :player="player" />
								<button
									type="button"
									class="media-time-toggle video-time-value"
									:aria-disabled="!uptime"
									:aria-label="showUptime && uptime ? 'Show time behind live' : 'Show stream uptime'"
									@click="showUptime = Boolean(uptime) && !showUptime">
									<span v-if="showUptime && uptime">{{ uptime }}</span>
									<media-time v-else type="remaining"> </media-time>
								</button>
							</media-controls-group>
							<slot name="controls"></slot>
							<media-captions-button
								class="media-button media-captions-button video-controls-captions-button"
								id="vjs-6EpYm0RN-0-3-trigger">
								<media-icon
									name="captions-off"
									class="media-button-icon media-captions-button-off-icon">
								</media-icon>
								<media-icon name="captions-on" class="media-button-icon media-captions-button-on-icon">
								</media-icon>
							</media-captions-button>
							<media-tooltip
								trigger="vjs-6EpYm0RN-0-3-trigger"
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-tooltip-label> </media-tooltip-label>
								<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
							</media-tooltip>
							<button
								commandfor="vjs-Keqr6Ase-0-popup"
								class="media-button media-settings-menu-trigger video-controls-settings-button"
								id="vjs-6EpYm0RN-0-4-trigger">
								<media-icon name="gear" class="media-button-icon-base media-settings-menu-trigger-icon">
								</media-icon>
								<media-text class="media-settings-menu-trigger-label" token="menu.settings"
									>Settings</media-text
								>
							</button>
							<media-tooltip
								trigger="vjs-6EpYm0RN-0-4-trigger"
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-text token="menu.settings">Settings</media-text>
							</media-tooltip>
							<media-menu
								side="top"
								align="center"
								class="media-popup media-popup-surface media-menu-popup media-menu-resizable-popup"
								id="vjs-Keqr6Ase-0-popup">
								<media-menu-content class="media-menu-content">
									<slot name="settings"></slot>
									<media-menu-item
										commandfor="vjs-tLacI0er-0-content"
										class="media-menu-trigger-item">
										<media-icon name="quality" class="media-menu-trigger-item-icon"> </media-icon>
										<media-text token="menu.quality">Quality</media-text>
										<span class="media-menu-hint">
											<span data-part="value" class="media-menu-hint-label"> </span>
											<media-icon name="chevron" class="media-menu-forward-chevron"> </media-icon>
										</span>
									</media-menu-item>
									<media-menu-content class="media-menu-content" id="vjs-tLacI0er-0-content">
										<media-menu-item class="media-menu-back-item">
											<media-icon name="chevron" class="media-menu-back-chevron"> </media-icon>
											<media-text token="menu.quality">Quality</media-text>
										</media-menu-item>
										<media-menu-separator class="media-menu-separator"> </media-menu-separator>
										<media-quality-radio-group class="media-menu-radio-group">
											<template>
												<media-menu-radio-item class="media-menu-radio-item">
													<span>
														<span data-part="label"> </span>
														<sup data-part="tier" class="media-menu-tier"> </sup>
													</span>
													<span data-part="badge" class="media-menu-badge"> </span>
													<media-menu-item-indicator
														force-mount
														class="media-menu-item-indicator">
														<media-icon name="check" class="media-menu-radio-item-icon">
														</media-icon>
													</media-menu-item-indicator>
												</media-menu-radio-item>
											</template>
										</media-quality-radio-group>
									</media-menu-content>
									<media-menu-item
										commandfor="vjs-Eo8DtgMd-0-content"
										class="media-menu-trigger-item">
										<media-icon name="speech" class="media-menu-trigger-item-icon"> </media-icon>
										<media-text token="menu.audio">Audio</media-text>
										<span class="media-menu-hint">
											<span data-part="value" class="media-menu-hint-label"> </span>
											<media-icon name="chevron" class="media-menu-forward-chevron"> </media-icon>
										</span>
									</media-menu-item>
									<media-menu-content class="media-menu-content" id="vjs-Eo8DtgMd-0-content">
										<media-menu-item class="media-menu-back-item">
											<media-icon name="chevron" class="media-menu-back-chevron"> </media-icon>
											<media-text token="menu.audio">Audio</media-text>
										</media-menu-item>
										<media-menu-separator class="media-menu-separator"> </media-menu-separator>
										<media-audio-track-radio-group class="media-menu-radio-group">
											<template>
												<media-menu-radio-item class="media-menu-radio-item">
													<span data-part="label"> </span>
													<media-menu-item-indicator
														force-mount
														class="media-menu-item-indicator">
														<media-icon name="check" class="media-menu-radio-item-icon">
														</media-icon>
													</media-menu-item-indicator>
												</media-menu-radio-item>
											</template>
										</media-audio-track-radio-group>
									</media-menu-content>
									<media-menu-item
										commandfor="vjs-H32r9IqW-0-content"
										class="media-menu-trigger-item"
										:hidden="!showPlaybackRate">
										<media-icon name="speed" class="media-menu-trigger-item-icon"> </media-icon>
										<media-text token="menu.speed">Speed</media-text>
										<span class="media-menu-hint">
											<span data-part="value" class="media-menu-hint-label"> </span>
											<media-icon name="chevron" class="media-menu-forward-chevron"> </media-icon>
										</span>
									</media-menu-item>
									<media-menu-content class="media-menu-content" id="vjs-H32r9IqW-0-content">
										<media-menu-item class="media-menu-back-item">
											<media-icon name="chevron" class="media-menu-back-chevron"> </media-icon>
											<media-text token="menu.speed">Speed</media-text>
										</media-menu-item>
										<media-menu-separator class="media-menu-separator"> </media-menu-separator>
										<media-playback-rate-radio-group class="media-menu-radio-group">
											<template>
												<media-menu-radio-item class="media-menu-radio-item">
													<span data-part="label"> </span>
													<media-menu-item-indicator
														force-mount
														class="media-menu-item-indicator">
														<media-icon name="check" class="media-menu-radio-item-icon">
														</media-icon>
													</media-menu-item-indicator>
												</media-menu-radio-item>
											</template>
										</media-playback-rate-radio-group>
									</media-menu-content>
									<media-menu-item
										commandfor="vjs-rIQzx-29-0-content"
										class="media-menu-trigger-item">
										<media-icon name="captions-off" class="media-menu-trigger-item-icon">
										</media-icon>
										<media-text token="menu.captions">Captions</media-text>
										<span class="media-menu-hint">
											<span data-part="value" class="media-menu-hint-label"> </span>
											<media-icon name="chevron" class="media-menu-forward-chevron"> </media-icon>
										</span>
									</media-menu-item>
									<media-menu-content class="media-menu-content" id="vjs-rIQzx-29-0-content">
										<media-menu-item class="media-menu-back-item">
											<media-icon name="chevron" class="media-menu-back-chevron"> </media-icon>
											<media-text token="menu.captions">Captions</media-text>
										</media-menu-item>
										<media-menu-separator class="media-menu-separator"> </media-menu-separator>
										<media-captions-radio-group class="media-menu-radio-group">
											<template>
												<media-menu-radio-item class="media-menu-radio-item">
													<span data-part="label"> </span>
													<media-menu-item-indicator
														force-mount
														class="media-menu-item-indicator">
														<media-icon name="check" class="media-menu-radio-item-icon">
														</media-icon>
													</media-menu-item-indicator>
												</media-menu-radio-item>
											</template>
										</media-captions-radio-group>
									</media-menu-content>
									<slot name="settings-menu"></slot>
								</media-menu-content>
							</media-menu>
						</media-controls-group>
						<media-controls-group class="video-controls-secondary">
							<media-cast-button class="media-button media-cast-button" id="vjs-6EpYm0RN-0-5-trigger">
								<media-icon name="cast-enter" class="media-button-icon media-cast-button-enter-icon">
								</media-icon>
								<media-icon name="cast-exit" class="media-button-icon media-cast-button-exit-icon">
								</media-icon>
							</media-cast-button>
							<media-tooltip
								trigger="vjs-6EpYm0RN-0-5-trigger"
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-tooltip-label> </media-tooltip-label>
								<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
							</media-tooltip>
							<media-airplay-button
								class="media-button media-airplay-button"
								id="vjs-6EpYm0RN-0-6-trigger">
								<media-icon
									name="airplay-enter"
									class="media-button-icon media-airplay-button-enter-icon">
								</media-icon>
								<media-icon
									name="airplay-exit"
									class="media-button-icon media-airplay-button-exit-icon">
								</media-icon>
							</media-airplay-button>
							<media-tooltip
								trigger="vjs-6EpYm0RN-0-6-trigger"
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-tooltip-label> </media-tooltip-label>
								<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
							</media-tooltip>
							<media-pip-button class="media-button media-pip-button" id="vjs-6EpYm0RN-0-7-trigger">
								<media-icon name="pip-enter" class="media-button-icon media-pip-button-enter-icon">
								</media-icon>
								<media-icon name="pip-exit" class="media-button-icon media-pip-button-exit-icon">
								</media-icon>
							</media-pip-button>
							<media-tooltip
								trigger="vjs-6EpYm0RN-0-7-trigger"
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-tooltip-label> </media-tooltip-label>
								<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
							</media-tooltip>
							<media-fullscreen-button
								class="media-button media-fullscreen-button"
								id="vjs-6EpYm0RN-0-8-trigger">
								<media-icon
									name="fullscreen-enter"
									class="media-button-icon media-fullscreen-button-enter-icon">
								</media-icon>
								<media-icon
									name="fullscreen-exit"
									class="media-button-icon media-fullscreen-button-exit-icon">
								</media-icon>
							</media-fullscreen-button>
							<media-tooltip
								trigger="vjs-6EpYm0RN-0-8-trigger"
								side="top"
								class="media-popup media-popup-safe-area media-popup-transition media-popup-surface media-tooltip">
								<media-tooltip-label> </media-tooltip-label>
								<media-tooltip-shortcut class="media-tooltip-shortcut"> </media-tooltip-shortcut>
							</media-tooltip>
						</media-controls-group>
					</media-tooltip-group>
				</media-controls-content>
			</media-controls>
			<media-hotkey keys="Space" action="togglePaused"> </media-hotkey>
			<media-hotkey keys="k" action="togglePaused"> </media-hotkey>
			<media-hotkey keys="m" action="toggleMuted"> </media-hotkey>
			<media-hotkey keys="ArrowRight" action="seekStep"> </media-hotkey>
			<media-hotkey keys="ArrowLeft" action="seekStep"> </media-hotkey>
			<media-hotkey keys="l" action="seekStep"> </media-hotkey>
			<media-hotkey keys="j" action="seekStep"> </media-hotkey>
			<media-hotkey keys="ArrowUp" action="volumeStep"> </media-hotkey>
			<media-hotkey keys="ArrowDown" action="volumeStep"> </media-hotkey>
			<media-hotkey keys="0-9" action="seekToPercent"> </media-hotkey>
			<media-hotkey keys="Home" action="seekToPercent" value="0"> </media-hotkey>
			<media-hotkey keys="End" action="seekToPercent" value="100"> </media-hotkey>
			<media-hotkey keys=">" action="speedUp"> </media-hotkey>
			<media-hotkey keys="<" action="speedDown"> </media-hotkey>
			<media-hotkey keys="f" action="toggleFullscreen"> </media-hotkey>
			<media-hotkey keys="c" action="toggleSubtitles"> </media-hotkey>
			<media-hotkey keys="i" action="togglePictureInPicture"> </media-hotkey>
			<media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"> </media-gesture>
			<media-gesture type="tap" action="toggleControls" pointer="touch"> </media-gesture>
			<media-gesture type="doubletap" action="toggleFullscreen" pointer="mouse"> </media-gesture>
			<media-gesture type="doubletap" action="seekStep" pointer="touch" region="left"> </media-gesture>
			<media-gesture type="doubletap" action="toggleFullscreen" pointer="touch" region="center"> </media-gesture>
			<media-gesture type="doubletap" action="seekStep" pointer="touch" region="right"> </media-gesture>
			<media-status-announcer class="media-status-announcer"> </media-status-announcer>
			<div class="video-status-indicators">
				<media-volume-indicator class="media-indicator media-volume-indicator">
					<media-volume-indicator-fill class="media-indicator-content media-volume-indicator-fill">
						<media-icon name="volume-high" class="media-volume-indicator-high-icon"> </media-icon>
						<media-icon name="volume-low" class="media-volume-indicator-low-icon"> </media-icon>
						<media-icon name="volume-off" class="media-volume-indicator-off-icon"> </media-icon>
						<media-volume-indicator-value class="media-volume-indicator-value">
						</media-volume-indicator-value>
					</media-volume-indicator-fill>
				</media-volume-indicator>
				<media-status-indicator
					actions="toggleSubtitles,toggleFullscreen,togglePictureInPicture"
					class="media-indicator media-status-indicator">
					<div class="media-indicator-content media-status-indicator-content">
						<media-icon name="captions-on" class="media-status-indicator-captions-on-icon"> </media-icon>
						<media-icon name="captions-off" class="media-status-indicator-captions-off-icon"> </media-icon>
						<media-icon name="fullscreen-enter" class="media-status-indicator-fullscreen-enter-icon">
						</media-icon>
						<media-icon name="fullscreen-exit" class="media-status-indicator-fullscreen-exit-icon">
						</media-icon>
						<media-icon name="pip-enter" class="media-status-indicator-pip-enter-icon"> </media-icon>
						<media-icon name="pip-exit" class="media-status-indicator-pip-exit-icon"> </media-icon>
						<media-status-indicator-value class="media-status-indicator-value">
						</media-status-indicator-value>
					</div>
				</media-status-indicator>
				<media-seek-indicator class="media-seek-indicator">
					<media-icon name="chevron" class="media-seek-indicator-icon"> </media-icon>
					<media-seek-indicator-value class="media-seek-indicator-value"> </media-seek-indicator-value>
				</media-seek-indicator>
				<media-status-indicator actions="togglePaused" class="media-playback-status-indicator">
					<media-icon name="play" class="media-playback-status-indicator-play-icon"> </media-icon>
					<media-icon name="pause" class="media-playback-status-indicator-pause-icon"> </media-icon>
				</media-status-indicator>
			</div>
		</media-container>
	</gongo-player>
</template>

<style>
gongo-player {
	display: contents;
}

@layer components {
	@supports selector(:popover-open) {
		.media-menu-popup:not(:popover-open) {
			display: block;
			pointer-events: none;
			position: fixed;
			visibility: hidden;
		}
	}

	@scope (.media-skin[data-theme="default"]) {
		.media-live-button {
			padding-inline: 0 calc(var(--media-spacing) * 3);
		}
	}
}
</style>
