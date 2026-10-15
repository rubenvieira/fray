import "./play-chrome-mount.js";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { bindStageGestures } from "./gestures.js";
import { createCollection } from "./collection.js";
import { createTearFeedback } from "./tear-feedback.js";
import { createRenderBudget, scaleRenderSize } from "./render-budget.js";
import { prepareRecordedTearSource } from "./audio-preparation.js";
var e = new URL(`./worklet.js`, import.meta.url).href,
  t = 0.05;
function n(e, n) {
  let r = Math.round(t * n),
    i = Math.ceil(e[0].length / r),
    a = new Float32Array(i);
  for (let t = 0; t < i; t++) {
    let n = 0,
      i = 0;
    for (let a of e) {
      let e = Math.min(a.length, (t + 1) * r);
      for (let i = t * r; i < e; i++) n += a[i] * a[i];
      i += e - t * r;
    }
    let o = 10 * Math.log10(n / Math.max(1, i) + 1e-12);
    a[t] = Math.min(1, Math.max(0, (o + 60) / 30));
  }
  return a;
}
function r(e, t, n, r) {
  let i = n.length,
    a = 2654435769,
    o = () => ((a ^= a << 13), (a ^= a >>> 17), (a ^= a << 5), (a >>> 0) / 4294967296);
  for (let a of [n, r]) {
    let n = 0,
      r = 0,
      s = 1,
      c = 0;
    for (let l = 0; l < i; l++) {
      (c-- <= 0 && ((s = o() < 0.35 + 0.55 * t ? 0.5 + 0.5 * o() : 0), (c = Math.round(e * (0.01 + 0.11 * o())))),
        r-- <= 0 && ((n = (o() * 2 - 1) * (0.4 + 0.6 * o())), (r = Math.floor(o() * o() * 40 * (1 - 0.6 * t)) + 1)));
      let u = 0.25 * Math.sign(Math.sin((2 * Math.PI * 50 * l) / e)) * (0.5 + 0.5 * t),
        d = Math.min(1, (i - l) / (0.05 * e));
      a[l] = 0.22 * t * s * (n + u) * d;
    }
  }
}
var o = `${import.meta.env.BASE_URL}fabric_tear_sound_sample.mp3`,
  s = `${import.meta.env.BASE_URL}exprerience_sounds/creepy_laugh.mp3`,
  c = `${import.meta.env.BASE_URL}exprerience_sounds/ambiant.mp3`,
  l = 0.015,
  u = class {
    context = null;
    starting = null;
    node = null;
    // every voice plays through this bus (a clip recording taps it)
    master = null;
    muted = false;
    connect;
    recording;
    staged = new Map();
    playing = new Set();
    ambient = null;
    laughEnvelope = null;
    laughEnd = 0;
    onLaugh = null;
    constructor(e) {
      ((this.connect = e),
        (this.recording = fetch(o)
          .then((e) => (e.ok ? e.arrayBuffer() : null))
          .catch(() => null)));
    }
    unlock() {
      if (this.context) {
        this.context.state !== `running` && this.context.resume().catch(() => {});
        return;
      }
      if (this.starting || typeof AudioContext > `u` || typeof AudioWorkletNode > `u`) return;
      let t = new AudioContext({ latencyHint: `interactive` });
      ((this.context = t),
        (this.master = t.createGain()),
        (this.master.gain.value = this.muted ? 0 : 1),
        this.master.connect(t.destination),
        t.resume().catch(() => {}),
        (this.starting = t.audioWorklet
          .addModule(e)
          .then(() => {
            let e = new AudioWorkletNode(t, `tear-voice`, {
              numberOfInputs: 0,
              numberOfOutputs: 1,
              outputChannelCount: [2],
            });
            e.connect(this.master);
            this.node = e;
            let n = new MessageChannel();
            (e.port.postMessage({ records: n.port1 }, [n.port1]),
              this.connect(n.port2),
              this.recording
                .then(async (n) => {
                  if (!n) throw Error(`recording unavailable`);
                  let r = await t.decodeAudioData(n),
                    o = await prepareRecordedTearSource(r);
                  e.port.postMessage({ source: o }, [o.pcm.buffer]);
                })
                .catch((e) => console.warn(`Tear sound unavailable:`, e)));
          })
          .catch((e) => console.warn(`Tear sound unavailable:`, e))));
    }
    // hand a fresh record channel to the worklet and the (new) worker
    reconnect() {
      if (!this.node) return;
      let e = new MessageChannel();
      (this.node.port.postMessage({ records: e.port1 }, [e.port1]), this.connect(e.port2));
    }
    prefetchStaged() {
      for (let e of [s, c]) (this.stagedEntry(e), this.context && this.stagedBuffer(this.context, e));
    }
    stagedEntry(e) {
      let t = this.staged.get(e);
      return (
        t ||
          ((t = {
            bytes: fetch(e)
              .then((e) => (e.ok ? e.arrayBuffer() : null))
              .catch(() => null),
            buffer: null,
          }),
          this.staged.set(e, t)),
        t
      );
    }
    stagedBuffer(e, t) {
      let n = this.stagedEntry(t);
      return ((n.buffer ??= n.bytes.then((t) => (t ? e.decodeAudioData(t) : null)).catch(() => null)), n.buffer);
    }
    cue(e) {
      let t = this.context;
      if (!t) return;
      if (e.kind === `stop`) {
        let e = t.currentTime;
        for (let t of this.playing)
          try {
            t.stop(e + 0.05);
          } catch {}
        (this.playing.clear(), (this.ambient = null), (this.laughEnd = 0));
        return;
      }
      if (e.kind === `ambient`) {
        let e = t.currentTime;
        this.stagedBuffer(t, c).then((n) => {
          if (!n) return;
          let r = t.createBufferSource();
          ((r.buffer = n), (r.loop = !0));
          let i = t.createGain();
          (r.connect(i).connect(this.master),
            r.start(t.currentTime, (t.currentTime - e) % n.duration),
            this.track(r),
            (this.ambient = { src: r, gain: i }));
        });
        return;
      }
      if (e.kind === `ambientFade`) {
        let n = this.ambient;
        if (!n) return;
        let r = t.currentTime;
        (n.gain.gain.setValueAtTime(n.gain.gain.value, r),
          n.gain.gain.linearRampToValueAtTime(0, r + e.duration),
          n.src.stop(r + e.duration),
          (this.ambient = null));
        return;
      }
      if (e.kind === `laugh`) {
        this.stagedBuffer(t, s).then((r) => {
          if (!r) return;
          let i = t.createBufferSource();
          ((i.buffer = r), i.connect(this.master));
          let a = t.currentTime,
            o = Math.max(a, this.laughEnd),
            s = Math.min(e.to, r.duration) - e.from;
          (i.start(o, e.from, s),
            (this.laughEnd = o + s),
            this.track(i),
            (this.laughEnvelope ??= n(
              Array.from({ length: r.numberOfChannels }, (e, t) => r.getChannelData(t)),
              r.sampleRate,
            )));
          let c = t.outputLatency || t.baseLatency || 0;
          this.onLaugh?.(
            this.laughEnvelope,
            performance.timeOrigin + performance.now() + 1e3 * (o - a + c),
            e.from,
            e.to,
          );
        });
        return;
      }
      let i = Math.max(1, Math.round(e.duration * t.sampleRate)),
        a = t.createBuffer(2, i, t.sampleRate);
      (r(t.sampleRate, e.level, a.getChannelData(0), a.getChannelData(1)), this.play(t, a, 0, e.duration, 1));
    }
    play(e, t, n, r, i) {
      let a = e.currentTime,
        o = e.createBufferSource();
      o.buffer = t;
      let s = e.createGain();
      (s.gain.setValueAtTime(0, a),
        s.gain.linearRampToValueAtTime(i, a + l),
        s.gain.setValueAtTime(i, a + r - l),
        s.gain.linearRampToValueAtTime(0, a + r),
        o.connect(s).connect(this.master),
        o.start(a, n, r),
        this.track(o));
    }
    track(e) {
      (this.playing.add(e), (e.onended = () => this.playing.delete(e)));
    }
    setVisible(e) {
      this.context && (e ? this.context.resume().catch(() => {}) : this.context.suspend().catch(() => {}));
    }
    setMuted(muted) {
      this.muted = muted;
      if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.025);
    }
  },
  d = 2e6,
  f = 1.7;
