import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { targetSpeed } from "../src/hand.js";

const source = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `worker section exists: ${start}`);
  return source.slice(from, to);
}

// Exercise the production engine and hand state machines without starting WebGPU,
// loading assets, or evaluating the renderer's shader strings.
const engineSource = section("$ = new (class {", "\nIn.onmessage =")
  .replace("$ = new (class {", "globalThis.Engine = class {")
  .replace(/\}\)\(\);\s*$/, "};");
const handSource = section("const I = {", "function Le(e)") + section("const z = {", "function Ke(e)");
const cameraMath = vm.runInNewContext(section("function S()", "var oe =") + "({ A, O, T, ne, k })");
const flush = () => new Promise((resolve) => setImmediate(resolve));
const plain = (value) => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fixture({ projected = false } = {}) {
  let now = 1000;
  const messages = [],
    picks = [],
    cuts = [],
    targets = [],
    released = [],
    frames = [],
    steps = [],
    completions = [];
  let projections = 0,
    attachments = 0,
    topologyRequests = 0;
  const context = vm.createContext({
    targetSpeed,
    X: (message) => messages.push(plain(message)),
    k: projected ? cameraMath.k : { target: [0, 0, 0], distance: 0.98, pitch: 0.16, yaw: 0 },
    sn: 1,
    Q: 1 / 120,
    Rn: (time) => time,
    performance: { now: () => now },
    In: { requestAnimationFrame() {} },
    A: (...args) => {
      projections++;
      return projected ? cameraMath.A(...args) : { viewProj: [], eye: [0, 0, 1] };
    },
    O: cameraMath.O,
    T: cameraMath.T,
    ne: cameraMath.ne,
    E: (v) => v.map((x) => x / Math.hypot(...v)),
    w: (a, b) => a.map((x, i) => x - b[i]),
    te: (v, scale) => v.map((x) => x * scale),
    KNIFE: { pickWindow: 0.012 },
    TOOLS: ["hand", "blade", "claw", "fist", "pin"],
    Ot: { duration: 0.1, newtonIterations: 4 },
    GPUMapMode: { READ: 1 },
  });
  vm.runInContext(handSource + section("const FIST = {", "const Q =") + engineSource, context);
  const engine = new context.Engine();
  Object.assign(engine, {
    ready: true,
    width: 390,
    height: 844,
    cssWidth: 390,
    cssHeight: 844,
    lastFrame: 1000,
    lastPresent: 1000,
    statsTime: 1000,
    interaction: {
      pickAt(...args) {
        const pick = { ...deferred(), args };
        picks.push(pick);
        return pick.promise;
      },
      holder: () => -1,
      freeSlot: () => 0,
      attach() {
        attachments++;
        return true;
      },
      setTarget(target, slot) {
        targets.push({ target: Array.from(target), slot });
      },
      setPinch() {},
      letGo(slot) {
        released.push(slot);
      },
      release() {},
      releaseAll() {},
    },
    topology: {
      request() {
        topologyRequests++;
        return Promise.resolve();
      },
      reset() {},
    },
    body: { count: 0, tickWind() {}, clearStrokes() {}, cut: (a, b) => cuts.push([a, b]) },
    planePoint: projected ? context.Engine.prototype.planePoint : (grip, point) => [point.x / 1000, point.y / 1000, 0],
    stepProps() {},
    reacquireSignal() {},
    captureIfRequested() {},
    context: { canvas: {}, getCurrentTexture: () => ({ createView() {} }) },
    renderer: {
      encode() {
        frames.push(now);
      },
      resetTopology() {},
      resize() {},
    },
    solver: Object.fromEntries(
      ["x", "segs", "tails", "field", "v", "ext", "counters", "acousticSources"].map((key) => [key, { size: 16 }]),
    ),
    device: {
      createCommandEncoder: () => ({ finish() {}, copyBufferToBuffer() {}, clearBuffer() {} }),
      queue: {
        submit() {},
        writeBuffer() {},
        onSubmittedWorkDone() {
          const done = deferred();
          completions.push(done);
          return done.promise;
        },
      },
    },
  });
  engine.solver.encodeSubstep = () => steps.push(engine.simTime);
  function point(phase, x = 0, y = 0, time = now, id = 1) {
    engine.pointer({ phase, id, x, y, time, pointerType: "touch", width: 12, height: 12 });
  }
  function hit(index, node = index + 1) {
    picks[index].resolve({ node, position: [0, 0, 0], window: {} });
  }
  return {
    engine,
    messages,
    picks,
    cuts,
    targets,
    released,
    frames,
    steps,
    completions,
    point,
    hit,
    setNow: (time) => (now = time),
    projections: () => projections,
    attachments: () => attachments,
    topologyRequests: () => topologyRequests,
  };
}

