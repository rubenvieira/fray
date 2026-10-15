import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../src/worklet.js", import.meta.url), "utf8");
const sampleRate = 48_000;

function audioHarness({ sourceReady = true } = {}) {
  let Processor;
  vm.runInNewContext(source, {
    Float32Array,
    sampleRate,
    AudioWorkletProcessor: class {
      port = {};
    },
    registerProcessor(name, implementation) {
      assert.equal(name, "tear-voice");
      Processor = implementation;
    },
  });
  const processor = new Processor();
  function setSource() {
    processor.port.onmessage({
      data: { source: { pcm: new Float32Array(14_400).fill(0.2), starts: [[0, 9_600]], level: 1 } },
    });
  }
  if (sourceReady) setSource();
  let records;
  function connect() {
    records = {
      onmessage: null,
      closed: false,
      close() {
        this.closed = true;
      },
    };
    processor.port.onmessage({ data: { records } });
    return records;
  }
  connect();
  return {
    connect,
    setSource,
    send(data) {
      records.onmessage({ data });
    },
    block() {
      const left = new Float32Array(128),
        right = new Float32Array(128);
      processor.process([], [[left, right]]);
      return Math.max(...left.map(Math.abs), ...right.map(Math.abs));
    },
  };
}

function fracture(energy, cuts = 0, slot = 0) {
  const records = new Float32Array(13);
  records[0] = 1 / 120;
  records[1 + slot * 3] = energy;
  records[3 + slot * 3] = cuts;
  return records;
}

test("untouched cloth remains silent, including while held", () => {
  const audio = audioHarness();
  audio.send({ grip: 0, held: true });
  audio.send(fracture(0));
  assert.equal(audio.block(), 0);
});

test("delayed recording preparation never replays an earlier tear", () => {
  const delayed = audioHarness({ sourceReady: false }),
    fresh = audioHarness();
  delayed.send({ grip: 0, held: true });
  delayed.send(fracture(0.4, 1));
  delayed.send({ grip: 0, held: false });
  for (let block = 0; block < Math.ceil((sampleRate * 2) / 128); block++) assert.equal(delayed.block(), 0);

  delayed.setSource();
  assert.equal(delayed.block(), 0, "loading the recording must not play old damage after release");
  delayed.send(fracture(0.004));
  fresh.send(fracture(0.004));
  const peak = delayed.block();
  assert.ok(peak > 0, "fresh partial damage must sound immediately once the recording is ready");
  assert.equal(peak, fresh.block(), "old damage must not amplify the fresh tear");
});

test("partial fibre damage gives immediate quiet feedback without a grip", () => {
  const quiet = audioHarness(),
    loud = audioHarness();
  quiet.send(fracture(0.004));
  loud.send(fracture(0.4, 1));
  const quietPeak = quiet.block(),
    loudPeak = loud.block();
  assert.ok(quietPeak > 0, "partial damage must sound before a whole yarn breaks");
  assert.ok(loudPeak > quietPeak * 5, "the sound's level must follow the released energy");
  assert.ok(loudPeak > 0.02, "the first 2.7ms audio block must have a responsive onset");
});

test("fractures arriving after pointer release are audible and decay to silence", () => {
  const audio = audioHarness();
  audio.send({ grip: 0, held: true });
  audio.send({ grip: 0, held: false });
  audio.send(fracture(0.4, 1));
  assert.ok(audio.block() > 0);
  for (let block = 0; block < Math.ceil((sampleRate * 0.5) / 128); block++) audio.block();
  assert.equal(audio.block(), 0, "a release must not leave a looping tear sound");
});

test("tool fractures in every source slot sound without held messages", () => {
  for (let slot = 0; slot < 4; slot++) {
    const audio = audioHarness();
    audio.send(fracture(0.4, 1, slot));
    assert.ok(audio.block() > 0, `source ${slot} must be audible`);
  }
});

test("a quiet new tear does not inherit the energy of an old completed tear", () => {
  const reused = audioHarness(),
    fresh = audioHarness();
  reused.send(fracture(0.4, 1));
  for (let block = 0; block < Math.ceil((sampleRate * 0.5) / 128); block++) reused.block();
  reused.send(fracture(0.004));
  fresh.send(fracture(0.004));
  assert.equal(reused.block(), fresh.block());
});

test("cloth reset immediately clears the old sound and accepts new damage", () => {
  const audio = audioHarness();
  audio.send(fracture(0.4, 1));
  assert.ok(audio.block() > 0);
  audio.send({ reset: true });
  assert.equal(audio.block(), 0);
  audio.send(fracture(0.004));
  assert.ok(audio.block() > 0);
});

test("reconnecting a worker closes its old record port and clears active grains", () => {
  const audio = audioHarness();
  const oldPort = audio.connect();
  audio.send(fracture(0.4, 1));
  assert.ok(audio.block() > 0);
  audio.connect();
  assert.equal(oldPort.closed, true);
  assert.equal(oldPort.onmessage, null);
  assert.equal(audio.block(), 0);
  audio.send(fracture(0.004));
  assert.ok(audio.block() > 0, "reconnecting must preserve the decoded source");
});
