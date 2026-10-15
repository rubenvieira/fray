// Additional woven materials. These are qualitative fits for this interactive
// solver, not measured textile samples. IDs are shared by surface, loose-yarn,
// fringe and thermal rendering so a thread keeps its identity when it frays.
export const ADDITIONAL_MATERIALS = [
  {
    key: "madras",
    id: 9,
    name: "Madras",
    note: "Colorful cotton · soft, uneven frays",
    fray: {
      name: "madras",
      shape: [0.0021, 0.001, 0.32, 0.9],
      amount: [0.58, 6, 0.3, 0.8],
      fibre: [15e-6, 0.9, 0.012, 1.2],
    },
    burn: [555, 0.72, 0.75, 1800],
  },
  {
    key: "shot",
    id: 10,
    name: "Shot silk",
    note: "Teal warp, magenta weft · color in every fold",
    fray: {
      name: "shot",
      shape: [0.0012, 0.0004, 0.16, 0.15],
      amount: [0.22, 0.6, 0.04, 0.45],
      fibre: [9e-6, 0.5, 0.023, 1.1],
    },
    burn: [630, 0.5, 0.8, 1650],
  },
  {
    key: "ripstop",
    id: 11,
    name: "Ripstop",
    note: "Lime nylon · a stronger grid catches the tear",
    fray: {
      name: "ripstop",
      shape: [0.0009, 0.0003, 0.15, 0.1],
      amount: [0.2, 0.4, 0.04, 1.1],
      fibre: [12e-6, 0.8, 0.02, 1.1],
    },
    burn: [730, 0.4, 0.5, 1600],
  },
];

export function additionalPresets(base) {
  const madras = structuredClone(base.linen);
  Object.assign(madras, { seed: 10010, wearStrengthLoss: [0.3, 0.4] });
  Object.assign(madras.material, { id: 9, name: "madras-cotton-plain", shearStiffness: 24, crossingFriction: 0.3 });
  for (const y of madras.material.yarns) {
    y.linearDensity *= 0.58;
    y.eaLow *= 0.65;
    y.eaHigh *= 0.55;
    y.strength *= 0.48;
    y.bendRigidity *= 0.35;
    y.crimpStrain = 0.055;
    y.width *= 0.85;
    y.height *= 0.7;
  }
  const shot = structuredClone(base.satin);
  Object.assign(shot, { seed: 11011 });
  Object.assign(shot.material, {
    id: 10,
    name: "shot-silk-plain",
    twillRepeat: 2,
    twillWarpOver: 1,
    shearStiffness: 22,
    crossingFriction: 0.22,
  });
  for (const y of shot.material.yarns) {
    y.linearDensity *= 0.8;
    y.bendRigidity *= 0.7;
    y.strength *= 0.85;
    y.crimpStrain *= 1.2;
  }
  const ripstop = structuredClone(base.ballistic);
  Object.assign(ripstop, { seed: 12012, reinforcement: { period: 16, width: 2, strength: 3.2 } });
  Object.assign(ripstop.material, { id: 11, name: "ripstop-nylon-plain", shearStiffness: 28, thickness: 0.00035 });
  for (const y of ripstop.material.yarns) {
    y.linearDensity *= 0.5;
    y.eaLow *= 0.5;
    y.eaHigh *= 0.5;
    y.strength *= 0.2;
    y.bendRigidity *= 0.3;
    y.width *= 0.85;
    y.height *= 0.65;
  }
  return { madras, shot, ripstop };
}

// The same fine-yarn grid used by the renderer raises the actual rupture
// threshold. Knife cuts still cut it; it is reinforcement, not an unbreakable
// painted line. Stiffness/mass remain the fitted nylon substrate values.
export function reinforcementStrength(preset, yarn) {
  const r = preset.reinforcement;
  return r && ((yarn % r.period) + r.period) % r.period < r.width ? r.strength : 1;
}

export const materialColourWGSL = `
fn madrasYarn(yarn: i32, fam: u32) -> vec3<f32> {
  let p = ((yarn + i32(fam) * 11) % 72 + 72) % 72;
  if (p < 16) { return vec3<f32>(0.02, 0.48, 0.55); }
  if (p < 19) { return vec3<f32>(0.85, 0.72, 0.38); }
  if (p < 30) { return vec3<f32>(0.75, 0.13, 0.025); }
  if (p < 33) { return vec3<f32>(0.8, 0.75, 0.65); }
  if (p < 48) { return vec3<f32>(0.48, 0.025, 0.32); }
  if (p < 51) { return vec3<f32>(0.04, 0.035, 0.1); }
  if (p < 65) { return vec3<f32>(0.12, 0.42, 0.15); }
  return vec3<f32>(0.8, 0.68, 0.15);
}
fn additionalYarnColour(material: u32, fam: u32, yarn: i32) -> vec3<f32> {
  if (material == 9u) { return madrasYarn(yarn, fam); }
  if (material == 10u) { return select(vec3<f32>(0.53, 0.025, 0.3), vec3<f32>(0.02, 0.5, 0.42), fam == 1u); }
  let grid = ((yarn % 16) + 16) % 16 < 2;
  return select(vec3<f32>(0.085, 0.38, 0.045), vec3<f32>(0.6, 0.78, 0.16), grid);
}
`;
