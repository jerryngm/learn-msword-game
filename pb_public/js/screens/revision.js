import { instructionPair, punctuationReminder } from "../content/text-rules.js";
// Weekly Revision (#s3) with the warm-up first and the cool-down last (#s13).
// One item per screen, at most two main buttons, no timers. The try ladder (Contracts):
// wrong 1 → the gentle toast; wrong 2 → the hint; wrong 3 → the answer is shown, then the learner does it.
// One attempt is written per finished item, and finishing always earns at least 1 ⭐.

import { bi, biPair, esc, label, labelPair, t } from "../i18n.js";
import { skillById } from "../content/skills.js";
import { mountWord, getInternals } from "../word/index.js";
import { createHints } from "../word/hints.js";
import { playDemo, validateScript } from "../demo/player.js";
import { buildRound } from "../revision.js";
import { reviewComplete, skillState, starsFor } from "../rules.js";
import { mountAsk } from "../ask.js";
import { mountHelperAlert } from "../helper-alerts.js";
import {
  getRun, hintCount, learnerAttempts, loadContent, playContext, recordAttempt, setRun, takePracticeSkill, tapGuard,
} from "../game-data.js";
import { gbi, glabel, gt } from "../strings-game.js";
import { calmHtml, starsHtml } from "./success.js";

const PRACTICE_LENGTH = 3;
const WRONG_GAP_MS = 700; // the same wrong target inside this gap is one try (a double-click or a held key)
const NEXT_GAP_MS = 600; // Next ignores presses this soon after the answer (a held Enter from the last answer)
const FRESH_CARD_MS = 450; // a new card ignores clicks this soon after it appears (the second click of a double-click on Next)

const now = () => performance.now();

/* ---------- small helpers ---------- */

function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffled, but never left in the correct order when there are two or more. */
function shuffleAway(list) {
  if (list.length < 2) return [...list];
  let out = shuffle(list);
  for (let k = 0; k < 6 && out.every((x, i) => x === list[i]); k++) out = shuffle(list);
  if (out.every((x, i) => x === list[i])) out = [...list.slice(1), list[0]];
  return out;
}

const pair = (p) => (p && typeof p === "object" ? { en: String(p.en ?? ""), vi: String(p.vi ?? p.en ?? "") } : { en: String(p ?? ""), vi: String(p ?? "") });
/** biPair, without a repeated second line when the content's Vietnamese is the same as the English (e.g. "Document1"). */
const bp = (p) => (p.vi && p.vi !== p.en ? biPair(p) : esc(p.en));
const isImgPath = (s) => typeof s === "string" && /\.(svg|png|jpe?g|webp|gif)$/i.test(s);

function imgHtml(img) {
  if (!img) return "";
  if (isImgPath(img)) return `<span class="wg-opt-img"><img src="${esc(img)}" alt=""></span>`;
  return `<span class="wg-opt-img wg-opt-emoji" aria-hidden="true">${esc(img)}</span>`;
}

function initialsOf(name) {
  return String(name ?? "").trim().split(/\s+/).filter(Boolean).map((w) => Array.from(w)[0]).slice(0, 2).join("");
}

/* ---------- mini mocks for click-ui (pluggable: js/mocks/<name>.js) ---------- */

const mockCache = new Map();

/**
 * Loads `js/mocks/<name>.js`. A mock module exports
 *   mount(el, {item, mission, learner, onRegion(id), onOpen(name)}) → {destroy(), reveal?(regionId)}
 * Returns null when the module isn't there yet; the caller then uses a placeholder.
 */
export function loadMock(name) {
  if (!/^[a-z0-9-]+$/.test(String(name))) return Promise.resolve(null);
  if (!mockCache.has(name)) {
    const url = new URL(`../mocks/${name}.js`, import.meta.url);
    // Probe first: a mock that isn't written yet would otherwise log a module-load error.
    const probe = fetch(url, { method: "HEAD" })
      .then((r) => r.ok && /javascript/.test(r.headers.get("content-type") ?? ""))
      .catch(() => false);
    mockCache.set(
      name,
      probe
        .then((ok) => (ok ? import(url.href) : null))
        .then((mod) => (mod && typeof mod.mount === "function" ? mod : null))
        .catch((err) => {
          console.error(`mock ${name} failed to load`, err);
          return null;
        }),
    );
  }
  return mockCache.get(name);
}

// Placeholder layouts: unlabelled shapes, so the question isn't given away. Grid areas per region id.
const PLACEHOLDERS = {
  "word-static": {
    cls: "ph-word",
    regions: ["title", "qat", "tabs", "ribbon", "document", "status"],
  },
  "start-menu": { cls: "ph-start", regions: ["search", "pinned", "word", "recommended", "power"] },
  explorer: { cls: "ph-explorer", regions: ["address", "searchbox", "nav", "files"] },
};

function placeholderMock(host, item, onRegion) {
  const base = PLACEHOLDERS[item.mock] ?? { cls: "ph-generic", regions: [] };
  const ids = Array.isArray(item.regions) && item.regions.length ? item.regions.map(String) : base.regions;
  const regions = ids.includes(String(item.answer)) ? ids : [...ids, String(item.answer)];
  host.innerHTML = `<div class="wg-ph ${base.cls}" role="group" aria-label="${esc(glabel("mockSoon"))}">
      ${regions.map((id, i) => `<button type="button" class="wg-ph-r" data-region="${esc(id)}" style="grid-area:${/^[a-z]+$/.test(id) ? id : "auto"}"
        aria-label="${esc(glabel("regionN", { n: i + 1 }))}"><span class="wg-ph-art" aria-hidden="true"></span></button>`).join("")}
    </div>`;
  const onClick = (e) => {
    const b = e.target.closest("[data-region]");
    if (b && !b.disabled) onRegion(b.dataset.region, b);
  };
  host.addEventListener("click", onClick);
  return {
    reveal(id) {
      host.querySelector(`[data-region="${CSS.escape(String(id))}"]`)?.classList.add("is-reveal");
    },
    destroy() {
      host.removeEventListener("click", onClick);
    },
  };
}

