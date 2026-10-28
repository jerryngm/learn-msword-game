// 🙋 Ask: a private request to the teacher. "I'm stuck" / "I want to learn more" / "Ask a classmate".
// It creates an `asks` record and never touches stars. The learner can mark their own ask done.
//
//   mountAsk(container, { learner, context })  adds the Ask button to `container` (returns cleanup)
//   attachAsk(button, { learner, context })    wires an existing button, e.g. home's `.ask-fab`
// `context()` returns {session: sessionId | null, skill: skillId | null} for the screen right now.

import { avatarEmoji, biPair, esc } from "./i18n.js";
import { createAsk, learnersByIds, markAskDone, openAsk, sessionAttempts, skillAttempts, watchAsks } from "./game-data.js";
import { skillState } from "./rules.js";
import { gbi, glabel, gt } from "./strings-game.js";

/**
 * Pure ranking function for classmate helpers on a skill.
 * Learners who mastered (flowering), completed cleanly (bud), or completed with >= 2 stars qualify.
 * Someone in today's session ranks first, then by mastery stage and max stars.
 */
export function rankClassmates({
  attempts = [],
  learners = [],
  skill,
  me,
  sessionId = null,
  sessionLearners = null,
  today = new Date(),
} = {}) {
  const byLearner = new Map();
  for (const a of attempts) {
    if (a.learner === me) continue;
    if (!byLearner.has(a.learner)) byLearner.set(a.learner, []);
    byLearner.get(a.learner).push(a);
  }

  const eligible = [];
  for (const [id, list] of byLearner.entries()) {
    const state = skillState(list, skill, today);
    const maxStars = Math.max(...list.map((a) => Number(a.stars) || 0));
    if (state.stage === "flowering" || state.stage === "bud" || maxStars >= 2) {
      eligible.push({ id, list, state, maxStars });
    }
  }
  if (!eligible.length) return [];

  const byId = new Map(learners.map((p) => [p.id, p]));
  const presentSet = sessionLearners instanceof Set ? sessionLearners : new Set(sessionLearners ?? []);

  const isHere = (id, list) =>
    presentSet.size > 0 ? presentSet.has(id) : Boolean(sessionId) && list.some((a) => a.session === sessionId);

  const stageScore = { flowering: 30, bud: 20, leafy: 10, sprout: 0, seed: 0 };

  const ranked = eligible
    .map((e) => {
      const person = byId.get(e.id);
      if (!person || person.active === false) return null;
      const here = isHere(e.id, e.list);
      return { person, here, stage: e.state.stage, maxStars: e.maxStars };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.here !== a.here) return Number(b.here) - Number(a.here);
      const sDiff = (stageScore[b.stage] ?? 0) - (stageScore[a.stage] ?? 0);
      if (sDiff !== 0) return sDiff;
      if (b.maxStars !== a.maxStars) return b.maxStars - a.maxStars;
      return (a.person.name || "").localeCompare(b.person.name || "");
    });

  return ranked;
}

/** Classmates who can help with this skill; up to 6 candidates. */
export async function findClassmates(skill, me, sessionId) {
  if (!skill) return [];
  const rows = await skillAttempts(skill);
  const byLearner = new Map();
  for (const a of rows) {
    if (a.learner === me) continue;
    if (!byLearner.has(a.learner)) byLearner.set(a.learner, []);
    byLearner.get(a.learner).push(a);
  }
  const now = new Date();
  const eligibleIds = [];
  for (const [id, list] of byLearner.entries()) {
    const state = skillState(list, skill, now);
    const maxStars = Math.max(...list.map((a) => Number(a.stars) || 0));
    if (state.stage === "flowering" || state.stage === "bud" || maxStars >= 2) {
      eligibleIds.push(id);
    }
  }
  if (!eligibleIds.length) return [];

  const people = await learnersByIds(eligibleIds);

  let presentIds = new Set();
  if (sessionId) {
    try {
      const sRows = await sessionAttempts(sessionId);
      presentIds = new Set(sRows.map((a) => a.learner));
    } catch (err) {
      console.error("could not check session learners", err);
    }
  }

  const ranked = rankClassmates({
    attempts: rows,
    learners: people,
    skill,
    me,
    sessionId,
    sessionLearners: presentIds,
    today: now,
  });

  return ranked.slice(0, 6);
}

export async function findClassmate(skill, me, sessionId) {
  const mates = await findClassmates(skill, me, sessionId);
  return mates[0]?.person ?? null;
}

function buttonHtml(open) {
  return `<span class="e" aria-hidden="true">🙋</span><span>${gbi(open ? "asked" : "ask")}</span>`;
}

