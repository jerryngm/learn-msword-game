import { test } from "node:test";
import assert from "node:assert/strict";

import { CONFIG, attemptTime, dayKey, dishCooked, gardenState, skillState, starsFor, supportLevel, weeklyStreak } from "../pb_public/js/rules.js";
import { buildRound, pickNextMission, skillWeight } from "../pb_public/js/revision.js";

// PocketBase-style attempt: `day` is a UTC date, created at 02:00 UTC (midday in Melbourne, so the same calendar day).
const attempt = (skill, stars, day, extra = {}) => ({
  skill,
  stars,
  kind: "revision",
  item: `${skill}-1`,
  created: `${day} 02:00:00.000Z`,
  ...extra,
});
const item = (skill, n = 1) => ({ id: `${skill}-${n}`, skill });
const plus = (day, days) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

test("stars: mission and revision tables, never below 1", () => {
  assert.equal(starsFor({ kind: "mission", help_level: 0, tries: 5 }), 3);
  assert.equal(starsFor({ kind: "mission", help_level: 1, tries: 1 }), 2);
  assert.equal(starsFor({ kind: "mission", help_level: 2, tries: 1 }), 2);
  assert.equal(starsFor({ kind: "mission", help_level: 3, tries: 1 }), 1);
  assert.equal(starsFor({ kind: "revision", help_level: 0, tries: 1 }), 3);
  assert.equal(starsFor({ kind: "revision", help_level: 0, tries: 2 }), 2);
  assert.equal(starsFor({ kind: "revision", help_level: 1, tries: 3 }), 1);
  assert.equal(starsFor({ kind: "revision", help_level: 2, tries: 9 }), 1);
  for (const kind of ["mission", "revision"]) {
    for (const help_level of [0, 1, 2, 3, 9]) {
      for (const tries of [0, 1, 2, 3, 99]) assert.ok(starsFor({ kind, help_level, tries }) >= 1);
    }
  }
});

test("day boundary: Melbourne calendar day, in summer and winter time", () => {
  // AEDT (UTC+11): 13:30 UTC on the 24th is 00:30 on the 25th in Melbourne.
  assert.equal(dayKey(new Date("2026-10-24T13:30:00Z")), "2026-10-25");
  assert.equal(dayKey(new Date("2026-10-24T12:59:59Z")), "2026-10-24");
  // AEST (UTC+10): 14:30 UTC on 30 June is 00:30 on 1 July.
  assert.equal(dayKey("2026-06-30 14:30:00.000Z"), "2026-07-01");
  assert.equal(dayKey("2026-06-30 13:59:59.000Z"), "2026-06-30");
  // A late-evening UTC attempt counts as the next Melbourne day, so two attempts either side are two clean days.
  const attempts = ["2026-10-24 02:00:00.000Z", "2026-10-24 13:30:00.000Z"].map((created) => ({ skill: "t1-keys", stars: 3, created }));
  assert.equal(skillState(attempts, "t1-keys", "2026-10-25").cleanDays, 2);
});

test("a skill with no attempts is a seed and never wilts", () => {
  const s = skillState([], "t1-keys", "2030-01-01");
  assert.deepEqual([s.stage, s.mastered, s.wilted, s.cleanDays, s.lastSuccess], ["seed", false, false, 0, null]);
});

test("3 distinct clean days make a flowering, mastered plant", () => {
  const attempts = [attempt("t1-keys", 3, "2026-10-01"), attempt("t1-keys", 3, "2026-10-02")];
  assert.equal(skillState(attempts, "t1-keys", "2026-10-03").stage, "leafy");
  attempts.push(attempt("t1-keys", 3, "2026-10-03"));
  const s = skillState(attempts, "t1-keys", "2026-10-03");
  assert.deepEqual([s.stage, s.mastered, s.cleanDays], ["flowering", true, 3]);
});

test("same-day repeats and non-clean attempts do not count as clean days", () => {
  const sameDay = [1, 2, 3, 4].map(() => attempt("t1-keys", 3, "2026-10-01"));
  let s = skillState(sameDay, "t1-keys", "2026-10-01");
  assert.deepEqual([s.stage, s.cleanDays, s.mastered], ["sprout", 1, false]);

  const twoStars = ["2026-10-01", "2026-10-02", "2026-10-03"].map((d) => attempt("t1-keys", 2, d));
  s = skillState(twoStars, "t1-keys", "2026-10-03");
  assert.deepEqual([s.stage, s.cleanDays, s.lastStars], ["sprout", 0, 2]);
});