/* ---------- replay: the real actions, played once after the answer ---------- */
// item.replay = {mock: 'word' | 'word-static' | 'start-menu' | 'explorer' | 'keyboard' | 'none', doc?, script}.
// The stage is mounted read-only (inert: no clicks, no focus); the shared player draws everything over it and never
// changes a model. The replay never writes an attempt.

const REPLAY_STAGES = new Set(["word", "word-static", "start-menu", "explorer", "keyboard", "none"]);
const REPLAY_DELAY_MS = 1600; // the learner sees their right answer (stars, green choice) before the replay covers it

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const nextFrame = () => new Promise((done) => requestAnimationFrame(() => done()));

/** A replay that can be played: a known stage and a script the player accepts. Logs and returns null otherwise. */
function replayOf(item) {
  const r = item?.replay;
  if (!r) return null;
  try {
    if (!REPLAY_STAGES.has(r.mock)) throw new TypeError(`unknown replay stage "${r.mock}"`);
    validateScript(r.script);
    return r.script.length ? r : null;
  } catch (err) {
    console.error(`replay for ${item.id} is not playable`, err);
    return null;
  }
}

/** The mocks share css/mocks.css; measure targets only after it applies (a mock hides itself until then). */
function mockStylesReady(signal) {
  const link = document.head.querySelector("link[data-wg-mocks]");
  if (!link || link.sheet) return Promise.resolve();
  return new Promise((done) => {
    const t = setTimeout(finish, 2000);
    function finish() {
      clearTimeout(t);
      link.removeEventListener("load", finish);
      link.removeEventListener("error", finish);
      signal.removeEventListener("abort", finish);
      done();
    }
    link.addEventListener("load", finish);
    link.addEventListener("error", finish);
    signal.addEventListener("abort", finish);
  });
}

/** Where ghost typing starts on the keyboard-only and caption-only stages: the empty line at the top. */
function lineAnchor(line) {
  const r = line.getBoundingClientRect();
  const cs = getComputedStyle(line);
  const size = parseFloat(cs.fontSize) || 24;
  const h = size * 1.35;
  return {
    x: r.left,
    y: r.top + (r.height - h) / 2,
    h,
    left: r.left,
    right: r.right,
    font: { family: cs.fontFamily, size, weight: cs.fontWeight, style: cs.fontStyle, color: cs.color },
  };
}

/**
 * Mounts the replay stage in `stageEl` and returns {resolve, caret?, destroy()} for the player, or plays the whole
 * thing itself for `word` (the engine owns its demo hooks). Every stage is visual only.
 */
async function mountReplayStage(stageEl, replay, { item, learner, signal }) {
  if (replay.mock === "word") {
    const word = mountWord(stageEl, {
      doc: replay.doc ?? "",
      tabs: Array.isArray(item.tabs) ? item.tabs : ["home"],
      title: "Document1",
      initials: initialsOf(learner?.name),
    });
    return { word, destroy: () => word.destroy() };
  }
  if (replay.mock === "keyboard" || replay.mock === "none") {
    stageEl.innerHTML = `<div class="wg-replay-blank"><div class="wg-replay-line"></div></div>`;
    const line = stageEl.querySelector(".wg-replay-line");
    return { resolve: () => null, caret: () => lineAnchor(line), destroy: () => stageEl.replaceChildren() };
  }
  const mod = await loadMock(replay.mock);
  if (signal.aborted) return null;
  if (!mod) {
    // The captions still play; targets on this stage are skipped (the player warns for each one).
    console.error(`replay for ${item.id}: mock ${replay.mock} is not available`);
    return { resolve: () => null, destroy: () => stageEl.replaceChildren() };
  }
  // No onRegion: the mock mounts as a replay stage (its "before" state) and resolve() switches its stages.
  const ctl = mod.mount(stageEl, { item, learner });
  await mockStylesReady(signal);
  await nextFrame();
  return {
    resolve: (id) => (typeof ctl?.resolve === "function" ? ctl.resolve(id) : null),
    destroy: () => ctl?.destroy?.(),
  };
}

/**
 * Plays `item.replay` in a panel inside `card`, laid over the `cover` elements (the prompt and the item area), with a
 * small Skip link; the footer (stars, Next) stays visible. Returns stop(), safe to call more than once; it aborts the
 * player, destroys the stage and removes the panel. `onEnd` runs once when the panel goes, for any reason.
 */
