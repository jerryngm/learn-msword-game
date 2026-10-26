// The community garden picture (#s9): a fixed scene with planter boxes whose slots fill with
// flowers as the class earns stars. The next slot shows the flower that is growing now.
// Bloomed flowers take turns through the present learners' plant kinds, so every learner's plant
// shows up. The front bed holds one small flower, in the learner's own kind, for every skill a
// learner in the room has mastered (no names: learners know their own kind).
// Uses the stage symbols copied from index.html into projector.html (#p-seed … #p-fruit) plus the
// kind symbols that js/plants.js adds. The scene's own art (clouds, birds, butterflies…) lives here.
//
// Life in the scene (sun, clouds, birds, butterflies, bee, swaying plants) is CSS animation in
// projector.css. The stage is redrawn on every data change, so each ambient animation is offset by
// the time since the page loaded (--t): a redraw carries on where the last one was, never restarts.

// Slots in the scene's viewBox (0 -110 1000 690) as [centre x, soil line], front box first, then
// left, then right. Every other plant stands a little further back in its box.
const SLOTS = [
  [373, 421], [418, 399], [501, 421], [588, 399], [631, 421], // back row clear of the trellis posts (x 470, 560)
  [80, 389], [146, 368], [204, 389], [268, 368],
  [752, 399], [812, 378], [874, 399], [930, 378],
];
const PLANT_W = 74;
const PLANT_H = 100;

export const SLOT_COUNT = SLOTS.length;

// Front bed: a strip of ground below the planter boxes, left of the watering can. Flowers are
// spaced evenly along it (centred while there are only a few).
const BED_W = 54;
const BED_H = 70;
const BED_LEFT = 24;
const BED_RIGHT = 846;
const BED_BASE = 554;
const BED_GAP_MAX = 62;
export const BED_COUNT = 22;

const LOADED_AT = Date.now();

/** Stage of the flower that is growing now, from the share of its stars already earned. */
export function growingSymbol(towardNext, perFlower) {
  const share = perFlower > 0 ? towardNext / perFlower : 0;
  if (share >= 2 / 3) return "p-leafy";
  if (share >= 1 / 3) return "p-sprout";
  return "p-seed";
}

/** Four little sparkles around a flower head that has just bloomed (one-shot). */
function sparkles(h) {
  const star = "M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6Z";
  return [[-0.42, -0.8, 0], [0.4, -0.9, 0.15], [-0.3, -1.08, 0.3], [0.34, -0.62, 0.45]]
    .map(([fx, fy, d]) => `<g transform="translate(${(fx * h * 0.7).toFixed(1)} ${(fy * h).toFixed(1)})"><path class="pj-spark" style="animation-delay:${0.7 + d}s" d="${star}" fill="#FFD45C"/></g>`)
    .join("");
}

/**
 * A plant standing on (cx, base). The animated groups sit at the origin so the plant grows and
 * sways from its own soil. `sway` is the phase index for the breeze (null = no sway).
 */
function plantAt(symbol, cx, base, w, h, cls, sway = null) {
  const inner = `<g class="${cls}"><use href="#${symbol}" x="${-w / 2}" y="${-h}" width="${w}" height="${h}"/></g>`;
  const swayed = sway == null ? inner : `<g class="amb pj-sway" style="--d:${(-1.7 * sway).toFixed(1)}s;--dur:${(5.5 + (sway % 3)).toFixed(1)}s">${inner}</g>`;
  const spark = cls.includes("pj-bloom") ? sparkles(h) : "";
  const shadow = `<ellipse cx="${(-w * 0.12).toFixed(1)}" cy="-1" rx="${(w * 0.34).toFixed(1)}" ry="${(w * 0.06).toFixed(1)}" fill="#3A2A1E" opacity=".16"/>`;
  return `<g transform="translate(${cx} ${base})">${shadow}${swayed}${spark}</g>`;
}

function plant(symbol, [cx, base], cls, sway) {
  return plantAt(symbol, cx, base, PLANT_W, PLANT_H, cls, sway);
}

