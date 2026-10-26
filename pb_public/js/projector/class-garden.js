// Projector (#s9): the class garden for the live session. Read-only, no login, English only.
// Follows the live session, its attempts, every attempt (for mastered skills) and the learner list
// through js/live.js and redraws on every change.

import { liveSession, watchAllAttempts, watchLearners, watchSessionAttempts } from "../live.js";
import { avatarEmoji, esc } from "../i18n.js";
import { TOPICS, loadTopic, skillById } from "../content/skills.js";
import { classStats, masteredFlowers } from "./class-stats.js";
import { SLOT_COUNT, gardenSvg } from "./garden-scene.js";
import { mountVersionBadge } from "../version-badge.js";
import { mountPlantSymbols, plantKindOf } from "../plants.js";

const stage = document.getElementById("stage");
mountVersionBadge();
mountPlantSymbols();
const STAGE_W = 1920;
const STAGE_H = 1080;

/* ---------- fit the 1920×1080 stage to the window (no scrollbar) ---------- */

function fit() {
  const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener("resize", fit);
fit();

/* ---------- item names for "Trickiest" (loaded once per topic) ---------- */

const topicContent = new Map(); // topic n -> Promise<{items, missions}>

function contentOf(n) {
  if (!topicContent.has(n)) {
    topicContent.set(
      n,
      loadTopic(n).catch((err) => {
        console.error(`projector: topic ${n} content could not load`, err);
        topicContent.delete(n); // try again on the next draw
        return { items: [], missions: [] };
      }),
    );
  }
  return topicContent.get(n);
}

/** {title, prompt} in English for an item id, or a fallback from the skill. */
async function itemLabel(itemId, skillId) {
  const skill = skillById(skillId);
  const fallback = { title: skill ? capital(skill.ican.en) : "One question", prompt: "" };
  if (!skill) return fallback;
  const { items, missions } = await contentOf(skill.topic);
  const mission = missions.find((m) => m.id === itemId);
  if (mission) return { title: mission.title?.en || fallback.title, prompt: "" };
  const item = items.find((i) => i.id === itemId);
  if (item) return { title: fallback.title, prompt: item.prompt?.en ?? "" };
  return fallback;
}

const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* ---------- state ---------- */

const state = {
  session: undefined, // undefined = still loading, null = no live session
  sessionError: null,
  attempts: [],
  attemptsError: null,
  learners: new Map(),
  allAttempts: [], // every learner's history: the front bed shows skills they have mastered
  historyLoaded: false,
  shownBed: null, // keys of front-bed flowers at the last draw (null = first draw: no bloom animation)
  shownFlowers: null, // flowers on screen at the last draw (null = first draw: no bloom animation)
  shownStars: null,
  sessionId: null,
};

let stopAttempts = () => {};
let drawToken = 0;

function topicsText(session) {
  const list = Array.isArray(session?.topics) ? session.topics.map(Number).filter((n) => TOPICS.some((t) => t.n === n)) : [];
  if (!list.length) return "";
  if (list.length === 1) return `Topic ${list[0]} · ${TOPICS.find((t) => t.n === list[0]).title.en}`;
  return `Topics ${list.join(", ")}`;
}

/* ---------- drawing ---------- */

// How the garden grows, under the bar (live and waiting, so the scene crops the same).
const HOW_HTML = `<ul class="pj-how">
    <li><b>⭐ Every star</b> fills the bar. Full bar = a new flower in the boxes.</li>
    <li><b>🌸 ⭐⭐⭐ on 3 different days</b> = your own flower in the front bed.</li>
  </ul>`;

function headerHtml(session, offline) {
  const topics = session ? topicsText(session) : "";
  return `<header class="pj-h">
      <h1>Our Class Garden 🌻</h1>
      <div class="pj-chips">
        <span class="pj-chip is-quiet"${offline ? "" : " hidden"}>Reconnecting…</span>
        ${topics ? `<span class="pj-chip">${esc(topics)}</span>` : ""}
      </div>
    </header>`;
}

function waitingHtml(offline) {
  return `${headerHtml(null, offline)}
    <section class="pj-garden" aria-label="Class garden">
      <div class="pj-scene">${gardenSvg({ flowers: 0, towardNext: 0, perFlower: 3, newFrom: 0, grew: false, waiting: true })}</div>
      <div class="pj-milestone"><div class="top"><span>The garden grows with every ⭐</span></div>
        ${HOW_HTML}</div>
    </section>
    <aside class="pj-side">
      <div class="pj-card pj-wait">
        <div class="big" aria-hidden="true">🌱</div>
        <h2>Waiting for class</h2>
        <p>The garden starts growing when your teacher starts the session.</p>
      </div>
    </aside>`;
}

function avatarsHtml(stats) {
  const n = stats.learnerIds.length;
  const size = n > 24 ? " is-crowd" : n > 12 ? " is-many" : "";
  const people = stats.learnerIds.map((id) => {
    const learner = state.learners.get(id);
    const done = stats.finishedIds.has(id);
    const name = learner?.name ?? "";
    const kind = plantKindOf(learner ?? { id });
    const label = `${done ? "finished" : "still growing"}, grows ${kind.en.toLowerCase()}`;
    return `<div class="pj-p">
        <span class="pj-av ${done ? "is-done" : "is-growing"}" role="img" aria-label="${esc(label)}">${esc(avatarEmoji(learner?.avatar))}<span class="pj-kind" aria-hidden="true"><svg viewBox="0 0 100 110"><use href="#${kind.symbol}"/></svg></span></span>
        <span class="pj-n">${esc(name)}</span>
      </div>`;
  });
  return `<div class="pj-avs${size}">${people.join("")}</div>`;
}

function ringHtml(accuracy) {
  const circ = 2 * Math.PI * 50;
  const share = accuracy == null ? 0 : accuracy / 100;
  const arc = `${(share * circ).toFixed(1)} ${circ.toFixed(1)}`;
  return `<div class="pj-card pj-ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#FBEBD3" stroke-width="16"/>
        <circle class="arc" cx="60" cy="60" r="50" fill="none" stroke="#5E9E4F" stroke-width="16" stroke-linecap="round"
          stroke-dasharray="${arc}" transform="rotate(-90 60 60)"${share > 0 ? "" : ' opacity="0"'}/>
        <text x="60" y="75" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="44" font-weight="800" fill="#3F7A3A">✓</text>
      </svg>
      <div>${accuracy == null ? "<b>–</b><span>right first time, as a class</span>" : `<b>${accuracy}% right</b><span>first time, as a class</span>`}</div>
    </div>`;
}

function trickyHtml(stats, label) {
  if (!stats.tricky) {
    const note = stats.trickyCandidates ? "Everything so far was right first time." : "We'll see after a few more answers.";
    return `<div class="pj-card pj-tricky"><div class="k">Trickiest today</div><b>Nothing yet</b><p>${esc(note)}</p></div>`;
  }
  return `<div class="pj-card pj-tricky">
      <div class="k">Trickiest today</div>
      <b>${esc(label?.title ?? "")}</b>
      ${label?.prompt ? `<div class="prompt">${esc(label.prompt)}</div>` : ""}
      <p>Let's practise it together.</p>
    </div>`;
}

function liveHtml(session, stats, label, offline, anim) {
  const capped = stats.flowers >= SLOT_COUNT;
  const toGo = stats.perFlower - stats.towardNext;
  const pct = capped ? 100 : Math.round((stats.towardNext / stats.perFlower) * 100);
  const flowersText = stats.flowers === 1 ? "1 flower" : `${stats.flowers} flowers`;
  const finishedText = stats.present
    ? `${stats.finished} of ${stats.present} finished`
    : "No one has started yet";

  return `${headerHtml(session, offline)}
    <section class="pj-garden" aria-label="Class garden">
      <div class="pj-scene">${gardenSvg({
        flowers: stats.flowers,
        towardNext: stats.towardNext,
        perFlower: stats.perFlower,
        kinds: stats.learnerIds.map((id) => plantKindOf(state.learners.get(id) ?? { id }).symbol),
        newFrom: anim.newFrom,
        grew: anim.grew,
        bed: anim.bed,
      })}</div>
      <div class="pj-milestone">
        <div class="top">
          <span>${stats.stars} ★ <small>· ${esc(flowersText)} so far</small></span>
          <small>${capped ? "The garden is full 🌻" : `${toGo} ★ to the next flower`}</small>
        </div>
        <div class="pj-mbar" role="progressbar" aria-label="Stars toward the next flower" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
          <div class="fill" style="width:${pct}%"></div><span class="flag" aria-hidden="true">🌻</span>
        </div>
        ${HOW_HTML}
      </div>
    </section>
    <aside class="pj-side">
      <div class="pj-card pj-who">
        <h2>${esc(finishedText)}</h2>
        ${stats.present ? avatarsHtml(stats) : "<p>Everyone's stars grow this garden together.</p>"}
      </div>
      ${ringHtml(stats.accuracy)}
      ${trickyHtml(stats, label)}
    </aside>`;
}

async function draw() {
  const mine = ++drawToken;
  const session = state.session;
  const offline = Boolean(state.sessionError || state.attemptsError);

  if (session === undefined) return; // first load still running
  if (!session) {
    stage.classList.remove("show-names");
    stage.innerHTML = waitingHtml(offline);
    return;
  }

  const stats = classStats(state.attempts, session);
  const label = stats.tricky ? await itemLabel(stats.tricky.item, stats.tricky.skill) : null;
  if (mine !== drawToken) return; // a newer draw started while the item names loaded

  // Animate only what changed since the last draw: never on first paint.
  const anim = { newFrom: SLOT_COUNT, grew: false };
  if (state.shownFlowers != null) {
    anim.newFrom = stats.flowers > state.shownFlowers ? state.shownFlowers : SLOT_COUNT;
    anim.grew = stats.stars > state.shownStars;
  }
  state.shownFlowers = stats.flowers;
  state.shownStars = stats.stars;
  const bed = masteredFlowers(state.allAttempts, stats.learnerIds).map((f) => ({
    key: `${f.learner}|${f.skill}`,
    symbol: plantKindOf(state.learners.get(f.learner) ?? { id: f.learner }).symbol,
  }));
  anim.bed = bed.map((f) => ({ symbol: f.symbol, isNew: state.shownBed != null && !state.shownBed.has(f.key) }));
  if (state.historyLoaded) state.shownBed = new Set(bed.map((f) => f.key)); // the first full history never animates

  stage.classList.toggle("show-names", session.show_names === true);
  stage.innerHTML = liveHtml(session, stats, label, offline, anim);
}

const redraw = () => draw().catch((err) => console.error("projector: draw failed", err));

/* ---------- live data ---------- */

watchLearners((list, err) => {
  if (err) console.error("projector: learners could not load", err);
  state.learners = new Map(list.map((l) => [l.id, l]));
  redraw();
});

watchAllAttempts((list, err) => {
  if (err) console.error("projector: attempt history could not load", err);
  state.allAttempts = list;
  state.historyLoaded = state.historyLoaded || !err;
  redraw();
});

liveSession((session, err) => {
  if (err) console.error("projector: live session could not load", err);
  // On an error keep showing the last known session rather than flashing "waiting".
  state.sessionError = err ?? null;
  const next = err && session === null && state.session ? state.session : session;
  const id = next?.id ?? null;
  if (id !== state.sessionId) {
    stopAttempts();
    state.sessionId = id;
    state.attempts = [];
    state.attemptsError = null;
    state.shownFlowers = null;
    state.shownStars = null;
    state.shownBed = null;
    stopAttempts = watchSessionAttempts(id, (list, aerr) => {
      if (aerr) console.error("projector: attempts could not load", aerr);
      state.attemptsError = aerr ?? null;
      state.attempts = list;
      redraw();
    });
  }
  state.session = next;
  redraw();
});
