// Class numbers for the projector: pure functions over one session's attempts (no DOM, no PocketBase).
//
// Definitions (see game-rules.md "Class goal" and phase-04 step 4):
// - present: distinct learners with at least one attempt in this session (at least 1 for the bloom maths).
// - stars: the sum of `stars` over the session's attempts.
// - one flower blooms per X stars, X = 3 × present.
// - finished: a present learner whose distinct items this session reach the session length
//   (a capstone mission that saves one attempt per skill still counts as one item).
// - class accuracy: the share of the session's attempts with stars = 3 (right first time, no Help).
// - trickiest item: the lowest first-try rate (stars = 3 share) among items with at least 3 attempts.
//   Ties go to the item with more attempts, then the item id, so the card doesn't flicker.
//   Nothing is shown while every such item is at 100%.

import { CONFIG, attemptTime, dayKey } from "../rules.js";

export const STARS_PER_LEARNER = 3;
export const TRICKY_MIN_ATTEMPTS = 3;
export const DEFAULT_LENGTH = 6; // same default as the learner screens (game-data playContext)

const starsOf = (a) => {
  const n = Number(a?.stars);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : 0;
};

/** Session length as the learner screens read it. */
export function sessionLength(session) {
  const n = session?.length;
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_LENGTH;
}

/**
 * @param {Array<{learner: string, item: string, stars: number}>} attempts one session's attempts
 * @param {{length?: number}|null} session
 */
export function classStats(attempts, session) {
  const list = Array.isArray(attempts) ? attempts.filter((a) => a && typeof a.learner === "string" && a.learner) : [];
  const itemsByLearner = new Map(); // learner id -> Set of item ids (first-seen order kept by the Map)
  const byItem = new Map(); // item id -> {tries, clean, skill}
  let stars = 0;
  let clean = 0;

  for (const a of list) {
    const s = starsOf(a);
    stars += s;
    if (s === 3) clean += 1;
    if (!itemsByLearner.has(a.learner)) itemsByLearner.set(a.learner, new Set());
    if (typeof a.item === "string" && a.item) {
      itemsByLearner.get(a.learner).add(a.item);
      const row = byItem.get(a.item) ?? { tries: 0, clean: 0, skill: a.skill ?? "" };
      row.tries += 1;
      if (s === 3) row.clean += 1;
      byItem.set(a.item, row);
    }
  }

  const length = sessionLength(session);
  const present = itemsByLearner.size;
  const finishedIds = new Set([...itemsByLearner].filter(([, items]) => items.size >= length).map(([id]) => id));
  const perFlower = STARS_PER_LEARNER * Math.max(1, present);

  let tricky = null;
  let trickyCandidates = 0; // items with enough attempts to judge (0 = "not enough answers yet")
  for (const [item, row] of byItem) {
    if (row.tries < TRICKY_MIN_ATTEMPTS) continue;
    trickyCandidates += 1;
    const rate = row.clean / row.tries;
    if (rate >= 1) continue;
    const better =
      !tricky || rate < tricky.rate || (rate === tricky.rate && (row.tries > tricky.tries || (row.tries === tricky.tries && item < tricky.item)));
    if (better) tricky = { item, skill: row.skill, rate, tries: row.tries };
  }

  return {
    present,
    learnerIds: [...itemsByLearner.keys()],
    finishedIds,
    finished: finishedIds.size,
    length,
    stars,
    perFlower,
    flowers: Math.floor(stars / perFlower),
    towardNext: stars % perFlower, // stars already in the next flower
    accuracy: list.length ? Math.round((clean / list.length) * 100) : null,
    attempts: list.length,
    tricky,
    trickyCandidates,
  };
}

/**
 * The skills each learner has mastered (flowering: clean on CONFIG.masteryCleanDays different days, see rules.js),
 * oldest first, for the learners in `learnerIds`. A mastered skill stays mastered, even if it wilts later.
 * @param {Array<{learner: string, skill: string, stars: number, created: string, client_at?: string}>} attempts all attempts
 * @returns {Array<{learner: string, skill: string, at: number}>} at = when the last needed clean day happened
 */
export function masteredFlowers(attempts, learnerIds) {
  const wanted = new Set(learnerIds);
  const days = new Map(); // "learner|skill" -> Map(day -> earliest clean time that day)
  for (const a of attempts ?? []) {
    if (!a || !wanted.has(a.learner) || !a.skill || starsOf(a) < CONFIG.cleanStars) continue;
    const at = attemptTime(a);
    const key = `${a.learner}|${a.skill}`;
    if (!days.has(key)) days.set(key, new Map());
    const byDay = days.get(key);
    const day = dayKey(at);
    if (!byDay.has(day) || at < byDay.get(day)) byDay.set(day, at);
  }
  const flowers = [];
  for (const [key, byDay] of days) {
    if (byDay.size < CONFIG.masteryCleanDays) continue;
    const [learner, skill] = key.split("|");
    const at = [...byDay.values()].sort((x, y) => x - y)[CONFIG.masteryCleanDays - 1];
    flowers.push({ learner, skill, at });
  }
  return flowers.sort((x, y) => x.at - y.at || (x.learner + x.skill < y.learner + y.skill ? -1 : 1));
}
