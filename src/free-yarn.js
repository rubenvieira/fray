// Detached yarns use the same bounded material cache as held tails. Their
// reconstructed particles carry no forces back into the coarser cloth lattice.
export const freeYarnWGSL = `
// Constant-air drag and gravity without subtracting large terminal velocities.
// The series keeps tiny drag steps and zero-time handoffs accurate in f32.
fn freeFlight(v: vec3<f32>, air: vec3<f32>, drag: f32, dt: f32) -> array<vec3<f32>, 2> {
  let x = drag * dt;
  var first = dt * (1.0 - x * (0.5 - x * (1.0 / 6.0 - x * (1.0 / 24.0 - x / 120.0))));
  var second = dt * dt * (0.5 - x * (1.0 / 6.0 - x * (1.0 / 24.0 - x * (1.0 / 120.0 - x / 720.0))));
  if (x >= 0.05) {
    first = (1.0 - exp(-x)) / drag;
    second = (dt - first) / drag;
  }
  let acceleration = drag * (air - v) + vec3<f32>(0.0, 0.0, -GRAVITY);
  return array<vec3<f32>, 2>(v * dt + acceleration * second, v + acceleration * first);
}

fn freeYarnSolve(ri: RunInfo, q: vec3<f32>, dir0: vec3<f32>, root: u32, k: u32, len: f32) {
  let frame = u32(TF.params.w) + 1u;
  let slot = tailSlot(tailIdentity(ri), frame);
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
  var handedOff = false;
  if (!remembered) {
    let base = (ri.yarn << 5u) | (ri.layer << 2u) | (ri.fam << 1u);
    for (var side = 0u; side < 2u; side++) {
      let fromA = side == 1u;
      let cut = bitcast<u32>(i32(select(ri.pos - 1.0, ri.pos + ri.n, fromA)));
      let source = releasedTailSlot(vec2<u32>(base | side, cut), frame);
      if (source < 0) { continue; }
      let s = u32(source);
      let prior = tailMemory[s].root;
      let oldLength = tailMemory[s].shape.w;
      let elapsed = TF.params.y - prior.w;
      if (prior.w >= 0.0 && elapsed >= 0.0 && elapsed <= 0.12 && oldLength > 1e-7 && oldLength <= 1.02 * len) {
        let growth = len - oldLength;
        let exit = normalize(tailMemory[s].p[1].xyz - tailMemory[s].p[0].xyz + vec3<f32>(1e-12, 0.0, 0.0));
        for (var i = 0u; i <= TAIL_SEGS; i++) {
          // Free rods run B -> A. Reverse an A-held rod's samples without
          // reversing its physical velocity. Any last released material is
          // inserted behind the old root, keeping the cut end continuous.
          let arc = select(f32(i) * h - growth, oldLength - f32(i) * h, fromA);
          if (arc < 0.0) {
            old[i] = tailMemory[s].p[0].xyz + exit * arc;
            velocity[i] = tailMemory[s].v[0].xyz;
          } else {
            let u = clamp(arc * f32(TAIL_SEGS) / oldLength, 0.0, f32(TAIL_SEGS));
            let j = min(u32(floor(u)), TAIL_SEGS - 1u);
            old[i] = mix(tailMemory[s].p[j].xyz, tailMemory[s].p[j + 1u].xyz, u - f32(j));
            velocity[i] = mix(tailMemory[s].v[j].xyz, tailMemory[s].v[j + 1u].xyz, u - f32(j));
          }
        }
        dt = elapsed;
        remembered = true;
        handedOff = true;
      }
      unlockReleasedTail(s);
      if (handedOff) { break; }
    }
  }
  for (var i = 0u; i <= TAIL_SEGS; i++) {
    if (!handedOff) { old[i] = q + dir0 * (f32(i) * h); }
    var v = x[R.counts.x + root].xyz;
    if (handedOff) { v = velocity[i]; }
    else if (remembered) { old[i] = tailMemory[slot].p[i].xyz; v = tailMemory[slot].v[i].xyz; }
    var position = old[i];
    if (remembered && dt > 0.0) {
      let air = airflowAt(position);
      let drag = 1.225 * profile.fibre.w * radius * length(air - v) / max(mass, 1e-12);
      let flight = freeFlight(v, air, drag, dt);
      position += flight[0];
      v = flight[1];
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
