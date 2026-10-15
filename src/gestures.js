// Give a second finger a brief chance to join before a tap can puncture the cloth.
// A deliberate drag commits immediately; camera gestures stay latched until all
// fingers lift so a finishing pinch cannot turn back into a tear.
const TOUCH_INTENT_MS = 55;
const TOUCH_DRAG_PX = 4;
const POINTER_FIELDS = [
  `pointerId`,
  `pointerType`,
  `clientX`,
  `clientY`,
  `timeStamp`,
  `pressure`,
  `width`,
  `height`,
  `button`,
  `buttons`,
  `isPrimary`,
  `tangentialPressure`,
  `tiltX`,
  `tiltY`,
  `twist`,
  `altitudeAngle`,
  `azimuthAngle`,
];

function snapshot(event, fallback = event) {
  const copy = {};
  for (const field of POINTER_FIELDS) copy[field] = event[field] ?? fallback[field];
  return copy;
}

export function bindStageGestures(
  canvas,
  {
    enabled,
    framing,
    pointer,
    cancel,
    send,
    play,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
    now = () => performance.now(),
  },
) {
  const touches = new Map();
  const active = new Set();
  const cloth = new Map();
  const abort = new AbortController();
  let orbit = null;
  let navigating = false;
  let previous = null;
  let pending = null;

  function geometry() {
    const [a, b] = [...touches.values()];
    if (!a || !b) return null;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
  }
  function discardPending() {
    if (!pending) return;
    clearTimer(pending.timer);
    if (pending.frame !== null) cancelFrame?.(pending.frame);
    pending = null;
  }
  function ready(time) {
    if (enabled()) return true;
    if (cloth.size) cancel(time);
    reset();
    return false;
  }
  function clothPointer(phase, event) {
    pointer(phase, event);
    cloth.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  function commitPending() {
    if (!pending) return;
    const contact = pending;
    discardPending();
    if (!ready(contact.down.timeStamp) || framing()) return;
    play();
    clothPointer(`down`, contact.down);
    for (const sample of contact.samples) clothPointer(`move`, sample);
  }
  function samples(event) {
    const coalesced = event.getCoalescedEvents?.() || [];
    const result = coalesced.map((sample) => snapshot(sample, event));
    const last = result.at(-1);
    if (!last || last.clientX !== event.clientX || last.clientY !== event.clientY) result.push(snapshot(event));
    return result;
  }
  function moveOrbit(event) {
    send({ type: `orbit`, yaw: (event.clientX - orbit.x) * 0.006, pitch: (event.clientY - orbit.y) * 0.006 });
    orbit = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }
  function down(event) {
    if (!ready(event.timeStamp) || (event.pointerType === `mouse` && event.button !== 0 && event.button !== 2)) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    active.add(event.pointerId);
    if (event.pointerType === `touch`) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size > 1) {
        discardPending();
        if (!navigating) {
          // A released tap may still be waiting on a GPU pick. Navigation also
          // cancels that work, even though no local cloth pointer remains down.
          cancel(event.timeStamp);
          cloth.clear();
        }
        navigating = true;
        orbit = null;
        previous = geometry();
        return;
      }
      if (navigating) return;
    }
    if (framing() || event.button === 2) {
      orbit = { id: event.pointerId, x: event.clientX, y: event.clientY };
      return;
    }
    if (event.pointerType === `touch`) {
      const contact = (pending = { down: snapshot(event), samples: [], timer: null, frame: null });
      const deadline = now() + TOUCH_INTENT_MS;
      const finish = () => {
        if (pending === contact) commitPending();
      };
      // Mobile browsers can defer timers for about 100 ms after a trusted touch.
      // Animation frames still run: check the same intent deadline there while
      // keeping a timer fallback for environments without animation callbacks.
      const check = () => {
        if (pending !== contact) return;
        if (now() >= deadline) finish();
        else contact.frame = requestFrame(check);
      };
      contact.timer = setTimer(finish, TOUCH_INTENT_MS);
      if (requestFrame) contact.frame = requestFrame(check);
      return;
    }
    play();
    clothPointer(`down`, event);
  }
  function move(event) {
    if (!ready(event.timeStamp)) return;
    if (touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (navigating) {
      const next = geometry();
      if (next && previous) {
        send({ type: `orbit`, yaw: (next.x - previous.x) * 0.006, pitch: (next.y - previous.y) * 0.006 });
        send({ type: `zoom`, deltaY: 1250 * Math.log(previous.distance / next.distance) });
      }
      previous = next;
      return;
    }
    if (orbit?.id === event.pointerId) {
      moveOrbit(event);
      return;
    }
    if (framing() || (event.pointerType === `touch` && !active.has(event.pointerId))) return;
    const points = samples(event);
    if (pending?.down.pointerId === event.pointerId) {
      pending.samples.push(...points);
      if (
        points.some(
          (sample) =>
            Math.hypot(sample.clientX - pending.down.clientX, sample.clientY - pending.down.clientY) >= TOUCH_DRAG_PX,
        )
      )
        commitPending();
      return;
    }
    if (event.pointerType === `touch` && !cloth.has(event.pointerId)) return;
    for (const sample of points) {
      if (cloth.has(event.pointerId)) clothPointer(`move`, sample);
      else pointer(`move`, sample); // Preserve mouse and pen hover.
    }
  }
  function end(event) {
    if (!active.has(event.pointerId) || !ready(event.timeStamp)) return;
    if (pending?.down.pointerId === event.pointerId) {
      if (event.type === `pointerup` && !framing()) commitPending();
      else discardPending();
    }
    active.delete(event.pointerId);
    touches.delete(event.pointerId);
    if (navigating) {
      previous = geometry();
      if (!touches.size) navigating = false;
      return;
    }
    if (orbit?.id === event.pointerId) {
      if (event.type === `pointerup`) moveOrbit(event);
      orbit = null;
      return;
    }
    if (!cloth.has(event.pointerId)) return;
    const released = event.type === `pointerup` && !framing();
    if (released) {
      // Some browsers deliver the final travelled distance only on pointerup.
      // Feed that segment to cutting tools before their stroke is retired.
      for (const sample of samples(event)) {
        const last = cloth.get(event.pointerId);
        if (sample.clientX !== last.x || sample.clientY !== last.y) clothPointer(`move`, sample);
      }
    }
    pointer(released ? `up` : `cancel`, event);
    cloth.delete(event.pointerId);
  }
  function wheel(event) {
    event.preventDefault();
    if (!ready(event.timeStamp)) return;
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    send({ type: framing() ? `zoom` : `wheel`, deltaY: event.deltaY * multiplier });
  }
  for (const [name, handler] of [
    [`pointerdown`, down],
    [`pointermove`, move],
    [`pointerup`, end],
    [`pointercancel`, end],
    [`lostpointercapture`, end],
    [`contextmenu`, (event) => event.preventDefault()],
  ]) {
    canvas.addEventListener(name, handler, { signal: abort.signal });
  }
  canvas.addEventListener(`wheel`, wheel, { passive: false, signal: abort.signal });
  function reset() {
    discardPending();
    const ids = [...active];
    active.clear();
    cloth.clear();
    touches.clear();
    previous = null;
    navigating = false;
    orbit = null;
    for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  return {
    reset,
    destroy() {
      reset();
      abort.abort();
    },
  };
}
