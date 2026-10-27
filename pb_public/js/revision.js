// Revision round selection and mission picking. Pure: `today` and `rng` are passed in.
// Spec: plans/20261025-1345-word-garden-game/game-rules.md "Revision round selection"

import { skillById } from "./content/skills.js";
import { CONFIG, attemptTime, dayKey, gardenState } from "./rules.js";

const STAGE_RANK = { seed: 0, sprout: 1, leafy: 2, bud: 3, flowering: 4 };

/**
 * Draw weight of a skill: 1 + 3·wilted + 2·notMastered + 2·(lastStars <= 2) + min(daysOverdue/7, 2).
 * A seed skill from a taught topic gets a fixed weight instead.
 */
export function skillWeight(state, { taught = true } = {}) {
  const w = CONFIG.weight;
  if (state.stage === "seed" && taught) return w.seedTaught;
  return (
    w.base +
    (state.wilted ? w.wilted : 0) +
    (state.mastered ? 0 : w.notMastered) +
    (state.lastStars != null && state.lastStars <= w.lowStarsMax ? w.lowStars : 0) +
    Math.min(state.daysOverdue / w.overdueDaysPerPoint, w.overdueCap)
  );
}

function topicsForPreset(preset, topics, taught) {
  let chosen = topics;
  if (preset === "revise_everything") return taught.filter((n) => n >= 1 && n <= 8);
  if (preset === "all_covered" || preset === "most_faded") chosen = taught;
  else if (preset === "last_week") chosen = taught.length ? [Math.max(...taught)] : [];
  return chosen.length ? chosen : topics;
}

/** Weighted random draw without replacement. `entries` are {weight, ...}. */
function drawWeighted(entries, count, rng) {
  const pool = [...entries];
  const drawn = [];
  while (drawn.length < count && pool.length > 0) {
    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    let r = rng() * total;
    let index = pool.findIndex((e) => (r -= e.weight) < 0);
    if (index < 0) index = pool.length - 1; // rng() at the very top of its range
    drawn.push(pool.splice(index, 1)[0]);
  }
  return drawn;
}

/** The item of one skill seen longest ago (never seen first). Ties are broken with rng. */
function leastRecentItem(items, attempts, rng) {
  const lastSeen = new Map();
  for (const a of attempts) lastSeen.set(a.item, Math.max(lastSeen.get(a.item) ?? -Infinity, attemptTime(a)));
  const seenAt = (item) => lastSeen.get(item.id) ?? -Infinity;
  const oldest = Math.min(...items.map(seenAt));
  const tied = items.filter((item) => seenAt(item) === oldest);
  return tied[Math.floor(rng() * tied.length) % tied.length];
}

// Strongest first: higher stage, then not wilted, then more clean days. Array.sort is stable, so ties keep draw order.
function strongerFirst(a, b) {
  return (
    STAGE_RANK[b.state.stage] - STAGE_RANK[a.state.stage] ||
    Number(a.state.wilted) - Number(b.state.wilted) ||
    b.state.cleanDays - a.state.cleanDays
  );
}

// Greedy, best effort: never the previous skill, then never the previous topic, from the topic (then skill)
// with the most items left, counting the reserved end item. `pool` follows `prev`; `reserved` is only counted.
function interleave(pool, prev, reserved) {
  const left = [...pool];
  const out = [];
  let before = prev;
  while (left.length > 0) {
    const topicCount = new Map();
    const skillCount = new Map();
    for (const p of [...left, reserved]) {
      topicCount.set(p.topic, (topicCount.get(p.topic) ?? 0) + 1);
      skillCount.set(p.id, (skillCount.get(p.id) ?? 0) + 1);
    }
    const otherSkill = left.filter((p) => p.id !== before.id);
    const pool1 = otherSkill.length ? otherSkill : left;
    const otherTopic = pool1.filter((p) => p.topic !== before.topic);
    const options = otherTopic.length ? otherTopic : pool1;
    const better = (p, best) =>
      topicCount.get(p.topic) - topicCount.get(best.topic) || skillCount.get(p.id) - skillCount.get(best.id);
    const next = options.reduce((best, p) => (better(p, best) > 0 ? p : best));
    left.splice(left.indexOf(next), 1);
    out.push(next);
    before = next;
  }
  return out;
}

// A repeated skill costs far more than a repeated topic.
function neighbourCost(sequence) {
  let cost = 0;
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i].id === sequence[i - 1].id) cost += 1000;
    else if (sequence[i].topic === sequence[i - 1].topic) cost += 1;
  }
  return cost;
}