function p(e, t, n, r = d) {
  let i = Math.max(1, Number.isFinite(e) ? e : 1),
    a = Math.max(1, Number.isFinite(t) ? t : 1),
    o = Math.min(Number.isFinite(n) && n > 0 ? n : 1, f, Math.sqrt(r / (i * a)));
  (Number.isFinite(o) && o > 0) || (o = 1);
  let s = Math.max(1, Math.floor(i * o)),
    c = Math.max(1, Math.floor(a * o));
  for (; s * c > r && (s > 1 || c > 1);) s >= c && s > 1 ? s-- : c--;
  return { dpr: o, width: s, height: c };
}
var m = document.createElement(`canvas`);
((m.className = `stage`), document.body.prepend(m));
var h = document.querySelector(`.status`),
  g = document.querySelector(`.reset`),
  toolButton = document.querySelector(`.tool`),
  toolsMenu = document.querySelector(`.tools`),
  toolItems = [...document.querySelectorAll(`.toolitem[data-tool]`)],
  fxItems = [...toolsMenu.querySelectorAll(`[data-fx]`)],
  currentTool = `hand`,
  windLevel = 0,
  slowMotion = !1,
  _ = document.querySelector(`.loader`),
  v = document.querySelector(`.menu`),
  y = document.querySelector(`.experiences`),
  b = [...y.querySelectorAll(`.experience[data-experience]`)],
  fabricButtons = [...y.querySelectorAll(`.fabric`)];
Promise.race([
  Promise.all([document.fonts.load(`400 48px Anton`), document.fonts.load(`600 12px Oswald`)]),
  new Promise((e) => setTimeout(e, 2500)),
])
  .catch(() => {})
  .then(() => document.body.classList.add(`fonts`));
function x(e) {
  engineReady = false;
  clearTimeout(pauseTimer);
  pausePending = false;
  applyFraming(false, false);
  pendingExperiment = null;
  clearTimeout(toastTimer);
  h.classList.remove(`visible`);
  document.body.classList.remove(`loading`);
  document.body.classList.add(`failed`);
  document.querySelector(`.error-panel`).hidden = false;
  document.querySelector(`.error-description`).textContent =
    e ||
    `The fabric could not be started on this device. Try again, or use a browser with WebGPU and hardware acceleration enabled.`;
  P(false);
  openTools(false);
  cancelCapture();
  abortRecording();
  syncInteractivity();
  if (!activeDialog) document.querySelector(`.retry`).focus();
}
var S = null,
  C = (e, t = []) => S?.postMessage(e, t),
  w = new u((e) => C({ type: `audio`, port: e }, [e])),
  fabric = `tartan`,
  // dev: ?settle=N shortens the settle of a fabric without a drape file
  settleSteps = Number(new URLSearchParams(location.search).get(`settle`)) || 0;
let engineReady = false;
let toastTimer = 0;
let activeDialog = null;
let dialogOpener = null;
let focusAfterLoad = false;
let framing = false;
let pausePending = false;
let pauseTimer = 0;
let stageGestures = null;
let gallery = null;
let activeExperiment = null;
let pendingExperiment = null;
let selectedView = null;
const coarsePointer = matchMedia(`(pointer: coarse)`);
const renderBudget = createRenderBudget();
const EXPERIMENTS = {
  ribbons: {
    name: `Ribbons in motion`,
    fabric: `satin`,
    tool: `blade`,
    wind: 1,
    slow: true,
    tip: `Slice a few long ribbons. Let the breeze do the rest.`,
  },
  storm: {
    name: `Storm study`,
    fabric: `gauze`,
    tool: `claw`,
    wind: 2,
    slow: false,
    tip: `Rake the gauze, then watch the loose threads catch the wind.`,
  },
  gold: {
    name: `Golden hour`,
    fabric: `lame`,
    tool: `hand`,
    wind: 1,
    slow: true,
    tip: `Pull a small tear into the gold. Frame it from a new angle.`,
  },
};
const FABRIC_NAMES = {
  tartan: `Tartan`,
  satin: `Satin`,
  linen: `Linen`,
  burlap: `Burlap`,
  chiffon: `Chiffon`,
  gauze: `Gauze`,
  lame: `Lamé`,
  ballistic: `Ballistic`,
};
const TOOL_GUIDES = {
  hand: [`Pull at the possibilities.`, `Drag the fabric to stretch and tear it.`],
  blade: [`Make the cut.`, `Drag across the fabric to slice through its threads.`],
  claw: [`Leave your mark.`, `Drag to rake three sharp trails through the weave.`],
  fist: [`Pack a little punch.`, `Click or tap the fabric to punch through it.`],
  pin: [`Hold it right there.`, `Tap to pin a point, then use Hand to pull. Tap a pin again to release it.`],
};
function toast(message, duration = 3200) {
  clearTimeout(toastTimer);
  h.textContent = message;
  h.classList.add(`visible`);
  toastTimer = setTimeout(() => h.classList.remove(`visible`), duration);
}
function syncInteractivity() {
  for (const el of document.querySelectorAll(`.workbench, .fabric-picker, .camera-controls, .stage, .frame-bar`))
    el.inert = !engineReady || !!activeDialog;
  document.querySelector(`.workbench`).inert ||= framing;
  document.querySelector(`.fabric-picker`).inert ||= framing;
  for (const el of document.querySelectorAll(`.pc-bar, .score, .error-panel`)) el.inert = !!activeDialog;
  for (const button of document.querySelectorAll(`.experiment-card`)) button.disabled = !engineReady || !!rec;
  document.querySelector(`.frame-toggle`).disabled =
    !engineReady || !!rec || pausePending || document.body.classList.contains(`staged`);
}
function resumeShred() {
  if (framing) return;
  if (!shred?.frozenAt) return;
  shred.startedAt += performance.now() - shred.frozenAt;
  shred.frozenAt = 0;
  tickShred();
}
function showDialog(dialog, opener, initialFocus) {
  if (activeDialog) closeDialog(false);
  dialogOpener = opener || document.activeElement;
  P(false);
  openTools(false);
  M(performance.now());
  activeDialog = dialog;
  dialog.hidden = false;
  syncInteractivity();
  (initialFocus || dialog.querySelector(`button, a[href]`))?.focus();
}
function closeDialog(restoreFocus = true) {
  if (!activeDialog) return;
  const wasShare = activeDialog === sheet;
  activeDialog.hidden = true;
  activeDialog = null;
  if (wasShare) {
    sheetVideo.pause();
    resumeShred();
  }
  syncInteractivity();
  if (restoreFocus && dialogOpener?.isConnected) dialogOpener.focus();
  dialogOpener = null;
}
function applyFraming(paused, focus = true) {
  framing = !!paused;
  document.body.classList.toggle(`framing`, framing);
  document.querySelector(`.frame-bar`).hidden = !framing;
  document.querySelector(`.frame-toggle`).setAttribute(`aria-pressed`, String(framing));
  if (framing) {
    restoreRenderResolution();
    if (shred?.startedAt && !shred.frozenAt) shred.frozenAt = performance.now();
    m.style.cursor = `grab`;
  } else {
    resumeShred();
    m.style.cursor = currentTool === `hand` ? `grab` : `crosshair`;
  }
  syncInteractivity();
  if (focus && engineReady && !activeDialog) document.querySelector(framing ? `.frame-exit` : `.frame-toggle`).focus();
}
function requestFraming(paused) {
  if (!engineReady || activeDialog || pausePending) return;
  if (rec) {
    toast(`Finish your recording before entering frame mode.`);
    return;
  }
  if (document.body.classList.contains(`staged`)) {
    toast(`Finish Smilie before framing the fabric.`);
    return;
  }
  cancelCapture();
  M(performance.now());
  P(false);
  openTools(false);
  pausePending = true;
  syncInteractivity();
  C({ type: `pause`, paused });
  clearTimeout(pauseTimer);
  pauseTimer = setTimeout(() => {
    pausePending = false;
    C({ type: `pause`, paused: framing });
    syncInteractivity();
    toast(`The fabric is taking a moment. Please try again.`);
  }, 5000);
}
function dismissExperiment() {
  activeExperiment = null;
  document.querySelector(`.experiment-active`).hidden = true;
}
function startExperiment(id) {
  const experiment = EXPERIMENTS[id];
  if (!experiment || !engineReady) return;
  if (rec) {
    toast(`Finish your recording before starting an experiment.`);
    return;
  }
  closeDialog(false);
  printCanvas = null;
  printClear.parentElement.hidden = true;
  pendingExperiment = experiment;
  // This always creates a fresh sheet, even when the chosen material is current.
  startWorker(experiment.fabric);
}
function finishExperiment() {
  const experiment = pendingExperiment;
  pendingExperiment = null;
  setTool(experiment.tool);
  setWind(experiment.wind);
  setSlow(experiment.slow);
  sendView({ type: `camera`, preset: `reset` });
  activeExperiment = experiment;
  document.querySelector(`.experiment-name`).textContent = experiment.name;
  document.querySelector(`.experiment-tip`).textContent = experiment.tip;
  document.querySelector(`.experiment-active`).hidden = false;
  toast(`${experiment.name}. Your experiment starts here.`);
}
function T() {
  let e = Math.max(1, window.innerWidth),
    t = Math.max(1, window.innerHeight),
    { width: n, height: r } = p(e, t, window.devicePixelRatio);
  return scaleRenderSize({ width: n, height: r, cssWidth: e, cssHeight: t }, renderBudget.scale);
}
// Frame and exported media always start at the normal drawing-buffer size.
// Send immediately so a subsequent capture/record command sees the resize first.
function restoreRenderResolution() {
  if (renderBudget.reset()) C({ type: `resize`, ...T() });
}
function updateRenderBudget(stats) {
  const available =
    engineReady &&
    document.visibilityState === `visible` &&
    !framing &&
    !pausePending &&
    !rec &&
    !pendingCapture &&
    !activeDialog &&
    !document.body.classList.contains(`staged`);
  if (!coarsePointer.matches && available) {
    restoreRenderResolution();
    return;
  }
  const previous = renderBudget.scale;
  renderBudget.sample({
    gpuFrameMs: stats.gpuFrameMs,
    gpuSamples: stats.gpuSamples,
    now: performance.now(),
    enabled: coarsePointer.matches && available,
  });
  if (renderBudget.scale !== previous) C({ type: `resize`, ...T() });
}
var D = !1;
function O() {
  D ||
    ((D = !0),
    requestAnimationFrame(() => {
      ((D = !1), C({ type: `resize`, ...T() }));
    }));
}
(window.addEventListener(`resize`, O),
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(`change`, O));
var k = 0,
  A = (e) => performance.timeOrigin + e;
