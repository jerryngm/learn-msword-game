// Home screen: at most two main buttons, chosen by the live session's mode.
import { pb, liveSession } from "../pb.js";
import { avatarEmoji, bi, esc, label, t } from "../i18n.js";
import { gardenState, weeklyStreak } from "../rules.js";
import { attachAsk } from "../ask.js";
import { plantKindOf, plantSymbol } from "../plants.js";
import { mountHelperAlert } from "../helper-alerts.js";

const PEEK_PLANTS = 4;

/* ---------- garden and streak, derived from the learner's attempts ---------- */

function summariseGarden(attempts) {
  const today = new Date();
  const skillIds = [...new Set(attempts.map((a) => a.skill))]; // most recent first
  const states = gardenState(attempts, skillIds, today);
  const plants = skillIds
    .map((skill) => ({ skill, ...states.get(skill) }))
    .filter((p) => p.stage !== "seed");
  return { plants, wiltedCount: plants.filter((p) => p.wilted).length, streak: weeklyStreak(attempts, today) };
}

/* ---------- markup ---------- */

function peekHtml(garden, kind) {
  if (!garden.plants.length) {
    return `<div class="peek-empty">
      <svg class="peek-seed" viewBox="0 0 100 110" aria-hidden="true"><use href="#p-seed"/></svg>
      <p>${bi("gardenPeekEmpty")}</p>
      <p class="peek-hint">${bi("gardenPeekEmptyHint")}</p>
    </div>`;
  }
  const shown = [...garden.plants].sort((a, b) => b.last - a.last).slice(0, PEEK_PLANTS);
  const plants = shown
    .map((p) => `<svg class="peek-plant" viewBox="0 0 100 110" aria-hidden="true"><use href="#${plantSymbol(p, kind)}"/></svg>`)
    .join("");
  return `<div class="peek-bed">${plants}</div>`;
}

function statusHtml(garden) {
  if (!garden.plants.length) return `<span>${bi("gardenEmptyStatus")}</span>`;
  if (garden.wiltedCount === 1) return `<span>${bi("waterNeededOne")}</span>`;
  if (garden.wiltedCount > 1) return `<span>${bi("waterNeeded", { n: garden.wiltedCount })}</span>`;
  return `<span>${bi("gardenFine")}</span>`;
}

function streakHtml(garden) {
  if (garden.streak < 1) return ""; // a missed week is never shown
  return garden.streak === 1 ? bi("streakOne") : bi("streakWeeks", { n: garden.streak });
}

function bigButton({ href, icon, titleKey, bodyHtml, recommended }) {
  return `<a class="big${recommended ? " rec" : ""}" href="${href}">
    ${recommended ? `<span class="badge-rec">${bi("startHere")}</span>` : ""}
    <span class="ico" aria-hidden="true">${icon}</span>
    <h2>${bi(titleKey)}</h2>
    <p>${bodyHtml}</p>
    <span class="go">${bi("go")}</span>
  </a>`;
}

/** Main cards and the quiet free-practice link for the current session (or none). */
function cardsHtml(session, offline) {
  const free = bigButton({ href: "#/free", icon: "✏️", titleKey: "freeTitle", bodyHtml: bi("freeBody") });
  if (!session) {
    return {
      cards: `<div class="big waiting" role="status">
          <span class="ico" aria-hidden="true">⏳</span>
          <h2>${bi("waitingTitle")}</h2>
          <p>${bi("waitingBody")}</p>
          ${offline ? `<p class="reconnect">${bi("reconnecting")}</p>` : ""}
        </div>${free}`,
      link: "",
    };
  }
  const mode = session.mode;
  const both = mode === "both";
  const cards = [];
  if (mode === "revision" || both) {
    cards.push(
      bigButton({
        href: "#/revision",
        icon: "🔁",
        titleKey: session.preset === "revise_everything" ? "reviewEverythingTitle" : "revisionTitle",
        bodyHtml: bi("revisionBody", { n: Number.isInteger(session.length) && session.length > 0 ? session.length : 6 }) /* same default as playContext */,
        recommended: both,
      }),
    );
  }
  if (mode === "missions" || both) {
    cards.push(bigButton({ href: "#/mission/next", icon: "🧩", titleKey: "missionsTitle", bodyHtml: bi("missionsBody") }));
  }
  const link = `<a class="btn-sm" href="#/free">✏️ ${esc(t("freeTitle").en)}<span class="vi">${esc(t("freeTitle").vi)}</span></a>`;
  return { cards: cards.join(""), link };
}

/* ---------- screen ---------- */

export function render(root, { learner }) {
  root.innerHTML = `
    <main class="screen home">
      <header class="lhead"><span class="brand">🌱 ${esc(t("brand").en)}</span></header>
      <div class="home-head">
        <div>
          <h1><span class="face face-sm" style="--ring:${esc(learner.colour || "#2F7370")}" aria-hidden="true">${avatarEmoji(learner.avatar)}</span>
            <span>${bi("hi", { name: learner.name })}</span></h1>
          <div class="status" id="status"></div>
        </div>
        <div class="streak" id="streak" hidden></div>
      </div>
      <div id="helperAlertSlot"></div>
      <div class="home-grid">
        <div class="cards" id="cards"></div>
        <a class="peek card" href="#/garden" aria-label="${esc(label("seeGarden"))}">
          <h2>${bi("gardenPeek")}</h2>
          <div id="peek"></div>
          <span class="go">${bi("seeGarden")}</span>
        </a>
      </div>
      <div class="home-links" id="freeLink"></div>
      <button class="ask-fab" type="button" aria-label="${esc(label("ask"))}">
        <span class="e" aria-hidden="true">🙋</span><span>${bi("ask")}</span>
      </button>
    </main>`;

  const cardsEl = root.querySelector("#cards");
  const linkEl = root.querySelector("#freeLink");
  let closed = false;
  let drawnKey = null;
  let liveId = null;
  let stopAlert = () => {};

  const draw = (session, error) => {
    liveId = session?.id ?? null;
    stopAlert();
    stopAlert = mountHelperAlert({
      slot: root.querySelector("#helperAlertSlot"),
      learner,
      session,
      variant: "hero",
    });
    const key = session ? `${session.id}|${session.mode}|${session.length}` : `none|${error ? "offline" : "ok"}`;
    if (key === drawnKey) return; // nothing visible changed
    drawnKey = key;
    const { cards, link } = cardsHtml(session, Boolean(error));
    cardsEl.innerHTML = cards;
    linkEl.innerHTML = link;
  };

  const stopLive = liveSession(draw);
  const stopAsk = attachAsk(root.querySelector(".ask-fab"), { learner, context: () => ({ session: liveId, skill: null }) });

  pb.collection("attempts")
    .getFullList({
      filter: pb.filter("learner = {:id}", { id: learner.id }),
      fields: "skill,stars,kind,created",
      sort: "-created",
      requestKey: null,
    })
    .catch((err) => {
      console.error("could not load attempts", err);
      return [];
    })
    .then((attempts) => {
      if (closed) return;
      const garden = summariseGarden(attempts);
      root.querySelector("#status").innerHTML = statusHtml(garden);
      const streakEl = root.querySelector("#streak");
      streakEl.innerHTML = streakHtml(garden);
      streakEl.hidden = garden.streak < 1;
      root.querySelector("#peek").innerHTML = peekHtml(garden, plantKindOf(learner));
    });

  return () => {
    closed = true;
    stopAlert();
    stopLive();
    stopAsk?.();
  };
}
