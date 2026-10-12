import { ArrayBufferTarget, Muxer } from "mp4-muxer";
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
var i = {
  segments: [
    [0.58, 1.13],
    [2.4, 2.75],
    [3.87, 5.02],
  ],
  grain: 0.1,
  levelTime: 0.06,
  referenceRate: 60,
  maxGain: 2,
  rateTime: 0.08,
  tearWindow: 0.1,
  attack: 0.02,
  tail: 0.3,
};
function a(e, t) {
  let n = i,
    r = (2 * Math.PI * 70) / t,
    a = Math.sin(r) / (2 * Math.SQRT1_2),
    o = Math.cos(r),
    s = 1 + a,
    c = (1 + o) / 2 / s,
    l = -(1 + o) / s,
    u = (-2 * o) / s,
    d = (1 - a) / s,
    f = new Float32Array(e.length),
    p = 0,
    m = 0;
  for (let t = 0; t < e.length; t++) {
    let n = e[t],
      r = c * n + p;
    ((p = l * n - u * r + m), (m = c * n - d * r), (f[t] = r));
  }
  let h = Math.round((n.levelTime * t) / 2),
    g = new Float64Array(f.length + 1);
  for (let e = 0; e < f.length; e++) g[e + 1] = g[e] + f[e] * f[e];
  let _ = Math.round(n.grain * t),
    v = [],
    y = 0,
    b = 0;
  for (let [e, r] of n.segments) {
    let n = Math.round(e * t),
      i = Math.min(f.length, Math.round(r * t));
    (i - n > _ && v.push([n, i - _]), (y += g[i] - g[n]), (b += Math.max(0, i - n)));
  }
  let x = Math.sqrt(y / Math.max(1, b)),
    S = new Float32Array(f.length);
  for (let e = 0; e < f.length; e++) {
    let t = Math.max(0, e - h),
      n = Math.min(f.length, e + h),
      r = Math.sqrt((g[n] - g[t]) / Math.max(1, n - t));
    S[e] = f[e] / Math.max(r, 0.1 * x);
  }
  return { pcm: S, starts: v, level: x };
}
var o = `/fabric_tear_sound_sample.mp3`,
  s = `/exprerience_sounds/creepy_laugh.mp3`,
  c = `/exprerience_sounds/ambiant.mp3`,
  l = 0.015,
  u = class {
    context = null;
    starting = null;
    node = null;
    // every voice plays through this bus (a clip recording taps it)
    master = null;
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
                    i = new Float32Array(r.length);
                  for (let e = 0; e < r.numberOfChannels; e++) {
                    let t = r.getChannelData(e);
                    for (let e = 0; e < i.length; e++) i[e] += t[e] / r.numberOfChannels;
                  }
                  let o = a(i, t.sampleRate);
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
  toolItems = [...toolsMenu.querySelectorAll(`[data-tool]`)],
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
  ((h.textContent = e), h.classList.add(`visible`), document.body.classList.add(`failed`));
}
if (!(`transferControlToOffscreen` in m) || !navigator.gpu)
  throw (x(`This experience needs a browser with WebGPU.`), Error(`WebGPU or OffscreenCanvas unavailable`));
var S = null,
  C = (e, t = []) => S?.postMessage(e, t),
  w = new u((e) => C({ type: `audio`, port: e }, [e])),
  fabric = `tartan`,
  // dev: ?settle=N shortens the settle of a fabric without a drape file
  settleSteps = Number(new URLSearchParams(location.search).get(`settle`)) || 0;
