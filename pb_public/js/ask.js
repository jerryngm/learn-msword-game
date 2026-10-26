// 🙋 Ask: a private request to the teacher. "I'm stuck" / "I want to learn more" / "Ask a classmate".
// It creates an `asks` record and never touches stars. The learner can mark their own ask done.
//
//   mountAsk(container, { learner, context })  adds the Ask button to `container` (returns cleanup)
//   attachAsk(button, { learner, context })    wires an existing button, e.g. home's `.ask-fab`
// `context()` returns {session: sessionId | null, skill: skillId | null} for the screen right now.

import { avatarEmoji, biPair } from "./i18n.js";
import { createAsk, learnersByIds, markAskDone, openAsk, skillAttempts, watchAsks } from "./game-data.js";
import { skillState } from "./rules.js";
import { gbi, glabel, gt } from "./strings-game.js";

/** A classmate whose plant for this skill is flowering; someone in today's session first. */
async function findClassmate(skill, me, sessionId) {
  const rows = await skillAttempts(skill);
  const byLearner = new Map();
  for (const a of rows) {
    if (a.learner === me) continue;
    if (!byLearner.has(a.learner)) byLearner.set(a.learner, []);
    byLearner.get(a.learner).push(a);
  }
  const now = new Date();
  const flowering = [...byLearner.entries()].filter(([, list]) => skillState(list, skill, now).stage === "flowering");
  if (!flowering.length) return null;
  const here = (list) => Boolean(sessionId) && list.some((a) => a.session === sessionId);
  const people = await learnersByIds(flowering.map(([id]) => id));
  const byId = new Map(people.map((p) => [p.id, p]));
  const ranked = flowering
    .map(([id, list]) => ({ person: byId.get(id), here: here(list) }))
    .filter((x) => x.person)
    .sort((a, b) => Number(b.here) - Number(a.here) || Number(Boolean(b.person.active)) - Number(Boolean(a.person.active)));
  if (!ranked.length) return null;
  const best = ranked.filter((x) => x.here === ranked[0].here);
  return best[Math.floor(Math.random() * best.length)].person;
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
      pop.innerHTML = `<p class="ask-msg">${extra}</p>
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
      let msg = biPair(gt(type === "learn_more" ? "askSentMore" : "askSent"));
      if (type === "classmate" && skill) {
        let mate = null;
        try {
          mate = await findClassmate(skill, learner.id, session);
        } catch (err) {
          console.error("could not look for a classmate", err);
        }
        msg = mate
          ? biPair(gt("askMateFound", { name: `${mate.name} ${avatarEmoji(mate.avatar)}` }))
          : biPair(gt("askMateNone"));
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

