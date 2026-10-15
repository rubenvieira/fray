import test from "node:test";
import assert from "node:assert/strict";
import { bindStageGestures } from "../src/gestures.js";

class Canvas extends EventTarget {
  captures = new Set();
  clientHeight = 600;
  focus() {}
  setPointerCapture(id) {
    this.captures.add(id);
  }
  hasPointerCapture(id) {
    return this.captures.has(id);
  }
  releasePointerCapture(id) {
    this.captures.delete(id);
  }
}

function fixture({ framed = false, enabled = true, withFrames = false, deferTimers = false } = {}) {
  const canvas = new Canvas();
  const pointers = [],
    events = [],
    messages = [],
    cancellations = [],
    timers = new Map(),
    frames = new Map();
  let plays = 0,
    now = 0,
    timerId = 0,
    frameId = 0;
  const gestures = bindStageGestures(canvas, {
    enabled: () => enabled,
    framing: () => framed,
    pointer: (phase, event) => {
      pointers.push({ phase, id: event.pointerId, x: event.clientX });
      events.push(event);
    },
    cancel: (time) => cancellations.push(time),
    send: (message) => messages.push(message),
    play: () => plays++,
    setTimer: (callback, delay) => {
      const id = ++timerId;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    requestFrame: withFrames
      ? (callback) => {
          const id = ++frameId;
          frames.set(id, callback);
          return id;
        }
      : undefined,
    cancelFrame: (id) => frames.delete(id),
    now: () => now,
  });
  function advance(ms) {
    const target = now + ms;
    if (deferTimers) {
      now = target;
      return;
    }
    for (;;) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > target) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
    }
    now = target;
  }
  function frame(ms = 16) {
    advance(ms);
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(now);
  }
  function emit(type, attributes = {}) {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, `timeStamp`, { value: now });
    Object.assign(
      event,
      {
        pointerId: 1,
        pointerType: `touch`,
        clientX: 100,
        clientY: 100,
        pressure: type === `pointerup` ? 0 : 0.5,
        width: 10,
        height: 12,
        button: 0,
        buttons: type === `pointerup` ? 0 : 1,
      },
      attributes,
    );
    canvas.dispatchEvent(event);
    return event;
  }
  return {
    emit,
    advance,
    frame,
    frames,
    pointers,
    events,
    messages,
    cancellations,
    gestures,
    canvas,
    timers,
    plays: () => plays,
    setEnabled: (value) => (enabled = value),
    setFramed: (value) => (framed = value),
  };
}

const phases = (f) => f.pointers.map(({ phase }) => phase);

test(`one finger commits promptly and keeps coalesced moves and release in order`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  assert.equal(f.pointers.length, 0);
  f.emit(`pointermove`, {
    clientX: 130,
    getCoalescedEvents: () => [
      { pointerId: 1, clientX: 115 },
      { pointerId: 1, clientX: 130 },
    ],
  });
  f.emit(`pointerup`, { clientX: 130 });
  f.emit(`lostpointercapture`);
  f.advance(100);
  assert.deepEqual(f.pointers, [
    { phase: `down`, id: 1, x: 100 },
    { phase: `move`, id: 1, x: 115 },
    { phase: `move`, id: 1, x: 130 },
    { phase: `up`, id: 1, x: 130 },
  ]);
  assert.equal(f.plays(), 1);
});

test(`a hold commits after 55 ms with the original contact metadata`, () => {
  const f = fixture();
  const event = f.emit(`pointerdown`, { pressure: 0.7, width: 18, height: 24, tiltX: 12 });
  event.clientX = 900;
  f.advance(54);
  assert.equal(f.pointers.length, 0);
  f.advance(1);
  assert.deepEqual(f.pointers, [{ phase: `down`, id: 1, x: 100 }]);
  assert.equal(f.events[0].pointerType, `touch`);
  assert.equal(f.events[0].pressure, 0.7);
  assert.equal(f.events[0].width, 18);
  assert.equal(f.events[0].height, 24);
  assert.equal(f.events[0].tiltX, 12);
  assert.equal(f.events[0].timeStamp, 0);
});