test("wilting: sprout wilts the day after 7 days, leafy after 14, flowering after 28", () => {
  const day = "2026-10-01";
  const sprout = [attempt("t1-keys", 3, day)];
  assert.equal(skillState(sprout, "t1-keys", plus(day, 7)).wilted, false);
  const wilted = skillState(sprout, "t1-keys", plus(day, 8));
  assert.deepEqual([wilted.wilted, wilted.daysOverdue, wilted.due], [true, 1, plus(day, 7)]);

  const leafy = [attempt("t1-keys", 3, "2026-09-30"), attempt("t1-keys", 3, day)];
  assert.equal(skillState(leafy, "t1-keys", plus(day, 14)).wilted, false);
  assert.equal(skillState(leafy, "t1-keys", plus(day, 15)).wilted, true);

  const flowering = [attempt("t1-keys", 3, "2026-09-29"), ...leafy];
  assert.equal(skillState(flowering, "t1-keys", plus(day, 28)).wilted, false);
  assert.equal(skillState(flowering, "t1-keys", plus(day, 29)).wilted, true);
});

test("watering: any success on a wilted plant revives it and mastery is kept", () => {
  const mastered = ["2026-09-01", "2026-09-02", "2026-09-03"].map((d) => attempt("t1-keys", 3, d));
  const today = "2026-11-10";
  const before = skillState(mastered, "t1-keys", today);
  assert.deepEqual([before.wilted, before.mastered, before.stage], [true, true, "flowering"]);

  const watered = skillState([...mastered, attempt("t1-keys", 1, today)], "t1-keys", today);
  assert.deepEqual([watered.wilted, watered.mastered, watered.stage, watered.lastSuccess], [false, true, "flowering", today]);
  assert.equal(watered.lastStars, 1);
});

test("support fading, streak and dish rule", () => {
  assert.deepEqual([0, 1, 2, 5].map(supportLevel), [0, 1, 2, 2]);

  // 2026-10-26 is a Monday. Weeks of 12 Oct, 19 Oct and 26 Oct all have an attempt.
  const weekly = ["2026-10-13", "2026-10-21", "2026-10-26"].map((d) => attempt("t1-keys", 3, d));
  assert.equal(weeklyStreak(weekly, "2026-10-27"), 3);
  assert.equal(weeklyStreak(weekly.slice(0, 2), "2026-10-27"), 2, "a week still in progress without an attempt keeps the streak");
  assert.equal(weeklyStreak(weekly.slice(0, 1), "2026-10-27"), 0, "a gap breaks it");
  assert.equal(weeklyStreak([attempt("t1-keys", 3, "2025-12-30"), attempt("t1-keys", 3, "2026-01-05")], "2026-01-06"), 2, "year end");

  const topic1 = ["t1-screen-parts", "t1-mouse-clicks", "t1-open-word", "t1-keys", "t1-sentence", "t1-save", "t1-file-names", "t1-find-file", "t1-zoom"];
  const played = topic1.slice(0, 7).map((s) => attempt(s, 2, "2026-10-01"));
  const garden = gardenState(played, topic1, "2026-10-02");
  assert.equal(dishCooked(1, garden, played), false, "no mission yet");
  const withMission = [...played, attempt("t1-sentence", 3, "2026-10-01", { kind: "mission", item: "t1-m-about-me" })];
  assert.equal(dishCooked(1, gardenState(withMission, topic1, "2026-10-02"), withMission), true);
  const few = withMission.filter((a) => ["t1-keys", "t1-sentence"].includes(a.skill));
  assert.equal(dishCooked(1, gardenState(few, topic1, "2026-10-02"), few), false, "under 70% of skills grown");
});

test("weighting: a wilted, not-mastered skill outranks a mastered fresh one", () => {
  const today = "2026-10-20";
  const mastered = ["2026-10-17", "2026-10-18", "2026-10-19"].map((d) => attempt("t1-keys", 3, d));
  const wiltedSprout = [attempt("t1-sentence", 2, "2026-10-01")];
  const fresh = skillWeight(skillState(mastered, "t1-keys", today));
  const faded = skillWeight(skillState(wiltedSprout, "t1-sentence", today));
  assert.equal(fresh, CONFIG.weight.base);
  // 1 + 3 (wilted) + 2 (not mastered) + 2 (last stars <= 2) + min(12/7, 2)
  assert.ok(Math.abs(faded - (8 + 12 / 7)) < 1e-9);
  assert.ok(faded > fresh);
  assert.equal(skillWeight(skillState([], "t1-save", today), { taught: true }), CONFIG.weight.seedTaught);
});

