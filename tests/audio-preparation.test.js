import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { prepareRecordedTearSource } from "../src/audio-preparation.js";
import { prepareTearSource } from "../src/tear-source.js";

function recording(sampleRate, count) {
  const length = Math.floor(sampleRate * 5.4);
  return Array.from({ length: count }, (_, channel) =>
    Float32Array.from(
      { length },
      (_, index) =>
        0.3 * Math.sin(index * (0.021 + channel * 0.002)) +
        0.08 * Math.cos(index * 0.117) +
        (index % 701 < 10 ? 0.15 : 0),
    ),
  );
}

// Captured from the previous main-thread implementation before moving it. Hash
// all output samples so changes in mixing precision, filters, or gain are visible.
for (const fixture of [
  {
    rate: 44100,
    channels: 1,
    level: 0.21518211104742763,
    hash: `47f4c108509ec38ac66a14ee2fcdc341839af9deae820ad2281f7ffef72b9fe2`,
  },
  {
    rate: 48000,
    channels: 2,
    level: 0.15961927941650145,
    hash: `2200d059c7b1b49d1bd59198328af2f6c74d57f851f41d3fc42bc57ef4fb3800`,
  },
]) {
  test(`recorded tear processing preserves every output sample at ${fixture.rate} Hz, ${fixture.channels} channels`, () => {
    const source = prepareTearSource(recording(fixture.rate, fixture.channels), fixture.rate);
    assert.equal(createHash(`sha256`).update(Buffer.from(source.pcm.buffer)).digest(`hex`), fixture.hash);
    assert.equal(source.level, fixture.level);
    assert.equal(source.starts.length, 3);
    for (const [first, last] of source.starts) {
      assert.ok(first >= 0 && last >= first);
      assert.ok(last + Math.round(0.1 * fixture.rate) <= source.pcm.length);
    }
  });
}

test(`silent and short recordings produce finite output and valid sample windows`, () => {
  const silent = prepareTearSource([new Float32Array(48000 * 6)], 48000);
  assert.equal(silent.level, 0);
  assert.ok(silent.pcm.every((value) => value === 0));
  for (const length of [0, 128, 20000]) {
    const short = prepareTearSource([new Float32Array(length).fill(0.1)], 48000);
    assert.ok(Number.isFinite(short.level));
    assert.ok(short.pcm.every(Number.isFinite));
    assert.equal(short.starts.length, 0, `too-short recording must not offer a grain outside the buffer`);
  }
});

test(`invalid recording layouts fail before audio processing`, () => {
  assert.throws(() => prepareTearSource([], 48000), /Invalid/);
  assert.throws(() => prepareTearSource([new Float32Array(10)], 0), /Invalid/);
  assert.throws(() => prepareTearSource([new Float32Array(10), new Float32Array(9)], 48000), /Mismatched/);
});

function audioFixture() {
  const channel = Float32Array.from({ length: 8000 }, (_, index) => Math.sin(index * 0.03));
  return {
    channel,
    audio: {
      numberOfChannels: 1,
      length: channel.length,
      sampleRate: 8000,
      copyFromChannel(destination, index) {
        assert.equal(index, 0);
        destination.set(channel);
      },
    },
  };
}

test(`audio preparation transfers owned copies, preserves AudioBuffer storage, and terminates on completion`, async () => {
  const { audio, channel } = audioFixture();
  let worker, sentCopy;
  const source = await prepareRecordedTearSource(audio, {
    createWorker: () =>
      (worker = {
        terminated: 0,
        terminate() {
          this.terminated++;
        },
        postMessage(message, transfers) {
          sentCopy = message.channels[0];
          assert.notEqual(sentCopy.buffer, channel.buffer);
          const received = structuredClone(message, { transfer: transfers });
          queueMicrotask(() =>
            this.onmessage({ data: { source: prepareTearSource(received.channels, received.sampleRate) } }),
          );
        },
      }),
  });
  assert.equal(sentCopy.byteLength, 0, `worker input copy should transfer ownership`);
  assert.equal(channel.length, 8000, `AudioBuffer-owned channel must stay attached`);
  assert.equal(channel[100], Math.fround(Math.sin(3)));
  assert.equal(source.pcm.length, audio.length);
  assert.equal(worker.terminated, 1);
});

for (const failure of [`processing`, `worker`, `transfer`, `post`, `timeout`]) {
  test(`audio preparation cleans up after ${failure} failure without blocking a caller`, async () => {
    const { audio } = audioFixture();
    let worker;
    const result = prepareRecordedTearSource(audio, {
      timeoutMs: 5,
      createWorker: () =>
        (worker = {
          terminated: 0,
          terminate() {
            this.terminated++;
          },
          postMessage() {
            if (failure === `post`) throw Error(`post failed`);
            queueMicrotask(() => {
              if (failure === `processing`) this.onmessage({ data: { error: `processing failed` } });
              if (failure === `worker`) this.onerror({ message: `worker failed`, preventDefault() {} });
              if (failure === `transfer`) this.onmessageerror();
            });
          },
        }),
    });
    await assert.rejects(result);
    assert.equal(worker.terminated, 1);
  });
}
