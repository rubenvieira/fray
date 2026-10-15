import { airflowWGSL } from "./airflow.js";
import { ADDITIONAL_MATERIALS } from "./material-library.js";

// Qualitative textile fits for this interactive model, not laboratory fire
// properties. K, fuel fraction/s, char tendency, retained flame heat K/fraction.
export const BURN_PROFILES = [
  [565, 0.62, 0.8, 1800], // cotton denim
  [575, 0.48, 0.9, 1850], // jute
  [665, 0.32, 1, 1700], // wool
  [640, 0.42, 0.85, 1650], // silk satin
  [570, 0.57, 0.85, 1850], // flax
  [615, 0.85, 0.65, 1650], // thin silk
  [545, 0.95, 0.6, 1850], // open cotton
  [690, 0.28, 0.9, 1550], // metallic-faced weave
  [730, 0.32, 0.5, 1600], // nylon
  ...ADDITIONAL_MATERIALS.map((m) => m.burn),
];
const vec = (p) => `vec4<f32>(${p.map((v) => (Number.isInteger(v) ? `${v}.0` : v)).join(", ")})`;
export const burnProfileWGSL = `
fn burnProfile(material: u32) -> vec4<f32> {
  switch material {
    ${BURN_PROFILES.map((p, i) => `case ${i}u: { return ${vec(p)}; }`).join("\n    ")}
    default: { return ${vec(BURN_PROFILES[0])}; }
  }
}
fn burnNoise(seed: u32) -> f32 {
  var x = seed;
  x = (x ^ (x >> 16u)) * 0x7feb352du;
  x = (x ^ (x >> 15u)) * 0x846ca68bu;
  return f32(x ^ (x >> 16u)) / 4294967296.0;
}
`;

