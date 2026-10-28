// My Garden (#s7): a plant per skill in the learner's own plant kind (labels on hover only), the plant card with
// "💧 Water it / Practise again", the Kitchen shelf, the "I can…" badge wall and teacher ⭐ messages (live).

import { TOPICS, SKILLS, skillsOfTopic } from "../content/skills.js";
import { biPair, esc, labelPair } from "../i18n.js";
import { dayKey, dishCooked, gardenState } from "../rules.js";
import { pickNextMission } from "../revision.js";
import { mountAsk } from "../ask.js";
import { learnerAttempts, learnerEncouragements, loadAllContent, playContext, setPracticeSkill } from "../game-data.js";
import { gbi, glabel, gt } from "../strings-game.js";
import { icanOf } from "./success.js";
import { plantKindOf, plantSymbol } from "../plants.js";

const stageKey = (state) => (state.wilted ? "wilted" : state.stage);

const DISH_SVG = {
  cooked: `<svg viewBox="0 0 64 48" aria-hidden="true">
    <path d="M24 12 q-3 -5 0 -9 M32 12 q-3 -5 0 -9 M40 12 q-3 -5 0 -9" stroke="#C9B8A0" stroke-width="2" fill="none" stroke-linecap="round" class="wg-steam"/>
    <ellipse cx="32" cy="22" rx="26" ry="6" fill="url(#gBroth)"/>
    <path d="M20 21 q4 -3 8 0 M34 22 q5 -3 9 0" stroke="#5E9E4F" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M6 22 Q32 56 58 22 Z" fill="#fff" stroke="#D9CBB5" stroke-width="1.5"/>
    <path d="M14 30 h36" stroke="#2F7370" stroke-width="2" opacity=".5"/>
    <ellipse cx="32" cy="44" rx="10" ry="2.5" fill="#E8DCC8"/></svg>`,
  locked: `<svg viewBox="0 0 64 48" aria-hidden="true">
    <path d="M10 34 Q10 12 32 12 Q54 12 54 34 Z" fill="#E9E1D3" stroke="#D3C6B1" stroke-width="1.5"/>
    <circle cx="32" cy="10" r="3" fill="#D3C6B1"/>
    <rect x="6" y="34" width="52" height="5" rx="2.5" fill="#D9CBB5"/></svg>`,
};

function plantButton(skill, state, i, kind) {
  const key = stageKey(state);
  const tip = gt("plantLabel", { stage: gt(`stage_${key}`), ican: icanOf(skill.id) });
  return `<button type="button" class="wg-pbtn${state.wilted ? " is-wilt" : ""}" data-skill="${esc(skill.id)}" style="--d:${(i % 5) * -1.1}s"
      aria-label="${esc(labelPair(tip))}">
      ${state.wilted ? `<span class="wg-drop" aria-hidden="true">💧</span>` : ""}
      <svg class="wg-plant" viewBox="0 0 100 110" aria-hidden="true"><use href="#${plantSymbol(state, kind)}"/></svg>
      <span class="wg-tip" aria-hidden="true">${biPair(tip)}</span>
    </button>`;
}

