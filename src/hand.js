// Reserve this step's travel as well as the distance needed to brake. Using the
// continuous stopping speed alone lets a discrete hand step overshoot the finger.
export function targetSpeed(distance, dt, maxSpeed, maxAccel) {
  if (![distance, dt, maxSpeed, maxAccel].every(Number.isFinite)) return 0;
  if (distance <= 0 || dt <= 0 || maxSpeed <= 0 || maxAccel <= 0) return 0;

  const accelerationStep = maxAccel * dt;
  // Equivalent to sqrt((a * dt)^2 + 2 * a * distance) - a * dt, written
  // without subtracting nearly equal values when the hand is near its target.
  const brakingSpeed =
    (2 * maxAccel * distance) /
    (Math.sqrt(accelerationStep * accelerationStep + 2 * maxAccel * distance) + accelerationStep);
  return Math.min(maxSpeed, brakingSpeed, distance / dt);
}