export const burnComputeWGSL = `
@group(0) @binding(0) var<uniform> P: SimParams;
@group(0) @binding(1) var<uniform> BF: array<vec4<u32>, 3>;
@group(0) @binding(2) var<storage, read> bn: array<NodeStatic>;
@group(0) @binding(3) var<storage, read> bx: array<vec4<f32>>;
// temperature K, consumed fuel fraction, irreversible char, reaction fraction/s
@group(0) @binding(4) var<storage, read_write> heat: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> nextHeat: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> burnField: array<u32>;
@group(0) @binding(7) var<storage, read_write> burnEvents: array<atomic<u32>>;
@group(0) @binding(8) var<storage, read_write> burnCount: array<atomic<u32>>;
struct BurnU {
  clock: vec4<f32>,
  materials: vec4<u32>,
  // picked node + 1, brush radius m, strength, unused; attached to moving cloth
  igniters: array<vec4<f32>, 4>,
};
@group(0) @binding(10) var<uniform> BU: BurnU;
${airflowWGSL}
${burnProfileWGSL}

@compute @workgroup_size(1)
fn burnClear() {
  atomicStore(&burnCount[0], 0u);
  atomicStore(&burnCount[1], 0u);
}

@compute @workgroup_size(128)
fn burnStep(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  let prev = heat[n];
  if (bx[n].w > 1.5) { nextHeat[n] = vec4<f32>(293.0, prev.y, prev.z, 0.0); return; }
  let ijl = bn[n].ijl;
  let l = ijl >> 24u;
  let L = P.layers[l].lattice;
  let profile = burnProfile(BU.materials[l]);
  let dt = P.hg.x;
  let q = bx[n].xyz;
  let air = airflowAt(q);
  let speed = length(air);
  let up = normalize(vec3<f32>(0.0, 0.0, 1.0) + 0.12 * air);
  var pilot = 0.0;
  for (var j = 0u; j < 4u; j++) {
    let source = BU.igniters[j];
    if (source.x < 0.5) { continue; }
    let node = u32(source.x) - 1u;
    if (node >= P.counts.x || bx[node].w > 1.5) { continue; }
    let d = length(q - bx[node].xyz) / max(source.y, 1e-5);
    pilot += source.z * (1.0 - smoothstep(0.45, 1.0, d));
  }
  let i = i32(ijl & 0xFFFu);
  let j = i32((ijl >> 12u) & 0xFFFu);
  var preheat = 0.0;
  var radiantWeight = 0.0;
  var conduction = 0.0;
  var weight = 0.0;
  for (var dj = -2; dj <= 2; dj++) {
    for (var di = -2; di <= 2; di++) {
      if (di == 0 && dj == 0) { continue; }
      let ii = i + di;
      let jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= i32(L.y) || jj >= i32(L.z)) { continue; }
      let m = L.x + u32(jj) * L.y + u32(ii);
      if (bx[m].w > 1.5) { continue; }
      let delta = q - bx[m].xyz;
      let distance = length(delta);
      // Transfer is spatial: torn pieces cannot heat distant material just
      // because the two nodes used to be neighbours in the material chart.
      if (distance > 0.018 || distance < 1e-8) { continue; }
      let w = exp(-distance / 0.007);
      let buoyant = 0.08 + 3.0 * pow(max(0.0, dot(delta / distance, up)), 2.0);
      preheat += heat[m].w * w * buoyant;
      radiantWeight += w;
      if (abs(di) + abs(dj) == 1 && abs(bx[n].w - bx[m].w) < 0.5) {
        conduction += (heat[m].x - prev.x) * w;
        weight += w;
      }
    }
  }
  let ignition = profile.x + 35.0 * (burnNoise(n * 197u + 71u) - 0.5);
  let cool = 0.65 + 0.12 * speed;
  var temperature = 293.0 + (max(293.0, prev.x) - 293.0) * exp(-cool * dt);
  temperature += dt * (1700.0 * min(1.0, pilot) + 1400.0 * preheat / max(1.0, radiantWeight) + 1.8 * conduction / max(1.0, weight));
  let activation = smoothstep(ignition - 35.0, ignition + 65.0, temperature);
  // Strong frontal flow cools the fabric; ordinary airflow bends the plume.
  let reaction = profile.y * activation * max(0.0, 1.0 - prev.y) / (1.0 + 0.025 * speed * speed);
  // Thermoplastic nylon loses its load-bearing section before sustained flame.
  let melting = select(0.0, 0.38 * smoothstep(500.0, 630.0, temperature) * max(0.0, 1.0 - prev.y), BU.materials[l] == 8u || BU.materials[l] == 11u);
  let consumed = min(1.0, prev.y + dt * max(reaction, melting));
  temperature += dt * reaction * profile.w;
  let scorch = 0.55 * smoothstep(410.0, ignition, temperature);
  let charred = max(prev.z, max(scorch, consumed * profile.z));
  nextHeat[n] = vec4<f32>(clamp(temperature, 293.0, 1500.0), consumed, min(1.0, charred), max(reaction, 0.35 * min(1.0, pilot)));
}

@compute @workgroup_size(128)
fn burnCommit(@builtin(global_invocation_id) gid: vec3<u32>) {
  let n = gid.x;
  if (n >= P.counts.x) { return; }
  heat[n] = nextHeat[n];
  if (heat[n].x > 301.0 || heat[n].w > 1e-4) { atomicAdd(&burnCount[0], 1u); }
  atomicMax(&burnCount[1], u32(heat[n].x));
}

@compute @workgroup_size(128)
fn burnWeave(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x;
  let last = BF[P.counts.y - 1u];
  if (c >= last.x + last.y * last.z || P.counts.z == 0u) { return; }
  var l = 0u;
  for (var i = 1u; i < P.counts.y; i++) { if (c >= BF[i].x) { l = i; } }
  let F = BF[l];
  let L = P.layers[l].lattice;
  let bu = u32(P.layers[l].yarn[1].yarnsPerSpan);
  let bv = u32(P.layers[l].yarn[0].yarnsPerSpan);
  let k = (c - F.x) % F.y;
  let m = (c - F.x) / F.y;
  let u = clamp((f32(k) - 0.5 * f32(bu - 1u)) / f32(bu), 0.0, f32(L.y - 1u));
  let v = clamp((f32(m) - 0.5 * f32(bv - 1u)) / f32(bv), 0.0, f32(L.z - 1u));
  let i0 = min(u32(u), L.y - 2u);
  let j0 = min(u32(v), L.z - 2u);
  let n = L.x + j0 * L.y + i0;
  let loss = mix(mix(heat[n].y, heat[n + 1u].y, u - f32(i0)), mix(heat[n + L.y].y, heat[n + L.y + 1u].y, u - f32(i0)), v - f32(j0));
  if (loss < 0.02) { return; }
  var word = burnField[c];
  let before = word;
  for (var f = 0u; f < 2u; f++) {
    let threshold = 0.67 + 0.22 * burnNoise(2u * c + f + 991u);
    let area = min((word >> (16u + 8u * f)) & 255u, u32(round(255.0 * max(0.02, 1.0 - loss / threshold))));
    word = (word & ~(255u << (16u + 8u * f))) | (area << (16u + 8u * f));
    if (loss >= threshold) { word = (word & ~(255u << (8u * f))) | (255u << (8u * f)); }
  }
  if (word != before) { burnField[c] = word; atomicStore(&burnEvents[0], 1u); }
}
`;

