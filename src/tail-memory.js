// A bounded cache of reconstructed free rods. Identity is the material yarn and
// cut end, never the transient run-list index or a retreating held crossing.
export const TAIL_HISTORY_SLOTS = 16384;
export const TAIL_HISTORY_BYTES = 592 * TAIL_HISTORY_SLOTS;
export const tailMemoryWGSL = `
const TAIL_HISTORY: u32 = ${TAIL_HISTORY_SLOTS}u;
const TAIL_LOCK: u32 = 0x80000000u;
struct TailMemory {
  claim: atomic<u32>,
  stamp: atomic<u32>,
  identity: vec2<u32>,
  // Last root and physical time; last exit direction and free length.
  root: vec4<f32>,
  shape: vec4<f32>,
  p: array<vec4<f32>, TAIL_SEGS_1>,
  v: array<vec4<f32>, TAIL_SEGS_1>,
};
@group(0) @binding(10) var<storage, read_write> tailMemory: array<TailMemory>;
@group(0) @binding(12) var<uniform> TF: FrameU;

fn tailIdentity(ri: RunInfo) -> vec2<u32> {
  let cut = bitcast<u32>(i32(select(ri.pos - 1.0, ri.pos + ri.n, ri.heldA)));
  let freeMode = u32(!ri.heldA && !ri.heldB) << 4u;
  return vec2<u32>((ri.yarn << 5u) | freeMode | (ri.layer << 2u) | (ri.fam << 1u) | u32(ri.heldA), cut);
}

fn tailSlot(id: vec2<u32>, frame: u32) -> i32 {
  let hash = hash11(id.x ^ hash11(id.y));
  let tag = (hash & 0x7FFFFFFEu) | 1u;
  for (var probe = 0u; probe < 16u; probe++) {
    let slot = (hash + probe) & (TAIL_HISTORY - 1u);
    let key = atomicLoad(&tailMemory[slot].claim);
    let stamp = atomicLoad(&tailMemory[slot].stamp);
    if (key == tag) {
      // Lock before inspecting identity: another invocation may be reclaiming
      // a stale slot. Equal hash tags still require the complete identity.
      let held = atomicCompareExchangeWeak(&tailMemory[slot].claim, key, TAIL_LOCK);
      if (!held.exchanged) { return -1; }
      if (all(tailMemory[slot].identity == id)) {
        let duplicate = atomicLoad(&tailMemory[slot].stamp) == frame;
        atomicStore(&tailMemory[slot].stamp, frame);
        atomicStore(&tailMemory[slot].claim, tag);
        if (duplicate) { return -1; }
        return i32(slot);
      }
      atomicStore(&tailMemory[slot].claim, tag);
    }
    // Keep last frame's rods even when the current append order changes.
    // Old generations can be reclaimed; a full probe falls back to equilibrium.
    if (key != TAIL_LOCK && (key == 0u || stamp + 2u < frame)) {
      let claimed = atomicCompareExchangeWeak(&tailMemory[slot].claim, key, TAIL_LOCK);
      if (claimed.exchanged) {
        tailMemory[slot].identity = id;
        tailMemory[slot].root = vec4<f32>(0.0, 0.0, 0.0, -1.0);
        tailMemory[slot].shape = vec4<f32>(0.0);
        atomicStore(&tailMemory[slot].stamp, frame);
        atomicStore(&tailMemory[slot].claim, tag);
        return i32(slot);
      }
    }
  }
  return -1;
}

// Exact response of a damped bending mode about its current equilibrium.
// Handles under/critical/over damping without timestep-dependent energy gain.
fn rodResponse(d: vec3<f32>, v: vec3<f32>, omega: f32, damping: f32, dt: f32) -> array<vec3<f32>, 2> {
  let zeta = damping / (2.0 * omega);
  if (zeta < 0.999) {
    let wd = omega * sqrt(1.0 - zeta * zeta);
    let decay = zeta * omega * dt;
    if (decay > 20.0) { return array<vec3<f32>, 2>(vec3<f32>(0.0), vec3<f32>(0.0)); }
    let e = exp(-decay);
    let phase = wd * dt;
    let wrapped = phase - 6.28318530718 * round(phase / 6.28318530718);
    let c = cos(wrapped);
    let s = sin(wrapped) / wd;
    return array<vec3<f32>, 2>(e * (d * (c + zeta * omega * s) + v * s), e * (v * (c - zeta * omega * s) - d * (omega * omega * s)));
  }
  if (zeta <= 1.001) {
    let e = exp(-omega * dt);
    let b = v + omega * d;
    return array<vec3<f32>, 2>(e * (d + b * dt), e * (v - omega * b * dt));
  }
  let sum = zeta + sqrt(zeta * zeta - 1.0);
  let a = -omega / sum;
  let b = -omega * sum;
  let ca = (v - b * d) / (a - b);
  let cb = d - ca;
  return array<vec3<f32>, 2>(ca * exp(a * dt) + cb * exp(b * dt), a * ca * exp(a * dt) + b * cb * exp(b * dt));
}
`;
