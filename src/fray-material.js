import { ADDITIONAL_MATERIALS } from "./material-library.js";
// Appearance/reconstruction fits, not changes to the load-bearing yarn laws.
// Staple wool/jute keep uneven brushes; silk and nylon keep finer filaments.
// Lengths are metres; EI and linear mass scale the existing cotton-fibre model.
export const FRAY_MATERIALS = [
  { name: "denim", shape: [0.0015, 0.0009, 0.35, 1], amount: [0.55, 10, 1, 1], fibre: [16e-6, 1, 0.01, 1.2] },
  { name: "burlap", shape: [0.0032, 0.0016, 0.22, 0.55], amount: [0.7, 5, 0.65, 5], fibre: [24e-6, 2.2, 0.018, 1.3] },
  { name: "tartan", shape: [0.0022, 0.0011, 0.4, 1.8], amount: [0.48, 5, 0.045, 1.8], fibre: [20e-6, 1.4, 0.018, 1.2] },
  {
    name: "satin",
    shape: [0.0011, 0.00045, 0.14, 0.18],
    amount: [0.2, 0.5, 0.04, 0.55],
    fibre: [10e-6, 0.55, 0.025, 1.1],
  },
  { name: "linen", shape: [0.002, 0.001, 0.2, 0.5], amount: [0.45, 3, 0.55, 3], fibre: [18e-6, 1.2, 0.018, 1.2] },
  {
    name: "chiffon",
    shape: [0.00065, 0.00025, 0.18, 0.2],
    amount: [0.18, 0.3, 0.12, 0.32],
    fibre: [8e-6, 0.35, 0.022, 1.1],
  },
  { name: "gauze", shape: [0.0025, 0.0012, 0.3, 1], amount: [0.6, 5, 0.8, 0.7], fibre: [16e-6, 1, 0.012, 1.2] },
  {
    name: "lame",
    shape: [0.0015, 0.0003, 0.1, 0.05],
    amount: [0.15, 0.2, 0.08, 2.8],
    fibre: [12e-6, 0.85, 0.035, 1.2],
  },
  {
    name: "ballistic",
    shape: [0.0007, 0.00025, 0.12, 0.08],
    amount: [0.15, 0.25, 0.025, 4],
    fibre: [14e-6, 1.1, 0.025, 1.1],
  },
  ...ADDITIONAL_MATERIALS.map((m) => m.fray),
];

const vector = (values) => `vec4<f32>(${values.map((n) => (Number.isInteger(n) ? `${n}.0` : String(n))).join(", ")})`;
export const frayMaterialWGSL = `
struct FrayProfile {
  // protrusion length, rim hair length, fan angle tangent, crimp scale
  shape: vec4<f32>,
  // protruding fraction, rim hair density, exposed-core blend, bending EI scale
  amount: vec4<f32>,
  // fibre diameter, linear mass scale, relaxed curl radius, cylinder drag coefficient
  fibre: vec4<f32>,
};
fn frayProfile(material: u32) -> FrayProfile {
  switch material {
    ${FRAY_MATERIALS.map((p, i) => `case ${i}u: { return FrayProfile(${vector(p.shape)}, ${vector(p.amount)}, ${vector(p.fibre)}); }`).join("\n    ")}
    default: { return FrayProfile(${vector(FRAY_MATERIALS[0].shape)}, ${vector(FRAY_MATERIALS[0].amount)}, ${vector(FRAY_MATERIALS[0].fibre)}); }
  }
}
// A crossing at a cloth rim is not necessarily a yarn end: the same yarn
// may continue as a loose strand. Never add a second stub at that root.
fn severedEdgeEnd(here: u32, there: u32, hasNext: bool) -> bool {
  return here < 254u && (!hasNext || there >= 254u);
}

// Arc of a parabolic bridge with endpoint distance d and midpoint bow a.
fn bridgeArc(d: f32, a: f32) -> f32 {
  let ratio = 4.0 * a / max(d, 1e-9);
  if (ratio < 1e-3) { return d * (1.0 + ratio * ratio / 6.0); }
  let root = sqrt(1.0 + ratio * ratio);
  return 0.5 * d * (root + log(ratio + root) / ratio);
}
fn bridgeSagAmount(distance: f32, rest: f32) -> f32 {
  if (rest <= distance) { return 0.0; }
  var lo = 0.0;
  var hi = 0.5 * rest;
  for (var i = 0u; i < 10u; i++) {
    let mid = 0.5 * (lo + hi);
    if (bridgeArc(distance, mid) > rest) { hi = mid; } else { lo = mid; }
  }
  return lo;
}
`;
