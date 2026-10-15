import test from "node:test";
import assert from "node:assert/strict";
import { createRenderBudget, scaleRenderSize } from "../src/render-budget.js";

function feed(budget, now, gpuFrameMs = 35, gpuSamples = 30, enabled = true) {
  return budget.sample({ now, gpuFrameMs, gpuSamples, enabled });
}
function slowStart(budget) {
  feed(budget, 1000);
  assert.equal(feed(budget, 2000), 0.9);
}

test("sustained slow interaction lowers drawing resolution in a bounded step", () => {
  const budget = createRenderBudget();
  assert.equal(feed(budget, 1000), 1, "one expensive window is not enough evidence");
  assert.equal(feed(budget, 2000), 0.9);
  assert.equal(budget.scale, 0.9);
});

test("idle and missing GPU samples cannot degrade resolution or join separated slow gestures", () => {
  const budget = createRenderBudget();
  for (let now = 0; now < 5000; now += 1000) assert.equal(feed(budget, now, 80, 0), 1);
  feed(budget, 5000);
  feed(budget, 6000, 80, 0);
  assert.equal(feed(budget, 7000), 1, "idle clears the previous slow observation");
  assert.equal(feed(budget, 11000), 1, "a long interval without statistics also clears evidence");
  assert.equal(feed(budget, 12000), 0.9);
});

test("a few isolated slow frames never count as a sustained GPU bottleneck", () => {
  const budget = createRenderBudget();
  for (let now = 1000; now <= 3000; now += 1000) assert.equal(feed(budget, now, 60, 1), 1);
  assert.equal(feed(budget, 4000, 60, 4), 1, "fewer than eight actual frames are insufficient");
  assert.equal(feed(budget, 5000, 60, 1), 0.9);
});

test("cooldown prevents repeated resizes and scale never falls below 0.7", () => {
  const budget = createRenderBudget();
  let previous = 1;
  const changes = [];
  for (let now = 1000; now <= 30000; now += 1000) {
    const scale = feed(budget, now, 100);
    assert.ok(scale >= 0.7 && scale <= 1);
    if (scale !== previous) changes.push({ now, scale });
    previous = scale;
  }
  assert.deepEqual(
    changes.map(({ scale }) => scale),
    [0.9, 0.8, 0.7],
  );
  for (let i = 1; i < changes.length; i++) assert.ok(changes[i].now - changes[i - 1].now >= 2500);
});

test("neutral load and alternating fast/slow windows do not oscillate quality", () => {
  const budget = createRenderBudget();
  slowStart(budget);
  for (let now = 3000; now < 15000; now += 1000) assert.equal(feed(budget, now, 20), 0.9);
  for (let now = 15000; now < 45000; now += 1000) {
    assert.equal(feed(budget, now, now % 2000 ? 12 : 30), 0.9);
  }
});

test("recovery requires sustained fast interaction and restores detail gradually", () => {
  const budget = createRenderBudget();
  slowStart(budget);
  assert.equal(feed(budget, 3000, 9), 0.9);
  const changes = [];
  let previous = 0.9;
  for (let now = 4000; now <= 30000; now += 1000) {
    const scale = feed(budget, now, 9);
    if (scale !== previous) changes.push({ now, scale });
    previous = scale;
  }
  assert.deepEqual(
    changes.map(({ scale }) => scale),
    [0.95, 1],
  );
  assert.ok(changes[0].now >= 9000, "fast frames after resizing do not cause an immediate rebound");
  assert.ok(changes[1].now - changes[0].now >= 6000);
  assert.equal(budget.scale, 1);
});

test("fast frames with insufficient interactive samples do not prematurely restore quality", () => {
  const budget = createRenderBudget();
  slowStart(budget);
  for (let now = 3000; now < 20000; now += 1000) assert.equal(feed(budget, now, 9, 1), 0.9);
});

test("recording, framing, and capture suspension retains quality and discards timing evidence", () => {
  const budget = createRenderBudget();
  slowStart(budget);
  for (let now = 3000; now < 9000; now += 1000) assert.equal(feed(budget, now, 80, 30, false), 0.9);
  assert.equal(feed(budget, 9000, 80), 0.9);
  assert.equal(feed(budget, 10000, 80), 0.8);
});

test("restoring full resolution clears old evidence for exports and a new fabric", () => {
  const budget = createRenderBudget();
  slowStart(budget);
  assert.equal(budget.reset(), true);
  assert.equal(budget.scale, 1);
  assert.equal(budget.reset(), false, "no resize is needed when already at full quality");
  assert.equal(feed(budget, 3000), 1);
  assert.equal(feed(budget, 4000), 0.9);
});

test("malformed timing data cannot alter scale or combine with valid slow observations", () => {
  for (const invalid of [
    { gpuFrameMs: NaN },
    { gpuFrameMs: Infinity },
    { gpuFrameMs: 0 },
    { gpuFrameMs: -1 },
    { gpuSamples: NaN },
    { gpuSamples: Infinity },
    { gpuSamples: -1 },
    { gpuSamples: 0.5 },
    { now: NaN },
    { now: Infinity },
  ]) {
    const budget = createRenderBudget();
    feed(budget, 1000);
    assert.equal(budget.sample({ now: 2000, gpuFrameMs: 80, gpuSamples: 30, ...invalid }), 1);
    assert.equal(feed(budget, 3000), 1);
  }
});

test("nonmonotonic timestamps restart the observation window", () => {
  const budget = createRenderBudget();
  feed(budget, 2000);
  assert.equal(feed(budget, 1000), 1);
  assert.equal(feed(budget, 1000), 1);
  assert.equal(feed(budget, 2000), 0.9);
});

test("adaptive pixels leave CSS-space size intact and preserve safe integer buffers", () => {
  const full = { width: 663, height: 1434, cssWidth: 390, cssHeight: 844 };
  assert.deepEqual(scaleRenderSize(full, 0.7), { width: 464, height: 1003, cssWidth: 390, cssHeight: 844 });
  assert.deepEqual(scaleRenderSize(full, 1), full);
  assert.deepEqual(scaleRenderSize(full, Infinity), full);
  assert.deepEqual(scaleRenderSize(full, 2), full);
  assert.deepEqual(scaleRenderSize(full, 0.1), scaleRenderSize(full, 0.7));
  assert.deepEqual(scaleRenderSize({ width: 1, height: 1, cssWidth: 1, cssHeight: 1 }, 0.7), {
    width: 1,
    height: 1,
    cssWidth: 1,
    cssHeight: 1,
  });
  assert.deepEqual(full, { width: 663, height: 1434, cssWidth: 390, cssHeight: 844 }, "input size is not mutated");
});