// Warm-up first (a strongest skill), cool-down last (a next-strongest skill), middle interleaved. Among equally
// strong choices for the two ends, the one with the fewest same-skill and same-topic neighbours wins.
function orderRound(picks) {
  const ranked = [...picks].sort(strongerFirst);
  if (picks.length <= 2) return ranked;
  const warmUps = ranked.filter((p) => strongerFirst(p, ranked[0]) === 0);
  let best = null;
  for (const warmUp of warmUps) {
    const rest = ranked.filter((p) => p !== warmUp);
    for (const coolDown of rest.filter((p) => strongerFirst(p, rest[0]) === 0)) {
      const middle = picks.filter((p) => p !== warmUp && p !== coolDown);
      const forward = [warmUp, ...interleave(middle, warmUp, coolDown), coolDown];
      const backward = [warmUp, ...interleave(middle, coolDown, warmUp).reverse(), coolDown];
      for (const sequence of [forward, backward]) {
        const cost = neighbourCost(sequence);
        if (!best || cost < best.cost) best = { cost, sequence };
      }
    }
  }
  return best.sequence;
}

/**
 * One revision round of `length` unique items, warm-up first and cool-down last. The first pass draws one item per
 * skill by weight; while the round is short, further passes draw again and take each skill's next least recently
 * seen unused item. It returns fewer only when the candidates run out (and [] when there are none).
 * `preset` is 'all_covered' | 'last_week' | 'most_faded' | 'custom'; anything else uses `topics`.
 */
export function buildRound({ items = [], attempts = [], topics = [], length = 0, preset, taughtTopics, today, rng = Math.random }) {
  const size = Math.floor(Number(length));
  if (!(size > 0)) return [];
  const taught = taughtTopics ?? topics;
  const chosen = new Set(topicsForPreset(preset, topics, taught));
  const taughtSet = new Set(taught);

  // 1. Candidates, grouped by skill (an item of an unknown skill can't be placed in a topic, so it is skipped).
  const bySkill = new Map();
  const seenIds = new Set();
  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    const topic = skillById(item.skill)?.topic;
    if (!chosen.has(topic)) continue;
    if (!bySkill.has(item.skill)) bySkill.set(item.skill, { topic, items: [] });
    bySkill.get(item.skill).items.push(item);
  }
  if (bySkill.size === 0) return [];

  // 2. Skill weights ('most_faded' draws wilted or not-mastered skills first, then tops up from all).
  const garden = gardenState(attempts, [...bySkill.keys()], today);
  const allEntries = [...bySkill.keys()].map((id) => ({
    id,
    topic: bySkill.get(id).topic,
    state: garden.get(id),
    weight: skillWeight(garden.get(id), { taught: taughtSet.has(bySkill.get(id).topic) }),
  }));
  let entries = allEntries;
  if (preset === "most_faded") {
    const faded = allEntries.filter((e) => e.state.wilted || !e.state.mastered);
    if (faded.length > 0) entries = faded;
  }

  // 3. Draw skills, then the least recently seen unused item of each; repeat while the round is short.
  const used = new Set();
  const picks = [];
  while (picks.length < size) {
    const open = entries.filter((e) => bySkill.get(e.id).items.some((i) => !used.has(i.id)));
    if (open.length === 0) {
      if (entries === allEntries) break;
      entries = allEntries; // the faded skills ran out of items: top up from every chosen skill
      continue;
    }
    for (const e of drawWeighted(open, size - picks.length, rng)) {
      const unused = bySkill.get(e.id).items.filter((i) => !used.has(i.id));
      const item = leastRecentItem(unused, attempts, rng);
      used.add(item.id);
      picks.push({ ...e, item });
    }
  }

  // 4. Order.
  return orderRound(picks).map((p) => p.item);
}

const missionRank = (state) => STAGE_RANK[state.stage];

/**
 * The next mission: least mastered skill first (wilted before fresh, longest since last done).
 * Missions that already earned 3 stars today are skipped. Returns null when none is left.
 * `topics` of null/undefined means every topic.
 */
export function pickNextMission({ missions = [], attempts = [], topics, today }) {
  const todayKey = dayKey(today);
  const topicSet = topics == null ? null : new Set(topics);
  const candidates = missions.filter((m) => {
    const topic = skillById(m.skill)?.topic;
    if (topic == null || (topicSet && !topicSet.has(topic))) return false;
    return !attempts.some((a) => a.item === m.id && a.stars >= CONFIG.cleanStars && dayKey(attemptTime(a)) === todayKey);
  });
  if (candidates.length === 0) return null;

  const garden = gardenState(attempts, [...new Set(candidates.map((m) => m.skill))], today);
  const lastDone = (m) =>
    attempts.filter((a) => a.item === m.id).reduce((latest, a) => Math.max(latest, attemptTime(a)), -Infinity);
  const ranked = candidates.map((m, index) => ({ m, index, state: garden.get(m.skill), done: lastDone(m) }));
  ranked.sort(
    (a, b) =>
      missionRank(a.state) - missionRank(b.state) ||
      a.state.cleanDays - b.state.cleanDays ||
      Number(b.state.wilted) - Number(a.state.wilted) ||
      a.done - b.done ||
      a.index - b.index,
  );
  return ranked[0].m;
}
