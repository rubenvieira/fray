import test from "node:test";
import assert from "node:assert/strict";
import { releaseWGSL } from "../src/yarn-release.js";
// Execute production scalar WGSL arithmetic with type syntax removed. Expected
// behavior comes from irreversibility, physical-time composition and slip bounds.
function helper(name) {
  const m = new RegExp("fn " + name + "\\(([^)]*)\\) -> f32 \\{").exec(releaseWGSL);
  let end = m.index + m[0].length,
    depth = 1;
  const start = end;
  while (depth) {
    if (releaseWGSL[end] === "{") depth++;
    if (releaseWGSL[end] === "}") depth--;
    end++;
  }
  const args = m[1].split(",").map((v) => v.split(":")[0].trim());
  return new Function("max", "min", "exp", "select", `return function(${args}){${releaseWGSL.slice(start, end - 1)}}`)(
    Math.max,
    Math.min,
    Math.exp,
    (a, b, c) => (c ? b : a),
  );
}
const cohesive = helper("advanceCohesion"),
  pull = helper("advancePull"),
  duration = helper("fractureTime");
test("cohesion is irreversible, bounded and independent of physical timestep splitting", () => {
  for (const tau of [0.012, 0.018, 0.04])
    for (const old of [0, 0.2, 0.7])
      for (const target of [0, 0.4, 1]) {
        const next = cohesive(old, target, 0.03, tau),
          half = cohesive(cohesive(old, target, 0.015, tau), target, 0.015, tau);
        assert.ok(next >= old && next <= Math.max(old, target));
        assert.ok(Math.abs(next - half) < 1e-12);
        assert.equal(cohesive(old, target, 0, tau), old);
      }
  assert.equal(cohesive(0, 0, 1, 0.012), 0);
  for (const crimp of [0.01, 0.03, 0.05]) {
    assert.ok(cohesive(0, 1, 1 / 120, duration(crimp)) < 0.99, "a new overload first softens the yarn");
    assert.ok(cohesive(0, 1, 0.05, duration(crimp)) > 0.99, "committed fracture finishes promptly");
  }
});
test("free ends advance only under sufficient load, at a bounded crossing rate", () => {
  for (const crimp of [0.01, 0.03, 0.05])
    for (const drive of [0, 0.01, 1, 100]) {
      const next = pull(0.2, drive, 1 / 120, crimp);
      assert.ok(next >= 0.2 && next <= 1);
      assert.ok(next - 0.2 <= 23 / 120);
      assert.equal(pull(0.2, drive, 0, crimp), 0.2);
    }
  assert.equal(pull(0.7, 0, 10, 0.03), 0.7);
  assert.ok(pull(0, 1, 1 / 120, 0.05) < pull(0, 1, 1 / 120, 0.01));
  assert.equal(pull(0.99, 10, 1, 0.01), 1);
});
