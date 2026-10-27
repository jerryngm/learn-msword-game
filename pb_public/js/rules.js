// Word Garden game rules: pure functions only (no DOM, no PocketBase, no clock).
// `today` is always passed in as a Date, a millisecond number, or a 'YYYY-MM-DD' key.
// Calendar days are Australia/Melbourne days; PocketBase `created` strings are UTC.
// Spec: plans/20261025-1345-word-garden-game/game-rules.md

import { skillsOfTopic } from "./content/skills.js";

export const CONFIG = Object.freeze({
  clockSkewMs: 5 * 60 * 1000, // how far ahead of the server a laptop clock may be
  timeZone: "Australia/Melbourne",
  cleanStars: 3, // a clean success is this many stars on a skill
  leafyPracticeDays: 2, // distinct days with any attempt for the leafy stage (coming back counts)
  budCleanDays: 1, // distinct clean days for the bud stage (the plant shows its kind)
  masteryCleanDays: 2, // distinct clean days for flowering (mastered)
  intervals: Object.freeze({ sprout: 7, leafy: 14, bud: 21, flowering: 28 }), // days until a plant wilts
  dish: Object.freeze({ skillShare: 0.7, minMissions: 1 }), // share of a topic's skills at sprout or higher, plus missions done
  weight: Object.freeze({
    base: 1,
    wilted: 3,
    notMastered: 2,
    lowStars: 2, // added when the last attempt earned lowStarsMax stars or fewer
    lowStarsMax: 2,
    overdueDaysPerPoint: 7, // one point per this many days overdue...
    overdueCap: 2, // ...up to this many points
    seedTaught: 2, // a seed skill from a taught topic gets this fixed weight
  }),
});