export const burnAppearanceWGSL = `
@group(0) @binding(19) var<storage, read> burnState: array<vec4<f32>>;
fn burnAt(l: u32, uv: vec2<f32>) -> vec4<f32> {
  let LR = R.layers[l];
  let L = LR.lattice;
  let bundle = vec2<f32>(f32(bundleOf(LR, 1u)), f32(bundleOf(LR, 0u)));
  let st = clamp((uv - 0.5 * (bundle - 1.0)) / bundle, vec2<f32>(0.0), vec2<f32>(f32(L.y - 1u), f32(L.z - 1u)));
  let ij = min(vec2<u32>(st), L.yz - 2u);
  let n = L.x + ij.y * L.y + ij.x;
  let f = st - vec2<f32>(ij);
  return mix(mix(burnState[n], burnState[n + 1u], f.x), mix(burnState[n + L.y], burnState[n + L.y + 1u], f.x), f.y);
}
fn burnColour(colour: vec3<f32>, state: vec4<f32>) -> vec3<f32> {
  let charred = clamp(state.z, 0.0, 1.0);
  let brown = colour * vec3<f32>(0.45, 0.22, 0.10);
  let dark = mix(brown, vec3<f32>(0.003, 0.002, 0.0015), smoothstep(0.15, 0.75, charred));
  let emberRim = smoothstep(0.50, 0.72, state.y) * (1.0 - smoothstep(0.86, 0.98, state.y));
  let glow = smoothstep(800.0, 1250.0, state.x) * emberRim * (0.025 + 0.16 * state.w);
  return mix(colour, dark, smoothstep(0.0, 0.38, charred)) + vec3<f32>(2.5, 0.20, 0.012) * glow;
}
`;

