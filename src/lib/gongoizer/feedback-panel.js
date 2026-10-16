// Hidden tuning panel for <feedback-background>. Loaded on demand by the secret hotkey.
import { PRESETS, PRESET_INFO, PALETTES, BASE, registerPresets, presetKeys, presetIcons, resolvePreset, LOSPEC_PALETTES, ORIGINAL_PALETTES } from './feedback-presets.js';

const STORE_KEY = 'feedback-bg-params';         // current settings (per browser)
const USER_KEY = 'feedback-bg-user-presets';    // presets saved when no dev server is around

// Rows: [key, label, min, max, step, hint, randomRange]
//   min as an array of names makes a dropdown (value = index).
//   randomRange [lo, hi] limits "random" to sensible values (defaults to min..max).
const FLOW_MODES = ['straight', 'radial out', 'radial in'];
const MIRRORS = ['off', 'left/right', 'four-way', 'kaleidoscope'];
const SHAPES = ['none', 'diamond', 'circle', 'oval', 'square', 'rectangle', 'hexagon', 'star'];
const CUT_MODES = ['shape only', 'emitter', 'obstacle', 'emitter + obstacle'];
const GROUPS = [
  ['Flow', [
    ['flowMode', 'mode', FLOW_MODES, null, 1, 'restart after changing'],
    ['flowAngle', 'angle', 0, 360, 1, 'straight mode: 90 = down, 180 = left'],
    ['speed', 'speed', 0, 0.3, 0.001, 'screen heights per second', [0.025, 0.14]],
    ['stripePeriod', 'stripe period', 0.03, 3, 0.001, 'spacing of new stripes (H)', [0.05, 0.3]],
    ['tilt', 'birth tilt', -12, 12, 0.005, 'slope of stripes as they are born (radial: arms)', [-0.4, 0.4]],
    ['crossDrift', 'cross drift', -0.2, 0.2, 0.001, 'sideways drift (H/s)', [-0.03, 0.03]],
    ['swirl', 'swirl', -6, 6, 0.05, 'spin (radial modes)', [-3, 3]],
    ['r0', 'radius', 0, 0.6, 0.005, 'radial birth radius', [0.02, 0.2]],
  ]],
  ['Birth edge', [
    ['wobAmp', 'wobble', 0, 1, 0.01, 'unevenness of new stripes', [0, 0.5]],
    ['wobScale', 'wobble scale', 0.1, 8, 0.05, '', [0.5, 5]],
    ['wobRate', 'wobble rate', 0, 0.5, 0.005, '', [0.01, 0.15]],
  ]],
  ['Transition', [
    ['ampFrom', 'starts at', -0.5, 1.5, 0.01, 'where turbulence begins (H downstream)', [-0.1, 0.8]],
    ['ampTo', 'full at', -0.5, 2, 0.01, 'where turbulence is full (H downstream)', [0.3, 1.2]],
    ['ampStart', 'turb. before', 0, 2, 0.01, '', [0, 0.8]],
    ['ampEnd', 'turb. after', 0, 2, 0.01, '', [0.3, 1.5]],
    ['splitVar', 'split wander', 0, 0.5, 0.005, '', [0, 0.2]],
    ['accel', 'stretch', 0, 6, 0.05, 'bands thicken downstream', [0, 3]],
    ['tiltGain', 'lean', -4, 4, 0.05, 'the "/" lean in the lower part (straight mode)', [-1.5, 1.5]],
    ['shear', 'shear', -8, 8, 0.05, 'sideways speed in the turbulent zone (radial: spiral arms)', [-3, 3]],
  ]],
  ['Turbulence', [
    ['longAmp', 'along', 0, 3, 0.01, 'speed wobble along the flow', [0, 1.4]],
    ['transAmp', 'across', 0, 4, 0.01, 'sideways wobble (S-hooks)', [0.2, 2.5]],
    ['noiseScale', 'scale', 0.2, 8, 0.05, '', [0.8, 4]],
    ['noiseStretch', 'stretch', 0.1, 4, 0.05, '', [0.4, 2]],
    ['noiseRate', 'evolve rate', 0, 0.5, 0.005, '', [0.01, 0.15]],
    ['waveAmp', 'saw wave', 0, 2, 0.01, '', [0, 0.5]],
    ['waveFreq', 'saw freq', 0.2, 8, 0.05, '', [0.5, 5]],
    ['waveDrift', 'saw drift', -0.3, 0.3, 0.005, '', [-0.08, 0.08]],
    ['waveWarp', 'saw warp', 0, 4, 0.05, '', [0, 2]],
    ['waveSharp', 'saw sharp', 0, 1, 0.01],
    ['rowVar', 'row speeds', 0, 2, 0.01, 'per-row speed differences: long streaks with tapered tips', [0, 0.6]],
    ['rowScale', 'row scale', 0.5, 20, 0.1, '', [2, 10]],
    ['diffuse', 'soften', 0, 1, 0.01, '', [0, 0.4]],
  ]],
  ['Variation', [
    ['vary', 'amount', 0, 2, 0.01, 'slow drift of lean/stretch/turbulence/split', [0, 1.5]],
    ['varyRate', 'rate', 0, 5, 0.05, '', [0.3, 2]],
  ]],
  ['Colour', [
    ['hueSpeed', 'hue speed', -10, 10, 0.001, 'OBS Hue Rotation "Speed"', [-2, 2]],
    ['hueOffset', 'hue offset', 0, 1, 0.005],
    ['stripeHue', 'stripe hue', -0.5, 0.5, 0.001, 'hue step per successive stripe', [-0.12, 0.12]],
    ['hueSpreadX', 'hue across', -2, 2, 0.01, 'hue gradient across the screen', [-0.5, 0.5]],
    ['hueSpreadY', 'hue down', -2, 2, 0.01, 'hue gradient down the screen', [-0.5, 0.5]],
    ['morph', 'morph', 0, 1, 0.01, 'blend toward palette 2'],
    ['morphRate', 'morph rate', 0, 0.3, 0.001, 'swing the blend back and forth (per second)', [0, 0.05]],
    ['palReps', 'palette reps', 1, 6, 1, '', [1, 3]],
    ['grain', 'grain', 0, 0.2, 0.001, '', [0, 0.05]],
  ]],
  ['Effects', [
    ['glow', 'glow', 0, 2, 0.01, 'bloom', [0.3, 1.2]],
    ['glowRadius', 'glow radius', 0.25, 4, 0.05, '', [0.6, 2.5]],
    ['bloom', 'bloom', 0, 2, 0.01, 'wide multi-scale halo', [0.3, 1.0]],
    ['glowThreshold', 'glow threshold', 0, 0.9, 0.01, 'how bright something must be to glow/bloom', [0.1, 0.5]],
    ['glowPulse', 'glow pulse', 0, 1, 0.01, 'glow/bloom breathe in and out (audio pumps it too)', [0.1, 0.6]],
    ['glowPulseRate', 'pulse rate', 0.02, 2, 0.01, 'breaths per second', [0.1, 0.6]],
    ['blur', 'blur', 0, 1, 0.01, 'soft focus', [0.15, 0.6]],
    ['trails', 'trails', 0, 0.98, 0.01, 'echo: previous frames linger', [0.6, 0.95]],
    ['contour', 'contour', -1, 1, 0.01, 'lines on stripe edges: + bright, - dark', [-1, 1]],
    ['haze', 'haze', 0, 3, 0.01, 'heat shimmer', [0.3, 1.5]],
    ['posterize', 'paint', 0, 16, 1, 'colour steps per stripe, 0 = off', [3, 10]],
    ['mosaic', 'mosaic', 0, 60, 1, 'block size (px at 1080p), 0 = off', [4, 24]],
    ['strobe', 'strobe', 0, 30, 0.5, 'frame-hold rate (Hz), 0 = off. Below ~15 it can look like lag', [15, 30]],
    ['negative', 'negative', 0, 1, 0.01, '', [1, 1]],
    ['chroma', 'chroma bleed', 0, 4, 0.01, '', [0.3, 1.5]],
    ['scan', 'scanlines', 0, 1, 0.01, '', [0.2, 0.8]],
    ['curve', 'CRT curve', 0, 1, 0.01, '', [0.05, 0.3]],
    ['vignette', 'vignette', 0, 1.5, 0.01, '', [0.2, 0.8]],
    ['mirror', 'mirror', MIRRORS, null, 1],
  ]],
  ['Cutout', [
    ['cutout', 'shape', SHAPES, null, 1, 'the mixer wipe shape in the middle'],
    ['cutoutMode', 'influence', CUT_MODES, null, 1, 'emitter: stripes are born at its edge; obstacle: flow parts around it'],
    ['cutoutShow', 'show', 0, 1, 1, 'draw the shape (preview of the site cutout)'],
    ['cutoutSize', 'size', 0.05, 0.8, 0.005, '', [0.15, 0.45]],
    ['cutoutStretch', 'stretch', 0.3, 3, 0.01, 'wider / narrower', [0.7, 1.6]],
    ['cutoutRotate', 'rotate', -180, 180, 1, 'degrees', [-45, 45]],
    ['cutoutX', 'offset x', -1, 1, 0.005, '', [-0.2, 0.2]],
    ['cutoutY', 'offset y', -0.5, 0.5, 0.005, '', [-0.15, 0.15]],
    ['cutoutPush', 'push', -3, 6, 0.05, 'emitter: how hard stripes radiate out', [0.5, 3]],
    ['cutoutSoft', 'softness', 0, 0.2, 0.005, '', [0, 0.05]],
  ]],
  ['Reactive', [
    ['stir', 'stir', 0, 3, 0.01, 'pointer drags the fluid', [0.3, 1.5]],
    ['stirRadius', 'stir radius', 0.02, 0.5, 0.005, '', [0.06, 0.2]],
    ['magnet', 'magnet', -1.5, 1.5, 0.01, '+ pushes the flow away from the pointer, - pulls it in', [-0.5, 0.6]],
    ['magnetRadius', 'magnet radius', 0.02, 0.5, 0.005, '', [0.08, 0.22]],
    ['burst', 'click ripple', 0, 3, 0.01, '', [0.4, 1.5]],
    ['wheel', 'wheel wind', 0, 3, 0.01, 'mouse wheel blows the flow', [0.5, 1.5]],
    ['energy', 'energy', 0, 3, 0.01, 'pointer activity whips up turbulence', [0, 1]],
    ['audio', 'audio', 0, 3, 0.01, 'level/beats from the mic or desktop audio', [0.5, 1.5]],
  ]],
  ['Engine', [
    ['simLines', 'sim lines', 90, 720, 10, 'field resolution (rebuilds)'],
    ['timeScale', 'time scale', 0, 4, 0.01],
    ['adaptive', 'auto quality', 0, 1, 1, 'lower the resolution automatically when frames run slow'],
  ]],
];
const OPEN = new Set();   // everything starts collapsed; 'expand all' opens them
const NO_RANDOM = new Set(['Engine']);
// effects are "off" at 0: random switches each one on only some of the time
const OFF_IS_ZERO = new Set(['glow', 'bloom', 'glowPulse', 'blur', 'trails', 'contour', 'haze', 'posterize', 'mosaic', 'strobe', 'negative', 'chroma', 'scan', 'curve', 'vignette', 'mirror', 'stripeHue', 'hueSpreadX', 'hueSpreadY', 'morph', 'waveAmp', 'rowVar', 'cutout']);
const EFFECT_ODDS = { glow: 0.3, bloom: 0.25, glowPulse: 0.2, blur: 0.15, trails: 0.2, contour: 0.15, haze: 0.12, posterize: 0.1, mosaic: 0.08, strobe: 0.06, negative: 0.05, chroma: 0.15, scan: 0.1, curve: 0.12, vignette: 0.25, mirror: 0.15, stripeHue: 0.3, hueSpreadX: 0.3, hueSpreadY: 0.15, morph: 0.35, waveAmp: 0.35, rowVar: 0.25, cutout: 0.25 };