function startReplay(card, cover, item, { learner, onEnd }) {
  const replay = replayOf(item);
  if (!replay) return null;
  const reduced = prefersReducedMotion();
  const ctrl = new AbortController();
  const { signal } = ctrl;
  const panel = document.createElement("div");
  panel.className = "wg-replay";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", label("replayLabel"));
  panel.innerHTML = `<div class="wg-replay-bar">
      <p class="wg-replay-h">${bi("replayTitle")}</p>
      <button type="button" class="wg-replay-skip">${bi("replaySkip")}</button>
    </div>
    <div class="wg-replay-stage" inert></div>`;
  const stageEl = panel.querySelector(".wg-replay-stage");
  const skipBtn = panel.querySelector(".wg-replay-skip");
  let stage = null;

  // The panel covers the union of the cover elements, in the card's own coordinates.
  const place = () => {
    const rects = cover.filter(Boolean).map((el) => el.getBoundingClientRect());
    if (!rects.length) return;
    const C = card.getBoundingClientRect();
    const top = Math.min(...rects.map((r) => r.top)) - C.top - card.clientTop;
    const left = Math.min(...rects.map((r) => r.left)) - C.left - card.clientLeft;
    const bottom = Math.max(...rects.map((r) => r.bottom)) - C.top - card.clientTop;
    const right = Math.max(...rects.map((r) => r.right)) - C.left - card.clientLeft;
    Object.assign(panel.style, { top: `${top}px`, left: `${left}px`, width: `${right - left}px`, height: `${bottom - top}px` });
  };
  const resizeObserver = new ResizeObserver(place);

  const stop = () => {
    if (signal.aborted) return;
    const hadFocus = panel.contains(document.activeElement);
    resizeObserver.disconnect();
    ctrl.abort();
    try {
      stage?.destroy?.();
    } catch (err) {
      console.error("replay stage could not be removed", err);
    }
    stage = null;
    panel.remove();
    card.classList.remove("is-replaying");
    onEnd?.({ hadFocus });
  };
  skipBtn.addEventListener("click", stop);
  place();
  card.classList.add("is-replaying");
  card.appendChild(panel);
  resizeObserver.observe(card);

  (async () => {
    try {
      const mounted = await mountReplayStage(stageEl, replay, { item, learner, signal });
      if (signal.aborted) {
        // Stopped while the stage was loading: nothing may stay behind.
        mounted?.destroy?.();
        return;
      }
      stage = mounted;
      if (!stage) return;
      if (stage.word) {
        // The engine's own demo: Word targets, caret typing, ghost menus. stop() destroys the engine, which cancels it.
        await stage.word.demo(replay.script);
      } else {
        await playDemo(stageEl, replay.script, { resolve: stage.resolve, caret: stage.caret, reducedMotion: reduced, signal });
      }
    } catch (err) {
      console.error(`replay for ${item.id} failed`, err);
      stop();
      return;
    }
    if (signal.aborted) return;
    // Reduced motion: the numbered markers and the typed text stay for the learner to read, until Close or Next.
    if (reduced) skipBtn.innerHTML = bi("replayClose");
    else stop();
  })();
  return stop;
}

/** The optional "where you are" picture (item.context = {mock, at}): a mock without handlers, put on the right stage. */
function mountContext(hostEl, item, learner) {
  const c = item.context;
  if (!c || typeof c.mock !== "string") return null;
  let ctl = null;
  let alive = true;
  loadMock(c.mock).then((mod) => {
    if (!alive) return;
    if (!mod) {
      console.error(`context picture for ${item.id}: mock ${c.mock} is not available`);
      hostEl.closest(".wg-q-context")?.remove();
      return;
    }
    try {
      ctl = mod.mount(hostEl, { item, learner });
      if (typeof c.at === "string" && c.at) ctl?.resolve?.(c.at);
    } catch (err) {
      console.error(`context picture for ${item.id} failed`, err);
      hostEl.closest(".wg-q-context")?.remove();
    }
  });
  return () => {
    alive = false;
    ctl?.destroy?.();
  };
}

/* ---------- item runners: (host, item, api) → {reveal(), hint?(), destroy()} ---------- */
// api: {wrong(), solved(), feedback(html), setCheck(fn | null), learner}

/**
 * Optional picture for a pick item: item.figure = {table: [[cell text…]…], mark?: {row}|{col}|{cell:[row, col]}}.
 * A small Word-style table; the marked cells are shaded so the question can say "the coloured cells".
 */
function figureHtml(fig) {
  if (!fig || !Array.isArray(fig.table) || !fig.table.length) return "";
  const m = fig.mark ?? {};
  const marked = (r, c) => m.row === r || m.col === c || (Array.isArray(m.cell) && m.cell[0] === r && m.cell[1] === c);
  const rows = fig.table
    .map((row, r) => `<tr>${(Array.isArray(row) ? row : []).map((t, c) => `<td${marked(r, c) ? ' class="is-mark"' : ""}>${esc(String(t ?? ""))}</td>`).join("")}</tr>`)
    .join("");
  return `<figure class="wg-q-figure"><table class="wg-q-ftable">${rows}</table></figure>`;
}

function runPick(host, item, api) {
  const opts = Array.isArray(item.options) ? item.options : [];
  const cols = opts.length <= 2 ? "two" : opts.length === 3 ? "three" : opts.length <= 4 ? "four" : "three";
  host.innerHTML = `${figureHtml(item.figure)}<div class="wg-choices ${cols}">${opts
    .map((o) => `<button type="button" class="wg-choice" data-id="${esc(o.id)}">${imgHtml(o.img)}<span class="wg-choice-t">${o.label ? bp(pair(o.label)) : ""}</span></button>`)
    .join("")}</div>`;
  const onClick = (e) => {
    const b = e.target.closest(".wg-choice");
    if (!b || b.disabled || host.dataset.done) return;
    if (b.dataset.id === String(item.answer)) {
      host.dataset.done = "1";
      b.classList.add("is-right");
      host.querySelectorAll(".wg-choice").forEach((x) => x !== b && x.classList.add("is-quiet"));
      api.solved();
    } else {
      b.classList.add("is-nope");
      b.disabled = true;
      api.wrong(`option:${b.dataset.id}`);
    }
  };
  host.addEventListener("click", onClick);
  return {
    reveal() {
      host.querySelector(`.wg-choice[data-id="${CSS.escape(String(item.answer))}"]`)?.classList.add("is-reveal");
      api.feedback(biPair(gt("revealPick")));
    },
    destroy: () => host.removeEventListener("click", onClick),
  };
}