function T() {
  let e = Math.max(1, window.innerWidth),
    t = Math.max(1, window.innerHeight),
    { width: n, height: r } = p(e, t, window.devicePixelRatio);
  return { width: n, height: r, cssWidth: e, cssHeight: t };
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
function j(e, t) {
  let n = m.getBoundingClientRect();
  C({
    type: `pointer`,
    phase: e,
    id: t.pointerId,
    seq: k++,
    time: A(t.timeStamp),
    x: t.clientX - n.left,
    y: t.clientY - n.top,
  });
}
function M(e) {
  C({ type: `pointer`, phase: `cancel`, id: -1, seq: k++, time: A(e), x: 0, y: 0 });
}
var orbiting = null;
function bindCanvas(m) {
  (m.addEventListener(`pointerdown`, (e) => {
    if (e.pointerType === `mouse` && e.button === 2) {
      ((orbiting = { id: e.pointerId, x: e.clientX, y: e.clientY }), m.setPointerCapture(e.pointerId));
      return;
    }
    (e.pointerType !== `mouse` || e.button === 0) &&
      (w.unlock(), touchShred(), m.setPointerCapture(e.pointerId), j(`down`, e));
  }),
    m.addEventListener(`contextmenu`, (e) => e.preventDefault()),
    m.addEventListener(`pointermove`, (e) => {
      if (orbiting && e.pointerId === orbiting.id) {
        (C({ type: `orbit`, yaw: (e.clientX - orbiting.x) * 0.006, pitch: (e.clientY - orbiting.y) * 0.006 }),
          (orbiting.x = e.clientX),
          (orbiting.y = e.clientY));
        return;
      }
      let t = e.getCoalescedEvents?.() ?? [];
      t.length === 0 && j(`move`, e);
      for (let e of t) j(`move`, e);
    }),
    m.addEventListener(`pointerup`, (e) => {
      if (orbiting && e.pointerId === orbiting.id) {
        orbiting = null;
        return;
      }
      (w.unlock(), j(`up`, e));
    }),
    m.addEventListener(`pointercancel`, (e) => j(`cancel`, e)),
    m.addEventListener(`lostpointercapture`, (e) => j(`cancel`, e)),
    m.addEventListener(
      `wheel`,
      (e) => {
        (e.preventDefault(), C({ type: `wheel`, seq: k++, deltaY: e.deltaY, time: A(e.timeStamp) }));
      },
      { passive: !1 },
    ));
}
(window.addEventListener(`keydown`, (e) => {
  e.key === `Escape` && (N() && (P(!1), v.focus()), toolsOpen() && (openTools(!1), toolButton.focus()), M(e.timeStamp));
}),
  window.addEventListener(`blur`, () => M(performance.now())),
  document.addEventListener(`visibilitychange`, () => {
    let e = document.visibilityState === `visible`;
    (C({ type: `visibility`, visible: e }), w.setVisible(e));
  }));
var N = () => !y.hasAttribute(`hidden`);
function P(e) {
  if (((y.hidden = !e), v.setAttribute(`aria-expanded`, String(e)), e)) {
    w.prefetchStaged();
    for (let e of b) C({ type: `prefetch`, name: e.dataset.experience });
  }
}
((w.onLaugh = (e, t, n, r) => C({ type: `laugh`, envelope: e, start: t, from: n, to: r })),
  v.addEventListener(`click`, () => {
    (w.unlock(), P(!N()));
  }));
for (let e of b)
  e.addEventListener(`click`, () => {
    (w.unlock(), w.prefetchStaged(), C({ type: `experience`, name: e.dataset.experience }), P(!1));
  });
for (let e of fabricButtons)
  e.addEventListener(`click`, () => {
    (w.unlock(), P(!1), e.dataset.fabric !== fabric && startWorker(e.dataset.fabric));
  });
(document.addEventListener(`pointerdown`, (e) => {
  N() && !(e.target instanceof Node && (y.contains(e.target) || v.contains(e.target))) && P(!1);
}),
  g.addEventListener(`click`, () => {
    (w.unlock(),
      P(!1),
      resetShred(),
      C({ type: `reset` }),
      g.classList.remove(`spin`),
      g.offsetWidth,
      g.classList.add(`spin`));
  }));
// ---------------------------------------------------------------- tools menu
const TOOL_NAMES = { hand: `Hand`, blade: `Knife`, claw: `Claw`, fist: `Fist`, pin: `Pin` };
function setTool(e) {
  if (!TOOL_NAMES[e]) return;
  currentTool = e;
  ((toolButton.dataset.tool = e), (toolButton.querySelector(`.tool-name`).textContent = TOOL_NAMES[e]));
  for (let t of toolItems) t.setAttribute(`aria-checked`, String(t.dataset.tool === e));
  C({ type: `tool`, tool: e });
}
function setWind(e) {
  windLevel = ((e % 3) + 3) % 3;
  toolsMenu.querySelector(`[data-fx="wind"]`).textContent = `Wind: ${[`off`, `breeze`, `gale`][windLevel]}`;
  C({ type: `wind`, level: windLevel });
}
function setSlow(e) {
  slowMotion = !!e;
  toolsMenu.querySelector(`[data-fx="slow"]`).setAttribute(`aria-checked`, String(slowMotion));
  C({ type: `time`, scale: slowMotion ? 0.2 : 1 });
}
var toolsOpen = () => !toolsMenu.hasAttribute(`hidden`);
function openTools(e) {
  ((toolsMenu.hidden = !e), toolButton.setAttribute(`aria-expanded`, String(e)), e && P(!1));
}
(toolButton.addEventListener(`click`, () => {
  (w.unlock(), openTools(!toolsOpen()));
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
          : e.dataset.fx === `shake` && (C({ type: `shake` }), openTools(!1)));
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
  else if (t.type === `progress`)
    (_.style.setProperty(`--p`, String(t.value)), _.setAttribute(`aria-valuenow`, String(Math.round(100 * t.value))));
  else if (t.type === `status`)
    (t.state === `error`
      ? x(t.message ?? ``)
      : ((h.textContent = t.state === `paused` ? (t.message ?? ``) : ``),
        h.classList.toggle(`visible`, t.state === `paused`)),
      document.body.classList.toggle(`loading`, t.state === `loading`),
      t.state === `running` && I());
  else if (t.type === `experience`) {
    let e = b.find((e) => e.dataset.experience === t.name);
    (t.state === `loading` ? e?.setAttribute(`aria-busy`, `true`) : e?.removeAttribute(`aria-busy`),
      document.body.classList.toggle(`staged`, t.state === `loading` || t.state === `playing`),
      t.state === `failed` &&
        ((h.textContent = `That experience could not be loaded.`),
        h.classList.add(`visible`),
        setTimeout(() => h.classList.remove(`visible`), 2600)));
  } else
    t.type === `cue`
      ? w.cue(t.cue)
      : t.type === `cursor`
        ? (m.style.cursor = t.cursor)
        : t.type === `stats`
          ? onStats(t.stats)
          : t.type === `capture`
            ? onCapture(t.blob)
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
  ((fabric = name), resetShred());
  if (S) {
    (abortRecording(), S.terminate(), w.cue({ kind: `stop` }));
    let e = document.createElement(`canvas`);
    ((e.className = `stage`), m.replaceWith(e), (m = e));
  }
  bindCanvas(m);
  ((S = new Worker(new URL(`./worker.js`, import.meta.url), { type: `module` })),
    (S.onmessage = onWorkerMessage),
    (S.onerror = onWorkerError),
    document.body.classList.add(`loading`),
    document.body.classList.remove(`staged`),
    _.style.setProperty(`--p`, `0`));
  for (let e of fabricButtons) e.setAttribute(`aria-checked`, String(e.dataset.fabric === name));
  let e = m.transferControlToOffscreen();
  (C({ type: `init`, canvas: e, fabric: name, settleSteps, ...T() }, [e]),
    w.reconnect(),
    currentTool !== `hand` && C({ type: `tool`, tool: currentTool }),
    windLevel && C({ type: `wind`, level: windLevel }),
    slowMotion && C({ type: `time`, scale: 0.2 }),
    printCanvas && sendPrint());
}

// ---------------------------------------------------------------- shred score
// Threads shredded = yarns ruptured + yarns pulled out of the weave (the solver's counters, streamed
// with the stats). The clock starts at the first touch after a reset and stops when a card is captured.
var scoreEl = document.querySelector(`.score`),
  scoreN = scoreEl.querySelector(`.score-n`),
  scoreT = scoreEl.querySelector(`.score-t`),
  shred = { target: 0, shown: 0, startedAt: 0, frozenAt: 0, raf: 0 };
function resetShred() {
  ((shred.target = 0), (shred.shown = 0), (shred.startedAt = 0), (shred.frozenAt = 0));
  ((scoreN.textContent = `0`), (scoreT.textContent = `0:00`), scoreEl.classList.remove(`visible`));
}
function touchShred() {
  shred.startedAt || ((shred.startedAt = performance.now()), tickShred());
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
  let t = (e.ruptures ?? 0) + (e.pulledOut ?? 0);
  // a buzz on phones for each burst of breaking yarns
  t > shred.target && navigator.vibrate && navigator.vibrate(Math.min(40, 8 + (t - shred.target)));
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
const SITE = `${location.origin}${location.pathname}`,
  BRAND = `Fray`,
  TAG = `#FrayIt`;
function fabricLabel() {
  return fabric;
}
function shareText() {
  let e = shred.target,
    t =
      e > 0
        ? `I ripped ${e.toLocaleString()} threads of ${fabricLabel()} in ${fmtTime(shredSeconds())} on ${BRAND}. Verdict: ${verdict(e)}.`
        : `${BRAND}: real ${fabricLabel()}, woven thread by thread, torn in your browser.`;
  return `${t} 🧵✂️ Think you can do worse? ${SITE} ${TAG}`;
}
function requestCard() {
  if (shareButton.getAttribute(`aria-busy`) === `true`) return;
  (shareButton.setAttribute(`aria-busy`, `true`),
    P(!1),
    shred.startedAt && !shred.frozenAt && (shred.frozenAt = performance.now()));
  C({ type: `capture` });
  setTimeout(() => shareButton.removeAttribute(`aria-busy`), 4e3);
}
async function composeCard(e) {
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
  let d = shred.target;
  (u(`400 120px Anton`, `#e9ebf1`, `2px`, d.toLocaleString(), n - 56, r - 118, `right`),
    u(
      `600 22px Oswald`,
      `#c9883f`,
      `6px`,
      `THREADS SHREDDED · ${fmtTime(shredSeconds())} · ${fabricLabel().toUpperCase()}`,
      n - 56,
      r - 78,
      `right`,
    ),
    u(`500 20px Oswald`, `#e9ebf1b0`, `4px`, `VERDICT: ${verdict(d).toUpperCase()}`, n - 56, r - 40, `right`));
  return new Promise((e) => i.toBlob(e, `image/png`));
}
async function onCapture(e) {
  shareButton.removeAttribute(`aria-busy`);
  if (!e) {
    ((h.textContent = `Could not capture the frame.`),
      h.classList.add(`visible`),
      setTimeout(() => h.classList.remove(`visible`), 2600));
    return;
  }
  let t = await composeCard(e);
  (cardUrl && URL.revokeObjectURL(cardUrl), (cardUrl = URL.createObjectURL(t)));
  cardFile = new File([t], `fray-${fabric}.png`, { type: `image/png` });
  let n = shareText();
  ((sheetImg.src = cardUrl),
    (sheetImg.hidden = !1),
    (sheetVideo.hidden = !0),
    (sheetVideo.src = ``),
    (sheetHint.hidden = !0),
    (sheetSave.textContent = `Save image`),
    (sheet.dataset.kind = `image`),
    (sheetText.textContent = n),
    (sheetX.href = `https://x.com/intent/post?text=${encodeURIComponent(n)}`),
    (sheetSave.href = cardUrl),
    (sheetSave.download = cardFile.name),
    (sheetShare.hidden = !(navigator.canShare && navigator.canShare({ files: [cardFile] }))),
    (sheet.hidden = !1),
    sheetX.focus());
}
function closeSheet() {
  sheet.hidden || ((sheet.hidden = !0), sheetVideo.pause(), shareButton.focus());
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
        text: shareText(),
        title: BRAND,
      });
    } catch {}
  }));