function bedHtml(bed) {
  const shown = bed.slice(-BED_COUNT); // the newest when the bed is full
  const gap = Math.min(BED_GAP_MAX, (BED_RIGHT - BED_LEFT) / Math.max(1, shown.length));
  const start = (BED_LEFT + BED_RIGHT) / 2 - (gap * shown.length) / 2;
  return shown
    .map((f, i) => plantAt(f.symbol, start + gap * (i + 0.5), BED_BASE, BED_W, BED_H, f.isNew ? "pj-plant pj-bloom" : "pj-plant", i + 3))
    .join("");
}

/* ---------- scenery ---------- */

const DEFS = `<defs>
    <linearGradient id="pjSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BFE2EE"/><stop offset=".42" stop-color="#E9F3E4"/><stop offset=".62" stop-color="#FFF2DA"/><stop offset="1" stop-color="#FCE3BC"/>
    </linearGradient>
    <radialGradient id="pjGlow"><stop offset="0" stop-color="#FFE6A0" stop-opacity=".95"/><stop offset=".55" stop-color="#FFE9B8" stop-opacity=".45"/><stop offset="1" stop-color="#FFF2DA" stop-opacity="0"/></radialGradient>
    <linearGradient id="pjHillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D3E4DE"/><stop offset="1" stop-color="#CADFC6"/></linearGradient>
    <linearGradient id="pjHaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6E4" stop-opacity="0"/><stop offset=".5" stop-color="#FFF6E4" stop-opacity=".55"/><stop offset="1" stop-color="#FFF6E4" stop-opacity="0"/></linearGradient>
    <linearGradient id="pjRay" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1C2" stop-opacity=".55"/><stop offset="1" stop-color="#FFF1C2" stop-opacity="0"/></linearGradient>
    <linearGradient id="pjPicket" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E6CCA4"/><stop offset=".45" stop-color="#F8E7CB"/><stop offset="1" stop-color="#FCEFD8"/></linearGradient>
    <linearGradient id="pjFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C08654"/><stop offset="1" stop-color="#94592F"/></linearGradient>
    <linearGradient id="pjSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93592F"/><stop offset="1" stop-color="#6E3F20"/></linearGradient>
    <linearGradient id="pjSoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A3824"/><stop offset="1" stop-color="#7A5034"/></linearGradient>
    <radialGradient id="pjCrownLit" cx=".68" cy=".3" r=".8"><stop offset="0" stop-color="#A6D683"/><stop offset=".55" stop-color="#76B25A"/><stop offset="1" stop-color="#4C8A41"/></radialGradient>
    <radialGradient id="pjVignette" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#3A2A1E" stop-opacity="0"/><stop offset="1" stop-color="#3A2A1E" stop-opacity=".16"/></radialGradient>
    <linearGradient id="pjHillMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CBE2B2"/><stop offset="1" stop-color="#B5D696"/></linearGradient>
    <linearGradient id="pjHillNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B2D48E"/><stop offset="1" stop-color="#9DC679"/></linearGradient>
    <linearGradient id="pjFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A6CD82"/><stop offset="1" stop-color="#8FBE6C"/></linearGradient>
    <linearGradient id="pjWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BF8452"/><stop offset="1" stop-color="#9A6237"/></linearGradient>
    <linearGradient id="pjCrown" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8CC56A"/><stop offset="1" stop-color="#4F8F43"/></linearGradient>
    <g id="pjCloud"><ellipse cx="0" cy="0" rx="62" ry="20"/><circle cx="-26" cy="-10" r="24"/><circle cx="8" cy="-22" r="30"/><circle cx="38" cy="-8" r="20"/></g>
    <path id="pjBird" d="M-11 -1 Q-5.5 -8 0 0 Q5.5 -8 11 -1" fill="none" stroke="#4A5F73" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="pjTuft" d="M0 0 q-3 -10 -9 -15 q7 3 9 11 q0 -11 -2 -19 q5 7 4 19 q3 -9 9 -13 q-4 6 -5 17z"/>
  </defs>`;

