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

test("plants: only the grown plant shows the kind", () => {
  const lotus = PLANT_KINDS.find((k) => k.key === "lotus");
  assert.equal(plantSymbol({ stage: "flowering" }, lotus), "p-lotus");
  assert.equal(plantSymbol({ stage: "flowering", wilted: true }, lotus), "p-wilt");
  assert.equal(plantSymbol({ stage: "leafy" }, lotus), "p-leafy");
  assert.equal(plantSymbol(null, lotus), "p-seed");
  assert.equal(plantSymbol({ stage: "flowering" }), "p-flower");
});

test("plants: the migration backfills the same kind keys", () => {
  const src = readFileSync(new URL("../pb_migrations/0005_learner_plant.js", import.meta.url), "utf8");
  const keys = JSON.parse(src.match(/const KINDS = (\[[^\]]*\])/)[1]);
  assert.deepEqual(keys, PLANT_KINDS.map((k) => k.key));
});
