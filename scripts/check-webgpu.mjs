import { yarnHandleRenderWGSL, yarnGripWGSL, yarnPickWGSL } from "../src/yarn-grip.js";
import { additionalPresets, reinforcementStrength, materialColourWGSL } from "../src/material-library.js";
import { freeYarnWGSL } from "../src/free-yarn.js";
import { checkTails } from "./tail-checks.mjs";
import { tailMemoryWGSL, TAIL_HISTORY_BYTES } from "../src/tail-memory.js";
import { frayMaterialWGSL, FRAY_MATERIALS } from "../src/fray-material.js";
import { airflowWGSL } from "../src/airflow.js";
import { releaseWGSL, pullMemoryBytes } from "../src/yarn-release.js";
import { burnAppearanceWGSL, FabricFire, createFireView, burnComputeWGSL, flameWGSL } from "../src/burn.js";
// Optional GPU correctness checks, separate from Node tests: no full scene or frame-rate claims.
// Install Playwright, or point PLAYWRIGHT_MODULE at an existing installation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { checkGripFeedback } from "./grip-feedback-checks.mjs";
import { checkAirflow } from "./airflow-checks.mjs";
import { checkBurn } from "./burn-checks.mjs";
import { checkYarnGrip } from "./yarn-grip-checks.mjs";
import { checkRelease } from "./release-checks.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const source = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const context = vm.createContext({
  yarnHandleRenderWGSL,
  additionalPresets,
  reinforcementStrength,
  materialColourWGSL,
  structuredClone,
  tailMemoryWGSL,
  TAIL_HISTORY_BYTES,
  frayMaterialWGSL,
  airflowWGSL,
  freeYarnWGSL,
  releaseWGSL,
  pullMemoryBytes,
  burnAppearanceWGSL,
  FabricFire,
  createFireView,
  self: {},
  GPUBufferUsage: { STORAGE: 128, COPY_DST: 8, COPY_SRC: 4, UNIFORM: 64 },
  GPUShaderStage: { COMPUTE: 4, VERTEX: 1, FRAGMENT: 2 },
});
// Evaluating declarations creates no GPU device or scene; init is message-driven.
vm.runInContext(source.replace(/^import .*;\n/gm, ""), context);
const {
  common,
  field,
  grip,
  surface,
  scan,
  thread,
  appearance,
  materials,
  drag,
  body,
  mount,
  floor,
  fringe,
  tail,
  prep,
} = vm.runInContext(
  `({
  common: _, field: ot, grip: R, appearance: oe, drag: Ct, body: nn,
  surface: Pe({layers:[{bundle:[5,5]}]}, false) + oe + j + le + ce,
  scan: Pe({layers:[{bundle:[5,5]}]}, false) + oe + de,
  thread: Pe({layers:[{bundle:[5,5]}]}, false) + oe + j + fe + he,
  fringe: Pe({layers:[{bundle:[5,5]}]}, false) + oe + j + ge,
  tail: Pe({layers:[{bundle:[5,5]}]}, false) + oe + me,
  prep: Pe({layers:[{bundle:[5,5]}]}, false) + oe + fe + le + pe,
  mount: Pe({layers:[{bundle:[5,5]}]}, false) + oe + j + we,
  floor: Pe({layers:[{bundle:[5,5]}]}, false) + oe + j + Se,
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
for (let material = 0; material < FRAY_MATERIALS.length; material++)
  for (const family of [0, 1]) {
    for (const yarn of [0, 23, 31, 40, 49, 98])
      for (let seed = 0; seed < 8; seed++) fibreCases.push([material, family, yarn, seed]);
  }
const colourFunctions =
  frayMaterialWGSL +
  materialColourWGSL +
  ["hash11", "hashf", "fabricRimPale", "fabricRimDyed", "tartanYarn", "frayedYarnReflectance", "looseFibreAlbedo"]
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

const fringeCode =
  colourFunctions +
  `
@group(0) @binding(0) var<storage, read> cases: array<vec4<u32>>;
@group(0) @binding(1) var<storage, read_write> result: array<vec4<f32>>;
@compute @workgroup_size(64)
fn check(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= arrayLength(&cases)) { return; }
  let c = cases[id.x];
  result[id.x] = vec4<f32>(frayedYarnReflectance(c.x, c.y, i32(c.z), f32(c.w) / 7.0), 1.0);
}`;

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ["--no-sandbox", "--enable-unsafe-webgpu", "--use-angle=swiftshader"],
});
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Fabric GPU checks</title>" }),
  );
  await page.goto("http://localhost:9989/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const timeout = setTimeout(() => {
    void browser.close();
  }, 60_000);
  let result;
  try {
    result = await page.evaluate(
      async ({ modules, mechanicsCode, fibreCode, fringeCode, cases, fibreCases }) => {
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
        const fringes = await run("edge yarn dye", fringeCode, new Uint32Array(fibreCases.flat()), fibreCases.length);
        const description =
          adapter.info.description ||
          `${adapter.info.vendor} ${adapter.info.architecture}`.trim() ||
          "SwiftShader (requested software backend)";
        device.destroy();
        return { forces, colours, fringes, errors, description };
      },
      {
        modules: {
          "yarn field": common + field,
          grip: common + grip,
          "individual yarn load": common + releaseWGSL + yarnGripWGSL,
          "loose end picker": yarnPickWGSL,
          surface: surface,
          "yarn run scan": scan,
          "loose threads": thread,
          mount,
          floor,
          fringe,
          tail,
          prep,
          airflow: common + drag + body,
          combustion: common + burnComputeWGSL,
          flames: vm.runInContext("Pe({layers:[{bundle:[5,5]}]}, false) + oe", context) + flameWGSL,
        },
        mechanicsCode,
        fibreCode,
        fringeCode,
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
    assert.notDeepEqual(colour(9, 0, 0, seed), colour(9, 0, 23, seed), "madras frays preserve the colored source yarn");
    assert.notDeepEqual(colour(10, 0, 0, seed), colour(10, 1, 0, seed), "shot silk keeps distinct warp and weft dyes");
    const denimWeft = colour(0, 0, 0, seed);
    assert.ok(Math.abs(denimWeft[0] - 0.44) < 1e-6 && Math.abs(denimWeft[2] - 0.43) < 1e-6);
  }

  const fringeColour = (material, family, yarn, pale) => {
    const i = fibreCases.findIndex((c) => c[0] === material && c[1] === family && c[2] === yarn && c[3] === pale);
    return result.fringes.slice(4 * i, 4 * i + 3);
  };
  assert.ok(result.fringes.every((v) => Number.isFinite(v) && v >= 0 && v <= 1));
  for (let pale = 0; pale < 8; pale++) {
    for (const family of [0, 1]) {
      const red = fringeColour(2, family, 0, pale),
        navy = fringeColour(2, family, 40, pale),
        green = fringeColour(2, family, 23, pale);
      assert.ok(red[0] > 2.5 * red[1], "torn red yarn stays red, including its exposed fibres");
      assert.ok(navy[2] > navy[0], "navy fringe retains its source stripe");
      assert.ok(green[1] > green[0] && green[1] > green[2], "green fringe retains its source stripe");
      assert.deepEqual(
        fringeColour(2, family, 0, pale),
        fringeColour(2, family, 98, pale),
        "fringe repeats the actual sett",
      );
      const gold = fringeColour(7, family, 0, pale);
      assert.ok(gold[0] > gold[1] && gold[1] > gold[2], "metal fringe stays gold");
    }
  }
  console.log(
    `GPU checks passed: 15 production modules compiled, ${cases.length} force cases, ${fibreCases.length} loose-fibre and ${fibreCases.length} fringe colours.`,
  );
  console.log(`Adapter: ${result.description}. Correctness only; no real-phone performance claim.`);
  const feedback = await page.evaluate(checkGripFeedback, common + grip);
  console.log(`Grip feedback checks passed: ${feedback.cases} GPU load, clamp and release cases.`);
  const tailPrefix = vm.runInContext("Pe({layers:[{bundle:[5,5]}]}, false) + oe", context);
  const responseCode =
    tailPrefix +
    tailMemoryWGSL +
    `\nconst GRAVITY: f32 = 9.81;\n` +
    shaderFunction(freeYarnWGSL, "freeFlight") +
    `