test("a quick hand release survives a pending pick and applies its endpoint before letting go", async () => {
  const f = fixture();
  f.point("down");
  f.point("move", 40, 0, 1010);
  f.point("up", 80, 0, 1020);
  assert.equal(f.engine.down.get(1).upTime, 1020);
  assert.equal(f.engine.picking.size, 1);
  f.setNow(1040);
  f.hit(0);
  await flush();
  assert.equal(f.attachments(), 1);

  const grip = f.engine.grips.get(1);
  const requested = [];
  const step = grip.hand.step.bind(grip.hand);
  grip.hand.step = (dt, goal) => {
    requested.push(Array.from(goal));
    step(dt, goal);
  };
  f.engine.stepHandles(1 / 120, 1040);
  assert.ok(requested[0][0] > 0 && requested[0][0] < 0.08, "the short gesture replays through its path");
  f.engine.stepHandles(1 / 120, 1049);
  f.engine.stepHandles(1 / 120, 1058);
  assert.deepEqual(requested.at(-1), [0.08, 0, 0]);
  assert.equal(f.targets.length, 3);
  assert.ok(f.targets[0].target[0] > 0, "the release moves the real bounded hand");
  assert.equal(f.released.length, 0, "the target survives for a solver step");
  f.engine.stepHandles(1 / 120, 1067);
  assert.deepEqual(f.released, [0]);
  assert.equal(f.engine.grips.size, 0);
  assert.equal(f.engine.down.size, 0);
});

test("a grip resolved before release applies its final coordinate for exactly one substep", async () => {
  const f = fixture();
  f.point("down");
  f.hit(0);
  await flush();
  f.engine.stepHandles(1 / 120, 1008);
  f.point("up", 80, 0, 1010);
  f.engine.stepHandles(1 / 120, 1017);
  assert.equal(f.engine.grips.get(1).finalSampled, true);
  assert.equal(f.targets.length, 2);
  assert.equal(f.released.length, 0);
  f.engine.stepHandles(1 / 120, 1025);
  assert.equal(f.targets.length, 2);
  assert.equal(f.released.length, 1);
});

test("a delayed hand pick replays at most 50ms of recent movement, including slow motion", async () => {
  for (const timeScale of [1, 0.25, 0.05]) {
    const f = fixture();
    f.engine.timeScale = timeScale;
    f.point("down");
    f.point("move", 60, 0, 1060);
    f.point("up", 100, 0, 1100);
    f.setNow(1120);
    f.hit(0);
    await flush();
    const grip = f.engine.grips.get(1);
    assert.equal(grip.replayTime, 1050);
    let steps = 0;
    while (!grip.finalSampled && steps < 10) {
      f.engine.stepHandles(1 / 120, 1120 + steps * 9);
      steps++;
    }
    assert.equal(grip.finalSampled, true);
    assert.ok(steps <= Math.ceil(0.05 * timeScale * 120) + 1, "replay cannot become a slow-motion tail");
    assert.equal(f.released.length, 0);
    f.engine.stepHandles(1 / 120, 1220);
    assert.equal(f.released.length, 1);
  }
});

async function recordedPull({ fps, timeScale, pickDelay, duration = 150, hold = 250 }) {
  const f = fixture();
  f.engine.timeScale = timeScale;
  const events = [
    { at: 0, kind: "down", order: 0 },
    { at: pickDelay, kind: "pick", order: 3 },
    { at: duration + hold, kind: "up", order: 2 },
  ];
  for (let at = 1000 / 120; at < duration; at += 1000 / 120) events.push({ at, kind: "move", order: 1 });
  events.push({ at: duration, kind: "move", order: 1 });
  for (let frame = 1; frame <= Math.ceil(((duration + hold + 300) * fps) / 1000); frame++) {
    events.push({ at: (frame * 1000) / fps, kind: "frame", order: 4 });
  }
  events.sort((a, b) => a.at - b.at || a.order - b.order);
  const motion = [];
  for (const { at, kind } of events) {
    f.setNow(1000 + at);
    if (kind === "down") f.point("down", 0, 0, 1000 + at);
    if (kind === "move") f.point("move", 100 * Math.min(1, at / duration), 0, 1000 + at);
    if (kind === "up") f.point("up", 100, 0, 1000 + at);
    if (kind === "pick") {
      f.hit(0);
      await flush();
    }
    if (kind === "frame") {
      f.engine.frame(1000 + at);
      for (const completion of f.completions) completion.resolve();
      await flush();
      motion.push({ at, x: f.targets.at(-1)?.target[0] ?? 0, released: f.released.length > 0 });
    }
  }
  return { ...f, motion };
}

test("recorded pulls follow the input clock at normal and slow speed across mobile frame rates", async () => {
  for (const fps of [60, 30, 15]) {
    for (const timeScale of [1, 0.2]) {
      for (const pickDelay of [0, 40, 100]) {
        const f = await recordedPull({ fps, timeScale, pickDelay });
        const endpoint = f.motion.find(({ at }) => at >= 150 - 1e-6);
        const arrived = f.motion.find(({ x }) => x >= 0.099);
        const description = `${fps}fps, speed ${timeScale}, pick delay ${pickDelay}ms`;
        assert.ok(endpoint.x >= 0.084, `input clock avoids slow-motion hand lag: ${description}`);
        assert.ok(arrived && arrived.at <= 200 + 1e-6, `within 1mm on the next visible frame: ${description}`);
        assert.ok(Math.abs(f.motion.at(-1).x - 0.1) < 1e-6, description);
        assert.equal(f.released.length, 1, description);
        assert.equal(f.engine.grips.size, 0, description);
      }
    }
  }
});

