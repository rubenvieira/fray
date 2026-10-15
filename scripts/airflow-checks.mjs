// Runs in the browser against the production drag and wind WGSL. A 3x3 sheet
// isolates orientation, porosity, topology and relative motion from yarn forces.
export async function checkAirflow(code) {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error("No WebGPU adapter for airflow checks");
  const device = await adapter.requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: 10 } });
  const errors = [];
  device.addEventListener("uncapturederror", (event) => errors.push(event.error.message));
  const check = (condition, label) => {
    if (!condition) throw Error(`Airflow: ${label}`);
  };
  const near = (a, b, label) => check(Math.abs(a - b) < 1e-7 + 2e-5 * Math.abs(b), `${label}: ${a} vs ${b}`);
  const N = 9,
    h = 1 / 120;
  const resources = [];
  function buffer(size, usage) {
    const b = device.createBuffer({ size, usage });
    resources.push(b);
    return b;
  }
  const storage = (size) => buffer(size, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC);
  const uniform = (size) => buffer(size, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  const P = uniform(400),
    nodes = storage(16 * N),
    x = storage(16 * N),
    dx = storage(16 * N);
  const ext = storage(48 * N),
    wind = uniform(96),
    segs = storage(64 * N),
    probe = storage(64 * N);
  const readback = buffer(112 * N, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
  const module = device.createShaderModule({
    code:
      code +
      `
@group(0) @binding(13) var<storage, read_write> probe: array<vec4<f32>>;
@compute @workgroup_size(128)
fn airflowProbe(@builtin(global_invocation_id) id: vec3<u32>) {
  let n = id.x;
  if (n >= P.counts.x) { return; }
  let D = airDragBlock(n);
  let air = airflowAt(x[n].xyz);
  probe[4u * n] = vec4<f32>(symMul(D, dx[n].xyz), 0.0);
  probe[4u * n + 1u] = vec4<f32>(air, 0.0);
  probe[4u * n + 2u] = vec4<f32>(D.d, 0.0);
  probe[4u * n + 3u] = vec4<f32>(D.o, 0.0);
}`,
  });
  try {
    const messages = (await module.getCompilationInfo()).messages.filter((m) => m.type === "error");
    check(messages.length === 0, messages.map((m) => m.message).join("\n"));
    const pipeline = await device.createComputePipelineAsync({
      layout: "auto",
      compute: { module, entryPoint: "windTerms" },
    });
    const probePipeline = await device.createComputePipelineAsync({
      layout: "auto",
      compute: { module, entryPoint: "airflowProbe" },
    });
    const entry = (binding, b) => ({ binding, resource: { buffer: b } });
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [entry(0, P), entry(2, nodes), entry(3, x), entry(5, ext), entry(11, wind), entry(12, segs)],
    });
    const probeGroup = device.createBindGroup({
      layout: probePipeline.getBindGroupLayout(0),
      entries: [
        entry(0, P),
        entry(2, nodes),
        entry(3, x),
        entry(4, dx),
        entry(11, wind),
        entry(12, segs),
        entry(13, probe),
      ],
    });
    async function run({
      edge = false,
      flip = false,
      cover = 1,
      intact = 1,
      strand = false,
      isolated = false,
      pinned = false,
      retired = false,
      jet = true,
      jets = 1,
      ambient = 0,
      motion,
    } = {}) {
      const params = new ArrayBuffer(400),
        pf = new Float32Array(params),
        pu = new Uint32Array(params);
      pf[0] = h;
      pu[4] = N;
      pu[5] = 1;
      pu[8] = 0;
      pu[9] = 3;
      pu[10] = 3;
      pf[11] = cover;
      pf[31] = 0.01;
      pf[32] = 0.01;
      pf[33] = 1.8;
      const nodeBytes = new ArrayBuffer(N * 16),
        nu = new Uint32Array(nodeBytes);
      const positions = new Float32Array(N * 4);
      const segmentBytes = new ArrayBuffer(N * 64),
        sf = new Float32Array(segmentBytes),
        su = new Uint32Array(segmentBytes);
      for (let j = 0; j < 3; j++)
        for (let i = 0; i < 3; i++) {
          const n = j * 3 + i,
            a = (i - 1) * 0.01 * (flip ? -1 : 1),
            b = (j - 1) * 0.01;
          nu[4 * n] = i | (j << 12);
          nu[4 * n + 1] = pinned ? 1 : 0;
          positions.set(edge ? [0, a, b, retired ? 2 : 0] : [a, b, 0, retired ? 2 : 0], 4 * n);
          for (let f = 0; f < 2; f++) {
            const offset = 8 * (2 * n + f);
            sf[offset] = 0.01;
            sf[offset + 1] = intact;
            su[offset + 5] = (f === 0 ? i < 2 : j < 2) && !isolated && !(strand && f === 1) ? 1 : 0;
          }
        }
      const wd = new Float32Array(24);
      wd.set([0.8, -0.3, 0.35, ambient, 0, 0.25, 0.075, 8]);
      if (jet) for (let j = 0; j < jets; j++) wd.set([0, 0, -0.02, 1], 8 + 4 * j);
      device.queue.writeBuffer(P, 0, params);
      device.queue.writeBuffer(nodes, 0, nodeBytes);
      device.queue.writeBuffer(x, 0, positions);
      device.queue.writeBuffer(segs, 0, segmentBytes);
      device.queue.writeBuffer(wind, 0, wd);
      device.queue.writeBuffer(dx, 0, motion ?? new Float32Array(N * 4));
      const encoder = device.createCommandEncoder();
      encoder.clearBuffer(ext);
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(1);
      pass.setPipeline(probePipeline);
      pass.setBindGroup(0, probeGroup);
      pass.dispatchWorkgroups(1);
      pass.end();
      encoder.copyBufferToBuffer(ext, 0, readback, 0, 48 * N);
      encoder.copyBufferToBuffer(probe, 0, readback, 48 * N, 64 * N);
      device.queue.submit([encoder.finish()]);
      await readback.mapAsync(GPUMapMode.READ);
      const output = new Float32Array(readback.getMappedRange().slice(0));
      readback.unmap();
      check(output.every(Number.isFinite), "finite air, gradient and Hessian");
      const external = output.slice(0, 12 * N),
        data = output.slice(12 * N);
      const force = Array.from({ length: 3 }, (_, axis) => -(external[12 * 4 + axis] + data[16 * 4 + axis]));
      return { force, external, data };
    }
    const flat = await run();
    check(flat.force[2] > 0, "an upward fan must lift the sheet, not push it down");
    near(flat.force[0], 0, "no invented tangential sheet force");
    near((await run({ edge: true })).force[2], 0, "an edge-on sheet lets this jet pass");
    const back = await run({ flip: true });
    near(back.force[2], flat.force[2], "both sides catch air equally");
    near((await run({ cover: 0.25 })).force[2], flat.force[2] * 0.25, "open weaves leak air");
    near((await run({ intact: 0.25 })).force[2], flat.force[2] * 0.25, "separated fibres stop carrying sail area");
    check((await run({ isolated: true })).force[2] < flat.force[2] * 0.06, "isolated nodes cannot act as intact sails");
    const strand = await run({ strand: true });
    check(
      strand.force[2] > 0 && strand.force[2] < flat.force[2],
      "surviving strands still catch air across their yarns",
    );
    check(
      (await run({ pinned: true })).external.every((v) => v === 0),
      "mounted border receives no external wind term",
    );
    check(
      (await run({ retired: true })).external.every((v) => v === 0),
      "retired nodes receive no external wind term",
    );
    check(
      (await run({ jet: false })).external.every((v) => v === 0),
      "no wind means no drive",
    );
    const motion = new Float32Array(N * 4);
    for (let n = 0; n < N; n++)
      for (let axis = 0; axis < 3; axis++) motion[4 * n + axis] = h * flat.data[16 * n + 4 + axis];
    (await run({ motion })).force.forEach((v) => near(v, 0, "cloth carried with the air feels no force"));
    const outpacing = await run({ motion: motion.map((v) => 2 * v) });
    near(outpacing.force[2], -flat.force[2], "air brakes cloth moving faster than the flow");
    const against = await run({ motion: motion.map((v) => -v) });
    near(against.force[2], 2 * flat.force[2], "relative motion controls drag");
    const overlapping = await run({ jets: 4, ambient: 7 });
    for (let n = 0; n < N; n++)
      check(
        Math.hypot(...overlapping.data.slice(16 * n + 4, 16 * n + 7)) <= 12.0001,
        "overlapping air brushes stay bounded",
      );
    check(errors.length === 0, errors.join("\n"));
    return { cases: 14, adapter: adapter.info.description || adapter.info.architecture, lift: flat.force[2], errors };
  } finally {
    resources.forEach((b) => b.destroy());
    device.destroy();
  }
}