export async function render(root, { learner }) {
  root.innerHTML = `<main class="screen center-screen"><p class="lead">${gbi("loading")}</p></main>`;
  const [play, attempts, content] = await Promise.all([playContext(), learnerAttempts(learner.id), loadAllContent()]);
  const kind = plantKindOf(learner);
  const today = new Date();
  const todayKey = dayKey(today);
  const garden = gardenState(attempts, SKILLS.map((s) => s.id), today);

  // Beds: taught topics, the session's topics and any topic already practised.
  const practised = new Set(attempts.map((a) => SKILLS.find((s) => s.id === a.skill)?.topic).filter(Boolean));
  const shownTopics = TOPICS.filter((tp) => play.taught.includes(tp.n) || play.topics.includes(tp.n) || practised.has(tp.n)).map((tp) => tp.n);
  const beds = (shownTopics.length ? shownTopics : [1]).filter((n) => skillsOfTopic(n).length);
  const tried = SKILLS.filter((s) => garden.get(s.id).stage !== "seed");
  const thirsty = tried.filter((s) => garden.get(s.id).wilted).length;
  const mastered = SKILLS.filter((s) => garden.get(s.id).mastered);
  const cols = beds.length <= 1 ? 1 : beds.length <= 4 ? 2 : 3;

  const bedHtml = (n) => {
    const tp = TOPICS.find((x) => x.n === n);
    const dish = play.dishNames[n] ?? play.dishNames[String(n)];
    const plants = skillsOfTopic(n).map((s, i) => plantButton(s, garden.get(s.id), i, kind)).join("");
    return `<section class="wg-bed">
        <h2 class="wg-bed-h"><span class="wg-bed-n" aria-hidden="true">${n}</span><span>${biPair(tp.title)}</span>${dish ? `<span class="wg-bed-dish">${esc(dish)}</span>` : ""}</h2>
        <div class="wg-soil">${plants}</div>
      </section>`;
  };

  const dishesHtml = TOPICS.map((tp) => {
    const name = play.dishNames[tp.n] ?? play.dishNames[String(tp.n)] ?? "";
    const cooked = dishCooked(tp.n, garden, attempts);
    return `<div class="wg-dish${cooked ? " is-cooked" : ""}">${cooked ? DISH_SVG.cooked : DISH_SVG.locked}
        <span class="wg-dish-n">${esc(name)}</span><small>${gbi(cooked ? "dishCooked" : "dishTopic", { n: tp.n })}</small></div>`;
  });
  const shelf = [0, 3, 6].map((k) => `${dishesHtml.slice(k, k + 3).join("")}<div class="wg-plank"></div>`).join("");

  const badgesHtml = mastered.length
    ? `<div class="wg-badges">${mastered
        .map((s) => `<span class="wg-ican${garden.get(s.id).lastSuccess === todayKey ? " is-fresh" : ""}">✅ ${biPair(gt("canDo", { ican: s.ican }))}</span>`)
        .join("")}</div>`
    : `<p class="wg-k-note">${gbi("noBadges")}</p>`;
  const checklist = SKILLS.filter((s) => play.taught.includes(s.topic));
  const checklistHtml = `<h2>${gbi("icanChecklist")}</h2><div class="wg-checklist">${checklist.map((s) => {
    const state = garden.get(s.id);
    return `<button type="button" class="wg-check-skill" data-skill="${esc(s.id)}">
      <span>${state.mastered ? "✅" : "🌱"} ${biPair(s.ican)}</span>
      <small>${gbi(state.mastered ? "checklistMastered" : "checklistLearning")} · ${gbi(`stage_${stageKey(state)}`)}</small>
      <span>${gbi("practiseAgain")}</span></button>`;
  }).join("")}</div>`;
  const helpers = Number(learner.helper_badges) || 0;
  const helperHtml = helpers > 0
    ? `<div class="wg-subh">${gbi("helperBadges")}</div>
       <div class="wg-helper"><span class="wg-hb" aria-hidden="true">🤝</span><span><b>${biPair(gt("helpedN", { n: helpers }))}</b><small>${gbi("givenByTeacher")}</small></span></div>`
    : "";

  root.innerHTML = `
    <main class="screen wg-garden">
      <header class="wg-g-head">
        <h1>🌱 ${gbi("myGarden")}</h1>
        <div class="wg-g-sum">
          <span class="chip wg-chip2 wg-kind"><svg viewBox="0 0 100 110" aria-hidden="true"><use href="#${kind.symbol}"/></svg><span>${gbi("youGrow", { plant: kind })}</span></span>
          <span class="chip wg-chip2">${gbi(tried.length === 1 ? "plantsOne" : "plantsN", { n: tried.length })}</span>
          ${thirsty ? `<span class="chip soft wg-chip2">${gbi(thirsty === 1 ? "needWaterOne" : "needWater", { n: thirsty })}</span>` : ""}
        </div>
        <div class="wg-top-actions"><a class="wg-finish" href="#/home">🏠 ${gbi("backHome")}</a><span id="askSlot"></span></div>
      </header>
      <div class="wg-g-grid">
        <div class="wg-g-left">
          ${tried.length ? "" : `<p class="wg-g-empty">${gbi("gardenEmpty")}</p>`}
          <div class="wg-beds cols-${cols}">${beds.map(bedHtml).join("")}</div>
          <p class="wg-legend-tap">${biPair(gt("tapPlant"))}</p>
        </div>
        <aside class="wg-g-aside">
          <div class="wg-panel wg-tmsg" id="tmsg" hidden></div>
          <div class="wg-panel">
            <div class="wg-stabs" role="tablist">
              <button type="button" class="wg-stab" role="tab" id="tabG" aria-controls="tpG" aria-selected="false">${gbi("howGrowTab")}</button>
              <button type="button" class="wg-stab" role="tab" id="tabK" aria-controls="tpK" aria-selected="false">${gbi("kitchen")}</button>
              <button type="button" class="wg-stab" role="tab" id="tabB" aria-controls="tpB" aria-selected="false">${gbi("badges")}</button>
            </div>
            <div class="wg-tpanel wg-howto" id="tpG" role="tabpanel" aria-labelledby="tabG" hidden>
            <h2 class="wg-howto-h">${gbi("howGrow")}</h2>
            <ol class="wg-steps">
              ${["seed", "sprout", "leafy", "bud", "flowering"]
                .map((k) => `<li><svg viewBox="0 0 100 110" aria-hidden="true"><use href="#${plantSymbol({ stage: k }, kind)}"/></svg>
                  <span><b>${biPair(gt(`stage_${k}`))}</b><small>${biPair(gt(`grow_${k}`))}</small></span></li>`)
                .join("")}
            </ol>
            <p class="wg-howto-note"><svg viewBox="0 0 100 110" aria-hidden="true"><use href="#p-wilt"/></svg><span>${biPair(gt("grow_wilted"))}</span></p>
            <p class="wg-howto-note is-stars">${biPair(gt("grow_stars"))}</p>
            </div>
            <div class="wg-tpanel" id="tpK" role="tabpanel" aria-labelledby="tabK" hidden><div class="wg-shelf">${shelf}</div><p class="wg-k-note">${gbi("kitchenNote")}</p></div>
            <div class="wg-tpanel" id="tpB" role="tabpanel" aria-labelledby="tabB" hidden>${badgesHtml}${helperHtml}${checklistHtml}</div>
          </div>
        </aside>
      </div>
    </main>`;

  const main = root.querySelector("main");
  const stopAsk = mountAsk(root.querySelector("#askSlot"), { inline: true, learner, context: () => ({ session: play.session?.id ?? null, skill: null }) });

  /* ----- tabs ----- */
  const tabs = [...root.querySelectorAll(".wg-stab")];
  const selectTab = (tab) => {
    tabs.forEach((b) => {
      const on = b === tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      root.querySelector(`#${b.getAttribute("aria-controls")}`).hidden = !on;
    });
  };
  tabs.forEach((b) => b.addEventListener("click", () => selectTab(b)));
  tabs[0].parentElement.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next = tabs[(tabs.indexOf(document.activeElement) + 1) % tabs.length];
    selectTab(next);
    next.focus();
  });
  selectTab(mastered.length ? tabs[1] : tabs[0]); // How it grows until the first flower, then the Kitchen

  /* ----- plant card ----- */
  function practiceFor(skillId) {
    const own = content.missions.filter((m) => m?.skill === skillId && m.goal && typeof m.goal.check === "function");
    const mission = own.length ? pickNextMission({ missions: own, attempts, today }) ?? own[0] : null;
    if (mission) return { href: `#/mission/${encodeURIComponent(mission.id)}`, choices: own.length > 1 ? own : null };
    if (content.items.some((i) => i?.skill === skillId)) return { practice: skillId };
    return null;
  }

  let back = null;
  let lastPlant = null;
  const closeCard = () => {
    if (!back) return;
    back.remove();
    back = null;
    document.removeEventListener("keydown", onCardKey, true);
    lastPlant?.focus();
  };
  const onCardKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeCard();
    } else if (e.key === "Tab" && back) {
      const f = [...back.querySelectorAll("button, a[href]")];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[0].focus();
      }
    }
  };

  function openCard(skillId, from) {
    closeCard();
    lastPlant = from;
    const state = garden.get(skillId);
    const key = stageKey(state);
    const target = practiceFor(skillId);
    const btnKey = state.wilted ? "waterIt" : state.stage === "seed" ? "plantIt" : "practiseAgain";
    back = document.createElement("div");
    back.className = "wg-pcard-back";
    back.innerHTML = `<div class="card wg-pcard" role="dialog" aria-modal="true" aria-labelledby="pcName">
        <button type="button" class="wg-pclose" aria-label="${esc(glabel("close"))}">✕</button>
        <svg class="wg-pcard-plant${state.wilted ? " is-wilt" : ""}" viewBox="0 0 100 110" aria-hidden="true"><use href="#${plantSymbol(state, kind)}"/></svg>
        <h2 id="pcName">${biPair(gt("canDo", { ican: icanOf(skillId) }))}</h2>
        <span class="chip${state.wilted ? " soft" : ""}">${biPair(gt(`chip_${key}`))}</span>
        ${target?.choices
          ? `<div class="wg-picker-list">${target.choices.map((m) => `<button type="button" class="wg-picker-item wg-pgo-choice" data-id="${esc(m.id)}"><span>${biPair(typeof m.title === "object" ? m.title : { en: String(m.title), vi: String(m.title) })}</span></button>`).join("")}</div>`
          : target ? `<button type="button" class="btn btn-primary wg-pgo">${gbi(btnKey)}</button>` : `<p class="wg-k-note">${gbi("noPractice")}</p>`}
      </div>`;
    document.body.appendChild(back);
    back.addEventListener("mousedown", (e) => e.target === back && closeCard());
    back.querySelector(".wg-pclose").addEventListener("click", closeCard);
    back.querySelectorAll(".wg-pgo-choice").forEach((b) =>
      b.addEventListener("click", () => {
        closeCard();
        location.hash = `#/mission/${encodeURIComponent(b.dataset.id)}`;
      }),
    );
    back.querySelector(".wg-pgo")?.addEventListener("click", () => {
      const go = target;
      closeCard();
      if (go.practice) {
        setPracticeSkill(go.practice);
        location.hash = "#/revision";
      } else location.hash = go.href;
    });
    document.addEventListener("keydown", onCardKey, true);
    (back.querySelector(".wg-pgo, .wg-pgo-choice") ?? back.querySelector(".wg-pclose")).focus();
  }

  root.addEventListener("click", (e) => {
    const b = e.target.closest(".wg-pbtn, .wg-check-skill");
    if (b) openCard(b.dataset.skill, b);
  });

  /* ----- teacher ⭐ messages, live ----- */
  const tmsg = root.querySelector("#tmsg");
  let shownIds = null;
  const stopEnc = learnerEncouragements(learner.id, (list, err) => {
    if (err) console.error("teacher messages could not be loaded", err);
    const msgs = list.filter((e) => e.message && e.message.trim()).slice(0, 2);
    tmsg.hidden = msgs.length === 0;
    const known = shownIds;
    shownIds = new Set(msgs.map((m) => m.id));
    tmsg.innerHTML = `<div class="wg-from">${gbi("fromTeacher")}</div>${msgs
      .map((m) => `<p class="${known && !known.has(m.id) ? "is-new" : ""}">${m.kind === "helper" ? "🤝 " : ""}${esc(m.message)}</p>`)
      .join("")}`;
  });

  return () => {
    closeCard();
    stopEnc();
    stopAsk();
  };
}

