import test from "node:test";
import assert from "node:assert/strict";
import { yarnSelection, YarnHand } from "../src/yarn-grip.js";
const scene = { layers: [{ bundle: [4, 5], material: { pitchU: 0.004, pitchV: 0.01 } }] };
const record = (heldA, family = 0, start = 20, count = 8, yarn = 7) => [
  (heldA ? 128 : 32) | (family << 4),
  (start << 16) | yarn,
  count,
  0,
];
test("a selected yarn keeps its cut-end identity while crossings retreat", () => {
  const first = yarnSelection(record(true), [0.1, 0, -0.2], scene);
  const grown = yarnSelection(record(true, 0, 15, 13), [0.1, 0.01, -0.2], scene);
  assert.deepEqual(first.id, grown.id);
  assert.equal(first.front, 19);
  assert.equal(grown.front, 14);
  assert.ok(Math.abs(grown.length - first.length - 0.005) < 1e-12);
  assert.equal(first.direction, -1);
  const reverse = yarnSelection(record(false, 1), [0, 0, 0], scene);
  assert.equal(reverse.direction, 1);
  assert.equal(reverse.front, 28);
  assert.equal(reverse.id[3], 19);
  assert.equal(reverse.length, 0.017);
  assert.notDeepEqual(first.id, yarnSelection(record(true, 1), [0, 0, 0], scene).id);
  assert.notDeepEqual(first.id, yarnSelection(record(true, 0, 20, 8, 8), [0, 0, 0], scene).id);
});
test("borders, bridges and invalid picks cannot masquerade as exposed ends", () => {
  for (const word of [0, 160, 256, 320, 64])
    assert.equal(yarnSelection([word, (20 << 16) | 7, 8, 0], [0, 0, 0], scene), null);
  assert.equal(yarnSelection(record(true), [NaN, 0, 0], scene), null);
  assert.equal(yarnSelection(record(true), [0, 0], scene), null);
  assert.equal(yarnSelection([128, (20 << 16) | 7, 0, 0], [0, 0, 0], scene), null);
});

test("a precision grip cannot lift or unpick by itself and remains acceleration bounded", () => {
  const h = new YarnHand([0.1, 0.02, -0.2]);
  for (let i = 0; i < 240; i++) h.step(1 / 120, [0, 0, 0]);
  assert.deepEqual(h.target, [0.1, 0.02, -0.2]);
  let previous = [...h.velocity];
  for (let i = 0; i < 120; i++) {
    h.step(1 / 120, [0.03, -0.01, 0]);
    assert.ok(Math.hypot(...h.velocity.map((v, k) => v - previous[k])) <= 2 / 120 + 1e-10);
    previous = [...h.velocity];
  }
  assert.ok(Math.abs(h.target[0] - 0.13) < 1e-5);
  assert.equal(h.target[2], -0.2);
  const frozen = [...h.target];
  h.step(0, [1, 1, 1]);
  assert.deepEqual(h.target, frozen);
});
