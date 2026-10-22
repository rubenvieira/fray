# Fray

Rip real fabric in your browser. Twelve fabrics, from tartan and madras to shot silk and ripstop, are woven thread by thread and
simulated on your **WebGPU**: pull it, slash it, hear it tear, share the damage.

The engine is a yarn-level cloth solver: every warp and weft yarn is simulated and rendered, so a
tear is not a texture effect but yarns breaking, slipping out of the weave and fraying.

The sheet starts **Hanging** from its top edge: the free sides and lower hem drape, billow and swing
under gravity. Choose **Stretched** in the Fabric menu for the original all-edge mounting. Both setups
use the same yarns, masses, damage and contact solver; changing setup starts a fresh sheet.

Drag across the fabric to pull and tear it. Scroll to zoom. Hit **Reset** for a fresh sheet.

Broken edges keep their yarn colours, including individual tartan stripes. Wool makes a crimped
brush, jute keeps coarser ends, and silk/nylon shed finer filaments. A yarn that continues across an
opening does not grow a second broken-end tuft at its root. Loose ends now lag, sway in Air/wind
and settle; threads held at both ends can sag without acquiring extra length. When the last crossing
releases, a yarn keeps its existing bend and motion instead of restarting as a straight fragment.

- **Explore** opens five ready-to-play studies: **Color comes apart** (madras, a slit and opposing pulls),
  **A change of silk** (shot silk, hand, breeze), **Ribbons in motion** (satin, knife, breeze, slow
  motion), **Storm study** (gauze, claw, gale), and **Golden hour** (lamé, hand, breeze, slow motion).
  Each starts a fresh sheet and clears the current photo print. The guidance is a starting point;
  you can change tools and effects or dismiss it whenever you like.
- **Frame a moment** pauses the cloth while you compose a shot. Drag to orbit, scroll or pinch to
  zoom, and try Front, Angle, Detail, or Fit. Detail follows the current position of the last yarn you
  touched, so a moved tear remains the subject. **Capture frame** exports the image without the score
  overlay. **Back to play** or `Esc` resumes the fabric; `Space` toggles framing when the canvas
  has focus. Pins stay anchored when you change tools, frame a shot, or switch browser tabs.
- **Collection** keeps up to 12 snapshots or frames in this browser using IndexedDB. Choose
  **Keep in collection** in an image preview to save it; reopening the page preserves the pieces.
  Open a piece to download or share it, or remove it with the inline confirmation. Saving a new
  piece never evicts an existing one. Video clips use the existing download/share flow.
- **Tools** (always visible in the bottom toolbar, or keys `1`-`8`): the **hand** grips and pulls; the **knife** (`K`) slashes,
  cutting every yarn crossing along the stroke in weave space so the slit is continuous however fast
  you move; the **claw** (`C`) drags three sharp points that pierce the weave and ladder it; the
  **fist** (`B`) punches a blunt sphere down through the sheet where you click, tenting it until it
  rips; the **pin** (`P`) holds a point so one mouse can stretch the cloth between pin and hand (pin
  it again to let go); **Air** (`6`) lifts the cloth without gripping it. Hold and sweep to billow the
  fabric or catch a torn ribbon, then release and let it settle. In Hanging, Air blows outward through the fabric;
  in Stretched, it lifts from below. Fist and Claw pick the visible cloth surface, including folds
  that have moved away from the rest plane. In Stretched, cut a flap first for the clearest lift;
  the mounted, intact sheet naturally resists billowing. The hint lights while air is flowing, and the
  brush follows the visible folds even in angled views. One finger uses the tool; two fingers
  still orbit and pinch to zoom. Tool changes, camera gestures, framing and leaving the page stop the fans immediately.
- **Unpick** (`8`): catch an exposed yarn end and slowly draw it through the weave. First use Knife
  to make a notch and Hand to open it; Detail makes the ends easier to see. Hover highlights an end
  you can catch; touch has a larger catch radius. The measured load line and released-crossing count
  follow the actual grip. Each crossing holds until tension overcomes its friction. Ease back to
  stop the release, then pull again to continue. After the last crossing lets go, the same yarn end
  stays in your hand until you release it. Tool changes, orbiting, framing and leaving the page let go;
  existing pins remain anchored. Fully extracted yarns fall and catch Air and wind.