const DAY_MS = 86400000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CONFIG.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Milliseconds for a Date, a number, or a PocketBase/ISO string. Throws RangeError when it isn't a valid time. */
export function toMillis(value) {
  let ms;
  if (value instanceof Date) ms = value.getTime();
  else if (typeof value === "number") ms = value;
  else if (typeof value === "string") ms = Date.parse(value.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T"));
  else ms = NaN;
  if (!Number.isFinite(ms)) throw new RangeError(`Invalid date: ${String(value)}`);
  return ms;
}

/** When the learner did the attempt: the laptop time (`client_at`) unless it's later than the server's `created`. */
export function attemptTime(attempt) {
  const server = toMillis(attempt.created);
  if (!attempt.client_at) return server;
  try {
    const client = toMillis(attempt.client_at);
    return client <= server + CONFIG.clockSkewMs ? client : server; // a laptop clock running fast falls back
  } catch {
    return server;
  }
}

/** The Melbourne calendar day as 'YYYY-MM-DD'. A value that is already a day key is returned unchanged. */
export function dayKey(date) {
  if (typeof date === "string" && DAY_KEY.test(date)) return date;
  const parts = {};
  for (const p of dayFormat.formatToParts(toMillis(date))) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dayNumber(key) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function addDays(key, days) {
  return new Date((dayNumber(key) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** Stars for one finished item. Accuracy only, never time; always 1 to 3. */
export function starsFor({ kind, help_level = 0, tries = 1 } = {}) {
  const help = Number(help_level) || 0;
  const tried = Number(tries) || 0;
  if (kind === "mission") {
    if (help <= 0) return 3;
    return help >= 3 ? 1 : 2;
  }
  if (help >= 1) return 1; // a hint or reveal was used
  if (tried <= 1) return 3;
  return tried === 2 ? 2 : 1;
}

/** seed → sprout (tried) → leafy (came back on another day) → bud (one clean day) → flowering (mastered). */
function stageFor(cleanDays, practiceDays) {
  if (cleanDays >= CONFIG.masteryCleanDays) return "flowering";
  if (cleanDays >= CONFIG.budCleanDays) return "bud";
  if (practiceDays >= CONFIG.leafyPracticeDays) return "leafy";
  return "sprout";
}

/**
 * Derived state of one skill from the learner's attempts. Every attempt is a success (finishing earns at least 1 star).
 * Stage comes from distinct practice and clean days, so it never goes down; wilting is a separate flag.
 */
export function skillState(attempts, skillId, today) {
  const todayKey = dayKey(today);
  const mine = (attempts ?? []).filter((a) => a.skill === skillId);
  if (mine.length === 0) {
    return { stage: "seed", mastered: false, wilted: false, cleanDays: 0, lastSuccess: null, due: null, daysOverdue: 0, lastStars: null };
  }

  const cleanDays = new Set(mine.filter((a) => a.stars >= CONFIG.cleanStars).map((a) => dayKey(attemptTime(a)))).size;
  const practiceDays = new Set(mine.map((a) => dayKey(attemptTime(a)))).size;
  let latest = mine[0];
  for (const a of mine) if (attemptTime(a) >= attemptTime(latest)) latest = a;

  const stage = stageFor(cleanDays, practiceDays);
  const lastSuccess = dayKey(attemptTime(latest));
  const due = addDays(lastSuccess, CONFIG.intervals[stage]);
  const wilted = todayKey > due;
  return {
    stage,
    mastered: cleanDays >= CONFIG.masteryCleanDays,
    wilted,
    cleanDays,
    lastSuccess,
    due,
    daysOverdue: wilted ? dayNumber(todayKey) - dayNumber(due) : 0,
    lastStars: latest.stars,
  };
}

/** Map of skillId to skillState for every id in `skillIds`. */
export function gardenState(attempts, skillIds, today) {
  const bySkill = new Map();
  for (const a of attempts ?? []) {
    if (!bySkill.has(a.skill)) bySkill.set(a.skill, []);
    bySkill.get(a.skill).push(a);
  }
  return new Map(skillIds.map((id) => [id, skillState(bySkill.get(id) ?? [], id, today)]));
}

/** Support fading: 0 = steps shown, 1 = Hint button only, 2 = goal and picture only. */
export function supportLevel(cleanDays) {
  if (cleanDays >= 2) return 2;
  return cleanDays >= 1 ? 1 : 0;
}

/**
 * A topic's dish is cooked when enough of its skills are at sprout or higher and at least
 * one of its missions has been done (any star count).
 */
export function dishCooked(topicN, gardenMap, attempts) {
  if (topicN === 9) return (attempts ?? []).some((a) => a.kind === "revision" && a.review_complete === true);
  const skills = skillsOfTopic(topicN);
  if (skills.length === 0) return false;
  const grown = skills.filter((s) => (gardenMap?.get(s.id)?.stage ?? "seed") !== "seed").length;
  const ids = new Set(skills.map((s) => s.id));
  const missionsDone = new Set(
    (attempts ?? []).filter((a) => a.kind === "mission" && ids.has(a.skill)).map((a) => a.item),
  ).size;
  return grown / skills.length >= CONFIG.dish.skillShare && missionsDone >= CONFIG.dish.minMissions;
}

// Monday-aligned week number (1970-01-01 was a Thursday), so consecutive ISO weeks differ by 1 across year ends.
function weekIndex(key) {
  return Math.floor((dayNumber(key) + 3) / 7);
}

/**
 * Consecutive ISO weeks with at least one attempt, counted back from this week.
 * A week that is not over yet and has no attempt does not break the streak.
 */
export function weeklyStreak(attempts, today) {
  const weeks = new Set((attempts ?? []).map((a) => weekIndex(dayKey(attemptTime(a)))));
  let week = weekIndex(dayKey(today));
  if (!weeks.has(week)) week -= 1;
  let streak = 0;
  while (weeks.has(week)) {
    streak += 1;
    week -= 1;
  }
  return streak;
}

/** Only the final answer of a full review round can carry completion evidence. */
export function reviewComplete(run) {
  return run?.kind === "revision" && run.preset === "revise_everything" &&
    Number.isInteger(run.target) && run.target > 0 &&
    Array.isArray(run.round) && run.round.length === run.target &&
    new Set(run.round).size === run.target && run.index === run.target - 1 &&
    Array.isArray(run.results) && run.results.length === run.target &&
    run.round.every((id, i) => run.results[i]?.item === id && run.results[i]?.kind === "revision");
}