const tearFeedback = createTearFeedback({
  now: () => performance.now(),
  enabled: () =>
    engineReady &&
    !activeDialog &&
    !framing &&
    !pausePending &&
    document.visibilityState === `visible` &&
    !document.body.classList.contains(`staged`),
  vibrate: (duration) => navigator.vibrate?.(duration) ?? false,
});
let canvasAudioAbort;
function j(e, t) {
  let n = m.getBoundingClientRect();
  tearFeedback.pointer(e, t);
  C({
    type: `pointer`,
    phase: e,
    id: t.pointerId,
    seq: k++,
    time: A(t.timeStamp),
    x: t.clientX - n.left,
    y: t.clientY - n.top,
    pointerType: t.pointerType,
    width: t.width,
    height: t.height,
  });
}
function cancelStagePointer(time) {
  tearFeedback.reset();
  C({ type: `pointer`, phase: `cancel`, id: -1, preservePins: true, seq: k++, time: A(time), x: 0, y: 0 });
}
function M(time) {
  stageGestures?.reset();
  cancelStagePointer(time);
}
function bindCanvas(canvas) {
  stageGestures?.destroy();
  canvasAudioAbort?.abort();
  canvasAudioAbort = new AbortController();
  stageGestures = bindStageGestures(canvas, {
    enabled: () => engineReady && !activeDialog && !pausePending && document.visibilityState === `visible`,
    framing: () => framing,
    pointer: j,
    cancel: cancelStagePointer,
    send: sendView,
    play: () => {
      w.unlock();
      touchShred();
    },
  });
  // Start the intent timer before audio initialization, while both still share
  // the original trusted event. First-touch audio setup then overlaps the wait.
  canvas.addEventListener(
    `pointerdown`,
    () => {
      if (engineReady && !activeDialog && !pausePending && !framing && document.visibilityState === `visible`)
        w.unlock();
    },
    { signal: canvasAudioAbort.signal },
  );
}
(window.addEventListener(`blur`, () => M(performance.now())),
  document.addEventListener(`visibilitychange`, () => {
    let e = document.visibilityState === `visible`;
    if (!e) M(performance.now());
    (C({ type: `visibility`, visible: e }), w.setVisible(e));
  }));
var N = () => !y.hasAttribute(`hidden`);
function P(e) {
  if (e && (!engineReady || activeDialog)) return;
  if (((y.hidden = !e), v.setAttribute(`aria-expanded`, String(e)), e)) {
    openTools(false);
  }
}
((w.onLaugh = (e, t, n, r) => C({ type: `laugh`, envelope: e, start: t, from: n, to: r })),
  v.addEventListener(`click`, (event) => {
    (w.unlock(), P(!N()));
    if (N() && event.detail === 0) focusMenu(y);
  }));
for (let e of b)
  e.addEventListener(`click`, () => {
    (w.unlock(), w.prefetchStaged(), C({ type: `experience`, name: e.dataset.experience }), P(!1));
    v.focus();
  });
for (let e of fabricButtons)
  e.addEventListener(`click`, () => {
    (w.unlock(), P(!1), e.dataset.fabric !== fabric && startWorker(e.dataset.fabric));
    if (engineReady) v.focus();
  });
(document.addEventListener(`pointerdown`, (e) => {
  N() && !(e.target instanceof Node && (y.contains(e.target) || v.contains(e.target))) && P(!1);
}),
  g.addEventListener(`click`, () => {
    if (!engineReady || activeDialog) return;
    cancelCapture();
    dismissExperiment();
    (w.unlock(),
      P(!1),
      openTools(false),
      resetShred(),
      C({ type: `reset` }),
      g.classList.remove(`spin`),
      g.offsetWidth,
      g.classList.add(`spin`));
    toast(`Fresh ${FABRIC_NAMES[fabric]}. Make something of it.`);
  }));
// ---------------------------------------------------------------- tools menu
const TOOL_NAMES = { hand: `Hand`, blade: `Knife`, claw: `Claw`, fist: `Fist`, pin: `Pin` };
function setTool(e) {
  if (!TOOL_NAMES[e]) return;
  M(performance.now());
  currentTool = e;
  for (let t of toolItems) t.setAttribute(`aria-pressed`, String(t.dataset.tool === e));
  document.querySelector(`.guide-title`).textContent = TOOL_GUIDES[e][0];
  document.querySelector(`.guide-description`).textContent = TOOL_GUIDES[e][1];
  if (activeExperiment) document.querySelector(`.experiment-tip`).textContent = TOOL_GUIDES[e][1];
  C({ type: `tool`, tool: e });
}
function updateEffects() {
  const summary = document.querySelector(`.effect-summary`);
  const effects = [
    windLevel ? `${[``, `Breeze`, `Gale`][windLevel]} on` : ``,
    slowMotion ? `Slow motion · 0.2×` : ``,
  ].filter(Boolean);
  summary.textContent = effects.join(` · `);
  summary.hidden = !effects.length;
  toolButton.classList.toggle(`has-effects`, !!effects.length);
}
function setWind(e) {
  windLevel = ((e % 3) + 3) % 3;
  toolsMenu.querySelector(`[data-fx="wind"] .fx-label`).textContent = `Wind: ${[`off`, `breeze`, `gale`][windLevel]}`;
  updateEffects();
  C({ type: `wind`, level: windLevel });
}
function setSlow(e) {
  slowMotion = !!e;
  toolsMenu.querySelector(`[data-fx="slow"]`).setAttribute(`aria-checked`, String(slowMotion));
  updateEffects();
  C({ type: `time`, scale: slowMotion ? 0.2 : 1 });
}
var toolsOpen = () => !toolsMenu.hasAttribute(`hidden`);
function openTools(e) {
  if (e && (!engineReady || activeDialog)) return;
  ((toolsMenu.hidden = !e), toolButton.setAttribute(`aria-expanded`, String(e)), e && P(!1));
}
(toolButton.addEventListener(`click`, (event) => {
  (w.unlock(), openTools(!toolsOpen()));
  if (toolsOpen() && event.detail === 0) focusMenu(toolsMenu);
}),
  document.addEventListener(`pointerdown`, (e) => {
    toolsOpen() &&
      !(e.target instanceof Node && (toolsMenu.contains(e.target) || toolButton.contains(e.target))) &&
      openTools(!1);
  }));
