import { targetSpeed } from "./hand.js";

var e = class extends Error {};
const t = {
  maxStorageBuffersPerShaderStage: 10,
  maxComputeWorkgroupStorageSize: 32768,
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupSizeX: 256,
  maxStorageBufferBindingSize: 268435456,
  maxBufferSize: 536870912,
  maxComputeWorkgroupsPerDimension: 65535,
};
async function n(n) {
  if (!n) throw new e(`WebGPU is not available in this browser.`);
  let r = await n.requestAdapter({ powerPreference: `high-performance` });
  if (!r) throw new e(`No WebGPU adapter.`);
  let i = {};
  for (let [n, a] of Object.entries(t)) {
    let t = r.limits[n];
    if (t < a) throw new e(`GPU limit ${n}=${t} is below the required ${a}.`);
    i[n] = a;
  }
  let a = r.features.has(`timestamp-query`);
  return {
    adapter: r,
    device: await r.requestDevice({ requiredLimits: i, requiredFeatures: a ? [`timestamp-query`] : [] }),
    timestamps: a,
  };
}
const r = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  i = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
function a(e, t, n, i = r) {
  return e.createBuffer({ label: t, size: Math.max(16, s(n, 16)), usage: i });
}
function o(e, t, n, i = r) {
  let o = a(e, t, n.byteLength, i);
  return (e.queue.writeBuffer(o, 0, n.buffer, n.byteOffset, n.byteLength), o);
}
function s(e, t) {
  return Math.ceil(e / t) * t;
}
const c = /* @__PURE__ */ new WeakMap();
function l(e, t, n) {
  let r = c.get(e);
  r || ((r = /* @__PURE__ */ new Map()), c.set(e, r));
  let i = r.get(n);
  if (i) return i;
  let a = e.createShaderModule({ label: t, code: n });
  return (
    r.set(n, a),
    a.getCompilationInfo().then((e) => {
      let r = n.split(`
`);
      for (let n of e.messages) {
        if (n.type === `info`) continue;
        let e = r.slice(Math.max(0, n.lineNum - 3), n.lineNum + 1).join(`
`);
        console[n.type === `error` ? `error` : `warn`](`[${t}] ${n.type} ${n.lineNum}:${n.linePos} ${n.message}\n${e}`);
      }
    }),
    a
  );
}
async function u(e, t, n = t.size, r = 0) {
  let i = e.createBuffer({ size: n, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }),
    a = e.createCommandEncoder();
  (a.copyBufferToBuffer(t, r, i, 0, n), e.queue.submit([a.finish()]), await i.mapAsync(GPUMapMode.READ));
  let o = i.getMappedRange().slice(0);
  return (i.unmap(), i.destroy(), o);
}
function d(e) {
  let t = /* @__PURE__ */ new Map(),
    n = /@group\(0\)\s*@binding\((\d+)\)\s*var<([^>]+)>/g;
  for (let r = n.exec(e); r; r = n.exec(e)) {
    let e = r[2].replace(/\s/g, ``),
      n = e === `uniform` ? `uniform` : e.includes(`read_write`) ? `storage` : `read-only-storage`;
    t.set(Number(r[1]), n);
  }
  return t;
}
var f = class {
  layout;
  pipelineLayout;
  bindings;
  module;
  dummies = /* @__PURE__ */ new Map();
  pipelines = /* @__PURE__ */ new Map();
  device;
  label;
  constructor(e, t, n) {
    ((this.device = e),
      (this.label = t),
      (this.bindings = d(n)),
      (this.layout = e.createBindGroupLayout({
        label: t,
        entries: [...this.bindings].map(([e, t]) => ({
          binding: e,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: t },
        })),
      })),
      (this.pipelineLayout = e.createPipelineLayout({ label: t, bindGroupLayouts: [this.layout] })),
      (this.module = l(e, t, n)));
  }
  pipeline(e) {
    let t = this.pipelines.get(e);
    return (
      t ||
        ((t = this.device.createComputePipeline({
          label: `${this.label}.${e}`,
          layout: this.pipelineLayout,
          compute: { module: this.module, entryPoint: e },
        })),
        this.pipelines.set(e, t)),
      t
    );
  }
  dummy(e, t) {
    let n = this.dummies.get(e);
    return (
      n ||
        ((n = this.device.createBuffer({
          label: `${this.label}.dummy${e}`,
          size: t === `uniform` ? 4096 : 65536,
          usage: t === `uniform` ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE,
        })),
        this.dummies.set(e, n)),
      n
    );
  }
  bindGroup(e, t) {
    let n = [];
    for (let [e, r] of this.bindings) {
      let i = t[e],
        a = i ? (i instanceof GPUBuffer ? { buffer: i } : i) : { buffer: this.dummy(e, r) };
      n.push({ binding: e, resource: a });
    }
    for (let e of Object.keys(t)) if (!this.bindings.has(Number(e))) throw Error(`${this.label}: no binding ${e}`);
    return this.device.createBindGroup({ label: e, layout: this.layout, entries: n });
  }
};
const p = 18e-8,
  m = {
    id: 0,
    name: `denim-3x1`,
    pitchU: 38e-5,
    pitchV: 58e-5,
    yarns: [
      {
        linearDensity: 6e-5,
        eaLow: 6,
        eaHigh: 140,
        crimpStrain: 0.03,
        eaCompress: 3,
        axialViscosity: 2e-4,
        bendRigidity: 4e-8,
        bendViscosity: 0.02,
        strength: 8.5,
        softeningOpening: 4e-4,
        width: 4e-4,
        height: 16e-5,
        crimpAmplitude: 0,
      },
      {
        linearDensity: 84e-6,
        eaLow: 10,
        eaHigh: 180,
        crimpStrain: 0.025,
        eaCompress: 5,
        axialViscosity: 2e-4,
        bendRigidity: 45e-9,
        bendViscosity: 0.02,
        strength: 11,
        softeningOpening: 4e-4,
        width: 7e-4,
        height: 26e-5,
        crimpAmplitude: 13e-5,
      },
    ],
    twillRepeat: 4,
    twillWarpOver: 3,
    shearStiffness: 60,
    crossingFriction: 0.35,
    crossingNormal0: 0.25,
    crossingWrap: 0.3,
    thickness: 7e-4,
    clothFriction: 0.45,
    airDrag: 1.5,
  },
  // Hessian (burlap): a plain weave of coarse single jute yarns, ~9.5 per cm each way, ~300 g/m2. Jute is
  // stiff and brittle next to cotton (little crimp, no stretch past a couple of percent) and the open
  // weave shears freely. Strengths are kept near the denim's so it still tears by hand.
  burlap = {
    id: 1,
    name: `burlap-plain`,
    pitchU: 1.05e-3,
    pitchV: 1.05e-3,
    yarns: [
      {
        linearDensity: 1.55e-4,
        eaLow: 12,
        eaHigh: 260,
        crimpStrain: 0.02,
        eaCompress: 4,
        axialViscosity: 2e-4,
        bendRigidity: 1.6e-7,
        bendViscosity: 0.02,
        strength: 9,
        softeningOpening: 2.5e-4,
        width: 9e-4,
        height: 3.6e-4,
        crimpAmplitude: 1.4e-4,
      },
      {
        linearDensity: 1.65e-4,
        eaLow: 14,
        eaHigh: 280,
        crimpStrain: 0.02,
        eaCompress: 4,
        axialViscosity: 2e-4,
        bendRigidity: 1.8e-7,
        bendViscosity: 0.02,
        strength: 9.5,
        softeningOpening: 2.5e-4,
        width: 9e-4,
        height: 3.6e-4,
        crimpAmplitude: 1.4e-4,
      },
    ],
    twillRepeat: 2,
    twillWarpOver: 1,
    shearStiffness: 20,
    crossingFriction: 0.5,
    crossingNormal0: 0.15,
    crossingWrap: 0.3,
    thickness: 1e-3,
    clothFriction: 0.55,
    airDrag: 2.2,
  },
  // a yarn preset with the denim's viscosities and softening unless overridden
  yarnOf = (e) => ({
    eaCompress: 4,
    axialViscosity: 2e-4,
    bendViscosity: 0.02,
    softeningOpening: 3e-4,
    ...e,
  }),
  // Tartan: worsted wool in a 2/2 twill, each yarn one colour of the sett (the renderer colours yarn i
  // by its place in the sett, warp and weft alike, which is what makes the plaid). Wool is soft,
  // stretchy and weak next to cotton, and very hairy.
  tartan = {
    id: 2,
    name: `tartan-2x2`,
    pitchU: 7e-4,
    pitchV: 7e-4,
    yarns: [
      yarnOf({
        linearDensity: 8.5e-5,
        eaLow: 3,
        eaHigh: 60,
        crimpStrain: 0.05,
        bendRigidity: 2e-8,
        strength: 6,
        width: 6.5e-4,
        height: 3e-4,
        crimpAmplitude: 1e-4,
      }),
      yarnOf({
        linearDensity: 8.5e-5,
        eaLow: 3,
        eaHigh: 60,
        crimpStrain: 0.05,
        bendRigidity: 2e-8,
        strength: 6.2,
        width: 6.5e-4,
        height: 3e-4,
        crimpAmplitude: 1e-4,
      }),
    ],
    twillRepeat: 4,
    twillWarpOver: 2,
    shearStiffness: 30,
    crossingFriction: 0.45,
    crossingNormal0: 0.18,
    crossingWrap: 0.3,
    thickness: 8e-4,
    clothFriction: 0.5,
    airDrag: 1.8,
  },
  // Satin: a 5-harness silk satin (warp over four of five picks). Fine, stiff filament yarns with no
  // hair and little crimp; the long floats shear easily and a rip runs straight along them.
  satin = {
    id: 3,
    name: `satin-5`,
    pitchU: 4.5e-4,
    pitchV: 5e-4,
    yarns: [
      yarnOf({
        linearDensity: 3.2e-5,
        eaLow: 8,
        eaHigh: 200,
        crimpStrain: 0.012,
        bendRigidity: 5e-9,
        strength: 5,
        width: 4.6e-4,
        height: 1.6e-4,
        crimpAmplitude: 6e-5,
        softeningOpening: 1.5e-4,
      }),
      yarnOf({
        linearDensity: 3e-5,
        eaLow: 8,
        eaHigh: 200,
        crimpStrain: 0.01,
        bendRigidity: 5e-9,
        strength: 5,
        width: 4.2e-4,
        height: 1.5e-4,
        crimpAmplitude: 3e-5,
        softeningOpening: 1.5e-4,
      }),
    ],
    twillRepeat: 5,
    twillWarpOver: 4,
    shearStiffness: 25,
    crossingFriction: 0.2,
    crossingNormal0: 0.12,
    crossingWrap: 0.25,
    thickness: 3.5e-4,
    clothFriction: 0.3,
    airDrag: 1.4,
  },
  // Linen: an undyed plain-weave flax canvas. Strong, crisp yarns with slubs; firmer than denim.
  linen = {
    id: 4,
    name: `linen-plain`,
    pitchU: 6e-4,
    pitchV: 6e-4,
    yarns: [
      yarnOf({
        linearDensity: 9e-5,
        eaLow: 8,
        eaHigh: 220,
        crimpStrain: 0.03,
        bendRigidity: 6e-8,
        strength: 10,
        width: 5.5e-4,
        height: 2.5e-4,
        crimpAmplitude: 1.1e-4,
      }),
      yarnOf({
        linearDensity: 9e-5,
        eaLow: 8,
        eaHigh: 220,
        crimpStrain: 0.03,
        bendRigidity: 6e-8,
        strength: 10.5,
        width: 5.5e-4,
        height: 2.5e-4,
        crimpAmplitude: 1.1e-4,
      }),
    ],
    twillRepeat: 2,
    twillWarpOver: 1,
    shearStiffness: 45,
    crossingFriction: 0.4,
    crossingNormal0: 0.2,
    crossingWrap: 0.3,
    thickness: 6e-4,
    clothFriction: 0.45,
    airDrag: 1.6,
  },
  // Chiffon: a sheer plain-weave silk of very fine crepe yarns. Light as a leaf, weak, and tears
  // like tissue; the open sett lets the floor show through.
  chiffon = {
    id: 5,
    name: `chiffon-plain`,
    pitchU: 4e-4,
    pitchV: 4e-4,
    yarns: [
      yarnOf({
        linearDensity: 1.1e-5,
        eaLow: 2,
        eaHigh: 70,
        crimpStrain: 0.02,
        bendRigidity: 1.5e-9,
        strength: 1.6,
        width: 1.8e-4,
        height: 9e-5,
        crimpAmplitude: 4e-5,
        softeningOpening: 1e-4,
      }),
      yarnOf({
        linearDensity: 1.1e-5,
        eaLow: 2,
        eaHigh: 70,
        crimpStrain: 0.02,
        bendRigidity: 1.5e-9,
        strength: 1.6,
        width: 1.8e-4,
        height: 9e-5,
        crimpAmplitude: 4e-5,
        softeningOpening: 1e-4,
      }),
    ],
    twillRepeat: 2,
    twillWarpOver: 1,
    shearStiffness: 6,
    crossingFriction: 0.25,
    crossingNormal0: 0.04,
    crossingWrap: 0.2,
    thickness: 1.5e-4,
    clothFriction: 0.3,
    airDrag: 3,
  },
  // Gauze (cheesecloth): a very open plain weave of soft, slack cotton yarns. Flimsy, the weave
  // slides and ladders before it breaks.
  gauze = {
    id: 6,
    name: `gauze-plain`,
    pitchU: 1.4e-3,
    pitchV: 1.4e-3,
    yarns: [
      yarnOf({
        linearDensity: 3.5e-5,
        eaLow: 3,
        eaHigh: 80,
        crimpStrain: 0.04,
        bendRigidity: 6e-9,
        strength: 3,
        width: 4.5e-4,
        height: 2.2e-4,
        crimpAmplitude: 1.2e-4,
      }),
      yarnOf({
        linearDensity: 3.5e-5,
        eaLow: 3,
        eaHigh: 80,
        crimpStrain: 0.04,
        bendRigidity: 6e-9,
        strength: 3,
        width: 4.5e-4,
        height: 2.2e-4,
        crimpAmplitude: 1.2e-4,
      }),
    ],
    twillRepeat: 2,
    twillWarpOver: 1,
    shearStiffness: 4,
    crossingFriction: 0.3,
    crossingNormal0: 0.05,
    crossingWrap: 0.2,
    thickness: 4.5e-4,
    clothFriction: 0.45,
    airDrag: 2.6,
  },
  // Lamé: the satin's weave with a metallic gold warp (the sheen is the point).
  lame = {
    id: 7,
    name: `lame-satin`,
    pitchU: 4.5e-4,
    pitchV: 5e-4,
    yarns: [
      yarnOf({
        linearDensity: 3.4e-5,
        eaLow: 8,
        eaHigh: 220,
        crimpStrain: 0.012,
        bendRigidity: 6e-9,
        strength: 5.5,
        width: 4.6e-4,
        height: 1.6e-4,
        crimpAmplitude: 6e-5,
        softeningOpening: 1.5e-4,
      }),
      yarnOf({
        linearDensity: 3.6e-5,
        eaLow: 10,
        eaHigh: 260,
        crimpStrain: 0.008,
        bendRigidity: 8e-9,
        strength: 6,
        width: 4.2e-4,
        height: 1.4e-4,
        crimpAmplitude: 3e-5,
        softeningOpening: 1.5e-4,
      }),
    ],
    twillRepeat: 5,
    twillWarpOver: 4,
    shearStiffness: 28,
    crossingFriction: 0.18,
    crossingNormal0: 0.12,
    crossingWrap: 0.25,
    thickness: 3.5e-4,
    clothFriction: 0.28,
    airDrag: 1.4,
  },
  // Ballistic nylon: a dense 2x2 basket-like weave of heavy filament yarns, as strong as it gets. The
  // challenge fabric: it stretches, it hums, it very nearly does not tear.
  ballistic = {
    id: 8,
    name: `ballistic-2x2`,
    pitchU: 5.5e-4,
    pitchV: 5.5e-4,
    yarns: [
      yarnOf({
        linearDensity: 1.2e-4,
        eaLow: 20,
        eaHigh: 420,
        crimpStrain: 0.015,
        bendRigidity: 4e-8,
        strength: 34,
        width: 5.2e-4,
        height: 2.4e-4,
        crimpAmplitude: 8e-5,
        softeningOpening: 5e-4,
      }),
      yarnOf({
        linearDensity: 1.2e-4,
        eaLow: 20,
        eaHigh: 420,
        crimpStrain: 0.015,
        bendRigidity: 4e-8,
        strength: 36,
        width: 5.2e-4,
        height: 2.4e-4,
        crimpAmplitude: 8e-5,
        softeningOpening: 5e-4,
      }),
    ],
    twillRepeat: 4,
    twillWarpOver: 2,
    shearStiffness: 80,
    crossingFriction: 0.35,
    crossingNormal0: 0.3,
    crossingWrap: 0.35,
    thickness: 6e-4,
    clothFriction: 0.4,
    airDrag: 1.5,
  };
function h(e, t, n = t) {
  for (let e of [t, n])
    if (!Number.isInteger(e) || e < 1) throw Error(`bundle factors must be positive integers, got ${t}, ${n}`);
  if (t === 1 && n === 1) return e;
  let r = (e, t) => ({
      ...e,
      linearDensity: t * e.linearDensity,
      eaLow: t * e.eaLow,
      eaHigh: t * e.eaHigh,
      eaCompress: t * e.eaCompress,
      axialViscosity: t * e.axialViscosity,
      bendRigidity: t * e.bendRigidity,
      strength: t * e.strength,
      yarnsPerSpan: t,
    }),
    i = (e, t) => (e * e + t * t) / (e * t);
  return {
    ...e,
    name: `${e.name}/b${t}x${n}`,
    pitchU: t * e.pitchU,
    pitchV: n * e.pitchV,
    yarns: [r(e.yarns[0], n), r(e.yarns[1], t)],
    shearStiffness: (e.shearStiffness * i(t * e.pitchU, n * e.pitchV)) / i(e.pitchU, e.pitchV),
    crossingNormal0: t * n * e.crossingNormal0,
  };
}
function g(e) {
  return e.yarns[0].linearDensity * e.pitchU + e.yarns[1].linearDensity * e.pitchV;
}
var _ = `// Shared definitions for the mechanics kernels. Pure functions only (no bindings).

struct Yarn {
  eaLow: f32,
  eaHigh: f32,
  crimpStrain: f32,
  eaCompress: f32,
  axialVisc: f32,
  bendRigidity: f32,
  bendVisc: f32,
  // parallel yarns per lattice span (scales the crossing wrap force of a sliding bundle)
  yarnsPerSpan: f32,
};

struct LayerMat {
  // offset, nx, ny, unused
  lattice: vec4<u32>,
  yarn: array<Yarn, 2>,
  // shearStiffness, crossingFriction, crossingWrap, pitchU
  a: vec4<f32>,
  // pitchV, normal air drag (N s / m^3), crossing normal force of intact weave (N), thickness (m)
  b: vec4<f32>,
};

struct SimParams {
  // h, gx, gy, gz
  hg: vec4<f32>,
  // node count, layer count, history updates enabled (damage, slip; 0 while settling a drape),
  // history tolerance (f32 bits): largest last Newton update at which a node may advance history
  counts: vec4<u32>,
  layers: array<LayerMat, 3>,
  // floor contact (floorLowest): height (m), contact distance beyond the half thickness (m), penalty
  // stiffness (N/m), friction coefficient
  floor: vec4<f32>,
  // friction regularization speed (m/s), 1 if the floor collides, unused...
  floorAux: vec4<f32>,
};

struct NodeStatic {
  // i | j << 12 | layer << 24
  ijl: u32,
  // bit0 pinned
  flags: u32,
  mass: f32,
  // crossing normal force at zero tension (wear-reduced), N
  n0: f32,
};

struct Seg {
  rest: f32,
  // fraction of the span's yarn load capacity that is intact (yarn damage field, yarnfield.wgsl)
  intact: f32,
  // softening opening of its yarns past their peak (m)
  soft: f32,
  // bit q: bundled yarn q has separated within the span
  cutMask: u32,
  spare0: f32,
  // SEG_* bits
  flags: u32,
  // where a separated span split into tails (fraction from the owner)
  failSite: f32,
  spare1: u32,
};

const SEG_EXISTS: u32 = 1u;
const SEG_BROKEN: u32 = 2u;
// broken by crossing slip, its yarns still to part at the end they slid out of (scene.ts SEG_SLIPPED)
const SEG_SLIPPED: u32 = 8u;
const NODE_PINNED: u32 = 1u;

struct LevelInfo {
  // node count, layer count, unused, unused
  counts: vec4<u32>,
  // (offset, nx, ny, 0) per layer
  layers: array<vec4<u32>, 3>,
};

// ---------------------------------------------------------------- axial law (mirrors axial.ts)

fn axialTension(y: Yarn, eps: f32) -> f32 {
  if (eps <= 0.0) { return y.eaCompress * eps; }
  let ec = y.crimpStrain;
  let dk = y.eaHigh - y.eaLow;
  if (eps <= ec) { return y.eaLow * eps + dk * eps * eps / (2.0 * ec); }
  return y.eaLow * ec + dk * ec * 0.5 + y.eaHigh * (eps - ec);
}

fn axialStiffness(y: Yarn, eps: f32) -> f32 {
  if (eps <= 0.0) { return y.eaCompress; }
  let ec = y.crimpStrain;
  if (eps <= ec) { return y.eaLow + (y.eaHigh - y.eaLow) * eps / ec; }
  return y.eaHigh;
}

// Undamaged strain energy per unit rest length (axial.ts axialEnergyDensity).
fn axialEnergyDensity(y: Yarn, eps: f32) -> f32 {
  if (eps <= 0.0) { return 0.5 * y.eaCompress * eps * eps; }
  let ec = y.crimpStrain;
  let dk = y.eaHigh - y.eaLow;
  if (eps <= ec) { return 0.5 * y.eaLow * eps * eps + dk * eps * eps * eps / (6.0 * ec); }
  let tc = y.eaLow * ec + dk * ec * 0.5;
  let d = eps - ec;
  return 0.5 * y.eaLow * ec * ec + dk * ec * ec / 6.0 + tc * d + 0.5 * y.eaHigh * d * d;
}

// Strain at which the undamaged curve reaches tension t > 0 (cancellation-free quadratic root).
fn strainAtTension(y: Yarn, t: f32) -> f32 {
  let ec = y.crimpStrain;
  let dk = y.eaHigh - y.eaLow;
  let tc = y.eaLow * ec + dk * ec * 0.5;
  if (t >= tc) { return ec + (t - tc) / y.eaHigh; }
  let a = dk / (2.0 * ec);
  return 2.0 * t / (y.eaLow + sqrt(y.eaLow * y.eaLow + 4.0 * a * t));
}

// Damage of one yarn of a bundled span (axial.ts yarnDamage): triangular cohesive law on the yarn's
// own tension (peak peakY, softening over softStrain); y is the bundle law of B yarns, the yarn keeps
// the fraction area of its fibres.
fn yarnDamage(y: Yarn, B: f32, area: f32, peakY: f32, softStrain: f32, eps: f32) -> f32 {
  let ep = strainAtTension(y, peakY * B / area);
  if (eps <= ep) { return 0.0; }
  if (eps >= ep + softStrain) { return 1.0; }
  let tEnv = peakY * (1.0 - (eps - ep) / softStrain);
  let tEl = area * axialTension(y, eps) / B;
  return clamp(1.0 - tEnv / max(tEl, 1e-12), 0.0, 1.0);
}

// Tension and tangent of a span with intact yarn fraction s.intact (axial.ts spanResponse).
fn spanResponse(y: Yarn, s: Seg, eps: f32) -> vec2<f32> {
  return s.intact * vec2<f32>(axialTension(y, eps), axialStiffness(y, eps));
}

// Finiteness by bit pattern (immune to fast-math assumptions about NaN).
fn finite1(v: f32) -> bool { return (bitcast<u32>(v) & 0x7f800000u) != 0x7f800000u; }
fn finite3(v: vec3<f32>) -> bool { return finite1(v.x) && finite1(v.y) && finite1(v.z); }

// Inverse of an SPD pivot block, regularized relative to its scale: in f32 a Schur complement can
// lose all of its inertia digits next to stiff yarn terms (exact cancellation); the shift keeps the
// preconditioner finite and positive definite.
fn pivotInverse(m: mat3x3<f32>) -> mat3x3<f32> {
  let s = max(max(abs(m[0][0]), abs(m[1][1])), abs(m[2][2]));
  let e = 2e-6 * s + 1e-30;
  let r = m + mat3x3<f32>(vec3<f32>(e, 0.0, 0.0), vec3<f32>(0.0, e, 0.0), vec3<f32>(0.0, 0.0, e));
  let inv = inverse3(r);
  if (!finite3(inv[0]) || !finite3(inv[1]) || !finite3(inv[2])) {
    let d = 1.0 / max(s, 1e-30);
    return mat3x3<f32>(vec3<f32>(d, 0.0, 0.0), vec3<f32>(0.0, d, 0.0), vec3<f32>(0.0, 0.0, d));
  }
  return inv;
}

// ---------------------------------------------------------------- fold-stiffening bending

// Bending energy of a yarn triple: 0.5 kb Psi(q), q = |x_a - 2 x_b + x_c|^2, a = 4 Lm^2 (fold
// stiffening, see src/simulation/laws.ts, mirrored exactly here).
const BEND_S0: f32 = 0.85;

// (Psi, Psi', Psi'') at q.
fn bendPsi(q: f32, a: f32) -> vec3<f32> {
  let s = q / a;
  if (s < BEND_S0) {
    let d = 1.0 - s;
    return vec3<f32>(q / d, 1.0 / (d * d), 2.0 / (a * d * d * d));
  }
  let d0 = 1.0 - BEND_S0;
  let q0 = BEND_S0 * a;
  let p1 = 1.0 / (d0 * d0);
  let p2 = 2.0 / (a * d0 * d0 * d0);
  let t = q - q0;
  return vec3<f32>(q0 / d0 + p1 * t + 0.5 * p2 * t * t, p1 + p2 * t, p2);
}

// Bending geometry of a triple with rest spans La (a-b) and Lc (b-c) (laws.ts bendGeometry):
// r = wa x_a - 2 x_b + wc x_c; returns (wa, wc, 1 / (Lh^2 l), fold scale 4 Lh^2).
fn bendGeometry(La: f32, Lc: f32) -> vec4<f32> {
  let s = La + Lc;
  let lh = 2.0 * La * Lc / s;
  return vec4<f32>(2.0 * Lc / s, 2.0 * La / s, 1.0 / (lh * lh * 0.5 * s), 4.0 * lh * lh);
}

// Share of a bundle's bending rigidity carried through the middle node (laws.ts bendScale): only
// yarns uncut in both spans are continuous.
fn bendScale(ia: f32, ic: f32, maskA: u32, maskC: u32, B: u32) -> f32 {
  let full = select((1u << B) - 1u, 0xFFFFFFFFu, B >= 32u);
  let cont = countOneBits(~(maskA | maskC) & full);
  if (cont == 0u) { return 0.0; }
  let ua = countOneBits(~maskA & full);
  let uc = countOneBits(~maskC & full);
  let fb = f32(B);
  let ma = select(0.0, ia * fb / f32(ua), ua > 0u);
  let mc = select(0.0, ic * fb / f32(uc), uc > 0u);
  return f32(cont) / fb * min(ma, mc);
}

// Psi(q1) - Psi(q0) without cancellation (dq = q1 - q0 computed stably; laws.ts bendPsiDelta): a
// product with dq on both branches, exactly zero for dq = 0.
fn bendPsiDelta(q0: f32, q1: f32, dq: f32, a: f32) -> f32 {
  let s0 = q0 / a;
  let s1 = q1 / a;
  if (s0 < BEND_S0 && s1 < BEND_S0) { return dq / ((1.0 - s0) * (1.0 - s1)); }
  let qb = BEND_S0 * a;
  let d0 = 1.0 - BEND_S0;
  let p1 = 1.0 / (d0 * d0);
  let p2 = 2.0 / (a * d0 * d0 * d0);
  if (s0 >= BEND_S0 && s1 >= BEND_S0) { return dq * (p1 + 0.5 * p2 * ((q0 - qb) + (q1 - qb))); }
  let lo = min(q0, q1);
  let t = max(q0, q1) - qb;
  let up = (qb - lo) / ((1.0 - lo / a) * d0) + t * (p1 + 0.5 * p2 * t);
  return select(-up, up, q1 >= q0);
}

// Shear-locking diagonal (see shearLaw in src/simulation/laws.ts): (force, tangent stiffness).
const SHEAR_JAM: f32 = 0.16;
const SHEAR_RAMP: f32 = 0.08;
const SHEAR_LOCK: f32 = 40.0;
const SHEAR_COS0: f32 = sqrt(1.0 - (1.0 - (1.0 - SHEAR_JAM) * (1.0 - SHEAR_JAM)) * (1.0 - (1.0 - SHEAR_JAM) * (1.0 - SHEAR_JAM)));

// Diagonal strain at which a cell jams, from the remaining yarn cross-section (laws.ts shearJam).
fn shearJam(area: f32) -> f32 {
  let c = SHEAR_COS0 * sqrt(clamp(area, 0.02, 1.0));
  return 1.0 - sqrt(1.0 - sqrt(1.0 - c * c));
}

// Cross-section of a cell's yarns from the intact fractions of its spans (laws.ts cellArea).
fn cellArea(cu: f32, tu: f32, cv: f32, rv: f32) -> f32 { return max(0.5 * (cu + tu), 0.5 * (cv + rv)); }

fn shearLaw(ks: f32, jam: f32, Ld: f32, l: f32) -> vec2<f32> {
  var f = ks * (l - Ld);
  var k = ks;
  let c = (Ld - l) / Ld - jam;
  if (c > 0.0) {
    let extra = ks * (SHEAR_LOCK - 1.0);
    if (c < SHEAR_RAMP) {
      f -= extra * Ld * c * c / (2.0 * SHEAR_RAMP);
      k += extra * c / SHEAR_RAMP;
    } else {
      f -= extra * Ld * (c - 0.5 * SHEAR_RAMP);
      k += extra;
    }
  }
  return vec2<f32>(f, k);
}


fn segActive(s: Seg) -> bool {
  return (s.flags & (SEG_EXISTS | SEG_BROKEN)) == SEG_EXISTS;
}

// ---------------------------------------------------------------- floor contact

// The cloth on the floor (SimParams.floor): a node at height z within its contact distance delta (half its
// layer's thickness plus the rendered surface's bulge) of the plane at fz takes the cubic penalty of
// self-contact, E = k s^3 / (3 delta) at depth s = delta - (z - fz), and regularized Coulomb friction on
// its step (the floor is at rest). Assembled with the node's own terms (assemble.wgsl), its quadratic
// model in the line search (energy.wgsl), and bounded in every update (step.wgsl floorBound).

// Lowest height a node's iterate may reach from its height zLin in one update: never closer to the
// plane than half its thickness (the cloth's underside stays above the floor), and no deeper into the
// contact distance than twice its depth now or the depth sWeight that carries its weight (the trust
// region of the linearized cubic penalty, as selfcontact.wgsl terms). Never above zLin (the bound only
// limits approach). A node falling onto the floor stops there within one substep (inelastic).
fn floorLowest(zLin: f32, fz: f32, delta: f32, halfThickness: f32, sWeight: f32) -> f32 {
  let s = max(delta - (zLin - fz), 0.0);
  return min(max(fz + delta - max(sWeight, 2.0 * s), fz + halfThickness), zLin);
}

// Depth into the contact distance at which the penalty k s^2 / delta carries a node of mass m.
fn floorWeightDepth(m: f32, g: f32, delta: f32, k: f32) -> f32 {
  return sqrt(m * g * delta / k);
}

// ---------------------------------------------------------------- rigid rotation

// R(th) r - r - th x r: what rotating r by the rotation vector th adds to its tangent step th x r
// (Rodrigues, without forming R r). A detached piece's rigid part of a step moves along it (rigid_spin.wgsl,
// energy.wgsl, rigid_apply.wgsl rigidCurve): along the tangent alone its spans stretch by |th|^2 / 2.
fn rotationCurve(th: vec3<f32>, r: vec3<f32>) -> vec3<f32> {
  let phi = length(th);
  if (phi < 1e-9) { return vec3<f32>(0.0); }
  let k = th / phi;
  let kr = cross(k, r);
  return (sin(phi) - phi) * kr + (1.0 - cos(phi)) * cross(k, kr);
}

// ---------------------------------------------------------------- symmetric 3x3 blocks

// d = (xx, yy, zz), o = (xy, xz, yz)
struct Sym {
  d: vec3<f32>,
  o: vec3<f32>,
};

fn symZero() -> Sym { return Sym(vec3<f32>(0.0), vec3<f32>(0.0)); }
fn symId(s: f32) -> Sym { return Sym(vec3<f32>(s), vec3<f32>(0.0)); }
fn symAdd(a: Sym, b: Sym) -> Sym { return Sym(a.d + b.d, a.o + b.o); }
fn symScale(a: Sym, s: f32) -> Sym { return Sym(a.d * s, a.o * s); }
fn symMul(a: Sym, v: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    a.d.x * v.x + a.o.x * v.y + a.o.y * v.z,
    a.o.x * v.x + a.d.y * v.y + a.o.z * v.z,
    a.o.y * v.x + a.o.z * v.y + a.d.z * v.z);
}
fn symMat(a: Sym) -> mat3x3<f32> {
  return mat3x3<f32>(vec3<f32>(a.d.x, a.o.x, a.o.y), vec3<f32>(a.o.x, a.d.y, a.o.z), vec3<f32>(a.o.y, a.o.z, a.d.z));
}
fn symFrob(a: Sym) -> f32 { return sqrt(dot(a.d, a.d) + 2.0 * dot(a.o, a.o)); }
fn symIsZero(a: Sym) -> bool { return all(a.d == vec3<f32>(0.0)) && all(a.o == vec3<f32>(0.0)); }

// kPar e e^T + kPerp (I - e e^T)
fn axialBlock(kPar: f32, kPerp: f32, e: vec3<f32>) -> Sym {
  let dk = kPar - kPerp;
  return Sym(dk * e * e + vec3<f32>(kPerp), dk * vec3<f32>(e.x * e.y, e.x * e.z, e.y * e.z));
}

fn inverse3(m: mat3x3<f32>) -> mat3x3<f32> {
  let a = m[0];
  let b = m[1];
  let c = m[2];
  let r0 = cross(b, c);
  let r1 = cross(c, a);
  let r2 = cross(a, b);
  let invDet = 1.0 / dot(a, r0);
  return transpose(mat3x3<f32>(r0 * invDet, r1 * invDet, r2 * invDet));
}

// ---------------------------------------------------------------- lattice helpers

// Returns (i, j, layer) of node n in a level.
fn levelCoords(lv: LevelInfo, n: u32) -> vec3<u32> {
  var l = 0u;
  for (var k = 1u; k < lv.counts.y; k++) {
    if (n >= lv.layers[k].x) { l = k; }
  }
  let L = lv.layers[l];
  let local = n - L.x;
  return vec3<u32>(local % L.y, local / L.y, l);
}

// Node at (i, j) in layer l, or -1 outside the lattice.
fn levelNode(lv: LevelInfo, l: u32, i: i32, j: i32) -> i32 {
  let L = lv.layers[l];
  if (i < 0 || j < 0 || i >= i32(L.y) || j >= i32(L.z)) { return -1; }
  return i32(L.x) + j * i32(L.y) + i;
}

// Coarse index set for one coarsening of extent n: 2I, except the last which is n - 1.
fn coarseCount(n: u32) -> u32 { return n / 2u + 1u; }
fn coarseToFine(I: u32, n: u32) -> u32 { return min(2u * I, n - 1u); }

// Bracketing coarse indices of fine index i: (lo, hi) and weights (wlo, whi). whi = 0 when exact.
struct Bracket {
  lo: u32,
  hi: u32,
  wlo: f32,
  whi: f32,
};
fn bracketOf(i: u32, n: u32) -> Bracket {
  let nc = coarseCount(n);
  var lo = min(nc - 1u, i >> 1u);
  if (coarseToFine(lo, n) > i) { lo = lo - 1u; }
  let a = coarseToFine(lo, n);
  if (a == i) { return Bracket(lo, lo, 1.0, 0.0); }
  let b = coarseToFine(lo + 1u, n);
  let inv = 1.0 / f32(b - a);
  return Bracket(lo, lo + 1u, f32(b - i) * inv, f32(i - a) * inv);
}

// ---------------------------------------------------------------- acoustic emission (src/audio)

// Slots of the counters buffer that accumulate what the mechanics release audibly during one
// substep (the engine copies and clears them after every substep; decoded by src/audio/record.ts).
// One block of ACOUSTIC_STRIDE slots per sound source (one per finger: an emission belongs to the
// nearest held grip, interaction.ts), at ACOUSTIC + ACOUSTIC_STRIDE * source:
// +0 strain energy released by fibre fracture (1e-5 J/m), +1..3 fracture-weighted position sum
// (mm x damage code, i32), +4 its weight (damage codes), +5 yarns cut through (count). Only tearing is
// heard: no slip, pull-out or settling sound.
const ACOUSTIC: u32 = 16u;
const ACOUSTIC_STRIDE: u32 = 6u;

// Sound source of an emission at p: the nearest anchor in use (w > 0), else the first.
fn nearestSource(p: vec3<f32>, anchors: array<vec4<f32>, 4>) -> u32 {
  var best = 0u;
  var bestD = 1e30;
  for (var s = 0u; s < 4u; s++) {
    let a = anchors[s];
    if (a.w <= 0.0) { continue; }
    let d = dot(p - a.xyz, p - a.xyz);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

fn acousticSlot(source: u32, field: u32) -> u32 { return ACOUSTIC + ACOUSTIC_STRIDE * source + field; }
`,
  v = `// Self-contact of a cloth layer: a node against a face (an intact lattice cell, as the two triangles
// c00 c10 c11 and c00 c11 c01). Penalty E = k (delta - d)^3 / (3 delta) on the distance d from the node
// to the face: force k s^2 / delta and stiffness 2 k s / delta at depth s = delta - d, both zero where
// contact begins (the surface fibres compress progressively; the Newton step is limited to where that
// linearization holds, terms). Lagged-normal regularized Coulomb friction acts on their relative step.
// The node takes the force, the face's corners the reaction by the closest point's barycentric weights
// (momentum is conserved). Contributions are scattered with fixed-point integer atomics (WGSL has no float
// atomics) and gathered into ext; the Newton operator sees them as diagonal blocks.
//
// Faces are hashed by centroid once per substep at the predicted iterate (and at the start of the
// substep when that is another cell). Detection keeps each node's K nearest faces within reach and an
// OGC-style directional bound, relative between node and face: against the first face the node's
// predicted path crosses, else the nearest face at the start of the substep, the node's step may close
// only a share of the clearance down to a hard core, and the face's corners may close no more than the
// same share toward it (resolveBounds). Together they never close the gap, so no force (a hand pulling
// cloth up through a flap, a flap swinging onto a strand) carries one through the other, while sliding
// stays free. Faces within two lattice cells of a node, and still linked to it through surviving
// spans, are ignored: on a 3.4 mm lattice they cannot meet it short of an impossibly tight fold, and
// bounding against them would throttle every fast pull of the sheet. Across a tear they are another
// lip or flap and are tested like any other face.

const K: u32 = 4u;
const NONE: u32 = 0xFFFFFFFFu;
// fixed-point scales of the accumulated gradient (N) and Hessian (N/m)
const GS: f32 = 1e8;
const HS: f32 = 1e3;
// accumulator words per node: gradient xyz, Hessian xx xy xz yy yz zz
const ACC: u32 = 9u;
// separation a node never closes toward a face within one substep, m
const HARD_CORE: f32 = 0.3e-3;

struct SelfU {
  // hash cell size (m), table mask (u32 bits), detection reach (m), contact distance delta (m)
  grid: vec4<f32>,
  // penalty stiffness (N/m), friction coefficient, friction regularization speed (m/s), bound fraction
  law: vec4<f32>,
};

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<uniform> SU: SelfU;
@group(0) @binding(2) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(3) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> dx: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> segs: array<Seg>;
// hash table: [0, T) cell counts, scanned into start offsets; [T, 2T) fill cursors
@group(0) @binding(6) var<storage, read_write> cells: array<atomic<u32>>;
// per hashed face, 2 vec4: its centroid now and a radius bounding it now and at the start of the
// substep (w), its centroid at the start of the substep and the face index (w, exact below 2^24)
@group(0) @binding(7) var<storage, read_write> items: array<vec4<f32>>;
// K candidate faces per node, then per node: the reciprocal-bound key (detect, resolveBounds) and the
// damage mark of its lattice row (damageRow)
@group(0) @binding(8) var<storage, read_write> pairs: array<atomic<u32>>;
// 2 per node: the node's own bound (unit normal away from the face, largest approach along it) and the
// reciprocal bound of a face corner (direction toward the bounded node, largest motion along it);
// zero normal: unbounded
@group(0) @binding(9) var<storage, read_write> cmeta: array<vec4<f32>>;
@group(0) @binding(10) var<storage, read_write> acc: array<atomic<i32>>;
@group(0) @binding(11) var<storage, read_write> ext: array<vec4<f32>>; // 3 per node

fn tableMask() -> u32 { return bitcast<u32>(SU.grid.y); }
fn cur(n: u32) -> vec3<f32> { return x[n].xyz + dx[n].xyz; }
// a node of the solve: cloth or a detached piece (not retired)
fn cloth(n: u32) -> bool { return x[n].w < 1.5; }

fn hashCell(c: vec3<i32>) -> u32 {
  let h = (u32(c.x) * 73856093u) ^ (u32(c.y) * 19349663u) ^ (u32(c.z) * 83492791u);
  return h & tableMask();
}
fn cellOf(p: vec3<f32>) -> vec3<i32> { return vec3<i32>(floor(p / SU.grid.x)); }

// Corners (c00, c10, c01, c11) of the face with lower-left node f.
fn corners(f: u32) -> vec4<u32> {
  let L = P.layers[nodes[f].ijl >> 24u].lattice;
  return vec4<u32>(f, f + 1u, f + L.y, f + L.y + 1u);
}

// An intact cell of the cloth: all four spans hold and all corners are in the solve.
fn faceValid(f: u32) -> bool {
  let ijl = nodes[f].ijl;
  let L = P.layers[ijl >> 24u].lattice;
  let i = ijl & 0xFFFu;
  let j = (ijl >> 12u) & 0xFFFu;
  if (i + 1u >= L.y || j + 1u >= L.z) { return false; }
  let c = corners(f);
  if (!cloth(c.x) || !cloth(c.y) || !cloth(c.z) || !cloth(c.w)) { return false; }
  return segActive(segs[2u * c.x]) && segActive(segs[2u * c.x + 1u]) && segActive(segs[2u * c.y + 1u]) && segActive(segs[2u * c.z]);
}

fn centroid(c: vec4<u32>) -> vec3<f32> { return 0.25 * (cur(c.x) + cur(c.y) + cur(c.z) + cur(c.w)); }

// Closest point of triangle (a, b, c) to p: barycentric weights (wa, wb, wc) and squared distance.
fn closestTri(p: vec3<f32>, a: vec3<f32>, b: vec3<f32>, c: vec3<f32>) -> vec4<f32> {
  let ab = b - a;
  let ac = c - a;
  let ap = p - a;
  let d1 = dot(ab, ap);
  let d2 = dot(ac, ap);
  var w = vec3<f32>(1.0, 0.0, 0.0);
  if (d1 <= 0.0 && d2 <= 0.0) {
    w = vec3<f32>(1.0, 0.0, 0.0);
  } else {
    let bp = p - b;
    let d3 = dot(ab, bp);
    let d4 = dot(ac, bp);
    let cp = p - c;
    let d5 = dot(ab, cp);
    let d6 = dot(ac, cp);
    let vc = d1 * d4 - d3 * d2;
    let vb = d5 * d2 - d1 * d6;
    let va = d3 * d6 - d5 * d4;
    if (d3 >= 0.0 && d4 <= d3) {
      w = vec3<f32>(0.0, 1.0, 0.0);
    } else if (d6 >= 0.0 && d5 <= d6) {
      w = vec3<f32>(0.0, 0.0, 1.0);
    } else if (vc <= 0.0 && d1 >= 0.0 && d3 <= 0.0) {
      let v = d1 / (d1 - d3);
      w = vec3<f32>(1.0 - v, v, 0.0);
    } else if (vb <= 0.0 && d2 >= 0.0 && d6 <= 0.0) {
      let v = d2 / (d2 - d6);
      w = vec3<f32>(1.0 - v, 0.0, v);
    } else if (va <= 0.0 && (d4 - d3) >= 0.0 && (d5 - d6) >= 0.0) {
      let v = (d4 - d3) / ((d4 - d3) + (d5 - d6));
      w = vec3<f32>(0.0, 1.0 - v, v);
    } else {
      let den = 1.0 / (va + vb + vc);
      let wb = vb * den;
      let wc = vc * den;
      w = vec3<f32>(1.0 - wb - wc, wb, wc);
    }
  }
  let q = w.x * a + w.y * b + w.z * c;
  let e = p - q;
  return vec4<f32>(w, dot(e, e));
}

struct FaceHit {
  // corner weights (c00, c10, c01, c11)
  w: vec4<f32>,
  q: vec3<f32>,
  d: f32,
};

fn faceHit(p: vec3<f32>, c: vec4<u32>) -> FaceHit {
  return faceHitP(p, cur(c.x), cur(c.y), cur(c.z), cur(c.w));
}

// The same at the start of the substep (accepted positions).
fn faceHitAt(p: vec3<f32>, c: vec4<u32>) -> FaceHit {
  return faceHitP(p, x[c.x].xyz, x[c.y].xyz, x[c.z].xyz, x[c.w].xyz);
}

fn faceHitP(p: vec3<f32>, p00: vec3<f32>, p10: vec3<f32>, p01: vec3<f32>, p11: vec3<f32>) -> FaceHit {
  let t1 = closestTri(p, p00, p10, p11);
  let t2 = closestTri(p, p00, p11, p01);
  var o: FaceHit;
  if (t1.w <= t2.w) {
    o.w = vec4<f32>(t1.x, t1.y, 0.0, t1.z);
    o.d = sqrt(t1.w);
  } else {
    o.w = vec4<f32>(t2.x, 0.0, t2.z, t2.y);
    o.d = sqrt(t2.w);
  }
  o.q = o.w.x * p00 + o.w.y * p10 + o.w.z * p01 + o.w.w * p11;
  return o;
}

// ---------------------------------------------------------------- detection (once per substep)

// A face is hashed by its centroid at the predicted iterate and, when that lies in another cell, also
// by its centroid at the start of the substep: a node's search near its start position finds the faces
// that were near it then, however fast they move.
fn hashFace(f: u32) -> vec2<u32> {
  let c = corners(f);
  let h1 = hashCell(cellOf(centroid(c)));
  let c0 = cellOf(0.25 * (x[c.x].xyz + x[c.y].xyz + x[c.z].xyz + x[c.w].xyz));
  let h0 = select(hashCell(c0), NONE, all(c0 == cellOf(centroid(c))));
  return vec2<u32>(h1, h0);
}

@compute @workgroup_size(128)
fn faceCount(@builtin(global_invocation_id) gid: vec3<u32>) {
  let f = gid.x;
  if (f >= P.counts.x || !faceValid(f)) { return; }
  let h = hashFace(f);
  atomicAdd(&cells[h.x], 1u);
  if (h.y != NONE) { atomicAdd(&cells[h.y], 1u); }
}

// After the exclusive scan, cells[0, T) holds start offsets.
@compute @workgroup_size(128)
fn faceFill(@builtin(global_invocation_id) gid: vec3<u32>) {
  let f = gid.x;
  if (f >= P.counts.x || !faceValid(f)) { return; }
  let c = corners(f);
  // bounding spheres for the query's rejection test (one radius bounds both)
  let a0 = x[c.x].xyz;
  let b0 = x[c.y].xyz;
  let e0 = x[c.z].xyz;
  let g0 = x[c.w].xyz;
  let a1 = a0 + dx[c.x].xyz;
  let b1 = b0 + dx[c.y].xyz;
  let e1 = e0 + dx[c.z].xyz;
  let g1 = g0 + dx[c.w].xyz;
  let m0 = 0.25 * (a0 + b0 + e0 + g0);
  let m1 = 0.25 * (a1 + b1 + e1 + g1);
  let r0 = max(max(dot(a0 - m0, a0 - m0), dot(b0 - m0, b0 - m0)), max(dot(e0 - m0, e0 - m0), dot(g0 - m0, g0 - m0)));
  let r1 = max(max(dot(a1 - m1, a1 - m1), dot(b1 - m1, b1 - m1)), max(dot(e1 - m1, e1 - m1), dot(g1 - m1, g1 - m1)));
  let i1 = vec4<f32>(m1, sqrt(max(r0, r1)));
  let i0 = vec4<f32>(m0, f32(f));
  let h = hashFace(f);
  let slot = atomicLoad(&cells[h.x]) + atomicAdd(&cells[tableMask() + 1u + h.x], 1u);
  items[2u * slot] = i1;
  items[2u * slot + 1u] = i0;
  if (h.y != NONE) {
    let s0 = atomicLoad(&cells[h.y]) + atomicAdd(&cells[tableMask() + 1u + h.y], 1u);
    items[2u * s0] = i1;
    items[2u * s0 + 1u] = i0;
  }
}

// Distance from point q to segment (a, b).
fn segDist(q: vec3<f32>, a: vec3<f32>, b: vec3<f32>) -> f32 {
  let e = b - a;
  let s = clamp(dot(q - a, e) / max(dot(e, e), 1e-20), 0.0, 1.0);
  return length(q - a - s * e);
}

// Segment (o, o + d) against triangle (a, b, c): the segment parameter of the crossing, or 2 if none.
fn segTri(o: vec3<f32>, d: vec3<f32>, a: vec3<f32>, b: vec3<f32>, c: vec3<f32>) -> f32 {
  let e1 = b - a;
  let e2 = c - a;
  let p = cross(d, e2);
  let det = dot(e1, p);
  if (abs(det) < 1e-18) { return 2.0; }
  let inv = 1.0 / det;
  let s = o - a;
  let u = dot(s, p) * inv;
  if (u < 0.0 || u > 1.0) { return 2.0; }
  let q = cross(s, e1);
  let v = dot(d, q) * inv;
  if (v < 0.0 || u + v > 1.0) { return 2.0; }
  let t = dot(e2, q) * inv;
  return select(2.0, t, t >= 0.0 && t <= 1.0);
}

// Where the node's predicted path (o, o + d) first crosses the face with corners c, at its start
// positions or at its predicted ones (2 if it does not).
fn pathCrossing(o: vec3<f32>, d: vec3<f32>, c: vec4<u32>) -> f32 {
  let a0 = x[c.x].xyz;
  let b0 = x[c.y].xyz;
  let e0 = x[c.z].xyz;
  let g0 = x[c.w].xyz;
  var t = min(segTri(o, d, a0, b0, g0), segTri(o, d, a0, g0, e0));
  t = min(t, min(segTri(o, d, cur(c.x), cur(c.y), cur(c.w)), segTri(o, d, cur(c.x), cur(c.w), cur(c.z))));
  return t;
}

// Lattice node (i, j) of layer offset/stride L.
fn latticeNode(L: vec4<u32>, i: i32, j: i32) -> u32 { return L.x + u32(j) * L.y + u32(i); }

// Surviving material along a lattice row (fixed j) from i0 to i1, or a column (fixed i) from j0 to j1.
fn rowHolds(L: vec4<u32>, j: i32, i0: i32, i1: i32) -> bool {
  for (var i = min(i0, i1); i < max(i0, i1); i++) {
    let a = latticeNode(L, i, j);
    if (!segActive(segs[2u * a]) || !cloth(a) || !cloth(a + 1u)) { return false; }
  }
  return true;
}
fn columnHolds(L: vec4<u32>, i: i32, j0: i32, j1: i32) -> bool {
  for (var j = min(j0, j1); j < max(j0, j1); j++) {
    let a = latticeNode(L, i, j);
    if (!segActive(segs[2u * a + 1u]) || !cloth(a) || !cloth(a + L.y)) { return false; }
  }
  return true;
}

// Whether node (ni, nj) still reaches face (fi, fj) through surviving spans along either L-shaped
// lattice path to the face's nearest corner. Such a face (within the exclusion window) is the node's own
// cloth and cannot meet it short of an impossibly tight fold; across a tear it is another lip or flap,
// and a contact face like any other.
fn latticeLinked(L: vec4<u32>, ni: i32, nj: i32, fi: i32, fj: i32) -> bool {
  let ci = clamp(ni, fi, fi + 1);
  let cj = clamp(nj, fj, fj + 1);
  if (rowHolds(L, nj, ni, ci) && columnHolds(L, ci, nj, cj)) { return true; }
  return columnHolds(L, ni, nj, cj) && rowHolds(L, cj, ni, ci);
}

// Exclusion window reach in lattice cells (detect skips linked faces with di, dj in [-3, 2]; their
// linking paths run through nodes within 3 cells).
const WINDOW: i32 = 3;

// Per node: whether any crossing within WINDOW along its lattice row has a broken span or left the
// cloth. detect reads the marks of the 2 WINDOW + 1 rows around a node: without damage there, every
// face in its exclusion window is its own intact cloth and needs no linking test.
@compute @workgroup_size(128)
fn damageRow(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let ijl = nodes[n].ijl;
  let L = P.layers[ijl >> 24u].lattice;
  let i = i32(ijl & 0xFFFu);
  let j = i32((ijl >> 12u) & 0xFFFu);
  var mark = 0u;
  for (var a = max(i - WINDOW, 0); a <= min(i + WINDOW, i32(L.y) - 1); a++) {
    let m = latticeNode(L, a, j);
    let fu = segs[2u * m].flags;
    let fv = segs[2u * m + 1u].flags;
    if (x[m].w > 0.5 || (fu & SEG_BROKEN) != 0u || (fv & SEG_BROKEN) != 0u) { mark = 1u; }
  }
  atomicStore(&pairs[(K + 1u) * P.counts.x + n], mark);
}

// Bound of the reciprocal pass: (4095 - share in 10 um) << 20 | (node + 1); the largest key is the
// tightest share (ties: any node), zero means none.
const RECIP_UNIT: f32 = 1e-5;

@compute @workgroup_size(128)
fn detect(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  for (var k = 0u; k < K; k++) { atomicStore(&pairs[K * n + k], NONE); }
  // retired nodes are out of the scene
  if ((nodes[n].flags & NODE_PINNED) != 0u || x[n].w > 1.5) {
    cmeta[2u * n] = vec4<f32>(0.0, 0.0, 0.0, 1e9);
    return;
  }
  let p = cur(n);
  let p0 = x[n].xyz;
  let path = p - p0;
  let moving = dot(path, path) > HARD_CORE * HARD_CORE;
  let reach = SU.grid.z;
  let cell = SU.grid.x;
  let T = tableMask() + 1u;
  var best: array<u32, 4>;
  var bestD: array<f32, 4>;
  for (var k = 0u; k < K; k++) {
    best[k] = NONE;
    bestD[k] = 1e9;
  }
  // nearest face at the start of the substep (positions x): the bound's normal and clearance
  var d0min = 1e9;
  var n0 = vec3<f32>(0.0);
  var f0 = NONE;
  // the first face the predicted path crosses: its plane bounds the step instead
  var tc = 2.0;
  var fc = NONE;
  // every hash cell within half a cell of the predicted path: each face centroid within half a cell of
  // its start or end (a slow node scans the 2 x 2 x 2 cells nearest to it; a path over 2.5 cells is
  // covered from its start)
  let lo = vec3<i32>(floor(min(p, p0) / cell - 0.5));
  let hi = min(vec3<i32>(floor(max(p, p0) / cell + 0.5)), lo + vec3<i32>(3));
  // faces near the node in the lattice (their nearest corner within two cells) and still linked to it
  // through surviving spans: skipped
  let ijl = nodes[n].ijl;
  let ni = i32(ijl & 0xFFFu);
  let nj = i32((ijl >> 12u) & 0xFFFu);
  let nl = ijl >> 24u;
  let NL = P.layers[nl].lattice;
  var damaged = false;
  for (var b = max(nj - WINDOW, 0); b <= min(nj + WINDOW, i32(NL.z) - 1); b++) {
    if (atomicLoad(&pairs[(K + 1u) * P.counts.x + latticeNode(NL, ni, b)]) != 0u) { damaged = true; }
  }
  for (var cz = lo.z; cz <= hi.z; cz++) {
    for (var cy = lo.y; cy <= hi.y; cy++) {
      for (var cx = lo.x; cx <= hi.x; cx++) {
        let h = hashCell(vec3<i32>(cx, cy, cz));
        let start = atomicLoad(&cells[h]);
        let count = atomicLoad(&cells[T + h]);
        for (var q = 0u; q < count; q++) {
          // the closest-point distance is never below |p - centroid| - radius: faces that cannot
          // matter (beyond the reach now, no nearer than the bound's best at the start, off the path)
          // are rejected from their compact record without touching their corners
          let i1 = items[2u * (start + q)];
          let i0 = items[2u * (start + q) + 1u];
          let nearNow = length(p - i1.xyz) - i1.w < reach;
          let nearStart = length(p0 - i0.xyz) - i1.w < min(d0min, 0.5 * cell);
          let onPath = moving && min(segDist(i0.xyz, p0, p), segDist(i1.xyz, p0, p)) < i1.w;
          if (!nearNow && !nearStart && !onPath) { continue; }
          let f = u32(i0.w);
          let fijl = nodes[f].ijl;
          let di = i32(fijl & 0xFFFu) - ni;
          let dj = i32((fijl >> 12u) & 0xFFFu) - nj;
          if ((fijl >> 24u) == nl && di >= -3 && di <= 2 && dj >= -3 && dj <= 2 && (!damaged || latticeLinked(NL, ni, nj, ni + di, nj + dj))) { continue; }
          let cf = corners(f);
          // ties (a closest point on an edge two faces share) go to the lower face index: the result
          // must not depend on the order the hash was filled in
          if (nearStart) {
            let s0 = faceHitAt(p0, cf);
            if ((s0.d < d0min || (s0.d == d0min && f < f0)) && s0.d > 1e-9) {
              d0min = s0.d;
              n0 = (p0 - s0.q) / s0.d;
              f0 = f;
            }
          }
          if (onPath) {
            let t = pathCrossing(p0, path, cf);
            if (t < tc || (t == tc && t <= 1.0 && f < fc)) {
              tc = t;
              fc = f;
            }
          }
          if (!nearNow) { continue; }
          let hit = faceHit(p, cf);
          if (hit.d >= reach) { continue; }
          var cand = f;
          var cd = hit.d;
          for (var k = 0u; k < K; k++) {
            if (cand == best[k]) { break; }
            if (cd < bestD[k] || (cd == bestD[k] && cand < best[k])) {
              let ts = best[k];
              let td = bestD[k];
              best[k] = cand;
              bestD[k] = cd;
              cand = ts;
              cd = td;
            }
          }
        }
      }
    }
  }
  for (var k = 0u; k < K; k++) { atomicStore(&pairs[K * n + k], best[k]); }
  // the bound: against the first face the predicted path crosses (its plane, on the side the node
  // starts on), else against the nearest face at the start
  var nb = n0;
  var db = d0min;
  var fb = f0;
  if (fc != NONE && fc != f0) {
    let c = corners(fc);
    let a = x[c.x].xyz;
    var nrm = cross(x[c.y].xyz - a, x[c.z].xyz - a);
    let ln = length(nrm);
    if (ln > 1e-12) {
      nrm /= ln;
      let side = dot(p0 - a, nrm);
      nb = select(-nrm, nrm, side >= 0.0);
      db = abs(side);
      fb = fc;
    }
  }
  if (fb == NONE || (fb == f0 && db >= 0.5 * cell)) {
    cmeta[2u * n] = vec4<f32>(0.0, 0.0, 0.0, 1e9);
    return;
  }
  // approach toward the face limited to a share of the clearance above the hard core; the face's
  // corners may close no more than the same share toward the node (resolveBounds), so together they
  // never close the clearance
  let share = SU.law.w * max(db - HARD_CORE, 0.0);
  cmeta[2u * n] = vec4<f32>(nb, share);
  let key = ((4095u - min(4095u, u32(share / RECIP_UNIT))) << 20u) | (n + 1u);
  let c = corners(fb);
  let base = K * P.counts.x;
  atomicMax(&pairs[base + c.x], key);
  atomicMax(&pairs[base + c.y], key);
  atomicMax(&pairs[base + c.z], key);
  atomicMax(&pairs[base + c.w], key);
}

// Reciprocal bounds: a node that is the corner of a face some node bounds itself against may not move
// toward that node by more than the same share (the tightest such node; its normal from its own bound).
// Clears the reciprocal keys for the next substep.
@compute @workgroup_size(128)
fn resolveBounds(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let key = atomicExchange(&pairs[K * P.counts.x + n], 0u);
  if (key == 0u) {
    cmeta[2u * n + 1u] = vec4<f32>(0.0, 0.0, 0.0, 1e9);
    return;
  }
  let j = (key & 0xFFFFFu) - 1u;
  let share = f32(4095u - (key >> 20u)) * RECIP_UNIT;
  cmeta[2u * n + 1u] = vec4<f32>(-cmeta[2u * j].xyz, share);
}

// ---------------------------------------------------------------- terms (every Newton iteration)

fn addTerm(n: u32, g: vec3<f32>, H: mat3x3<f32>) {
  let b = ACC * n;
  let gq = clamp(g * GS, vec3<f32>(-2e9), vec3<f32>(2e9));
  atomicAdd(&acc[b], i32(gq.x));
  atomicAdd(&acc[b + 1u], i32(gq.y));
  atomicAdd(&acc[b + 2u], i32(gq.z));
  let hq = array<f32, 6>(H[0].x, H[0].y, H[0].z, H[1].y, H[1].z, H[2].z);
  for (var k = 0u; k < 6u; k++) { atomicAdd(&acc[b + 3u + k], i32(clamp(hq[k] * HS, -2e9, 2e9))); }
}

@compute @workgroup_size(128)
fn terms(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let p = cur(n);
  let delta = SU.grid.w;
  let kc = SU.law.x;
  let mu = SU.law.y;
  let epsU = SU.law.z * P.hg.x;
  let I3 = mat3x3<f32>(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0));
  let own = cmeta[2u * n];
  // how far this iteration's step may still approach along the node's bound normal (trust region below)
  var reach = 1e9;
  // depth at which the penalty carries the node's weight
  let sWeight = sqrt(nodes[n].mass * length(P.hg.yzw) * delta / kc);
  for (var k = 0u; k < K; k++) {
    let f = atomicLoad(&pairs[K * n + k]);
    if (f == NONE) { continue; }
    let c = corners(f);
    let hit = faceHit(p, c);
    if (hit.d <= 1e-9) { continue; }
    let nn = (p - hit.q) / hit.d;
    let a = dot(nn, own.xyz);
    if (a > 0.1) { reach = min(reach, (hit.d - delta + max(sWeight, 2.0 * max(delta - hit.d, 0.0))) / a); }
    if (hit.d >= delta) { continue; }
    let s = delta - hit.d;
    let lam = kc * s * s / delta;
    let nnT = mat3x3<f32>(nn * nn.x, nn * nn.y, nn * nn.z);
    // friction on the step relative to the face's material point
    let rel = dx[n].xyz - (hit.w.x * dx[c.x].xyz + hit.w.y * dx[c.y].xyz + hit.w.z * dx[c.z].xyz + hit.w.w * dx[c.w].xyz);
    let ut = rel - dot(rel, nn) * nn;
    let kf = mu * lam / max(length(ut), epsU);
    let g = -lam * nn + kf * ut;
    let H = (2.0 * kc * s / delta) * nnT + kf * (I3 - nnT);
    // The operator takes contact as diagonal blocks only (the node-face coupling is non-local), so
    // node and face each answer the contact force on their own. With the exact blocks (H on the node,
    // w^2 H on a corner of weight w) a corner would correct by gap / w and the pair would overshoot
    // and chatter. The stiffness is split instead so that the independent corrections add up to the
    // closure the exact pair would make: 2 H on the node (half the gap) and 2 w H on each corner (the
    // other half, by the barycentric weights).
    addTerm(n, g, 2.0 * H);
    var cs = array<u32, 4>(c.x, c.y, c.z, c.w);
    var ws = array<f32, 4>(hit.w.x, hit.w.y, hit.w.z, hit.w.w);
    for (var q = 0u; q < 4u; q++) {
      if (ws[q] <= 0.0) { continue; }
      addTerm(cs[q], -ws[q] * g, (2.0 * ws[q]) * H);
    }
  }
  // Trust region of the linearized penalty: a step may take the node no deeper into a contact distance
  // than twice its depth now, or the depth that carries its weight (its bound tightened to there for the
  // rest of the substep; step.wgsl newtonApply). Its curvature grows with depth (zero at the onset), so
  // beyond that the Newton model understates it without bound: one iteration took a free node outside
  // contact as deep as gravity carried it (h^2 g = 0.68 mm per substep), and a light strand lying on
  // cloth sank 0.4 mm, was kicked back by 0.25 N and bounced in a cycle two iterations never converged
  // (8 were needed). Within the region the model's curvature is at least half the true one; a node the
  // forces press deeper gets there over successive iterations and substeps.
  if (reach < 1e9 && any(own.xyz != vec3<f32>(0.0))) {
    let approach = -dot(dx[n].xyz, own.xyz);
    cmeta[2u * n] = vec4<f32>(own.xyz, min(own.w, approach + reach));
  }
}

// Accumulated terms into ext (the grip adds its own afterwards); the accumulator is cleared.
@compute @workgroup_size(128)
fn gather(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let b = ACC * n;
  var v: array<f32, 9>;
  for (var k = 0u; k < ACC; k++) {
    let a = atomicExchange(&acc[b + k], 0);
    v[k] = f32(a) / select(HS, GS, k < 3u);
  }
  ext[3u * n] = vec4<f32>(v[0], v[1], v[2], 0.0);
  ext[3u * n + 1u] = vec4<f32>(v[3], v[4], v[5], v[6]);
  ext[3u * n + 2u] = vec4<f32>(v[7], v[8], 0.0, 0.0);
}
`,
  y = `// Exclusive prefix sum over u32 counts in blocks of 512 (two elements per thread), with a block-sum
// array for the next level. Levels are chained by the host until one block remains.

const BLOCK: u32 = 512u;

@group(0) @binding(0) var<uniform> S: vec4<u32>; // x: element count
@group(0) @binding(1) var<storage, read_write> data: array<u32>;
@group(0) @binding(2) var<storage, read_write> sums: array<u32>;

var<workgroup> tmp: array<u32, 512>;

@compute @workgroup_size(256)
fn scanBlocks(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) t: u32) {
  let base = wg.x * BLOCK;
  let n = S.x;
  let a = base + 2u * t;
  tmp[2u * t] = select(0u, data[a], a < n);
  tmp[2u * t + 1u] = select(0u, data[a + 1u], a + 1u < n);
  // up-sweep
  var offset = 1u;
  for (var d = BLOCK >> 1u; d > 0u; d = d >> 1u) {
    workgroupBarrier();
    if (t < d) {
      let ai = offset * (2u * t + 1u) - 1u;
      let bi = offset * (2u * t + 2u) - 1u;
      tmp[bi] += tmp[ai];
    }
    offset = offset << 1u;
  }
  workgroupBarrier();
  if (t == 0u) {
    sums[wg.x] = tmp[BLOCK - 1u];
    tmp[BLOCK - 1u] = 0u;
  }
  // down-sweep
  for (var d = 1u; d < BLOCK; d = d << 1u) {
    offset = offset >> 1u;
    workgroupBarrier();
    if (t < d) {
      let ai = offset * (2u * t + 1u) - 1u;
      let bi = offset * (2u * t + 2u) - 1u;
      let v = tmp[ai];
      tmp[ai] = tmp[bi];
      tmp[bi] += v;
    }
  }
  workgroupBarrier();
  if (a < n) { data[a] = tmp[2u * t]; }
  if (a + 1u < n) { data[a + 1u] = tmp[2u * t + 1u]; }
}

// Add the scanned block sums back to every element of each block.
@compute @workgroup_size(256)
fn addBlockSums(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) t: u32) {
  let base = wg.x * BLOCK;
  let n = S.x;
  let add = sums[wg.x];
  let a = base + 2u * t;
  if (a < n) { data[a] += add; }
  if (a + 1u < n) { data[a + 1u] += add; }
}
`;
const b = {
  cell: 0.012,
  tableBits: 17,
  reach: 0.003,
  distance: 0.001,
  stiffness: 500,
  friction: 0.45,
  frictionSpeed: 0.002,
  boundFraction: 0.45,
};
var x = class {
  meta;
  s;
  mod;
  scan;
  pipes = {};
  group;
  scanGroups = [];
  cells;
  items;
  constructor(e) {
    this.s = e;
    let t = e.device,
      n = 1 << b.tableBits,
      r = /* @__PURE__ */ new Float32Array(8);
    (r.set([b.cell, 0, b.reach, b.distance], 0),
      (new Uint32Array(r.buffer)[1] = n - 1),
      r.set([b.stiffness, b.friction, b.frictionSpeed, b.boundFraction], 4));
    let s = o(t, `selfContactU`, r, i);
    this.cells = a(t, `selfContact.cells`, 8 * n);
    let c = a(t, `selfContact.items`, 64 * e.N);
    if (((this.items = c), e.N >= 1 << 20)) throw Error(`self-contact bound keys hold at most 2^20 - 1 nodes`);
    let l = a(t, `selfContact.pairs`, 24 * e.N),
      u = a(t, `selfContact.acc`, 36 * e.N);
    this.meta = a(t, `selfContact.meta`, 32 * e.N);
    let d = e.params?.patch ?? ((e, t) => t);
    this.mod = new f(t, `selfContact`, d(`selfcontact`, _ + v));
    for (let e of [`faceCount`, `faceFill`, `damageRow`, `detect`, `resolveBounds`, `terms`, `gather`])
      this.pipes[e] = this.mod.pipeline(e);
    ((this.group = this.mod.bindGroup(`selfContact`, {
      0: e.simParams,
      1: s,
      2: e.nodes,
      3: e.x,
      4: e.dx,
      5: e.segs,
      6: this.cells,
      7: c,
      8: l,
      9: this.meta,
      10: u,
      11: e.ext,
    })),
      (this.scan = new f(t, `scan`, y)),
      (this.pipes.scanBlocks = this.scan.pipeline(`scanBlocks`)),
      (this.pipes.addBlockSums = this.scan.pipeline(`addBlockSums`)));
    let p = n,
      m = { buffer: this.cells, offset: 0, size: 4 * n };
    for (;;) {
      let e = Math.ceil(p / 512),
        n = a(t, `selfContact.scan${this.scanGroups.length}`, 4 * Math.max(e, 4)),
        r = o(t, `selfContact.scanU`, new Uint32Array([p, 0, 0, 0]), i);
      if (
        (this.scanGroups.push({
          scan: this.scan.bindGroup(`scan`, { 0: r, 1: m, 2: n }),
          add: this.scan.bindGroup(`scanAdd`, { 0: r, 1: m, 2: n }),
          blocks: e,
        }),
        e === 1)
      )
        break;
      ((m = { buffer: n }), (p = e));
    }
  }
  run(e, t, n, r = this.group) {
    (e.setPipeline(this.pipes[t]), e.setBindGroup(0, r), e.dispatchWorkgroups(n));
  }
  encodeClear(e) {
    e.clearBuffer(this.cells);
  }
  encodeDetect(e, t = 15) {
    let n = Math.ceil(this.s.N / 128);
    if ((t & 1 && this.run(e, `faceCount`, n), t & 2)) {
      for (let t of this.scanGroups) this.run(e, `scanBlocks`, t.blocks, t.scan);
      for (let t = this.scanGroups.length - 2; t >= 0; t--)
        this.run(e, `addBlockSums`, this.scanGroups[t].blocks, this.scanGroups[t].add);
    }
    (t & 4 && this.run(e, `faceFill`, n),
      t & 8 && (this.run(e, `damageRow`, n), this.run(e, `detect`, n), this.run(e, `resolveBounds`, n)));
  }
  encodeTerms(e) {
    let t = Math.ceil(this.s.N / 128);
    (this.run(e, `terms`, t), this.run(e, `gather`, t));
  }
};
function S() {
  let e = /* @__PURE__ */ new Float32Array(16);
  return ((e[0] = e[5] = e[10] = e[15] = 1), e);
}
function C(e, t, n = /* @__PURE__ */ new Float32Array(16)) {
  for (let r = 0; r < 4; r++)
    for (let i = 0; i < 4; i++) {
      let a = 0;
      for (let n = 0; n < 4; n++) a += e[n * 4 + i] * t[r * 4 + n];
      n[r * 4 + i] = a;
    }
  return n;
}
function w(e, t) {
  return [e[0] - t[0], e[1] - t[1], e[2] - t[2]];
}
function T(e, t) {
  return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function ee(e, t) {
  return [e[1] * t[2] - e[2] * t[1], e[2] * t[0] - e[0] * t[2], e[0] * t[1] - e[1] * t[0]];
}
function E(e) {
  let t = Math.hypot(e[0], e[1], e[2]) || 1;
  return [e[0] / t, e[1] / t, e[2] / t];
}
function te(e, t) {
  return [e[0] * t, e[1] * t, e[2] * t];
}
function ne(e, t) {
  return [e[0] + t[0], e[1] + t[1], e[2] + t[2]];
}
function D(e, t, n) {
  let r = E(w(t, e)),
    i = E(ee(r, n)),
    a = ee(i, r),
    o = S();
  return (
    (o[0] = i[0]),
    (o[4] = i[1]),
    (o[8] = i[2]),
    (o[1] = a[0]),
    (o[5] = a[1]),
    (o[9] = a[2]),
    (o[2] = -r[0]),
    (o[6] = -r[1]),
    (o[10] = -r[2]),
    (o[12] = -T(i, e)),
    (o[13] = -T(a, e)),
    (o[14] = T(r, e)),
    o
  );
}
function re(e, t, n, r) {
  let i = 1 / Math.tan(e / 2),
    a = /* @__PURE__ */ new Float32Array(16);
  return ((a[0] = i / t), (a[5] = i), (a[10] = r / (n - r)), (a[11] = -1), (a[14] = (n * r) / (n - r)), a);
}
function ie(e, t, n, r, i, a) {
  let o = S();
  return (
    (o[0] = 2 / (t - e)),
    (o[5] = 2 / (r - n)),
    (o[10] = 1 / (i - a)),
    (o[12] = -(t + e) / (t - e)),
    (o[13] = -(r + n) / (r - n)),
    (o[14] = i / (i - a)),
    o
  );
}
function ae(e) {
  let t = /* @__PURE__ */ new Float32Array(16),
    n = e;
  ((t[0] =
    n[5] * n[10] * n[15] -
    n[5] * n[11] * n[14] -
    n[9] * n[6] * n[15] +
    n[9] * n[7] * n[14] +
    n[13] * n[6] * n[11] -
    n[13] * n[7] * n[10]),
    (t[4] =
      -n[4] * n[10] * n[15] +
      n[4] * n[11] * n[14] +
      n[8] * n[6] * n[15] -
      n[8] * n[7] * n[14] -
      n[12] * n[6] * n[11] +
      n[12] * n[7] * n[10]),
    (t[8] =
      n[4] * n[9] * n[15] -
      n[4] * n[11] * n[13] -
      n[8] * n[5] * n[15] +
      n[8] * n[7] * n[13] +
      n[12] * n[5] * n[11] -
      n[12] * n[7] * n[9]),
    (t[12] =
      -n[4] * n[9] * n[14] +
      n[4] * n[10] * n[13] +
      n[8] * n[5] * n[14] -
      n[8] * n[6] * n[13] -
      n[12] * n[5] * n[10] +
      n[12] * n[6] * n[9]),
    (t[1] =
      -n[1] * n[10] * n[15] +
      n[1] * n[11] * n[14] +
      n[9] * n[2] * n[15] -
      n[9] * n[3] * n[14] -
      n[13] * n[2] * n[11] +
      n[13] * n[3] * n[10]),
    (t[5] =
      n[0] * n[10] * n[15] -
      n[0] * n[11] * n[14] -
      n[8] * n[2] * n[15] +
      n[8] * n[3] * n[14] +
      n[12] * n[2] * n[11] -
      n[12] * n[3] * n[10]),
    (t[9] =
      -n[0] * n[9] * n[15] +
      n[0] * n[11] * n[13] +
      n[8] * n[1] * n[15] -
      n[8] * n[3] * n[13] -
      n[12] * n[1] * n[11] +
      n[12] * n[3] * n[9]),
    (t[13] =
      n[0] * n[9] * n[14] -
      n[0] * n[10] * n[13] -
      n[8] * n[1] * n[14] +
      n[8] * n[2] * n[13] +
      n[12] * n[1] * n[10] -
      n[12] * n[2] * n[9]),
    (t[2] =
      n[1] * n[6] * n[15] -
      n[1] * n[7] * n[14] -
      n[5] * n[2] * n[15] +
      n[5] * n[3] * n[14] +
      n[13] * n[2] * n[7] -
      n[13] * n[3] * n[6]),
    (t[6] =
      -n[0] * n[6] * n[15] +
      n[0] * n[7] * n[14] +
      n[4] * n[2] * n[15] -
      n[4] * n[3] * n[14] -
      n[12] * n[2] * n[7] +
      n[12] * n[3] * n[6]),
    (t[10] =
      n[0] * n[5] * n[15] -
      n[0] * n[7] * n[13] -
      n[4] * n[1] * n[15] +
      n[4] * n[3] * n[13] +
      n[12] * n[1] * n[7] -
      n[12] * n[3] * n[5]),
    (t[14] =
      -n[0] * n[5] * n[14] +
      n[0] * n[6] * n[13] +
      n[4] * n[1] * n[14] -
      n[4] * n[2] * n[13] -
      n[12] * n[1] * n[6] +
      n[12] * n[2] * n[5]),
    (t[3] =
      -n[1] * n[6] * n[11] +
      n[1] * n[7] * n[10] +
      n[5] * n[2] * n[11] -
      n[5] * n[3] * n[10] -
      n[9] * n[2] * n[7] +
      n[9] * n[3] * n[6]),
    (t[7] =
      n[0] * n[6] * n[11] -
      n[0] * n[7] * n[10] -
      n[4] * n[2] * n[11] +
      n[4] * n[3] * n[10] +
      n[8] * n[2] * n[7] -
      n[8] * n[3] * n[6]),
    (t[11] =
      -n[0] * n[5] * n[11] +
      n[0] * n[7] * n[9] +
      n[4] * n[1] * n[11] -
      n[4] * n[3] * n[9] -
      n[8] * n[1] * n[7] +
      n[8] * n[3] * n[5]),
    (t[15] =
      n[0] * n[5] * n[10] -
      n[0] * n[6] * n[9] -
      n[4] * n[1] * n[10] +
      n[4] * n[2] * n[9] +
      n[8] * n[1] * n[6] -
      n[8] * n[2] * n[5]));
  let r = n[0] * t[0] + n[1] * t[4] + n[2] * t[8] + n[3] * t[12];
  r = 1 / r;
  for (let e = 0; e < 16; e++) t[e] *= r;
  return t;
}
function O(e, t) {
  return [
    e[0] * t[0] + e[4] * t[1] + e[8] * t[2] + e[12],
    e[1] * t[0] + e[5] * t[1] + e[9] * t[2] + e[13],
    e[2] * t[0] + e[6] * t[1] + e[10] * t[2] + e[14],
    e[3] * t[0] + e[7] * t[1] + e[11] * t[2] + e[15],
  ];
}
const k = { target: [0, 0, -0.01], distance: 0.98, pitch: 0.16, yaw: 0, fovY: (20 * Math.PI) / 180 };
function A(e, t) {
  let n = [Math.sin(e.yaw) * Math.sin(e.pitch), -Math.cos(e.yaw) * Math.sin(e.pitch), Math.cos(e.pitch)],
    r = e.eye ?? [e.target[0] + n[0] * e.distance, e.target[1] + n[1] * e.distance, e.target[2] + n[2] * e.distance],
    i = e.up ?? [-Math.sin(e.yaw), Math.cos(e.yaw), 0],
    a = D(r, e.target, i),
    o = re(e.fovY, t, 0.05, 3),
    s = C(o, a);
  return { eye: r, view: a, proj: o, viewProj: s, invViewProj: ae(s) };
}
var oe = `// Shared render definitions: frame/layer uniforms, hashing and noise, the woven yarn height model,
// yarn appearance and the fiber BRDF. Used by the surface, explicit-yarn, fuzz and shadow passes so
// intact cloth and freed yarns are the same material.

struct FrameU {
  viewProj: mat4x4<f32>,
  lightViewProj: mat4x4<f32>,
  // xyz camera position, w = angular size of one drawing-buffer pixel (rad)
  camPos: vec4<f32>,
  // xyz key light position, w = key intensity
  keyPos: vec4<f32>,
  // xyz key axis (from the light toward the scene), w = cos of the cone's soft edge start
  keyAxis: vec4<f32>,
  // rgb ambient (hemisphere top), w = shadow-map texel size (m)
  ambient: vec4<f32>,
  // width, height, 1/width, 1/height (drawing buffer)
  viewport: vec4<f32>,
  // exposure, time (s), key distance to the view target (irradiance normalisation, m), frame index
  params: vec4<f32>,
  // the overhead (room) light, a distant lamp: its shadow projection; xyz toward it, w = shadow-map
  // texel size (m); rgb irradiance, w = angular radius (rad)
  overViewProj: mat4x4<f32>,
  overDir: vec4<f32>,
  overColor: vec4<f32>,
  // floor: height (m), texture repeats per metre, 1 if drawn, texels per repeat of the base colour and
  // normal maps (they are a crop of the tile at its centre)
  floor: vec4<f32>,
  // per light (key, overhead), its shadow seen from the floor: angular radius of the source (rad),
  // depth range of its shadow projection (m), extent of the projection (m), coverage-map texels per side
  keyCov: vec4<f32>,
  overCov: vec4<f32>,
  // key cone: cos where it reaches full strength, share of light outside the cone, unused; key colour
  keyShape: vec4<f32>,
  keyColor: vec4<f32>,
  // a light on the camera (staged; w = 0 off): position and radiant intensity (W/sr), aim and cos where
  // its cone's soft edge starts, colour and cos where it is full
  torchPos: vec4<f32>,
  torchAxis: vec4<f32>,
  torchColor: vec4<f32>,
};

struct LayerR {
  // node offset, nx, ny, bundle bytes (warps per column, picks per row, warp strands, pick strands)
  lattice: vec4<u32>,
  // fine yarn pitch u (between warps), pitch v (between picks), twill direction (+-1), unused
  pitch: vec4<f32>,
  // warp (v-family): width, height, crimp amplitude, surface fiber twist angle (rad)
  warp: vec4<f32>,
  // weft (u-family): width, height, crimp amplitude, surface fiber twist angle (rad)
  weft: vec4<f32>,
  // twill repeat, warp-over count, refinement S (sub-quads per cell edge), unused
  twill: vec4<u32>,
  // refined-vertex offset, refined row length, cell offset, material id
  refine: vec4<u32>,
  // edge field: first texel row, unused, texture width, texture height (texels)
  edge: vec4<f32>,
  // yarn damage field: first crossing, warps K, picks M, unused
  field: vec4<u32>,
  // loose (freed, round) yarn radius of a pick and of a warp (m), fibres per pick and per warp
  loose: vec4<f32>,
};

struct RenderU {
  // node count, layer count, cell count, refined vertex count
  counts: vec4<u32>,
  layers: array<LayerR, 3>,
  // the floor the solver's cloth collides with (GpuSolver.floorZ): height (m), 1 if there is one, unused...
  floor: vec4<f32>,
};

struct NodeStaticR {
  ijl: u32,
  flags: u32,
  mass: f32,
  n0: f32,
};

const SEG_EXISTS_R: u32 = 1u;
const SEG_BROKEN_R: u32 = 2u;
const PI: f32 = 3.14159265;

// Yarns carried by one lattice span of family f (1 = warp spans: warps per column; 0 = picks per row).
fn bundleOf(L: LayerR, f: u32) -> u32 { return select((L.lattice.w >> 8u) & 0xFFu, L.lattice.w & 0xFFu, f == 1u); }
fn bundleMax(L: LayerR) -> u32 { return max((L.lattice.w >> 8u) & 0xFFu, L.lattice.w & 0xFFu); }

// ---------------------------------------------------------------- hashing and noise

fn hash11(x: u32) -> u32 {
  var v = x;
  v ^= v >> 16u;
  v *= 0x7feb352du;
  v ^= v >> 15u;
  v *= 0x846ca68bu;
  v ^= v >> 16u;
  return v;
}
fn hashf(x: u32) -> f32 { return f32(hash11(x)) * (1.0 / 4294967296.0); }
fn hash2f(a: u32, b: u32) -> f32 { return hashf(a ^ hash11(b + 0x9e3779b9u)); }
fn hashi(a: i32, b: u32) -> f32 { return hash2f(bitcast<u32>(a), b); }

// Smooth 1D value noise in [-1, 1] along a coordinate (seeded).
fn noise1(seed: u32, x: f32) -> f32 {
  let i = floor(x);
  let f = x - i;
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash2f(seed, u32(i32(i) + 65536));
  let b = hash2f(seed, u32(i32(i) + 65537));
  return mix(a, b, u) * 2.0 - 1.0;
}

// Smooth 2D value noise in [-1, 1].
fn noise2(seed: u32, p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = p - i;
  let u = f * f * (3.0 - 2.0 * f);
  let ix = u32(i32(i.x) + 32768);
  let iy = u32(i32(i.y) + 32768);
  let a = hash2f(seed ^ hash11(iy), ix);
  let b = hash2f(seed ^ hash11(iy), ix + 1u);
  let c = hash2f(seed ^ hash11(iy + 1u), ix);
  let d = hash2f(seed ^ hash11(iy + 1u), ix + 1u);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

// ---------------------------------------------------------------- woven yarn geometry

// Longitudinal crimp profile: -1 at the centre of an under-run, +1 one pitch away and beyond.
// Returns (profile, d profile / d coordinate) for a coordinate measured in crossing pitches.
fn crimpProfile(d: f32) -> vec2<f32> {
  let a = min(abs(d), 1.0);
  // smoothstep-shaped transition (C1, cheap): -1 at the run centre, +1 from one pitch on
  return vec2<f32>(-1.0 + 2.0 * a * a * (3.0 - 2.0 * a), 6.0 * a * (1.0 - a) * sign(d));
}

// Signed distance (in pitches) from coordinate c to the nearest centre c0 + R n.
fn periodic(c: f32, c0: f32, R: f32) -> f32 {
  return c - c0 - R * round((c - c0) / R);
}

// Warp yarn k: signed pick distance from V to the centre of its nearest under-run.
fn warpUnderDist(L: LayerR, k: i32, V: f32) -> f32 {
  let R = f32(L.twill.x);
  let over = f32(L.twill.y);
  let c0 = L.pitch.z * f32(k) + over + 0.5 * (R - over - 1.0);
  return periodic(V, c0, R);
}

// Weft yarn m: signed warp distance from U to the centre of its nearest over-run (where it floats).
fn weftOverDist(L: LayerR, m: i32, U: f32) -> f32 {
  let R = f32(L.twill.x);
  let over = f32(L.twill.y);
  // warp k is under pick m when (m - s k) mod R >= over  =>  s k = m - over - (R - over - 1) / 2 (centre)
  let c0 = L.pitch.z * (f32(m) - over - 0.5 * (R - over - 1.0));
  return periodic(U, c0, R);
}

struct Hit {
  covered: bool,
  // 1 = warp (runs along v), 0 = weft (runs along u)
  fam: u32,
  yarn: i32,
  // which float of this yarn (for per-float variation)
  float_: i32,
  // physical position along the yarn (m)
  along: f32,
  // lateral position across the yarn, -1..1
  x: f32,
  // height above the midsurface (m)
  h: f32,
  // dh/du_phys, dh/dv_phys (surface slope in physical tangent coordinates)
  slope: vec2<f32>,
};

// Height of warp k at (U, V). Physical scales: su, sv are the local stretch ratios of the lattice.
fn warpHit(L: LayerR, k: i32, U: f32, V: f32, su: f32, sv: f32) -> Hit {
  var o: Hit;
  o.fam = 1u;
  o.yarn = k;
  let a = 0.5 * L.warp.x;
  let ac = (U - f32(k)) * L.pitch.x * su;
  o.x = ac / a;
  o.covered = abs(o.x) < 1.0;
  let d = warpUnderDist(L, k, V);
  let R = f32(L.twill.x);
  o.float_ = i32(round((V - d) / R));
  let cp = crimpProfile(d);
  let e = sqrt(max(1.0 - o.x * o.x, 0.0));
  o.h = L.warp.z * cp.x + 0.5 * L.warp.y * e;
  let de = -o.x / max(e, 0.12) / a;
  o.slope = vec2<f32>(0.5 * L.warp.y * de, L.warp.z * cp.y / (L.pitch.y * sv));
  o.along = V * L.pitch.y;
  return o;
}

fn weftHit(L: LayerR, m: i32, U: f32, V: f32, su: f32, sv: f32) -> Hit {
  var o: Hit;
  o.fam = 0u;
  o.yarn = m;
  let a = 0.5 * L.weft.x;
  let ac = (V - f32(m)) * L.pitch.y * sv;
  o.x = ac / a;
  o.covered = abs(o.x) < 1.0;
  let d = weftOverDist(L, m, U);
  let R = f32(L.twill.x);
  o.float_ = i32(round((U - d) / R));
  let cp = crimpProfile(d);
  let e = sqrt(max(1.0 - o.x * o.x, 0.0));
  // floats (profile -1 at the over-run centre) rise; elsewhere the weft lies below the warp
  o.h = -L.weft.z * cp.x + 0.5 * L.weft.y * e;
  let de = -o.x / max(e, 0.12) / a;
  o.slope = vec2<f32>(-L.weft.z * cp.y / (L.pitch.x * su), 0.5 * L.weft.y * de);
  o.along = U * L.pitch.x;
  return o;
}

// ---------------------------------------------------------------- lattice cells at yarn resolution

// Crossings of a cell's grid at most (columns x rows); cells near damage are drawn per crossing.
const CELL_MAX_K: u32 = 16u;
const CELL_MAX_M: u32 = 8u;

// Crossing grid of cell (ci, cj): first warp and pick (fine indices) and the counts inside the cell
// (crossings on its edge lines included).
fn cellGrid(L: LayerR, ci: u32, cj: u32) -> vec4<u32> {
  let bu = f32(bundleOf(L, 1u));
  let bv = f32(bundleOf(L, 0u));
  let ua = f32(ci) * bu + 0.5 * (bu - 1.0);
  let va = f32(cj) * bv + 0.5 * (bv - 1.0);
  let k0 = u32(ceil(ua - 1e-3));
  let m0 = u32(ceil(va - 1e-3));
  let nk = min(u32(floor(ua + bu + 1e-3)) - k0 + 1u, CELL_MAX_K);
  let nm = min(u32(floor(va + bv + 1e-3)) - m0 + 1u, CELL_MAX_M);
  return vec4<u32>(k0, m0, nk, nm);
}

// ---------------------------------------------------------------- yarn damage field and edge field
//
// The yarn damage field (simulation/yarnField.ts) holds per crossing the damage code of its pick (bits
// 0-7) and warp (bits 8-15) segment, 255 = cut, 254 = pulled out of the weave (yarnField.ts). The edge field is a texture at crossing
// resolution over each layer's field (layers stacked vertically, LayerR.edge): r = distance (mm) to the
// nearest opening, a crossing where neither yarn is part of the cloth (EDGE_RMAX beyond), g / b =
// intact fraction of the warp / pick there (0 for a yarn drawn as a loose thread), a = density of separated yarn segments around it (how much of an edge it is). edgefield.wgsl rebuilds it whenever new yarns separated. The torn rim, its fringe and the
// abraded halo are material features at a distance from the free edge, so they follow it smoothly;
// g and b let a weave below the pixel footprint still lose its worn-through yarns.

// Loose threads (threads.wgsl): runs of at least MIN_RUN lone crossings, drawn in chunks of CHUNK
// crossings (THREAD_VERTS: two per centre-line sample, two samples per crossing) with
// FIBERS_PER_CHUNK fibres each (FIBER_VERTS vertices).
const MIN_RUN: u32 = 4u;
const CHUNK: u32 = 8u;
const THREAD_VERTS: u32 = 34u;
const FIBERS_PER_CHUNK: u32 = 20u;
const FIBER_VERTS: u32 = 14u;
// vec4 per run of the per-frame thread geometry (thread_prep.wgsl, thread_tail.wgsl)
const RUN_GEO: u32 = 9u;

// A thread run's record (threads.wgsl threadScan).
struct RunInfo {
  layer: u32,
  fam: u32,
  yarn: u32,
  // first lone crossing and count
  pos: f32,
  n: f32,
  // the ends are held in the weave (or the field's border), not free
  heldA: bool,
  heldB: bool,
  // drawn parameter range (crossings along the yarn)
  drawA: f32,
  drawB: f32,
};

fn runInfo(rec: vec4<u32>) -> RunInfo {
  var o: RunInfo;
  o.layer = rec.x & 0xFu;
  o.fam = (rec.x >> 4u) & 1u;
  o.heldA = ((rec.x >> 5u) & 3u) != 1u;
  o.heldB = ((rec.x >> 7u) & 3u) != 1u;
  o.yarn = rec.y & 0xFFFFu;
  o.pos = f32(rec.y >> 16u);
  o.n = f32(rec.z);
  o.drawA = o.pos - select(0.5, 1.0, o.heldA);
  o.drawB = o.pos + o.n - 1.0 + select(0.5, 1.0, o.heldB);
  return o;
}

// The material at crossing c belongs to a falling piece: bit c of the debris region of the thread bits
// (threads.wgsl), which starts after the 2-bit-per-crossing region of fieldTotal crossings.
fn debrisWord(c: u32, fieldTotal: u32) -> u32 { return (fieldTotal + 15u) / 16u + (c >> 5u); }

// Crossings of all layers' yarn fields, from the last layer.
fn fieldTotalOf(last: LayerR) -> u32 { return last.field.x + last.field.y * last.field.z; }

// Largest stored distance (mm); everything beyond is intact cloth.
const EDGE_RMAX: f32 = 10.0;
const CUT_R: u32 = 255u;
// pulled out of the weave at the crossing: the end has slid back toward where the yarn is held, so
// the crossing no longer has this yarn (drawn like a cut, yarnField.ts DAMAGE_PULLED)
const PULLED_R: u32 = 254u;

fn fieldIndexR(L: LayerR, k: u32, m: u32) -> u32 { return L.field.x + m * L.field.y + k; }
fn yarnCode(word: u32, fam: u32) -> u32 { return (word >> (8u * fam)) & 0xFFu; }

// Normalised edge-field texture coordinates of fine yarn coordinates (U, V) of layer L.
fn edgeUV(L: LayerR, uv: vec2<f32>) -> vec2<f32> {
  return vec2<f32>((uv.x + 0.5) / L.edge.z, (uv.y + 0.5 + L.edge.x) / L.edge.w);
}

// Rest-chart point (m) of fine yarn coordinates (U, V): node (i, j) sits at U = i bu + (bu - 1) / 2.
fn restOfUV(L: LayerR, uv: vec2<f32>) -> vec2<f32> {
  let bu = f32(bundleOf(L, 1u));
  let bv = f32(bundleOf(L, 0u));
  return vec2<f32>((uv.x - 0.5 * (bu - 1.0)) * L.pitch.x, (uv.y - 0.5 * (bv - 1.0)) * L.pitch.y);
}

// ---------------------------------------------------------------- woven surface lookup

// The two highest yarns at a point and the soft visibility weight of the second: real yarn surfaces
// are hairy, so the boundary between overlapping yarns is a soft transition over ~tau of height.
struct Hit2 {
  a: Hit,
  b: Hit,
  wb: f32,
};

fn weave2(L: LayerR, U: f32, V: f32, su: f32, sv: f32, front: bool, tau: f32) -> Hit2 {
  // heights only for every candidate; full hits for the two highest
  let sgn = select(-1.0, 1.0, front);
  let k0 = i32(round(U));
  let m0 = i32(round(V));
  let aw = 0.5 * L.warp.x;
  let af = 0.5 * L.weft.x;
  // warps overlap their neighbours (width > pitch): three candidates; picks only when stretched apart
  let wefts = select(1, 3, af > 0.5 * L.pitch.y * sv);
  var ha = -1.0;
  var hb = -1.0;
  var ia = -1;
  var ib = -1;
  for (var q = 0; q < 3 + wefts; q++) {
    var x: f32;
    var hh: f32;
    if (q < 3) {
      x = (U - f32(k0 + q - 1)) * L.pitch.x * su / aw;
      if (abs(x) >= 1.0) { continue; }
      hh = L.warp.z * crimpProfile(warpUnderDist(L, k0 + q - 1, V)).x + 0.5 * L.warp.y * sqrt(1.0 - x * x);
    } else {
      let m = m0 + select(0, q - 4, wefts == 3);
      x = (V - f32(m)) * L.pitch.y * sv / af;
      if (abs(x) >= 1.0) { continue; }
      hh = -L.weft.z * crimpProfile(weftOverDist(L, m, U)).x + 0.5 * L.weft.y * sqrt(1.0 - x * x);
    }
    hh *= sgn;
    if (hh > ha) {
      hb = ha;
      ib = ia;
      ha = hh;
      ia = q;
    } else if (hh > hb) {
      hb = hh;
      ib = q;
    }
  }
  var o: Hit2;
  o.a.covered = false;
  o.b.covered = false;
  o.wb = 0.0;
  if (ia < 0) { return o; }
  if (ia < 3) { o.a = warpHit(L, k0 + ia - 1, U, V, su, sv); } else { o.a = weftHit(L, m0 + select(0, ia - 4, wefts == 3), U, V, su, sv); }
  if (ib >= 0) {
    if (ib < 3) { o.b = warpHit(L, k0 + ib - 1, U, V, su, sv); } else { o.b = weftHit(L, m0 + select(0, ib - 4, wefts == 3), U, V, su, sv); }
    o.wb = 1.0 / (1.0 + exp((ha - hb) / tau));
  }
  return o;
}

// ---------------------------------------------------------------- appearance

// Occlusion of a point at normalized height hn (0 = bottom of the weave, 1 = top of the floats):
// the twill grooves and interlacings are deep and shaded by the floats around them.
fn weaveOcclusion(hn: f32) -> f32 {
  let t = hn * hn * (3.0 - 2.0 * hn);
  return mix(0.08, 1.0, t * t);
}

struct Look {
  albedo: vec3<f32>,
  // fraction of loose surface fibre (sheen strength)
  fuzz: f32,
  // cavity occlusion of the local weave position
  ao: f32,
};

// How well a feature of size \`scale\` (m) is resolved at pixel footprint \`pix\` (m): 0 below 0.75 px
// (its variation averages out within the pixel and must not alias into noise), 1 from 3 px.
fn resolved(scale: f32, pix: f32) -> f32 { return clamp((scale / max(pix, 1e-9) - 0.75) / 2.25, 0.0, 1.0); }

// ---------------------------------------------------------------- fabrics (LayerR.refine.w)
// 0 denim (indigo 3/1 twill), 1 burlap (jute plain weave), 2 tartan (2/2 wool twill), 3 satin (5-harness
// silk), 4 linen (plain-weave flax). Family-mean albedos for the LOD blend of the surface, and the rim's
// loosened fibre: its pale (undyed / core) and dyed (surface) fibre.
fn fabricWarpMean(m: u32) -> vec3<f32> {
  switch m {
    case 1u: { return vec3<f32>(0.42, 0.26, 0.11); }
    case 2u: { return vec3<f32>(0.4, 0.09, 0.07); }
    case 3u: { return vec3<f32>(0.5, 0.03, 0.05); }
    case 4u: { return vec3<f32>(0.6, 0.52, 0.39); }
    case 5u: { return vec3<f32>(0.5, 0.5, 0.56); }
    case 6u: { return vec3<f32>(0.72, 0.68, 0.6); }
    case 7u: { return vec3<f32>(0.72, 0.5, 0.12); }
    case 8u: { return vec3<f32>(0.04, 0.04, 0.045); }
    default: { return vec3<f32>(0.045, 0.065, 0.135); }
  }
}
fn fabricWeftMean(m: u32) -> vec3<f32> {
  switch m {
    case 1u: { return vec3<f32>(0.39, 0.24, 0.1); }
    case 2u: { return vec3<f32>(0.4, 0.09, 0.07); }
    case 3u: { return vec3<f32>(0.36, 0.02, 0.03); }
    case 4u: { return vec3<f32>(0.58, 0.5, 0.38); }
    case 5u: { return vec3<f32>(0.48, 0.48, 0.54); }
    case 6u: { return vec3<f32>(0.72, 0.68, 0.6); }
    case 7u: { return vec3<f32>(0.42, 0.3, 0.08); }
    case 8u: { return vec3<f32>(0.04, 0.04, 0.045); }
    default: { return vec3<f32>(0.26, 0.27, 0.28); }
  }
}
fn fabricRimPale(m: u32) -> vec3<f32> {
  switch m {
    case 1u: { return vec3<f32>(0.62, 0.46, 0.24); }
    case 2u: { return vec3<f32>(0.7, 0.62, 0.56); }
    case 3u: { return vec3<f32>(0.8, 0.5, 0.52); }
    case 4u: { return vec3<f32>(0.78, 0.72, 0.6); }
    case 5u: { return vec3<f32>(0.72, 0.72, 0.76); }
    case 6u: { return vec3<f32>(0.8, 0.78, 0.72); }
    case 7u: { return vec3<f32>(0.8, 0.62, 0.25); }
    case 8u: { return vec3<f32>(0.22, 0.22, 0.24); }
    default: { return vec3<f32>(0.64, 0.67, 0.73); }
  }
}
fn fabricRimDyed(m: u32) -> vec3<f32> {
  switch m {
    case 1u: { return vec3<f32>(0.3, 0.18, 0.07); }
    case 2u: { return vec3<f32>(0.5, 0.1, 0.1); }
    case 3u: { return vec3<f32>(0.45, 0.05, 0.08); }
    case 4u: { return vec3<f32>(0.5, 0.42, 0.3); }
    case 5u: { return vec3<f32>(0.45, 0.45, 0.52); }
    case 6u: { return vec3<f32>(0.6, 0.56, 0.48); }
    case 7u: { return vec3<f32>(0.5, 0.33, 0.08); }
    case 8u: { return vec3<f32>(0.06, 0.06, 0.07); }
    default: { return vec3<f32>(0.2, 0.28, 0.5); }
  }
}

// The tartan's sett (material 2): the colour of yarn i, the same sequence in warp and weft. A simplified
// Royal Stewart: a red ground with green, navy, white and yellow guards (98 yarns per repeat, ~7 cm).
fn tartanYarn(i: i32) -> vec3<f32> {
  let p = ((i % 98) + 98) % 98;
  let red = vec3<f32>(0.55, 0.03, 0.04);
  let navy = vec3<f32>(0.02, 0.03, 0.14);
  let green = vec3<f32>(0.02, 0.14, 0.05);
  let white = vec3<f32>(0.75, 0.72, 0.65);
  let yellow = vec3<f32>(0.8, 0.6, 0.05);
  if (p < 22) { return red; }
  if (p < 26) { return green; }
  if (p < 30) { return red; }
  if (p < 32) { return white; }
  if (p < 36) { return red; }
  if (p < 44) { return navy; }
  if (p < 48) { return red; }
  if (p < 50) { return yellow; }
  if (p < 54) { return red; }
  if (p < 62) { return navy; }
  if (p < 66) { return red; }
  if (p < 68) { return white; }
  if (p < 72) { return red; }
  if (p < 76) { return green; }
  return red;
}

// Detached surface fibres keep the identity of the yarn they came from. In a tartan,
// that includes its stripe: unravelling a navy or green yarn cannot turn its hair red.
fn looseFibreAlbedo(material: u32, fam: u32, yarn: i32, seed: u32) -> vec3<f32> {
  let pale = hashf(seed + 9u) < 0.75;
  if (material == 0u) {
    if (fam == 0u) { return vec3<f32>(0.44, 0.44, 0.43); }
    return select(vec3<f32>(0.08, 0.12, 0.27), vec3<f32>(0.40, 0.42, 0.47), pale);
  }
  if (material == 2u) {
    // The same exposed-wool blend as yarnLook at full wear and loosening.
    return mix(tartanYarn(yarn), vec3<f32>(0.7, 0.65, 0.6), select(0.0, 0.2625, pale));
  }
  return select(fabricRimDyed(material), fabricRimPale(material), pale);
}

// Ring-dyed indigo warp and undyed weft. \`pix\` is the pixel footprint in metres (filters fibre-scale
// detail to its mean), \`wear\` the abrasion field, \`crown\` the exposure of this point on its yarn,
// \`loose\` 1 for a yarn freed of the crossing yarns (a thread, a pick across a ladder): no longer
// compacted under the warp floats, it shows its own fibre all round, untwisted and fluffed.
fn yarnLook(L: LayerR, layerIdx: u32, fam: u32, yarn: i32, float_: i32, along: f32, x: f32, wear: f32, pix: f32, loose: f32) -> Look {
  var o: Look;
  let seedY = bitcast<u32>(yarn) * 2u + fam + 977u * layerIdx;
  let crown = sqrt(max(0.0, 1.0 - x * x));
  // fibre-scale streaks along the twisted fibres (twist angle from the yarn axis)
  let tw = select(L.weft.w, L.warp.w, fam == 1u);
  let width = select(L.weft.x, L.warp.x, fam == 1u);
  let across = 0.5 * width * x;
  let fiberCoord = (across * cos(tw) - along * sin(tw)) / 22e-6;
  let fiberVis = clamp(1.6 - pix / 40e-6, 0.0, 1.0);
  let fiberIdx = u32(i32(floor(fiberCoord)) + 1048576);
  let fiberRnd = hash2f(seedY * 31u + 7u, fiberIdx);
  // per-yarn and per-float variations are a yarn pitch across: they fade to their mean once the
  // pitch falls below a few pixels (the twill itself is shaded from the prefiltered weave tile)
  let pitchX = select(L.pitch.y, L.pitch.x, fam == 1u);
  let rYarn = resolved(pitchX, pix);
  if (L.refine.w == 2u) {
    // Worsted wool tartan: every yarn one colour of the sett, dulled and heathered by its hair; the hair
    // over the grooves between yarns greys the colour a little
    let base = tartanYarn(yarn);
    let heather = 1.0 + (0.24 * hash2f(seedY, 3u) - 0.12) * rYarn;
    let fib = mix(1.0, 0.8 + 0.4 * fiberRnd, fiberVis);
    let grey = vec3<f32>(0.35, 0.32, 0.3);
    var alb = mix(base, (base + grey) * 0.5, 0.3 * (1.0 - crown)) * heather * fib * (0.85 + 0.15 * crown);
    alb = mix(alb, mix(alb, vec3<f32>(0.7, 0.65, 0.6), 0.35), 0.45 * loose + 0.3 * wear);
    o.albedo = alb;
    o.fuzz = 0.7 + 0.2 * wear + 0.2 * loose;
    o.ao = 1.0;
    return o;
  }
  if (L.refine.w == 3u) {
    // Silk satin: filament yarns with no hair in long floats; the crown of every float throws a sheen
    // and the warp face is brighter than the weft showing through between floats
    let base = select(vec3<f32>(0.36, 0.015, 0.03), vec3<f32>(0.5, 0.02, 0.045), fam == 1u);
    let sheen = pow(crown, 6.0);
    let v = 1.0 + (0.08 * hash2f(seedY, 3u) - 0.04) * rYarn;
    var alb = (base * (0.7 + 0.5 * crown) + vec3<f32>(0.95, 0.55, 0.55) * 0.55 * sheen) * v;
    alb = mix(alb, vec3<f32>(0.72, 0.26, 0.3), 0.3 * loose + 0.25 * wear);
    o.albedo = clamp(alb, vec3<f32>(0.0), vec3<f32>(1.0));
    o.fuzz = 0.04 + 0.2 * wear + 0.15 * loose;
    o.ao = 1.0;
    return o;
  }
  if (L.refine.w == 4u) {
    // Linen canvas: undyed flax, a warm ecru with slubs and nubs along each yarn, a little darker in the
    // grooves and paler where it is worn or has come loose
    let shade = 1.0 + (0.3 * hash2f(seedY, 3u) - 0.15) * rYarn;
    let slub = (0.6 * noise1(seedY + 11u, along / 0.004) + 0.4 * noise1(seedY + 23u, along / 0.015)) * sqrt(rYarn);
    let streak = noise1(seedY + 41u, along / 0.5e-3) * resolved(0.5e-3, pix);
    let fib = mix(1.0, 0.8 + 0.4 * fiberRnd, fiberVis);
    let ecru = vec3<f32>(0.62, 0.54, 0.4);
    let dark = vec3<f32>(0.36, 0.29, 0.19);
    let pale = vec3<f32>(0.78, 0.72, 0.6);
    var alb = mix(ecru, dark, clamp(0.25 * (1.0 - crown) + 0.2 * streak, 0.0, 1.0));
    alb = mix(alb, pale, clamp(0.35 * slub + 0.3 * wear, 0.0, 1.0)) * shade * fib;
    o.albedo = mix(alb, pale, 0.3 * loose);
    o.fuzz = 0.3 + 0.25 * wear + 0.3 * loose;
    o.ao = 1.0;
    return o;
  }
  if (L.refine.w == 5u) {
    // Chiffon: sheer dove-grey silk crepe; the twist of crepe yarn makes a faint sparkle along it
    let v = 1.0 + (0.1 * hash2f(seedY, 3u) - 0.05) * rYarn;
    let twinkle = 0.5 + 0.5 * noise1(seedY + 41u, along / 0.25e-3) * resolved(0.25e-3, pix);
    var alb = vec3<f32>(0.5, 0.5, 0.56) * (0.8 + 0.3 * crown) * (0.9 + 0.2 * twinkle) * v;
    o.albedo = mix(alb, vec3<f32>(0.7, 0.7, 0.74), 0.3 * loose + 0.2 * wear);
    o.fuzz = 0.08 + 0.2 * loose;
    o.ao = 1.0;
    return o;
  }
  if (L.refine.w == 6u) {
    // Gauze: soft bleached cotton, slack and fluffy
    let v = 1.0 + (0.16 * hash2f(seedY, 3u) - 0.08) * rYarn;
    let fib = mix(1.0, 0.8 + 0.4 * fiberRnd, fiberVis);
    var alb = vec3<f32>(0.74, 0.7, 0.62) * (0.85 + 0.15 * crown) * v * fib;
    o.albedo = mix(alb, vec3<f32>(0.8, 0.78, 0.72), 0.3 * loose);
    o.fuzz = 0.6 + 0.3 * loose;
    o.ao = 1.0;
    return o;
  }
  if (L.refine.w == 7u) {
    // Lame: a metallic gold warp over a dull gold weft; the sheen is strong and tight on the crown
    let sheen = pow(crown, 10.0);
    let v = 1.0 + (0.1 * hash2f(seedY, 3u) - 0.05) * rYarn;
    let warp = fam == 1u;
    let base = select(vec3<f32>(0.42, 0.3, 0.08), vec3<f32>(0.72, 0.5, 0.12), warp);
    var alb = (base * (0.55 + 0.6 * crown) + vec3<f32>(1.0, 0.92, 0.6) * select(0.15, 0.75, warp) * sheen) * v;
    alb = mix(alb, vec3<f32>(0.6, 0.45, 0.15), 0.3 * loose + 0.2 * wear);
    o.albedo = clamp(alb, vec3<f32>(0.0), vec3<f32>(1.2));
    o.fuzz = 0.02 + 0.15 * loose;
    o.ao = 1.0;
    return o;
  }
  if (L.refine.w == 8u) {
    // Ballistic nylon: black filament yarns with a hard low sheen, faint per-yarn variation
    let sheen = pow(crown, 4.0);
    let v = 1.0 + (0.08 * hash2f(seedY, 3u) - 0.04) * rYarn;
    var alb = (vec3<f32>(0.035, 0.035, 0.04) * (0.7 + 0.5 * crown) + vec3<f32>(0.25, 0.25, 0.27) * 0.35 * sheen) * v;
    alb = mix(alb, vec3<f32>(0.18, 0.18, 0.19), 0.3 * loose + 0.3 * wear);
    o.albedo = alb;
    o.fuzz = 0.08 + 0.3 * wear + 0.2 * loose;
    o.ao = 1.0;
    return o;
  }
  if (L.refine.w == 1u) {
    // Jute (burlap): undyed single bast yarns, uneven along their length (slubs a few mm to cm long),
    // each its own shade of tan, with dark lignin-stained fibre streaks in the twist grooves and pale,
    // fluffy fibre where the yarn is worn or loosened. Warp and weft look alike (the weft a touch duller).
    let shade = 1.0 + (0.5 * hash2f(seedY, 3u) - 0.25) * rYarn;
    let slub = (0.6 * noise1(seedY + 11u, along / 0.006) + 0.4 * noise1(seedY + 23u, along / 0.02)) * sqrt(rYarn);
    let streak = 0.5 * noise1(seedY + 41u, along / 0.4e-3) * resolved(0.4e-3, pix) + 0.5 * noise1(seedY + 53u, along / 1.2e-3) * resolved(1.2e-3, pix);
    let fib = mix(1.0, 0.7 + 0.6 * fiberRnd, fiberVis);
    let tan = vec3<f32>(0.46, 0.29, 0.12);
    let dark = vec3<f32>(0.22, 0.12, 0.045);
    let pale = vec3<f32>(0.66, 0.5, 0.27);
    var alb = mix(tan, dark, clamp(0.35 * streak + 0.3 * (1.0 - crown), 0.0, 1.0));
    alb = mix(alb, pale, clamp(0.3 * slub + 0.35 * wear, 0.0, 1.0));
    alb = alb * shade * fib * select(0.92, 1.0, fam == 1u);
    o.albedo = mix(alb, pale * 0.9, 0.35 * loose);
    o.fuzz = 0.55 + 0.3 * wear + 0.35 * loose;
    o.ao = 1.0;
    return o;
  }
  if (fam == 1u) {
    // per-yarn dye depth, slubs along the yarn (mm to cm scale) and per-float variation
    let yarnDye = 1.0 + (0.1 * hash2f(seedY, 3u) - 0.05) * rYarn;
    let slub = (0.6 * noise1(seedY + 11u, along / 0.0035) + 0.4 * noise1(seedY + 23u, along / 0.014)) * sqrt(rYarn);
    let floatV = mix(0.5, hash2f(seedY ^ 0x5bd1e995u, bitcast<u32>(float_)), rYarn);
    // sub-millimetre streaks along the yarn: twist irregularity exposes more or less undyed fibre
    let streak = 0.6 * noise1(seedY + 41u, along / 0.3e-3) * resolved(0.3e-3, pix) + 0.4 * noise1(seedY + 53u, along / 0.85e-3) * resolved(0.85e-3, pix);
    // exposure of the pale core: abrasion acts on the crowns of the floats
    let abr = clamp(wear * (0.35 + 0.65 * crown) * (0.6 + 0.8 * floatV) + 0.1 * floatV * crown, 0.0, 1.0);
    let dye = clamp(yarnDye * (1.0 + 0.12 * slub) * (1.0 - 0.75 * abr), 0.0, 1.5);
    // washed indigo: the dyed sheath is a deep blue, abraded fibre a light blue with the off-white
    // core showing through
    let deep = vec3<f32>(0.03, 0.05, 0.13);
    let pale = vec3<f32>(0.36, 0.44, 0.6);
    // fibre clumps and uneven ring dyeing mottle the surface: elongated along the warp (slub-like,
    // ~3 mm long, ~0.5 mm wide) plus fine isotropic clumps; faded below the pixel footprint
    let pc = vec2<f32>(f32(yarn) * L.pitch.x + across, along);
    let m1 = noise2(977u + layerIdx, pc / 0.4e-3) * resolved(0.4e-3, pix);
    let m2 = noise2(1913u + layerIdx, pc / vec2<f32>(0.55e-3, 3.0e-3)) * resolved(0.55e-3, pix);
    // uneven ring dyeing and fading over a few millimetres: the heathered look of worn denim
    let m3 = 0.65 * noise2(2711u + layerIdx, pc / 1.8e-3) + 0.35 * noise2(2719u + layerIdx, pc / 4.5e-3);
    let mottle = 0.55 * m1 + 0.3 * m2 + 0.9 * m3 * resolved(1.8e-3, pix);
    // mean fraction of undyed fibre showing on the surface; individual fibres alternate around it
    let paleMean = clamp(0.12 + 0.45 * (1.0 - min(dye, 1.0)) + 0.06 * streak + 0.1 * mottle, 0.0, 1.0);
    let paleFiber = select(0.0, 1.0, fiberRnd < paleMean);
    let paleFrac = mix(paleMean, paleFiber, fiberVis * 0.2);
    // floats differ from one another (twist, hairiness, how far they stand out): the face of the
    // twill reads as a pebbly run of separate floats along each wale, not a printed stripe
    let floatB = 0.78 + 0.44 * floatV;
    o.albedo = mix(deep * (0.75 + 0.5 * min(dye, 1.2)), pale, paleFrac) * floatB;
    // a freed warp untwists: its pale core shows between the dyed surface fibres
    o.albedo = mix(o.albedo, mix(pale, vec3<f32>(0.6, 0.62, 0.66), 0.5), 0.45 * loose);
    o.fuzz = 0.25 + 0.6 * wear + 0.3 * loose;
  } else {
    let v = 0.95 + (0.2 * hash2f(seedY, 5u) - 0.1 + 0.08 * noise1(seedY + 3u, along / 0.004)) * rYarn;
    let fib = mix(1.0, 0.85 + 0.3 * fiberRnd, fiberVis);
    // undyed weft picks up indigo from neighbouring warps in washing; it is greyish while compacted
    // under the floats, until abrasion and loosening expose its raw, fluffy ecru cotton
    let woven = mix(vec3<f32>(0.26, 0.27, 0.28), vec3<f32>(0.5, 0.5, 0.49), 0.8 * wear * wear);
    o.albedo = mix(woven, vec3<f32>(0.64, 0.61, 0.55), loose) * v * fib;
    o.fuzz = 0.35 + 0.35 * loose;
  }
  o.ao = 1.0;
  return o;
}

`,
  j = `// Lighting shared by the shaded passes (requires a module-scope \`F: FrameU\` uniform and the shadow
// maps shadowMap (key), overMap (overhead light) with shadowSampler).

// ---------------------------------------------------------------- lighting

// Key light: a broad soft source above the top-left of the frame; returns (direction to light,
// irradiance scale). Its colour (F.keyColor) multiplies the irradiance where it is used.
fn keyLight(P: vec3<f32>) -> vec4<f32> {
  let d = F.keyPos.xyz - P;
  let dist = length(d);
  let Ld = d / dist;
  let c = dot(-Ld, F.keyAxis.xyz);
  let cone = smoothstep(F.keyAxis.w, F.keyShape.x, c);
  let r0 = F.params.z;
  let fall = (r0 * r0) / (dist * dist);
  return vec4<f32>(Ld, F.keyPos.w * fall * mix(F.keyShape.y, 1.0, cone));
}

// The camera's light (direction to it, irradiance; times F.torchColor where used): a small source at the
// lens, so nothing the camera sees is in its shadow (no shadow map); inverse square, its cone.
fn torchLight(P: vec3<f32>) -> vec4<f32> {
  if (F.torchPos.w <= 0.0) { return vec4<f32>(0.0, 0.0, 1.0, 0.0); }
  let d = F.torchPos.xyz - P;
  let r2 = max(dot(d, d), 1e-4);
  let Ld = d * inverseSqrt(r2);
  let cone = smoothstep(F.torchAxis.w, F.torchColor.w, dot(-Ld, F.torchAxis.xyz));
  return vec4<f32>(Ld, F.torchPos.w * cone / r2);
}

// Fibre BRDF times cos for one light: diffuse from a fibrous yarn surface, a longitudinal specular
// lobe on the fibre direction T, and grazing sheen from loose surface fibres.
fn fiberShade(N: vec3<f32>, T: vec3<f32>, V: vec3<f32>, Ldir: vec3<f32>, albedo: vec3<f32>, fuzz: f32) -> vec3<f32> {
  let NL = dot(N, Ldir);
  let NV = max(dot(N, V), 1e-3);
  // fibrous diffuse: Lambert softened toward the fibre cylinder response
  let TL = dot(T, Ldir);
  let sinTL = sqrt(max(0.0, 1.0 - TL * TL));
  let lam = max(NL, 0.0);
  let wrapd = clamp((NL + 0.35) / 1.35, 0.0, 1.0) * sinTL;
  let diff = albedo * (0.72 * lam + 0.28 * wrapd) * (1.0 / PI);
  // longitudinal fibre specular (Marschner R lobe approximation): sin(thetaI) + sin(thetaR) = 0
  let TV = dot(T, V);
  // rough cotton fibres: weak, broad longitudinal lobe
  let beta = 0.35;
  let sh = TL + TV;
  let lobe = exp(-(sh * sh) / (2.0 * beta * beta));
  let H = normalize(Ldir + V);
  let cosPhi = clamp(dot(normalize(Ldir - TL * T), normalize(V - TV * T)), -1.0, 1.0);
  let spec = vec3<f32>(0.018) * lobe * sqrt(0.5 + 0.5 * cosPhi) * max(NL + 0.1, 0.0) / (2.0 * PI * beta);
  // asperity (fuzz) sheen: Charlie distribution with Neubelt visibility
  let NH = max(dot(N, H), 0.0);
  let r = 0.65;
  let inv = 1.0 / r;
  let sin2 = max(1.0 - NH * NH, 0.0078125);
  let D = (2.0 + inv) * pow(sin2, inv * 0.5) / (2.0 * PI);
  let vis = 1.0 / (4.0 * (lam + NV - lam * NV) + 1e-4);
  let sheenCol = mix(albedo * 2.5, vec3<f32>(0.30, 0.36, 0.50), 0.5);
  let sheen = sheenCol * fuzz * 0.22 * D * vis * lam;
  return diff + spec + sheen;
}

// Soft shadow from a broad light: PCF over a rotated Poisson disk of radiusTexels shadow-map texels
// (the penumbra the light's size gives a nominal 2 mm occluder gap).
// bias: the depth offset of the comparison (m) over the projection's depth range (m).
fn shadowPCF(map: texture_depth_2d, smp: sampler_comparison, M: mat4x4<f32>, texel: f32, radiusTexels: f32, bias: f32, world: vec3<f32>, nrmW: vec3<f32>) -> f32 {
  let p = M * vec4<f32>(world + nrmW * (1.5 * texel), 1.0);
  let uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  if (any(uv < vec2<f32>(0.0)) || any(uv > vec2<f32>(1.0))) { return 1.0; }
  let depth = p.z - bias;
  var taps = array<vec2<f32>, 8>(
    vec2<f32>(-0.326, -0.406), vec2<f32>(-0.840, -0.074), vec2<f32>(-0.696, 0.457), vec2<f32>(-0.203, 0.621),
    vec2<f32>(0.962, -0.195), vec2<f32>(0.473, -0.480), vec2<f32>(0.519, 0.767), vec2<f32>(0.185, -0.893));
  let dims = vec2<f32>(textureDimensions(map));
  let ang = hash2f(u32(world.x * 4e5 + 1e5), u32(world.y * 4e5 + 1e5)) * 6.2831853;
  let cs = vec2<f32>(cos(ang), sin(ang));
  let radius = clamp(radiusTexels, 1.5, 6.0) / dims.x;
  var acc = 0.0;
  for (var k = 0u; k < 8u; k++) {
    let d = taps[k];
    let r = vec2<f32>(d.x * cs.x - d.y * cs.y, d.x * cs.y + d.y * cs.x);
    acc += textureSampleCompareLevel(map, smp, uv + r * radius, depth);
  }
  return acc / 8.0;
}

// Depth offset of the shadow comparison (m).
const SHADOW_BIAS: f32 = 0.24e-3;

// The key's shadow (module-scope shadowMap / shadowSampler).
fn shadowFactor(world: vec3<f32>, nrmW: vec3<f32>) -> f32 {
  return shadowPCF(shadowMap, shadowSampler, F.lightViewProj, F.ambient.w, 3.0, SHADOW_BIAS / F.keyCov.y, world, nrmW);
}

// The overhead light's shadow (module-scope overMap). The small lamp's penumbra over a nominal 2 mm
// gap is a fraction of a texel, so four bilinear comparisons a texel apart (a fixed 4 x 4 texel
// footprint, no rotated disk) resolve it.
fn shadowOver(world: vec3<f32>, nrmW: vec3<f32>) -> f32 {
  let texel = F.overDir.w;
  let p = F.overViewProj * vec4<f32>(world + nrmW * (1.5 * texel), 1.0);
  let uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  if (any(uv < vec2<f32>(0.0)) || any(uv > vec2<f32>(1.0))) { return 1.0; }
  let depth = p.z - SHADOW_BIAS / F.overCov.y;
  let o = 0.5 / f32(textureDimensions(overMap).x);
  var acc = textureSampleCompareLevel(overMap, shadowSampler, uv + vec2<f32>(-o, -o), depth);
  acc += textureSampleCompareLevel(overMap, shadowSampler, uv + vec2<f32>(o, -o), depth);
  acc += textureSampleCompareLevel(overMap, shadowSampler, uv + vec2<f32>(-o, o), depth);
  acc += textureSampleCompareLevel(overMap, shadowSampler, uv + vec2<f32>(o, o), depth);
  return 0.25 * acc;
}

// Fibre BRDF times cos for the overhead light, with its shadow and colour.
fn overShade(N: vec3<f32>, T: vec3<f32>, V: vec3<f32>, albedo: vec3<f32>, fuzz: f32, world: vec3<f32>, nrmW: vec3<f32>) -> vec3<f32> {
  return fiberShade(N, T, V, F.overDir.xyz, albedo, fuzz) * F.overColor.rgb * shadowOver(world, nrmW);
}
`,
  se = `// Per-frame geometry preparation from the accepted mechanical state:
//  - nodeFrame: per-node unit normal and +u / +v tangents from connected yarn neighbours (holes never
//    bridge; a missing direction completes the frame and an isolated node keeps its last frame),
//  - classify: per-cell flags and the compact list of fine cells (drawn per crossing, surface.wgsl),
//  - refine: bicubic (Catmull-Rom) surface samples on an S x S grid per cell with exact derivatives,
//  - args: indirect draw arguments from the list counters.

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<storage, read> nodes: array<NodeStaticR>;
@group(0) @binding(2) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> segw: array<vec4<u32>>; // Seg as 2 x vec4<u32>; flags at [1].y
@group(0) @binding(5) var<storage, read_write> nrm: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> cellFlags: array<u32>;
@group(0) @binding(7) var<storage, read_write> lists: array<atomic<u32>>;
@group(0) @binding(8) var<storage, read_write> rsurf: array<vec4<f32>>; // 3 per refined vertex
@group(0) @binding(9) var<storage, read_write> drawArgs: array<u32>;
// per node: +u unit tangent with the node's wear in w (static), +v unit tangent
@group(0) @binding(10) var<storage, read_write> tframe: array<vec4<f32>>;
// connection fields of nodes near damage (pieces.wgsl): a cell with such a corner is drawn fine
@group(0) @binding(11) var<storage, read> kappaC: array<u32>;

// lists layout: [2] fine cell count, then the fine cells from FINE_BASE (render_common.wgsl)

// Node still in the scene (retired debris, x.w = 2, is not drawn).
fn live(n: u32) -> bool { return x[n].w < 1.5; }

fn segOk(owner: u32, f: u32) -> bool {
  let fl = segw[2u * (2u * owner + f) + 1u].y;
  if ((fl & (SEG_EXISTS_R | SEG_BROKEN_R)) != SEG_EXISTS_R) { return false; }
  let L = R.layers[layerOf(owner)].lattice;
  return live(owner) && live(owner + select(L.y, 1u, f == 0u));
}

fn layerOf(n: u32) -> u32 { return nodes[n].ijl >> 24u; }

fn nodeI(n: u32) -> i32 { return i32(nodes[n].ijl & 0xFFFu); }
fn nodeJ(n: u32) -> i32 { return i32((nodes[n].ijl >> 12u) & 0xFFFu); }

// Tangent of family f at node n from connected neighbours; zero if isolated in that family.
fn famTangent(n: u32, f: u32) -> vec3<f32> {
  let L = R.layers[layerOf(n)].lattice;
  let stride = select(L.y, 1u, f == 0u);
  let a = select(nodeJ(n), nodeI(n), f == 0u);
  let len = select(i32(L.z), i32(L.y), f == 0u);
  var t = vec3<f32>(0.0);
  if (a + 1 < len && segOk(n, f)) { t += x[n + stride].xyz - x[n].xyz; }
  if (a > 0 && segOk(n - stride, f)) { t += x[n].xyz - x[n - stride].xyz; }
  return t;
}

@compute @workgroup_size(128)
fn nodeFrame(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= R.counts.x) { return; }
  let tu = famTangent(n, 0u);
  let tv = famTangent(n, 1u);
  let prev = nrm[n].xyz;
  var nn = cross(tu, tv);
  let l = length(nn);
  if (l > 1e-14) {
    nn = nn / l;
    tframe[2u * n] = vec4<f32>(normalize(tu), tframe[2u * n].w);
    tframe[2u * n + 1u] = vec4<f32>(normalize(tv), 0.0);
  } else {
    // one family missing: perpendicular to the remaining tangent, closest to the previous normal
    let t = select(tv, tu, dot(tu, tu) > dot(tv, tv));
    let tl = length(t);
    var p = select(vec3<f32>(0.0, 0.0, 1.0), prev, dot(prev, prev) > 0.5);
    if (tl > 1e-12) {
      let td = t / tl;
      p = p - dot(p, td) * td;
    }
    nn = normalize(p + vec3<f32>(0.0, 0.0, 1e-6));
    // complete the tangent frame (+u x +v = normal) from the remaining family, else keep the last one
    var eu = tframe[2u * n].xyz;
    var ev = tframe[2u * n + 1u].xyz;
    if (dot(tu, tu) > 1e-20) {
      eu = normalize(tu);
      ev = normalize(cross(nn, eu));
    } else if (dot(tv, tv) > 1e-20) {
      ev = normalize(tv);
      eu = normalize(cross(ev, nn));
    }
    tframe[2u * n] = vec4<f32>(eu, tframe[2u * n].w);
    tframe[2u * n + 1u] = vec4<f32>(ev, 0.0);
  }
  nrm[n] = vec4<f32>(nn, 0.0);
}

fn cellOf(layer: u32, ci: u32, cj: u32) -> u32 {
  let L = R.layers[layer];
  return L.refine.z + cj * (L.lattice.y - 1u) + ci;
}

// Per cell (lower-left node): bit 0 = drawn as intact surface, bit 1 = all four spans carry material.
// A cell is drawn fine (per crossing) when a span of it no longer carries material or a corner of it
// has a connection field (material near it is cut off from it somewhere).
@compute @workgroup_size(128)
fn classifyCells(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= R.counts.x) { return; }
  let l = layerOf(n);
  let L = R.layers[l].lattice;
  let i = u32(nodeI(n));
  let j = u32(nodeJ(n));
  if (i + 1u >= L.y || j + 1u >= L.z) { return; }
  let cell = cellOf(l, i, j);
  let spans = segOk(n, 0u) && segOk(n, 1u) && segOk(n + 1u, 1u) && segOk(n + L.y, 0u);
  let cut = kappaC[KAPPA_TABLE + n] != KAPPA_NONE || kappaC[KAPPA_TABLE + n + 1u] != KAPPA_NONE || kappaC[KAPPA_TABLE + n + L.y] != KAPPA_NONE || kappaC[KAPPA_TABLE + n + L.y + 1u] != KAPPA_NONE;
  var flags = select(0u, 2u, spans);
  if (spans && !cut) {
    flags |= 1u;
  } else if (live(n) || live(n + 1u) || live(n + L.y) || live(n + L.y + 1u)) {
    let k = atomicAdd(&lists[2], 1u);
    if (k < MAX_FINE) { atomicStore(&lists[FINE_BASE + k], cell); }
  }
  cellFlags[cell] = flags;
}

// Indirect arguments: draws [unused, unused, unused, unused, fine cells] x (vertexCount,
// instanceCount, 0, 0). Loose threads and edge fibres have their own (threads.wgsl, pieces.wgsl).
@compute @workgroup_size(1)
fn args() {
  let fine = min(atomicLoad(&lists[2]), MAX_FINE);
  drawArgs[0] = 0u;
  drawArgs[1] = 0u;
  drawArgs[2] = 0u;
  drawArgs[3] = 0u;
  drawArgs[4] = 0u;
  drawArgs[5] = 0u;
  drawArgs[6] = 0u;
  drawArgs[7] = 0u;
  drawArgs[8] = 0u;
  drawArgs[9] = 0u;
  drawArgs[10] = 0u;
  drawArgs[11] = 0u;
  drawArgs[12] = 0u;
  drawArgs[13] = 0u;
  drawArgs[14] = 0u;
  drawArgs[15] = 0u;
  drawArgs[16] = 6u * FINE_QK * FINE_QM;
  drawArgs[17] = fine;
  drawArgs[18] = 0u;
  drawArgs[19] = 0u;
}

// ---------------------------------------------------------------- bicubic surface samples

fn cr(p0: vec3<f32>, p1: vec3<f32>, p2: vec3<f32>, p3: vec3<f32>, t: f32) -> vec3<f32> {
  let t2 = t * t;
  let t3 = t2 * t;
  return 0.5 * (2.0 * p1 + (p2 - p0) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 + (3.0 * p1 - p0 - 3.0 * p2 + p3) * t3);
}
fn crd(p0: vec3<f32>, p1: vec3<f32>, p2: vec3<f32>, p3: vec3<f32>, t: f32) -> vec3<f32> {
  return 0.5 * ((p2 - p0) + 2.0 * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t + 3.0 * (3.0 * p1 - p0 - 3.0 * p2 + p3) * t * t);
}

fn nodeAt(L: vec4<u32>, i: u32, j: u32) -> u32 { return L.x + j * L.y + i; }

// The 4 x 4 Catmull-Rom control net of an intact cell (ci, cj): its own 2 x 2 corners plus the ring
// around them. A ring point is used only when a surviving span connects it to the cell's corner;
// otherwise (lattice border, torn span, debris) it is extrapolated from the cell, so a hole or a
// falling piece never pulls the intact surface toward it.
fn controlNet(L: vec4<u32>, ci: u32, cj: u32) -> array<vec3<f32>, 16> {
  var P: array<vec3<f32>, 16>;
  let nx = L.y;
  let ny = L.z;
  // inner rows q = 1, 2 (j = cj, cj + 1)
  for (var q = 1u; q < 3u; q++) {
    let j = cj + q - 1u;
    let a = nodeAt(L, ci, j);
    let b = a + 1u;
    let pa = x[a].xyz;
    let pb = x[b].xyz;
    P[4u * q + 1u] = pa;
    P[4u * q + 2u] = pb;
    P[4u * q] = select(2.0 * pa - pb, x[a - 1u].xyz, ci > 0u && segOk(a - 1u, 0u));
    P[4u * q + 3u] = select(2.0 * pb - pa, x[b + 1u].xyz, ci + 2u < nx && segOk(b, 0u));
  }
  // outer rows q = 0 (j = cj - 1) and q = 3 (j = cj + 2)
  for (var c = 1u; c < 3u; c++) {
    let i = ci + c - 1u;
    let a = nodeAt(L, i, cj);
    let b = nodeAt(L, i, cj + 1u);
    P[c] = select(2.0 * P[4u + c] - P[8u + c], x[a - nx].xyz, cj > 0u && segOk(a - nx, 1u));
    P[12u + c] = select(2.0 * P[8u + c] - P[4u + c], x[b + nx].xyz, cj + 2u < ny && segOk(b, 1u));
  }
  // corners of the ring: parallelogram completion
  P[0] = P[1] + P[4] - P[5];
  P[3] = P[2] + P[7] - P[6];
  P[12] = P[13] + P[8] - P[9];
  P[15] = P[14] + P[11] - P[10];
  return P;
}

// One refined vertex: position, d/ds and d/dt over the cell (s along u, t along v), wear.
@compute @workgroup_size(128)
fn refine(@builtin(global_invocation_id) gid: vec3<u32>) {
  let r = gid.x;
  if (r >= R.counts.w) { return; }
  // locate layer
  var l = 0u;
  for (var k = 1u; k < R.counts.y; k++) {
    if (r >= R.layers[k].refine.x) { l = k; }
  }
  let LR = R.layers[l];
  let L = LR.lattice;
  let S = LR.twill.z;
  let rl = r - LR.refine.x;
  let rnx = LR.refine.y;
  let I = rl % rnx;
  let J = rl / rnx;
  var ci = min(I / S, L.y - 2u);
  var cj = min(J / S, L.z - 2u);
  // a vertex on a cell boundary is shared by its neighbours: take its tangents from a neighbour whose
  // spans all hold, never from a torn cell's net (its far corners may have separated, which would tilt
  // the boundary normals of the intact cell beside it past the vertical)
  if ((cellFlags[cellOf(l, ci, cj)] & 2u) == 0u) {
    let onI = I == ci * S && ci > 0u;
    let onJ = J == cj * S && cj > 0u;
    if (onI && (cellFlags[cellOf(l, ci - 1u, cj)] & 2u) != 0u) {
      ci -= 1u;
    } else if (onJ && (cellFlags[cellOf(l, ci, cj - 1u)] & 2u) != 0u) {
      cj -= 1u;
    } else if (onI && onJ && (cellFlags[cellOf(l, ci - 1u, cj - 1u)] & 2u) != 0u) {
      ci -= 1u;
      cj -= 1u;
    }
  }
  let s = f32(I - ci * S) / f32(S);
  let t = f32(J - cj * S) / f32(S);
  let net = controlNet(L, ci, cj);
  var rows: array<vec3<f32>, 4>;
  var drows: array<vec3<f32>, 4>;
  for (var q = 0u; q < 4u; q++) {
    rows[q] = cr(net[4u * q], net[4u * q + 1u], net[4u * q + 2u], net[4u * q + 3u], s);
    drows[q] = crd(net[4u * q], net[4u * q + 1u], net[4u * q + 2u], net[4u * q + 3u], s);
  }
  let P = cr(rows[0], rows[1], rows[2], rows[3], t);
  let dPs = cr(drows[0], drows[1], drows[2], drows[3], t);
  let dPt = crd(rows[0], rows[1], rows[2], rows[3], t);
  let n00 = L.x + cj * L.y + ci;
  let w = mix(mix(tframe[2u * n00].w, tframe[2u * (n00 + 1u)].w, s), mix(tframe[2u * (n00 + L.y)].w, tframe[2u * (n00 + L.y + 1u)].w, s), t);
  rsurf[3u * r] = vec4<f32>(P, w);
  rsurf[3u * r + 1u] = vec4<f32>(dPs, 0.0);
  rsurf[3u * r + 2u] = vec4<f32>(dPt, 0.0);
}
`,
  ce = `// Woven cloth surface. Intact cells: one instance per lattice cell, S x S sub-quads of the refined
// bicubic surface. Cells near damage (pieces.wgsl gives a node of theirs a connection field, or a span
// of theirs has separated) are drawn per crossing instead (vsFine): one quad per crossing that has
// surface material, each placed from the cell's corners it is connected to (material_map.wgsl), so
// the cloth opens exactly where its yarns separated and is drawn only where material is.
// The fragment shader evaluates the woven yarn surface at the four MSAA sample positions: each sample
// is either a yarn (shaded) or a gap (uncovered): a gap in stretched weave, or a yarn that is not part
// of the cloth surface there (separated, or drawn as a loose thread), where the yarn below shows
// through, or nothing. Near a free edge (edge field) the cloth turns into its torn rim: an abraded
// halo, then a pale fibrous band.

@group(0) @binding(0) var<uniform> F: FrameU;
@group(0) @binding(1) var<uniform> R: RenderU;
@group(0) @binding(2) var<storage, read> rsurf: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> cellFlags: array<u32>;
@group(0) @binding(4) var shadowMap: texture_depth_2d;
@group(0) @binding(5) var shadowSampler: sampler_comparison;
@group(0) @binding(6) var weaveTile: texture_2d_array<f32>;
@group(0) @binding(7) var tileSampler: sampler;
// render lists: fine cells from FINE_BASE (refine.wgsl)
@group(0) @binding(8) var<storage, read> lists: array<u32>;
@group(0) @binding(9) var edgeTex: texture_2d<f32>;
@group(0) @binding(10) var edgeSampler: sampler;
@group(0) @binding(11) var<storage, read> fieldR: array<u32>;
// per 16 crossings, 2 bits each: the pick / warp there belongs to a loose thread (threads.wgsl)
@group(0) @binding(12) var<storage, read> threadBitsR: array<u32>;
@group(0) @binding(13) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(14) var<storage, read> tframe: array<vec4<f32>>;
@group(0) @binding(15) var<storage, read> kappaM: array<u32>;
@group(0) @binding(16) var overMap: texture_depth_2d;
// a print on the cloth (Renderer.setPrint): sampled over the sheet, white when there is none
@group(0) @binding(17) var printTex: texture_2d<f32>;
@group(0) @binding(18) var printSampler: sampler;


struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) world: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) dPs: vec3<f32>,
  @location(3) dPt: vec3<f32>,
  @location(4) wearV: f32,
  @location(5) @interpolate(flat) layer: u32,
  // cell (i, j), unused, unused
  @location(6) @interpolate(flat) cell: vec4<u32>,
  // x: 1 for a fine (per-crossing) quad, 0 for an intact cell
  @location(7) @interpolate(flat) torn: vec4<u32>,
};

fn degenerate() -> VOut {
  var o: VOut;
  o.pos = vec4<f32>(0.0, 0.0, -2.0, 1.0);
  return o;
}

fn layerOfCell(cell: u32) -> u32 {
  var l = 0u;
  for (var k = 1u; k < R.counts.y; k++) {
    if (cell >= R.layers[k].refine.z) { l = k; }
  }
  return l;
}

fn surfaceVertex(vi: u32, cell: u32) -> VOut {
  let l = layerOfCell(cell);
  let LR = R.layers[l];
  if (cell >= R.counts.z) { return degenerate(); }
  if ((cellFlags[cell] & 1u) == 0u) { return degenerate(); }
  let L = LR.lattice;
  let S = LR.twill.z;
  let local = cell - LR.refine.z;
  let ci = local % (L.y - 1u);
  let cj = local / (L.y - 1u);
  let q = vi / 6u;
  let corner = vi % 6u;
  var cu = array<u32, 6>(0u, 1u, 1u, 0u, 1u, 0u);
  var cv = array<u32, 6>(0u, 0u, 1u, 0u, 1u, 1u);
  let I = ci * S + (q % S) + cu[corner];
  let J = cj * S + (q / S) + cv[corner];
  let r = LR.refine.x + J * LR.refine.y + I;
  let a = rsurf[3u * r];
  var o: VOut;
  o.world = a.xyz;
  o.wearV = a.w;
  o.dPs = rsurf[3u * r + 1u].xyz;
  o.dPt = rsurf[3u * r + 2u].xyz;
  let bu = f32(bundleOf(LR, 1u));
  let bv = f32(bundleOf(LR, 0u));
  o.uv = vec2<f32>((f32(I) / f32(S)) * bu + 0.5 * (bu - 1.0), (f32(J) / f32(S)) * bv + 0.5 * (bv - 1.0));
  o.layer = l;
  o.cell = vec4<u32>(ci, cj, 0u, 0u);
  o.torn = vec4<u32>(0u);
  o.pos = F.viewProj * vec4<f32>(a.xyz, 1.0);
  return o;
}

// ---------------------------------------------------------------- cells near damage, per crossing

fn debrisS(c: u32, total: u32) -> bool { return ((threadBitsR[debrisWord(c, total)] >> (c & 31u)) & 1u) == 1u; }

// The yarn of family f at crossing c is part of the cloth surface (not separated, not a thread).
fn surfaceYarnS(c: u32, f: u32) -> bool {
  return yarnCode(fieldR[c], f) < PULLED_R && ((threadBitsR[c >> 4u] >> (2u * (c & 15u) + f)) & 1u) == 0u;
}

// Vertex vi of instance ii (a fine cell): six per crossing quad of the cell's crossing grid. A quad
// covers its crossing's area clipped to the cell, so the cells tile; each vertex is placed with the
// connections of its own crossing to the corners, averaged with the neighbouring crossings around
// the vertex that its material reaches directly (along a pick or a warp both are part of): within a
// piece of cloth neighbouring quads meet exactly, across a crack they part.
fn fineVertex(vi: u32, ii: u32) -> VOut {
  let cell = lists[FINE_BASE + ii];
  let l = layerOfCell(cell);
  let LR = R.layers[l];
  let L = LR.lattice;
  let local = cell - LR.refine.z;
  let ci = local % (L.y - 1u);
  let cj = local / (L.y - 1u);
  let g = cellGrid(LR, ci, cj);
  let q = vi / 6u;
  let qk = q % FINE_QK;
  let qm = q / FINE_QK;
  if (qk >= g.z || qm >= g.w) { return degenerate(); }
  let k = i32(g.x + qk);
  let m = i32(g.y + qm);
  let c = fieldIndexR(LR, u32(k), u32(m));
  if (!surfaceYarnS(c, 0u) && !surfaceYarnS(c, 1u)) { return degenerate(); }
  let bu = f32(bundleOf(LR, 1u));
  let bv = f32(bundleOf(LR, 0u));
  let ua = f32(ci) * bu + 0.5 * (bu - 1.0);
  let va = f32(cj) * bv + 0.5 * (bv - 1.0);
  let u0 = max(ua, f32(k) - 0.5);
  let u1 = min(ua + bu, f32(k) + 0.5);
  let v0 = max(va, f32(m) - 0.5);
  let v1 = min(va + bv, f32(m) + 0.5);
  if (u1 - u0 < 1e-4 || v1 - v0 < 1e-4) { return degenerate(); }
  var cuo = array<u32, 6>(0u, 1u, 1u, 0u, 1u, 0u);
  var cvo = array<u32, 6>(0u, 0u, 1u, 0u, 1u, 1u);
  let cu = cuo[vi % 6u];
  let cv = cvo[vi % 6u];
  let U = select(u0, u1, cu == 1u);
  let V = select(v0, v1, cv == 1u);
  // neighbouring crossings around the vertex (where it lies on a crossing corner, not clipped)
  let sx = select(-1, 1, cu == 1u);
  let sy = select(-1, 1, cv == 1u);
  let onX = abs(U - (f32(k) + 0.5 * f32(sx))) < 1e-4;
  let onY = abs(V - (f32(m) + 0.5 * f32(sy))) < 1e-4;
  let K = i32(LR.field.y);
  let M = i32(LR.field.z);
  let kx = k + sx;
  let my = m + sy;
  let inX = onX && kx >= 0 && kx < K;
  let inY = onY && my >= 0 && my < M;
  let cx = fieldIndexR(LR, u32(clamp(kx, 0, K - 1)), u32(m));
  let cy = fieldIndexR(LR, u32(k), u32(clamp(my, 0, M - 1)));
  let cxy = fieldIndexR(LR, u32(clamp(kx, 0, K - 1)), u32(clamp(my, 0, M - 1)));
  // joined along a yarn, within one piece (cloth or a falling piece)
  let total = fieldTotalOf(R.layers[R.counts.y - 1u]);
  let deb = debrisS(c, total);
  let linkX = inX && surfaceYarnS(c, 0u) && surfaceYarnS(cx, 0u) && debrisS(cx, total) == deb;
  let linkY = inY && surfaceYarnS(c, 1u) && surfaceYarnS(cy, 1u) && debrisS(cy, total) == deb;
  let linkXY = inX && inY && debrisS(cxy, total) == deb && ((linkX && surfaceYarnS(cx, 1u) && surfaceYarnS(cxy, 1u)) || (linkY && surfaceYarnS(cy, 0u) && surfaceYarnS(cxy, 0u)));
  let n00 = L.x + cj * L.y + ci;
  var nc = array<u32, 4>(n00, n00 + 1u, n00 + L.y, n00 + L.y + 1u);
  var kap = vec4<f32>(0.0);
  var cnt = 0.0;
  for (var e = 0u; e < 4u; e++) {
    var kk = k;
    var mm = m;
    var take = e == 0u;
    if (e == 1u) {
      kk = kx;
      take = linkX;
    } else if (e == 2u) {
      mm = my;
      take = linkY;
    } else if (e == 3u) {
      kk = kx;
      mm = my;
      take = linkXY;
    }
    if (!take) { continue; }
    kap += vec4<f32>(kappaAt(l, nc[0], kk, mm), kappaAt(l, nc[1], kk, mm), kappaAt(l, nc[2], kk, mm), kappaAt(l, nc[3], kk, mm));
    cnt += 1.0;
  }
  kap /= cnt;
  let mp = matPoint(l, ci, cj, (U - ua) / bu, (V - va) / bv, kap);
  if (!mp.valid) { return degenerate(); }
  var o: VOut;
  o.world = mp.p;
  o.wearV = mp.wear;
  o.dPs = mp.ds;
  o.dPt = mp.dt;
  o.uv = vec2<f32>(U, V);
  o.layer = l;
  o.cell = vec4<u32>(ci, cj, 0u, 0u);
  o.torn = vec4<u32>(1u, 0u, 0u, 0u);
  o.pos = F.viewProj * vec4<f32>(mp.p, 1.0);
  return o;
}

// Crossing of the yarn segment hit at fine point uv: a warp at its nearest pick, a pick at its
// nearest warp.
fn hitCrossing(L: LayerR, h: Hit, uv: vec2<f32>) -> u32 {
  var k: i32;
  var m: i32;
  if (h.fam == 1u) {
    k = h.yarn;
    m = i32(round(uv.y));
  } else {
    k = i32(round(uv.x));
    m = h.yarn;
  }
  k = clamp(k, 0, i32(L.field.y) - 1);
  m = clamp(m, 0, i32(L.field.z) - 1);
  return fieldIndexR(L, u32(k), u32(m));
}

// Damage code of the yarn segment hit at fine point uv.
fn hitDamage(L: LayerR, h: Hit, uv: vec2<f32>) -> u32 {
  return yarnCode(fieldR[hitCrossing(L, h, uv)], h.fam);
}

// The yarn segment hit at uv is gone from the cloth: separated, or a loose thread drawn on its own.
fn hitAbsent(L: LayerR, h: Hit, uv: vec2<f32>) -> bool {
  let c = hitCrossing(L, h, uv);
  if (yarnCode(fieldR[c], h.fam) >= PULLED_R) { return true; }
  return ((threadBitsR[c >> 4u] >> (2u * (c & 15u) + h.fam)) & 1u) == 1u;
}

// A yarn with damage code d is missing at a sample: separated, or (weakened, loosened) frayed through
// at random fibre positions fs, more often the more it is damaged.
fn yarnGone(d: u32, fs: u32) -> bool {
  if (d >= PULLED_R) { return true; }
  let t = f32(d) / 255.0;
  return hashf(fs) < 0.55 * t * t;
}

@vertex
fn vsFine(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  return fineVertex(vi, ii);
}

@vertex
fn vsFineShadow(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> @builtin(position) vec4<f32> {
  let o = fineVertex(vi, ii);
  if (o.pos.z < -1.0) { return o.pos; }
  return F.lightViewProj * vec4<f32>(o.world, 1.0);
}

@vertex
fn vsMain(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  return surfaceVertex(vi, ii);
}

@vertex
fn vsShadow(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> @builtin(position) vec4<f32> {
  let o = surfaceVertex(vi, ii);
  if (o.pos.z < -1.0) { return o.pos; }
  return F.lightViewProj * vec4<f32>(o.world, 1.0);
}

struct FsOut {
  @location(0) color: vec4<f32>,
  @builtin(sample_mask) mask: u32,
};

// ---------------------------------------------------------------- torn rim

// Shape of the rim at one point: how far it reaches (mm), and the local response at distance d.
struct Rim {
  // 0 intact .. 1 at the free edge
  rim: f32,
  // abraded halo around the damage, 0 .. 1
  halo: f32,
  // lip slope (height change per unit distance from the edge, dimensionless) and its direction in the
  // rest chart (unit, pointing away from the edge)
  slope: f32,
  dir: vec2<f32>,
  // occlusion of the rolled edge
  ao: f32,
};

// d: distance to the nearest opening (mm), dir: unit rest-chart gradient of d, rest: rest point (m),
// density: separated yarn ends around it (edge field). A torn edge is abraded and loosened: its
// yarns untwist into a dense band of pale fibre (the rim) inside a wider abraded halo, so it reads as
// a fuzzy pale border, not a cut. A few cut yarns fray a little; an opening whose edge is all yarn
// ends has the full rim.
fn rimAt(d: f32, dir: vec2<f32>, rest: vec2<f32>, layer: u32, density: f32) -> Rim {
  var o: Rim;
  if (d >= EDGE_RMAX) {
    o.rim = 0.0;
    o.halo = 0.0;
    o.slope = 0.0;
    o.dir = dir;
    o.ao = 1.0;
    return o;
  }
  // the loosened band is the yarns beside the cut that lost the crossings holding them: a crossing or
  // a few wide, wandering along the edge from nearly bare stretches to tufted ones
  let n = 0.65 * noise2(4441u + layer, rest / 0.0065) + 0.35 * noise2(4447u + layer, rest / 0.0022);
  let edge = smoothstep(0.03, 0.22, density);
  // calibrated to the reference's torn denim edges: a pale fibrous band of 1-4 mm inside an abraded
  // halo of about 1 cm (the hole opened where the cloth was most worn)
  let w = clamp(2.2 + 1.6 * n, 0.8, 4.0) * mix(0.55, 1.0, edge);
  let x = d / w;
  o.rim = (1.0 - smoothstep(0.0, 1.0, x)) * mix(0.35, 1.0, edge);
  o.halo = (1.0 - smoothstep(0.0, EDGE_RMAX, d)) * edge;
  // a loosened edge does not roll into a lip: its relief is the fibre itself (no normal tilt)
  o.slope = 0.0;
  o.dir = dir;
  o.ao = 1.0;
  return o;
}

// The rim's loosened, untwisted fibres at a rest point: their albedo (undyed weft and pale warp cores
// with some dyed fibre) in rgb and how densely they cover the weave in w. Fibre tufts are drawn out
// across the edge (dir: away from it), so the band is streaked like a fringe, with gaps where the
// dyed weave still shows.
fn rimFibres(rest: vec2<f32>, dir: vec2<f32>, layer: u32, pix: f32, mat: u32) -> vec4<f32> {
  let fine = clamp(1.6 - pix / 0.2e-3, 0.0, 1.0);
  let q = vec2<f32>(dot(rest, dir), dot(rest, vec2<f32>(-dir.y, dir.x)));
  let streak = noise2(5003u + layer, q / vec2<f32>(1.4e-3, 0.22e-3));
  let tuft = noise2(5009u + layer, rest / 0.6e-3);
  let clump = noise2(5021u + layer, rest / 2.2e-3);
  let blue = 0.5 + 0.5 * noise2(5011u + layer, rest / 1.6e-3);
  // undyed weft and the pale cores of untwisted warp, with some fibre that keeps its indigo
  // (jute: pale loosened fibre and the darker stained fibre in place of indigo)
  let pale = fabricRimPale(mat);
  let dyed = fabricRimDyed(mat);
  let alb = mix(pale, dyed, 0.3 * blue) * (0.86 + 0.26 * (0.6 * streak + 0.4 * tuft) * fine);
  let cover = clamp(0.8 + 0.2 * clump + 0.3 * (0.65 * streak + 0.35 * tuft) * fine, 0.0, 1.0);
  return vec4<f32>(alb, cover);
}

@fragment
fn fsMain(in: VOut, @builtin(front_facing) ff: bool) -> FsOut {
  let LR = R.layers[in.layer];
  let rest = restOfUV(LR, in.uv);
  let dx = dpdx(in.uv);
  let dy = dpdy(in.uv);

  // edge field: distance to the nearest separated yarn (mm), its rest-chart gradient (central
  // differences over one crossing), and the filtered intact fraction of warp and pick
  let euv = edgeUV(LR, in.uv);
  let ef = textureSampleLevel(edgeTex, edgeSampler, euv, 0.0);
  let dEdge = ef.x;
  var gEdge = vec2<f32>(0.0);
  if (dEdge < EDGE_RMAX) {
    let tu = vec2<f32>(1.0 / LR.edge.z, 0.0);
    let tv = vec2<f32>(0.0, 1.0 / LR.edge.w);
    let gx = textureSampleLevel(edgeTex, edgeSampler, euv + tu, 0.0).x - textureSampleLevel(edgeTex, edgeSampler, euv - tu, 0.0).x;
    let gy = textureSampleLevel(edgeTex, edgeSampler, euv + tv, 0.0).x - textureSampleLevel(edgeTex, edgeSampler, euv - tv, 0.0).x;
    gEdge = vec2<f32>(gx / LR.pitch.x, gy / LR.pitch.y);
  }
  let gl = length(gEdge);
  let dirEdge = select(vec2<f32>(0.0, 1.0), gEdge / gl, gl > 1e-12);
  let rim = rimAt(dEdge, dirEdge, rest, in.layer, ef.w);
  // weakened (partly separated) yarns around the damage are abraded and pale
  let weak = 1.0 - min(ef.y, 1.0);

  var wearF = min(1.0, in.wearV + 0.6 * rim.halo + 0.35 * weak);
  let ls = length(in.dPs);
  let lt = length(in.dPt);
  let Tu = in.dPs / ls;
  let Tv0 = in.dPt / lt;
  let Ng = normalize(cross(in.dPs, in.dPt));
  let Tv = normalize(Tv0 - dot(Tv0, Tu) * Tu);
  // local stretch of the yarn spacing relative to rest
  let su = ls / (f32(bundleOf(LR, 1u)) * LR.pitch.x);
  let sv = lt / (f32(bundleOf(LR, 0u)) * LR.pitch.y);
  let Vv = normalize(F.camPos.xyz - in.world);
  let front = dot(Ng, Vv) > 0.0;
  let sgn = select(-1.0, 1.0, front);
  // the rolled rim tilts the cloth normal toward the edge
  let lipDir = normalize(Tu * rim.dir.x + Tv * rim.dir.y);
  let Nf = normalize(select(-Ng, Ng, front) - sgn * rim.slope * lipDir);

  let dist = length(F.camPos.xyz - in.world);
  let pix = F.camPos.w * dist;
  let fy = max(length(dx), length(dy));
  // yarns near the pixel size: the prefiltered tile shades the weave
  let lodTile = smoothstep(0.28, 0.55, fy);

  let key = keyLight(in.world);
  let sh = shadowFactor(in.world, Nf);
  let shO = shadowOver(in.world, Nf);
  let over = F.overColor.rgb * shO;
  let amb = F.ambient.rgb * (0.55 + 0.45 * Nf.z);
  let cam = torchLight(in.world);
  // direct irradiance on the cloth's plane, for the haze of fibres bridging the grooves
  let hazeE = key.w * sh * max(dot(Nf, key.xyz), 0.0) * F.keyColor.rgb + over * max(dot(Nf, F.overDir.xyz), 0.0) + cam.w * max(dot(Nf, cam.xyz), 0.0) * F.torchColor.rgb;
  // the rim's loose fibres: pale albedo, more sheen, weave washed out toward the edge
  var fib = vec4<f32>(0.0);
  if (rim.rim > 0.0) { fib = rimFibres(rest, rim.dir, in.layer, pix, LR.refine.w); }
  let rimPale = pow(rim.rim, 0.7) * fib.w;
  let rimAlb = fib.rgb;
  let rimFuzz = 0.9 * rim.rim;


  // 4x MSAA standard sample offsets (pixel units, y down); each also jittered over the hairiness
  // radius (~45 um, wider in the loosened rim), which blurs the weave the way loose fibres do
  var offs = array<vec2<f32>, 4>(vec2<f32>(-0.125, -0.375), vec2<f32>(0.375, -0.125), vec2<f32>(-0.375, 0.125), vec2<f32>(0.125, 0.375));
  let hairy = 45e-6 * (1.0 + 2.5 * rim.rim);
  let fuzzR = vec2<f32>(hairy / (LR.pitch.x * su), hairy / (LR.pitch.y * sv));
  let rotSeed = hash11(u32(in.pos.x) * 7919u + u32(in.pos.y));
  let rot = hashf(rotSeed) * 6.2831853;
  let hTop = LR.warp.z + 0.5 * LR.warp.y;
  // family-mean albedos for the softly blended second yarn
  let warpMean = fabricWarpMean(LR.refine.w);
  let weftMean = fabricWeftMean(LR.refine.w);
  // per sample: woven geometry and appearance; lighting once per pixel on the averaged inputs
  // (Lambert is linear in the normal; the weak specular lobe is the only approximation)
  var albDirect = vec3<f32>(0.0);
  var albAmb = vec3<f32>(0.0);
  var nSum = vec3<f32>(0.0);
  var tSum = vec3<f32>(0.0);
  var fuzz = 0.0;
  var groove = 0.0;
  var cnt = 0.0;
  var mask = 0u;
  for (var k = 0u; k < 4u; k++) {
    if (lodTile >= 1.0) { break; }
    let ang = rot + f32(k) * 2.39996;
    let jr = sqrt((f32(k) + 0.5) / 4.0);
    let uvk = in.uv + dx * offs[k].x + dy * offs[k].y + vec2<f32>(cos(ang), sin(ang)) * jr * fuzzR;
    let w2 = weave2(LR, uvk.x, uvk.y, su, sv, front, 0.018e-3);
    // the yarn damage field: a separated yarn is gone here (the one below shows, if any), a weakened
    // one is loosened: frayed through in places, pale and fuzzy
    var hit = w2.a;
    var wb = w2.wb;
    var dmg = 0.0;
    var loose = 0.0;
    var present = w2.a.covered;
    if (present) {
      let fs = hash11(rotSeed + 977u * k + 13u);
      let ca = hitDamage(LR, w2.a, uvk);
      if (yarnGone(ca, fs) || hitAbsent(LR, w2.a, uvk)) {
        present = w2.b.covered && !hitAbsent(LR, w2.b, uvk);
        hit = w2.b;
        if (!present && w2.a.fam == 1u) {
          // a warp worn through over its pick: the loosened pick spreads into the gap, over its full
          // pitch at rest (stretched cloth still opens between picks)
          let m = round(uvk.y);
          let wh = weftHit(LR, i32(m), uvk.x, uvk.y, su, sv);
          if (abs(uvk.y - m) * sv < 0.5 && !hitAbsent(LR, wh, uvk)) {
            hit = wh;
            hit.x = clamp(hit.x * LR.weft.x / LR.pitch.y, -0.95, 0.95);
            // no longer in the groove under a float: exposed to the light, near the face of the weave
            hit.h = sgn * 0.45 * (LR.warp.z + 0.5 * LR.warp.y);
            hit.slope *= 0.5;
            loose = 1.0;
            present = true;
          }
        }
        wb = 0.0;
        dmg = select(0.0, f32(hitDamage(LR, hit, uvk)) / 255.0, present);
      } else {
        dmg = f32(ca) / 255.0;
        if (wb > 0.02 && w2.b.covered && hitAbsent(LR, w2.b, uvk)) { wb = 0.0; }
      }
    }
    if (present) { mask |= (1u << k); }
    if (!present) { continue; }
    let look = yarnLook(LR, in.layer, hit.fam, hit.yarn, hit.float_, hit.along, hit.x, min(1.0, wearF + 0.7 * dmg), pix, loose);
    var albedo = look.albedo;
    var slope = hit.slope;
    var h = hit.h;
    if (wb > 0.02) {
      albedo = mix(albedo, select(weftMean, warpMean, w2.b.fam == 1u) * (1.0 - 0.4 * wearF) + vec3<f32>(0.12) * wearF, wb);
      slope = mix(slope, w2.b.slope, wb);
      h = mix(h, w2.b.h, wb);
    }
    // the rim's loosened fibres wash the weave out
    albedo = mix(albedo, rimAlb, rimPale);
    slope *= 1.0 - 0.6 * rim.rim;
    let Ny = normalize(Nf - sgn * (slope.x * Tu + slope.y * Tv));
    var axis = select(Tu, Tv, hit.fam == 1u);
    let slopeAlong = select(slope.x, slope.y, hit.fam == 1u);
    axis = normalize(axis + sgn * slopeAlong * Nf);
    let tw = select(LR.weft.w, LR.warp.w, hit.fam == 1u);
    let hn = mix(clamp((sgn * h + hTop) / (2.0 * hTop), 0.0, 1.0), 0.7, rim.rim);
    // interstices between floats (where the weft shows) are deep and shadowed by the neighbours
    let ao = weaveOcclusion(hn) * rim.ao;
    albDirect += albedo * mix(0.55, 1.0, ao);
    albAmb += albedo * ao;
    nSum += Ny;
    tSum += cos(tw) * axis + sin(tw) * cross(Ny, axis);
    fuzz += look.fuzz + rimFuzz + 0.5 * dmg;
    groove += 1.0 - hn;
    cnt += 1.0;
  }
  // the print is a dye over the yarns: it scales what they reflect, warp and weft alike, on both the
  // per-sample path and the filtered weave-tile path
  let printUV = vec2<f32>(in.uv.x / f32(LR.field.y), 1.0 - in.uv.y / f32(LR.field.z));
  let print = textureSampleGrad(printTex, printSampler, printUV, dx / f32(LR.field.y), dy / f32(LR.field.z)).rgb;
  var acc = vec3<f32>(0.0);
  if (cnt > 0.0 && lodTile < 1.0) {
    let inv = 1.0 / cnt;
    albDirect = albDirect * print;
    albAmb = albAmb * print;
    let Nl = normalize(nSum);
    let Tl = normalize(tSum - dot(tSum, Nl) * Nl + 1e-6 * Tu);
    acc = fiberShade(Nl, Tl, Vv, key.xyz, albDirect * inv, fuzz * inv) * (key.w * sh) * F.keyColor.rgb + fiberShade(Nl, Tl, Vv, F.overDir.xyz, albDirect * inv, fuzz * inv) * over + amb * albAmb * inv;
    if (cam.w > 0.0) { acc += fiberShade(Nl, Tl, Vv, cam.xyz, albDirect * inv, fuzz * inv) * cam.w * F.torchColor.rgb; }
    // loose fibres bridging the grooves: a faint haze lifts the deepest points
    acc = mix(acc, (hazeE * 0.06 + amb * 0.6) * vec3<f32>(0.32, 0.36, 0.48), 0.12 * groove * inv * fuzz * inv);
    acc *= cnt;
  }
  var color = acc / max(cnt, 1.0);
  // filtered presence of warp and pick (edge field) for weave below the pixel
  let warpP = clamp(ef.y, 0.0, 1.0);
  let pickP = clamp(ef.z, 0.0, 1.0);
  if (lodTile > 0.0) {
    let rep = f32(LR.twill.x);
    let tex = textureSampleGrad(weaveTile, tileSampler, in.uv / rep, in.layer, dx / rep, dy / rep);
    // the back of a warp-faced twill shows mostly weft; a damaged cell shows what its samples hit;
    // where warps are worn through, the picks beneath them show
    let wfTile0 = select(1.0 - tex.x, tex.x, front);
    let wfTile = wfTile0 * warpP / max(wfTile0 * warpP + (1.0 - wfTile0) * pickP, 1e-3);
    let wf = wfTile;
    let ts = 1.0 - 0.6 * rim.rim;
    let Ny = normalize(Nf - sgn * ts * (tex.z * Tu + tex.w * Tv));
    let kk = i32(round(in.uv.x));
    let m = i32(round(in.uv.y));
    let fl = i32(round((in.uv.y - warpUnderDist(LR, kk, in.uv.y)) / rep));
    let lw = yarnLook(LR, in.layer, 1u, kk, fl, in.uv.y * LR.pitch.y, 0.3, wearF, pix, 0.0);
    let lf = yarnLook(LR, in.layer, 0u, m, 0, in.uv.x * LR.pitch.x, 0.3, wearF, pix, 1.0 - warpP);
    let albedo = mix(mix(lf.albedo, lw.albedo, wf), rimAlb, rimPale) * print;
    let ao = mix(tex.y, 0.8, rim.rim) * rim.ao;
    let tw = mix(LR.weft.w, LR.warp.w, wf);
    let Ta = select(Tu, Tv, wf > 0.5);
    let Tf = normalize(cos(tw) * Ta + sin(tw) * cross(Ny, Ta));
    let fz = mix(lf.fuzz, lw.fuzz, wf) + rimFuzz + 0.5 * weak;
    let albD = albedo * mix(0.55, 1.0, ao);
    var ct = fiberShade(Ny, Tf, Vv, key.xyz, albD, fz) * (key.w * sh) * F.keyColor.rgb + fiberShade(Ny, Tf, Vv, F.overDir.xyz, albD, fz) * over + amb * albedo * ao;
    if (cam.w > 0.0) { ct += fiberShade(Ny, Tf, Vv, cam.xyz, albD, fz) * cam.w * F.torchColor.rgb; }
    ct = mix(ct, (hazeE * 0.06 + amb * 0.6) * vec3<f32>(0.32, 0.36, 0.48), 0.12 * (1.0 - ao) * fz);
    color = select(mix(color, ct, lodTile), ct, cnt == 0.0);
    if (lodTile >= 1.0) {
      // coverage of the filtered cloth: holes where both families are gone, dithered over the samples
      let cover = 1.0 - (1.0 - warpP) * (1.0 - pickP);
      mask = 0u;
      // ordered thresholds: a fixed coverage gives a fixed sample count (no per-pixel noise)
      for (var k = 0u; k < 4u; k++) {
        if (cover > (f32(k) + 0.5) * 0.25) { mask |= 1u << k; }
      }
    }
  }
  if (mask == 0u) { discard; }
  var o: FsOut;
  o.color = vec4<f32>(color, 1.0);
  o.mask = mask;
  return o;
}
`,
  le = `// Where a material point of the cloth is (pieces.wgsl): the refined lattice surface of its cell,
// corrected toward the nodes it is still connected to. Requires module-scope R (RenderU), rsurf
// (refine.wgsl samples), x (positions), tframe (node tangent frames) and kappaM (pieces.wgsl).
//
// Each corner c of the cell enters with the connection kap.c of the point to it. Where that is 1 the
// corner is used as it is; where it is 0 the corner is replaced by a ghost: where the point's own
// material would put it, from the corners it is connected to, each carrying its rest offset to c in its
// own tangent frame. The correction blends with the bilinear weight of the corner, so it vanishes on
// a cell edge for the corners off that edge: a point on an edge is placed the same way from either
// cell. A piece cut off from some corners therefore keeps its rest shape there, and the gap a crack
// opens is what the lattice has stretched across it.

// Connection (0..1) of crossing (k, m) of layer l to node n (pieces.wgsl).
fn kappaAt(l: u32, n: u32, k: i32, m: i32) -> f32 {
  let s = kappaM[KAPPA_TABLE + n];
  if (s == KAPPA_NONE) { return 1.0; }
  if (s == KAPPA_ZERO) { return 0.0; }
  let LR = R.layers[l];
  let L = LR.lattice;
  let local = n - L.x;
  let bu = f32(bundleOf(LR, 1u));
  let bv = f32(bundleOf(LR, 0u));
  let Un = f32(local % L.y) * bu + 0.5 * (bu - 1.0);
  let Vn = f32(local / L.y) * bv + 0.5 * (bv - 1.0);
  let dk = k - i32(ceil(Un - bu - 1.0));
  let dm = m - i32(ceil(Vn - bv - 1.0));
  if (dk < 0 || dm < 0 || dk >= i32(KAPPA_RW) || dm >= i32(KAPPA_RH)) { return 1.0; }
  let e = u32(dm) * KAPPA_RW + u32(dk);
  let w = kappaM[KAPPA_TABLE + R.counts.x + KAPPA_SLOTS + s * KAPPA_WORDS + (e >> 2u)];
  return f32((w >> (8u * (e & 3u))) & 0xFFu) / 255.0;
}

struct MatPoint {
  // false: the material is connected to none of the cell's corners (it is not held by this cell)
  valid: bool,
  p: vec3<f32>,
  // derivatives over the cell (s along u, t along v)
  ds: vec3<f32>,
  dt: vec3<f32>,
  wear: f32,
};

// Point (s, t) of cell (ci, cj) of layer l whose material has connections kap to the cell's corners
// (corner index: bit 0 = +i, bit 1 = +j).
fn matPoint(l: u32, ci: u32, cj: u32, s: f32, t: f32, kap: vec4<f32>) -> MatPoint {
  let LR = R.layers[l];
  let L = LR.lattice;
  let S = LR.twill.z;
  // refined surface: bilinear within the refined sub-quad, as the intact cells' triangles draw it
  let sI = clamp(s, 0.0, 1.0) * f32(S);
  let tI = clamp(t, 0.0, 1.0) * f32(S);
  let I0 = min(u32(floor(sI)), S - 1u);
  let J0 = min(u32(floor(tI)), S - 1u);
  let fs = sI - f32(I0);
  let ft = tI - f32(J0);
  let r00 = LR.refine.x + (cj * S + J0) * LR.refine.y + ci * S + I0;
  let r10 = r00 + 1u;
  let r01 = r00 + LR.refine.y;
  let r11 = r01 + 1u;
  let w00 = (1.0 - fs) * (1.0 - ft);
  let w10 = fs * (1.0 - ft);
  let w01 = (1.0 - fs) * ft;
  let w11 = fs * ft;
  var o: MatPoint;
  o.valid = any(kap > vec4<f32>(0.02));
  let a = rsurf[3u * r00] * w00 + rsurf[3u * r10] * w10 + rsurf[3u * r01] * w01 + rsurf[3u * r11] * w11;
  o.p = a.xyz;
  o.wear = a.w;
  o.ds = (rsurf[3u * r00 + 1u] * w00 + rsurf[3u * r10 + 1u] * w10 + rsurf[3u * r01 + 1u] * w01 + rsurf[3u * r11 + 1u] * w11).xyz;
  o.dt = (rsurf[3u * r00 + 2u] * w00 + rsurf[3u * r10 + 2u] * w10 + rsurf[3u * r01 + 2u] * w01 + rsurf[3u * r11 + 2u] * w11).xyz;
  if (all(kap >= vec4<f32>(0.999))) { return o; }
  // Partly connected: the corners are corrected (a corner the point is cut off from is replaced by
  // where the point's own material would put it), and the point placed bilinearly between the
  // corrected corners; the bicubic surface's curvature detail over that is kept only as far as the
  // point is connected to all four (a far corner, e.g. of a piece that fell away, never bends it).
  let n00 = L.x + cj * L.y + ci;
  var nc = array<u32, 4>(n00, n00 + 1u, n00 + L.y, n00 + L.y + 1u);
  var h = array<f32, 4>((1.0 - s) * (1.0 - t), s * (1.0 - t), (1.0 - s) * t, s * t);
  var hs = array<f32, 4>(-(1.0 - t), 1.0 - t, -t, t);
  var ht = array<f32, 4>(-(1.0 - s), -s, 1.0 - s, s);
  let restU = f32(bundleOf(LR, 1u)) * LR.pitch.x;
  let restV = f32(bundleOf(LR, 0u)) * LR.pitch.y;
  var Pb = vec3<f32>(0.0);
  var Pbs = vec3<f32>(0.0);
  var Pbt = vec3<f32>(0.0);
  var Qb = vec3<f32>(0.0);
  var Qbs = vec3<f32>(0.0);
  var Qbt = vec3<f32>(0.0);
  for (var c = 0u; c < 4u; c++) {
    let Pc = x[nc[c]].xyz;
    var Qc = Pc;
    if (kap[c] < 0.999) {
      var G = vec3<f32>(0.0);
      var W = 0.0;
      for (var q = 0u; q < 4u; q++) {
        if (q == c) { continue; }
        let wq = (h[q] + 1e-3) * kap[q];
        if (wq <= 0.0) { continue; }
        let di = f32(i32(c & 1u) - i32(q & 1u));
        let dj = f32(i32(c >> 1u) - i32(q >> 1u));
        G += wq * (x[nc[q]].xyz + di * restU * tframe[2u * nc[q]].xyz + dj * restV * tframe[2u * nc[q] + 1u].xyz);
        W += wq;
      }
      if (W > 1e-9) { Qc = mix(G / W, Pc, kap[c]); }
    }
    Pb += h[c] * Pc;
    Pbs += hs[c] * Pc;
    Pbt += ht[c] * Pc;
    Qb += h[c] * Qc;
    Qbs += hs[c] * Qc;
    Qbt += ht[c] * Qc;
  }
  let detail = min(min(kap.x, kap.y), min(kap.z, kap.w));
  o.p = Qb + detail * (o.p - Pb);
  o.ds = Qbs + detail * (o.ds - Pbs);
  o.dt = Qbt + detail * (o.dt - Pbt);
  return o;
}

// Cell (ci, cj) of the fine point (U, V) of layer l and its coordinates (s, t) in it.
fn cellOfUV(l: u32, U: f32, V: f32) -> vec4<f32> {
  let LR = R.layers[l];
  let L = LR.lattice;
  let bu = f32(bundleOf(LR, 1u));
  let bv = f32(bundleOf(LR, 0u));
  let su = (U - 0.5 * (bu - 1.0)) / bu;
  let sv = (V - 0.5 * (bv - 1.0)) / bv;
  let ci = clamp(floor(su), 0.0, f32(L.y) - 2.0);
  let cj = clamp(floor(sv), 0.0, f32(L.z) - 2.0);
  return vec4<f32>(ci, cj, su - ci, sv - cj);
}

// Material point of crossing (k, m) of layer l, from its own connections to its cell's corners.
fn crossingPoint(l: u32, k: i32, m: i32) -> MatPoint {
  let cc = cellOfUV(l, f32(k), f32(m));
  let ci = u32(cc.x);
  let cj = u32(cc.y);
  let L = R.layers[l].lattice;
  let n00 = L.x + cj * L.y + ci;
  let kap = vec4<f32>(kappaAt(l, n00, k, m), kappaAt(l, n00 + 1u, k, m), kappaAt(l, n00 + L.y, k, m), kappaAt(l, n00 + L.y + 1u, k, m));
  return matPoint(l, ci, cj, cc.z, cc.w, kap);
}
`,
  ue = `// Material connectivity of the cloth around each lattice node (rebuilt with the loose threads, when
// the yarn field changed).
//
// The mechanical lattice carries forces at bundle resolution; where the cloth is torn, which material
// moves with which node is decided at yarn resolution. Surface material (a crossing with a yarn that
// is neither separated nor drawn as a loose thread, threads.wgsl) forms a graph: neighbouring
// crossings are joined along a pick where the pick is surface material at both, along a warp
// likewise. For a node near damage, the connection of a crossing to it is the ratio of their rest
// (Manhattan) distance to the shortest path between them through that graph: 1 where the material
// between them is whole, falling toward 0 the further a crack forces the path around, 0 where none
// exists. A crossing across a long crack is therefore cut off from the node (it moves with the
// material on its own side), one near the crack's tip stays partly attached, so an opening tapers to
// nothing at the tip, as an elastic crack does (the visibility / diffraction criterion of meshfree
// crack methods). The surface (surface.wgsl vsFine) places every crossing from the nodes it is
// connected to.
//
// Passes: piecesClear, cellDirty (per cell: does it lack any surface material), nodeAlloc (per node: a
// slot when its domain has a dirty cell), piecesArgs, kappaSolve (one workgroup per slot: shortest
// paths over the domain, then the connection of the crossings of the node's cells; a node whose
// crossings all stay connected gives its slot up as clean), edgeListMain (crossings of surface
// material with an open side: the free edges, at yarn resolution) and edgeDrawArgs.

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<storage, read> field: array<u32>;
@group(0) @binding(2) var<storage, read> threadBits: array<u32>;
@group(0) @binding(3) var<storage, read> nodes: array<NodeStaticR>;
@group(0) @binding(4) var<storage, read> x: array<vec4<f32>>;
// slot count, slot table per node, node of each slot, connection fields (render_common.wgsl KAPPA_*)
@group(0) @binding(5) var<storage, read_write> kappa: array<atomic<u32>>;
// per cell: lacks surface material somewhere
@group(0) @binding(6) var<storage, read_write> cellDirty: array<u32>;
// [0..2] indirect dispatch of kappaSolve, [3] edge crossings, [4..7] indirect draw of the edge fibres,
// [8..10] indirect dispatch of their roots (edge_roots.wgsl, 64 per group), [12..15] indirect draw of
// the aggregate fringe
@group(0) @binding(7) var<storage, read_write> piecesArgs: array<atomic<u32>>;
// edge crossings (crossing | open sides << 28: bit 0 -u, 1 +u, 2 -v, 3 +v), for the edge fibres; their
// count at [MAX_EDGES]
@group(0) @binding(8) var<storage, read_write> edgeList: array<u32>;

fn retiredP(n: u32) -> bool { return x[n].w > 1.5; }

fn nodeIJ(n: u32) -> vec2<u32> { return vec2<u32>(nodes[n].ijl & 0xFFFu, (nodes[n].ijl >> 12u) & 0xFFFu); }

// Slots persist across rebuilds (cleared only by a reset): a node keeps its slot, and a slot whose
// node's domain graph is unchanged keeps its connection field (kappaSolve compares a hash). During a
// tear only the domains the new separations touch are solved again.
fn hashBase() -> u32 { return KAPPA_TABLE + R.counts.x + KAPPA_SLOTS + KAPPA_SLOTS * KAPPA_WORDS; }
// per slot: hash of the domain graph of its last solve (0: never), bit 31 set when it came out clean
fn slotHash(s: u32) -> u32 { return hashBase() + s; }
// per node: its slot + 1 (0: none)
fn nodeSlot(n: u32) -> u32 { return hashBase() + KAPPA_SLOTS + n; }

@compute @workgroup_size(128)
fn piecesClear(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x == 0u) { atomicStore(&piecesArgs[3], 0u); }
}

// One invocation per cell (global cell index over all layers).
@compute @workgroup_size(128)
fn cellDirtyMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let cell = gid.x;
  if (cell >= R.counts.z) { return; }
  var l = 0u;
  for (var q = 1u; q < R.counts.y; q++) {
    if (cell >= R.layers[q].refine.z) { l = q; }
  }
  let LR = R.layers[l];
  let local = cell - LR.refine.z;
  let ci = local % (LR.lattice.y - 1u);
  let cj = local / (LR.lattice.y - 1u);
  let g = cellGrid(LR, ci, cj);
  var dirty = 0u;
  for (var r = 0u; r < g.w && dirty == 0u; r++) {
    for (var q = 0u; q < g.z; q++) {
      let c = fieldIndexR(LR, g.x + q, g.y + r);
      if (!surfaceYarn(c, 0u) || !surfaceYarn(c, 1u)) {
        dirty = 1u;
        break;
      }
    }
  }
  cellDirty[cell] = dirty;
}

fn debrisP(c: u32) -> bool { return ((threadBits[debrisWord(c, fieldTotalOf(R.layers[R.counts.y - 1u]))] >> (c & 31u)) & 1u) == 1u; }

fn surfaceYarn(c: u32, f: u32) -> bool {
  return yarnCode(field[c], f) < PULLED_R && ((threadBits[c >> 4u] >> (2u * (c & 15u) + f)) & 1u) == 0u;
}

@compute @workgroup_size(128)
fn nodeAlloc(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= R.counts.x) { return; }
  if (retiredP(n)) {
    atomicStore(&kappa[KAPPA_TABLE + n], KAPPA_ZERO);
    return;
  }
  let l = nodes[n].ijl >> 24u;
  let LR = R.layers[l];
  let L = LR.lattice;
  let ij = nodeIJ(n);
  // domain: the 2 x 2 cells around the node and one cell beyond
  var dirty = false;
  for (var dj = -2; dj <= 1 && !dirty; dj++) {
    for (var di = -2; di <= 1; di++) {
      let ci = i32(ij.x) + di;
      let cj = i32(ij.y) + dj;
      if (ci < 0 || cj < 0 || ci >= i32(L.y) - 1 || cj >= i32(L.z) - 1) { continue; }
      if (cellDirty[LR.refine.z + u32(cj) * (L.y - 1u) + u32(ci)] != 0u) {
        dirty = true;
        break;
      }
    }
  }
  if (!dirty) {
    atomicStore(&kappa[KAPPA_TABLE + n], KAPPA_NONE);
    return;
  }
  var s = atomicLoad(&kappa[nodeSlot(n)]);
  if (s == 0u) {
    let a = atomicAdd(&kappa[0], 1u);
    if (a >= KAPPA_SLOTS) {
      atomicStore(&kappa[KAPPA_TABLE + n], KAPPA_NONE);
      return;
    }
    s = a + 1u;
    atomicStore(&kappa[nodeSlot(n)], s);
    atomicStore(&kappa[KAPPA_TABLE + R.counts.x + a], n);
  }
  // kappaSolve keeps this, or gives the slot's table entry up when the node's cells are all connected
  atomicStore(&kappa[KAPPA_TABLE + n], s - 1u);
}

@compute @workgroup_size(1)
fn piecesArgsMain() {
  atomicStore(&piecesArgs[0], min(atomicLoad(&kappa[0]), KAPPA_SLOTS));
  atomicStore(&piecesArgs[1], 1u);
  atomicStore(&piecesArgs[2], 1u);
}

// After kappaSolve: no further solve until the next rebuild sets the dispatch again.
@compute @workgroup_size(1)
fn piecesArgsReset() { atomicStore(&piecesArgs[0], 0u); }

// One invocation per crossing (global over the layers): a crossing of surface material is on a free
// edge on each side where the material does not continue (no neighbour joined along that yarn).
@compute @workgroup_size(128)
fn edgeListMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  var l = 0u;
  for (var q = 1u; q < R.counts.y; q++) {
    if (c >= R.layers[q].field.x) { l = q; }
  }
  let F = R.layers[l].field;
  if (c >= F.x + F.y * F.z) { return; }
  let pk = surfaceYarn(c, 0u);
  let wp = surfaceYarn(c, 1u);
  if (!pk && !wp) { return; }
  let k = (c - F.x) % F.y;
  let m = (c - F.x) / F.y;
  // a side is open where the yarn running across it ends here (or is absent) and the material there
  // is missing: picks run along u, warps along v
  var sides = 0u;
  let deb = debrisP(c);
  let hasL = k > 0u && pk && surfaceYarn(c - 1u, 0u);
  let hasR = k + 1u < F.y && pk && surfaceYarn(c + 1u, 0u);
  let hasD = m > 0u && wp && surfaceYarn(c - F.y, 1u);
  let hasU = m + 1u < F.z && wp && surfaceYarn(c + F.y, 1u);
  let matL = k > 0u && (surfaceYarn(c - 1u, 0u) || surfaceYarn(c - 1u, 1u)) && debrisP(c - 1u) == deb;
  let matR = k + 1u < F.y && (surfaceYarn(c + 1u, 0u) || surfaceYarn(c + 1u, 1u)) && debrisP(c + 1u) == deb;
  let matD = m > 0u && (surfaceYarn(c - F.y, 0u) || surfaceYarn(c - F.y, 1u)) && debrisP(c - F.y) == deb;
  let matU = m + 1u < F.z && (surfaceYarn(c + F.y, 0u) || surfaceYarn(c + F.y, 1u)) && debrisP(c + F.y) == deb;
  if (!hasL && !matL && k > 0u) { sides |= 1u; }
  if (!hasR && !matR && k + 1u < F.y) { sides |= 2u; }
  if (!hasD && !matD && m > 0u) { sides |= 4u; }
  if (!hasU && !matU && m + 1u < F.z) { sides |= 8u; }
  if (sides == 0u) { return; }
  let e = atomicAdd(&piecesArgs[3], 1u);
  if (e < MAX_EDGES) { edgeList[e] = c | (sides << 28u); }
}

@compute @workgroup_size(1)
fn edgeDrawArgs() {
  let n = min(atomicLoad(&piecesArgs[3]), MAX_EDGES);
  atomicStore(&piecesArgs[4], FIBER_VERTS);
  atomicStore(&piecesArgs[5], n * FIBERS_PER_EDGE);
  atomicStore(&piecesArgs[6], 0u);
  atomicStore(&piecesArgs[7], 0u);
  atomicStore(&piecesArgs[8], (n + 63u) / 64u);
  atomicStore(&piecesArgs[9], 1u);
  atomicStore(&piecesArgs[10], 1u);
  edgeList[MAX_EDGES] = n;
}

// Shortest material paths over the node's domain (DW x DH crossings), then its connection field.
var<workgroup> dist: array<f32, KAPPA_DOMAIN>;
// bit 0: surface material, bit 1: joined to the next crossing along u (pick), bit 2: along v (warp)
var<workgroup> graph: array<u32, KAPPA_DOMAIN>;
var<workgroup> changed: u32;
var<workgroup> unclean: u32;
var<workgroup> graphHash: atomic<u32>;
var<workgroup> decide: u32;
// nearest material of the node's own piece within its half cell (rest distance, um)
var<workgroup> nearest: atomic<u32>;

@compute @workgroup_size(256)
fn kappaSolve(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) t: u32) {
  let slot = wg.x;
  let n = atomicLoad(&kappa[KAPPA_TABLE + R.counts.x + slot]);
  // only nodes whose domain has a cell without surface material this rebuild (nodeAlloc)
  if (t == 0u) { decide = select(0u, 1u, atomicLoad(&kappa[KAPPA_TABLE + n]) != slot); }
  if (workgroupUniformLoad(&decide) != 0u) { return; }
  let l = nodes[n].ijl >> 24u;
  let LR = R.layers[l];
  let ij = nodeIJ(n);
  let bu = f32(bundleOf(LR, 1u));
  let bv = f32(bundleOf(LR, 0u));
  let Un = f32(ij.x) * bu + 0.5 * (bu - 1.0);
  let Vn = f32(ij.y) * bv + 0.5 * (bv - 1.0);
  let dk0 = i32(ceil(Un - 2.0 * bu - 1.0));
  let dm0 = i32(ceil(Vn - 2.0 * bv - 1.0));
  let K = i32(LR.field.y);
  let M = i32(LR.field.z);
  let pu = LR.pitch.x;
  let pv = LR.pitch.y;
  for (var e = t; e < KAPPA_DOMAIN; e += 256u) {
    let k = dk0 + i32(e % KAPPA_DW);
    let m = dm0 + i32(e / KAPPA_DW);
    var gb = 0u;
    var d = 1e30;
    if (k >= 0 && m >= 0 && k < K && m < M) {
      let c = fieldIndexR(LR, u32(k), u32(m));
      let pk = surfaceYarn(c, 0u);
      let wp = surfaceYarn(c, 1u);
      // material of a falling piece and of the cloth are never joined
      let deb = debrisP(c);
      if (pk || wp) { gb |= 1u; }
      if (pk && k + 1 < K && surfaceYarn(c + 1u, 0u) && debrisP(c + 1u) == deb) { gb |= 2u; }
      if (wp && m + 1 < M && surfaceYarn(c + LR.field.y, 1u) && debrisP(c + LR.field.y) == deb) { gb |= 4u; }
      // candidate seeds: material of the node's own piece within its half cell (bit 3)
      if ((gb & 1u) != 0u && deb == (x[n].w > 0.5) && abs(f32(k) - Un) <= 0.5 * bu && abs(f32(m) - Vn) <= 0.5 * bv) {
        gb |= 8u;
        d = abs(f32(k) - Un) * pu + abs(f32(m) - Vn) * pv;
      }
    }
    graph[e] = gb;
    dist[e] = d;
    if (gb != 0u) { atomicXor(&graphHash, hash11(e * 16u + gb + 0x9e3779b9u)); }
  }
  if (t == 0u) { atomicStore(&nearest, 0xFFFFFFFFu); }
  workgroupBarrier();
  // the same graph as at this slot's last solve: its connection field still holds
  let h = ((atomicLoad(&graphHash) ^ select(0u, 0x55555555u, x[n].w > 0.5)) & 0x7FFFFFFFu) | 1u;
  if (t == 0u) {
    let prev = atomicLoad(&kappa[slotHash(slot)]);
    decide = select(0u, 1u, (prev & 0x7FFFFFFFu) == h);
    if (decide != 0u && (prev & 0x80000000u) != 0u) { atomicStore(&kappa[KAPPA_TABLE + n], KAPPA_NONE); }
  }
  if (workgroupUniformLoad(&decide) != 0u) { return; }
  for (var e = t; e < KAPPA_DOMAIN; e += 256u) {
    if ((graph[e] & 8u) != 0u) { atomicMin(&nearest, u32(dist[e] * 1e6)); }
  }
  workgroupBarrier();
  // seeds: the nearest material cluster only (within a pitch of the nearest), so that a node standing
  // in a hole holds the cloth beside it, and a crack passing near a node still cuts off its far side
  let d0 = f32(atomicLoad(&nearest)) * 1e-6 + max(pu, pv);
  for (var e = t; e < KAPPA_DOMAIN; e += 256u) {
    if ((graph[e] & 8u) == 0u || dist[e] > d0) { dist[e] = 1e30; }
  }
  workgroupBarrier();
  // Bellman-Ford relaxation in place: distances only decrease toward the unique shortest-path fixed
  // point, so the order of the racing updates does not change the result
  for (var it = 0u; it < 4u * (KAPPA_DW + KAPPA_DH); it++) {
    if (t == 0u) { changed = 0u; }
    workgroupBarrier();
    var any = false;
    for (var e = t; e < KAPPA_DOMAIN; e += 256u) {
      let gb = graph[e];
      if ((gb & 1u) == 0u) { continue; }
      let ek = e % KAPPA_DW;
      var d = dist[e];
      if (ek > 0u && (graph[e - 1u] & 2u) != 0u) { d = min(d, dist[e - 1u] + pu); }
      if (ek + 1u < KAPPA_DW && (gb & 2u) != 0u) { d = min(d, dist[e + 1u] + pu); }
      if (e >= KAPPA_DW && (graph[e - KAPPA_DW] & 4u) != 0u) { d = min(d, dist[e - KAPPA_DW] + pv); }
      if (e + KAPPA_DW < KAPPA_DOMAIN && (gb & 4u) != 0u) { d = min(d, dist[e + KAPPA_DW] + pv); }
      if (d < dist[e]) {
        dist[e] = d;
        any = true;
      }
    }
    // every writer stores the same value
    if (any) { changed = 1u; }
    workgroupBarrier();
    if (workgroupUniformLoad(&changed) == 0u) { break; }
  }
  // connection field over the node's own cells and one crossing beyond (RW x RH from rk0, rm0)
  if (t == 0u) { unclean = 0u; }
  workgroupBarrier();
  let rk0 = i32(ceil(Un - bu - 1.0));
  let rm0 = i32(ceil(Vn - bv - 1.0));
  let base = KAPPA_TABLE + R.counts.x + KAPPA_SLOTS + slot * KAPPA_WORDS;
  for (var w = t; w < KAPPA_WORDS; w += 256u) {
    var word = 0u;
    for (var b = 0u; b < 4u; b++) {
      let e = 4u * w + b;
      if (e >= KAPPA_RW * KAPPA_RH) { break; }
      let k = rk0 + i32(e % KAPPA_RW);
      let m = rm0 + i32(e / KAPPA_RW);
      let de = (k - dk0) + (m - dm0) * i32(KAPPA_DW);
      var kap = 1.0;
      if (de >= 0 && de < i32(KAPPA_DOMAIN) && (graph[de] & 1u) != 0u) {
        let dm = abs(f32(k) - Un) * pu + abs(f32(m) - Vn) * pv;
        let ratio = (dm + pu) / (dist[de] + pu);
        kap = smoothstep(KAPPA_LO, KAPPA_HI, ratio);
      }
      if (kap < 0.995) { unclean = 1u; }
      word |= u32(round(kap * 255.0)) << (8u * b);
    }
    atomicStore(&kappa[base + w], word);
  }
  workgroupBarrier();
  if (t == 0u) {
    if (unclean == 0u) { atomicStore(&kappa[KAPPA_TABLE + n], KAPPA_NONE); }
    atomicStore(&kappa[slotHash(slot)], h | select(0u, 0x80000000u, unclean == 0u));
  }
}
`,
  de = `// Loose threads from the yarn damage field. Where a yarn is no longer interlaced with the yarns
// crossing it, it is a thread: picks across a ladder of worn-through warps, a bridge over an opening,
// a lone warp across such a ladder, an end standing out of an edge. Every maximal run of such lone
// crossings is one thread, drawn continuously from where it leaves the cloth to where it re-enters it
// or ends at its own cut (thread.wgsl): every yarn end standing out of an edge, and every longer run
// (at least MIN_RUN crossings) held at both ends. A shorter run held at both ends (a worn-through
// float of the twill) stays part of the cloth surface. A run ends where its bundle no longer holds in
// the mechanics (emitSplit).
//
// Per crossing and family, in order:
//  - present: the field has not separated the yarn segment (cut, or pulled out: the end slid away from
//    the crossing) and its material is still in the scene. A
//    separated span's yarns belong, up to their cut, to the node on each side, and a piece that fell
//    out of the scene (retired) takes its part with it, except where its yarn is still interlaced
//    with a retained yarn of the other family: the lattice moves a bundle of yarns as one, so it
//    would otherwise carry off whole bundles along straight lattice lines; a yarn held in the
//    retained weave tears at the weave's edge instead;
//  - anchored: present and part of a continuous piece of at least three crossings (a shorter fragment,
//    cut on both sides, is held by nothing and holds nothing);
//  - cloth: both yarns anchored at all four crossings of some 2 x 2 block around it. Interlacing is a
//    two-dimensional property: a single warp surviving across a ladder of picks is a thread crossing
//    threads, not a strip of cloth;
//  - lone: anchored where the crossing is not cloth.
//
// Rebuilt only when the field changed or a piece was retired, with the edge field (its indirect
// dispatch): threadClear, threadPresence, threadAnchor, threadCloth, then threadScan finds the runs
// (one invocation per crossing, a run is walked by the invocation at its start) and appends them with
// their draw chunks; threadArgs writes the indirect draws every frame; retireCount counts retired
// nodes every frame (the rebuild test). The thread bits tell the surface which yarns it must not draw
// (threads, fragments, departed material).

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<storage, read> field: array<u32>;
// per 16 crossings: bit 2 (c & 15) + f = the yarn of family f at crossing c is not part of the cloth
// surface (drawn as a thread, a fragment, or departed); then, from word words16(), 1 bit per crossing:
// its material belongs to a falling piece (debrisBit, render_common.wgsl)
@group(0) @binding(2) var<storage, read_write> threadBits: array<atomic<u32>>;
// [0] runs, [1] chunks, [2] retired nodes (this frame), [3] unused
@group(0) @binding(3) var<storage, read_write> threadCount: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> runs: array<vec4<u32>>;
@group(0) @binding(5) var<storage, read_write> chunks: array<u32>;
// indirect draws: threads (vertexCount, instanceCount, 0, 0), thread fibres (same); then the per-run
// preparation dispatch (x, y, z)
@group(0) @binding(6) var<storage, read_write> threadDraw: array<u32>;
@group(0) @binding(7) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read> segw: array<vec4<u32>>;
// rebuild scratch: present bits (2 per crossing, 16 per word), then anchored bits (same layout), then
// cloth bits (1 per crossing, 32 per word)
@group(0) @binding(9) var<storage, read_write> scratch: array<u32>;

override MAX_RUNS: u32 = 65536u;
override MAX_CHUNKS: u32 = 262144u;

fn fieldTotalT() -> u32 {
  let F = R.layers[R.counts.y - 1u].field;
  return F.x + F.y * F.z;
}
fn words16() -> u32 { return (fieldTotalT() + 15u) / 16u; }

@compute @workgroup_size(128)
fn threadClear(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = gid.x;
  if (w == 0u) {
    atomicStore(&threadCount[0], 0u);
    atomicStore(&threadCount[1], 0u);
  }
  if (w < words16() + (words16() + 1u) / 2u) { atomicStore(&threadBits[w], 0u); }
}

@compute @workgroup_size(128)
fn retireCount(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x < R.counts.x && x[gid.x].w > 1.5) { atomicAdd(&threadCount[2], 1u); }
}

struct Cross {
  l: u32,
  k: u32,
  m: u32,
  valid: bool,
};

fn crossOf(c: u32) -> Cross {
  var o: Cross;
  o.l = 0u;
  for (var q = 1u; q < R.counts.y; q++) {
    if (c >= R.layers[q].field.x) { o.l = q; }
  }
  let F = R.layers[o.l].field;
  o.valid = c < F.x + F.y * F.z;
  let local = c - F.x;
  o.k = local % F.y;
  o.m = local / F.y;
  return o;
}

// State of the node owning the yarn of family f at crossing (k, m) of layer l (the field says it has
// not separated there): 0 cloth, 1 a falling piece (debris), 2 retired. A separated span's yarn
// belongs, up to its first separation, to the span's owner node, beyond it to the other node.
fn nodeState(n: u32) -> u32 { return select(select(0u, 1u, x[n].w > 0.5), 2u, x[n].w > 1.5); }

fn ownerState(l: u32, k: u32, m: u32, f: u32) -> u32 {
  let LR = R.layers[l];
  let L = LR.lattice;
  let FL = LR.field;
  let bu = bundleOf(LR, 1u);
  let bv = bundleOf(LR, 0u);
  // the yarn's span (yarnField.ts ownSpan), its index q in the bundle and crossing p along it
  var i: u32;
  var j: u32;
  var q: u32;
  var p: u32;
  if (f == 1u) {
    if (m < bv / 2u) { return 0u; }
    i = k / bu;
    j = (m - bv / 2u) / bv;
    if (i >= L.y || j + 2u > L.z) { return 0u; }
    q = k - i * bu;
    p = m - (j * bv + bv / 2u);
  } else {
    if (k < bu / 2u) { return 0u; }
    j = m / bv;
    i = (k - bu / 2u) / bu;
    if (j >= L.z || i + 2u > L.y) { return 0u; }
    q = m - j * bv;
    p = k - (i * bu + bu / 2u);
  }
  let a = L.x + j * L.y + i;
  let b = a + select(L.y, 1u, f == 0u);
  let s = 2u * a + f;
  if ((segw[2u * s + 1u].y & SEG_BROKEN_R) == 0u) { return max(nodeState(a), nodeState(b)); }
  // separated span: the part before the yarn's first separation (cut or pulled out) is a's, after it b's
  let P = select(bu, bv, f == 1u);
  var first = P;
  for (var pp = 0u; pp < P; pp++) {
    var c: u32;
    if (f == 1u) { c = FL.x + (j * bv + bv / 2u + pp) * FL.y + i * bu + q; } else { c = FL.x + (j * bv + q) * FL.y + i * bu + bu / 2u + pp; }
    if (yarnCode(field[c], f) >= PULLED_R) {
      first = pp;
      break;
    }
  }
  return nodeState(select(b, a, p < first));
}

// One invocation per 16 crossings: the present bits of both families, and which crossings belong to
// a falling piece (threadBits debris region, debrisBit). A yarn owned by the cloth stays; a yarn of a
// falling piece goes with it, unless it is interlaced there with a yarn the cloth keeps, which tears
// it out of the piece (the lattice moves whole bundles: without this a piece would take the cloth's
// yarns along straight bundle lines, or the cloth would stay joined to a piece that has left); a
// retired piece's yarn stays only where it is interlaced with a cloth yarn.
@compute @workgroup_size(128)
fn threadPresence(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = gid.x;
  let total = fieldTotalT();
  if (w >= words16()) { return; }
  var bits = 0u;
  var debris = 0u;
  for (var e = 0u; e < 16u; e++) {
    let c = 16u * w + e;
    if (c >= total) { break; }
    let t = crossOf(c);
    let word = field[c];
    let uncut = vec2<bool>(yarnCode(word, 0u) < PULLED_R, yarnCode(word, 1u) < PULLED_R);
    let st = vec2<u32>(select(3u, ownerState(t.l, t.k, t.m, 0u), uncut.x), select(3u, ownerState(t.l, t.k, t.m, 1u), uncut.y));
    let clothHere = st.x == 0u || st.y == 0u;
    var any = false;
    var deb = false;
    for (var f = 0u; f < 2u; f++) {
      var keep = false;
      if (st[f] == 0u) { keep = true; }
      // a falling piece's yarn: with the piece, unless the cloth keeps the yarn crossing it here
      if (st[f] == 1u && !clothHere) {
        keep = true;
        deb = true;
      }
      // a retired piece's yarn interlaced with a cloth yarn stays with the cloth
      if (st[f] == 2u && st[1u - f] == 0u) { keep = true; }
      if (keep) {
        bits |= 1u << (2u * e + f);
        any = true;
      }
    }
    if (any && deb) { debris |= 1u << e; }
  }
  scratch[w] = bits;
  if (debris != 0u) { atomicOr(&threadBits[words16() + (w >> 1u)], debris << (16u * (w & 1u))); }
}

fn presentAt(c: u32, f: u32) -> bool { return ((scratch[c >> 4u] >> (2u * (c & 15u) + f)) & 1u) == 1u; }
fn anchoredAt(c: u32, f: u32) -> bool { return ((scratch[words16() + (c >> 4u)] >> (2u * (c & 15u) + f)) & 1u) == 1u; }
fn clothAt(c: u32) -> bool { return ((scratch[2u * words16() + (c >> 5u)] >> (c & 31u)) & 1u) == 1u; }

// One invocation per 16 crossings: the anchored bits (the field's border counts as present).
@compute @workgroup_size(128)
fn threadAnchor(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = gid.x;
  let total = fieldTotalT();
  if (w >= words16()) { return; }
  var bits = 0u;
  for (var e = 0u; e < 16u; e++) {
    let c = 16u * w + e;
    if (c >= total) { break; }
    let t = crossOf(c);
    let F = R.layers[t.l].field;
    for (var f = 0u; f < 2u; f++) {
      if (!presentAt(c, f)) { continue; }
      let pos = i32(select(t.m, t.k, f == 0u));
      let len = i32(select(F.z, F.y, f == 0u));
      let stride = i32(select(F.y, 1u, f == 0u));
      var pr: array<bool, 5>;
      for (var d = -2; d <= 2; d++) {
        let q = pos + d;
        pr[d + 2] = q < 0 || q >= len || presentAt(u32(i32(c) + d * stride), f);
      }
      if ((pr[1] && pr[3]) || (pr[3] && pr[4]) || (pr[1] && pr[0])) { bits |= 1u << (2u * e + f); }
    }
  }
  scratch[words16() + w] = bits;
}

// Both yarns anchored at crossing (k, m) of field F (outside the field: cloth).
fn interlaced(F: vec4<u32>, k: i32, m: i32) -> bool {
  if (k < 0 || m < 0 || k >= i32(F.y) || m >= i32(F.z)) { return true; }
  let c = F.x + u32(m) * F.y + u32(k);
  return anchoredAt(c, 0u) && anchoredAt(c, 1u);
}

// One invocation per 32 crossings: the cloth bits.
@compute @workgroup_size(128)
fn threadCloth(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = gid.x;
  let total = fieldTotalT();
  if (w >= (total + 31u) / 32u) { return; }
  var bits = 0u;
  for (var e = 0u; e < 32u; e++) {
    let c = 32u * w + e;
    if (c >= total) { break; }
    let t = crossOf(c);
    let F = R.layers[t.l].field;
    let k = i32(t.k);
    let m = i32(t.m);
    if (!interlaced(F, k, m)) { continue; }
    let l = interlaced(F, k - 1, m);
    let r = interlaced(F, k + 1, m);
    let d = interlaced(F, k, m - 1);
    let u = interlaced(F, k, m + 1);
    let cloth = (l && d && interlaced(F, k - 1, m - 1)) || (r && d && interlaced(F, k + 1, m - 1)) || (l && u && interlaced(F, k - 1, m + 1)) || (r && u && interlaced(F, k + 1, m + 1));
    if (cloth) { bits |= 1u << e; }
  }
  scratch[2u * words16() + w] = bits;
}

// 0: the yarn of family f is not part of the cloth here (separated, a loose fragment, departed), 1:
// lone, 2: woven.
fn yarnState(c: u32, f: u32) -> u32 {
  if (!anchoredAt(c, f)) { return 0u; }
  return select(1u, 2u, clothAt(c));
}

// Append run [pos, pos + n) of a yarn (family f, cross index yarn) with its ends (0 held in the cloth,
// 1 free, 2 the field's border). A piece cut free at both ends has nothing holding it: it has fallen.
fn emitRun(l: u32, f: u32, yarn: u32, pos: u32, n: u32, endA: u32, endB: u32) {
  if (n == 0u || (endA == 1u && endB == 1u)) { return; }
  let r = atomicAdd(&threadCount[0], 1u);
  if (r >= MAX_RUNS) { return; }
  runs[r] = vec4<u32>(l | (f << 4u) | (endA << 5u) | (endB << 7u), yarn | (pos << 16u), n, 0u);
  // drawn over n + 1 crossings: half a crossing beyond each end (into the weave, or to the cut)
  let nc = n / CHUNK + 1u;
  let c0 = atomicAdd(&threadCount[1], nc);
  for (var q = 0u; q < nc; q++) {
    if (c0 + q < MAX_CHUNKS) { chunks[c0 + q] = (r << 10u) | q; }
  }
}

// The run as the mechanics holds it. A bundle span that no longer holds (every yarn in it separated,
// or the bundle slipped out of a crossing) carries no yarn across it: its material went to the two
// nodes as tails, split at the span's failure site (yarnfield.wgsl couple). A yarn of that bundle may
// still be uncut along its own lone run (its cut lies just past where it is held), but nothing joins
// its two sides any more: the run ends there, each part hanging from its own side. Drawing it held at
// both ends would bridge an opening the mechanics opened, straight through whatever lies between.
fn emitSplit(l: u32, f: u32, yarn: u32, pos: u32, n: u32, endA: u32, endB: u32) {
  // a yarn with a free end already hangs from its held side (thread_geom.wgsl runCenter)
  if (endA == 1u || endB == 1u) {
    emitRun(l, f, yarn, pos, n, endA, endB);
    return;
  }
  let LR = R.layers[l];
  let L = LR.lattice;
  let bu = bundleOf(LR, 1u);
  let bv = bundleOf(LR, 0u);
  let Bal = select(bv, bu, f == 0u);
  let Bcr = select(bu, bv, f == 0u);
  let len = select(L.z, L.y, f == 0u);
  let b = yarn / Bcr;
  // crossings the drawn run covers, held ends included
  let lo = select(pos, pos - 1u, endA == 0u && pos > 0u);
  let hi = select(pos + n - 1u, pos + n, endB == 0u);
  let half = Bal / 2u;
  let a0 = select(0u, (lo - half) / Bal, lo >= half);
  let a1 = min(select(0u, (hi - half) / Bal, hi >= half), len - 2u);
  var cur = pos;
  var curA = endA;
  for (var a = a0; a <= a1; a++) {
    let owner = L.x + select(a * L.y + b, b * L.y + a, f == 0u);
    let w = segw[2u * (2u * owner + f) + 1u];
    if ((w.y & (SEG_EXISTS_R | SEG_BROKEN_R)) == SEG_EXISTS_R) { continue; }
    let site = a * Bal + half + u32(round(clamp(bitcast<f32>(w.z), 0.0, 1.0) * f32(Bal)));
    let sp = clamp(site, cur, pos + n);
    if (sp > cur) { emitRun(l, f, yarn, cur, sp - cur, curA, 1u); }
    cur = sp;
    curA = 1u;
  }
  emitRun(l, f, yarn, cur, pos + n - cur, curA, endB);
}

@compute @workgroup_size(128)
fn threadScan(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  let t = crossOf(c);
  if (!t.valid) { return; }
  let F = R.layers[t.l].field;
  for (var f = 0u; f < 2u; f++) {
    let st = yarnState(c, f);
    // a fragment that fell out of the weave, or material that left with a retired piece: not drawn,
    // and no longer cloth
    if (st == 0u && yarnCode(field[c], f) < PULLED_R) { atomicOr(&threadBits[c >> 4u], 1u << (2u * (c & 15u) + f)); }
    if (st != 1u) { continue; }
    // along the yarn: a pick (f = 0) runs over the warps k, a warp over the picks m
    let pos = select(t.m, t.k, f == 0u);
    let len = select(F.z, F.y, f == 0u);
    let stride = select(F.y, 1u, f == 0u);
    if (pos > 0u && yarnState(c - stride, f) == 1u) { continue; }
    var n = 1u;
    loop {
      if (pos + n >= len || n >= 4096u || yarnState(c + n * stride, f) != 1u) { break; }
      n++;
    }
    // ends: 0 held in the cloth, 1 free (the yarn itself ends there), 2 the field's border
    var endA = 2u;
    if (pos > 0u) { endA = select(0u, 1u, yarnState(c - stride, f) == 0u); }
    var endB = 2u;
    if (pos + n < len) { endB = select(0u, 1u, yarnState(c + n * stride, f) == 0u); }
    // a short run held at both ends is a worn-through float of the cloth; a yarn end standing out of
    // an edge is a thread however short
    if (n < MIN_RUN && endA != 1u && endB != 1u) { continue; }
    emitSplit(t.l, f, select(t.k, t.m, f == 0u), pos, n, endA, endB);
    for (var q = 0u; q < n; q++) {
      let cc = c + q * stride;
      atomicOr(&threadBits[cc >> 4u], 1u << (2u * (cc & 15u) + f));
    }
  }
}

@compute @workgroup_size(1)
fn threadArgs() {
  let nc = min(atomicLoad(&threadCount[1]), MAX_CHUNKS);
  threadDraw[0] = THREAD_VERTS;
  threadDraw[1] = nc;
  threadDraw[2] = 0u;
  threadDraw[3] = 0u;
  threadDraw[4] = FIBER_VERTS;
  threadDraw[5] = nc * FIBERS_PER_CHUNK;
  threadDraw[6] = 0u;
  threadDraw[7] = 0u;
  // per-run preparation (thread_prep.wgsl), 64 runs per workgroup
  threadDraw[8] = (min(atomicLoad(&threadCount[0]), MAX_RUNS) + 63u) / 64u;
  threadDraw[9] = 1u;
  threadDraw[10] = 1u;
}
`,
  fe = `// Loose thread geometry (threads.wgsl runs), shared by the per-run preparation and the thread and
// fibre passes. Requires module-scope R (RenderU), nodes, x, segw, tframe and nrm.
//
// A thread follows the mechanical lattice: its bundle (the lattice row of a pick, the column of a
// warp) is a chain of nodes that carries the yarns' load and moves with it, and the thread is that
// chain's Catmull-Rom curve through the spans that still hold. The chain is a one-dimensional strand:
// mechanics resolves the bundle's motion, not where its yarns lie across it. Where a yarn is held in
// the weave it keeps its woven place; away from it, freed of the crossing yarns, the bundle's yarns
// cling together side by side in one to three flat clumps around the chain. No shape is added that the
// chain does not have: a thread swings, sags and settles as its strand does. Beyond the last span its
// chain holds, a yarn held at one end takes its free tail's solved shape (thread_prep.wgsl), and
// near a free end it leaves its clump.

fn liveTh(n: u32) -> bool { return x[n].w < 1.5; }

fn segOkTh(owner: u32, f: u32, L: vec4<u32>) -> bool {
  let fl = segw[2u * (2u * owner + f) + 1u].y;
  if ((fl & (SEG_EXISTS_R | SEG_BROKEN_R)) != SEG_EXISTS_R) { return false; }
  return liveTh(owner) && liveTh(owner + select(L.y, 1u, f == 0u));
}

// Bundle chain of family f through cross index b: node at along index a.
fn chainNode(L: vec4<u32>, f: u32, a: u32, b: u32) -> u32 { return L.x + select(a * L.y + b, b * L.y + a, f == 0u); }

struct Center {
  p: vec3<f32>,
  // d p / d (crossing along the yarn)
  d: vec3<f32>,
  // unit direction across the bundle (the crossing family's tangent) and cloth normal
  side: vec3<f32>,
  nrm: vec3<f32>,
  valid: bool,
};

// Centre line of the yarn's bundle at fine coordinate p (crossings along the yarn).
fn centerAt(ri: RunInfo, p: f32) -> Center {
  var o: Center;
  o.valid = false;
  let LR = R.layers[ri.layer];
  let L = LR.lattice;
  let f = ri.fam;
  let Bal = f32(select(bundleOf(LR, 0u), bundleOf(LR, 1u), f == 0u));
  let Bcr = select(bundleOf(LR, 1u), bundleOf(LR, 0u), f == 0u);
  let len = select(L.z, L.y, f == 0u);
  let b = ri.yarn / Bcr;
  let s = (p - 0.5 * (Bal - 1.0)) / Bal;
  let a0 = u32(clamp(floor(s), 0.0, f32(len) - 2.0));
  let t = s - f32(a0);
  let n0 = chainNode(L, f, a0, b);
  let n1 = chainNode(L, f, a0 + 1u, b);
  let pitchAl = select(LR.pitch.y, LR.pitch.x, f == 0u);
  if (segOkTh(n0, f, L)) {
    let p0 = x[n0].xyz;
    let p1 = x[n1].xyz;
    var pm = 2.0 * p0 - p1;
    if (a0 > 0u) {
      let nm = chainNode(L, f, a0 - 1u, b);
      if (segOkTh(nm, f, L)) { pm = x[nm].xyz; }
    }
    var pp = 2.0 * p1 - p0;
    if (a0 + 2u < len && segOkTh(n1, f, L)) { pp = x[chainNode(L, f, a0 + 2u, b)].xyz; }
    o.p = cmrT(pm, p0, p1, pp, t);
    o.d = cmrdT(pm, p0, p1, pp, t) / Bal;
    o.side = mix(tframe[2u * n0 + 1u - f].xyz, tframe[2u * n1 + 1u - f].xyz, clamp(t, 0.0, 1.0));
    o.nrm = mix(nrm[n0].xyz, nrm[n1].xyz, clamp(t, 0.0, 1.0));
    o.valid = liveTh(n0) && liveTh(n1);
  } else {
    // the bundle has separated in this span: the piece hangs from the node on the yarn's held side,
    // along that node's frame, drooping more the further it reaches
    let fromA = ri.heldA;
    let nh = select(n1, n0, fromA);
    if (!liveTh(nh)) { return o; }
    let dirN = tframe[2u * nh + f].xyz;
    let reach = (p - (f32(select(a0 + 1u, a0, fromA)) * Bal + 0.5 * (Bal - 1.0))) * pitchAl;
    let down = vec3<f32>(0.0, 0.0, -1.0);
    let dr = abs(reach);
    o.p = x[nh].xyz + dirN * reach + down * (0.35 * dr * dr / 1.5e-3);
    o.d = (dirN + down * (0.7 * reach / 1.5e-3)) * pitchAl;
    o.side = tframe[2u * nh + 1u - f].xyz;
    o.nrm = nrm[nh].xyz;
    o.valid = true;
  }
  return o;
}

fn cmrT(p0: vec3<f32>, p1: vec3<f32>, p2: vec3<f32>, p3: vec3<f32>, t: f32) -> vec3<f32> {
  let t2 = t * t;
  let t3 = t2 * t;
  return 0.5 * (2.0 * p1 + (p2 - p0) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 + (3.0 * p1 - p0 - 3.0 * p2 + p3) * t3);
}
fn cmrdT(p0: vec3<f32>, p1: vec3<f32>, p2: vec3<f32>, p3: vec3<f32>, t: f32) -> vec3<f32> {
  return 0.5 * ((p2 - p0) + 2.0 * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t + 3.0 * (3.0 * p1 - p0 - 3.0 * p2 + p3) * t * t);
}

// Per run and frame (thread_prep.wgsl). The lattice chain is the bundle's; the cloth a thread comes
// out of is placed per crossing (material_map.wgsl), so its held ends are attached where that cloth
// is: pA / pB (where held). Where the chain carries the thread over its whole drawn range (its spans
// hold, its nodes are of one piece) the thread follows the chain, shifted to meet the ends; otherwise
// (a falling piece, a separated bundle) it runs straight between its held ends, or, held at one end,
// follows its chain as far as that holds and beyond it takes its free tail's shape (thread_prep.wgsl
// tailSolve: tails, TAIL_SEGS + 1 points per tail).
struct RunGeo {
  chain: bool,
  // held at one end only, not carried whole: the drawn parameter up to which the chain carries it from
  // its held end (thread_prep.wgsl chainReach)
  reach: f32,
  // the free tail beyond reach: its slot in tails (-1: none) and its length (m)
  tail: i32,
  tailLen: f32,
  pA: vec3<f32>,
  pB: vec3<f32>,
  tA: vec3<f32>,
  tB: vec3<f32>,
};

// Chain point at drawn parameter p shifted so the thread meets its held ends.
fn endOffset(ri: RunInfo, g: RunGeo, cA: vec3<f32>, cB: vec3<f32>, p: f32) -> vec3<f32> {
  let dA = g.pA - cA;
  let dB = g.pB - cB;
  if (!ri.heldA) { return dB; }
  if (!ri.heldB) { return dA; }
  return mix(dA, dB, clamp((p - ri.drawA) / (ri.drawB - ri.drawA), 0.0, 1.0));
}

// Centre line of run ri at drawn parameter p (see RunGeo); chain points at the drawn ends cA, cB.
fn runCenter(ri: RunInfo, g: RunGeo, cA: vec3<f32>, cB: vec3<f32>, p: f32) -> Center {
  var c = centerAt(ri, p);
  if (g.chain) {
    c.p += endOffset(ri, g, cA, cB, p);
    return c;
  }
  let LR = R.layers[ri.layer];
  let pitchAl = select(LR.pitch.y, LR.pitch.x, ri.fam == 0u);
  let span = ri.drawB - ri.drawA;
  var o: Center;
  o.valid = true;
  o.side = c.side;
  o.nrm = c.nrm;
  if (!c.valid) {
    o.side = cross(vec3<f32>(0.0, 0.0, 1.0), select(g.tA, g.tB, !ri.heldA));
    o.nrm = vec3<f32>(0.0, 0.0, 1.0);
  }
  if (ri.heldA && ri.heldB) {
    let tr = clamp((p - ri.drawA) / span, 0.0, 1.0);
    o.p = mix(g.pA, g.pB, tr);
    o.d = (g.pB - g.pA) / span;
    return o;
  }
  // held at one end: along its chain as far as the chain holds (shifted to meet the held end), then
  // hanging from the chain's last point: it leaves along the yarn's direction there and bends over
  // toward the vertical within a bending length, at its own length (integrated along the arc)
  let fromA = ri.heldA;
  let held = select(ri.drawB, ri.drawA, fromA);
  let shift = endOffset(ri, g, cA, cB, p);
  if (select(p >= g.reach, p <= g.reach, fromA) && c.valid) {
    o.p = c.p + shift;
    o.d = c.d;
    return o;
  }
  if (g.tail >= 0) {
    // the solved tail, by arc length from its root (Catmull-Rom through its points)
    let h = g.tailLen / f32(TAIL_SEGS);
    let u = clamp(abs(p - g.reach) * pitchAl / max(h, 1e-9), 0.0, f32(TAIL_SEGS));
    let i = min(u32(floor(u)), TAIL_SEGS - 1u);
    let t = u - f32(i);
    let b = u32(g.tail) * (TAIL_SEGS + 1u);
    let p0 = tails[b + i].xyz;
    let p1 = tails[b + i + 1u].xyz;
    let pm = select(2.0 * p0 - p1, tails[b + i - 1u].xyz, i > 0u);
    let pp = select(2.0 * p1 - p0, tails[b + i + 2u].xyz, i + 1u < TAIL_SEGS);
    o.p = cmrT(pm, p0, p1, pp, t);
    o.d = cmrdT(pm, p0, p1, pp, t) / max(h, 1e-9) * pitchAl * select(-1.0, 1.0, fromA);
    return o;
  }
  var q = select(g.pB, g.pA, fromA);
  var dir0 = select(-g.tB, g.tA, fromA);
  if (g.reach != held) {
    let e = centerAt(ri, g.reach);
    q = e.p + shift;
    dir0 = normalize(e.d * select(-1.0, 1.0, fromA) + vec3<f32>(1e-9, 0.0, 0.0));
  }
  let reach = abs(p - g.reach) * pitchAl;
  let down = vec3<f32>(0.0, 0.0, -1.0);
  let lb = 1.5e-3;
  var dq = dir0;
  let steps = 6u;
  for (var k = 0u; k < steps; k++) {
    let sm = (f32(k) + 0.5) / f32(steps) * reach;
    dq = normalize(mix(dir0, down, sm / (sm + lb)) + vec3<f32>(1e-9, 0.0, 0.0));
    q += dq * (reach / f32(steps));
  }
  o.p = q;
  o.d = dq * pitchAl * select(-1.0, 1.0, fromA);
  return o;
}

fn runGeoZero() -> RunGeo {
  var g: RunGeo;
  g.chain = true;
  g.reach = 0.0;
  g.tail = -1;
  g.tailLen = 0.0;
  g.pA = vec3<f32>(0.0);
  g.pB = vec3<f32>(0.0);
  g.tA = vec3<f32>(1.0, 0.0, 0.0);
  g.tB = vec3<f32>(1.0, 0.0, 0.0);
  return g;
}

struct ThreadPoint {
  p: vec3<f32>,
  t: vec3<f32>,
  n: vec3<f32>,
  radius: f32,
  // 0 .. 1 toward a free tip (untwisting)
  tip: f32,
  valid: bool,
};

// Point of the thread of run ri at parameter p; cA, cB are the chain points at the drawn ends
// (centerAt), when g.chain.
fn threadAt(ri: RunInfo, g: RunGeo, cA: vec3<f32>, cB: vec3<f32>, p: f32) -> ThreadPoint {
  var o: ThreadPoint;
  let c = runCenter(ri, g, cA, cB, p);
  o.valid = c.valid;
  if (!c.valid) { return o; }
  let LR = R.layers[ri.layer];
  let f = ri.fam;
  let Bcr = select(bundleOf(LR, 1u), bundleOf(LR, 0u), f == 0u);
  let pitchAl = select(LR.pitch.y, LR.pitch.x, f == 0u);
  let pitchCr = select(LR.pitch.x, LR.pitch.y, f == 0u);
  let T = normalize(c.d + vec3<f32>(1e-9, 0.0, 0.0));
  var S = c.side - dot(c.side, T) * T;
  S = normalize(S + vec3<f32>(0.0, 0.0, 1e-7));
  let N = normalize(cross(T, S) * sign(dot(cross(T, S), c.nrm) + 1e-9));
  let b = ri.yarn / Bcr;
  let q = ri.yarn % Bcr;
  let seedY = hash11((ri.layer * 7919u + ri.yarn) * 2u + f + 0x51ed27u);
  let seedB = hash11((ri.layer * 7919u + b) * 2u + f + 0x2c1b3cu);
  let rY = select(LR.loose.y, LR.loose.x, f == 0u) * (0.88 + 0.24 * hashf(seedY + 5u));
  o.radius = rY;
  let along = p * pitchAl;
  // distance (crossings) to where the yarn is held in the weave
  let eA = select(1e6, p - ri.pos + 0.5, ri.heldA);
  let eB = select(1e6, ri.pos + ri.n - 0.5 - p, ri.heldB);
  let e = max(min(eA, eB), 0.0);
  // Freed of the crossing yarns, neighbouring yarns cling together side by side (fibre cohesion and
  // entanglement) within a couple of millimetres of where they leave the weave: a bundle's yarns form
  // one to three flat clumps, each near where its yarns were woven, so a ladder shows groups of pale
  // strands with dark gaps between them rather than evenly spaced lines.
  let eMm = e * pitchAl * 1e3;
  let gather = smoothstep(0.3, 2.5, eMm);
  let gs = clamp((eMm - 0.3) / 2.2, 0.0, 1.0);
  let dGather = select(0.0, 6.0 * gs * (1.0 - gs) / 2.2 * pitchAl * 1e3, e > 0.0 && e < 1e5) * select(1.0, -1.0, eA > eB);
  let woven = (f32(q) - 0.5 * f32(Bcr - 1u)) * pitchCr;
  let hc = hashf(seedB);
  let nClumps = select(select(3u, 2u, hc < 0.75), 1u, hc < 0.3 || Bcr < 3u);
  // contiguous ranges of yarns, split at hashed points
  let cut1 = 1u + u32(hashf(seedB + 21u) * f32(max(Bcr - 1u, 1u)));
  let cut2 = 1u + u32(hashf(seedB + 22u) * f32(max(Bcr - 1u, 1u)));
  let lo = min(cut1, cut2);
  let hi = max(cut1, cut2);
  var c0 = 0u;
  var c1 = Bcr;
  if (nClumps == 2u) {
    if (q < cut1) { c1 = cut1; } else { c0 = cut1; }
  } else if (nClumps == 3u) {
    if (q < lo) { c1 = lo; } else if (q < hi || hi == lo) { c0 = lo; c1 = max(hi, lo + 1u); } else { c0 = hi; }
  }
  let cn = c1 - c0;
  let slot = f32(q - c0) - 0.5 * f32(cn - 1u);
  let clumpLat = (0.5 * f32(c0 + c1 - 1u) - 0.5 * f32(Bcr - 1u)) * pitchCr + (hashf(seedB + 23u + c0) - 0.5) * 0.4 * pitchCr;
  // side by side, touching (loose yarns flatten against each other), the flat clump turning slowly
  // about its axis (pitch 15-30 mm, either hand)
  let spacing = 1.6 * rY;
  let twist = (15e-3 + 15e-3 * hashf(seedB + 3u + c0)) * select(-1.0, 1.0, hashf(seedB + 4u + c0) < 0.5);
  let phi = 6.2831853 * (along / twist + hashf(seedB + 5u + c0));
  let dPhi = 6.2831853 * pitchAl / twist;
  let inCord = vec2<f32>(cos(phi), sin(phi)) * (slot * spacing);
  let dInCord = vec2<f32>(-sin(phi), cos(phi)) * (slot * spacing * dPhi);
  let cordLat = clumpLat;
  let lat = mix(woven, cordLat + inCord.x, gather);
  let up = gather * inCord.y;
  var P = c.p + S * lat + N * up;
  var dP = c.d + S * (gather * dInCord.x + dGather * (cordLat + inCord.x - woven)) + N * (gather * dInCord.y + dGather * inCord.y);
  // a free end leaves the cord over its last millimetre or two: it splays a little away from the
  // other yarns (its weight bends a freed yarn over ~1.4 cm, not within its tip: tailSolve)
  o.tip = 0.0;
  if (!ri.heldA || !ri.heldB) {
    let lt = (0.6e-3 + 1.8e-3 * hashf(seedY + 6u)) / pitchAl;
    let u = clamp(select(p - (ri.drawB - lt), (ri.drawA + lt) - p, !ri.heldA) / lt, 0.0, 1.0);
    let splay = S * (0.35 * (hashf(seedY + 10u) - 0.5)) + N * (0.2 * (hashf(seedY + 11u) - 0.5));
    let off = splay * (lt * pitchAl);
    P += off * (u * u);
    dP += off * (2.0 * u / lt) * select(1.0, -1.0, !ri.heldA);
    o.tip = u;
    o.radius *= 1.0 - 0.45 * u;
  }
  o.p = P;
  o.t = normalize(dP + vec3<f32>(1e-9, 0.0, 0.0));
  o.n = N;
  return o;
}

// The per-frame geometry of run r written by threadPrep (RUN_GEO vec4 per run). Requires module-scope
// runGeo.
fn runGeoAt(r: u32) -> RunGeo {
  var g: RunGeo;
  let h = runGeo[RUN_GEO * r];
  g.chain = h.x > 0.5;
  g.reach = h.y;
  g.tail = i32(h.z);
  g.tailLen = h.w;
  g.pA = runGeo[RUN_GEO * r + 1u].xyz;
  g.pB = runGeo[RUN_GEO * r + 2u].xyz;
  g.tA = runGeo[RUN_GEO * r + 3u].xyz;
  g.tB = runGeo[RUN_GEO * r + 4u].xyz;
  return g;
}
`,
  pe = `// Per frame, per thread run (threads.wgsl): where its held ends are (the cloth they come out of,
// material_map.wgsl), whether the lattice chain carries it (thread_geom.wgsl RunGeo), and where a free
// tail beyond the chain's reach leaves it (solved by thread_tail.wgsl).

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> segw: array<vec4<u32>>;
@group(0) @binding(3) var<storage, read> tframe: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> nrm: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> runs: array<vec4<u32>>;
@group(0) @binding(6) var<storage, read> threadCount: array<u32>;
// per run, RUN_GEO vec4 (thread.wgsl runGeoAt)
@group(0) @binding(7) var<storage, read_write> runGeo: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read> rsurf: array<vec4<f32>>;
@group(0) @binding(9) var<storage, read> kappaM: array<u32>;
// (runCenter reads the solved tails; threadPrep does not)
var<private> tails: array<vec4<f32>, 1>;

override MAX_RUNS: u32 = 65536u;

// The chain spans over the run's drawn range hold, between nodes of one piece.
fn chainCarries(ri: RunInfo) -> bool {
  let LR = R.layers[ri.layer];
  let L = LR.lattice;
  let f = ri.fam;
  let Bal = f32(select(bundleOf(LR, 0u), bundleOf(LR, 1u), f == 0u));
  let Bcr = select(bundleOf(LR, 1u), bundleOf(LR, 0u), f == 0u);
  let len = select(L.z, L.y, f == 0u);
  let b = ri.yarn / Bcr;
  let a0 = u32(clamp(floor((ri.drawA - 0.5 * (Bal - 1.0)) / Bal), 0.0, f32(len) - 2.0));
  let a1 = u32(clamp(floor((ri.drawB - 0.5 * (Bal - 1.0)) / Bal), 0.0, f32(len) - 2.0));
  let w0 = x[chainNode(L, f, a0, b)].w;
  for (var a = a0; a <= a1; a++) {
    let n = chainNode(L, f, a, b);
    if (!segOkTh(n, f, L) || abs(x[n].w - w0) > 0.5 || abs(x[chainNode(L, f, a + 1u, b)].w - w0) > 0.5) { return false; }
  }
  return true;
}

// A run held at one end only: the drawn parameter up to which (from that end) its chain still holds,
// in one piece. Beyond it the yarn hangs from the chain's last point (thread_geom.wgsl runCenter).
fn chainReach(ri: RunInfo) -> f32 {
  let LR = R.layers[ri.layer];
  let L = LR.lattice;
  let f = ri.fam;
  let Bal = f32(select(bundleOf(LR, 0u), bundleOf(LR, 1u), f == 0u));
  let Bcr = select(bundleOf(LR, 1u), bundleOf(LR, 0u), f == 0u);
  let len = select(L.z, L.y, f == 0u);
  let b = ri.yarn / Bcr;
  let off = 0.5 * (Bal - 1.0);
  let a0 = u32(clamp(floor((ri.drawA - off) / Bal), 0.0, f32(len) - 2.0));
  let a1 = u32(clamp(floor((ri.drawB - off) / Bal), 0.0, f32(len) - 2.0));
  if (ri.heldA) {
    let w0 = x[chainNode(L, f, a0, b)].w;
    for (var a = a0; a <= a1; a++) {
      let n = chainNode(L, f, a, b);
      if (!segOkTh(n, f, L) || abs(x[chainNode(L, f, a + 1u, b)].w - w0) > 0.5) { return clamp(f32(a) * Bal + off, ri.drawA, ri.drawB); }
    }
    return ri.drawB;
  }
  let w1 = x[chainNode(L, f, a1 + 1u, b)].w;
  for (var a = i32(a1); a >= i32(a0); a--) {
    let n = chainNode(L, f, u32(a), b);
    if (!segOkTh(n, f, L) || abs(x[n].w - w1) > 0.5) { return clamp(f32(a + 1) * Bal + off, ri.drawA, ri.drawB); }
  }
  return ri.drawA;
}

// The held end at drawn parameter p (a crossing where the yarn is in the cloth): where that cloth is,
// and the yarn's unit direction there (toward increasing p). Falls back to the chain when the cloth
// is not held there.
fn heldEnd(ri: RunInfo, p: f32) -> array<vec3<f32>, 2> {
  let chain = centerAt(ri, p);
  let a = i32(round(p));
  let k = select(i32(ri.yarn), a, ri.fam == 0u);
  let m = select(a, i32(ri.yarn), ri.fam == 0u);
  let F = R.layers[ri.layer].field;
  var o = array<vec3<f32>, 2>(chain.p, normalize(chain.d + vec3<f32>(1e-9, 0.0, 0.0)));
  if (k < 0 || m < 0 || k >= i32(F.y) || m >= i32(F.z)) { return o; }
  let mp = crossingPoint(ri.layer, k, m);
  if (!mp.valid) { return o; }
  o[0] = mp.p;
  o[1] = normalize(select(mp.dt, mp.ds, ri.fam == 0u) + vec3<f32>(1e-9, 0.0, 0.0));
  return o;
}

@compute @workgroup_size(64)
fn threadPrep(@builtin(global_invocation_id) gid: vec3<u32>) {
  let r = gid.x;
  if (r >= min(threadCount[0], MAX_RUNS)) { return; }
  let ri = runInfo(runs[r]);
  var g = runGeoZero();
  g.chain = chainCarries(ri);
  let cA = centerAt(ri, ri.drawA).p;
  let cB = centerAt(ri, ri.drawB).p;
  g.pA = cA;
  g.pB = cB;
  // ends held in the cloth (not at the field's border, where the chain is the cloth)
  if (((runs[r].x >> 5u) & 3u) == 0u) {
    let e = heldEnd(ri, ri.drawA);
    g.pA = e[0];
    g.tA = e[1];
  }
  if (((runs[r].x >> 7u) & 3u) == 0u) {
    let e = heldEnd(ri, ri.drawB);
    g.pB = e[0];
    g.tB = e[1];
  }
  // a run held at one end and not carried whole: how far its chain carries it from that end, and the
  // free tail beyond
  var reach = select(ri.drawA, ri.drawB, ri.heldA);
  var tailLen = 0.0;
  if (!g.chain && ri.heldA != ri.heldB) {
    reach = chainReach(ri);
    let LR = R.layers[ri.layer];
    let pitchAl = select(LR.pitch.y, LR.pitch.x, ri.fam == 0u);
    tailLen = abs(select(ri.drawA, ri.drawB, ri.heldA) - reach) * pitchAl;
    g.reach = reach;
    let root = tailRoot(ri, g, cA, cB);
    runGeo[RUN_GEO * r + 7u] = root[0];
    runGeo[RUN_GEO * r + 8u] = root[1];
  }
  // the tail's slot is set by threadTail
  runGeo[RUN_GEO * r] = vec4<f32>(select(0.0, 1.0, g.chain), reach, -1.0, tailLen);
  runGeo[RUN_GEO * r + 1u] = vec4<f32>(g.pA, 0.0);
  runGeo[RUN_GEO * r + 2u] = vec4<f32>(g.pB, 0.0);
  runGeo[RUN_GEO * r + 3u] = vec4<f32>(g.tA, 0.0);
  runGeo[RUN_GEO * r + 4u] = vec4<f32>(g.tB, 0.0);
  runGeo[RUN_GEO * r + 5u] = vec4<f32>(cA, 0.0);
  runGeo[RUN_GEO * r + 6u] = vec4<f32>(cB, 0.0);
}

// Where the free tail of a run held at one end leaves its chain (as runCenter leaves it): its root
// point and the chain node there (w), and the yarn's direction.
fn tailRoot(ri: RunInfo, g: RunGeo, cA: vec3<f32>, cB: vec3<f32>) -> array<vec4<f32>, 2> {
  let LR = R.layers[ri.layer];
  let fromA = ri.heldA;
  let held = select(ri.drawB, ri.drawA, fromA);
  let shift = endOffset(ri, g, cA, cB, g.reach);
  var q = select(g.pB, g.pA, fromA);
  var dir0 = select(-g.tB, g.tA, fromA);
  let L = LR.lattice;
  let f = ri.fam;
  let Bal = f32(select(bundleOf(LR, 0u), bundleOf(LR, 1u), f == 0u));
  let Bcr = select(bundleOf(LR, 1u), bundleOf(LR, 0u), f == 0u);
  let len = select(L.z, L.y, f == 0u);
  let a = u32(clamp(round((g.reach - 0.5 * (Bal - 1.0)) / Bal), 0.0, f32(len) - 1.0));
  let root = chainNode(L, f, a, ri.yarn / Bcr);
  if (g.reach != held) {
    let e = centerAt(ri, g.reach);
    q = e.p + shift;
    dir0 = normalize(e.d * select(-1.0, 1.0, fromA) + vec3<f32>(1e-9, 0.0, 0.0));
  }
  return array<vec4<f32>, 2>(vec4<f32>(q, f32(root)), vec4<f32>(dir0, 0.0));
}
`,
  me = `// Free tails of loose threads held at one end (threads.wgsl runs; thread_prep.wgsl places their roots),
// per frame: each solved into TAIL_SEGS + 1 points that runCenter (thread_geom.wgsl) follows.

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> runs: array<vec4<u32>>;
@group(0) @binding(3) var<storage, read> threadCount: array<u32>;
@group(0) @binding(4) var<storage, read_write> runGeo: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> tails: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> tailCount: array<atomic<u32>>;
// the cloth's faces: the solver's self-contact face hash (selfcontact.wgsl), rebuilt every substep
@group(0) @binding(7) var<storage, read> nodes: array<NodeStaticR>;
@group(0) @binding(8) var<storage, read> faceCells: array<u32>;
@group(0) @binding(9) var<storage, read> faceItems: array<vec4<f32>>;

override MAX_RUNS: u32 = 65536u;

// A yarn held at one end hangs beyond the last span its chain holds as a heavy elastic rod clamped along
// the yarn's direction there (as runCenter left it). Freed and untwisted, its fibres slide on one
// another, so it bends as its fibres do side by side (count x a fibre's stiffness), under its own
// weight, with the curl its spinning set in it. Where its shape would pass through the cloth it rests
// on it instead, on the side it came from. Solved afresh each frame (equilibrium: a yarn this light and
// stiff settles faster than a frame), so it carries no state across the runs' rebuilds.

// bending stiffness of a cotton fibre: E (8 GPa) x I of its collapsed ribbon (20 x 7 um), N m^2
const FIBRE_EI: f32 = 4.6e-12;
const GRAVITY: f32 = 9.81;
// relaxed fixed-point iterations of the shape at most; the load is ramped in over more of them the
// longer the tail is against its bending length (a short tail barely bends), and the iteration stops
// once no segment turns by more than TAIL_TOL (rad) between iterations
const TAIL_ITERS: u32 = 16u;
const TAIL_TOL: f32 = 2e-4;
// the most a segment turns per iteration (rad): bounds the fixed point's steps
const TAIL_MAX_TURN: f32 = 0.6;
// the clearance a tail keeps from the cloth's collision faces (m) beyond its own radius: the cloth's
// half thickness and the rendered surface's bulge over the faces (selfcontact.ts distance)
const TAIL_CLEAR: f32 = 0.5e-3;
// the tail ignores the faces around its root (the cloth it comes out of) for this arc length (m)
const TAIL_ROOT_FREE: f32 = 3.0e-3;

// v turned about unit axis a by angle phi (Rodrigues).
fn turn(v: vec3<f32>, a: vec3<f32>, phi: f32) -> vec3<f32> {
  let c = cos(phi);
  let s = sin(phi);
  return v * c + cross(a, v) * s + a * (dot(a, v) * (1.0 - c));
}

// v turned by rotation vector w (axis w / |w|, angle |w|), the angle bounded.
fn turnBy(v: vec3<f32>, w: vec3<f32>) -> vec3<f32> {
  let phi = length(w);
  if (phi < 1e-9) { return v; }
  return turn(v, w / phi, min(phi, TAIL_MAX_TURN));
}

struct Contact {
  hit: bool,
  // where the tail rests on the face, and the face's normal toward the tail
  p: vec3<f32>,
  n: vec3<f32>,
};

// The cloth faces a tail can meet: those of the solver's face hash whose bounds come within its reach
// of the sphere it can occupy (its length about its root), gathered once per tail.
const MAX_CAND: u32 = 64u;
var<private> cand: array<u32, MAX_CAND>;
var<private> candN: u32;

fn gatherFaces(q: vec3<f32>, radius: f32) {
  candN = 0u;
  let T = FACE_MASK + 1u;
  // a face is hashed by its centroid; a cell's faces reach at most a cell's fraction beyond it
  let lo = vec3<i32>(floor((q - vec3<f32>(radius)) / FACE_CELL));
  let hi = vec3<i32>(floor((q + vec3<f32>(radius)) / FACE_CELL));
  for (var cz = lo.z; cz <= hi.z; cz++) {
    for (var cy = lo.y; cy <= hi.y; cy++) {
      for (var cx = lo.x; cx <= hi.x; cx++) {
        let h = ((u32(cx) * 73856093u) ^ (u32(cy) * 19349663u) ^ (u32(cz) * 83492791u)) & FACE_MASK;
        let start = faceCells[h];
        let count = faceCells[T + h];
        for (var k = 0u; k < count; k++) {
          let i1 = faceItems[2u * (start + k)];
          if (length(q - i1.xyz) - i1.w > radius || candN >= MAX_CAND) { continue; }
          cand[candN] = u32(faceItems[2u * (start + k) + 1u].w);
          candN++;
        }
      }
    }
  }
}

// The gathered face that segment a -> b of a tail meets (crosses, or comes within reach of at b);
// the faces around the root node are skipped while \`near\` is set.
fn tailContact(a: vec3<f32>, b: vec3<f32>, reach: f32, root: u32, near: bool) -> Contact {
  var o: Contact;
  o.hit = false;
  let rijl = nodes[root].ijl;
  let ri = i32(rijl & 0xFFFu);
  let rj = i32((rijl >> 12u) & 0xFFFu);
  var best = 1e9;
  for (var k = 0u; k < candN; k++) {
    let f = cand[k];
    let fijl = nodes[f].ijl;
    if (near && (fijl >> 24u) == (rijl >> 24u) && abs(i32(fijl & 0xFFFu) - ri) <= 2 && abs(i32((fijl >> 12u) & 0xFFFu) - rj) <= 2) { continue; }
    let L = R.layers[fijl >> 24u].lattice;
    let p00 = x[f].xyz;
    let p10 = x[f + 1u].xyz;
    let p01 = x[f + L.y].xyz;
    let p11 = x[f + L.y + 1u].xyz;
    let cen = 0.25 * (p00 + p10 + p01 + p11);
    // the face's corners lie within its half diagonal of the centroid
    let fr = 0.5 * max(length(p11 - p00), length(p10 - p01));
    if (length(b - cen) > fr + reach + length(b - a)) { continue; }
    let nf = cross(p11 - p00, p01 - p10);
    let nl = length(nf);
    if (nl < 1e-12) { continue; }
    let n = nf / nl;
    let sa = dot(a - cen, n);
    let sb = dot(b - cen, n);
    // where the segment meets the face's plane (or b, if it only comes near): within the face?
    let crosses = sa * sb < 0.0;
    let t = select(1.0, sa / (sa - sb), crosses);
    let m = mix(a, b, t);
    let u = p10 - p00;
    let v = p01 - p00;
    let uu = dot(u, u);
    let uv = dot(u, v);
    let vv = dot(v, v);
    let den = uu * vv - uv * uv;
    if (abs(den) < 1e-18) { continue; }
    let em = m - p00;
    let s1 = (vv * dot(em, u) - uv * dot(em, v)) / den;
    let s2 = (uu * dot(em, v) - uv * dot(em, u)) / den;
    if (s1 < -0.05 || s1 > 1.05 || s2 < -0.05 || s2 > 1.05) { continue; }
    if (!crosses && abs(sb) >= reach) { continue; }
    let d = select(abs(sb), 0.0, crosses);
    if (d >= best) { continue; }
    best = d;
    // rest on the side the tail came from
    let up = select(-n, n, sa >= 0.0);
    o.hit = true;
    o.n = up;
    o.p = m + up * reach - n * dot(m - cen, n);
  }
  return o;
}

@compute @workgroup_size(64)
fn threadTail(@builtin(global_invocation_id) gid: vec3<u32>) {
  let r = gid.x;
  if (r >= min(threadCount[0], MAX_RUNS)) { return; }
  let h = runGeo[RUN_GEO * r];
  let ri = runInfo(runs[r]);
  if (h.x > 0.5 || ri.heldA == ri.heldB || h.w <= 0.1e-3) { return; }
  let k = atomicAdd(&tailCount[0], 1u);
  if (k >= MAX_TAILS) { return; }
  let root = runGeo[RUN_GEO * r + 7u];
  tailSolve(ri, root.xyz, runGeo[RUN_GEO * r + 8u].xyz, u32(root.w), k, h.w);
  runGeo[RUN_GEO * r] = vec4<f32>(h.xy, f32(k), h.w);
}

fn tailSolve(ri: RunInfo, q: vec3<f32>, dir0: vec3<f32>, root: u32, k: u32, len: f32) {
  let LR = R.layers[ri.layer];
  let fibres = select(LR.loose.z, LR.loose.w, ri.fam == 1u);
  let EI = fibres * FIBRE_EI;
  let w = fibres * FIBRE_LIN * GRAVITY;
  let h = len / f32(TAIL_SEGS);
  let rY = select(LR.loose.x, LR.loose.y, ri.fam == 1u);
  // the curl spinning set in the yarn: radius 5 to 20 mm about an axis across it
  let seed = hash11((ri.layer * 7919u + ri.yarn) * 2u + ri.fam + 0x7a11u);
  let across = normalize(cross(dir0, vec3<f32>(hashf(seed) - 0.5, hashf(seed + 1u) - 0.5, hashf(seed + 2u) - 0.5)) + vec3<f32>(1e-9, 0.0, 0.0));
  let curl = across / (5e-3 + 15e-3 * hashf(seed + 3u));
  // rotation vectors per segment (its turn from the one before, per unit length): the weight beyond
  // each node bends it by its moment over EI, plus the curl
  var kap: array<vec3<f32>, TAIL_SEGS>;
  var t: array<vec3<f32>, TAIL_SEGS>;
  var pts: array<vec3<f32>, TAIL_SEGS_1>;
  for (var i = 0u; i < TAIL_SEGS; i++) { kap[i] = curl; }
  // bending length (EI / w)^(1/3): the scale over which the weight bends it
  let ramp = clamp(ceil(4.0 * len / pow(EI / w, 1.0 / 3.0)), 1.0, f32(TAIL_ITERS / 2u));
  for (var it = 0u; it < TAIL_ITERS; it++) {
    var ti = dir0;
    pts[0] = q;
    for (var i = 0u; i < TAIL_SEGS; i++) {
      ti = turnBy(ti, kap[i] * select(h, 0.5 * h, i == 0u));
      t[i] = ti;
      pts[i + 1u] = pts[i] + ti * h;
    }
    let load = w * h * min(1.0, f32(it + 1u) / ramp);
    var S = vec3<f32>(0.0);
    var m = 0.0;
    var change = 0.0;
    for (var j = 0; j < i32(TAIL_SEGS); j++) {
      let i = TAIL_SEGS - 1u - u32(j);
      S += pts[i] + 0.5 * h * t[i];
      m += 1.0;
      // moment about node i of the weight of the segments beyond it
      let M = cross(S - m * pts[i], vec3<f32>(0.0, 0.0, -load));
      let kn = mix(kap[i], M / EI + curl, 0.5);
      change = max(change, length(kn - kap[i]) * h);
      kap[i] = kn;
    }
    if (f32(it + 1u) >= ramp && change < TAIL_TOL) { break; }
  }
  // the shape of the converged turns
  var tf = dir0;
  for (var i = 0u; i < TAIL_SEGS; i++) {
    tf = turnBy(tf, kap[i] * select(h, 0.5 * h, i == 0u));
    t[i] = tf;
  }
  // rest on the cloth: march the shape; where a segment would pass through a face (or come within the
  // clearance of one), it ends on the face instead and the rest of the shape turns with it
  let reach = rY + TAIL_CLEAR;
  // faces within the tail's length of its root (plus its reach and a face's half diagonal, ~3 mm)
  if (FACE_HASH) { gatherFaces(q, len + reach + 3e-3); }
  var p = q;
  var arc = 0.0;
  let b = k * (TAIL_SEGS + 1u);
  tails[b] = vec4<f32>(q, 0.0);
  for (var i = 0u; i < TAIL_SEGS; i++) {
    var nxt = p + t[i] * h;
    arc += h;
    if (FACE_HASH) {
      let c = tailContact(p, nxt, reach, root, arc < TAIL_ROOT_FREE);
      if (c.hit) {
        // keep the segment's length along the face from where it touched
        let dir = normalize(c.p - p + vec3<f32>(1e-12, 0.0, 0.0));
        let ax = cross(t[i], dir);
        let al = length(ax);
        if (al > 1e-6) {
          let phi = atan2(al, dot(t[i], dir));
          for (var j = i + 1u; j < TAIL_SEGS; j++) { t[j] = turn(t[j], ax / al, phi); }
        }
        nxt = p + dir * h;
        // a segment pressed into the face slides along it
        let into = dot(nxt - c.p, c.n);
        if (into < 0.0) { nxt -= c.n * into; }
      }
    }
    // the floor, likewise: a segment that would pass below it (its axis a radius above the plane) ends
    // where it touches and the rest lies along the floor
    let zf = R.floor.x + rY;
    if (R.floor.y > 0.5 && nxt.z < zf) {
      let dz = p.z - nxt.z;
      let touch = mix(p, nxt, select(0.0, clamp((p.z - zf) / dz, 0.0, 1.0), dz > 1e-12));
      var dir = touch - p;
      if (dot(dir, dir) < 1e-14) { dir = vec3<f32>(t[i].xy, 0.0); }
      let dl = length(dir);
      if (dl > 1e-9) {
        dir /= dl;
        let ax = cross(t[i], dir);
        let al = length(ax);
        if (al > 1e-6) {
          let phi = atan2(al, dot(t[i], dir));
          for (var j = i + 1u; j < TAIL_SEGS; j++) { t[j] = turn(t[j], ax / al, phi); }
        }
        nxt = p + dir * h;
      }
      nxt.z = max(nxt.z, min(zf, p.z));
    }
    tails[b + i + 1u] = vec4<f32>(nxt, 0.0);
    p = nxt;
  }
}
`,
  he = `// Loose threads (threads.wgsl runs, thread_geom.wgsl geometry): each chunk of a run is a ribbon
// facing the camera around the yarn's centre line, shaded as a round fibrous cylinder with the same
// material identity as the woven surface; fibres stand out of it and splay from untwisting free ends.
// Threads far below a pixel are drawn at their true coverage (alpha to coverage on 4x MSAA), never
// as solid one-pixel lines.

@group(0) @binding(0) var<uniform> F: FrameU;
@group(0) @binding(1) var<uniform> R: RenderU;
@group(0) @binding(2) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> segw: array<vec4<u32>>;
@group(0) @binding(4) var<storage, read> tframe: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> nrm: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read> runs: array<vec4<u32>>;
@group(0) @binding(7) var<storage, read> chunks: array<u32>;
// per run, RUN_GEO vec4 (thread_prep.wgsl)
@group(0) @binding(8) var<storage, read> runGeo: array<vec4<f32>>;
@group(0) @binding(9) var shadowMap: texture_depth_2d;
@group(0) @binding(10) var shadowSampler: sampler_comparison;
// free tails of threads held at one end (thread_prep.wgsl tailSolve)
@group(0) @binding(11) var<storage, read> tails: array<vec4<f32>>;
@group(0) @binding(12) var overMap: texture_depth_2d;

const CHUNK_PTS: u32 = THREAD_VERTS / 2u;
const FIBER_PTS: u32 = FIBER_VERTS / 2u;

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) world: vec3<f32>,
  @location(1) side: f32,
  @location(2) tangent: vec3<f32>,
  @location(3) binormal: vec3<f32>,
  // parameter along the yarn (crossings)
  @location(4) c: f32,
  // yarn (fine index), family, layer, unused
  @location(5) @interpolate(flat) id: vec4<u32>,
  @location(6) tip: f32,
  // true width over drawn width (pixel coverage of a thread thinner than its ribbon)
  @location(7) alpha: f32,
};

fn hiddenT() -> VOut {
  var o: VOut;
  o.pos = vec4<f32>(0.0, 0.0, -2.0, 1.0);
  return o;
}

struct ChunkRef {
  ri: RunInfo,
  r: u32,
  a: f32,
  b: f32,
};

fn chunkRef(ii: u32) -> ChunkRef {
  var o: ChunkRef;
  let rec = chunks[ii];
  o.r = rec >> 10u;
  o.ri = runInfo(runs[o.r]);
  o.a = o.ri.drawA + f32((rec & 1023u) * CHUNK);
  o.b = min(o.a + f32(CHUNK), o.ri.drawB);
  return o;
}

// Point of the thread of chunk ch at drawn parameter p, from its strand's chain (thread_geom.wgsl).
fn threadOf(ch: ChunkRef, p: f32) -> ThreadPoint {
  let g = runGeoAt(ch.r);
  let cA = runGeo[RUN_GEO * ch.r + 5u].xyz;
  let cB = runGeo[RUN_GEO * ch.r + 6u].xyz;
  return threadAt(ch.ri, g, cA, cB, p);
}

fn threadVertex(vi: u32, ii: u32, fromLight: bool) -> VOut {
  let ch = chunkRef(ii);
  if (ch.a >= ch.b) { return hiddenT(); }
  let p = mix(ch.a, ch.b, f32(vi >> 1u) / f32(CHUNK_PTS - 1u));
  let tp = threadOf(ch, p);
  if (!tp.valid) { return hiddenT(); }
  let sideSign = select(-1.0, 1.0, (vi & 1u) == 1u);
  var V: vec3<f32>;
  if (fromLight) { V = normalize(F.keyPos.xyz - tp.p); } else { V = normalize(F.camPos.xyz - tp.p); }
  var B = cross(tp.t, V);
  let bl = length(B);
  if (bl < 1e-6) { B = normalize(cross(tp.t, tp.n)); } else { B = B / bl; }
  var half = tp.radius;
  var alpha = 1.0;
  if (!fromLight) {
    // at least ~0.7 px wide; a thinner thread covers its true fraction of the ribbon
    let minHalf = 0.35 * F.camPos.w * length(F.camPos.xyz - tp.p);
    alpha = clamp(half / minHalf, 0.0, 1.0);
    half = max(half, minHalf);
  }
  let W = tp.p + sideSign * half * B;
  var o: VOut;
  if (fromLight) { o.pos = F.lightViewProj * vec4<f32>(W, 1.0); } else { o.pos = F.viewProj * vec4<f32>(W, 1.0); }
  o.world = W;
  o.side = sideSign;
  o.tangent = tp.t;
  o.binormal = B;
  o.c = p;
  o.id = vec4<u32>(ch.ri.yarn, ch.ri.fam, ch.ri.layer, 0u);
  o.tip = tp.tip;
  o.alpha = alpha;
  return o;
}

@vertex fn vsThread(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut { return threadVertex(vi, ii, false); }
@vertex fn vsThreadShadow(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> @builtin(position) vec4<f32> { return threadVertex(vi, ii, true).pos; }

@fragment
fn fsThread(in: VOut) -> @location(0) vec4<f32> {
  let LR = R.layers[in.id.z];
  let s = clamp(in.side, -1.0, 1.0);
  let V = normalize(F.camPos.xyz - in.world);
  let T = normalize(in.tangent);
  let B = normalize(in.binormal);
  let Vp = normalize(V - dot(V, T) * T);
  let crown = sqrt(max(0.0, 1.0 - s * s));
  let N = normalize(B * s + Vp * crown);
  let fam = in.id.y;
  let yarn = i32(in.id.x);
  let pitchAl = select(LR.pitch.y, LR.pitch.x, fam == 0u);
  let along = in.c * pitchAl;
  let pix = F.camPos.w * length(F.camPos.xyz - in.world);
  // a yarn freed from the weave is abraded and loosened: its pale core shows, more toward an
  // untwisting end
  let look = yarnLook(LR, in.id.z, fam, yarn, i32(floor(in.c / f32(LR.twill.x))), along, s, min(1.0, 0.8 + 0.2 * in.tip), pix, 1.0);
  let tw = select(LR.weft.w, LR.warp.w, fam == 1u) * (1.0 - in.tip);
  let Tf = normalize(cos(tw) * T + sin(tw) * cross(N, T));
  let key = keyLight(in.world);
  let sh = shadowFactor(in.world, N);
  let amb = F.ambient.rgb * (0.55 + 0.45 * N.z);
  let ao = mix(0.6, 1.0, crown);
  var c = fiberShade(N, Tf, V, key.xyz, look.albedo, look.fuzz + 0.25) * (key.w * sh) * F.keyColor.rgb + overShade(N, Tf, V, look.albedo, look.fuzz + 0.25, in.world, N) + amb * look.albedo * ao;
  let cam = torchLight(in.world);
  if (cam.w > 0.0) { c += fiberShade(N, Tf, V, cam.xyz, look.albedo, look.fuzz + 0.25) * cam.w * F.torchColor.rgb; }
  return vec4<f32>(c, in.alpha);
}

// ---------------------------------------------------------------- fibres

struct FOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) world: vec3<f32>,
  @location(1) tangent: vec3<f32>,
  @location(2) alpha: f32,
  // yarn (fine index), family, layer, seed
  @location(3) @interpolate(flat) id: vec4<u32>,
};

fn hiddenF() -> FOut {
  var o: FOut;
  o.pos = vec4<f32>(0.0, 0.0, -2.0, 1.0);
  return o;
}

// Vertex vi of a fibre from \`root\` along unit \`dir\` over \`len\`, bent by \`bend\` (tip offset growing
// quadratically) and crimped by \`wave\`, \`width\` wide; drawn >= 1 px with alpha = true coverage.
fn fibre(root: vec3<f32>, dir: vec3<f32>, len: f32, bend: vec3<f32>, wave: vec3<f32>, waves: f32, width: f32, vi: u32, side: vec3<f32>, id: vec4<u32>) -> FOut {
  let t = f32(vi >> 1u) / f32(FIBER_PTS - 1u);
  let ph = PI * waves * t;
  let P = root + dir * (len * t) + bend * (t * t) + wave * (sin(ph) * t);
  let dP = normalize(dir * len + bend * (2.0 * t) + wave * (sin(ph) + PI * waves * t * cos(ph)));
  let sideSign = select(-1.0, 1.0, (vi & 1u) == 1u);
  let V = normalize(F.camPos.xyz - P);
  var B = cross(dP, V);
  let bl = length(B);
  if (bl < 1e-6) { B = side; } else { B = B / bl; }
  let pixW = F.camPos.w * length(F.camPos.xyz - P);
  let halfW = max(0.5 * width, 0.5 * pixW);
  var o: FOut;
  let W = P + sideSign * halfW * B;
  o.pos = F.viewProj * vec4<f32>(W, 1.0);
  o.world = W;
  o.tangent = dP;
  o.alpha = clamp(width / max(pixW, 1e-9), 0.0, 1.0) * (1.0 - 0.6 * t);
  o.id = id;
  return o;
}

// Fibres of a loose thread: instance = chunk x fibre. Freed yarns untwist, so their fibres lie
// mostly along the thread; at an untwisting free end they splay out of it in a brush.
@vertex
fn vsThreadFuzz(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> FOut {
  let ch = chunkRef(ii / FIBERS_PER_CHUNK);
  if (ch.a >= ch.b) { return hiddenF(); }
  let seed = hash11((ch.ri.layer * 7919u + ch.ri.yarn) * 613u + u32(ch.a) * 131u + (ii % FIBERS_PER_CHUNK) * 6007u + ch.ri.fam);
  let p = mix(ch.a, ch.b, hashf(seed));
  let tp = threadOf(ch, p);
  if (!tp.valid) { return hiddenF(); }
  let az = 6.2831853 * hashf(seed + 1u);
  let u1 = normalize(cross(tp.t, tp.n));
  let u2 = cross(u1, tp.t);
  let radial = cos(az) * u1 + sin(az) * u2;
  let toward = select(-1.0, 1.0, hashf(seed + 11u) < 0.5);
  let splay = tp.tip * tp.tip;
  let dir = normalize(radial * mix(0.45 + 0.6 * hashf(seed + 2u), 0.8, splay) + tp.t * toward * mix(1.6, 1.0, splay));
  let rl = hashf(seed + 3u);
  let len = (0.15e-3 + 0.8e-3 * rl * rl) * (1.0 + 2.0 * splay);
  let bend = vec3<f32>(hashf(seed + 4u) - 0.5, hashf(seed + 5u) - 0.5, hashf(seed + 6u) - 0.8) * (0.9 * len);
  let wave = vec3<f32>(hashf(seed + 7u) - 0.5, hashf(seed + 8u) - 0.5, hashf(seed + 9u) - 0.5) * (0.3 * len);
  return fibre(tp.p + radial * tp.radius, dir, len, bend, wave, 1.0 + 2.0 * hashf(seed + 10u), 25e-6, vi, u1, vec4<u32>(ch.ri.yarn, ch.ri.fam, ch.ri.layer, seed));
}

@fragment
fn fsThreadFuzz(in: FOut) -> @location(0) vec4<f32> {
  let V = normalize(F.camPos.xyz - in.world);
  let T = normalize(in.tangent);
  let N = normalize(V - dot(V, T) * T);
  // Loose fibres retain their fabric and (for tartan) the source yarn's stripe.
  let albedo = looseFibreAlbedo(R.layers[in.id.z].refine.w, in.id.y, i32(in.id.x), in.id.w);
  let key = keyLight(in.world);
  let sh = shadowFactor(in.world, N);
  var c = fiberShade(N, T, V, key.xyz, albedo, 0.2) * (key.w * sh) * F.keyColor.rgb + overShade(N, T, V, albedo, 0.2, in.world, N) + F.ambient.rgb * albedo;
  let cam = torchLight(in.world);
  if (cam.w > 0.0) { c += fiberShade(N, T, V, cam.xyz, albedo, 0.2) * cam.w * F.torchColor.rgb; }
  return vec4<f32>(c, in.alpha);
}
`,
  ge = `// The free edges' fibre (render-only, attached to its material). Each open side of an edge crossing
// (pieces.wgsl edgeList, roots placed by edge_roots.wgsl) is where the yarn running across it ended.
// Of its fibres (its linear density over a fibre's) those that slipped out of the break instead of
// breaking at it protrude, FRAY_LEN on average; the yarns along the edge, which lost their crossings,
// shed hair over it. Per side the strands are:
//  - sheets of the rim yarns' hair, rooted behind the edge and lying out over it;
//  - the compact yarn end, up to where its twist opens;
//  - fans of the end's protruding fibre, splaying from there over the opening.
// A sheet's fibres are evaluated in the fragment shader (sheetCover): each leaves the root at its
// own place, diverges across the fan, crimps and curls, and ends at its own point, so the fringe has
// the coverage of the real fibre count, and in close views shows its separate fibres. Strands rise
// toward the camera in slot order and are drawn in that order (back to front within a crossing). They
// are lit per vertex: through the fringe's fibre between them and the key (single scattering) and by
// light diffusing through it (multiple scattering, damped by the fibre's absorption, so the depth of
// an indigo fringe darkens toward blue).

@group(0) @binding(0) var<uniform> F: FrameU;
@group(0) @binding(1) var<uniform> R: RenderU;
@group(0) @binding(2) var<storage, read> edgeList: array<u32>;
@group(0) @binding(3) var<storage, read> edgeRoots: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> fieldY: array<u32>;
@group(0) @binding(9) var shadowMap: texture_depth_2d;
@group(0) @binding(10) var shadowSampler: sampler_comparison;
@group(0) @binding(11) var overMap: texture_depth_2d;

const FIBER_PTS: u32 = FIBER_VERTS / 2u;
// strands per open side (FIBERS_PER_EDGE are dealt round a crossing's open sides)
const SIDE_STRANDS: u32 = 6u;
// mean projected width of a cotton fibre (a twisted ribbon, 12-20 um across)
const FIBRE_W: f32 = 16e-6;
// fraction of a broken staple yarn's fibres that slip out of the break rather than break across it:
// the twist presses the core fibres hardest, so the outer (sheath) fibres slip far more often
const SLIP_SHEATH: f32 = 0.8;
const SLIP_CORE: f32 = 0.3;
// fraction of a ring-dyed warp's fibre carrying indigo: its sheath (dye penetrates ~30% of the radius)
const RING_DYED: f32 = 0.5;
// the protruding fraction of a broken yarn's fibre, and the dyed share of a warp's protruding fibre
const FRAY_PROTRUDE: f32 = RING_DYED * SLIP_SHEATH + (1.0 - RING_DYED) * SLIP_CORE;
const FRAY_DYED: f32 = RING_DYED * SLIP_SHEATH / FRAY_PROTRUDE;
// mean length by which they protrude (cotton staple is ~25 mm, but abraded fibre is broken short and
// a loosened end curls back on itself)
const FRAY_LEN: f32 = 1.5e-3;
// hair shed by a loosened yarn along the edge, as fibre length per length of yarn (Uster H of an
// abraded, untwisted coarse yarn), the band of such yarns behind the edge, the hairs' mean length,
// and their dyed share on a warp (hair is its surface fibre: the dyed sheath)
const RIM_HAIR: f32 = 10.0;
const RIM_BAND: f32 = 1.5e-3;
const RIM_HAIR_LEN: f32 = 0.9e-3;
const RIM_DYED: f32 = 0.85;
// half-angle tangent of a fan: the protruding fibres diverge by ~20 degrees from the end's axis
const FAN_CONE: f32 = 0.35;
// fibres evaluated per sheet (a sheet of more gives each the coverage of several)
const SHEET_FIBRES: u32 = 48u;
// a loose fibre's lateral wander: cotton's convolutions (amplitude, range of wavelengths), and the
// gentler curl of its free length (amplitude per length free, range of wavelengths: loose cotton
// bends with radii of a millimetre or two)
const CRIMP_AMP: f32 = 0.04e-3;
const CRIMP_MIN: f32 = 0.3e-3;
const CRIMP_MAX: f32 = 1.2e-3;
const CURL: f32 = 0.15;
const CURL_MIN: f32 = 2.0e-3;
const CURL_MAX: f32 = 6.0e-3;
// single-scattering albedo of a cotton fibre, from the woven material's reflectances (yarnLook): a
// deep mass of fibre of albedo w reflects R = (1 - s) / (1 + s), s = sqrt(1 - w). Indigo-dyed (the
// dyed yarn surface, ~(0.054, 0.078, 0.16)), undyed warp core (0.6, 0.62, 0.66), loose weft
// (0.64, 0.61, 0.55).
const DYED_FIBRE: vec3<f32> = vec3<f32>(0.195, 0.27, 0.476);
const CORE_FIBRE: vec3<f32> = vec3<f32>(0.938, 0.945, 0.958);
const WEFT_FIBRE: vec3<f32> = vec3<f32>(0.952, 0.941, 0.916);
// jute fibre (burlap, material 1): tan (0.46, 0.29, 0.12) and the darker stained fibre (0.22, 0.12, 0.045)
const JUTE_FIBRE: vec3<f32> = vec3<f32>(0.863, 0.698, 0.382);
const JUTE_DARK_FIBRE: vec3<f32> = vec3<f32>(0.59, 0.38, 0.165);

// the material the sheet is woven from (one layer per scene; LayerR.refine.w is its id)
fn fabricId() -> u32 { return R.layers[0].refine.w; }
// single-scattering albedo of fibre whose deep mass reflects R (see DYED_FIBRE)
fn fibreAlbedo(r: vec3<f32>) -> vec3<f32> {
  let s = (1.0 - r) / (1.0 + r);
  return 1.0 - s * s;
}
// the fibre of each fabric: its dyed (surface) fibre and its undyed / core fibre (weft alike)
fn dyedFibre() -> vec3<f32> {
  switch fabricId() {
    case 1u: { return JUTE_DARK_FIBRE; }
    case 2u: { return fibreAlbedo(vec3<f32>(0.55, 0.03, 0.04)); }
    case 3u: { return fibreAlbedo(vec3<f32>(0.45, 0.02, 0.04)); }
    case 4u: { return fibreAlbedo(vec3<f32>(0.36, 0.29, 0.19)); }
    case 5u: { return fibreAlbedo(vec3<f32>(0.45, 0.45, 0.52)); }
    case 6u: { return fibreAlbedo(vec3<f32>(0.6, 0.56, 0.48)); }
    case 7u: { return fibreAlbedo(vec3<f32>(0.5, 0.33, 0.08)); }
    case 8u: { return fibreAlbedo(vec3<f32>(0.06, 0.06, 0.07)); }
    default: { return DYED_FIBRE; }
  }
}
fn coreFibre() -> vec3<f32> {
  switch fabricId() {
    case 1u: { return JUTE_FIBRE; }
    case 2u: { return fibreAlbedo(vec3<f32>(0.7, 0.65, 0.6)); }
    case 3u: { return fibreAlbedo(vec3<f32>(0.75, 0.35, 0.37)); }
    case 4u: { return fibreAlbedo(vec3<f32>(0.62, 0.54, 0.4)); }
    case 5u: { return fibreAlbedo(vec3<f32>(0.72, 0.72, 0.76)); }
    case 6u: { return fibreAlbedo(vec3<f32>(0.8, 0.78, 0.72)); }
    case 7u: { return fibreAlbedo(vec3<f32>(0.8, 0.62, 0.25)); }
    case 8u: { return fibreAlbedo(vec3<f32>(0.22, 0.22, 0.24)); }
    default: { return CORE_FIBRE; }
  }
}
fn weftFibre() -> vec3<f32> {
  switch fabricId() {
    case 1u: { return JUTE_FIBRE; }
    case 2u: { return fibreAlbedo(vec3<f32>(0.7, 0.65, 0.6)); }
    case 3u: { return fibreAlbedo(vec3<f32>(0.7, 0.3, 0.33)); }
    case 4u: { return fibreAlbedo(vec3<f32>(0.62, 0.54, 0.4)); }
    case 5u: { return fibreAlbedo(vec3<f32>(0.7, 0.7, 0.74)); }
    case 6u: { return fibreAlbedo(vec3<f32>(0.8, 0.78, 0.72)); }
    case 7u: { return fibreAlbedo(vec3<f32>(0.42, 0.3, 0.08)); }
    case 8u: { return fibreAlbedo(vec3<f32>(0.2, 0.2, 0.22)); }
    default: { return WEFT_FIBRE; }
  }
}
// the compact end of a broken warp: its dyed surface, paling as it untwists toward the fans (t)
fn yarnEndSurface(t: f32) -> vec3<f32> {
  let denim = mix(vec3<f32>(0.054, 0.078, 0.16), mix(DYED_FIBRE, CORE_FIBRE, 0.5), t * t);
  return select(denim, mix(dyedFibre(), coreFibre(), 0.5 + 0.5 * t * t), fabricId() != 0u);
}

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) world: vec3<f32>,
  // coverage of a compact yarn end (its width over the drawn width)
  @location(2) alpha: f32,
  // kind (0 fan of an end's fibre, 1 yarn end, 2 rim hair), its undyed fibre (0 warp core, 2 weft),
  // layer, seed
  @location(3) @interpolate(flat) id: vec4<u32>,
  // 0 at the root .. 1 at the tip
  @location(4) along: f32,
  // light leaving the strand's undyed fibre (or the yarn end) and its dyed fibre, single scattered
  // (litU, litD) and multiply scattered with the fill (msU, msD), before the strand's own shadow
  // across its width (per vertex: light varies slowly along a strand; the fragment adds the shadow
  // and mixes them by what covers it)
  @location(5) litU: vec3<f32>,
  @location(8) litD: vec3<f32>,
  @location(9) msU: vec3<f32>,
  @location(10) msD: vec3<f32>,
  // the key's direction across the ribbon (its component along the ribbon's width)
  @location(11) keyAcross: f32,
  // across the drawn ribbon (m, signed), the sheet's half width here (m)
  @location(6) lat: vec2<f32>,
  // fibres in the sheet, root half width (m), length (m), fraction dyed
  @location(7) @interpolate(flat) sheet: vec4<f32>,
};

fn hidden() -> VOut {
  var o: VOut;
  o.pos = vec4<f32>(0.0, 0.0, -2.0, 1.0);
  return o;
}

// Fibres of one family per yarn (LayerR.loose: z picks, w warps).
fn fibresPerYarn(L: LayerR, fam: u32) -> f32 { return select(L.loose.z, L.loose.w, fam == 1u); }

// Fraction of the end's protruding fibre that still reaches distance x (m) beyond the edge: their
// protrusion is exponential with mean FRAY_LEN. Behind the edge, little of it folds back.
fn endReach(x: f32) -> f32 {
  return select(exp(x / 0.3e-3), exp(-x / FRAY_LEN), x >= 0.0);
}

// Light leaving fibre of single-scattering albedo a at P (tangent T, toward the camera V), lit by the
// key through the fringe's optical depth tau toward it (the fringe is about as thick as it reaches,
// its strands rising at up to ~40 degrees, so the path to the light is its depth whatever the light's
// angle) and by the fill. Nc: the cloth normal. Multiple scattering: light diffusing through fibre of
// albedo a decays by sqrt(3 (1 - a)) per unit optical depth.
// Returns the single-scattered part and the multiply scattered part with the fill, apart, since the
// strand's own fibre attenuates them differently (fsFuzz).
struct FibreLit {
  single: vec3<f32>,
  multi: vec3<f32>,
};

fn diffusion(a: vec3<f32>) -> vec3<f32> { return sqrt(3.0 * (vec3<f32>(1.0) - a)); }

// The key at P (direction, irradiance with its shadow) for a fibre of tangent T seen from V.
fn fibreKey(P: vec3<f32>, T: vec3<f32>, V: vec3<f32>) -> vec4<f32> {
  let key = keyLight(P);
  return vec4<f32>(key.xyz, key.w * shadowFactor(P, normalize(V - dot(V, T) * T)));
}

// The overhead light at P (direction, its shadow) for a fibre of tangent T seen from V.
fn fibreOver(P: vec3<f32>, T: vec3<f32>, V: vec3<f32>) -> vec4<f32> {
  return vec4<f32>(F.overDir.xyz, shadowOver(P, normalize(V - dot(V, T) * T)));
}

// One light of direction Ld and irradiance E through optical depth tau.
fn fibreDirect(Ld: vec3<f32>, E: vec3<f32>, T: vec3<f32>, V: vec3<f32>, Nc: vec3<f32>, a: vec3<f32>, tau: f32) -> FibreLit {
  let N = normalize(V - dot(V, T) * T);
  let direct = exp(-tau);
  var o: FibreLit;
  o.single = fiberShade(N, T, V, Ld, a, 0.3) * direct * E;
  o.multi = a * (1.0 / PI) * abs(dot(Nc, Ld)) * max(exp(-diffusion(a) * tau) - vec3<f32>(direct), vec3<f32>(0.0)) * E;
  return o;
}

// The key (through tau), the overhead light (through tauO), the camera's light (through tauC, from the
// camera's side) and the fill.
fn fibreLight(key: vec4<f32>, over: vec4<f32>, cam: vec4<f32>, T: vec3<f32>, V: vec3<f32>, Nc: vec3<f32>, a: vec3<f32>, tau: f32, tauO: f32, tauC: f32) -> FibreLit {
  let k = fibreDirect(key.xyz, key.w * F.keyColor.rgb, T, V, Nc, a, tau);
  let o2 = fibreDirect(over.xyz, F.overColor.rgb * over.w, T, V, Nc, a, tauO);
  var o: FibreLit;
  o.single = k.single + o2.single;
  o.multi = k.multi + o2.multi + F.ambient.rgb * a * exp(-diffusion(a) * tau);
  if (cam.w > 0.0) {
    let c = fibreDirect(cam.xyz, cam.w * F.torchColor.rgb, T, V, Nc, a, tauC);
    o.single += c.single;
    o.multi += c.multi;
  }
  return o;
}

// What a strand is made of: fibres in it (0: a compact yarn end), its root width (m), how far its
// fibres diverge (half-angle tangent), its dyed fraction and its undyed fibre (0 warp core, 2 weft).
struct Make {
  n: f32,
  w0: f32,
  fan: f32,
  dyed: f32,
  undyed: u32,
};

// Vertex vi of a strand from \`root\` along unit \`dir\` over \`len\`, bent by \`bend\` (tip offset growing
// quadratically) and crimped by \`wave\` (amplitude of \`waves\` half periods). \`x0\` is the root's distance
// beyond the edge along \`outW\`, \`tauEnd\` and \`tauRim\` the optical depths (along the cloth normal N) of
// the end's fibre at the edge and of the rim's hair, and \`h\` the strand's height in the fringe (0
// lowest .. 1 toward the camera).
fn strand(root: vec3<f32>, dir: vec3<f32>, len: f32, bend: vec3<f32>, wave: vec3<f32>, waves: f32, m: Make, vi: u32, side: vec3<f32>, N: vec3<f32>, outW: vec3<f32>, x0: f32, tauEnd: f32, tauRim: f32, h: f32, id: vec4<u32>) -> VOut {
  let t = f32(vi >> 1u) / f32(FIBER_PTS - 1u);
  let ph = PI * waves * t;
  let P = root + dir * (len * t) + bend * (t * t) + wave * (sin(ph) * t);
  let dP = normalize(dir * len + bend * (2.0 * t) + wave * (sin(ph) + PI * waves * t * cos(ph)));
  let sideSign = select(-1.0, 1.0, (vi & 1u) == 1u);
  let V = normalize(F.camPos.xyz - P);
  var B = cross(dP, V);
  let bl = length(B);
  if (bl < 1e-6) { B = side; } else { B = B / bl; }
  let pixW = F.camPos.w * length(F.camPos.xyz - P);
  var o: VOut;
  var halfW: f32;
  let H = 0.5 * m.w0 + m.fan * len * t;
  if (m.n > 0.0) {
    // the fan, its fibres' wander and width, and a pixel's margin for the coverage filter
    halfW = H + 1.6 * (CRIMP_AMP + CURL * len * t) + FIBRE_W * max(1.0, m.n / f32(SHEET_FIBRES)) + 0.5 * pixW;
    o.alpha = 1.0;
  } else {
    halfW = max(0.5 * m.w0, 0.5 * pixW);
    o.alpha = clamp(m.w0 / max(pixW, 1e-9), 0.0, 1.0);
  }
  let W = P + sideSign * halfW * B;
  o.pos = F.viewProj * vec4<f32>(W, 1.0);
  o.world = W;
  o.id = id;
  o.along = t;
  o.lat = vec2<f32>(sideSign * halfW, H);
  o.sheet = vec4<f32>(m.n, 0.5 * m.w0, len, m.dyed);
  // the fringe toward the light: the strands above this one (h is its height toward the camera; the
  // key may light the fringe from the other side)
  let x = x0 + dot(P - root, outW);
  let up = select(h, 1.0 - h, dot(N, F.keyPos.xyz - P) > 0.0);
  let rim = select(1.0, exp(-x / RIM_HAIR_LEN), x > 0.0);
  let tau0 = tauEnd * endReach(x) + tauRim * rim;
  let tau = up * tau0;
  let tauO = select(h, 1.0 - h, dot(N, F.overDir.xyz) > 0.0) * tau0;
  let undyed = select(weftFibre(), coreFibre(), m.undyed == 0u);
  o.keyAcross = dot(normalize(F.keyPos.xyz - P), B) * sideSign;
  let key = fibreKey(P, dP, V);
  let over = fibreOver(P, dP, V);
  // the camera's light reaches the fringe from the camera's side (h: height toward the camera)
  let cam = torchLight(P);
  let tauC = h * tau0;
  if (m.n > 0.0) {
    let u = fibreLight(key, over, cam, dP, V, N, undyed, tau, tauO, tauC);
    o.litU = u.single;
    o.msU = u.multi;
    if (m.dyed > 0.0) {
      let d = fibreLight(key, over, cam, dP, V, N, dyedFibre(), tau, tauO, tauC);
      o.litD = d.single;
      o.msD = d.multi;
    } else {
      o.litD = u.single;
      o.msD = u.multi;
    }
  } else {
    // the compact yarn end: a warp shows its dyed surface, paling as it untwists toward the fans
    let a = select(weftFibre(), yarnEndSurface(t), m.undyed == 0u);
    let e = fibreLight(key, over, cam, dP, V, N, a, tau, tauO, tauC);
    o.litU = e.single + e.multi;
  }
  return o;
}

@vertex
fn vsEdgeFuzz(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  let ei = ii / FIBERS_PER_EDGE;
  let fi = ii % FIBERS_PER_EDGE;
  let root0 = edgeRoots[3u * ei];
  if (root0.w < 0.5) { return hidden(); }
  let entry = edgeList[ei];
  let c = entry & 0x0FFFFFFFu;
  let sides = entry >> 28u;
  // the slot's open side (slots are dealt round them in turn) and its place among the side's strands
  let nOpen = countOneBits(sides);
  let slots = min(SIDE_STRANDS, FIBERS_PER_EDGE / nOpen);
  let j = fi / nOpen;
  if (j >= slots) { return hidden(); }
  var pick = fi % nOpen;
  var side = 0u;
  for (var b = 0u; b < 4u; b++) {
    if (((sides >> b) & 1u) == 0u) { continue; }
    if (pick == 0u) {
      side = b;
      break;
    }
    pick--;
  }
  var l = 0u;
  for (var q = 1u; q < R.counts.y; q++) {
    if (c >= R.layers[q].field.x) { l = q; }
  }
  let LR = R.layers[l];
  // how much of the yarns loosened and slipped here: yarns break at scattered places along their
  // length and loosen unevenly, so tufted stretches of edge lie next to nearly bare ones (noise over
  // the rest chart, a few crossings to several millimetres; mean 1)
  let FL = LR.field;
  let restC = vec2<f32>(f32((c - FL.x) % FL.y) * LR.pitch.x, f32((c - FL.x) / FL.y) * LR.pitch.y);
  let tuftN = 0.6 * noise2(6007u + l, restC / 5.0e-3) + 0.4 * noise2(6011u + l, restC / 1.6e-3);
  let density = 0.3 + 1.4 * smoothstep(-0.45, 0.5, tuftN);
  let dU = edgeRoots[3u * ei + 1u].xyz;
  let dV = edgeRoots[3u * ei + 2u].xyz;
  var N = normalize(cross(dU, dV));
  if (dot(N, F.camPos.xyz - root0.xyz) < 0.0) { N = -N; }
  let sg = select(-1.0, 1.0, (side & 1u) == 1u);
  // in the rest chart: out of the side, and along it
  let outR = select(vec2<f32>(0.0, sg), vec2<f32>(sg, 0.0), side < 2u);
  let alongR = vec2<f32>(-outR.y, outR.x);
  let outW = normalize(dU * outR.x + dV * outR.y);
  let acrossW = normalize(dU * alongR.x + dV * alongR.y);
  let pitchOut = select(LR.pitch.y, LR.pitch.x, side < 2u);
  // the yarn running across the side ends here (picks across the u sides, warps across the v sides);
  // the yarns along it are the loosened rim
  let fam = select(1u, 0u, side < 2u);
  let famAlong = 1u - fam;
  // side length along the edge: the spacing of the yarns that end across it
  let sideLen = select(LR.pitch.y, LR.pitch.x, fam == 1u);
  let endHere = yarnCode(fieldY[c], fam) < PULLED_R;
  // fibre of the side: the protruding end (absent when the yarn was pulled out of this crossing) and
  // the hair of the band of rim yarns along the edge (RIM_BAND / pitchOut of them, each shedding
  // RIM_HAIR of fibre length per length in hairs RIM_HAIR_LEN long)
  let endFibres = select(0.0, FRAY_PROTRUDE * fibresPerYarn(LR, fam) * density, endHere);
  let rimHair = RIM_HAIR * sideLen * (RIM_BAND / pitchOut) / RIM_HAIR_LEN * density;
  // optical depths of the end's fibre at the edge and of the rim's hair, seen along the cloth normal
  let tauEnd = endFibres * FIBRE_W / sideLen;
  let tauRim = rimHair * FIBRE_W / sideLen;
  // the side's strands, lowest first: rim hair, the yarn end, fans
  let nRim = select(1u, 2u, slots >= 5u);
  let nFan = slots - 1u - nRim;
  let h = (f32(j) + 0.5) / f32(slots);
  let seed = hash11(c * 2654435761u + side * 97u + j * 7919u + 11u);
  let cv = vec3<f32>(hashf(seed + 8u) - 0.5, hashf(seed + 9u) - 0.5, hashf(seed + 10u) - 0.5);
  let wv = vec3<f32>(hashf(seed + 13u) - 0.5, hashf(seed + 14u) - 0.5, hashf(seed + 15u) - 0.5);
  let atSide = root0.xyz + (dU * outR.x + dV * outR.y) * (0.5 - 0.15 * hashf(seed + 2u)) + (dU * alongR.x + dV * alongR.y) * (hashf(seed + 1u) - 0.5);

  if (j < nRim) {
    // hair of the loosened rim yarns: rooted up to the band's depth behind the edge, drawn out over it
    var m: Make;
    m.n = rimHair / f32(nRim);
    if (m.n < 0.05) { return hidden(); }
    m.w0 = 0.2e-3;
    m.fan = FAN_CONE;
    m.dyed = select(0.0, RIM_DYED, famAlong == 1u);
    m.undyed = select(2u, 0u, famAlong == 1u);
    let back = (0.2e-3 + RIM_BAND * pow(hashf(seed + 17u), 1.5)) / pitchOut;
    let root = atSide - (dU * outR.x + dV * outR.y) * back;
    let spread = (hashf(seed + 3u) - 0.5) * 1.2;
    let dir = normalize(outW + acrossW * spread + N * (0.03 + 0.12 * h));
    let len = back * pitchOut + clamp(-2.0 * RIM_HAIR_LEN * log(1.0 - 0.95 * hashf(seed + 5u)), 0.2e-3, 4.0e-3);
    let bend = cv * (0.7 * len) - N * (0.1 * len);
    return strand(root + N * 0.06e-3, dir, len, bend, wv * (0.4 * len), 2.0 + 4.0 * hashf(seed + 16u), m, vi, acrossW, N, outW, -back * pitchOut, tauEnd, tauRim, h, vec4<u32>(2u, m.undyed, l, seed));
  }
  if (!endHere) { return hidden(); }
  // the yarn end standing out of the edge, untwisting from part-way along it; its fans splay from
  // there. All derive from one seed per side.
  let sb = hash11(c * 2654435761u + side * 13u + 7u);
  let atEnd = root0.xyz + (dU * outR.x + dV * outR.y) * (0.5 - 0.15 * hashf(sb + 2u)) + (dU * alongR.x + dV * alongR.y) * (hashf(sb + 1u) - 0.5);
  let liftB = 0.1 + 0.45 * hashf(sb + 4u);
  let dirB = normalize(outW + acrossW * ((hashf(sb + 3u) - 0.5) * 0.8) + N * liftB);
  let lenB = clamp(-2.0 * FRAY_LEN * log(1.0 - 0.98 * hashf(sb + 5u)), 0.6e-3, 8.0 * FRAY_LEN);
  let droopB = vec3<f32>(0.0, 0.0, -0.3 * lenB) - N * (0.25 * lenB * liftB);
  let curlB = (acrossW * (hashf(sb + 6u) - 0.5) + N * (hashf(sb + 7u) - 0.5)) * (0.45 * lenB);
  // where the twist opens up: the core runs as a yarn up to t0 of lenB
  let t0 = 0.15 + 0.3 * hashf(sb + 9u);
  let yarnD = 2.0 * select(LR.loose.y, LR.loose.x, fam == 0u);
  var m: Make;
  m.undyed = select(2u, 0u, fam == 1u);
  if (j == nRim) {
    m.n = 0.0;
    m.w0 = yarnD;
    m.fan = 0.0;
    m.dyed = 0.0;
    return strand(atEnd, dirB, lenB * t0, (droopB + curlB) * (t0 * t0), curlB * 0.2, 1.0, m, vi, acrossW, N, outW, 0.0, tauEnd, tauRim, h, vec4<u32>(1u, m.undyed, l, sb));
  }
  // a fan of the end's protruding fibre (its share of them; a warp's mostly from the dyed sheath, a
  // weft's undyed throughout), from where the twist opened, splaying and drooping over the opening;
  // fans rise from the end's own direction toward the camera
  m.n = endFibres / f32(nFan);
  m.w0 = yarnD;
  m.fan = FAN_CONE;
  m.dyed = select(0.0, FRAY_DYED, fam == 1u);
  let tip = atEnd + dirB * (lenB * t0) + (droopB + curlB) * (t0 * t0);
  let tangent = normalize(dirB * lenB + (droopB + curlB) * (2.0 * t0));
  let k = f32(j - nRim - 1u) / max(f32(nFan) - 1.0, 1.0);
  let fs = vec3<f32>(hashf(seed + 3u), hashf(seed + 4u), hashf(seed + 5u)) - 0.5;
  let dir = normalize(tangent + acrossW * (0.9 * fs.x) + N * (0.1 + 0.6 * k + 0.3 * fs.y));
  // fan lengths: exponential with mean 2 FRAY_LEN, so that its fibres, ending evenly along it,
  // protrude FRAY_LEN on average beyond the end (cut off where a fibre's abraded length runs out)
  let len = clamp(-2.0 * FRAY_LEN * log(1.0 - 0.98 * hashf(seed + 6u)), 0.4e-3, 4.0 * FRAY_LEN);
  let droop = clamp(len / 1.5e-3, 0.0, 1.0);
  let bend = cv * (0.8 * len) - N * (0.4 * len * droop) + vec3<f32>(0.0, 0.0, -0.3 * len * droop);
  return strand(tip, dir, len, bend, wv * (0.3 * len), 1.5 + 2.5 * hashf(seed + 16u), m, vi, acrossW, N, outW, lenB * t0 * dot(dirB, outW), tauEnd, tauRim, h, vec4<u32>(0u, m.undyed, l, seed));
}

// A smooth wave of period 1 between -1 and 1 (a parabola per half period: within 0.06 of a sine).
fn wave(x: f32) -> f32 {
  let f = fract(x) * 2.0 - 1.0;
  return -4.0 * f * (1.0 - abs(f));
}

// Coverage of a fibre sheet at lateral position y (m) across it and fraction t along it, over a pixel
// pix (m) wide, with the dyed share of what covers. Each fibre leaves the root at its own place (within
// r0 of the centre), diverges across the fan (to within H), crimps and curls, and ends at its own t,
// so the sheet thins evenly toward its tip. Where neighbouring fibres lie further apart than a pixel
// they are evaluated one by one (however faint, a few separate fibres over the dark opening are
// streaks, not a veil);
// where many share a pixel only their mean coverage is visible, evaluated in closed form (their
// distribution across the sheet, Poisson overlap), blended across the range where they begin to
// resolve.
fn sheetCover(seed: u32, n: f32, r0: f32, H: f32, len: f32, dyedFrac: f32, y: f32, t: f32, pix: f32, overCloth: bool) -> vec2<f32> {
  // past SHEET_FIBRES, each evaluated fibre stands for several side by side
  let d = FIBRE_W * max(1.0, n / f32(SHEET_FIBRES));
  let wander = CRIMP_AMP + CURL * len * t;
  let half = mix(r0, H, t) + wander;
  let alive = n * (1.0 - t);
  let spacing = 2.0 * half / max(alive, 1.0);
  // (hair lying over the pale cloth has little contrast there until it covers a good share of a pixel)
  let resolve = smoothstep(0.5, 1.0, spacing / pix) * select(1.0, smoothstep(0.06, 0.12, d / pix), overCloth);
  var mean = 0.0;
  if (resolve < 1.0) {
    // a fibre lies at (1 - t) a r0 + t b H, a and b uniform over -1 .. 1: the sum of two uniform
    // spreads, flat out to |A - B| and falling linearly to zero at A + B (crimp widens both)
    let A = (1.0 - t) * r0 + 0.5 * wander;
    let Bs = t * H + 0.5 * wander;
    let lo = abs(A - Bs);
    let hi = A + Bs;
    let density = clamp((hi - abs(y)) / max(hi - lo, 1e-9), 0.0, 1.0) / (2.0 * max(A, Bs));
    mean = 1.0 - exp(-alive * FIBRE_W * density);
  }
  if (resolve <= 0.0 || abs(y) > half + 0.6 * wander + 0.5 * pix + d) { return vec2<f32>(mean, dyedFrac); }
  // ends stratified along the sheet (fibre k ends in the k-th of count equal steps from the tip), so
  // only the fibres still present at t are visited
  let count = min(u32(ceil(n)), SHEET_FIBRES);
  let present = min(count, u32(f32(count) * (1.0 - t)) + 1u);
  var clear = 1.0;
  var all = 0.0;
  var dyed = 0.0;
  for (var k = 0u; k < present; k++) {
    // one hash per fibre for its end, root, direction and phase, remixed for the rest
    let h0 = hash11(seed * 7919u + k * 104729u + 1u);
    let h1 = (h0 ^ (h0 >> 15u)) * 0x2c1b3c6du;
    let h2 = (h1 ^ (h1 >> 13u)) * 0x297a2d39u;
    let r = vec4<f32>(vec4<u32>(h0 & 255u, (h0 >> 8u) & 255u, (h0 >> 16u) & 255u, h0 >> 24u)) * (1.0 / 255.0);
    if (t > 1.0 - (f32(k) + r.x) / f32(count)) { continue; }
    let q = vec4<f32>(vec4<u32>(h1 & 255u, (h1 >> 8u) & 255u, (h1 >> 16u) & 255u, h1 >> 24u)) * (1.0 / 255.0);
    // the convolutions and the free length's curl
    let along = t * len;
    let ph = along / mix(CRIMP_MIN, CRIMP_MAX, q.x) + r.w;
    let p = vec4<f32>(vec4<u32>(h2 & 255u, (h2 >> 8u) & 255u, (h2 >> 16u) & 255u, h2 >> 24u)) * (1.0 / 255.0);
    let crimp = CRIMP_AMP * (0.4 + 1.2 * q.y) * smoothstep(0.0, 0.2, t) * wave(ph);
    let curl = CURL * along * (0.3 + 1.4 * p.x) * wave(along / mix(CURL_MIN, CURL_MAX, q.w) + p.y);
    let yk = mix((2.0 * r.y - 1.0) * r0, (2.0 * r.z - 1.0) * H, t) + crimp + curl;
    let dk = d * (0.75 + 0.5 * q.z);
    let ov = clamp((min(y + 0.5 * pix, yk + 0.5 * dk) - max(y - 0.5 * pix, yk - 0.5 * dk)) / pix, 0.0, 1.0);
    let w = ov * clear;
    all += w;
    dyed += select(0.0, w, p.z < dyedFrac);
    clear *= 1.0 - ov;
  }
  let each = vec2<f32>(1.0 - clear, select(dyedFrac, dyed / all, all > 1e-6));
  return mix(vec2<f32>(mean, dyedFrac), each, resolve);
}

@fragment
fn fsFuzz(in: VOut) -> @location(0) vec4<f32> {
  if (in.id.x == 1u) { return vec4<f32>(in.litU, in.alpha); }
  let pix = F.camPos.w * length(F.camPos.xyz - in.world);
  let cov = sheetCover(in.id.w, in.sheet.x, in.sheet.y, in.lat.y, in.sheet.z, in.sheet.w, in.lat.x, in.along, pix, in.id.x == 2u);
  if (cov.x < 0.002) { discard; }
  // the strand shadows itself across its width: a tuft is lit on the side toward the key and dark on
  // the far side, through the optical depth its own fibre presents across it (as for its coverage)
  let half = mix(in.sheet.y, in.lat.y, in.along) + CRIMP_AMP + CURL * in.sheet.z * in.along;
  let across = in.sheet.x * (1.0 - in.along) * FIBRE_W / (2.0 * half);
  let s = clamp(0.5 - 0.5 * sign(in.keyAcross) * in.lat.x / half, 0.0, 1.0);
  let tauX = across * mix(0.5, s, abs(in.keyAcross));
  let undyed = select(weftFibre(), coreFibre(), in.id.y == 0u);
  let cu = in.litU * exp(-tauX) + in.msU * exp(-diffusion(undyed) * tauX);
  let cd = in.litD * exp(-tauX) + in.msD * exp(-diffusion(dyedFibre()) * tauX);
  return vec4<f32>(mix(cu, cd, cov.y), cov.x);
}
`,
  _e = `// Resolve HDR to the display: one tone map and one output encoding. A staged experience adds the
// camera's film: a grade, grain and vignette, and digital signal corruption (glitch).

struct PostU {
  // staged grade amount, film grain, vignette, time (s)
  grade: vec4<f32>,
  // glitch amount, its seed (held over a few frames), unused
  glitch: vec4<f32>,
};

@group(0) @binding(0) var<uniform> F: FrameU;
@group(0) @binding(1) var hdr: texture_2d<f32>;
@group(0) @binding(2) var<uniform> PU: PostU;

struct FsIn {
  @builtin(position) pos: vec4<f32>,
};

@vertex
fn vsFull(@builtin(vertex_index) vi: u32) -> FsIn {
  let p = vec2<f32>(f32((vi << 1u) & 2u), f32(vi & 2u));
  var o: FsIn;
  o.pos = vec4<f32>(p * 2.0 - 1.0, 0.0, 1.0);
  return o;
}

// ACES fitted curve (Narkowicz)
fn aces(x: vec3<f32>) -> vec3<f32> {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn linearToSrgb(c: vec3<f32>) -> vec3<f32> {
  let lo = c * 12.92;
  let hi = 1.055 * pow(c, vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}

fn hdrAt(p: vec2<f32>) -> vec3<f32> {
  let dims = vec2<i32>(textureDimensions(hdr));
  return textureLoad(hdr, clamp(vec2<i32>(floor(p)), vec2<i32>(0), dims - 1), 0).rgb;
}

fn h2(a: f32, b: f32) -> f32 { return hash2f(u32(i32(a) + 65536), u32(i32(b) + 65536)); }

// Signal corruption of a digital camera: rows torn sideways in bands, colour planes out of register,
// macroblocks copied from elsewhere and posterised, interlace lines and noise. Returns linear HDR.
fn corrupted(p: vec2<f32>, g: f32, seed: f32) -> vec3<f32> {
  let W = F.viewport.x;
  let H = F.viewport.y;
  let s = seed * 97.0;
  let bandH = mix(4.0, 0.06 * H, h2(s, 1.0));
  let band = floor((p.y + h2(s, 2.0) * bandH) / bandH);
  var q = p;
  let rb = h2(band, s);
  if (rb < 0.55 * g) { q.x += (h2(band, s + 3.0) - 0.5) * W * 0.3 * g; }
  // larger slabs drift as a whole
  let slab = floor(p.y / (0.18 * H));
  if (h2(slab, s + 5.0) < 0.35 * g) { q.x += (h2(slab, s + 6.0) - 0.5) * W * 0.08; q.y += (h2(slab, s + 7.0) - 0.5) * 0.05 * H; }
  // macroblocks copied from another place
  let B = 16.0 * (1.0 + floor(h2(s, 8.0) * 3.0));
  let blk = floor(q / B);
  let mb = h2(blk.x + 311.0 * blk.y, s + 9.0) < 0.12 * g;
  if (mb) { q += (vec2<f32>(h2(blk.x, s + 10.0), h2(blk.y, s + 11.0)) - 0.5) * B * 6.0; }
  let split = (h2(band, s + 12.0) - 0.3) * 14.0 * g * (W / 1600.0);
  var c = vec3<f32>(hdrAt(q + vec2<f32>(split, 0.0)).r, hdrAt(q).g, hdrAt(q - vec2<f32>(split, 0.0)).b);
  if (mb) { c = floor(c * 6.0 / (c + 1.0)) / 4.0; }
  let line = select(1.0, 1.0 - 0.35 * g, (u32(p.y) & 1u) == 1u);
  let noise = hash2f(u32(p.x) + 7919u * u32(seed), u32(p.y) + 104729u * u32(F.params.w));
  return c * line + vec3<f32>(noise * noise * 0.12 * g);
}

@fragment
fn fsTonemap(in: FsIn) -> @location(0) vec4<f32> {
  let staged = PU.grade.x + PU.grade.y + PU.grade.z + PU.glitch.x;
  if (staged == 0.0) {
    let c = textureLoad(hdr, vec2<i32>(in.pos.xy), 0).rgb * F.params.x;
    return vec4<f32>(linearToSrgb(aces(c)), 1.0);
  }
  var lin = hdrAt(in.pos.xy);
  if (PU.glitch.x > 0.0) { lin = corrupted(in.pos.xy, PU.glitch.x, PU.glitch.y); }
  var c = aces(lin * F.params.x);
  // grade: colour drained toward a cold luminance, shadows crushed
  let a = PU.grade.x;
  let y = dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
  c = mix(c, y * vec3<f32>(0.93, 0.98, 1.04), 0.35 * a);
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.25 * a);
  // vignette of the lens
  let uv = in.pos.xy * F.viewport.zw - 0.5;
  let r = length(uv * vec2<f32>(F.viewport.x * F.viewport.w, 1.0));
  c *= 1.0 - PU.grade.z * smoothstep(0.3, 0.95, r);
  // sensor grain, strongest in the shadows, new every frame
  let n = hash2f(u32(in.pos.x) + 1301u * u32(F.params.w), u32(in.pos.y) * 7u + 31u) - 0.5;
  c += PU.grade.y * n * 0.09 * (1.0 - 0.6 * sqrt(y));
  return vec4<f32>(linearToSrgb(clamp(c, vec3<f32>(0.0), vec3<f32>(1.0))), 1.0);
}
`,
  ve = `// Prefiltered weave tile: one twill repeat (R warps x R picks, unstretched, face side) per layer,
// with every mip level computed directly as the average of the analytic weave over the texel's
// footprint. The surface shader samples it with hardware anisotropic filtering wherever the yarns
// approach the pixel size, so the twill keeps its true filtered structure instead of aliasing.
// Texel: (warp-on-top fraction among covered points, occlusion x coverage, mean dh/du, mean dh/dv).

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<uniform> Lvl: vec4<u32>; // x: layer, y: texel count per side at this level
@group(0) @binding(2) var tileOut: texture_storage_2d<rgba16float, write>;

const SUB: u32 = 8u;

@compute @workgroup_size(8, 8)
fn build(@builtin(global_invocation_id) gid: vec3<u32>) {
  let size = Lvl.y;
  if (gid.x >= size || gid.y >= size) { return; }
  let L = R.layers[Lvl.x];
  let rep = f32(L.twill.x);
  let texel = rep / f32(size);
  let hTop = L.warp.z + 0.5 * L.warp.y;
  var wf = 0.0;
  var aoc = 0.0;
  var slope = vec2<f32>(0.0);
  var covered = 0.0;
  for (var a = 0u; a < SUB; a++) {
    for (var b = 0u; b < SUB; b++) {
      // stratified samples over the texel (at coarse levels the texel spans several yarns)
      let U = (f32(gid.x) + (f32(a) + 0.5) / f32(SUB)) * texel;
      let V = (f32(gid.y) + (f32(b) + 0.5) / f32(SUB)) * texel;
      let w2 = weave2(L, U, V, 1.0, 1.0, true, 0.018e-3);
      if (!w2.a.covered) { continue; }
      var top = select(0.0, 1.0, w2.a.fam == 1u);
      var s = w2.a.slope;
      var h = w2.a.h;
      if (w2.b.covered) {
        top = mix(top, select(0.0, 1.0, w2.b.fam == 1u), w2.wb);
        s = mix(s, w2.b.slope, w2.wb);
        h = mix(h, w2.b.h, w2.wb);
      }
      let hn = clamp((h + hTop) / (2.0 * hTop), 0.0, 1.0);
      wf += top;
      aoc += weaveOcclusion(hn);
      slope += s;
      covered += 1.0;
    }
  }
  let n = f32(SUB * SUB);
  textureStore(tileOut, vec2<i32>(gid.xy), vec4<f32>(wf / max(covered, 1.0), aoc / n, slope / n));
}
`,
  ye = `// Edge field (render_common.wgsl): per crossing the distance to the nearest opening (a crossing
// where neither yarn is part of the cloth), the intact fraction of its warp and pick, and the density of separated yarn ends around that opening,
// written to an rgba16float texture at crossing resolution. Distances come from jump flooding over the crossing grid with physical (anisotropic)
// pitches: nearest seeds are propagated over steps 16, 8, 4, 2, 1, 1 crossings, enough for EDGE_RMAX.
// Rebuilt only when the yarn field changed (edgeArgsMain consumes the solver's field event flag) or a
// piece was retired.

@group(0) @binding(0) var<uniform> R: RenderU;
// x: jump step (crossings)
@group(0) @binding(1) var<uniform> Step: vec4<u32>;
@group(0) @binding(2) var<storage, read> field: array<u32>;
@group(0) @binding(3) var<storage, read> seedIn: array<u32>;
@group(0) @binding(4) var<storage, read_write> seedOut: array<u32>;
@group(0) @binding(5) var edgeOut: texture_storage_2d<rgba16float, write>;
// [0] built at least once since the renderer was created or reset, [1] retired nodes at the last build
@group(0) @binding(6) var<storage, read_write> edgeSig: array<u32>;
// solver yarn field: [0] = 1 when a damage code changed since the last rebuild
@group(0) @binding(7) var<storage, read_write> fieldEvents: array<u32>;
// indirect dispatches of the rebuild passes (x, y, z, unused): over crossings (128 per group), over
// nodes, over cells, and a single invocation; all zero when nothing changed
@group(0) @binding(8) var<storage, read_write> edgeArgs: array<u32>;
// loose-thread bits per crossing (threads.wgsl, rebuilt before the edge field)
@group(0) @binding(9) var<storage, read> threadBitsE: array<u32>;
// thread counters (threads.wgsl): [2] retired nodes this frame
@group(0) @binding(10) var<storage, read> threadCountE: array<u32>;

const NO_SEED: u32 = 0xFFFFFFFFu;

struct Texel {
  l: u32,
  k: u32,
  m: u32,
  valid: bool,
};

fn texelOf(c: u32) -> Texel {
  var o: Texel;
  o.l = 0u;
  for (var q = 1u; q < R.counts.y; q++) {
    if (c >= R.layers[q].field.x) { o.l = q; }
  }
  let F = R.layers[o.l].field;
  o.valid = c < F.x + F.y * F.z;
  let local = c - F.x;
  o.k = local % F.y;
  o.m = local / F.y;
  return o;
}

fn fieldTotal() -> u32 {
  let F = R.layers[R.counts.y - 1u].field;
  return F.x + F.y * F.z;
}

@compute @workgroup_size(1)
fn edgeArgsMain() {
  // new separations, or a torn-off piece fell out of the scene (its material leaves the cloth)
  let ret = threadCountE[2];
  let changed = fieldEvents[0] != 0u || edgeSig[0] == 0u || ret != edgeSig[1];
  fieldEvents[0] = 0u;
  edgeSig[0] = 1u;
  edgeSig[1] = ret;
  edgeArgs[0] = select(0u, (fieldTotal() + 127u) / 128u, changed);
  edgeArgs[1] = 1u;
  edgeArgs[2] = 1u;
  edgeArgs[4] = select(0u, (R.counts.x + 127u) / 128u, changed);
  edgeArgs[5] = 1u;
  edgeArgs[6] = 1u;
  edgeArgs[8] = select(0u, (R.counts.z + 127u) / 128u, changed);
  edgeArgs[9] = 1u;
  edgeArgs[10] = 1u;
  edgeArgs[12] = select(0u, 1u, changed);
  edgeArgs[13] = 1u;
  edgeArgs[14] = 1u;
}

@compute @workgroup_size(128)
fn seedInit(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  let t = texelOf(c);
  if (!t.valid) { return; }
  // an opening: neither yarn is part of the cloth here (separated, or drawn as a loose thread). A
  // worn-through float still has its pick covering the crossing, so it is not an edge
  let w = field[c];
  let tb = threadBitsE[c >> 4u] >> (2u * (c & 15u));
  let openPick = yarnCode(w, 0u) >= PULLED_R || (tb & 1u) != 0u;
  let openWarp = yarnCode(w, 1u) >= PULLED_R || (tb & 2u) != 0u;
  seedOut[c] = select(NO_SEED, t.k | (t.m << 16u), openPick && openWarp);
}

fn seedDist(L: LayerR, k: u32, m: u32, s: u32) -> f32 {
  if (s == NO_SEED) { return 1e9; }
  let d = vec2<f32>((f32(s & 0xFFFFu) - f32(k)) * L.pitch.x, (f32(s >> 16u) - f32(m)) * L.pitch.y);
  return dot(d, d);
}

@compute @workgroup_size(128)
fn seedStep(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  let t = texelOf(c);
  if (!t.valid) { return; }
  let LR = R.layers[t.l];
  let F = LR.field;
  let st = i32(Step.x);
  var best = seedIn[c];
  var bd = seedDist(LR, t.k, t.m, best);
  for (var dj = -1; dj <= 1; dj++) {
    for (var di = -1; di <= 1; di++) {
      if (di == 0 && dj == 0) { continue; }
      let k = i32(t.k) + di * st;
      let m = i32(t.m) + dj * st;
      if (k < 0 || m < 0 || k >= i32(F.y) || m >= i32(F.z)) { continue; }
      let s = seedIn[F.x + u32(m) * F.y + u32(k)];
      let d = seedDist(LR, t.k, t.m, s);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
  }
  seedOut[c] = best;
}

@compute @workgroup_size(128)
fn edgeWrite(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  let t = texelOf(c);
  if (!t.valid) { return; }
  let LR = R.layers[t.l];
  let w = field[c];
  let d = min(sqrt(seedDist(LR, t.k, t.m, seedIn[c])) * 1e3, EDGE_RMAX);
  // a yarn drawn as a loose thread is not part of the cloth's filtered coverage
  let tb = threadBitsE[c >> 4u] >> (2u * (c & 15u));
  let warp = select(1.0 - f32(yarnCode(w, 1u)) / 255.0, 0.0, (tb & 2u) != 0u || yarnCode(w, 1u) >= PULLED_R);
  let pick = select(1.0 - f32(yarnCode(w, 0u)) / 255.0, 0.0, (tb & 1u) != 0u || yarnCode(w, 0u) >= PULLED_R);
  // how much of an edge the nearest opening is: separated yarn segments within about 1.2 mm of it
  // (7 warps x 5 picks). Every point of its rim and halo takes the character of that edge, not of the
  // few crossings around the point itself
  var density = 0.0;
  let seed = seedIn[c];
  if (d < EDGE_RMAX && seed != NO_SEED) {
    let F = LR.field;
    var cuts = 0u;
    var opens = 0u;
    var n = 0u;
    for (var dm = -2; dm <= 2; dm++) {
      for (var dk = -3; dk <= 3; dk++) {
        let k = i32(seed & 0xFFFFu) + dk;
        let m = i32(seed >> 16u) + dm;
        if (k < 0 || m < 0 || k >= i32(F.y) || m >= i32(F.z)) { continue; }
        let cc = F.x + u32(m) * F.y + u32(k);
        let ww = field[cc];
        let sp = yarnCode(ww, 0u) >= PULLED_R;
        let sw = yarnCode(ww, 1u) >= PULLED_R;
        cuts += select(0u, 1u, sp) + select(0u, 1u, sw);
        let tbb = threadBitsE[cc >> 4u] >> (2u * (cc & 15u));
        opens += select(0u, 1u, (sp || (tbb & 1u) != 0u) && (sw || (tbb & 2u) != 0u));
        n += 2u;
      }
    }
    // a torn edge has open crossings on one side of it; a worn-through float or a pin-hole only a few:
    // its loosened rim and abraded halo are correspondingly slight
    density = f32(cuts) / f32(max(n, 1u)) * smoothstep(0.06, 0.35, f32(opens) / f32(max(n / 2u, 1u)));
  }
  textureStore(edgeOut, vec2<u32>(t.k, u32(LR.edge.x) + t.m), vec4<f32>(d, warp, pick, density));
}
`,
  be = `// Per frame, per free-edge crossing (pieces.wgsl edgeList): where its material is (material_map.wgsl),
// shared by all the fibres rooted on it (fuzz.wgsl).

@group(0) @binding(0) var<uniform> R: RenderU;
@group(0) @binding(1) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> tframe: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> rsurf: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> kappaM: array<u32>;
@group(0) @binding(5) var<storage, read> edgeList: array<u32>;
// per edge crossing: position (w = 1, or 0 when it is not held), d/du and d/dv per crossing pitch
@group(0) @binding(6) var<storage, read_write> edgeRoots: array<vec4<f32>>;

@compute @workgroup_size(64)
fn edgeRootsMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let e = gid.x;
  if (e >= edgeList[MAX_EDGES]) { return; }
  let c = edgeList[e] & 0x0FFFFFFFu;
  var l = 0u;
  for (var q = 1u; q < R.counts.y; q++) {
    if (c >= R.layers[q].field.x) { l = q; }
  }
  let LR = R.layers[l];
  let FL = LR.field;
  let mp = crossingPoint(l, i32((c - FL.x) % FL.y), i32((c - FL.x) / FL.y));
  let bu = f32(bundleOf(LR, 1u));
  let bv = f32(bundleOf(LR, 0u));
  edgeRoots[3u * e] = vec4<f32>(mp.p, select(0.0, 1.0, mp.valid));
  edgeRoots[3u * e + 1u] = vec4<f32>(mp.ds / bu, 0.0);
  edgeRoots[3u * e + 2u] = vec4<f32>(mp.dt / bv, 0.0);
}
`;
const xe = { bulge: 3e-4, stiffness: 1300, friction: 0.35, frictionSpeed: 0.002 };
var Se = `// The floor beneath the cloth: a textured dielectric (base colour, normal, roughness, AO from a
// scanned set; base colour and normal at full resolution cropped to the floor ever seen, the slowly
// varying roughness and AO as the whole tile) lit by the key, the overhead lamp and the fill, each seen through the cloth above it.
// The cloth's occlusion of a light comes from its shadow map prefiltered into coverage (coverage.wgsl):
// the fraction of the source a floor point sees is one minus the cloth's coverage over the penumbra
// footprint, whose radius is the cloth's height above the point (along the light) times the source's
// angular radius, so contact with nothing is sharp and a hole's light falls soft-edged. The fill is
// the hemisphere above, seen through the openings: the cloth's coverage weighted by the cosine kernel
// of a plane at the cloth's height (rings of equal energy).

@group(0) @binding(0) var<uniform> F: FrameU;
@group(0) @binding(1) var baseTex: texture_2d<f32>;
@group(0) @binding(2) var normalTex: texture_2d<f32>;
// roughness, ambient occlusion
@group(0) @binding(3) var raTex: texture_2d<f32>;
@group(0) @binding(4) var matSampler: sampler;
// the crops: clamped (they do not tile)
@group(0) @binding(11) var detailSampler: sampler;
// per light: coverage of its shadow projection and coverage-weighted cloth depth, mipmapped
@group(0) @binding(5) var keyCovTex: texture_2d<f32>;
@group(0) @binding(6) var overCovTex: texture_2d<f32>;
@group(0) @binding(7) var covSampler: sampler;
// declared for the shared lighting (render_light.wgsl); the floor sees the cloth's shadows through the
// coverage instead, so these are never bound
@group(0) @binding(8) var shadowMap: texture_depth_2d;
@group(0) @binding(9) var shadowSampler: sampler_comparison;
@group(0) @binding(10) var overMap: texture_depth_2d;

// polished stone / resin: the dielectric's reflectance at normal incidence
const F0: f32 = 0.04;
// half extent of the floor quad around the view target (m)
const FLOOR_HALF: f32 = 1.5;

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) world: vec3<f32>,
};

@vertex
fn vsFloor(@builtin(vertex_index) vi: u32) -> VOut {
  var c = array<vec2<f32>, 6>(vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0));
  let W = vec3<f32>(c[vi] * FLOOR_HALF, F.floor.x);
  var o: VOut;
  o.world = W;
  o.pos = F.viewProj * vec4<f32>(W, 1.0);
  return o;
}

fn lightUV(M: mat4x4<f32>, P: vec3<f32>) -> vec3<f32> {
  let p = M * vec4<f32>(P, 1.0);
  return vec3<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5, p.z);
}

// Mip level whose texels span a footprint of the given diameter (m).
fn covLevel(L: vec4<f32>, diameter: f32) -> f32 {
  return log2(max(diameter / (L.z / L.w), 1.0));
}

// Fraction of a light seen from the floor point P through the cloth. L: the light's coverage
// parameters (FrameU keyCov / overCov); nominalGap: the cloth plane's distance from P along the light.
fn lightVis(tex: texture_2d<f32>, M: mat4x4<f32>, L: vec4<f32>, P: vec3<f32>, nominalGap: f32) -> f32 {
  let q = lightUV(M, P);
  // beyond the projection the light's path crosses the cloth's plane outside the coupon: the mount
  if (any(q.xy < vec2<f32>(0.0)) || any(q.xy > vec2<f32>(1.0))) { return 0.0; }
  // the cloth's mean depth over the nominal penumbra (the blocker search)
  let s = textureSampleLevel(tex, covSampler, q.xy, covLevel(L, 2.0 * nominalGap * L.x));
  if (s.x < 1e-4) { return 1.0; }
  let gap = max((q.z - s.y / s.x) * L.y, 0.0);
  let R = gap * L.x;
  // coverage over the penumbra disc: four taps of the footprint half its size, tent-like
  let lv = covLevel(L, R);
  let o = 0.5 * R / L.z;
  var c = 0.0;
  c += textureSampleLevel(tex, covSampler, q.xy + vec2<f32>(o, o), lv).x;
  c += textureSampleLevel(tex, covSampler, q.xy + vec2<f32>(-o, o), lv).x;
  c += textureSampleLevel(tex, covSampler, q.xy + vec2<f32>(o, -o), lv).x;
  c += textureSampleLevel(tex, covSampler, q.xy + vec2<f32>(-o, -o), lv).x;
  return clamp(1.0 - 0.25 * c, 0.0, 1.0);
}

struct Sky {
  // cosine-weighted fraction of the sky seen, and the cloth's height above the point (m)
  vis: f32,
  gap: f32,
};

// The fill seen from P through the openings of the cloth above it (the overhead projection is close
// to vertical, so its texels are the floor's xy).
fn skyVis(P: vec3<f32>) -> Sky {
  let L = F.overCov;
  let q = lightUV(F.overViewProj, P);
  var sk: Sky;
  sk.vis = 1.0;
  sk.gap = -F.floor.x;
  if (any(q.xy < vec2<f32>(0.0)) || any(q.xy > vec2<f32>(1.0))) { return sk; }
  let s = textureSampleLevel(overCovTex, covSampler, q.xy, covLevel(L, 2.0 * sk.gap));
  if (s.x > 1e-4) { sk.gap = max((q.z - s.y / s.x) * L.y, 1e-3); }
  // a parallel plane at height g: the cosine-weighted share within radius r is r^2 / (r^2 + g^2);
  // rings of a quarter of it each at their median radius, four taps around each
  var radii = array<f32, 4>(0.378, 0.775, 1.29, 2.65);
  var cov = 0.0;
  for (var k = 0u; k < 4u; k++) {
    let r = radii[k] * sk.gap;
    let lv = covLevel(L, 1.4 * r);
    let a = 0.785398 * f32(k & 1u);
    for (var j = 0u; j < 4u; j++) {
      let t = a + 1.570796 * f32(j);
      cov += textureSampleLevel(overCovTex, covSampler, q.xy + vec2<f32>(cos(t), -sin(t)) * (r / L.z), lv).x;
    }
  }
  sk.vis = clamp(1.0 - cov / 16.0, 0.0, 1.0);
  return sk;
}

// GGX specular (Smith height-correlated visibility, Schlick Fresnel) times cos for unit irradiance.
fn ggx(N: vec3<f32>, V: vec3<f32>, Ld: vec3<f32>, alpha: f32) -> f32 {
  let NL = dot(N, Ld);
  if (NL <= 0.0) { return 0.0; }
  let NV = max(dot(N, V), 1e-3);
  let H = normalize(Ld + V);
  let NH = max(dot(N, H), 0.0);
  let a2 = alpha * alpha;
  let dd = NH * NH * (a2 - 1.0) + 1.0;
  let D = a2 / (PI * dd * dd);
  let vis = 0.5 / (NL * sqrt(NV * NV * (1.0 - a2) + a2) + NV * sqrt(NL * NL * (1.0 - a2) + a2));
  let Fr = F0 + (1.0 - F0) * pow(1.0 - max(dot(V, H), 0.0), 5.0);
  return D * vis * Fr * NL;
}

@fragment
fn fsFloor(in: VOut) -> @location(0) vec4<f32> {
  let P = in.world;
  let V = normalize(F.camPos.xyz - P);
  // texture space: u along +x, v down the image = -y (a +Y-up normal map then points along +y); the
  // tile is centred on the view (the visible floor is far smaller than one), so its edges never show
  let uv = vec2<f32>(P.x, -P.y) * F.floor.y + 0.5;
  let duv = (uv - 0.5) * F.floor.w / vec2<f32>(textureDimensions(baseTex)) + 0.5;
  let base = textureSample(baseTex, detailSampler, duv).rgb;
  let ra = textureSample(raTex, matSampler, uv).rg;
  let nt = textureSample(normalTex, detailSampler, duv).xyz * 2.0 - 1.0;
  let nl = max(length(nt), 1e-3);
  let N = normalize(nt);
  // Toksvig: the normals a texel averages widen the lobe by the length they lose
  let alpha = sqrt(min(ra.x * ra.x * ra.x * ra.x + (1.0 - min(nl, 1.0)) / nl, 1.0));
  let ao = ra.y;
  let diff = base * (1.0 / PI);

  // key: a broad source, seen through the cloth
  let key = keyLight(P);
  let visK = lightVis(keyCovTex, F.lightViewProj, F.keyCov, P, -F.floor.x / max(key.z, 0.05));
  let aK = sqrt(alpha * alpha + 0.25 * F.keyCov.x * F.keyCov.x);
  var c = (diff * max(dot(N, key.xyz), 0.0) + vec3<f32>(ggx(N, V, key.xyz, aK))) * (key.w * visK) * F.keyColor.rgb;

  // overhead lamp: a distant disc; its size widens the highlight (half-vector spread of half its radius)
  let Lo = F.overDir.xyz;
  let visO = lightVis(overCovTex, F.overViewProj, F.overCov, P, -F.floor.x / max(Lo.z, 0.05));
  let aO = sqrt(alpha * alpha + 0.25 * F.overColor.w * F.overColor.w);
  c += (diff * max(dot(N, Lo), 0.0) + vec3<f32>(ggx(N, V, Lo, aO))) * F.overColor.rgb * visO;

  // fill through the openings, and its mirror image where the reflected view leaves through one
  let sky = skyVis(P);
  c += F.ambient.rgb * base * ao * sky.vis;
  let Rv = reflect(-V, N);
  if (Rv.z > 0.05) {
    let q = lightUV(F.overViewProj, P);
    let off = Rv.xy * (sky.gap / Rv.z);
    let lv = covLevel(F.overCov, 2.0 * sky.gap * alpha);
    let open = 1.0 - textureSampleLevel(overCovTex, covSampler, q.xy + vec2<f32>(off.x, -off.y) / F.overCov.z, lv).x;
    let Fr = F0 + (1.0 - F0) * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    c += F.ambient.rgb * (Fr * ao * open);
  }
  return vec4<f32>(c, 1.0);
}
`,
  Ce = `// A shadow map prefiltered for the floor (floor.wgsl): per texel, the fraction of the shadow map's
// texels it spans that hold cloth (everything drawn there is cloth above the floor), and the mean
// cloth depth weighted the same way, then a box-filtered mip chain of both. Both are linear in the
// covered area, so any level is the exact average over its texels.

struct CovU {
  // shadow-map texels per coverage texel along each side
  block: vec4<u32>,
};

@group(0) @binding(0) var<uniform> U: CovU;
@group(0) @binding(1) var depthIn: texture_depth_2d;
@group(0) @binding(2) var covIn: texture_2d<f32>;
@group(0) @binding(3) var covOut: texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var gatherSampler: sampler;

@compute @workgroup_size(8, 8)
fn fromDepth(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(covOut);
  if (any(gid.xy >= dims)) { return; }
  let B = U.block.x;
  let texel = 1.0 / vec2<f32>(textureDimensions(depthIn));
  var c = 0.0;
  var cd = 0.0;
  // 2 x 2 texels per gather (sampled at their shared corner)
  for (var j = 0u; j < B; j += 2u) {
    for (var i = 0u; i < B; i += 2u) {
      let d = textureGather(depthIn, gatherSampler, vec2<f32>(f32(gid.x * B + i + 1u), f32(gid.y * B + j + 1u)) * texel);
      let m = select(vec4<f32>(0.0), vec4<f32>(1.0), d < vec4<f32>(1.0));
      c += dot(m, vec4<f32>(1.0));
      cd += dot(m, d);
    }
  }
  let inv = 1.0 / f32(B * B);
  textureStore(covOut, gid.xy, vec4<f32>(c * inv, cd * inv, 0.0, 0.0));
}

@compute @workgroup_size(8, 8)
fn down(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(covOut);
  if (any(gid.xy >= dims)) { return; }
  let p = gid.xy * 2u;
  let s = textureLoad(covIn, p, 0) + textureLoad(covIn, p + vec2<u32>(1u, 0u), 0) + textureLoad(covIn, p + vec2<u32>(0u, 1u), 0) + textureLoad(covIn, p + vec2<u32>(1u, 1u), 0);
  textureStore(covOut, gid.xy, 0.25 * s);
}
`,
  M = `// Floor material textures at load: mip levels by a bilinear tap at the centre of each 2 x 2 block of
// the level above (the box average, filtered in linear space for sRGB views), and the roughness and
// ambient occlusion maps packed into one texture.

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var src2: texture_2d<f32>;
@group(0) @binding(2) var smp: sampler;

struct FsIn {
  @builtin(position) pos: vec4<f32>,
};

@vertex
fn vsFull(@builtin(vertex_index) vi: u32) -> FsIn {
  let p = vec2<f32>(f32((vi << 1u) & 2u), f32(vi & 2u));
  var o: FsIn;
  o.pos = vec4<f32>(p * 2.0 - 1.0, 0.0, 1.0);
  return o;
}

@fragment
fn fsDown(in: FsIn) -> @location(0) vec4<f32> {
  // the level below is half the size, rounded down (odd sizes: the tap stays at the texel's place)
  let uv = in.pos.xy / vec2<f32>(max(textureDimensions(src) / 2u, vec2<u32>(1u)));
  return textureSampleLevel(src, smp, uv, 0.0);
}

@fragment
fn fsPack(in: FsIn) -> @location(0) vec4<f32> {
  let p = vec2<i32>(in.pos.xy);
  return vec4<f32>(textureLoad(src, p, 0).r, textureLoad(src2, p, 0).r, 0.0, 1.0);
}
`,
  we = `// The mount the coupon is stretched in: an opaque board in the cloth's plane, just beneath it, from
// under the pinned collar outward. It shades the floor beneath the cloth from the lights (they would
// otherwise reach under the coupon's edge) and is seen only past the coupon's sides; a dark matte
// surface lit like the floor's lights, with the cloth's shadows.

@group(0) @binding(0) var<uniform> F: FrameU;
// inner (under the collar) corners 0..3, outer corners 4..7, in order around the coupon
@group(0) @binding(1) var<storage, read> corners: array<vec4<f32>>;
@group(0) @binding(2) var shadowMap: texture_depth_2d;
@group(0) @binding(3) var shadowSampler: sampler_comparison;
@group(0) @binding(4) var overMap: texture_depth_2d;

const MOUNT_ALBEDO: vec3<f32> = vec3<f32>(0.045, 0.045, 0.047);

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) world: vec3<f32>,
};

// One side of the ring per pair of triangles: inner k, inner k+1, outer k+1, outer k.
fn mountCorner(vi: u32) -> vec3<f32> {
  let side = vi / 6u;
  var q = array<u32, 6>(0u, 1u, 2u, 0u, 2u, 3u);
  let c = q[vi % 6u];
  let k = (side + select(0u, 1u, c == 1u || c == 2u)) % 4u;
  return corners[select(k + 4u, k, c < 2u)].xyz;
}

@vertex
fn vsMount(@builtin(vertex_index) vi: u32) -> VOut {
  let W = mountCorner(vi);
  var o: VOut;
  o.world = W;
  o.pos = F.viewProj * vec4<f32>(W, 1.0);
  return o;
}

@vertex
fn vsMountShadow(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4<f32> {
  return F.lightViewProj * vec4<f32>(mountCorner(vi), 1.0);
}

@fragment
fn fsMount(in: VOut) -> @location(0) vec4<f32> {
  let N = vec3<f32>(0.0, 0.0, 1.0);
  let key = keyLight(in.world);
  let a = MOUNT_ALBEDO * (1.0 / PI);
  var c = a * max(key.z, 0.0) * key.w * F.keyColor.rgb * shadowFactor(in.world, N);
  c += a * max(F.overDir.z, 0.0) * F.overColor.rgb * shadowOver(in.world, N);
  let cam = torchLight(in.world);
  c += a * max(cam.z, 0.0) * cam.w * F.torchColor.rgb;
  c += F.ambient.rgb * MOUNT_ALBEDO;
  return vec4<f32>(c, 1.0);
}
`;
const Te = `rgba16float`,
  Ee = 4096,
  N = 0.34,
  De = 2048,
  P = 0.45,
  F = { grade: 0, grain: 0, vignette: 0, glitch: 0, glitchSeed: 0 },
  Oe = 65536,
  ke = 16384,
  Ae = 262144,
  je = 8192,
  Me = `rgba16float`,
  Ne = [16, 8, 4, 2, 1, 1];
function Pe(e, t) {
  let n = Math.max(...e.layers.map((e) => e.bundle[0])),
    r = Math.max(...e.layers.map((e) => e.bundle[1])),
    i = 2 * n + 3,
    a = 2 * r + 3;
  return (
    [
      [`KAPPA_TABLE`, `u32`, `4u`],
      [`KAPPA_NONE`, `u32`, `0xFFFFFFFFu`],
      [`KAPPA_ZERO`, `u32`, `0xFFFFFFFEu`],
      [`KAPPA_SLOTS`, `u32`, `${ke}u`],
      [`KAPPA_DW`, `u32`, `${4 * n + 3}u`],
      [`KAPPA_DH`, `u32`, `${4 * r + 3}u`],
      [`KAPPA_DOMAIN`, `u32`, `${(4 * n + 3) * (4 * r + 3)}u`],
      [`KAPPA_RW`, `u32`, `${i}u`],
      [`KAPPA_RH`, `u32`, `${a}u`],
      [`KAPPA_WORDS`, `u32`, `${Math.ceil((i * a) / 4)}u`],
      [`KAPPA_LO`, `f32`, `0.25`],
      [`KAPPA_HI`, `f32`, `0.75`],
      [`FINE_BASE`, `u32`, `4u`],
      [`MAX_FINE`, `u32`, `32768u`],
      [`FINE_QK`, `u32`, `${n + 1}u`],
      [`FINE_QM`, `u32`, `${r + 1}u`],
      [`MAX_EDGES`, `u32`, `${Ae}u`],
      [`FIBERS_PER_EDGE`, `u32`, `12u`],
      [`FIBRE_LIN`, `f32`, `${p}`],
      [`TAIL_SEGS`, `u32`, `16u`],
      [`TAIL_SEGS_1`, `u32`, `17u`],
      [`MAX_TAILS`, `u32`, `${je}u`],
      [`FACE_HASH`, `bool`, `${t}`],
      [`FACE_CELL`, `f32`, `${b.cell}`],
      [`FACE_MASK`, `u32`, `${(1 << b.tableBits) - 1}u`],
    ].map(([e, t, n]) => `const ${e}: ${t} = ${n};`).join(`
`) +
    `
`
  );
}
var Fe = class {
  device;
  format;
  solver;
  scene;
  keyOffset = [-0.05, 0.6, 0.3];
  keyIntensity = 6;
  exposure = 1;
  ambient = [0.03, 0.035, 0.05];
  keyAim = [0, 0.12, 0];
  keyCone = 0.9;
  keyInner = 1;
  keyLeak = 0.05;
  keyColor = [1, 1, 1];
  torchPos = [0, 0, 1];
  torchAim = [0, 0, -1];
  torchIntensity = 0;
  torchCone = [0.8, 0.95];
  torchColor = [1, 1, 1];
  background = [0.002, 0.002, 0.003];
  overDir = E([-0.03, 0.17, 1]);
  overIntensity = 0.1;
  overColor = [1, 0.92, 0.82];
  overAngle = 0.065;
  floorZ = -0.12;
  floorTile = 2.5;
  floorDetailTexels = 8192;
  showFloor = !0;
  lightAnchor = null;
  extras = [];
  post = { ...F };
  freeze = !1;
  frameU;
  frameOverU;
  overTex;
  keyCov;
  overCov;
  covGroups = [];
  floorGroup = null;
  floorLayout;
  mountCorners;
  renderU;
  tailFloor = null;
  nrm;
  tframe;
  cellFlags;
  lists;
  drawArgs;
  rsurf;
  cellCount;
  refinedCount;
  fieldCount;
  edgeSig;
  edgeArgs;
  threadBits;
  threadScratch;
  threadCount;
  runs;
  chunks;
  runGeo;
  threadDraw;
  tails;
  tailCount;
  kappa;
  cellDirty;
  piecesArgs;
  edgeList;
  edgeRoots;
  seedA;
  seedB;
  edgeTex;
  edgeSampler;
  edgeArgsGroup;
  edgeGroups = [];
  groups = {};
  pipes = {};
  cpipes = {};
  postLayout;
  shadowTex;
  weaveTile;
  tileSampler;
  shadowSampler;
  dummyDepth;
  common;
  postU;
  postGroup = null;
  msaaColor = null;
  msaaDepth = null;
  hdr = null;
  width = 1;
  height = 1;
  frameIndex = 0;
  edgeRows = [];
  edgeSize = [1, 1];
  constructor(e, t, n, s) {
    ((this.device = e), (this.format = t), (this.solver = n), (this.scene = s));
    let c = s.nodeCount,
      u = n.contactEnabled && n.contact instanceof x ? n.contact : null,
      d = Pe(s, u !== null) + oe;
    this.common = d;
    let p = 0,
      m = 0;
    for (let e of s.layers) ((p += (e.nx - 1) * (e.ny - 1)), (m += ((e.nx - 1) * 2 + 1) * ((e.ny - 1) * 2 + 1)));
    ((this.cellCount = p), (this.refinedCount = m), (this.fieldCount = s.fieldDamage.length / 2));
    let h = Math.max(...s.layers.map((e) => e.bundle[0])),
      g = Math.max(...s.layers.map((e) => e.bundle[1])),
      _ = Math.ceil(((2 * h + 3) * (2 * g + 3)) / 4),
      v = 1,
      y = 0;
    ((this.edgeRows = s.field.map((e) => {
      let t = y;
      return ((v = Math.max(v, e.K)), (y += e.M), t);
    })),
      (this.edgeSize = [v, y]),
      (this.frameU = a(e, `frameU`, 512, i)),
      (this.frameOverU = a(e, `frameOverU`, 512, i)),
      (this.renderU = o(e, `renderU`, new Uint8Array(this.renderParams()), i)));
    let b = new Float32Array(4 * c);
    for (let e = 0; e < c; e++) b[4 * e + 2] = 1;
    this.nrm = o(e, `nrm`, b);
    let S = new Float32Array(8 * c);
    for (let e = 0; e < c; e++) ((S[8 * e] = 1), (S[8 * e + 3] = s.wear[e]), (S[8 * e + 5] = 1));
    ((this.tframe = o(e, `tframe`, S)),
      (this.cellFlags = a(e, `cellFlags`, 4 * p)),
      (this.lists = a(e, `lists`, 131088)),
      (this.drawArgs = a(e, `drawArgs`, 96, r | GPUBufferUsage.INDIRECT)),
      (this.rsurf = a(e, `rsurf`, 48 * m)),
      (this.edgeSig = a(e, `edgeSig`, 16)),
      (this.edgeArgs = a(e, `edgeArgs`, 64, r | GPUBufferUsage.INDIRECT)),
      (this.seedA = a(e, `edge.seedA`, 4 * this.fieldCount)),
      (this.seedB = a(e, `edge.seedB`, 4 * this.fieldCount)),
      (this.threadBits = a(
        e,
        `threadBits`,
        4 * (Math.ceil(this.fieldCount / 16) + Math.ceil(this.fieldCount / 32) + 1),
      )),
      (this.threadScratch = a(
        e,
        `threadScratch`,
        4 * (2 * Math.ceil(this.fieldCount / 16) + Math.ceil(this.fieldCount / 32)),
      )),
      (this.threadCount = a(e, `threadCount`, 16)),
      (this.tails = a(e, `threadTails`, 272 * je)),
      (this.tailCount = a(e, `threadTailCount`, 16)),
      (this.runs = a(e, `threadRuns`, 16 * Oe)),
      (this.chunks = a(e, `threadChunks`, 1048576)),
      (this.runGeo = a(e, `threadRunGeo`, 144 * Oe)),
      (this.threadDraw = a(e, `threadDraw`, 48, r | GPUBufferUsage.INDIRECT)));
    let C = new Uint32Array(4 + c + ke + ke * _ + ke + c);
    (C.fill(4294967295, 4, 4 + c),
      (this.kappa = o(e, `kappa`, C)),
      (this.cellDirty = a(e, `cellDirty`, 4 * p)),
      (this.piecesArgs = a(e, `piecesArgs`, 64, r | GPUBufferUsage.INDIRECT)),
      (this.edgeList = a(e, `edgeList`, 1048580)),
      (this.edgeRoots = a(e, `edgeRoots`, 48 * Ae)));
    let w = new f(e, `refine`, d + se);
    for (let e of [`nodeFrame`, `classifyCells`, `args`, `refine`]) this.cpipes[e] = w.pipeline(e);
    this.groups.refine = w.bindGroup(`refine`, {
      0: this.renderU,
      1: n.nodes,
      2: n.x,
      3: n.segs,
      5: this.nrm,
      6: this.cellFlags,
      7: this.lists,
      8: this.rsurf,
      9: this.drawArgs,
      10: this.tframe,
      11: this.kappa,
    });
    let T = new f(e, `threads`, d + de);
    for (let e of [
      `retireCount`,
      `threadClear`,
      `threadPresence`,
      `threadAnchor`,
      `threadCloth`,
      `threadScan`,
      `threadArgs`,
    ])
      this.cpipes[e] = T.pipeline(e);
    this.groups.threads = T.bindGroup(`threads`, {
      0: this.renderU,
      1: n.field,
      2: this.threadBits,
      3: this.threadCount,
      4: this.runs,
      5: this.chunks,
      6: this.threadDraw,
      7: n.x,
      8: n.segs,
      9: this.threadScratch,
    });
    let ee = new f(e, `pieces`, d + ue);
    for (let e of [
      `piecesClear`,
      `cellDirtyMain`,
      `nodeAlloc`,
      `piecesArgsMain`,
      `kappaSolve`,
      `piecesArgsReset`,
      `edgeListMain`,
      `edgeDrawArgs`,
    ])
      this.cpipes[e] = ee.pipeline(e);
    ((this.groups.pieces = ee.bindGroup(`pieces`, {
      0: this.renderU,
      1: n.field,
      2: this.threadBits,
      3: n.nodes,
      4: n.x,
      5: this.kappa,
      6: this.cellDirty,
      7: this.piecesArgs,
      8: this.edgeList,
    })),
      (this.groups.piecesSolve = ee.bindGroup(`pieces.solve`, {
        0: this.renderU,
        1: n.field,
        2: this.threadBits,
        3: n.nodes,
        4: n.x,
        5: this.kappa,
      })));
    let E = new f(e, `edgeRoots`, d + le + be);
    ((this.cpipes.edgeRootsMain = E.pipeline(`edgeRootsMain`)),
      (this.groups.edgeRoots = E.bindGroup(`edgeRoots`, {
        0: this.renderU,
        1: n.x,
        2: this.tframe,
        3: this.rsurf,
        4: this.kappa,
        5: this.edgeList,
        6: this.edgeRoots,
      })));
    let te = new f(e, `threadPrep`, d + fe + le + pe);
    ((this.cpipes.threadPrep = te.pipeline(`threadPrep`)),
      (this.groups.threadPrep = te.bindGroup(`threadPrep`, {
        0: this.renderU,
        1: n.x,
        2: n.segs,
        3: this.tframe,
        4: this.nrm,
        5: this.runs,
        6: this.threadCount,
        7: this.runGeo,
        8: this.rsurf,
        9: this.kappa,
      })));
    let ne = new f(e, `threadTail`, d + me);
    ((this.cpipes.threadTail = ne.pipeline(`threadTail`)),
      (this.groups.threadTail = ne.bindGroup(`threadTail`, {
        0: this.renderU,
        1: n.x,
        2: this.runs,
        3: this.threadCount,
        4: this.runGeo,
        5: this.tails,
        6: this.tailCount,
        7: n.nodes,
        8: u ? u.cells : a(e, `noFaceCells`, 16),
        9: u ? u.items : a(e, `noFaceItems`, 32),
      })),
      (this.edgeTex = e.createTexture({
        label: `edgeField`,
        size: [v, y],
        format: Me,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      })),
      (this.edgeSampler = e.createSampler({
        magFilter: `linear`,
        minFilter: `linear`,
        addressModeU: `clamp-to-edge`,
        addressModeV: `clamp-to-edge`,
      })));
    let D = GPUShaderStage.COMPUTE,
      re = e.createBindGroupLayout({
        label: `edgeField`,
        entries: [
          { binding: 0, visibility: D, buffer: { type: `uniform` } },
          { binding: 1, visibility: D, buffer: { type: `uniform` } },
          { binding: 2, visibility: D, buffer: { type: `read-only-storage` } },
          { binding: 3, visibility: D, buffer: { type: `read-only-storage` } },
          { binding: 4, visibility: D, buffer: { type: `storage` } },
          { binding: 5, visibility: D, storageTexture: { access: `write-only`, format: Me } },
          { binding: 6, visibility: D, buffer: { type: `storage` } },
          { binding: 7, visibility: D, buffer: { type: `storage` } },
          { binding: 8, visibility: D, buffer: { type: `storage` } },
          { binding: 9, visibility: D, buffer: { type: `read-only-storage` } },
          { binding: 10, visibility: D, buffer: { type: `read-only-storage` } },
        ],
      }),
      ie = l(e, `edgeField`, d + ye),
      ae = e.createPipelineLayout({ bindGroupLayouts: [re] });
    for (let t of [`edgeArgsMain`, `seedInit`, `seedStep`, `edgeWrite`])
      this.cpipes[t] = e.createComputePipeline({
        label: `edgeField.${t}`,
        layout: ae,
        compute: { module: ie, entryPoint: t },
      });
    let O = this.edgeTex.createView(),
      k = (t, r, a, s, c, l, u) =>
        e.createBindGroup({
          label: t,
          layout: re,
          entries: [
            { binding: 0, resource: { buffer: this.renderU } },
            { binding: 1, resource: { buffer: o(e, `${t}.step`, new Uint32Array([r, 0, 0, 0]), i) } },
            { binding: 2, resource: { buffer: n.field } },
            { binding: 3, resource: { buffer: a } },
            { binding: 4, resource: { buffer: s } },
            { binding: 5, resource: O },
            { binding: 6, resource: { buffer: u } },
            { binding: 7, resource: { buffer: l } },
            { binding: 8, resource: { buffer: c } },
            { binding: 9, resource: { buffer: this.threadBits } },
            { binding: 10, resource: { buffer: this.threadCount } },
          ],
        }),
      A = (t) => a(e, t, 64);
    ((this.edgeArgsGroup = k(`edgeField.args`, 0, this.seedB, this.seedA, this.edgeArgs, n.fieldEvents, this.edgeSig)),
      this.edgeGroups.push(
        k(`edgeField.init`, 0, this.seedB, this.seedA, A(`edgeField.dA`), A(`edgeField.dE`), A(`edgeField.dS`)),
      ),
      Ne.forEach((e, t) => {
        let [n, r] = t % 2 == 0 ? [this.seedA, this.seedB] : [this.seedB, this.seedA];
        this.edgeGroups.push(
          k(`edgeField.step${t}`, e, n, r, A(`edgeField.dA${t}`), A(`edgeField.dE${t}`), A(`edgeField.dS${t}`)),
        );
      }));
    let ve = Ne.length % 2 == 0 ? this.seedA : this.seedB;
    (this.edgeGroups.push(
      k(
        `edgeField.write`,
        0,
        ve,
        ve === this.seedA ? this.seedB : this.seedA,
        A(`edgeField.dAw`),
        A(`edgeField.dEw`),
        A(`edgeField.dSw`),
      ),
    ),
      (this.shadowTex = e.createTexture({
        label: `shadowMap`,
        size: [Ee, Ee],
        format: `depth32float`,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      })),
      (this.dummyDepth = e.createTexture({
        size: [1, 1],
        format: `depth32float`,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
      })),
      (this.shadowSampler = e.createSampler({ compare: `less`, magFilter: `linear`, minFilter: `linear` })),
      (this.overTex = e.createTexture({
        label: `overShadowMap`,
        size: [De, De],
        format: `depth32float`,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      })));
    let xe = (t, n) =>
      e.createTexture({
        label: t,
        size: [n, n],
        format: `rgba16float`,
        mipLevelCount: Math.log2(n) + 1,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      });
    ((this.keyCov = xe(`keyCoverage`, Ee / 4)),
      (this.overCov = xe(`overCoverage`, De / 4)),
      this.buildCoverage([
        [this.shadowTex, this.keyCov],
        [this.overTex, this.overCov],
      ]),
      (this.weaveTile = this.buildWeaveTile(d)),
      (this.tileSampler = e.createSampler({
        addressModeU: `repeat`,
        addressModeV: `repeat`,
        magFilter: `linear`,
        minFilter: `linear`,
        mipmapFilter: `linear`,
        maxAnisotropy: 16,
      })));
    let Ce = GPUShaderStage.VERTEX,
      M = GPUShaderStage.FRAGMENT,
      N = Ce | M,
      P = (e, t = Ce) => ({ binding: e, visibility: t, buffer: { type: `read-only-storage` } }),
      F = (e) => ({ binding: e, visibility: N, buffer: { type: `uniform` } }),
      Fe = (e, t = M) => [
        { binding: e, visibility: t, texture: { sampleType: `depth` } },
        { binding: e + 1, visibility: t, sampler: { type: `comparison` } },
      ],
      I = e.createBindGroupLayout({
        label: `surface`,
        entries: [
          F(0),
          F(1),
          P(2),
          P(3),
          ...Fe(4),
          { binding: 6, visibility: M, texture: { sampleType: `float`, viewDimension: `2d-array` } },
          { binding: 7, visibility: M, sampler: { type: `filtering` } },
          P(8),
          { binding: 9, visibility: M, texture: { sampleType: `float` } },
          { binding: 10, visibility: M, sampler: { type: `filtering` } },
          P(11, N),
          P(12, N),
          P(13),
          P(14),
          P(15),
          { binding: 16, visibility: M, texture: { sampleType: `depth` } },
          { binding: 17, visibility: M, texture: { sampleType: `float` } },
          { binding: 18, visibility: M, sampler: { type: `filtering` } },
        ],
      }),
      Ie = e.createBindGroupLayout({
        label: `fuzz`,
        entries: [
          F(0),
          F(1),
          P(2),
          P(3),
          P(4),
          ...Fe(9, N),
          { binding: 11, visibility: N, texture: { sampleType: `depth` } },
        ],
      }),
      Le = e.createBindGroupLayout({
        label: `thread`,
        entries: [
          F(0),
          F(1),
          P(2),
          P(3),
          P(4),
          P(5),
          P(6),
          P(7),
          P(8),
          ...Fe(9),
          P(11),
          { binding: 12, visibility: M, texture: { sampleType: `depth` } },
        ],
      }),
      Re = { format: `depth32float`, depthWriteEnabled: !0, depthCompare: `less` },
      ze = { ...Re, depthBias: 2, depthBiasSlopeScale: 2 },
      L = { count: 4 },
      Be = { count: 4, alphaToCoverageEnabled: !0 },
      Ve = { topology: `triangle-strip`, cullMode: `none` },
      R = { topology: `triangle-list`, cullMode: `none` },
      He = {
        color: { srcFactor: `src-alpha`, dstFactor: `one-minus-src-alpha` },
        alpha: { srcFactor: `one`, dstFactor: `one-minus-src-alpha` },
      },
      z = (t, n, r, i, a, o, s, c) =>
        e.createRenderPipeline({
          label: t,
          layout: e.createPipelineLayout({ bindGroupLayouts: [n] }),
          vertex: { module: r, entryPoint: i },
          fragment: a ? { module: r, entryPoint: a, targets: [{ format: Te, blend: c }] } : void 0,
          primitive: o,
          depthStencil: s ? (c ? { ...Re, depthWriteEnabled: !1 } : Re) : ze,
          multisample: s ?? void 0,
        }),
      B = l(e, `surface`, d + j + le + ce);
    ((this.pipes.surface = z(`surface`, I, B, `vsMain`, `fsMain`, R, L)),
      (this.pipes.surfaceShadow = z(`surface.shadow`, I, B, `vsShadow`, null, R, null)),
      (this.pipes.fine = z(`fine`, I, B, `vsFine`, `fsMain`, R, L)),
      (this.pipes.fineShadow = z(`fine.shadow`, I, B, `vsFineShadow`, null, R, null)));
    let Ue = l(e, `fuzz`, d + j + ge);
    this.pipes.edgeFuzz = z(`edgeFuzz`, Ie, Ue, `vsEdgeFuzz`, `fsFuzz`, Ve, L, He);
    let V = l(e, `thread`, d + j + fe + he);
    ((this.pipes.thread = z(`thread`, Le, V, `vsThread`, `fsThread`, Ve, Be)),
      (this.pipes.threadShadow = z(`thread.shadow`, Le, V, `vsThreadShadow`, null, Ve, null)),
      (this.pipes.threadFuzz = z(`threadFuzz`, Le, V, `vsThreadFuzz`, `fsThreadFuzz`, Ve, L, He)));
    let H = (e) => ({ binding: e, visibility: M, texture: { sampleType: `float` } });
    this.floorLayout = e.createBindGroupLayout({
      label: `floor`,
      entries: [
        F(0),
        H(1),
        H(2),
        H(3),
        { binding: 4, visibility: M, sampler: { type: `filtering` } },
        H(5),
        H(6),
        { binding: 7, visibility: M, sampler: { type: `filtering` } },
        { binding: 11, visibility: M, sampler: { type: `filtering` } },
      ],
    });
    let We = l(e, `floor`, d + j + Se);
    this.pipes.floor = z(`floor`, this.floorLayout, We, `vsFloor`, `fsFloor`, R, L);
    let Ge = e.createBindGroupLayout({
        label: `mount`,
        entries: [F(0), P(1), ...Fe(2), { binding: 4, visibility: M, texture: { sampleType: `depth` } }],
      }),
      Ke = l(e, `mount`, d + j + we);
    ((this.pipes.mount = z(`mount`, Ge, Ke, `vsMount`, `fsMount`, R, L)),
      (this.pipes.mountShadow = z(`mount.shadow`, Ge, Ke, `vsMountShadow`, null, R, null)),
      (this.mountCorners = o(e, `mountCorners`, this.mountGeometry())));
    ((this.surfaceLayout = I),
      (this.printTex = e.createTexture({
        label: `print`,
        size: [1, 1],
        format: `rgba8unorm-srgb`,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      })),
      e.queue.writeTexture(
        { texture: this.printTex },
        new Uint8Array([255, 255, 255, 255]),
        { bytesPerRow: 4 },
        [1, 1],
      ),
      (this.printView = this.printTex.createView()),
      (this.printSampler = e.createSampler({ magFilter: `linear`, minFilter: `linear` })));
    let qe = this.weaveTile.createView({ dimension: `2d-array` }),
      Je = this.edgeTex.createView(),
      Ye = this.shadowTex.createView(),
      U = this.dummyDepth.createView(),
      Xe = this.overTex.createView();
    for (let [t, r, i, a] of [
      [``, Ye, Xe, this.frameU],
      [`Shadow`, U, U, this.frameU],
      [`Over`, U, U, this.frameOverU],
    ])
      ((this.groups[`surface${t}`] = e.createBindGroup({
        layout: I,
        entries: [
          { binding: 0, resource: { buffer: a } },
          { binding: 1, resource: { buffer: this.renderU } },
          { binding: 2, resource: { buffer: this.rsurf } },
          { binding: 3, resource: { buffer: this.cellFlags } },
          { binding: 4, resource: r },
          { binding: 5, resource: this.shadowSampler },
          { binding: 6, resource: qe },
          { binding: 7, resource: this.tileSampler },
          { binding: 8, resource: { buffer: this.lists } },
          { binding: 9, resource: Je },
          { binding: 10, resource: this.edgeSampler },
          { binding: 11, resource: { buffer: n.field } },
          { binding: 12, resource: { buffer: this.threadBits } },
          { binding: 13, resource: { buffer: n.x } },
          { binding: 14, resource: { buffer: this.tframe } },
          { binding: 15, resource: { buffer: this.kappa } },
          { binding: 16, resource: i },
          { binding: 17, resource: this.printView },
          { binding: 18, resource: this.printSampler },
        ],
      })),
        (this.groups[`thread${t}`] = e.createBindGroup({
          layout: Le,
          entries: [
            { binding: 0, resource: { buffer: a } },
            { binding: 1, resource: { buffer: this.renderU } },
            { binding: 2, resource: { buffer: n.x } },
            { binding: 3, resource: { buffer: n.segs } },
            { binding: 4, resource: { buffer: this.tframe } },
            { binding: 5, resource: { buffer: this.nrm } },
            { binding: 6, resource: { buffer: this.runs } },
            { binding: 7, resource: { buffer: this.chunks } },
            { binding: 8, resource: { buffer: this.runGeo } },
            { binding: 11, resource: { buffer: this.tails } },
            { binding: 9, resource: r },
            { binding: 10, resource: this.shadowSampler },
            { binding: 12, resource: i },
          ],
        })));
    for (let [t, n, r, i] of [
      [`mount`, this.frameU, Ye, Xe],
      [`mountShadow`, this.frameU, U, U],
      [`mountOver`, this.frameOverU, U, U],
    ])
      this.groups[t] = e.createBindGroup({
        layout: this.pipes.mount.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: n } },
          { binding: 1, resource: { buffer: this.mountCorners } },
          { binding: 2, resource: r },
          { binding: 3, resource: this.shadowSampler },
          { binding: 4, resource: i },
        ],
      });
    this.groups.fuzz = e.createBindGroup({
      layout: Ie,
      entries: [
        { binding: 0, resource: { buffer: this.frameU } },
        { binding: 1, resource: { buffer: this.renderU } },
        { binding: 2, resource: { buffer: this.edgeList } },
        { binding: 3, resource: { buffer: this.edgeRoots } },
        { binding: 4, resource: { buffer: n.field } },
        { binding: 9, resource: Ye },
        { binding: 10, resource: this.shadowSampler },
        { binding: 11, resource: Xe },
      ],
    });
    let Ze = l(e, `post`, d + _e);
    ((this.postLayout = e.createBindGroupLayout({
      label: `post`,
      entries: [
        { binding: 0, visibility: M, buffer: { type: `uniform` } },
        { binding: 1, visibility: M, texture: { sampleType: `unfilterable-float` } },
        { binding: 2, visibility: M, buffer: { type: `uniform` } },
      ],
    })),
      (this.postU = a(e, `postU`, 32, i)),
      (this.pipes.post = e.createRenderPipeline({
        label: `post`,
        layout: e.createPipelineLayout({ bindGroupLayouts: [this.postLayout] }),
        vertex: { module: Ze, entryPoint: `vsFull` },
        fragment: { module: Ze, entryPoint: `fsTonemap`, targets: [{ format: t }] },
        primitive: { topology: `triangle-list` },
      })));
  }
  shared() {
    return {
      common: this.common,
      light: j,
      frameU: this.frameU,
      frameOverU: this.frameOverU,
      shadowView: this.shadowTex.createView(),
      overView: this.overTex.createView(),
      dummyDepthView: this.dummyDepth.createView(),
      shadowSampler: this.shadowSampler,
      hdrFormat: Te,
      samples: 4,
    };
  }
  buildWeaveTile(e) {
    let t = this.scene.layers.length,
      n = Math.log2(128) + 1,
      r = this.device.createTexture({
        label: `weaveTile`,
        size: [128, 128, t],
        format: `rgba16float`,
        mipLevelCount: n,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      }),
      a = l(this.device, `weaveTile`, e + ve),
      s = this.device.createBindGroupLayout({
        label: `weaveTile`,
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: `uniform` } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: `uniform` } },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: { access: `write-only`, format: `rgba16float` },
          },
        ],
      }),
      c = this.device.createComputePipeline({
        label: `weaveTile.build`,
        layout: this.device.createPipelineLayout({ bindGroupLayouts: [s] }),
        compute: { module: a, entryPoint: `build` },
      }),
      u = this.device.createCommandEncoder({ label: `weaveTile` }),
      d = u.beginComputePass();
    d.setPipeline(c);
    let f = [];
    for (let e = 0; e < t; e++)
      for (let t = 0; t < n; t++) {
        let n = 128 >> t,
          a = o(this.device, `weaveTile.level`, new Uint32Array([e, n, 0, 0]), i);
        f.push(a);
        let c = r.createView({
          dimension: `2d`,
          baseMipLevel: t,
          mipLevelCount: 1,
          baseArrayLayer: e,
          arrayLayerCount: 1,
        });
        (d.setBindGroup(
          0,
          this.device.createBindGroup({
            layout: s,
            entries: [
              { binding: 0, resource: { buffer: this.renderU } },
              { binding: 1, resource: { buffer: a } },
              { binding: 2, resource: c },
            ],
          }),
        ),
          d.dispatchWorkgroups(Math.ceil(n / 8), Math.ceil(n / 8)));
      }
    return (
      d.end(),
      this.device.queue.submit([u.finish()]),
      this.device.queue.onSubmittedWorkDone().then(() => f.forEach((e) => e.destroy())),
      r
    );
  }
  mountGeometry() {
    let e = this.scene.layers[0],
      t = this.scene.position,
      n = (t, n) => e.nodeOffset + n * e.nx + t,
      r = [n(1, 1), n(e.nx - 2, 1), n(e.nx - 2, e.ny - 2), n(1, e.ny - 2)],
      i = t[3 * r[0] + 2] - 0.5 * e.weave.thickness,
      a = /* @__PURE__ */ new Float32Array(32);
    r.forEach((e, n) => a.set([t[3 * e], t[3 * e + 1], i, 0], 4 * n));
    let o = 1.5;
    return (
      [
        [-1.5, -1.5],
        [o, -1.5],
        [o, o],
        [-1.5, o],
      ].forEach(([e, t], n) => a.set([e, t, i, 0], 16 + 4 * n)),
      a
    );
  }
  buildCoverage(e) {
    let t = l(this.device, `coverage`, Ce),
      n = GPUShaderStage.COMPUTE,
      r = this.device.createBindGroupLayout({
        label: `coverage`,
        entries: [
          { binding: 0, visibility: n, buffer: { type: `uniform` } },
          { binding: 1, visibility: n, texture: { sampleType: `depth` } },
          { binding: 2, visibility: n, texture: { sampleType: `unfilterable-float` } },
          { binding: 3, visibility: n, storageTexture: { access: `write-only`, format: `rgba16float` } },
          { binding: 4, visibility: n, sampler: { type: `non-filtering` } },
        ],
      }),
      a = this.device.createSampler({ label: `coverage.gather` }),
      s = this.device.createPipelineLayout({ bindGroupLayouts: [r] }),
      c = this.device.createComputePipeline({
        label: `coverage.fromDepth`,
        layout: s,
        compute: { module: t, entryPoint: `fromDepth` },
      }),
      u = this.device.createComputePipeline({
        label: `coverage.down`,
        layout: s,
        compute: { module: t, entryPoint: `down` },
      }),
      d = o(this.device, `coverage.block`, new Uint32Array([4, 0, 0, 0]), i),
      f = this.device.createTexture({ size: [1, 1], format: `depth32float`, usage: GPUTextureUsage.TEXTURE_BINDING }),
      p = this.device.createTexture({ size: [1, 1], format: `rgba16float`, usage: GPUTextureUsage.TEXTURE_BINDING });
    for (let [t, n] of e)
      for (let e = 0; e < n.mipLevelCount; e++) {
        let i = (e) => n.createView({ baseMipLevel: e, mipLevelCount: 1 }),
          o = this.device.createBindGroup({
            layout: r,
            entries: [
              { binding: 0, resource: { buffer: d } },
              { binding: 1, resource: (e === 0 ? t : f).createView() },
              { binding: 2, resource: e === 0 ? p.createView() : i(e - 1) },
              { binding: 3, resource: i(e) },
              { binding: 4, resource: a },
            ],
          });
        this.covGroups.push({ pipe: e === 0 ? c : u, group: o, size: n.width >> e });
      }
  }
  setFloorImages(e) {
    let t = this.device,
      n = (e) => Math.floor(Math.log2(Math.max(e.width, e.height))) + 1,
      r = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      i = (e, n, i, a) => {
        let o = t.createTexture({ label: e, size: [n.width, n.height], format: i, mipLevelCount: a, usage: r });
        return (
          `data` in n
            ? t.queue.writeTexture({ texture: o }, n.data, { bytesPerRow: 4 * n.width }, [n.width, n.height])
            : t.queue.copyExternalImageToTexture({ source: n }, { texture: o }, [n.width, n.height]),
          o
        );
      },
      a = i(`floor.base`, e.base, `rgba8unorm-srgb`, n(e.base)),
      o = i(`floor.normal`, e.normal, `rgba8unorm`, n(e.normal)),
      s = i(`floor.roughness`, e.roughness, `rgba8unorm`, 1),
      c = i(`floor.ao`, e.ao, `rgba8unorm`, 1),
      u = t.createTexture({
        label: `floor.ra`,
        size: [s.width, s.height],
        format: `rg8unorm`,
        mipLevelCount: n(e.roughness),
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
      }),
      d = l(t, `mipgen`, M),
      f = t.createBindGroupLayout({
        label: `mipgen`,
        entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: `float` } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: `float` } },
          { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: `filtering` } },
        ],
      }),
      p = t.createPipelineLayout({ bindGroupLayouts: [f] }),
      m = /* @__PURE__ */ new Map(),
      h = (e, n) => {
        let r = `${e}.${n}`,
          i = m.get(r);
        return (
          i ||
            ((i = t.createRenderPipeline({
              label: `mipgen.${r}`,
              layout: p,
              vertex: { module: d, entryPoint: `vsFull` },
              fragment: { module: d, entryPoint: n, targets: [{ format: e }] },
              primitive: { topology: `triangle-list` },
            })),
            m.set(r, i)),
          i
        );
      },
      g = t.createSampler({ magFilter: `linear`, minFilter: `linear` }),
      _ = t.createCommandEncoder({ label: `floor.mips` }),
      v = (e, n, r, i, a) => {
        let o = _.beginRenderPass({
          colorAttachments: [
            {
              view: e.createView({ baseMipLevel: n, mipLevelCount: 1 }),
              loadOp: `clear`,
              storeOp: `store`,
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
            },
          ],
        });
        (o.setPipeline(h(e.format, r)),
          o.setBindGroup(
            0,
            t.createBindGroup({
              layout: f,
              entries: [
                { binding: 0, resource: i },
                { binding: 1, resource: a },
                { binding: 2, resource: g },
              ],
            }),
          ),
          o.draw(3),
          o.end());
      };
    v(u, 0, `fsPack`, s.createView(), c.createView());
    for (let e of [a, o, u])
      for (let t = 1; t < e.mipLevelCount; t++) {
        let n = e.createView({ baseMipLevel: t - 1, mipLevelCount: 1 });
        v(e, t, `fsDown`, n, n);
      }
    (t.queue.submit([_.finish()]),
      t.queue.onSubmittedWorkDone().then(() => {
        (s.destroy(), c.destroy());
      }));
    let y = t.createSampler({
        addressModeU: `repeat`,
        addressModeV: `repeat`,
        magFilter: `linear`,
        minFilter: `linear`,
        mipmapFilter: `linear`,
        maxAnisotropy: 16,
      }),
      b = t.createSampler({ magFilter: `linear`, minFilter: `linear`, mipmapFilter: `linear` }),
      x = t.createSampler({ magFilter: `linear`, minFilter: `linear`, mipmapFilter: `linear`, maxAnisotropy: 16 });
    this.floorGroup = t.createBindGroup({
      label: `floor`,
      layout: this.floorLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frameU } },
        { binding: 1, resource: a.createView() },
        { binding: 2, resource: o.createView() },
        { binding: 3, resource: u.createView() },
        { binding: 4, resource: y },
        { binding: 5, resource: this.keyCov.createView() },
        { binding: 6, resource: this.overCov.createView() },
        { binding: 7, resource: b },
        { binding: 11, resource: x },
      ],
    });
  }
  // Print an image over the sheet (null clears it). The surface bind groups are rebuilt around it.
  setPrint(e) {
    let t = this.device,
      n = this.printTex;
    if (e) {
      let n = t.createTexture({
        label: `print`,
        size: [e.width, e.height],
        format: `rgba8unorm-srgb`,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      (t.queue.copyExternalImageToTexture({ source: e }, { texture: n }, [e.width, e.height]),
        (this.printTex = n),
        (this.printView = n.createView()));
    } else {
      let e = t.createTexture({
        label: `print`,
        size: [1, 1],
        format: `rgba8unorm-srgb`,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      (t.queue.writeTexture({ texture: e }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]),
        (this.printTex = e),
        (this.printView = e.createView()));
    }
    (this.rebuildSurfaceGroups(), t.queue.onSubmittedWorkDone().then(() => n.destroy()));
  }
  rebuildSurfaceGroups() {
    let e = this.device,
      t = this.solver,
      n = this.weaveTile.createView({ dimension: `2d-array` }),
      r = this.edgeTex.createView(),
      i = this.shadowTex.createView(),
      a = this.dummyDepth.createView(),
      o = this.overTex.createView();
    for (let [s, c, l, u] of [
      [``, i, o, this.frameU],
      [`Shadow`, a, a, this.frameU],
      [`Over`, a, a, this.frameOverU],
    ])
      this.groups[`surface${s}`] = e.createBindGroup({
        layout: this.surfaceLayout,
        entries: [
          { binding: 0, resource: { buffer: u } },
          { binding: 1, resource: { buffer: this.renderU } },
          { binding: 2, resource: { buffer: this.rsurf } },
          { binding: 3, resource: { buffer: this.cellFlags } },
          { binding: 4, resource: c },
          { binding: 5, resource: this.shadowSampler },
          { binding: 6, resource: n },
          { binding: 7, resource: this.tileSampler },
          { binding: 8, resource: { buffer: this.lists } },
          { binding: 9, resource: r },
          { binding: 10, resource: this.edgeSampler },
          { binding: 11, resource: { buffer: t.field } },
          { binding: 12, resource: { buffer: this.threadBits } },
          { binding: 13, resource: { buffer: t.x } },
          { binding: 14, resource: { buffer: this.tframe } },
          { binding: 15, resource: { buffer: this.kappa } },
          { binding: 16, resource: l },
          { binding: 17, resource: this.printView },
          { binding: 18, resource: this.printSampler },
        ],
      });
  }
  renderParams() {
    let e = /* @__PURE__ */ new ArrayBuffer(464),
      t = new Uint32Array(e),
      n = new Float32Array(e),
      r = this.scene;
    ((t[0] = r.nodeCount), (t[1] = r.layers.length), (t[2] = this.cellCount), (t[3] = this.refinedCount));
    let i = 0,
      a = 0;
    return (
      r.layers.forEach((e, o) => {
        let s = (16 + 144 * o) / 4,
          c = e.weave;
        ((t[s] = e.nodeOffset),
          (t[s + 1] = e.nx),
          (t[s + 2] = e.ny),
          (t[s + 3] = e.bundle[0] | (e.bundle[1] << 8) | (e.bundle[0] << 16) | (e.bundle[1] << 24)),
          (n[s + 4] = c.pitchU),
          (n[s + 5] = c.pitchV),
          (n[s + 6] = 1));
        let l = c.yarns[1],
          u = c.yarns[0];
        (n.set([l.width, l.height, l.crimpAmplitude, 0.42], s + 8),
          n.set([u.width, u.height, u.crimpAmplitude, -0.38], s + 12),
          (t[s + 16] = c.twillRepeat),
          (t[s + 17] = c.twillWarpOver),
          (t[s + 18] = 2));
        let d = (e.nx - 1) * 2 + 1;
        ((t[s + 20] = a),
          (t[s + 21] = d),
          (t[s + 22] = i),
          (t[s + 23] = c.id),
          n.set([this.edgeRows[o] ?? 0, 0, this.edgeSize[0], this.edgeSize[1]], s + 24));
        let f = r.field[o];
        t.set([f.offset, f.K, f.M, 0], s + 28);
        let m = (e) => Math.sqrt(e.linearDensity / (608 * Math.PI));
        (n.set([m(u), m(l), u.linearDensity / p, l.linearDensity / p], s + 32),
          (i += (e.nx - 1) * (e.ny - 1)),
          (a += d * ((e.ny - 1) * 2 + 1)));
      }),
      e
    );
  }
  resetTopology(e) {
    (e.clearBuffer(this.edgeSig), e.clearBuffer(this.kappa));
  }
  resize(e, t) {
    if (e === this.width && t === this.height && this.hdr) return;
    ((this.width = e), (this.height = t), this.msaaColor?.destroy(), this.msaaDepth?.destroy(), this.hdr?.destroy());
    let n = [e, t];
    ((this.msaaColor = this.device.createTexture({
      label: `msaaColor`,
      size: n,
      format: Te,
      sampleCount: 4,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })),
      (this.msaaDepth = this.device.createTexture({
        label: `msaaDepth`,
        size: n,
        format: `depth32float`,
        sampleCount: 4,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })),
      (this.hdr = this.device.createTexture({
        label: `hdr`,
        size: n,
        format: Te,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      })),
      (this.postGroup = this.device.createBindGroup({
        layout: this.postLayout,
        entries: [
          { binding: 0, resource: { buffer: this.frameU } },
          { binding: 1, resource: this.hdr.createView() },
          { binding: 2, resource: { buffer: this.postU } },
        ],
      })));
  }
  lightMatrix(e) {
    let t = E(w([e[0] + this.keyOffset[0], e[1] + this.keyOffset[1], e[2] + this.keyOffset[2]], e)),
      n = D(
        [e[0] + t[0] * 0.9, e[1] + t[1] * 0.9, e[2] + t[2] * 0.9],
        e,
        Math.abs(t[2]) > 0.95 ? [0, 1, 0] : [0, 0, 1],
      );
    return C(ie(-0.34, N, -0.34, N, 0.3, 1.2), n);
  }
  overMatrix(e) {
    let t = E(this.overDir),
      n = D([e[0] + t[0], e[1] + t[1], e[2] + t[2]], e, Math.abs(t[2]) > 0.95 ? [0, 1, 0] : [0, 0, 1]);
    return C(ie(-0.45, P, -0.45, P, 0.7, 1.3), n);
  }
  encode(e, t, n, r, i) {
    let a = (e) => (i ? { querySet: i, beginningOfPassWriteIndex: 2 * e, endOfPassWriteIndex: 2 * e + 1 } : void 0);
    if (!this.hdr || !this.msaaColor || !this.msaaDepth || !this.postGroup) return;
    let o = this.post;
    if (
      (this.device.queue.writeBuffer(
        this.postU,
        0,
        new Float32Array([o.grade, o.grain, o.vignette, n, o.glitch, o.glitchSeed, 0, 0]),
      ),
      this.freeze)
    ) {
      this.encodePost(e, r, a(3));
      return;
    }
    let s = A(t, this.width / this.height),
      c = this.lightAnchor ?? t.target,
      l = [c[0] + this.keyOffset[0], c[1] + this.keyOffset[1], c[2] + this.keyOffset[2]],
      u = [c[0] + this.keyAim[0], c[1] + this.keyAim[1], c[2] + this.keyAim[2]],
      d = this.floorGroup !== null && this.showFloor,
      f = E(w(u, l)),
      p = /* @__PURE__ */ new Float32Array(128);
    (this.solver.floorZ !== this.tailFloor &&
      ((this.tailFloor = this.solver.floorZ),
      this.device.queue.writeBuffer(
        this.renderU,
        448,
        new Float32Array([this.tailFloor ?? 0, this.tailFloor === null ? 0 : 1, 0, 0]),
      )),
      p.set(s.viewProj, 0),
      p.set(this.lightMatrix(c), 16),
      p.set([...s.eye, t.fovY / this.height], 32),
      p.set([...l, this.keyIntensity], 36),
      p.set([...f, this.keyCone], 40),
      p.set([...this.ambient, (2 * N) / Ee], 44),
      p.set([this.width, this.height, 1 / this.width, 1 / this.height], 48));
    let m = Math.hypot(l[0] - c[0], l[1] - c[1], l[2] - c[2]);
    p.set([this.exposure, n, m, this.frameIndex++], 52);
    let h = this.overMatrix(c),
      g = E(this.overDir);
    (p.set(h, 56),
      p.set([...g, (2 * P) / De], 72),
      p.set([...this.overColor.map((e) => e * this.overIntensity), this.overAngle], 76),
      p.set([this.floorZ, 1 / this.floorTile, +!!d, this.floorDetailTexels], 80),
      p.set([0.2490234375, 0.8999999999999999, 2 * N, Ee / 4], 84),
      p.set([this.overAngle, 0.6000000000000001, 2 * P, De / 4], 88),
      p.set([this.keyInner, this.keyLeak, 0, 0], 92),
      p.set([...this.keyColor, 0], 96),
      p.set([...this.torchPos, this.torchIntensity], 100),
      p.set([...this.torchAim, this.torchCone[0]], 104),
      p.set([...this.torchColor, this.torchCone[1]], 108),
      this.device.queue.writeBuffer(this.frameU, 0, p),
      p.set(h, 16),
      p.set([c[0] + 10 * g[0], c[1] + 10 * g[1], c[2] + 10 * g[2]], 36),
      this.device.queue.writeBuffer(this.frameOverU, 0, p));
    let _ = this.scene.nodeCount;
    (e.clearBuffer(this.lists, 0, 16), e.clearBuffer(this.threadCount, 8, 4), e.clearBuffer(this.tailCount));
    let v = e.beginComputePass({ label: `renderPrep`, timestampWrites: a(0) }),
      y = (e, t) => {
        (v.setPipeline(this.cpipes[e]), v.dispatchWorkgroups(t));
      },
      b = (e, t, n) => {
        (v.setPipeline(this.cpipes[e]), v.dispatchWorkgroupsIndirect(t, n));
      };
    (v.setBindGroup(0, this.groups.threads),
      y(`retireCount`, Math.ceil(_ / 128)),
      v.setBindGroup(0, this.edgeArgsGroup),
      y(`edgeArgsMain`, 1),
      v.setBindGroup(0, this.groups.threads));
    for (let e of [`threadClear`, `threadPresence`, `threadAnchor`, `threadCloth`, `threadScan`])
      b(e, this.edgeArgs, 0);
    (y(`threadArgs`, 1),
      v.setBindGroup(0, this.groups.pieces),
      b(`piecesClear`, this.edgeArgs, 16),
      b(`cellDirtyMain`, this.edgeArgs, 32),
      b(`nodeAlloc`, this.edgeArgs, 16),
      b(`piecesArgsMain`, this.edgeArgs, 48),
      v.setBindGroup(0, this.groups.piecesSolve),
      b(`kappaSolve`, this.piecesArgs, 0),
      v.setBindGroup(0, this.groups.pieces),
      y(`piecesArgsReset`, 1),
      b(`edgeListMain`, this.edgeArgs, 0),
      b(`edgeDrawArgs`, this.edgeArgs, 48),
      this.edgeGroups.forEach((e, t) => {
        (v.setBindGroup(0, e),
          b(t === 0 ? `seedInit` : t === this.edgeGroups.length - 1 ? `edgeWrite` : `seedStep`, this.edgeArgs, 0));
      }),
      v.setBindGroup(0, this.groups.refine),
      y(`nodeFrame`, Math.ceil(_ / 128)),
      y(`classifyCells`, Math.ceil(_ / 128)),
      y(`args`, 1),
      y(`refine`, Math.ceil(this.refinedCount / 128)),
      v.setBindGroup(0, this.groups.threadPrep),
      b(`threadPrep`, this.threadDraw, 32),
      v.setBindGroup(0, this.groups.threadTail),
      b(`threadTail`, this.threadDraw, 32),
      v.setBindGroup(0, this.groups.edgeRoots),
      b(`edgeRootsMain`, this.piecesArgs, 32),
      v.end());
    let x = e.beginRenderPass({
      label: `shadow`,
      timestampWrites: a(1),
      colorAttachments: [],
      depthStencilAttachment: {
        view: this.shadowTex.createView(),
        depthClearValue: 1,
        depthLoadOp: `clear`,
        depthStoreOp: `store`,
      },
    });
    (x.setBindGroup(0, this.groups.surfaceShadow),
      x.setPipeline(this.pipes.surfaceShadow),
      x.draw(24, this.cellCount),
      x.setPipeline(this.pipes.fineShadow),
      x.drawIndirect(this.drawArgs, 64),
      x.setBindGroup(0, this.groups.threadShadow),
      x.setPipeline(this.pipes.threadShadow),
      x.drawIndirect(this.threadDraw, 0),
      x.setBindGroup(0, this.groups.mountShadow),
      x.setPipeline(this.pipes.mountShadow),
      x.draw(24));
    for (let e of this.extras) e.drawShadow(x, `key`);
    x.end();
    let S = e.beginRenderPass({
      label: `overShadow`,
      colorAttachments: [],
      depthStencilAttachment: {
        view: this.overTex.createView(),
        depthClearValue: 1,
        depthLoadOp: `clear`,
        depthStoreOp: `store`,
      },
    });
    (S.setBindGroup(0, this.groups.surfaceOver),
      S.setPipeline(this.pipes.surfaceShadow),
      S.draw(24, this.cellCount),
      S.setPipeline(this.pipes.fineShadow),
      S.drawIndirect(this.drawArgs, 64),
      S.setBindGroup(0, this.groups.threadOver),
      S.setPipeline(this.pipes.threadShadow),
      S.drawIndirect(this.threadDraw, 0),
      S.setBindGroup(0, this.groups.mountOver),
      S.setPipeline(this.pipes.mountShadow),
      S.draw(24));
    for (let e of this.extras) e.drawShadow(S, `over`);
    if ((S.end(), d)) {
      let t = e.beginComputePass({ label: `floorCoverage` });
      for (let e of this.covGroups)
        (t.setPipeline(e.pipe),
          t.setBindGroup(0, e.group),
          t.dispatchWorkgroups(Math.ceil(e.size / 8), Math.ceil(e.size / 8)));
      t.end();
    }
    let C = e.beginRenderPass({
      label: `main`,
      timestampWrites: a(2),
      colorAttachments: [
        {
          view: this.msaaColor.createView(),
          resolveTarget: this.hdr.createView(),
          clearValue: { r: this.background[0], g: this.background[1], b: this.background[2], a: 1 },
          loadOp: `clear`,
          storeOp: `discard`,
        },
      ],
      depthStencilAttachment: {
        view: this.msaaDepth.createView(),
        depthClearValue: 1,
        depthLoadOp: `clear`,
        depthStoreOp: `discard`,
      },
    });
    (C.setBindGroup(0, this.groups.surface),
      C.setPipeline(this.pipes.surface),
      C.draw(24, this.cellCount),
      C.setPipeline(this.pipes.fine),
      C.drawIndirect(this.drawArgs, 64),
      C.setBindGroup(0, this.groups.thread),
      C.setPipeline(this.pipes.thread),
      C.drawIndirect(this.threadDraw, 0),
      C.setBindGroup(0, this.groups.mount),
      C.setPipeline(this.pipes.mount),
      C.draw(24));
    for (let e of this.extras) e.drawMain(C);
    (d && this.floorGroup && (C.setBindGroup(0, this.floorGroup), C.setPipeline(this.pipes.floor), C.draw(6)),
      C.setBindGroup(0, this.groups.thread),
      C.setPipeline(this.pipes.threadFuzz),
      C.drawIndirect(this.threadDraw, 16),
      C.setBindGroup(0, this.groups.fuzz),
      C.setPipeline(this.pipes.edgeFuzz),
      C.drawIndirect(this.piecesArgs, 16),
      C.end(),
      this.encodePost(e, r, a(3)));
  }
  encodePost(e, t, n) {
    let r = e.beginRenderPass({
      label: `post`,
      timestampWrites: n,
      colorAttachments: [{ view: t, loadOp: `clear`, storeOp: `store`, clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
    });
    (r.setPipeline(this.pipes.post), r.setBindGroup(0, this.postGroup), r.draw(3), r.end());
  }
};
const I = {
  radius: 0.008,
  maxForce: 120,
  maxLead: 0.006,
  pinch: 0.3,
  pinchMode: `pads`,
  pinchAxis: 0,
  engageTime: 0.15,
};
function Ie(e) {
  let t = Math.min(1, Math.max(0, e / I.engageTime));
  return 1 - (1 - I.pinch) * t * t * (3 - 2 * t);
}
function Le(e) {
  let t = Math.min(...e.layers.map((e) => Math.min(e.material.pitchU, e.material.pitchV)));
  return Math.ceil(I.radius / t);
}
function Re(e, t, n = () => !0, r) {
  let i = Be(e, t, n, r);
  if (!i || I.pinchMode === `radial`) return i;
  for (let n of [I.pinchAxis, 1 - I.pinchAxis]) {
    let r = ze(e, t, i, n);
    if (r) return r;
  }
  return i;
}
function ze(e, t, n, r) {
  let i = e.layers.find((e) => t >= e.nodeOffset && t < e.nodeOffset + e.nodeCount),
    a = r === 0 ? i.material.pitchU : i.material.pitchV,
    o = e.restUV[2 * t + r],
    s = { nodes: [], weights: [], sides: [], stiffness: 0, padPitch: a, between: [], slip: n.slip },
    c = [0, 0];
  return (
    n.nodes.forEach((t, i) => {
      let l = e.restUV[2 * t + r] - o;
      if (Math.abs(l) < 0.5 * a) {
        s.between.push(t);
        return;
      }
      (s.nodes.push(t), s.weights.push(n.weights[i]), s.sides.push(Math.sign(l)), (c[+(l > 0)] += n.weights[i]));
    }),
    Math.min(c[0], c[1]) < 0.25 * Math.max(c[0], c[1]) || c[0] === 0
      ? null
      : ((s.stiffness = I.maxForce / (I.maxLead * (c[0] + c[1]))), s)
  );
}
function L(e, t, n, r = () => !0, i) {
  let a = /* @__PURE__ */ new Map();
  for (let o of t) {
    let t = Be(e, o, r, i, n.radius);
    t?.nodes.forEach((e, n) => a.set(e, Math.max(a.get(e) ?? 0, t.weights[n])));
  }
  if (a.size === 0) return null;
  let o = [...a.keys()],
    s = o.map((e) => a.get(e)),
    c = s.reduce((e, t) => e + t, 0);
  return {
    nodes: o,
    weights: s,
    sides: o.map(() => 0),
    padPitch: 0,
    between: [],
    stiffness: n.maxForce / (n.maxLead * c),
    slip: 0,
  };
}
function Be(e, t, n, r, i = I.radius) {
  let a = e.layers.find((e) => t >= e.nodeOffset && t < e.nodeOffset + e.nodeCount);
  if (!a) return null;
  let o = e.restUV[2 * t],
    s = e.restUV[2 * t + 1],
    c = a.material,
    l = r ? Ve(r, c.pitchU, c.pitchV, 1.5 * i) : null,
    u = r ? r.radius : Math.ceil(i / c.pitchU),
    d = r ? r.radius : Math.ceil(i / c.pitchV),
    f = 2 * u + 1,
    p = t - a.nodeOffset,
    m = p % a.nx,
    h = Math.floor(p / a.nx),
    g = [],
    _ = [],
    v = 0;
  for (let t = Math.max(0, h - d); t <= Math.min(a.ny - 1, h + d); t++)
    for (let r = Math.max(0, m - u); r <= Math.min(a.nx - 1, m + u); r++) {
      let c = a.nodeOffset + t * a.nx + r;
      if (e.pinned[c] || !n(c) || (l && !l[(t - h + d) * f + (r - m + u)])) continue;
      let p = Math.hypot(e.restUV[2 * c] - o, e.restUV[2 * c + 1] - s) / i;
      if (p >= 1) continue;
      let y = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5,
        b = y * y * (3 - 2 * y);
      b <= 0.001 || (g.push(c), _.push(b), (v += b));
    }
  return g.length === 0
    ? null
    : {
        nodes: g,
        weights: _,
        sides: g.map(() => 0),
        padPitch: 0,
        between: [],
        stiffness: I.maxForce / (I.maxLead * v),
        slip: i,
      };
}
function Ve(e, t, n, r) {
  let i = 2 * e.radius + 1,
    a = i * i,
    o = new Float64Array(a).fill(1 / 0),
    s = new Uint8Array(a),
    c = (t) => !!(e.bits[t] & 12),
    l = e.radius * i + e.radius;
  if (c(l)) return s;
  for (o[l] = 0; ;) {
    let l = -1;
    for (let e = 0; e < a; e++) !s[e] && o[e] <= r && (l < 0 || o[e] < o[l]) && (l = e);
    if (l < 0) return s;
    s[l] = 1;
    let u = l % i,
      d = (l - u) / i,
      f = (e, t) => {
        !c(e) && !s[e] && (o[e] = Math.min(o[e], o[l] + t));
      };
    (u + 1 < i && e.bits[l] & 1 && f(l + 1, t),
      u > 0 && e.bits[l - 1] & 1 && f(l - 1, t),
      d + 1 < i && e.bits[l] & 2 && f(l + i, n),
      d > 0 && e.bits[l - i] & 2 && f(l - i, n));
  }
}
var R = `// Picking and grip terms. A grip is a finite material patch attached to a handle by quadratic
// springs (exact for Newton). Its force is bounded by clamping the handle's lead over the patch
// centroid once per substep (gripLead); gradient and stiffness enter the Newton system via ext.
// Up to GRIPS grips (one per finger) hold disjoint patches: entries of grip g occupy
// [g * SLOT_ENTRIES, g * SLOT_ENTRIES + count), and no node is in two patches, so every ext entry
// has a single writer.

const GRIP_ADDS: bool = true;
const GRIPS: u32 = 4u;
const SLOT_ENTRIES: u32 = 512u;
// proximity-pick candidates (cursor disc) tested for occlusion
const MAX_CAND: u32 = 128u;
const NONE: u32 = 0xFFFFFFFFu;
// a candidate counts as hidden only behind a surface at least this far in front of it (m)
const OCCLUDE_MARGIN: f32 = 0.5e-3;

struct GripSlot {
  // requested handle (xyz, in the frame of \`anchor\`), entry count (w as f32)
  goal: vec4<f32>,
  // stiffness per unit weight (N/m), largest handle lead (m), picked node (bitcast), pinch scale of the
  // grab-time offsets (grip.ts pinchScale)
  params: vec4<f32>,
  // where the host believed the picked material was when it attached (xyz): the handle is
  // origin + goal - anchor, so a stationary pointer imposes no displacement whatever the pick latency;
  // lattice pitch along the pads' closing axis (w; grip.ts GripPatch.padPitch)
  anchor: vec4<f32>,
  // slip distance of an entry (x, m; 0: the hold does not slip; grip.ts GripPatch.slip), unused...
  hold: vec4<f32>,
};

struct GripU {
  slots: array<GripSlot, GRIPS>,
};

struct PickU {
  viewProj: mat4x4<f32>,
  // pointer x, y (drawing-buffer pixels), proximity radius (pixels), unused
  pointer: vec4<f32>,
  // width, height, strand pick radius (m), patch window radius (lattice cells, as f32)
  viewport: vec4<f32>,
  // ray origin (camera eye) and unit direction through the pointer (world)
  eye: vec4<f32>,
  ray: vec4<f32>,
};

struct GripEntry {
  node: u32,
  w: f32,
  // pad along the closing axis (-1, +1), 0 in a radial pinch
  side: f32,
  pad1: f32,
  offset: vec4<f32>,
};

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<uniform> G: GripU;
@group(0) @binding(2) var<uniform> PK: PickU;
@group(0) @binding(3) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(4) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> dx: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read> segs: array<Seg>;
@group(0) @binding(7) var<storage, read_write> grip: array<GripEntry>;
@group(0) @binding(8) var<storage, read_write> ext: array<vec4<f32>>; // 3 per node (see assemble.wgsl)
// [0] nearest ray hit (f32 bits of t), [1] its material node, [2] candidate count, [3] nearest visible
// candidate (screen distance << 20 | node), [4, 4 + MAX_CAND) candidates, then their occluded flags
@group(0) @binding(9) var<storage, read_write> pick: array<atomic<u32>>;
// [0..2] picked point (f32 bits), [3] node, [4] kind (0 none, 1 surface hit, 2 proximity),
// [8, 8 + 256) patch window around the node (pickWindow)
@group(0) @binding(10) var<storage, read_write> pickOut: array<u32>;
// [3g] effective handle of grip g (xyz), [3g + 1] its origin: the picked node's position at grab time,
// [3g + 2] the pads' closing axis (unit, world; from the grab-time offsets)
@group(0) @binding(11) var<storage, read_write> gripGoal: array<vec4<f32>>;
// x: the grip whose entries gripInit initialises
@group(0) @binding(12) var<uniform> InitU: vec4<u32>;

var<workgroup> leadSum: array<vec4<f32>, 256>;

// a node of the cloth solve (debris and retired nodes no longer respond to the grip)
fn live(n: u32) -> bool { return x[n].w < 0.5; }

// Target offset of a patch entry from the handle at pinch scale s: a radial pinch contracts it toward
// the grab point; a pad slides rigidly toward the grab line along the closing axis by (1 - s) pitches.
fn gathered(e: GripEntry, S: GripSlot, axis: vec3<f32>) -> vec3<f32> {
  let s = S.params.w;
  if (e.side == 0.0) { return s * e.offset.xyz; }
  return e.offset.xyz - e.side * (1.0 - s) * S.anchor.w * axis;
}

// Once per substep, from committed positions: each grip's effective handle is the requested one,
// moved to within the largest lead of its weighted patch centroid (bounded total force). One
// workgroup per grip. A pinch entry whose own handle position (where it sits less its target offset)
// lies farther than a pad's radius from the patch's weighted mean is no longer under a pad: the cloth
// tore it away from the material the fingers hold, and it slips out for good (weight 0). Left in, its
// spring pulled torn-off cloth toward the hand from any distance (a 1 % rim entry 18 cm away: 6.6 N on
// a node held by one slack span, whose Newton step overshot until the line search stalled the sheet).
@compute @workgroup_size(256)
fn gripLead(@builtin(local_invocation_index) t: u32, @builtin(workgroup_id) wg: vec3<u32>) {
  let g = wg.x;
  let S = G.slots[g];
  let count = u32(S.goal.w);
  if (count == 0u) { return; }
  // the closing axis: from the - pad to the + pad, as they lay at grab time
  var dir = vec4<f32>(0.0);
  for (var k = t; k < count; k += 256u) {
    let e = grip[g * SLOT_ENTRIES + k];
    dir += vec4<f32>(e.side * e.w * e.offset.xyz, 0.0);
  }
  leadSum[t] = dir;
  workgroupBarrier();
  var r = 128u;
  loop {
    if (r == 0u) { break; }
    if (t < r) { leadSum[t] += leadSum[t + r]; }
    workgroupBarrier();
    r = r / 2u;
  }
  let ld = length(leadSum[0].xyz);
  let axis = select(vec3<f32>(0.0), leadSum[0].xyz / max(ld, 1e-20), ld > 1e-12);
  workgroupBarrier();
  var acc = vec4<f32>(0.0);
  for (var k = t; k < count; k += 256u) {
    let e = grip[g * SLOT_ENTRIES + k];
    if (!live(e.node)) { continue; }
    acc += vec4<f32>(e.w * (x[e.node].xyz - gathered(e, S, axis)), e.w);
  }
  leadSum[t] = acc;
  workgroupBarrier();
  var s = 128u;
  loop {
    if (s == 0u) { break; }
    if (t < s) { leadSum[t] += leadSum[t + s]; }
    workgroupBarrier();
    s = s / 2u;
  }
  let held = leadSum[0];
  if (held.w > 0.0 && S.hold.x > 0.0) {
    let c = held.xyz / held.w;
    for (var k = t; k < count; k += 256u) {
      let e = grip[g * SLOT_ENTRIES + k];
      if (e.w > 0.0 && live(e.node) && length(x[e.node].xyz - gathered(e, S, axis) - c) > S.hold.x) { grip[g * SLOT_ENTRIES + k].w = 0.0; }
    }
  }
  if (t == 0u) {
    gripGoal[3u * g + 2u] = vec4<f32>(axis, 0.0);
    if (held.w <= 0.0) {
      // nothing held is still cloth: the handle exerts nothing
      gripGoal[3u * g] = vec4<f32>(gripGoal[3u * g + 1u].xyz, 0.0);
      return;
    }
    let c = held.xyz / held.w;
    let requested = gripGoal[3u * g + 1u].xyz + S.goal.xyz - S.anchor.xyz;
    var lead = requested - c;
    let l = length(lead);
    if (l > S.params.y) { lead *= S.params.y / l; }
    gripGoal[3u * g] = vec4<f32>(c + lead, 0.0);
  }
}

@compute @workgroup_size(64)
fn gripTerms(@builtin(global_invocation_id) gid: vec3<u32>) {
  let g = gid.x / SLOT_ENTRIES;
  let k = gid.x % SLOT_ENTRIES;
  if (g >= GRIPS) { return; }
  let S = G.slots[g];
  if (k >= u32(S.goal.w)) { return; }
  let e = grip[gid.x];
  if (!live(e.node)) { return; }
  let y = x[e.node].xyz + dx[e.node].xyz;
  let d = y - (gripGoal[3u * g].xyz + gathered(e, S, gripGoal[3u * g + 2u].xyz));
  let kg = S.params.x * e.w;
  let force = kg * d;
  let stiff = kg;
  // with contact, its terms already wrote ext this iteration and the grip adds its own
  let b = 3u * e.node;
  let keep = select(0.0, 1.0, GRIP_ADDS);
  ext[b] = keep * ext[b] + vec4<f32>(force, 0.0);
  ext[b + 1u] = keep * ext[b + 1u] + vec4<f32>(stiff, 0.0, 0.0, stiff);
  ext[b + 2u] = keep * ext[b + 2u] + vec4<f32>(0.0, stiff, 0.0, 0.0);
}

// Offsets of a grip's patch nodes from its picked node at grab time, and the grip's origin (the picked
// node's position now, in the same state the offsets are taken from).
@compute @workgroup_size(64)
fn gripInit(@builtin(global_invocation_id) gid: vec3<u32>) {
  let g = InitU.x;
  let S = G.slots[g];
  let picked = bitcast<u32>(S.params.z);
  if (gid.x == 0u) {
    gripGoal[3u * g + 1u] = vec4<f32>(x[picked].xyz, 0.0);
    gripGoal[3u * g] = vec4<f32>(x[picked].xyz, 0.0);
  }
  if (gid.x >= u32(S.goal.w)) { return; }
  let k = g * SLOT_ENTRIES + gid.x;
  grip[k].offset = vec4<f32>(x[grip[k].node].xyz - x[picked].xyz, 0.0);
}

// ---------------------------------------------------------------- picking (on demand, at a grab)

fn lat(n: u32) -> vec4<u32> { return P.layers[nodes[n].ijl >> 24u].lattice; }
fn col(n: u32) -> u32 { return nodes[n].ijl & 0xFFFu; }
fn row(n: u32) -> u32 { return (nodes[n].ijl >> 12u) & 0xFFFu; }
fn spanOn(owner: u32, f: u32) -> bool { return segActive(segs[2u * owner + f]); }

// A cloth crossing with at least one surviving incident span, owned or incoming (debris and isolated
// crossings are not grab targets).
fn hasMaterial(n: u32) -> bool {
  if (!live(n)) { return false; }
  if (spanOn(n, 0u) || spanOn(n, 1u)) { return true; }
  let L = lat(n);
  if (col(n) > 0u && spanOn(n - 1u, 0u)) { return true; }
  return row(n) > 0u && spanOn(n - L.y, 1u);
}

// An intact cell with lower-left node f (all four spans hold, all corners cloth): a surface face.
fn faceValid(f: u32) -> bool {
  let L = lat(f);
  if (col(f) + 1u >= L.y || row(f) + 1u >= L.z) { return false; }
  let c10 = f + 1u;
  let c01 = f + L.y;
  if (!live(f) || !live(c10) || !live(c01) || !live(c01 + 1u)) { return false; }
  return spanOn(f, 0u) && spanOn(f, 1u) && spanOn(c10, 1u) && spanOn(c01, 0u);
}

// Ray (o, d) against triangle (a, b, c): (t, u, v) with barycentric weights (1 - u - v, u, v); t < 0
// when missed.
fn rayTri(o: vec3<f32>, d: vec3<f32>, a: vec3<f32>, b: vec3<f32>, c: vec3<f32>) -> vec3<f32> {
  let e1 = b - a;
  let e2 = c - a;
  let p = cross(d, e2);
  let det = dot(e1, p);
  if (abs(det) < 1e-14) { return vec3<f32>(-1.0, 0.0, 0.0); }
  let inv = 1.0 / det;
  let s = o - a;
  let u = dot(s, p) * inv;
  if (u < 0.0 || u > 1.0) { return vec3<f32>(-1.0, 0.0, 0.0); }
  let q = cross(s, e1);
  let v = dot(d, q) * inv;
  if (v < 0.0 || u + v > 1.0) { return vec3<f32>(-1.0, 0.0, 0.0); }
  return vec3<f32>(dot(e2, q) * inv, u, v);
}

// Ray (o, unit d) against the capsule of radius r around segment (a, b): (t, s) with s the segment
// parameter of the closest approach; t < 0 when missed.
fn rayCapsule(o: vec3<f32>, d: vec3<f32>, a: vec3<f32>, b: vec3<f32>, r: f32) -> vec2<f32> {
  let e = b - a;
  let w = o - a;
  let ee = dot(e, e);
  let de = dot(d, e);
  let den = ee - de * de;
  var s = 0.0;
  if (den > 1e-14) { s = clamp((dot(e, w) * dot(d, d) - de * dot(d, w)) / den, 0.0, 1.0); }
  let q = a + s * e;
  let t = max(dot(q - o, d), 0.0);
  let gap = length(o + t * d - q);
  if (gap > r) { return vec2<f32>(-1.0, 0.0); }
  return vec2<f32>(t - sqrt(r * r - gap * gap), s);
}

struct RayHit {
  t: f32,
  node: u32,
};

// Nearest pointer-ray hit among the material primitives node n owns: the intact face it is the
// lower-left corner of (two triangles), and its surviving spans not covered by an intact face on
// either side (strands over openings, as capsules of the strand pick radius). The material node is the
// hit's nearest corner (face) or nearer end (strand).
fn rayPrims(n: u32) -> RayHit {
  var best = RayHit(3.4e38, NONE);
  let o = PK.eye.xyz;
  let d = PK.ray.xyz;
  let L = lat(n);
  if (faceValid(n)) {
    let c = vec4<u32>(n, n + 1u, n + L.y, n + L.y + 1u);
    let p00 = x[c.x].xyz;
    let p10 = x[c.y].xyz;
    let p01 = x[c.z].xyz;
    let p11 = x[c.w].xyz;
    let h1 = rayTri(o, d, p00, p10, p11);
    if (h1.x > 0.0 && h1.x < best.t) {
      let w = vec3<f32>(1.0 - h1.y - h1.z, h1.y, h1.z);
      best = RayHit(h1.x, select(select(c.w, c.y, w.y >= w.z), c.x, w.x >= max(w.y, w.z)));
    }
    let h2 = rayTri(o, d, p00, p11, p01);
    if (h2.x > 0.0 && h2.x < best.t) {
      let w = vec3<f32>(1.0 - h2.y - h2.z, h2.y, h2.z);
      best = RayHit(h2.x, select(select(c.z, c.w, w.y >= w.z), c.x, w.x >= max(w.y, w.z)));
    }
  }
  if (!live(n)) { return best; }
  for (var f = 0u; f < 2u; f++) {
    if (!spanOn(n, f)) { continue; }
    let other = select(n + L.y, n + 1u, f == 0u);
    if (!live(other)) { continue; }
    // the two cells beside the span
    let side = select(n - 1u, n - L.y, f == 0u);
    let hasSide = select(col(n) > 0u, row(n) > 0u, f == 0u);
    if (faceValid(n) || (hasSide && faceValid(side))) { continue; }
    let h = rayCapsule(o, d, x[n].xyz, x[other].xyz, PK.viewport.z);
    if (h.x > 0.0 && h.x < best.t) { best = RayHit(h.x, select(n, other, h.y > 0.5)); }
  }
  return best;
}

fn project(p: vec3<f32>) -> vec4<f32> {
  let c = PK.viewProj * vec4<f32>(p, 1.0);
  let ndc = c.xyz / c.w;
  return vec4<f32>((ndc.x * 0.5 + 0.5) * PK.viewport.x, (0.5 - ndc.y * 0.5) * PK.viewport.y, ndc.z, c.w);
}

// Pass 1: nearest surface hit along the pointer ray.
@compute @workgroup_size(128)
fn pickRay(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let h = rayPrims(n);
  if (h.node != NONE) { atomicMin(&pick[0], bitcast<u32>(h.t)); }
}

// Pass 2: the material node of that hit (the lowest index on an exact tie).
@compute @workgroup_size(128)
fn pickRayNode(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let front = atomicLoad(&pick[0]);
  if (front == NONE) { return; }
  let h = rayPrims(n);
  if (h.node != NONE && bitcast<u32>(h.t) == front) { atomicMin(&pick[1], h.node); }
}

// Pass 3 (the pointer is over no surface: an opening, a strand, an edge): crossings within the cursor
// disc are candidates.
@compute @workgroup_size(128)
fn pickCandidates(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || atomicLoad(&pick[0]) != NONE || !hasMaterial(n)) { return; }
  let p = project(x[n].xyz);
  if (p.w <= 0.0 || p.z <= 0.0 || p.z >= 1.0) { return; }
  if (distance(p.xy, PK.pointer.xy) > PK.pointer.z) { return; }
  let k = atomicAdd(&pick[2], 1u);
  if (k < MAX_CAND) { atomicStore(&pick[4u + k], n); }
}

// Pass 4: a candidate is hidden when an intact face lies on the line of sight in front of it. One
// thread per face; faces whose screen footprint misses the cursor disc are skipped at once.
@compute @workgroup_size(128)
fn pickOcclude(@builtin(global_invocation_id) gid: vec3<u32>) {
  let f = gid.x;
  if (f >= P.counts.x) { return; }
  let count = min(atomicLoad(&pick[2]), MAX_CAND);
  if (count == 0u || !faceValid(f)) { return; }
  let L = lat(f);
  let c = vec4<u32>(f, f + 1u, f + L.y, f + L.y + 1u);
  let p00 = x[c.x].xyz;
  let p10 = x[c.y].xyz;
  let p01 = x[c.z].xyz;
  let p11 = x[c.w].xyz;
  let s0 = project(p00);
  let s1 = project(p10);
  let s2 = project(p01);
  let s3 = project(p11);
  if (min(min(s0.w, s1.w), min(s2.w, s3.w)) <= 0.0) { return; }
  let lo = min(min(s0.xy, s1.xy), min(s2.xy, s3.xy)) - PK.pointer.z;
  let hi = max(max(s0.xy, s1.xy), max(s2.xy, s3.xy)) + PK.pointer.z;
  if (any(PK.pointer.xy < lo) || any(PK.pointer.xy > hi)) { return; }
  let o = PK.eye.xyz;
  for (var k = 0u; k < count; k++) {
    let m = atomicLoad(&pick[4u + k]);
    if (any(c == vec4<u32>(m))) { continue; }
    let to = x[m].xyz - o;
    let len = length(to);
    let d = to / len;
    let tmax = len - OCCLUDE_MARGIN;
    let h1 = rayTri(o, d, p00, p10, p11);
    let h2 = rayTri(o, d, p00, p11, p01);
    if ((h1.x > 0.0 && h1.x < tmax) || (h2.x > 0.0 && h2.x < tmax)) { atomicOr(&pick[4u + MAX_CAND + k], 1u); }
  }
}

// Pass 5: the visible candidate nearest to the pointer on screen.
@compute @workgroup_size(128)
fn pickVisible(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x;
  if (k >= min(atomicLoad(&pick[2]), MAX_CAND) || atomicLoad(&pick[4u + MAX_CAND + k]) != 0u) { return; }
  let n = atomicLoad(&pick[4u + k]);
  let d = distance(project(x[n].xyz).xy, PK.pointer.xy);
  let dk = min(4095u, u32(d * 64.0));
  atomicMin(&pick[3], (dk << 20u) | (n & 0xFFFFFu));
}

@compute @workgroup_size(1)
fn pickWrite() {
  let front = atomicLoad(&pick[0]);
  var p = vec3<f32>(0.0);
  var n = NONE;
  var kind = 0u;
  if (front != NONE) {
    n = atomicLoad(&pick[1]);
    p = PK.eye.xyz + bitcast<f32>(front) * PK.ray.xyz;
    kind = 1u;
  } else {
    let key = atomicLoad(&pick[3]);
    if (key != NONE) {
      n = key & 0xFFFFFu;
      p = x[n].xyz;
      kind = 2u;
    }
  }
  pickOut[0] = bitcast<u32>(p.x);
  pickOut[1] = bitcast<u32>(p.y);
  pickOut[2] = bitcast<u32>(p.z);
  pickOut[3] = n;
  pickOut[4] = kind;
}

// The current connectivity around the picked node (grip.ts gripPatch grows the patch through it): per
// lattice offset (di, dj) in [-R, R]^2, bit0 / bit1 = its own span along u / v survives, bit2 = not
// cloth, bit3 = outside the lattice.
@compute @workgroup_size(256)
fn pickWindow(@builtin(local_invocation_index) k: u32) {
  let n = pickOut[3];
  let R = u32(PK.viewport.w);
  let side = 2u * R + 1u;
  if (k >= side * side) { return; }
  if (pickOut[4] == 0u) {
    pickOut[8u + k] = 8u;
    return;
  }
  let L = lat(n);
  let i = i32(col(n)) + i32(k % side) - i32(R);
  let j = i32(row(n)) + i32(k / side) - i32(R);
  if (i < 0 || j < 0 || i >= i32(L.y) || j >= i32(L.z)) {
    pickOut[8u + k] = 8u;
    return;
  }
  let m = L.x + u32(j) * L.y + u32(i);
  var b = 0u;
  if (spanOn(m, 0u)) { b |= 1u; }
  if (spanOn(m, 1u)) { b |= 2u; }
  if (!live(m)) { b |= 4u; }
  pickOut[8u + k] = b;
}

// ---------------------------------------------------------------- nearest material (staged grabs)

// The crossing with material nearest to a point (PK.eye) within PK.viewport.z (m), as the proximity
// candidate key pickWrite reads (pick[3]: quantised distance << 20 | node).
@compute @workgroup_size(128)
fn pickNear(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || !hasMaterial(n)) { return; }
  let d = distance(x[n].xyz, PK.eye.xyz);
  if (d > PK.viewport.z) { return; }
  let dk = min(4095u, u32(d / PK.viewport.z * 4095.0));
  atomicMin(&pick[3], (dk << 20u) | (n & 0xFFFFFu));
}
`,
  He = class {
    device;
    solver;
    scene;
    mod;
    gripU;
    initU;
    pickU;
    grip;
    pick;
    pickOut;
    gripGoal;
    group;
    pipes = {};
    staging = [];
    held = [, , , ,].fill(null);
    owner = /* @__PURE__ */ new Map();
    windowRadius;
    strandRadius;
    constructor(e, t, n) {
      ((this.device = e), (this.solver = t), (this.scene = n));
      let r = R.replace(`const GRIP_ADDS: bool = true;`, `const GRIP_ADDS: bool = ${t.contactEnabled};`);
      this.mod = new f(e, `interact`, _ + r);
      for (let e of [
        `gripTerms`,
        `gripLead`,
        `gripInit`,
        `pickNear`,
        `pickRay`,
        `pickRayNode`,
        `pickCandidates`,
        `pickOcclude`,
        `pickVisible`,
        `pickWrite`,
        `pickWindow`,
      ])
        this.pipes[e] = this.mod.pipeline(e);
      if (
        ((this.gripGoal = a(e, `gripGoal`, 192)),
        (this.gripU = a(e, `gripU`, 256, i)),
        (this.initU = a(e, `gripInitU`, 16, i)),
        (this.pickU = a(e, `pickU`, 128, i)),
        (this.grip = a(e, `grip`, 65536)),
        (this.pick = a(e, `pick`, 1040)),
        (this.pickOut = a(e, `pickOut`, 1056)),
        (this.windowRadius = Le(n)),
        this.windowRadius > 7)
      )
        throw Error(`a grip patch spans ${this.windowRadius} lattice cells; the pick window covers 7`);
      ((this.strandRadius = 0.25 * Math.min(...n.layers.map((e) => Math.min(e.material.pitchU, e.material.pitchV)))),
        (this.group = this.mod.bindGroup(`interact`, {
          0: t.simParams,
          1: this.gripU,
          2: this.pickU,
          3: t.nodes,
          4: t.x,
          5: t.dx,
          6: t.segs,
          7: this.grip,
          8: t.ext,
          9: this.pick,
          10: this.pickOut,
          11: this.gripGoal,
          12: this.initU,
        })));
    }
    run(e, t, n) {
      (e.setPipeline(this.pipes[t]), e.setBindGroup(0, this.group), e.dispatchWorkgroups(n));
    }
    async pickAt(e, t, n, r, i, a) {
      let o = ae(e),
        s = (t / r) * 2 - 1,
        c = 1 - (n / i) * 2,
        l = O(o, [s, c, 0]),
        u = O(o, [s, c, 1]),
        d = [l[0] / l[3], l[1] / l[3], l[2] / l[3]],
        f = E(w([u[0] / u[3], u[1] / u[3], u[2] / u[3]], d)),
        p = /* @__PURE__ */ new Float32Array(32);
      (p.set(e, 0),
        p.set([t, n, a, 0], 16),
        p.set([r, i, this.strandRadius, this.windowRadius], 20),
        p.set([...d, 0], 24),
        p.set([...f, 0], 28),
        this.device.queue.writeBuffer(this.pickU, 0, p));
      let m = /* @__PURE__ */ new Uint32Array(260);
      (m.set([4294967295, 4294967295, 0, 4294967295]), this.device.queue.writeBuffer(this.pick, 0, m));
      let h = this.device.createCommandEncoder({ label: `pick` }),
        g = h.beginComputePass(),
        _ = Math.ceil(this.solver.N / 128);
      for (let e of [`pickRay`, `pickRayNode`, `pickCandidates`, `pickOcclude`]) this.run(g, e, _);
      return (
        this.run(g, `pickVisible`, 1),
        this.run(g, `pickWrite`, 1),
        this.run(g, `pickWindow`, 1),
        g.end(),
        this.readPick(h)
      );
    }
    async nearest(e, t) {
      let n = /* @__PURE__ */ new Float32Array(32);
      (n.set([0, 0, 0, 0], 16),
        n.set([1, 1, t, this.windowRadius], 20),
        n.set([...e, 0], 24),
        this.device.queue.writeBuffer(this.pickU, 0, n));
      let r = /* @__PURE__ */ new Uint32Array(260);
      (r.set([4294967295, 4294967295, 0, 4294967295]), this.device.queue.writeBuffer(this.pick, 0, r));
      let i = this.device.createCommandEncoder({ label: `nearest` }),
        a = i.beginComputePass();
      return (
        this.run(a, `pickNear`, Math.ceil(this.solver.N / 128)),
        this.run(a, `pickWrite`, 1),
        this.run(a, `pickWindow`, 1),
        a.end(),
        this.readPick(i)
      );
    }
    async readPick(e) {
      let t =
        this.staging.pop() ??
        this.device.createBuffer({ size: 1056, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      (e.copyBufferToBuffer(this.pickOut, 0, t, 0, 1056),
        this.device.queue.submit([e.finish()]),
        await t.mapAsync(GPUMapMode.READ));
      let n = t.getMappedRange().slice(0);
      (t.unmap(), this.staging.push(t));
      let r = new Uint32Array(n);
      if (r[4] === 0) return null;
      let i = new Float32Array(n),
        a = this.windowRadius;
      return {
        node: r[3],
        position: [i[0], i[1], i[2]],
        kind: r[4] === 1 ? `surface` : `proximity`,
        window: { radius: a, bits: r.slice(8, 8 + (2 * a + 1) ** 2) },
      };
    }
    freeSlot() {
      return this.held.indexOf(null);
    }
    holder(e) {
      return this.owner.get(e) ?? -1;
    }
    attach(e, t, n = 0, r) {
      this.release(n);
      let i = Re(this.scene, e, (e) => !this.owner.has(e), r);
      return i ? (this.attachPatch(n, e, i, t, I.maxLead), !0) : !1;
    }
    isFree = (e) => !this.owner.has(e);
    attachPatch(e, t, n, r, i) {
      this.release(e);
      let a = t,
        o = Math.min(n.nodes.length, 512),
        s = /* @__PURE__ */ new ArrayBuffer(32 * o),
        c = new Uint32Array(s),
        l = new Float32Array(s),
        u = [],
        d = [];
      for (let t = 0; t < o; t++)
        ((c[8 * t] = n.nodes[t]),
          (l[8 * t + 1] = n.weights[t]),
          (l[8 * t + 2] = n.sides[t]),
          u.push(n.nodes[t]),
          n.weights[t] >= 0.5 && d.push(n.nodes[t]),
          this.owner.set(n.nodes[t], e));
      for (let t of n.between) (u.push(t), this.owner.set(t, e));
      ((this.held[e] = { nodes: u, count: o, core: d, stiffness: n.stiffness, releasing: !1 }),
        this.device.queue.writeBuffer(this.grip, 16384 * e, s));
      let f = /* @__PURE__ */ new Float32Array(16);
      (f.set([r[0], r[1], r[2], o], 0),
        f.set([n.stiffness, i, 0, 1], 4),
        (new Uint32Array(f.buffer)[6] = a),
        f.set([r[0], r[1], r[2], n.padPitch], 8),
        f.set([n.slip, 0, 0, 0], 12),
        this.device.queue.writeBuffer(this.gripU, 64 * e, f),
        this.device.queue.writeBuffer(this.initU, 0, new Uint32Array([e, 0, 0, 0])));
      let p = this.device.createCommandEncoder({ label: `gripInit` }),
        m = p.beginComputePass();
      (this.run(m, `gripInit`, Math.ceil(o / 64)), m.end(), this.device.queue.submit([p.finish()]));
    }
    setPinch(e, t = 0) {
      this.held[t] && this.device.queue.writeBuffer(this.gripU, 64 * t + 28, new Float32Array([e]));
    }
    setHold(e, t = 0) {
      let n = this.held[t];
      n && this.device.queue.writeBuffer(this.gripU, 64 * t + 16, new Float32Array([n.stiffness * e]));
    }
    setTarget(e, t = 0) {
      let n = this.held[t];
      n && this.device.queue.writeBuffer(this.gripU, 64 * t, new Float32Array([e[0], e[1], e[2], n.count]));
    }
    letGo(e = 0) {
      const held = this.held[e];
      if (!held || held.releasing) return;
      held.releasing = !0;
      // Stop pulling now; topology readback can retain ownership for cleanup
      // without keeping the released cloth tethered to the old hand target.
      this.setHold(0, e);
    }
    release(e = 0) {
      let t = this.held[e];
      if (t) {
        for (let e of t.nodes) this.owner.delete(e);
        if (
          ((this.held[e] = null),
          this.device.queue.writeBuffer(this.gripU, 64 * e + 12, new Float32Array([0])),
          !this.solver.contactEnabled)
        ) {
          let e = this.device.createCommandEncoder({ label: `gripRelease` });
          (e.clearBuffer(this.solver.ext), this.device.queue.submit([e.finish()]));
        }
      }
    }
    releaseAll() {
      for (let e = 0; e < 4; e++) this.release(e);
    }
    get active() {
      return this.held.some((e) => e !== null);
    }
    get patchNodes() {
      return this.held.flatMap((e) => e?.nodes ?? []);
    }
    get coreNodes() {
      return this.held.flatMap((e) => (e && !e.releasing ? e.core : []));
    }
    core(e) {
      return this.held[e]?.core ?? [];
    }
    encodeSubstep(e) {
      this.active && this.run(e, `gripLead`, 4);
    }
    encode(e) {
      this.active && e(this.pipes.gripTerms, this.group, 32);
    }
  };
const z = {
    maxSpeed: 2.5,
    maxAccel: 60,
    engageLift: 0.002,
    liftPerDrag: 0.35,
    maxDragLift: 0.05,
    minDepth: -0.03,
    maxDepth: 0.1,
  },
  B = (e, t) => [e[0] + t[0], e[1] + t[1], e[2] + t[2]],
  Ue = (e, t) => [e[0] - t[0], e[1] - t[1], e[2] - t[2]],
  V = (e, t) => [e[0] * t, e[1] * t, e[2] * t],
  H = (e) => Math.hypot(e[0], e[1], e[2]);
var We = class {
    anchor;
    toward;
    age = 0;
    depth = 0;
    offset = [0, 0, 0];
    vel = [0, 0, 0];
    constructor(e, t) {
      this.anchor = [...e];
      let n = H(t);
      this.toward = V(t, 1 / n);
    }
    get target() {
      return B(this.anchor, this.offset);
    }
    get pinch() {
      return Ie(this.age);
    }
    get engagement() {
      return Math.min(1, this.age / I.engageTime);
    }
    wheel(e) {
      this.depth = Math.max(z.minDepth, Math.min(z.maxDepth, this.depth + e));
    }
    goal(e) {
      let t = e[0] * this.toward[0] + e[1] * this.toward[1] + e[2] * this.toward[2],
        n = H(Ue(e, V(this.toward, t))),
        r = z.engageLift * this.engagement + Math.min(z.maxDragLift, z.liftPerDrag * n),
        i = Math.max(-t, r + this.depth);
      return B(e, V(this.toward, i));
    }
    step(e, t) {
      this.age += e;
      let n = Ue(this.goal(t), this.offset),
        r = H(n),
        i = targetSpeed(r, e, z.maxSpeed, z.maxAccel),
        a = r > 0 ? V(n, i / r) : [0, 0, 0],
        o = Ue(a, this.vel),
        s = H(o),
        c = z.maxAccel * e;
      ((this.vel = s > c ? B(this.vel, V(o, c / s)) : a), (this.offset = B(this.offset, V(this.vel, e))));
    }
  },
  Ge = class {
    samples;
    upTime = 1 / 0;
    constructor(e) {
      this.samples = [e];
    }
    get first() {
      return this.samples[0];
    }
    get last() {
      return this.samples[this.samples.length - 1];
    }
    add(e) {
      e.time < this.last.time || this.samples.push(e);
    }
    at(e) {
      let t = this.samples,
        n = e >= t[t.length - 1].time ? t[t.length - 1] : e <= t[0].time ? t[0] : null;
      if (n) return { x: n.x, y: n.y };
      let r = 0,
        i = t.length - 1;
      for (; i - r > 1;) {
        let n = (r + i) >> 1;
        t[n].time <= e ? (r = n) : (i = n);
      }
      let a = t[r],
        o = t[i],
        s = o.time > a.time ? (e - a.time) / (o.time - a.time) : 1;
      return { x: a.x + (o.x - a.x) * s, y: a.y + (o.y - a.y) * s };
    }
    prune(e) {
      let t = this.samples,
        n = 1;
      for (; n + 1 < t.length && t[n + 1].time <= e;) n++;
      n > 1 && t.splice(1, n - 1);
    }
  };
function Ke(e) {
  return Math.ceil((e - 1) / 2) + 1;
}
function qe(e) {
  let t = 0;
  return e.map((e) => {
    let n = { nx: Ke(e.nx), ny: Ke(e.ny), offset: t };
    return ((t += n.nx * n.ny), n);
  });
}
function Je(e, t = 48) {
  return e.every((e) => e.nx * e.ny > t && e.nx >= 5 && e.ny >= 5);
}
function Ye(e, t = 48) {
  let n = [e];
  for (;;) {
    let e = n[n.length - 1];
    if (U(e) <= t || !Je(e)) break;
    n.push(qe(e));
  }
  return n;
}
function U(e) {
  return e.reduce((e, t) => e + t.nx * t.ny, 0);
}
function Xe(e, t = 3) {
  let n = Array.from({ length: 2 * t }, () => []),
    r = 0;
  for (let i of e) {
    for (let e = 0; e < i.nx; e++) (n[e % t].push([i.offset + e, i.nx, i.ny, 1]), (r = Math.max(r, i.ny)));
    for (let e = 0; e < i.ny; e++) (n[t + (e % t)].push([i.offset + e * i.nx, 1, i.nx, 0]), (r = Math.max(r, i.nx)));
  }
  let i = [0],
    a = [];
  for (let e of n) {
    for (let t of e) a.push(...t);
    i.push(i[i.length - 1] + e.length);
  }
  return { lines: new Uint32Array(a), colorStart: i, maxLength: r };
}
var Ze = `// Cross-layer contact between crossing nodes. The contact distance (midsurface separation of two plies,
// ~0.85 mm) is about twice the crossing spacing, so the summed node-node penalty field is a smooth
// sheet-like barrier that still opens where material is missing. Detection runs once per substep on a
// spatial hash keyed by (cell, layer) and also produces an OGC-style displacement bound per node;
// contact and friction terms are re-evaluated at every Newton iterate from the stored pairs.

const K: u32 = 4u;
const NONE: u32 = 0xFFFFFFFFu;

struct ContactU {
  // cell size (m), table mask, unused, unused
  grid: vec4<f32>,
  // penalty stiffness (N/m), friction coefficient, friction regularization speed (m/s), bound fraction
  law: vec4<f32>,
  // per layer pair contact distance: [0-1, 0-2, 1-2, same layer], m
  dist: vec4<f32>,
};

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<uniform> CU: ContactU;
@group(0) @binding(2) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(3) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> dx: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> segs: array<Seg>;
@group(0) @binding(6) var<storage, read_write> cellCount: array<atomic<u32>>;
@group(0) @binding(7) var<storage, read_write> cellCursor: array<atomic<u32>>;
@group(0) @binding(8) var<storage, read_write> cellItems: array<u32>;
@group(0) @binding(9) var<storage, read_write> pairs: array<u32>;
// 2 per node (selfcontact.wgsl): own bound (normal, largest approach), reciprocal bound (none here)
@group(0) @binding(10) var<storage, read_write> cmeta: array<vec4<f32>>;
@group(0) @binding(11) var<storage, read_write> ext: array<vec4<f32>>;  // 3 per node

fn layerOf(n: u32) -> u32 { return nodes[n].ijl >> 24u; }

fn cellOf(p: vec3<f32>) -> vec3<i32> { return vec3<i32>(floor(p / CU.grid.x)); }

fn hashCell(c: vec3<i32>, layer: u32) -> u32 {
  let h = (u32(c.x) * 73856093u) ^ (u32(c.y) * 19349663u) ^ (u32(c.z) * 83492791u) ^ (layer * 2654435761u);
  return h & bitcast<u32>(CU.grid.y);
}

fn pairDistance(la: u32, lb: u32) -> f32 {
  if (la == lb) { return CU.dist.w; }
  let s = la + lb;
  if (s == 1u) { return CU.dist.x; }
  if (s == 2u) { return CU.dist.y; }
  return CU.dist.z;
}

fn cur(n: u32) -> vec3<f32> { return x[n].xyz + dx[n].xyz; }

@compute @workgroup_size(128)
fn hashCount(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  atomicAdd(&cellCount[hashCell(cellOf(cur(n)), layerOf(n))], 1u);
}

// After the exclusive scan, cellCount holds cell start offsets.
@compute @workgroup_size(128)
fn hashFill(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let h = hashCell(cellOf(cur(n)), layerOf(n));
  let slot = atomicLoad(&cellCount[h]) + atomicAdd(&cellCursor[h], 1u);
  cellItems[slot] = n;
}

@compute @workgroup_size(128)
fn detect(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let p = cur(n);
  let ln = layerOf(n);
  var best: array<u32, 4>;
  var bestD: array<f32, 4>;
  for (var k = 0u; k < K; k++) {
    best[k] = NONE;
    bestD[k] = 1e9;
  }
  var dmin = 1e9;
  var nmin = vec3<f32>(0.0);
  let c = cellOf(p);
  for (var lo = 0u; lo < P.counts.y; lo++) {
    if (lo == ln) { continue; }
    let r = pairDistance(ln, lo);
    for (var dz = -1; dz <= 1; dz++) {
      for (var dy = -1; dy <= 1; dy++) {
        for (var dxc = -1; dxc <= 1; dxc++) {
          let h = hashCell(c + vec3<i32>(dxc, dy, dz), lo);
          let start = atomicLoad(&cellCount[h]);
          let count = atomicLoad(&cellCursor[h]);
          for (var q = 0u; q < count; q++) {
            let m = cellItems[start + q];
            if (layerOf(m) != lo) { continue; }
            let d = distance(p, cur(m));
            if (d - r < dmin && d > 1e-9) {
              dmin = d - r;
              nmin = (p - cur(m)) / d;
            }
            if (d >= r + 0.25 * CU.grid.x) { continue; }
            var cand = m;
            var cd = d - r;
            for (var k = 0u; k < K; k++) {
              if (cd < bestD[k]) {
                let ts = best[k];
                let td = bestD[k];
                best[k] = cand;
                bestD[k] = cd;
                cand = ts;
                cd = td;
              }
            }
          }
        }
      }
    }
  }
  for (var k = 0u; k < K; k++) { pairs[K * n + k] = best[k]; }
  // Directional bound (step.wgsl newtonApply): the step may approach the nearest foreign node only by
  // a share of its clearance plus half the contact distance, so it cannot tunnel through a layer.
  if (dmin < 1e8) {
    cmeta[2u * n] = vec4<f32>(nmin, CU.law.w * (max(0.0, dmin) + 0.5 * CU.dist.x));
  } else {
    cmeta[2u * n] = vec4<f32>(0.0, 0.0, 0.0, 1e9);
  }
  cmeta[2u * n + 1u] = vec4<f32>(0.0, 0.0, 0.0, 1e9);
}

@compute @workgroup_size(128)
fn terms(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  var g = vec3<f32>(0.0);
  var H = mat3x3<f32>(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0));
  let p = cur(n);
  let ln = layerOf(n);
  let kc = CU.law.x;
  let mu = CU.law.y;
  let epsU = CU.law.z * P.hg.x;
  let I3 = mat3x3<f32>(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0));
  for (var k = 0u; k < K; k++) {
    let m = pairs[K * n + k];
    if (m == NONE) { continue; }
    let dv = p - cur(m);
    let d = length(dv);
    let r = pairDistance(ln, layerOf(m));
    if (d >= r || d <= 1e-9) { continue; }
    let nn = dv / d;
    let lam = kc * (r - d);
    g -= lam * nn;
    let nnT = mat3x3<f32>(nn * nn.x, nn * nn.y, nn * nn.z);
    H += kc * nnT;
    // lagged-normal regularized Coulomb friction on the relative tangential step
    let rel = dx[n].xyz - dx[m].xyz;
    let ut = rel - dot(rel, nn) * nn;
    let kf = mu * lam / max(length(ut), epsU);
    g += kf * ut;
    H += kf * (I3 - nnT);
  }
  ext[3u * n] = vec4<f32>(g, 0.0);
  ext[3u * n + 1u] = vec4<f32>(H[0].x, H[0].y, H[0].z, H[1].y);
  ext[3u * n + 2u] = vec4<f32>(H[1].z, H[2].z, 0.0, 0.0);
}
`;
const W = { cell: 0.001, tableBits: 20, stiffness: 3e3, friction: 0.45, frictionSpeed: 0.002, boundFraction: 0.45 };
var Qe = class {
    meta;
    s;
    mod;
    scan;
    pipes = {};
    group;
    scanGroups = [];
    cells;
    constructor(e, t) {
      this.s = e;
      let n = e.device;
      this.cells = 1 << W.tableBits;
      let r = t.layers.map((e) => e.material.thickness),
        s = (e, t) => 0.5 * ((r[e] ?? 0) + (r[t] ?? 0)),
        c = /* @__PURE__ */ new Float32Array(12);
      (c.set([W.cell, 0, 0, 0], 0),
        (new Uint32Array(c.buffer)[1] = this.cells - 1),
        c.set([W.stiffness, W.friction, W.frictionSpeed, W.boundFraction], 4),
        c.set([s(0, 1), s(0, 2), s(1, 2), 0], 8));
      let l = o(n, `contactU`, c, i);
      ((this.uniform = l), (this.law = c.slice(4, 8)));
      let u = a(n, `contact.cellCount`, 4 * this.cells),
        d = a(n, `contact.cellCursor`, 4 * this.cells),
        p = a(n, `contact.cellItems`, 4 * e.N),
        m = a(n, `contact.pairs`, 16 * e.N);
      ((this.meta = a(n, `contact.meta`, 32 * e.N)), (this.mod = new f(n, `contact`, _ + Ze)));
      for (let e of [`hashCount`, `hashFill`, `detect`, `terms`]) this.pipes[e] = this.mod.pipeline(e);
      ((this.group = this.mod.bindGroup(`contact`, {
        0: e.simParams,
        1: l,
        2: e.nodes,
        3: e.x,
        4: e.dx,
        5: e.segs,
        6: u,
        7: d,
        8: p,
        9: m,
        10: this.meta,
        11: e.ext,
      })),
        (this.scan = new f(n, `scan`, y)),
        (this.pipes.scanBlocks = this.scan.pipeline(`scanBlocks`)),
        (this.pipes.addBlockSums = this.scan.pipeline(`addBlockSums`)));
      let h = this.cells,
        g = u;
      for (;;) {
        let e = Math.ceil(h / 512),
          t = a(n, `scan.sums${this.scanGroups.length}`, 4 * Math.max(e, 4)),
          r = o(n, `scanU`, new Uint32Array([h, 0, 0, 0]), i);
        if (
          (this.scanGroups.push({
            scan: this.scan.bindGroup(`scan`, { 0: r, 1: g, 2: t }),
            add: this.scan.bindGroup(`scanAdd`, { 0: r, 1: g, 2: t }),
            blocks: e,
          }),
          e === 1)
        )
          break;
        ((g = t), (h = e));
      }
      ((this.cellCount = u), (this.cellCursor = d));
    }
    uniform;
    law;
    setEnabled(e) {
      let t = e ? this.law : new Float32Array([0, 0, this.law[2], this.law[3]]);
      this.s.device.queue.writeBuffer(this.uniform, 16, t);
    }
    cellCount;
    cellCursor;
    run(e, t, n, r = this.group) {
      (e.setPipeline(this.pipes[t]), e.setBindGroup(0, r), e.dispatchWorkgroups(n));
    }
    encodeClear(e) {
      (e.clearBuffer(this.cellCount), e.clearBuffer(this.cellCursor));
    }
    encodeDetect(e) {
      let t = Math.ceil(this.s.N / 128);
      this.run(e, `hashCount`, t);
      for (let t of this.scanGroups) this.run(e, `scanBlocks`, t.blocks, t.scan);
      for (let t = this.scanGroups.length - 2; t >= 0; t--)
        this.run(e, `addBlockSums`, this.scanGroups[t].blocks, this.scanGroups[t].add);
      (this.run(e, `hashFill`, t), this.run(e, `detect`, t));
    }
    encodeTerms(e) {
      this.run(e, `terms`, Math.ceil(this.s.N / 128));
    }
  },
  $e = `// Fine-level operator rows: 18 vec4 per node. Block b (0 = diagonal, 1..8 = couplings
// +u, -u, +v, -v, +u+v, -u-v, -u+v, +u-v) occupies vec4 2b = (xx, xy, xz, yy) and 2b+1 = (yz, zz, *, *).
// The four scalar bending 2-hop couplings live in spare lanes: vec4 1.zw = (+2u, -2u),
// vec4 3.zw = (+2v, -2v). Requires a module-scope \`op: array<vec4<f32>>\`.

const ROW_VEC4: u32 = 18u;
const ROW_COUPLINGS: u32 = 12u;
// Fine lattice rows: material connectivity comes from the spans (prolongation masking).
const FINE_ROWS: bool = true;

// Coupling index of a unit offset (+u, -u, +v, -v).
fn couplingIndex(off: vec2<i32>) -> u32 {
  if (off.x == 1) { return 0u; }
  if (off.x == -1) { return 1u; }
  if (off.y == 1) { return 2u; }
  return 3u;
}

fn rowOffset(k: u32) -> vec2<i32> {
  var offs = array<vec2<i32>, 12>(
    vec2<i32>(1, 0), vec2<i32>(-1, 0), vec2<i32>(0, 1), vec2<i32>(0, -1),
    vec2<i32>(1, 1), vec2<i32>(-1, -1), vec2<i32>(-1, 1), vec2<i32>(1, -1),
    vec2<i32>(2, 0), vec2<i32>(-2, 0), vec2<i32>(0, 2), vec2<i32>(0, -2));
  return offs[k];
}

fn symFromVec4(a: vec4<f32>, b: vec4<f32>) -> Sym {
  return Sym(vec3<f32>(a.x, a.w, b.y), vec3<f32>(a.y, a.z, b.x));
}

fn rowDiag(n: u32) -> Sym {
  let r = n * ROW_VEC4;
  return symFromVec4(op[r], op[r + 1u]);
}

fn rowCoupling(n: u32, k: u32) -> Sym {
  let r = n * ROW_VEC4;
  if (k < 8u) { return symFromVec4(op[r + 2u * k + 2u], op[r + 2u * k + 3u]); }
  let s = op[r + select(1u, 3u, k >= 10u)];
  return symId(select(s.z, s.w, (k & 1u) == 1u));
}
`,
  et = `// Coarse-level operator rows: 50 vec4 per node. Block 0 is the diagonal, blocks 1..24 the
// radius-2 couplings in offset order (dj, di) = (-2..2, -2..2) skipping the center; block b uses
// vec4 2b = (xx, xy, xz, yy) and 2b+1 = (yz, zz, 0, 0). Requires \`op: array<vec4<f32>>\`.

const ROW_VEC4: u32 = 50u;
const ROW_COUPLINGS: u32 = 24u;
const FINE_ROWS: bool = false;

// Coupling index of an offset within the radius-2 stencil.
fn couplingIndex(off: vec2<i32>) -> u32 {
  let o = u32((off.y + 2) * 5 + (off.x + 2));
  return select(o, o - 1u, o > 12u);
}

fn rowOffset(k: u32) -> vec2<i32> {
  let o = select(k, k + 1u, k >= 12u);
  return vec2<i32>(i32(o % 5u) - 2, i32(o / 5u) - 2);
}

fn symFromVec4(a: vec4<f32>, b: vec4<f32>) -> Sym {
  return Sym(vec3<f32>(a.x, a.w, b.y), vec3<f32>(a.y, a.z, b.x));
}

fn rowDiag(n: u32) -> Sym {
  let r = n * ROW_VEC4;
  return symFromVec4(op[r], op[r + 1u]);
}

fn rowCoupling(n: u32, k: u32) -> Sym {
  let r = n * ROW_VEC4 + 2u * k + 2u;
  return symFromVec4(op[r], op[r + 1u]);
}
`,
  tt = `// Fine-level Newton system assembly: projected Hessian row (upper-half stencil) and rhs = -grad.
// Mirrors ReferenceSolver.nodeGradient and assembleFineOperator (reference/newtonMultigrid.ts).

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(2) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> dx: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> pred: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> segs: array<Seg>;
@group(0) @binding(6) var<storage, read_write> op: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read_write> rhs: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read> ext: array<vec4<f32>>; // 3 per node: grad, H(xx xy xz yy), H(yz zz)
// contact bounds per node (selfcontact.wgsl / contact.wgsl; step.wgsl feasible): own and reciprocal
@group(0) @binding(9) var<storage, read> cmeta: array<vec4<f32>>;
// per detached node (rigid_frame.wgsl): its external block (inertia, drag, external Hessian, active
// bounds) and the stiffness its own internal terms (span to next, triple centred on it, two shear
// diagonals) put on a rigid rotation, as two Sym packed in 3 vec4
@group(0) @binding(10) var<storage, read_write> rigidK: array<vec4<f32>>;

// A rigid rotation w moves the ends of a term's vector d by w x d: a spring block
// kPar e e^T + kPerp (I - e e^T) along d resists it with d^2 kPerp (I - e e^T); a scalar stencil k on
// a vector r with k (|r|^2 I - r r^T).
fn rotationOfSpring(kPerp: f32, d: vec3<f32>) -> Sym {
  let l2 = dot(d, d);
  return Sym(kPerp * (vec3<f32>(l2) - d * d), -kPerp * vec3<f32>(d.x * d.y, d.x * d.z, d.y * d.z));
}

fn fineLevel() -> LevelInfo {
  var lv: LevelInfo;
  lv.counts = P.counts;
  for (var l = 0u; l < 3u; l++) { lv.layers[l] = P.layers[l].lattice; }
  return lv;
}

// mounted or retired (detached pieces stay in the solve, state.wgsl)
fn isPinned(m: i32) -> bool { return (nodes[u32(m)].flags & NODE_PINNED) != 0u || x[u32(m)].w > 1.5; }

fn segAt(owner: i32, f: u32) -> Seg { return segs[2u * u32(owner) + f]; }

fn activeSeg(owner: i32, f: u32) -> bool {
  if (owner < 0) { return false; }
  return segActive(segAt(owner, f));
}

struct SegForce {
  fs: f32,
  kPar: f32,
  kPerp: f32,
  e: vec3<f32>,
};

// Axial response of the span owned by \`a\` toward \`b\` (family f) at the current iterate.
fn segForce(a: u32, b: u32, f: u32, mat: LayerMat) -> SegForce {
  let en = x[b].xyz - x[a].xyz;
  let e = en + (dx[b].xyz - dx[a].xyz);
  let l = length(e);
  let ln = length(en);
  let s = segs[2u * a + f];
  let y = mat.yarn[f];
  let L = s.rest;
  let r = spanResponse(y, s, l / L - 1.0);
  let c = y.axialVisc / (L * P.hg.x);
  let fs = r.x + c * (l - ln);
  return SegForce(fs, max(r.y, 0.0) / L + c, max(fs, 0.0) / l, e / l);
}

// Bending of the triple (a, b, c) centered at b (fold-stiffening energy, see bendPsi, with the
// rest-length weights r = wa x_a - 2 x_b + wc x_c of bendGeometry): the gradient coefficient ke Psi'
// and a scalar stiffness k = ke (Psi' + 2 Psi'' q) + kd that majorizes the exact Hessian
// ke (Psi' I + 2 Psi'' r r^T) + kd H_v (the operator stores this stencil as scalars, times w w^T).
// Viscosity acts on the rate of the bending measure |r| (viscous potential 1/2 kd (|r| - |rn|)^2 over
// the substep): a rigid rotation of the triple changes r but not |r|, and is not resisted. Its Hessian
// H_v = r^ r^T + (1 - |rn| / |r|) (I - r^ r^T) is at most I.
struct Triple {
  ke: f32,
  kd: f32,
  k: f32,
  wa: f32,
  wc: f32,
  r: vec3<f32>,
  rn: vec3<f32>,
};

fn triple(a: u32, b: u32, c: u32, f: u32, mat: LayerMat) -> Triple {
  let sa = segs[2u * a + f];
  let sb = segs[2u * b + f];
  let geo = bendGeometry(sa.rest, sb.rest);
  let y = mat.yarn[f];
  // only yarns continuous through b bend (laws.ts bendScale)
  let kb = y.bendRigidity * bendScale(sa.intact, sb.intact, sa.cutMask, sb.cutMask, u32(y.yarnsPerSpan)) * geo.z;
  let kd = kb * y.bendVisc / P.hg.x;
  let rn = geo.x * x[a].xyz - 2.0 * x[b].xyz + geo.y * x[c].xyz;
  let r = rn + geo.x * dx[a].xyz - 2.0 * dx[b].xyz + geo.y * dx[c].xyz;
  let q = dot(r, r);
  let ps = bendPsi(q, geo.w);
  return Triple(kb * ps.y, kd, kb * (ps.y + 2.0 * ps.z * q) + kd, geo.x, geo.y, r, rn);
}

fn tripleGrad(t: Triple) -> vec3<f32> {
  let lr = length(t.r);
  return (t.ke + t.kd * (lr - length(t.rn)) / max(lr, 1e-12)) * t.r;
}

// Shear diagonal d of the cell with lower-left corner (ci, cj): d = 0 joins c and rt, d = 1 joins r
// and t. A diagonal acts while one of its two triangles is intact (the crossings there still lock
// the yarn angle), so a cell keeps its shear stiffness when a single span breaks and hole edges do
// not turn into free hinges.
fn diagActive(lv: LevelInfo, l: u32, ci: i32, cj: i32, d: u32) -> bool {
  let c = levelNode(lv, l, ci, cj);
  let r = levelNode(lv, l, ci + 1, cj);
  let t = levelNode(lv, l, ci, cj + 1);
  if (c < 0 || r < 0 || t < 0) { return false; }
  let cu = activeSeg(c, 0u);
  let cv = activeSeg(c, 1u);
  let rv = activeSeg(r, 1u);
  let tu = activeSeg(t, 0u);
  if (d == 0u) { return (cu && rv) || (cv && tu); }
  return (cu && cv) || (rv && tu);
}

fn intactOf(owner: i32, f: u32) -> f32 { return select(0.0, segAt(owner, f).intact, activeSeg(owner, f)); }

// Shear stiffness and jam strain of the cell with lower-left corner (ci, cj): a worn, thinned weave
// turns further before its yarns jam and resists turning less (laws.ts cellShear).
fn cellShear(lv: LevelInfo, l: u32, ci: i32, cj: i32, mat: LayerMat) -> vec2<f32> {
  let c = levelNode(lv, l, ci, cj);
  let r = levelNode(lv, l, ci + 1, cj);
  let t = levelNode(lv, l, ci, cj + 1);
  let a = cellArea(intactOf(c, 0u), intactOf(t, 0u), intactOf(c, 1u), intactOf(r, 1u));
  return vec2<f32>(mat.a.x * nodes[u32(c)].n0 / mat.b.z, shearJam(a));
}

fn shearRest(lv: LevelInfo, l: u32, ci: i32, cj: i32) -> f32 {
  let c = levelNode(lv, l, ci, cj);
  let s0 = segAt(c, 0u).rest;
  let s1 = segAt(c, 1u).rest;
  return sqrt(s0 * s0 + s1 * s1);
}

// Normal stiffness of an active contact bound in the Newton operator, relative to the node's own
// diagonal: the held node keeps ~1 % of the normal correction it would otherwise take.
const ACTIVE_BOUND: f32 = 100.0;

// Fine row layout (see rowfine.wgsl): 18 vec4, block b at 2b / 2b+1, scalars in spare lanes.
const ROW_VEC4: u32 = 18u;

fn storeSym(v: u32, b: Sym, spare: vec2<f32>) {
  op[v] = vec4<f32>(b.d.x, b.o.x, b.o.y, b.d.y);
  op[v + 1u] = vec4<f32>(b.o.z, b.d.z, spare.x, spare.y);
}

@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let st = nodes[n];
  let lv = fineLevel();
  let i = i32(st.ijl & 0xFFFu);
  let j = i32((st.ijl >> 12u) & 0xFFFu);
  let l = st.ijl >> 24u;
  let mat = P.layers[l];
  let row = n * ROW_VEC4;

  if (isPinned(i32(n))) {
    storeSym(row, symId(1.0), vec2<f32>(0.0));
    for (var k = 1u; k < 9u; k++) { storeSym(row + 2u * k, symZero(), vec2<f32>(0.0)); }
    rhs[n] = vec4<f32>(0.0);
    return;
  }

  let h = P.hg.x;
  let w = st.mass / (h * h);
  var D = symId(w);
  let detached = x[n].w > 0.5;
  // external block and the internal rotation stiffness of the terms this node owns (rigidK)
  var Kx = symId(w);
  var Kr = symZero();
  var g = w * (dx[n].xyz - pred[n].xyz);
  // implicit air drag (drag.wgsl): 1/2 dx^T Dd dx from the accepted state
  let Dd = airDragBlock(n);
  g += symMul(Dd, dx[n].xyz);
  D = symAdd(D, Dd);
  // External node terms (contact, friction, grip): gradient and symmetric Hessian
  let e0 = ext[3u * n];
  let e1 = ext[3u * n + 1u];
  let e2 = ext[3u * n + 2u];
  g += e0.xyz;
  let He = Sym(vec3<f32>(e1.x, e1.w, e2.y), vec3<f32>(e1.y, e1.z, e2.x));
  D = symAdd(D, He);
  Kx = symAdd(symAdd(Kx, Dd), He);
  // floor contact (common.wgsl floorLowest): penalty along +z, friction on the step
  var onFloorCore = false;
  if (P.floorAux.y > 0.5) {
    let half = 0.5 * mat.b.w;
    let delta = half + P.floor.y;
    let zc = x[n].z + dx[n].z;
    let s = delta - (zc - P.floor.x);
    if (s > 0.0) {
      let kc = P.floor.z;
      let lam = kc * s * s / delta;
      let ut = dx[n].xy;
      let kf = P.floor.w * lam / max(length(ut), P.floorAux.x * h);
      g += vec3<f32>(kf * ut, -lam);
      let Hf = Sym(vec3<f32>(kf, kf, 2.0 * kc * s / delta), vec3<f32>(0.0));
      D = symAdd(D, Hf);
      Kx = symAdd(Kx, Hf);
      onFloorCore = zc <= P.floor.x + half * (1.0 + 1e-3);
    }
  }

  // couplings: [+u, -u, +v, -v] axial/bending, scalars [+2u, -2u, +2v, -2v]
  var C1: array<Sym, 4>;
  var C2: array<f32, 4>;
  for (var k = 0u; k < 4u; k++) {
    C1[k] = symZero();
    C2[k] = 0.0;
  }

  for (var f = 0u; f < 2u; f++) {
    let du = select(0, 1, f == 0u);
    let dv = select(0, 1, f == 1u);
    let prev = levelNode(lv, l, i - du, j - dv);
    let next = levelNode(lv, l, i + du, j + dv);
    let prev2 = levelNode(lv, l, i - 2 * du, j - 2 * dv);
    let next2 = levelNode(lv, l, i + 2 * du, j + 2 * dv);
    let actPrev = activeSeg(prev, f);
    let actNext = activeSeg(i32(n), f) && next >= 0;
    let freeNext = next >= 0 && !isPinned(next);
    let freePrev = prev >= 0 && !isPinned(prev);
    let kp = 2u * f;
    let km = 2u * f + 1u;
    if (actPrev) {
      let s = segForce(u32(prev), n, f, mat);
      g += s.fs * s.e;
      let H = axialBlock(s.kPar, s.kPerp, s.e);
      D = symAdd(D, H);
      if (freePrev) { C1[km] = symAdd(C1[km], symScale(H, -1.0)); }
    }
    if (actNext) {
      let s = segForce(n, u32(next), f, mat);
      g -= s.fs * s.e;
      let H = axialBlock(s.kPar, s.kPerp, s.e);
      D = symAdd(D, H);
      if (freeNext) { C1[kp] = symAdd(C1[kp], symScale(H, -1.0)); }
      if (detached) { Kr = symAdd(Kr, rotationOfSpring(s.kPerp, (x[next].xyz + dx[next].xyz) - (x[n].xyz + dx[n].xyz))); }
    }
    // triple centered at n: (prev, n, next), weight of n -2
    if (actPrev && actNext) {
      let t = triple(u32(prev), n, u32(next), f, mat);
      g += -2.0 * tripleGrad(t);
      let k = t.k;
      D = symAdd(D, symId(4.0 * k));
      if (freeNext) { C1[kp] = symAdd(C1[kp], symId(-2.0 * t.wc * k)); }
      if (freePrev) { C1[km] = symAdd(C1[km], symId(-2.0 * t.wa * k)); }
      if (detached) { Kr = symAdd(Kr, rotationOfSpring(k, t.r)); }
    }
    // triple centered at next: (n, next, next2), weight of n wa
    if (actNext && activeSeg(next, f) && next2 >= 0) {
      let t = triple(n, u32(next), u32(next2), f, mat);
      g += t.wa * tripleGrad(t);
      let k = t.k;
      D = symAdd(D, symId(t.wa * t.wa * k));
      if (freeNext) { C1[kp] = symAdd(C1[kp], symId(-2.0 * t.wa * k)); }
      if (!isPinned(next2)) { C2[kp] += t.wa * t.wc * k; }
    }
    // triple centered at prev: (prev2, prev, n), weight of n wc
    if (actPrev && activeSeg(prev2, f)) {
      let t = triple(u32(prev2), u32(prev), n, f, mat);
      g += t.wc * tripleGrad(t);
      let k = t.k;
      D = symAdd(D, symId(t.wc * t.wc * k));
      if (freePrev) { C1[km] = symAdd(C1[km], symId(-2.0 * t.wc * k)); }
      if (!isPinned(prev2)) { C2[km] += t.wa * t.wc * k; }
    }
  }

  // shear diagonals around n; partner order matches couplings 4..7: +u+v, -u-v, -u+v, +u-v
  var CD: array<Sym, 4>;
  for (var c = 0; c < 4; c++) {
    CD[c] = symZero();
    var ci = i;
    var cj = j;
    var pi = i + 1;
    var pj = j + 1;
    if (c == 1) { ci = i - 1; cj = j - 1; pi = i - 1; pj = j - 1; }
    if (c == 2) { ci = i - 1; cj = j; pi = i - 1; pj = j + 1; }
    if (c == 3) { ci = i; cj = j - 1; pi = i + 1; pj = j - 1; }
    let p = levelNode(lv, l, pi, pj);
    if (p < 0 || !diagActive(lv, l, ci, cj, select(1u, 0u, c < 2))) { continue; }
    let d = (x[p].xyz - x[n].xyz) + (dx[p].xyz - dx[n].xyz);
    let len = length(d);
    let e = d / len;
    let cs = cellShear(lv, l, ci, cj, mat);
    let sl = shearLaw(cs.x, cs.y, shearRest(lv, l, ci, cj), len);
    let fs = sl.x;
    g -= fs * e;
    let H = axialBlock(sl.y, max(fs, 0.0) / len, e);
    D = symAdd(D, H);
    if (!isPinned(p)) { CD[c] = symScale(H, -1.0); }
    // diagonals of cell (i, j) and, across it, of cell (i, j - 1): each counted at one of its ends
    if (detached && (c == 0 || c == 3)) { Kr = symAdd(Kr, rotationOfSpring(max(fs, 0.0) / len, d)); }
  }

  // Active contact bounds (step.wgsl feasible): a node whose iterate already approaches a face by all
  // its bound allows, and whose net force still drives it on, is held along the bound's normal in the
  // Newton direction (stiffness ACTIVE_BOUND times its own), so the rest of the system takes up what the
  // clip would otherwise leave as a stretched span. Only the direction changes (the line search uses
  // the true potential); a node the forces pull away from the face is free.
  let kAct = ACTIVE_BOUND * (D.d.x + D.d.y + D.d.z);
  for (var b = 0u; b < 2u; b++) {
    let m = cmeta[2u * n + b];
    if (m.w >= 1e8 || all(m.xyz == vec3<f32>(0.0))) { continue; }
    if (-dot(dx[n].xyz, m.xyz) >= m.w - 1e-3 * abs(m.w) && dot(g, m.xyz) > 0.0) {
      D = symAdd(D, axialBlock(kAct, 0.0, m.xyz));
      Kx = symAdd(Kx, axialBlock(kAct, 0.0, m.xyz));
    }
  }
  // the floor's hard limit (half the thickness above it) likewise, where the forces still press down
  if (onFloorCore && g.z > 0.0) {
    D = symAdd(D, axialBlock(kAct, 0.0, vec3<f32>(0.0, 0.0, 1.0)));
    Kx = symAdd(Kx, axialBlock(kAct, 0.0, vec3<f32>(0.0, 0.0, 1.0)));
  }
  if (detached) {
    rigidK[3u * n] = vec4<f32>(Kx.d.x, Kx.o.x, Kx.o.y, Kx.d.y);
    rigidK[3u * n + 1u] = vec4<f32>(Kx.o.z, Kx.d.z, Kr.d.x, Kr.o.x);
    rigidK[3u * n + 2u] = vec4<f32>(Kr.o.y, Kr.d.y, Kr.o.z, Kr.d.z);
  }

  storeSym(row, D, vec2<f32>(C2[0], C2[1]));
  storeSym(row + 2u, C1[0], vec2<f32>(C2[2], C2[3]));
  for (var k = 1u; k < 4u; k++) { storeSym(row + 2u + 2u * k, C1[k], vec2<f32>(0.0)); }
  for (var k = 0u; k < 4u; k++) { storeSym(row + 10u + 2u * k, CD[k], vec2<f32>(0.0)); }
  rhs[n] = vec4<f32>(-g, 0.0);
}
`,
  nt = `// Galerkin multigrid kernels on lattice stencils, compiled with the row reader of the finer level
// (rowfine.wgsl or rowcoarse.wgsl). Coarse rows are always written in the coarse layout.
// Mirrors galerkin / vcycle in reference/newtonMultigrid.ts.

@group(0) @binding(0) var<uniform> F: LevelInfo;
@group(0) @binding(1) var<uniform> C: LevelInfo;
@group(0) @binding(2) var<storage, read> op: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> fixedF: array<u32>;
@group(0) @binding(4) var<storage, read_write> opC: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> fixedC: array<u32>;
@group(0) @binding(6) var<storage, read> vecIn: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read> vecIn2: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read_write> vecOut: array<vec4<f32>>;
@group(0) @binding(9) var<storage, read_write> vecOut2: array<vec4<f32>>;
// Prolongation weights of each level-F node to its bracketing coarse nodes, slot ki + 2 kj (lo = 0).
@group(0) @binding(10) var<storage, read_write> pw: array<vec4<f32>>;
@group(0) @binding(11) var<storage, read> segsF: array<Seg>;

// Coarse row writer (layout of rowcoarse.wgsl): offset index o = (dj + 2) * 5 + (di + 2).
fn storeC(n: u32, o: u32, b: Sym) {
  var blk = 0u;
  if (o != 12u) { blk = 1u + select(o, o - 1u, o > 12u); }
  let v = n * 50u + 2u * blk;
  opC[v] = vec4<f32>(b.d.x, b.o.x, b.o.y, b.d.y);
  opC[v + 1u] = vec4<f32>(b.o.z, b.d.z, 0.0, 0.0);
}

// Weight of fine index i in coarse index I (extent n), 0 if outside its bracket.
fn weightOf(i: u32, I: u32, n: u32) -> f32 {
  let b = bracketOf(i, n);
  if (b.lo == I) { return b.wlo; }
  if (b.hi == I && b.whi > 0.0) { return b.whi; }
  return 0.0;
}

// ---------------------------------------------------------------- connectivity-aware prolongation

// Whether the level-F node at (i, j) and its unit-offset neighbour are connected: an intact span on
// the fine lattice; on coarse levels a nonzero Galerkin coupling (pieces separated by a tear have
// none) or a fixed neighbour (mount boundaries keep their bilinear weights).
// a span links its nodes while it carries load (newtonMultigrid.ts LINK_MIN_INTACT)
const LINK_MIN_INTACT: f32 = 0.02;

fn linked(l: u32, i: i32, j: i32, di: i32, dj: i32) -> bool {
  let a = levelNode(F, l, i, j);
  let b = levelNode(F, l, i + di, j + dj);
  if (a < 0 || b < 0) { return false; }
  if (FINE_ROWS) {
    let f = select(1u, 0u, di != 0);
    let owner = select(b, a, di + dj > 0);
    let sg = segsF[2u * u32(owner) + f];
    return segActive(sg) && sg.intact > LINK_MIN_INTACT;
  }
  if (fixedF[u32(b)] != 0u) { return true; }
  return !symIsZero(rowCoupling(u32(a), couplingIndex(vec2<i32>(di, dj))));
}

// Bilinear weights masked to the coarse nodes a node reaches through connected edges inside their
// shared cell, renormalized. Across a tear, plain bilinear interpolation ties both sides to the same
// coarse unknowns, so a torn flap's own rigid motion has no coarse representation and its swing
// converges poorly. Mirrors buildProlongation (reference/newtonMultigrid.ts).
@compute @workgroup_size(128)
fn prolongWeights(@builtin(global_invocation_id) gid: vec3<u32>) {
  let a = gid.x;
  if (a >= F.counts.x) { return; }
  if (fixedF[a] != 0u) {
    pw[a] = vec4<f32>(0.0);
    return;
  }
  let fc = levelCoords(F, a);
  let l = fc.z;
  let Lf = F.layers[l];
  let i = i32(fc.x);
  let j = i32(fc.y);
  let bi = bracketOf(fc.x, Lf.y);
  let bj = bracketOf(fc.y, Lf.z);
  var w = vec4<f32>(0.0);
  var sum = 0.0;
  for (var kj = 0u; kj < 2u; kj++) {
    let J = select(bj.lo, bj.hi, kj == 1u);
    let wj = select(bj.wlo, bj.whi, kj == 1u);
    if (wj == 0.0) { continue; }
    let dj = i32(coarseToFine(J, Lf.z)) - j;
    for (var ki = 0u; ki < 2u; ki++) {
      let I = select(bi.lo, bi.hi, ki == 1u);
      let wi = select(bi.wlo, bi.whi, ki == 1u);
      if (wi == 0.0) { continue; }
      let di = i32(coarseToFine(I, Lf.y)) - i;
      var ok = true;
      if (di != 0 && dj != 0) {
        ok = (linked(l, i, j, di, 0) && linked(l, i + di, j, 0, dj)) || (linked(l, i, j, 0, dj) && linked(l, i, j + dj, di, 0));
      } else if (di != 0 || dj != 0) {
        ok = linked(l, i, j, di, dj);
      }
      if (ok) {
        w[ki + 2u * kj] = wi * wj;
        sum += wi * wj;
      }
    }
  }
  pw[a] = select(vec4<f32>(0.0), w / sum, sum > 0.0);
}

// Prolongation weight of level-F node a (at fine coordinates fi, fj) for coarse node (I, J).
fn weightAt(a: u32, fi: u32, fj: u32, I: u32, J: u32, nxf: u32, nyf: u32) -> f32 {
  let bi = bracketOf(fi, nxf);
  let bj = bracketOf(fj, nyf);
  let ki = select(1u, 0u, bi.lo == I);
  let kj = select(1u, 0u, bj.lo == J);
  return pw[a][ki + 2u * kj];
}

// ---------------------------------------------------------------- Galerkin coarse operator P^T A P

@compute @workgroup_size(64)
fn rap(@builtin(global_invocation_id) gid: vec3<u32>) {
  let I = gid.x;
  if (I >= C.counts.x) { return; }
  let cc = levelCoords(C, I);
  let l = cc.z;
  let Lf = F.layers[l];
  let nxf = Lf.y;
  let nyf = Lf.z;
  var acc: array<Sym, 25>;
  for (var o = 0u; o < 25u; o++) { acc[o] = symZero(); }
  let fi0 = i32(coarseToFine(cc.x, nxf));
  let fj0 = i32(coarseToFine(cc.y, nyf));
  for (var aj = fj0 - 1; aj <= fj0 + 1; aj++) {
    if (aj < 0 || aj >= i32(nyf)) { continue; }
    let wj = weightOf(u32(aj), cc.y, nyf);
    if (wj == 0.0) { continue; }
    for (var ai = fi0 - 1; ai <= fi0 + 1; ai++) {
      if (ai < 0 || ai >= i32(nxf)) { continue; }
      let wi = weightOf(u32(ai), cc.x, nxf);
      if (wi == 0.0) { continue; }
      let a = u32(levelNode(F, l, ai, aj));
      if (fixedF[a] != 0u) { continue; }
      let wa = weightAt(a, u32(ai), u32(aj), cc.x, cc.y, nxf, nyf);
      if (wa == 0.0) { continue; }
      for (var k = 0u; k <= ROW_COUPLINGS; k++) {
        var off = vec2<i32>(0, 0);
        var A: Sym;
        if (k == ROW_COUPLINGS) {
          A = rowDiag(a);
        } else {
          off = rowOffset(k);
          A = rowCoupling(a, k);
        }
        if (symIsZero(A)) { continue; }
        let bi = ai + off.x;
        let bj = aj + off.y;
        if (bi < 0 || bj < 0 || bi >= i32(nxf) || bj >= i32(nyf)) { continue; }
        let bri = bracketOf(u32(bi), nxf);
        let brj = bracketOf(u32(bj), nyf);
        let wb = pw[u32(levelNode(F, l, bi, bj))];
        for (var kj = 0u; kj < 2u; kj++) {
          let J = select(brj.lo, brj.hi, kj == 1u);
          for (var ki = 0u; ki < 2u; ki++) {
            let Ii = select(bri.lo, bri.hi, ki == 1u);
            let wJ = wb[ki + 2u * kj];
            if (wJ == 0.0) { continue; }
            let o = u32((i32(J) - i32(cc.y) + 2) * 5 + (i32(Ii) - i32(cc.x) + 2));
            acc[o] = symAdd(acc[o], symScale(A, wa * wJ));
          }
        }
      }
    }
  }
  let center = acc[12];
  if (center.d.x + center.d.y + center.d.z <= 0.0) {
    for (var o = 0u; o < 25u; o++) { storeC(I, o, symZero()); }
    storeC(I, 12u, symId(1.0));
    fixedC[I] = 1u;
    return;
  }
  for (var o = 0u; o < 25u; o++) { storeC(I, o, acc[o]); }
  fixedC[I] = 0u;
}

// ---------------------------------------------------------------- residual r = b - A x  (level F)

@compute @workgroup_size(128)
fn residual(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= F.counts.x) { return; }
  if (fixedF[n] != 0u) {
    vecOut[n] = vec4<f32>(0.0);
    return;
  }
  let cc = levelCoords(F, n);
  var r = vecIn2[n].xyz - symMul(rowDiag(n), vecIn[n].xyz);
  for (var k = 0u; k < ROW_COUPLINGS; k++) {
    let off = rowOffset(k);
    let m = levelNode(F, cc.z, i32(cc.x) + off.x, i32(cc.y) + off.y);
    if (m < 0) { continue; }
    r -= symMul(rowCoupling(n, k), vecIn[u32(m)].xyz);
  }
  vecOut[n] = vec4<f32>(r, 0.0);
}

// ---------------------------------------------------------------- restriction b_c = P^T r_f, x_c = 0

@compute @workgroup_size(128)
fn restrictResidual(@builtin(global_invocation_id) gid: vec3<u32>) {
  let I = gid.x;
  if (I >= C.counts.x) { return; }
  vecOut2[I] = vec4<f32>(0.0);
  if (fixedC[I] != 0u) {
    vecOut[I] = vec4<f32>(0.0);
    return;
  }
  let cc = levelCoords(C, I);
  let l = cc.z;
  let Lf = F.layers[l];
  let fi0 = i32(coarseToFine(cc.x, Lf.y));
  let fj0 = i32(coarseToFine(cc.y, Lf.z));
  var s = vec3<f32>(0.0);
  for (var aj = fj0 - 1; aj <= fj0 + 1; aj++) {
    if (aj < 0 || aj >= i32(Lf.z)) { continue; }
    let wj = weightOf(u32(aj), cc.y, Lf.z);
    if (wj == 0.0) { continue; }
    for (var ai = fi0 - 1; ai <= fi0 + 1; ai++) {
      if (ai < 0 || ai >= i32(Lf.y)) { continue; }
      let wi = weightOf(u32(ai), cc.x, Lf.y);
      if (wi == 0.0) { continue; }
      let a = u32(levelNode(F, l, ai, aj));
      if (fixedF[a] != 0u) { continue; }
      s += weightAt(a, u32(ai), u32(aj), cc.x, cc.y, Lf.y, Lf.z) * vecIn[a].xyz;
    }
  }
  vecOut[I] = vec4<f32>(s, 0.0);
}

// ---------------------------------------------------------------- prolongation x_f += P x_c

@compute @workgroup_size(128)
fn prolongAdd(@builtin(global_invocation_id) gid: vec3<u32>) {
  let a = gid.x;
  if (a >= F.counts.x) { return; }
  if (fixedF[a] != 0u) { return; }
  let fc = levelCoords(F, a);
  let Lf = F.layers[fc.z];
  let bi = bracketOf(fc.x, Lf.y);
  let bj = bracketOf(fc.y, Lf.z);
  let w = pw[a];
  var s = vec3<f32>(0.0);
  for (var kj = 0u; kj < 2u; kj++) {
    let J = select(bj.lo, bj.hi, kj == 1u);
    for (var ki = 0u; ki < 2u; ki++) {
      let Ii = select(bi.lo, bi.hi, ki == 1u);
      let wk = w[ki + 2u * kj];
      if (wk == 0.0) { continue; }
      let c = u32(levelNode(C, fc.z, i32(Ii), i32(J)));
      s += wk * vecIn[c].xyz;
    }
  }
  vecOut[a] = vec4<f32>(vecOut[a].xyz + s, 0.0);
}
`,
  rt = `// Yarn-line smoother. One 64-thread workgroup solves one line exactly as a block-tridiagonal system
// with the partition method: each of up to 32 threads eliminates a contiguous chunk in thread-private
// scratch, expressing interior unknowns as x_i = v_i + V_i x_s + W_i x_e in terms of its chunk ends;
// the 2P chunk-end equations form a small block-tridiagonal system, solved in workgroup memory by
// odd-even cyclic reduction (log2(2P) parallel levels; a serial solve of it dominated the dispatch
// latency). Cyclic reduction is Gaussian elimination in a symmetric permuted order, so it keeps the
// accuracy of the serial solve on these SPD systems (parallel cyclic reduction lost ~2 digits in f32
// on stiff yarn lines). Interior unknowns are then recovered in parallel. Compiled with rowfine.wgsl or rowcoarse.wgsl.
// Couplings to other lines (other colors) are lagged; the +-2 coupling along the line is majorized
// onto the diagonal. Mirrors smoothLines (CPU).

const WG: u32 = 128u;
// Most chunks per line (the reduced system has 2 rows per chunk, one PCR row per thread).
const PMAX: u32 = 64u;
// Per-node scratch (vec4): G 0..2, h/v 3, Hs/V 4..6, He/W 7..9.
const SCR: u32 = 10u;

@group(0) @binding(0) var<uniform> L: LevelInfo;
@group(0) @binding(1) var<uniform> DP: vec4<u32>; // x: first line index of this color
@group(0) @binding(2) var<storage, read> lines: array<vec4<u32>>;
@group(0) @binding(3) var<storage, read> op: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> fixedN: array<u32>;
@group(0) @binding(5) var<storage, read_write> xv: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read> bv: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read_write> scr: array<vec4<f32>>;

// Reduced rows qL x_{q-s} + qD x_q + qU x_{q+s} = qr at the current reduction stride s; qx: solution.
var<workgroup> qL: array<mat3x3<f32>, 128>;
var<workgroup> qD: array<mat3x3<f32>, 128>;
var<workgroup> qU: array<mat3x3<f32>, 128>;
var<workgroup> qr: array<vec3<f32>, 128>;
var<workgroup> qx: array<vec3<f32>, 128>;
var<workgroup> sLen: u32;

fn ldM(b: u32) -> mat3x3<f32> { return mat3x3<f32>(scr[b].xyz, scr[b + 1u].xyz, scr[b + 2u].xyz); }
fn stM(b: u32, m: mat3x3<f32>) {
  scr[b] = vec4<f32>(m[0], 0.0);
  scr[b + 1u] = vec4<f32>(m[1], 0.0);
  scr[b + 2u] = vec4<f32>(m[2], 0.0);
}

struct LineRow {
  A: mat3x3<f32>, // coupling to the previous node on the line
  B: mat3x3<f32>, // diagonal incl. majorization
  C: mat3x3<f32>, // coupling to the next node on the line
  r: vec3<f32>,
};

fn lineRow(n: u32, k: u32, len: u32, fam: u32) -> LineRow {
  let zero3 = mat3x3<f32>(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0));
  if (fixedN[n] != 0u) { return LineRow(zero3, symMat(symId(1.0)), zero3, vec3<f32>(0.0)); }
  let cc = levelCoords(L, n);
  let ci = i32(cc.x);
  let cj = i32(cc.y);
  var row: LineRow;
  row.A = zero3;
  row.C = zero3;
  var D = rowDiag(n);
  var r = bv[n].xyz;
  var maj = 0.0;
  // Couplings to fixed nodes are zero by construction, so no neighbor flag checks are needed.
  for (var c = 0u; c < ROW_COUPLINGS; c++) {
    let off = rowOffset(c);
    let along = select(off.y, off.x, fam == 0u);
    let across = select(off.x, off.y, fam == 0u);
    if (across == 0 && along == -1) {
      if (k > 0u) { row.A = symMat(rowCoupling(n, c)); }
      continue;
    }
    if (across == 0 && along == 1) {
      if (k + 1u < len) { row.C = symMat(rowCoupling(n, c)); }
      continue;
    }
    let m = levelNode(L, cc.z, ci + off.x, cj + off.y);
    if (m < 0) { continue; }
    let Bc = rowCoupling(n, c);
    if (across == 0) { maj += symFrob(Bc); }
    r -= symMul(Bc, xv[u32(m)].xyz);
  }
  D = symAdd(D, symId(maj));
  row.B = symMat(D);
  row.r = r + maj * xv[n].xyz;
  return row;
}

@compute @workgroup_size(128)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) t: u32) {
  let line = lines[DP.x + wg.x];
  if (t == 0u) { sLen = line.z; }
  let len = workgroupUniformLoad(&sLen);
  let fam = line.w;
  let n0 = line.x;
  let st = line.y;
  let zero3 = mat3x3<f32>(vec3<f32>(0.0), vec3<f32>(0.0), vec3<f32>(0.0));
  let I3 = mat3x3<f32>(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0));
  let P = max(1u, min(PMAX, len / 2u));
  let base = len / P;
  let extra = len % P;
  let ks = t * base + min(t, extra);
  let m = base + select(0u, 1u, t < extra);
  let ke = ks + m - 1u;

  if (t < P) {
    let rs = lineRow(n0 + ks * st, ks, len, fam);
    let re = lineRow(n0 + ke * st, ke, len, fam);
    // chunk-interior elimination with right-hand sides [r | x_s | x_e]
    var Gp = zero3;
    var hp = vec3<f32>(0.0);
    var Hsp = I3;
    var Hep = zero3;
    for (var k = ks + 1u; k < ke; k++) {
      let n = n0 + k * st;
      let rk = lineRow(n, k, len, fam);
      let Minv = pivotInverse(rk.B - rk.A * Gp);
      var G = zero3;
      var Cext = zero3;
      if (k + 1u < ke) { G = Minv * rk.C; } else { Cext = rk.C; }
      let h = Minv * (rk.r - rk.A * hp);
      let Hs = Minv * (zero3 - rk.A * Hsp);
      let He = Minv * (zero3 - rk.A * Hep - Cext);
      let b = SCR * n;
      stM(b, G);
      scr[b + 3u] = vec4<f32>(h, 0.0);
      stM(b + 4u, Hs);
      stM(b + 7u, He);
      Gp = G;
      hp = h;
      Hsp = Hs;
      Hep = He;
    }
    // back substitution inside the chunk: (v, V, W) of each interior node
    var vS = vec3<f32>(0.0); // at ks + 1 (defaults for m == 2: x_{s+1} = x_e)
    var VS = zero3;
    var WS = I3;
    var vE = vec3<f32>(0.0); // at ke - 1 (defaults for m == 2: x_{e-1} = x_s)
    var VE = I3;
    var WE = zero3;
    if (m >= 3u) {
      var vn = vec3<f32>(0.0);
      var Vn = zero3;
      var Wn = zero3;
      for (var k = ke - 1u; k > ks; k--) {
        let b = SCR * (n0 + k * st);
        let G = ldM(b);
        let v = scr[b + 3u].xyz - G * vn;
        let V = ldM(b + 4u) - G * Vn;
        let W = ldM(b + 7u) - G * Wn;
        scr[b + 3u] = vec4<f32>(v, 0.0);
        stM(b + 4u, V);
        stM(b + 7u, W);
        if (k == ke - 1u) {
          vE = v;
          VE = V;
          WE = W;
        }
        vn = v;
        Vn = V;
        Wn = W;
      }
      vS = vn;
      VS = Vn;
      WS = Wn;
    }
    // reduced equations for x_s (index 2t) and x_e (index 2t + 1)
    qL[2u * t] = rs.A;
    qD[2u * t] = rs.B + rs.C * VS;
    qU[2u * t] = rs.C * WS;
    qr[2u * t] = rs.r - rs.C * vS;
    qL[2u * t + 1u] = re.A * VE;
    qD[2u * t + 1u] = re.B + re.A * WE;
    qU[2u * t + 1u] = re.C;
    qr[2u * t + 1u] = re.r - re.A * vE;
  }
  workgroupBarrier();

  // odd-even cyclic reduction. At stride s the rows with (q + 1) % 2s == 0 eliminate their
  // neighbours q -+ s, which were the survivors of the previous level and are no longer written.
  let Q = 2u * P;
  var stride = 1u;
  loop {
    if (2u * stride > Q) { break; }
    let q = t;
    if (q < Q && (q + 1u) % (2u * stride) == 0u) {
      let lo = q - stride;
      let al = qL[q] * pivotInverse(qD[lo]);
      var D = qD[q] - al * qU[lo];
      var r = qr[q] - al * qr[lo];
      var Lq = zero3 - al * qL[lo];
      var Uq = zero3;
      if (q + stride < Q) {
        let hi = q + stride;
        let ga = qU[q] * pivotInverse(qD[hi]);
        D -= ga * qL[hi];
        r -= ga * qr[hi];
        Uq = zero3 - ga * qU[hi];
      }
      qD[q] = D;
      qr[q] = r;
      qL[q] = Lq;
      qU[q] = Uq;
    }
    workgroupBarrier();
    stride = stride * 2u;
  }
  // back substitution from the last survivor (stride: largest power of two <= Q)
  loop {
    if (stride == 0u) { break; }
    let q = t;
    if (q < Q && (q + 1u) % stride == 0u && (q + 1u) % (2u * stride) != 0u) {
      var r = qr[q];
      if (q >= stride) { r -= qL[q] * qx[q - stride]; }
      if (q + stride < Q) { r -= qU[q] * qx[q + stride]; }
      qx[q] = pivotInverse(qD[q]) * r;
    }
    workgroupBarrier();
    stride = stride / 2u;
  }

  if (t < P) {
    let xs = qx[2u * t];
    let xe = qx[2u * t + 1u];
    let ns = n0 + ks * st;
    let ne = n0 + ke * st;
    if (fixedN[ns] == 0u) { xv[ns] = vec4<f32>(xs, 0.0); }
    if (fixedN[ne] == 0u) { xv[ne] = vec4<f32>(xe, 0.0); }
    for (var k = ks + 1u; k < ke; k++) {
      let n = n0 + k * st;
      if (fixedN[n] != 0u) { continue; }
      let b = SCR * n;
      xv[n] = vec4<f32>(scr[b + 3u].xyz + ldM(b + 4u) * xs + ldM(b + 7u) * xe, 0.0);
    }
  }
}
`,
  it = `// PCG vector kernels on the fine level. Scalars stay on the GPU: slot 2k = r.z of iteration k,
// slot 2k+1 = p.Ap of iteration k. Mirrors pcg() in reference/newtonMultigrid.ts.

const RED: u32 = 256u;
const GROUPS: u32 = 256u;

@group(0) @binding(0) var<uniform> F: LevelInfo;
@group(0) @binding(1) var<uniform> It: vec4<u32>; // x: iteration k, y: scalar slot, z: partial count
@group(0) @binding(2) var<storage, read> op: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> fixedN: array<u32>;
@group(0) @binding(4) var<storage, read_write> va: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> vb: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> vc: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read_write> vd: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read_write> ve: array<vec4<f32>>;
@group(0) @binding(9) var<storage, read_write> partial: array<f32>;
@group(0) @binding(10) var<storage, read_write> scal: array<f32>;

var<workgroup> red: array<f32, 256>;

fn reduceStore(lid: u32, wgid: u32, v: f32) {
  red[lid] = v;
  workgroupBarrier();
  var s = RED / 2u;
  loop {
    if (s == 0u) { break; }
    if (lid < s) { red[lid] += red[lid + s]; }
    workgroupBarrier();
    s = s / 2u;
  }
  if (lid == 0u) { partial[wgid] = red[0]; }
}

// vb = A va ; partial sums of va . vb
@compute @workgroup_size(256)
fn matvecDot(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wg: vec3<u32>) {
  var acc = 0.0;
  for (var n = gid.x; n < F.counts.x; n += RED * GROUPS) {
    var y = vec3<f32>(0.0);
    if (fixedN[n] == 0u) {
      let cc = levelCoords(F, n);
      y = symMul(rowDiag(n), va[n].xyz);
      for (var c = 0u; c < ROW_COUPLINGS; c++) {
        let off = rowOffset(c);
        let m = levelNode(F, cc.z, i32(cc.x) + off.x, i32(cc.y) + off.y);
        if (m < 0) { continue; }
        y += symMul(rowCoupling(n, c), va[u32(m)].xyz);
      }
    }
    vb[n] = vec4<f32>(y, 0.0);
    acc += dot(y, va[n].xyz);
  }
  reduceStore(lid, wg.x, acc);
}

// partial sums of va . vb
@compute @workgroup_size(256)
fn dotPartial(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wg: vec3<u32>) {
  var acc = 0.0;
  for (var n = gid.x; n < F.counts.x; n += RED * GROUPS) {
    acc += dot(va[n].xyz, vb[n].xyz);
  }
  reduceStore(lid, wg.x, acc);
}

@compute @workgroup_size(256)
fn reduceFinal(@builtin(local_invocation_index) lid: u32) {
  var acc = 0.0;
  for (var k = lid; k < It.z; k += RED) { acc += partial[k]; }
  red[lid] = acc;
  workgroupBarrier();
  var s = RED / 2u;
  loop {
    if (s == 0u) { break; }
    if (lid < s) { red[lid] += red[lid + s]; }
    workgroupBarrier();
    s = s / 2u;
  }
  if (lid == 0u) { scal[It.y] = red[0]; }
}

fn safeDiv(a: f32, b: f32) -> f32 {
  let q = a / b;
  return select(0.0, q, b > 0.0 && finite1(q));
}

// va = delta, vb = p, vc = r, vd = Ap, ve = z:  delta += a p ; r -= a Ap ; z = 0
@compute @workgroup_size(256)
fn updateXR(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= F.counts.x) { return; }
  let k = It.x;
  let alpha = safeDiv(scal[2u * k], scal[2u * k + 1u]);
  va[n] = vec4<f32>(va[n].xyz + alpha * vb[n].xyz, 0.0);
  vc[n] = vec4<f32>(vc[n].xyz - alpha * vd[n].xyz, 0.0);
  ve[n] = vec4<f32>(0.0);
}

// va = p, vb = z: p = z + beta p (beta = rz_{k+1} / rz_k); k = 0xFFFFFFFF means p = z
@compute @workgroup_size(256)
fn updateP(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= F.counts.x) { return; }
  let k = It.x;
  var beta = 0.0;
  if (k != 0xFFFFFFFFu) { beta = safeDiv(scal[2u * k + 2u], scal[2u * k]); }
  va[n] = vec4<f32>(vb[n].xyz + beta * va[n].xyz, 0.0);
}

// va = 0 (and vb = 0)
@compute @workgroup_size(256)
fn clear2(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= F.counts.x) { return; }
  va[n] = vec4<f32>(0.0);
  vb[n] = vec4<f32>(0.0);
}
`,
  at = `// Per-substep kernels outside the linear solve: predictor, Newton update, commit, friction-limited
// crossing slip (damage and rupture: yarnfield.wgsl). Mirrors ReferenceSolver (reference/solver.ts).

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<uniform> Mode: vec4<u32>; // slip: x = family, y = parity; newtonApply/gate: x = iteration
@group(0) @binding(2) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(3) var<storage, read_write> x: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> v: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> dx: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> pred: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read_write> segs: array<Seg>;
@group(0) @binding(8) var<storage, read_write> tails: array<f32>;
@group(0) @binding(9) var<storage, read> delta: array<vec4<f32>>;
// [0] ruptures, [1] pulled out, [2] max speed (f32 bits), [3] line-search step length (f32 bits),
// [4 + k] largest update of Newton iteration k
@group(0) @binding(10) var<storage, read_write> counters: array<atomic<u32>>;
// contact bounds per node (selfcontact.wgsl detect / resolveBounds): [2n] unit normal away from the
// face it is bounded against and the largest step displacement allowed toward it; [2n + 1] for a face
// corner, the direction toward the node bounded against that face and the largest step along it (zero
// direction: unbounded)
@group(0) @binding(11) var<storage, read> cmeta: array<vec4<f32>>;

fn historyTolerance() -> f32 { return bitcast<f32>(P.counts.w); }

// mounted, or retired (out of the scene; detached pieces stay in the solve, state.wgsl)
fn pinnedN(n: u32) -> bool { return (nodes[n].flags & NODE_PINNED) != 0u || x[n].w > 1.5; }

// A detached node leaves the scene below this height or beyond this lateral distance (m) and is retired.
const RETIRE_Z: f32 = -0.25;
const RETIRE_R: f32 = 0.6;

fn lattice(l: u32) -> vec4<u32> { return P.layers[l].lattice; }

// Neighbor of n along family f in direction dir (-1/+1), or -1.
fn nbr(n: u32, f: u32, dir: i32) -> i32 {
  let ijl = nodes[n].ijl;
  let i = i32(ijl & 0xFFFu);
  let j = i32((ijl >> 12u) & 0xFFFu);
  let L = lattice(ijl >> 24u);
  let ni = i + select(0, dir, f == 0u);
  let nj = j + select(0, dir, f == 1u);
  if (ni < 0 || nj < 0 || ni >= i32(L.y) || nj >= i32(L.z)) { return -1; }
  return i32(L.x) + nj * i32(L.y) + ni;
}

@compute @workgroup_size(128)
fn predict(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let h = P.hg.x;
  if (pinnedN(n)) {
    pred[n] = vec4<f32>(0.0);
    dx[n] = vec4<f32>(0.0);
    return;
  }
  let hv = h * v[n].xyz;
  pred[n] = vec4<f32>(hv + h * h * P.hg.yzw, 0.0);
  dx[n] = vec4<f32>(hv, 0.0);
}

// A half-space bound: the step may move against direction m.xyz by at most m.w.
fn bound(d: vec3<f32>, m: vec4<f32>) -> vec3<f32> {
  let approach = -dot(d, m.xyz);
  return select(d, d + (approach - m.w) * m.xyz, approach > m.w);
}

// The step d made feasible for node n's contact bounds (OGC-style, directional: it may approach the
// face it is bounded against only by its share of the clearance, and a face corner may approach the
// node bounded against it only by that node's share; motion along the face stays free). Alternating
// projections onto the two half-spaces; both are kept to within rounding when their normals agree.
fn feasible(n: u32, d: vec3<f32>) -> vec3<f32> {
  let own = cmeta[2u * n];
  let recip = cmeta[2u * n + 1u];
  return bound(bound(bound(d, own), recip), own);
}

// The step d of node n bounded against the floor, from its iterate step lin (common.wgsl floorLowest).
fn floorBound(n: u32, lin: vec3<f32>, d: vec3<f32>) -> vec3<f32> {
  if (P.floorAux.y < 0.5) { return d; }
  let half = 0.5 * P.layers[nodes[n].ijl >> 24u].b.w;
  let delta = half + P.floor.y;
  let sWeight = floorWeightDepth(nodes[n].mass, length(P.hg.yzw), delta, P.floor.z);
  let z0 = x[n].z;
  let lowest = floorLowest(z0 + lin.z, P.floor.x, delta, half, sWeight);
  return vec3<f32>(d.xy, max(d.z, lowest - z0));
}

// After contact detection: the predicted step made feasible (the first Newton iteration starts from a
// state that respects the bounds; the clipped approach is lost, as in an inelastic contact).
@compute @workgroup_size(128)
fn projectStart(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || pinnedN(n)) { return; }
  dx[n] = vec4<f32>(floorBound(n, vec3<f32>(0.0), feasible(n, dx[n].xyz)), dx[n].w);
}

@compute @workgroup_size(128)
fn newtonApply(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  if (pinnedN(n)) { return; }
  let old = dx[n].xyz;
  // step length chosen by the line search (energy.wgsl)
  let alpha = bitcast<f32>(atomicLoad(&counters[3]));
  // firewall: a non-finite direction never enters the state
  let dn = select(vec3<f32>(0.0), delta[n].xyz, finite3(delta[n].xyz) && finite1(alpha));
  let nd = floorBound(n, old, feasible(n, old + alpha * dn));
  // w keeps the size of this node's latest Newton update (local convergence for history updates)
  dx[n] = vec4<f32>(nd, length(nd - old));
  // non-negative f32 bit patterns order like their values
  atomicMax(&counters[4u + Mode.x], bitcast<u32>(length(nd - old)));
}

// A detached node that left the scene: frozen, out of the solve and hidden. Its spans are removed (no
// longer existing, not broken: nothing ruptured), so the rest of its piece neither hangs from the frozen
// node nor counts a tear; the piece is cut only where it is already out of view. Its operator row is then
// the identity with nothing coupled to it. Two nodes retiring together write the same flags.
fn retire(n: u32, p: vec3<f32>) {
  x[n] = vec4<f32>(p, 2.0);
  v[n] = vec4<f32>(0.0);
  for (var f = 0u; f < 2u; f++) {
    segs[2u * n + f].flags &= ~SEG_EXISTS;
    let prev = nbr(n, f, -1);
    if (prev >= 0) { segs[2u * u32(prev) + f].flags &= ~SEG_EXISTS; }
  }
}

@compute @workgroup_size(128)
fn commit(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let d = dx[n].xyz;
  let lastUpdate = dx[n].w;
  let w = x[n].w;
  dx[n] = vec4<f32>(0.0);
  if (w > 1.5) { return; }
  let p = x[n].xyz + d;
  if (w > 0.5 && (p.z < RETIRE_Z || length(p.xy) > RETIRE_R)) {
    retire(n, p);
    return;
  }
  // v.w carries the node's last Newton update into the history kernels
  v[n] = vec4<f32>(d / P.hg.x, lastUpdate);
  // largest speed since the host last cleared it (rest detection)
  atomicMax(&counters[2], bitcast<u32>(length(d) / P.hg.x));
  x[n] = vec4<f32>(p, w);
}

// Tension of an active span at committed positions and dT/dL at fixed length.
fn spanTension(owner: u32, f: u32) -> vec2<f32> {
  let sg = segs[2u * owner + f];
  let b = u32(nbr(owner, f, 1));
  let l = length(x[b].xyz - x[owner].xyz);
  let L = sg.rest;
  let mat = P.layers[nodes[owner].ijl >> 24u];
  let r = spanResponse(mat.yarn[f], sg, l / L - 1.0);
  return vec2<f32>(r.x, max(r.y, 0.0) * l / (L * L));
}

fn spanActive(owner: i32, f: u32) -> bool {
  if (owner < 0) { return false; }
  return segActive(segs[2u * u32(owner) + f]);
}

@compute @workgroup_size(128)
fn slip(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || P.counts.z == 0u) { return; }
  if (v[n].w > historyTolerance()) { return; }
  let f = Mode.x;
  let ijl = nodes[n].ijl;
  let along = select((ijl >> 12u) & 0xFFFu, ijl & 0xFFFu, f == 0u);
  if ((along & 1u) != Mode.y) { return; }
  if (pinnedN(n)) { return; }
  let prev = nbr(n, f, -1);
  let next = nbr(n, f, 1);
  if (prev < 0 || next < 0) { return; }
  let actL = spanActive(prev, f);
  let actR = spanActive(i32(n), f);
  if (!actL && !actR) { return; }
  var tl = vec2<f32>(0.0);
  var tr = vec2<f32>(0.0);
  if (actL) { tl = spanTension(u32(prev), f); }
  if (actR) { tr = spanTension(n, f); }
  // crossing yarn tension
  let g = 1u - f;
  var tc = 0.0;
  var cnt = 0.0;
  let cp = nbr(n, g, -1);
  if (spanActive(cp, g)) {
    tc += max(0.0, spanTension(u32(cp), g).x);
    cnt += 1.0;
  }
  if (spanActive(i32(n), g)) {
    tc += max(0.0, spanTension(n, g).x);
    cnt += 1.0;
  }
  if (cnt == 0.0) { return; }
  tc /= cnt;
  let mat = P.layers[ijl >> 24u];
  let Fc = mat.a.y * (nodes[n].n0 + mat.a.z * mat.yarn[f].yarnsPerSpan * tc);
  let dT = max(tr.x, 0.0) - max(tl.x, 0.0);
  if (abs(dT) <= Fc) { return; }
  let highR = dT > 0.0;
  let kHigh = select(tl.y, tr.y, highR);
  let lowActive = select(actR, actL, highR);
  let kLow = select(0.0, select(tr.y, tl.y, highR), lowActive);
  var dl = (abs(dT) - Fc) / max(kHigh + kLow, 1e-9);
  let pitch = select(mat.b.x, mat.a.w, f == 0u);
  let sHigh = select(2u * u32(prev) + f, 2u * n + f, highR);
  let sLow = select(2u * n + f, 2u * u32(prev) + f, highR);
  if (lowActive) {
    dl = min(dl, max(0.0, segs[sLow].rest - 0.55 * pitch));
    segs[sLow].rest -= dl;
    segs[sHigh].rest += dl;
  } else {
    let tIdx = select(4u * n + 2u * f + 1u, 4u * n + 2u * f, highR);
    dl = min(dl, tails[tIdx]);
    tails[tIdx] -= dl;
    segs[sHigh].rest += dl;
    if (tails[tIdx] <= 1e-9) {
      tails[tIdx] = 0.0;
      // The yarn leaves this crossing: the high-side span becomes a free tail of its far node.
      let farTail = select(4u * u32(prev) + 2u * f + 1u, 4u * u32(next) + 2u * f, highR);
      tails[farTail] += segs[sHigh].rest;
      // its yarns left the crossings at n (the owner's end when high is on the right); the field parts
      // them there at the next coupling (yarnfield.wgsl coupleSpan; this module has no field binding)
      segs[sHigh].flags = segs[sHigh].flags | SEG_BROKEN | SEG_SLIPPED;
      segs[sHigh].failSite = select(1.0, 0.0, highR);
      atomicAdd(&counters[1], 1u);
    }
  }
}
`,
  ot = `// Yarn damage field: per crossing the damage of its
// warp and pick segments, advanced after each substep from the strain interpolated from the active
// parallel spans around it; the spans then take their intact fraction from it, and a span whose yarns
// have all separated ruptures. Passes, in order: spanStrain (strain snapshot per span), fieldUpdatePick
// and fieldUpdateWarp (per span and yarn, after sepSnapshot), pullMark and pullApply (per 16 crossings),
// coupleU and coupleV (per span, one family each).

@group(0) @binding(0) var<uniform> P: SimParams;
// per layer: first crossing, warps K, picks M, load-sharing reach along picks | along warps << 16
@group(0) @binding(1) var<uniform> FU: array<vec4<u32>, 3>;
@group(0) @binding(2) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(3) var<storage, read> x: array<vec4<f32>>;
// per node: strain of its u and v spans (NO_STRAIN when they carry none); the solver's predictor
// buffer, free between the commit and the next predictor
@group(0) @binding(4) var<storage, read_write> strain: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> segs: array<Seg>;
@group(0) @binding(6) var<storage, read_write> tails: array<f32>;
// per crossing: damage code of its pick segment (bits 0-7) and warp segment (bits 8-15), 255 = cut;
// cross-section code of the abraded pick (bits 16-23) and warp (24-31) segment
@group(0) @binding(7) var<storage, read_write> field: array<u32>;
// per crossing: peak tension of its pick (x) and warp (y) segment, N
@group(0) @binding(8) var<storage, read> strength: array<vec2<f32>>;
@group(0) @binding(9) var<storage, read_write> counters: array<atomic<u32>>;
// [0] set to 1 whenever a damage code changed (the renderer clears it once it has rebuilt its edge field)
@group(0) @binding(10) var<storage, read_write> fieldEvents: array<atomic<u32>>;
// per 16 crossings, bit 2 e + f: the separated state before the step (sepSnapshot -> fieldUpdate*),
// then the pull-out marks (pullMark -> pullApply)
@group(0) @binding(11) var<storage, read_write> pullBits: array<u32>;
// sound source anchors (common.wgsl nearestSource): positions of the held grips, w > 0 in use
@group(0) @binding(12) var<uniform> SRC: array<vec4<f32>, 4>;

const NO_STRAIN: f32 = 1e30;
const CUT: u32 = 255u;
// pulled out of the weave at the crossing (yarnField.ts DAMAGE_PULLED); codes >= PULLED separate it
const PULLED: u32 = 254u;

fn latticeOf(l: u32) -> vec4<u32> { return P.layers[l].lattice; }
// in the solve: cloth or a detached piece (not retired)
fn cloth(n: u32) -> bool { return x[n].w < 1.5; }
fn bundleF(l: u32, f: u32) -> u32 { return u32(P.layers[l].yarn[f].yarnsPerSpan); }
fn damageAt(c: u32, f: u32) -> u32 { return (field[c] >> (8u * f)) & 0xFFu; }
fn areaOfCode(code: u32) -> f32 { return max(0.02, f32(code) / 255.0); }
fn areaAt(c: u32, f: u32) -> f32 { return areaOfCode((field[c] >> (16u + 8u * f)) & 0xFFu); }

@compute @workgroup_size(128)
fn spanStrain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  var e = vec2<f32>(NO_STRAIN);
  if (cloth(n)) {
    let ijl = nodes[n].ijl;
    let L = latticeOf(ijl >> 24u);
    let i = ijl & 0xFFFu;
    let j = (ijl >> 12u) & 0xFFFu;
    for (var f = 0u; f < 2u; f++) {
      let sg = segs[2u * n + f];
      let inside = select(j + 1u < L.z, i + 1u < L.y, f == 0u);
      if (!inside || !segActive(sg)) { continue; }
      let b = n + select(L.y, 1u, f == 0u);
      if (cloth(b)) { e[f] = (length(x[b].xyz - x[n].xyz) - sg.rest) / sg.rest; }
    }
  }
  strain[n] = vec4<f32>(e, 0.0, 0.0);
}

// Strain of family f at crossing (k, m): bilinear over the active parallel spans at their midpoints.
fn interpolatedStrain(l: u32, f: u32, k: u32, m: u32) -> f32 {
  let L = latticeOf(l);
  let bu = f32(bundleF(l, 1u));
  let bv = f32(bundleF(l, 0u));
  let s = select((f32(k) - (bu - 0.5)) / bu, (f32(k) - 0.5 * (bu - 1.0)) / bu, f == 1u);
  let t = select((f32(m) - 0.5 * (bv - 1.0)) / bv, (f32(m) - (bv - 0.5)) / bv, f == 1u);
  let i0 = i32(floor(s));
  let j0 = i32(floor(t));
  let fu = s - f32(i0);
  let fv = t - f32(j0);
  let imax = i32(L.y) - select(2, 1, f == 1u);
  let jmax = i32(L.z) - select(1, 2, f == 1u);
  var num = 0.0;
  var den = 0.0;
  for (var dj = 0; dj < 2; dj++) {
    for (var di = 0; di < 2; di++) {
      let i = i0 + di;
      let j = j0 + dj;
      if (i < 0 || j < 0 || i > imax || j > jmax) { continue; }
      let e = strain[L.x + u32(j) * L.y + u32(i)][f];
      if (e >= 0.5 * NO_STRAIN) { continue; }
      let w = select(1.0 - fu, fu, di == 1) * select(1.0 - fv, fv, dj == 1);
      num += w * e;
      den += w;
    }
  }
  return select(NO_STRAIN, num / den, den > 1e-6);
}

// ---------------------------------------------------------------- local load sharing (yarnField.ts)

override SHARE_FRACTION: f32 = 0.6;
override SHARE_RUN: u32 = 6u;

@compute @workgroup_size(128)
fn sepSnapshot(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = gid.x;
  let total = fieldTotalY();
  if (w >= (total + 15u) / 16u || P.counts.z == 0u) { return; }
  var bits = 0u;
  for (var e = 0u; e < 16u; e++) {
    let c = 16u * w + e;
    if (c >= total) { break; }
    for (var f = 0u; f < 2u; f++) {
      if (damageAt(c, f) >= PULLED) { bits |= 1u << (2u * e + f); }
    }
  }
  pullBits[w] = bits;
}

fn sepAt(c: u32, f: u32) -> bool { return ((pullBits[c >> 4u] >> (2u * (c & 15u) + f)) & 1u) == 1u; }

// Load amplification from adjacent separated yarns. The receiving crossings' friction
// limits the additional force, independently of the yarn's rupture strength.
fn shareFactor(F: vec4<u32>, f: u32, k: u32, m: u32) -> f32 {
  let reach = i32(select(F.w & 0xFFFFu, F.w >> 16u, f == 1u));
  let along = i32(select(k, m, f == 1u));
  let lenAlong = i32(select(F.y, F.z, f == 1u));
  let across = i32(select(m, k, f == 1u));
  let lenAcross = i32(select(F.z, F.y, f == 1u));
  var runs = 0u;
  for (var side = 0; side < 2; side++) {
    let dir = select(-1, 1, side == 1);
    for (var d = 1; d <= i32(SHARE_RUN); d++) {
      let y = across + dir * d;
      if (y < 0 || y >= lenAcross) { break; }
      var broken = false;
      for (var a = max(0, along - reach); a <= min(lenAlong - 1, along + reach); a++) {
        let c = F.x + u32(select(y * i32(F.y) + a, a * i32(F.y) + y, f == 1u));
        if (sepAt(c, f)) {
          broken = true;
          break;
        }
      }
      if (!broken) { break; }
      runs++;
    }
  }
  return 1.0 + SHARE_FRACTION * f32(runs) * 0.5;
}

// All quantities are forces on one yarn (N), except the dimensionless amplification.
// Crimp makes tension nonlinear in strain: sharing strain would amplify the force
// too far and could exceed the force friction can transfer across the weave.
fn sharedYarnForce(tension: f32, factor: f32, transfer: f32) -> f32 {
  let base = max(0.0, tension);
  return base + min(base * max(0.0, factor - 1.0), max(0.0, transfer));
}

// Yarn q of the family-f span owned by node n (invocation n * MAX_BUNDLE_F + q): its crossings within
// the span are in series and carry the same tension, so it softens at its weakest crossing only (the
// greatest force / strength ratio), from strain interpolated across the bundle at the yarn and at the
// middle of the span, with force transfer bounded by crossing friction. One pass per family: within a
// pass every crossing's byte of the field word has a single writer.
const MAX_BUNDLE_F: u32 = 16u;

fn fieldUpdateYarn(gid: u32, f: u32) {
  let n = gid / MAX_BUNDLE_F;
  let q = gid % MAX_BUNDLE_F;
  if (n >= P.counts.x || P.counts.z == 0u) { return; }
  let ijl = nodes[n].ijl;
  let l = ijl >> 24u;
  let L = latticeOf(l);
  let i = ijl & 0xFFFu;
  let j = (ijl >> 12u) & 0xFFFu;
  let bu = bundleF(l, 1u);
  let bv = bundleF(l, 0u);
  let B = select(bv, bu, f == 1u);
  if (q >= B) { return; }
  let inside = select(j + 1u < L.z, i + 1u < L.y, f == 0u);
  if (!inside) { return; }
  let s = 2u * n + f;
  let sg = segs[s];
  if (!segActive(sg) || ((sg.cutMask >> q) & 1u) == 1u) { return; }
  let b = n + select(L.y, 1u, f == 0u);
  if (!cloth(n) || !cloth(b)) { return; }
  let F = FU[l];
  let Pn = select(bu, bv, f == 1u);
  let soft = sg.soft / sg.rest;
  // first crossing of the yarn in the span and the step along it
  var k0: u32;
  var m0: u32;
  if (f == 1u) {
    k0 = i * bu + q;
    m0 = j * bv + bv / 2u;
  } else {
    k0 = i * bu + bu / 2u;
    m0 = j * bv + q;
  }
  let dk = select(1u, 0u, f == 1u);
  let dm = select(0u, 1u, f == 1u);
  let eps = interpolatedStrain(l, f, k0 + (Pn >> 1u) * dk, m0 + (Pn >> 1u) * dm);
  if (eps >= 0.5 * NO_STRAIN || eps <= 0.0) { return; }
  let y = P.layers[l].yarn[f];
  let tension = axialTension(y, eps);
  // No crossing can soften even at the largest force amplification (exact early out).
  var minPeak = 1e30;
  for (var p = 0u; p < Pn; p++) {
    let c = F.x + (m0 + p * dm) * F.y + k0 + p * dk;
    minPeak = min(minPeak, strength[c][f] * f32(B) / areaAt(c, f));
  }
  if (tension * (1.0 + SHARE_FRACTION * f32(SHARE_RUN)) <= minPeak) { return; }
  // friction the crossings can pass to this yarn (shareCap): compaction of one crossing plus the wrap
  // force of the crossing yarn's tension at the middle of the span
  let g = 1u - f;
  let kM = k0 + (Pn >> 1u) * dk;
  let mM = m0 + (Pn >> 1u) * dm;
  let ec = interpolatedStrain(l, g, kM, mM);
  let Bg = select(bv, bu, g == 1u);
  let tCross = select(max(0.0, axialTension(P.layers[l].yarn[g], ec)) * areaAt(F.x + mM * F.y + kM, g) / f32(Bg), 0.0, ec >= 0.5 * NO_STRAIN);
  let reach = select(F.w & 0xFFFFu, F.w >> 16u, f == 1u);
  let transfer = f32(2u * reach + 1u) * P.layers[l].a.y * (nodes[n].n0 / f32(bu * bv) + P.layers[l].a.z * tCross);
  // Keep an existing softening site; otherwise use the greatest force / peak-force ratio.
  var best = F.x + m0 * F.y + k0;
  var bestScore = -1.0;
  var bestForce = 0.0;
  var soft0 = 0xFFFFFFFFu;
  var softCode = 0u;
  for (var p = 0u; p < Pn; p++) {
    let kk = k0 + p * dk;
    let mm = m0 + p * dm;
    let c = F.x + mm * F.y + kk;
    let force = sharedYarnForce(tension * areaAt(c, f) / f32(B), shareFactor(F, f, kk, mm), transfer);
    let score = force / strength[c][f];
    if (score > bestScore) {
      best = c;
      bestScore = score;
      bestForce = force;
    }
    let code = damageAt(c, f);
    if (code > softCode) {
      soft0 = c;
      softCode = code;
    }
  }
  if (soft0 != 0xFFFFFFFFu) {
    best = soft0;
    bestForce = sharedYarnForce(tension * areaAt(best, f) / f32(B), shareFactor(F, f, (best - F.x) % F.y, (best - F.x) / F.y), transfer);
  }
  let sharedStrain = strainAtTension(y, bestForce * f32(B) / areaAt(best, f));
  let d = yarnDamage(y, f32(B), areaAt(best, f), strength[best][f], soft, sharedStrain);
  let bestCode = select(min(u32(floor(d * 255.0)), PULLED - 1u), CUT, d >= 1.0);
  let word = field[best];
  let oldCode = (word >> (8u * f)) & 0xFFu;
  if (bestCode > oldCode) {
    field[best] = (word & ~(0xFFu << (8u * f))) | (bestCode << (8u * f));
    atomicStore(&fieldEvents[0], 1u);
    emitFracture(best, f, B, y, oldCode, bestCode, x[n].xyz);
  }
}

// Acoustic emission of fibre fracture (common.wgsl ACOUSTIC): the strain energy per unit length the
// yarn held at its peak, in the share of its fibres that broke between two damage codes.
fn emitFracture(c: u32, f: u32, B: u32, y: Yarn, c0: u32, c1: u32, at: vec3<f32>) {
  if (c0 >= PULLED) { return; }
  let area = areaAt(c, f);
  let u = axialEnergyDensity(y, strainAtTension(y, strength[c][f] * f32(B) / area)) * area / f32(B);
  let d1 = select(f32(c1) / 255.0, 1.0, c1 == CUT);
  let e = u32(round((d1 - f32(c0) / 255.0) * u * 1e5));
  let s = nearestSource(at, SRC);
  atomicAdd(&counters[acousticSlot(s, 0u)], e);
  let w = i32(c1 - c0);
  let mm = vec3<i32>(round(at * 1000.0)) * w;
  atomicAdd(&counters[acousticSlot(s, 1u)], bitcast<u32>(mm.x));
  atomicAdd(&counters[acousticSlot(s, 2u)], bitcast<u32>(mm.y));
  atomicAdd(&counters[acousticSlot(s, 3u)], bitcast<u32>(mm.z));
  atomicAdd(&counters[acousticSlot(s, 4u)], u32(w));
  if (c1 == CUT) { atomicAdd(&counters[acousticSlot(s, 5u)], 1u); }
}

@compute @workgroup_size(128)
fn fieldUpdatePick(@builtin(global_invocation_id) gid: vec3<u32>) { fieldUpdateYarn(gid.x, 0u); }

@compute @workgroup_size(128)
fn fieldUpdateWarp(@builtin(global_invocation_id) gid: vec3<u32>) { fieldUpdateYarn(gid.x, 1u); }

// ---------------------------------------------------------------- pull-out (yarnField.ts pullOut)

fn fieldTotalY() -> u32 {
  let F = FU[P.counts.y - 1u];
  return F.x + F.y * F.z;
}

// Pull-out of free yarn ends (yarnField.ts pullOut, recoilLength): a crossing still interlaced leaves
// the weave once the nearest cut along its yarn (through crossings already pulled out) lies within the
// end's shear-lag retraction (T eps - W) / f at the local strain, its tension capped at the yarn's peak.
const RECOIL_MAX: i32 = 12;

fn breakDistance(F: vec4<u32>, f: u32, k: u32, m: u32) -> i32 {
  let pos = i32(select(m, k, f == 0u));
  let len = i32(select(F.z, F.y, f == 0u));
  let stride = i32(select(F.y, 1u, f == 0u));
  let c = i32(F.x + m * F.y + k);
  var best = -1;
  for (var side = 0; side < 2; side++) {
    let dir = select(-1, 1, side == 1);
    for (var d = 1; d <= RECOIL_MAX; d++) {
      let p = pos + dir * d;
      if (p < 0 || p >= len) { break; }
      let code = damageAt(u32(c + dir * d * stride), f);
      if (code == CUT) {
        if (best < 0 || d < best) { best = d; }
        break;
      }
      if (code != PULLED) { break; }
    }
  }
  return best;
}

fn pullsOut(l: u32, F: vec4<u32>, c: u32, f: u32, k: u32, m: u32) -> bool {
  let d = breakDistance(F, f, k, m);
  if (d < 0) { return false; }
  let eps = interpolatedStrain(l, f, k, m);
  if (eps >= 0.5 * NO_STRAIN || eps <= 0.0) { return false; }
  let mat = P.layers[l];
  let g = 1u - f;
  let ec = interpolatedStrain(l, g, k, m);
  let bu = bundleF(l, 1u);
  let bv = bundleF(l, 0u);
  let Bg = select(bv, bu, g == 1u);
  let tCross = select(max(0.0, axialTension(mat.yarn[g], ec)) * areaAt(c, g) / f32(Bg), 0.0, ec >= 0.5 * NO_STRAIN);
  let L = latticeOf(l);
  let n = L.x + min(L.z - 1u, m / bv) * L.y + min(L.y - 1u, k / bu);
  // pitch of the individual weave along the yarn: the bundled pitch over the crossing family's count
  let pitch = select(mat.a.w / f32(bu), mat.b.x / f32(bv), f == 1u);
  let B = select(bv, bu, f == 1u);
  let y = mat.yarn[f];
  // no yarn carries more than its own peak tension (the bundle strain near a crack includes its opening)
  let share = areaAt(c, f) / f32(B);
  let e = min(eps, strainAtTension(y, strength[c][f] / share));
  let comp = share * (axialTension(y, e) * e - axialEnergyDensity(y, e));
  let fric = mat.a.y * (nodes[n].n0 / f32(bu * bv) + mat.a.z * tCross);
  return comp * pitch >= (f32(d) - 0.5) * pitch * fric;
}

// One invocation per 16 crossings: which ends pull out of their next crossing this substep.
@compute @workgroup_size(128)
fn pullMark(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = gid.x;
  let total = fieldTotalY();
  if (w >= (total + 15u) / 16u || P.counts.z == 0u) { return; }
  var bits = 0u;
  for (var e = 0u; e < 16u; e++) {
    let c = 16u * w + e;
    if (c >= total) { break; }
    var l = 0u;
    for (var q = 1u; q < P.counts.y; q++) {
      if (c >= FU[q].x) { l = q; }
    }
    let F = FU[l];
    let k = (c - F.x) % F.y;
    let m = (c - F.x) / F.y;
    for (var f = 0u; f < 2u; f++) {
      if (damageAt(c, f) >= PULLED) { continue; }
      if (pullsOut(l, F, c, f, k, m)) { bits |= 1u << (2u * e + f); }
    }
  }
  pullBits[w] = bits;
}

@compute @workgroup_size(128)
fn pullApply(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = gid.x;
  let total = fieldTotalY();
  if (w >= (total + 15u) / 16u || P.counts.z == 0u) { return; }
  let bits = pullBits[w];
  if (bits == 0u) { return; }
  for (var e = 0u; e < 16u; e++) {
    let c = 16u * w + e;
    if (c >= total) { break; }
    var word = field[c];
    for (var f = 0u; f < 2u; f++) {
      if (((bits >> (2u * e + f)) & 1u) == 1u) { word = (word & ~(0xFFu << (8u * f))) | (PULLED << (8u * f)); }
    }
    field[c] = word;
  }
  atomicStore(&fieldEvents[0], 1u);
}

fn coupleSpan(a: u32, f: u32) {
  if (a >= P.counts.x || P.counts.z == 0u) { return; }
  let s = 2u * a + f;
  var sg = segs[s];
  let slipped = (sg.flags & SEG_SLIPPED) != 0u;
  if (!slipped && !segActive(sg)) { return; }
  let ijl = nodes[a].ijl;
  let l = ijl >> 24u;
  let L = latticeOf(l);
  let i = ijl & 0xFFFu;
  let j = (ijl >> 12u) & 0xFFFu;
  let F = FU[l];
  let bu = bundleF(l, 1u);
  let bv = bundleF(l, 0u);
  if (slipped) {
    partYarns(F, i, j, f, bu, bv, select(1, 0, sg.failSite < 0.5));
    segs[s].flags = sg.flags & ~SEG_SLIPPED;
    return;
  }
  let b = a + select(L.y, 1u, f == 0u);
  if (!cloth(a) || !cloth(b)) { return; }
  let B = select(bv, bu, f == 1u);
  let Pn = select(bu, bv, f == 1u);
  var sum = 0.0;
  var mask = 0u;
  var site = 0.0;
  for (var q = 0u; q < B; q++) {
    var dmax = 0u;
    var first = -1;
    var compliance = 0.0;
    for (var p = 0u; p < Pn; p++) {
      let c = spanCrossingF(F, i, j, f, bu, bv, q, p);
      let d = damageAt(c, f);
      compliance += 1.0 / areaAt(c, f);
      dmax = max(dmax, d);
      if (d >= PULLED && first < 0) { first = i32(p); }
    }
    sum += select(1.0 - f32(dmax) / 255.0, 0.0, dmax >= PULLED) * (f32(Pn) / compliance);
    if (dmax >= PULLED) {
      mask |= 1u << q;
      site += (f32(first) + 0.5) / f32(Pn);
    }
  }
  sg.intact = sum / f32(B);
  sg.cutMask = mask;
  let all = select((1u << B) - 1u, 0xFFFFFFFFu, B >= 32u);
  if (mask == all) {
    let phi = site / f32(B);
    sg.flags = sg.flags | SEG_BROKEN;
    sg.failSite = phi;
    tails[4u * a + 2u * f + 1u] += sg.rest * phi;
    tails[4u * b + 2u * f] += sg.rest * (1.0 - phi);
    atomicAdd(&counters[0], 1u);
    partYarns(F, i, j, f, bu, bv, -1);
  }
  segs[s] = sg;
}

// A separated span's yarns part from the other side's weave (yarnField.ts partSpanYarns). A ruptured
// span's yarn belongs, up to its first separation, to the span's owner a and beyond it to b (their
// tails took its rest length; the renderer draws it so); a span whose yarns slid out of the crossings
// at one end (slipEnd 0 at a, 1 at b) belongs wholly to the other. The span's first half of crossings
// is interlaced with yarns of a's column (row, for a v-span), its second half with b's: where the
// yarn's side and the crossing's disagree, the crossing would still tie a to b after the lattice let
// them part. The yarn's end slides out there (the crossing yarn has no free end near): pulled out.
fn partYarns(F: vec4<u32>, i: u32, j: u32, f: u32, bu: u32, bv: u32, slipEnd: i32) {
  let B = select(bv, bu, f == 1u);
  let Pn = select(bu, bv, f == 1u);
  // crossings p < half are interlaced with a's yarns
  let half = Pn - Pn / 2u;
  for (var q = 0u; q < B; q++) {
    var ofA = slipEnd != 0;
    for (var p = 0u; p < Pn; p++) {
      let c = spanCrossingF(F, i, j, f, bu, bv, q, p);
      let word = field[c];
      if (((word >> (8u * f)) & 0xFFu) >= PULLED) {
        if (slipEnd < 0) { ofA = false; }
        continue;
      }
      if (ofA != (p < half)) {
        field[c] = (word & ~(0xFFu << (8u * f))) | (PULLED << (8u * f));
        atomicStore(&fieldEvents[0], 1u);
      }
    }
  }
}

// Crossing of yarn q of span (i, j, f) at its p-th crossing from the owner (yarnField.ts spanCrossing).
fn spanCrossingF(F: vec4<u32>, i: u32, j: u32, f: u32, bu: u32, bv: u32, q: u32, p: u32) -> u32 {
  if (f == 1u) { return F.x + (j * bv + bv / 2u + p) * F.y + i * bu + q; }
  return F.x + (j * bv + q) * F.y + i * bu + bu / 2u + p;
}

// One pass per family: a crossing's word is then written by the one span of that family holding it.
@compute @workgroup_size(128)
fn coupleU(@builtin(global_invocation_id) gid: vec3<u32>) { coupleSpan(gid.x, 0u); }

@compute @workgroup_size(128)
fn coupleV(@builtin(global_invocation_id) gid: vec3<u32>) { coupleSpan(gid.x, 1u); }
`;
function st(e) {
  let t = 0;
  return {
    layers: e.map((e) => {
      let n = { offset: t, K: e.nx * e.bundle[0], M: e.ny * e.bundle[1], bu: e.bundle[0], bv: e.bundle[1] };
      return ((t += n.K * n.M), n);
    }),
    count: t,
  };
}
function ct(e, t) {
  return t === 1 ? e.bu : e.bv;
}
function lt(e) {
  return Math.max(1, Math.min(255, Math.round(e * 255)));
}
function ut(e) {
  return Math.max(0.02, e / 255);
}
function dt(e, t, n, r, i, a) {
  return r === 1
    ? e.offset + (n * e.bv + Math.floor(e.bv / 2) + a) * e.K + t * e.bu + i
    : e.offset + (n * e.bv + i) * e.K + t * e.bu + Math.floor(e.bu / 2) + a;
}
function ft(e, t) {
  return t === 1 ? e.bv : e.bu;
}
const pt = { fraction: 0.6, maxRun: 6, reach: 0.0012 };
function mt(e, t) {
  return Math.max(1, Math.round(pt.reach / (t === 1 ? e.pitchV : e.pitchU)));
}
function ht(e, t, n, r, i, a = -1) {
  let o = ft(e, i),
    s = o - Math.floor(o / 2);
  for (let c = 0; c < ct(e, i); c++) {
    let l = a !== 0;
    for (let u = 0; u < o; u++) {
      let o = 2 * dt(e, n, r, i, c, u) + i;
      t[o] >= 254 ? a < 0 && (l = !1) : l !== u < s && (t[o] = 254);
    }
  }
}
function gt(e, t, n, r, i, a, o, s) {
  let c = 0;
  return (
    e.forEach((e, l) => {
      let u = t[l];
      for (let t = 0; t < e.ny; t++)
        for (let l = 0; l < e.nx; l++)
          for (let d = 0; d < 2; d++) {
            if ((d === 0 && l >= e.nx - 1) || (d === 1 && t >= e.ny - 1)) continue;
            let f = e.nodeOffset + t * e.nx + l,
              p = 2 * f + d;
            if (i.segFlags[p] & s) {
              (ht(u, r, l, t, d, i.failSite[p] < 0.5 ? 0 : 1), (i.segFlags[p] &= ~s));
              continue;
            }
            if (!a(p)) continue;
            let m = ct(u, d),
              h = ft(u, d),
              g = 0,
              _ = 0,
              v = 0;
            for (let e = 0; e < m; e++) {
              let i = 0,
                a = -1,
                o = 0;
              for (let s = 0; s < h; s++) {
                let c = dt(u, l, t, d, e, s),
                  f = r[2 * c + d];
                (f > i && (i = f), f >= 254 && a < 0 && (a = s), (o += 1 / ut(n[2 * c + d])));
              }
              ((g += (i >= 254 ? 0 : 1 - i / 255) * (h / o)), i >= 254 && ((_ |= 1 << e), (v += (a + 0.5) / h)));
            }
            if (((i.intact[p] = g / m), (i.cutMask[p] = _ >>> 0), _ === (m === 32 ? 4294967295 : (1 << m) - 1) >>> 0)) {
              let n = v / m,
                a = i.restLength[p],
                s = d === 0 ? f + 1 : f + e.nx;
              ((i.segFlags[p] |= o),
                (i.failSite[p] = n),
                (i.tails[4 * f + 2 * d + 1] += a * n),
                (i.tails[4 * s + 2 * d] += a * (1 - n)),
                c++,
                ht(u, r, l, t, d));
            }
          }
    }),
    c
  );
}
new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
const _t = { fracture: 0, pan: 1, cuts: 2 };
function vt(e) {
  return 1 + e * 3;
}
function yt(e, t, n) {
  let r = t + n * 6,
    i = e[r + 4];
  if (i === 0) return null;
  let a = new Int32Array(e.buffer, e.byteOffset + 4 * (r + 1), 3);
  return [a[0] / (1e3 * i), a[1] / (1e3 * i), a[2] / (1e3 * i)];
}
function bt(e, t, n, r, i, a) {
  n[r] = i;
  for (let i = 0; i < 4; i++) {
    let o = t + i * 6,
      s = r + vt(i);
    ((n[s + _t.fracture] = e[o] * 1e-5), (n[s + _t.pan] = a[i]), (n[s + _t.cuts] = e[o + 5]));
  }
}
var xt = `// Adaptive Newton gate (see GpuSolver.encodeSubstep).

@group(0) @binding(0) var<uniform> Mode: vec4<u32>; // x = Newton iteration just completed
@group(0) @binding(1) var<storage, read> counters: array<u32>; // [4 + k] largest update of iteration k (f32 bits)
@group(0) @binding(2) var<storage, read_write> gateArgs: array<u32>;
@group(0) @binding(3) var<storage, read> gateSizes: array<u32>; // [count, tolerance bits, sizes...]

// After Newton iteration Mode.x: enable the next (optional) iteration only while this one still moved
// some node by more than the tolerance. Writes indirect dispatch arguments for every dispatch size of
// a Newton iteration (zero workgroups when converged); a skipped iteration leaves its slot at 0, so
// every later optional iteration stays off.
@compute @workgroup_size(64)
fn gate(@builtin(global_invocation_id) gid: vec3<u32>) {
  let count = gateSizes[0];
  let k = gid.x;
  if (k >= count) { return; }
  let moved = bitcast<f32>(counters[4u + Mode.x]);
  let on = moved > bitcast<f32>(gateSizes[1]);
  let base = 3u * count * (Mode.x + 1u);
  gateArgs[base + 3u * k] = select(0u, gateSizes[2u + k], on);
  gateArgs[base + 3u * k + 1u] = 1u;
  gateArgs[base + 3u * k + 2u] = 1u;
}

`,
  St = `// Newton line search: change of the incremental potential along the Newton direction (delta) for
// step lengths alpha in {1, 1/2, 1/4, 1/8}, as sums of per-term differences (stable in f32: no
// subtraction of large totals), each with a rounding scale (the sum of the magnitudes of its terms)
// that decides whether a difference is conclusive (lineChoose). Each node owns its inertia/external/drag terms, its "+" spans, the
// bending triples centred on it and the shear diagonals of the cell it is the lower-left corner of.
// Mirrors the reference line search (reference/newtonMultigrid.ts) up to the axial quadrature.
// A detached piece's nodes step along the rotation of the direction's rigid part (rigid_apply.wgsl
// pieceStep w) rather than its tangent: alpha delta + rotationCurve(alpha w, r) (common.wgsl); once
// alpha is chosen, curveApply bends delta so that newtonApply moves them so.

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(2) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> dx: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> pred: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> segs: array<Seg>;
@group(0) @binding(6) var<storage, read_write> delta: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read> ext: array<vec4<f32>>;
@group(0) @binding(8) var<storage, read_write> partial4: array<vec4<f32>>;
// [3] receives the chosen step length (f32 bits); [12] counts directions along which no evaluated
// step decreased the potential
@group(0) @binding(9) var<storage, read_write> counters: array<u32>;
// 2 per node of a detached piece (rigid_spin.wgsl curveSet): its piece's rigid rotation in the
// direction (xyz; w = 1 where set), and its arm from the piece's centroid at the iterate
@group(0) @binding(11) var<storage, read> curveRef: array<vec4<f32>>;

const GROUPS: u32 = 256u;
var<workgroup> red: array<vec4<f32>, 256>;
var<workgroup> redM: array<vec4<f32>, 256>;
// per-node energy changes and their magnitude sums (rounding scale) for the four step lengths
var<private> acc: vec4<f32>;
var<private> mag: vec4<f32>;

fn add4(v: vec4<f32>) {
  acc += v;
  mag += abs(v);
}
fn add1(k: u32, v: f32) {
  acc[k] += v;
  mag[k] += abs(v);
}

fn lat(l: u32) -> vec4<u32> { return P.layers[l].lattice; }

fn nodeAt(l: u32, i: i32, j: i32) -> i32 {
  let L = lat(l);
  if (i < 0 || j < 0 || i >= i32(L.y) || j >= i32(L.z)) { return -1; }
  return i32(L.x) + j * i32(L.y) + i;
}

// mounted or retired (detached pieces stay in the solve, state.wgsl)
fn pinned(n: u32) -> bool { return (nodes[n].flags & NODE_PINNED) != 0u || x[n].w > 1.5; }

fn spanOn(owner: i32, f: u32) -> bool {
  if (owner < 0) { return false; }
  return segActive(segs[2u * u32(owner) + f]);
}

// direction (pinned nodes never move)
fn dir(n: u32) -> vec3<f32> { return select(delta[n].xyz, vec3<f32>(0.0), pinned(n)); }

const ALPHA: vec4<f32> = vec4<f32>(1.0, 0.5, 0.25, 0.125);

// Node n's step at the four step lengths.
fn steps(n: u32) -> array<vec3<f32>, 4> {
  let d = dir(n);
  var s = array<vec3<f32>, 4>(ALPHA.x * d, ALPHA.y * d, ALPHA.z * d, ALPHA.w * d);
  let cw = curveRef[2u * n];
  if (cw.w < 0.5 || pinned(n)) { return s; }
  let r = curveRef[2u * n + 1u].xyz;
  for (var k = 0u; k < 4u; k++) { s[k] += rotationCurve(ALPHA[k] * cw.xyz, r); }
  return s;
}

// Change of a quadratic node term (gradient g, Hessian H at this iterate) over the steps s.
fn quad(g: vec3<f32>, H: Sym, s: array<vec3<f32>, 4>) {
  for (var k = 0u; k < 4u; k++) {
    add1(k, dot(g, s[k]));
    add1(k, 0.5 * dot(s[k], symMul(H, s[k])));
  }
}

// |e0 + s| - |e0| computed without cancellation, and |e0 + s|.
fn lenChange(e0: vec3<f32>, s: vec3<f32>, l0: f32) -> vec2<f32> {
  let la = length(e0 + s);
  return vec2<f32>((2.0 * dot(e0, s) + dot(s, s)) / max(la + l0, 1e-12), la);
}

fn nodeDelta(n: u32) {
  acc = vec4<f32>(0.0);
  mag = vec4<f32>(0.0);
  let st = nodes[n];
  let i = i32(st.ijl & 0xFFFu);
  let j = i32((st.ijl >> 12u) & 0xFFFu);
  let l = st.ijl >> 24u;
  let mat = P.layers[l];
  let h = P.hg.x;
  let d0 = dx[n].xyz;
  let stepN = steps(n);
  // a mounted node has no inertial, external or drag terms, but the spans, bending triples and shear
  // cells it owns still act on their free nodes (the gradient includes them)
  if (!pinned(n)) {
    // inertia
    let w = st.mass / (h * h);
    quad(w * (d0 - pred[n].xyz), symId(w), stepN);
    // external terms (grip, contact): quadratic model from their gradient and Hessian at this iterate
    let e0 = ext[3u * n];
    let e1 = ext[3u * n + 1u];
    let e2 = ext[3u * n + 2u];
    let He = Sym(vec3<f32>(e1.x, e1.w, e2.y), vec3<f32>(e1.y, e1.z, e2.x));
    quad(e0.xyz, He, stepN);
    // floor contact (common.wgsl): as the other contacts, its quadratic model at this iterate. The
    // cubic has no curvature where contact begins, so a direction from an iterate just outside it runs
    // deep into the floor; the bound (step.wgsl floorBound) keeps the step where the model holds, and
    // the exact cubic along the unbounded direction would reject it.
    if (P.floorAux.y > 0.5) {
      let reach = 0.5 * mat.b.w + P.floor.y;
      let s0 = reach - (x[n].z + d0.z - P.floor.x);
      if (s0 > 0.0) {
        let kc = P.floor.z;
        let lam = kc * s0 * s0 / reach;
        let kf = P.floor.w * lam / max(length(d0.xy), P.floorAux.x * h);
        quad(vec3<f32>(kf * d0.xy, -lam), Sym(vec3<f32>(kf, kf, 2.0 * kc * s0 / reach), vec3<f32>(0.0)), stepN);
      }
    }
    // air drag (drag.wgsl): quadratic with a fixed block
    let Dd = airDragBlock(n);
    quad(symMul(Dd, d0), Dd, stepN);
  }
  for (var f = 0u; f < 2u; f++) {
    let du = select(0, 1, f == 0u);
    let dv = select(0, 1, f == 1u);
    let y = mat.yarn[f];
    // the span n -> next (axial: trapezoid of the damaged force law; viscosity exact)
    let next = nodeAt(l, i + du, j + dv);
    if (next >= 0 && spanOn(i32(n), f)) {
      let b = u32(next);
      let s = segs[2u * n + f];
      let L = s.rest;
      let en = x[b].xyz - x[n].xyz;
      let ec = en + dx[b].xyz - d0;
      let stepB = steps(b);
      let l0 = length(ec);
      let ln = length(en);
      let T0 = spanResponse(y, s, l0 / L - 1.0).x;
      let c = y.axialVisc / (L * h);
      for (var k = 0u; k < 4u; k++) {
        let r = lenChange(ec, stepB[k] - stepN[k], l0);
        let Ta = spanResponse(y, s, r.y / L - 1.0).x;
        add1(k, 0.5 * (T0 + Ta) * r.x);
        add1(k, 0.5 * c * r.x * (r.y + l0 - 2.0 * ln));
      }
    }
    // bending triple centred at n: (prev, n, next)
    let prev = nodeAt(l, i - du, j - dv);
    if (prev >= 0 && next >= 0 && spanOn(prev, f) && spanOn(i32(n), f)) {
      let a = u32(prev);
      let c = u32(next);
      let sa = segs[2u * a + f];
      let sn = segs[2u * n + f];
      let geo = bendGeometry(sa.rest, sn.rest);
      let ke = y.bendRigidity * bendScale(sa.intact, sn.intact, sa.cutMask, sn.cutMask, u32(y.yarnsPerSpan)) * geo.z;
      let kd = ke * y.bendVisc / h;
      let rn = geo.x * x[a].xyz - 2.0 * x[n].xyz + geo.y * x[c].xyz;
      let r0 = rn + geo.x * dx[a].xyz - 2.0 * d0 + geo.y * dx[c].xyz;
      let stepA = steps(a);
      let stepC = steps(c);
      // elastic: exact change of the fold-stiffening energy; viscous: exact change of 1/2 kd (|r| - |rn|)^2
      // (assemble.wgsl triple), (|r| - |r0|) (|r| + |r0| - 2 |rn|) without cancellation
      let q0 = dot(r0, r0);
      let l0 = sqrt(q0);
      let lrn = length(rn);
      let ab = geo.w;
      for (var k = 0u; k < 4u; k++) {
        let dr = geo.x * stepA[k] - 2.0 * stepN[k] + geo.y * stepC[k];
        let dq = 2.0 * dot(r0, dr) + dot(dr, dr);
        add1(k, 0.5 * ke * bendPsiDelta(q0, q0 + dq, dq, ab));
        let rl = lenChange(r0, dr, l0);
        add1(k, 0.5 * kd * rl.x * (rl.y + l0 - 2.0 * lrn));
      }
    }
  }
  // shear diagonals of the cell with lower-left corner n
  let r = nodeAt(l, i + 1, j);
  let t = nodeAt(l, i, j + 1);
  let rt = nodeAt(l, i + 1, j + 1);
  if (r >= 0 && t >= 0) {
    // a diagonal acts while one of its triangles is intact (diagActive in assemble.wgsl)
    let cu = spanOn(i32(n), 0u);
    let cv = spanOn(i32(n), 1u);
    let rv = spanOn(r, 1u);
    let tu = spanOn(t, 0u);
    let on = array<bool, 2>((cu && rv) || (cv && tu), (cu && cv) || (rv && tu));
    let s0 = segs[2u * n].rest;
    let s1 = segs[2u * n + 1u].rest;
    let Ld = sqrt(s0 * s0 + s1 * s1);
    let a = cellArea(select(0.0, segs[2u * n].intact, cu), select(0.0, segs[2u * u32(t)].intact, tu), select(0.0, segs[2u * n + 1u].intact, cv), select(0.0, segs[2u * u32(r) + 1u].intact, rv));
    let ks = mat.a.x * st.n0 / mat.b.z;
    let jam = shearJam(a);
    var pa = array<u32, 2>(n, u32(r));
    var pb = array<u32, 2>(u32(rt), u32(t));
    for (var q = 0; q < 2; q++) {
      if (!on[q]) { continue; }
      let p = pa[q];
      let o = pb[q];
      let ec = (x[o].xyz + dx[o].xyz) - (x[p].xyz + dx[p].xyz);
      let stepO = steps(o);
      let stepP = steps(p);
      let l0 = length(ec);
      let f0 = shearLaw(ks, jam, Ld, l0).x;
      for (var k = 0u; k < 4u; k++) {
        let rr = lenChange(ec, stepO[k] - stepP[k], l0);
        // trapezoid of the shear force law (exact on its linear branch)
        add1(k, 0.5 * (f0 + shearLaw(ks, jam, Ld, rr.y).x) * rr.x);
      }
    }
  }
}

@compute @workgroup_size(256)
fn energyDelta(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wg: vec3<u32>) {
  var sum = vec4<f32>(0.0);
  var sumM = vec4<f32>(0.0);
  for (var n = gid.x; n < P.counts.x; n += 256u * GROUPS) {
    nodeDelta(n);
    // firewall: one non-finite node must not decide the global step length
    if (finite3(acc.xyz) && finite1(acc.w) && finite3(mag.xyz) && finite1(mag.w)) {
      sum += acc;
      sumM += mag;
    }
  }
  red[lid] = sum;
  redM[lid] = sumM;
  workgroupBarrier();
  var s = 128u;
  loop {
    if (s == 0u) { break; }
    if (lid < s) {
      red[lid] += red[lid + s];
      redM[lid] += redM[lid + s];
    }
    workgroupBarrier();
    s = s / 2u;
  }
  if (lid == 0u) {
    partial4[2u * wg.x] = red[0];
    partial4[2u * wg.x + 1u] = redM[0];
  }
}

// Relative rounding bound of an energy change: f32 per-term rounding accumulated over the
// reduction tree, as a multiple of the sum of the terms' magnitudes (newtonMultigrid.ts LINE_NOISE).
const LINE_NOISE: f32 = 4e-6;

// Step length from the evaluated changes (newtonMultigrid.ts chooseStep): the lowest potential if it is
// a conclusive decrease; no step if every evaluated step conclusively increases the potential (a
// non-descent direction, counted); otherwise the changes are within rounding (a converged iterate) and
// the full Newton step is taken. No unevaluated step is ever taken on a conclusive increase.
@compute @workgroup_size(256)
fn lineChoose(@builtin(local_invocation_index) lid: u32) {
  red[lid] = partial4[2u * lid];
  redM[lid] = partial4[2u * lid + 1u];
  workgroupBarrier();
  var s = 128u;
  loop {
    if (s == 0u) { break; }
    if (lid < s) {
      red[lid] += red[lid + s];
      redM[lid] += redM[lid + s];
    }
    workgroupBarrier();
    s = s / 2u;
  }
  if (lid == 0u) {
    let e = red[0];
    let tol = LINE_NOISE * redM[0];
    var best = 0u;
    for (var k = 1u; k < 4u; k++) {
      if (e[k] < e[best]) { best = k; }
    }
    var a = 1.0;
    if (e[best] < -tol[best]) {
      a = ALPHA[best];
    } else if (all(e > tol)) {
      a = 0.0;
      counters[12] += 1u;
    }
    counters[3] = bitcast<u32>(a);
  }
}

// Once lineChoose set alpha (only while detached pieces exist): delta += rotationCurve(alpha w, r) / alpha
// on their nodes, so that newtonApply (alpha delta) moves them along the path evaluated above.
@compute @workgroup_size(128)
fn curveApply(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || pinned(n)) { return; }
  let cw = curveRef[2u * n];
  let alpha = bitcast<f32>(counters[3]);
  if (cw.w < 0.5 || !(alpha > 0.0)) { return; }
  delta[n] = vec4<f32>(delta[n].xyz + rotationCurve(alpha * cw.xyz, curveRef[2u * n + 1u].xyz) / alpha, delta[n].w);
}
`,
  Ct = `// Implicit air drag of a node: energy 1/2 dx^T D dx per substep with D built from the accepted state
// (a fixed quadratic within the substep, exact for Newton). Requires module-scope \`P: SimParams\`,
// \`nodes\`, \`x\` and \`segs\`. Mirrors ReferenceSolver.airDrag.
//
// Geometry comes from the node's connected spans only: a sheet node (spans in both families) drags
// along its surface normal; a strand node (one family left: a thread or a one-cell strip) drags on
// all motion across the strand; an isolated node drags isotropically. Using lattice neighbours that
// a tear has disconnected gave hanging strips a meaningless normal, and they swung undamped.

fn dragSpanOn(owner: i32, f: u32) -> bool {
  if (owner < 0) { return false; }
  return segActive(segs[2u * u32(owner) + f]);
}

fn dragNodeAt(l: u32, i: i32, j: i32) -> i32 {
  let L = P.layers[l].lattice;
  if (i < 0 || j < 0 || i >= i32(L.y) || j >= i32(L.z)) { return -1; }
  return i32(L.x) + j * i32(L.y) + i;
}

// Chord through the node's connected neighbours along family f (zero without any).
fn dragTangent(n: u32, l: u32, i: i32, j: i32, f: u32) -> vec3<f32> {
  let du = select(0, 1, f == 0u);
  let dv = select(0, 1, f == 1u);
  let prev = dragNodeAt(l, i - du, j - dv);
  let next = dragNodeAt(l, i + du, j + dv);
  var a = x[n].xyz;
  var b = x[n].xyz;
  if (dragSpanOn(prev, f)) { a = x[u32(prev)].xyz; }
  if (next >= 0 && dragSpanOn(i32(n), f)) { b = x[u32(next)].xyz; }
  return b - a;
}

fn airDragBlock(n: u32) -> Sym {
  let st = nodes[n];
  let l = st.ijl >> 24u;
  let mat = P.layers[l];
  if (mat.b.y <= 0.0) { return symZero(); }
  let i = i32(st.ijl & 0xFFFu);
  let j = i32((st.ijl >> 12u) & 0xFFFu);
  // c A / h with A the node's share of cloth area
  let k = mat.b.y * mat.a.w * mat.b.x / P.hg.x;
  let tu = dragTangent(n, l, i, j, 0u);
  let tv = dragTangent(n, l, i, j, 1u);
  let lu = length(tu);
  let lv = length(tv);
  if (lu > 0.0 && lv > 0.0) {
    let c = cross(tu, tv);
    let lc = length(c);
    if (lc > 1e-3 * lu * lv) { return axialBlock(k, 0.0, c / lc); }
  }
  if (lu > 0.0 || lv > 0.0) {
    let t = select(tv / lv, tu / lu, lu >= lv);
    return axialBlock(0.0, k, t);
  }
  return symId(k);
}
`,
  wt = `// Rigid modes of detached pieces (solver.ts encodeRigid), once per Newton iteration after assembly.
//
// A detached piece's rigid motion is resisted by its inertia, drag and contact alone, against yarn
// couplings ~1e5 times stiffer: the near-null modes the multigrid hierarchy does not carry (a piece
// keeps few coarse unknowns and the coarsest level is only smoothed). Two PCG iterations resolved 4 %
// of a falling piece's gravity step, and pieces hovered. Each piece's six rigid modes Z (translation,
// rotation about its centroid) are added to the preconditioner as an exact coarse space: z = M r +
// Z E^-1 Z^T r (rigid_apply.wgsl), with E = Z^T A Z, the Newton operator on the rigid modes. Summed as
// is, A's yarn couplings would cancel in f32 to the inertia 1e5 times smaller; instead each term enters
// with what it puts on a rigid motion (assemble.wgsl rigidK): the external blocks (inertia, drag,
// contact, active bounds) fully, the internal terms only on rotation, as their tension's geometric
// stiffness (a spinning piece's spans, stretched by the predictor, resist rotation 1e4 times more
// than its inertia: without them the rotation correction swamped the step).
//
// Per piece p (one workgroup at a time): the mass centroid at the iterate, then E and its inverse.

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(2) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> dx: array<vec4<f32>>;
// per detached node: external block and internal rotation stiffness (assemble.wgsl)
@group(0) @binding(4) var<storage, read> rigidK: array<vec4<f32>>;
// [0] piece count, [1 + p] first entry of piece p in pieceNodes, [1 + count] their total
@group(0) @binding(5) var<storage, read> pieceStart: array<u32>;
@group(0) @binding(6) var<storage, read> pieceNodes: array<u32>;
// per piece RIGID_FRAME vec4: centroid (xyz, w = 1 if valid), then E^-1 row-major (36 floats)
@group(0) @binding(7) var<storage, read_write> pieceFrame: array<vec4<f32>>;

const RIGID_FRAME: u32 = 10u;
const WG: u32 = 64u;
var<workgroup> redM: array<vec4<f32>, 64>;
var<workgroup> redE: array<array<f32, 21>, 64>;
var<workgroup> count: u32;

fn pos(n: u32) -> vec3<f32> { return x[n].xyz + dx[n].xyz; }
fn inScene(n: u32) -> bool { return x[n].w < 1.5; }

// Node n's external block and its internal terms' rotation stiffness (assemble.wgsl rigidK).
fn externalBlock(n: u32) -> mat3x3<f32> {
  let a = rigidK[3u * n];
  let b = rigidK[3u * n + 1u];
  return symMat(Sym(vec3<f32>(a.x, a.w, b.y), vec3<f32>(a.y, a.z, b.x)));
}
fn rotationBlock(n: u32) -> mat3x3<f32> {
  let b = rigidK[3u * n + 1u];
  let c = rigidK[3u * n + 2u];
  return symMat(Sym(vec3<f32>(b.z, c.y, c.w), vec3<f32>(b.w, c.x, c.z)));
}

// Upper triangle index of (i, j), i <= j, in a symmetric 6 x 6.
fn tri(i: u32, j: u32) -> u32 { return i * 6u - (i * (i + 1u)) / 2u + j; }

@compute @workgroup_size(64)
fn rigidFrame(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) t: u32, @builtin(num_workgroups) ng: vec3<u32>) {
  if (t == 0u) { count = pieceStart[0]; }
  let pieces = workgroupUniformLoad(&count);
  for (var p = wg.x; p < pieces; p += ng.x) {
    let a = pieceStart[1u + p];
    let b = pieceStart[2u + p];
    // mass centroid
    var m = vec4<f32>(0.0);
    for (var k = a + t; k < b; k += WG) {
      let n = pieceNodes[k];
      if (inScene(n)) { m += vec4<f32>(nodes[n].mass * pos(n), nodes[n].mass); }
    }
    redM[t] = m;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s /= 2u) {
      if (t < s) { redM[t] += redM[t + s]; }
      workgroupBarrier();
    }
    let tot = redM[0];
    workgroupBarrier();
    let c = select(vec3<f32>(0.0), tot.xyz / tot.w, tot.w > 0.0);
    // E = sum Z^T K Z, Z = [I, -[r]x] (a rigid displacement t + w x r)
    var e: array<f32, 21>;
    for (var q = 0u; q < 21u; q++) { e[q] = 0.0; }
    for (var k = a + t; k < b; k += WG) {
      let n = pieceNodes[k];
      if (!inScene(n)) { continue; }
      let K = externalBlock(n);
      let r = pos(n) - c;
      // columns of Z: e_x, e_y, e_z, then -[r]x e_i = e_i x r
      var Z: array<vec3<f32>, 6>;
      Z[0] = vec3<f32>(1.0, 0.0, 0.0);
      Z[1] = vec3<f32>(0.0, 1.0, 0.0);
      Z[2] = vec3<f32>(0.0, 0.0, 1.0);
      Z[3] = cross(Z[0], r);
      Z[4] = cross(Z[1], r);
      Z[5] = cross(Z[2], r);
      for (var i = 0u; i < 6u; i++) {
        let KZi = K * Z[i];
        for (var j = i; j < 6u; j++) { e[tri(i, j)] += dot(Z[j], KZi); }
      }
      let Kr = rotationBlock(n);
      for (var i = 0u; i < 3u; i++) {
        for (var j = i; j < 3u; j++) { e[tri(3u + i, 3u + j)] += Kr[i][j]; }
      }
    }
    redE[t] = e;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s /= 2u) {
      if (t < s) {
        for (var q = 0u; q < 21u; q++) { redE[t][q] += redE[t + s][q]; }
      }
      workgroupBarrier();
    }
    if (t == 0u) {
      let o = RIGID_FRAME * p;
      pieceFrame[o] = vec4<f32>(c, select(0.0, 1.0, tot.w > 0.0));
      // Cholesky of E; the rotation block regularized relative to its scale (a node, or a straight
      // strand, has no stiffness about its own axis: no torque reaches that mode either)
      var A: array<array<f32, 6>, 6>;
      let E = redE[0];
      let st = (E[tri(0u, 0u)] + E[tri(1u, 1u)] + E[tri(2u, 2u)]) / 3.0;
      let sr = (E[tri(3u, 3u)] + E[tri(4u, 4u)] + E[tri(5u, 5u)]) / 3.0;
      let eps = 1e-6 * max(sr, 1e-8 * st) + 1e-30;
      for (var i = 0u; i < 6u; i++) {
        for (var j = 0u; j < 6u; j++) { A[i][j] = E[tri(min(i, j), max(i, j))]; }
        if (i >= 3u) { A[i][i] += eps; }
      }
      var ok = st > 0.0;
      var Lc: array<array<f32, 6>, 6>;
      for (var i = 0u; i < 6u; i++) {
        for (var j = 0u; j <= i; j++) {
          var s = A[i][j];
          for (var k = 0u; k < j; k++) { s -= Lc[i][k] * Lc[j][k]; }
          if (i == j) {
            if (s <= 0.0) { ok = false; s = 1.0; }
            Lc[i][i] = sqrt(s);
          } else {
            Lc[i][j] = s / Lc[j][j];
          }
        }
      }
      // E^-1 column by column (forward and back substitution)
      for (var col = 0u; col < 6u; col++) {
        var y: array<f32, 6>;
        for (var i = 0u; i < 6u; i++) {
          var s = select(0.0, 1.0, i == col);
          for (var k = 0u; k < i; k++) { s -= Lc[i][k] * y[k]; }
          y[i] = s / Lc[i][i];
        }
        var z: array<f32, 6>;
        for (var ii = 0u; ii < 6u; ii++) {
          let i = 5u - ii;
          var s = y[i];
          for (var k = i + 1u; k < 6u; k++) { s -= Lc[k][i] * z[k]; }
          z[i] = s / Lc[i][i];
        }
        for (var i = 0u; i < 6u; i++) {
          let q = 6u * i + col;
          let v = select(0.0, z[i], ok);
          var cell = pieceFrame[o + 1u + q / 4u];
          cell[q % 4u] = v;
          pieceFrame[o + 1u + q / 4u] = cell;
        }
      }
    }
    workgroupBarrier();
  }
}
`,
  Tt = `// Rigid-mode start of the Newton direction for detached pieces (rigid_frame.wgsl): PCG starts from
// x0 = Z E^-1 Z^T b, each piece's exact rigid response, with the residual b - A x0, instead of from
// zero. PCG minimises the error in the operator's norm over x0 plus its Krylov space, so the direction
// is never worse than that start. (Adding Z E^-1 Z^T r to every preconditioned residual instead
// counted a single node twice, its V-cycle having resolved it already: the direction turned against
// the contact holding it, and nodes resting on cloth were pumped off it.)
// rigidReduce: per piece, the rhs force and torque about the centroid and the rigid step
// (t, w) = E^-1 (force, torque); rigidApply: per node of a piece, x0 = t + w x r; rigidResidual:
// b -= A x0 (A x0 from the PCG matvec).

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> dx: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> pieceStart: array<u32>;
@group(0) @binding(4) var<storage, read> pieceNodes: array<u32>;
// per node: its piece, or NO_PIECE
@group(0) @binding(5) var<storage, read> pieceOf: array<u32>;
@group(0) @binding(6) var<storage, read> pieceFrame: array<vec4<f32>>;
// per piece: t (xyz), w (xyz) as two vec4
@group(0) @binding(7) var<storage, read_write> pieceStep: array<vec4<f32>>;
// the fine level's rhs b (B, made the residual of x0), the Newton direction (delta) and A x0 (PCG Ap)
@group(0) @binding(8) var<storage, read_write> r: array<vec4<f32>>;
@group(0) @binding(9) var<storage, read_write> z: array<vec4<f32>>;
@group(0) @binding(10) var<storage, read> Az: array<vec4<f32>>;

const RIGID_FRAME: u32 = 10u;
const NO_PIECE: u32 = 0xFFFFFFFFu;
const WG: u32 = 64u;
var<workgroup> red: array<array<vec3<f32>, 2>, 64>;
var<workgroup> count: u32;

fn pos(n: u32) -> vec3<f32> { return x[n].xyz + dx[n].xyz; }

fn inverseAt(o: u32, q: u32) -> f32 { return pieceFrame[o + 1u + q / 4u][q % 4u]; }

@compute @workgroup_size(64)
fn rigidReduce(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) t: u32, @builtin(num_workgroups) ng: vec3<u32>) {
  if (t == 0u) { count = pieceStart[0]; }
  let pieces = workgroupUniformLoad(&count);
  for (var p = wg.x; p < pieces; p += ng.x) {
    let o = RIGID_FRAME * p;
    let c = pieceFrame[o].xyz;
    let a = pieceStart[1u + p];
    let b = pieceStart[2u + p];
    var f = vec3<f32>(0.0);
    var m = vec3<f32>(0.0);
    for (var k = a + t; k < b; k += WG) {
      let n = pieceNodes[k];
      if (x[n].w > 1.5) { continue; }
      let rn = r[n].xyz;
      f += rn;
      m += cross(pos(n) - c, rn);
    }
    red[t] = array<vec3<f32>, 2>(f, m);
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s /= 2u) {
      if (t < s) {
        red[t][0] += red[t + s][0];
        red[t][1] += red[t + s][1];
      }
      workgroupBarrier();
    }
    if (t == 0u) {
      let g = array<f32, 6>(red[0][0].x, red[0][0].y, red[0][0].z, red[0][1].x, red[0][1].y, red[0][1].z);
      var q: array<f32, 6>;
      for (var i = 0u; i < 6u; i++) {
        var s = 0.0;
        for (var j = 0u; j < 6u; j++) { s += inverseAt(o, 6u * i + j) * g[j]; }
        q[i] = select(0.0, s, pieceFrame[o].w > 0.5);
      }
      pieceStep[2u * p] = vec4<f32>(q[0], q[1], q[2], 0.0);
      pieceStep[2u * p + 1u] = vec4<f32>(q[3], q[4], q[5], 0.0);
    }
    workgroupBarrier();
  }
}

@compute @workgroup_size(128)
fn rigidApply(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let p = pieceOf[n];
  if (p == NO_PIECE || x[n].w > 1.5) { return; }
  let c = pieceFrame[RIGID_FRAME * p].xyz;
  let d = pieceStep[2u * p].xyz + cross(pieceStep[2u * p + 1u].xyz, pos(n) - c);
  z[n] = vec4<f32>(d, 0.0);
}

@compute @workgroup_size(128)
fn rigidResidual(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  r[n] = vec4<f32>(r[n].xyz - Az[n].xyz, 0.0);
}
`,
  Et = `// Spin start of a detached piece's substep (solver.ts encodePredict), after the predictor.
//
// The Newton iterate starts from h v. A substep's velocity is its chord (x1 - x0) / h, so for a
// spinning piece the rotation it made over the last substep (angle th = |w| h): repeated from the
// rotated position, the chord points outside the circle, and the start comes out stretched by th^2
// (0.3 % at 10 rad/s). That tension's geometric stiffness, ~1500 times a node's inertia, resists any
// change of the spin in the linearized system: two Newton iterations moved a piece spinning on the
// floor by a few percent of the friction torque's deceleration (it spun on for a second, as on ice;
// 8 iterations stop it in three substeps, as Coulomb friction does). The start is moved onto the
// rotation continued over the substep: repeating chord (I - R^T) r instead of (R - I) r is
// dx = h v + (R + R^T - 2 I) r = h v - 2 (1 - cos th) r_perp about the piece's mass centroid. Only where
// the iteration starts changes; the inertial target (pred) is untouched.
//
// spinReduce: per piece (one workgroup at a time) its centroid, momentum and inertia tensor, and
// w = I^-1 L; spinApply: per node of a piece, the correction.
//
// curveSet, each Newton iteration after the rigid-mode start (rigid_apply.wgsl rigidReduce): per node,
// its piece's rigid rotation in the direction and its arm from the piece's centroid (zero off pieces),
// along which the line search and the update move it (energy.wgsl steps, curveApply).

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(2) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> v: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> dx: array<vec4<f32>>;
// [0] piece count, [1 + p] first entry of piece p in pieceNodes, [1 + count] their total
@group(0) @binding(5) var<storage, read> pieceStart: array<u32>;
@group(0) @binding(6) var<storage, read> pieceNodes: array<u32>;
@group(0) @binding(7) var<storage, read> pieceOf: array<u32>;
// per piece: centroid (xyz), then the rotation vector w h (xyz); free until the Newton iterations
// (rigid_apply.wgsl pieceStep)
@group(0) @binding(8) var<storage, read_write> pieceStep: array<vec4<f32>>;
// per piece: centroid at the iterate (xyz, w = 1 if valid), then E^-1 (rigid_frame.wgsl)
@group(0) @binding(9) var<storage, read> pieceFrame: array<vec4<f32>>;
// 2 per node (energy.wgsl curveRef)
@group(0) @binding(10) var<storage, read_write> curveRef: array<vec4<f32>>;

const RIGID_FRAME: u32 = 10u;

const NO_PIECE: u32 = 0xFFFFFFFFu;
const WG: u32 = 64u;
var<workgroup> redA: array<vec4<f32>, 64>;
var<workgroup> redB: array<vec4<f32>, 64>;
var<workgroup> redI: array<array<f32, 6>, 64>;
var<workgroup> count: u32;

fn inScene(n: u32) -> bool { return x[n].w < 1.5; }

@compute @workgroup_size(64)
fn spinReduce(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) t: u32, @builtin(num_workgroups) ng: vec3<u32>) {
  if (t == 0u) { count = pieceStart[0]; }
  let pieces = workgroupUniformLoad(&count);
  for (var p = wg.x; p < pieces; p += ng.x) {
    let a = pieceStart[1u + p];
    let b = pieceStart[2u + p];
    // mass, centroid and mean velocity
    var mx = vec4<f32>(0.0);
    var mv = vec4<f32>(0.0);
    for (var k = a + t; k < b; k += WG) {
      let n = pieceNodes[k];
      if (!inScene(n)) { continue; }
      let m = nodes[n].mass;
      mx += vec4<f32>(m * x[n].xyz, m);
      mv += vec4<f32>(m * v[n].xyz, 0.0);
    }
    redA[t] = mx;
    redB[t] = mv;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s /= 2u) {
      if (t < s) {
        redA[t] += redA[t + s];
        redB[t] += redB[t + s];
      }
      workgroupBarrier();
    }
    let M = redA[0].w;
    let c = select(vec3<f32>(0.0), redA[0].xyz / M, M > 0.0);
    let vc = select(vec3<f32>(0.0), redB[0].xyz / M, M > 0.0);
    workgroupBarrier();
    // angular momentum and inertia tensor (xx yy zz xy xz yz) about the centroid
    var L = vec3<f32>(0.0);
    var I: array<f32, 6>;
    for (var q = 0u; q < 6u; q++) { I[q] = 0.0; }
    for (var k = a + t; k < b; k += WG) {
      let n = pieceNodes[k];
      if (!inScene(n)) { continue; }
      let m = nodes[n].mass;
      let r = x[n].xyz - c;
      L += m * cross(r, v[n].xyz - vc);
      let rr = dot(r, r);
      I[0] += m * (rr - r.x * r.x);
      I[1] += m * (rr - r.y * r.y);
      I[2] += m * (rr - r.z * r.z);
      I[3] -= m * r.x * r.y;
      I[4] -= m * r.x * r.z;
      I[5] -= m * r.y * r.z;
    }
    redA[t] = vec4<f32>(L, 0.0);
    redI[t] = I;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s /= 2u) {
      if (t < s) {
        redA[t] += redA[t + s];
        for (var q = 0u; q < 6u; q++) { redI[t][q] += redI[t + s][q]; }
      }
      workgroupBarrier();
    }
    if (t == 0u) {
      let J = redI[0];
      // regularized as rigid_frame.wgsl: a node, or a straight strand about its own axis, has no
      // inertia there (and no momentum about it)
      let eps = 1e-6 * (J[0] + J[1] + J[2]) / 3.0 + 1e-30;
      let T = mat3x3<f32>(vec3<f32>(J[0] + eps, J[3], J[4]), vec3<f32>(J[3], J[1] + eps, J[5]), vec3<f32>(J[4], J[5], J[2] + eps));
      var th = inverse3(T) * redA[0].xyz * P.hg.x;
      if (!(M > 0.0) || !finite3(th)) { th = vec3<f32>(0.0); }
      pieceStep[2u * p] = vec4<f32>(c, 0.0);
      pieceStep[2u * p + 1u] = vec4<f32>(th, 0.0);
    }
    workgroupBarrier();
  }
}

@compute @workgroup_size(128)
fn spinApply(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || !inScene(n)) { return; }
  let p = pieceOf[n];
  if (p == NO_PIECE || p >= pieceStart[0]) { return; }
  let th = pieceStep[2u * p + 1u].xyz;
  let phi = length(th);
  if (phi < 1e-9) { return; }
  let k = th / phi;
  let r = x[n].xyz - pieceStep[2u * p].xyz;
  // k x (k x r) = -r_perp
  dx[n] = vec4<f32>(dx[n].xyz + 2.0 * (1.0 - cos(phi)) * cross(k, cross(k, r)), dx[n].w);
}

@compute @workgroup_size(128)
fn curveSet(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let p = pieceOf[n];
  var w = vec4<f32>(0.0);
  var r = vec4<f32>(0.0);
  if (p != NO_PIECE && p < pieceStart[0] && inScene(n)) {
    let fr = pieceFrame[RIGID_FRAME * p];
    if (fr.w > 0.5) {
      w = vec4<f32>(pieceStep[2u * p + 1u].xyz, 1.0);
      r = vec4<f32>(x[n].xyz + dx[n].xyz - fr.xyz, 0.0);
    }
  }
  curveRef[2u * n] = w;
  curveRef[2u * n + 1u] = r;
}
`;
const Dt = {
    h: 1 / 120,
    gravity: [0, 0, -9.81],
    newtonIterations: 2,
    newtonMax: 2,
    newtonTolerance: 1e-5,
    historyTolerance: 1,
    pcgIterations: 2,
    coarseSweeps: 2,
    maxCoarsestNodes: 400,
    selfContact: !0,
  },
  Ot = { newtonIterations: 4, duration: 0.1 },
  kt = 4096,
  At = 4294967295;
function jt(e, t) {
  let n = /* @__PURE__ */ new ArrayBuffer(400),
    r = new Float32Array(n),
    i = new Uint32Array(n);
  return (
    (r[0] = t.h),
    (r[1] = t.gravity[0]),
    (r[2] = t.gravity[1]),
    (r[3] = t.gravity[2]),
    (i[4] = e.nodeCount),
    (i[5] = e.layers.length),
    (i[6] = 1),
    (r[7] = t.historyTolerance),
    e.layers.forEach((e, t) => {
      let n = (32 + t * 112) / 4;
      ((i[n] = e.nodeOffset), (i[n + 1] = e.nx), (i[n + 2] = e.ny));
      for (let t = 0; t < 2; t++) {
        let i = e.material.yarns[t],
          a = n + 4 + t * 8;
        ((r[a] = i.eaLow),
          (r[a + 1] = i.eaHigh),
          (r[a + 2] = i.crimpStrain),
          (r[a + 3] = i.eaCompress),
          (r[a + 4] = i.axialViscosity),
          (r[a + 5] = i.bendRigidity),
          (r[a + 6] = i.bendViscosity),
          (r[a + 7] = i.yarnsPerSpan ?? 1));
      }
      let a = e.material;
      ((r[n + 20] = a.shearStiffness),
        (r[n + 21] = a.crossingFriction),
        (r[n + 22] = a.crossingWrap),
        (r[n + 23] = a.pitchU),
        (r[n + 24] = a.pitchV),
        (r[n + 25] = a.airDrag),
        (r[n + 26] = a.crossingNormal0),
        (r[n + 27] = a.thickness));
    }),
    n
  );
}
function Mt(e, t) {
  let n = new Uint32Array(e.length / 2);
  for (let r = 0; r < n.length; r++)
    n[r] = (e[2 * r] | (e[2 * r + 1] << 8) | (t[2 * r] << 16) | (t[2 * r + 1] << 24)) >>> 0;
  return n;
}
function Nt(e) {
  let t = /* @__PURE__ */ new Uint32Array(16);
  return (
    (t[0] = U(e)),
    (t[1] = e.length),
    e.forEach((e, n) => {
      ((t[4 + 4 * n] = e.offset), (t[5 + 4 * n] = e.nx), (t[6 + 4 * n] = e.ny));
    }),
    t
  );
}
var Pt = class {
  device;
  scene;
  params;
  N;
  simParams;
  nodes;
  x;
  v;
  dx;
  pred;
  segs;
  tails;
  ext;
  field;
  fieldStrength;
  fieldU;
  fieldEvents;
  pullBits;
  counters;
  acousticSources;
  contact;
  contactEnabled;
  pieceStart;
  pieceNodes;
  pieceOf;
  pieceFrame;
  pieceStep;
  curveRef;
  rigidK;
  pieceCount = 0;
  floor = null;
  recordingSizes = !1;
  gateArgs;
  gateSizes;
  sizeIndex = /* @__PURE__ */ new Map();
  gatedIteration = -1;
  levels;
  delta;
  p;
  Ap;
  rec;
  partial;
  partial4;
  scal;
  slots;
  slotCount = 0;
  slotData;
  pl = {};
  bg = {};
  mod = {};
  preSubstep = null;
  preAssemble = null;
  postCommit = null;
  constructor(e, t, n = Dt) {
    ((this.device = e), (this.scene = t), (this.params = { ...n }));
    let r = t.nodeCount;
    ((this.N = r), (this.simParams = o(e, `simParams`, new Uint8Array(jt(t, n)), i)));
    let s = /* @__PURE__ */ new ArrayBuffer(16 * r),
      c = new Uint32Array(s),
      l = new Float32Array(s);
    for (let e of t.layers)
      for (let n = 0; n < e.ny; n++)
        for (let r = 0; r < e.nx; r++) {
          let i = e.nodeOffset + n * e.nx + r;
          ((c[4 * i] = r | (n << 12) | (e.index << 24)),
            (c[4 * i + 1] = t.pinned[i]),
            (l[4 * i + 2] = t.mass[i]),
            (l[4 * i + 3] = t.crossingNormal0[i]));
        }
    if (t.layers.some((e) => e.nx >= 4096 || e.ny >= 4096)) throw Error(`lattice too large for ijl packing`);
    this.nodes = o(e, `nodes`, new Uint8Array(s));
    let u = new Float32Array(4 * r);
    for (let e = 0; e < r; e++) for (let n = 0; n < 3; n++) u[4 * e + n] = t.position[3 * e + n];
    if (
      ((this.x = o(e, `x`, u)),
      (this.v = a(e, `v`, 16 * r)),
      (this.dx = a(e, `dx`, 16 * r)),
      (this.pred = a(e, `pred`, 16 * r)),
      (this.segs = o(e, `segs`, new Uint8Array(this.segData(t)))),
      t.layers.some((e) => e.bundle[0] > 16 || e.bundle[1] > 16))
    )
      throw Error(`bundles of more than 16 yarns are not supported by the GPU field update`);
    ((this.field = o(e, `field`, Mt(t.fieldDamage, t.fieldArea))),
      (this.fieldStrength = o(e, `fieldStrength`, t.fieldStrength)));
    let d = /* @__PURE__ */ new Uint32Array(12);
    (t.field.forEach((e, n) =>
      d.set([e.offset, e.K, e.M, mt(t.layers[n].weave, 0) | (mt(t.layers[n].weave, 1) << 16)], 4 * n),
    ),
      (this.fieldU = o(e, `fieldU`, d, i)),
      (this.fieldEvents = o(e, `fieldEvents`, new Uint32Array([1, 0, 0, 0]))),
      (this.pullBits = a(e, `pullBits`, 4 * Math.ceil(t.fieldDamage.length / 2 / 16))),
      (this.tails = o(e, `tails`, Float32Array.from(t.tails))),
      (this.ext = a(e, `ext`, 48 * r)),
      (this.counters = a(e, `counters`, 160)),
      (this.acousticSources = a(e, `acousticSources`, 64, i)),
      (this.contactEnabled = t.layers.length > 1 || this.params.selfContact),
      (this.pieceStart = a(e, `pieces.start`, 16392)),
      (this.pieceNodes = a(e, `pieces.nodes`, 4 * r)),
      (this.pieceOf = o(e, `pieces.of`, new Uint32Array(r).fill(At))),
      (this.pieceFrame = a(e, `pieces.frame`, 160 * kt)),
      (this.pieceStep = a(e, `pieces.step`, 32 * kt)),
      (this.rigidK = a(e, `pieces.rigidK`, 48 * r)),
      (this.curveRef = a(e, `pieces.curveRef`, 32 * r)));
    let f = t.layers.map((e) => ({ nx: e.nx, ny: e.ny, offset: e.nodeOffset }));
    if (
      ((this.levels = Ye(f, this.params.maxCoarsestNodes).map((n, s) => {
        let c = U(n),
          l = Xe(n, 3);
        if (l.maxLength > 384) throw Error(`yarn line of ${l.maxLength} exceeds 384`);
        let u = new Uint32Array(c);
        if (s === 0) for (let e = 0; e < r; e++) u[e] = t.pinned[e];
        return {
          layers: n,
          N: c,
          info: o(e, `level${s}.info`, Nt(n), i),
          op: a(e, `level${s}.op`, c * (s === 0 ? 72 : 200) * 4),
          fixed: o(e, `level${s}.fixed`, u),
          X: a(e, `level${s}.X`, 16 * c),
          B: a(e, `level${s}.B`, 16 * c),
          R: a(e, `level${s}.R`, 16 * c),
          lines: o(e, `level${s}.lines`, l.lines),
          table: l,
          pw: null,
        };
      })),
      (this.delta = a(e, `pcg.delta`, 16 * r)),
      (this.p = a(e, `pcg.p`, 16 * r)),
      (this.Ap = a(e, `pcg.Ap`, 16 * r)),
      (this.rec = a(e, `smooth.scratch`, 160 * r)),
      (this.partial = a(e, `pcg.partial`, 1024)),
      (this.partial4 = a(e, `lineSearch.partial`, 8192)),
      (this.scal = a(e, `pcg.scal`, 512)),
      (this.slotData = /* @__PURE__ */ new Uint32Array(16384)),
      (this.slots = a(e, `slots`, this.slotData.byteLength, i)),
      n.newtonMax > 8 || n.newtonIterations < 1 || n.newtonIterations > n.newtonMax)
    )
      throw Error(`invalid Newton iteration bounds`);
    if (((this.contact = t.layers.length > 1 ? new Qe(this, t) : new x(this)), !this.contactEnabled)) {
      let t = new Float32Array(8 * r);
      for (let e = 0; e < 2 * r; e++) t[4 * e + 3] = 1e9;
      e.queue.writeBuffer(this.contact.meta, 0, t);
    }
    let p = [],
      m = {
        setPipeline() {},
        setBindGroup() {},
        dispatchWorkgroups(e) {
          p.includes(e) || p.push(e);
        },
        end() {},
      };
    (this.createPipelines(),
      this.createBindGroups(),
      (this.recordingSizes = !0),
      this.encodeNewtonIteration(m, 0, !0),
      (this.recordingSizes = !1),
      p.includes(32) || p.push(32),
      p.forEach((e, t) => this.sizeIndex.set(e, t)),
      (this.gateSizes = o(
        e,
        `newton.gateSizes`,
        new Uint32Array([p.length, new Uint32Array(new Float32Array([n.newtonTolerance]).buffer)[0], ...p]),
      )),
      (this.gateArgs = a(
        e,
        `newton.gateArgs`,
        12 * p.length * 9,
        GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
      )),
      this.createStepBindGroups(),
      e.queue.writeBuffer(this.slots, 0, this.slotData));
  }
  segData(e) {
    let t = this.scene,
      n = /* @__PURE__ */ new ArrayBuffer(64 * t.nodeCount),
      r = new Float32Array(n),
      i = new Uint32Array(n);
    for (let n = 0; n < 2 * t.nodeCount; n++)
      ((r[8 * n] = e.restLength[n]),
        (r[8 * n + 1] = e.intact[n]),
        (r[8 * n + 2] = t.softening[n]),
        (i[8 * n + 3] = e.cutMask[n]),
        (i[8 * n + 5] = e.segFlags[n]),
        (r[8 * n + 6] = e.failSite[n]));
    return n;
  }
  slot(e, t = 0, n = 0, r = 0) {
    let i = this.slotCount++;
    if (i >= 256) throw Error(`out of uniform slots`);
    let a = (i * 256) / 4;
    return (
      (this.slotData[a] = e >>> 0),
      (this.slotData[a + 1] = t >>> 0),
      (this.slotData[a + 2] = n >>> 0),
      (this.slotData[a + 3] = r >>> 0),
      { buffer: this.slots, offset: i * 256, size: 16 }
    );
  }
  createPipelines() {
    let e = this.device,
      t = this.params.patch ?? ((e, t) => t);
    this.mod.assemble = new f(e, `assemble`, t(`assemble`, _ + Ct + tt));
    let n = nt.replace(`const LINK_MIN_INTACT: f32 = 0.02;`, `const LINK_MIN_INTACT: f32 = 0.02;`);
    ((this.mod.mgFine = new f(e, `multigrid.fine`, t(`multigrid`, _ + n + $e))),
      (this.mod.mgCoarse = new f(e, `multigrid.coarse`, t(`multigrid`, _ + n + et))),
      (this.mod.smoothFine = new f(e, `smooth.fine`, t(`smooth`, _ + rt + $e))),
      (this.mod.smoothCoarse = new f(e, `smooth.coarse`, t(`smooth`, _ + rt + et))),
      (this.mod.pcg = new f(e, `pcg`, t(`pcg`, _ + it + $e))),
      (this.mod.step = new f(e, `step`, t(`step`, _ + at))),
      (this.pl.assemble = this.mod.assemble.pipeline(`main`)));
    for (let e of [`Fine`, `Coarse`])
      ((this.pl[`rap${e}`] = this.mod[`mg${e}`].pipeline(`rap`)),
        (this.pl[`residual${e}`] = this.mod[`mg${e}`].pipeline(`residual`)),
        (this.pl[`smooth${e}`] = this.mod[`smooth${e}`].pipeline(`main`)));
    ((this.pl.restrict = this.mod.mgCoarse.pipeline(`restrictResidual`)),
      (this.pl.pwFine = this.mod.mgFine.pipeline(`prolongWeights`)),
      (this.pl.pwCoarse = this.mod.mgCoarse.pipeline(`prolongWeights`)),
      (this.pl.prolong = this.mod.mgCoarse.pipeline(`prolongAdd`)));
    for (let e of [`matvecDot`, `dotPartial`, `reduceFinal`, `updateXR`, `updateP`, `clear2`])
      this.pl[e] = this.mod.pcg.pipeline(e);
    for (let e of [`predict`, `newtonApply`, `projectStart`, `commit`, `slip`]) this.pl[e] = this.mod.step.pipeline(e);
    let r = ot
      .replace(`override SHARE_FRACTION: f32 = 0.6;`, `const SHARE_FRACTION: f32 = ${pt.fraction.toFixed(6)};`)
      .replace(`override SHARE_RUN: u32 = 6u;`, `const SHARE_RUN: u32 = ${pt.maxRun}u;`);
    this.mod.yarnField = new f(e, `yarnField`, _ + r);
    for (let e of [
      `spanStrain`,
      `sepSnapshot`,
      `fieldUpdatePick`,
      `fieldUpdateWarp`,
      `pullMark`,
      `pullApply`,
      `coupleU`,
      `coupleV`,
    ])
      this.pl[e] = this.mod.yarnField.pipeline(e);
    ((this.mod.gate = new f(e, `gate`, xt)),
      (this.pl.gate = this.mod.gate.pipeline(`gate`)),
      (this.mod.energy = new f(e, `energy`, t(`energy`, _ + Ct + St))),
      (this.pl.energyDelta = this.mod.energy.pipeline(`energyDelta`)),
      (this.pl.lineChoose = this.mod.energy.pipeline(`lineChoose`)),
      (this.mod.rigidFrame = new f(e, `rigidFrame`, t(`rigid`, _ + wt))),
      (this.pl.rigidFrame = this.mod.rigidFrame.pipeline(`rigidFrame`)),
      (this.mod.rigidApply = new f(e, `rigidApply`, t(`rigid`, _ + Tt))),
      (this.pl.rigidReduce = this.mod.rigidApply.pipeline(`rigidReduce`)),
      (this.pl.rigidApply = this.mod.rigidApply.pipeline(`rigidApply`)),
      (this.pl.rigidResidual = this.mod.rigidApply.pipeline(`rigidResidual`)),
      (this.mod.rigidSpin = new f(e, `rigidSpin`, t(`rigid`, _ + Et))),
      (this.pl.spinReduce = this.mod.rigidSpin.pipeline(`spinReduce`)),
      (this.pl.spinApply = this.mod.rigidSpin.pipeline(`spinApply`)),
      (this.pl.curveSet = this.mod.rigidSpin.pipeline(`curveSet`)),
      (this.pl.curveApply = this.mod.energy.pipeline(`curveApply`)));
  }
  createBindGroups() {
    let e = this.levels[0],
      t = (e, t, n) => {
        this.bg[t] = this.mod[e].bindGroup(t, n);
      };
    (t(`assemble`, `assemble`, {
      0: this.simParams,
      1: this.nodes,
      2: this.x,
      3: this.dx,
      4: this.pred,
      5: this.segs,
      6: e.op,
      7: e.B,
      8: this.ext,
      9: this.contact.meta,
      10: this.rigidK,
    }),
      this.levels.forEach((e, n) => {
        let r = n === 0 ? `Fine` : `Coarse`;
        t(`mg${r}`, `residual${n}`, { 0: e.info, 2: e.op, 3: e.fixed, 6: e.X, 7: e.B, 8: e.R });
        for (let i = 0; i < 6; i++)
          t(`smooth${r}`, `smooth${n}_${i}`, {
            0: e.info,
            1: this.slot(e.table.colorStart[i]),
            2: e.lines,
            3: e.op,
            4: e.fixed,
            5: e.X,
            6: e.B,
            7: this.rec,
          });
        let i = this.levels[n + 1];
        if (!i) return;
        e.pw = a(this.device, `level${n}.pw`, 16 * e.N);
        let o = { 0: e.info, 2: e.op, 3: e.fixed, 10: e.pw };
        (n === 0 && (o[11] = this.segs),
          t(`mg${r}`, `pw${n}`, o),
          t(`mg${r}`, `rap${n}`, { 0: e.info, 1: i.info, 2: e.op, 3: e.fixed, 4: i.op, 5: i.fixed, 10: e.pw }),
          t(`mgCoarse`, `restrict${n}`, {
            0: e.info,
            1: i.info,
            3: e.fixed,
            5: i.fixed,
            6: e.R,
            8: i.B,
            9: i.X,
            10: e.pw,
          }),
          t(`mgCoarse`, `prolong${n}`, { 0: e.info, 1: i.info, 3: e.fixed, 6: i.X, 8: e.X, 10: e.pw }));
      }));
    let n = e.info;
    (t(`pcg`, `clear`, { 0: n, 4: this.delta, 5: e.X }),
      t(`pcg`, `dotRZ`, { 0: n, 4: e.B, 5: e.X, 9: this.partial }),
      t(`pcg`, `matvec`, { 0: n, 2: e.op, 3: e.fixed, 4: this.p, 5: this.Ap, 9: this.partial }));
    for (let e = 0; e < 128; e++) t(`pcg`, `reduce${e}`, { 1: this.slot(0, e, 256), 9: this.partial, 10: this.scal });
    for (let r = 0; r < 16; r++)
      (t(`pcg`, `updateXR${r}`, {
        0: n,
        1: this.slot(r),
        4: this.delta,
        5: this.p,
        6: e.B,
        7: this.Ap,
        8: e.X,
        10: this.scal,
      }),
        t(`pcg`, `updateP${r}`, { 0: n, 1: this.slot(r), 4: this.p, 5: e.X, 10: this.scal }));
    (t(`pcg`, `initP`, { 0: n, 1: this.slot(4294967295), 4: this.p, 5: e.X, 10: this.scal }),
      t(`rigidFrame`, `rigidFrame`, {
        0: this.simParams,
        1: this.nodes,
        2: this.x,
        3: this.dx,
        4: this.rigidK,
        5: this.pieceStart,
        6: this.pieceNodes,
        7: this.pieceFrame,
      }),
      t(`rigidSpin`, `rigidSpin`, {
        0: this.simParams,
        1: this.nodes,
        2: this.x,
        3: this.v,
        4: this.dx,
        5: this.pieceStart,
        6: this.pieceNodes,
        7: this.pieceOf,
        8: this.pieceStep,
        9: this.pieceFrame,
        10: this.curveRef,
      }),
      t(`rigidApply`, `rigidApply`, {
        0: this.simParams,
        1: this.x,
        2: this.dx,
        3: this.pieceStart,
        4: this.pieceNodes,
        5: this.pieceOf,
        6: this.pieceFrame,
        7: this.pieceStep,
        8: e.B,
        9: this.delta,
        10: this.Ap,
      }),
      t(`pcg`, `matvecDelta`, { 0: n, 2: e.op, 3: e.fixed, 4: this.delta, 5: this.Ap, 9: this.partial }));
  }
  createStepBindGroups() {
    let e = {
        0: this.simParams,
        2: this.nodes,
        3: this.x,
        4: this.v,
        5: this.dx,
        6: this.pred,
        7: this.segs,
        8: this.tails,
        9: this.delta,
        10: this.counters,
        11: this.contact.meta,
      },
      t = (e, t) => {
        this.bg[e] = this.mod.step.bindGroup(e, t);
      };
    for (let n of [`predict`, `commit`, `project`]) t(n, e);
    this.bg.yarnField = this.mod.yarnField.bindGroup(`yarnField`, {
      0: this.simParams,
      1: this.fieldU,
      2: this.nodes,
      3: this.x,
      4: this.pred,
      5: this.segs,
      6: this.tails,
      7: this.field,
      8: this.fieldStrength,
      9: this.counters,
      10: this.fieldEvents,
      11: this.pullBits,
      12: this.acousticSources,
    });
    for (let e of [`spanStrain`, `fieldUpdate`, `pull`, `couple`]) this.bg[e] = this.bg.yarnField;
    for (let n = 0; n < 8; n++)
      (t(`newtonApply${n}`, { ...e, 1: this.slot(n) }),
        (this.bg[`gate${n}`] = this.mod.gate.bindGroup(`gate${n}`, {
          0: this.slot(n),
          1: this.counters,
          2: this.gateArgs,
          3: this.gateSizes,
        })));
    for (let n = 0; n < 2; n++) for (let r = 0; r < 2; r++) t(`slip${n}${r}`, { ...e, 1: this.slot(n, r) });
    this.bg.energy = this.mod.energy.bindGroup(`energy`, {
      0: this.simParams,
      1: this.nodes,
      2: this.x,
      3: this.dx,
      4: this.pred,
      5: this.segs,
      6: this.delta,
      7: this.ext,
      8: this.partial4,
      9: this.counters,
      11: this.curveRef,
    });
  }
  dispatch(e, t, n, r) {
    this.dispatchRaw(e, this.pl[t], this.bg[n], r);
  }
  dispatchRaw(e, t, n, r) {
    if ((e.setPipeline(t), e.setBindGroup(0, n), this.gatedIteration < 0)) {
      e.dispatchWorkgroups(r);
      return;
    }
    let i = this.sizeIndex.get(r);
    if (i === void 0) throw Error(`dispatch size ${r} missing from the Newton gate table`);
    e.dispatchWorkgroupsIndirect(this.gateArgs, 12 * (this.sizeIndex.size * this.gatedIteration + i));
  }
  nodeGroups(e, t = 128) {
    return Math.ceil(e / t);
  }
  encodeSmooth(e, t, n) {
    let r = this.levels[t];
    for (let i = 0; i < 6; i++) {
      let a = n ? 5 - i : i,
        o = r.table.colorStart[a + 1] - r.table.colorStart[a];
      o > 0 && this.dispatch(e, t === 0 ? `smoothFine` : `smoothCoarse`, `smooth${t}_${a}`, o);
    }
  }
  encodeVCycle(e, t = 0) {
    if (t === this.levels.length - 1) {
      for (let n = 0; n < this.params.coarseSweeps; n++) this.encodeSmooth(e, t, (n & 1) == 1);
      return;
    }
    let n = this.levels[t],
      r = this.levels[t + 1];
    (this.encodeSmooth(e, t, !1),
      this.dispatch(e, t === 0 ? `residualFine` : `residualCoarse`, `residual${t}`, this.nodeGroups(n.N)),
      this.dispatch(e, `restrict`, `restrict${t}`, this.nodeGroups(r.N)),
      this.encodeVCycle(e, t + 1),
      this.dispatch(e, `prolong`, `prolong${t}`, this.nodeGroups(n.N)),
      this.encodeSmooth(e, t, !0));
  }
  encodeKernel(e, t, n = 0) {
    (t === `assemble` && this.dispatch(e, `assemble`, `assemble`, this.nodeGroups(this.N)),
      t === `rap` &&
        this.dispatch(e, n === 0 ? `rapFine` : `rapCoarse`, `rap${n}`, this.nodeGroups(this.levels[n + 1].N, 64)),
      t === `residual` &&
        this.dispatch(
          e,
          n === 0 ? `residualFine` : `residualCoarse`,
          `residual${n}`,
          this.nodeGroups(this.levels[n].N),
        ),
      t === `matvec` && this.dispatch(e, `matvecDot`, `matvec`, 256));
  }
  encodeAssemble(e, t = !0) {
    if (
      (this.dispatch(e, `assemble`, `assemble`, this.nodeGroups(this.N)),
      this.hasPieces && this.dispatch(e, `rigidFrame`, `rigidFrame`, 64),
      t)
    )
      for (let t = 0; t + 1 < this.levels.length; t++)
        (this.dispatch(e, t === 0 ? `pwFine` : `pwCoarse`, `pw${t}`, this.nodeGroups(this.levels[t].N)),
          this.dispatch(e, t === 0 ? `rapFine` : `rapCoarse`, `rap${t}`, this.nodeGroups(this.levels[t + 1].N, 64)));
  }
  encodePCG(e) {
    let t = this.params.pcgIterations,
      n = this.nodeGroups(this.N, 256);
    (this.dispatch(e, `clear2`, `clear`, n),
      this.encodeRigidStart(e),
      this.encodeVCycle(e, 0),
      this.dispatch(e, `updateP`, `initP`, n),
      this.dispatch(e, `dotPartial`, `dotRZ`, 256),
      this.dispatch(e, `reduceFinal`, `reduce0`, 1));
    for (
      let r = 0;
      r < t &&
      (this.dispatch(e, `matvecDot`, `matvec`, 256),
      this.dispatch(e, `reduceFinal`, `reduce${2 * r + 1}`, 1),
      this.dispatch(e, `updateXR`, `updateXR${r}`, n),
      r + 1 !== t);
      r++
    )
      (this.encodeVCycle(e, 0),
        this.dispatch(e, `dotPartial`, `dotRZ`, 256),
        this.dispatch(e, `reduceFinal`, `reduce${2 * r + 2}`, 1),
        this.dispatch(e, `updateP`, `updateP${r}`, n));
  }
  get hasPieces() {
    return this.pieceCount > 0 || this.recordingSizes;
  }
  encodeRigidStart(e) {
    this.hasPieces &&
      (this.dispatch(e, `rigidReduce`, `rigidApply`, 64),
      this.dispatch(e, `rigidApply`, `rigidApply`, this.nodeGroups(this.N)),
      this.dispatch(e, `matvecDot`, `matvecDelta`, 256),
      this.dispatch(e, `rigidResidual`, `rigidApply`, this.nodeGroups(this.N)));
  }
  setPieces(e, t, n) {
    let r = Math.min(kt, Math.max(0, t.length - 1)),
      i = r < t.length - 1 ? e.map((e) => (e < r ? e : At)) : e,
      a = new Uint32Array(r + 2);
    ((a[0] = r),
      a.set(t.subarray(0, r + 1), 1),
      this.device.queue.writeBuffer(this.pieceStart, 0, a),
      n.length > 0 && this.device.queue.writeBuffer(this.pieceNodes, 0, n),
      this.device.queue.writeBuffer(this.pieceOf, 0, i),
      r === 0 && this.pieceCount > 0 && this.device.queue.writeBuffer(this.curveRef, 0, new Float32Array(8 * this.N)),
      (this.pieceCount = r));
  }
  encodeLineSearch(e) {
    (this.hasPieces && this.dispatch(e, `curveSet`, `rigidSpin`, this.nodeGroups(this.N)),
      this.dispatch(e, `energyDelta`, `energy`, 256),
      this.dispatch(e, `lineChoose`, `energy`, 1));
  }
  encodeNewtonIteration(e, t, n = !1) {
    (this.contactEnabled && this.contact.encodeTerms(e),
      n || this.preAssemble?.((t, n, r) => this.dispatchRaw(e, t, n, r)),
      this.encodeAssemble(e, t === 0),
      this.encodePCG(e),
      this.encodeLineSearch(e),
      this.hasPieces && this.dispatch(e, `curveApply`, `energy`, this.nodeGroups(this.N)),
      this.dispatch(e, `newtonApply`, `newtonApply${t}`, this.nodeGroups(this.N)));
  }
  encodePredict(e) {
    (this.dispatch(e, `predict`, `predict`, this.nodeGroups(this.N)),
      this.pieceCount > 0 &&
        (this.dispatch(e, `spinReduce`, `rigidSpin`, 64),
        this.dispatch(e, `spinApply`, `rigidSpin`, this.nodeGroups(this.N))));
  }
  encodeDamage(e) {
    this.dispatch(e, `spanStrain`, `spanStrain`, this.nodeGroups(this.N));
    let t = Math.ceil(Math.ceil(this.scene.fieldDamage.length / 2 / 16) / 128);
    (this.dispatch(e, `sepSnapshot`, `pull`, t),
      this.dispatch(e, `fieldUpdatePick`, `fieldUpdate`, Math.ceil((16 * this.N) / 128)),
      this.dispatch(e, `fieldUpdateWarp`, `fieldUpdate`, Math.ceil((16 * this.N) / 128)),
      this.dispatch(e, `pullMark`, `pull`, t),
      this.dispatch(e, `pullApply`, `pull`, t),
      this.dispatch(e, `coupleU`, `couple`, this.nodeGroups(this.N)),
      this.dispatch(e, `coupleV`, `couple`, this.nodeGroups(this.N)));
  }
  encodeFinalize(e) {
    (this.dispatch(e, `commit`, `commit`, this.nodeGroups(this.N)), this.postCommit?.(e), this.encodeDamage(e));
    for (let t = 0; t < 2; t++)
      for (let n = 0; n < 2; n++) this.dispatch(e, `slip`, `slip${t}${n}`, this.nodeGroups(this.N));
  }
  encodeSubstep(e, t = 0, n = 0) {
    (this.contactEnabled && this.contact.encodeClear(e), e.clearBuffer(this.counters, 16, 32));
    let r = e.beginComputePass({ label: `substep` });
    (this.encodePredict(r),
      this.preSubstep?.(r),
      this.contactEnabled && this.contact.encodeDetect(r),
      (this.contactEnabled || this.floor !== null) &&
        this.dispatch(r, `projectStart`, `project`, this.nodeGroups(this.N)));
    let i = Math.min(8, Math.max(this.params.newtonIterations, t)),
      a = Math.min(8, Math.max(this.params.newtonMax, i, n));
    for (let e = 0; e < a; e++) {
      e >= i &&
        (this.dispatch(r, `gate`, `gate${e - 1}`, Math.ceil(this.sizeIndex.size / 64)), (this.gatedIteration = e));
      try {
        this.encodeNewtonIteration(r, e);
      } finally {
        this.gatedIteration = -1;
      }
    }
    (this.encodeFinalize(r), r.end());
  }
  encodeContactRefresh(e) {
    if (!this.contactEnabled) return;
    (this.contact.encodeClear(e), e.clearBuffer(this.dx));
    let t = e.beginComputePass({ label: `contactRefresh` });
    (this.contact.encodeDetect(t), t.end());
  }
  setHistoryEnabled(e) {
    this.device.queue.writeBuffer(this.simParams, 24, new Uint32Array([+!!e]));
  }
  setNewtonTolerance(e) {
    ((this.params.newtonTolerance = e), this.device.queue.writeBuffer(this.gateSizes, 4, new Float32Array([e])));
  }
  get floorZ() {
    return this.floor;
  }
  setFloor(e) {
    let t = xe;
    this.floor = e;
    let n = new Float32Array([e ?? 0, t.bulge, t.stiffness, t.friction, t.frictionSpeed, e === null ? 0 : 1, 0, 0]);
    this.device.queue.writeBuffer(this.simParams, 368, n);
  }
  setTimestep(e) {
    ((this.params.h = e), this.device.queue.writeBuffer(this.simParams, 0, new Float32Array([e])));
  }
  resetState() {
    let e = this.N,
      t = new Float32Array(4 * e);
    for (let n = 0; n < e; n++) for (let e = 0; e < 3; e++) t[4 * n + e] = this.scene.position[3 * n + e];
    (this.setState(t),
      this.setSegments(this.scene, this.scene.tails),
      this.setField(this.scene.fieldDamage),
      this.device.queue.writeBuffer(this.ext, 0, new Float32Array(12 * e)));
  }
  setSegments(e, t) {
    (this.device.queue.writeBuffer(this.segs, 0, this.segData(e)),
      this.device.queue.writeBuffer(this.tails, 0, Float32Array.from(t)));
  }
  setField(e) {
    (this.device.queue.writeBuffer(this.field, 0, Mt(e, this.scene.fieldArea)),
      this.device.queue.writeBuffer(this.fieldEvents, 0, new Uint32Array([1])));
  }
  setState(e, t) {
    (this.device.queue.writeBuffer(this.x, 0, e),
      t
        ? this.device.queue.writeBuffer(this.v, 0, t)
        : this.device.queue.writeBuffer(this.v, 0, new Float32Array(4 * this.N)));
  }
};
function Ft(e) {
  return (
    (e >>>= 0),
    (e ^= e >>> 16),
    (e = Math.imul(e, 2146121005) >>> 0),
    (e ^= e >>> 15),
    (e = Math.imul(e, 2221713035) >>> 0),
    (e ^= e >>> 16),
    e >>> 0
  );
}
function It(e, t, n) {
  return Ft(e ^ Ft(t ^ Ft(n)));
}
function G(e, t = 0, n = 0) {
  return It(e, t, n) / 4294967296;
}
function Lt(e) {
  return e * e * e * (e * (e * 6 - 15) + 10);
}
function Rt(e, t, n, r, i) {
  let a = (It(e, t, n) / 4294967296) * Math.PI * 2;
  return Math.cos(a) * r + Math.sin(a) * i;
}
function zt(e, t, n) {
  let r = Math.floor(t),
    i = Math.floor(n),
    a = t - r,
    o = n - i,
    s = Lt(a),
    c = Lt(o),
    l = Rt(e, r, i, a, o),
    u = Rt(e, r + 1, i, a - 1, o),
    d = Rt(e, r, i + 1, a, o - 1),
    f = Rt(e, r + 1, i + 1, a - 1, o - 1),
    p = l + (u - l) * s;
  return p + (d + (f - d) * s - p) * c;
}
function K(e, t, n, r, i = 2.03, a = 0.5) {
  let o = 0,
    s = 1,
    c = 0,
    l = t,
    u = n;
  for (let t = 0; t < r; t++) ((o += s * zt(e + t * 1013, l, u)), (c += s), (s *= a), (l *= i), (u *= i));
  return (o / c) * 1.6;
}
function Bt(e, t) {
  return zt(e, t, 0.5 + (e % 7) * 0.13);
}
function Vt(e, t, n) {
  let r = Math.min(1, Math.max(0, (n - e) / (t - e)));
  return r * r * (3 - 2 * r);
}
function Ht(e) {
  let t = 2166136261,
    n = (e) => (t = Math.imul(t ^ e, 16777619) >>> 0);
  n(10);
  for (let t of e.layers) {
    let e = JSON.stringify(t.material);
    for (let t = 0; t < e.length; t++) n(e.charCodeAt(t));
  }
  for (let n = 0; n < e.fieldDamage.length; n += 64)
    t = Math.imul(t ^ e.fieldDamage[n] ^ (e.fieldArea[n] << 16) ^ (n << 8), 16777619) >>> 0;
  let r = new Float32Array(e.position),
    i = new Uint32Array(r.buffer);
  for (let e = 0; e < i.length; e++) t = Math.imul(t ^ i[e], 16777619) >>> 0;
  for (let n = 0; n < e.segFlags.length; n++) t = Math.imul(t ^ e.segFlags[n], 16777619) >>> 0;
  return t >>> 0;
}
function Ut(e, t, n) {
  let r = Math.floor(t),
    i = Math.floor(n),
    a = 1e9,
    o = 1e9;
  for (let s = -1; s <= 1; s++)
    for (let c = -1; c <= 1; c++) {
      let l = r + c,
        u = i + s,
        d = l + 0.15 + 0.7 * G(e, l, u),
        f = u + 0.15 + 0.7 * G(e + 17, l, u),
        p = Math.hypot(d - t, f - n);
      p < a ? ((o = a), (a = p)) : p < o && (o = p);
    }
  return [a, o];
}
function Wt(e, t, n, r) {
  if (e.amount <= 0) return [0, 0];
  let i = Math.hypot(e.axis[0], e.axis[1]) || 1,
    a = e.axis[0] / i,
    o = e.axis[1] / i,
    s = n - e.center[0],
    c = r - e.center[1],
    l = (s * a + c * o) / e.radii[0],
    u = (-s * o + c * a) / e.radii[1],
    d = e.featureScale,
    f = 0.32 * K(t + 3, n / (1.4 * d), r / (1.4 * d), 4),
    p = 1 - Vt(0.4, 1.1, Math.hypot(l, u) + f),
    m = 1;
  if (e.cellSize > 0) {
    let i = n + 0.4 * d * K(t + 11, n / d, r / d, 3),
      a = r + 0.4 * d * K(t + 12, n / d, r / d, 3),
      [o, s] = Ut(t + 5, i / e.cellSize, a / e.cellSize);
    m = Vt(0.03, 0.3, s - o) ** 0.7;
  }
  p *= (0.82 + 0.18 * K(t + 7, n / (0.3 * d), r / (0.3 * d), 3)) * e.amount;
  let h = (e) => Math.min(1, Math.max(0, e));
  return [h(p * (0.12 + 0.88 * m)), h(p ** 2.2 * (0.35 + 0.65 * m))];
}
function Gt(e, t, n) {
  let r = e.bundle ?? [1, 1],
    i = h(e.material, r[0], r[1]),
    a = Math.floor(e.sizeU / i.pitchU) + 1,
    o = Math.floor(e.sizeV / i.pitchV) + 1,
    s = Math.cos(e.angle),
    c = Math.sin(e.angle),
    l = 1 - e.compressU,
    u = e.shear,
    d = 1 - e.compressV,
    f = [s * l, s * u - c * d, c * l, c * u + s * d],
    p = [((a - 1) * i.pitchU) / 2, ((o - 1) * i.pitchV) / 2],
    m = [0, 0, e.z];
  return {
    info: {
      index: t,
      material: i,
      weave: e.material,
      bundle: r,
      nx: a,
      ny: o,
      nodeOffset: n,
      nodeCount: a * o,
      mapA: f,
      mapOrigin: m,
      restCenter: p,
    },
  };
}
function Kt(e) {
  let t = [],
    n = 0;
  for (let r = 0; r < e.length; r++) {
    let { info: i } = Gt(e[r], r, n);
    (t.push(i), (n += i.nodeCount));
  }
  let r = n,
    i = st(t),
    a = {
      version: 1,
      layers: t,
      nodeCount: r,
      restUV: new Float64Array(2 * r),
      position: new Float64Array(3 * r),
      mass: new Float64Array(r),
      pinned: new Uint8Array(r),
      wear: new Float32Array(r),
      structuralWear: new Float32Array(r),
      restLength: new Float64Array(2 * r),
      softening: new Float64Array(2 * r),
      segFlags: new Uint16Array(2 * r),
      intact: new Float64Array(2 * r),
      cutMask: new Uint32Array(2 * r),
      failSite: new Float32Array(2 * r),
      field: i.layers,
      fieldStrength: new Float32Array(2 * i.count),
      fieldDamage: new Uint8Array(2 * i.count),
      fieldArea: new Uint8Array(2 * i.count).fill(255),
      crossingNormal0: new Float64Array(r),
      tails: new Float64Array(4 * r),
    };
  for (let n = 0; n < e.length; n++) (Jt(a, e[n], t[n]), Xt(a, e[n], t[n], i.layers[n]));
  let o = (e) => (a.segFlags[e] & 3) == 1,
    s = Uint16Array.from(a.segFlags);
  gt(t, i.layers, a.fieldArea, a.fieldDamage, a, o, 2, 8);
  for (let e = 0; e < a.segFlags.length; e++) a.segFlags[e] & 2 && !(s[e] & 2) && (a.segFlags[e] |= 4);
  return a;
}
function qt(e, t, n, r) {
  let i = Math.cos(e.angle),
    a = Math.sin(e.angle),
    o = n - t.restCenter[0],
    s = r - t.restCenter[1];
  return [i * o - a * s, a * o + i * s];
}
function Jt(e, t, n) {
  let r = n.material,
    { nx: i, ny: a, nodeOffset: o, mapA: s, mapOrigin: c, restCenter: l } = n,
    u = g(r),
    d = t.seed,
    f = r.yarns[0],
    p = r.yarns[1],
    m = t.collarRows;
  for (let h = 0; h < a; h++)
    for (let g = 0; g < i; g++) {
      let _ = o + h * i + g,
        v = g * r.pitchU,
        y = h * r.pitchV;
      ((e.restUV[2 * _] = v), (e.restUV[2 * _ + 1] = y));
      let b = v - l[0],
        x = y - l[1],
        S = c[0] + s[0] * b + s[1] * x,
        C = c[1] + s[2] * b + s[3] * x,
        w = g < m || h < m || g >= i - m || h >= a - m,
        T = 1 - Vt(0.16, 0.24, Math.hypot(S, C)),
        ee = w ? 0 : t.perturbation * T * K(101, S / 0.04, C / 0.04, 3);
      ((e.position[3 * _] = S),
        (e.position[3 * _ + 1] = C),
        (e.position[3 * _ + 2] = c[2] + ee),
        (e.mass[_] = u),
        (e.pinned[_] = +!!w));
      let [E, te] = qt(t, n, v, y),
        [ne, D] = Wt(t.wear, d, E, te);
      ((e.wear[_] = D), (e.structuralWear[_] = ne), (e.crossingNormal0[_] = r.crossingNormal0 * (1 - 0.7 * ne)));
      for (let t = 0; t < 2; t++) {
        let n = 2 * _ + t;
        if (!(t === 0 ? g < i - 1 : h < a - 1)) continue;
        let o = t === 0 ? f : p;
        ((e.segFlags[n] = 1),
          (e.restLength[n] = t === 0 ? r.pitchU : r.pitchV),
          (e.intact[n] = 1),
          (e.softening[n] = o.softeningOpening),
          (e.failSite[n] = 0.5));
      }
    }
}
const Yt = 0.001;
function Xt(e, t, n, r) {
  if (r.bu > 32 || r.bv > 32) throw Error(`bundle too large for the cut masks`);
  let i = n.weave,
    a = t.seed,
    o = i.pitchU,
    s = i.pitchV,
    c = -r.bu * o,
    l = -r.bv * s,
    u = Math.ceil(((r.K + 2 * r.bu) * o) / Yt) + 2,
    d = Math.ceil(((r.M + 2 * r.bv) * s) / Yt) + 2,
    f = new Float32Array(u * d),
    p = new Float32Array(u * d),
    m = new Float32Array(u * d);
  for (let e = 0; e < d; e++)
    for (let r = 0; r < u; r++) {
      let [i, o] = qt(t, n, c + r * Yt, l + e * Yt);
      ((f[e * u + r] = Wt(t.wear, a, i, o)[0]),
        (p[e * u + r] = K(a + 503, i / 0.011, o / 0.011, 3)),
        (m[e * u + r] = K(a + 991, i / 0.004, o / 0.004, 2)));
    }
  let h = (e, t, n) => {
      let r = Math.min(u - 1.001, Math.max(0, (t - c) / Yt)),
        i = Math.min(d - 1.001, Math.max(0, (n - l) / Yt)),
        a = Math.floor(r),
        o = Math.floor(i),
        s = r - a,
        f = i - o,
        p = e[o * u + a] + (e[o * u + a + 1] - e[o * u + a]) * s;
      return p + (e[(o + 1) * u + a] + (e[(o + 1) * u + a + 1] - e[(o + 1) * u + a]) * s - p) * f;
    },
    g = t.wear.defectThreshold;
  for (let n = 0; n < r.M; n++) {
    let c = (n - (r.bv - 1) / 2) * s;
    for (let s = 0; s < r.K; s++) {
      let l = (s - (r.bu - 1) / 2) * o,
        u = r.offset + n * r.K + s,
        d = h(f, l, c),
        _ = h(p, l, c);
      for (let r = 0; r < 2; r++) {
        let o = t.wearStrengthLoss[r],
          f = r === 0 ? d ** 1.3 : d ** 1.25,
          p = r === 1 ? s : n,
          m = r === 1 ? c : l,
          h = 1 + 0.25 * Bt(a + 4099 + 13 * p + 7 * r, m / 0.0025),
          g = (G(a + 503, u, r) + G(a + 617, u, r) - 1) * 2.45,
          v = Math.exp((0.2 + 0.12 * d) * _ + (0.06 + 0.22 * d) * g),
          y = Math.max(0.02, 1 - o * f);
        ((e.fieldArea[2 * u + r] = lt(y)),
          (e.fieldStrength[2 * u + r] = i.yarns[r].strength * Math.max(0.005, y * v * h)));
      }
      d > g + 0.04 * h(m, l, c) + 0.012 * (G(a + 990, s) - 0.5) &&
        G(a + 991, s, n) < t.wear.defectDensity &&
        (e.fieldDamage[2 * u + 1] = 255);
      let v = i.twillRepeat,
        y = Math.floor((n - (s % v) + 4 * v) / v),
        b = 0.02 * Vt(t.wear.sparseFrom, g, d) ** 2,
        x = (((n - s) % v) + v) % v < i.twillWarpOver;
      b > 0 && x && G(a + 997, s, y) < b && (e.fieldDamage[2 * u + 1] = 255);
    }
  }
}
const FABRICS = {
  denim: {
    material: m,
    bundle: [9, 6],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 1,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.89,
      defectDensity: 1,
      sparseFrom: 0.6,
    },
    wearStrengthLoss: [0.45, 0.9],
    seed: 1001,
    perturbation: 0.0025,
  },
  // the same sheet in hessian: 3x3 yarns per node keeps the node pitch (and the solve) near the denim's
  burlap: {
    material: burlap,
    bundle: [3, 3],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 0.4,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.95,
      defectDensity: 0.15,
      sparseFrom: 0.7,
    },
    wearStrengthLoss: [0.25, 0.35],
    seed: 2002,
    perturbation: 0.003,
  },
  tartan: {
    material: tartan,
    bundle: [5, 5],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 0.3,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.95,
      defectDensity: 0.1,
      sparseFrom: 0.7,
    },
    wearStrengthLoss: [0.2, 0.3],
    seed: 3003,
    perturbation: 0.003,
  },
  satin: {
    material: satin,
    bundle: [8, 7],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 0.25,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.96,
      defectDensity: 0.05,
      sparseFrom: 0.75,
    },
    wearStrengthLoss: [0.15, 0.25],
    seed: 4004,
    perturbation: 0.0025,
  },
  linen: {
    material: linen,
    bundle: [6, 6],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 0.35,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.95,
      defectDensity: 0.1,
      sparseFrom: 0.7,
    },
    wearStrengthLoss: [0.25, 0.35],
    seed: 5005,
    perturbation: 0.003,
  },
  chiffon: {
    material: chiffon,
    bundle: [9, 9],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 0.2,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.96,
      defectDensity: 0.05,
      sparseFrom: 0.75,
    },
    wearStrengthLoss: [0.1, 0.2],
    seed: 6006,
    perturbation: 0.003,
  },
  gauze: {
    material: gauze,
    bundle: [2, 2],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 0.3,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.96,
      defectDensity: 0.1,
      sparseFrom: 0.75,
    },
    wearStrengthLoss: [0.2, 0.3],
    seed: 7007,
    perturbation: 0.003,
  },
  lame: {
    material: lame,
    bundle: [8, 7],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 0.2,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.96,
      defectDensity: 0.05,
      sparseFrom: 0.75,
    },
    wearStrengthLoss: [0.15, 0.25],
    seed: 8008,
    perturbation: 0.003,
  },
  ballistic: {
    material: ballistic,
    bundle: [6, 6],
    sizeU: 0.62,
    sizeV: 0.4,
    z: 0,
    angle: 0.06,
    compressU: 0.025,
    compressV: -0.002,
    shear: 0.06,
    collarRows: 2,
    wear: {
      center: [0.01, -0.006],
      axis: [1, -1.15],
      radii: [0.2, 0.14],
      amount: 0.15,
      cellSize: 0.075,
      featureScale: 0.05,
      defectThreshold: 0.96,
      defectDensity: 0.02,
      sparseFrom: 0.75,
    },
    wearStrengthLoss: [0.05, 0.1],
    seed: 9009,
    perturbation: 0.003,
  },
};
function Zt(e = `denim`) {
  return [FABRICS[e] ?? FABRICS.denim];
}
function Qt(e, t) {
  if (t.byteLength !== 16 + 16 * e.N) return !1;
  let n = new Uint32Array(t, 0, 4);
  return n[0] !== 1346458180 || n[1] !== 1 || n[2] !== e.N || n[3] !== Ht(e.scene)
    ? !1
    : (e.device.queue.writeBuffer(e.x, 0, new Float32Array(t, 16)), !0);
}
async function $t(e, t, steps = 420) {
  let n = t.params,
    r = { newtonIterations: n.newtonIterations, newtonMax: n.newtonMax, pcgIterations: n.pcgIterations };
  ((n.newtonIterations = 5), (n.newtonMax = 5), (n.pcgIterations = 2), t.setHistoryEnabled(!1));
  try {
    for (let n = 0; n < steps; n++) {
      let i = e.createCommandEncoder({ label: `settle` });
      if (
        (t.encodeSubstep(i),
        n % 10 == 9 && n < steps - Math.min(60, steps >> 2) && i.clearBuffer(t.v),
        e.queue.submit([i.finish()]),
        n % 2 == 1)
      ) {
        let t = performance.now();
        (await e.queue.onSubmittedWorkDone(),
          await new Promise((e) => setTimeout(e, Math.min(30, performance.now() - t))));
      }
    }
  } finally {
    (Object.assign(n, r), t.setHistoryEnabled(!0));
  }
  let i = e.createCommandEncoder({ label: `settle.end` });
  (i.clearBuffer(t.v), i.clearBuffer(t.counters), e.queue.submit([i.finish()]), await e.queue.onSubmittedWorkDone());
}
var en = `// Dynamic node state (x.w): 0 = cloth, 1 = detached (part of a piece no longer connected to a mount or
// a grip), 2 = retired (left the scene: frozen, disconnected and not drawn). A detached piece stays in
// the cloth solve with the same mechanics: its spans carry load, damage and break, and it collides as
// cloth. The state only decides what may hold it (no grip takes it), how it is drawn (a surface of its
// own) and that it is retired once it leaves the scene. Detached pieces are found on the CPU from the
// packed connectivity.

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<storage, read> segs: array<Seg>;
@group(0) @binding(2) var<storage, read_write> x: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> packed: array<u32>;
@group(0) @binding(5) var<storage, read> freed: array<u32>;

// Per node: bit0 / bit1 = active span of family u / v owned by the node, bit2 = not cloth (x.w > 0),
// bit3 = retired (x.w > 1.5).
@compute @workgroup_size(128)
fn pack(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  var b = 0u;
  if (segActive(segs[2u * n])) { b |= 1u; }
  if (segActive(segs[2u * n + 1u])) { b |= 2u; }
  if (x[n].w > 0.5) { b |= 4u; }
  if (x[n].w > 1.5) { b |= 8u; }
  packed[n] = b;
}

// Nodes flagged by the CPU become detached (irreversible).
@compute @workgroup_size(128)
fn applyFreed(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  if (freed[n] == 0u || x[n].w > 0.5) { return; }
  x[n].w = 1.0;
}
`,
  tn = class {
    device;
    solver;
    scene;
    mod;
    group;
    packPipe;
    applyPipe;
    packed;
    freedBuf;
    staging;
    freed;
    visited;
    queue;
    stride;
    column;
    row;
    tail = 0;
    running = null;
    epoch = 0;
    again = !1;
    anchors = [];
    anchorSource;
    freedCount = 0;
    pieceOf;
    pieceNodes;
    pieceSignature = 0;
    constructor(e, t, n, r = null) {
      ((this.device = e), (this.anchorSource = r), (this.solver = t), (this.scene = n));
      let i = n.nodeCount;
      ((this.mod = new f(e, `state`, _ + en)),
        (this.packPipe = this.mod.pipeline(`pack`)),
        (this.applyPipe = this.mod.pipeline(`applyFreed`)),
        (this.packed = a(e, `state.packed`, 4 * i)),
        (this.freedBuf = a(e, `state.freed`, 4 * i)),
        (this.staging = e.createBuffer({
          label: `state.staging`,
          size: Math.max(16, 4 * i),
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        })),
        (this.group = this.mod.bindGroup(`state`, {
          0: t.simParams,
          1: t.segs,
          2: t.x,
          4: this.packed,
          5: this.freedBuf,
        })),
        (this.freed = new Uint32Array(i)),
        (this.pieceOf = new Uint32Array(i).fill(At)),
        (this.pieceNodes = new Uint32Array(i)),
        (this.visited = new Uint8Array(i)),
        (this.queue = new Int32Array(i)),
        (this.stride = new Int32Array(i)),
        (this.column = new Int32Array(i)),
        (this.row = new Int32Array(i)));
      for (let e of n.layers)
        for (let t = 0; t < e.nodeCount; t++) {
          let n = e.nodeOffset + t;
          ((this.stride[n] = e.nx), (this.column[n] = t % e.nx), (this.row[n] = Math.floor(t / e.nx)));
        }
    }
    request(e = []) {
      return (
        (this.anchors = e),
        this.running
          ? ((this.again = !0), this.running)
          : ((this.running = this.run().finally(() => (this.running = null))), this.running)
      );
    }
    currentAnchors() {
      return this.anchorSource ? this.anchorSource() : this.anchors;
    }
    reset() {
      (this.epoch++, (this.again = !1));
      let e = this.device.createCommandEncoder({ label: `state.reset` });
      (e.clearBuffer(this.freedBuf),
        this.device.queue.submit([e.finish()]),
        this.pieceOf.fill(At),
        (this.pieceSignature = 0),
        this.solver.setPieces(this.pieceOf, /* @__PURE__ */ new Uint32Array(1), /* @__PURE__ */ new Uint32Array()));
      let t = new Uint32Array(this.scene.nodeCount);
      for (let e = 0; e < t.length; e++) t[e] = this.scene.pinned[e];
      this.device.queue.writeBuffer(this.solver.levels[0].fixed, 0, t);
    }
    async run() {
      do {
        this.again = !1;
        let e = this.epoch,
          t = this.device.createCommandEncoder({ label: `state.pack` }),
          n = t.beginComputePass();
        (n.setBindGroup(0, this.group),
          n.setPipeline(this.packPipe),
          n.dispatchWorkgroups(Math.ceil(this.scene.nodeCount / 128)),
          n.end(),
          t.copyBufferToBuffer(this.packed, 0, this.staging, 0, 4 * this.scene.nodeCount),
          this.device.queue.submit([t.finish()]),
          await this.staging.mapAsync(GPUMapMode.READ));
        let r = new Uint32Array(this.staging.getMappedRange()).slice();
        if ((this.staging.unmap(), e === this.epoch)) {
          if (this.search(r, this.currentAnchors()) > 0) {
            this.device.queue.writeBuffer(this.freedBuf, 0, this.freed);
            let e = this.device.createCommandEncoder({ label: `state.apply` }),
              t = e.beginComputePass();
            (t.setBindGroup(0, this.group),
              t.setPipeline(this.applyPipe),
              t.dispatchWorkgroups(Math.ceil(this.scene.nodeCount / 128)),
              t.end(),
              this.device.queue.submit([e.finish()]));
          }
          this.labelPieces(r);
        }
      } while (this.again);
    }
    search(e, t) {
      let n = this.scene,
        r = this.visited;
      (r.fill(0), (this.tail = 0));
      for (let t = 0; t < n.nodeCount; t++) n.pinned[t] && this.push(e, t);
      this.flood(e, 0);
      for (let n of t) {
        if (r[n] || e[n] & 4) continue;
        let t = this.tail;
        (this.push(e, n), this.flood(e, t));
      }
      let i = 0;
      for (let t = 0; t < n.nodeCount; t++) {
        let n = +(!r[t] && !(e[t] & 4));
        ((this.freed[t] = n), (i += n));
      }
      return ((this.freedCount += i), i);
    }
    labelPieces(e) {
      let t = this.scene.nodeCount,
        n = (t) => (!!(e[t] & 4) && !(e[t] & 8)) || this.freed[t] === 1,
        r = this.pieceOf;
      r.fill(At);
      let i = [0],
        a = 0,
        o = 2166136261;
      for (let s = 0; s < t; s++) {
        if (r[s] !== 4294967295 || !n(s)) continue;
        let t = i.length - 1,
          c = a;
        for (r[s] = t, this.pieceNodes[a++] = s; c < a;) {
          let i = this.pieceNodes[c++],
            o = this.stride[i],
            s = [];
          (e[i] & 1 && s.push(i + 1),
            e[i] & 2 && s.push(i + o),
            this.column[i] > 0 && e[i - 1] & 1 && s.push(i - 1),
            this.row[i] > 0 && e[i - o] & 2 && s.push(i - o));
          for (let e of s) r[e] === 4294967295 && n(e) && ((r[e] = t), (this.pieceNodes[a++] = e));
        }
        (i.push(a), (o = Math.imul(o ^ (s + 1), 16777619) ^ a));
      }
      ((o = (o ^ i.length) >>> 0),
        o !== this.pieceSignature &&
          ((this.pieceSignature = o), this.solver.setPieces(r, Uint32Array.from(i), this.pieceNodes.subarray(0, a))));
    }
    push(e, t) {
      this.visited[t] || e[t] & 4 || ((this.visited[t] = 1), (this.queue[this.tail++] = t));
    }
    flood(e, t) {
      let { stride: n, column: r } = this;
      for (; t < this.tail;) {
        let i = this.queue[t++],
          a = n[i];
        (e[i] & 1 && this.push(e, i + 1),
          e[i] & 2 && this.push(e, i + a),
          r[i] > 0 && e[i - 1] & 1 && this.push(e, i - 1),
          this.row[i] > 0 && e[i - a] & 2 && this.push(e, i - a));
      }
    }
  },
  nn = `// Contact of the cloth with a kinematic body made of capsules (a staged creature's limbs, head and
// torso). Per Newton iteration, each cloth node inside the contact distance of a capsule gets a penalty
// term along the capsule's outward normal and Coulomb friction (regularised) on its step relative to
// the body's surface; gradient and Hessian are added to ext after the self-contact terms (which
// overwrite it) and before the grips (which add theirs). The body is prescribed: it takes no reaction.
// Contact is swept: a node's step and a capsule's motion over the substep are both linear, and where
// the node's path relative to the capsule enters it, the node meets the surface where it first touched
// (the tangent plane there, carried with the capsule to its end pose) instead of the closest point of
// its end position, which lies on the far side once a fast limb or a large step has crossed it.
// Claws pierce: once per substep (after commit), a node under a sharp capsule's point (beyond the end of
// its segment, within the point's half-width of its axis) that the capsule loads past the yarns'
// piercing force has every crossing within the point's half-width cut (the field update and span
// coupling part them). Nodes a claw holds (exempt 1) are on the claw: they neither collide with the
// body nor are pierced. Nodes it let go (exempt 2) slide off it: they meet the body again once clear.

const BODY_MAX: u32 = 48u;

struct Capsule {
  // segment start (xyz), radius (w), at the end of the substep
  a: vec4<f32>,
  // segment end (xyz), 1 if the capsule is in contact this substep (w)
  b: vec4<f32>,
  // displacement of the start and end over the substep (xyz); w = 1 if its end is a claw's point
  da: vec4<f32>,
  db: vec4<f32>,
};

struct BodyU {
  // capsule count, unused...
  count: vec4<u32>,
  // penalty stiffness (N/m), friction coefficient, regularisation speed x h (m), contact distance (m)
  law: vec4<f32>,
  // bounds of every capsule over the substep, start and end poses (expanded by its radius and the
  // contact distance): lo xyz, hi xyz
  lo: vec4<f32>,
  hi: vec4<f32>,
  // piercing force of the yarns under a claw's point (N), the point's half-width (m), unused...
  pierce: vec4<f32>,
  caps: array<Capsule, BODY_MAX>,
};

@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<uniform> B: BodyU;
@group(0) @binding(2) var<storage, read> nodes: array<NodeStatic>;
@group(0) @binding(3) var<storage, read> x: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> dx: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> ext: array<vec4<f32>>; // 3 per node (see assemble.wgsl)
// 1 where a claw holds the node, 2 where it let go of it and the node has not yet come clear of the body
@group(0) @binding(6) var<storage, read_write> exempt: array<u32>;
// yarn damage field (yarnfield.wgsl) and its layout per layer: first crossing, crossings per row, rows
@group(0) @binding(7) var<storage, read_write> field: array<u32>;
@group(0) @binding(8) var<uniform> FU: array<vec4<u32>, 3>;
@group(0) @binding(9) var<storage, read_write> fieldEvents: array<u32>;

// Distance of p from the surface of capsule (a, b, radius r) (x) and the closest point's parameter (y).
fn capsuleGap(p: vec3<f32>, a: vec3<f32>, b: vec3<f32>, r: f32) -> vec2<f32> {
  let e = b - a;
  let ee = dot(e, e);
  let s = select(0.0, clamp(dot(p - a, e) / ee, 0.0, 1.0), ee > 1e-12);
  return vec2<f32>(length(p - a - s * e) - r, s);
}

// First time in (0, 1] at which the point x0 + t dp enters capsule C (each end moving linearly over the
// substep to its pose at t = 1), or -1 where it does not (or starts inside: the closest point then
// decides). Conservative advancement: the gap shrinks no faster than the largest speed of the point
// relative to any point of the segment, which is at one of its ends.
const ENTRY_STEPS: i32 = 16;

fn entryTime(x0: vec3<f32>, dp: vec3<f32>, C: Capsule) -> f32 {
  let a0 = C.a.xyz - C.da.xyz;
  let b0 = C.b.xyz - C.db.xyz;
  let vmax = max(length(dp - C.da.xyz), length(dp - C.db.xyz));
  var g = capsuleGap(x0, a0, b0, C.a.w).x;
  if (g <= 0.0 || g >= vmax) { return -1.0; }
  let tol = 1e-3 * C.a.w;
  var t = 0.0;
  for (var k = 0; k < ENTRY_STEPS; k++) {
    t += g / vmax;
    if (t >= 1.0) { return -1.0; }
    g = capsuleGap(x0 + t * dp, a0 + t * C.da.xyz, b0 + t * C.db.xyz, C.a.w).x;
    if (g <= tol) { return t; }
  }
  return -1.0;
}

// w rotated by the rotation taking unit u to unit v (the shortest arc).
fn rotateArc(w: vec3<f32>, u: vec3<f32>, v: vec3<f32>) -> vec3<f32> {
  let c = dot(u, v);
  if (c < -0.99) { return w; }
  let k = cross(u, v);
  return c * w + cross(k, w) + k * (dot(k, w) / (1.0 + c));
}

@compute @workgroup_size(128)
fn bodyTerms(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || B.count.x == 0u) { return; }
  let ex = exempt[n];
  if ((nodes[n].flags & 1u) != 0u || x[n].w > 1.5 || ex == 1u) { return; }
  let x0 = x[n].xyz;
  let p = x0 + dx[n].xyz;
  if (any(min(x0, p) > B.hi.xyz) || any(max(x0, p) < B.lo.xyz)) {
    if (ex == 2u) { exempt[n] = 0u; }
    return;
  }
  let kc = B.law.x;
  let mu = B.law.y;
  let epsU = B.law.z;
  let delta = B.law.w;
  var g = vec3<f32>(0.0);
  var H0 = vec3<f32>(0.0); // xx yy zz
  var H1 = vec3<f32>(0.0); // xy xz yz
  var touched = false;
  for (var c = 0u; c < min(B.count.x, BODY_MAX); c++) {
    let C = B.caps[c];
    if (C.b.w < 0.5) { continue; }
    let e = C.b.xyz - C.a.xyz;
    var s: f32;
    var d: f32;
    var nn: vec3<f32>;
    let te = entryTime(x0, dx[n].xyz, C);
    if (te >= 0.0) {
      // the path entered the capsule: the tangent plane where it first touched, moved with the capsule
      let at = C.a.xyz - (1.0 - te) * C.da.xyz;
      let bt = C.b.xyz - (1.0 - te) * C.db.xyz;
      let xt = x0 + te * dx[n].xyz;
      s = capsuleGap(xt, at, bt, C.a.w).y;
      let rt = xt - at - s * (bt - at);
      let lt = length(rt);
      if (lt <= 1e-7) { continue; }
      let et = bt - at;
      nn = rt / lt;
      if (dot(et, et) > 1e-12 && dot(e, e) > 1e-12) { nn = normalize(rotateArc(nn, normalize(et), normalize(e))); }
      d = dot(p - C.a.xyz - s * e, nn) - C.a.w;
      if (d >= delta) { continue; }
    } else {
      let ee = dot(e, e);
      s = select(0.0, clamp(dot(p - C.a.xyz, e) / ee, 0.0, 1.0), ee > 1e-12);
      let r = p - C.a.xyz - s * e;
      let dist = length(r);
      d = dist - C.a.w;
      if (d >= delta || dist <= 1e-7) { continue; }
      nn = r / dist;
    }
    let lam = kc * (delta - d);
    // friction on the step relative to the body's surface there
    let rel = dx[n].xyz - mix(C.da.xyz, C.db.xyz, s);
    let ut = rel - dot(rel, nn) * nn;
    let kf = mu * lam / max(length(ut), epsU);
    g += -lam * nn + kf * ut;
    let a = kc - kf;
    H0 += a * nn * nn + vec3<f32>(kf);
    H1 += a * vec3<f32>(nn.x * nn.y, nn.x * nn.z, nn.y * nn.z);
    touched = true;
  }
  if (ex == 2u) {
    if (!touched) { exempt[n] = 0u; }
    return;
  }
  if (!touched) { return; }
  let b = 3u * n;
  ext[b] = ext[b] + vec4<f32>(g, 0.0);
  ext[b + 1u] = ext[b + 1u] + vec4<f32>(H0.x, H1.x, H1.y, H0.y);
  ext[b + 2u] = ext[b + 2u] + vec4<f32>(H1.z, H0.z, 0.0, 0.0);
}

// Cut both yarns of every crossing within \`radius\` of node n's place in the weave (a node sits at
// the centre of its span's bundle: crossing (i bu + (bu - 1) / 2, j bv + (bv - 1) / 2)).
fn cutAround(n: u32, radius: f32) {
  let ijl = nodes[n].ijl;
  let l = ijl >> 24u;
  let L = P.layers[l];
  let bu = u32(L.yarn[1].yarnsPerSpan);
  let bv = u32(L.yarn[0].yarnsPerSpan);
  let pu = L.a.w / f32(bu);
  let pv = L.b.x / f32(bv);
  let k0 = f32((ijl & 0xFFFu) * bu) + 0.5 * f32(bu - 1u);
  let m0 = f32(((ijl >> 12u) & 0xFFFu) * bv) + 0.5 * f32(bv - 1u);
  let F = FU[l];
  let mLo = u32(max(0.0, ceil(m0 - radius / pv)));
  let mHi = u32(min(f32(F.z) - 1.0, floor(m0 + radius / pv)));
  for (var m = mLo; m <= mHi; m++) {
    let dv = (f32(m) - m0) * pv;
    let half = sqrt(max(0.0, radius * radius - dv * dv)) / pu;
    let kLo = u32(max(0.0, ceil(k0 - half)));
    let kHi = min(F.y - 1u, u32(max(0.0, floor(k0 + half))));
    for (var k = kLo; k <= kHi; k++) {
      let c = F.x + m * F.y + k;
      field[c] = field[c] | 0xFFFFu;
    }
  }
}

@compute @workgroup_size(128)
fn pierce(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || B.count.x == 0u) { return; }
  if ((nodes[n].flags & 1u) != 0u || x[n].w > 1.5 || exempt[n] != 0u) { return; }
  let p = x[n].xyz;
  if (any(p < B.lo.xyz) || any(p > B.hi.xyz)) { return; }
  let kc = B.law.x;
  let delta = B.law.w;
  for (var c = 0u; c < min(B.count.x, BODY_MAX); c++) {
    let C = B.caps[c];
    if (C.b.w < 0.5 || C.da.w < 0.5) { continue; }
    // only under the point: past the end of the segment and within the point's half-width of its axis
    // (the finger's rounded tip around the nail is blunt)
    let ax = normalize(C.b.xyz - C.a.xyz);
    let v = p - C.b.xyz;
    let along = dot(v, ax);
    if (along <= 0.0 || length(v - along * ax) > B.pierce.y) { continue; }
    let d = length(v) - C.a.w;
    if (kc * (delta - d) < B.pierce.x) { continue; }
    cutAround(n, B.pierce.y);
    fieldEvents[0] = 1u;
    return;
  }
}

// Knife strokes (Engine.bladePointer). A stroke is the straight run, in the weave, between the
// crossings under two nodes the pointer picked in turn; every crossing within the blade's half-width
// of the run has both yarns cut. Cutting in weave space (not around nodes) keeps the slit continuous
// and its width even however fast the pointer moved. A run whose ends lie far apart in the weave
// (the pointer crossed a fold or an edge between picks) is cut as a point at its end instead.
const BLADE_MAX: u32 = 16u;
const BLADE_INVOCATIONS: u32 = 4096u;
const BLADE_MAX_RUN: f32 = 0.06;

struct Stroke {
  // node under the start and the end of the run, unused...
  nodes: vec4<u32>,
  // half-width of the slit (m), unused...
  width: vec4<f32>,
};

struct BladeU {
  // stroke count, unused...
  count: vec4<u32>,
  strokes: array<Stroke, BLADE_MAX>,
};

@group(0) @binding(10) var<uniform> BL: BladeU;

// Wind (Engine.setWind): a pressure on every cloth node along the wind, gusting over space and time,
// added to the external force at assembly. Pinned nodes and pieces that left the scene feel none.
struct WindU {
  // direction (xyz, unit), pressure (Pa)
  dir: vec4<f32>,
  // time (s), gust length (m), unused...
  params: vec4<f32>,
};

@group(0) @binding(11) var<uniform> WD: WindU;

@compute @workgroup_size(128)
fn windTerms(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x || WD.dir.w <= 0.0) { return; }
  if ((nodes[n].flags & 1u) != 0u || x[n].w > 1.5) { return; }
  let p = x[n].xyz;
  let t = WD.params.x;
  let k = 6.2831853 / max(WD.params.y, 0.01);
  let gust = 0.55 + 0.25 * sin(k * (p.x + 0.3 * p.y) - 2.1 * t) + 0.2 * sin(0.53 * k * (p.y - 0.4 * p.x) + 1.3 * t) + 0.15 * sin(3.1 * k * p.x + 5.7 * t);
  let L = P.layers[nodes[n].ijl >> 24u];
  let area = L.a.w * L.b.x;
  let b = 3u * n;
  ext[b] = ext[b] + vec4<f32>(WD.dir.xyz * (WD.dir.w * area * max(gust, 0.0)), 0.0);
}

// a node's crossing (the centre of its span's bundle) in metres along the warp and the weft
fn crossingOf(ijl: u32, bu: u32, bv: u32, pu: f32, pv: f32) -> vec2<f32> {
  let i = ijl & 0xFFFu;
  let j = (ijl >> 12u) & 0xFFFu;
  return vec2<f32>((f32(i * bu) + 0.5 * f32(bu - 1u)) * pu, (f32(j * bv) + 0.5 * f32(bv - 1u)) * pv);
}

@compute @workgroup_size(64)
fn slash(@builtin(global_invocation_id) gid: vec3<u32>) {
  let t = gid.x;
  let count = min(BL.count.x, BLADE_MAX);
  for (var s = 0u; s < count; s++) {
    let S = BL.strokes[s];
    if (S.nodes.x >= P.counts.x || S.nodes.y >= P.counts.x) { continue; }
    let ia = nodes[S.nodes.x].ijl;
    let ib = nodes[S.nodes.y].ijl;
    let l = ia >> 24u;
    if (l != (ib >> 24u)) { continue; }
    let L = P.layers[l];
    let bu = u32(L.yarn[1].yarnsPerSpan);
    let bv = u32(L.yarn[0].yarnsPerSpan);
    let pu = L.a.w / f32(bu);
    let pv = L.b.x / f32(bv);
    let b = crossingOf(ib, bu, bv, pu, pv);
    var a = crossingOf(ia, bu, bv, pu, pv);
    if (distance(a, b) > BLADE_MAX_RUN) { a = b; }
    let r = S.width.x;
    let F = FU[l];
    let lo = max(vec2<f32>(0.0), min(a, b) - vec2<f32>(r));
    let hi = max(a, b) + vec2<f32>(r);
    let kLo = u32(ceil(lo.x / pu));
    let mLo = u32(ceil(lo.y / pv));
    let kHi = u32(min(f32(F.y) - 1.0, floor(hi.x / pu)));
    let mHi = u32(min(f32(F.z) - 1.0, floor(hi.y / pv)));
    if (kHi < kLo || mHi < mLo) { continue; }
    let nk = kHi - kLo + 1u;
    let nm = mHi - mLo + 1u;
    let ab = b - a;
    let len2 = max(dot(ab, ab), 1e-12);
    for (var c = t; c < nk * nm; c += BLADE_INVOCATIONS) {
      let k = kLo + c % nk;
      let m = mLo + c / nk;
      let p = vec2<f32>(f32(k) * pu, f32(m) * pv);
      let u = clamp(dot(p - a, ab) / len2, 0.0, 1.0);
      if (distance(p, a + u * ab) > r) { continue; }
      let idx = F.x + m * F.y + k;
      field[idx] = field[idx] | 0xFFFFu;
    }
  }
  if (t == 0u && count > 0u) { fieldEvents[0] = 1u; }
}
`;
const rn = { stiffness: 3e3, friction: 0.6, frictionSpeed: 0.004, distance: 0.0015 },
  an = { force: 4, radius: 0.0022 },
  // knife: half-width of the slit (m) and the pick window around the pointer (fraction of the viewport height)
  KNIFE = { width: 0.0008, pickWindow: 0.012 };
var on = class {
  device;
  solver;
  uniform;
  exemptBuf;
  exempt;
  terms;
  pierce;
  blade;
  bladeU;
  wind;
  windU;
  windData = /* @__PURE__ */ new Float32Array(8);
  windOn = !1;
  bladeData = /* @__PURE__ */ new Float32Array(4 + 8 * 16);
  bladeWords = /* @__PURE__ */ new Uint32Array(this.bladeData.buffer);
  strokes = [];
  group;
  data = /* @__PURE__ */ new Float32Array(788);
  prev = /* @__PURE__ */ new Float32Array(288);
  count = 0;
  sharp = !1;
  hasPrev = !1;
  constructor(e, t, n) {
    if (!t.contactEnabled) throw Error(`body contact adds to the contact terms (self-contact must be on)`);
    ((this.device = e),
      (this.solver = t),
      (this.uniform = a(e, `bodyU`, 4 * this.data.length, i)),
      (this.exempt = new Uint32Array(t.N)),
      (this.exemptBuf = o(e, `body.exempt`, this.exempt)));
    let r = /* @__PURE__ */ new Uint32Array(12);
    n.field.forEach((e, t) => r.set([e.offset, e.K, e.M, 0], 4 * t));
    let s = o(e, `body.fieldU`, r, i),
      c = new f(e, `body`, _ + nn);
    ((this.terms = c.pipeline(`bodyTerms`)),
      (this.pierce = c.pipeline(`pierce`)),
      (this.blade = c.pipeline(`slash`)),
      (this.bladeU = a(e, `bladeU`, 4 * this.bladeData.length, i)),
      (this.wind = c.pipeline(`windTerms`)),
      (this.windU = a(e, `windU`, 32, i)),
      (this.group = c.bindGroup(`body`, {
        0: t.simParams,
        1: this.uniform,
        2: t.nodes,
        3: t.x,
        4: t.dx,
        5: t.ext,
        6: this.exemptBuf,
        7: t.field,
        8: s,
        9: t.fieldEvents,
        10: this.bladeU,
        11: this.windU,
      })),
      this.data.set([an.force, an.radius, 0, 0], 16),
      this.device.queue.writeBuffer(this.uniform, 0, this.data, 0, 20));
  }
  get active() {
    return this.count > 0;
  }
  setPose(e, t) {
    let n = Math.min(48, e.length),
      r = this.data,
      i = rn.distance,
      a = [1 / 0, 1 / 0, 1 / 0],
      o = [-1 / 0, -1 / 0, -1 / 0],
      s = 0,
      c = !1;
    for (let t = 0; t < n; t++) {
      let n = e[t],
        l = 20 + 16 * t,
        u = this.prev.subarray(6 * t, 6 * t + 6);
      if (
        ((r[l] = n.a[0]),
        (r[l + 1] = n.a[1]),
        (r[l + 2] = n.a[2]),
        (r[l + 3] = n.radius),
        (r[l + 4] = n.b[0]),
        (r[l + 5] = n.b[1]),
        (r[l + 6] = n.b[2]),
        (r[l + 7] = +!!n.active),
        n.active && this.hasPrev)
      )
        for (let e = 0; e < 3; e++)
          ((a[e] = Math.min(a[e], u[e] - n.radius - i, u[3 + e] - n.radius - i)),
            (o[e] = Math.max(o[e], u[e] + n.radius + i, u[3 + e] + n.radius + i)));
      for (let e = 0; e < 3; e++)
        ((r[l + 8 + e] = this.hasPrev ? n.a[e] - u[e] : 0),
          (r[l + 12 + e] = this.hasPrev ? n.b[e] - u[3 + e] : 0),
          (u[e] = n.a[e]),
          (u[3 + e] = n.b[e]));
      if (((r[l + 11] = +!!n.sharp), (r[l + 15] = 0), n.active)) {
        (s++, (c ||= !!n.sharp));
        for (let e = 0; e < 3; e++)
          ((a[e] = Math.min(a[e], n.a[e] - n.radius - i, n.b[e] - n.radius - i)),
            (o[e] = Math.max(o[e], n.a[e] + n.radius + i, n.b[e] + n.radius + i)));
      }
    }
    ((this.hasPrev = n > 0),
      (this.count = s > 0 ? n : 0),
      (this.sharp = s > 0 && c),
      (new Uint32Array(r.buffer, 0, 4)[0] = this.count),
      (r[4] = rn.stiffness),
      (r[5] = rn.friction),
      (r[6] = rn.frictionSpeed * t),
      (r[7] = i),
      s > 0 ? r.set([a[0], a[1], a[2], 0, o[0], o[1], o[2], 0], 8) : r.fill(0, 8, 16),
      this.device.queue.writeBuffer(this.uniform, 0, r, 0, 20 + 16 * n));
  }
  setExempt(e, t) {
    let n = Int32Array.from(e).sort();
    for (let e = 0; e < n.length;) {
      let r = e + 1;
      for (; r < n.length && n[r] === n[r - 1] + 1;) r++;
      (this.exempt.fill(t ? 1 : 2, n[e], n[r - 1] + 1),
        this.device.queue.writeBuffer(this.exemptBuf, 4 * n[e], this.exempt, n[e], r - e),
        (e = r));
    }
  }
  clear() {
    (this.setPose([], 0),
      (this.hasPrev = !1),
      this.exempt.fill(0),
      this.device.queue.writeBuffer(this.exemptBuf, 0, this.exempt));
  }
  encode(e) {
    (this.count > 0 && e(this.terms, this.group, Math.ceil(this.solver.N / 128)),
      this.windOn && e(this.wind, this.group, Math.ceil(this.solver.N / 128)));
  }
  // wind: unit direction, pressure (Pa; 0 switches it off), gust length (m)
  setWind(e, t, n = 0.25) {
    let r = this.windData;
    (r.set([e[0], e[1], e[2], t], 0),
      (r[5] = n),
      (this.windOn = t > 0),
      this.device.queue.writeBuffer(this.windU, 0, r));
  }
  tickWind(e) {
    this.windOn && ((this.windData[4] = e), this.device.queue.writeBuffer(this.windU, 16, this.windData, 4, 4));
  }
  encodePierce(e) {
    this.sharp &&
      (e.setPipeline(this.pierce), e.setBindGroup(0, this.group), e.dispatchWorkgroups(Math.ceil(this.solver.N / 128)));
  }
  // queue a knife stroke from the crossing under node a to the one under node b (applied by the next substep)
  cut(e, t, n = KNIFE.width) {
    this.strokes.length < 16 && this.strokes.push([e, t, n]);
  }
  clearStrokes() {
    this.strokes.length = 0;
  }
  encodeSlash(e) {
    let t = this.strokes.length;
    if (t === 0) return;
    let n = this.bladeWords,
      r = this.bladeData;
    n[0] = t;
    this.strokes.forEach(([e, t, i], a) => {
      let o = 4 + 8 * a;
      ((n[o] = e), (n[o + 1] = t), (r[o + 4] = i));
    });
    ((this.strokes.length = 0),
      this.device.queue.writeBuffer(this.bladeU, 0, r, 0, 4 + 8 * t),
      e.setPipeline(this.blade),
      e.setBindGroup(0, this.group),
      e.dispatchWorkgroups(64));
  }
};
const sn = 13.8 / 21.4,
  cn = [
    [0, 4.71],
    [5.54, 9.83],
    [10.76, 16.01],
    [16.72, 20.11],
  ];
function ln(e) {
  let t = e.name.split(`.`)[1];
  if (t !== `L` && t !== `R`) throw Error(`clip event ${e.name} names no hand`);
  return t;
}
function un(e) {
  let t = [...e.events].sort((e, t) => e.t - t.t),
    n = t.flatMap((e, n) => {
      let r = e.name.split(`.`)[0];
      switch (r) {
        case `hook`:
        case `grab`:
        case `release`:
          return [{ t: e.t, kind: r, side: ln(e) }];
        case `aim`: {
          let i = ln(e),
            a = t.slice(n + 1).find((e) => e.name === `grab.${i}`);
          if (!a || e.args.length !== 1) throw Error(`clip aim at ${e.t} has no radius or grab after it`);
          return [{ t: e.t, kind: r, side: i, radius: e.args[0], lead: a.t - e.t }];
        }
        case `laugh`:
          return [];
        case `glitch`:
          if (e.args.length !== 2) throw Error(`clip glitch at ${e.t} needs duration and level`);
          return [{ t: e.t, kind: r, duration: e.args[0], level: e.args[1] }];
        default:
          throw Error(`unknown clip event ${e.name}`);
      }
    });
  for (let [e, t] of cn) n.push({ t: 0.5 + e * sn, kind: `laugh`, from: e, to: t });
  n.push({ t: 0, kind: `ambient` });
  let r = n.reduce((e, t) => (t.kind === `glitch` && (!e || t.t >= e.t) ? t : e), null);
  return (
    r?.kind === `glitch` && n.push({ t: r.t, kind: `ambientFade`, duration: r.duration }),
    n.sort((e, t) => e.t - t.t)
  );
}
var dn = class {
  fps;
  frames;
  duration;
  joints;
  bindT;
  root;
  skeleton;
  events;
  jaw;
  data;
  quats;
  width;
  offset = {};
  out;
  constructor(e) {
    let t = new DataView(e);
    if (t.getUint32(0, !0) !== 1346980931) throw Error(`not a clip`);
    let n = t.getUint32(4, !0),
      r = JSON.parse(new TextDecoder().decode(new Uint8Array(e, 8, n)));
    if (r.version !== 2) throw Error(`clip version ${r.version}`);
    ((this.fps = r.fps),
      (this.frames = r.frames),
      (this.duration = (r.frames - 1) / r.fps),
      (this.joints = r.joints),
      (this.bindT = r.bindT),
      (this.root = r.root),
      (this.skeleton = Float64Array.from(r.skeleton)),
      (this.events = r.events),
      (this.jaw = r.jaw));
    let i = 0;
    for (let e of r.channels) ((this.offset[e.name] = i), (i += e.size));
    this.width = i;
    let a = 8 + n;
    ((this.data = new Float32Array(e, a, r.frames * i)),
      (this.quats = new Int16Array(e, a + 4 * r.frames * i, r.frames * r.joints.length * 4)),
      (this.out = {
        rotations: new Float64Array(4 * r.joints.length),
        rootT: [0, 0, 0],
        eye: [0, 0, 0],
        target: [0, 0, 0],
        up: [0, 1, 0],
        fovY: 0,
        bulbPos: [0, 0, 0],
        bulbAim: [0, 0, -1],
        bulbCone: [0, 1],
        bulbI: 0,
        bulbColor: [1, 1, 1],
        torchPos: [0, 0, 0],
        torchAim: [0, 0, -1],
        torchCone: [0, 1],
        torchI: 0,
        torchColor: [1, 1, 1],
        pitPos: [0, 0, 0],
        pitI: [0, 0, 0],
        over: 0,
        ambient: 1,
        exposure: 1,
        grade: 0,
        grain: 0,
        vignette: 0,
        glitch: 0,
        freeze: !1,
        jawOpen: 0,
        jawLaugh: 0,
      }));
  }
  sample(e) {
    let t = Math.min(Math.max(e * this.fps, 0), this.frames - 1),
      n = Math.floor(t),
      r = Math.min(n + 1, this.frames - 1),
      i = t - n,
      a = this.out,
      o = (e, t = 0) => {
        let a = this.offset[e] + t,
          o = this.data[n * this.width + a];
        return o + (this.data[r * this.width + a] - o) * i;
      },
      s = (e, t) => {
        for (let n = 0; n < t.length; n++) t[n] = o(e, n);
      };
    (s(`rootT`, a.rootT),
      s(`eye`, a.eye),
      s(`target`, a.target),
      s(`up`, a.up),
      (a.fovY = o(`fovY`)),
      s(`bulbPos`, a.bulbPos),
      s(`bulbAim`, a.bulbAim),
      s(`bulbCone`, a.bulbCone),
      (a.bulbI = o(`bulbI`)),
      s(`bulbColor`, a.bulbColor),
      s(`torchPos`, a.torchPos),
      s(`torchAim`, a.torchAim),
      s(`torchCone`, a.torchCone),
      (a.torchI = o(`torchI`)),
      s(`torchColor`, a.torchColor),
      s(`pitPos`, a.pitPos),
      s(`pitI`, a.pitI),
      (a.over = o(`over`)),
      (a.ambient = o(`ambient`)),
      (a.exposure = o(`exposure`)),
      (a.grade = o(`grade`)),
      (a.grain = o(`grain`)),
      (a.vignette = o(`vignette`)),
      (a.jawOpen = o(`jawOpen`)),
      (a.jawLaugh = o(`jawLaugh`)),
      (a.glitch = this.data[Math.round(t) * this.width + this.offset.glitch]),
      (a.freeze = this.data[n * this.width + this.offset.freeze] >= 0.5));
    let c = this.joints.length,
      l = this.quats,
      u = a.rotations;
    for (let e = 0; e < c; e++) {
      let t = 4 * (n * c + e),
        a = 4 * (r * c + e),
        o = l[t] * l[a] + l[t + 1] * l[a + 1] + l[t + 2] * l[a + 2] + l[t + 3] * l[a + 3] < 0 ? -1 : 1,
        s = 0;
      for (let n = 0; n < 4; n++) {
        let r = l[t + n] + (o * l[a + n] - l[t + n]) * i;
        ((u[4 * e + n] = r), (s += r * r));
      }
      s = 1 / Math.sqrt(s);
      for (let t = 0; t < 4; t++) u[4 * e + t] *= s;
    }
    return a;
  }
};
const fn = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function pn(e) {
  let t = new DataView(e);
  if (t.getUint32(0, !0) !== 1179937895) throw Error(`not a GLB file`);
  let n = t.getUint32(12, !0),
    r = JSON.parse(new TextDecoder().decode(new Uint8Array(e, 20, n))),
    i = 20 + n + 8,
    a = new Uint8Array(e, i, t.getUint32(20 + n, !0)),
    o = (e) => {
      let t = r.accessors[e],
        n = r.bufferViews[t.bufferView],
        i = fn[t.type],
        o = t.componentType === 5126 || t.componentType === 5125 ? 4 : t.componentType === 5123 ? 2 : 1,
        s = n.byteStride ?? i * o,
        c = a.byteOffset + (n.byteOffset ?? 0) + (t.byteOffset ?? 0),
        l = new DataView(a.buffer),
        u =
          t.componentType === 5126
            ? new Float32Array(t.count * i)
            : t.componentType === 5125
              ? new Uint32Array(t.count * i)
              : new Uint16Array(t.count * i);
      for (let e = 0; e < t.count; e++)
        for (let n = 0; n < i; n++) {
          let r = c + e * s + n * o;
          t.componentType === 5126
            ? (u[e * i + n] = l.getFloat32(r, !0))
            : t.componentType === 5125
              ? (u[e * i + n] = l.getUint32(r, !0))
              : t.componentType === 5123
                ? (u[e * i + n] = l.getUint16(r, !0))
                : (u[e * i + n] = l.getUint8(r));
        }
      return u;
    },
    s = r.nodes.map((e) => ({
      name: e.name ?? ``,
      parent: -1,
      children: e.children ?? [],
      translation: e.translation ?? [0, 0, 0],
      rotation: e.rotation ?? [0, 0, 0, 1],
      scale: e.scale ?? [1, 1, 1],
      matrix: e.matrix ? Float64Array.from(e.matrix) : null,
    }));
  s.forEach((e, t) => e.children.forEach((e) => (s[e].parent = t)));
  let c = r.nodes.find((e) => e.mesh !== void 0 && e.skin !== void 0);
  if (!c) throw Error(`no skinned mesh`);
  let l = r.meshes[c.mesh].primitives[0],
    u = r.skins[c.skin],
    d = l.attributes,
    f = r.accessors[d.POSITION].count,
    p = o(d.WEIGHTS_0),
    m =
      p instanceof Float32Array
        ? p
        : Float32Array.from(p, (e) => e / (r.accessors[d.WEIGHTS_0].componentType === 5121 ? 255 : 65535)),
    h = o(d.JOINTS_0),
    g = (e) => {
      if (e === void 0 || !r.textures || !r.images) return null;
      let t = r.images[r.textures[e].source],
        n = r.bufferViews[t.bufferView];
      return { bytes: new Uint8Array(a.buffer, a.byteOffset + (n.byteOffset ?? 0), n.byteLength), mime: t.mimeType };
    },
    _ = l.material === void 0 ? void 0 : r.materials?.[l.material];
  return {
    nodes: s,
    roots: r.scenes[r.scene ?? 0].nodes,
    joints: u.joints,
    inverseBind: o(u.inverseBindMatrices),
    position: o(d.POSITION),
    normal: o(d.NORMAL),
    tangent: d.TANGENT === void 0 ? new Float32Array(4 * f) : o(d.TANGENT),
    uv: o(d.TEXCOORD_0),
    jointIndex: h instanceof Uint16Array ? h : Uint16Array.from(h),
    weight: m,
    index: Uint32Array.from(o(l.indices)),
    baseColor: g(_?.pbrMetallicRoughness?.baseColorTexture?.index),
    normalMap: g(_?.normalTexture?.index),
    orm: g(_?.pbrMetallicRoughness?.metallicRoughnessTexture?.index ?? _?.occlusionTexture?.index),
  };
}
async function mn(e) {
  let t = await fetch(new URL(`${ASSET_BASE}models/smilie.glb`, e));
  if (!t.ok) throw Error(`creature model unavailable (${t.status})`);
  let n = pn(await t.arrayBuffer()),
    r = (e) => {
      if (!e) throw Error(`creature material image missing`);
      return createImageBitmap(new Blob([e.bytes], { type: e.mime }), {
        colorSpaceConversion: `none`,
        premultiplyAlpha: `none`,
      });
    },
    [i, a, o] = await Promise.all([r(n.baseColor), r(n.normalMap), r(n.orm)]);
  return { model: n, images: { base: i, normal: a, orm: o } };
}
async function hn(e) {
  let t = await fetch(new URL(`${ASSET_BASE}stage/smilie.clip`, e));
  if (!t.ok) throw Error(`experience clip unavailable (${t.status})`);
  return new dn(await t.arrayBuffer());
}
var gn = `// A staged creature: a skinned mesh (linear blend skinning on the GPU) lit by the scene's lights with
// their shadow maps (the cloth shades it through its openings, and it shades the cloth), plus the
// stage's own pit light below the cloth. Skin: GGX specular on a wrapped diffuse (light scattered
// under the skin reaches past the terminator, reddened).

struct CreatureU {
  // pit light: position (xyz), unused
  pit: vec4<f32>,
  // pit light: radiant intensity (rgb, W/sr-equivalent in the scene's units), unused
  pitColor: vec4<f32>,
};

@group(0) @binding(0) var<uniform> F: FrameU;
@group(0) @binding(1) var<uniform> CU: CreatureU;
@group(0) @binding(2) var<storage, read> joints: array<mat4x4<f32>>;
@group(0) @binding(3) var shadowMap: texture_depth_2d;
@group(0) @binding(4) var shadowSampler: sampler_comparison;
@group(0) @binding(5) var overMap: texture_depth_2d;
@group(0) @binding(6) var baseTex: texture_2d<f32>;
@group(0) @binding(7) var normalTex: texture_2d<f32>;
@group(0) @binding(8) var ormTex: texture_2d<f32>;
@group(0) @binding(9) var texSampler: sampler;

struct VIn {
  @location(0) pos: vec3<f32>,
  @location(1) nrm: vec3<f32>,
  @location(2) tan: vec4<f32>,
  @location(3) uv: vec2<f32>,
  @location(4) j: vec4<u32>,
  @location(5) w: vec4<f32>,
};

struct VOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) world: vec3<f32>,
  @location(1) nrm: vec3<f32>,
  @location(2) tan: vec4<f32>,
  @location(3) uv: vec2<f32>,
};

fn skinMatrix(j: vec4<u32>, w: vec4<f32>) -> mat4x4<f32> {
  return joints[j.x] * w.x + joints[j.y] * w.y + joints[j.z] * w.z + joints[j.w] * w.w;
}

@vertex
fn vsMain(v: VIn) -> VOut {
  let M = skinMatrix(v.j, v.w);
  let P = (M * vec4<f32>(v.pos, 1.0)).xyz;
  let M3 = mat3x3<f32>(M[0].xyz, M[1].xyz, M[2].xyz);
  var o: VOut;
  o.clip = F.viewProj * vec4<f32>(P, 1.0);
  o.world = P;
  o.nrm = M3 * v.nrm;
  o.tan = vec4<f32>(M3 * v.tan.xyz, v.tan.w);
  o.uv = v.uv;
  return o;
}

// depth from the light whose projection the bound frame uniform carries (key or overhead)
@vertex
fn vsShadow(v: VIn) -> @builtin(position) vec4<f32> {
  let M = skinMatrix(v.j, v.w);
  return F.lightViewProj * (M * vec4<f32>(v.pos, 1.0));
}

fn ggxSpec(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, a: f32, f0: f32) -> f32 {
  let H = normalize(L + V);
  let NL = max(dot(N, L), 0.0);
  let NV = max(dot(N, V), 1e-3);
  let NH = max(dot(N, H), 0.0);
  let a2 = a * a;
  let d = NH * NH * (a2 - 1.0) + 1.0;
  let D = a2 / (PI * d * d);
  let k = a * 0.5;
  let G = (NL / (NL * (1.0 - k) + k)) * (NV / (NV * (1.0 - k) + k));
  let Fr = f0 + (1.0 - f0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  return D * G * Fr / max(4.0 * NL * NV, 1e-4) * NL;
}

// skin diffuse times cos: wrapped (light scattered under the skin), the wrapped part reddened
fn skinDiffuse(N: vec3<f32>, L: vec3<f32>, albedo: vec3<f32>) -> vec3<f32> {
  let NL = dot(N, L);
  let lam = max(NL, 0.0);
  let wrap = clamp((NL + 0.3) / 1.3, 0.0, 1.0);
  let scatter = (wrap - lam) * vec3<f32>(1.0, 0.45, 0.35);
  return albedo * (lam + scatter) * (1.0 / PI);
}

@fragment
fn fsMain(in: VOut, @builtin(front_facing) front: bool) -> @location(0) vec4<f32> {
  let base = textureSample(baseTex, texSampler, in.uv);
  let orm = textureSample(ormTex, texSampler, in.uv);
  let tn = textureSample(normalTex, texSampler, in.uv).xyz * 2.0 - 1.0;
  var Ng = normalize(in.nrm);
  if (!front) { Ng = -Ng; }
  let T = normalize(in.tan.xyz - Ng * dot(in.tan.xyz, Ng));
  let B = cross(Ng, T) * in.tan.w;
  let N = normalize(T * tn.x + B * tn.y + Ng * tn.z);
  let V = normalize(F.camPos.xyz - in.world);
  let albedo = base.rgb;
  let ao = orm.r;
  // skin and drying blood: never mirror-like
  let rough = clamp(orm.g, 0.38, 1.0);
  let a = rough * rough;
  let f0 = 0.028;

  let key = keyLight(in.world);
  let sh = shadowFactor(in.world, Ng);
  var c = (skinDiffuse(N, key.xyz, albedo) + vec3<f32>(ggxSpec(N, V, key.xyz, a, f0))) * (key.w * sh) * F.keyColor.rgb;

  let Lo = F.overDir.xyz;
  c += (skinDiffuse(N, Lo, albedo) + vec3<f32>(ggxSpec(N, V, Lo, a, f0))) * F.overColor.rgb * shadowOver(in.world, Ng);

  // the pit light below the cloth (a small bulb: inverse square, unshadowed)
  let dp = CU.pit.xyz - in.world;
  let r2 = max(dot(dp, dp), 1e-4);
  let Lp = dp * inverseSqrt(r2);
  c += (skinDiffuse(N, Lp, albedo) + vec3<f32>(ggxSpec(N, V, Lp, a, f0))) * CU.pitColor.rgb / r2;

  // the camera's light
  if (F.torchPos.w > 0.0) {
    let tl = torchLight(in.world);
    c += (skinDiffuse(N, tl.xyz, albedo) + vec3<f32>(ggxSpec(N, V, tl.xyz, a, f0))) * tl.w * F.torchColor.rgb;
  }

  c += F.ambient.rgb * albedo * ao * (0.55 + 0.45 * N.z);
  return vec4<f32>(c, 1.0);
}
`,
  _n = class {
    device;
    vertex;
    index;
    indexCount;
    jointBuf;
    uniform;
    textures;
    main;
    shadow;
    mainGroup;
    keyGroup;
    overGroup;
    visible = !1;
    constructor(e, t, n) {
      let r = e.device;
      this.device = r;
      let s = e.shared();
      ((this.vertex = [
        o(r, `creature.pos`, t.position, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
        o(r, `creature.nrm`, t.normal, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
        o(r, `creature.tan`, t.tangent, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
        o(r, `creature.uv`, t.uv, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
        o(r, `creature.joints`, t.jointIndex, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
        o(r, `creature.weights`, t.weight, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST),
      ]),
        (this.index = o(r, `creature.index`, t.index, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST)),
        (this.indexCount = t.index.length),
        (this.jointBuf = a(r, `creature.skin`, 64 * t.joints.length)),
        (this.uniform = a(r, `creature.u`, 32, i)),
        (this.textures = [
          this.upload(n.base, `rgba8unorm-srgb`),
          this.upload(n.normal, `rgba8unorm`),
          this.upload(n.orm, `rgba8unorm`),
        ]));
      let c = l(r, `creature`, s.common + s.light + gn),
        u = GPUShaderStage.FRAGMENT,
        d = GPUShaderStage.VERTEX,
        f = r.createBindGroupLayout({
          label: `creature`,
          entries: [
            { binding: 0, visibility: d | u, buffer: { type: `uniform` } },
            { binding: 1, visibility: u, buffer: { type: `uniform` } },
            { binding: 2, visibility: d, buffer: { type: `read-only-storage` } },
            { binding: 3, visibility: u, texture: { sampleType: `depth` } },
            { binding: 4, visibility: u, sampler: { type: `comparison` } },
            { binding: 5, visibility: u, texture: { sampleType: `depth` } },
            { binding: 6, visibility: u, texture: { sampleType: `float` } },
            { binding: 7, visibility: u, texture: { sampleType: `float` } },
            { binding: 8, visibility: u, texture: { sampleType: `float` } },
            { binding: 9, visibility: u, sampler: { type: `filtering` } },
          ],
        }),
        p = [
          { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: `float32x3` }] },
          { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: `float32x3` }] },
          { arrayStride: 16, attributes: [{ shaderLocation: 2, offset: 0, format: `float32x4` }] },
          { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: `float32x2` }] },
          { arrayStride: 8, attributes: [{ shaderLocation: 4, offset: 0, format: `uint16x4` }] },
          { arrayStride: 16, attributes: [{ shaderLocation: 5, offset: 0, format: `float32x4` }] },
        ],
        m = r.createPipelineLayout({ bindGroupLayouts: [f] }),
        h = { topology: `triangle-list`, cullMode: `none` };
      ((this.main = r.createRenderPipeline({
        label: `creature`,
        layout: m,
        vertex: { module: c, entryPoint: `vsMain`, buffers: p },
        fragment: { module: c, entryPoint: `fsMain`, targets: [{ format: s.hdrFormat }] },
        primitive: h,
        depthStencil: { format: `depth32float`, depthWriteEnabled: !0, depthCompare: `less` },
        multisample: { count: s.samples },
      })),
        (this.shadow = r.createRenderPipeline({
          label: `creature.shadow`,
          layout: m,
          vertex: { module: c, entryPoint: `vsShadow`, buffers: p },
          primitive: h,
          depthStencil: {
            format: `depth32float`,
            depthWriteEnabled: !0,
            depthCompare: `less`,
            depthBias: 2,
            depthBiasSlopeScale: 2,
          },
        })));
      let g = r.createSampler({
          addressModeU: `repeat`,
          addressModeV: `repeat`,
          magFilter: `linear`,
          minFilter: `linear`,
          mipmapFilter: `linear`,
          maxAnisotropy: 8,
        }),
        _ = (e, t, n) =>
          r.createBindGroup({
            layout: f,
            entries: [
              { binding: 0, resource: { buffer: e } },
              { binding: 1, resource: { buffer: this.uniform } },
              { binding: 2, resource: { buffer: this.jointBuf } },
              { binding: 3, resource: t },
              { binding: 4, resource: s.shadowSampler },
              { binding: 5, resource: n },
              { binding: 6, resource: this.textures[0].createView() },
              { binding: 7, resource: this.textures[1].createView() },
              { binding: 8, resource: this.textures[2].createView() },
              { binding: 9, resource: g },
            ],
          });
      ((this.mainGroup = _(s.frameU, s.shadowView, s.overView)),
        (this.keyGroup = _(s.frameU, s.dummyDepthView, s.dummyDepthView)),
        (this.overGroup = _(s.frameOverU, s.dummyDepthView, s.dummyDepthView)));
    }
    upload(e, t) {
      let n = this.device,
        r = Math.floor(Math.log2(Math.max(e.width, e.height))) + 1,
        i = n.createTexture({
          label: `creature.tex`,
          size: [e.width, e.height],
          format: t,
          mipLevelCount: r,
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
      `data` in e
        ? n.queue.writeTexture({ texture: i }, e.data, { bytesPerRow: 4 * e.width }, [e.width, e.height])
        : n.queue.copyExternalImageToTexture({ source: e }, { texture: i }, [e.width, e.height]);
      let a = l(n, `mipgen`, M),
        o = n.createRenderPipeline({
          label: `creature.mips`,
          layout: `auto`,
          vertex: { module: a, entryPoint: `vsFull` },
          fragment: { module: a, entryPoint: `fsDown`, targets: [{ format: t }] },
          primitive: { topology: `triangle-list` },
        }),
        s = n.createSampler({ magFilter: `linear`, minFilter: `linear` }),
        c = n.createCommandEncoder({ label: `creature.mips` });
      for (let e = 1; e < r; e++) {
        let t = i.createView({ baseMipLevel: e - 1, mipLevelCount: 1 }),
          r = c.beginRenderPass({
            colorAttachments: [
              {
                view: i.createView({ baseMipLevel: e, mipLevelCount: 1 }),
                loadOp: `clear`,
                storeOp: `store`,
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
              },
            ],
          });
        (r.setPipeline(o),
          r.setBindGroup(
            0,
            n.createBindGroup({
              layout: o.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: t },
                { binding: 2, resource: s },
              ],
            }),
          ),
          r.draw(3),
          r.end());
      }
      return (n.queue.submit([c.finish()]), i);
    }
    setFrame(e, t, n) {
      (this.device.queue.writeBuffer(this.jointBuf, 0, e),
        this.device.queue.writeBuffer(this.uniform, 0, new Float32Array([t[0], t[1], t[2], 0, n[0], n[1], n[2], 0])));
    }
    draw(e, t, n) {
      this.visible &&
        (e.setPipeline(t),
        e.setBindGroup(0, n),
        this.vertex.forEach((t, n) => e.setVertexBuffer(n, t)),
        e.setIndexBuffer(this.index, `uint32`),
        e.drawIndexed(this.indexCount));
    }
    drawShadow(e, t) {
      this.draw(e, this.shadow, t === `key` ? this.keyGroup : this.overGroup);
    }
    drawMain(e) {
      this.draw(e, this.main, this.mainGroup);
    }
  };
const q = {
    add: (e, t) => [e[0] + t[0], e[1] + t[1], e[2] + t[2]],
    sub: (e, t) => [e[0] - t[0], e[1] - t[1], e[2] - t[2]],
    scale: (e, t) => [e[0] * t, e[1] * t, e[2] * t],
    dot: (e, t) => e[0] * t[0] + e[1] * t[1] + e[2] * t[2],
    cross: (e, t) => [e[1] * t[2] - e[2] * t[1], e[2] * t[0] - e[0] * t[2], e[0] * t[1] - e[1] * t[0]],
    len: (e) => Math.hypot(e[0], e[1], e[2]),
    norm: (e) => {
      let t = Math.hypot(e[0], e[1], e[2]) || 1;
      return [e[0] / t, e[1] / t, e[2] / t];
    },
    lerp: (e, t, n) => [e[0] + (t[0] - e[0]) * n, e[1] + (t[1] - e[1]) * n, e[2] + (t[2] - e[2]) * n],
  },
  J = {
    mul: (e, t) => [
      e[3] * t[0] + e[0] * t[3] + e[1] * t[2] - e[2] * t[1],
      e[3] * t[1] - e[0] * t[2] + e[1] * t[3] + e[2] * t[0],
      e[3] * t[2] + e[0] * t[1] - e[1] * t[0] + e[2] * t[3],
      e[3] * t[3] - e[0] * t[0] - e[1] * t[1] - e[2] * t[2],
    ],
    conj: (e) => [-e[0], -e[1], -e[2], e[3]],
    axisAngle: (e, t) => {
      let n = q.norm(e),
        r = Math.sin(t / 2);
      return [n[0] * r, n[1] * r, n[2] * r, Math.cos(t / 2)];
    },
    rotate: (e, t) => {
      let n = [e[0], e[1], e[2]],
        r = q.scale(q.cross(n, t), 2);
      return q.add(q.add(t, q.scale(r, e[3])), q.cross(n, r));
    },
    fromTo: (e, t) => {
      let n = q.dot(e, t);
      if (n < -0.999999) {
        let t = Math.abs(e[0]) < 0.9 ? q.cross(e, [1, 0, 0]) : q.cross(e, [0, 1, 0]);
        return J.axisAngle(t, Math.PI);
      }
      let r = q.cross(e, t);
      return J.normalize([r[0], r[1], r[2], 1 + n]);
    },
    normalize: (e) => {
      let t = Math.hypot(e[0], e[1], e[2], e[3]) || 1;
      return [e[0] / t, e[1] / t, e[2] / t, e[3] / t];
    },
    slerp: (e, t, n) => {
      let r = e[0] * t[0] + e[1] * t[1] + e[2] * t[2] + e[3] * t[3],
        i = r < 0 ? -1 : 1;
      if (((r = Math.abs(r)), r > 0.9995))
        return J.normalize([
          e[0] + (i * t[0] - e[0]) * n,
          e[1] + (i * t[1] - e[1]) * n,
          e[2] + (i * t[2] - e[2]) * n,
          e[3] + (i * t[3] - e[3]) * n,
        ]);
      let a = Math.acos(r),
        o = Math.sin((1 - n) * a) / Math.sin(a),
        s = (i * Math.sin(n * a)) / Math.sin(a);
      return [o * e[0] + s * t[0], o * e[1] + s * t[1], o * e[2] + s * t[2], o * e[3] + s * t[3]];
    },
    basis: (e, t, n, r) => {
      let i = J.fromFrame(n, r),
        a = J.fromFrame(e, t);
      return J.mul(i, J.conj(a));
    },
    fromFrame: (e, t) => {
      let n = q.norm(e),
        r = q.norm(q.cross(n, t)),
        i = q.cross(r, n);
      return vn([n[0], n[1], n[2], i[0], i[1], i[2], r[0], r[1], r[2]]);
    },
  };
function vn(e) {
  let t = Math.hypot(e[0], e[1], e[2]) || 1,
    [n, r, i, a, o, s, c, l, u] = Array.from({ length: 9 }, (n, r) => e[r] / t),
    d = n + o + u,
    f;
  if (d > 0) {
    let e = Math.sqrt(d + 1) * 2;
    f = [(s - l) / e, (c - i) / e, (r - a) / e, 0.25 * e];
  } else if (n > o && n > u) {
    let e = Math.sqrt(1 + n - o - u) * 2;
    f = [0.25 * e, (a + r) / e, (c + i) / e, (s - l) / e];
  } else if (o > u) {
    let e = Math.sqrt(1 + o - n - u) * 2;
    f = [(a + r) / e, 0.25 * e, (l + s) / e, (c - i) / e];
  } else {
    let e = Math.sqrt(1 + u - n - o) * 2;
    f = [(c + i) / e, (l + s) / e, 0.25 * e, (r - a) / e];
  }
  return J.normalize(f);
}
function yn(e, t, n, r = /* @__PURE__ */ new Float64Array(16)) {
  let [i, a, o, s] = [t[0], t[1], t[2], t[3]];
  return (
    (r[0] = (1 - 2 * (a * a + o * o)) * n[0]),
    (r[1] = 2 * (i * a + o * s) * n[0]),
    (r[2] = 2 * (i * o - a * s) * n[0]),
    (r[3] = 0),
    (r[4] = 2 * (i * a - o * s) * n[1]),
    (r[5] = (1 - 2 * (i * i + o * o)) * n[1]),
    (r[6] = 2 * (a * o + i * s) * n[1]),
    (r[7] = 0),
    (r[8] = 2 * (i * o + a * s) * n[2]),
    (r[9] = 2 * (a * o - i * s) * n[2]),
    (r[10] = (1 - 2 * (i * i + a * a)) * n[2]),
    (r[11] = 0),
    (r[12] = e[0]),
    (r[13] = e[1]),
    (r[14] = e[2]),
    (r[15] = 1),
    r
  );
}
function Y(e, t, n = /* @__PURE__ */ new Float64Array(16)) {
  for (let r = 0; r < 4; r++) {
    let i = t[4 * r],
      a = t[4 * r + 1],
      o = t[4 * r + 2],
      s = t[4 * r + 3];
    for (let t = 0; t < 4; t++) n[4 * r + t] = e[t] * i + e[4 + t] * a + e[8 + t] * o + e[12 + t] * s;
  }
  return n;
}
function bn(e, t = /* @__PURE__ */ new Float64Array(16)) {
  let n = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) t[4 * i + r] = e[4 * r + i] / n;
  t[3] = t[7] = t[11] = 0;
  for (let n = 0; n < 3; n++) t[12 + n] = -(t[n] * e[12] + t[4 + n] * e[13] + t[8 + n] * e[14]);
  return ((t[15] = 1), t);
}
function xn(e, t) {
  return [
    e[0] * t[0] + e[4] * t[1] + e[8] * t[2] + e[12],
    e[1] * t[0] + e[5] * t[1] + e[9] * t[2] + e[13],
    e[2] * t[0] + e[6] * t[1] + e[10] * t[2] + e[14],
  ];
}
const Sn = yn([0, 0, 0], [0, 0, 0, 1], [1, 1, 1]);
var Cn = class e {
  model;
  count;
  names;
  parent;
  order;
  slot;
  subtreeEnd;
  static ONE = [1, 1, 1];
  restT;
  restR;
  localT;
  localR;
  pre;
  placement = Float64Array.from(Sn);
  world;
  skin;
  restWorld;
  rootParent = /* @__PURE__ */ new Float64Array(16);
  tmp = /* @__PURE__ */ new Float64Array(16);
  constructor(e) {
    this.model = e;
    let t = e.joints.length;
    this.count = t;
    let n = /* @__PURE__ */ new Map();
    (e.joints.forEach((e, t) => n.set(e, t)),
      (this.names = e.joints.map((t) => e.nodes[t].name)),
      (this.parent = new Int32Array(t).fill(-1)));
    let r = -1;
    if (
      (e.joints.forEach((t, i) => {
        let a = e.nodes[t].parent;
        for (; a >= 0 && !n.has(a);) a = e.nodes[a].parent;
        a >= 0 ? (this.parent[i] = n.get(a)) : (r = i);
      }),
      r < 0)
    )
      throw Error(`skin has no root joint`);
    let i = Array.from({ length: t }, () => []);
    for (let e = 0; e < t; e++) this.parent[e] >= 0 && i[this.parent[e]].push(e);
    this.order = [];
    let a = [r];
    for (; a.length;) {
      let e = a.pop();
      (this.order.push(e), a.push(...i[e]));
    }
    if (this.order.length !== t) throw Error(`skin joints are not one hierarchy`);
    ((this.slot = new Int32Array(t)),
      this.order.forEach((e, t) => (this.slot[e] = t)),
      (this.subtreeEnd = new Int32Array(t)));
    for (let e = t - 1; e >= 0; e--) {
      let t = this.order[e],
        n = e + 1;
      for (let e of i[t]) n = Math.max(n, this.subtreeEnd[e]);
      this.subtreeEnd[t] = n;
    }
    let o = [];
    for (let t = e.nodes[e.joints[r]].parent; t >= 0; t = e.nodes[t].parent) o.unshift(t);
    this.pre = Float64Array.from(Sn);
    for (let e of o) this.pre = Y(this.pre, this.nodeLocal(e));
    ((this.restT = new Float64Array(3 * t)),
      (this.restR = new Float64Array(4 * t)),
      e.joints.forEach((t, n) => {
        let r = e.nodes[t];
        if (r.matrix) throw Error(`joint matrices are not supported`);
        if (Math.abs(r.scale[0] - 1) > 0.001 || Math.abs(r.scale[1] - 1) > 0.001 || Math.abs(r.scale[2] - 1) > 0.001)
          throw Error(`joint ${r.name} is scaled`);
        (this.restT.set(r.translation, 3 * n), this.restR.set(J.normalize([...r.rotation]), 4 * n));
      }),
      (this.localT = Float64Array.from(this.restT)),
      (this.localR = Float64Array.from(this.restR)),
      (this.world = new Float64Array(16 * t)),
      (this.skin = new Float32Array(16 * t)),
      this.update(),
      (this.restWorld = Float64Array.from(this.world)));
  }
  nodeLocal(e) {
    let t = this.model.nodes[e];
    return t.matrix ? Float64Array.from(t.matrix) : yn(t.translation, t.rotation, t.scale);
  }
  joint(e) {
    let t = this.names.findIndex((t) => t === e || t.startsWith(`${e}_`));
    if (t < 0) throw Error(`no joint ${e}`);
    return t;
  }
  setSkeletonPlacement(e) {
    this.placement = Float64Array.from(Y(e, bn(this.pre)));
  }
  resetPose() {
    (this.localT.set(this.restT), this.localR.set(this.restR));
  }
  update() {
    (Y(this.placement, this.pre, this.rootParent), this.updateRun(0, this.count));
  }
  updateFrom(e) {
    this.updateRun(this.slot[e], this.subtreeEnd[e]);
  }
  updateRun(t, n) {
    for (let r = t; r < n; r++) {
      let t = this.order[r],
        n = this.parent[t];
      (yn(this.localT.subarray(3 * t, 3 * t + 3), this.localR.subarray(4 * t, 4 * t + 4), e.ONE, this.tmp),
        Y(
          n >= 0 ? this.world.subarray(16 * n, 16 * n + 16) : this.rootParent,
          this.tmp,
          this.world.subarray(16 * t, 16 * t + 16),
        ));
    }
  }
  skinMatrices() {
    let e = this.model.inverseBind;
    for (let t = 0; t < this.count; t++) {
      let n = Y(this.world.subarray(16 * t, 16 * t + 16), e.subarray(16 * t, 16 * t + 16), this.tmp);
      for (let e = 0; e < 16; e++) this.skin[16 * t + e] = n[e];
    }
    return this.skin;
  }
  position(e) {
    let t = 16 * e;
    return [this.world[t + 12], this.world[t + 13], this.world[t + 14]];
  }
  point(e, t) {
    return xn(this.world.subarray(16 * e, 16 * e + 16), t);
  }
  worldRotation(e) {
    let t = 16 * e,
      n = this.world;
    return vn([n[t], n[t + 1], n[t + 2], n[t + 4], n[t + 5], n[t + 6], n[t + 8], n[t + 9], n[t + 10]]);
  }
  parentRotation(e) {
    let t = this.parent[e];
    if (t >= 0) return this.worldRotation(t);
    let n = Y(this.placement, this.pre, this.tmp);
    return vn([n[0], n[1], n[2], n[4], n[5], n[6], n[8], n[9], n[10]]);
  }
  setWorldRotation(e, t) {
    this.localR.set(J.normalize(J.mul(J.conj(this.parentRotation(e)), t)), 4 * e);
  }
  rotateWorld(e, t) {
    (this.setWorldRotation(e, J.mul(t, this.worldRotation(e))), this.updateFrom(e));
  }
  direction(e, t) {
    return J.rotate(this.worldRotation(e), t);
  }
  restLocalDirection(e, t) {
    let n = 16 * e,
      r = this.restWorld,
      i = vn([r[n], r[n + 1], r[n + 2], r[n + 4], r[n + 5], r[n + 6], r[n + 8], r[n + 9], r[n + 10]]);
    return q.norm(J.rotate(J.conj(i), t));
  }
  twoBone(e, t, n, r, i) {
    let a = this.position(e),
      o = this.position(t),
      s = this.position(n),
      c = q.len(q.sub(o, a)),
      l = q.len(q.sub(s, o)),
      u = q.sub(r, a),
      d = Math.min(Math.max(q.len(u), Math.abs(c - l) + 1e-4), c + l - 1e-4),
      f = q.norm(u),
      p = (c * c - l * l + d * d) / (2 * d),
      m = Math.sqrt(Math.max(0, c * c - p * p)),
      h = q.sub(i, a),
      g = q.norm(q.sub(h, q.scale(f, q.dot(h, f)))),
      _ = q.add(a, q.add(q.scale(f, p), q.scale(g, m)));
    this.rotateWorld(e, J.fromTo(q.norm(q.sub(o, a)), q.norm(q.sub(_, a))));
    let v = this.position(t),
      y = this.position(n),
      b = q.add(a, q.scale(f, d));
    this.rotateWorld(t, J.fromTo(q.norm(q.sub(y, v)), q.norm(q.sub(b, v))));
  }
  restVertex(e) {
    let t = this.model,
      n = [0, 0, 0],
      r = t.position[3 * e],
      i = t.position[3 * e + 1],
      a = t.position[3 * e + 2];
    for (let o = 0; o < 4; o++) {
      let s = t.weight[4 * e + o];
      if (s <= 0) continue;
      let c = t.jointIndex[4 * e + o],
        l = xn(Y(this.restWorld.subarray(16 * c, 16 * c + 16), t.inverseBind.subarray(16 * c, 16 * c + 16), this.tmp), [
          r,
          i,
          a,
        ]);
      ((n[0] += s * l[0]), (n[1] += s * l[1]), (n[2] += s * l[2]));
    }
    return n;
  }
  carriedVertices() {
    let e = Array.from({ length: this.count }, () => []),
      t = Array.from({ length: this.count }, (e, t) => bn(this.restWorld.subarray(16 * t, 16 * t + 16))),
      n = this.model;
    for (let r = 0; r < n.position.length / 3; r++) {
      let i = 0;
      for (let e = 1; e < 4; e++) n.weight[4 * r + e] > n.weight[4 * r + i] && (i = e);
      let a = n.jointIndex[4 * r + i];
      e[a].push(xn(t[a], this.restVertex(r)));
    }
    return e;
  }
};
function wn(e, t, n = 12) {
  let r = [];
  return (
    e.forEach((e, i) => {
      if (e.length < n) return;
      let a = e.reduce((e, t) => q.add(e, t), [0, 0, 0]).map((t) => t / e.length),
        o = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let t of e) {
        let e = q.sub(t, a);
        for (let t = 0; t < 3; t++) for (let n = 0; n < 3; n++) o[3 * t + n] += e[t] * e[n];
      }
      let s = [0.3, 1, 0.2];
      for (let e = 0; e < 32; e++)
        s = q.norm([
          o[0] * s[0] + o[1] * s[1] + o[2] * s[2],
          o[3] * s[0] + o[4] * s[1] + o[5] * s[2],
          o[6] * s[0] + o[7] * s[1] + o[8] * s[2],
        ]);
      let c = e.map((e) => q.dot(q.sub(e, a), s)).sort((e, t) => e - t),
        l = (e, t) => e[Math.min(e.length - 1, Math.max(0, Math.round(t * (e.length - 1))))],
        u = l(c, 0.02),
        d = l(c, 0.98),
        f =
          l(
            e
              .map((e) => {
                let t = q.sub(e, a),
                  n = Math.min(d, Math.max(u, q.dot(t, s)));
                return q.len(q.sub(t, q.scale(s, n)));
              })
              .sort((e, t) => e - t),
            0.98,
          ) + t,
        p = Math.max(0, (d - u) / 2 - f * 0.7),
        m = (u + d) / 2;
      r.push({ joint: i, a: q.add(a, q.scale(s, m - p)), b: q.add(a, q.scale(s, m + p)), radius: f });
    }),
    r
  );
}
const Tn = [`finguer`, `middle`, `ring`, `pinky`];
var En = class {
  rig;
  bones;
  hands;
  sharp;
  clipJoints = null;
  boundClip = null;
  jawJoint = -1;
  constructor(e) {
    this.rig = e;
    let t = e.carriedVertices();
    this.bones = wn(t, 0.003);
    let n = (n) => {
      let r = (t) => e.joint(`${t}.${n}`),
        i = Tn.map((t) => [r(t), e.joint(`${t}.${n}.001`)]),
        a = i.map(([, e]) => {
          let n = t[e],
            r = n[0];
          for (let e of n) e[1] > r[1] && (r = e);
          return r;
        });
      return { arm: r(`Arm`), forearm: r(`Forearm`), hand: r(`Hand`), fingers: i, tips: a };
    };
    ((this.hands = { L: n(`L`), R: n(`R`) }), (this.sharp = /* @__PURE__ */ new Set()));
    for (let e of [this.hands.L, this.hands.R])
      e.fingers.forEach(([, t], n) => {
        let r = this.bones.find((e) => e.joint === t);
        if (!r) return;
        let i = q.norm(q.sub(r.b, r.a));
        ((r.b = q.sub(e.tips[n], q.scale(i, 0.8 * r.radius))), this.sharp.add(t));
      });
  }
  bind(e) {
    if (this.boundClip === e) return;
    let t = this.rig;
    if (((this.clipJoints = Int32Array.from(e.joints, (e) => t.joint(e))), this.clipJoints.length !== t.count))
      throw Error(`clip poses ${this.clipJoints.length} of ${t.count} joints`);
    (e.bindT.forEach((e, n) => t.localT.set(e, 3 * this.clipJoints[n])),
      t.restT.set(t.localT),
      t.setSkeletonPlacement(e.skeleton),
      (this.jawJoint = t.joint(e.jaw.joint)),
      (this.boundClip = e));
  }
  play(e, t = 0) {
    let n = this.clipJoints,
      r = this.rig;
    for (let t = 0; t < n.length; t++) r.localR.set(e.rotations.subarray(4 * t, 4 * t + 4), 4 * n[t]);
    r.localT.set(e.rootT, 3 * n[this.boundClip.root]);
    let i = Math.min(1, e.jawOpen + e.jawLaugh * t) - e.jawOpen;
    if (i > 0) {
      let e = this.boundClip.jaw,
        t = 4 * this.jawJoint,
        n = Array.from(r.localR.subarray(t, t + 4));
      r.localR.set(J.mul(n, J.axisAngle(e.axis, i * e.rad)), t);
    }
    r.update();
  }
  reach(e, t) {
    if (t[0] === 0 && t[1] === 0 && t[2] === 0) return;
    let n = this.rig,
      r = this.hands[e],
      i = n.worldRotation(r.hand),
      a = n.position(r.hand),
      o = n.position(r.forearm);
    (n.twoBone(r.arm, r.forearm, r.hand, q.add(a, t), q.add(o, t)),
      n.setWorldRotation(r.hand, i),
      n.updateFrom(r.hand));
  }
  clawTips(e) {
    let t = this.hands[e];
    return t.fingers.map(([, e], n) => this.rig.point(e, t.tips[n]));
  }
  clawCentre(e) {
    let t = this.clawTips(e);
    return q.scale(
      t.reduce((e, t) => q.add(e, t)),
      1 / t.length,
    );
  }
  capsules() {
    return this.bones.map((e) => {
      let t = 16 * e.joint,
        n = this.rig.world,
        r = Math.hypot(n[t], n[t + 1], n[t + 2]);
      return {
        a: this.rig.point(e.joint, e.a),
        b: this.rig.point(e.joint, e.b),
        radius: e.radius * r,
        active: !0,
        sharp: this.sharp.has(e.joint),
      };
    });
  }
  capsuleJoints() {
    return this.bones.map((e) => e.joint);
  }
  holdJoint(e, t) {
    let [n, r] = this.hands[e].fingers[1];
    return t === `shaft` ? n : r;
  }
  where(e) {
    return this.rig.position(this.rig.joint(e));
  }
};
function Dn(e, t, n, r = 0) {
  let i = e.layers[r],
    [a, o, s, c] = i.mapA,
    l = a * c - o * s,
    u = t - i.mapOrigin[0],
    d = n - i.mapOrigin[1];
  return [i.restCenter[0] + (c * u - o * d) / l, i.restCenter[1] + (-s * u + a * d) / l];
}
function On(e, t, n, r = 0) {
  let i = e.layers[r],
    a = Math.min(i.nx - 1, Math.max(0, Math.round(t / i.material.pitchU))),
    o = Math.min(i.ny - 1, Math.max(0, Math.round(n / i.material.pitchV)));
  return i.nodeOffset + o * i.nx + a;
}
const kn = { radius: 0.0045, maxForce: 350, maxLead: 0.012 },
  An = { R: 0, L: 1 },
  jn = [`L`, `R`],
  Mn = k.target[2];
var Nn = class {
  duration;
  events;
  host;
  clip;
  t = 0;
  next = 0;
  holds = {};
  aims = {};
  fading = { L: { offset: [0, 0, 0], since: -1 }, R: { offset: [0, 0, 0], since: -1 } };
  view = { ...k, target: [...k.target], eye: [0, 0, 1], up: [0, 1, 0] };
  base;
  stopped = !1;
  constructor(e) {
    ((this.host = e), (this.clip = e.clip), (this.duration = this.clip.duration), (this.events = un(this.clip)));
    let t = e.renderer;
    ((this.base = {
      keyIntensity: t.keyIntensity,
      overIntensity: t.overIntensity,
      exposure: t.exposure,
      keyOffset: [...t.keyOffset],
      keyAim: [...t.keyAim],
      keyCone: t.keyCone,
      keyInner: t.keyInner,
      keyLeak: t.keyLeak,
      keyColor: [...t.keyColor],
      ambient: [...t.ambient],
      torchIntensity: t.torchIntensity,
    }),
      (t.showFloor = !1),
      e.solver.setFloor(null),
      (t.lightAnchor = [...k.target]),
      t.extras.includes(e.creature) || t.extras.push(e.creature),
      (e.creature.visible = !0),
      e.puppet.bind(this.clip),
      this.poseAt(0));
  }
  get camera() {
    return this.view;
  }
  get time() {
    return this.t;
  }
  get done() {
    return this.t >= this.duration;
  }
  substep(e) {
    if (this.stopped) return;
    this.t += e;
    let t = this.events;
    for (; this.next < t.length && t[this.next].t <= this.t;) this.apply(t[this.next++]);
    (this.poseAt(this.t), this.host.body.setPose(this.host.puppet.capsules(), e));
    for (let e of jn) {
      let t = this.holds[e];
      t && this.host.interaction.setTarget(this.holdPoint(t), t.slot);
    }
  }
  frame() {
    let e = this.clip.sample(this.t);
    this.placeCamera(e);
    let t = this.host.renderer,
      n = this.base,
      r = t.lightAnchor;
    return (
      (t.keyOffset = [e.bulbPos[0] - r[0], e.bulbPos[1] - r[1], e.bulbPos[2] - r[2]]),
      (t.keyAim = [t.keyOffset[0] + e.bulbAim[0], t.keyOffset[1] + e.bulbAim[1], t.keyOffset[2] + e.bulbAim[2]]),
      (t.keyIntensity = e.bulbI / q.dot(t.keyOffset, t.keyOffset)),
      (t.keyCone = e.bulbCone[0]),
      (t.keyInner = e.bulbCone[1]),
      (t.keyLeak = 0),
      (t.keyColor = [...e.bulbColor]),
      (t.overIntensity = e.over),
      (t.torchPos = [...e.torchPos]),
      (t.torchAim = [...e.torchAim]),
      (t.torchCone = [e.torchCone[0], e.torchCone[1]]),
      (t.torchIntensity = e.torchI),
      (t.torchColor = [...e.torchColor]),
      (t.ambient = [n.ambient[0] * e.ambient, n.ambient[1] * e.ambient, n.ambient[2] * e.ambient]),
      (t.exposure = n.exposure * e.exposure),
      this.host.creature.setFrame(this.host.puppet.rig.skinMatrices(), e.pitPos, e.pitI),
      (t.post = {
        grade: e.grade,
        grain: e.grain,
        vignette: e.vignette,
        glitch: e.glitch,
        glitchSeed: Math.floor(this.t * 9) % 97,
      }),
      (t.freeze = e.freeze),
      this.view
    );
  }
  sources() {
    let e = [null, null, null, null];
    for (let t of jn) {
      let n = this.holds[t];
      n && (e[n.slot] = this.holdPoint(n));
    }
    return e;
  }
  stop() {
    if (this.stopped) return;
    this.stopped = !0;
    for (let e of jn) this.holds[e] && this.release(e);
    this.host.body.clear();
    let e = this.host.renderer;
    (Object.assign(e, this.base),
      (e.showFloor = !0),
      this.host.solver.setFloor(e.floorZ),
      (e.lightAnchor = null),
      (e.post = { ...F }),
      (e.freeze = !1),
      (this.host.creature.visible = !1));
  }
  placeCamera(e) {
    let t = this.view,
      n = q.norm(q.sub(e.target, e.eye)),
      r = n[2] < -0.1 ? (e.eye[2] - Mn) / -n[2] : 1;
    ((t.eye = [...e.eye]),
      (t.up = [...e.up]),
      (t.target = [e.eye[0] + n[0] * r, e.eye[1] + n[1] * r, e.eye[2] + n[2] * r]),
      (t.distance = r),
      (t.fovY = e.fovY));
  }
  poseAt(e) {
    let t = this.clip.sample(e);
    e === 0 && this.placeCamera(t);
    let n = this.host.puppet;
    n.play(t, this.host.laugh());
    for (let t of jn) n.reach(t, this.correction(t, e));
  }
  correction(e, t) {
    let n = (e) => {
        let t = Math.min(1, Math.max(0, e));
        return t * t * (3 - 2 * t);
      },
      r = this.aims[e];
    if (r) return q.scale(r.offset, n((t - r.since) / (0.8 * r.lead)));
    let i = this.fading[e];
    return i.since < 0 ? [0, 0, 0] : q.scale(i.offset, 1 - n((t - i.since) / 0.35));
  }
  holdPoint(e) {
    return this.host.puppet.rig.point(e.joint, e.local);
  }
  apply(e) {
    switch (e.kind) {
      case `hook`:
        this.hook(e.side);
        break;
      case `aim`:
        this.aim(e.side, e.radius, e.lead);
        break;
      case `grab`:
        this.grab(e.side);
        break;
      case `release`:
        this.holds[e.side] ? this.release(e.side) : delete this.aims[e.side];
        break;
      default:
        this.host.cue(e);
    }
  }
  hook(e) {
    let { scene: t, interaction: n } = this.host,
      r = this.host.puppet;
    if (this.holds[e]) return;
    let i = L(
      t,
      r.clawTips(e).map((e) => {
        let [n, r] = Dn(t, e[0], e[1]);
        return On(t, n, r);
      }),
      kn,
      n.isFree,
    );
    if (!i) return;
    let a = r.clawCentre(e),
      [o, s] = Dn(t, a[0], a[1]);
    this.attach(e, On(t, o, s), i, [a[0], a[1], 0], `shaft`);
  }
  async aim(e, t, n) {
    let r = this.t,
      i = this.host.puppet;
    i.play(this.clip.sample(r + n));
    let a = i.clawCentre(e);
    this.poseAt(r);
    let o = await this.host.interaction.nearest(a, t);
    this.stopped || !o || this.holds[e] || (this.aims[e] = { hit: o, offset: q.sub(o.position, a), since: r, lead: n });
  }
  grab(e) {
    let t = this.aims[e];
    if (!t || this.holds[e]) return;
    let { scene: n, interaction: r } = this.host,
      i = L(n, [t.hit.node], kn, r.isFree, t.hit.window);
    i && this.attach(e, t.hit.node, i, this.host.puppet.clawCentre(e), `claw`);
  }
  attach(e, t, n, r, i) {
    let a = An[e],
      o = this.host.puppet.rig,
      s = this.host.puppet.holdJoint(e, i),
      c = xn(bn(o.world.subarray(16 * s, 16 * s + 16)), r);
    (this.host.interaction.attachPatch(a, t, n, r, kn.maxLead),
      this.host.interaction.setTarget(r, a),
      this.host.body.setExempt(n.nodes, !0),
      (this.holds[e] = { slot: a, joint: s, local: c, nodes: n.nodes }),
      this.host.held(a, !0));
  }
  release(e) {
    let t = this.holds[e];
    delete this.holds[e];
    let n = this.aims[e];
    (delete this.aims[e],
      (this.fading[e] = { offset: n ? n.offset : [0, 0, 0], since: this.t }),
      this.host.body.setExempt(t.nodes, !1),
      this.host.held(t.slot, !1),
      this.host.letGo(t.slot));
  }
};
function Pn(e, t) {
  let n = Math.floor(t / 0.05);
  return n >= 0 && n < e.length ? e[n] : 0;
}
var Fn = class {
  device;
  counters;
  log;
  free = [];
  staging = null;
  count = 0;
  constructor(e, t) {
    ((this.device = e),
      (this.counters = t),
      (this.log = e.createBuffer({
        label: `acousticLog`,
        size: 1536,
        usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      })));
    for (let t = 0; t < 3; t++)
      this.free.push(
        e.createBuffer({
          label: `acousticStaging${t}`,
          size: 1536,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        }),
      );
  }
  begin() {
    return ((this.count = 0), (this.staging = this.free.pop() ?? null), this.staging !== null);
  }
  record(e) {
    this.staging &&
      this.count !== 16 &&
      (e.copyBufferToBuffer(this.counters, 64, this.log, 96 * this.count, 96),
      e.clearBuffer(this.counters, 64, 96),
      this.count++);
  }
  end() {
    let e = this.staging,
      t = this.count;
    if (((this.staging = null), (this.count = 0), !e)) return Promise.resolve(null);
    if (t === 0) return (this.free.push(e), Promise.resolve(null));
    let n = this.device.createCommandEncoder({ label: `acousticReadback` });
    return (
      n.copyBufferToBuffer(this.log, 0, e, 0, 96 * t),
      this.device.queue.submit([n.finish()]),
      e.mapAsync(GPUMapMode.READ, 0, 96 * t).then(
        () => {
          let n = new Uint32Array(e.getMappedRange(0, 96 * t).slice(0));
          return (e.unmap(), this.free.push(e), { raw: n, count: t });
        },
        () => (this.free.push(e), null),
      )
    );
  }
};
// The app's base path (Vite's BASE_URL), sent by the page with `init`; assets resolve under it. Kept out
// of import.meta so the worker source also runs as a plain script (the interaction tests load it so).
var ASSET_BASE = `/`;
const In = self,
  X = (e) => In.postMessage(e),
  Z = (e) => X({ type: `progress`, value: e });
async function Ln() {
  let e = (e) =>
    fetch(new URL(`${ASSET_BASE}texture/${e}`, self.location.href))
      .then((t) => (t.ok ? t.blob() : Promise.reject(Error(e))))
      .then((e) => createImageBitmap(e, { colorSpaceConversion: `none`, premultiplyAlpha: `none` }));
  try {
    let [t, n, r, i] = await Promise.all([
      e(`floor_baseColor.jpg`),
      e(`floor_normal.png`),
      e(`floor_roughness.jpg`),
      e(`floor_AO.jpg`),
    ]);
    return { base: t, normal: n, roughness: r, ao: i };
  } catch {
    return null;
  }
}
// Clip recorder: frames of the WebGPU canvas encoded to H.264 (WebCodecs) at up to RECORD_FPS and
// posted to the page as they come, which muxes them (with the sound) into an MP4. A frame is taken
// right after the frame's submit, while the canvas still shows it.
const RECORD_FPS = 30,
  RECORD_BITRATE = 7e6,
  RECORD_MAX_S = 20;
var ClipRecorder = class {
  width;
  height;
  encoder = null;
  t0 = 0;
  last = -1 / 0;
  frames = 0;
  constructor(e, t) {
    ((this.width = e & -2), (this.height = t & -2));
  }
  async start() {
    if (typeof VideoEncoder > `u` || typeof VideoFrame > `u`)
      return (this.fail(`This browser cannot encode video.`), !1);
    let e = {
      codec: `avc1.640028`,
      width: this.width,
      height: this.height,
      bitrate: RECORD_BITRATE,
      framerate: RECORD_FPS,
      latencyMode: `realtime`,
      avc: { format: `avc` },
    };
    try {
      let t = await VideoEncoder.isConfigSupported(e);
      if (!t.supported) {
        e.codec = `avc1.4d0028`;
        if (!(await VideoEncoder.isConfigSupported(e)).supported)
          return (this.fail(`H.264 encoding is not available here.`), !1);
      }
    } catch (e) {
      return (this.fail(`H.264 encoding is not available here.`), !1);
    }
    let t = new VideoEncoder({
      // the metadata's VideoColorSpace is a platform object structured clone refuses: send a plain copy
      output: (e, t) => {
        let n = t?.decoderConfig,
          r = n?.colorSpace;
        X({
          type: `video`,
          chunk: e,
          meta: n
            ? {
                decoderConfig: {
                  codec: n.codec,
                  codedWidth: n.codedWidth,
                  codedHeight: n.codedHeight,
                  description: n.description,
                  colorSpace: r
                    ? { primaries: r.primaries, transfer: r.transfer, matrix: r.matrix, fullRange: r.fullRange }
                    : void 0,
                },
              }
            : {},
        });
      },
      error: (e) => (console.warn(`recorder`, e), this.fail(`Recording failed.`)),
    });
    return (
      t.configure(e),
      (this.encoder = t),
      (this.t0 = performance.now()),
      X({
        type: `record`,
        state: `started`,
        width: this.width,
        height: this.height,
        fps: RECORD_FPS,
        maxSeconds: RECORD_MAX_S,
      }),
      !0
    );
  }
  fail(e) {
    ((this.encoder = null), X({ type: `record`, state: `failed`, message: e }));
  }
  frame(e, t) {
    let n = this.encoder;
    if (!n || !e || n.state !== `configured`) return;
    // The first frame starts the clip's clock. A requestAnimationFrame time can predate start(),
    // and a negative timestamp makes the muxer reject the key frame that carries the decoder config.
    this.frames === 0 && (this.t0 = t);
    let r = t - this.t0;
    if (r - this.last < 1e3 / RECORD_FPS - 0.5 || n.encodeQueueSize > 3) return;
    if (r > 1e3 * RECORD_MAX_S) return;
    let i;
    try {
      i = new VideoFrame(e, {
        timestamp: Math.round(1e3 * r),
        visibleRect: { x: 0, y: 0, width: this.width, height: this.height },
      });
    } catch (e) {
      (console.warn(`recorder: frame`, e), this.fail(`Recording failed.`));
      return;
    }
    ((this.last = r), n.encode(i, { keyFrame: this.frames % (2 * RECORD_FPS) === 0 }), this.frames++, i.close());
  }
  async stop() {
    let e = this.encoder;
    this.encoder = null;
    if (e)
      try {
        (await e.flush(), e.close());
      } catch {}
    X({ type: `record`, state: `stopped`, frames: this.frames, seconds: this.last / 1e3 });
  }
};

// settle substeps after a warm start from the denim's drape
const WARM_SETTLE = 48;
const TOOLS = [`hand`, `blade`, `claw`, `fist`, `pin`];
// fist: sphere radius, heights (m) and timing (s) of a punch; claw: tip depth under the sheet, gap, radius
const FIST = {
  radius: 0.024,
  top: 0.1,
  bottom: -0.085,
  down: 0.22,
  hold: 0.15,
  up: 0.45,
  total: 0.82,
  clawDepth: -0.006,
  clawGap: 0.007,
  clawRadius: 0.0015,
};
const Q = Dt.h,
  Rn = (e) => performance.timeOrigin + e,
  $ = new (class {
    device;
    context;
    scene;
    solver;
    renderer;
    interaction;
    topology;
    body;
    stage = null;
    creatureLoad = null;
    experienceToken = 0;
    laugh = null;
    pace = sn;
    reacquire = -1 / 0;
    topologyEvents = 0;
    damageCounts = [0, 0];
    camera = { ...k };
    width = 1;
    height = 1;
    cssWidth = 1;
    cssHeight = 1;
    visible = !0;
    // Frame mode freezes the solver while leaving rendering and the camera available.
    paused = !1;
    ready = !1;
    lastFrame = 0;
    simBacklog = 0;
    refineSteps = 0;
    releaseEpoch = 0;
    releasing = /* @__PURE__ */ new Map();
    grips = /* @__PURE__ */ new Map();
    down = /* @__PURE__ */ new Map();
    picking = /* @__PURE__ */ new Map();
    pickToken = 0;
    // the fabric preset (FABRICS) this worker was started with; switching restarts the worker
    fabric = `denim`;
    canvas = null;
    canvasFormat = `bgra8unorm`;
    frameTexture = null;
    // a frame capture (share card) was asked for: taken with the next frame
    captureWanted = null;
    capturePending = null;
    // clip recorder (WebCodecs): the canvas encoded to H.264 at up to 30 fps while recording
    recorder = null;
    statsDirty = !1;
    // settle substeps when no drape file matches (dev: ?settle=N on the page shortens it)
    settleSteps = 420;
    // how the rest state was reached: `file` (drape file), `warm` (resampled denim drape + short settle), `flat`
    rested = ``;
    // pointer tool: `hand` grips and pulls, `blade` cuts along the pointer's path, `claw` pierces
    // and drags, `fist` punches down through, `pin` holds a point
    tool = `hand`;
    strokes = /* @__PURE__ */ new Map();
    // pointer-driven bodies: punches in flight and claws being dragged (bodyContact capsules)
    fists = [];
    claws = /* @__PURE__ */ new Map();
    pinSeq = 0;
    simTime = 0;
    // simulated seconds per real second (slow motion below 1)
    timeScale = 1;
    windLevel = 0;
    audioPort = null;
    acoustic = null;
    lastPan = /* @__PURE__ */ new Float64Array(4);
    anchors = /* @__PURE__ */ new Float32Array(16);
    snapshot = null;
    inFlight = !1;
    asleep = !1;
    restFor = 0;
    speedProbe = null;
    probeBusy = !1;
    probeSteps = 0;
    dirty = !0;
    lastPresent = 0;
    statsTime = 0;
    frameCount = 0;
    substepsDone = 0;
    gpuFrameTime = 0;
    gpuFrameSamples = 0;
    async init(t, r, i, a, o) {
      ((this.canvas = t), X({ type: `status`, state: `loading` }));
      // the settled rest state of this fabric (see dev op `drape`; a stale or missing file just settles here)
      let s = fetch(
          new URL(
            this.fabric === `denim` ? `${ASSET_BASE}drape.bin` : `${ASSET_BASE}drape-${this.fabric}.bin`,
            self.location.href,
          ),
        )
          .then((e) => (e.ok ? e.arrayBuffer() : null))
          .catch(() => null),
        c = Ln(),
        l = await n(navigator.gpu);
      (Z(0.1),
        (this.device = l.device),
        this.device.lost.then((e) => {
          (X({
            type: `status`,
            state: `error`,
            message: e.reason === `destroyed` ? `` : `The graphics device was lost. Reload to continue.`,
          }),
            (this.ready = !1));
        }),
        this.device.addEventListener(`uncapturederror`, (e) => console.error(`GPU`, e.error.message)));
      let u = t.getContext(`webgpu`);
      if (!u) throw new e(`Could not create a WebGPU canvas context.`);
      this.context = u;
      let d = navigator.gpu.getPreferredCanvasFormat();
      (u.configure({
        device: this.device,
        format: d,
        alphaMode: `opaque`,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      }),
        (this.canvasFormat = d),
        (this.width = r),
        (this.height = i),
        (this.cssWidth = a),
        (this.cssHeight = o),
        (t.width = r),
        (t.height = i),
        (this.scene = Kt(Zt(this.fabric))),
        Z(0.25),
        (this.solver = new Pt(this.device, this.scene, Dt)),
        Z(0.5),
        (this.interaction = new He(this.device, this.solver, this.scene)),
        (this.solver.preSubstep = (e) => this.interaction.encodeSubstep(e)),
        (this.body = new on(this.device, this.solver, this.scene)),
        (this.solver.postCommit = (e) => {
          (this.body.encodePierce(e), this.body.encodeSlash(e));
        }),
        (this.solver.preAssemble = (e) => {
          (this.body.encode(e), this.interaction.encode(e));
        }),
        (this.topology = new tn(this.device, this.solver, this.scene, () => this.interaction.coreNodes)),
        (this.renderer = new Fe(this.device, d, this.solver, this.scene)),
        this.renderer.resize(r, i),
        this.solver.setFloor(this.renderer.floorZ),
        (this.speedProbe = this.device.createBuffer({
          label: `speedProbe`,
          size: 16,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        })),
        Z(0.7));
      let f = await c;
      (f && this.renderer.setFloorImages(f),
        await this.settle(await s),
        Z(0.9),
        await this.topology.request(),
        Z(1),
        (this.ready = !0),
        this.audioPort && this.startAcoustics(),
        (this.asleep = !0),
        (this.lastFrame = performance.now()),
        X({ type: `status`, state: `running` }),
        X({ type: `cursor`, cursor: this.toolCursor() }),
        In.requestAnimationFrame((e) => this.frame(e)));
    }
    // The denim's drape (public/drape.bin), for warm-starting another fabric
    denimDrape() {
      return fetch(new URL(`${ASSET_BASE}drape.bin`, self.location.href))
        .then((e) => (e.ok ? e.arrayBuffer() : null))
        .catch(() => null);
    }
    // Warm start from the denim's drape. Every fabric is the same sheet (size, pinned border, lattice
    // mapping), so the denim's rest shape sampled at this lattice's rest coordinates is near rest for
    // any of them; a short settle takes up the difference in weight and stiffness. Returns false when
    // the drape is missing or stale (the solver then settles from flat).
    warmStart(e) {
      if (!e || e.byteLength < 16) return !1;
      let t = new Uint32Array(e, 0, 4),
        n = Gt(FABRICS.denim, 0, 0).info;
      if (t[0] !== 1346458180 || t[1] !== 1 || t[2] !== n.nodeCount || e.byteLength !== 16 + 16 * n.nodeCount)
        return !1;
      let r = new Float32Array(e, 16),
        i = n.material.pitchU,
        a = n.material.pitchV,
        o = this.scene,
        s = o.nodeCount,
        c = new Float32Array(4 * s),
        l = (e, t, i) => r[4 * (t * n.nx + e) + i];
      for (let e = 0; e < s; e++) {
        if (o.pinned[e]) {
          for (let t = 0; t < 3; t++) c[4 * e + t] = o.position[3 * e + t];
          continue;
        }
        let t = o.restUV[2 * e] / i,
          r = o.restUV[2 * e + 1] / a,
          u = Math.min(n.nx - 2, Math.max(0, Math.floor(t))),
          d = Math.min(n.ny - 2, Math.max(0, Math.floor(r))),
          f = Math.min(1, Math.max(0, t - u)),
          p = Math.min(1, Math.max(0, r - d));
        for (let t = 0; t < 3; t++)
          c[4 * e + t] =
            (1 - p) * ((1 - f) * l(u, d, t) + f * l(u + 1, d, t)) +
            p * ((1 - f) * l(u, d + 1, t) + f * l(u + 1, d + 1, t));
      }
      return (this.solver.setState(c), !0);
    }
    async settle(e) {
      if (e !== null && Qt(this.solver, e)) this.rested = `file`;
      else {
        let e = this.fabric !== `denim` && this.warmStart(await this.denimDrape());
        ((this.rested = e ? `warm` : `flat`),
          await $t(this.device, this.solver, e ? Math.min(this.settleSteps, WARM_SETTLE) : this.settleSteps));
      }
      let t = (e, t) =>
        this.device.createBuffer({ label: t, size: e.size, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
      this.snapshot = {
        x: t(this.solver.x, `snap.x`),
        segs: t(this.solver.segs, `snap.segs`),
        tails: t(this.solver.tails, `snap.tails`),
        field: t(this.solver.field, `snap.field`),
      };
      let n = this.device.createCommandEncoder();
      (n.copyBufferToBuffer(this.solver.x, 0, this.snapshot.x, 0, this.solver.x.size),
        n.copyBufferToBuffer(this.solver.segs, 0, this.snapshot.segs, 0, this.solver.segs.size),
        n.copyBufferToBuffer(this.solver.tails, 0, this.snapshot.tails, 0, this.solver.tails.size),
        n.copyBufferToBuffer(this.solver.field, 0, this.snapshot.field, 0, this.solver.field.size),
        this.device.queue.submit([n.finish()]),
        await this.device.queue.onSubmittedWorkDone());
    }
    reset() {
      if (this.ready && this.snapshot) {
        this.setPaused(!1);
        if (this.stage) {
          this.endExperience();
          return;
        }
        (X({ type: `cue`, cue: { kind: `stop` } }), this.restoreCloth());
      }
    }
    restoreCloth() {
      if (!this.snapshot) return;
      (this.releaseAll(), this.releaseEpoch++, this.releasing.clear(), this.interaction.releaseAll());
      this.audioPort?.postMessage({ reset: !0 });
      this.damageCounts = [0, 0];
      this.probeSteps = 0;
      let e = this.device.createCommandEncoder({ label: `reset` });
      (e.copyBufferToBuffer(this.snapshot.x, 0, this.solver.x, 0, this.solver.x.size),
        e.copyBufferToBuffer(this.snapshot.segs, 0, this.solver.segs, 0, this.solver.segs.size),
        e.copyBufferToBuffer(this.snapshot.tails, 0, this.solver.tails, 0, this.solver.tails.size),
        e.copyBufferToBuffer(this.snapshot.field, 0, this.solver.field, 0, this.solver.field.size),
        e.clearBuffer(this.solver.v),
        e.clearBuffer(this.solver.ext),
        e.clearBuffer(this.solver.counters),
        e.clearBuffer(this.solver.acousticSources),
        this.renderer.resetTopology(e),
        this.device.queue.submit([e.finish()]),
        this.topology.reset(),
        this.topology.request(),
        (this.topologyEvents = 0),
        (this.simBacklog = 0),
        (this.refineSteps = 0),
        (this.asleep = !0),
        (this.dirty = !0));
    }
    loadCreature() {
      return (
        (this.creatureLoad ??= Promise.all([mn(self.location.href), hn(self.location.href)]).then(
          ([{ model: e, images: t }, n]) => {
            let r = new _n(this.renderer, e, t);
            return (
              this.device.queue.onSubmittedWorkDone().then(() => {
                for (let e of Object.values(t)) `close` in e && e.close();
              }),
              { renderer: r, puppet: new En(new Cn(e)), clip: n }
            );
          },
        )),
        this.creatureLoad.catch(() => (this.creatureLoad = null)),
        this.creatureLoad
      );
    }
    heardLaugh(e, t, n, r) {
      this.laugh = { envelope: e, start: t, from: n, to: r };
    }
    laughLevel() {
      let e = this.laugh;
      if (!e) return 0;
      let t = e.from + (performance.timeOrigin + performance.now() - e.start) / 1e3;
      return t >= e.from && t <= e.to ? Pn(e.envelope, t) : 0;
    }
    heard(e) {
      return (e * sn) / Math.min(1.25, Math.max(0.1, this.pace));
    }
    prefetch(e) {
      this.ready && e === `beneath` && this.loadCreature().catch(() => {});
    }
    async experience(e) {
      if (!this.ready) return;
      let t = ++this.experienceToken;
      if (e === null) {
        this.stage && this.endExperience();
        return;
      }
      (this.stage && this.endExperience(!1), X({ type: `experience`, name: e, state: `loading` }));
      let n;
      try {
        n = await this.loadCreature();
      } catch (n) {
        (console.error(n), t === this.experienceToken && X({ type: `experience`, name: e, state: `failed` }));
        return;
      }
      t === this.experienceToken &&
        this.ready &&
        (this.paused && this.setPaused(!1),
        this.releaseAll(),
        this.restoreCloth(),
        X({ type: `cue`, cue: { kind: `stop` } }),
        (this.laugh = null),
        (this.pace = sn),
        (this.stage = new Nn({
          device: this.device,
          scene: this.scene,
          solver: this.solver,
          interaction: this.interaction,
          renderer: this.renderer,
          body: this.body,
          creature: n.renderer,
          puppet: n.puppet,
          clip: n.clip,
          analyse: () => this.topology.request(),
          letGo: (e) => {
            this.interaction.letGo(e);
            let t = this.releaseEpoch;
            this.topology.request().then(() => {
              t === this.releaseEpoch &&
                (this.interaction.release(e), (this.refineSteps = Math.round(Ot.duration / Q)));
            });
          },
          cue: (e) => {
            e.kind === `laugh`
              ? X({ type: `cue`, cue: { kind: `laugh`, from: e.from, to: e.to } })
              : e.kind === `ambient`
                ? X({ type: `cue`, cue: { kind: `ambient` } })
                : e.kind === `ambientFade`
                  ? X({ type: `cue`, cue: { kind: `ambientFade`, duration: this.heard(e.duration) } })
                  : e.kind === `glitch` &&
                    X({ type: `cue`, cue: { kind: `glitch`, duration: this.heard(e.duration), level: e.level } });
          },
          held: (e, t) => this.audioPort?.postMessage({ grip: e, held: t }),
          laugh: () => this.laughLevel(),
        })),
        this.wake(),
        (this.dirty = !0),
        X({ type: `experience`, name: e, state: `playing` }),
        X({ type: `cursor`, cursor: `default` }));
    }
    endExperience(e = !0, t = -1 / 0) {
      let n = this.stage;
      if (n) {
        ((this.reacquire = t),
          (this.stage = null),
          n.stop(),
          t === -1 / 0 && (X({ type: `cue`, cue: { kind: `stop` } }), (this.laugh = null)));
        for (let e = 0; e < 4; e++) this.audioPort?.postMessage({ grip: e, held: !1 });
        (this.restoreCloth(),
          e &&
            (X({ type: `experience`, name: `beneath`, state: `ended` }),
            X({ type: `cursor`, cursor: this.toolCursor() })));
      }
    }
    reacquireSignal(e) {
      let t = (e - this.reacquire) / 600;
      if (t < 0 || t >= 1) {
        this.renderer.post.glitch !== 0 && (this.renderer.post = { ...F });
        return;
      }
      let n = (1 - t) * (1 - t);
      ((this.renderer.post = { ...F, glitch: 0.7 * n, glitchSeed: Math.floor(e / 70) % 97 }), (this.dirty = !0));
    }
    setSize(e, t, n, r) {
      // Render-quality changes keep the same CSS camera and pending cloth contacts.
      if (n !== this.cssWidth || r !== this.cssHeight) this.cancelPicks();
      ((this.width = e), (this.height = t), (this.cssWidth = n), (this.cssHeight = r));
      let i = this.context.canvas;
      ((i.width = e), (i.height = t), this.renderer?.resize(e, t), (this.dirty = !0));
    }
    wake() {
      this.asleep && ((this.asleep = !1), (this.restFor = 0), (this.simBacklog = 0));
    }
    ray(e, t, n = A(this.camera, this.width / this.height)) {
      let r = (e / this.cssWidth) * 2 - 1,
        i = 1 - (t / this.cssHeight) * 2,
        a = O(n.invViewProj, [r, i, 0]),
        o = O(n.invViewProj, [r, i, 1]),
        s = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
      return { origin: s, dir: E(w([o[0] / o[3], o[1] / o[3], o[2] / o[3]], s)) };
    }
    toolCursor() {
      return { blade: `crosshair`, claw: `cell`, fist: `pointer`, pin: `copy` }[this.tool] ?? `grab`;
    }
    setTool(e) {
      if (!TOOLS.includes(e) || e === this.tool) return;
      // hands let go; pins stay (they are the point of the pin tool)
      (this.pickToken++, this.picking.clear(), this.strokes.clear(), this.claws.clear());
      for (let [e, t] of [...this.grips]) t.pinned || this.endGrip(e);
      this.down.clear();
      ((this.tool = e), this.ready && !this.stage && X({ type: `cursor`, cursor: this.toolCursor() }));
    }
    // the point on the horizontal plane z under the pointer
    planeHit(e, t, n) {
      let { origin: r, dir: i } = this.ray(e, t);
      if (Math.abs(i[2]) < 1e-6) return null;
      let a = (n - r[2]) / i[2];
      return a < 0 ? null : [r[0] + a * i[0], r[1] + a * i[1], n];
    }
    // Fist: a blunt sphere punched down through the sheet where the pointer hit, then drawn back up
    fistPointer(e) {
      if (e.phase !== `down` || this.fists.length >= 8) return;
      let t = this.planeHit(e.x, e.y, 0);
      t && (this.fists.push({ p: t, t0: this.simTime }), this.wake(), (this.dirty = !0));
    }
    // Claw: three sharp capsules riding just under the surface with the pointer, piercing and dragging
    clawPointer(e) {
      if (e.phase === `cancel` && e.id === -1) {
        this.claws.clear();
        return;
      }
      if (e.phase === `down`) {
        if (this.claws.size >= 4) return;
        let tip = this.planeHit(e.x, e.y, FIST.clawDepth);
        if (tip) {
          this.claws.set(e.id, { tip, dir: [1, 0], pending: [tip], done: !1, doneAt: Infinity, finalApplied: !1 });
          this.wake();
          this.dirty = !0;
        }
        return;
      }
      const claw = this.claws.get(e.id);
      if (!claw) return;
      if (e.phase !== `move` && e.phase !== `up`) {
        this.claws.delete(e.id);
        return;
      }
      if (claw.done) return;
      const tip = this.planeHit(e.x, e.y, FIST.clawDepth);
      const last = claw.pending.at(-1) ?? claw.tip;
      if (tip && Math.hypot(tip[0] - last[0], tip[1] - last[1]) > 1e-6) {
        claw.pending.push(tip);
        // Keep the first unconsumed pose, turns, and endpoint without growing a
        // long trail behind the finger. Existing solver steps consume the path.
        if (claw.pending.length > 8) {
          let index = 1,
            smallest = Infinity;
          for (let j = 1; j < claw.pending.length - 1; j++) {
            const [a, b, c] = claw.pending.slice(j - 1, j + 2);
            const bend =
              Math.hypot(b[0] - a[0], b[1] - a[1]) +
              Math.hypot(c[0] - b[0], c[1] - b[1]) -
              Math.hypot(c[0] - a[0], c[1] - a[1]);
            if (bend < smallest) {
              smallest = bend;
              index = j;
            }
          }
          claw.pending.splice(index, 1);
        }
      }
      if (e.phase === `up`) {
        claw.done = !0;
        claw.doneAt = e.time;
      }
      this.wake();
      this.dirty = !0;
    }
    // Pin: a stationary grip on the picked node; picking a pinned node again lets it go
    pickRadius(point, blade = !1) {
      // Proximity is measured in CSS pixels; the actual cloth grip patch stays the same size.
      const scale = this.height / this.cssHeight;
      if (point.pointerType === `touch`) {
        const contact = Math.max(+point.width || 1, +point.height || 1);
        return Math.min(blade ? 18 : 28, Math.max(blade ? 12 : 20, contact * 0.6)) * scale;
      }
      return Math.max(blade ? 6 : 8, (blade ? KNIFE.pickWindow : 0.016) * this.cssHeight) * scale;
    }
    pinPointer(e) {
      if (e.phase !== `down`) return;
      let t = { time: e.time, x: e.x, y: e.y },
        n = ++this.pickToken,
        r = A(this.camera, this.width / this.height),
        i = (t.x / this.cssWidth) * this.width,
        a = (t.y / this.cssHeight) * this.height,
        o = this.pickRadius(e);
      this.interaction.pickAt(r.viewProj, i, a, this.width, this.height, o).then((e) => {
        if (n !== this.pickToken || !e) return;
        let i = this.interaction.holder(e.node);
        if (i >= 0) {
          for (let [e, t] of this.grips) if (t.slot === i) return void this.endGrip(e);
          return;
        }
        let a = this.interaction.freeSlot(),
          o = e.position;
        if (a < 0 || !this.interaction.attach(e.node, o, a, e.window)) return;
        let s = E(w(this.camera.target, r.eye)),
          c = `pin${++this.pinSeq}`;
        (this.grips.set(c, {
          slot: a,
          node: e.node,
          hand: new We(o, te(s, -1)),
          track: new Ge(t),
          plane: o,
          normal: s,
          downPoint: o,
          pinned: !0,
        }),
          this.audioPort?.postMessage({ grip: a, held: !0 }),
          this.wake());
      });
    }
    // the bodies the pointer tools drive this substep (fists in flight, claws), posed on the body contact
    stepProps(e) {
      let t = [],
        n = this.simTime;
      const roster = [];
      this.fists = this.fists.filter((e) => n - e.t0 < FIST.total);
      for (let e of this.fists) {
        let r = n - e.t0,
          i =
            r < FIST.down
              ? FIST.top + (FIST.bottom - FIST.top) * (1 - Math.pow(1 - r / FIST.down, 3))
              : r < FIST.down + FIST.hold
                ? FIST.bottom
                : FIST.bottom + (FIST.top - FIST.bottom) * Math.min(1, (r - FIST.down - FIST.hold) / FIST.up);
        roster.push(e);
        t.push({ a: [e.p[0], e.p[1], i], b: [e.p[0], e.p[1], i + 0.02], radius: FIST.radius, active: !0, sharp: !1 });
      }
      const now = Rn(performance.now());
      for (const [id, claw] of this.claws) {
        // A released fast swipe still gets its last contact substep. Never
        // replay a stale trail after a long GPU stall or while in slow motion.
        if (claw.done && (claw.finalApplied || now - claw.doneAt > 120)) {
          this.claws.delete(id);
          continue;
        }
        const tip = claw.pending.shift();
        if (tip) {
          const dx = tip[0] - claw.tip[0],
            dy = tip[1] - claw.tip[1];
          const distance = Math.hypot(dx, dy);
          if (distance > 1e-4) claw.dir = [dx / distance, dy / distance];
          claw.tip = tip;
        }
        roster.push(claw);
        for (let n = -1; n <= 1; n++) {
          let r = [
            claw.tip[0] - claw.dir[1] * n * FIST.clawGap,
            claw.tip[1] + claw.dir[0] * n * FIST.clawGap,
            claw.tip[2],
          ];
          t.push({ a: [r[0], r[1], r[2] + 0.03], b: r, radius: FIST.clawRadius, active: !0, sharp: !0 });
        }
        if (claw.done && !claw.pending.length) claw.finalApplied = !0;
      }
      // Previous capsule positions are indexed. When a fist expires or a claw
      // changes, do not sweep its replacement from the removed body's position.
      if (roster.length !== this.propRoster?.length || roster.some((body, i) => body !== this.propRoster[i]))
        this.body.hasPrev = !1;
      this.propRoster = roster;
      (t.length > 0 || this.body.count > 0) && this.body.setPose(t, e);
    }
    shake() {
      if (!this.ready || this.stage || this.paused) return;
      let e = this.scene,
        t = e.nodeCount,
        n = new Float32Array(4 * t),
        r = 6.2831853,
        i = Math.random() * r,
        a = Math.random() * r;
      for (let o = 0; o < t; o++) {
        if (e.pinned[o]) continue;
        let t = e.position[3 * o],
          s = e.position[3 * o + 1],
          c = Math.sin((r * t) / 0.17 + i) * Math.cos((r * s) / 0.13 + a);
        ((n[4 * o] = 0.25 * Math.sin((r * s) / 0.21 + a)),
          (n[4 * o + 1] = 0.25 * Math.cos((r * t) / 0.19 + i)),
          (n[4 * o + 2] = 0.9 * c));
      }
      (this.device.queue.writeBuffer(this.solver.v, 0, n), this.wake(), (this.dirty = !0));
    }
    setWind(e) {
      this.windLevel = Math.max(0, Math.min(2, e | 0));
      let t = [0, 6, 32][this.windLevel],
        n = -0.6,
        r = [Math.cos(n), Math.sin(n), 0.12],
        i = Math.hypot(...r);
      (this.body.setWind([r[0] / i, r[1] / i, r[2] / i], t), t > 0 && (this.wake(), (this.dirty = !0)));
    }
    setTimeScale(e) {
      this.timeScale = Math.max(0.05, Math.min(1, +e || 1));
    }
    setPaused(paused) {
      if (!this.ready || (paused && this.stage)) {
        X({
          type: `pause`,
          paused: this.paused,
          reason: this.stage ? `Finish Smilie before framing the fabric.` : `The fabric is still getting ready.`,
        });
        return;
      }
      paused = !!paused;
      if (paused && !this.paused) this.releaseAll(!0);
      this.paused = paused;
      this.simBacklog = 0;
      this.lastFrame = performance.now();
      this.dirty = !0;
      X({ type: `pause`, paused });
    }
    // Keep a short path while GPU picking is in flight, preserving turns and the release endpoint.
    bladePointer(e) {
      if (e.phase === `cancel` && e.id === -1) {
        this.strokes.clear();
        return;
      }
      if (e.phase === `down`) {
        if (this.strokes.has(e.id) || this.strokes.size >= 4) return;
        let t = { last: -1, pending: [], busy: !1, done: !1, doneAt: Infinity };
        (this.strokes.set(e.id, t), this.bladeSample(e.id, t, e));
      } else if (e.phase === `move`) {
        let t = this.strokes.get(e.id);
        t && !t.done && this.bladeSample(e.id, t, e);
      } else {
        let t = this.strokes.get(e.id);
        if (!t) return;
        if (e.phase !== `up`) {
          this.strokes.delete(e.id);
          return;
        }
        t.done = !0;
        t.doneAt = e.time;
        this.bladeSample(e.id, t, e);
      }
    }
    bladeSample(e, t, n) {
      if (n) {
        const last = t.pending.at(-1) ?? t.sample;
        if (!last || last.x !== n.x || last.y !== n.y) t.pending.push(n);
        // Simplify the straightest interior point first, retaining both ends and sharp corners.
        if (t.pending.length > 12) {
          let index = 1,
            smallest = Infinity;
          for (let j = 1; j < t.pending.length - 1; j++) {
            const [a, b, c] = t.pending.slice(j - 1, j + 2);
            const bend =
              Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y) - Math.hypot(c.x - a.x, c.y - a.y);
            if (bend < smallest) {
              smallest = bend;
              index = j;
            }
          }
          t.pending.splice(index, 1);
        }
      }
      if (t.busy) return;
      if (!t.pending.length || (t.done && Rn(performance.now()) - t.doneAt > 200)) {
        if (t.done) this.strokes.delete(e);
        return;
      }
      t.busy = !0;
      let r = t.pending.shift();
      // Sparse mobile events can span more than the knife's safe weave-space run.
      // Pick along that screen segment so cuts stay continuous without cutting across folds.
      if (t.sample) {
        const distance = Math.hypot(r.x - t.sample.x, r.y - t.sample.y);
        const spacing = Math.max(8, Math.min(24, this.cssHeight / 32));
        if (distance > spacing) {
          t.pending.unshift(r);
          const fraction = spacing / distance;
          r = { ...r, x: t.sample.x + (r.x - t.sample.x) * fraction, y: t.sample.y + (r.y - t.sample.y) * fraction };
        }
      }
      t.sample = r;
      let i = A(this.camera, this.width / this.height),
        a = (r.x / this.cssWidth) * this.width,
        o = (r.y / this.cssHeight) * this.height,
        s = this.pickRadius(r, !0);
      this.interaction.pickAt(i.viewProj, a, o, this.width, this.height, s).then(
        (n) => {
          if (((t.busy = !1), this.strokes.get(e) !== t)) return;
          if (t.done && Rn(performance.now()) - t.doneAt > 200) {
            this.strokes.delete(e);
            return;
          }
          if (n) {
            (this.body.cut(t.last >= 0 ? t.last : n.node, n.node), (t.last = n.node), this.wake(), (this.dirty = !0));
          } else t.last = -1;
          this.bladeSample(e, t);
        },
        () => {
          if (this.strokes.get(e) === t) this.strokes.delete(e);
        },
      );
    }
    pointer(e) {
      if (!this.ready || this.stage || this.paused) return;
      if (e.phase === `cancel` && e.id === -1) {
        this.releaseAll(!!e.preservePins);
        return;
      }
      if (this.tool === `blade`) {
        this.bladePointer(e);
        return;
      }
      if (this.tool === `claw`) {
        this.clawPointer(e);
        return;
      }
      if (this.tool === `fist`) {
        this.fistPointer(e);
        return;
      }
      if (this.tool === `pin`) {
        (e.phase === `cancel` && e.id === -1) || this.pinPointer(e);
        return;
      }
      let t = { time: e.time, x: e.x, y: e.y, pointerType: e.pointerType, width: e.width, height: e.height };
      if (e.phase === `cancel` && e.id === -1) this.releaseAll();
      else if (e.phase === `down`) {
        if (
          ((this.down.get(e.id)?.upTime ?? Infinity) < Infinity && (this.picking.delete(e.id), this.endGrip(e.id)),
          this.down.has(e.id) || this.down.size >= 4)
        )
          return;
        (this.down.set(e.id, new Ge(t)), this.beginGrip(e.id, t));
      } else
        e.phase === `move`
          ? this.down.get(e.id)?.add(t)
          : e.phase === `up` && this.down.has(e.id)
            ? (this.down.get(e.id).add(t), (this.down.get(e.id).upTime = t.time))
            : (this.down.delete(e.id), this.picking.delete(e.id), this.endGrip(e.id));
    }
    async beginGrip(e, t) {
      let n = ++this.pickToken;
      this.picking.set(e, n);
      let r = A(this.camera, this.width / this.height),
        i = (t.x / this.cssWidth) * this.width,
        a = (t.y / this.cssHeight) * this.height,
        o = this.pickRadius(t);
      const pick = () => this.interaction.pickAt(r.viewProj, i, a, this.width, this.height, o).catch(() => null);
      let s = await pick();
      if (this.picking.get(e) !== n) return;
      // A previous finger can have released its force while its patch is still
      // reserved for topology readback. Keep the new gesture alive until that
      // reservation ends, then pick the cloth again in its current state.
      const cleanup =
        s &&
        (this.releasing.get(this.interaction.holder(s.node)) ??
          (this.interaction.freeSlot() < 0 && this.releasing.size ? Promise.race(this.releasing.values()) : null));
      if (cleanup) {
        const completed = await cleanup;
        if (this.picking.get(e) !== n) return;
        const track = this.down.get(e);
        if (!completed || !track || Rn(performance.now()) - track.upTime > 150) {
          this.picking.delete(e);
          this.down.delete(e);
          return;
        }
        s = await pick();
      }
      if (this.picking.get(e) !== n) return;
      this.picking.delete(e);
      let c = this.down.get(e);
      if (!s || !c || Rn(performance.now()) - c.upTime > 150 || this.interaction.holder(s.node) >= 0) {
        this.down.delete(e);
        return;
      }
      let l = this.interaction.freeSlot(),
        u = s.position;
      if (l < 0 || !this.interaction.attach(s.node, u, l, s.window)) {
        this.down.delete(e);
        return;
      }
      let d = E(w(this.camera.target, r.eye)),
        f = { slot: l, node: s.node, hand: new We(u, te(d, -1)), track: c, plane: u, normal: d, downPoint: u };
      // A quick pull may finish during the GPU pick. Replay at most 50 ms of its
      // path instead of jumping straight to release or holding a stale touch.
      if (Number.isFinite(c.upTime)) f.replayTime = Math.max(c.first.time, c.upTime - 50);
      ((f.downPoint = this.planePoint(f, c.first) ?? u),
        this.grips.set(e, f),
        this.audioPort?.postMessage({ grip: l, held: !0 }),
        this.wake(),
        X({ type: `cursor`, cursor: `grabbing` }));
    }
    planePoint(e, t, view) {
      let { origin: n, dir: r } = this.ray(t.x, t.y, view),
        i = T(r, e.normal);
      return Math.abs(i) < 1e-6 ? null : ne(n, te(r, T(w(e.plane, n), e.normal) / i));
    }
    endGrip(e) {
      this.down.delete(e);
      let t = this.grips.get(e);
      if (!t) return;
      (this.grips.delete(e), this.audioPort?.postMessage({ grip: t.slot, held: !1 }), this.interaction.letGo(t.slot));
      let n = this.releaseEpoch;
      const cleanup = this.topology.request().then(
        () => {
          if (n !== this.releaseEpoch) return !1;
          (this.interaction.release(t.slot), (this.refineSteps = Math.round(Ot.duration / Q)));
          return !0;
        },
        () => {
          // A failed readback cannot leave a zero-force reservation permanently
          // occupying a grip slot, or attach a waiting finger to stale topology.
          if (n === this.releaseEpoch) this.interaction.release(t.slot);
          return !1;
        },
      );
      this.releasing.set(t.slot, cleanup);
      cleanup.then(() => {
        if (this.releasing.get(t.slot) === cleanup) this.releasing.delete(t.slot);
      });
      this.grips.size === 0 && X({ type: `cursor`, cursor: `grab` });
    }
    releaseAll(preservePins = !1) {
      (this.pickToken++, this.picking.clear(), this.strokes.clear(), this.body?.clearStrokes(), this.claws.clear());
      ((this.fists.length = 0), this.body && this.body.count > 0 && !this.stage && this.body.setPose([], Q));
      for (let [e, grip] of [...this.grips]) if (!preservePins || !grip.pinned) this.endGrip(e);
      this.down.clear();
    }
    cancelPicks() {
      // A pending screen-space hit belongs to the camera that submitted it.
      this.pickToken++;
      for (const id of this.picking.keys()) this.down.delete(id);
      this.picking.clear();
      this.strokes.clear();
      this.body?.clearStrokes();
    }
    setCamera(preset) {
      if (!this.ready || this.stage || ![`front`, `angle`, `detail`, `reset`].includes(preset)) return;
      this.cancelPicks();
      const variation = {
        front: { pitch: 0.03, yaw: 0 },
        angle: { pitch: 0.64, yaw: -0.42 },
        detail: { distance: 0.53, pitch: 0.32, yaw: -0.18 },
        reset: {},
      }[preset];
      this.camera = { ...k, target: [...k.target], ...variation };
      this.dirty = !0;
    }
    zoom(e) {
      if (!this.ready || this.stage || !Number.isFinite(e)) return;
      if (e) this.cancelPicks();
      this.camera.distance = Math.max(0.3, Math.min(1.15, this.camera.distance * Math.exp(e * 8e-4)));
      this.dirty = !0;
    }
    // orbit the camera: yaw and pitch deltas (rad); pitch 0 looks straight down
    orbit(e, t) {
      if (!this.ready || this.stage || !Number.isFinite(e) || !Number.isFinite(t)) return;
      if (e || t) this.cancelPicks();
      ((this.camera.yaw += e),
        (this.camera.pitch = Math.max(0.03, Math.min(1.3, this.camera.pitch + t))),
        (this.dirty = !0));
    }
    wheel(e) {
      if (this.ready && !this.stage && Number.isFinite(e)) {
        const held = [...this.grips.values()].filter((grip) => !grip.pinned);
        if (!this.paused && held.length > 0) for (let t of held) t.hand.wheel(-e * 6e-5);
        else this.zoom(e);
      }
    }
    substepIterations() {
      return this.refineSteps <= 0 ? 0 : (this.refineSteps--, Ot.newtonIterations);
    }
    stepHandles(e, t, inputStep = e / this.timeScale) {
      ((this.simTime += e), this.stepProps(e), this.body.tickWind(this.simTime));
      let view;
      for (let [n, r] of [...this.grips]) {
        if (r.pinned) {
          (r.hand.step(e, [0, 0, 0]),
            this.interaction.setTarget(r.hand.target, r.slot),
            this.interaction.setPinch(r.hand.pinch, r.slot));
          continue;
        }
        if (r.finalSampled) {
          this.endGrip(n);
          continue;
        }
        const inputFrom = r.inputTime ?? r.replayTime ?? r.track.first.time;
        const sampleTime =
          r.replayTime === undefined
            ? Math.min(t, r.track.upTime)
            : (r.replayTime = Math.min(r.track.upTime, r.replayTime + 1000 * inputStep));
        r.finalSampled = r.track.upTime <= sampleTime;
        r.inputTime = sampleTime;
        // The finger moves in real time even when the cloth runs in slow motion
        // or a busy GPU caps the number of physical substeps. Keep the existing
        // acceleration bound stable by integrating that input interval in small steps.
        // Frames without a physical substep still count toward the finger's
        // elapsed time. Bound resumption after a long background/GPU stall.
        const elapsed = Math.min(0.1, Math.max(0, (sampleTime - inputFrom) / 1000));
        const slices = Math.max(1, Math.ceil(elapsed / Q - 1e-6));
        if (elapsed > 0) {
          // The camera is fixed during this synchronous input batch. Reuse its
          // matrices for every finger sample instead of inverting them repeatedly.
          view ??= A(this.camera, this.width / this.height);
          for (let j = 0; j < slices; j++) {
            const at = sampleTime - 1000 * elapsed * (1 - (j + 1) / slices);
            const point = this.planePoint(r, r.track.at(at), view);
            r.hand.step(elapsed / slices, point ? w(point, r.downPoint) : [0, 0, 0]);
          }
        }
        r.track.prune(sampleTime);
        (this.interaction.setTarget(r.hand.target, r.slot), this.interaction.setPinch(r.hand.pinch, r.slot));
      }
    }
    updateAnchors() {
      if (this.stage) {
        let e = this.stage.sources();
        if (e.every((e) => !e)) return;
        (this.anchors.fill(0),
          e.forEach((e, t) => e && this.anchors.set([...e, 1], 4 * t)),
          this.device.queue.writeBuffer(this.solver.acousticSources, 0, this.anchors));
        return;
      }
      if (this.grips.size !== 0) {
        this.anchors.fill(0);
        for (let e of this.grips.values()) this.anchors.set([...e.hand.target, 1], 4 * e.slot);
        this.device.queue.writeBuffer(this.solver.acousticSources, 0, this.anchors);
      }
    }
    setAudio(e) {
      ((this.audioPort = e), this.ready && this.startAcoustics());
    }
    startAcoustics() {
      if (this.acoustic) return;
      this.acoustic = new Fn(this.device, this.solver.counters);
      let e = this.device.createCommandEncoder({ label: `acousticStart` });
      (e.clearBuffer(this.solver.counters, 64, 96), this.device.queue.submit([e.finish()]));
    }
    sendAcoustics(e, t, n, r) {
      if (!this.audioPort) return;
      let i = new Float32Array(t * 13);
      for (let a = 0; a < t; a++) {
        for (let t = 0; t < 4; t++) {
          let n = yt(e, a * 24, t);
          if (!n) continue;
          let i = O(r, n);
          i[3] > 1e-6 && (this.lastPan[t] = Math.max(-1, Math.min(1, i[0] / i[3])));
        }
        bt(e, a * 24, i, a * 13, n, this.lastPan);
      }
      this.audioPort.postMessage(i, [i.buffer]);
    }
    probeRest(e) {
      if (this.probeBusy || !this.speedProbe) {
        this.probeSteps += e;
        return;
      }
      let t = this.speedProbe,
        n = (this.probeSteps + e) * Q,
        epoch = this.releaseEpoch;
      ((this.probeSteps = 0), (this.probeBusy = !0));
      let r = this.device.createCommandEncoder({ label: `restProbe` });
      (r.copyBufferToBuffer(this.solver.counters, 0, t, 0, 16),
        r.clearBuffer(this.solver.counters, 8, 4),
        this.device.queue.submit([r.finish()]),
        t.mapAsync(GPUMapMode.READ).then(
          () => {
            let e = t.getMappedRange(),
              r = new Float32Array(e)[2],
              i = new Uint32Array(e, 0, 2),
              counts = [i[0], i[1]],
              a = counts[0] + counts[1];
            t.unmap();
            this.probeBusy = !1;
            if (epoch !== this.releaseEpoch) return;
            const ruptures = Math.max(0, counts[0] - this.damageCounts[0]);
            const pulledOut = Math.max(0, counts[1] - this.damageCounts[1]);
            this.damageCounts = counts;
            if (ruptures || pulledOut) X({ type: `tear`, ruptures, pulledOut });
            if (
              (a !== this.topologyEvents && ((this.topologyEvents = a), this.topology.request()),
              this.grips.size > 0 || this.asleep || this.stage)
            ) {
              this.restFor = 0;
              return;
            }
            ((this.restFor = r < 0.003 ? this.restFor + n : 0),
              this.restFor >= 0.4 && ((this.asleep = !0), this.statsDirty && this.sendStats()));
          },
          () => (this.probeBusy = !1),
        ));
    }
    frame(e) {
      if (!this.ready) return;
      In.requestAnimationFrame((e) => this.frame(e));
      let t = Math.max(0, (e - this.lastFrame) / 1e3),
        n = Math.min(0.1, t);
      // Spend frames where they matter: direct interaction can run at 60 Hz. The GPU queue
      // still gates every frame, and the solver retains its fixed 120 Hz timestep.
      const interacting = this.down.size || this.strokes.size || this.claws.size || this.fists.length;
      const interval = interacting ? 1000 / 60 - 2 : 1000 / 30 - 2;
      if (this.inFlight || (!this.asleep && !this.paused && e - this.lastPresent < interval)) return;
      const workStarted = performance.now();
      const measureWork =
        interacting && this.visible && !this.paused && !this.stage && !this.recorder && !this.captureWanted;
      ((this.lastFrame = e),
        (this.windLevel > 0 || this.fists.length > 0 || this.claws.size > 0) &&
          !this.stage &&
          !this.paused &&
          this.wake());
      let r = 0;
      if (
        (this.visible &&
          !this.paused &&
          !this.asleep &&
          ((this.simBacklog += n * this.timeScale),
          (r = Math.floor(this.simBacklog / Q)),
          r > 5 ? ((r = 5), (this.simBacklog = 0)) : (this.simBacklog -= r * Q)),
        this.stage && t > 0 && t < 1 && (this.pace += (1 - Math.exp(-t)) * ((r * Q) / t - this.pace)),
        r === 0 && !this.dirty)
      )
        return;
      ((this.dirty = !!this.recorder), (this.lastPresent = e), r > 0 && this.updateAnchors());
      let i = r > 0 && this.acoustic?.begin() ? this.acoustic : null,
        a = Rn(e);
      for (let e = 0; e < r; e++) {
        this.stage ? this.stage.substep(Q) : this.stepHandles(Q, a - 1e3 * n * (1 - (e + 1) / r), n / r);
        let t = this.device.createCommandEncoder({ label: `substep` });
        (this.solver.encodeSubstep(t, this.substepIterations()), i?.record(t), this.device.queue.submit([t.finish()]));
      }
      if (i) {
        let e = n / r,
          t = A(this.stage ? this.stage.camera : this.camera, this.width / this.height).viewProj,
          epoch = this.releaseEpoch;
        i.end().then((n) => n && epoch === this.releaseEpoch && this.sendAcoustics(n.raw, n.count, e, t));
      }
      (r > 0 && (this.probeRest(r), (this.statsDirty = !0)), (this.substepsDone += r));
      let o = this.device.createCommandEncoder({ label: `frame` }),
        s = this.stage ? this.stage.frame() : this.camera;
      if (
        (this.stage || this.reacquireSignal(e),
        (this.frameTexture = this.context.getCurrentTexture()),
        this.renderer.encode(o, s, e / 1e3, this.frameTexture.createView()),
        this.captureWanted && this.encodeCapture(o, this.frameTexture),
        this.device.queue.submit([o.finish()]),
        this.captureIfRequested(),
        this.recorder?.frame(this.canvas, e),
        this.stage?.done && this.endExperience(!0, e),
        (this.inFlight = !0),
        this.device.queue.onSubmittedWorkDone().then(
          () => {
            this.inFlight = !1;
            if (measureWork && this.visible && !this.paused && !this.stage && !this.recorder) {
              this.gpuFrameTime += Math.max(0, performance.now() - workStarted);
              this.gpuFrameSamples++;
            }
          },
          () => (this.inFlight = !1),
        ),
        this.frameCount++,
        e - this.statsTime > 1e3)
      ) {
        let t = (e - this.statsTime) / 1e3;
        (this.sendStats({
          frameMs: (t * 1e3) / Math.max(1, this.frameCount),
          substepsPerFrame: this.substepsDone / Math.max(1, this.frameCount),
          simWallRatio: (this.substepsDone * Q) / t,
          gpuFrameMs: this.gpuFrameSamples ? this.gpuFrameTime / this.gpuFrameSamples : 0,
          gpuSamples: this.gpuFrameSamples,
        }),
          (this.frameCount = 0),
          (this.substepsDone = 0),
          (this.gpuFrameTime = 0),
          (this.gpuFrameSamples = 0),
          (this.statsTime = e));
      }
    }
    // stats to the page, with the solver's damage counters (yarns ruptured, yarns pulled out of the weave)
    sendStats(e = {}) {
      this.statsDirty = !1;
      const epoch = this.releaseEpoch;
      u(this.device, this.solver.counters, 8).then(
        (t) => {
          if (epoch !== this.releaseEpoch) return;
          let n = new Uint32Array(t);
          X({ type: `stats`, stats: { ...e, ruptures: n[0], pulledOut: n[1], asleep: this.asleep } });
        },
        () => {},
      );
    }
    // The frame as a PNG, for the share card: the canvas texture is copied to a buffer in the frame's
    // own command buffer (it is only valid until the frame is presented), read back, and encoded by a
    // 2D canvas (a WebGPU canvas cannot be read directly).
    encodeCapture(e, t) {
      let n = t.width,
        r = t.height,
        i = Math.ceil((4 * n) / 256) * 256,
        a = this.device.createBuffer({
          label: `capture`,
          size: i * r,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
      (e.copyTextureToBuffer({ texture: t }, { buffer: a, bytesPerRow: i, rowsPerImage: r }, [n, r, 1]),
        (this.capturePending = { id: this.captureWanted.id, buffer: a, bytesPerRow: i, width: n, height: r }));
    }
    captureIfRequested() {
      let e = this.capturePending;
      if (!e) return;
      ((this.capturePending = null), (this.captureWanted = null));
      let t = this.canvasFormat === `bgra8unorm`;
      e.buffer
        .mapAsync(GPUMapMode.READ)
        .then(() => {
          let n = new Uint8Array(e.buffer.getMappedRange()),
            r = new Uint8ClampedArray(4 * e.width * e.height);
          for (let t = 0; t < e.height; t++)
            r.set(n.subarray(t * e.bytesPerRow, t * e.bytesPerRow + 4 * e.width), 4 * t * e.width);
          if (t) for (let e = 0; e < r.length; e += 4) ((n = r[e]), (r[e] = r[e + 2]), (r[e + 2] = n));
          for (let e = 3; e < r.length; e += 4) r[e] = 255;
          (e.buffer.unmap(), e.buffer.destroy());
          let i = new OffscreenCanvas(e.width, e.height);
          return (
            i.getContext(`2d`).putImageData(new ImageData(r, e.width, e.height), 0, 0),
            i.convertToBlob({ type: `image/png` })
          );
        })
        .then(
          (blob) => X({ type: `capture`, id: e.id, blob }),
          (t) => {
            (console.warn(`capture failed:`, t?.name, t?.message), X({ type: `capture`, id: e.id, blob: null }));
            try {
              e.buffer.destroy();
            } catch {}
          },
        );
    }
    async record(e) {
      if (e === `start`) {
        if (this.recorder || !this.ready || !this.canvas) return;
        let e = new ClipRecorder(this.canvas.width, this.canvas.height);
        this.recorder = e;
        (await e.start()) ? (this.dirty = !0) : this.recorder === e && (this.recorder = null);
      } else {
        let e = this.recorder;
        this.recorder = null;
        e && (await e.stop());
      }
    }
    capture(id) {
      // A newer request may replace an unrendered one; in-flight readbacks keep their own ID.
      ((this.captureWanted = { id }), (this.dirty = !0));
    }
    setVisible(e) {
      ((this.visible = e), e || (this.releaseAll(!0), (this.simBacklog = 0)), (this.dirty = !0));
    }
    async runSubsteps(e) {
      for (let t = 0; t < e; t++) {
        if (this.paused) return;
        this.stepHandles(Q, Rn(performance.now()));
        let e = this.device.createCommandEncoder({ label: `devSubstep` });
        (this.solver.encodeSubstep(e, this.substepIterations()),
          this.device.queue.submit([e.finish()]),
          (t & 3) == 3 && (await this.device.queue.onSubmittedWorkDone()));
      }
      await this.device.queue.onSubmittedWorkDone();
    }
    // crossings with both yarns cut (dev)
    async cutCrossings() {
      let e = new Uint32Array(await u(this.device, this.solver.field, this.solver.field.size)),
        t = 0;
      for (let n of e) (n & 65535) === 65535 && t++;
      return t;
    }
    async dev(e) {
      if (!this.ready) return null;
      if (e.op === `step`) {
        await this.runSubsteps(e.substeps);
        let t = new Uint32Array(await u(this.device, this.solver.counters, 8));
        return { ruptures: t[0], pulledOut: t[1] };
      }
      if (e.op === `slash`) {
        (this.body.cut(e.a, e.b, e.width), this.wake());
        await this.runSubsteps(e.substeps ?? 2);
        return this.cutCrossings();
      }
      if (e.op === `cuts`) return this.cutCrossings();
      if (e.op === `printFill`) {
        // dev: a solid print written directly (no bitmap), to tell the upload path from the shader path
        let t = this.renderer,
          n = this.device.createTexture({
            label: `print`,
            size: [2, 2],
            format: `rgba8unorm-srgb`,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
          });
        (this.device.queue.writeTexture(
          { texture: n },
          new Uint8Array(16).fill(0).map((e, t) => [0, 255, 255, 255][t % 4]),
          { bytesPerRow: 8 },
          [2, 2],
        ),
          (t.printTex = n),
          (t.printView = n.createView()),
          t.rebuildSurfaceGroups(),
          (this.dirty = !0));
        return `filled`;
      }
      if (e.op === `printInfo`)
        return {
          width: this.renderer.printTex.width,
          height: this.renderer.printTex.height,
          label: this.renderer.printTex.label,
        };
      if (e.op === `drape`) {
        // the settled rest state in drape.bin's format (header: magic, version, node count, scene hash)
        let e = this.solver.N,
          t = new Float32Array(await u(this.device, this.snapshot.x, 16 * e)),
          n = new ArrayBuffer(16 + 16 * e);
        (new Uint32Array(n, 0, 4).set([1346458180, 1, e, Ht(this.scene)]), new Float32Array(n, 16).set(t));
        return n;
      }
      if (e.op === `info`)
        return {
          nodes: this.solver.N,
          tool: this.tool,
          fabric: this.fabric,
          rested: this.rested,
          wind: this.windLevel,
          timeScale: this.timeScale,
          paused: this.paused,
          camera: { ...this.camera, target: [...this.camera.target] },
          pins: [...this.grips.values()].filter((e) => e.pinned).length,
          fists: this.fists.length,
          bodies: this.body.count,
        };
      if (e.op === `punch`) {
        (this.fists.push({ p: e.at ?? [0, 0, 0], t0: this.simTime }), this.wake());
        await this.runSubsteps(e.substeps ?? 2);
        return { fists: this.fists.length, bodies: this.body.count, cuts: await this.cutCrossings() };
      }
      return e.op === `camera`
        ? (e.distance !== void 0 && (this.camera.distance = e.distance),
          e.pitch !== void 0 && (this.camera.pitch = e.pitch),
          e.yaw !== void 0 && (this.camera.yaw = e.yaw),
          e.target && (this.camera.target = e.target),
          (this.dirty = !0),
          null)
        : null;
    }
  })();
In.onmessage = (t) => {
  let n = t.data;
  switch (n.type) {
    case `init`:
      ((ASSET_BASE = typeof n.base == `string` && n.base ? n.base : `/`),
      ($.fabric = n.fabric ?? `tartan`),
      ($.settleSteps = n.settleSteps > 0 ? n.settleSteps : 420),
      $.init(n.canvas, n.width, n.height, n.cssWidth, n.cssHeight)).catch((t) => {
        (console.error(t),
          X({
            type: `status`,
            state: `error`,
            message: t instanceof e ? t.message : `The fabric could not be started on this device.`,
          }));
      });
      break;
    case `resize`:
      $.setSize(n.width, n.height, n.cssWidth, n.cssHeight);
      break;
    case `pointer`:
      $.pointer(n);
      break;
    case `wheel`:
      $.wheel(n.deltaY);
      break;
    case `orbit`:
      $.orbit(n.yaw, n.pitch);
      break;
    case `zoom`:
      $.zoom(n.deltaY);
      break;
    case `camera`:
      $.setCamera(n.preset);
      break;
    case `pause`:
      $.setPaused(n.paused);
      break;
    case `print`:
      $.ready && ($.renderer.setPrint(n.bitmap), ($.dirty = !0), n.bitmap?.close());
      break;
    case `reset`:
      $.reset();
      break;
    case `tool`:
      $.setTool(n.tool);
      break;
    case `wind`:
      $.setWind(n.level);
      break;
    case `shake`:
      $.shake();
      break;
    case `time`:
      $.setTimeScale(n.scale);
      break;
    case `capture`:
      $.capture(n.id);
      break;
    case `record`:
      $.record(n.action);
      break;
    case `experience`:
      $.experience(n.name);
      break;
    case `prefetch`:
      $.prefetch(n.name);
      break;
    case `laugh`:
      $.heardLaugh(n.envelope, n.start, n.from, n.to);
      break;
    case `visibility`:
      $.setVisible(n.visible);
      break;
    case `audio`:
      $.setAudio(n.port);
      break;
    case `dev`:
      $.dev(n).then(
        (e) => X({ type: `devDone`, id: n.id, result: e }),
        (e) => X({ type: `devDone`, id: n.id, result: String(e) }),
      );
  }
};
