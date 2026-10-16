// Audio analysis for feedback-bg.js (loaded only when audio is enabled).
//   source 'mic'     - microphone (asks for permission)
//   source 'desktop' - screen/tab share with audio: pick a screen with "share system audio"
//                      ticked, or a tab with "share tab audio" (Chrome/Edge; Firefox can't).
// read() returns { level, bass, beat }: level/bass roughly 0..1, beat true on a bass onset.
export async function startAudio(source = 'mic') {
  let stream;
  if (source === 'desktop') {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,   // Chrome requires video to offer audio; the video track is dropped right away
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      systemAudio: 'include',
    });
    stream.getVideoTracks().forEach((t) => t.stop());
    if (!stream.getAudioTracks().length) throw new Error('no audio was shared — tick "share system audio" (or tab audio) in the picker');
  } else {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  }
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 1024;
  an.smoothingTimeConstant = 0.5;
  src.connect(an);
  const bins = new Uint8Array(an.frequencyBinCount);
  const hz = ctx.sampleRate / an.fftSize;
  const bassTop = Math.max(2, Math.round(150 / hz));
  let avgBass = 0.1, lastBeat = 0, peak = 0.2, ended = false;
  stream.getAudioTracks().forEach((t) => t.addEventListener('ended', () => { ended = true; }));

  return {
    source,
    get ended() { return ended; },
    read() {
      an.getByteFrequencyData(bins);
      let bass = 0, all = 0;
      for (let i = 1; i < bins.length; i++) {
        const v = bins[i] / 255;
        all += v;
        if (i <= bassTop) bass += v;
      }
      bass /= bassTop; all /= bins.length - 1;
      // slow auto-gain so quiet and loud sources both land in a useful range
      peak = Math.max(peak * 0.999, bass, 0.05);
      const nb = Math.min(1, bass / peak), level = Math.min(1, all / (peak * 0.6));
      const now = ctx.currentTime;
      const beat = nb > avgBass * 1.35 && nb > 0.35 && now - lastBeat > 0.22;
      if (beat) lastBeat = now;
      avgBass = avgBass * 0.96 + nb * 0.04;
      return { level, bass: nb, beat };
    },
    stop() { stream.getTracks().forEach((t) => t.stop()); ctx.close(); },
  };
}
