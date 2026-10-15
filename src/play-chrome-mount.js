// The shared Play interface (rubenv.net/play-chrome). It runs before main.js
// looks up its buttons: the bar's Sound button keeps the sound-toggle class,
// Explore and Collection keep theirs, and Save a picture opens Fray's own
// save and share sheet.
import { aboutHTML, barHTML, icon, mountChrome } from "./play-chrome/play-chrome.ts";

const extras =
  `<button class="pc-icon explore-toggle" type="button" aria-haspopup="dialog" title="Explore creative starting points">${icon(`<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/>`)}<span class="pc-sr">Explore</span></button>` +
  `<button class="pc-icon collection-toggle" type="button" aria-haspopup="dialog" title="Open your saved collection">${icon(`<rect x="7" y="7" width="13" height="14" rx="1.5"/><path d="M16 3H4v14M10 16l3-4 4 5"/>`)}<span class="pc-sr">Collection</span><span class="collection-count" aria-hidden="true">0</span></button>`;

document.body.insertAdjacentHTML(
  `afterbegin`,
  barHTML({ title: `Fray`, tagline: `A little creative destruction. Rip real fabric.`, extras })
    .replace(`class="pc-icon pc-sound"`, `class="pc-icon pc-sound sound-toggle"`)
    .replace(`title="Save a picture"`, `title="Save or share (S)"`),
);
document.body.insertAdjacentHTML(
  `beforeend`,
  aboutHTML({
    title: `Fray`,
    intro: `Real fabric, simulated yarn by yarn on your graphics card: every thread stretches, frays and snaps on its own. No score to beat and no wrong way to play.`,
    items: [
      [`Tools`, `Drag with <b>Hand</b> to pull and tear. <b>Knife</b> and <b>Claw</b> slice, <b>Fist</b> punches, <b>Pin</b> anchors or releases a point. Hold and sweep with <b>Air</b> to billow the fabric or catch a loose ribbon. The Hand hint shows resistance as you pull. Release to let the cloth settle. Touch works too.`],
      [`Fabric`, `Pick one of eight weaves, or print your own photo on it. <b>Hanging</b> holds the top edge and lets the cloth drape; <b>Stretched</b> holds every edge. Changing fabric or setup starts a fresh sheet. Explore has ready-made starting points.`],
      [`Effects`, `Wind catches the folds and surviving threads; open weaves let more air through. Try slow motion after cutting a ribbon, or give the fabric a shake, from the Effects menu.`],
      [`Keep`, `Frame pauses the fabric so you can compose a shot, then keep it in your Collection. Save a picture makes a session card; Record saves a clip of up to 20 seconds.`],
      [`View`, `Scroll to zoom, right-drag or the arrow keys to orbit. On touch screens, two fingers orbit and pinch zooms. In Frame, a plain drag orbits.`],
      [`Keys`, `1–6 tools · F next fabric · R fresh sheet · W wind · T slow motion · X shake · Space frame · V record · S save · M sound · H hides the interface · ? this page.`],
    ],
    close: `Back to the fabric`,
  }),
);
// The fabric and effects menus open above the dock, outside it, so the dock
// neither clips them nor applies its phone rules to them.
document.body.append(document.querySelector(`.experiences`), document.querySelector(`ul.tools`));
document.querySelector(`#keep`).addEventListener(`click`, () => document.querySelector(`.share`)?.click());
document.querySelector(`.score`)?.classList.add(`pc-extra`);
mountChrome({ accent: `#d29b71`, onAccent: `#1b120a`, night: `#100f0e` });
