// Optional GPU correctness checks, separate from Node tests: no full scene or frame-rate claims.
// Install Playwright, or point PLAYWRIGHT_MODULE at an existing installation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const source = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const context = vm.createContext({
  self: {},
  GPUBufferUsage: { STORAGE: 128, COPY_DST: 8, COPY_SRC: 4, UNIFORM: 64 },
  GPUShaderStage: { COMPUTE: 4, VERTEX: 1, FRAGMENT: 2 },
});
// Evaluating declarations creates no GPU device or scene; init is message-driven.
vm.runInContext(source.replace(/^import .*;\n/gm, ""), context);
const { common, field, grip, thread, appearance, materials } = vm.runInContext(
  `({
  common: _, field: ot, grip: R, appearance: oe,
  thread: Pe({layers:[{bundle:[5,5]}]}, false) + oe + j + fe + he,
  materials: Object.values(FABRICS).map(preset => preset.material)
})`,
  context,
);

function shaderFunction(code, name) {
  const start = code.indexOf(`fn ${name}(`);
  assert.ok(start >= 0, `production shader contains ${name}`);
  let end = code.indexOf("{", start) + 1,
    depth = 1;
  while (depth && end < code.length) {
    if (code[end] === "{") depth++;
    if (code[end] === "}") depth--;
    end++;
  }
  assert.equal(depth, 0);
  return code.slice(start, end);
}

const cases = [];
for (const material of materials)
  for (const yarn of material.yarns) {
    for (const bundle of [1, 6])
      for (const area of [0.1, 1]) {
        for (const multiple of [-0.1, 0, 0.2, 0.8, 1, 2, 4]) {
          for (const [factor, transfer] of [
            [1, 100],
            [4.6, 0],
            [1.6, yarn.strength * 0.1],
            [4.6, yarn.strength * 0.5],
          ]) {
            const strain = yarn.crimpStrain * multiple;
            cases.push([
              yarn.eaLow * bundle,
              yarn.eaHigh * bundle,
              yarn.crimpStrain,
              yarn.eaCompress * bundle,
              0,
              0,
              0,
              bundle,
              strain,
              bundle,
              area,
              yarn.strength,
              factor,
              transfer,
              0.08,
              0,
            ]);
          }
        }
      }
  }
const mechanicsCode =
  common +
  shaderFunction(field, "sharedYarnForce") +
  `
struct Case { yarn: Yarn, state: vec4<f32>, sharing: vec4<f32> };
@group(0) @binding(0) var<storage, read> cases: array<Case>;
@group(0) @binding(1) var<storage, read_write> result: array<vec4<f32>>;
@compute @workgroup_size(64)
fn check(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= arrayLength(&cases)) { return; }
  let c = cases[id.x];
  let base = max(0.0, axialTension(c.yarn, c.state.x)) * c.state.z / c.state.y;
  let force = sharedYarnForce(base, c.sharing.x, c.sharing.y);
  let strain = strainAtTension(c.yarn, force * c.state.y / c.state.z);
  let recovered = axialTension(c.yarn, strain) * c.state.z / c.state.y;
  let damage = yarnDamage(c.yarn, c.state.y, c.state.z, c.state.w, c.sharing.z, strain);
  result[id.x] = vec4<f32>(base, force, recovered, damage);
}`;
const fibreCases = [];
for (let material = 0; material < 9; material++)
  for (const family of [0, 1]) {
    for (const yarn of [0, 23, 31, 40, 49, 98])
      for (let seed = 0; seed < 8; seed++) fibreCases.push([material, family, yarn, seed]);
  }
const colourFunctions = ["hash11", "hashf", "fabricRimPale", "fabricRimDyed", "tartanYarn", "looseFibreAlbedo"]
  .map((name) => shaderFunction(appearance, name))
  .join("\n");
