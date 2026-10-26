import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PLANT_KINDS, pickPlantKey, plantKindOf, plantSymbol } from "../pb_public/js/plants.js";

test("plants: a new learner gets one of the least-grown kinds", () => {
  const all = PLANT_KINDS.map((k) => k.key);
  assert.ok(all.includes(pickPlantKey([])));
  // Every kind used once except lotus: lotus is the only least-used kind.
  assert.equal(pickPlantKey(all.filter((k) => k !== "lotus")), "lotus");
  // A full class of 12 gets 12 different kinds.
  const used = [];
  for (let i = 0; i < all.length; i++) used.push(pickPlantKey(used));
  assert.equal(new Set(used).size, all.length);
  // Unknown or missing keys are ignored.
  assert.ok(all.includes(pickPlantKey(["", undefined, "cactus"])));
});

test("plants: stored kind wins, otherwise a stable pick from the id", () => {
  assert.equal(plantKindOf({ id: "x", plant: "rose" }).key, "rose");
  const a = plantKindOf({ id: "abc123", plant: "" });
  assert.equal(plantKindOf({ id: "abc123" }).key, a.key);
  assert.ok(PLANT_KINDS.includes(plantKindOf(null)));
});

test("plants: the bud and the grown plant show the kind", () => {
  const lotus = PLANT_KINDS.find((k) => k.key === "lotus");
  assert.equal(plantSymbol({ stage: "flowering" }, lotus), "p-lotus");
  assert.equal(plantSymbol({ stage: "flowering", wilted: true }, lotus), "p-wilt");
  assert.equal(plantSymbol({ stage: "leafy" }, lotus), "p-leafy");
  assert.equal(plantSymbol({ stage: "bud" }, lotus), "p-bud-lotus");
  assert.equal(plantSymbol(null, lotus), "p-seed");
  assert.equal(plantSymbol({ stage: "flowering" }), "p-flower");
});

test("plants: the migration backfills the same kind keys", () => {
  const src = readFileSync(new URL("../pb_migrations/0005_learner_plant.js", import.meta.url), "utf8");
  const keys = JSON.parse(src.match(/const KINDS = (\[[^\]]*\])/)[1]);
  assert.deepEqual(keys, PLANT_KINDS.map((k) => k.key));
});

test("projector front bed: a flower per mastered skill of the learners in the room", async () => {
  const { masteredFlowers } = await import("../pb_public/js/projector/class-stats.js");
  const at = (learner, skill, stars, day) => ({ learner, skill, stars, created: `${day} 02:00:00.000Z` });
  const attempts = [
    // a: 2 clean days on s1 (mastered on the 2nd; same-day repeats and 2 stars don't count), only 1 on s2
    at("a", "s1", 3, "2026-10-01"), at("a", "s1", 3, "2026-10-01"), at("a", "s1", 2, "2026-10-02"),
    at("a", "s1", 3, "2026-10-08"),
    at("a", "s2", 3, "2026-10-01"), at("a", "s2", 2, "2026-10-08"),
    // b: mastered s1 earlier than a did; c is not in the room
    at("b", "s1", 3, "2026-10-01"), at("b", "s1", 3, "2026-10-03"),
    at("c", "s1", 3, "2026-10-01"), at("c", "s1", 3, "2026-10-02"),
  ];
  const got = masteredFlowers(attempts, ["a", "b"]).map((f) => `${f.learner}|${f.skill}`);
  assert.deepEqual(got, ["b|s1", "a|s1"]);
  assert.deepEqual(masteredFlowers([], ["a"]), []);
});