- **Fire** (`7`): hold on the cloth to ignite it, then release to watch the burn. Heat browns and chars
  the weave, consumes its yarn sections and opens holes through the existing tear solver. Flames rise
  and bend with the wind. Wool takes more heat than linen or gauze; nylon softens before sustained
  flame. Air cools a burning patch. Frame pauses heat and flame motion; Reset restores unburned fabric.
- **Feel the pull**: the Hand hint shows the measured resistance of the grip, with a subtle load line. “Threads giving way” follows confirmed ruptures or yarn pull-out; pointer speed does not trigger it. Releasing or cancelling the gesture clears the cue immediately.
- **Effects** (Effects menu): **wind** (`W`: off, breeze, gale) travels through the folds in coherent
  eddies, easing in and out instead of jolting the cloth. Open weaves pass more air; separated yarns
  stop acting as intact sails. **Slow motion** (`T`) runs the simulation at a fifth of real time; **shake** (`X`) throws
  the sheet. **Raking light** moves the key light across the weave to bring out ridges and loose fibers.
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
  nylon (the challenge fabric: it very nearly does not tear), **indigo denim** (the original twill),
  **madras** (soft, colorful cotton plaid), **shot silk** (teal warp and magenta weft catch the light
  separately), and **ripstop** (lime nylon with stronger yarns in a fine grid).
