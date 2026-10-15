import test from "node:test";
import assert from "node:assert/strict";
import { prepareMount, toToolSpace, fromToolSpace, mountCamera, hangingRail } from "../src/mount.js";
function sheet() {
  const nx = 21,
    ny = 15,
    nodeCount = nx * ny;
  const s = {
    nodeCount,
    layers: [{ nx, ny, nodeOffset: 0, material: { pitchU: 0.03, pitchV: 0.025 } }],
    position: new Float64Array(3 * nodeCount),
    restUV: new Float64Array(2 * nodeCount),
    pinned: new Uint8Array(nodeCount),
    mass: new Float64Array(nodeCount).fill(0.001),
    restLength: new Float64Array(2 * nodeCount).fill(0.03),
    fieldDamage: new Uint8Array(2 * nodeCount),
  };
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      let n = j * nx + i;
      s.position.set([i * 0.03, j * 0.025, 0], 3 * n);
      s.restUV.set([i * 0.03, j * 0.025], 2 * n);
      s.pinned[n] = +(i === 0 || j === 0 || i === nx - 1 || j === ny - 1);
    }
  return s;
}
test("hanging frees the lower and side borders while retaining all yarns and material history", () => {
  const s = sheet(),
    mass = s.mass.slice(),
    rest = s.restLength.slice(),
    damage = s.fieldDamage.slice();
  prepareMount(s, "hanging");
  assert.equal(
    s.pinned.reduce((a, b) => a + b),
    2 * 21,
  );
  for (let j = 0; j < 15; j++)
    for (let i = 0; i < 21; i++) {
      let n = j * 21 + i;
      assert.equal(s.pinned[n], +(j >= 13));
      assert.ok(s.position[3 * n + 2] >= -0.351 && s.position[3 * n + 2] <= 0);
    }
  assert.deepEqual(s.mass, mass);
  assert.deepEqual(s.restLength, rest);
  assert.deepEqual(s.fieldDamage, damage);
  assert.ok(s.position.every(Number.isFinite));
  const rail = hangingRail(s);
  assert.equal(rail.length, 32);
  assert.ok(rail.every(Number.isFinite));
  assert.ok(rail[0] < s.position[3 * 13 * 21] && rail[16] > s.position[3 * (14 * 21 + 20)]);
});
test("stretched setup preserves the original pose and constraints exactly", () => {
  const s = sheet(),
    p = s.position.slice(),
    pins = s.pinned.slice();
  prepareMount(s, "frame");
  assert.deepEqual(s.position, p);
  assert.deepEqual(s.pinned, pins);
});
test("tool frames preserve distance, invert exactly, and point out of each fabric plane", () => {
  for (const mount of ["frame", "hanging"])
    for (const p of [
      [0.1, -0.2, 0.03],
      [-1, 2, 3],
      [0, 0, 0],
    ]) {
      assert.deepEqual(fromToolSpace(toToolSpace(p, mount), mount), p);
      assert.equal(Math.hypot(...toToolSpace(p, mount)), Math.hypot(...p));
    }
  assert.deepEqual(fromToolSpace([0, 0, 1], "hanging"), [0, -1, 0]);
});
test("hanging fit camera includes sheet width on desktop, phone, and landscape within the scene depth range", () => {
  for (const aspect of [1280 / 800, 390 / 780, 320 / 640, 844 / 390]) {
    const c = mountCamera("hanging", "reset", aspect, { fovY: 0.35 });
    const width = 2 * c.distance * Math.tan(c.fovY / 2) * aspect;
    assert.ok(width >= 0.68 - 1e-12);
    assert.ok(c.distance < 2);
    assert.ok(c.fovY > 0 && c.fovY < Math.PI / 2);
  }
});