/** A butterfly that wanders along its own path (pj-bfA/B/C in projector.css) with flapping wings. */
function butterfly(path, wing, wing2, scale, d) {
  return `<g class="amb pj-${path}" style="--d:${d}s"><g transform="scale(${scale})"><g class="amb pj-wings" style="--d:${d / 7}s">
      <path d="M0 0 C-4 -11 -17 -15 -17 -4 C-17 2 -8 4 0 0Z M0 0 C4 -11 17 -15 17 -4 C17 2 8 4 0 0Z" fill="${wing}"/>
      <path d="M0 0 C-3 6 -11 13 -13 6 C-14 2 -6 0 0 0Z M0 0 C3 6 11 13 13 6 C14 2 6 0 0 0Z" fill="${wing2}"/>
      <circle cx="-9" cy="-6" r="2.2" fill="#fff" opacity=".7"/><circle cx="9" cy="-6" r="2.2" fill="#fff" opacity=".7"/>
    </g><ellipse rx="1.7" ry="6.5" fill="#5B3A29"/><path d="M-.5 -6 q-2 -5 -5 -6 M.5 -6 q2 -5 5 -6" stroke="#5B3A29" stroke-width="1" fill="none"/></g></g>`;
}

/** A small flock crossing the sky now and then. `flip` flies right to left. */
function flock(y, dur, d, count, flip) {
  const birds = [[0, 0, 1], [-28, 10, 0.85], [-16, -13, 0.75], [-44, -4, 0.7]].slice(0, count);
  const inner = `<g class="amb pj-fly" style="--dur:${dur}s;--d:${d}s"><g class="amb pj-bob">${birds
    .map(([x, yy, s], i) => `<g transform="translate(${x} ${yy}) scale(${s})"><g class="amb pj-flap" style="--d:${-0.13 * i}s"><use href="#pjBird"/></g></g>`)
    .join("")}</g></g>`;
  return `<g transform="${flip ? `translate(1000 ${y}) scale(-1 1)` : `translate(0 ${y})`}">${inner}</g>`;
}

const SKY = `
    <rect y="-110" width="1000" height="690" fill="url(#pjSky)"/>
    <g fill="#fff">
      <g transform="translate(0 -6)"><g class="amb pj-drift" style="--dur:150s;--d:-40s;--x:120px"><use href="#pjCloud" opacity=".92"/></g></g>
      <g transform="translate(0 70)"><g class="amb pj-drift" style="--dur:210s;--d:-150s;--x:560px"><use href="#pjCloud" transform="scale(.7)" opacity=".8"/></g></g>
      <g transform="translate(0 22)"><g class="amb pj-drift" style="--dur:180s;--d:-100s;--x:330px"><use href="#pjCloud" transform="scale(1.15 .9)" opacity=".85"/></g></g>
    </g>
    <g class="amb pj-rays" fill="url(#pjRay)">
      <path d="M850 36 L300 330 L420 330Z"/><path d="M850 36 L520 330 L600 330Z" opacity=".8"/><path d="M850 36 L80 300 L190 330Z" opacity=".6"/>
    </g>
    <g transform="translate(850 36)">
      <circle class="amb pj-glow" r="150" fill="url(#pjGlow)"/>
      <g class="amb pj-spin" stroke="#FFD98A" stroke-width="7" stroke-linecap="round" opacity=".85">${Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        const r1 = i % 2 ? 70 : 66;
        const r2 = i % 2 ? 88 : 98;
        return `<path d="M${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)} L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)}"/>`;
      }).join("")}</g>
      <circle r="56" fill="#FFDE94"/><circle r="45" fill="#FFCB5E"/><circle cx="-14" cy="-14" r="12" fill="#fff" opacity=".22"/>
    </g>
    <g class="pj-birds">${flock(14, 41, -6, 3, false)}${flock(66, 63, -38, 2, true)}${flock(-12, 89, -70, 4, false)}</g>`;