export function attachAsk(button, { learner, context = () => ({}) } = {}) {
  if (!(button instanceof HTMLElement) || !learner?.id) return () => {};
  let ask = null; // the open ask record, if any
  let pop = null;
  let busy = false;
  let closed = false;

  const sync = () => {
    button.classList.toggle("is-asked", Boolean(ask));
    button.innerHTML = buttonHtml(Boolean(ask));
    button.setAttribute("aria-label", glabel(ask ? "asked" : "ask"));
    button.setAttribute("aria-expanded", String(Boolean(pop)));
  };

  const place = () => {
    if (!pop) return;
    const r = button.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w > 12 ? r.right - w : r.left));
    const above = r.top - h - 12;
    pop.style.left = `${left}px`;
    pop.style.top = `${above >= 12 ? above : Math.min(window.innerHeight - h - 12, r.bottom + 12)}px`;
  };

  const close = (refocus = true) => {
    if (!pop) return;
    pop.remove();
    pop = null;
    document.removeEventListener("mousedown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    sync();
    if (refocus) button.focus();
  };
  const onOutside = (e) => {
    if (pop && !pop.contains(e.target) && !button.contains(e.target)) close(false);
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };

  const render = (state, extra = "") => {
    if (!pop) return;
    const lock = `<p class="ask-lock">${gbi("askPrivate")} ${gbi("askFree")}</p>`;
    if (state === "menu") {
      const { skill } = context() ?? {};
      pop.innerHTML = `<h2 class="ask-h">${gbi("askTitle")}</h2>
        <div class="ask-choices">
          <button type="button" class="ask-choice" data-type="stuck"><span class="e" aria-hidden="true">😕</span><span>${gbi("askStuck")}</span></button>
          <button type="button" class="ask-choice" data-type="learn_more"><span class="e" aria-hidden="true">📘</span><span>${gbi("askMore")}</span></button>
          ${skill ? `<button type="button" class="ask-choice" data-type="classmate"><span class="e" aria-hidden="true">🤝</span><span>${gbi("askMate")}</span></button>` : ""}
        </div>
        ${extra}${lock}`;
      pop.querySelectorAll(".ask-choice").forEach((b) => b.addEventListener("click", () => send(b.dataset.type)));
    } else {
      const bodyHtml =
        typeof extra === "string" && extra.startsWith("<") && (extra.includes("ask-msg") || extra.includes("ask-mates"))
          ? extra
          : `<p class="ask-msg">${extra}</p>`;
      pop.innerHTML = `${bodyHtml}
        <button type="button" class="btn-sm ask-ok">${gbi("askDone")}</button>${lock}`;
      pop.querySelector(".ask-ok").addEventListener("click", done);
    }
    place();
    pop.querySelector("button")?.focus();
  };

  async function send(type) {
    if (busy) return;
    busy = true;
    pop?.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const { session = null, skill = null } = context() ?? {};
    try {
      ask = await createAsk({ learner: learner.id, session, type, skill });
      let msg = "";
      if (type === "learn_more") {
        msg = gbi("askSentMore");
      } else if (type === "classmate" && skill) {
        let mates = [];
        try {
          mates = await findClassmates(skill, learner.id, session);
        } catch (err) {
          console.error("could not look for classmates", err);
        }
        if (mates.length > 0) {
          const intro =
            mates.length === 1
              ? gbi("askMateFound", { name: esc(mates[0].person.name) })
              : gbi("askMateList");
          const listHtml = `<ul class="ask-mates">${mates
            .map(
              (m) => `
            <li class="ask-mate">
              <span class="face" style="--ring:${esc(m.person.colour || "#2F7370")}" aria-hidden="true">${avatarEmoji(m.person.avatar)}</span>
              <div class="ask-mate-info">
                <span class="ask-mate-name">${esc(m.person.name)}</span>
                ${
                  m.here
                    ? `<span class="ask-mate-tag">${gbi("askMateHere")}</span>`
                    : m.stage === "flowering"
                      ? `<span class="ask-mate-tag is-master">${gbi("askMateMastered")}</span>`
                      : ""
                }
              </div>
            </li>`
            )
            .join("")}</ul>`;
          msg = `<p class="ask-msg">${intro}</p>${listHtml}`;
        } else {
          msg = gbi("askMateNone");
        }
      } else {
        msg = gbi("askSent");
      }
      if (closed) return;
      sync();
      render("sent", msg);
    } catch (err) {
      console.error("could not create ask", err);
      if (!closed) render("menu", `<p class="ask-err" role="alert">${gbi("askFail")}</p>`);
    } finally {
      busy = false;
    }
  }

  async function done() {
    if (!ask || busy) {
      close();
      return;
    }
    busy = true;
    try {
      await markAskDone(ask.id);
      ask = null;
      if (closed) return;
      sync();
      render("thanks", biPair(gt("askThanks")));
      pop?.querySelector(".ask-ok")?.remove();
      setTimeout(() => !closed && close(false), 1600);
    } catch (err) {
      console.error("could not mark ask done", err);
      if (!closed) render("sent", `${biPair(gt("askWaiting"))}<span class="ask-err" role="alert">${gbi("askFail")}</span>`);
    } finally {
      busy = false;
    }
  }

  const open = () => {
    if (pop) {
      close();
      return;
    }
    pop = document.createElement("div");
    pop.className = "ask-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", glabel("askTitle"));
    document.body.appendChild(pop);
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    sync();
    if (ask) render("sent", biPair(gt("askWaiting")));
    else render("menu");
  };

  button.addEventListener("click", open);
  window.addEventListener("resize", place);
  sync();

  openAsk(learner.id)
    .then((rec) => {
      if (!closed && rec) {
        ask = rec;
        sync();
      }
    })
    .catch((err) => console.error("could not load open ask", err));
  const stopWatch = watchAsks(learner.id, (rec) => {
    if (rec.status === "open") ask = rec;
    else if (ask && rec.id === ask.id) ask = null;
    sync();
    if (pop && !busy && !ask) close(false); // the teacher marked it done
  });

  return () => {
    closed = true;
    stopWatch();
    close(false);
    button.removeEventListener("click", open);
    window.removeEventListener("resize", place);
  };
}

/** Adds the Ask button to `container`. `inline` puts it in the flow (mission top bar) instead of the fixed corner. */
export function mountAsk(container, { learner, context, inline = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = inline ? "ask-fab ask-inline" : "ask-fab";
  container.appendChild(button);
  const stop = attachAsk(button, { learner, context });
  return () => {
    stop();
    button.remove();
  };
}

