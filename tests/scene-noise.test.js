import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// The scene noise as the worker defines it, from its hash to the cached gradient directions.
const source = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const from = source.indexOf("function Ft(e)");
const to = source.indexOf("function zt(", from);
assert.ok(from >= 0 && to > from, "worker scene noise exists");
const noise = vm.runInNewContext(source.slice(from, to) + "({ It, Rt, RT_EMPTY })");

function direct(e, t, n, r, i) {
  const a = (noise.It(e, t, n) / 4294967296) * Math.PI * 2;
  return Math.cos(a) * r + Math.sin(a) * i;
}

test("cached noise gradients equal the hashed directions bit for bit", () => {
  const keys = [];
  // Interleaved seeds and corners evict one another from the direct-mapped cache.
  for (let s = 0; s < 6000; s++) keys.push([1001 + (s % 37) * 1013, ((s * 7919) % 211) - 105, ((s * 104729) % 197) - 98]);
  // Keys a multiple of 2^20 apart in one coordinate share a slot in any table of up to 2^20 slots:
  // each must still be told apart from the key cached before it.
  for (let s = 0; s < 200; s++) {
    const [e, t, n] = [1001 + s, s - 100, 50 - s];
    keys.push([e, t, n], [e + 2 ** 20, t, n], [e, t, n], [e, t + 2 ** 20, n], [e, t, n], [e, t, n + 2 ** 20]);
  }
  // The empty-slot key, and inputs that the hash reduces to the same int32 corner.
  keys.push([noise.RT_EMPTY, noise.RT_EMPTY, noise.RT_EMPTY], [2 ** 32 + 5, 3, 4], [5, 3, 4], [-0, NaN, Infinity], [0, 0, 0]);
  for (let pass = 0; pass < 2; pass++)
    for (const [e, t, n] of keys) {
      const r = 0.37 - pass * 0.9,
        i = -0.61 + pass * 0.4;
      assert.ok(Object.is(noise.Rt(e, t, n, r, i), direct(e, t, n, r, i)), `gradient at ${e}, ${t}, ${n}`);
    }
});
