/**
 * How the app *feels*: tiny synthesized UI sounds (off by default) and haptic taps on phones
 * that support them. No audio files: every sound is a few milliseconds of Web Audio.
 * Preferences live in this browser only. Safe to import on the server (browser APIs are
 * guarded), which the root layout does for `feelScript`.
 */

export type FeelPrefs = {
  sound: boolean;
  haptics: boolean;
  /** The halo that follows the pointer on desktop; "system" leaves just the normal cursor. */
  cursor: "halo" | "system";
  /** "reduced" calms every animation on this site; "system" follows the OS setting. */
  motion: "system" | "full" | "reduced";
};

const KEY = "dsakaro:feel";
const EVENT = "dsakaro:feel";
const DEFAULTS: FeelPrefs = { sound: false, haptics: true, cursor: "halo", motion: "system" };
let cached: FeelPrefs | null = null;

export function getFeel(): FeelPrefs {
  if (cached) return cached;
  try {
    cached = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cached = DEFAULTS;
  }
  return cached!;
}

export function setFeel(patch: Partial<FeelPrefs>) {
  cached = { ...getFeel(), ...patch };
  applyMotion(cached.motion);
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    // Not remembered, but still applies for this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeFeel(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export const SERVER_FEEL = DEFAULTS;

/** Puts the site's motion choice on <html data-motion>, which globals.css honours. */
function applyMotion(m: FeelPrefs["motion"]) {
  if (typeof document === "undefined") return;
  if (m === "system") delete document.documentElement.dataset.motion;
  else document.documentElement.dataset.motion = m;
}

/**
 * Runs before paint (inlined in the root layout) so a "reduced" choice never flashes motion.
 * Keep it tiny and dependency-free.
 */
export const feelScript = `try{var f=JSON.parse(localStorage.getItem("${KEY}")||"{}");if(f.motion&&f.motion!=="system")document.documentElement.dataset.motion=f.motion}catch(e){}`;

/** True when animations should be calm: the site's own choice first, then the OS. */
export function reducedMotion() {
  if (typeof window === "undefined") return false;
  const m = getFeel().motion;
  if (m !== "system") return m === "reduced";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let ctx: AudioContext | null = null;
let lastAt = 0;
function audio() {
  if (typeof window === "undefined" || !getFeel().sound || document.hidden) return null;
  // One sound at a time: a second within 40 ms is dropped.
  const t = performance.now();
  if (t - lastAt < 40) return null;
  lastAt = t;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One enveloped oscillator note. */
function note(
  a: AudioContext,
  freq: number,
  {
    at = 0,
    dur = 0.08,
    type = "sine",
    gain = 0.06,
    to,
  }: {
    at?: number;
    dur?: number;
    type?: OscillatorType;
    gain?: number;
    to?: number;
  } = {},
) {
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** A soft burst of filtered noise (for things dissolving or flying away). */
function air(a: AudioContext, dur = 0.35, gain = 0.05) {
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(600, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(4000, a.currentTime + dur);
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

function buzz(pattern: number | number[]) {
  if (!getFeel().haptics || typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported (desktop, iOS Safari).
  }
}

export const feel = {
  /** A light click: toggles, small confirmations. */
  tick() {
    const a = audio();
    if (a) note(a, 1900, { dur: 0.03, type: "triangle", gain: 0.035 });
    buzz(8);
  },
  /** Two rising notes: something went right (solved, remembered, all done). */
  success() {
    const a = audio();
    if (a) {
      note(a, 784, { dur: 0.12, type: "sine", gain: 0.05 });
      note(a, 1175, { at: 0.08, dur: 0.2, type: "sine", gain: 0.05 });
    }
    buzz([10, 40, 16]);
  },
  /** A low, gentle thud: forgot, snoozed, removed. Never a "wrong" buzzer. */
  soft() {
    const a = audio();
    if (a) note(a, 260, { dur: 0.14, type: "sine", gain: 0.06, to: 180 });
    buzz(14);
  },
  /** Air: a card flying off, text dissolving. */
  whoosh() {
    const a = audio();
    if (a) air(a);
    buzz(6);
  },
  /** A streak of right answers: the success chime, a semitone higher per step (max +7). */
  combo(n: number) {
    const a = audio();
    if (a) {
      const k = 2 ** (Math.min(7, Math.max(0, n - 1)) / 12);
      note(a, 784 * k, { dur: 0.1, type: "sine", gain: 0.05 });
      note(a, 1175 * k, { at: 0.07, dur: 0.18, type: "sine", gain: 0.05 });
    }
    buzz(n >= 3 ? [10, 30, 10, 30, 18] : [10, 40, 16]);
  },
  /** A split-flap digit falling (sound only; called while the board is on screen). */
  flap() {
    const a = audio();
    if (a) air(a, 0.03, 0.04);
  },
  /** A receipt printing: a few quick soft clicks. */
  print() {
    const a = audio();
    if (a)
      for (let i = 0; i < 4; i++)
        note(a, 2400, { at: i * 0.04, dur: 0.015, type: "square", gain: 0.012 });
    buzz([6, 30, 6, 30, 6]);
  },
  /** A badge or milestone: success plus a longer haptic. */
  milestone() {
    const a = audio();
    if (a) {
      note(a, 784, { dur: 0.12, gain: 0.05 });
      note(a, 1175, { at: 0.08, dur: 0.14, gain: 0.05 });
      note(a, 1568, { at: 0.18, dur: 0.26, gain: 0.045 });
    }
    buzz([12, 50, 12, 50, 24]);
  },
};