test(`a quick tap preserves tap tools without waiting for the intent timer`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.advance(15);
  f.emit(`pointerup`);
  assert.deepEqual(phases(f), [`down`, `up`]);
  assert.equal(f.events[0].pressure, 0.5);
  assert.equal(f.events[1].pressure, 0);
  assert.equal(f.events[1].timeStamp, 15);
  f.advance(100);
  assert.deepEqual(phases(f), [`down`, `up`]);
});

test(`a quick second finger starts camera navigation without any cloth contact`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.advance(35);
  f.emit(`pointerdown`, { pointerId: 2, clientX: 200 });
  f.advance(100);
  f.emit(`pointermove`, { pointerId: 2, clientX: 250, clientY: 120 });
  assert.equal(f.pointers.length, 0);
  assert.equal(f.plays(), 0);
  assert.equal(f.cancellations.length, 1);
  assert.ok(f.messages.some((message) => message.type === `zoom` && message.deltaY < 0));
  assert.ok(f.messages.some((message) => message.type === `orbit` && message.yaw > 0 && message.pitch > 0));
});

test(`a second finger cancels an already committed tear exactly once`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.emit(`pointermove`, { clientX: 108 });
  f.advance(10);
  f.emit(`pointerdown`, { pointerId: 2, clientX: 200 });
  f.emit(`pointerdown`, { pointerId: 3, clientX: 250 });
  f.emit(`pointermove`, { clientX: 150 });
  assert.deepEqual(phases(f), [`down`, `move`]);
  assert.deepEqual(f.cancellations, [10]);
});

test(`remaining and replacement fingers cannot tear until every pinch finger lifts`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.emit(`pointerdown`, { pointerId: 2, clientX: 200 });
  f.emit(`pointerup`, { pointerId: 2 });
  f.emit(`pointermove`, { clientX: 150 });
  f.emit(`pointerdown`, { pointerId: 3, clientX: 200 });
  f.emit(`pointerup`);
  f.emit(`pointermove`, { pointerId: 3, clientX: 250 });
  f.advance(100);
  assert.equal(f.pointers.length, 0);
  f.emit(`pointerup`, { pointerId: 3 });
  f.emit(`pointerdown`, { pointerId: 4 });
  f.emit(`pointerup`, { pointerId: 4 });
  assert.deepEqual(phases(f), [`down`, `up`]);
});

test(`four pixels commits a drag immediately, including motion in coalesced samples`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.emit(`pointermove`, {
    getCoalescedEvents: () => [{ clientX: 104 }, { clientX: 100 }],
  });
  assert.deepEqual(
    f.pointers.map(({ x }) => x),
    [100, 104, 100],
  );
  assert.equal(f.timers.size, 0);
});

test(`subthreshold motion is retained when a held touch commits`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.emit(`pointermove`, { clientX: 102 });
  f.emit(`pointermove`, { clientX: 103 });
  assert.equal(f.pointers.length, 0);
  f.advance(55);
  assert.deepEqual(
    f.pointers.map(({ x }) => x),
    [100, 102, 103],
  );
});

for (const type of [`pointercancel`, `lostpointercapture`]) {
  test(`${type} discards a pending contact without synthesizing a tap`, () => {
    const f = fixture();
    f.emit(`pointerdown`);
    f.emit(`pointermove`, { clientX: 102 });
    f.emit(type, { clientX: 140 });
    f.advance(100);
    assert.equal(f.pointers.length, 0);
    assert.equal(f.plays(), 0);
    assert.equal(f.timers.size, 0);
  });
}

test(`release contributes its final travelled segment before ending the stroke`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.advance(15);
  f.emit(`pointerup`, { clientX: 150 });
  assert.deepEqual(f.pointers, [
    { phase: `down`, id: 1, x: 100 },
    { phase: `move`, id: 1, x: 150 },
    { phase: `up`, id: 1, x: 150 },
  ]);
  assert.equal(f.events[1].timeStamp, 15);
});

