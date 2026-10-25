// Weekly Revision (#s3) with the warm-up first and the cool-down last (#s13).
// One item per screen, at most two main buttons, no timers. The try ladder (Contracts):
// wrong 1 → the gentle toast; wrong 2 → the hint; wrong 3 → the answer is shown, then the learner does it.
// One attempt is written per finished item, and finishing always earns at least 1 ⭐.

import { biPair, esc, labelPair, t } from "../i18n.js";
import { skillById } from "../content/skills.js";
import { mountWord } from "../word/index.js";
import { createHints } from "../word/hints.js";
import { buildRound } from "../revision.js";
import { skillState, starsFor } from "../rules.js";
import { mountAsk } from "../ask.js";
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

/* ---------- item runners: (host, item, api) → {reveal(), hint?(), destroy()} ---------- */
// api: {wrong(), solved(), feedback(html), setCheck(fn | null), learner}

function runPick(host, item, api) {
  const opts = Array.isArray(item.options) ? item.options : [];
  const cols = opts.length <= 2 ? "two" : opts.length === 3 ? "three" : opts.length <= 4 ? "four" : "three";
  host.innerHTML = `<div class="wg-choices ${cols}">${opts
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
        setTimeout(() => {
          placed.length = 0;
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
          ${card ? `<p class="wg-sort-q">${gbi("sortWhere")} <span class="wg-sort-count">${esc(gt("sortCount", { n: index + 1, total: cards.length }).en)}</span></p>
          <div class="wg-sort-card">${bp(card.label)}</div>` : ""}
        </div>
        <div class="wg-bins">${bins
          .map((b) => `<button type="button" class="wg-bin${revealed && card && card.bin === b.id ? " is-reveal" : ""}" data-bin="${esc(b.id)}" ${card ? "" : "disabled"}>
              <span class="wg-bin-h">${bp(b.label)}</span>
              <span class="wg-bin-cards">${inBin.get(b.id).map((c) => `<span class="wg-bin-chip">${esc(c.label.en)}</span>`).join("")}</span>
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
  const ctx = { saved: null, opened: null, learner: { name: api.learner?.name ?? "" } };
  const word = mountWord(host.firstElementChild, {
    doc: item.doc ?? "",
    tabs: Array.isArray(item.tabs) ? item.tabs : ["home"],
    title: "Document1",
    initials: initialsOf(api.learner?.name),
  });
  const met = () => {
    try {
      return Boolean(item.check?.(word.getDoc(), ctx));
    } catch (err) {
      console.error(`check failed for ${item.id}`, err);
      return false;
    }
  };
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    hints.hide();
    api.solved();
  };
  const offChange = word.on("change", () => met() && finish());
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
      offChange();
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
    run = { kind: practiceSkill ? "practice" : "revision", sessionId, started: Date.now(), round: round.map((i) => i.id), index: 0, results: [] };
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
  let toastTimer = 0;
  let closed = false;
  let savedNoteShown = false;

  root.innerHTML = `<main class="screen wg-rev">
      <header class="lhead"><span class="brand">🌱 ${esc(t("brand").en)}</span></header>
      <div class="wg-rev-body" id="revBody"></div>
      <a class="wg-finish" href="#/end">${gbi("finish")}</a>
      <div class="wg-gtoast" id="revToast" role="status" aria-live="polite"></div>
    </main>`;
  const main = root.querySelector("main");
  const body = root.querySelector("#revBody");
  const toastEl = root.querySelector("#revToast");
  const stopAsk = mountAsk(main, { learner, context: () => ({ session: sessionId, skill: currentSkill }) });
  if (run.kind === "practice") main.querySelector(".wg-finish").href = "#/garden";

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
    current?.ctl?.destroy?.();
    current = null;
    clearTimeout(toastTimer);
    toastEl.classList.remove("is-shown");
    const item = round[i];
    currentSkill = item.skill;
    const isDo = item.type === "do";
    body.innerHTML = `
      <div class="wg-q-top">${dotsHtml(i, round.length)}${chipHtml(i, round.length, item)}</div>
      <section class="card wg-q-card${isDo ? " is-do" : ""} type-${esc(item.type)}" data-item="${esc(item.id)}">
        <h1 class="wg-q-h">${biPair(pair(item.prompt))}</h1>
        <div class="wg-q-main"></div>
        <div class="wg-q-foot">
          <div class="wg-q-fbcol"><div class="wg-q-feedback" aria-live="polite"></div><p class="wg-proof" hidden></p></div>
          <div class="wg-q-btns">
            <button type="button" class="btn btn-primary wg-q-check" hidden>${gbi("check")}</button>
            <button type="button" class="btn btn-primary wg-q-next" hidden>${gbi(i === round.length - 1 ? "finishBtn" : "next")}</button>
          </div>
        </div>
      </section>`;
    const card = body.querySelector(".wg-q-card");
    const fb = card.querySelector(".wg-q-feedback");
    const checkBtn = card.querySelector(".wg-q-check");
    const nextBtn = card.querySelector(".wg-q-next");
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
          if (item.hint && !shownByRunner) api.feedback(`💡 ${biPair(pair(item.hint))}`);
          showProof();
        } else if (state.wrongs >= 3 && state.help < 2) {
          state.help = 2;
          current?.ctl?.reveal?.();
          showProof();
        }
      },
      solved() {
        if (state.solved) return;
        state.solved = true;
        const tries = state.wrongs + 1;
        const stars = starsFor({ kind: "revision", help_level: state.help, tries });
        state.nextAt = now() + NEXT_GAP_MS;
        showSolved({ stars, help_level: state.help, tries });
        // Keep focus in the document while a `do` item is open; elsewhere Enter moves on.
        if (!isDo) nextBtn.focus({ preventScroll: true });
        save(item, { stars, help_level: state.help, tries });
      },
    };

    nextBtn.addEventListener("click", () => {
      if (now() >= state.nextAt) advance();
    });
    // A held Enter would otherwise "press" Next again and again.
    nextBtn.addEventListener("keydown", (e) => e.repeat && e.preventDefault());

    // This item was already answered and its attempt written (a reload or Back): show the result, don't replay it.
    if (run.solved?.index === i) {
      current = { item, ctl: null };
      showSolved(run.solved);
      if (!isDo) nextBtn.focus({ preventScroll: true });
      return;
    }
    try {
      current = { item, ctl: RUNNERS[item.type](card.querySelector(".wg-q-main"), item, api) };
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
      const { queued, refused } = await recordAttempt({ learner: learner.id, session: sessionId, skill: item.skill, item: item.id, kind: "revision", stars, help_level, tries });
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
    current?.ctl?.destroy?.();
    stopAsk();
  };
}