test("short flicks deliver comparable hand travel across slow motion and frame rates without a release hold", async () => {
  for (const pickDelay of [0, 40, 100]) {
    const endings = [];
    for (const fps of [60, 30, 15]) {
      for (const timeScale of [1, 0.2]) {
        const f = await recordedPull({ fps, timeScale, pickDelay, duration: 60, hold: 0 });
        const final = f.motion.at(-1).x;
        endings.push(final);
        assert.ok(final > 0.068, "a quick release must not discard nearly all of a slow-mode pull");
        assert.ok(final < 0.09, "the hand retains its acceleration bound instead of snapping to the endpoint");
        assert.equal(f.released.length, 1);
        assert.equal(f.engine.grips.size, 0);
        const released = f.motion.findIndex(({ released }) => released);
        assert.ok(released >= 0);
        assert.ok(
          f.motion.slice(released).every(({ x }) => x === final),
          "no hand force continues after release",
        );
      }
    }
    assert.ok(
      Math.max(...endings) - Math.min(...endings) < 0.006,
      "frame cadence and slow motion do not change the pull's effective travel",
    );
  }
});

test("input microsteps follow recorded corners while pins retain the physical timestep", async () => {
  const f = fixture();
  f.engine.timeScale = 0.2;
  f.point("down");
  f.hit(0);
  await flush();
  f.point("move", 50, 0, 1025);
  f.point("move", 50, 50, 1050);
  const grip = f.engine.grips.get(1);
  const goals = [],
    times = [],
    pinTimes = [];
  const step = grip.hand.step.bind(grip.hand);
  grip.hand.step = (dt, goal) => {
    times.push(dt);
    goals.push(Array.from(goal));
    step(dt, goal);
  };
  f.engine.grips.set("pin", {
    pinned: true,
    slot: 1,
    hand: { target: [0, 0, 0], pinch: 1, step: (dt) => pinTimes.push(dt) },
  });
  f.engine.stepHandles(1 / 120, 1050, 1 / 60);
  assert.ok(
    Math.abs(times.reduce((sum, dt) => sum + dt, 0) - 0.05) < 1e-12,
    "input time includes frames without a solver step",
  );
  assert.ok(times.every((dt) => dt <= 1 / 120 + 1e-12));
  assert.ok(
    goals.some(([x, y]) => x === 0.05 && y === 0),
    "the recorded turn survives a large input interval",
  );
  assert.deepEqual(goals.at(-1), [0.05, 0.05, 0]);
  assert.deepEqual(pinTimes, [1 / 120]);
  assert.equal(f.engine.simTime, 1 / 120);
});

test("resuming a stalled hand bounds input catch-up and cancel or pause prevents late targets", async () => {
  const stalled = fixture();
  stalled.point("down");
  stalled.hit(0);
  await flush();
  stalled.point("move", 100, 0, 2000);
  const hand = stalled.engine.grips.get(1).hand;
  stalled.engine.stepHandles(1 / 120, 2000);
  assert.ok(hand.age <= 0.1 + 1e-12, "a long stall never replays unbounded input history");

  for (const reason of ["cancel", "pause"]) {
    const f = fixture();
    f.point("down");
    f.hit(0);
    await flush();
    f.point("move", 100, 0, 1100);
    if (reason === "cancel") f.point("cancel", 100, 0, 1100);
    else f.engine.setPaused(true);
    f.engine.frame(1117);
    assert.equal(f.targets.length, 0, reason);
    assert.equal(f.engine.grips.size, 0, reason);
  }
});

test("shared camera matrices preserve curved pulls and refresh after a camera or viewport change", async () => {
  const optimized = fixture({ projected: true });
  const reference = fixture({ projected: true });
  const originalPlanePoint = reference.engine.planePoint;
  reference.engine.planePoint = function (grip, point) {
    return originalPlanePoint.call(this, grip, point);
  };
  for (const f of [optimized, reference]) {
    f.point("down", 195, 422);
    f.hit(0);
    await flush();
    f.point("move", 230, 422, 1030);
    f.point("move", 245, 460, 1060);
    f.point("move", 225, 480, 1100);
  }
  const before = [optimized.projections(), reference.projections()];
  for (const f of [optimized, reference]) f.engine.stepHandles(1 / 120, 1100);
  assert.deepEqual(optimized.targets, reference.targets, "every projected hand target stays identical");
  assert.equal(optimized.projections() - before[0], 1);
  assert.equal(reference.projections() - before[1] - 1, 12, "reference recomputes each recorded input slice");
  for (const f of [optimized, reference]) {
    f.engine.camera = { ...f.engine.camera, yaw: 0.3, distance: 0.8 };
    f.engine.setSize(780, 1400, 390, 700);
    f.point("move", 240, 480, 1140);
    f.engine.stepHandles(1 / 120, 1140);
  }
  assert.deepEqual(optimized.targets, reference.targets, "the next batch uses the current view and viewport");
  assert.ok(optimized.targets.at(-1).target.every(Number.isFinite));
});

test("late, canceled, paused, and tool-switched hand picks cannot attach", async () => {
  for (const reason of ["late", "cancel", "pause", "tool"]) {
    const f = fixture();
    f.point("down");
    if (reason === "late") {
      f.point("up", 100, 0, 1020);
      f.setNow(1171);
    }
    if (reason === "cancel") f.point("cancel");
    if (reason === "pause") f.engine.setPaused(true);
    if (reason === "tool") f.engine.setTool("blade");
    f.hit(0);
    await flush();
    assert.equal(f.attachments(), 0, reason);
    assert.equal(f.engine.down.size, 0, reason);
    assert.equal(f.engine.picking.size, 0, reason);
  }
});

