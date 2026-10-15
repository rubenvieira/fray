// Execute the production kernels; test physical bounds and spatial causality.
export async function checkBurn({ code }) {
  const d = await (
      await navigator.gpu.requestAdapter()
    ).requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: 10 } }),
    errors = [];
  d.addEventListener("uncapturederror", (e) => errors.push(e.error.message));
  const ok = (v, m) => {
      if (!v) throw Error("Combustion: " + m);
    },
    N = 81,
    K = 9,
    h = 1 / 120;
  const uniforms = [0, 1, 10, 11],
    readonly = [2, 3],
    sizes = { 0: 400, 1: 48, 2: 16 * N, 3: 16 * N, 4: 16 * N, 5: 16 * N, 6: 4 * N, 7: 16, 8: 16, 10: 96, 11: 160 };
  const buffers = Object.entries(sizes).map(([k, size]) => [
      +k,
      d.createBuffer({
        size,
        usage:
          GPUBufferUsage.COPY_DST |
          GPUBufferUsage.COPY_SRC |
          (uniforms.includes(+k) ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE),
      }),
    ]),
    b = Object.fromEntries(buffers);
  const module = d.createShaderModule({ code }),
    info = await module.getCompilationInfo();
  ok(!info.messages.some((v) => v.type === "error"), info.messages.map((v) => v.message).join("\n"));
  const layout = d.createBindGroupLayout({
      entries: buffers.map(([binding]) => ({
        binding,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: uniforms.includes(binding) ? "uniform" : readonly.includes(binding) ? "read-only-storage" : "storage",
        },
      })),
    }),
    pl = d.createPipelineLayout({ bindGroupLayouts: [layout] });
  const names = ["burnClear", "burnStep", "burnCommit", "burnWeave"],
    pipes = await Promise.all(
      names.map((entryPoint) => d.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint } })),
    ),
    group = d.createBindGroup({
      layout,
      entries: buffers.map(([binding, buffer]) => ({ binding, resource: { buffer } })),
    });
  const params = new ArrayBuffer(400),
    pf = new Float32Array(params),
    pu = new Uint32Array(params),
    controls = new ArrayBuffer(96),
    cf = new Float32Array(controls),
    cu = new Uint32Array(controls);
  pf[0] = h;
  pu.set([N, 1, 1, 0], 4);
  pu.set([0, K, K, 0], 8);
  pf[19] = pf[27] = 1;
  pf[31] = pf[32] = 0.004;
  d.queue.writeBuffer(b[0], 0, params);
  d.queue.writeBuffer(b[1], 0, new Uint32Array([0, K, K, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  const nodes = new Uint32Array(4 * N),
    positions = new Float32Array(4 * N);
  for (let j = 0; j < K; j++)
    for (let i = 0; i < K; i++) {
      const n = j * K + i;
      nodes[4 * n] = i | (j << 12);
      positions.set([(i - 4) * 0.004, 0, (j - 4) * 0.004, 0], 4 * n);
    }
  d.queue.writeBuffer(b[2], 0, nodes);
  let time = 0;
  function reset(material = 4, { far = false, retired = false } = {}) {
    time = 0;
    cu[4] = material;
    const p = positions.slice();
    if (far) for (let n = 0; n < N; n++) if (n !== 40) p[4 * n + 1] = 1;
    if (retired) p[163] = 2;
    d.queue.writeBuffer(b[3], 0, p);
    const v = new Float32Array(4 * N);
    for (let i = 0; i < N; i++) v[4 * i] = 293;
    d.queue.writeBuffer(b[4], 0, v);
    d.queue.writeBuffer(b[5], 0, v);
    d.queue.writeBuffer(b[6], 0, new Uint32Array(N).fill(0xffff0000));
  }
  async function read() {
    const rb = d.createBuffer({ size: 20 * N, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST }),
      e = d.createCommandEncoder();
    e.copyBufferToBuffer(b[4], 0, rb, 0, 16 * N);
    e.copyBufferToBuffer(b[6], 0, rb, 16 * N, 4 * N);
    d.queue.submit([e.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const data = rb.getMappedRange().slice(0);
    rb.unmap();
    rb.destroy();
    const heat = Array.from(new Float32Array(data, 0, 4 * N)),
      field = Array.from(new Uint32Array(data, 16 * N, N));
    for (let i = 0; i < N; i++) {
      ok(Number.isFinite(heat[4 * i]) && heat[4 * i] >= 292.99 && heat[4 * i] <= 1500.01, "bounded temperature");
      ok(heat[4 * i + 1] >= 0 && heat[4 * i + 1] <= 1, "bounded fuel loss");
      ok(heat[4 * i + 2] >= 0 && heat[4 * i + 2] <= 1, "bounded char");
    }
    ok(!errors.length, errors.join("\n"));
    return { heat, field };
  }
  async function step(frames, { pilot = false, wind = 0, dt = h } = {}) {
    pf[0] = dt;
    d.queue.writeBuffer(b[0], 0, params);
    for (let i = 0; i < frames; i++) {
      time += dt;
      cf.fill(0, 8);
      if (pilot) cf.set([41, 0.008, 1, 0], 8);
      cf[1] = time;
      d.queue.writeBuffer(b[10], 0, controls);
      const air = new Float32Array(40);
      air.set([0, -1, 0, wind, time, 0.25, 0.09, 8]);
      d.queue.writeBuffer(b[11], 0, air);
      const e = d.createCommandEncoder(),
        p = e.beginComputePass();
      p.setBindGroup(0, group);
      for (const pipe of pipes) {
        p.setPipeline(pipe);
        p.dispatchWorkgroups(1);
      }
      p.end();
      d.queue.submit([e.finish()]);
      if (i % 60 === 59) await d.queue.onSubmittedWorkDone();
    }
    return read();
  }
  try {
    reset();
    const cold = await step(120);
    ok(
      cold.heat.every((v, i) => (i % 4 === 0 ? v === 293 : v === 0)),
      "cold cloth never self-ignites",
    );
    ok(
      cold.field.every((v) => v === 0xffff0000),
      "cold yarns remain intact",
    );
    const lit = await step(240, { pilot: true });
    ok(lit.heat[160] > 700 && lit.heat[161] > 0.4 && lit.heat[162] > 0.3, "pilot heats, consumes and chars fuel");
    const released = await step(180);
    ok(released.heat[161] > lit.heat[161], "fire persists after igniter release");
    ok(
      released.field.some((v) => (v & 255) === 255 && ((v >>> 8) & 255) === 255),
      "burn cuts both yarn families",
    );
    const loss = released.heat.filter((_, i) => i % 4 === 1),
      up = loss.slice(45).reduce((a, b) => a + b, 0),
      down = loss.slice(0, 36).reduce((a, b) => a + b, 0);
    ok(up > down, "buoyancy preheats above flame");
    const frozen = await step(1, { dt: 0 });
    ok(
      frozen.heat.every((v, i) => i % 4 === 3 || Math.abs(v - released.heat[i]) < 1e-6),
      "zero physical time freezes heat and fuel",
    );
    const cooled = await step(480, { wind: 14 });
    ok(cooled.heat[162] >= lit.heat[162], "char cannot heal");
    ok(
      cooled.field.every((v, i) => (v & 65535) >= (released.field[i] & 65535)),
      "burned yarns cannot heal",
    );
    reset(4, { far: true });
    const far = await step(240, { pilot: true });
    ok(
      far.heat.every((v, i) => i % 4 !== 0 || Math.floor(i / 4) === 40 || v === 293),
      "far torn material receives no chart-neighbour heat",
    );
    reset(4, { retired: true });
    ok((await step(60, { pilot: true })).heat[160] === 293, "retired nodes cannot ignite");
    reset(2);
    const wool = await step(60, { pilot: true });
    reset(4);
    const linen = await step(60, { pilot: true });
    ok(linen.heat[161] > wool.heat[161], "material differences remain");
    reset();
    ok(
      (await step(1)).heat.every((v, i) => (i % 4 === 0 ? v === 293 : v === 0)),
      "reset clears thermal state",
    );
    return {
      cases: 12,
      errors,
      litTemperature: lit.heat[160],
      litLoss: lit.heat[161],
      releasedLoss: released.heat[161],
      upwardLoss: up,
      downwardLoss: down,
    };
  } finally {
    buffers.forEach(([, v]) => v.destroy());
    d.destroy();
  }
}
