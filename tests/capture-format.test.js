import test from "node:test";
import assert from "node:assert/strict";
import { CAPTURE_FORMATS, captureSize, captureCrop } from "../src/capture-format.js";

test("social export sizes are even H.264 frames and Screen preserves the viewport", () => {
  assert.deepEqual(captureSize("portrait", 1280, 800), { width: 720, height: 1280 });
  assert.deepEqual(captureSize("square", 390, 780), { width: 1080, height: 1080 });
  assert.deepEqual(captureSize("wide", 390, 780), { width: 1280, height: 720 });
  assert.deepEqual(captureSize("screen", 391, 781), { width: 390, height: 780 });
  assert.deepEqual(captureSize("unknown", 391, 781), captureSize("screen", 391, 781));
});

test("composition guides and exports preserve yarn proportions without sampling outside the canvas", () => {
  for (const [width, height] of [
    [1280, 800],
    [390, 780],
    [320, 640],
    [844, 390],
  ]) {
    for (const format of Object.keys(CAPTURE_FORMATS)) {
      const size = captureSize(format, width, height);
      const crop = captureCrop(width, height, size.width, size.height);
      assert.ok(
        crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= width + 1e-8 && crop.y + crop.height <= height + 1e-8,
      );
      assert.ok(Math.abs(crop.width / crop.height - size.width / size.height) < 1e-10);
      assert.ok(Math.abs(2 * crop.x + crop.width - width) < 1e-8);
      assert.ok(Math.abs(2 * crop.y + crop.height - height) < 1e-8);
      assert.ok(Math.abs(crop.width - width) < 1e-8 || Math.abs(crop.height - height) < 1e-8);
    }
  }
});