for (let e of toolItems)
  e.addEventListener(`click`, () => {
    (w.unlock(), setTool(e.dataset.tool), openTools(!1));
  });
for (let e of fxItems)
  e.addEventListener(`click`, () => {
    (w.unlock(),
      e.dataset.fx === `wind`
        ? setWind(windLevel + 1)
        : e.dataset.fx === `slow`
          ? setSlow(!slowMotion)
          : e.dataset.fx === `shake` &&
            (C({ type: `shake` }), openTools(!1), toolButton.focus(), toast(`A little shake-up.`)));
  });
window.addEventListener(`keydown`, (e) => {
  shortcut(e);
});
var F = new Map(),
  I = () => {},
  devId = 0;
// dev hook: window.__fabricDev({ op: `step`, substeps: 4 }) resolves with the worker's result
window.__fabricDev = (e) =>
  new Promise((t) => {
    let n = ++devId;
    (F.set(n, t), C({ type: `dev`, id: n, ...e }));
  });
new Promise((e) => (I = e));
function onWorkerMessage(e) {
  let t = e.data;
  if (t.type === `devDone`) (F.get(t.id)?.(t.result), F.delete(t.id));
  else if (t.type === `progress`) {
    const progress = Math.round(100 * Math.max(0, Math.min(1, t.value)));
    _.style.setProperty(`--p`, String(progress / 100));
    _.setAttribute(`aria-valuenow`, String(progress));
    document.querySelector(`.loading-percent`).textContent = `${progress}%`;
  } else if (t.type === `status`) {
    if (t.state === `error`) {
      x(t.message);
      return;
    }
    engineReady = t.state === `running`;
    document.body.classList.toggle(`loading`, t.state === `loading`);
    if (t.state === `paused`) toast(t.message || `The fabric is paused.`, 6000);
    if (engineReady) {
      document.body.classList.remove(`failed`);
      document.querySelector(`.error-panel`).hidden = true;
      h.classList.remove(`visible`);
      I();
      // The worker ignores prints until its renderer is ready.
      if (printCanvas) sendPrint();
      if (pendingExperiment) finishExperiment();
      else {
        // Tool and effect handlers need the initialized solver/body. Restore them
        // only after the new worker reports ready, never alongside async init.
        setTool(currentTool);
        setWind(windLevel);
        setSlow(slowMotion);
        sendView({ type: `camera`, preset: `reset` });
      }
    }
    syncInteractivity();
    if (engineReady && focusAfterLoad) {
      if (
        !activeDialog &&
        (document.activeElement === document.body || document.activeElement.closest(`.fabric-picker, .error-panel`))
      )
        v.focus();
      focusAfterLoad = false;
    }
  } else if (t.type === `pause`) {
    const wasPending = pausePending;
    clearTimeout(pauseTimer);
    pausePending = false;
    applyFraming(t.paused, wasPending);
    if (t.reason) toast(t.reason);
  } else if (t.type === `experience`) {
    let e = b.find((e) => e.dataset.experience === t.name);
    (t.state === `loading` ? e?.setAttribute(`aria-busy`, `true`) : e?.removeAttribute(`aria-busy`),
      document.body.classList.toggle(`staged`, t.state === `loading` || t.state === `playing`),
      t.state === `failed` && toast(`Smilie could not be loaded. You can keep playing with the fabric.`));
    syncInteractivity();
  } else
    t.type === `cue`
      ? w.cue(t.cue)
      : t.type === `cursor`
        ? !framing && !pausePending && (m.style.cursor = t.cursor)
        : t.type === `stats`
          ? onStats(t.stats)
          : t.type === `tear`
            ? tearFeedback.tear(t)
            : t.type === `capture`
              ? onCapture(t.blob, t.id)
              : t.type === `video`
                ? onVideoChunk(t.chunk, t.meta)
                : t.type === `record` && onRecordState(t);
}
function onWorkerError(e) {
  (x(`The fabric engine stopped unexpectedly.`), console.error(e));
}
// The engine lives in a worker that owns the canvas. A fabric switch starts a new worker (the GPU
// device and every buffer go with the old one) on a fresh canvas, since an OffscreenCanvas can be
// transferred only once, and re-wires the tear-sound channel and the pointer tool to it.
function startWorker(name) {
  if (rec) {
    toast(`Stop your recording before changing fabric.`);
    return;
  }
  if (!(`transferControlToOffscreen` in m) || !navigator.gpu) {
    x(
      `Fray needs WebGPU to bring the fabric to life. Try a browser with WebGPU support and check that hardware acceleration is enabled.`,
    );
    return;
  }
  renderBudget.reset();
  engineReady = false;
  clearTimeout(pauseTimer);
  pausePending = false;
  applyFraming(false, false);
  dismissExperiment();
  focusAfterLoad = !!document.activeElement.closest(`.fabric-picker, .error-panel`);
  cancelCapture();
  M(performance.now());
  ((fabric = name), resetShred());
  if (S) {
    (abortRecording(), S.terminate(), w.cue({ kind: `stop` }));
    let e = document.createElement(`canvas`);
    ((e.className = `stage`), m.replaceWith(e), (m = e));
  }
  bindCanvas(m);
  m.setAttribute(`aria-label`, `Interactive ${FABRIC_NAMES[name]} fabric. Choose a tool, then drag or tap to use it.`);
  m.setAttribute(`role`, `img`);
  m.setAttribute(`aria-describedby`, `tool-instruction`);
  m.tabIndex = 0;
  document.querySelector(`.current-fabric`).textContent = FABRIC_NAMES[name];
  document.querySelector(`.current-swatch`).dataset.fabric = name;
  v.setAttribute(`aria-label`, `Choose fabric. Current fabric: ${FABRIC_NAMES[name]}`);
  document.querySelector(`.loading-detail`).textContent = `Preparing ${FABRIC_NAMES[name]} · woven thread by thread`;
  document.querySelector(`.loading-percent`).textContent = `0%`;
  document.querySelector(`.error-panel`).hidden = true;
  document.body.classList.remove(`failed`);
  _.setAttribute(`aria-valuenow`, `0`);
  syncInteractivity();
  try {
    ((S = new Worker(new URL(`./worker.js`, import.meta.url), { type: `module` })),
      (S.onmessage = (event) => {
        if (event.currentTarget === S) onWorkerMessage(event);
      }),
      (S.onerror = (event) => {
        if (event.currentTarget === S) onWorkerError(event);
      }),
      document.body.classList.add(`loading`),
      document.body.classList.remove(`staged`),
      _.style.setProperty(`--p`, `0`));
    for (let e of fabricButtons) e.setAttribute(`aria-checked`, String(e.dataset.fabric === name));
    let e = m.transferControlToOffscreen();
    (C({ type: `init`, canvas: e, fabric: name, settleSteps, base: import.meta.env.BASE_URL, ...T() }, [e]),
      w.reconnect());
  } catch (error) {
    onWorkerError(error);
  }
}

// ---------------------------------------------------------------- shred score
// Threads shredded = yarns ruptured + yarns pulled out of the weave (the solver's counters, streamed
// with the stats). The clock starts at the first touch after a reset and stops when a card is captured.
var scoreEl = document.querySelector(`.score`),
  scoreN = scoreEl.querySelector(`.score-n`),
  scoreT = scoreEl.querySelector(`.score-t`),
  shred = { target: 0, shown: 0, startedAt: 0, frozenAt: 0, raf: 0 };