@group(0) @binding(0) var<storage, read_write> result: array<vec4<f32>>;
@compute @workgroup_size(64)
fn check(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= 12u) { return; }
  let omega = 10.0 + 17.0 * f32(i % 3u);
  let zeta = select(select(0.35, 1.0, i % 4u == 1u), 3.0, i % 4u >= 2u);
  let d = vec3<f32>(0.01, -0.02, 0.015);
  let v = vec3<f32>(0.08, 0.02, -0.04);
  let dt = 0.004 + 0.012 * f32(i);
  let full = rodResponse(d, v, omega, 2.0 * zeta * omega, dt);
  let half = rodResponse(d, v, omega, 2.0 * zeta * omega, 0.5 * dt);
  let split = rodResponse(half[0], half[1], omega, 2.0 * zeta * omega, 0.5 * dt);
  let ratio = (dot(full[1], full[1]) + omega * omega * dot(full[0], full[0])) / (dot(v, v) + omega * omega * dot(d, d));
  let rest = 0.02 + 0.006 * f32(i);
  let distance = rest * (0.15 + 0.07 * f32(i));
  let arc = bridgeArc(distance, bridgeSagAmount(distance, rest));
  let here = select(0u, 255u, (i & 1u) != 0u);
  let there = select(0u, 255u, (i & 2u) != 0u);
  let hasNext = (i & 4u) != 0u;
  let severed = severedEdgeEnd(here, there, hasNext);
  result[16u + i] = vec4<f32>(select(0.0, 1.0, severed), f32(i), 0.0, 0.0);
  result[i] = vec4<f32>(ratio, length(full[0] - split[0]), length(full[1] - split[1]), arc / rest);
  let drag = array<f32, 12>(0.0, 1e-6, 0.01, 1.0, 10.0, 100.0, 1000.0, 0.0006, 5.0, 0.05, 3.0, 60.0)[i];
  let flight = freeFlight(vec3<f32>(0.03, 0.08, -0.000047), vec3<f32>(0.2, 0.0, 0.1), drag, select(dt, 0.0, i == 7u));
  result[32u + i] = vec4<f32>(flight[0], 0.0);
  result[48u + i] = vec4<f32>(flight[1], 0.0);
}`;
  const tails = await page.evaluate(checkTails, { code: tail, responseCode, memoryBytes: TAIL_HISTORY_BYTES });
  console.log("Free-tail checks passed: " + JSON.stringify(tails));
  const yarnGrip = await page.evaluate(checkYarnGrip, {
    code: common + releaseWGSL + yarnGripWGSL,
    pickCode: yarnPickWGSL,
  });
  console.log("Individual yarn checks passed: " + JSON.stringify(yarnGrip));
  const release = await page.evaluate(checkRelease, { code: common + field });
  console.log("Progressive yarn release checks passed: " + JSON.stringify(release));
  const combustion = await page.evaluate(checkBurn, { code: common + burnComputeWGSL });
  console.log("Combustion checks passed: " + JSON.stringify(combustion));
  const airflow = await page.evaluate(checkAirflow, common + drag + body);
  assert.deepEqual(airflow.errors, []);
  console.log(
    `Airflow checks passed: ${airflow.cases} GPU cases (orientation, porosity, torn yarns, release, and relative motion).`,
  );
} finally {
  await browser.close();
}
