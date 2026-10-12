# Break That Denim

A faithful replica of [denim.scottsun.io](https://denim.scottsun.io) — a realistic, interactive denim
tear simulation that runs entirely in the browser on **WebGPU**.

Drag across the fabric to pull and tear it. Scroll to zoom. Open the eye menu for the hidden
"Smilie" experience. Hit **Reset** to get a fresh pair of jeans.

Beyond the original site, this build adds:

- **Knife tool** (dock button or the `K` key): drag to slash the cloth instead of pulling it. The
  stroke cuts every yarn crossing along its path in weave space, so the slit is continuous and evenly
  wide however fast you move; switch back to the hand and pull the slit open to run the tear.
- **Fabric picker** (in the eye menu): the same sheet woven as **denim** (3/1 indigo twill) or
  **burlap** (plain-weave jute hessian: coarse open weave, stiff brittle yarns, lots of fray).

## Requirements

- Node 18+ (tested on Node 22)
- A browser with WebGPU and `OffscreenCanvas` (Chrome / Edge 113+, Safari 26+, Firefox 141+ on supported GPUs)

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve dist/
```

## Project layout

```
index.html                 page shell: brand lockup, loader, dock (experiences menu + reset), status line
src/style.css              all styling (Anton/Oswald display type, torn-paper clip-path logo, stitched loader)
src/main.js                main thread: canvas + OffscreenCanvas handoff, pointer/wheel/visibility plumbing,
                           AudioContext + tear-sound engine (TearAudio), loader/status UI, experiences menu
src/worker.js              WebGPU engine (runs in a module Worker): cloth/thread solver, multigrid compute
                           pipelines, floor + fabric renderer, camera, the "Smilie" staged experience
src/worklet.js             AudioWorkletProcessor `tear-voice`: granular tear-sound synthesis driven by
                           fracture/pan/cut records streamed from the worker
public/drape.bin           pre-computed resting drape of the denim (drape-burlap.bin: of the burlap)
public/texture/floor_*     floor PBR maps (base color, normal, roughness, AO)
public/models/smilie.glb   model for the "Smilie" experience
public/stage/smilie.clip   staged animation clip for the experience
public/fabric_tear_sound_sample.mp3
public/exprerience_sounds/ ambient loop + laugh used by the experience
public/logo.png, og_image.jpeg, robots.txt
```

## How it works

1. `main.js` creates a `<canvas class="stage">`, transfers control to an `OffscreenCanvas` and posts it to the
   worker together with a DPR-capped size (≤ 2M pixels, DPR ≤ 1.7).
2. The worker requests a high-performance WebGPU adapter, checks required limits, loads `drape.bin`, the floor
   textures and compiles ~30 compute/render pipelines (progress is streamed back to the stitched loader).
3. Pointer events (with coalesced moves) are forwarded with timestamps; the worker simulates the fabric, detects
   ruptures and pulled-out threads, and streams per-substep records over a `MessageChannel` straight into the
   `tear-voice` AudioWorklet, which synthesises the tearing sound from grains of the recorded sample.
4. The "Smilie" experience lazily fetches the GLB + clip, plays an ambient loop and a laugh, and the worker
   reacts to the laugh's loudness envelope.
5. The knife reuses the claw-piercing machinery of that experience: a `slash` compute pass in the body-contact
   shader marks crossings along the stroke as cut (damage code 255), and the existing field update, span
   coupling, fray and edge rendering take it from there. Strokes are picked per pointer sample with the same
   GPU pick the hand uses, and queued to the next solver substep.
6. Fabrics are presets (`FABRICS` in `src/worker.js`): yarn mechanics, weave (twill repeat / warp-over), node
   bundling and wear. The renderer branches on the material id in the layer uniform for the yarn, rim-fibre
   and fray colours. Switching fabric restarts the worker on a fresh canvas so the old GPU device is released.
   Each fabric ships its settled rest state (`public/drape*.bin`); without one the solver settles on load.

### Generating a drape file

`public/drape.bin` is the denim's settled rest state; the loader skips the 420-substep settle when the file's
scene hash matches. Burlap ships without one yet, so it settles on first load (a few seconds on a real GPU,
shown as the loader holding at 70%). To generate `public/drape-burlap.bin`, open the page on a WebGPU
machine, pick Burlap, wait for it to finish loading, then run in the console:

```js
__fabricDev({ op: "drape" }).then((b) => {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([b])),
    download: "drape-burlap.bin",
  });
  a.click();
});
```

Save the download into `public/`. A file whose scene hash no longer matches (after changing the preset) is
ignored and the solver settles again. `?settle=N` on the page URL shortens the settle for development.

## Dev hook

`window.__fabricDev(msg)` posts a dev message to the worker and resolves with its reply:
`{op:'info'}`, `{op:'cuts'}` (fully cut crossings), `{op:'step', substeps}`, `{op:'slash', a, b, width?}`
(cut between two node indices), `{op:'drape'}` (the settled state in `drape.bin` format), and
`{op:'camera', distance?, pitch?, yaw?, target?}`.

The HTML, CSS, JavaScript and assets are reproduced from the deployed site's build output and formatted for
readability. Source maps were not published, so identifiers in `src/*.js` are the minified ones.
