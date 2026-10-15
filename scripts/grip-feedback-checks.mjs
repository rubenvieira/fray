// Run the production gripLead kernel; compare its reported load to the exact
// resultant of a two-node spring patch, including clamp and release cases.
export async function checkGripFeedback(code) {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error("No WebGPU adapter for grip feedback checks");
  const device = await adapter.requestDevice();
  const errors = [];
  device.addEventListener("uncapturederror", (e) => errors.push(e.error.message));
  const buffers = [];
  function buffer(size, usage) {
    const b = device.createBuffer({ size, usage });
    buffers.push(b);
    return b;
  }
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
  try {
    const module = device.createShaderModule({ code });
    const pipeline = await device.createComputePipelineAsync({
      layout: "auto",
      compute: { module, entryPoint: "gripLead" },
    });
    const G = buffer(256, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST),
      x = buffer(32, usage),
      patch = buffer(65536, usage),
      goal = buffer(192, usage);
    const read = buffer(192, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        [1, G],
        [4, x],
        [7, patch],
        [11, goal],
      ].map(([binding, buffer]) => ({ binding, resource: { buffer } })),
    });
    const cases = [
      { distance: 0.002, expected: 2 },
      { distance: -0.004, expected: 4 },
      { distance: 0.05, expected: 6 },
      { distance: 0.01, stiffness: 0, expected: 0 },
      { distance: 0.002, detached: true, expected: 0 },
      { distance: 0.002, weight: 0.25, expected: 1 },
      { distance: 0.002, offset: 0.4, expected: 2 },
    ];
    for (const c of cases) {
      const uniform = new Float32Array(64);
      uniform.set([c.distance, 0, 0, 2, c.stiffness ?? 1000, 0.006, 0, 1]);
      const vertices = new Float32Array(8);
      vertices.set([
        -0.001 + (c.offset ?? 0),
        0,
        0,
        +(c.detached ?? false),
        0.001 + (c.offset ?? 0),
        0,
        0,
        +(c.detached ?? false),
      ]);
      const bytes = new ArrayBuffer(65536),
        pf = new Float32Array(bytes),
        pu = new Uint32Array(bytes);
      for (let n = 0; n < 2; n++) {
        pu[8 * n] = n;
        pf[8 * n + 1] = c.weight ?? 0.5;
        pf[8 * n + 4] = n === 0 ? -0.001 : 0.001;
      }
      const targets = new Float32Array(48);
      targets[4] = c.offset ?? 0;
      device.queue.writeBuffer(G, 0, uniform);
      device.queue.writeBuffer(x, 0, vertices);
      device.queue.writeBuffer(patch, 0, bytes);
      device.queue.writeBuffer(goal, 0, targets);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(1);
      pass.end();
      encoder.copyBufferToBuffer(goal, 0, read, 0, 192);
      device.queue.submit([encoder.finish()]);
      await read.mapAsync(GPUMapMode.READ);
      const output = new Float32Array(read.getMappedRange().slice(0));
      read.unmap();
      if (!output.every(Number.isFinite) || Math.abs(output[3] - c.expected) > 5e-5)
        throw Error(`Grip load: expected ${c.expected}, got ${output[3]}`);
    }
    if (errors.length) throw Error(errors.join("\n"));
    return { cases: cases.length, errors };
  } finally {
    buffers.forEach((b) => b.destroy());
    device.destroy();
  }
}
