// Detached yarns use the same bounded material cache as held tails. Their
// reconstructed particles carry no forces back into the coarser cloth lattice.
export const freeYarnWGSL = `
fn freeYarnSolve(ri: RunInfo, q: vec3<f32>, dir0: vec3<f32>, root: u32, k: u32, len: f32) {
  let slot = tailSlot(tailIdentity(ri), u32(TF.params.w) + 1u);
  if (slot < 0) { atomicAdd(&tailCount[1], 1u); }
  let LR = R.layers[ri.layer];
  let profile = frayProfile(LR.refine.w);
  let mass = select(LR.loose.z, LR.loose.w, ri.fam == 1u) * FIBRE_LIN;
  let radius = select(LR.loose.x, LR.loose.y, ri.fam == 1u);
  let h = len / f32(TAIL_SEGS);
  var dt = 0.0;
  var remembered = false;
  if (slot >= 0) {
    let prev = tailMemory[slot].root;
    dt = TF.params.y - prev.w;
    remembered = prev.w >= 0.0 && dt >= 0.0 && dt <= 0.12 && abs(tailMemory[slot].shape.w - len) < 0.02 * len;
    if (remembered && dt <= 1e-7) {
      for (var i = 0u; i <= TAIL_SEGS; i++) { tails[k * TAIL_SEGS_1 + i] = tailMemory[slot].p[i]; }
      return;
    }
  }
  var old: array<vec3<f32>, TAIL_SEGS_1>;
  var point: array<vec3<f32>, TAIL_SEGS_1>;
  var velocity: array<vec3<f32>, TAIL_SEGS_1>;
  for (var i = 0u; i <= TAIL_SEGS; i++) {
    old[i] = q + dir0 * (f32(i) * h);
    var v = x[R.counts.x + root].xyz;
    if (remembered) { old[i] = tailMemory[slot].p[i].xyz; v = tailMemory[slot].v[i].xyz; }
    var position = old[i];
    if (remembered) {
      let air = airflowAt(position);
      let drag = 1.225 * profile.fibre.w * radius * length(air - v) / max(mass, 1e-12);
      // Exact constant-air drag/gravity step; stable even in a strong fan.
      if (drag > 1e-5) {
        let terminal = air + vec3<f32>(0.0, 0.0, -GRAVITY) / drag;
        let decay = exp(-drag * dt);
        position += terminal * dt + (v - terminal) * ((1.0 - decay) / drag);
        v = terminal + (v - terminal) * decay;
      } else {
        position += v * dt + vec3<f32>(0.0, 0.0, -0.5 * GRAVITY * dt * dt);
        v += vec3<f32>(0.0, 0.0, -GRAVITY * dt);
      }
    }
    if (remembered && R.floor.y > 0.5 && old[i].z <= R.floor.x + radius + 1e-6) {
      let speed = length(v.xy);
      let friction = min(speed, 0.45 * GRAVITY * dt);
      if (speed > 1e-9) { v = vec3<f32>(v.xy * (1.0 - friction / speed), max(0.0, v.z)); }
      position = vec3<f32>(old[i].xy + v.xy * dt, max(position.z, R.floor.x + radius));
    }
    point[i] = position;
    velocity[i] = v;
  }
  // Equal-mass length projections preserve the centre of mass; neither end
  // remains clamped after the final crossing lets go.
  for (var iteration = 0u; iteration < 12u; iteration++) {
    for (var j = 0u; j < TAIL_SEGS; j++) {
      let i = select(j, TAIL_SEGS - 1u - j, (iteration & 1u) != 0u);
      let delta = point[i + 1u] - point[i];
      let distance = length(delta);
      if (distance > 1e-10) {
        let correction = 0.5 * delta * (1.0 - h / distance);
        point[i] += correction;
        point[i + 1u] -= correction;
      }
    }
    if (R.floor.y > 0.5) { for (var i = 0u; i <= TAIL_SEGS; i++) { point[i].z = max(point[i].z, R.floor.x + radius); } }
  }
  // Finish with exact segment lengths, then restore the centre of mass. The
  // unanchored chain can translate as a whole, unlike a tail clamped at a root.
  var centre = vec3<f32>(0.0);
  for (var i = 0u; i <= TAIL_SEGS; i++) { centre += point[i]; }
  for (var i = 0u; i < TAIL_SEGS; i++) {
    let delta = point[i + 1u] - point[i];
    point[i + 1u] = point[i] + normalize(delta + vec3<f32>(1e-12, 0.0, 0.0)) * h;
  }
  var after = vec3<f32>(0.0);
  for (var i = 0u; i <= TAIL_SEGS; i++) { after += point[i]; }
  let shift = (centre - after) / f32(TAIL_SEGS_1);
  var lowest = 1e9;
  for (var i = 0u; i <= TAIL_SEGS; i++) { point[i] += shift; lowest = min(lowest, point[i].z); }
  if (R.floor.y > 0.5) {
    let lift = max(0.0, R.floor.x + radius - lowest);
    for (var i = 0u; i <= TAIL_SEGS; i++) { point[i].z += lift; }
  }
  if (FACE_HASH) { gatherFaces(point[0], len + radius + TAIL_CLEAR + 3e-3); }
  for (var i = 0u; i <= TAIL_SEGS; i++) {
    if (FACE_HASH) {
      let contact = tailContact(old[i], point[i], radius + TAIL_CLEAR, root, false);
      if (contact.hit) { point[i] = contact.p; }
    }
    if (remembered && dt > 1e-7) { velocity[i] = (point[i] - old[i]) / dt; }
  }
  // Project the velocity constraints too. Equal and opposite impulses preserve
  // momentum and remove stretch energy introduced by finite position steps.
  for (var iteration = 0u; iteration < 8u; iteration++) {
    for (var i = 0u; i < TAIL_SEGS; i++) {
      let tangent = normalize(point[i + 1u] - point[i] + vec3<f32>(1e-12, 0.0, 0.0));
      let impulse = 0.5 * tangent * dot(velocity[i + 1u] - velocity[i], tangent);
      velocity[i] += impulse;
      velocity[i + 1u] -= impulse;
    }
  }
  for (var i = 0u; i <= TAIL_SEGS; i++) {
    if (R.floor.y > 0.5 && point[i].z <= R.floor.x + radius + 1e-6) { velocity[i].z = max(0.0, velocity[i].z); }
    tails[k * TAIL_SEGS_1 + i] = vec4<f32>(point[i], 0.0);
    atomicMax(&tailCount[2], u32(ceil(length(velocity[i]) * 1000.0)));
    if (slot >= 0) {
      tailMemory[slot].p[i] = vec4<f32>(point[i], 0.0);
      tailMemory[slot].v[i] = vec4<f32>(velocity[i], 0.0);
    }
  }
  if (slot >= 0) {
    tailMemory[slot].root = vec4<f32>(point[0], TF.params.y);
    tailMemory[slot].shape = vec4<f32>(dir0, len);
  }
}
`;