// Deterministic rng: cycles through fixed values.
const cycle = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test("round: warm-up is the strongest skill, cool-down next, no duplicates, topics interleaved", () => {
  const skills = ["t1-keys", "t1-sentence", "t1-save", "t2-spelling", "t2-punctuation", "t2-undo-redo", "t3-align", "t3-select"];
  const items = skills.flatMap((s) => [item(s, 1), item(s, 2)]);
  const mastered = ["2026-10-01", "2026-10-02", "2026-10-03"].flatMap((d) => [attempt("t3-select", 3, d), attempt("t2-spelling", 3, d)]);
  const attempts = [...mastered, attempt("t3-select", 3, "2026-10-10"), attempt("t2-spelling", 3, "2026-10-10")];
  const today = "2026-10-11";

  for (const seed of [0.1, 0.5, 0.9]) {
    const round = buildRound({ items, attempts, topics: [1, 2, 3], length: 8, taughtTopics: [1, 2, 3], today, rng: cycle(seed, 0.37, 0.71) });
    assert.equal(round.length, 8);
    assert.equal(new Set(round.map((i) => i.id)).size, 8, "no duplicates");
    assert.equal(new Set(round.map((i) => i.skill)).size, 8, "one item per skill");
    assert.ok(["t3-select", "t2-spelling"].includes(round[0].skill), "warm-up is a mastered skill");
    assert.ok(["t3-select", "t2-spelling"].includes(round[7].skill), "cool-down is the other strong skill");
    const topicOf = (i) => Number(i.skill[1]);
    for (let n = 1; n < round.length; n++) {
      // topic 1 has 3 skills, topic 2 has 3 and topic 3 has 2 here, so a clean alternation is possible
      assert.notEqual(topicOf(round[n]), topicOf(round[n - 1]), `same topic twice in a row at ${n}`);
    }
  }
});

test("round: picks the least recently seen item of a skill", () => {
  const items = [item("t1-keys", 1), item("t1-keys", 2), item("t1-keys", 3)];
  const attempts = [
    attempt("t1-keys", 3, "2026-10-05", { item: "t1-keys-1" }),
    attempt("t1-keys", 3, "2026-10-02", { item: "t1-keys-3" }),
  ];
  const [only] = buildRound({ items, attempts, topics: [1], length: 1, taughtTopics: [1], today: "2026-10-06", rng: () => 0.5 });
  assert.equal(only.id, "t1-keys-2", "the never-seen item comes first");
  const [older] = buildRound({ items: [items[0], items[2]], attempts, topics: [1], length: 1, taughtTopics: [1], today: "2026-10-06", rng: () => 0.5 });
  assert.equal(older.id, "t1-keys-3", "then the one seen longest ago");
});

test("round: short or empty candidate lists never crash or repeat", () => {
  const base = { attempts: [], topics: [1], taughtTopics: [1], today: "2026-10-06", rng: Math.random };
  assert.deepEqual(buildRound({ ...base, items: [], length: 6 }), []);
  assert.deepEqual(buildRound({ ...base, items: [item("t2-spelling")], length: 6 }), [], "items outside the chosen topics");
  assert.deepEqual(buildRound({ ...base, items: [item("t1-keys")], length: 0 }), []);
  const three = buildRound({ ...base, items: [item("t1-keys"), item("t1-sentence"), item("t1-keys", 2)], length: 6 });
  assert.deepEqual(three.map((i) => i.id).sort(), ["t1-keys-1", "t1-keys-2", "t1-sentence-1"], "every unused item, once");
  assert.equal(three[1].skill, "t1-sentence", "the repeated skill is kept apart: keys, sentence, keys");
});

test("round: a short first pass is topped up with more items of the same skills", () => {
  const topic1 = ["t1-screen-parts", "t1-mouse-clicks", "t1-open-word", "t1-keys", "t1-sentence", "t1-save", "t1-file-names", "t1-find-file", "t1-zoom"];
  // 9 skills, 20 items: the first two skills have 3 items, the rest 2.
  const items = topic1.flatMap((s, i) => Array.from({ length: i < 2 ? 3 : 2 }, (_, n) => item(s, n + 1)));
  assert.equal(items.length, 20);
  const base = { items, attempts: [], topics: [1], taughtTopics: [1], today: "2026-10-06" };

  for (const rng of [Math.random, cycle(0.05), cycle(0.95), cycle(0.2, 0.8, 0.5)]) {
    const round = buildRound({ ...base, length: 15, rng });
    assert.equal(round.length, 15);
    assert.equal(new Set(round.map((i) => i.id)).size, 15, "unique items");
    assert.equal(new Set(round.map((i) => i.skill)).size, 9, "every skill appears in the first pass");
    for (let n = 1; n < round.length; n++) assert.notEqual(round[n].skill, round[n - 1].skill, `same skill twice in a row at ${n}`);
  }
  assert.equal(buildRound({ ...base, length: 30 }).length, 20, "capped at the items that exist");
  assert.equal(buildRound({ ...base, length: 6 }).length, 6, "a long enough first pass is not topped up");
});

