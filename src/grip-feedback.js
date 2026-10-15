// The cue describes measured spring load, never pointer speed or a predicted tear.
export function createGripFeedback({ now, render }) {
  const pointers = new Set();
  let tearingUntil = -Infinity;
  let force = 0;
  function update() {
    const active = pointers.size > 0;
    const tearing = active && now() < tearingUntil;
    const level = active ? Math.log1p(Math.max(0, Math.min(120, force))) / Math.log(121) : 0;
    const label = !active
      ? null
      : tearing
        ? "Threads giving way."
        : force > 15
          ? "Pulling hard."
          : force > 2
            ? "Under tension."
            : "Feel the weave.";
    render({ active, level, tearing, label });
  }
  return {
    pointer(phase, event) {
      if (phase === "down") {
        if (!pointers.size) force = 0;
        pointers.add(event.pointerId);
      } else if (phase === "up" || phase === "cancel") pointers.delete(event.pointerId);
      if (!pointers.size) {
        force = 0;
        tearingUntil = -Infinity;
      }
      update();
    },
    sample(value) {
      if (!pointers.size) return;
      force = Number.isFinite(value) ? Math.max(0, Math.min(120, value)) : 0;
      update();
    },
    tear({ ruptures = 0, pulledOut = 0 }) {
      if (pointers.size && (ruptures > 0 || pulledOut > 0)) {
        tearingUntil = now() + 240;
        update();
      }
    },
    reset() {
      pointers.clear();
      force = 0;
      tearingUntil = -Infinity;
      update();
    },
  };
}
