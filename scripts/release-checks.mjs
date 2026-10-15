// Exercise actual pullMark/pullApply dispatches, including persistent slip history.
export async function checkRelease({ code }) {
  const device = await (
      await navigator.gpu.requestAdapter()
    ).requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: 10 } }),
    N = 24,
    K = 8,
    errors = [];
  device.addEventListener("uncapturederror", (e) => errors.push(e.error.message));
  const ok = (v, label) => {
    if (!v) throw Error("Yarn release: " + label);
  };
  const sizes = [400, 48, 16 * N, 16 * N, 16 * N, 64 * N, 16 * N, 4 * N, 8 * N, 160, 16, 400, 64];
  const buffers = sizes.map((size, binding) =>
    device.createBuffer({
      size,
      usage:
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC |
        ([0, 1, 12].includes(binding) ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE),
    }),
  );
  const write = (i, v) => device.queue.writeBuffer(buffers[i], 0, v);
  const module = device.createShaderModule({ code }),
    info = await module.getCompilationInfo();
  ok(!info.messages.some((v) => v.type === "error"), info.messages.map((v) => v.message).join("\n"));
  const readonly = [2, 3, 8],
    layout = device.createBindGroupLayout({
      entries: buffers.map((_, binding) => ({
        binding,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: [0, 1, 12].includes(binding) ? "uniform" : readonly.includes(binding) ? "read-only-storage" : "storage",
        },
      })),
    }),
    pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  const pipes = await Promise.all(
      ["pullMark", "pullApply"].map((entryPoint) =>
        device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint } }),
      ),
    ),
    group = device.createBindGroup({
      layout,
      entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
  const params = new ArrayBuffer(400),
    pf = new Float32Array(params),
    pu = new Uint32Array(params);
  pf[0] = 1 / 120;
  pu.set([N, 1, 1, 0], 4);
  pu.set([0, K, 3, 0], 8);
  for (const start of [12, 20]) {
    pf[start] = 5;
    pf[start + 1] = 100;
    pf[start + 2] = 0.02;
    pf[start + 7] = 1;
  }
  pf[29] = 0.3;
  pf[30] = 0.2;
  pf[31] = pf[32] = 0.004;
  write(0, params);
  write(1, new Uint32Array([0, K, 3, 65537, 0, 0, 0, 0, 0, 0, 0, 0]));
  const nodeBytes = new ArrayBuffer(16 * N),
    nu = new Uint32Array(nodeBytes),
    nf = new Float32Array(nodeBytes),
    x = new Float32Array(4 * N),
    strain = new Float32Array(4 * N);
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < K; i++) {
      const n = j * K + i;
      nu[4 * n] = i | (j << 12);
      nf[4 * n + 2] = 0.001;
      nf[4 * n + 3] = 0.01;
      x.set([i * 0.004, j * 0.004, 0, 0], 4 * n);
      strain.set([0.2, 0.2, 0, 0], 4 * n);
    }
  write(2, nodeBytes);
  write(3, x);
  write(4, strain);
  write(8, new Float32Array(2 * N).fill(1000));
  async function read() {
    const rb = device.createBuffer({ size: 4 * N, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }),
      e = device.createCommandEncoder();
    e.copyBufferToBuffer(buffers[7], 0, rb, 0, 4 * N);
    device.queue.submit([e.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const field = Array.from(new Uint32Array(rb.getMappedRange()).slice());
    rb.unmap();
    rb.destroy();
    ok(!errors.length, errors.join("\n"));
    return field;
  }
  async function step(count) {
    for (let n = 0; n < count; n++) {
      const e = device.createCommandEncoder(),
        p = e.beginComputePass();
      p.setBindGroup(0, group);
      for (const pipe of pipes) {
        p.setPipeline(pipe);
        p.dispatchWorkgroups(1);
      }
      p.end();
      device.queue.submit([e.finish()]);
    }
    return read();
  }
  try {
    const field = new Uint32Array(N).fill(0xffff0000);
    field[K + 2] |= 255;
    write(7, field);
    write(11, new Uint32Array(100));
    const first = await step(1);
    ok(
      first.every((v, i) => v === field[i]),
      "one physical step cannot instantly retract a crossing",
    );
    const spreading = await step(15),
      pulled = spreading.filter((v) => (v & 255) === 254).length;
    ok(pulled > 0 && pulled < K - 1, "a loaded cut end slips progressively through successive crossings");
    write(4, new Float32Array(4 * N));
    const unloaded = await step(30);
    ok(
      JSON.stringify(unloaded) === JSON.stringify(spreading),
      "unloaded ends stick instead of unzipping by time alone",
    );
    write(4, strain);
    pf[0] = 0;
    write(0, params);
    const paused = await step(20);
    ok(JSON.stringify(paused) === JSON.stringify(unloaded), "zero physical time cannot advance pull-out");
    pf[0] = 1 / 120;
    write(0, params);
    const continued = await step(25);
    ok(continued.filter((v) => (v & 255) === 254).length > pulled, "continued load resumes gradual pull-out");
    write(7, field);
    write(11, new Uint32Array(100));
    const reset = await step(1);
    ok(JSON.stringify(reset) === JSON.stringify(first), "reset cannot inherit prior slip progress");
    // Keep committed fracture while its short delayed response finishes.
    write(7, new Uint32Array(N).fill(0xffff0000));
    write(11, new Uint32Array(100));
    write(8, new Float32Array(2 * N).fill(0.05));
    write(4, strain);
    const segmentBytes = new ArrayBuffer(64 * N),
      sf = new Float32Array(segmentBytes),
      su = new Uint32Array(segmentBytes);
    for (let n = 0; n < N; n++) {
      sf[16 * n] = 0.004;
      sf[16 * n + 1] = 1;
      sf[16 * n + 2] = 0.0002;
      su[16 * n + 5] = n % K < K - 1 ? 1 : 0;
    }
    write(5, segmentBytes);
    const fracture = await device.createComputePipelineAsync({
      layout: pl,
      compute: { module, entryPoint: "fieldUpdatePick" },
    });
    async function fractureStep(count) {
      for (let i = 0; i < count; i++) {
        const e = device.createCommandEncoder(),
          p = e.beginComputePass();
        p.setPipeline(fracture);
        p.setBindGroup(0, group);
        p.dispatchWorkgroups(Math.ceil((16 * N) / 128));
        p.end();
        device.queue.submit([e.finish()]);
      }
      return read();
    }
    const giving = await fractureStep(1);
    ok(
      giving.some((v) => (v & 255) > 0 && (v & 255) < 254),
      "a new overload first softens instead of instantly severing",
    );
    write(4, new Float32Array(4 * N));
    const committed = await fractureStep(12);
    ok(
      committed.some((v) => (v & 255) === 255),
      "committed fracture finishes after load redistribution",
    );
    return {
      cases: 8,
      initialPulled: pulled,
      continuedPulled: continued.filter((v) => (v & 255) === 254).length,
      errors,
    };
  } finally {
    buffers.forEach((b) => b.destroy());
    device.destroy();
  }
}