function resetShred() {
  tearFeedback.reset();
  cancelAnimationFrame(shred.raf);
  ((shred.target = 0), (shred.shown = 0), (shred.startedAt = 0), (shred.frozenAt = 0));
  ((scoreN.textContent = `0`), (scoreT.textContent = `0:00`), scoreEl.classList.remove(`visible`));
  scoreEl.querySelector(`.score-verdict`).textContent = `Untouched`;
}
function touchShred() {
  if (shred.startedAt) return;
  shred.startedAt = performance.now();
  if (framing) shred.frozenAt = shred.startedAt;
  tickShred();
}
function shredSeconds() {
  return shred.startedAt ? ((shred.frozenAt || performance.now()) - shred.startedAt) / 1e3 : 0;
}
function fmtTime(e) {
  let t = Math.floor(e);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, `0`)}`;
}
function tickShred() {
  cancelAnimationFrame(shred.raf);
  let e = () => {
    let t = shred.target - shred.shown;
    ((shred.shown += Math.abs(t) < 1 ? t : t * 0.18), (scoreN.textContent = Math.round(shred.shown).toLocaleString()));
    scoreT.textContent = fmtTime(shredSeconds());
    (shred.startedAt && !shred.frozenAt) || Math.abs(t) >= 1 ? (shred.raf = requestAnimationFrame(e)) : 0;
  };
  shred.raf = requestAnimationFrame(e);
}
function onStats(e) {
  window.__fabricStats = e;
  updateRenderBudget(e);
  let t = (e.ruptures ?? 0) + (e.pulledOut ?? 0);
  scoreEl.querySelector(`.score-verdict`).textContent = verdict(t);
  t !== shred.target && ((shred.target = t), t > 0 && (scoreEl.classList.add(`visible`), touchShred()), tickShred());
}
function verdict(e) {
  return e < 1
    ? `Untouched`
    : e < 100
      ? `Gentle`
      : e < 500
        ? `Rowdy`
        : e < 2e3
          ? `Menace`
          : e < 5e3
            ? `Shredder`
            : `Absolute unit`;
}

// ---------------------------------------------------------------- share card
var shareButton = document.querySelector(`.share`),
  sheet = document.querySelector(`.sheet`),
  sheetImg = sheet.querySelector(`.sheet-img`),
  sheetText = sheet.querySelector(`.sheet-text`),
  sheetX = sheet.querySelector(`.sheet-x`),
  sheetShare = sheet.querySelector(`.sheet-share`),
  sheetSave = sheet.querySelector(`.sheet-save`),
  sheetClose = sheet.querySelector(`.sheet-close`),
  cardFile = null,
  cardUrl = null;
let captureTimer = 0;
let captureVersion = 0;
let pendingCapture = false;
let captureMetadata = null;
let activeSnapshot = null;
let sharedMetadata = null;
const SITE = `${location.origin}${location.pathname}`,
  BRAND = `Fray`,
  TAG = `#FrayIt`;
function fabricLabel() {
  return FABRIC_NAMES[fabric];
}
function snapshotMetadata(kind = `image`) {
  return { fabric: fabricLabel(), score: shred.target, seconds: shredSeconds(), kind };
}
function shareText(metadata = snapshotMetadata()) {
  if (metadata.kind === `frame`)
    return `A moment, unraveled. ${metadata.fabric}, shaped and framed in ${BRAND}. ${SITE} ${TAG}`;
  let e = metadata.score,
    t =
      e > 0
        ? `I ripped ${e.toLocaleString()} threads of ${metadata.fabric} in ${fmtTime(metadata.seconds)} on ${BRAND}. Verdict: ${verdict(e)}.`
        : `${BRAND}: real ${metadata.fabric}, woven thread by thread, torn in your browser.`;
  return `${t} 🧵✂️ Think you can do worse? ${SITE} ${TAG}`;
}
function requestCard() {
  if (!engineReady || activeDialog || pendingCapture || pausePending) return;
  if (rec) {
    toast(`Stop your recording to save the clip, or take a snapshot afterward.`);
    return;
  }
  restoreRenderResolution();
  pendingCapture = true;
  captureMetadata = snapshotMetadata(framing ? `frame` : `image`);
  captureVersion++;
  (shareButton.setAttribute(`aria-busy`, `true`),
    P(!1),
    openTools(false),
    shred.startedAt && !shred.frozenAt && (shred.frozenAt = performance.now()));
  shareButton.querySelector(`span`).textContent = `Capturing…`;
  document.querySelector(`.frame-capture`).setAttribute(`aria-busy`, `true`);
  document.querySelector(`.frame-capture`).disabled = true;
  C({ type: `capture`, id: captureVersion });
  captureTimer = setTimeout(() => {
    cancelCapture();
    toast(`The snapshot took too long. Please try again.`);
  }, 10000);
}
function cancelCapture() {
  clearTimeout(captureTimer);
  captureVersion++;
  pendingCapture = false;
  captureMetadata = null;
  document.querySelector(`.frame-capture`).removeAttribute(`aria-busy`);
  document.querySelector(`.frame-capture`).disabled = false;
  shareButton?.removeAttribute(`aria-busy`);
  const label = shareButton?.querySelector(`span`);
  if (label) label.textContent = `Save / share`;
  resumeShred();
}
async function composeCard(e, metadata) {
  let t = await createImageBitmap(e),
    n = 1200,
    r = 675,
    i = document.createElement(`canvas`);
  ((i.width = n), (i.height = r));
  let a = i.getContext(`2d`),
    o = Math.max(n / t.width, r / t.height),
    s = t.width * o,
    c = t.height * o;
  (a.drawImage(t, (n - s) / 2, (r - c) / 2, s, c), t.close());
  let l = a.createLinearGradient(0, r * 0.45, 0, r);
  (l.addColorStop(0, `rgba(2,2,3,0)`),
    l.addColorStop(1, `rgba(2,2,3,0.94)`),
    (a.fillStyle = l),
    a.fillRect(0, 0, n, r));
  let u = (e, t, n, r, i, o, s = `left`) => {
    ((a.font = e), (a.fillStyle = t), (a.letterSpacing = n), (a.textAlign = s), a.fillText(r, i, o));
  };
  (u(`600 20px Oswald`, `#c9883f`, `8px`, `RIP REAL FABRIC`, 56, r - 136),
    u(`400 86px Anton`, `#e9ebf1`, `3px`, BRAND.toUpperCase(), 56, r - 56),
    (a.strokeStyle = `#c9883f`),
    (a.lineWidth = 3),
    a.setLineDash([10, 6]),
    a.beginPath(),
    a.moveTo(58, r - 36),
    a.lineTo(300, r - 36),
    a.stroke());
  let d = metadata.score;
  (u(`400 120px Anton`, `#e9ebf1`, `2px`, d.toLocaleString(), n - 56, r - 118, `right`),
    u(
      `600 22px Oswald`,
      `#c9883f`,
      `6px`,
      `THREADS SHREDDED · ${fmtTime(metadata.seconds)} · ${metadata.fabric.toUpperCase()}`,
      n - 56,
      r - 78,
      `right`,
    ),
    u(`500 20px Oswald`, `#e9ebf1b0`, `4px`, `VERDICT: ${verdict(d).toUpperCase()}`, n - 56, r - 40, `right`));
  return new Promise((e) => i.toBlob(e, `image/png`));
}
async function onCapture(e, id) {
  if (!pendingCapture || id !== captureVersion) return;
  const version = captureVersion;
  const metadata = captureMetadata;
  try {
    if (!e) throw Error(`No frame available`);
    let t = metadata.kind === `frame` ? e : await composeCard(e, metadata);
    if (version !== captureVersion) return;
    if (!t) throw Error(`Image could not be created`);
    clearTimeout(captureTimer);
    pendingCapture = false;
    shareButton.removeAttribute(`aria-busy`);
    shareButton.querySelector(`span`).textContent = `Save / share`;
    document.querySelector(`.frame-capture`).removeAttribute(`aria-busy`);
    document.querySelector(`.frame-capture`).disabled = false;
    captureMetadata = null;
    previewSnapshot({ blob: t, ...metadata }, framing ? document.querySelector(`.frame-capture`) : shareButton);
  } catch (error) {
    if (version !== captureVersion) return;
    console.warn(`Snapshot unavailable:`, error);
    cancelCapture();
    toast(`Could not create the snapshot. Please try again.`);
  }
}
function previewSnapshot(snapshot, opener = document.querySelector(`.collection-toggle`)) {
  activeSnapshot = snapshot;
  sharedMetadata = snapshot;
  if (cardUrl) URL.revokeObjectURL(cardUrl);
  cardUrl = URL.createObjectURL(snapshot.blob);
  const slug = snapshot.fabric
    .toLowerCase()
    .normalize(`NFD`)
    .replace(/[\u0300-\u036f]/g, ``)
    .replace(/[^a-z0-9]+/g, `-`);
  cardFile = new File([snapshot.blob], `fray-${slug}${snapshot.kind === `frame` ? `-frame` : ``}.png`, {
    type: `image/png`,
  });
  const text = shareText(snapshot);
  sheetImg.src = cardUrl;
  sheetImg.alt = `${snapshot.fabric} ${snapshot.kind === `frame` ? `composition` : `shred card`}`;
  sheetImg.hidden = false;
  sheetVideo.hidden = true;
  sheetVideo.removeAttribute(`src`);
  sheetHint.hidden = false;
  sheet.dataset.kind = snapshot.kind;
  document.getElementById(`share-title`).textContent =
    snapshot.kind === `frame` ? `A moment, unraveled.` : `Keep the damage.`;
  sheet.querySelector(`.dialog-description`).textContent =
    snapshot.kind === `frame`
      ? `A clean frame. Yours to keep, print, or share.`
      : `A little evidence of your creative destruction.`;
  sheetText.textContent = text;
  sheetX.href = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
  sheetSave.href = cardUrl;
  sheetSave.download = cardFile.name;
  sheetSave.querySelector(`.save-label`).textContent = `Save image`;
  sheetShare.hidden = !(navigator.canShare && navigator.canShare({ files: [cardFile] }));
  const keep = sheet.querySelector(`.sheet-keep`);
  keep.hidden = false;
  keep.disabled = !!snapshot.id || !!snapshot.kept;
  keep.textContent = keep.disabled ? `Kept in collection` : `Keep in collection`;
  keep.removeAttribute(`aria-busy`);
  sheet.querySelector(`.sheet-keep-note`).hidden = false;
  showDialog(sheet, opener, sheetSave);
}
function closeSheet() {
  if (activeDialog === sheet) closeDialog();
}
(shareButton.addEventListener(`click`, () => {
  (w.unlock(), requestCard());
}),
  sheetClose.addEventListener(`click`, closeSheet),
  sheet.addEventListener(`pointerdown`, (e) => {
    e.target === sheet && closeSheet();
  }),
  sheetShare.addEventListener(`click`, async () => {
    try {
      await navigator.share({
        files: [sheet.dataset.kind === `video` ? clipFile : cardFile],
        text: shareText(sharedMetadata || snapshotMetadata()),
        title: BRAND,
      });
    } catch (error) {
      if (error.name !== `AbortError`) toast(`Sharing is unavailable. Use Save to keep a copy.`);
    }
  }));

