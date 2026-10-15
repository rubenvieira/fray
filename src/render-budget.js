// Change only drawing-buffer pixels. The cloth lattice, solver timestep, camera,
// and CSS-space touch coordinates keep their existing resolution and scale.
const MIN_SCALE = 0.7;
const SLOW_MS = 24;
const FAST_MS = 14;
const MAX_SAMPLE_GAP_MS = 2500;

export function scaleRenderSize(size, scale) {
  const ratio = Number.isFinite(scale) ? Math.max(MIN_SCALE, Math.min(1, scale)) : 1;
  return {
    ...size,
    width: Math.max(1, Math.floor(size.width * ratio)),
    height: Math.max(1, Math.floor(size.height * ratio)),
  };
}

export function createRenderBudget() {
  let scale = 1;
  let lastAt = null;
  let cooldownUntil = -Infinity;
  let slowMs = 0,
    slowSamples = 0,
    slowWindows = 0;
  let fastMs = 0,
    fastSamples = 0;

  function clearEvidence() {
    slowMs = slowSamples = slowWindows = fastMs = fastSamples = 0;
  }
  function change(next, now, cooldown) {
    const bounded = Math.round(Math.max(MIN_SCALE, Math.min(1, next)) * 100) / 100;
    clearEvidence();
    if (bounded !== scale) {
      scale = bounded;
      cooldownUntil = now + cooldown;
    }
    return scale;
  }

  return {
    get scale() {
      return scale;
    },
    sample({ gpuFrameMs, gpuSamples, now, enabled = true }) {
      // Idle, captures, and dialogs cannot supply evidence about touch latency.
      if (
        !enabled ||
        !Number.isFinite(now) ||
        !Number.isFinite(gpuFrameMs) ||
        gpuFrameMs <= 0 ||
        !Number.isFinite(gpuSamples) ||
        gpuSamples < 1
      ) {
        clearEvidence();
        lastAt = null;
        return scale;
      }
      if (lastAt !== null && (now <= lastAt || now - lastAt > MAX_SAMPLE_GAP_MS)) {
        clearEvidence();
        lastAt = null;
      }
      const elapsed = lastAt === null ? 0 : now - lastAt;
      lastAt = now;
      // Ignore windows spanning a resize before deciding whether it helped.
      if (now < cooldownUntil) {
        clearEvidence();
        return scale;
      }
      if (gpuFrameMs > SLOW_MS) {
        slowMs += elapsed;
        slowSamples += gpuSamples;
        slowWindows++;
        fastMs = fastSamples = 0;
        if (slowWindows >= 2 && slowMs >= 1000 && slowSamples >= 8) return change(scale - 0.1, now, 2500);
      } else if (gpuFrameMs < FAST_MS) {
        fastMs += elapsed;
        fastSamples += gpuSamples;
        slowMs = slowSamples = slowWindows = 0;
        // Restore detail gently; a fast frame immediately after reducing pixels
        // must not trigger an oscillation back to the expensive size.
        if (fastMs >= 6000 && fastSamples >= 90) return change(scale + 0.05, now, 4000);
      } else clearEvidence();
      return scale;
    },
    reset() {
      const changed = scale !== 1;
      scale = 1;
      lastAt = null;
      cooldownUntil = -Infinity;
      clearEvidence();
      return changed;
    },
  };
}
