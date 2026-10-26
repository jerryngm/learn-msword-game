// Plant kinds: every learner grows their own kind (stored in `learners.plant`, picked at join so the
// class gets a mix). Seed, sprout, leafy and wilted look the same for every kind; the grown plant
// shows the kind. Sunflower and tomato use the page's own #p-flower and #p-fruit symbols; the others
// are added to the page's sprite by mountPlantSymbols(). No DOM work happens at import time.

export const PLANT_KINDS = [
  { key: "sunflower", symbol: "p-flower", en: "Sunflower", vi: "Hoa hướng dương" },
  { key: "tomato", symbol: "p-fruit", en: "Tomato", vi: "Cà chua" },
  { key: "lotus", symbol: "p-lotus", en: "Lotus", vi: "Hoa sen" },
  { key: "apricot", symbol: "p-apricot", en: "Apricot blossom", vi: "Hoa mai" },
  { key: "rose", symbol: "p-rose", en: "Rose", vi: "Hoa hồng" },
  { key: "tulip", symbol: "p-tulip", en: "Tulip", vi: "Hoa tulip" },
  { key: "chilli", symbol: "p-chilli", en: "Chilli", vi: "Cây ớt" },
  { key: "lavender", symbol: "p-lavender", en: "Lavender", vi: "Hoa oải hương" },
  { key: "hibiscus", symbol: "p-hibiscus", en: "Hibiscus", vi: "Hoa dâm bụt" },
  { key: "orchid", symbol: "p-orchid", en: "Orchid", vi: "Hoa lan" },
  { key: "peach", symbol: "p-peach", en: "Peach blossom", vi: "Hoa đào" },
  { key: "marigold", symbol: "p-marigold", en: "Marigold", vi: "Hoa vạn thọ" },
];

const BY_KEY = new Map(PLANT_KINDS.map((k) => [k.key, k]));

/** The learner's plant kind. Learners without one (or with an unknown key) get a stable pick from their id. */
export function plantKindOf(learner) {
  const stored = BY_KEY.get(learner?.plant);
  if (stored) return stored;
  const id = String(learner?.id ?? "");
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PLANT_KINDS[h % PLANT_KINDS.length];
}

/** A kind key for a new learner: one of the least-used kinds among `usedKeys`, chosen at random. */
export function pickPlantKey(usedKeys, random = Math.random) {
  const count = new Map(PLANT_KINDS.map((k) => [k.key, 0]));
  for (const key of usedKeys ?? []) if (count.has(key)) count.set(key, count.get(key) + 1);
  const fewest = Math.min(...count.values());
  const options = PLANT_KINDS.filter((k) => count.get(k.key) === fewest);
  return options[Math.floor(random() * options.length) % options.length].key;
}

const STAGE_SYMBOL = { seed: "p-seed", sprout: "p-sprout", leafy: "p-leafy" };

/** The sprite symbol for a skill state in the learner's kind (wilted plants droop; never red). */
export function plantSymbol(state, kind) {
  if (!state) return "p-seed";
  if (state.wilted) return "p-wilt";
  if (state.stage === "flowering") return (kind ?? PLANT_KINDS[0]).symbol;
  return STAGE_SYMBOL[state.stage] ?? "p-seed";
}

/* ---------- sprite symbols (viewBox 0 0 100 110, soil line ~y100, same as the stage symbols) ---------- */

// Stem and four leaves shared by the grown plants; the head is drawn on top, the mound covers the stem base.
const STEM = `<path d="M50 98 C48 80 52 58 50 30" stroke="#3F7A3A" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <use href="#leafL" x="49.4" y="88" fill="url(#gLeaf2)"/><use href="#leafR" x="49.6" y="78" fill="url(#gLeaf)"/>
  <use href="#leafL" x="50.6" y="62" fill="url(#gLeaf)"/><use href="#leafR" x="50.7" y="52" fill="url(#gLeaf2)"/>`;
const MOUND = `<use href="#mound"/>`;

