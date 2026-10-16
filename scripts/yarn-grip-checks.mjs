// Dispatch the exact production single-yarn load and crossing-release kernels.
export async function checkYarnGrip({ code, pickCode }) {
  const device = await (
      await navigator.gpu.requestAdapter()
    ).requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: 10 } }),
    errors = [];
  device.addEventListener("uncapturederror", (e) => errors.push(e.error.message));
  const ok = (v, m) => {
    if (!v) throw Error("Individual yarn: " + m);
  };
  const N = 24,
    K = 8,
    uniform = [0, 1, 11],
    readonly = [2, 3, 4, 5, 7];
  const sizes = [400, 48, 16 * N, 16 * N, 16 * N, 32 * N, 4 * N, 8 * N, 48 * N, 160, 16, 48, 64];
  const buffers = sizes.map((size, binding) =>
    device.createBuffer({
      size,
      usage:
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC |
        (uniform.includes(binding) ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE),
    }),
  );
  const write = (i, v) => device.queue.writeBuffer(buffers[i], 0, v);
  async function read(buffer) {
    const rb = device.createBuffer({ size: buffer.size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const e = device.createCommandEncoder();
    e.copyBufferToBuffer(buffer, 0, rb, 0, rb.size);
    device.queue.submit([e.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = rb.getMappedRange().slice(0);
    rb.unmap();
    rb.destroy();
    return out;
  }
  const layout = device.createBindGroupLayout({
      entries: buffers.map((_, binding) => ({
        binding,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: uniform.includes(binding) ? "uniform" : readonly.includes(binding) ? "read-only-storage" : "storage",
        },
      })),
    }),
    pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  const module = device.createShaderModule({ code }),
    group = device.createBindGroup({
      layout,
      entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
  const pipes = await Promise.all(
    ["yarnAdvance", "yarnTerms"].map((entryPoint) =>
      device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint } }),
    ),
  );
  const params = new ArrayBuffer(400),
    pf = new Float32Array(params),
    pu = new Uint32Array(params);
  pf[0] = 1 / 120;
  pu.set([N, 1, 1, 0], 4);
  pu.set([0, K, 3, 0], 8);
  for (const o of [12, 20]) {
    pf[o] = 5;
    pf[o + 1] = 100;
    pf[o + 2] = 0.02;
    pf[o + 7] = 1;
  }
  pf[29] = 0.3;
  pf[30] = 0.2;
  pf[31] = pf[32] = 0.004;
  write(0, params);
  write(1, new Uint32Array([0, K, 3, 65537, 0, 0, 0, 0, 0, 0, 0, 0]));
  const node = new ArrayBuffer(16 * N),
    nu = new Uint32Array(node),
    nf = new Float32Array(node),
    x = new Float32Array(4 * N),
    segments = new ArrayBuffer(32 * N),
    sf = new Float32Array(segments),
    su = new Uint32Array(segments);
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < K; i++) {
      const n = j * K + i;
      nu[4 * n] = i | (j << 12);
      nf[4 * n + 2] = 0.001;
      nf[4 * n + 3] = 0.01;
      x.set([i * 0.004, j * 0.004, 0, 0], 4 * n);
      for (let f = 0; f < 2; f++) {
        sf[8 * (2 * n + f)] = 0.004;
        sf[8 * (2 * n + f) + 1] = 1;
        su[8 * (2 * n + f) + 5] = 1;
      }
    }
  write(2, node);
  write(3, x);
  write(5, segments);
  write(7, new Float32Array(2 * N).fill(2));
  const handle = new ArrayBuffer(48),
    hu = new Uint32Array(handle),
    hf = new Float32Array(handle);
  hu.set([0, 0, 1, 5]);
  hf.set([0.021, 0.004, 0, 1, 2, 0.01, -1, 0], 4);
  write(11, handle);
  const field = new Uint32Array(N).fill(0xffff0000);
  field[K] |= 255;
  field[K + 3] |= 254;
  field[K + 4] |= 254;
  field[K + 5] |= 255;
  async function reset() {
    write(6, field);
    write(12, new Float32Array([2, 0, 0, 1, 0.008, 0.004, 0, 0.01, 0, 0, 0, 0, 0, 0, 0, 0]));
    const e = device.createCommandEncoder();
    e.clearBuffer(buffers[9]);
    device.queue.submit([e.finish()]);
  }
  async function step(n = 1) {
    for (let j = 0; j < n; j++) {
      const e = device.createCommandEncoder();
      e.clearBuffer(buffers[8]);
      const p = e.beginComputePass();
      p.setBindGroup(0, group);
      for (const pipe of pipes) {
        p.setPipeline(pipe);
        p.dispatchWorkgroups(1);
      }
      p.end();
      device.queue.submit([e.finish()]);
    }
    return new Float32Array(await read(buffers[12]));
  }
  try {
    await reset();
    const first = await step();
    ok(first[2] === 0 && first[1] > 0 && first[1] < 1, "one physical step starts slip without releasing a crossing");
    const terms = new Float32Array(await read(buffers[8]));
    let force = [0, 0, 0];
    for (let n = 0; n < N; n++) for (let k = 0; k < 3; k++) force[k] -= terms[12 * n + k];
    ok(
      Math.abs(Math.hypot(...force) - first[11]) < 1e-5 && force[0] > 0,
      "the entire measured yarn force reaches the cloth",
    );
    const crossing = await step(7);
    ok(crossing[2] > 0 && crossing[2] < 3, "crossings release progressively, one yarn at a time");
    const damaged = new Uint32Array(await read(buffers[6]));
    ok(
      damaged.every((v, i) => (v & 0xffffff00) === (field[i] & 0xffffff00)),
      "opposite yarn family and cross sections remain intact",
    );
    ok(
      damaged.every((v, i) => Math.floor(i / K) === 1 || v === field[i]),
      "neighboring yarns are not deleted",
    );
    hf.set([0.004, 0.004, 0, 1], 4);
    write(11, handle);
    const slack = await step(40);
    ok(slack[2] === crossing[2] && slack[11] === 0, "easing the hand back removes force and stops crossing release");
    hf.set([0.03, 0.004, 0, 1], 4);
    write(11, handle);
    pf[0] = 0;
    write(0, params);
    const paused = await step(30);
    ok(paused[2] === slack[2], "paused physical time cannot release a crossing");
    pf[0] = 1 / 120;
    write(0, params);
    const resumed = await step(40);
    ok(
      resumed[3] === 2 && resumed[2] === 2 && resumed[11] === 0,
      "the last crossing releases the yarn and ends its reaction on the cloth",
    );
    const counters = new Uint32Array(await read(buffers[9]));
    ok(counters[1] === 1, "a fully extracted yarn is counted once");
    await step(10);
    ok(new Uint32Array(await read(buffers[9]))[1] === 1, "held free yarn cannot double count extraction");
    await reset();
    hf[7] = 0;
    write(11, handle);
    const cancelled = await step(30);
    ok(cancelled[2] === 0, "cancelled grips cannot unzip material");
    hf[7] = 1;
    write(11, handle);
    await reset();
    hf.set([0.021, 0.004, 0, 1], 4);
    write(11, handle);
    const restart = await step();
    ok(restart[2] === 0 && Math.abs(restart[1] - first[1]) < 1e-6, "reset clears slip history");
    ok(restart.every(Number.isFinite), "finite load, root and slip state");
    // Free cloth edges release a whole yarn; an actual mounting still holds it.
    const edgeField = field.slice();
    edgeField[K] &= 0xffffff00;
    write(6, edgeField);
    write(12, new Float32Array([2, 0, 0, 1, 0.008, 0.004, 0, 0.01, 0, 0, 0, 0, 0, 0, 0, 0]));
    hf.set([0.04, 0.004, 0, 1], 4);
    write(11, handle);
    const edgeFree = await step(100);
    ok(edgeFree[3] === 2 && edgeFree[2] === 3, "a physical free edge releases its last yarn crossing");
    write(6, edgeField);
    write(12, new Float32Array([2, 0, 0, 1, 0.008, 0.004, 0, 0.01, 0, 0, 0, 0, 0, 0, 0, 0]));
    nu[4 * K + 1] = 1;
    write(2, node);
    const mounted = await step(100);
    ok(
      mounted[3] === 1 && mounted[2] === 2 && mounted[0] === 0,
      "the mounting retains a yarn at a genuinely pinned boundary",
    );
    // Production picker: a visible end can be caught, an occluded end cannot.
    const pb = [96, 16, 160, 272, 16, 80].map((size, i) =>
      device.createBuffer({
        size,
        usage:
          GPUBufferUsage.COPY_DST |
          GPUBufferUsage.COPY_SRC |
          (i === 0 ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE),
      }),
    );
    const depth = device.createTexture({
      size: [32, 32],
      format: "depth32float",
      sampleCount: 4,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const pe = pb.map((buffer, binding) => ({ binding, resource: { buffer } }));
    pe.push({ binding: 6, resource: depth.createView() });
    const entries = pb.map((_, binding) => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: binding === 0 ? "uniform" : binding === 5 ? "storage" : "read-only-storage" },
    }));
    entries.push({
      binding: 6,
      visibility: GPUShaderStage.COMPUTE,
      texture: { sampleType: "depth", multisampled: true },
    });
    const pbl = device.createBindGroupLayout({ entries }),
      ppl = device.createPipelineLayout({ bindGroupLayouts: [pbl] }),
      pm = device.createShaderModule({ code: pickCode }),
      pp = await Promise.all(
        ["pickYarn", "writeYarnPick"].map((entryPoint) =>
          device.createComputePipelineAsync({ layout: ppl, compute: { module: pm, entryPoint } }),
        ),
      ),
      pg = device.createBindGroup({ layout: pbl, entries: pe });
    const u = new Float32Array(24);
    u.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    u.set([16, 16, 9, 0, 32, 32, 1, 1], 16);
    device.queue.writeBuffer(pb[0], 0, u);
    device.queue.writeBuffer(pb[1], 0, new Uint32Array([128, (3 << 16) | 1, 2, 0]));
    const geo = new Float32Array(40);
    geo.set([0, 2, 0, 0.01]);
    device.queue.writeBuffer(pb[2], 0, geo);
    const tail = new Float32Array(68);
    tail.set([0, 0, 0.5, 0], 64);
    device.queue.writeBuffer(pb[3], 0, tail);
    device.queue.writeBuffer(pb[4], 0, new Uint32Array([1, 0, 0, 0]));
    async function pick(clear) {
      const init = new Uint32Array(20);
      init[0] = 0xffffffff;
      device.queue.writeBuffer(pb[5], 0, init);
      const e = device.createCommandEncoder();
      const render = e.beginRenderPass({
        colorAttachments: [],
        depthStencilAttachment: {
          view: depth.createView(),
          depthClearValue: clear,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });
      render.end();
      const p = e.beginComputePass();
      p.setBindGroup(0, pg);
      for (const pipe of pp) {
        p.setPipeline(pipe);
        p.dispatchWorkgroups(1);
      }
      p.end();
      device.queue.submit([e.finish()]);
      return new Uint32Array(await read(pb[5]));
    }
    ok((await pick(1))[1] === 1, "visible individual end is selectable");
    ok((await pick(0.3))[1] === 0, "cloth depth hides an end behind the sheet");
    pb.forEach((b) => b.destroy());
    depth.destroy();
    ok(!errors.length, errors.join("\n"));
    return { cases: 15, initialSlip: first[1], crossings: resumed[2], force: first[11], errors };
  } finally {
    buffers.forEach((b) => b.destroy());
    device.destroy();
  }
}
