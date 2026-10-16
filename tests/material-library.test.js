import { yarnHandleRenderWGSL } from "../src/yarn-grip.js";
import { additionalPresets, reinforcementStrength, materialColourWGSL } from "../src/material-library.js";
import { freeYarnWGSL } from "../src/free-yarn.js";
import { tailMemoryWGSL, TAIL_HISTORY_BYTES } from "../src/tail-memory.js";
import { frayMaterialWGSL } from "../src/fray-material.js";
import { airflowWGSL } from "../src/airflow.js";
import { releaseWGSL, pullMemoryBytes } from "../src/yarn-release.js";
import { burnAppearanceWGSL, FabricFire, createFireView } from "../src/burn.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const scope = vm.createContext({
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
vm.runInContext(source.replace(/^import .*;\n/gm, ""), scope);
const { presets, makeScene } = vm.runInContext("({ presets: FABRICS, makeScene: Kt })", scope);

test("additional materials retain independent mechanics and matched fringe identities", () => {
  assert.equal(Object.keys(presets).length, 12);
  const linen = JSON.stringify(presets.linen);
  const extra = additionalPresets(presets);
  assert.equal(JSON.stringify(presets.linen), linen);
  assert.notEqual(extra.madras.material.yarns[0].strength, presets.linen.material.yarns[0].strength);
  assert.equal(extra.shot.material.twillRepeat, 2);
  assert.equal(extra.ripstop.material.id, 11);
  for (const key of ["madras", "shot", "ripstop"]) {
    const preset = extra[key];
    const scene = makeScene([{ ...preset, sizeU: 0.03, sizeV: 0.03 }]);
    assert.ok(scene.mass.every((x) => Number.isFinite(x) && x > 0));
    assert.ok(scene.fieldStrength.every((x) => Number.isFinite(x) && x > 0));
    assert.ok(scene.position.every(Number.isFinite));
  }
});

test("ripstop grid strengthens actual fine yarns without changing the unreinforced cells", () => {
  const preset = { ...presets.ripstop, sizeU: 0.03, sizeV: 0.03 };
  const plain = { ...preset };
  delete plain.reinforcement;
  const reinforced = makeScene([preset]),
    ground = makeScene([plain]);
  const field = reinforced.field[0];
  let gridCells = 0,
    groundCells = 0;
  for (let m = 0; m < field.M; m++)
    for (let k = 0; k < field.K; k++)
      for (let family = 0; family < 2; family++) {
        const yarn = family === 1 ? k : m;
        const grid = yarn % 16 < 2;
        const index = 2 * (field.offset + m * field.K + k) + family;
        const ratio = reinforced.fieldStrength[index] / ground.fieldStrength[index];
        assert.ok(Math.abs(ratio - (grid ? 3.2 : 1)) < 1e-5);
        if (grid) gridCells++;
        else groundCells++;
      }
  assert.ok(gridCells > 0 && groundCells > 0);
  assert.deepEqual(Array.from(reinforced.fieldArea), Array.from(ground.fieldArea));
});