/** A five-petal blossom at (x, y). */
const blossom = (x, y, r, petal, centre) =>
  `<g transform="translate(${x} ${y})" fill="${petal}">${[0, 72, 144, 216, 288]
    .map((a) => `<circle r="${r}" transform="rotate(${a}) translate(0 -${r})"/>`)
    .join("")}<circle r="${(r * 0.55).toFixed(1)}" fill="${centre}"/></g>`;

/** A ring of `n` ellipse petals around (0, 0). */
const ring = (n, rx, ry, dist, fill, offset = 0) =>
  `<g fill="${fill}">${Array.from({ length: n }, (_, i) => `<ellipse rx="${rx}" ry="${ry}" transform="rotate(${offset + (i * 360) / n}) translate(0 -${dist})"/>`).join("")}</g>`;

/** Twigs with blossoms, for the Tết trees (mai and đào). */
const blossomTree = (petal, centre) => `
  <path d="M50 98 C49 80 51 60 50 34" stroke="#7A4E33" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M50 66 C42 60 36 54 32 44 M50 52 C58 48 64 42 68 32 M50 80 C58 78 64 74 68 66" stroke="#7A4E33" stroke-width="3" fill="none" stroke-linecap="round"/>
  <use href="#leafL" x="49.4" y="88" fill="url(#gLeaf2)"/>
  ${blossom(50, 28, 5.5, petal, centre)}${blossom(31, 42, 5, petal, centre)}${blossom(69, 30, 5, petal, centre)}
  ${blossom(68, 64, 4.5, petal, centre)}${blossom(40, 56, 3.8, petal, centre)}`;

