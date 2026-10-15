import test from "node:test";
import assert from "node:assert/strict";
import { targetSpeed } from "../src/hand.js";

const maxSpeed = 2.5;
const maxAccel = 60;

// Integrate the bounded hand controller, including its existing acceleration
// limit, so these assertions describe motion rather than duplicating the formula.
function hand() {
  return {
    position: 0,
    velocity: 0,
    step(target, dt) {
      const error = target - this.position;
      const desired = Math.sign(error) * targetSpeed(Math.abs(error), dt, maxSpeed, maxAccel);
      const previousVelocity = this.velocity;
      const change = Math.max(-maxAccel * dt, Math.min(maxAccel * dt, desired - previousVelocity));
      this.velocity += change;
      this.position += this.velocity * dt;
      assert.ok(Math.abs(this.velocity) <= maxSpeed + 1e-12, `speed is bounded`);
      assert.ok(Math.abs(this.velocity - previousVelocity) <= maxAccel * dt + 1e-12, `acceleration is bounded`);
      assert.ok(Number.isFinite(this.position), `position stays finite`);
    },
  };
}

test(`a held target settles without overshoot at different distances and step rates`, () => {
  for (const dt of [1 / 240, 1 / 120, 1 / 60, 1 / 30]) {
    for (const distance of [0.0001, 0.001, 0.01, 0.1, 0.2]) {
      for (const direction of [-1, 1]) {
        const moving = hand();
        let previous = 0;
        for (let i = 0; i < Math.ceil(1 / dt); i++) {
          moving.step(direction * distance, dt);
          const progress = direction * moving.position;
          assert.ok(progress >= previous - 1e-12, `a stationary target never causes recoil`);
          assert.ok(progress <= distance + 1e-12, `the hand never passes the finger`);
          previous = progress;
        }
        assert.ok(Math.abs(moving.position - direction * distance) < 1e-8, `the hand reaches the target`);
        assert.ok(Math.abs(moving.velocity) < 1e-8, `the hand comes to rest`);
      }
    }
  }
});

test(`the 10cm pull settles promptly without the previous 9mm overshoot`, () => {
  const moving = hand();
  for (let i = 0; i < 12; i++) {
    moving.step(0.1, 1 / 120);
    assert.ok(moving.position <= 0.1 + 1e-12);
  }
  assert.ok(Math.abs(moving.position - 0.1) < 0.0001, `within 0.1mm after 100ms`);
});

test(`reversing a fast pull respects acceleration and settles without oscillation`, () => {
  for (const dt of [1 / 240, 1 / 120, 1 / 60]) {
    const moving = hand();
    for (let i = 0; i < Math.ceil(0.04 / dt); i++) moving.step(0.2, dt);
    assert.ok(moving.velocity > 0, `the hand is moving before reversal`);

    let movingBack = false;
    for (let i = 0; i < Math.ceil(1 / dt); i++) {
      moving.step(-0.1, dt);
      if (moving.velocity < 0) movingBack = true;
      if (movingBack) assert.ok(moving.velocity <= 1e-12, `no rebound once the hand turns toward the new target`);
      assert.ok(moving.position >= -0.1 - 1e-12, `the hand does not pass the reversed target`);
    }
    assert.ok(Math.abs(moving.position + 0.1) < 1e-8);
    assert.ok(Math.abs(moving.velocity) < 1e-8);
  }
});

test(`invalid input and no remaining travel produce no requested motion`, () => {
  for (const distance of [0, -1, NaN, Infinity]) assert.equal(targetSpeed(distance, 1 / 120, maxSpeed, maxAccel), 0);
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(targetSpeed(0.1, dt, maxSpeed, maxAccel), 0);
  assert.equal(targetSpeed(0.1, 1 / 120, 0, maxAccel), 0);
  assert.equal(targetSpeed(0.1, 1 / 120, maxSpeed, 0), 0);
  assert.ok(targetSpeed(1e-16, 1 / 120, maxSpeed, maxAccel) > 0, `tiny remaining distances retain precision`);
});