test("moving the camera invalidates picks made against its previous view", async () => {
  for (const move of [
    (engine) => engine.setCamera("detail"),
    (engine) => engine.zoom(-20),
    (engine) => engine.orbit(0.1, 0),
  ]) {
    const f = fixture();
    f.point("down");
    move(f.engine);
    f.hit(0);
    await flush();
    assert.equal(f.attachments(), 0);
    assert.equal(f.engine.picking.size, 0);
    assert.equal(f.engine.down.size, 0);
  }
});

test("resolution changes preserve pending cloth picks while CSS viewport changes invalidate them", async () => {
  for (const cssChanged of [false, true]) {
    const f = fixture();
    f.point("down");
    const token = f.engine.pickToken;
    f.engine.setSize(780, cssChanged ? 1600 : 1688, 390, cssChanged ? 800 : 844);
    assert.equal(f.engine.width, 780);
    assert.equal(f.engine.context.canvas.width, 780);
    assert.equal(f.engine.picking.size, cssChanged ? 0 : 1);
    assert.equal(f.engine.down.size, cssChanged ? 0 : 1);
    if (!cssChanged) assert.equal(f.engine.pickToken, token);
    f.hit(0);
    await flush();
    assert.equal(f.attachments(), cssChanged ? 0 : 1);
  }
});

test("a stale pick cannot replace a fresh gesture reusing the pointer ID", async () => {
  const f = fixture();
  f.point("down");
  f.point("up", 50, 0, 1010);
  f.point("down", 100, 0, 1020);
  assert.equal(f.picks.length, 2);
  f.hit(0);
  await flush();
  assert.equal(f.attachments(), 0);
  assert.equal(f.engine.down.get(1).first.x, 100);
  f.hit(1);
  await flush();
  assert.equal(f.attachments(), 1);
});

async function releasedPatchFixture() {
  const f = fixture();
  const cleanup = deferred();
  let reserved = false;
  let cleanups = 0;
  f.engine.interaction.holder = (node) => (node === 7 && reserved ? 0 : -1);
  f.engine.interaction.release = () => {
    reserved = false;
    cleanups++;
  };
  f.engine.interaction.releaseAll = () => {
    reserved = false;
  };
  f.engine.topology.request = () => cleanup.promise;
  f.point("down");
  f.hit(0, 7);
  await flush();
  reserved = true;
  f.point("cancel");
  return { ...f, cleanup, reserved: () => reserved, cleanups: () => cleanups };
}

test("a repeated pull waits for the released patch and picks its current state before attaching", async () => {
  const f = await releasedPatchFixture();
  f.point("down", 0, 0, 1010);
  f.point("move", 40, 0, 1030);
  f.hit(1, 7);
  await flush();
  assert.equal(f.attachments(), 1, "the old patch remains exclusively reserved during cleanup");
  assert.equal(f.engine.picking.size, 1, "the new gesture remains pending");
  assert.equal(f.engine.down.get(1).last.x, 40, "the finger's travelled path is retained");
  assert.deepEqual(f.released, [0], "the old hand is already released while the new one waits");
  f.cleanup.resolve();
  await flush();
  assert.equal(f.picks.length, 3, "topology completion triggers a fresh GPU pick");
  assert.equal(f.attachments(), 1, "a stale hit must never attach after cleanup");
  f.setNow(1040);
  f.hit(2, 7);
  await flush();
  assert.equal(f.attachments(), 2);
  f.engine.stepHandles(1 / 120, 1040);
  assert.ok(f.targets.at(-1).target[0] > 0.02, "the preserved drag moves the new bounded hand");
  assert.equal(f.engine.picking.size, 0);
  assert.equal(f.engine.releasing.size, 0);
});

test("a short pull completed during release cleanup retains its final path without extending the hold", async () => {
  const f = await releasedPatchFixture();
  f.point("down", 0, 0, 1010);
  f.point("move", 40, 0, 1030);
  f.point("up", 80, 0, 1050);
  f.hit(1, 7);
  await flush();
  f.setNow(1060);
  f.cleanup.resolve();
  await flush();
  f.hit(2, 7);
  await flush();
  assert.equal(f.attachments(), 2);
  for (let step = 0; step < 6; step++) f.engine.stepHandles(1 / 120, 1060 + 9 * step);
  assert.ok(f.targets.at(-1).target[0] > 0.04, "a completed gesture is not discarded");
  assert.deepEqual(f.released, [0, 0]);
  assert.equal(f.engine.grips.size, 0);
  assert.equal(f.engine.down.size, 0);
});

test("cancel, pause, camera, tool, and reset invalidate a pull waiting for release cleanup", async () => {
  for (const reason of ["cancel", "pause", "camera", "tool", "reset"]) {
    const f = await releasedPatchFixture();
    f.point("down", 0, 0, 1010);
    f.hit(1, 7);
    await flush();
    if (reason === "cancel") f.point("cancel", 0, 0, 1020, -1);
    if (reason === "pause") f.engine.setPaused(true);
    if (reason === "camera") f.engine.orbit(0.1, 0);
    if (reason === "tool") f.engine.setTool("blade");
    if (reason === "reset") {
      f.engine.snapshot = { x: {}, segs: {}, tails: {}, field: {} };
      f.engine.restoreCloth();
    }
    f.cleanup.resolve();
    await flush();
    assert.equal(f.picks.length, 2, `no stale repick after ${reason}`);
    assert.equal(f.attachments(), 1, reason);
    assert.equal(f.engine.picking.size, 0, reason);
    assert.equal(f.engine.down.size, 0, reason);
    assert.equal(f.engine.releasing.size, 0, reason);
  }
});

