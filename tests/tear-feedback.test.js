import test from "node:test";
import assert from "node:assert/strict";
import { createTearFeedback } from "../src/tear-feedback.js";

function fixture() {
  let time = 1000;
  let enabled = true;
  const pulses = [];
  const feedback = createTearFeedback({
    now: () => time,
    enabled: () => enabled,
    vibrate: (duration) => {
      pulses.push(duration);
      return true;
    },
  });
  return {
    feedback,
    pulses,
    advance: (ms) => (time += ms),
    enable: (value) => (enabled = value),
    pointer: (phase, pointerType = `touch`, pointerId = 1) => feedback.pointer(phase, { pointerType, pointerId }),
  };
}

test(`only actual damage during a recent cloth touch pulses; mouse and idle damage do not`, () => {
  const f = fixture();
  f.feedback.tear({ ruptures: 10 });
  f.pointer(`down`, `mouse`);
  f.feedback.tear({ ruptures: 10 });
  f.pointer(`down`);
  f.feedback.tear({ ruptures: 0 });
  assert.deepEqual(f.pulses, []);
  f.feedback.tear({ ruptures: 1 });
  assert.deepEqual(f.pulses, [9]);
  f.advance(700);
  f.feedback.tear({ ruptures: 20 });
  assert.deepEqual(f.pulses, [9, 0]);
});

test(`dense fracture reports stay separated and large tears have a bounded pulse`, () => {
  const f = fixture();
  f.pointer(`down`);
  f.feedback.tear({ ruptures: 1 });
  f.advance(30);
  f.feedback.tear({ ruptures: 1 });
  f.advance(20);
  f.feedback.tear({ ruptures: 1000000 });
  assert.deepEqual(f.pulses, [9, 24]);
});

test(`the final tear survives a brief release tail but cancellation clears it`, () => {
  const f = fixture();
  f.pointer(`down`);
  f.pointer(`up`);
  f.advance(100);
  f.feedback.tear({ ruptures: 1 });
  f.advance(50);
  f.feedback.tear({ ruptures: 1 });
  assert.deepEqual(f.pulses, [9, 0]);
  f.pointer(`down`);
  f.pointer(`cancel`);
  f.feedback.tear({ ruptures: 1 });
  assert.deepEqual(f.pulses, [9, 0]);
});

test(`blocking play and resetting cancel feedback and suppress queued reports`, () => {
  const f = fixture();
  f.pointer(`down`);
  f.feedback.tear({ pulledOut: 1 });
  assert.ok(f.pulses[0] >= 6 && f.pulses[0] < 9);
  f.enable(false);
  f.feedback.tear({ ruptures: 100 });
  assert.equal(f.pulses.at(-1), 0);
  f.feedback.reset();
  f.enable(true);
  f.advance(60);
  f.feedback.tear({ ruptures: 100 });
  assert.equal(f.pulses.length, 2);
});

test(`unavailable vibration APIs cannot interrupt a touch interaction`, () => {
  const feedback = createTearFeedback({
    now: () => 1000,
    enabled: () => true,
    vibrate: () => {
      throw Error(`Unavailable`);
    },
  });
  feedback.pointer(`down`, { pointerType: `touch`, pointerId: 1 });
  assert.doesNotThrow(() => feedback.tear({ ruptures: 1 }));
  assert.doesNotThrow(() => feedback.reset());
});
