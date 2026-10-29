// Projector (#s9): the class garden for the live session. Read-only, no login, English only.
// Follows the live session, its attempts, every attempt (the class garden and mastered skills), the
// class settings (teacher flower picks) and the learner list through js/live.js; redraws on every change.
// The class garden is kept across sessions; the side cards are about today's session.

import { liveSession, watchAllAttempts, watchClassSettings, watchLearners, watchSessionAttempts } from "../live.js";
import { avatarEmoji, esc } from "../i18n.js";
import { BONUS_TOPIC, TOPICS, loadTopic, skillById, topicLabel, topicName } from "../content/skills.js";
import { GARDEN_SPOTS, classStats, gardenKind, gardenProgress, masteredFlowers, totalStars } from "./class-stats.js";
import { goalStripHtml, sidebarHtml } from "./projector-components.js";
import { gardenSvg } from "./garden-scene.js";
import { mountVersionBadge } from "../version-badge.js";
import { PLANT_KINDS, plantKindOf } from "../plants.js";

const stage = document.getElementById("stage");
mountVersionBadge();
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
  picks: {}, // teacher's flower picks, garden flower index -> plant kind key (class_settings.garden_picks)
  sessionId: null,
};

let stopAttempts = () => {};
let drawToken = 0;

function topicsText(session) {
  const list = Array.isArray(session?.topics) ? session.topics.map(Number).filter((n) => TOPICS.some((t) => t.n === n)) : [];
  if (!list.length) return "";
  if (list.length === 1) {
    const [n] = list;
    return n === BONUS_TOPIC ? topicLabel(n).en : `${topicLabel(n).en} · ${TOPICS.find((t) => t.n === n).title.en}`;
  }
  return `Topics ${list.map(topicName).join(", ")}`;
}

/* ---------- drawing ---------- */

function headerHtml(session, offline, garden) {
  const topics = session ? topicsText(session) : "";
  const level = garden && garden.level > 1 ? `<span class="pj-chip">Garden level ${garden.level}</span>` : "";
  return `<header class="pj-h">
      <h1>Our Class Garden</h1>
      <div class="pj-chips">
        <span class="pj-chip is-quiet"${offline ? "" : " hidden"}>Reconnecting…</span>
        ${level}${topics ? `<span class="pj-chip">${esc(topics)}</span>` : ""}
      </div>
    </header>`;
}

/** The class garden picture and its shared-goal strip (the same in and out of a session). */
function gardenHtml(g, bed, todayStars) {
  const loading = !state.historyLoaded; // never show a half-loaded total
  return `<section class="pj-garden" aria-label="Class garden">
      <div class="pj-scene">${gardenSvg({
        flowers: g.flowers,
        towardNext: g.towardNext,
        perFlower: g.perFlower,
        kinds: g.symbols,
        bed,
        waiting: loading,
      })}</div>
      ${goalStripHtml(g, { status: loading ? "loading" : "live", capacity: GARDEN_SPOTS, today: todayStars })}
    </section>`;
}

function waitingHtml(offline, g, bed) {
  return `${headerHtml(null, offline, g)}
    ${gardenHtml(g, bed, 0)}
    <aside class="pj-side">${sidebarHtml(null, { status: "waiting" })}</aside>`;
}

/** Who is in the room: avatar, finished tick and their plant kind (names only when the teacher shows them). */
function rosterHtml(stats) {
  const n = stats.learnerIds.length;
  const size = n > 16 ? " is-crowd" : n > 6 ? " is-many" : "";
  const people = stats.learnerIds.map((id) => {
    const learner = state.learners.get(id);
    const done = stats.finishedIds.has(id);
    const name = learner?.name ?? "";
    const kind = plantKindOf(learner ?? { id });
    const index = PLANT_KINDS.indexOf(kind);
    const label = `${done ? "finished" : "still growing"}, grows ${kind.en.toLowerCase()}`;
    return `<div class="pj-p">
        <span class="pj-av${done ? " is-done" : ""}" role="img" aria-label="${esc(label)}">${esc(avatarEmoji(learner?.avatar))}<span class="pj-kind" style="--kx:${index % 4};--ky:${Math.floor(index / 4)}" aria-hidden="true"></span></span>
        <span class="pj-n">${esc(name)}</span>
      </div>`;
  });
  return `<div class="pj-avs${size}">${people.join("")}</div>`;
}

function liveHtml(session, stats, label, offline, g, bed) {
  return `${headerHtml(session, offline, g)}
    ${gardenHtml(g, bed, stats.stars)}
    <aside class="pj-side">${sidebarHtml(stats, { label, roster: stats.present ? rosterHtml(stats) : "" })}</aside>`;
}

const KIND_KEYS = PLANT_KINDS.map((k) => k.key);
const SYMBOL_OF = new Map(PLANT_KINDS.map((k) => [k.key, k.symbol]));

/** The class garden now: progress from all-time stars, and the symbol of every flower so far,
 *  including the one growing now (its leaves give away the surprise once it is leafy). */
function classGarden() {
  const g = gardenProgress(totalStars(state.allAttempts));
  g.symbols = Array.from({ length: g.flowers + 1 }, (_, i) => SYMBOL_OF.get(gardenKind(i, KIND_KEYS, state.picks)));
  return g;
}

/** The front bed: a flower in the learner's own kind for every skill mastered by someone in the room. */
function frontBed(learnerIds) {
  return masteredFlowers(state.allAttempts, learnerIds).map((f) => ({
    symbol: plantKindOf(state.learners.get(f.learner) ?? { id: f.learner }).symbol,
  }));
}

async function draw() {
  const mine = ++drawToken;
  const session = state.session;
  const offline = Boolean(state.sessionError || state.attemptsError);

  if (session === undefined) return; // first load still running
  const g = classGarden();
  if (!session) {
    stage.classList.remove("show-names");
    stage.innerHTML = waitingHtml(offline, g, frontBed([]));
    return;
  }

  const stats = classStats(state.attempts, session);
  const label = stats.tricky ? await itemLabel(stats.tricky.item, stats.tricky.skill) : null;
  if (mine !== drawToken) return; // a newer draw started while the item names loaded

  stage.classList.toggle("show-names", session.show_names === true);
  stage.innerHTML = liveHtml(session, stats, label, offline, g, frontBed(stats.learnerIds));
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

watchClassSettings((settings, err) => {
  if (err) console.error("projector: class settings could not load", err);
  const picks = settings?.garden_picks;
  state.picks = picks && typeof picks === "object" && !Array.isArray(picks) ? picks : {};
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