test("a newer gesture using the same ID replaces a pull waiting for cleanup", async () => {
  const f = await releasedPatchFixture();
  f.point("down", 0, 0, 1010);
  f.point("up", 40, 0, 1030);
  f.hit(1, 7);
  await flush();
  f.point("down", 100, 0, 1040);
  f.point("move", 140, 0, 1060);
  f.hit(2, 7);
  await flush();
  f.cleanup.resolve();
  await flush();
  assert.equal(f.picks.length, 4, "only the current gesture submits a replacement pick");
  assert.ok(Math.abs(f.picks[3].args[1] - 100) < 1e-10);
  f.hit(3, 7);
  await flush();
  assert.equal(f.attachments(), 2);
  assert.equal(f.engine.grips.get(1).track.first.x, 100);
});

test("expired gestures and failed cleanup do not attach from an old pick", async () => {
  for (const failure of ["expired", "readback", "miss", "pick"]) {
    const f = await releasedPatchFixture();
    f.point("down", 0, 0, 1010);
    f.point("up", 80, 0, 1050);
    f.hit(1, 7);
    await flush();
    f.setNow(failure === "expired" ? 1201 : 1060);
    if (failure === "readback") f.cleanup.reject(Error("readback failed"));
    else f.cleanup.resolve();
    await flush();
    if (failure === "miss") f.picks[2].resolve(null);
    if (failure === "pick") f.picks[2].reject(Error("fresh pick failed"));
    await flush();
    assert.equal(f.attachments(), 1, failure);
    assert.equal(f.engine.picking.size, 0, failure);
    assert.equal(f.engine.down.size, 0, failure);
    assert.equal(f.reserved(), false, "cleanup failure must not permanently occupy the slot");
    assert.equal(f.engine.releasing.size, 0, failure);
  }
});

test("a pull can wait for a free slot while all slots are reserved by released hands", async () => {
  const f = await releasedPatchFixture();
  f.engine.interaction.freeSlot = () => (f.reserved() ? -1 : 0);
  f.point("down", 0, 0, 1010);
  f.hit(1, 8);
  await flush();
  assert.equal(f.engine.picking.size, 1);
  f.cleanup.resolve();
  await flush();
  f.hit(2, 8);
  await flush();
  assert.equal(f.attachments(), 2);
  assert.equal(f.engine.grips.get(1).node, 8);
});

test("a fresh pick never displaces an active hand or pin", async () => {
  const f = await releasedPatchFixture();
  f.point("down", 0, 0, 1010);
  f.hit(1, 7);
  await flush();
  f.cleanup.resolve();
  await flush();
  f.engine.interaction.holder = () => 2;
  f.hit(2, 7);
  await flush();
  assert.equal(f.attachments(), 1);
  assert.equal(f.engine.picking.size, 0);
  assert.equal(f.engine.down.size, 0);
});

test("missed and rejected hand picks clear the pointer for another attempt", async () => {
  for (const reject of [false, true]) {
    const f = fixture();
    f.point("down");
    reject ? f.picks[0].reject(new Error("pick failed")) : f.picks[0].resolve(null);
    await flush();
    assert.equal(f.engine.down.size, 0);
    assert.equal(f.engine.picking.size, 0);
    f.point("down");
    assert.equal(f.picks.length, 2);
  }
});

test("touch proximity stays consistent in CSS pixels and responds to bounded contact size", () => {
  const { engine } = fixture();
  for (const scale of [1, 1.5, 2, 3]) {
    engine.height = engine.cssHeight * scale;
    const radius = (width, blade = false) =>
      engine.pickRadius({ pointerType: "touch", width, height: width }, blade) / scale;
    assert.equal(radius(1), 20);
    assert.equal(radius(40), 24);
    assert.equal(radius(100), 28);
    assert.equal(radius(1, true), 12);
    assert.equal(radius(100, true), 18);
    assert.ok(engine.pickRadius({ pointerType: "mouse" }) / scale < radius(1));
  }
});

test("knife picks retain a queued corner and release endpoint", async () => {
  const f = fixture();
  f.engine.setTool("blade");
  f.point("down");
  f.point("move", 12, 0, 1010);
  f.point("move", 12, 12, 1020);
  f.point("up", 20, 12, 1030);
  for (let i = 0; i < 4; i++) {
    f.hit(i, i + 10);
    await flush();
  }
  assert.deepEqual(
    f.picks.map(({ args }) => args.slice(1, 3)),
    [
      [0, 0],
      [12, 0],
      [12, 12],
      [20, 12],
    ],
  );
  assert.deepEqual(f.cuts, [
    [10, 10],
    [10, 11],
    [11, 12],
    [12, 13],
  ]);
  assert.equal(f.engine.strokes.size, 0);
});