function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ } }
function removeKey(key) { try { localStorage.removeItem(key); } catch { /* storage blocked */ } }

// Saved presets: presets.json next to the module (written by dev-server.py) + browser storage.
async function loadUserPresets() {
  try {
    const r = await fetch(new URL('./presets.json', import.meta.url), { cache: 'no-store' });
    if (r.ok) registerPresets(await r.json());
  } catch { /* no file */ }
  registerPresets(readJSON(USER_KEY));
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const snap = (v, step, min, max) => {
  const s = Math.round(v / step) * step;
  return +Math.min(max, Math.max(min, s)).toFixed(String(step).split('.')[1]?.length || 0);
};

// New values for a group's rows. mode 'random' = fresh values in sensible ranges,
// 'variant' = nudge the current values a little.
function shuffle(rows, params, mode) {
  const out = {};
  for (const [key, , min, max, step, , range] of rows) {
    const isList = Array.isArray(min);
    const lo = isList ? 0 : (range?.[0] ?? min), hi = isList ? min.length - 1 : (range?.[1] ?? max);
    const cur = params[key];
    if (key === 'cutoutShow') continue;   // a preview toggle, not part of the look
    if (mode === 'random') {
      if (key === 'flowMode') { out[key] = pick([0, 0, 0, 1, 2]); continue; }
      if (OFF_IS_ZERO.has(key) && Math.random() > (EFFECT_ODDS[key] ?? 0.3)) { out[key] = 0; continue; }
      if (isList) out[key] = OFF_IS_ZERO.has(key) ? 1 + Math.floor(Math.random() * hi) : Math.floor(Math.random() * (hi + 1));
      else if (key === 'flowAngle') out[key] = pick([90, 90, 270, 180, 0, 45, 135, 225, 315, rnd(0, 360)]);
      else out[key] = snap(rnd(lo, hi), step, isList ? 0 : min, isList ? hi : max);
    } else {
      if (isList || step >= 1) {   // lists and whole-number settings rarely change in a variant
        if (Math.random() < 0.15) out[key] = isList ? Math.floor(Math.random() * (hi + 1)) : snap(rnd(lo, hi), step, min, max);
        continue;
      }
      if (OFF_IS_ZERO.has(key) && cur === 0) {
        if (Math.random() < 0.08) out[key] = snap(rnd(lo, lo + (hi - lo) * 0.5), step, min, max);
        continue;
      }
      out[key] = snap(cur + (Math.random() * 2 - 1) * (hi - lo) * 0.12, step, min, max);
    }
  }
  return out;
}

// Keep random results from piling up into mush: combinations that wash out or show seams.
const NO_DARK = new Set(['candy', 'ice', 'sunset']);
function tame(p, changed) {
  const t = {};
  if (p.flowMode > 0 && p.stripeHue) t.stripeHue = 0;                    // seam in radial modes
  if (p.negative > 0 && p.glow > 0) t.glow = 0;                          // inverted + bloom = white
  if (NO_DARK.has(p.palette) && p.glow > 0.4) t.glow = 0.4;
  const soft = (p.glow > 0) + (p.bloom > 0) + (p.blur > 0) + (p.trails > 0);
  if (soft > 2) t[pick(['blur', 'trails'])] = 0;
  if (p.blur > 0.45 && p.mosaic > 0) t.mosaic = 0;
  if (p.ampTo < p.ampFrom + 0.1) t.ampTo = +(p.ampFrom + 0.1 + Math.random() * 0.4).toFixed(2);
  // only touch keys that this shuffle changed (so a section's buttons stay in their section)
  for (const k of Object.keys(t)) if (changed && !(k in changed) && k !== 'ampTo') delete t[k];
  return t;
}

// Whole-look randomizer (same rules as the panel's buttons): returns a full params object.
export function randomize(params, mode = 'random') {
  const out = { ...params };
  for (const [title, rows] of GROUPS) {
    if (NO_RANDOM.has(title)) continue;
    Object.assign(out, shuffle(rows, out, mode));
    if (title === 'Colour' && mode === 'random') { out.palette = pick(Object.keys(PALETTES)); out.palette2 = pick(Object.keys(PALETTES)); }
  }
  return Object.assign(out, tame(out));
}

const CSS = `
.fbp{position:fixed;top:12px;right:12px;z-index:2147483647;width:min(318px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;
  background:rgba(8,8,6,.9);color:#cfe;font:11px/1.35 ui-monospace,Consolas,monospace;border:1px solid #2a4a55;
  border-radius:6px;box-shadow:0 6px 30px #000a;backdrop-filter:blur(4px);user-select:none}
.fbp header{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid #2a4a55;position:sticky;top:0;background:#0b0b08;z-index:1}
.fbp header b{flex:1;color:#5bf}
.fbp button,.fbp select{background:#14262c;color:#cfe;border:1px solid #2a4a55;border-radius:3px;font:inherit;padding:2px 6px;cursor:pointer}
.fbp button:hover{background:#1d3a44}
.fbp button.on{background:#3a1d44;border-color:#a5f}
.fbp .bar{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;border-bottom:1px solid #1d2f35;align-items:center}
.fbp .bar select{max-width:100%}
.fbp details{border-bottom:1px solid #1d2f35}
.fbp summary{padding:5px 8px;cursor:pointer;color:#e4f;display:flex;align-items:center;gap:4px}
.fbp summary span{flex:1}
.fbp summary button{padding:0 5px;font-size:10px}
.fbp .row{display:grid;grid-template-columns:86px 1fr 56px;align-items:center;gap:6px;padding:1px 8px}
.fbp .row.sel{grid-template-columns:86px 1fr}
.fbp .row label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fbp input[type=range]{width:100%;accent-color:#5bf}
.fbp input[type=number]{width:56px;background:#0e1a1e;color:#cfe;border:1px solid #2a4a55;font:inherit;padding:0 2px}
.fbp .fps{color:#7a8}
.fbp .note{padding:2px 8px 6px;color:#8a9;min-height:1em}
.fbp .tag{font-size:10px;color:#fd6;border:1px solid #a84;border-radius:3px;padding:0 4px;margin-left:4px}
.fbp .legend{color:#8a9;font-size:10px;width:100%}
`;

export async function openPanel(el) {
  const fb = el.fb;
  if (!fb) return null;
  await loadUserPresets();
  const presetOptions = () => presetKeys()
    .map((k) => `<option value="${k}">${k} · ${PRESET_INFO[k]?.name || k}${presetIcons(k)}</option>`).join('');
  const special = new Set([...LOSPEC_PALETTES, ...ORIGINAL_PALETTES]);
  const group = (label, keys) => `<optgroup label="${label}">${keys.map((k) => `<option>${k}</option>`).join('')}</optgroup>`;
  const paletteOptions = group('classic', Object.keys(PALETTES).filter((k) => !special.has(k)))
    + group('original', ORIGINAL_PALETTES) + group('lospec.com', LOSPEC_PALETTES);
  const root = document.createElement('div');
  root.className = 'fbp';
  root.innerHTML = `<style>${CSS}</style>
    <header><b>Gongoizer</b><span class="fps"></span><button data-act="close" title="Esc">×</button></header>
    <div class="bar">
      <select data-act="preset" title="preset">${presetOptions()}</select>
      <button data-act="reset" title="restart the field">restart</button>
      <button data-act="pause">pause</button>
      <span class="legend">⚡ reactive · 🔊 sound · ◐ strobe · ◆ cutout</span>
    </div>
    <div class="bar">
      <button data-act="random" title="new settings everywhere (within sensible ranges)">random</button>
      <button data-act="variant" title="nudge everything a little">variant</button>
      <button data-act="undo" title="step back">undo</button>
      <button data-act="expand" title="open or close every section">expand all</button>
    </div>
    <div class="bar">
      <label>pal <select data-act="palette">${paletteOptions}</select></label>
      <label>pal 2 <select data-act="palette2">${paletteOptions}</select></label>
    </div>
    <div class="bar">
      <button data-act="reactive" title="master switch for pointer/click/wheel/audio">reactive</button>
      <button data-act="mic" title="listen to the microphone">mic</button>
      <button data-act="desktop" title="listen to desktop/tab audio (pick a screen with 'share system audio', or a tab)">desktop audio</button>
    </div>
    <div class="bar">
      <button data-act="save" title="save the current settings as a preset">save as…</button>
      <button data-act="copy" title="copy settings as JSON">copy</button>
      <button data-act="defaults" title="back to the page's preset, forget saved tweaks">defaults</button>
    </div>
    <div class="note"></div>`;
  const note = root.querySelector('.note');
  const say = (t) => { note.textContent = t; };
  const inputs = {};
  const persist = () => writeJSON(STORE_KEY, fb.params);
  const history = [];
  const remember = () => { history.push({ ...fb.params }); if (history.length > 40) history.shift(); };

  // apply a batch of changes (random/variant/undo), restarting the field if the flow shape changed
  const apply = (changes) => {
    const before = fb.params.flowMode;
    if (changes.ampTo !== undefined || changes.ampFrom !== undefined) {
      const from = changes.ampFrom ?? fb.params.ampFrom, to = changes.ampTo ?? fb.params.ampTo;
      if (to < from + 0.1) changes.ampTo = +(from + 0.1 + Math.random() * 0.4).toFixed(2);
    }
    fb.setParams(changes);
    persist(); sync();
    if (fb.params.flowMode !== before) fb.reset();
  };
  const shuffleGroups = (groups, mode) => {
    remember();
    const changes = {};
    for (const [title, rows] of groups) {
      if (NO_RANDOM.has(title)) continue;
      Object.assign(changes, shuffle(rows, fb.params, mode));
      if (title === 'Colour') {
        if (mode === 'random') { changes.palette = pick(Object.keys(PALETTES)); changes.palette2 = pick(Object.keys(PALETTES)); }
        else if (Math.random() < 0.2) changes.palette2 = pick(Object.keys(PALETTES));
      }
    }
    Object.assign(changes, tame({ ...fb.params, ...changes }, changes));
    apply(changes);
    say(`${mode}: ${groups.length > 1 ? 'everything' : groups[0][0]}`);
  };

  for (const group of GROUPS) {
    const [title, rows] = group;
    const det = document.createElement('details');
    det.open = OPEN.has(title);
    const tagFor = { Effects: 'strobe', Reactive: 'audio' }[title];
    det.innerHTML = `<summary><span>${title}${tagFor ? `<b class="tag" data-tag="${tagFor}" hidden></b>` : ''}</span>${NO_RANDOM.has(title) ? '' : '<button data-g="random" title="random values for this section">rnd</button><button data-g="variant" title="nudge this section">var</button>'}</summary>`;
    det.querySelectorAll('summary button').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      shuffleGroups([group], b.dataset.g);
    }));
    for (const [key, label, min, max, step, hint] of rows) {
      const row = document.createElement('div');
      row.title = hint ? `${key}: ${hint}` : key;
      if (Array.isArray(min)) {
        row.className = 'row sel';
        row.innerHTML = `<label>${label}</label><select>${min.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>`;
        const sel = row.querySelector('select');
        sel.onchange = () => { remember(); apply({ [key]: Number(sel.value) }); };
        inputs[key] = { sel };
      } else {
        row.className = 'row';
        row.innerHTML = `<label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}"><input type="number" step="${step}">`;
        const [range, num] = row.querySelectorAll('input');
        let pending = false;
        const set = (v) => {
          v = Number(v);
          if (!Number.isFinite(v)) return;
          if (!pending) { remember(); pending = true; }
          range.value = v; num.value = v;
          fb.setParams({ [key]: v });
          persist();
        };
        range.oninput = () => set(range.value);
        range.onchange = () => { pending = false; };
        num.onchange = () => { set(num.value); pending = false; };
        inputs[key] = { range, num };
      }
      det.appendChild(row);
    }
    root.appendChild(det);
  }
  const $ = (act) => root.querySelector(`[data-act=${act}]`);
  function sync() {
    for (const [k, i] of Object.entries(inputs)) {
      if (i.sel) i.sel.value = fb.params[k];
      else { i.range.value = fb.params[k]; i.num.value = fb.params[k]; }
    }
    $('palette').value = fb.params.palette;
    $('palette2').value = fb.params.palette2;
    $('reactive').classList.toggle('on', !!fb.params.reactive);
    $('reactive').textContent = fb.params.reactive ? 'reactive: on' : 'reactive: off';
    const strobeTag = root.querySelector('[data-tag=strobe]');
    strobeTag.textContent = 'strobe on'; strobeTag.hidden = !(fb.params.strobe > 0);
    const src = fb.audio?.source;
    const audioTag = root.querySelector('[data-tag=audio]');
    audioTag.textContent = src === 'desktop' ? '🔊 desktop audio' : '🔊 mic';
    audioTag.hidden = !src;
    $('mic').classList.toggle('on', src === 'mic');
    $('desktop').classList.toggle('on', src === 'desktop');
  }
  let current = resolvePreset(el.getAttribute('preset') || '01');
  $('preset').value = current;
  sync();

  const fpsEl = root.querySelector('.fps');
  let frames = 0, last = performance.now(), alive = true;
  const tick = (now) => {
    if (!alive) return;
    frames++;
    if (now - last > 500) {
      fpsEl.textContent = `${Math.round(frames * 1000 / (now - last))} fps · ${fb.simW}×${fb.simH}${fb.quality < 1 ? ` · q${fb.quality}` : ''}`; frames = 0; last = now;
      if (!fb.audio && ($('mic').classList.contains('on') || $('desktop').classList.contains('on'))) sync();   // share ended
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const loadPreset = (key) => {
    remember();
    current = key;
    fb.switchTo({ ...BASE, ...PRESETS[key] });   // crossfades from the current look
    persist(); sync();
  };
  const toggleAudio = async (source) => {
    if (fb.audio?.source === source) { fb.disableAudio(); sync(); say('audio off'); return; }
    try {
      await fb.enableAudio(source);
      if (!fb.params.audio || !fb.params.reactive) fb.setParams({ audio: fb.params.audio || 1, reactive: 1 });
      persist();
      say(`listening to ${source === 'mic' ? 'the mic' : 'desktop audio'} — level drives speed/turbulence, beats drop ripples`);
    } catch (err) { say(`audio unavailable: ${err.message || err}`); }
    sync();
  };

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('button'); const act = btn?.dataset.act;
    if (!act) return;
    if (act === 'close') close();
    else if (act === 'reset') fb.reset();
    else if (act === 'pause') { fb.running ? fb.stop() : fb.start(); btn.textContent = fb.running ? 'pause' : 'play'; }
    else if (act === 'random' || act === 'variant') shuffleGroups(GROUPS, act);
    else if (act === 'expand') {
      const all = [...root.querySelectorAll('details')], open = !all.every((d) => d.open);
      all.forEach((d) => { d.open = open; });
      btn.textContent = open ? 'collapse all' : 'expand all';
    }
    else if (act === 'undo') {
      const prev = history.pop();
      if (!prev) { say('nothing to undo'); return; }
      apply({ ...prev }); say('undone');
    } else if (act === 'reactive') { remember(); apply({ reactive: fb.params.reactive ? 0 : 1 }); }
    else if (act === 'mic') toggleAudio('mic');
    else if (act === 'desktop') toggleAudio('desktop');
    else if (act === 'copy') {
      const json = JSON.stringify(fb.params, null, 2);
      try { await navigator.clipboard.writeText(json); btn.textContent = 'copied'; }
      catch { prompt('Copy settings:', JSON.stringify(fb.params)); }
      setTimeout(() => { btn.textContent = 'copy'; }, 1200);
    } else if (act === 'save') {
      const name = prompt('Preset name (letters, numbers, - or _):', /^\d+$/.test(current) ? '' : current);
      if (!name) return;
      const key = name.trim().replace(/[^\w-]+/g, '_').slice(0, 40);
      if (!key) return;
      // store only what differs from BASE so presets stay readable
      const diff = {};
      for (const [k, v] of Object.entries(fb.params)) if (BASE[k] !== v) diff[k] = v;
      let where;
      try {
        const r = await fetch(`/__presets/${encodeURIComponent(key)}`, { method: 'POST', body: JSON.stringify(diff) });
        if (!r.ok) throw new Error(String(r.status));
        where = 'saved to presets.json';
      } catch {
        const all = readJSON(USER_KEY) || {};
        all[key] = diff; writeJSON(USER_KEY, all);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify({ [key]: diff }, null, 2)], { type: 'application/json' }));
        a.download = `preset-${key}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        where = 'saved in this browser + downloaded';
      }
      registerPresets({ [key]: diff });
      $('preset').innerHTML = presetOptions(); $('preset').value = key; current = key;
      say(`"${key}" ${where}`);
    } else if (act === 'defaults') {
      removeKey(STORE_KEY);
      loadPreset(resolvePreset(el.getAttribute('preset') || '01'));
      $('preset').value = current;
    }
  });
  $('preset').onchange = (e) => loadPreset(e.target.value);
  $('palette').onchange = (e) => { remember(); apply({ palette: e.target.value }); };
  $('palette2').onchange = (e) => { remember(); apply({ palette2: e.target.value }); };
  // Keep keystrokes in the panel from reaching the page (and the hotkey listener).
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); e.stopPropagation(); });
  // Don't let panel clicks/drags count as ripples or stirring.
  for (const t of ['pointerdown', 'pointermove', 'wheel']) root.addEventListener(t, (e) => e.stopPropagation());

  function close() { alive = false; root.remove(); el._panel = null; el._onPanelClosed?.(); }
  document.body.appendChild(root);
  return { close };
}