test(`release keeps coalesced motion and the final event endpoint`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.emit(`pointermove`, { clientX: 110 });
  f.emit(`pointerup`, {
    clientX: 150,
    getCoalescedEvents: () => [{ clientX: 120 }, { clientX: 140 }],
  });
  assert.deepEqual(
    f.pointers.map(({ x }) => x),
    [100, 110, 120, 140, 150, 150],
  );
  assert.deepEqual(phases(f), [`down`, `move`, `move`, `move`, `move`, `up`]);
});

test(`cancellation never extends an already committed stroke to its endpoint`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.emit(`pointermove`, { clientX: 110 });
  f.emit(`pointercancel`, { clientX: 500 });
  assert.deepEqual(phases(f), [`down`, `move`, `cancel`]);
});

for (const pointerType of [`mouse`, `pen`]) {
  test(`${pointerType} starts immediately without a touch intent timer`, () => {
    const f = fixture();
    f.emit(`pointerdown`, { pointerType });
    assert.deepEqual(phases(f), [`down`]);
    assert.equal(f.timers.size, 0);
    f.emit(`pointerup`, { pointerType });
    assert.deepEqual(phases(f), [`down`, `up`]);
  });
}

test(`frame mode orbits immediately and zooms without touching cloth`, () => {
  const f = fixture({ framed: true });
  f.emit(`pointerdown`);
  assert.equal(f.timers.size, 0);
  f.emit(`pointermove`, { clientX: 125 });
  f.emit(`pointerup`, { clientX: 130 });
  const wheel = f.emit(`wheel`, { deltaY: -30, deltaMode: 0 });
  assert.equal(f.pointers.length, 0);
  assert.equal(f.plays(), 0);
  assert.deepEqual(f.messages, [
    { type: `orbit`, yaw: 25 * 0.006, pitch: 0 },
    { type: `orbit`, yaw: 5 * 0.006, pitch: 0 },
    { type: `zoom`, deltaY: -30 },
  ]);
  assert.equal(wheel.defaultPrevented, true);
});

test(`reset removes timers and capture before late cancellation or a fresh gesture`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.gestures.reset();
  assert.equal(f.canvas.captures.size, 0);
  assert.equal(f.timers.size, 0);
  f.advance(100);
  f.emit(`pointercancel`);
  assert.equal(f.pointers.length, 0);
  f.emit(`pointerdown`, { pointerId: 3 });
  f.emit(`pointerup`, { pointerId: 3 });
  assert.deepEqual(
    f.pointers.map(({ id }) => id),
    [3, 3],
  );
});

test(`destroy while a touch is pending cannot send a delayed contact`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.gestures.destroy();
  f.advance(100);
  f.emit(`pointerdown`, { pointerId: 2 });
  f.emit(`pointerup`, { pointerId: 2 });
  assert.equal(f.pointers.length, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.canvas.captures.size, 0);
});

test(`disabled canvas sends no commands and ordinary wheel normalizes line units`, () => {
  const blocked = fixture({ enabled: false });
  blocked.emit(`pointerdown`);
  blocked.emit(`pointermove`, { clientX: 200 });
  blocked.emit(`wheel`, { deltaY: 3, deltaMode: 1 });
  blocked.advance(100);
  assert.equal(blocked.pointers.length + blocked.messages.length, 0);
  const active = fixture();
  active.emit(`wheel`, { deltaY: 3, deltaMode: 1 });
  assert.deepEqual(active.messages, [{ type: `wheel`, deltaY: 48 }]);
});

test(`disabling during the intent window discards the touch and releases capture`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.setEnabled(false);
  f.advance(55);
  f.emit(`pointerup`);
  assert.equal(f.pointers.length, 0);
  assert.equal(f.canvas.captures.size, 0);
  f.setEnabled(true);
  f.emit(`pointerdown`);
  f.emit(`pointerup`);
  assert.deepEqual(phases(f), [`down`, `up`]);
});

test(`disabling during an active drag cancels it instead of processing release motion`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.emit(`pointermove`, { clientX: 110 });
  f.setEnabled(false);
  f.advance(10);
  f.emit(`pointerup`, { clientX: 300 });
  assert.deepEqual(phases(f), [`down`, `move`]);
  assert.deepEqual(f.cancellations, [10]);
  assert.equal(f.canvas.captures.size, 0);
});

