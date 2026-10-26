// The community garden picture (#s9): a painted 2.5D garden (img/projector-garden) whose timber
// beds fill with flowers as the class earns stars. The next slot shows the flower that is growing
// now; once it is leafy, its leaves already show which kind it will be. The front strip holds one
// small flower, in the learner's own kind, for every skill a learner in the room has mastered
// (no names: learners know their own kind).
//
// Plants stand still. The life is in the sky and the air: the sun glows, clouds drift, birds cross
// now and then, butterflies and a bee wander over the beds and the watering can drips (CSS in
// projector.css). The stage is redrawn on every data change, so each loop is offset by the time
// since the page loaded (--t) and carries on where the last draw was, never restarting.

import { PLANT_KINDS } from "../plants.js";

const img = (name) => new URL(`../../img/projector-garden/${name}`, import.meta.url).href;
const BACKGROUND = img("garden-background.jpg");
const STAGES = img("growth-stages.png"); // 1086×362: seed, sprout, generic leafy (362 frames, soil at 335)
const LEAFY = img("leafy-plant-kinds.png"); // 724×543: 4×3 cells of 181, PLANT_KINDS order
const MATURE = img("mature-plant-kinds.png"); // same layout as LEAFY

// Soil anchors in the background's own 1536×1024 space: rear bed, then left, then right.
const SLOTS = [
  [565, 425], [680, 445], [800, 425], [920, 445], [1040, 425],
  [195, 625], [310, 650], [430, 625], [570, 650],
  [970, 625], [1085, 650], [1200, 625], [1330, 650],
];
export const SLOT_COUNT = SLOTS.length;
const FLOWER_SIZE = 160;
const GROWING_SIZE = 180;

// Front strip: mastered-skill flowers spaced evenly, centred while there are only a few.
const BED_BASE = 895;
const BED_CENTRE = 650;
const BED_SPAN = 1100;
const BED_GAP_MAX = 54;
const BED_SIZE = 70;
export const BED_COUNT = 22;

const LOADED_AT = Date.now();
const KIND_INDEX = new Map(PLANT_KINDS.map((k, i) => [k.symbol, i]));
const STAGE_FRAME = { "p-seed": 0, "p-sprout": 1, "p-leafy": 2 };

/** Stage of the flower that is growing now, from the share of its stars already earned. */
export function growingSymbol(towardNext, perFlower) {
  const share = perFlower > 0 ? towardNext / perFlower : 0;
  if (share >= 2 / 3) return "p-leafy";
  if (share >= 1 / 3) return "p-sprout";
  return "p-seed";
}

/** A square window onto an atlas, sized `size`, with its soil line at the origin. */
function cell(href, sheetW, sheetH, x, y, cellSize, size, soil) {
  return `<svg x="${-size / 2}" y="${(-size * soil).toFixed(1)}" width="${size}" height="${size}" viewBox="${x} ${y} ${cellSize} ${cellSize}" overflow="hidden"><image href="${href}" width="${sheetW}" height="${sheetH}"/></svg>`;
}

/** Plant art for a symbol: a kind's bloom, a kind's leaves (leafy + kind), or a shared stage. */
function art(symbol, size, kind) {
  const bloom = KIND_INDEX.get(symbol);
  if (bloom != null) return cell(MATURE, 724, 543, (bloom % 4) * 181, Math.floor(bloom / 4) * 181, 181, size, 0.96);
  const leaves = KIND_INDEX.get(kind);
  if (symbol === "p-leafy" && leaves != null) return cell(LEAFY, 724, 543, (leaves % 4) * 181, Math.floor(leaves / 4) * 181, 181, size, 0.94);
  return cell(STAGES, 1086, 362, (STAGE_FRAME[symbol] ?? 0) * 362, 0, 362, size, 335 / 362);
}

/** A plant standing still on its soil point (cx, base). */
function plantAt(symbol, cx, base, size, kind = null) {
  return `<g transform="translate(${cx} ${base})">${art(symbol, size, kind)}</g>`;
}

/* ---------- life over the painting (positions in its 1536×1024 space) ---------- */

const SUN = [1436, 56];

