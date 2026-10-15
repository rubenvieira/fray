# Fray

Rip real fabric in your browser. Tartan, satin, linen and burlap are woven thread by thread and
simulated on your **WebGPU**: pull it, slash it, hear it tear, share the damage.

The engine is a yarn-level cloth solver: every warp and weft yarn is simulated and rendered, so a
tear is not a texture effect but yarns breaking, slipping out of the weave and fraying.

Drag across the fabric to pull and tear it. Scroll to zoom. Hit **Reset** for a fresh sheet.

- **Explore** opens three ready-to-play studies: **Ribbons in motion** (satin, knife, breeze, slow
  motion), **Storm study** (gauze, claw, gale), and **Golden hour** (lamé, hand, breeze, slow motion).
  Each starts a fresh sheet and clears the current photo print. The guidance is a starting point;
  you can change tools and effects or dismiss it whenever you like.
- **Frame a moment** pauses the cloth while you compose a shot. Drag to orbit, scroll or pinch to
  zoom, and try Front, Angle, Detail, or Fit. **Capture frame** exports the image without the score
  overlay. **Back to play** or `Esc` resumes the fabric; `Space` toggles framing when the canvas
  has focus. Pins stay anchored when you change tools, frame a shot, or switch browser tabs.
- **Collection** keeps up to 12 snapshots or frames in this browser using IndexedDB. Choose
  **Keep in collection** in an image preview to save it; reopening the page preserves the pieces.
  Open a piece to download or share it, or remove it with the inline confirmation. Saving a new
  piece never evicts an existing one. Video clips use the existing download/share flow.
- **Tools** (always visible in the bottom toolbar, or keys `1`-`5`): the **hand** grips and pulls; the **knife** (`K`) slashes,
  cutting every yarn crossing along the stroke in weave space so the slit is continuous however fast
  you move; the **claw** (`C`) drags three sharp points that pierce the weave and ladder it; the
  **fist** (`B`) punches a blunt sphere down through the sheet where you click, tenting it until it
  rips; the **pin** (`P`) holds a point so one mouse can stretch the cloth between pin and hand (pin
  it again to let go).
- **Effects** (Effects menu): **wind** (`W`: off, breeze, gale) gusts across the sheet so torn strips
  flutter; **slow motion** (`T`) runs the simulation at a fifth of real time; **shake** (`X`) throws
  the sheet.
- **Orbit**: right-drag or the arrow keys turn the camera; scroll zooms. The **View** buttons under
  Fabric also rotate and zoom. On touch screens, use two fingers to orbit and pinch to zoom; one
  finger uses your current tool. After a camera gesture, lift both fingers before tearing again.
- **Print a photo** (Fabric menu, or drop / paste an image): the image is dyed onto the yarns of the
  sheet, cover-fit, and never leaves your browser. Then rip it.
- **Fabrics** (Fabric menu, or `F` to cycle): **tartan** (2/2 worsted wool twill with a Royal
  Stewart-style sett, soft and hairy), **satin** (5-harness crimson silk: glossy floats, rips run
  straight), **linen** (ecru plain-weave canvas), **burlap** (plain-weave jute hessian: coarse, open,
  brittle, frays a lot), **chiffon** (sheer silk crepe, tears like tissue), **gauze** (open
  cheesecloth that ladders before it breaks), **lamé** (gold metallic satin) and **ballistic**
  nylon (the challenge fabric: it very nearly does not tear).
