import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const scope = {
  max: Math.max,
  min: Math.min,
  sqrt: Math.sqrt,
  clamp: (value, low, high) => Math.min(high, Math.max(low, value)),
};

// These scalar WGSL functions use JS-compatible arithmetic and control flow.
// Execute their production bodies, stripping only declarations' type syntax;
// the expected forces below come from physical bounds, not a duplicated law.
function shaderFunction(name) {
  const signature = new RegExp(`fn ${name}\\(([^)]*)\\) -> f32 \\{`).exec(source);
  assert.ok(signature, `${name} exists in the production shader`);
  const start = signature.index + signature[0].length;
  let end = start,
    depth = 1;
  while (depth && end < source.length) {
    if (source[end] === "{") depth++;
    if (source[end] === "}") depth--;
    end++;
  }
  const args = signature[1].split(",").map((arg) => arg.split(":")[0].trim());
  const body = source.slice(start, end - 1).replace(/\blet\b/g, "const");
  return new Function(...Object.keys(scope), `return function (${args.join(",")}) { ${body} };`)(
    ...Object.values(scope),
  );
}
for (const name of ["axialTension", "strainAtTension", "yarnDamage", "sharedYarnForce"])
  scope[name] = shaderFunction(name);
const { axialTension, strainAtTension, yarnDamage, sharedYarnForce } = scope;

const materialsContext = {};
vm.runInNewContext(
  source.slice(source.indexOf("const p = 18e-8"), source.indexOf("function h(e, t, n = t)")) +
    "; globalThis.materials = [m, burlap, tartan, satin, linen, chiffon, gauze, lame, ballistic];",
  materialsContext,
);
const materials = materialsContext.materials;
const yarns = materials.flatMap((material) => material.yarns.map((yarn, family) => ({ material, family, yarn })));
const near = (actual, expected, message = "") =>
  assert.ok(
    Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)),
    `${message}: ${actual} vs ${expected}`,
  );
function bundle(yarn, count) {
  return { ...yarn, eaLow: yarn.eaLow * count, eaHigh: yarn.eaHigh * count, eaCompress: yarn.eaCompress * count };
}

test("shared load never exceeds the crossing friction force at any preload", () => {
  for (const preload of [0, 0.1, 1, 5, 10, 50]) {
    for (const factor of [1, 1.3, 2.8, 4.6]) {
      for (const transfer of [0, 0.01, 0.2, 1, 10]) {
        const force = sharedYarnForce(preload, factor, transfer);
        assert.ok(force >= preload);
        assert.ok(force - preload <= transfer + 1e-12, "friction bounds added force above and below peak load");
        assert.ok(force <= preload * factor + 1e-12, "sharing cannot supply more than the missing-neighbor load");
      }
    }
  }
  assert.equal(sharedYarnForce(-10, 4.6, 1), 0, "compression cannot become fracture tension");
  assert.equal(sharedYarnForce(2, 4.6, -1), 2, "no available friction means no load transfer");
});

test("shared force maps through the nonlinear crimp law for all material yarns and bundle sizes", () => {
  assert.equal(yarns.length, 18);
  for (const { yarn, material } of yarns) {
    for (const count of [1, 6, 9]) {
      const y = bundle(yarn, count);
      for (const area of [0.02, 0.4, 1]) {
        for (const strain of [0.1, 0.5, 1, 2, 4].map((multiple) => multiple * y.crimpStrain)) {
          const base = (axialTension(y, strain) * area) / count;
          for (const factor of [1, 1.3, 2.8, 4.6]) {
            const force = sharedYarnForce(base, factor, 0.2 * yarn.strength);
            const sharedStrain = strainAtTension(y, (force * count) / area);
            near((axialTension(y, sharedStrain) * area) / count, force, material.name);
            assert.ok(sharedStrain >= strain - 1e-12);
            assert.ok(
              sharedStrain <= strain * factor + 1e-12,
              "hardening yarns need less than a proportional strain increase",
            );
          }
        }
      }
    }
  }
});

test("without neighboring breaks or transferable friction, existing cohesive behavior is unchanged", () => {
  for (const { yarn } of yarns) {
    for (const count of [1, 6]) {
      const y = bundle(yarn, count);
      for (const area of [0.2, 1]) {
        const peak = strainAtTension(y, (yarn.strength * count) / area);
        const soft = 0.08;
        for (const strain of [peak * 0.8, peak, peak + soft * 0.25, peak + soft * 0.8, peak + soft * 1.01]) {
          for (const [factor, transfer] of [
            [1, 100],
            [4.6, 0],
          ]) {
            const force = sharedYarnForce((axialTension(y, strain) * area) / count, factor, transfer);
            const effective = strainAtTension(y, (force * count) / area);
            near(
              yarnDamage(y, count, area, yarn.strength, soft, effective),
              yarnDamage(y, count, area, yarn.strength, soft, strain),
            );
          }
        }
      }
    }
  }
});

test("crimp cannot create premature damage when friction only brings a yarn to its peak", () => {
  const y = materials[0].yarns[0];
  const base = 0.9 * y.strength;
  const transfer = 0.1 * y.strength;
  const strain = strainAtTension(y, base);
  const force = sharedYarnForce(base, 1.3, transfer);
  near(force, y.strength);
  const damage = yarnDamage(y, 1, 1, y.strength, 0.08, strainAtTension(y, force));
  assert.equal(damage, 0);

  // Regression: the old strain multiplier invented additional tension beyond
  // the 0.85 N available at this crossing, causing damage before physical onset.
  const previousFactor = 1 + transfer / y.strength;
  const previousForce = axialTension(y, strain * previousFactor);
  near(previousForce, 8.616);
  assert.ok(previousForce - base > transfer);
  assert.ok(yarnDamage(y, 1, 1, y.strength, 0.08, strain * previousFactor) > 0);
});

test("load sharing retains gradual cohesive softening across every material", () => {
  for (const { yarn } of yarns) {
    const peak = strainAtTension(yarn, yarn.strength);
    let previous = 0,
      partial = 0;
    for (let i = 0; i <= 300; i++) {
      const strain = (i / 300) * (peak + 0.16);
      const force = sharedYarnForce(axialTension(yarn, strain), 1.6, 0.1 * yarn.strength);
      const effective = strainAtTension(yarn, force);
      const damage = yarnDamage(yarn, 1, 1, yarn.strength, 0.08, effective);
      assert.ok(damage >= previous - 1e-12 && damage <= 1);
      if (damage > 0 && damage < 1) partial++;
      previous = damage;
    }
    assert.equal(previous, 1);
    assert.ok(partial > 10, "yarns soften progressively instead of switching directly to severed");
  }
});