- **Shred score**: a live count of threads shredded (yarns ruptured plus yarns pulled out of the
  weave, from the solver's own counters) with a clock that starts at your first touch, and a verdict
  tier from Gentle to Absolute unit.
- **Record** (dock button or `V`): records a clip of up to 20 seconds, with the tearing sound, as an
  MP4 (H.264, with AAC when available), then offers it in the sheet to save, share natively on
  phones, or post (X's web intent can't attach a file, so you save and add it to the post).
- **Clip shapes** (Effects): Screen uses the full canvas; Landscape exports 1280×720, Square
  1080×1080, and Portrait 720×1280. The crop guide matches both clean frames and clips and
  stays out of the export. Orbit or use Detail to compose inside it. Encoding resolution does not
  guarantee a recording frame rate; the clip follows the frames the device actually renders.
- **Save / share** (Save a picture in the Play bar, or `S`): grabs the frame, composes a 1200x675 card with your score, time,
  fabric and verdict, and offers Post on X (pre-written text), the native share sheet with the image
  on phones, or saving the PNG. `R` resets, `Esc` closes.
- **Sound** (speaker button in the Play bar, or `M`): starts off; turning it on is remembered on this browser.
- **About** (the Play bar's info button, or `?`): tool guidance, camera controls, and keyboard shortcuts. `H` hides the interface.
- The interface is the shared Play standard (rubenv.net `play-chrome/`, `docs/features/play-standard.md`): `src/play-chrome-mount.js` adds the bar and About and moves the menus; `index.html` puts the fabric, view and Frame controls in the dock.
  Menus support arrow keys and Home/End; Escape closes menus and dialogs.
- The Fabric menu also includes the "Smilie" experience. Changing fabric starts a fresh sheet;
  finish an active recording before switching.

Fray is a modified version of [Break That Denim](https://github.com/scottstts/Break-That-Denim) by
Scott Sun ([denim.scottsun.io](https://denim.scottsun.io)), reproduced from its deployed build; the
denim preset is also available in the Fabric menu. See [Credits and licence](#credits-and-licence).

The added materials are fitted artistic models, not measured textile specifications. Madras changes
plain-weave compliance, strength and yarn dimensions; shot silk shades the two dyed yarn families
separately under the actual scene lights, with a fitted longitudinal dyed-scattering lobe. Ripstop strengthens two yarns out of every sixteen in
both directions by 3.2×, in the same grid drawn on the fabric. Its bending and mass use the fitted
nylon substrate values, so this is a tear-resisting grid rather than a full reinforced-yarn model.
A knife can still sever those stronger yarns. New materials include settled drapes for both mounts,
source-colored fraying and material-specific heat behavior.

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
npm run test:gpu   # optional WebGPU checks: yarn mechanics, fibre colour and airflow; requires Playwright
```

The GPU checks compile the production cloth surface, grip, yarn-damage, loose-thread, fringe, tail preparation,
mount, floor and airflow shaders and run force, fibre-colour and aerodynamic cases on SwiftShader.
Persistent-rod checks exercise colliding cache buckets, reordered runs, gravity, shared airflow,
release, growing frays at either held end, inherited release velocity, fixed roots, segment lengths,
pause/reset, energy decay and slack-bridge arc length. Fully released yarn cases exercise gravity at
both ends, exact lengths, wind, pause and floor contact. Final-crossing handoffs check shape and average
velocity at either held end, including newly released length; analytic free-flight cases cover weak and
strong drag without losing small velocities to floating-point cancellation. Production pull-out dispatches
verify gradual release under load, sticking when unloaded, resumption and reset. Combustion checks cover cold stability,
ignition, fuel bounds, irreversible charring/yarn loss, upward preheat, spatially separated fragments,
material differences, cooling and physical-time pause/reset. Both combustion and plume modules compile.
Fringe cases preserve source yarn dyes and reject broken-end tufts on continuing yarns.
Airflow cases cover two-sided and edge-on cloth,
porosity, partial tears, free strands, pinned/retired nodes, overlapping fans, oblique aiming at raised
and hanging folds, outward fans on vertical cloth, and cloth moving with or against the air.
Individual-yarn cases verify root reaction, selective crossing release, slack, pause, resumption,
full extraction, cancellation/reset and occlusion-correct end picking. Gripped-rod cases verify
length, tip continuity through growth and final release at either held side, and letting go.
Grip-load cases verify the actual GPU spring resultant, force clamp, released patches and translation
invariance. They validate GPU calculations, not phone frame rates. Use a locally installed
`playwright` package, or set `PLAYWRIGHT_MODULE` to an existing Playwright module's absolute path.
`CHROME_PATH` selects an installed Chrome executable. On Linux, use a short `TMPDIR` on a filesystem
with space for Chrome's profile and socket.

## Project layout

```
index.html                 page shell: material picker, tool palette, effects, score, loader, recovery and share dialogs
src/style.css              responsive interface styling (Anton/Oswald type, material swatches, stitched loader and toolbar)
src/main.js                main thread: canvas + OffscreenCanvas handoff, pointer/wheel/visibility plumbing,
                           AudioContext + tear-sound engine (TearAudio), interface state, accessible menus and dialogs
src/gestures.js            pointer routing: cloth manipulation, frame orbit, two-finger orbit and pinch zoom
src/material-library.js    additional material mechanics, reinforcement grid and yarn colors
src/capture-format.js      shared export dimensions and center-crop geometry
src/hand.js                acceleration-limited grip motion with discrete braking
src/mount.js               stretched/hanging boundary conditions, initial pleat, tool frames, camera and rail
src/grip-feedback.js       measured hand-load and confirmed tear cues
src/fray-material.js       material-specific fringe, filament and rod reconstruction fits
src/tail-memory.js         bounded persistent free-tail identity and damped bending modes (WGSL)
src/airflow.js             one shared physical airflow field for cloth and reconstructed yarns
src/yarn-release.js        physical-time cohesive softening and friction-gated crossing slip
src/yarn-grip.js           visible-end picking, single-yarn reaction and progressive extraction
src/free-yarn.js           detached yarn reconstruction, air drag, length and contact constraints
src/burn.js                material heat/fuel/char, actual yarn consumption and procedural flame/smoke plumes
src/audio-preparation.js   tear-recording worker lifecycle and transferable channel copies
src/audio-preparation-worker.js / src/tear-source.js  off-thread sample mixing, filtering and normalization
src/tear-feedback.js       brief touch haptics driven by confirmed fabric separation
src/render-budget.js       mobile render resolution with load thresholds, cooldown and gradual recovery
src/collection.js          private IndexedDB snapshot collection, thumbnails, preview and removal controls
src/worker.js              WebGPU engine (runs in a module Worker): cloth/thread solver, multigrid compute
                           pipelines, floor + fabric renderer, camera, the "Smilie" staged experience
src/worklet.js             AudioWorkletProcessor `tear-voice`: granular tear-sound synthesis driven by
                           fracture/pan/cut records streamed from the worker
public/drape*.bin          settled stretched and hanging drapes (hanging: drape-hanging-<fabric>.bin)
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
tests/scene-noise.test.js  cached scene-noise gradients equal the hashed directions bit for bit
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
   around). Fist and Claw use GPU surface picks, so their contact follows raised and billowing folds.
   Pins are grips whose hand never moves. The grip reduction also reports the resultant spring
   load for the Hand cue; its unused goal w component carries feedback without changing the force.
   A readback belongs to its exact grip object, so recycled slots cannot inherit an earlier gesture's
   load. Wind and Air shift the existing implicit drag
   potential into the moving air's frame, using normals from connected yarns and a porous-screen
   approximation based on thread cover. Drag responds to relative velocity: cloth carried with the
   airflow feels no further force, and faster cloth is slowed down. The added gradient uses the
   same quadratic as the Newton line search; no second drag term or explicit velocity kick is added.
   Breeze changes ease over 0.25 physical seconds; local fans have a 9 cm smooth footprint radius,
   projected along the pointer ray at each node's height, a 0.06 s
   attack and a bounded combined speed. Slow motion scales the simulated time per real second; shake
   writes a smooth velocity field. The print is a texture sampled over the sheet in the surface pass
   and multiplied into the yarns' albedo.
9. Fabrics are presets (`FABRICS` in `src/worker.js`): yarn mechanics, weave (twill repeat / warp-over), node
   bundling and wear. The renderer branches on the material id in the layer uniform for the yarn, rim-fibre
   and fray colours, for the filament highlight of silk, nylon and lamé yarns (`yarnOptics`: a longitudinal
   lobe along each yarn, lit per sample so warp and weft keep their own directions, so it sweeps across
   folds as the cloth moves), and for the light sheer weaves pass on when lit from behind.
   Switching fabric restarts the worker on a fresh canvas so the old GPU device is released.
   Hanging frees the side and lower borders, rotates the tool frame toward the vertical fabric,
   uses a top rail and lowers the colliding floor. The initial 4 mm pleat takes up width slack; all
   subsequent folds come from the solver. Air pressure stays bounded and follows the pointer ray
   in either orientation.
   Each fabric ships its settled rest state (`public/drape*.bin`); without one the engine warm-starts from
   the denim's drape and settles briefly.

Free-tail reconstruction retains position and velocity by material yarn and cut end, rather
than the temporary GPU run-list order or a retreating held crossing. As a tear exposes more yarn,
the existing strand is resampled by material distance from its cut end; new material enters at the
root without resetting the hanging bend. Newly released ends inherit the mechanical lattice's
velocity. A 32-byte-per-node GPU snapshot supplies positions and velocities within the existing
ten-storage-buffer requirement. It solves a material-aware gravity/airflow equilibrium,
then integrates a damped bending mode and projects segment lengths and existing cloth/floor
contacts. Newly released ends start along the yarn exit. Physical time governs this motion, so
slow motion, pause and camera framing remain consistent. Measured tail motion participates in
the sleep check from actual point displacement; Reset clears the approximately 10 MB bounded history cache.

These are local appearance/reconstruction fits, not measured fibre properties. The mechanical
lattice continues to carry yarn loads and determine rupture/pull-out. Reconstructed tails and
slack bridges do not add load-bearing particles. With Unpick, the selected yarn feeds a bounded
elastic reaction into the four lattice nodes surrounding its current held crossing. Its rest
length grows only as that yarn leaves successive fine crossings. Crossing resistance includes
the material friction, local normal load and actual transverse span tension. The grip uses the
material yarn and original cut end, so rebuilt run indices cannot switch it to a neighbor. Its
rendered tip is constrained at the hand while segment lengths and the existing yarn cache survive
growth and final release. This is a fitted single-yarn handle coupled to the bundled cloth solver,
not a separate full filament contact solver. Ordinary ungripped tails remain reconstructed. The
cache falls back to an equilibrium rod if its bounded probe cannot reserve a slot.

Stress-driven cohesive damage now approaches its original force/strain target over a short physical
response time. A free end accumulates slip through a crossing only while the original shear-lag energy
can overcome its friction; a released or subcritical pull does not unzip the fabric by itself. Strength
and crimp laws are unchanged. Slip can travel up to 64 crossings from a cut. Both timing and mobility
are graphic-model fits. Completely freed yarns use unanchored particles in the same bounded history
cache; they inherit solver motion, fall, catch airflow and meet cloth/floor contacts. Their position
constraints preserve segment length and the free chain's centre of mass before contact.

Fire stores temperature, consumed fuel, char and reaction rate per mechanical node. Separate GPU
passes advance a fixed-time thermal snapshot, commit it, then reduce each fine crossing's remaining
section and sever consumed yarns before normal damage/coupling. Heat transfer uses current spatial
distances and normalized neighbor weights, with upward preheat and airflow cooling. Thus distant torn
pieces cannot heat each other through their old material adjacency. Char remains after cooling, and
active heat keeps the simulation awake. Igniters use cancellable GPU surface picks and follow the
picked material while it moves. No heat exists before the first actual hit.

The temperature/rate/char profiles are qualitative textile fits, not calibrated fire properties.
Flames and smoke are procedural buoyant plumes driven by the actual reaction and shared airflow;
this is not a volumetric combustion-fluid solver. [NIST's textile work](https://www.nist.gov/publications/airflow-extinguishment-burning-apparel-fabrics-final-report)
and its [material-calibration research](https://www.nist.gov/programs-projects/impact-material-composition-ignitability-and-fire-growth)
describe why airflow, structure and measured material parameters matter. [Stanford's fire model](https://graphics.stanford.edu/~henrik/papers/fire/)
provides the physical context for buoyant flame motion.

### Drape files and the warm start

`public/drape-hanging-<fabric>.bin` stores each hanging rest pose. Hanging caches include their
mount mask in the hash; stretched cache hashes stay compatible. A missing hanging cache settles
the vertical pose for up to 72 fixed physical substeps, with damage history disabled.

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

## Credits and licence

Fray is a modified version of **Break That Denim** by **Scott Sun**
([source](https://github.com/scottstts/Break-That-Denim), [live](https://denim.scottsun.io)): its yarn-level
cloth engine, tear-sound worklet, ambient sounds and the Smilie model come from that project.

Copyright (C) 2026 Scott Sun (Break That Denim)
Copyright (C) 2026 Ruben Vieira (modifications)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU
General Public License, version 3 only, as published by the Free Software Foundation. It is
distributed WITHOUT ANY WARRANTY; see [LICENSE](LICENSE) for the full terms.

**Modified by Ruben Vieira, 12–22 October 2026:** knife, claw, fist, pin, air, unpick and fire tools;
eleven more fabrics and photo printing; the hanging setup, wind, slow motion and shake; framing,
recording and the Collection; filament highlights and back light; faster loading; and the shared Play
interface. The commit history records every change.

Bundled third-party software and its notices are listed in [public/NOTICE.txt](public/NOTICE.txt), which
ships with the site, alongside a copy of the licence.

## Shared knife

The knife geometry, photographic walnut and steel materials come from `@rubenvieira/knife-atelier` 1.3.0. The identical compiled archive is checked in under `vendor/`, with its version and integrity pinned in `package.json` and `package-lock.json`. Play builds need no extra network request or private credential. The knife (three.js and its woods, about 1.6 MB compressed) is a separate chunk loaded on demand: at once when the knife is chosen, otherwise in idle time once the fabric runs and no pointer is down. It is built once per page and copied to each fabric's worker; without it the knife still cuts. Update both together for a collection revision; author knife geometry in Knife Atelier. Local parent transforms adapt the model to this experiment’s cutting frame.