// Procedural luminous plume ribbons, attached to actual reacting material.
// Buoyancy and the same world airflow bend them; physical time freezes on pause.
// This is a visual plume model, not a volumetric combustion-fluid solver.
export const flameWGSL = `
@group(0) @binding(0) var<uniform> F: FrameU;
@group(0) @binding(1) var<storage, read> flameX: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> flameHeat: array<vec4<f32>>;
${airflowWGSL}
${burnProfileWGSL}
struct FlameOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) strength: f32,
  @location(2) seed: f32,
};
fn flameHidden() -> FlameOut {
  var o: FlameOut;
  o.position = vec4<f32>(0.0, 0.0, -2.0, 1.0);
  return o;
}
fn fireNoise(p: vec2<f32>) -> f32 {
  let cell = vec2<i32>(floor(p));
  let s = fract(p);
  let f = s * s * (3.0 - 2.0 * s);
  let seed = bitcast<u32>(cell.x) * 7919u + bitcast<u32>(cell.y) * 104729u;
  let a = burnNoise(seed);
  let b = burnNoise(seed + 7919u);
  let c = burnNoise(seed + 104729u);
  let d = burnNoise(seed + 7919u + 104729u);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
fn plume(vi: u32, n: u32, smoke: bool) -> FlameOut {
  let state = flameHeat[n];
  if (state.w < 0.008 || flameX[n].w > 1.5 || burnNoise(n * 1699u + 53u) > 0.35) { return flameHidden(); }
  let q = flameX[n].xyz;
  let V = normalize(F.camPos.xyz - q);
  let air = airflowAt(q);
  let up = normalize(vec3<f32>(0.0, 0.0, 1.0) + 0.09 * air);
  let side = normalize(cross(up, V) + vec3<f32>(1e-6, 0.0, 0.0));
  let seed = burnNoise(n * 641u + 179u);
  let t = f32(vi / 2u) / 8.0;
  let x = select(-1.0, 1.0, (vi & 1u) != 0u);
  let time = F.params.y;
  let phase = time * 9.0 + seed * 31.0;
  let flux = clamp(state.w, 0.0, 1.0);
  let height = select(0.025 + 0.065 * sqrt(flux), 0.09 + 0.09 * flux, smoke) * (0.65 + 0.7 * seed);
  let width = select(0.004 + 0.006 * sqrt(flux), 0.014 + 0.035 * t, smoke);
  let taper = select(pow(1.0 - 0.85 * t, 0.65), 0.5 + t, smoke);
  let flicker = sin(phase - 9.0 * t) + 0.45 * sin(phase * 1.7 - 15.0 * t);
  let offset = side * (0.004 * t * flicker) + air * (0.012 * t * t);
  let W = q + up * (height * t) + side * (x * width * taper) + offset + V * 0.001;
  var o: FlameOut;
  o.position = F.viewProj * vec4<f32>(W, 1.0);
  o.uv = vec2<f32>(x, t);
  o.strength = flux;
  o.seed = seed;
  return o;
}
@vertex fn vsFlame(@builtin(vertex_index) vi: u32, @builtin(instance_index) n: u32) -> FlameOut { return plume(vi, n, false); }
@vertex fn vsSmoke(@builtin(vertex_index) vi: u32, @builtin(instance_index) n: u32) -> FlameOut { return plume(vi, n, true); }
@fragment fn fsFlame(in: FlameOut) -> @location(0) vec4<f32> {
  let time = F.params.y;
  let uv = in.uv;
  let p = vec2<f32>(uv.x * 3.0 + in.seed * 37.0, uv.y * 5.0 - time * 7.0);
  let noise = 0.65 * fireNoise(p) + 0.35 * fireNoise(p * 2.1 + 7.0);
  let body = 1.0 - uv.x * uv.x - uv.y * (0.6 + 0.65 * noise);
  let density = smoothstep(0.03, 0.42, body + (noise - 0.5) * 0.65);
  let fade = smoothstep(0.0, 0.07, uv.y) * (1.0 - smoothstep(0.68, 1.0, uv.y));
  let alpha = density * fade * min(0.18, 0.035 + 0.30 * in.strength);
  let core = pow(clamp(body, 0.0, 1.0), 2.0) * (1.0 - uv.y);
  let colour = mix(vec3<f32>(2.8, 0.22, 0.008), vec3<f32>(4.2, 1.45, 0.055), core);
  return vec4<f32>(colour * alpha, alpha);
}
@fragment fn fsSmoke(in: FlameOut) -> @location(0) vec4<f32> {
  let uv = in.uv;
  let p = vec2<f32>(uv.x * 2.8 + in.seed * 31.0, uv.y * 5.0 - F.params.y * 2.0);
  let noise = fireNoise(p) * fireNoise(p * 1.7 + 2.0);
  let edge = max(0.0, 1.0 - uv.x * uv.x);
  let alpha = 0.035 * in.strength * noise * edge * smoothstep(0.05, 0.25, uv.y) * (1.0 - uv.y);
  return vec4<f32>(vec3<f32>(0.055, 0.052, 0.05) * alpha, alpha);
}
`;

