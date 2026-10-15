import test from "node:test";
import assert from "node:assert/strict";
import { createGripFeedback } from "../src/grip-feedback.js";
function fixture() {
  let time = 0,
    state;
  return {
    cue: createGripFeedback({ now: () => time, render: (s) => (state = s) }),
    get state() {
      return state;
    },
    setTime: (t) => (time = t),
  };
}
test("resistance follows measured load, stays finite, and clears on release or cancellation", () => {
  const f = fixture();
  f.cue.pointer("down", { pointerId: 1 });
  f.cue.sample(2);
  const light = f.state.level;
  f.cue.sample(30);
  assert.ok(f.state.level > light);
  assert.equal(f.state.label, "Pulling hard.");
  for (const value of [NaN, Infinity, -1, 1e9]) {
    f.cue.sample(value);
    assert.ok(Number.isFinite(f.state.level));
    assert.ok(f.state.level >= 0 && f.state.level <= 1);
  }
  f.cue.pointer("up", { pointerId: 1 });
  assert.deepEqual(f.state, { active: false, level: 0, tearing: false, label: null });
  f.cue.sample(100);
  assert.equal(f.state.level, 0, "late GPU samples cannot revive a released cue");
  f.cue.pointer("down", { pointerId: 2 });
  f.cue.sample(10);
  f.cue.pointer("cancel", { pointerId: 2 });
  assert.equal(f.state.active, false);
});
test("only confirmed separation gives the tear cue and its short tail expires", () => {
  const f = fixture();
  f.cue.pointer("down", { pointerId: 1 });
  f.cue.sample(120);
  assert.equal(f.state.tearing, false);
  f.cue.tear({ ruptures: 0, pulledOut: 0 });
  assert.equal(f.state.tearing, false);
  f.cue.tear({ pulledOut: 1 });
  assert.equal(f.state.label, "Threads giving way.");
  f.setTime(250);
  f.cue.sample(4);
  assert.equal(f.state.label, "Under tension.");
  f.cue.reset();
  f.cue.tear({ ruptures: 20 });
  assert.equal(f.state.tearing, false);
});