function runClickUi(host, item, api) {
  host.innerHTML = `<div class="wg-mock-host"></div>`;
  const mockEl = host.firstElementChild;
  let ctl = null;
  let done = false;
  let alive = true;
  const onRegion = (id, el) => {
    if (done) return;
    if (String(id) === String(item.answer)) {
      done = true;
      el?.classList?.add("is-right");
      api.solved();
    } else {
      el?.classList?.add("is-nope");
      api.wrong(`region:${id}`);
    }
  };
  loadMock(item.mock).then((mod) => {
    if (!alive) return;
    try {
      ctl = mod ? mod.mount(mockEl, { item, learner: api.learner, onRegion }) : placeholderMock(mockEl, item, onRegion);
    } catch (err) {
      console.error(`mock ${item.mock} failed; using the placeholder`, err);
      mockEl.replaceChildren();
      ctl = placeholderMock(mockEl, item, onRegion);
    }
  });
  return {
    reveal() {
      ctl?.reveal?.(item.answer);
      api.feedback(biPair(gt("revealPick")));
    },
    destroy() {
      alive = false;
      ctl?.destroy?.();
    },
  };
}

function runOrder(host, item, api) {
  const steps = (Array.isArray(item.steps) ? item.steps : []).map((s) => ({ id: String(s.id), label: pair(s.label) }));
  const correct = steps.map((s) => s.id);
  const pool = shuffleAway(steps);
  const placed = [];
  let revealed = false;
  let busy = false;
  const tap = tapGuard(300); // a double-click on a placed step takes it back once, not the step that slides into its place

  const draw = () => {
    host.innerHTML = `<div class="wg-order">
        <div class="wg-order-col">
          <p class="wg-order-h">${gbi("orderTapHint")}</p>
          <div class="wg-order-pool">${pool
            .map((s) => {
              const used = placed.includes(s);
              const n = revealed ? correct.indexOf(s.id) + 1 : "";
              return `<button type="button" class="wg-step${used ? " is-used" : ""}" data-id="${esc(s.id)}" ${used ? "disabled" : ""}>
                ${revealed ? `<span class="wg-step-n is-hint" aria-hidden="true">${n}</span>` : ""}<span>${bp(s.label)}</span></button>`;
            })
            .join("")}</div>
        </div>
        <div class="wg-order-col wg-order-mine">
          <p class="wg-order-h">${gbi("orderYours")}</p>
          <ol class="wg-order-slots">${steps
            .map((_, i) => {
              const s = placed[i];
              return s
                ? `<li><button type="button" class="wg-step is-placed" data-back="${esc(s.id)}" aria-label="${esc(labelPair(s.label))}">
                    <span class="wg-step-n" aria-hidden="true">${i + 1}</span><span>${bp(s.label)}</span></button></li>`
                : `<li class="wg-slot-empty"><span class="wg-step-n" aria-hidden="true">${i + 1}</span></li>`;
            })
            .join("")}</ol>
          ${placed.length ? `<p class="wg-order-back">${gbi("orderTapBack")}</p>` : ""}
        </div>
      </div>`;
  };

  const onClick = (e) => {
    if (busy || host.dataset.done) return;
    const add = e.target.closest("[data-id]");
    const back = e.target.closest("[data-back]");
    if (back && !add && !tap()) return;
    if (add && !add.disabled) {
      placed.push(pool.find((s) => s.id === add.dataset.id));
    } else if (back) {
      placed.splice(placed.findIndex((s) => s.id === back.dataset.back), 1);
    } else return;
    draw();
    if (placed.length === steps.length) {
      if (placed.every((s, i) => s.id === correct[i])) {
        host.dataset.done = "1";
        host.querySelector(".wg-order-mine")?.classList.add("is-right");
        api.solved();
      } else {
        busy = true;
        api.wrong("order");
        // Steps already in the right place stay; only the rest go back.
        let keep = 0;
        while (keep < placed.length && placed[keep].id === correct[keep]) keep += 1;
        setTimeout(() => {
          placed.length = keep;
          busy = false;
          if (!host.dataset.done) draw();
        }, 900);
      }
    }
  };
  draw();
  host.addEventListener("click", onClick);
  return {
    reveal() {
      revealed = true;
      placed.length = 0;
      draw();
      api.feedback(biPair(gt("revealOrder")));
    },
    destroy: () => host.removeEventListener("click", onClick),
  };
}