// ---------------------------------------------------------------- shortcuts
function shortcut(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  let t = e.key.toLowerCase();
  if (t === `escape`) {
    closeSheet();
    return;
  }
  if (!sheet.hidden) return;
  if (t.startsWith(`arrow`)) {
    (e.preventDefault(),
      C({
        type: `orbit`,
        yaw: t === `arrowleft` ? -0.08 : t === `arrowright` ? 0.08 : 0,
        pitch: t === `arrowup` ? -0.06 : t === `arrowdown` ? 0.06 : 0,
      }));
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

startWorker(fabric);

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
      tickRecord());
    rec.timer = setTimeout(() => stopRecording(), 1e3 * e.maxSeconds + 200);
  } else if (e.state === `stopped`) rec && finishRecording(e);
  else if (e.state === `failed`) {
    (abortRecording(),
      (h.textContent = e.message ?? `Recording failed.`),
      h.classList.add(`visible`),
      setTimeout(() => h.classList.remove(`visible`), 2600));
  }
}
// chunks keep coming after Stop (the encoder's flush) until the worker reports `stopped`
function onVideoChunk(e, t) {
  if (!rec?.muxer) return;
  (rec.muxer.addVideoChunk(e, t), rec.samples++);
}
function tickRecord() {
  if (!rec || rec.stopped) return;
  ((recordTime.textContent = fmtTime((performance.now() - rec.startedAt) / 1e3)),
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
  if (rec) return;
  (w.unlock(), P(!1), closeSheet());
  let e = (rec = {
    muxer: null,
    audio: null,
    queuedAudio: [],
    startedAt: 0,
    stopped: !1,
    timer: 0,
    raf: 0,
    samples: 0,
  });
  recordButton.setAttribute(`aria-busy`, `true`);
  let t = await startAudioCapture();
  if (rec !== e) {
    t?.stop().catch(() => {});
    return;
  }
  ((e.audio = t), C({ type: `record`, action: `start` }));
}
function stopRecording() {
  if (!rec || rec.stopped) return;
  ((rec.stopped = !0), clearTimeout(rec.timer), cancelAnimationFrame(rec.raf));
  ((recordTime.textContent = `…`), C({ type: `record`, action: `stop` }));
}
function abortRecording() {
  if (!rec) return;
  let e = rec;
  ((rec = null), (e.stopped = !0), clearTimeout(e.timer), cancelAnimationFrame(e.raf), e.audio?.stop().catch(() => {}));
  ((recordTime.textContent = ``),
    recordButton.setAttribute(`aria-pressed`, `false`),
    recordButton.removeAttribute(`aria-busy`));
}
async function finishRecording(e) {
  let t = rec;
  rec = null;
  ((recordTime.textContent = ``),
    recordButton.setAttribute(`aria-pressed`, `false`),
    recordButton.removeAttribute(`aria-busy`));
  t.audio && (await t.audio.stop());
  if (!t.muxer || !t.samples) {
    ((h.textContent = `Nothing was recorded.`),
      h.classList.add(`visible`),
      setTimeout(() => h.classList.remove(`visible`), 2600));
    return;
  }
  let n;
  try {
    (t.muxer.finalize(), (n = new Blob([t.muxer.target.buffer], { type: `video/mp4` })));
  } catch (e) {
    (console.warn(`mux`, e),
      (h.textContent = `Could not finish the clip.`),
      h.classList.add(`visible`),
      setTimeout(() => h.classList.remove(`visible`), 2600));
    return;
  }
  (clipUrl && URL.revokeObjectURL(clipUrl), (clipUrl = URL.createObjectURL(n)));
  clipFile = new File([n], `fray-${fabric}.mp4`, { type: `video/mp4` });
  shred.startedAt && !shred.frozenAt && (shred.frozenAt = performance.now());
  let r = shareText();
  ((sheetVideo.src = clipUrl),
    (sheetVideo.hidden = !1),
    (sheetImg.hidden = !0),
    (sheetText.textContent = r),
    (sheetX.href = `https://x.com/intent/post?text=${encodeURIComponent(r)}`),
    (sheetSave.href = clipUrl),
    (sheetSave.download = clipFile.name),
    (sheetSave.textContent = `Save video`),
    (sheetHint.hidden = !1),
    (sheetShare.hidden = !(navigator.canShare && navigator.canShare({ files: [clipFile] }))),
    (sheet.dataset.kind = `video`),
    (sheet.hidden = !1),
    sheetVideo.play().catch(() => {}),
    sheetX.focus());
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
  if (!e || !/^image\//.test(e.type)) return;
  let t;
  try {
    t = await createImageBitmap(e);
  } catch {
    ((h.textContent = `That image could not be read.`),
      h.classList.add(`visible`),
      setTimeout(() => h.classList.remove(`visible`), 2600));
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
  ((h.textContent =
    fabric === `linen` || fabric === `gauze` || fabric === `chiffon`
      ? `Printed. Now rip it.`
      : `Printed. Now rip it (linen shows a print best).`),
    h.classList.add(`visible`),
    setTimeout(() => h.classList.remove(`visible`), 3200));
}
async function sendPrint() {
  if (!printCanvas) return;
  let e = await createImageBitmap(printCanvas);
  C({ type: `print`, bitmap: e }, [e]);
}
function clearPrint() {
  ((printCanvas = null), (printClear.parentElement.hidden = !0), C({ type: `print`, bitmap: null }));
}
(printPick.addEventListener(`click`, () => {
  (P(!1), printInput.click());
}),
  printClear.addEventListener(`click`, () => {
    (P(!1), clearPrint());
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