const fibreCode =
  colourFunctions +
  `
@group(0) @binding(0) var<storage, read> cases: array<vec4<u32>>;
@group(0) @binding(1) var<storage, read_write> result: array<vec4<f32>>;
@compute @workgroup_size(64)
fn check(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= arrayLength(&cases)) { return; }
  let c = cases[id.x];
  result[id.x] = vec4<f32>(looseFibreAlbedo(c.x, c.y, i32(c.z), c.w), 1.0);
}`;

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-webgpu", "--use-angle=swiftshader"],
});
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Fabric GPU checks</title>" }),
  );
  await page.goto("http://localhost:9989/");
  const timeout = setTimeout(() => {
    void browser.close();
  }, 60_000);
  let result;
  try {
    result = await page.evaluate(
      async ({ modules, mechanicsCode, fibreCode, cases, fibreCases }) => {
        const adapter = await navigator.gpu?.requestAdapter();
        if (!adapter) throw Error("No WebGPU adapter; GPU checks were not run.");
        const device = await adapter.requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: 10 } });
        const errors = [];
        device.addEventListener("uncapturederror", (event) => errors.push(event.error.message));
        async function compile(label, code) {
          const module = device.createShaderModule({ label, code });
          const info = await module.getCompilationInfo();
          const failures = info.messages.filter((message) => message.type === "error");
          if (failures.length)
            throw Error(`${label}: ${failures.map((message) => `${message.lineNum}: ${message.message}`).join("\n")}`);
          return module;
        }
        for (const [label, code] of Object.entries(modules)) await compile(label, code);
        async function run(label, code, data, count) {
          const module = await compile(label, code);
          const pipeline = await device.createComputePipelineAsync({
            layout: "auto",
            compute: { module, entryPoint: "check" },
          });
          const input = device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          });
          const output = device.createBuffer({
            size: count * 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
          });
          const readback = device.createBuffer({
            size: count * 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          });
          device.queue.writeBuffer(input, 0, data);
          const group = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: input } },
              { binding: 1, resource: { buffer: output } },
            ],
          });
          const encoder = device.createCommandEncoder();
          const pass = encoder.beginComputePass();
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, group);
          pass.dispatchWorkgroups(Math.ceil(count / 64));
          pass.end();
          encoder.copyBufferToBuffer(output, 0, readback, 0, count * 16);
          device.queue.submit([encoder.finish()]);
          await readback.mapAsync(GPUMapMode.READ);
          const values = Array.from(new Float32Array(readback.getMappedRange()));
          readback.unmap();
          input.destroy();
          output.destroy();
          readback.destroy();
          return values;
        }
        const forces = await run("fracture force", mechanicsCode, new Float32Array(cases.flat()), cases.length);
        const colours = await run(
          "loose fibre colour",
          fibreCode,
          new Uint32Array(fibreCases.flat()),
          fibreCases.length,
        );
        const description =
          adapter.info.description ||
          `${adapter.info.vendor} ${adapter.info.architecture}`.trim() ||
          "SwiftShader (requested software backend)";
        device.destroy();
        return { forces, colours, errors, description };
      },
      {
        modules: { "yarn field": common + field, grip: common + grip, "loose threads": thread },
        mechanicsCode,
        fibreCode,
        cases,
        fibreCases,
      },
    );
  } finally {
    clearTimeout(timeout);
  }
  assert.deepEqual(result.errors, []);
  cases.forEach((c, index) => {
    const [base, force, recovered, damage] = result.forces.slice(index * 4, index * 4 + 4);
    const tolerance = 2e-5 * Math.max(1, force);
    assert.ok([base, force, recovered, damage].every(Number.isFinite), `finite mechanics case ${index}`);
    assert.ok(force >= base - tolerance && force - base <= c[13] + tolerance, `friction bounds case ${index}`);
    assert.ok(force <= base * c[12] + tolerance, `neighbor load bounds case ${index}`);
    assert.ok(Math.abs(force - recovered) <= tolerance, `nonlinear force inversion case ${index}`);
    assert.ok(damage >= 0 && damage <= 1, `bounded damage case ${index}`);
    if (force < c[11] - tolerance) assert.equal(damage, 0, `no premature rupture case ${index}`);
    if (c[8] <= 0) assert.equal(force, 0, `no tensile damage under compression ${index}`);
  });
  const colour = (material, family, yarn, seed) => {
    const index = fibreCases.findIndex((c) => c[0] === material && c[1] === family && c[2] === yarn && c[3] === seed);
    return result.colours.slice(index * 4, index * 4 + 3);
  };
  assert.ok(result.colours.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
  for (let seed = 0; seed < 8; seed++) {
    assert.deepEqual(colour(2, 0, 0, seed), colour(2, 0, 98, seed), "tartan repeats its sett");
    assert.notDeepEqual(colour(2, 0, 0, seed), colour(2, 0, 23, seed), "red and green yarns keep distinct hairs");
    assert.notDeepEqual(colour(1, 1, 0, seed), colour(0, 1, 0, seed), "burlap hair does not become denim");
    const denimWeft = colour(0, 0, 0, seed);
    assert.ok(Math.abs(denimWeft[0] - 0.44) < 1e-6 && Math.abs(denimWeft[2] - 0.43) < 1e-6);
  }
  console.log(
    `GPU checks passed: 3 production modules compiled, ${cases.length} force cases, ${fibreCases.length} fibre colours.`,
  );
  console.log(`Adapter: ${result.description}. Correctness only; no real-phone performance claim.`);
} finally {
  await browser.close();
}
