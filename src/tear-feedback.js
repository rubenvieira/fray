// Tactile feedback follows confirmed material separation, never pointer speed.
// A short release tail lets the GPU report the last tear after the finger lifts.
export function createTearFeedback({ now, enabled, vibrate }) {
  const touches = new Set();
  let lastTouch = -Infinity;
  let releasedAt = -Infinity;
  let lastPulse = -Infinity;
  let vibrating = false;

  function stop() {
    if (vibrating) {
      try {
        vibrate(0);
      } catch {}
    }
    vibrating = false;
  }

  function reset() {
    touches.clear();
    lastTouch = releasedAt = lastPulse = -Infinity;
    stop();
  }

  return {
    pointer(phase, event) {
      if (event.pointerType !== `touch`) return;
      const id = event.pointerId;
      if (phase === `down`) {
        touches.add(id);
        lastTouch = now();
        releasedAt = -Infinity;
      } else if (touches.has(id)) {
        if (phase === `cancel`) {
          touches.delete(id);
          if (!touches.size) reset();
        } else {
          lastTouch = now();
          if (phase === `up`) {
            touches.delete(id);
            if (!touches.size) releasedAt = lastTouch;
          }
        }
      }
    },
    tear({ ruptures = 0, pulledOut = 0 }) {
      const time = now();
      const recent = touches.size ? time - lastTouch <= 650 : time - releasedAt <= 140;
      if (!enabled() || !recent) {
        stop();
        return;
      }
      const broken = Number.isFinite(ruptures) ? Math.max(0, ruptures) : 0;
      const loosened = Number.isFinite(pulledOut) ? Math.max(0, pulledOut) : 0;
      const damage = broken + loosened * 0.35;
      if (damage <= 0 || time - lastPulse < 50) return;
      const duration = Math.min(24, Math.round(6 + 3 * Math.log2(1 + damage)));
      try {
        vibrating = vibrate(duration) !== false;
        lastPulse = time;
      } catch {}
    },
    reset,
  };
}