// ---------------------------------------------------------------- shortcuts
function shortcut(e) {
  if (
    e.defaultPrevented ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey ||
    (e.repeat && !e.key.startsWith(`Arrow`)) ||
    e.target.closest?.(`input, textarea, select, [contenteditable="true"], dialog`)
  )
    return;
  let t = e.key.toLowerCase();
  if (t === `m` && !activeDialog) {
    soundToggle.click();
    return;
  }
  if (activeDialog || !engineReady || N() || toolsOpen()) return;
  if (e.code === `Space` && !e.target.closest?.(`button, a, input, video`)) {
    e.preventDefault();
    requestFraming(!framing);
    return;
  }
  if (t === `escape`) {
    if (framing) {
      requestFraming(false);
      return;
    }
    M(e.timeStamp);
    return;
  }
  if (pausePending) return;
  if (t.startsWith(`arrow`)) {
    if (e.target.closest?.(`button, a, [role="menu"]`)) return;
    (e.preventDefault(),
      sendView({
        type: `orbit`,
        yaw: t === `arrowleft` ? -0.08 : t === `arrowright` ? 0.08 : 0,
        pitch: t === `arrowup` ? -0.06 : t === `arrowdown` ? 0.06 : 0,
      }));
    return;
  }
  if (framing) {
    if (t === `s`) requestCard();
    return;
  }
  let n = {
    1: `hand`,
    2: `blade`,
    3: `claw`,
    4: `fist`,
    5: `pin`,
    h: `hand`,
    k: `blade`,
    c: `claw`,
    b: `fist`,
    p: `pin`,
  }[t];
  if (n) {
    e.preventDefault();
    setTool(n);
    return;
  }
  t === `v`
    ? recordButton.click()
    : t === `w`
      ? setWind(windLevel + 1)
      : t === `t`
        ? setSlow(!slowMotion)
        : t === `x`
          ? C({ type: `shake` })
          : t === `r`
            ? g.click()
            : t === `s`
              ? requestCard()
              : t === `f` &&
                fabricButtons.length &&
                fabricButtons[
                  (fabricButtons.findIndex((e) => e.dataset.fabric === fabric) + 1) % fabricButtons.length
                ].click();
}

// ---------------------------------------------------------------- clip recording
// The worker encodes the canvas (H.264, WebCodecs) and streams the chunks here; the page taps the
// sound bus, encodes it to AAC, and muxes both into an MP4 (the format X takes) with mp4-muxer.
var recordButton = document.querySelector(`.record`),
  recordTime = recordButton.querySelector(`span`),
  sheetVideo = sheet.querySelector(`.sheet-video`),
  sheetHint = sheet.querySelector(`.sheet-hint`),
  rec = null,
  clipFile = null,
  clipUrl = null;