function runSort(host, item, api) {
  const bins = (Array.isArray(item.bins) ? item.bins : []).map((b) => ({ id: String(b.id), label: pair(b.label) }));
  const cards = shuffle((Array.isArray(item.cards) ? item.cards : []).map((c) => ({ id: String(c.id), label: pair(c.label), bin: String(c.bin) })));
  const inBin = new Map(bins.map((b) => [b.id, []]));
  let index = 0;
  let revealed = false;
  let quietUntil = 0; // after a card is placed the bins redraw; a second click of a double-click must not answer the next card

  const draw = () => {
    const card = cards[index];
    host.innerHTML = `<div class="wg-sort">
        <div class="wg-sort-now" aria-live="polite">
          ${card ? `<p class="wg-sort-q">${gbi("sortWhere")} <span class="wg-sort-count">${bp(gt("sortCount", { n: index + 1, total: cards.length }))}</span></p>
          <div class="wg-sort-card">${bp(card.label)}</div>` : ""}
        </div>
        <div class="wg-bins">${bins
          .map((b) => `<button type="button" class="wg-bin${revealed && card && card.bin === b.id ? " is-reveal" : ""}" data-bin="${esc(b.id)}" ${card ? "" : "disabled"}>
              <span class="wg-bin-h">${bp(b.label)}</span>
              <span class="wg-bin-cards">${inBin.get(b.id).map((c) => `<span class="wg-bin-chip">${bp(c.label)}</span>`).join("")}</span>
            </button>`)
          .join("")}</div>
      </div>`;
  };

  const onClick = (e) => {
    const b = e.target.closest("[data-bin]");
    const card = cards[index];
    if (!b || b.disabled || !card || host.dataset.done || now() < quietUntil) return;
    if (b.dataset.bin === card.bin) {
      inBin.get(card.bin).push(card);
      index += 1;
      quietUntil = now() + FRESH_CARD_MS;
      draw();
      if (index >= cards.length) {
        host.dataset.done = "1";
        api.solved();
      }
    } else {
      b.classList.remove("is-nudge");
      void b.offsetWidth; // restart the gentle nudge animation
      b.classList.add("is-nudge");
      api.wrong(`bin:${b.dataset.bin}`);
    }
  };
  draw();
  host.addEventListener("click", onClick);
  return {
    reveal() {
      revealed = true;
      draw();
      api.feedback(biPair(gt("revealSort")));
    },
    destroy: () => host.removeEventListener("click", onClick),
  };
}

function runFix(host, item, api) {
  const accept = Array.isArray(item.accept) ? item.accept.map((s) => String(s).trim()) : [];
  const ok = (text) => {
    const v = String(text).trim();
    if (accept.length && accept.includes(v)) return true;
    if (typeof item.check === "function") {
      try {
        return Boolean(item.check(text));
      } catch (err) {
        console.error(`check failed for ${item.id}`, err);
      }
    }
    return false;
  };
  host.innerHTML = `<div class="wg-fix">
      <label class="wg-fix-l" for="wgFix">${gbi("fixLabel")}</label>
      <textarea id="wgFix" class="wg-fix-in" rows="2" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
      <div class="wg-fix-model" hidden></div>
    </div>`;
  const input = host.querySelector("textarea");
  input.value = String(item.text ?? "");
  const check = () => {
    if (host.dataset.done) return;
    if (ok(input.value)) {
      host.dataset.done = "1";
      input.readOnly = true;
      input.classList.add("is-right");
      api.solved();
    } else api.wrong("check");
  };
  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!e.repeat) check(); // a held Enter is one press
    }
  };
  input.addEventListener("keydown", onKey);
  api.setCheck(check);
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  return {
    reveal() {
      const model = host.querySelector(".wg-fix-model");
      const answer = accept[0];
      if (answer) {
        model.innerHTML = `<span class="wg-fix-ml">${gbi("revealFix")}</span><span class="wg-fix-mt">${esc(answer)}</span>`;
        model.hidden = false;
      }
      input.focus();
    },
    destroy: () => input.removeEventListener("keydown", onKey),
  };
}

function runDo(host, item, api) {
  host.innerHTML = `<div class="wg-do-host"></div>`;
  const ctx = { saved: null, opened: null, commands: [], selection: null, learner: { name: api.learner?.name ?? "" } };
  const word = mountWord(host.firstElementChild, {
    doc: item.doc ?? "",
    tabs: Array.isArray(item.tabs) ? item.tabs : ["home"],
    title: "Document1",
    initials: initialsOf(api.learner?.name),
  });
  const met = () => {
    try {
      ctx.selection = word.selection;
      return Boolean(item.check?.(word.getDoc(), ctx));
    } catch (err) {
      console.error(`check failed for ${item.id}`, err);
      return false;
    }
  };
  let done = false;
  const completionReminder = () => punctuationReminder(word.getDoc(), item.expectedText ?? item.doc);
  const finish = () => {
    if (done) return;
    done = true;
    hints.hide();
    api.solved(completionReminder());
  };
  const offChange = word.on("change", () => met() && !completionReminder() && finish());
  // Selecting words is not a document change, so check once the mouse is released (not in the middle of a drag).
  let pressed = false;
  let selTimer = 0;
  const onSel = () => {
    clearTimeout(selTimer);
    selTimer = setTimeout(() => {
      if (done || pressed || getInternals(word).demoRunning) return;
      if (met() && !completionReminder()) finish();
    }, 250);
  };
  const watchSel = item.autoSelect ?? /^t3-select/.test(String(item.skill));
  const onDown = () => (pressed = true);
  const onUp = () => {
    pressed = false;
    onSel();
  };
  if (watchSel) {
    document.addEventListener("selectionchange", onSel);
    host.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
  }
  const offCommand = word.on("command", (event) => {
    if (!event.menu && !getInternals(word).demoRunning) ctx.commands.push(event.id);
  });
  const onSaved = (p) => {
    ctx.saved = p && typeof p === "object" ? { folder: Array.isArray(p.folder) ? p.folder : [], name: String(p.name ?? "") } : null;
    if (met()) finish();
  };
  const offSaved = word.on("saved", onSaved);
  const onSavedDom = (e) => onSaved(e.detail);
  host.addEventListener("wg-saved", onSavedDom);
  const hints = createHints(word, { hint1: item.hint ? pair(item.hint) : null, spotlight: item.spotlight, demo: item.demo });
  api.setCheck(() => (met() ? finish() : api.wrong("check")));
  return {
    hint() {
      if (!item.hint) return false;
      hints.show(item.spotlight ? 2 : 1);
      return true;
    },
    reveal() {
      api.feedback(biPair(gt("revealDo")));
      if (Array.isArray(item.demo) && item.demo.length) hints.show(3);
      else if (item.spotlight) hints.show(2);
    },
    destroy() {
      clearTimeout(selTimer);
      document.removeEventListener("selectionchange", onSel);
      host.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      offChange();
      offCommand();
      offSaved();
      host.removeEventListener("wg-saved", onSavedDom);
      hints.destroy();
      word.destroy();
    },
  };
}

