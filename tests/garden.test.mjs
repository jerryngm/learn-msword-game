import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { GARDEN_AREAS, GARDEN_SPOTS, gardenKind, gardenProgress, totalStars } from "../pb_public/js/projector/class-stats.js";
import { PLANT_KINDS } from "../pb_public/js/plants.js";

const KEYS = PLANT_KINDS.map((k) => k.key);

test("class garden: stars add up across sessions, flowers never go away", () => {
  const attempts = [
    { session: "week1", stars: 3 }, { session: "week1", stars: 2 },
    { session: "week2", stars: 1 }, { session: null, stars: 3 }, // home practice counts too
    { session: "week2", stars: 9 }, // not a real star count: ignored
  ];
  assert.equal(totalStars(attempts), 9);

  let last = gardenProgress(0);
  for (let stars = 1; stars <= 3000; stars++) {
    const now = gardenProgress(stars);
    assert.ok(now.flowers >= last.flowers && now.level >= last.level, `more stars never take a flower away (${stars})`);
    last = now;
  }
});

test("class garden: each area opens when the one before is full", () => {
  const [a1, a2] = GARDEN_AREAS;
  assert.deepEqual(gardenProgress(a1.starsPerFlower - 1), { stars: a1.starsPerFlower - 1, flowers: 0, level: 1, full: false, towardNext: a1.starsPerFlower - 1, perFlower: a1.starsPerFlower });
  const boxesFull = a1.spots * a1.starsPerFlower;
  assert.deepEqual([gardenProgress(boxesFull).flowers, gardenProgress(boxesFull).level, gardenProgress(boxesFull).perFlower], [a1.spots, 2, a2.starsPerFlower]);
  const all = GARDEN_AREAS.reduce((n, a) => n + a.spots * a.starsPerFlower, 0);
  assert.deepEqual([gardenProgress(all - 1).full, gardenProgress(all).full, gardenProgress(all).flowers], [false, true, GARDEN_SPOTS]);
  assert.equal(gardenProgress(all * 5).flowers, GARDEN_SPOTS);
});

test("class garden: surprise kinds use every kind once per 12, never twice in a row, and never change", () => {
  const seq = Array.from({ length: GARDEN_SPOTS * 2 }, (_, i) => gardenKind(i, KEYS));
  assert.equal(new Set(seq.slice(0, KEYS.length)).size, KEYS.length);
  assert.equal(new Set(seq.slice(KEYS.length, KEYS.length * 2)).size, KEYS.length);
  seq.forEach((k, i) => i && assert.notEqual(k, seq[i - 1], `flowers ${i - 1} and ${i}`));
  assert.deepEqual(Array.from({ length: GARDEN_SPOTS * 2 }, (_, i) => gardenKind(i, KEYS)), seq, "same answer every time");
});

test("class garden: the teacher's pick wins, unknown picks are ignored, and the next surprise avoids it", () => {
  assert.equal(gardenKind(4, KEYS, { 4: "rose" }), "rose");
  assert.equal(gardenKind(4, KEYS, { 4: "cactus" }), gardenKind(4, KEYS));
  const after = gardenKind(5, KEYS, { 5: gardenKind(6, KEYS) });
  assert.notEqual(gardenKind(6, KEYS, { 5: after }), after);
  // A pick for one flower never changes the flowers before it.
  assert.deepEqual([0, 1, 2, 3].map((i) => gardenKind(i, KEYS, { 4: "rose" })), [0, 1, 2, 3].map((i) => gardenKind(i, KEYS)));
});

test("class garden: the picks field is added by a migration", () => {
  const src = readFileSync(new URL("../pb_migrations/0007_garden_picks.js", import.meta.url), "utf8");
  assert.match(src, /JSONField\(\{ name: "garden_picks" \}\)/);
});