test("knife path bounds its queue without dropping a sharp corner or the release endpoint", async () => {
  const f = fixture();
  f.engine.setTool("blade");
  f.point("down");
  for (let x = 5; x <= 100; x += 5) f.point("move", x, 0, 1001 + x / 10);
  for (let y = 5; y <= 100; y += 5) f.point("move", 100, y, 1011 + y / 10);
  f.point("up", 100, 105, 1030);
  assert.ok(f.engine.strokes.get(1).pending.length <= 12);
  for (let i = 0; i < f.picks.length; i++) {
    f.hit(i);
    await flush();
  }
  const samples = f.picks.map(({ args }) => args.slice(1, 3));
  assert.ok(samples.some(([x, y]) => Math.abs(x - 100) < 1e-9 && Math.abs(y) < 1e-9));
  assert.ok(Math.hypot(samples.at(-1)[0] - 100, samples.at(-1)[1] - 105) < 1e-9);
  assert.equal(f.engine.strokes.size, 0);
});

test("a sparse long knife swipe fills intermediate picks and reaches its release endpoint", async () => {
  const f = fixture();
  f.engine.setTool("blade");
  f.point("down");
  f.point("up", 360, 100, 1030);
  for (let i = 0; i < f.picks.length; i++) {
    assert.ok(i < 100, "the interpolated path must finish");
    f.hit(i);
    await flush();
  }
  const samples = f.picks.map(({ args }) => args.slice(1, 3));
  assert.ok(samples.length > 10);
  for (let i = 1; i < samples.length; i++) {
    assert.ok(Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]) <= 24 + 1e-9);
  }
  assert.ok(Math.hypot(samples.at(-1)[0] - 360, samples.at(-1)[1] - 100) < 1e-9);
  assert.equal(f.engine.strokes.size, 0);
});

test("a knife pick miss breaks the cut instead of bridging empty space", async () => {
  const f = fixture();
  f.engine.setTool("blade");
  f.point("down");
  f.point("move", 10, 0);
  f.point("up", 20, 0);
  f.hit(0, 10);
  await flush();
  f.picks[1].resolve(null);
  await flush();
  f.hit(2, 30);
  await flush();
  assert.deepEqual(f.cuts, [
    [10, 10],
    [30, 30],
  ]);
});

test("canceled, tool-switched, and expired knife picks cannot leave delayed cuts", async () => {
  for (const reason of ["cancel", "tool", "late"]) {
    const f = fixture();
    f.engine.setTool("blade");
    f.point("down");
    f.point("move", 20, 20);
    if (reason === "cancel") f.point("cancel");
    if (reason === "tool") f.engine.setTool("hand");
    if (reason === "late") {
      f.point("up", 40, 40, 1020);
      f.setNow(1221);
    }
    f.hit(0);
    await flush();
    assert.equal(f.cuts.length, 0, reason);
    assert.equal(f.engine.strokes.size, 0, reason);
  }
});

test("rejection of a canceled knife pick cannot delete a fresh stroke with the same ID", async () => {
  const f = fixture();
  f.engine.setTool("blade");
  f.point("down");
  f.point("cancel");
  f.point("down", 50, 0);
  const current = f.engine.strokes.get(1);
  f.picks[0].reject(new Error("old GPU readback failed"));
  await flush();
  assert.equal(f.engine.strokes.get(1), current);
  f.hit(1);
  await flush();
  assert.equal(f.cuts.length, 1);
});

function clawFixture() {
  const f = fixture();
  const poses = [];
  delete f.engine.stepProps;
  f.engine.planeHit = (x, y, z) => [x / 1000, y / 1000, z];
  f.engine.body.hasPrev = false;
  f.engine.body.setPose = function (capsules) {
    poses.push({ capsules: plain(capsules), hasPrev: this.hasPrev });
    this.count = capsules.length;
    this.hasPrev = true;
  };
  f.engine.setTool("claw");
  return { ...f, poses };
}

test("a claw swipe completed between frames applies its start, turn, and final contact before removal", () => {
  const f = clawFixture();
  f.point("down");
  f.point("move", 50, 0, 1010);
  f.point("up", 50, 60, 1020);
  for (let i = 0; i < 3; i++) f.engine.stepProps(1 / 120);
  assert.deepEqual(
    f.poses.map(({ capsules }) => capsules[1].b.slice(0, 2)),
    [
      [0, 0],
      [0.05, 0],
      [0.05, 0.06],
    ],
  );
  assert.ok(f.poses.every(({ capsules }) => capsules.length === 3 && capsules.every(({ sharp }) => sharp)));
  assert.equal(f.engine.claws.size, 1, "the final pose remains for its contact substep");
  f.engine.stepProps(1 / 120);
  assert.equal(f.engine.claws.size, 0);
  assert.deepEqual(f.poses.at(-1).capsules, []);
});

test("claw history remains bounded while retaining sharp turns and its final point", () => {
  const f = clawFixture();
  f.point("down");
  for (let x = 5; x <= 100; x += 5) f.point("move", x, 0);
  for (let y = 5; y <= 100; y += 5) f.point("move", 100, y);
  f.point("up", 100, 105);
  assert.ok(f.engine.claws.get(1).pending.length <= 8);
  for (let i = 0; f.engine.claws.size; i++) {
    assert.ok(i < 10, "bounded history finishes in a bounded number of steps");
    f.engine.stepProps(1 / 120);
  }
  const centers = f.poses.filter(({ capsules }) => capsules.length).map(({ capsules }) => capsules[1].b.slice(0, 2));
  assert.deepEqual(centers[0], [0, 0]);
  assert.ok(centers.some(([x, y]) => x === 0.1 && y === 0));
  assert.deepEqual(centers.at(-1), [0.1, 0.105]);
});