const RUNNERS = { pick: runPick, "click-ui": runClickUi, order: runOrder, sort: runSort, fix: runFix, do: runDo };

/* ---------- the screen ---------- */

export async function render(root, { learner }) {
  root.innerHTML = `<main class="screen center-screen"><p class="lead">${gbi("loading")}</p></main>`;
  const practiceSkill = takePracticeSkill();
  const [play, attempts] = await Promise.all([playContext(), learnerAttempts(learner.id)]);
  const sessionId = play.session?.id ?? null;
  const practiceTopic = practiceSkill ? skillById(practiceSkill)?.topic : null;
  const content = await loadContent([...new Set([...play.topics, ...play.taught, ...(practiceTopic ? [practiceTopic] : [])])]);
  const byId = new Map(content.items.filter((i) => i && RUNNERS[i.type]).map((i) => [i.id, i]));

  // Resume this session's round after a reload. A new practice request starts fresh, and a leftover practice run
  // is never picked up by the Weekly Revision card.
  let run = getRun();
  const resumable =
    !practiceSkill &&
    run?.kind === "revision" &&
    run.sessionId === sessionId &&
    run.preset === play.preset &&
    Array.isArray(run.round) &&
    run.index < run.round.length &&
    run.round.every((id) => byId.has(id));
  if (!resumable) {
    const items = [...byId.values()].filter((i) => (practiceSkill ? i.skill === practiceSkill : true));
    const round = buildRound({
      items,
      attempts,
      topics: practiceTopic ? [practiceTopic] : play.topics,
      length: practiceSkill ? Math.min(PRACTICE_LENGTH, items.length) : play.length,
      preset: practiceSkill ? "custom" : play.preset,
      taughtTopics: play.taught,
      today: new Date(),
    });
    run = { kind: practiceSkill ? "practice" : "revision", sessionId, preset: practiceSkill ? "custom" : play.preset, target: practiceSkill ? PRACTICE_LENGTH : play.length, started: Date.now(), round: round.map((i) => i.id), index: 0, results: [] };
    setRun(run);
  }

  if (!run.round.length) {
    setRun(null);
    root.innerHTML = calmHtml({
      icon: "🌿",
      titleKey: "emptyRevisionTitle",
      bodyKey: "emptyRevisionBody",
      actions: [
        { href: "#/home", key: "backHome", primary: true },
        { href: "#/free", key: "practiceFree" },
      ],
    });
    return null;
  }

  const round = run.round.map((id) => byId.get(id));
  let current = null; // {ctl, item}
  let currentSkill = null;
  let currentItem = null;
  let toastTimer = 0;
  let closed = false;
  let savedNoteShown = false;
  let stopReplay = null; // aborts the running replay (Skip, Next, leaving the screen)
  let replayTimer = 0;
  let stopContext = null;

  /** Ends the replay and the "where you are" picture of the card being left. */
  function clearCardExtras() {
    clearTimeout(replayTimer);
    replayTimer = 0;
    stopReplay?.();
    stopReplay = null;
    stopContext?.();
    stopContext = null;
  }

  root.innerHTML = `<main class="screen wg-rev">
      <header class="lhead"><span class="brand">🌱 ${esc(t("brand").en)}</span>
        <div class="wg-top-actions"><a class="wg-finish" href="#/home">🏠 ${gbi("backHome")}</a><a class="wg-finish wg-finish-end" href="#/end">${gbi("finish")}</a><span id="askSlot"></span></div>
        <div id="helperBannerSlot"></div>
      </header>
      <div class="wg-rev-body" id="revBody"></div>
      <div class="wg-gtoast" id="revToast" role="status" aria-live="polite"></div>
    </main>`;
  const main = root.querySelector("main");
  const body = root.querySelector("#revBody");
  const toastEl = root.querySelector("#revToast");
  const stopAsk = mountAsk(root.querySelector("#askSlot"), {
    inline: true,
    learner,
    context: () => ({ session: sessionId, skill: currentSkill, item: currentItem?.id ?? null, kind: "revision" }),
  });
  const stopAlert = mountHelperAlert({
    slot: root.querySelector("#helperBannerSlot") || root.querySelector("main"),
    learner,
    session: sessionId,
    variant: "banner",
  });
  if (run.kind === "practice") main.querySelector(".wg-finish-end").href = "#/garden";

  const toast = (html) => {
    clearTimeout(toastTimer);
    toastEl.innerHTML = html;
    toastEl.classList.add("is-shown");
    toastTimer = setTimeout(() => toastEl.classList.remove("is-shown"), 3600);
  };

  function chipHtml(i, total, item) {
    if (total >= 3 && i === 0) return `<span class="chip">${biPair(gt("warmUp"))}</span>`;
    if (total >= 3 && i === total - 1) return `<span class="chip soft">${biPair(gt("coolDown"))}</span>`;
    const topic = skillById(item.skill)?.topic;
    return topic ? `<span class="chip">${biPair(gt("topicChip", { n: topic }))}</span>` : "";
  }

  function dotsHtml(i, total) {
    const last = i === total - 1 && total > 1;
    const dots = Array.from({ length: total }, (_, k) => `<i class="${k < i ? "done" : k === i ? "now" : ""}"></i>`).join("");
    const lbl = last ? gt("lastOne") : gt("progress", { n: i + 1, total });
    return `<div class="wg-dots" role="img" aria-label="${esc(labelPair(gt("progressLabel", { n: i + 1, total })))}">${dots}<span>${biPair(lbl)}</span></div>`;
  }

  function show(i) {
    clearCardExtras();
    current?.ctl?.destroy?.();
    current = null;
    clearTimeout(toastTimer);
    toastEl.classList.remove("is-shown");
    const item = round[i];
    currentItem = item;
    currentSkill = item.skill;
    const isDo = item.type === "do";
    const optional = Boolean(skillById(item.skill)?.optional);
    const heading = `<h1 class="wg-q-h">${instructionPair(pair(item.prompt), item)}</h1>`;
    const hasContext = !isDo && item.context && typeof item.context.mock === "string";
    body.innerHTML = `
      <div class="wg-q-top">${dotsHtml(i, round.length)}${chipHtml(i, round.length, item)}</div>
      <section class="card wg-q-card${isDo ? " is-do" : ""} type-${esc(item.type)}" data-item="${esc(item.id)}">
        ${hasContext
          ? `<div class="wg-q-hrow">${heading}
              <figure class="wg-q-context" role="img" aria-label="${esc(label("contextLabel"))}">
                <div class="wg-q-ctx-pic" inert><div class="wg-q-ctx-in"></div></div>
                <figcaption>${bi("contextHere")}</figcaption>
              </figure></div>`
          : heading}
        <div class="wg-q-main"></div>
        <div class="wg-q-foot">
          <div class="wg-q-fbcol"><div class="wg-q-feedback" aria-live="polite"></div><p class="wg-proof" hidden></p></div>
          <div class="wg-q-btns">
            ${optional ? `<button type="button" class="btn btn-ghost wg-q-skip">${gbi("skipOptional")}</button>` : ""}
            <button type="button" class="btn btn-primary wg-q-check" hidden>${gbi("check")}</button>
            <button type="button" class="btn btn-primary wg-q-next" hidden>${gbi(i === round.length - 1 ? "finishBtn" : "next")}</button>
          </div>
        </div>
      </section>`;
    const card = body.querySelector(".wg-q-card");
    const mainEl = card.querySelector(".wg-q-main");
    const fb = card.querySelector(".wg-q-feedback");
    const checkBtn = card.querySelector(".wg-q-check");
    const nextBtn = card.querySelector(".wg-q-next");
    const skipBtn = card.querySelector(".wg-q-skip");
    const state = { wrongs: 0, help: 0, solved: false, nextAt: 0 };
    const lastWrong = new Map(); // wrong target → time of the last counted wrong
    let proofShown = false;

    // The first moments of a card ignore clicks, so the second click of a double-click on Next can't answer this card.
    const freshUntil = now() + FRESH_CARD_MS;
    for (const type of ["click", "dblclick", "pointerdown", "mousedown"]) {
      card.addEventListener(
        type,
        (e) => {
          if (now() < freshUntil) {
            e.stopPropagation();
            e.preventDefault();
          }
        },
        true,
      );
    }

    const showSolved = ({ stars, help_level, tries }) => {
      checkBtn.hidden = true;
      if (skipBtn) skipBtn.hidden = true;
      fb.className = "wg-q-feedback is-ok";
      const key = tries === 1 && help_level === 0 ? "rightFirst" : help_level > 0 ? "didIt" : "rightNow";
      fb.innerHTML = `<p class="wg-q-ok"><span class="wg-q-stars" role="img" aria-label="${esc(glabel("starsLabel", { n: stars }))}">${starsHtml(stars, { pop: true })}</span><span>${biPair(gt(key))}</span></p>`;
      nextBtn.hidden = false;
    };

    const showProof = async () => {
      if (proofShown || !sessionId) return;
      proofShown = true;
      const n = await hintCount({ session: sessionId, item: item.id, exceptLearner: learner.id });
      if (closed || current?.item !== item || n < 1) return;
      const line = card.querySelector(".wg-proof");
      line.innerHTML = biPair(gt(n === 1 ? "socialProofOne" : "socialProof", { n }));
      line.hidden = false;
    };

    const api = {
      learner,
      feedback(html) {
        fb.className = "wg-q-feedback is-try";
        fb.innerHTML = `<p>${html}</p>`;
      },
      setCheck(fn) {
        checkBtn.hidden = !fn;
        checkBtn.onclick = fn ? () => !state.solved && fn() : null;
      },
      wrong(target = "any") {
        if (state.solved) return;
        // The same target twice in a moment is a double-click or a held key: one try, not two.
        const at = now();
        if (at - (lastWrong.get(target) ?? -Infinity) < WRONG_GAP_MS) return;
        lastWrong.set(target, at);
        state.wrongs += 1;
        toast(biPair(gt("notYet")));
        if (state.wrongs === 2) {
          state.help = Math.max(state.help, 1);
          // A runner that shows the hint itself (Word's hint bubble) returns true.
          const shownByRunner = Boolean(current?.ctl?.hint?.());
          if (item.hint && !shownByRunner) api.feedback(`💡 ${instructionPair(pair(item.hint), item)}`);
          showProof();
        } else if (state.wrongs >= 3 && state.help < 2) {
          state.help = 2;
          current?.ctl?.reveal?.();
          showProof();
        }
      },
      solved(reminder = null) {
        if (state.solved) return;
        state.solved = true;
        const tries = state.wrongs + 1;
        const stars = starsFor({ kind: "revision", help_level: state.help, tries });
        state.nextAt = now() + NEXT_GAP_MS;
        showSolved({ stars, help_level: state.help, tries });
        if (reminder) fb.insertAdjacentHTML("beforeend", `<p role="status">${biPair(reminder)}</p>`);
        // Keep focus in the document while a `do` item is open; elsewhere Enter moves on.
        if (!isDo) nextBtn.focus({ preventScroll: true });
        save(item, { stars, help_level: state.help, tries });
        // Then the real actions play once, over the item. Next works the whole time: it stops the replay and moves on.
        const launch = () => {
          if (closed || current?.item !== item || stopReplay) return;
          // The prompt and the item area; a `do` card keeps its prompt row, because Next sits beside it.
          const cover = isDo ? [mainEl] : [card.querySelector(".wg-q-hrow") ?? card.querySelector(".wg-q-h"), mainEl];
          stopReplay = startReplay(card, cover, item, {
            learner,
            onEnd: ({ hadFocus }) => {
              stopReplay = null;
              // Skip had focus, or the hidden item lost it while the replay covered it: Enter should move on.
              const lost = !document.activeElement || document.activeElement === document.body;
              if ((hadFocus || lost) && !closed && nextBtn.isConnected) nextBtn.focus({ preventScroll: true });
            },
          });
        };
        clearTimeout(replayTimer);
        if (isDo && state.help < 2 && replayOf(item)) {
          // They just did it themselves: don't cover their finished page. Offer the replay quietly instead.
          const watch = document.createElement("button");
          watch.type = "button";
          watch.className = "btn-sm wg-watch-btn";
          watch.innerHTML = gbi("watchReplay");
          watch.addEventListener("click", launch);
          fb.append(watch);
        } else {
          replayTimer = setTimeout(() => {
            replayTimer = 0;
            launch();
          }, REPLAY_DELAY_MS);
        }
      },
    };

    nextBtn.addEventListener("click", () => {
      if (now() >= state.nextAt) advance();
    });
    // An optional item (e.g. Vietnamese typing) can be left out: no attempt is written, so no stars and no wilting.
    skipBtn?.addEventListener("click", () => {
      if (!state.solved) advance();
    });
    // A held Enter would otherwise "press" Next again and again.
    nextBtn.addEventListener("keydown", (e) => e.repeat && e.preventDefault());
    if (hasContext) stopContext = mountContext(card.querySelector(".wg-q-ctx-in"), item, learner);

    // This item was already answered and its attempt written (a reload or Back): show the result, don't replay it.
    if (run.solved?.index === i) {
      current = { item, ctl: null };
      showSolved(run.solved);
      if (!isDo) nextBtn.focus({ preventScroll: true });
      return;
    }
    try {
      current = { item, ctl: RUNNERS[item.type](mainEl, item, api) };
    } catch (err) {
      console.error(`item ${item.id} could not be shown; skipping it`, err);
      advance();
    }
  }

  async function save(item, { stars, help_level, tries }) {
    const now = new Date();
    const before = skillState(attempts, item.skill, now);
    const local = { skill: item.skill, item: item.id, kind: "revision", stars, help_level, tries, created: now.toISOString() };
    attempts.push(local);
    const after = skillState(attempts, item.skill, now);
    run.results.push({ skill: item.skill, item: item.id, kind: "revision", stars, before: before.stage, after: after.stage, wasWilted: before.wilted });
    // Saved in the same step as the result: a reload from here on lands on this item's done state, never a replay.
    run.solved = { index: run.index, stars, help_level, tries };
    setRun(run);
    try {
      const { queued, refused } = await recordAttempt({ learner: learner.id, session: sessionId, skill: item.skill, item: item.id, kind: "revision", stars, help_level, tries, review_complete: reviewComplete(run) });
      if (closed) return;
      if (refused) toast(biPair(gt("saveRefused")));
      else if (queued && !savedNoteShown) {
        savedNoteShown = true;
        toast(biPair(gt("saveFailed")));
      }
    } catch (err) {
      console.error("attempt could not be saved", err);
    }
  }

  function advance() {
    if (closed) return;
    clearCardExtras();
    run.index += 1;
    run.solved = null;
    setRun(run);
    if (run.index >= round.length) {
      location.hash = run.kind === "practice" ? "#/garden" : "#/end";
      return;
    }
    show(run.index);
  }

  show(Math.min(run.index, round.length - 1));

  return () => {
    closed = true;
    clearTimeout(toastTimer);
    clearCardExtras();
    current?.ctl?.destroy?.();
    stopAlert();
    stopAsk();
  };
}