function onRecordState(e) {
  if (e.state === `started`) {
    if (!rec || rec.muxer) return;
    clearTimeout(rec.startTimer);
    ((rec.width = e.width), (rec.height = e.height), (rec.maxSeconds = e.maxSeconds));
    rec.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: `avc`, width: e.width, height: e.height },
      audio: rec.audio ? { codec: `aac`, sampleRate: rec.audio.sampleRate, numberOfChannels: 2 } : void 0,
      fastStart: `in-memory`,
      firstTimestampBehavior: `offset`,
    });
    for (let [e, t] of rec.queuedAudio) rec.muxer.addAudioChunk(e, t);
    ((rec.queuedAudio.length = 0),
      (rec.startedAt = performance.now()),
      recordButton.setAttribute(`aria-pressed`, `true`),
      recordButton.removeAttribute(`aria-busy`),
      (recordButton.disabled = false),
      recordButton.setAttribute(`aria-label`, `Stop recording`),
      (recordButton.title = `Stop recording (V)`),
      tickRecord());
    document.querySelector(`.record-note`).hidden = false;
    toast(
      rec.audio && !w.muted
        ? `Recording with sound · up to 20 seconds. Press V to stop.`
        : `Recording without sound · up to 20 seconds. Press V to stop.`,
      4200,
    );
    rec.timer = setTimeout(() => stopRecording(), 1e3 * e.maxSeconds + 200);
  } else if (e.state === `stopped`) rec && finishRecording(e);
  else if (e.state === `failed`) {
    (abortRecording(), toast(e.message ?? `Recording is unavailable in this browser. You can still save an image.`));
  }
}
// chunks keep coming after Stop (the encoder's flush) until the worker reports `stopped`
function onVideoChunk(e, t) {
  if (!rec?.muxer) return;
  (rec.muxer.addVideoChunk(e, t), rec.samples++);
}
function tickRecord() {
  if (!rec || rec.stopped) return;
  ((recordTime.textContent = `Stop · ${fmtTime((performance.now() - rec.startedAt) / 1e3)}`),
    (rec.raf = requestAnimationFrame(tickRecord)));
}
// tap the sound bus: MediaStreamTrackProcessor -> AudioEncoder (AAC) -> muxer
async function startAudioCapture() {
  let e = w.context,
    t = w.master;
  if (!e || !t || typeof MediaStreamTrackProcessor > `u` || typeof AudioEncoder > `u`) return null;
  // some builds (Linux) have no AAC encoder: the clip then goes without sound rather than with an empty track
  try {
    if (
      !(
        await AudioEncoder.isConfigSupported({
          codec: `mp4a.40.2`,
          sampleRate: e.sampleRate,
          numberOfChannels: 2,
          bitrate: 128e3,
        })
      ).supported
    )
      return null;
  } catch {
    return null;
  }
  let n = e.createMediaStreamDestination();
  t.connect(n);
  let r = n.stream.getAudioTracks()[0],
    i = new MediaStreamTrackProcessor({ track: r }),
    a = new AudioEncoder({
      output: (e, t) => {
        rec && (rec.muxer ? rec.muxer.addAudioChunk(e, t) : rec.queuedAudio.push([e, t]));
      },
      error: (e) => console.warn(`audio encoder`, e),
    });
  try {
    a.configure({ codec: `mp4a.40.2`, sampleRate: e.sampleRate, numberOfChannels: 2, bitrate: 128e3 });
  } catch (e) {
    // no AAC encoder here (some Linux builds): the clip goes without sound
    (console.warn(`audio encoder`, e), t.disconnect(n), r.stop());
    return null;
  }
  let o = i.readable.getReader(),
    s = !1,
    c = (async () => {
      for (;;) {
        let { value: e, done: t } = await o.read();
        if (t || !e) break;
        if (s) {
          e.close();
          break;
        }
        try {
          a.state === `configured` && a.encode(e);
        } catch {}
        e.close();
      }
    })();
  return {
    sampleRate: e.sampleRate,
    async stop() {
      s = !0;
      try {
        await o.cancel();
      } catch {}
      await c;
      try {
        (await a.flush(), a.close());
      } catch {}
      (t.disconnect(n), r.stop());
    },
  };
}
async function startRecording() {
  if (rec || !engineReady || activeDialog || framing || pausePending) return;
  cancelCapture();
  restoreRenderResolution();
  (w.unlock(), P(!1), openTools(false));
  let e = (rec = {
    muxer: null,
    audio: null,
    queuedAudio: [],
    startedAt: 0,
    stopped: !1,
    timer: 0,
    raf: 0,
    samples: 0,
    startTimer: setTimeout(() => {
      if (rec === e && !rec.muxer) {
        C({ type: `record`, action: `stop` });
        abortRecording();
        toast(`Recording could not start. Try again, or save an image.`);
      }
    }, 12000),
  });
  recordButton.setAttribute(`aria-busy`, `true`);
  recordButton.disabled = true;
  recordTime.textContent = `Starting…`;
  recordButton.setAttribute(`aria-label`, `Starting recording`);
  syncInteractivity();
  let t = null;
  try {
    t = await startAudioCapture();
  } catch (error) {
    console.warn(`Audio recording unavailable:`, error);
  }
  if (rec !== e) {
    t?.stop().catch(() => {});
    return;
  }
  ((e.audio = t), C({ type: `record`, action: `start` }));
}
function stopRecording() {
  if (!rec || rec.stopped) return;
  ((rec.stopped = !0), clearTimeout(rec.timer), cancelAnimationFrame(rec.raf));
  ((recordTime.textContent = `Saving…`), C({ type: `record`, action: `stop` }));
  recordButton.disabled = true;
  recordButton.setAttribute(`aria-busy`, `true`);
  recordButton.setAttribute(`aria-label`, `Saving recording`);
}
function resetRecordButton() {
  document.querySelector(`.record-note`).hidden = true;
  recordTime.textContent = `Record`;
  recordButton.disabled = false;
  recordButton.setAttribute(`aria-pressed`, `false`);
  recordButton.setAttribute(`aria-label`, `Record a clip, up to 20 seconds`);
  recordButton.title = `Record a clip (V)`;
  recordButton.removeAttribute(`aria-busy`);
  syncInteractivity();
}
function abortRecording() {
  if (!rec) return;
  let e = rec;
  ((rec = null),
    (e.stopped = !0),
    clearTimeout(e.timer),
    clearTimeout(e.startTimer),
    cancelAnimationFrame(e.raf),
    e.audio?.stop().catch(() => {}));
  resetRecordButton();
}
async function finishRecording(e) {
  let t = rec;
  t.stopped = true;
  clearTimeout(t.timer);
  clearTimeout(t.startTimer);
  cancelAnimationFrame(t.raf);
  recordTime.textContent = `Saving…`;
  recordButton.disabled = true;
  recordButton.setAttribute(`aria-busy`, `true`);
  recordButton.setAttribute(`aria-label`, `Saving recording`);
  if (t.audio) await t.audio.stop().catch(() => {});
  if (rec !== t) return;
  rec = null;
  resetRecordButton();
  if (!t.muxer || !t.samples) {
    toast(`Nothing was recorded. Try a longer clip, or save an image.`);
    return;
  }
  let n;
  try {
    (t.muxer.finalize(), (n = new Blob([t.muxer.target.buffer], { type: `video/mp4` })));
  } catch (e) {
    (console.warn(`mux`, e), toast(`Could not finish the clip. Please try again.`));
    return;
  }
  (clipUrl && URL.revokeObjectURL(clipUrl), (clipUrl = URL.createObjectURL(n)));
  clipFile = new File([n], `fray-${fabric}.mp4`, { type: `video/mp4` });
  shred.startedAt && !shred.frozenAt && (shred.frozenAt = performance.now());
  let r = shareText();
  sharedMetadata = snapshotMetadata();
  activeSnapshot = null;
  sheet.querySelector(`.sheet-keep`).hidden = true;
  sheet.querySelector(`.sheet-keep-note`).hidden = true;
  document.getElementById(`share-title`).textContent = `Keep the damage.`;
  sheet.querySelector(`.dialog-description`).textContent = `Your fabric in motion, ready to save.`;
  ((sheetVideo.src = clipUrl),
    (sheetVideo.hidden = !1),
    (sheetImg.hidden = !0),
    (sheetText.textContent = r),
    (sheetX.href = `https://x.com/intent/post?text=${encodeURIComponent(r)}`),
    (sheetSave.href = clipUrl),
    (sheetSave.download = clipFile.name),
    (sheetSave.querySelector(`.save-label`).textContent = `Save video`),
    (sheetHint.hidden = !1),
    (sheetShare.hidden = !(navigator.canShare && navigator.canShare({ files: [clipFile] }))),
    (sheet.dataset.kind = `video`));
  showDialog(sheet, recordButton, sheetSave);
  sheetVideo.play().catch(() => {});
}
recordButton.addEventListener(`click`, () => {
  rec ? stopRecording() : startRecording();
});

// ---------------------------------------------------------------- print a photo on the fabric
// The image is drawn cover-fit into a canvas the shape of the sheet and handed to the worker as a
// bitmap, which becomes a texture the surface pass multiplies into the yarns' albedo. Nothing is uploaded.
var printCanvas = null,
  printInput = document.querySelector(`.print-input`),
  printPick = document.querySelector(`[data-print="pick"]`),
  printClear = document.querySelector(`[data-print="clear"]`);