test("canceled and expired released claws cannot leave delayed contacts", () => {
  for (const reason of ["cancel", "expired"]) {
    const f = clawFixture();
    f.point("down");
    f.point("move", 80, 0);
    if (reason === "cancel") f.point("cancel");
    else {
      f.point("up", 100, 0, 1020);
      f.setNow(1141);
    }
    f.engine.stepProps(1 / 120);
    assert.equal(f.engine.claws.size, 0);
    assert.equal(f.poses.length, 0);
  }
});

test("changing the capsule roster clears old sweep positions without clearing continuous movement", () => {
  const f = clawFixture();
  f.point("down");
  f.engine.stepProps(1 / 120);
  assert.equal(f.poses.at(-1).hasPrev, false);
  f.point("move", 20, 0);
  f.engine.stepProps(1 / 120);
  assert.equal(f.poses.at(-1).hasPrev, true, "the same body keeps swept contact");

  f.point("down", 100, 0, 1020, 2);
  f.engine.stepProps(1 / 120);
  assert.equal(f.poses.at(-1).hasPrev, false, "new capsules have no unrelated previous position");
  assert.equal(f.poses.at(-1).capsules.length, 6);
  f.point("cancel");
  f.engine.stepProps(1 / 120);
  assert.equal(f.poses.at(-1).hasPrev, false, "remaining capsules cannot sweep from the removed body's slots");
  assert.deepEqual(f.poses.at(-1).capsules[1].b.slice(0, 2), [0.1, 0]);
});

test("active interactions render at 60Hz while idle cloth retains 30Hz and GPU backpressure", async () => {
  for (const active of ["down", "strokes", "claws", "fists", "idle"]) {
    const f = fixture();
    if (active === "fists") f.engine.fists.push({});
    else if (active !== "idle") f.engine[active].set(1, {});
    f.engine.frame(1017);
    assert.equal(f.frames.length, active === "idle" ? 0 : 1, active);
    if (active === "idle") f.engine.frame(1034);
    assert.equal(f.frames.length, 1);
    assert.ok(f.steps.length >= 2 && f.steps.length <= 5);
    f.engine.frame(1080);
    assert.equal(f.frames.length, 1, "in-flight GPU work prevents a second frame");
    f.completions[0].resolve();
    await flush();
    f.engine.frame(1081);
    assert.equal(f.frames.length, 2);
  }
});

test("interaction timing measures submitted work completion rather than elapsed animation-frame time", async () => {
  for (const active of ["down", "strokes", "claws", "fists"]) {
    const f = fixture();
    if (active === "fists") f.engine.fists.push({});
    else f.engine[active].set(1, {});
    // The 500ms animation-frame gap includes idle scheduling time. Only the
    // 13ms between starting this frame's work and GPU completion is evidence.
    f.setNow(1507);
    f.engine.frame(1500);
    assert.equal(f.engine.gpuFrameSamples, 0);
    assert.equal(f.engine.gpuFrameTime, 0);
    f.setNow(1520);
    f.completions[0].resolve();
    await flush();
    assert.equal(f.engine.gpuFrameSamples, 1, active);
    assert.equal(f.engine.gpuFrameTime, 13, active);
  }
});

test("idle, camera, frame, hidden, recorded, and staged frames provide no interaction quality evidence", async () => {
  for (const mode of ["idle", "camera", "frame", "hidden", "recording", "stage"]) {
    const f = fixture();
    if (mode === "camera") f.engine.zoom(-20);
    if (mode === "frame") f.engine.setPaused(true);
    if (mode === "hidden") f.engine.setVisible(false);
    if (mode === "recording") {
      f.engine.down.set(1, {});
      f.engine.recorder = { frame() {} };
    }
    if (mode === "stage") {
      f.engine.stage = { substep() {}, sources: () => [], frame: () => f.engine.camera };
    }
    f.setNow(1034);
    f.engine.frame(1034);
    assert.equal(f.frames.length, 1, mode);
    f.setNow(1134);
    f.completions[0].resolve();
    await flush();
    assert.equal(f.engine.gpuFrameSamples, 0, mode);
    assert.equal(f.engine.gpuFrameTime, 0, mode);
  }
});

test("an interaction hidden or paused before completion provides no quality evidence", async () => {
  for (const mode of ["hidden", "paused"]) {
    const f = fixture();
    f.engine.down.set(1, {});
    f.setNow(1017);
    f.engine.frame(1017);
    if (mode === "hidden") f.engine.setVisible(false);
    else f.engine.setPaused(true);
    f.setNow(1100);
    f.completions[0].resolve();
    await flush();
    assert.equal(f.engine.inFlight, false);
    assert.equal(f.engine.gpuFrameSamples, 0);
    assert.equal(f.engine.gpuFrameTime, 0);
  }
});

