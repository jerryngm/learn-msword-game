// Success (#s6): stars pop, the plant grows, one headline, a badge line only when newly earned, Next.
// Shown in place by the mission screen: renderSuccess(root, result). Also exports the star and
// "I can" helpers the garden and end screens share.

import { biPair, esc, t } from "../i18n.js";
import { skillById } from "../content/skills.js";
import { mountAsk } from "../ask.js";
import { mountHelperAlert } from "../helper-alerts.js";
import { getRun, tapGuard } from "../game-data.js";
import { gbi, glabel } from "../strings-game.js";
import { plantKindOf, plantSymbol } from "../plants.js";

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" fill="#F6C945" stroke="#E0A526" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

/** Three stars, the earned ones filled. `pop` animates them in one after another. */
export function starsHtml(n, { pop = false } = {}) {
  return [1, 2, 3].map((i) => `<span class="wg-star ${i <= n ? (pop ? "pop" : "on") : "dim"}">${STAR_SVG}</span>`).join("");
}

/** Plain-text "I can …" for a skill id, {en, vi}. */
export function icanOf(skillId) {
  return skillById(skillId)?.ican ?? { en: skillId, vi: skillId };
}

/**
 * A calm full-screen message (no content yet, nothing left to do). `actions` are
 * [{href, key, primary}] using strings-game keys.
 */
export function calmHtml({ icon = "🌱", titleKey, bodyKey, actions = [] }) {
  const links = actions
    .map((a) => `<a class="${a.primary ? "btn btn-primary" : "btn-sm"}" href="${esc(a.href)}">${gbi(a.key)}</a>`)
    .join("");
  return `<main class="screen center-screen wg-calm">
      <div class="card soon">
        <div class="soon-ico" aria-hidden="true">${icon}</div>
        <h1>${gbi(titleKey)}</h1>
        <p class="lead">${gbi(bodyKey)}</p>
        <div class="wg-calm-actions">${links}</div>
      </div>
    </main>`;
}

function headlineKey({ stars, before, help_level = 0, tries = 1 }) {
  if (before?.wilted) return "headWatered";
  if (stars >= 3) return "headClean";
  if (help_level > 0) return "headHelp";
  return tries >= 2 ? "headTried" : "headHelp";
}

/**
 * result: {stars, skill, before, after, help_level, tries, nextKey: 'next'|'toEnd'|'toGarden', onNext()}.
 * `before`/`after` are rules.skillState() results for the skill. Returns a cleanup function.
 */
export function renderSuccess(root, result, { learner, sessionId } = {}) {
  const { stars, skill, before, after, nextKey = "next", onNext } = result;
  const kind = plantKindOf(learner);
  const fromSym = plantSymbol(before, kind);
  const toSym = plantSymbol(after ? { ...after, wilted: false } : null, kind);
  const grows = fromSym !== toSym;
  const newBadge = Boolean(after?.mastered && !before?.mastered);
  const ican = icanOf(skill);

  root.innerHTML = `
    <main class="screen wg-win-screen">
      <header class="lhead"><span class="brand">🌱 ${esc(t("brand").en)}</span></header>
      <div class="wg-win">
        <div class="wg-stars" role="img" aria-label="${esc(glabel("starsLabel", { n: stars }))}">${starsHtml(stars, { pop: true })}</div>
        <div class="wg-potstage${grows ? " grows" : " watered"}">
          <svg class="wg-pot" viewBox="0 0 300 330" aria-hidden="true">
            <ellipse cx="150" cy="318" rx="110" ry="10" fill="#E8C99A"/>
            ${grows ? `<g class="grow-old"><use href="#${fromSym}" x="60" y="80" width="180" height="198"/></g>` : ""}
            <g class="grow-new"><use href="#${toSym}" x="40" y="10" width="220" height="268"/></g>
            <path d="M70 240 h160 l-18 76 a8 8 0 0 1 -8 6 h-108 a8 8 0 0 1 -8 -6z" fill="url(#gPot)"/>
            <rect x="60" y="226" width="180" height="26" rx="10" fill="#C9673D"/>
            <rect x="60" y="226" width="180" height="8" rx="4" fill="#E08A60"/>
          </svg>
          ${grows ? "" : `<span class="wg-drops" aria-hidden="true"><i></i><i></i><i></i></span>`}
        </div>
        <h1>${gbi(headlineKey(result))}</h1>
        ${newBadge ? `<p class="wg-newbadge">${gbi("newBadge", { ican })}</p>` : ""}
        ${result.reminder ? `<p class="wg-newbadge wg-completion-reminder" role="status">${biPair(result.reminder)}</p>` : ""}
        ${result.note ? `<p class="wg-newbadge wg-save-note" role="status">${biPair(result.note)}</p>` : ""}
        <button type="button" class="btn btn-primary wg-win-next">${gbi(nextKey)}</button>
        <div id="helperAlertSlot" style="width:100%;max-width:520px;margin-top:14px"></div>
      </div>
    </main>`;

  const next = root.querySelector(".wg-win-next");
  const tap = tapGuard(700); // a double-click on Next goes on once
  next.addEventListener("click", () => tap() && onNext?.());
  next.addEventListener("keydown", (e) => e.repeat && e.preventDefault());
  // Focus Next after the stars have popped, so Enter moves on without a mouse.
  const focusTimer = setTimeout(() => next.focus({ preventScroll: true }), 700);
  const stopAsk = learner ? mountAsk(root.querySelector("main"), { learner, context: () => ({ session: sessionId ?? null, skill }) }) : () => {};
  const stopAlert = learner ? mountHelperAlert({
    slot: root.querySelector("#helperAlertSlot"),
    learner,
    session: sessionId,
    variant: "hero",
  }) : () => {};
  return () => {
    clearTimeout(focusTimer);
    stopAlert();
    stopAsk();
  };
}

/**
 * Routed fallback (not in the router yet): shows the last mission result of this run again,
 * or goes home when there is none.
 */
export function render(root, { learner } = {}) {
  const last = getRun()?.lastResult;
  if (!last) {
    location.replace("#/home");
    return null;
  }
  return renderSuccess(root, { ...last, nextKey: "toGarden", onNext: () => (location.hash = "#/garden") }, { learner });
}

