import type { AudioReactive, AudioSource } from '@/types/gongoizer.d.ts';

export function startAudio(stream: MediaStream, source: AudioSource): AudioReactive {
	const ctx = new AudioContext();
	void ctx.resume();
	const src = ctx.createMediaStreamSource(stream);
	const analyser = ctx.createAnalyser();
	analyser.fftSize = 1024;
	analyser.smoothingTimeConstant = 0.5;
	src.connect(analyser);
	const bins = new Uint8Array(analyser.frequencyBinCount);
	const hz = ctx.sampleRate / analyser.fftSize;
	const bassTop = Math.max(2, Math.round(150 / hz));
	let avgBass = 0.1;
	let lastBeat = 0;
	let peak = 0.2;
	let ended = false;
	for (const track of stream.getAudioTracks()) {
		track.addEventListener('ended', () => {
			ended = true;
		});
	}

	return {
		source,
		get ended() {
			return ended;
		},
		read() {
			analyser.getByteFrequencyData(bins);
			let bass = 0;
			let all = 0;
			for (let i = 1; i < bins.length; i++) {
				const v = bins[i]! / 255;
				all += v;
				if (i <= bassTop) {
					bass += v;
				}
			}
			bass /= bassTop;
			all /= bins.length - 1;
			peak = Math.max(peak * 0.999, bass, 0.05);
			const normalizedBass = Math.min(1, bass / peak);
			const level = Math.min(1, all / (peak * 0.6));
			const now = ctx.currentTime;
			const beat = normalizedBass > avgBass * 1.35 && normalizedBass > 0.35 && now - lastBeat > 0.22;
			if (beat) {
				lastBeat = now;
			}
			avgBass = avgBass * 0.96 + normalizedBass * 0.04;
			return { level, bass: normalizedBass, beat };
		},
		stop() {
			for (const track of stream.getTracks()) {
				track.stop();
			}
			void ctx.close();
		}
	};
}
