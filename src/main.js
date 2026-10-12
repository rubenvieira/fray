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
        t.resume().catch(() => {}),
        (this.starting = t.audioWorklet
          .addModule(e)
          .then(() => {
            let e = new AudioWorkletNode(t, `tear-voice`, {
              numberOfInputs: 0,
              numberOfOutputs: 1,
              outputChannelCount: [2],
            });
            e.connect(t.destination);
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
          (r.connect(i).connect(t.destination),
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
          ((i.buffer = r), i.connect(t.destination));
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
        o.connect(s).connect(e.destination),
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
  fabric = `denim`,
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
function bindCanvas(m) {
  (m.addEventListener(`pointerdown`, (e) => {
    (e.pointerType !== `mouse` || e.button === 0) && (w.unlock(), m.setPointerCapture(e.pointerId), j(`down`, e));
  }),
    m.addEventListener(`pointermove`, (e) => {
      let t = e.getCoalescedEvents?.() ?? [];
      t.length === 0 && j(`move`, e);
      for (let e of t) j(`move`, e);
    }),
    m.addEventListener(`pointerup`, (e) => {
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
  e.key === `Escape` && (N() && (P(!1), v.focus()), M(e.timeStamp));
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
    (w.unlock(), P(!1), C({ type: `reset` }), g.classList.remove(`spin`), g.offsetWidth, g.classList.add(`spin`));
  }));
function setTool(e) {
  (toolButton.setAttribute(`aria-pressed`, String(e === `blade`)), C({ type: `tool`, tool: e }));
}
toolButton.addEventListener(`click`, () => {
  (w.unlock(), P(!1), setTool(toolButton.getAttribute(`aria-pressed`) === `true` ? `hand` : `blade`));
});
window.addEventListener(`keydown`, (e) => {
  e.key.toLowerCase() === `k` && !e.metaKey && !e.ctrlKey && !e.altKey && toolButton.click();
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
        : t.type === `stats` && (window.__fabricStats = t.stats);
}
function onWorkerError(e) {
  (x(`The fabric engine stopped unexpectedly.`), console.error(e));
}
// The engine lives in a worker that owns the canvas. A fabric switch starts a new worker (the GPU
// device and every buffer go with the old one) on a fresh canvas, since an OffscreenCanvas can be
// transferred only once, and re-wires the tear-sound channel and the pointer tool to it.
function startWorker(name) {
  fabric = name;
  if (S) {
    (S.terminate(), w.cue({ kind: `stop` }));
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
    toolButton.getAttribute(`aria-pressed`) === `true` && C({ type: `tool`, tool: `blade` }));
}
startWorker(fabric);
