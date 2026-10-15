import { tailMemoryWGSL, TAIL_HISTORY_BYTES } from "../src/tail-memory.js";
import { frayMaterialWGSL } from "../src/fray-material.js";
import { airflowWGSL } from "../src/airflow.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const scope = vm.createContext({
  tailMemoryWGSL,
  TAIL_HISTORY_BYTES,
  frayMaterialWGSL,
  airflowWGSL,
  self: {},
  GPUBufferUsage: { STORAGE: 128, COPY_DST: 8, COPY_SRC: 4, UNIFORM: 64 },
  GPUShaderStage: { COMPUTE: 4, VERTEX: 1, FRAGMENT: 2 },
});
vm.runInContext(source.replace(/^import .*;\n/gm, ""), scope);
const { Body, pack, bundle, materials } = vm.runInContext(
  "({ Body: on, pack: jt, bundle: h, materials: Object.values(FABRICS).map(preset => preset.material) })",
  scope,
);

function body() {
  const instance = Object.create(Body.prototype);
  Object.assign(instance, {
    windData: new Float32Array(40),
    windTarget: 0,
    windOn: false,
    jetCount: 0,
    device: { queue: { writeBuffer() {} } },
  });
  return instance;
}

test("breeze accelerates and decays smoothly at equal physical rates across step sizes", () => {
  const samples = [];
  for (const hz of [30, 60, 120]) {
    const b = body();
    b.setWind([1, 0, 0], 6);
    assert.equal(b.windData[3], 0, "changing the preset never creates an instantaneous impulse");
    for (let j = 0; j < hz; j++) b.tickWind(j / hz, 1 / hz);
    const fullSpeed = Math.sqrt(12 / 1.225);
    samples.push(b.windData[3]);
    assert.ok(b.windData[3] > fullSpeed * 0.98 && b.windData[3] < fullSpeed);
    const current = b.windData[3];
    b.setWind([1, 0, 0], 0);
    assert.equal(b.windData[3], current, "switching off lets the ambient air ease out");
    for (let j = 0; j < hz * 3; j++) b.tickWind(1 + j / hz, 1 / hz);
    assert.equal(b.windOn, false);
    assert.equal(b.windData[3], 0, "decayed breeze stops spending frames on the wind pass");
  }
  assert.ok(Math.max(...samples) - Math.min(...samples) < 2e-6);
});

test("removing an Air pointer clears the actual uniform without disturbing the breeze", () => {
  const b = body();
  b.setWind([1, 0, 0], 6);
  b.tickWind(0.1, 0.1);
  const breeze = Array.from(b.windData.slice(0, 6));
  b.setAirJets([{ position: [0.1, -0.2, -0.02], aim: [1.2, -0.3], strength: 0.7 }]);
  assert.equal(b.jetCount, 1);
  assert.ok(b.windData[11] > 0);
  assert.ok(Math.abs(b.windData[24] - 1.2) < 1e-6);
  assert.ok(Math.abs(b.windData[25] + 0.3) < 1e-6);
  b.setAirJets([]);
  assert.equal(b.jetCount, 0);
  assert.ok(b.windData.slice(8).every((value) => value === 0));
  assert.deepEqual(Array.from(b.windData.slice(0, 6)), breeze);
});

test("porous screen cover is finite and invariant under solver yarn bundling", () => {
  const covers = [];
  for (const material of materials) {
    const values = [];
    for (const counts of [
      [1, 1],
      [5, 8],
      [9, 3],
    ]) {
      const scene = { nodeCount: 9, layers: [{ nodeOffset: 0, nx: 3, ny: 3, material: bundle(material, ...counts) }] };
      const bytes = pack(scene, { h: 1 / 120, gravity: [0, 0, -9.81], historyTolerance: 1 });
      const cover = new Float32Array(bytes)[11];
      assert.ok(Number.isFinite(cover) && cover > 0 && cover <= 1, material.name);
      values.push(cover);
    }
    assert.ok(Math.max(...values) - Math.min(...values) < 1e-7, material.name);
    covers.push(values[0]);
  }
  assert.ok(covers[6] < covers[5] && covers[5] < covers[3], "gauze and chiffon pass more air than satin");
});