const BACKGROUND = `
    <path d="M0 262 C120 212 240 222 360 252 C480 202 640 192 780 232 C880 212 950 222 1000 232 V580 H0Z" fill="url(#pjHillFar)"/>
    <rect x="0" y="206" width="1000" height="90" fill="url(#pjHaze)"/>
    <path d="M0 300 C140 230 260 250 380 280 C520 220 700 230 1000 270 V580 H0Z" fill="url(#pjHillMid)"/>
    <g>
      <ellipse cx="376" cy="332" rx="46" ry="6" fill="#4E7A3A" opacity=".25"/>
      <path d="M395 330 C393 300 397 270 395 242" stroke="#7A4E33" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M398 328 C397 300 400 272 398 246" stroke="#A47A4E" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M395 276 L376 258 M396 266 L414 250" stroke="#8A5A3B" stroke-width="5" stroke-linecap="round"/>
      <g transform="translate(395 300)"><g class="amb pj-sway" style="--dur:9s;--d:-2s">
        <circle cx="-32" cy="-64" r="30" fill="#5E9A4A"/><circle cx="0" cy="-86" r="44" fill="url(#pjCrownLit)"/><circle cx="31" cy="-62" r="31" fill="url(#pjCrownLit)"/>
        <circle cx="-4" cy="-114" r="28" fill="url(#pjCrownLit)"/>
        <path d="M-40 -48 C-30 -36 -8 -34 4 -44 C-10 -40 -26 -42 -40 -48Z" fill="#3F7A3A" opacity=".45"/>
        <circle cx="14" cy="-112" r="9" fill="#fff" opacity=".2"/><circle cx="34" cy="-74" r="6" fill="#fff" opacity=".15"/>
        <g fill="#E8553E"><circle cx="-20" cy="-80" r="4"/><circle cx="18" cy="-96" r="4"/><circle cx="26" cy="-60" r="4"/><circle cx="-34" cy="-56" r="3.5"/></g>
      </g></g>
    </g>
    <g>
      <ellipse cx="636" cy="335" rx="34" ry="6" fill="#4E7A3A" opacity=".25"/>
      <path d="M642 334 C646 280 660 210 690 152 L699 156 C674 212 664 282 664 334Z" fill="#A47A4E"/>
      <path d="M645 312 h17 M648 284 h15 M653 256 h14 M660 228 h13 M668 200 h12 M678 174 h11" stroke="#86603A" stroke-width="2.5" stroke-linecap="round"/>
      <g fill="#7FB360"><use href="#pjTuft" x="636" y="336"/><use href="#pjTuft" x="662" y="337" transform="scale(1)"/></g>
      <g transform="translate(694 150)"><g class="amb pj-swayc" style="--d:-3s">
        <g fill="#5E9E4F"><path d="M0 0 C-20 -22 -50 -22 -66 -4 C-46 -12 -22 -8 0 0Z"/><path d="M0 0 C22 -24 52 -22 68 -2 C48 -12 22 -8 0 0Z"/><path d="M0 0 C-10 -30 -6 -50 6 -62 C2 -40 4 -20 0 0Z"/></g>
        <g fill="#4F8F43"><path d="M0 0 C-28 -4 -50 10 -58 34 C-40 16 -22 8 0 0Z"/><path d="M0 0 C28 -4 52 12 58 36 C40 18 22 8 0 0Z"/></g>
        <g fill="#8A5A3B"><circle cx="-6" cy="6" r="6"/><circle cx="6" cy="7" r="6"/><circle cx="0" cy="12" r="5.5"/></g>
      </g></g>
    </g>
    <path d="M0 340 C200 290 380 320 520 310 C700 290 860 300 1000 320 V580 H0Z" fill="url(#pjHillNear)"/>`;