/** A soft cloud drifting across the sky (pj-drift); --x is where it rests when motion is reduced. */
function cloud(y, scale, opacity, dur, d, x) {
  return `<g transform="translate(0 ${y})"><g class="amb pj-drift" style="--dur:${dur}s;--d:${d}s;--x:${x}px"><use href="#pjCloud" transform="scale(${scale})" opacity="${opacity}"/></g></g>`;
}

/** A small flock crossing the sky now and then. `flip` flies right to left. */
function flock(y, dur, d, count, flip) {
  const birds = [[0, 0, 1], [-60, 20, 0.85], [-34, -26, 0.75], [-94, -8, 0.7]].slice(0, count);
  const inner = `<g class="amb pj-fly" style="--dur:${dur}s;--d:${d}s"><g class="amb pj-bob">${birds
    .map(([x, yy, s], i) => `<g transform="translate(${x} ${yy}) scale(${s})"><g class="amb pj-flap" style="--d:${-0.13 * i}s"><use href="#pjBird"/></g></g>`)
    .join("")}</g></g>`;
  return `<g transform="${flip ? `translate(1536 ${y}) scale(-1 1)` : `translate(0 ${y})`}">${inner}</g>`;
}

/** A butterfly that wanders along its own path (pj-bfA/B in projector.css) with flapping wings. */
function butterfly(path, wing, wing2, scale, d) {
  return `<g class="amb pj-${path}" style="--d:${d}s"><g transform="scale(${scale})"><g class="amb pj-wings" style="--d:${d / 7}s">
      <path d="M0 0 C-4 -11 -17 -15 -17 -4 C-17 2 -8 4 0 0Z M0 0 C4 -11 17 -15 17 -4 C17 2 8 4 0 0Z" fill="${wing}"/>
      <path d="M0 0 C-3 6 -11 13 -13 6 C-14 2 -6 0 0 0Z M0 0 C3 6 11 13 13 6 C14 2 6 0 0 0Z" fill="${wing2}"/>
      <circle cx="-9" cy="-6" r="2.2" fill="#fff" opacity=".7"/><circle cx="9" cy="-6" r="2.2" fill="#fff" opacity=".7"/>
    </g><ellipse rx="1.7" ry="6.5" fill="#5B3A29"/><path d="M-.5 -6 q-2 -5 -5 -6 M.5 -6 q2 -5 5 -6" stroke="#5B3A29" stroke-width="1" fill="none"/></g></g>`;
}

const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const [r1, r2] = i % 2 ? [62, 84] : [58, 100];
  return `<path d="M${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)} L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)}"/>`;
}).join("");

// Behind the plants: the sun's glow and turning rays over the painted sun, clouds drifting through
// the open sky between the apple tree and the palm (faded at both ends), and birds.
const SKY = `<defs>
    <radialGradient id="pjGlow"><stop offset="0" stop-color="#FFF4B8" stop-opacity=".9"/><stop offset=".5" stop-color="#FFF0B0" stop-opacity=".35"/><stop offset="1" stop-color="#FFF6D0" stop-opacity="0"/></radialGradient>
    <filter id="pjSoft" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
    <g id="pjCloud" fill="#fff" filter="url(#pjSoft)"><ellipse cx="0" cy="0" rx="90" ry="26"/><circle cx="-38" cy="-14" r="34"/><circle cx="10" cy="-30" r="42"/><circle cx="54" cy="-10" r="28"/></g>
    <path id="pjBird" d="M-22 -2 Q-11 -16 0 0 Q11 -16 22 -2" fill="none" stroke="#3E4F63" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <linearGradient id="pjSkyFade"><stop offset=".15" stop-color="#fff" stop-opacity="0"/><stop offset=".23" stop-color="#fff"/><stop offset=".76" stop-color="#fff"/><stop offset=".84" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="pjOpenSky" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="125"><rect width="1536" height="125" fill="url(#pjSkyFade)"/></mask>
  </defs>
  <g transform="translate(${SUN[0]} ${SUN[1]})">
    <circle class="amb pj-glow" r="170" fill="url(#pjGlow)"/>
    <g class="amb pj-spin" stroke="#FFE38A" stroke-width="8" stroke-linecap="round" opacity=".75">${SUN_RAYS}</g>
  </g>
  <g mask="url(#pjOpenSky)">${cloud(94, 0.8, 0.75, 170, -30, 420)}${cloud(100, 0.55, 0.6, 230, -150, 900)}${cloud(88, 0.7, 0.7, 200, -95, 640)}</g>
  <g class="pj-birds">${flock(90, 41, -6, 3, false)}${flock(160, 63, -38, 2, true)}${flock(50, 89, -70, 4, false)}</g>`;

