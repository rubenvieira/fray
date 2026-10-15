// The shared Play header (rubenv.net/play-chrome). It replaces Fray's own
// header before main.js looks up the sound, help, explore and collection
// buttons, which keep their classes so the existing wiring still applies.
import { barHTML, icon, iconButton, icons, mountChrome } from "./play-chrome/play-chrome.ts";

const extras =
  iconButton(`keep`, `Save a picture (S)`, icons.keep) +
  `<button class="pc-icon help-toggle" type="button" aria-haspopup="dialog" title="How to play (?)">${icons.info}<span class="pc-sr">How to play</span></button>` +
  `<button class="pc-icon explore-toggle" type="button" aria-haspopup="dialog" title="Explore creative starting points">${icon(`<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/>`)}<span class="pc-sr">Explore</span></button>` +
  `<button class="pc-icon collection-toggle" type="button" aria-haspopup="dialog" title="Open your saved collection">${icon(`<rect x="7" y="7" width="13" height="14" rx="1.5"/><path d="M16 3H4v14M10 16l3-4 4 5"/>`)}<span class="pc-sr">Collection</span><span class="collection-count" aria-hidden="true">0</span></button>`;

document.body.insertAdjacentHTML(
  `afterbegin`,
  barHTML({ title: `Fray`, tagline: `A little creative destruction. Rip real fabric.`, keep: false, about: false, extras })
    .replace(`class="pc-icon pc-sound"`, `class="pc-icon pc-sound sound-toggle"`),
);
document.querySelector(`#keep`).addEventListener(`click`, () => document.querySelector(`.share`)?.click());
for (const el of document.querySelectorAll(`.fabric-picker, .score`)) el.classList.add(`pc-extra`);
mountChrome({ accent: `#d29b71`, onAccent: `#1b120a`, night: `#100f0e` });