const FENCE = `
    <path d="M0 351 H300 L290 359 H-10Z M740 351 H1000 V359 H730Z" fill="#4E7A3A" opacity=".18"/>
    <g fill="url(#pjPicket)" stroke="#DDBE90" stroke-width="2">
      <path d="M20 350 v-70 l12 -12 l12 12 v70z M80 350 v-70 l12 -12 l12 12 v70z M140 350 v-70 l12 -12 l12 12 v70z M200 350 v-70 l12 -12 l12 12 v70z M260 350 v-70 l12 -12 l12 12 v70z M760 350 v-70 l12 -12 l12 12 v70z M820 350 v-70 l12 -12 l12 12 v70z M880 350 v-70 l12 -12 l12 12 v70z M940 350 v-70 l12 -12 l12 12 v70z"/>
      <rect x="0" y="300" width="300" height="10" rx="4"/><rect x="0" y="330" width="300" height="10" rx="4"/><rect x="740" y="300" width="260" height="10" rx="4"/><rect x="740" y="330" width="260" height="10" rx="4"/>
    </g>
    <g fill="#E98AA8"><circle cx="58" cy="344" r="4"/><circle cx="64" cy="338" r="3.5"/><circle cx="236" cy="346" r="4"/><circle cx="800" cy="344" r="4"/><circle cx="806" cy="338" r="3.2"/><circle cx="968" cy="345" r="4"/></g>
    <g fill="#F6C945"><circle cx="120" cy="346" r="3.6"/><circle cx="174" cy="343" r="3.2"/><circle cx="858" cy="346" r="3.6"/><circle cx="916" cy="342" r="3.2"/></g>
    <g>
      <rect x="62" y="236" width="8" height="74" rx="2" fill="#94603A"/><rect x="160" y="236" width="8" height="74" rx="2" fill="#94603A"/>
      <rect x="44" y="201" width="150" height="54" rx="12" fill="#A86E3E"/>
      <rect x="40" y="196" width="150" height="54" rx="12" fill="#FFF7EA" stroke="#C98B55" stroke-width="4"/>
      <path d="M52 206 h20 M158 240 h20" stroke="#E9D6B8" stroke-width="2" stroke-linecap="round"/>
      <text x="115" y="231" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-weight="800" font-size="22" fill="#17324D">Our garden</text>
    </g>
    <g stroke="#B67A45" stroke-width="5" stroke-linecap="round"><path d="M470 360 V170 M560 360 V170 M470 200 H560 M470 260 H560 M470 320 H560 M470 200 L560 260 M560 200 L470 260"/></g>
    <g transform="translate(515 360)"><g class="amb pj-swayc" style="--d:-1s;--dur:11s">
      <path d="M-40 0 C-60 -40 -20 -70 -36 -110 C-50 -140 -10 -160 -30 -180 M40 0 C56 -44 18 -76 36 -116 C50 -146 14 -164 32 -184" stroke="#4F8F43" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g fill="#6DAE57">${[[-35, -170], [-3, -146], [29, -174], [-23, -108], [23, -84], [-35, -54], [37, -132], [-8, -28], [30, -40]]
        .map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${11 + (i % 3) * 2}" ry="${8 + (i % 2) * 2}" transform="rotate(${(i * 47) % 90 - 45} ${x} ${y})"/>`)
        .join("")}</g>
      <g fill="#3F7A3A"><ellipse cx="13" cy="-126" rx="9" ry="6" transform="rotate(30 13 -126)"/><ellipse cx="-15" cy="-74" rx="9" ry="6" transform="rotate(-30 -15 -74)"/><ellipse cx="39" cy="-40" rx="9" ry="6"/></g>
      ${[[-19, -158, "#8E7BD6"], [33, -152, "#E98AA8"], [-31, -86, "#8E7BD6"], [11, -60, "#E98AA8"], [-11, -126, "#7FB7E0"]]
        .map(([x, y, c]) => `<g transform="translate(${x} ${y})"><circle r="7" fill="${c}"/><circle r="2.6" fill="#FFF3C4"/></g>`)
        .join("")}
    </g></g>`;

/**
 * A 2.5D planter box seen from slightly above: a soil top, the front face and (for the side boxes)
 * the side facing the middle of the garden. The top's back edge leans `sx` towards the centre.
 * Light comes from the sun at the top right, so shadows fall down and to the left.
 */
function box(x, yf, w, h, dz, sx) {
  const yb = yf - dz;
  const pts = (list) => list.map(([px, py]) => `${px},${py}`).join(" ");
  const side = sx > 0
    ? pts([[x + w, yf], [x + w + sx, yb], [x + w + sx, yb + h], [x + w, yf + h]])
    : sx < 0 ? pts([[x, yf], [x + sx, yb], [x + sx, yb + h], [x, yf + h]]) : "";
  const inset = 7;
  const soil = pts([[x + inset, yf - 3], [x + w - inset, yf - 3], [x + w + sx - inset, yb + 4], [x + sx + inset, yb + 4]]);
  const n = Math.round(w / 44);
  return `<ellipse cx="${x + w / 2 - 16}" cy="${yf + h + 2}" rx="${w / 2 + 14}" ry="10" fill="#3F6A30" opacity=".22"/>
      ${side ? `<polygon points="${side}" fill="url(#pjSide)"/>` : ""}
      <polygon points="${pts([[x, yf], [x + w, yf], [x + w + sx, yb], [x + sx, yb]])}" fill="#B87C49"/>
      <polygon points="${soil}" fill="url(#pjSoil)"/>
      <g fill="#8A5A3B">${Array.from({ length: n }, (_, i) => `<circle cx="${x + sx / 2 + (w / n) * (i + 0.5) + (i % 2 ? 6 : -6)}" cy="${yf - 8 - (i % 3) * 4}" r="${1.5 + (i % 2)}"/>`).join("")}</g>
      <path d="M${x} ${yf} H${x + w}" stroke="#D69A63" stroke-width="3" stroke-linecap="round"/>
      <rect x="${x}" y="${yf}" width="${w}" height="${h}" rx="6" fill="url(#pjFace)"/>
      <path d="M${x + 4} ${yf + h * 0.36} H${x + w - 4} M${x + 4} ${yf + h * 0.68} H${x + w - 4}" stroke="#6E3F20" stroke-width="2" opacity=".35"/>
      <path d="M${x + w * 0.3} ${yf + h * 0.36} v${h * 0.32} M${x + w * 0.64} ${yf + h * 0.68} v${h * 0.3} M${x + w * 0.5} ${yf + 4} v${h * 0.3}" stroke="#6E3F20" stroke-width="2" opacity=".25"/>
      <path d="M${x + 3} ${yf + 4} H${x + w - 3}" stroke="#fff" stroke-width="3" opacity=".14" stroke-linecap="round"/>
      <path d="M${x + w - 3} ${yf + 4} V${yf + h - 4}" stroke="#fff" stroke-width="3" opacity=".12" stroke-linecap="round"/>`;
}

const BOXES = `<g>${box(40, 392, 260, 60, 32, 14)}${box(720, 402, 250, 56, 32, -14)}${box(330, 424, 360, 58, 34, 0)}</g>`;

const FRONT = `
    <path d="M0 500 C300 492 700 494 1000 502 V580 H0Z" fill="url(#pjFront)"/>
    <g fill="#7FB360">${[30, 120, 230, 318, 404, 512, 590, 676, 760, 846, 966]
      .map((x, i) => `<use href="#pjTuft" x="${x}" y="${514 + (i % 3) * 6}"/>`)
      .join("")}</g>
    <polygon points="12,562 858,562 852,544 18,544" fill="url(#pjSoil)"/>
    <g fill="#8A5A3B">${Array.from({ length: 18 }, (_, i) => `<circle cx="${40 + i * 46 + (i % 2) * 13}" cy="${552 - (i % 3) * 3}" r="${1.4 + (i % 2)}"/>`).join("")}</g>
    <path d="M12 562 H858" stroke="#D69A63" stroke-width="3" stroke-linecap="round"/>
    <rect x="12" y="562" width="846" height="20" rx="4" fill="url(#pjFace)"/>
    <path d="M14 566 H856" stroke="#fff" stroke-width="2.5" opacity=".14" stroke-linecap="round"/>
    <g fill="#B9A58C"><ellipse cx="96" cy="572" rx="6" ry="3.5"/><ellipse cx="330" cy="574" rx="5" ry="3"/><ellipse cx="610" cy="572" rx="6" ry="3.5"/><ellipse cx="790" cy="574" rx="5" ry="3"/></g>`;

const CAN = `
    <ellipse cx="900" cy="575" rx="38" ry="6" fill="#3F6A30" opacity=".22"/>
    <use href="#can" x="872" y="508" width="76" height="68"/>
    <g fill="#5AA8E0">${[[0, 0], [0.9, 7], [1.8, -5]]
      .map(([dx, dy], i) => `<g transform="translate(${938 + dx * 5} ${552 + dy})"><circle class="amb pj-drip" style="--d:${-0.5 * i}s" r="2.2"/></g>`)
      .join("")}</g>`;

const CREATURES = `
    <g transform="translate(0 0)">
      ${butterfly("bfA", "#F29B38", "#F6C945", 1.8, -4)}
      ${butterfly("bfB", "#E2709A", "#F5B8CC", 1.6, -13)}
      ${butterfly("bfC", "#3E8FD0", "#8EC3EC", 1.5, -21)}
    </g>
    <g class="amb pj-bee" style="--d:-5s"><g transform="scale(1.5)"><g class="amb pj-buzz">
      <ellipse cx="-2" cy="-6" rx="5" ry="4" fill="#fff" opacity=".85"/><ellipse cx="4" cy="-6" rx="5" ry="4" fill="#fff" opacity=".85"/>
      <ellipse rx="8" ry="5.5" fill="#F6C945"/><path d="M-3 -5 v10 M2 -5.4 v10.8" stroke="#3A2A1E" stroke-width="2.4"/><circle cx="8" cy="-1" r="3" fill="#3A2A1E"/>
    </g></g></g>`;

/**
 * SVG markup for the garden.
 * @param {{flowers: number, towardNext: number, perFlower: number, newFrom: number, grew: boolean, kinds?: string[], bed?: Array<{symbol: string, isNew: boolean}>, waiting?: boolean}} g
 *   kinds: flower symbols to take turns through (one per present learner); sunflowers when empty.
 *   bed: mastered-skill flowers for the front bed, oldest first (isNew ones animate in).
 *   newFrom: flowers at index >= newFrom bloomed since the last draw (they animate in).
 *   grew: stars arrived since the last draw (the growing plant gets a gentle nudge).
 *   waiting: no live session, so the boxes stay empty.
 */
export function gardenSvg({ flowers, towardNext, perFlower, newFrom, grew, kinds = [], bed = [], waiting = false }) {
  const shown = Math.min(flowers, SLOT_COUNT);
  const plants = []; // [soil y, markup]
  if (!waiting) {
    for (let i = 0; i < shown; i++) {
      plants.push([SLOTS[i][1], plant(kinds.length ? kinds[i % kinds.length] : "p-flower", SLOTS[i], i >= newFrom ? "pj-plant pj-bloom" : "pj-plant", i)]);
    }
    if (flowers < SLOT_COUNT) {
      plants.push([SLOTS[flowers][1], plant(growingSymbol(towardNext, perFlower), SLOTS[flowers], grew ? "pj-plant pj-nudge" : "pj-plant", flowers)]);
    }
  }
  const firstEmpty = waiting ? 0 : flowers + 1;
  const spots = SLOTS.slice(firstEmpty).map(([cx, base]) => `<ellipse cx="${cx}" cy="${base - 2}" rx="13" ry="4.5" fill="none" stroke="#B88A5E" stroke-width="2" opacity=".75"/><ellipse cx="${cx}" cy="${base - 2}" rx="8" ry="2.6" fill="#3E2617" opacity=".6"/>`).join("");
  plants.sort((a, b) => a[0] - b[0]);
  const t = ((Date.now() - LOADED_AT) / 1000).toFixed(2);

  return `<svg viewBox="0 -110 1000 690" preserveAspectRatio="xMidYMax slice" style="--t:${t}s" role="img" aria-label="Class garden with ${shown} flowers${bed.length ? ` and ${bed.length} learned-skill flowers` : ""}">
    ${DEFS}${SKY}${BACKGROUND}${FENCE}${BOXES}
    <g>${spots}${plants.map((p) => p[1]).join("")}</g>
    ${FRONT}
    <g>${waiting ? "" : bedHtml(bed)}</g>
    ${CAN}${CREATURES}
    <rect y="-110" width="1000" height="690" fill="url(#pjVignette)" pointer-events="none"/>
  </svg>`;
}
