// The community garden picture (#s9): a fixed scene with planter boxes whose slots fill with
// flowers as the class earns stars. The next slot shows the flower that is growing now.
// Uses the plant symbols copied from index.html into projector.html (#p-seed … #p-flower).

// Slots in the scene's viewBox (0 -110 1000 630), front box first, then left, then right.
const SLOTS = [
  [340, 336], [404, 328], [468, 328], [532, 336], [598, 340],
  [44, 292], [104, 292], [164, 292], [224, 292],
  [724, 302], [786, 302], [846, 302], [906, 302],
];
const PLANT_W = 74;
const PLANT_H = 100;

export const SLOT_COUNT = SLOTS.length;

/** Stage of the flower that is growing now, from the share of its stars already earned. */
export function growingSymbol(towardNext, perFlower) {
  const share = perFlower > 0 ? towardNext / perFlower : 0;
  if (share >= 2 / 3) return "p-leafy";
  if (share >= 1 / 3) return "p-sprout";
  return "p-seed";
}

function plant(symbol, [x, y], cls) {
  // Slot x/y are the top-left of a 66×90 plant; bigger plants keep the same centre and soil line.
  const px = x - (PLANT_W - 66) / 2;
  const py = y - (PLANT_H - 90);
  return `<use href="#${symbol}" class="${cls}" x="${px}" y="${py}" width="${PLANT_W}" height="${PLANT_H}"/>`;
}

/**
 * SVG markup for the garden.
 * @param {{flowers: number, towardNext: number, perFlower: number, newFrom: number, grew: boolean, waiting?: boolean}} g
 *   newFrom: flowers at index >= newFrom bloomed since the last draw (they animate in).
 *   grew: stars arrived since the last draw (the growing plant gets a gentle nudge).
 *   waiting: no live session, so the boxes stay empty.
 */
export function gardenSvg({ flowers, towardNext, perFlower, newFrom, grew, waiting = false }) {
  const shown = Math.min(flowers, SLOT_COUNT);
  const plants = [];
  if (!waiting) {
    for (let i = 0; i < shown; i++) plants.push(plant("p-flower", SLOTS[i], i >= newFrom ? "pj-plant pj-bloom" : "pj-plant"));
    if (flowers < SLOT_COUNT) {
      plants.push(plant(growingSymbol(towardNext, perFlower), SLOTS[flowers], grew ? "pj-plant pj-nudge" : "pj-plant"));
    }
  }

  return `<svg viewBox="0 -110 1000 630" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Class garden with ${shown} flowers">
    <rect y="-110" width="1000" height="630" fill="url(#gSky)"/>
    <circle cx="840" cy="40" r="62" fill="#FFE1A0"/><circle cx="840" cy="40" r="44" fill="#FFD074"/>
    <path d="M0 300 C140 230 260 250 380 280 C520 220 700 230 1000 270 V520 H0Z" fill="#D6E8BE"/>
    <path d="M0 340 C200 290 380 320 520 310 C700 290 860 300 1000 320 V520 H0Z" fill="#B9D89A"/>
    <g fill="#F6E2C2" stroke="#E2C59A" stroke-width="2">
      <path d="M20 350 v-70 l12 -12 l12 12 v70z M80 350 v-70 l12 -12 l12 12 v70z M140 350 v-70 l12 -12 l12 12 v70z M200 350 v-70 l12 -12 l12 12 v70z M260 350 v-70 l12 -12 l12 12 v70z M760 350 v-70 l12 -12 l12 12 v70z M820 350 v-70 l12 -12 l12 12 v70z M880 350 v-70 l12 -12 l12 12 v70z M940 350 v-70 l12 -12 l12 12 v70z"/>
      <rect x="0" y="300" width="300" height="10" rx="4"/><rect x="0" y="330" width="300" height="10" rx="4"/><rect x="740" y="300" width="260" height="10" rx="4"/><rect x="740" y="330" width="260" height="10" rx="4"/>
    </g>
    <g stroke="#B67A45" stroke-width="5" stroke-linecap="round"><path d="M470 360 V170 M560 360 V170 M470 200 H560 M470 260 H560 M470 320 H560 M470 200 L560 260 M560 200 L470 260"/></g>
    <g fill="#6DAE57"><circle cx="480" cy="190" r="14"/><circle cx="512" cy="214" r="16"/><circle cx="544" cy="186" r="13"/><circle cx="492" cy="252" r="15"/><circle cx="538" cy="276" r="16"/><circle cx="480" cy="306" r="13"/></g>
    <g fill="#3F7A3A"><circle cx="528" cy="234" r="11"/><circle cx="500" cy="286" r="10"/><circle cx="554" cy="320" r="11"/></g>
    <path d="M250 150 c-14 -14 -24 0 -10 8 c-14 8 -2 20 10 6 c12 14 24 2 10 -6 c14 -8 4 -22 -10 -8z" fill="#F29B38"/><path d="M250 146 v22" stroke="#8A5A3B" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M680 120 c-10 -10 -18 0 -7 6 c-11 6 -1 15 7 4 c8 11 18 2 7 -4 c11 -6 3 -16 -7 -6z" fill="#E98A8A"/><path d="M680 117 v16" stroke="#8A5A3B" stroke-width="2" stroke-linecap="round"/>
    <g><rect x="80" y="246" width="7" height="60" fill="#94603A"/><rect x="40" y="200" width="150" height="50" rx="10" fill="#FFF7EA" stroke="#C98B55" stroke-width="4"/><text x="115" y="233" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-weight="800" font-size="22" fill="#17324D">Our garden</text></g>
    <g>
      <rect x="40" y="380" width="260" height="70" rx="12" fill="#A86E3E"/><rect x="40" y="372" width="260" height="22" rx="10" fill="#7A4E33"/>
      <rect x="720" y="390" width="250" height="66" rx="12" fill="#A86E3E"/><rect x="720" y="382" width="250" height="22" rx="10" fill="#7A4E33"/>
      <rect x="330" y="420" width="360" height="66" rx="12" fill="#B87C49"/><rect x="330" y="412" width="360" height="22" rx="10" fill="#7A4E33"/>
    </g>
    <g>${plants.join("")}</g>
    <use href="#can" x="860" y="452" width="76" height="68"/>
  </svg>`;
}
