// Reference renderer: presentation only. Keep classStats/masteredFlowers as the data owners.
import { growingSymbol } from '../../pb_public/js/projector/garden-scene.js';
import { PLANT_KINDS } from '../../pb_public/js/plants.js';

const background = new URL('./assets/garden-background.png', import.meta.url).href;
const atlas = new URL('./assets/growth-stages.png', import.meta.url).href;
const leafyAtlas = new URL('./assets/leafy-plant-kinds.png', import.meta.url).href;
const matureAtlas = new URL('./assets/mature-plant-kinds.png', import.meta.url).href;
export const SLOT_COUNT = 13;
export const BED_COUNT = 22;
// Soil anchors in the background's native 1536 × 1024 coordinate system.
export const SLOTS = [
  [565, 425], [680, 445], [800, 425], [920, 445], [1040, 425],
  [195, 625], [310, 650], [430, 625], [570, 650],
  [970, 625], [1085, 650], [1200, 625], [1330, 650],
];
const safeSymbol = (s) => /^p-[a-z-]+$/.test(s ?? '') ? s : 'p-flower';
const escapeAttribute = (s) => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

function plant(symbol, x, y, size, animate = false, kindSymbol = null) {
  const frame = ['p-seed', 'p-sprout', 'p-leafy'].indexOf(symbol);
  const kindIndex = PLANT_KINDS.findIndex(k => k.symbol === kindSymbol);
  const matureIndex = PLANT_KINDS.findIndex(k => k.symbol === symbol);
  const art = matureIndex >= 0
    ? `<svg x="${-size / 2}" y="${-size * .96}" width="${size}" height="${size}" viewBox="${(matureIndex % 4) * 362} ${Math.floor(matureIndex / 4) * 362} 362 362" overflow="hidden"><image href="${escapeAttribute(matureAtlas)}" width="1448" height="1086"/></svg>`
    : symbol === 'p-leafy' && kindIndex >= 0
    ? `<svg x="${-size / 2}" y="${-size * .94}" width="${size}" height="${size}" viewBox="${(kindIndex % 4) * 362} ${Math.floor(kindIndex / 4) * 362} 362 362" overflow="hidden"><image href="${escapeAttribute(leafyAtlas)}" width="1448" height="1086"/></svg>`
    : frame < 0
    ? `<svg x="${-size / 2}" y="${-size * 100 / 110}" width="${size}" height="${size}" viewBox="0 0 100 110"><use href="#${safeSymbol(symbol)}"/></svg>`
    : `<svg x="${-size / 2}" y="${-size * 670 / 724}" width="${size}" height="${size}" viewBox="${frame * 724} 0 724 724" overflow="hidden"><image href="${escapeAttribute(atlas)}" width="2172" height="724"/></svg>`;
  return `<g transform="translate(${x} ${y})"><g class="garden-plant${animate ? ' garden-arrival' : ''}">${art}</g></g>`;
}

/** Same input shape as the existing gardenSvg. Mount the existing plant symbols first. */
export function gardenSvg({ flowers = 0, towardNext = 0, perFlower = 3,
  kinds = [], bed = [], newFrom = SLOT_COUNT, grew = false, waiting = false } = {}) {
  const count = Math.min(SLOT_COUNT, Math.max(0, Math.floor(flowers)));
  const plants = [];
  if (!waiting) {
    for (let i = 0; i < count; i++) {
      const [x, y] = SLOTS[i];
      plants.push({ y, art: plant(kinds.length ? kinds[i % kinds.length] : 'p-flower', x, y, 160, i >= newFrom) });
    }
    if (count < SLOT_COUNT) {
      const [x, y] = SLOTS[count];
      plants.push({ y, art: plant(growingSymbol(towardNext, perFlower), x, y, 180, grew, kinds.length ? kinds[count % kinds.length] : 'p-flower') });
    }
  }
  const mastered = waiting ? [] : bed.slice(-BED_COUNT);
  const gap = Math.min(54, 1100 / Math.max(1, mastered.length));
  const start = 650 - gap * mastered.length / 2;
  const mastery = mastered.map((f, i) => plant(f.symbol, start + gap * (i + .5), 895, 70, f.isNew)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" preserveAspectRatio="none" role="img" aria-label="Shared garden with ${waiting ? 0 : count} class flowers and ${mastered.length} mastered-skill flowers">
    <image href="${escapeAttribute(background)}" width="1536" height="1024"/>
    ${plants.sort((a, b) => a.y - b.y).map(p => p.art).join('')}${mastery}
  </svg>`;
}
