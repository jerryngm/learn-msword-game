// End of session (#s8): a gentle, positive summary of this run. Finish clears the run and goes home.

import { biPair } from "../i18n.js";
import { dayKey, gardenState, toMillis } from "../rules.js";
import { mountAsk } from "../ask.js";
import { getRun, learnerAttempts, setRun } from "../game-data.js";
import { gbi, gt } from "../strings-game.js";
import { icanOf, starsHtml } from "./success.js";
import { plantKindOf, plantSymbol } from "../plants.js";

const MAX_PLANTS = 4;

/** The skill practised today that improved most on an earlier day (or null). */
function bestImprovement(attempts, skills, todayKey) {
  let best = null;
  for (const skill of skills) {
    const mine = attempts.filter((a) => a.skill === skill);
    const todayBest = Math.max(0, ...mine.filter((a) => dayKey(a.created) === todayKey).map((a) => a.stars));
    const earlier = mine.filter((a) => dayKey(a.created) < todayKey);
    if (!earlier.length) continue;
    const first = earlier.reduce((x, a) => (toMillis(a.created) < toMillis(x.created) ? a : x));
    const gain = todayBest - first.stars;
    if (gain > 0 && (!best || gain > best.gain)) best = { skill, before: first.stars, now: todayBest, gain };
  }
  return best;
}

export async function render(root, { learner }) {
  root.innerHTML = `<main class="screen center-screen"><p class="lead">${gbi("loading")}</p></main>`;
  const attempts = await learnerAttempts(learner.id);
  const today = new Date();
  const todayKey = dayKey(today);
  const run = getRun();
  const results = Array.isArray(run?.results) && run.results.length
    ? run.results
    : attempts.filter((a) => dayKey(a.created) === todayKey).map((a) => ({ skill: a.skill, stars: a.stars }));

  const stars = results.reduce((sum, r) => sum + (Number(r.stars) || 0), 0);
  const skills = [...new Set(results.map((r) => r.skill))];
  const garden = gardenState(attempts, skills, today);
  const better = bestImprovement(attempts, skills, todayKey);
  const plants = skills.slice(-MAX_PLANTS);
  const kind = plantKindOf(learner);

  const wateredHtml = plants.length
    ? `<section class="card wg-watered${better ? "" : " is-wide"}">
        <h2>${gbi("watered")}</h2>
        <div class="wg-wrow">${plants
          .map((s, i) => `<div class="wg-w"><span class="wg-drip" style="animation-delay:${i * 0.6}s" aria-hidden="true">• • •</span>
            <svg class="wg-plant" style="animation-delay:${i * -1.5}s" viewBox="0 0 100 110" aria-hidden="true"><use href="#${plantSymbol(garden.get(s), kind)}"/></svg>
            <span class="wg-w-t">${biPair(icanOf(s))}</span></div>`)
          .join("")}</div>
      </section>`
    : "";

  const betterHtml = better
    ? `<section class="card wg-evid">
        <h2>${gbi("better")}</h2>
        <div class="wg-cmp">
          <div class="wg-c"><div class="wg-c-stars">${starsHtml(better.before)}</div>${gbi("before")}</div>
          <div class="wg-arrow" aria-hidden="true">➜</div>
          <div class="wg-c is-now"><div class="wg-c-stars">${starsHtml(better.now)}</div>${gbi("today")}</div>
        </div>
        <p class="wg-what">${biPair(gt("canDo", { ican: icanOf(better.skill) }))}</p>
      </section>`
    : "";

  root.innerHTML = `
    <main class="screen wg-end">
      <div class="wg-end-grid">
        <div class="wg-hero">
          <h1>${gbi(results.length ? "endHero" : "endHeroQuiet", { name: learner.name })}</h1>
          ${results.length
            ? `<p class="wg-total">${gbi("starsTodayN", { n: stars, k: results.length })}</p>`
            : `<p class="wg-total">${gbi("nothingYet")}</p>`}
        </div>
        ${betterHtml}${wateredHtml}
        <div class="card wg-tell"><span class="e" aria-hidden="true">🗣️</span><p>${gbi("tell")}</p></div>
        <div class="wg-bye">
          <button type="button" class="btn btn-primary" id="endFinish">${gbi("finishBtn")}</button>
          <p>${gbi("comeBack")}</p>
        </div>
      </div>
    </main>`;

  root.querySelector("#endFinish").addEventListener("click", () => {
    setRun(null);
    location.hash = "#/home";
  });
  const stopAsk = mountAsk(root.querySelector("main"), { learner, context: () => ({ session: run?.sessionId ?? null, skill: null }) });
  return () => stopAsk();
}