test("round: the top-up takes a skill's least recently seen unused item", () => {
  const items = [item("t1-keys", 1), item("t1-keys", 2), item("t1-keys", 3)];
  const attempts = [
    attempt("t1-keys", 3, "2026-10-05", { item: "t1-keys-1" }),
    attempt("t1-keys", 3, "2026-10-02", { item: "t1-keys-3" }),
  ];
  const round = buildRound({ items, attempts, topics: [1], length: 2, taughtTopics: [1], today: "2026-10-06", rng: () => 0.5 });
  assert.deepEqual(round.map((i) => i.id).sort(), ["t1-keys-2", "t1-keys-3"], "never seen, then seen longest ago; not the newest");
});

test("round presets: last_week uses the newest taught topic, most_faded drops mastered fresh skills", () => {
  const items = [item("t1-keys"), item("t1-sentence"), item("t2-spelling"), item("t2-punctuation")];
  const last = buildRound({ items, attempts: [], topics: [], length: 10, preset: "last_week", taughtTopics: [1, 2], today: "2026-10-06" });
  assert.deepEqual(last.map((i) => i.skill).sort(), ["t2-punctuation", "t2-spelling"]);

  const mastered = ["2026-10-01", "2026-10-02", "2026-10-03"].map((d) => attempt("t1-keys", 3, d));
  const faded = buildRound({ items, attempts: mastered, topics: [], length: 3, preset: "most_faded", taughtTopics: [1, 2], today: "2026-10-04" });
  assert.equal(faded.some((i) => i.skill === "t1-keys"), false, "faded skills are drawn first");
  assert.equal(faded.length, 3);
  const toppedUp = buildRound({ items, attempts: mastered, topics: [], length: 10, preset: "most_faded", taughtTopics: [1, 2], today: "2026-10-04" });
  assert.equal(toppedUp.length, 4, "a short faded round tops up from the other skills");
  const allMastered = buildRound({ items: [item("t1-keys")], attempts: mastered, topics: [], length: 5, preset: "most_faded", taughtTopics: [1], today: "2026-10-04" });
  assert.equal(allMastered.length, 1, "falls back to all skills");
});

test("missions: least mastered skill first, 3-star missions done today are skipped", () => {
  const missions = [
    { id: "m-save", skill: "t1-save" },
    { id: "m-sentence", skill: "t1-sentence" },
    { id: "m-find", skill: "t1-find-file" },
  ];
  const today = "2026-10-06";
  const attempts = [attempt("t1-save", 3, "2026-10-01", { item: "m-save" }), attempt("t1-sentence", 2, "2026-10-05", { item: "m-sentence" })];
  const args = { missions, attempts, topics: [1], today };
  assert.equal(pickNextMission(args).id, "m-find", "the seed skill first");
  const found = [...attempts, attempt("t1-find-file", 3, today, { item: "m-find" })];
  assert.equal(pickNextMission({ ...args, attempts: found }).id, "m-sentence", "no clean days yet beats 1 clean day");
  const all = [...found, attempt("t1-sentence", 3, today, { item: "m-sentence" }), attempt("t1-save", 3, today, { item: "m-save" })];
  assert.equal(pickNextMission({ ...args, attempts: all }), null);
  assert.equal(pickNextMission({ ...args, topics: [2] }), null);
});

test("attempt time: the laptop time counts unless it is ahead of the server", () => {
  // Done offline on Monday evening in Melbourne, sent on Tuesday morning.
  const late = attempt("t1-keys", 3, "2026-10-06", { created: "2026-10-06 22:00:00.000Z", client_at: "2026-10-05 08:00:00.000Z" });
  assert.equal(dayKey(attemptTime(late)), "2026-10-05");
  const fastClock = attempt("t1-keys", 3, "2026-10-06", { client_at: "2026-10-07 02:00:00.000Z" });
  assert.equal(dayKey(attemptTime(fastClock)), "2026-10-06");
  assert.equal(attemptTime(attempt("t1-keys", 3, "2026-10-06", { client_at: "" })), attemptTime(attempt("t1-keys", 3, "2026-10-06")));
});
