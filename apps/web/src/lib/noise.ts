/**
 * Brown noise for focus sessions (FRONTEND-PLAN §8 Sessions 1): a soft, deep rumble made
 * in the browser (no audio files), looped from a few seconds of generated sound. Starts only
 * from a click, fades in and out, and remembers its volume on this device.
 */

const KEY = "dsakaro:noise-volume";
let ctx: AudioContext | null = null;
let src: AudioBufferSourceNode | null = null;
let gain: GainNode | null = null;

export function savedVolume() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v > 0 && v <= 1 ? v : 0.3;
  } catch {
    return 0.3;
  }
}

function brownBuffer(a: AudioContext, seconds = 6) {
  const len = a.sampleRate * seconds;
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    // Cross-fade the ends so the loop has no click.
    const f = Math.floor(a.sampleRate * 0.05);
    for (let i = 0; i < f; i++) {
      const k = i / f;
      d[i] = d[i]! * k + d[len - f + i]! * (1 - k);
    }
  }
  return buf;
}

export function startNoise(volume = savedVolume()) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    stopNoise(0);
    gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 1.2);
    src = ctx.createBufferSource();
    src.buffer = brownBuffer(ctx);
    src.loop = true;
    src.connect(gain).connect(ctx.destination);
    src.start();
    return true;
  } catch {
    return false;
  }
}

export function setNoiseVolume(volume: number) {
  try {
    localStorage.setItem(KEY, String(volume));
  } catch {}
  if (ctx && gain) gain.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.1);
}

export function stopNoise(fade = 0.6) {
  if (!ctx || !src || !gain) return;
  const s = src;
  const g = gain;
  src = null;
  gain = null;
  g.gain.setTargetAtTime(0, ctx.currentTime, fade / 4 || 0.001);
  window.setTimeout(
    () => {
      try {
        s.stop();
      } catch {}
      s.disconnect();
    },
    fade * 1000 + 50,
  );
}