// In front of the plants: butterflies over the beds, a bee doing loops, drips from the watering can.
const CREATURES = `
  ${butterfly("bfA", "#F29B38", "#F6C945", 2.2, -4)}
  ${butterfly("bfB", "#E2709A", "#F5B8CC", 2, -13)}
  <g class="amb pj-bee" style="--d:-5s"><g transform="scale(2)"><g class="amb pj-buzz">
    <ellipse cx="-2" cy="-6" rx="5" ry="4" fill="#fff" opacity=".85"/><ellipse cx="4" cy="-6" rx="5" ry="4" fill="#fff" opacity=".85"/>
    <ellipse rx="8" ry="5.5" fill="#F6C945"/><path d="M-3 -5 v10 M2 -5.4 v10.8" stroke="#3A2A1E" stroke-width="2.4"/><circle cx="8" cy="-1" r="3" fill="#3A2A1E"/>
  </g></g></g>
  <g fill="#5AA8E0" transform="translate(1314 800)">
    <path class="amb pj-drip" style="--d:0s" d="M0 0 c2.4 3.6 3.6 5.4 3.6 6.9 a3.6 3.6 0 0 1 -7.2 0 c0 -1.5 1.2 -3.3 3.6 -6.9z"/>
    <path class="amb pj-drip" style="--d:-.7s" d="M-14 6 c2 3 3 4.5 3 5.8 a3 3 0 0 1 -6 0 c0 -1.3 1 -2.8 3 -5.8z"/>
  </g>`;

function bedHtml(bed) {
  const gap = Math.min(BED_GAP_MAX, BED_SPAN / Math.max(1, bed.length));
  const start = BED_CENTRE - (gap * bed.length) / 2;
  return bed
    .map((f, i) => plantAt(f.symbol, (start + gap * (i + 0.5)).toFixed(1), BED_BASE, BED_SIZE))
    .join("");
}

/**
 * SVG markup for the garden.
 * @param {{flowers: number, towardNext: number, perFlower: number, kinds?: string[], bed?: Array<{symbol: string}>, waiting?: boolean}} g
 *   kinds: the symbol of every flower by index, including the one growing now (its leaves show it).
 *   bed: mastered-skill flowers for the front strip, oldest first.
 *   waiting: nothing to show yet (the history is still loading), so the beds stay empty.
 */
export function gardenSvg({ flowers, towardNext, perFlower, kinds = [], bed = [], waiting = false }) {
  const shown = waiting ? 0 : Math.min(flowers, SLOT_COUNT);
  const kindAt = (i) => kinds[i] ?? "p-flower";
  const plants = []; // [soil y, markup]
  for (let i = 0; i < shown; i++) {
    const [cx, base] = SLOTS[i];
    plants.push([base, plantAt(kindAt(i), cx, base, FLOWER_SIZE)]);
  }
  if (!waiting && flowers < SLOT_COUNT) {
    const [cx, base] = SLOTS[flowers];
    plants.push([base, plantAt(growingSymbol(towardNext, perFlower), cx, base, GROWING_SIZE, kindAt(flowers))]);
  }
  plants.sort((a, b) => a[0] - b[0]); // further back first
  const strip = waiting ? [] : bed.slice(-BED_COUNT); // the newest when the strip is full
  const t = ((Date.now() - LOADED_AT) / 1000).toFixed(2);

  return `<svg viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" style="--t:${t}s" role="img" aria-label="Class garden with ${shown} flowers${strip.length ? ` and ${strip.length} learned-skill flowers` : ""}">
    <image href="${BACKGROUND}" width="1536" height="1024"/>
    ${SKY}
    <g>${plants.map((p) => p[1]).join("")}</g>
    <g>${bedHtml(strip)}</g>
    ${CREATURES}
  </svg>`;
}