test("recording or capture work stays excluded when it finishes before GPU completion", async () => {
  for (const mode of ["recording", "capture"]) {
    const f = fixture();
    f.engine.down.set(1, {});
    if (mode === "recording") f.engine.recorder = { frame() {} };
    else {
      f.engine.captureWanted = { id: 1 };
      f.engine.encodeCapture = () => {};
    }
    f.setNow(1017);
    f.engine.frame(1017);
    assert.equal(f.frames.length, 1);
    f.engine.recorder = null;
    f.engine.captureWanted = null;
    f.setNow(1097);
    f.completions[0].resolve();
    await flush();
    assert.equal(f.engine.gpuFrameSamples, 0, mode);
    assert.equal(f.engine.gpuFrameTime, 0, mode);
  }
});

test("failed GPU completion clears backpressure without adding a timing sample", async () => {
  const f = fixture();
  f.engine.down.set(1, {});
  f.engine.frame(1017);
  f.completions[0].reject(new Error("GPU completion failed"));
  await flush();
  assert.equal(f.engine.inFlight, false);
  assert.equal(f.engine.gpuFrameSamples, 0);
  assert.equal(f.engine.gpuFrameTime, 0);
});

test("stats report the completed interaction mean and reset only the reporting accumulators", async () => {
  const f = fixture();
  const reports = [];
  f.engine.sendStats = (stats) => reports.push(plain(stats));
  f.engine.down.set(1, {});
  f.setNow(1000);
  f.engine.frame(1017);
  f.setNow(1012);
  f.completions[0].resolve();
  await flush();
  f.setNow(1020);
  f.engine.frame(1034);
  f.setNow(1040);
  f.completions[1].resolve();
  await flush();
  assert.equal(f.engine.gpuFrameSamples, 2);
  assert.equal(f.engine.gpuFrameTime, 32);

  f.setNow(2100);
  f.engine.frame(2101);
  assert.equal(reports[0].gpuFrameMs, 16);
  assert.equal(reports[0].gpuSamples, 2);
  assert.equal(f.engine.gpuFrameSamples, 0);
  assert.equal(f.engine.gpuFrameTime, 0);
  assert.equal(f.engine.frameCount, 0);
  assert.equal(f.engine.substepsDone, 0);
  assert.equal(f.engine.statsTime, 2101);
  assert.equal(f.engine.down.size, 1, "reporting leaves the interaction active");

  // Work submitted by the reporting frame belongs to the next interval once
  // completed; clearing the accumulators must not discard that later sample.
  f.setNow(2130);
  f.completions[2].resolve();
  await flush();
  assert.equal(f.engine.gpuFrameSamples, 1);
  assert.equal(f.engine.gpuFrameTime, 30);
  f.setNow(3200);
  f.engine.frame(3202);
  assert.equal(reports[1].gpuFrameMs, 30);
  assert.equal(reports[1].gpuSamples, 1);
  assert.equal(f.engine.gpuFrameSamples, 0);
  assert.equal(f.engine.gpuFrameTime, 0);
});

function probeFixture() {
  const f = fixture();
  let buffer;
  const maps = [];
  let unmaps = 0;
  f.engine.speedProbe = {
    mapAsync() {
      const map = deferred();
      maps.push(map);
      return map.promise;
    },
    getMappedRange: () => buffer,
    unmap() {
      unmaps++;
    },
  };
  return {
    ...f,
    maps,
    async complete(index, ruptures, pulledOut, speed = 0.01) {
      buffer = new ArrayBuffer(16);
      new Uint32Array(buffer).set([ruptures, pulledOut]);
      new Float32Array(buffer)[2] = speed;
      maps[index].resolve();
      await flush();
    },
    unmaps: () => unmaps,
  };
}

test("damage probes emit real counter deltas once, including while sound is unavailable", async () => {
  const f = probeFixture();
  f.engine.probeRest(2);
  await f.complete(0, 3, 2);
  f.engine.probeRest(2);
  await f.complete(1, 3, 2);
  f.engine.probeRest(2);
  await f.complete(2, 5, 3);
  assert.deepEqual(
    f.messages.filter(({ type }) => type === "tear"),
    [
      { type: "tear", ruptures: 3, pulledOut: 2 },
      { type: "tear", ruptures: 2, pulledOut: 1 },
    ],
  );
  assert.equal(f.engine.audioPort, null);
  assert.equal(f.topologyRequests(), 2);
  assert.equal(f.unmaps(), 3);
  assert.equal(f.engine.probeBusy, false);
});

test("reset invalidates an in-flight damage probe and starts fresh counter deltas", async () => {
  const f = probeFixture();
  f.engine.damageCounts = [30, 20];
  f.engine.snapshot = { x: {}, segs: {}, tails: {}, field: {} };
  f.engine.probeRest(2);
  f.engine.restoreCloth();
  assert.equal(f.engine.releaseEpoch, 1);
  assert.deepEqual(Array.from(f.engine.damageCounts), [0, 0]);
  await f.complete(0, 40, 25);
  assert.equal(f.messages.filter(({ type }) => type === "tear").length, 0);
  assert.equal(f.engine.probeBusy, false);
  assert.deepEqual(Array.from(f.engine.damageCounts), [0, 0]);
  f.engine.probeRest(2);
  await f.complete(1, 2, 1);
  assert.deepEqual(
    f.messages.filter(({ type }) => type === "tear"),
    [{ type: "tear", ruptures: 2, pulledOut: 1 }],
  );
});