test(`entering frame mode during the intent window does not commit a delayed tear`, () => {
  const f = fixture();
  f.emit(`pointerdown`);
  f.setFramed(true);
  f.advance(55);
  f.setFramed(false);
  f.emit(`pointermove`, { clientX: 150 });
  f.emit(`pointerup`);
  assert.equal(f.pointers.length, 0);
});

test(`animation frames honor the intent deadline when mobile touch defers timers`, () => {
  const f = fixture({ withFrames: true, deferTimers: true });
  f.emit(`pointerdown`);
  f.frame(16);
  f.frame(16);
  f.frame(16);
  assert.deepEqual(phases(f), []);
  f.frame(16);
  assert.deepEqual(phases(f), [`down`]);
  assert.equal(f.timers.size, 0);
  assert.equal(f.frames.size, 0);
  f.frame(100);
  assert.deepEqual(phases(f), [`down`], `frame and timer cannot commit the same contact twice`);
});

test(`a timely fallback timer cancels its pending animation frame`, () => {
  const f = fixture({ withFrames: true });
  f.emit(`pointerdown`);
  f.advance(55);
  assert.deepEqual(phases(f), [`down`]);
  assert.equal(f.frames.size, 0);
  f.frame(16);
  assert.deepEqual(phases(f), [`down`]);
});

for (const reason of [`drag`, `tap`, `cancel`, `capture lost`, `pinch`, `reset`, `destroy`, `disabled`]) {
  test(`${reason} cancels both intent schedulers without leaving a delayed touch`, () => {
    const f = fixture({ withFrames: true, deferTimers: true });
    f.emit(`pointerdown`);
    const staleFrame = [...f.frames.values()][0];
    const staleTimer = [...f.timers.values()][0].callback;
    f.frame(16);
    if (reason === `drag`) f.emit(`pointermove`, { clientX: 110 });
    else if (reason === `tap`) f.emit(`pointerup`);
    else if (reason === `cancel`) f.emit(`pointercancel`);
    else if (reason === `capture lost`) f.emit(`lostpointercapture`);
    else if (reason === `pinch`) f.emit(`pointerdown`, { pointerId: 2 });
    else if (reason === `disabled`) {
      f.setEnabled(false);
      f.frame(50);
    } else f.gestures[reason]();
    const expected = reason === `drag` ? [`down`, `move`] : reason === `tap` ? [`down`, `up`] : [];
    assert.deepEqual(phases(f), expected);
    assert.equal(f.timers.size, 0);
    assert.equal(f.frames.size, 0);
    staleFrame();
    staleTimer();
    f.frame(100);
    assert.deepEqual(phases(f), expected);
  });
}

test(`a stationary pinch cancels pending worker work from a previously released tap`, () => {
  const f = fixture({ withFrames: true, deferTimers: true });
  f.emit(`pointerdown`);
  f.emit(`pointerup`);
  assert.deepEqual(phases(f), [`down`, `up`]);
  f.advance(10);
  f.emit(`pointerdown`, { pointerId: 2 });
  f.emit(`pointerdown`, { pointerId: 3, clientX: 200 });
  f.frame(100);
  assert.deepEqual(phases(f), [`down`, `up`]);
  assert.deepEqual(f.cancellations, [10], `cancel does not depend on a camera move or current cloth contact`);
  assert.deepEqual(f.messages, []);
});

test(`an old frame callback cannot commit a replacement touch before its own deadline`, () => {
  const f = fixture({ withFrames: true, deferTimers: true });
  f.emit(`pointerdown`);
  const oldFrame = [...f.frames.values()][0];
  const oldTimer = [...f.timers.values()][0].callback;
  f.emit(`pointercancel`);
  f.advance(100);
  f.emit(`pointerdown`, { pointerId: 2 });
  oldFrame();
  oldTimer();
  assert.deepEqual(phases(f), []);
  f.frame(54);
  assert.deepEqual(phases(f), []);
  f.frame(1);
  assert.deepEqual(f.pointers, [{ phase: `down`, id: 2, x: 100 }]);
});
