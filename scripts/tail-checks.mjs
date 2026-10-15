// Actual production rod/history dispatches on WebGPU, isolated from the scene.
export async function checkTails({ code, responseCode, coloursCode, memoryBytes }) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: 10 } });
  const errors = [];
  device.addEventListener("uncapturederror", (e) => errors.push(e.error.message));
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const make = (size, uniform = false) =>
    device.createBuffer({
      size,
      usage:
        GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | (uniform ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE),
    });
  const buffers = [
    make(464, true),
    make(32), // one position, then its actual solver velocity
    make(32),
    make(16),
    make(320),
    make(544),
    make(16),
    make(16),
    make(16),
    make(32),
    make(memoryBytes),
    make(160, true),
    make(512, true),
  ];
  async function pipeline(label, code, entryPoint) {
    const m = device.createShaderModule({ code, label });
    const info = await m.getCompilationInfo();
    assert(
      !info.messages.some((x) => x.type === "error"),
      `${label}: ${info.messages.map((m) => m.message).join("\n")}`,
    );
    return device.createComputePipelineAsync({ layout: "auto", compute: { module: m, entryPoint } });
  }
  const pipe = await pipeline("production free rods", code, "threadTail");
  const group = device.createBindGroup({
    layout: pipe.getBindGroupLayout(0),
    entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
  });
  async function read(buffer, bytes = buffer.size) {
    const rb = device.createBuffer({ size: bytes, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const e = device.createCommandEncoder();
    e.copyBufferToBuffer(buffer, 0, rb, 0, bytes);
    device.queue.submit([e.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const result = new Uint8Array(rb.getMappedRange()).slice();
    rb.unmap();
    rb.destroy();
    return result;
  }
  const render = new ArrayBuffer(464),
    ru = new Uint32Array(render),
    rf = new Float32Array(render);
  ru.set([1, 1, 0, 0]);
  ru.set([0, 1, 1, 257], 4);
  rf.set([0.001, 0.001, 1, 0], 8);
  rf.set([0.00015, 0.00015, 500, 500], 36);
  const hash = (x) => {
    let v = x >>> 0;
    v ^= v >>> 16;
    v = Math.imul(v, 0x7feb352d);
    v ^= v >>> 15;
    v = Math.imul(v, 0x846ca68b);
    v ^= v >>> 16;
    return v >>> 0;
  };
  const slotFor = (yarn) => hash(((yarn << 5) | 1) ^ hash(70)) & 16383;
  let collidingYarn = -1;
  for (let yarn = 0; yarn < 65536; yarn++)
    if (yarn !== 10 && slotFor(yarn) === slotFor(10)) {
      collidingYarn = yarn;
      break;
    }
  assert(collidingYarn >= 0, "fixture contains a real cache-bucket collision");
  // Same two yarns can change append order while retaining their own history.
  const rods = [
    { yarn: 10, q: [0, 0, 0], len: 0.03 },
    { yarn: collidingYarn, label: 23, q: [0.09, 0, 0.02], len: 0.022 },
  ];
  let time = 0,
    frame = 0;
  const states = [];
  async function step({ dt = 1 / 30, reverse = false, wind = 0, material = 2, velocity = [0, 0, 0] } = {}) {
    time += dt;
    const ordered = reverse ? [...rods].reverse() : rods;
    const records = new Uint32Array(8),
      geo = new Float32Array(80);
    ordered.forEach((r, i) => {
      records.set([r.detached ? 160 : r.heldB ? 32 : 128, ((r.pos ?? 40) << 16) | r.yarn, r.n ?? 30, 0], 4 * i);
      geo.set([0, 39, -1, r.len], 40 * i);
      geo.set([...r.q, 0], 40 * i + 28);
      geo.set([r.heldB ? -1 : 1, 0, 0, 0], 40 * i + 32);
    });
    ru[27] = material;
    device.queue.writeBuffer(buffers[0], 0, render);
    device.queue.writeBuffer(buffers[1], 0, new Float32Array([0, 0, 0, 0, ...velocity, 0]));
    device.queue.writeBuffer(buffers[2], 0, records);
    device.queue.writeBuffer(buffers[3], 0, new Uint32Array([2, 0, 0, 0]));
    device.queue.writeBuffer(buffers[4], 0, geo);
    const f = new Float32Array(128);
    f.set([1, time, 1, frame++], 52);
    device.queue.writeBuffer(buffers[12], 0, f);
    const w = new Float32Array(40);
    w.set([0, 1, 0, wind, time, 0.25, 0.09, 8]);
    device.queue.writeBuffer(buffers[11], 0, w);
    const encoder = device.createCommandEncoder();
    encoder.clearBuffer(buffers[6]);
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipe);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(1);
    pass.end();
    device.queue.submit([encoder.finish()]);
    const geometry = new Float32Array((await read(buffers[4])).buffer);
    const points = new Float32Array((await read(buffers[5])).buffer);
    const byYarn = {};
    ordered.forEach((rod, i) => {
      const slot = geometry[40 * i + 2];
      assert(slot >= 0, "tail slot exists");
      const p = points.slice(slot * 68, slot * 68 + 68);
      byYarn[rod.label ?? rod.yarn] = Array.from(p);
      assert(p.every(Number.isFinite), "finite rod points");
      assert(rod.detached || rod.q.every((q, k) => Math.abs(p[k] - q) < 1e-7), "exactly attached root");
      for (let j = 1; j <= 16; j++) {
        const length = Math.hypot(...[0, 1, 2].map((k) => p[4 * j + k] - p[4 * (j - 1) + k]));
        assert(
          Math.abs(length - rod.len / 16) < (rod.detached ? 3e-6 : 2e-7),
          "free rods conserve segment length: " +
            JSON.stringify({ frame, yarn: rod.yarn, j, length, expected: rod.len / 16, detached: rod.detached }),
        );
      }
    });
    assert(errors.length === 0, errors.join("\n"));
    return byYarn;
  }
  try {
    const born = await step({ dt: 0 });
    assert(Math.abs(born[10][16 * 4 + 2]) < 1e-8, "a newly freed yarn starts along its exit");
    for (let i = 0; i < 90; i++) states.push(await step({ reverse: i % 2 === 0 }));
    const calm = states.at(-1);
    assert(
      calm[10][66] < -0.001,
      "gravity bends the tail: " +
        JSON.stringify({
          tip: calm[10].slice(64, 67),
          first: states[0][10].slice(64, 67),
          mid: states[44][10].slice(64, 67),
        }),
    );
    const frozen = await step({ dt: 0, reverse: true });
    assert(JSON.stringify(calm) === JSON.stringify(frozen), "pause/camera frames cannot advance tail physics");
    for (let i = 0; i < 60; i++) states.push(await step({ wind: 8, reverse: i % 2 === 0 }));
    const blown = states.at(-1);
    assert(blown[10][65] > calm[10][65] + 0.003, "actual shared airflow deflects free yarns");
    for (let i = 0; i < 90; i++) states.push(await step());
    const released = states.at(-1);
    assert(
      Math.abs(released[10][65] - calm[10][65]) < Math.abs(blown[10][65] - calm[10][65]),
      "wind release returns toward rest",
    );
    // Fifty percent more yarn comes free at a retreating held crossing. The
    // cut end is unchanged, so its bent material must not restart as a line.
    Object.assign(rods[0], { pos: 25, n: 45, len: 0.045, q: [-0.015, 0, 0] });
    const grown = await step({ dt: 1e-5, reverse: true });
    assert(
      grown[10][66] < released[10][66] * 0.4,
      "growing fray retains its hanging bend: " +
        JSON.stringify({ before: released[10].slice(64, 67), after: grown[10].slice(64, 67) }),
    );
    const growthCounts = new Uint32Array((await read(buffers[6])).buffer);
    assert(
      growthCounts[1] === 0 && growthCounts[3] === 0,
      "releasing crossings reuses history without a cache fallback or newborn reset",
    );
    for (let i = 0; i < 60; i++) await step({ reverse: i % 2 === 0 });
    const settledGrowth = await step({ dt: 0 });
    assert(settledGrowth[10][66] < -0.002, "released material continues bending and settling at its new free length");
    Object.assign(rods[0], { pos: 40, n: 30, len: 0.03, q: [0, 0, 0] });
    // Reset clears the complete cache; the same yarn id starts cleanly again.
    const clear = device.createCommandEncoder();
    clear.clearBuffer(buffers[10]);
    device.queue.submit([clear.finish()]);
    const reset = await step({ dt: 0 });
    assert(JSON.stringify(reset) === JSON.stringify(born), "reset cannot inherit a previous torn sheet's motion");
    // The other held side must preserve the same material continuity, too.
    rods[0].heldB = true;
    for (let i = 0; i < 90; i++) await step();
    const beforeReverseGrowth = await step({ dt: 0 });
    Object.assign(rods[0], { n: 45, len: 0.045, q: [0.015, 0, 0] });
    const reverseGrowth = await step({ dt: 1e-5 });
    assert(reverseGrowth[10][66] < beforeReverseGrowth[10][66] * 0.4, "growth preserves history at either held side");
    // Release momentum comes from the mechanical lattice, including on the
    // first frame when no positional history exists yet.
    const clearAgain = device.createCommandEncoder();
    clearAgain.clearBuffer(buffers[10]);
    device.queue.submit([clearAgain.finish()]);
    await step({ dt: 0, velocity: [0.03, 0.08, -0.04] });
    const memory = new Float32Array((await read(buffers[10])).buffer);
    const ids = new Uint32Array(memory.buffer);
    let movingSlot = -1;
    for (let s = 0; s < memory.length / 148; s++) if (ids[s * 148 + 2] === 10 << 5) movingSlot = s;
    assert(movingSlot >= 0, "released reverse-side strand has a persistent record");
    for (let i = 0; i <= 16; i++)
      for (let k = 0; k < 3; k++)
        assert(
          Math.abs(memory[movingSlot * 148 + 80 + 4 * i + k] - [0.03, 0.08, -0.04][k]) < 1e-6,
          "newly freed yarn inherits solver velocity",
        );
    const detachedClear = device.createCommandEncoder();
    detachedClear.clearBuffer(buffers[10]);
    device.queue.submit([detachedClear.finish()]);
    Object.assign(rods[0], { detached: true, heldB: false, pos: 40, n: 30, len: 0.03, q: [0, 0, 0.08] });
    Object.assign(rods[1], { detached: true, q: [0.09, 0, 0.1] });
    rf[112] = -0.15;
    rf[113] = 1;
    const freeBorn = await step({ dt: 0 });
    for (let i = 0; i < 15; i++) await step({ dt: 1 / 120 });
    const falling = await step({ dt: 1 / 120 });
    assert(
      falling[10][2] < freeBorn[10][2] - 0.02 && falling[10][66] < freeBorn[10][66] - 0.02,
      "a fully freed yarn falls at both ends instead of vanishing or remaining clamped",
    );
    const freePaused = await step({ dt: 0 });
    assert(JSON.stringify(falling) === JSON.stringify(freePaused), "detached yarns freeze on pause");
    rods[0].detached = false; rods[0].heldB = true;
    await step({dt:1/120});
    rods[0].detached = true;
    const freeAgain = await step({dt:1/120});
    assert(freeAgain[10][2] < falling[10][2] + .01, "a free fragment cannot inherit clamped-root correction velocity from a neighboring held run");
    for (let i = 0; i < 20; i++) await step({ dt: 1 / 120, wind: 8 });
    for (let i = 0; i < 80; i++) await step({ dt: 1 / 120 });
    const landed = await step({ dt: 1 / 120 });
    assert(
      landed[10].every((v, i) => i % 4 !== 2 || v >= -0.150001),
      "detached yarns collide with the floor",
    );
    // Compile and execute scalar bounds against the exact production helpers.
    const helpers = await pipeline("bending and bridge invariants", responseCode, "check");
    const output = make(64 * 16);
    const bg = device.createBindGroup({
      layout: helpers.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: output } }],
    });
    const e = device.createCommandEncoder(),
      pass = e.beginComputePass();
    pass.setPipeline(helpers);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(1);
    pass.end();
    device.queue.submit([e.finish()]);
    const values = new Float32Array((await read(output)).buffer);
    for (let i = 0; i < 12; i++) {
      const [energyRatio, positionError, velocityError, arcRatio] = values.slice(4 * i, 4 * i + 4);
      assert(energyRatio <= 1.00001 && energyRatio >= 0, "damped modes cannot gain energy");
      // WGSL sin/cos need only bounded approximation accuracy. Separate metre
      // and metre/second errors; do not add quantities with different units.
      assert(
        positionError < 2e-5 && velocityError < 2e-3,
        "GPU bending mode timestep split case " + i + ": " + JSON.stringify({ positionError, velocityError }),
      );
      const expectedEnd = (i & 1) === 0 && ((i & 4) === 0 || (i & 2) !== 0);
      assert(
        values[4 * (16 + i)] === Number(expectedEnd),
        "only actually severed yarns receive end tufts; continuing bridges do not",
      );
      assert(arcRatio <= 1.00001 && arcRatio > 0.995, "a slack bridge spends its existing yarn length");
    }
    output.destroy();
    assert(errors.length === 0, errors.join("\n"));
    return {
      cases: 12,
      bucketCollision: [10, collidingYarn],
      frames: frame,
      rods: 2,
      errors,
      calmTip: calm[10].slice(64, 67),
      airTip: blown[10].slice(64, 67),
      releasedTip: released[10].slice(64, 67),
      grownTip: grown[10].slice(64, 67),
      reverseGrownTip: reverseGrowth[10].slice(64, 67),
    };
  } finally {
    buffers.forEach((b) => b.destroy());
    device.destroy();
  }
}