async function setPrintFrom(e) {
  if (!engineReady || activeDialog) return;
  if (!e || !/^image\//.test(e.type)) {
    toast(`Choose an image file to print on the fabric.`);
    return;
  }
  let t;
  try {
    t = await createImageBitmap(e);
  } catch {
    toast(`That image could not be read. Try a PNG, JPEG, or WebP image.`);
    return;
  }
  let n = 1240,
    r = 800;
  ((printCanvas ||= document.createElement(`canvas`)), ((printCanvas.width = n), (printCanvas.height = r)));
  let i = printCanvas.getContext(`2d`),
    a = Math.max(n / t.width, r / t.height),
    o = t.width * a,
    s = t.height * a;
  (i.drawImage(t, (n - o) / 2, (r - s) / 2, o, s), t.close());
  ((printClear.parentElement.hidden = !1), sendPrint());
  toast(
    fabric === `linen` || fabric === `gauze` || fabric === `chiffon`
      ? `Printed. Now rip it.`
      : `Printed. Now rip it. Tip: prints show best on Linen.`,
  );
}
async function sendPrint() {
  if (!printCanvas || !engineReady) return;
  const worker = S;
  try {
    let e = await createImageBitmap(printCanvas);
    if (worker !== S || !engineReady) {
      e.close();
      return;
    }
    C({ type: `print`, bitmap: e }, [e]);
  } catch {
    toast(`The print could not be applied. Please try again.`);
  }
}
function clearPrint() {
  ((printCanvas = null), (printClear.parentElement.hidden = !0), C({ type: `print`, bitmap: null }));
  toast(`Photo removed. Back to the original weave.`);
}
(printPick.addEventListener(`click`, () => {
  (P(!1), printInput.click());
}),
  printClear.addEventListener(`click`, () => {
    (P(!1), clearPrint());
    v.focus();
  }),
  printInput.addEventListener(`change`, () => {
    (setPrintFrom(printInput.files?.[0]), (printInput.value = ``));
  }),
  window.addEventListener(`dragover`, (e) => e.preventDefault()),
  window.addEventListener(`drop`, (e) => {
    (e.preventDefault(), setPrintFrom(e.dataTransfer?.files?.[0]));
  }),
  window.addEventListener(`paste`, (e) => {
    let t = [...(e.clipboardData?.files ?? [])].find((e) => /^image\//.test(e.type));
    t && setPrintFrom(t);
  }));
window.__fabricPrint = setPrintFrom;

// --------------------------------------------------------- interface navigation
function menuItems(menu) {
  return [...menu.querySelectorAll(`[role^="menuitem"]`)].filter((item) => !item.disabled && !item.closest(`[hidden]`));
}
function focusMenu(menu, last = false) {
  const items = menuItems(menu);
  (last ? items.at(-1) : items.find((item) => item.getAttribute(`aria-checked`) === `true`) || items[0])?.focus();
}
for (const [trigger, menu, toggle] of [
  [v, y, P],
  [toolButton, toolsMenu, openTools],
]) {
  trigger.addEventListener(`keydown`, (event) => {
    if (event.key !== `ArrowDown` && event.key !== `ArrowUp`) return;
    event.preventDefault();
    toggle(true);
    focusMenu(menu, event.key === `ArrowUp`);
  });
  menu.addEventListener(`keydown`, (event) => {
    const items = menuItems(menu);
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === `ArrowDown` || event.key === `ArrowRight`) next = (index + 1) % items.length;
    if (event.key === `ArrowUp` || event.key === `ArrowLeft`) next = (index - 1 + items.length) % items.length;
    if (event.key === `Home`) next = 0;
    if (event.key === `End`) next = items.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      items[next]?.focus();
    }
    if (event.key === `Tab`) {
      toggle(false);
      trigger.focus();
    }
  });
  menu.addEventListener(`focusout`, () => {
    // Tab and pointer focus must not leave an open menu stranded behind the user.
    setTimeout(() => {
      if (!menu.hidden && !menu.contains(document.activeElement) && document.activeElement !== trigger) toggle(false);
    }, 0);
  });
}
document.querySelector(`.fabric-close`)?.addEventListener(`click`, () => {
  P(false);
  v.focus();
});

// How to play is the shared About dialog (play-chrome-mount.js); the kit opens it from the bar and with ?.
document.addEventListener(
  `keydown`,
  (event) => {
    if (event.key === `Escape`) {
      if (activeDialog) {
        closeDialog();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (N()) {
        P(false);
        v.focus();
        event.preventDefault();
      }
      if (toolsOpen()) {
        openTools(false);
        toolButton.focus();
        event.preventDefault();
      }
      M(event.timeStamp);
    }
    if (!activeDialog) return;
    if (event.key === `Tab`) {
      const focusable = [
        ...activeDialog.querySelectorAll(`button:not(:disabled), a[href], video[controls], input, [tabindex="0"]`),
      ].filter((el) => !el.closest(`[hidden]`) && el.getClientRects().length);
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !activeDialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    }
    // Keep application shortcuts away from a dialog's native controls.
    event.stopPropagation();
  },
  true,
);

const soundToggle = document.querySelector(`.sound-toggle`);
function setMuted(muted) {
  w.setMuted(muted);
  soundToggle.setAttribute(`aria-pressed`, String(!muted));
  soundToggle.setAttribute(`aria-label`, muted ? `Unmute sound` : `Mute sound`);
  soundToggle.title = muted ? `Unmute sound` : `Mute sound`;
  const label = soundToggle.querySelector(`.sound-label`);
  if (label) label.textContent = muted ? `Muted` : `Sound on`;
  try {
    localStorage.setItem(`fray-muted`, String(muted));
  } catch {}
}
try {
  // Sound starts off on Play until someone turns it on.
  setMuted(localStorage.getItem(`fray-muted`) !== `false`);
} catch {
  setMuted(true);
}
soundToggle.addEventListener(`click`, () => {
  setMuted(!w.muted);
  if (!w.muted) w.unlock();
});
for (const button of document.querySelectorAll(`.camera-control`)) {
  button.addEventListener(`click`, () => {
    if (!engineReady) return;
    const action = button.dataset.camera;
    if (action === `left` || action === `right`)
      sendView({ type: `orbit`, yaw: action === `left` ? -0.15 : 0.15, pitch: 0 });
    else if (action === `zoom-in` || action === `zoom-out`)
      sendView({ type: `zoom`, deltaY: action === `zoom-in` ? -120 : 120 });
    else if (action === `reset`) sendView({ type: `camera`, preset: `reset` });
  });
}
document.querySelector(`.retry`).addEventListener(`click`, () => startWorker(fabric));
sheetSave.addEventListener(`click`, () =>
  toast(sheet.dataset.kind === `video` ? `Video download started.` : `Image download started.`),
);
function sendView(message) {
  const preset = message.type === `camera` ? message.preset : null;
  if (preset !== selectedView) {
    selectedView = preset;
    for (const button of document.querySelectorAll(`.frame-view`))
      button.setAttribute(`aria-pressed`, String(button.dataset.view === preset));
  }
  C(message);
}
document.querySelector(`.frame-toggle`).addEventListener(`click`, () => requestFraming(!framing));
document.querySelector(`.frame-exit`).addEventListener(`click`, () => requestFraming(false));
document.querySelector(`.frame-capture`).addEventListener(`click`, requestCard);
for (const button of document.querySelectorAll(`.frame-view`)) {
  button.addEventListener(`click`, () => {
    if (engineReady && framing) sendView({ type: `camera`, preset: button.dataset.view });
  });
}
const exploreSheet = document.querySelector(`.explore-sheet`);
const exploreToggle = document.querySelector(`.explore-toggle`);
exploreToggle.addEventListener(`click`, () => {
  showDialog(exploreSheet, exploreToggle, exploreSheet.querySelector(`.explore-close`));
  if (rec) toast(`Finish your recording before starting a new experiment.`);
});
exploreSheet.querySelector(`.explore-close`).addEventListener(`click`, () => closeDialog());
exploreSheet.addEventListener(`pointerdown`, (event) => {
  if (event.target === exploreSheet) closeDialog();
});
for (const button of document.querySelectorAll(`.experiment-card`))
  button.addEventListener(`click`, () => startExperiment(button.dataset.experiment));
document.querySelector(`.experiment-dismiss`).addEventListener(`click`, () => {
  dismissExperiment();
  document.querySelector(`.toolitem[aria-pressed="true"]`).focus();
});
gallery = createCollection({ openDialog: showDialog, closeDialog, toast, onSelect: previewSnapshot });
sheet.querySelector(`.sheet-keep`).addEventListener(`click`, async () => {
  const snapshot = activeSnapshot;
  if (!snapshot || snapshot.kept || snapshot.id) return;
  const button = sheet.querySelector(`.sheet-keep`);
  if (button.disabled) return;
  button.disabled = true;
  button.setAttribute(`aria-busy`, `true`);
  button.textContent = `Keeping…`;
  const kept = await gallery.keep(snapshot);
  if (kept) snapshot.kept = true;
  if (activeSnapshot !== snapshot) return;
  button.removeAttribute(`aria-busy`);
  button.disabled = kept;
  button.textContent = kept ? `Kept in collection` : `Keep in collection`;
});
startWorker(fabric);
