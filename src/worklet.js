const e = { fracture: 0, pan: 1, cuts: 2 };
function t(e) {
  return 1 + e * 3;
}
const n = {
    segments: [
      [0.58, 1.13],
      [2.4, 2.75],
      [3.87, 5.02],
    ],
    grain: 0.1,
    levelTime: 0.06,
    referenceRate: 60,
    maxGain: 2,
    rateTime: 0.035,
    tearWindow: 0.1,
    attack: 0.006,
    tail: 0.18,
  },
  r = 0.7,
  i = (e) => ({
    held: e,
    rate: 0,
    idle: 1 / 0,
    target: 0,
    gain: 0,
    pan: 0,
    panTarget: 0,
    panSet: !1,
    pos: [-1, -1],
    age: 0,
  });
var a = class {
  sampleRate;
  seed;
  source = null;
  total = 0;
  voices;
  grain;
  window;
  attackK;
  tailK;
  panK;
  env = 0;
  limGain = 1;
  limAttack;
  limRelease;
  constructor(e, t = 2654435769, r = !0) {
    ((this.sampleRate = e),
      (this.seed = t >>> 0 || 1),
      (this.voices = Array.from({ length: 4 }, () => i(r))),
      (this.grain = 2 * Math.round((n.grain * e) / 2)),
      (this.window = Float32Array.from({ length: this.grain }, (e, t) => Math.sin((Math.PI * (t + 0.5)) / this.grain))),
      (this.attackK = 1 - Math.exp(-1 / (n.attack * e))),
      (this.tailK = 1 - Math.exp(-Math.log(1e3) / (n.tail * e))),
      (this.panK = 1 - Math.exp(-1 / (0.06 * e))),
      (this.limAttack = Math.exp(-1 / (8e-4 * e))),
      (this.limRelease = Math.exp(-1 / (0.25 * e))));
  }
  setSource(e) {
    ((this.total = e.starts.reduce((e, [t, n]) => e + n - t + 1, 0)), (this.source = this.total > 0 ? e : null));
  }
  get idle() {
    return this.voices.every((e) => e.pos[0] < 0 && e.target === 0);
  }
  grip(e, t) {
    let n = this.voices[e];
    // Fractures can arrive after release, or come from tools without a grip.
    // The measured energy and tear window control the sound's lifetime.
    n && (n.held = t);
  }
  reset() {
    ((this.voices = Array.from({ length: 4 }, () => i(!1))), (this.env = 0), (this.limGain = 1));
  }
  push(r) {
    // Damage heard only after the recording loads would be detached from the gesture.
    if (!this.source) return;
    let i = n,
      a = 0;
    for (let e = 0; e + 13 <= r.length; e += 13) a += r[e];
    if (!(a > 0)) return;
    let o = 1 - Math.exp(-a / i.rateTime);
    for (let n = 0; n < 4; n++) {
      let s = this.voices[n];
      let c = 0,
        l = 0,
        u = NaN;
      for (let i = 0; i + 13 <= r.length; i += 13) {
        let a = i + t(n);
        ((c += r[a + e.fracture]), (l += r[a + e.cuts]), r[a + e.fracture] > 0 && (u = r[a + e.pan]));
      }
      ((s.rate += o * (c / a - s.rate)),
        (c > 0 || l > 0) && (s.idle = 0),
        Number.isNaN(u) ||
          ((s.panTarget = 0.5 * Math.max(-1, Math.min(1, u))), s.panSet || (s.pan = s.panTarget), (s.panSet = !0)),
        (s.target = s.idle < i.tearWindow ? Math.min(i.maxGain, Math.sqrt(Math.max(0, s.rate) / i.referenceRate)) : 0));
    }
  }
  rand() {
    let e = this.seed;
    return ((e ^= e << 13), (e ^= e >>> 17), (e ^= e << 5), (this.seed = e >>> 0), (this.seed + 0.5) / 4294967296);
  }
  slice() {
    let e = this.source.starts,
      t = Math.floor(this.rand() * this.total);
    for (let [n, r] of e) {
      if (t <= r - n) return n + t;
      t -= r - n + 1;
    }
    return e[0][0];
  }
  process(e, t) {
    (e.fill(0), t.fill(0));
    let i = this.source;
    if (!i) return;
    let a = e.length,
      s = this.grain,
      c = s / 2,
      l = this.window,
      u = i.pcm,
      d = !1;
    for (let r of this.voices) {
      if (r.pos[0] < 0) {
        if (r.target === 0) continue;
        ((r.pos[0] = this.slice()), (r.pos[1] = this.slice()), (r.age = 0), (r.gain = 0));
      }
      ((d = !0), (r.idle += a / this.sampleRate), r.idle >= n.tearWindow && (r.target = 0));
      for (let n = 0; n < a; n++) {
        ((r.gain += (r.target > r.gain ? this.attackK : this.tailK) * (r.target - r.gain)),
          (r.pan += this.panK * (r.panTarget - r.pan)));
        let a = r.age,
          o = a < c ? a + c : a - c,
          d = (u[r.pos[0] + a] * l[a] + u[r.pos[1] + o] * l[o]) * r.gain * i.level,
          f = (r.pan + 1) * 0.25 * Math.PI;
        ((e[n] += d * Math.cos(f) * Math.SQRT2),
          (t[n] += d * Math.sin(f) * Math.SQRT2),
          ++r.age === c ? (r.pos[1] = this.slice()) : r.age === s && ((r.age = 0), (r.pos[0] = this.slice())));
      }
      r.target === 0 && r.gain < 1e-4 && ((r.pos[0] = -1), (r.rate = 0), r.held || (r.panSet = !1));
    }
    if (!d) return;
    let f = this.env,
      p = this.limGain;
    for (let n = 0; n < a; n++) {
      let i = Math.max(Math.abs(e[n]), Math.abs(t[n]));
      f = i > f ? i : f * this.limRelease + i * (1 - this.limRelease);
      let a = f > r ? r / f : 1;
      ((p = a < p ? a + (p - a) * this.limAttack : a + (p - a) * this.limRelease),
        (e[n] = o(e[n] * p)),
        (t[n] = o(t[n] * p)));
    }
    ((this.env = f), (this.limGain = p));
  }
};
function o(e) {
  let t = Math.abs(e);
  if (t <= 0.8) return e;
  let n = 0.8 + 0.2 * Math.tanh((t - 0.8) / 0.2);
  return e < 0 ? -n : n;
}
var s = class extends AudioWorkletProcessor {
  voice = new a(sampleRate, (Math.random() * 4294967296) >>> 0, !1);
  records = null;
  constructor() {
    (super(),
      (this.port.onmessage = (e) => {
        if (`source` in e.data) {
          this.voice.setSource(e.data.source);
          return;
        }
        if (this.records) {
          this.records.onmessage = null;
          this.records.close();
        }
        this.voice.reset();
        this.records = e.data.records;
        this.records.onmessage = (e) => {
          let t = e.data;
          t instanceof Float32Array
            ? this.voice.push(t)
            : t.reset
              ? this.voice.reset()
              : this.voice.grip(t.grip, t.held);
        };
      }));
  }
  process(e, t) {
    let n = t[0];
    return (n.length === 2 && this.voice.process(n[0], n[1]), !0);
  }
};
registerProcessor(`tear-voice`, s);
