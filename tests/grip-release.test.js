import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const start = source.indexOf("He = class {");
const end = source.indexOf("\nconst z = {", start);
assert.ok(start >= 0 && end > start, "production interaction class exists");
const interactionSource = source.slice(start, end).replace("He = class {", "globalThis.Interaction = class {");

function fixture() {
  const writes = [];
  const patch = {
    nodes: [11, 12],
    weights: [1, 0.7],
    sides: [-1, 1],
    between: [],
    stiffness: 9000,
    padPitch: 0.001,
    slip: 0.008,
  };
  const context = vm.createContext({
    Re: (_scene, node) => ({ ...patch, nodes: [node, node + 1] }),
    I: { maxLead: 0.006 },
  });
  vm.runInContext(interactionSource, context);
  const interaction = Object.create(context.Interaction.prototype);
  const gripU = new ArrayBuffer(256);
  Object.assign(interaction, {
    held: Array(4).fill(null),
    owner: new Map(),
    scene: {},
    gripU,
    grip: new ArrayBuffer(65536),
    initU: new ArrayBuffer(16),
    solver: { contactEnabled: true },
    run() {},
    device: {
      queue: {
        writeBuffer(buffer, offset, input) {
          const bytes = input.buffer
            ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
            : new Uint8Array(input);
          new Uint8Array(buffer).set(bytes, offset);
          writes.push({ buffer, offset, values: Array.from(new Float32Array(bytes.slice().buffer)) });
        },
        submit() {},
      },
      createCommandEncoder: () => ({ beginComputePass: () => ({ end() {} }), finish() {} }),
    },
  });
  function attach(slot = 0, node = 11) {
    assert.equal(interaction.attach(node, [0, 0, 0], slot), true);
    writes.length = 0;
  }
  return {
    interaction,
    writes,
    attach,
    gripU,
    stiffness: (slot = 0) => new Float32Array(gripU)[16 * slot + 4],
    count: (slot = 0) => new Float32Array(gripU)[16 * slot + 3],
  };
}

test("letting go stops grip force immediately while topology retains ownership for cleanup", () => {
  const f = fixture();
  f.attach(2);
  const held = f.interaction.held[2];
  assert.equal(f.stiffness(2), 9000);
  f.interaction.letGo(2);
  assert.equal(f.stiffness(2), 0, "GPU spring stiffness is zero before topology finishes");
  assert.equal(f.interaction.held[2], held, "the slot stays reserved for asynchronous cleanup");
  assert.equal(held.releasing, true);
  assert.equal(f.count(2), 2, "patch bookkeeping stays intact");
  assert.equal(f.interaction.holder(11), 2);
  assert.equal(f.interaction.holder(12), 2);
  assert.deepEqual(Array.from(f.interaction.coreNodes), [], "released patch no longer anchors topology");
  assert.deepEqual(
    f.writes.map(({ offset, values }) => ({ offset, values })),
    [{ offset: 144, values: [0] }],
  );
});

test("repeated or empty releases do not enqueue extra GPU writes", () => {
  const f = fixture();
  f.attach();
  f.interaction.letGo();
  f.interaction.letGo();
  f.interaction.letGo(3);
  assert.equal(f.writes.length, 1);
  assert.equal(f.stiffness(), 0);
});

test("cleanup frees a released patch and a new attachment restores its full grip strength", () => {
  const f = fixture();
  f.attach();
  f.interaction.letGo();
  f.interaction.release();
  assert.equal(f.count(), 0);
  assert.equal(f.interaction.held[0], null);
  assert.equal(f.interaction.holder(11), -1);
  assert.equal(f.interaction.holder(12), -1);
  f.attach();
  assert.equal(f.stiffness(), 9000);
  assert.equal(f.count(), 2);
  assert.equal(f.interaction.held[0].releasing, false);
  assert.deepEqual(Array.from(f.interaction.coreNodes), [11, 12]);
});

test("releasing one slot preserves another hand's spring and topology anchors", () => {
  const f = fixture();
  f.attach(0);
  f.attach(1, 21);
  f.interaction.letGo(0);
  assert.equal(f.stiffness(0), 0);
  assert.equal(f.stiffness(1), 9000);
  assert.equal(f.interaction.held[1].releasing, false);
  assert.deepEqual(Array.from(f.interaction.coreNodes), [21, 22]);
  f.interaction.setTarget([0.1, 0.2, 0.3], 0);
  f.interaction.setPinch(0.3, 0);
  assert.equal(f.stiffness(0), 0, "late target/pinch updates cannot reactivate the released spring");
});
