// Boundary conditions change the cloth's freedom, not its material or yarn count.
export const MOUNTS = {
  frame: { label: "Stretched", description: "All edges held. Cut a flap or pull a tear." },
  hanging: { label: "Hanging", description: "Held along the top. Free edges drape and catch air." },
};
export const normalizeMount = (value) => (value === "hanging" ? "hanging" : "frame");

// Tool coordinates: x/y lie in the undisturbed fabric, z points toward its front.
export const toToolSpace = (p, mount) => (mount === "hanging" ? [p[0], p[2], -p[1]] : [...p]);
export const fromToolSpace = (p, mount) => (mount === "hanging" ? [p[0], -p[2], p[1]] : [...p]);

export function prepareMount(scene, mount) {
  scene.mount = normalizeMount(mount);
  if (scene.mount === "frame") return scene;
  for (const layer of scene.layers) {
    const height = (layer.ny - 1) * layer.material.pitchV;
    const width = (layer.nx - 1) * layer.material.pitchU;
    for (let j = 0; j < layer.ny; j++)
      for (let i = 0; i < layer.nx; i++) {
        const n = layer.nodeOffset + j * layer.nx + i;
        const u = scene.restUV[2 * n],
          v = scene.restUV[2 * n + 1];
        const pinned = j >= layer.ny - 2;
        const depth = height - v;
        const t = Math.min(1, depth / 0.04);
        // A small, deterministic pleat takes up the existing 2.5% width slack.
        // This is only the initial pose: subsequent folds come from the solver.
        const pleat = pinned ? 0 : 0.004 * Math.sin((2 * Math.PI * u) / 0.09) * t * t * (3 - 2 * t);
        scene.position.set([0.975 * (u - width / 2), pleat, -depth], 3 * n);
        scene.pinned[n] = +pinned;
      }
  }
  return scene;
}

export function mountCamera(mount, preset, aspect, base, viewportHeight = 800) {
  if (mount !== "hanging") {
    const variation =
      {
        front: { pitch: 0.03, yaw: 0 },
        angle: { pitch: 0.64, yaw: -0.42 },
        detail: { distance: 0.53, pitch: 0.32, yaw: -0.18 },
        reset: {},
      }[preset] ?? {};
    return { ...base, target: [...base.target], ...variation };
  }
  const distance = 1.32;
  // Fit inside the space above the dock, including short landscape screens.
  const compact = aspect * viewportHeight <= 1150;
  const chromeHeight = compact ? 198 : 160;
  const centerOffset = compact ? 56 : 24;
  const viewHeight = Math.max(
    (0.46 * viewportHeight) / Math.max(180, viewportHeight - chromeHeight),
    0.68 / Math.max(0.35, aspect),
  );
  const fovY = 2 * Math.atan(viewHeight / (2 * distance));
  const variation =
    {
      front: { pitch: 1.45, yaw: 0 },
      angle: { pitch: 1.12, yaw: -0.42 },
      detail: { distance: 0.7, fovY: base.fovY, pitch: 1.25, yaw: -0.18 },
      reset: {},
    }[preset] ?? {};
  return {
    ...base,
    target: [0, 0, -0.19 - (centerOffset / viewportHeight) * viewHeight],
    distance,
    pitch: 1.28,
    yaw: -0.1,
    fovY,
    ...variation,
  };
}

export function hangingRail(scene) {
  let left = Infinity,
    right = -Infinity;
  for (let n = 0; n < scene.nodeCount; n++)
    if (scene.pinned[n]) {
      left = Math.min(left, scene.position[3 * n]);
      right = Math.max(right, scene.position[3 * n]);
    }
  const vertices = new Float32Array(32);
  for (const [end, x] of [left - 0.012, right + 0.012].entries())
    for (const [corner, [y, z]] of [
      [-0.008, -0.005],
      [0.008, -0.005],
      [0.008, 0.008],
      [-0.008, 0.008],
    ].entries())
      vertices.set([x, y, z, 1], 16 * end + 4 * corner);
  return vertices;
}