- **Shred score**: a live count of threads shredded (yarns ruptured plus yarns pulled out of the
  weave, from the solver's own counters) with a clock that starts at your first touch, and a verdict
  tier from Gentle to Absolute unit.
- **Record** (dock button or `V`): records a clip of up to 20 seconds, with the tearing sound, as an
  MP4 (H.264 + AAC, the format X accepts), then offers it in the sheet to save, share natively on
  phones, or post (X's web intent can't attach a file, so you save and add it to the post).
- **Save / share** (toolbar button or `S`): grabs the frame, composes a 1200x675 card with your score, time,
  fabric and verdict, and offers Post on X (pre-written text), the native share sheet with the image
  on phones, or saving the PNG. `R` resets, `Esc` closes.
- **Sound** (speaker button or `M`): mute or unmute; the preference is remembered on this browser.
- **How to play** (header button or `?`): tool guidance, camera controls, and keyboard shortcuts.
  Menus support arrow keys and Home/End; Escape closes menus and dialogs.
- The Fabric menu also includes the "Smilie" experience. Changing fabric starts a fresh sheet;
  finish an active recording before switching.

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
npm test           # input, interaction, hand-motion, haptic and audio behavior tests
npm run test:gpu   # optional software-WebGPU shader checks; requires Playwright
```

The GPU checks compile the production grip, yarn-damage, and loose-thread shaders and run force and
fibre-colour cases on SwiftShader. They validate GPU calculations, not phone frame rates. Use a locally
installed `playwright` package, or set `PLAYWRIGHT_MODULE` to an existing Playwright module's absolute path.

## Project layout

```
index.html                 page shell: material picker, tool palette, effects, score, help, loader, recovery and share dialogs
src/style.css              responsive interface styling (Anton/Oswald type, material swatches, stitched loader and toolbar)
src/main.js                main thread: canvas + OffscreenCanvas handoff, pointer/wheel/visibility plumbing,
                           AudioContext + tear-sound engine (TearAudio), interface state, accessible menus and dialogs
src/gestures.js            pointer routing: cloth manipulation, frame orbit, two-finger orbit and pinch zoom
src/hand.js                acceleration-limited grip motion with discrete braking
src/audio-preparation.js   tear-recording worker lifecycle and transferable channel copies
src/audio-preparation-worker.js / src/tear-source.js  off-thread sample mixing, filtering and normalization
src/tear-feedback.js       brief touch haptics driven by confirmed fabric separation
src/render-budget.js       mobile render resolution with load thresholds, cooldown and gradual recovery
src/collection.js          private IndexedDB snapshot collection, thumbnails, preview and removal controls
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
tests/gestures.test.js     cloth/camera gesture transitions, cancellation, frame mode and wheel input
tests/hand.test.js         grip settling, reversals and acceleration limits
tests/grip-release.test.js immediate force release while topology cleanup completes
tests/yarn-load-sharing.test.js  nonlinear crack-tip load transfer and cohesive softening
tests/render-budget.test.js     render sizing, sustained load, recovery and capture reset
tests/worker-interaction.test.js  async picking, stroke paths, releases, frame pacing and damage reporting
tests/tear-feedback.test.js      touch-only fracture pulses, cancellation and release tails
tests/worklet.test.js      fracture-energy audio, release decay, reset and worker reconnection
tests/audio-preparation.test.js  sample-output parity, finite normalization and worker cleanup
```

## How it works

1. `main.js` creates a `<canvas class="stage">`, transfers control to an `OffscreenCanvas` and posts it to the
   worker together with a DPR-capped size (≤ 2M pixels, DPR ≤ 1.7). On touch devices, sustained active-frame
   GPU load can reduce drawing dimensions to 70%; the solver and CSS touch coordinates stay unchanged.
   Framing, photo capture and recording restore full drawing resolution.
2. The worker requests a high-performance WebGPU adapter, checks required limits, loads `drape.bin`, the floor
   textures and compiles ~30 compute/render pipelines (progress is streamed back to the stitched loader).
3. Pointer events (with coalesced moves) are forwarded with timestamps; the worker simulates the fabric, detects
   ruptures and pulled-out threads, and streams per-substep records over a `MessageChannel` straight into the
   `tear-voice` AudioWorklet, which synthesises the tearing sound from grains of the recorded sample. A separate,
   short-lived worker prepares that sample so the first touch does not block while audio is normalized.
   Hand targets follow elapsed pointer time, including in slow motion, with bounded acceleration and small
   steps through the recorded path. The cloth solver keeps its fixed physical timestep. A brief touch intent
   window distinguishes one-finger manipulation from a pinch; animation frames keep that deadline responsive
   when the browser delays touch-start timers.
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
8. The fist and claw are capsules on the body-contact system the staged creature uses (a blunt sphere
   animated down and up; three sharp capsules riding under the surface, which the pierce pass cuts
   around). Pins are grips whose hand never moves. Wind is a compute pass adding a gusting pressure to
   the external force at assembly; slow motion scales the simulated time per real second; shake
   writes a smooth velocity field. The print is a texture sampled over the sheet in the surface pass
   and multiplied into the yarns' albedo.
9. Fabrics are presets (`FABRICS` in `src/worker.js`): yarn mechanics, weave (twill repeat / warp-over), node
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