export function createFireView(device, renderer, fire) {
  const code = renderer.common + flameWGSL;
  const module = device.createShaderModule({ label: "fire plumes", code });
  const N = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: N, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      { binding: 11, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  const group = device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: { buffer: renderer.tailFrameU } },
      { binding: 1, resource: { buffer: fire.solver.x } },
      { binding: 2, resource: { buffer: fire.state } },
      { binding: 11, resource: { buffer: fire.wind } },
    ],
  });
  const pipelines = ["Smoke", "Flame"].map((name) =>
    device.createRenderPipeline({
      label: `fabric ${name.toLowerCase()}`,
      layout: pipelineLayout,
      vertex: { module, entryPoint: `vs${name}` },
      fragment: {
        module,
        entryPoint: `fs${name}`,
        targets: [
          {
            format: "rgba16float",
            blend: {
              color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-strip", cullMode: "none" },
      depthStencil: { format: "depth32float", depthWriteEnabled: false, depthCompare: "less-equal" },
      multisample: { count: 4 },
    }),
  );
  return {
    draw(pass) {
      if (!fire.enabled) return;
      pass.setBindGroup(0, group);
      for (const pipe of pipelines) {
        pass.setPipeline(pipe);
        pass.draw(18, fire.solver.N);
      }
    },
  };
}

// GPU thermal state lives beside the solver. It only runs after actual ignition;
// its commit precedes yarn-field coupling, so heat loss removes real yarns.
export class FabricFire {
  constructor(device, solver, common, Compute) {
    this.device = device;
    this.solver = solver;
    this.enabled = false;
    this.generation = 0;
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    const make = (label, size, usage = storage) => device.createBuffer({ label, size, usage });
    this.state = make("fabric heat", solver.N * 16);
    this.next = make("next fabric heat", solver.N * 16);
    this.count = make("burn activity", 16);
    this.uniform = make("burn controls", 96, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.wind = make("burn airflow", 160, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.data = new ArrayBuffer(96);
    this.floats = new Float32Array(this.data);
    this.uints = new Uint32Array(this.data);
    solver.scene.layers.forEach((layer, i) => (this.uints[4 + i] = layer.weave.id));
    this.compute = new Compute(device, "fabric combustion", common + burnComputeWGSL);
    this.pipes = Object.fromEntries(
      ["burnClear", "burnStep", "burnCommit", "burnWeave"].map((name) => [name, this.compute.pipeline(name)]),
    );
    this.group = this.compute.bindGroup("burn", {
      0: solver.simParams,
      1: solver.fieldU,
      2: solver.nodes,
      3: solver.x,
      4: this.state,
      5: this.next,
      6: solver.field,
      7: solver.fieldEvents,
      8: this.count,
      10: this.uniform,
      11: this.wind,
    });
    this.reset();
  }
  reset() {
    this.generation++;
    const init = new Float32Array(this.solver.N * 4);
    for (let i = 0; i < this.solver.N; i++) init[4 * i] = 293;
    this.device.queue.writeBuffer(this.state, 0, init);
    this.device.queue.writeBuffer(this.next, 0, init);
    this.device.queue.writeBuffer(this.count, 0, new Uint32Array(4));
    this.floats.fill(0, 8);
    this.device.queue.writeBuffer(this.uniform, 0, this.data);
    this.enabled = false;
  }
  step(dt, time, sources, wind) {
    this.floats[0] = dt;
    this.floats[1] = time;
    this.floats.fill(0, 8);
    sources.slice(0, 4).forEach((source, i) => this.floats.set([source.node + 1, 0.016, 1, 0], 8 + 4 * i));
    if (sources.length && !this.enabled) {
      this.generation++;
      this.enabled = true;
    }
    this.device.queue.writeBuffer(this.uniform, 0, this.data);
    this.device.queue.writeBuffer(this.wind, 0, wind);
  }
  clearSources() {
    this.floats.fill(0, 8);
    this.device.queue.writeBuffer(this.uniform, 0, this.data);
  }
  encode(pass) {
    if (!this.enabled) return;
    pass.setBindGroup(0, this.group);
    for (const [name, size] of [
      ["burnClear", 1],
      ["burnStep", Math.ceil(this.solver.N / 128)],
      ["burnCommit", Math.ceil(this.solver.N / 128)],
      ["burnWeave", Math.ceil(this.solver.scene.fieldDamage.length / 2 / 128)],
    ]) {
      pass.setPipeline(this.pipes[name]);
      pass.dispatchWorkgroups(size);
    }
  }
}
