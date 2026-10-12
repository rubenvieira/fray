# Fray

Rip real fabric in your browser. Tartan, satin, linen and burlap are woven thread by thread and
simulated on your **WebGPU**: pull it, slash it, hear it tear, share the damage.

The engine is a yarn-level cloth solver: every warp and weft yarn is simulated and rendered, so a
tear is not a texture effect but yarns breaking, slipping out of the weave and fraying.

Drag across the fabric to pull and tear it. Scroll to zoom. Hit **Reset** for a fresh sheet.

- **Knife** (dock button or `K`): drag to slash the cloth instead of pulling it. The stroke cuts every
  yarn crossing along its path in weave space, so the slit is continuous and evenly wide however fast
  you move; switch back to the hand and pull the slit open to run the tear.
- **Fabrics** (eye menu, or `F` to cycle): **tartan** (2/2 worsted wool twill with a Royal
  Stewart-style sett, soft and hairy), **satin** (5-harness crimson silk: glossy floats, rips run
  straight), **linen** (ecru plain-weave canvas) and **burlap** (plain-weave jute hessian: coarse,
  open, brittle, frays a lot).
- **Shred score**: a live count of threads shredded (yarns ruptured plus yarns pulled out of the
  weave, from the solver's own counters) with a clock that starts at your first touch, and a verdict
  tier from Gentle to Absolute unit.
- **Record** (dock button or `V`): records a clip of up to 20 seconds, with the tearing sound, as an
  MP4 (H.264 + AAC, the format X accepts), then offers it in the sheet to save, share natively on
  phones, or post (X's web intent can't attach a file, so you save and add it to the post).
- **Share** (dock button or `S`): grabs the frame, composes a 1200x675 card with your score, time,
  fabric and verdict, and offers Post on X (pre-written text), the native share sheet with the image
  on phones, or saving the PNG. `R` resets, `Esc` closes.
- The eye menu also hides the "Smilie" experience.

The simulation core descends from [denim.scottsun.io](https://denim.scottsun.io) (a denim tear
simulation, reproduced from its deployed build); the denim preset is kept in the code as the
reference drape every other fabric is warm-started from, but is not offered in the menu.

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
index.html                 page shell: loader, dock (fabrics/experience menu, share, knife, reset), score, share sheet
src/style.css              all styling (Anton/Oswald display type, torn-paper clip-path logo, stitched loader)
src/main.js                main thread: canvas + OffscreenCanvas handoff, pointer/wheel/visibility plumbing,
                           AudioContext + tear-sound engine (TearAudio), loader/status UI, experiences menu
src/worker.js              WebGPU engine (runs in a module Worker): cloth/thread solver, multigrid compute
                           pipelines, floor + fabric renderer, camera, the "Smilie" staged experience
src/worklet.js             AudioWorkletProcessor `tear-voice`: granular tear-sound synthesis driven by
                           fracture/pan/cut records streamed from the worker
public/drape*.bin          pre-computed resting drape of each fabric (denim: drape.bin)
public/texture/floor_*     floor PBR maps (base color, normal, roughness, AO)
public/models/smilie.glb   model for the "Smilie" experience
public/stage/smilie.clip   staged animation clip for the experience
public/fabric_tear_sound_sample.mp3
public/exprerience_sounds/ ambient loop + laugh used by the experience
public/icon.svg, og.png, robots.txt
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
5. The share card: the worker copies the frame's canvas texture to a buffer inside the frame's own
   command buffer (a WebGPU canvas cannot be read back directly), converts it to a PNG with a 2D
   OffscreenCanvas and posts it to the page, which draws the card with the loaded display fonts.
6. Recording: while a clip is on, the worker makes a `VideoFrame` of the canvas right after each frame's
   submit and feeds a WebCodecs H.264 encoder (30 fps, 7 Mbit/s, keyframe every 2 s); chunks stream to
   the page. The page taps the sound bus (a master gain every voice plays through) with a
   `MediaStreamTrackProcessor`, encodes it to AAC, and muxes both with `mp4-muxer`. Where there is no
   AAC encoder (some Linux builds) the clip is silent rather than carrying an empty track.
7. The knife reuses the claw-piercing machinery of that experience: a `slash` compute pass in the body-contact
   shader marks crossings along the stroke as cut (damage code 255), and the existing field update, span
   coupling, fray and edge rendering take it from there. Strokes are picked per pointer sample with the same
   GPU pick the hand uses, and queued to the next solver substep.
8. Fabrics are presets (`FABRICS` in `src/worker.js`): yarn mechanics, weave (twill repeat / warp-over), node
   bundling and wear. The renderer branches on the material id in the layer uniform for the yarn, rim-fibre
   and fray colours. Switching fabric restarts the worker on a fresh canvas so the old GPU device is released.
   Each fabric ships its settled rest state (`public/drape*.bin`); without one the engine warm-starts from
   the denim's drape and settles briefly.

### Drape files and the warm start

`public/drape.bin` is the denim's settled rest state; the loader skips the 420-substep settle when the
file's scene hash matches. Every other fabric ships its own `public/drape-<fabric>.bin`, so all of them
load the same way. If a fabric's file is missing or stale (its preset changed), the engine warm-starts
instead: every fabric is the same sheet with the same pinned border and lattice mapping, so the denim's
drape is resampled onto the new lattice and relaxed with a 48-substep settle (well under a second on a
real GPU, with the loader holding at 70%). Only with no denim drape at all does it settle from flat.

To regenerate a drape file after changing a preset, open the page on a WebGPU machine, pick the fabric,
wait for it to finish loading, then run in the console and save the download into `public/`:

```js
__fabricDev({ op: "drape" }).then((b) => {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([b])),
    download: "drape-<fabric>.bin",
  });
  a.click();
});
```

`?settle=N` on the page URL shortens the settle for development.

## Dev hook

`window.__fabricDev(msg)` posts a dev message to the worker and resolves with its reply:
`{op:'info'}`, `{op:'cuts'}` (fully cut crossings), `{op:'step', substeps}`, `{op:'slash', a, b, width?}`
(cut between two node indices), `{op:'drape'}` (the settled state in `drape.bin` format), and
`{op:'camera', distance?, pitch?, yaw?, target?}`.

The HTML, CSS, JavaScript and assets are reproduced from the deployed site's build output and formatted for
readability. Source maps were not published, so identifiers in `src/*.js` are the minified ones.