const SYMBOLS = {
  "p-lotus": `${STEM}
  <g transform="translate(50 30)">
    <path d="M0 6 C-22 6 -28 -6 -26 -12 C-16 -10 -8 -4 0 6Z M0 6 C22 6 28 -6 26 -12 C16 -10 8 -4 0 6Z" fill="#F2A7BE"/>
    <path d="M0 6 C-14 2 -18 -12 -14 -22 C-6 -16 -2 -8 0 6Z M0 6 C14 2 18 -12 14 -22 C6 -16 2 -8 0 6Z" fill="#EE8FAE"/>
    <path d="M0 6 C-8 -4 -7 -18 0 -28 C7 -18 8 -4 0 6Z" fill="#F7C2D3"/>
    <path d="M0 2 C-3 -6 -3 -16 0 -22" stroke="#E07A9A" stroke-width="1.4" fill="none" opacity=".6"/>
  </g>${MOUND}`,
  "p-apricot": `${blossomTree("#F6C945", "#E08A1E")}${MOUND}`,
  "p-peach": `${blossomTree("#F5A9C0", "#D9577E")}${MOUND}`,
  "p-rose": `${STEM}
  <g transform="translate(50 26)">
    <path d="M-15 2 C-18 -10 -10 -18 0 -17 C10 -18 18 -10 15 2 C12 12 -12 12 -15 2Z" fill="#D83A4E"/>
    <path d="M-10 0 C-12 -9 -5 -13 1 -12 C8 -12 12 -7 10 0 C8 7 -8 7 -10 0Z" fill="#E8576A"/>
    <path d="M-5 -2 C-6 -8 0 -9 3 -7 C6 -5 5 0 1 1 C-2 2 -1 -3 1 -4" stroke="#B82A3E" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M-15 2 C-10 8 -4 10 0 10 C4 10 10 8 15 2" stroke="#B82A3E" stroke-width="1.6" fill="none"/>
  </g>${MOUND}`,
  "p-tulip": `${STEM}
  <g transform="translate(50 26)">
    <path d="M-12 -2 C-14 -16 -10 -22 -8 -24 L-3 -14 L0 -24 L3 -14 L8 -24 C10 -22 14 -16 12 -2 C10 8 -10 8 -12 -2Z" fill="#E8553E"/>
    <path d="M0 -24 L3 -14 L0 6 L-3 -14Z" fill="#F0703F"/>
    <path d="M-9 -4 C-8 2 -4 5 0 5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".35"/>
  </g>${MOUND}`,
  "p-chilli": `
  <path d="M50 98 C47 80 53 60 50 32" stroke="#3F7A3A" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M50 66 C42 62 36 58 32 50 M51 50 C58 48 64 44 68 38" stroke="#3F7A3A" stroke-width="3" fill="none" stroke-linecap="round"/>
  <use href="#leafL" x="48.6" y="86" fill="url(#gLeaf2)"/><use href="#leafR" x="49.6" y="78" fill="url(#gLeaf)"/>
  <use href="#leafL" x="51.4" y="40" fill="url(#gLeaf)"/><use href="#leafR" x="50.6" y="34" fill="url(#gLeaf2)"/>
  <path d="M29 50 C25 60 26 72 34 82 C33 72 35 62 36 51Z" fill="#E03A2E"/>
  <path d="M65 38 C63 48 65 60 74 68 C72 58 72 48 72 39Z" fill="#E8553E"/>
  <path d="M46 70 C43 78 44 86 51 93 C50 86 51 78 53 71Z" fill="#E03A2E"/>
  <path d="M28.5 50 h8 M64.5 38 h8 M45.5 70 h8" stroke="#3F7A3A" stroke-width="3.2" stroke-linecap="round"/>
  ${MOUND}`,
  "p-lavender": `
  <path d="M50 98 C49 76 50 52 50 20 M50 96 C44 76 38 60 34 38 M50 96 C56 76 62 60 66 38" stroke="#5E8F4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <use href="#leafL" x="49.4" y="92" fill="url(#gLeaf2)"/><use href="#leafR" x="49.6" y="88" fill="url(#gLeaf)"/>
  ${[[50, 20, 0], [34, 38, -14], [66, 38, 14]]
    .map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})" fill="#9C7BD0">${[0, 6, 12, 18, 24]
      .map((d, i) => `<ellipse cx="${i % 2 ? 2.4 : -2.4}" cy="${d}" rx="3.4" ry="4.4"/>`)
      .join("")}<ellipse cy="-4" rx="2.6" ry="3.6" fill="#B79BE0"/></g>`)
    .join("")}
  ${MOUND}`,
  "p-hibiscus": `${STEM}
  <g transform="translate(50 28)">
    ${ring(5, 11, 13, 11, "#F08CC0")}
    ${ring(5, 5, 7, 6, "#B0306E", 36)}
    <path d="M0 0 C4 -8 10 -14 14 -22" stroke="#F6E27A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="14" cy="-22" r="2.8" fill="#F6C945"/>
  </g>${MOUND}`,
  "p-orchid": `${STEM}
  <g transform="translate(50 26)">
    ${ring(3, 5, 13, 10, "#D9A6E0", 0)}
    <ellipse rx="9" ry="11" transform="rotate(-60) translate(0 -10)" fill="#C77FD3"/>
    <ellipse rx="9" ry="11" transform="rotate(60) translate(0 -10)" fill="#C77FD3"/>
    <path d="M-6 2 C-8 12 8 12 6 2 C4 -2 -4 -2 -6 2Z" fill="#8E3FA0"/>
    <circle cy="-1" r="2.6" fill="#F6E27A"/>
  </g>${MOUND}`,
  "p-marigold": `${STEM}
  <g transform="translate(50 26)">
    ${ring(14, 5, 7, 12, "#D9581A")}
    ${ring(10, 4.5, 6, 7, "#E8762A", 18)}
    <circle r="6" fill="#F08A2E"/>
  </g>${MOUND}`,
};

/** Add the plant-kind symbols to the page's #sprite once (the stage symbols already live in the page). */
export function mountPlantSymbols(doc = globalThis.document) {
  const sprite = doc?.getElementById("sprite");
  if (!sprite) return;
  const html = Object.entries(SYMBOLS)
    .filter(([id]) => !doc.getElementById(id))
    .map(([id, body]) => `<symbol id="${id}" viewBox="0 0 100 110">${body}</symbol>`)
    .join("");
  if (html) sprite.insertAdjacentHTML("beforeend", html);
}
