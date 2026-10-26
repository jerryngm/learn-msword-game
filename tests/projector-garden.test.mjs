// Projector garden picture and cards: stage art, capacity, escaping and display states.
import assert from "node:assert/strict";
import test from "node:test";
import { BED_COUNT, SLOT_COUNT, gardenSvg, growingSymbol } from "../pb_public/js/projector/garden-scene.js";
import { accuracyRingHtml, goalStripHtml, sidebarHtml } from "../pb_public/js/projector/projector-components.js";

const plants = (svg) => (svg.match(/plant-kinds\.png|growth-stages\.png/g) ?? []).length;
const base = { towardNext: 0, perFlower: 60 };

test("the growing plant changes at one-third and two-thirds of the next flower", () => {
  assert.equal(growingSymbol(19, 60), "p-seed");
  assert.equal(growingSymbol(20, 60), "p-sprout");
  assert.equal(growingSymbol(39, 60), "p-sprout");
  assert.equal(growingSymbol(40, 60), "p-leafy");
});

test("one plant grows after the bloomed ones until the beds are full", () => {
  assert.equal(plants(gardenSvg({ ...base, flowers: 0 })), 1);
  assert.equal(plants(gardenSvg({ ...base, flowers: 4 })), 5);
  assert.equal(plants(gardenSvg({ ...base, flowers: SLOT_COUNT })), SLOT_COUNT);
  assert.equal(plants(gardenSvg({ ...base, flowers: 100 })), SLOT_COUNT);
});

test("a leafy plant shows the leaves of the kind it will become", () => {
  const svg = gardenSvg({ ...base, flowers: 0, towardNext: 50, kinds: ["p-rose"] });
  assert.match(svg, /leafy-plant-kinds\.png/);
  assert.match(svg, /viewBox="0 181 181 181"/); // rose: column 0, row 1
  assert.doesNotMatch(gardenSvg({ ...base, flowers: 0, towardNext: 10, kinds: ["p-rose"] }), /leafy-plant-kinds/);
});

test("waiting clears the beds and the front strip keeps its capacity", () => {
  const bed = Array.from({ length: 30 }, () => ({ symbol: "p-rose", isNew: false }));
  assert.equal(plants(gardenSvg({ ...base, waiting: true, flowers: 10, bed })), 0);
  assert.equal(plants(gardenSvg({ ...base, flowers: SLOT_COUNT, bed })), SLOT_COUNT + BED_COUNT);
});

test("plants stand still while the sky and creatures move", () => {
  const svg = gardenSvg({ ...base, flowers: 3, bed: [{ symbol: "p-rose" }] });
  assert.doesNotMatch(svg, /pj-bloom|pj-nudge|pj-sway|pj-spark/);
  for (const cls of ["pj-glow", "pj-drift", "pj-fly", "pj-bfA", "pj-bee", "pj-drip"]) assert.match(svg, new RegExp(cls));
  assert.match(gardenSvg({ ...base, flowers: 0, waiting: true }), /pj-bee/); // still alive while loading
});

test("unknown symbols fall back to stage art without being written into the SVG", () => {
  assert(!gardenSvg({ ...base, flowers: 1, kinds: ['p-rose" onload="alert(1)'] }).includes("onload"));
});

const garden = { stars: 130, flowers: 2, perFlower: 60, towardNext: 10 };
const stats = { present: 8, finished: 1, accuracy: 83, tricky: { item: "x" }, trickyCandidates: 1 };

test("the goal strip uses the remainder toward the next flower and knows when the garden is full", () => {
  const html = goalStripHtml(garden, { capacity: 26, today: 12 });
  assert.match(html, /130 stars together/);
  assert.match(html, /50 stars to our next flower/);
  assert.match(html, /\+12 today/);
  assert.match(html, /aria-valuemax="60" aria-valuenow="10"/);
  const full = goalStripHtml({ stars: 1900, flowers: 26, perFlower: 1, towardNext: 0 }, { capacity: 26 });
  assert.match(full, /Our garden is full/);
  assert.match(full, /aria-valuenow="1"/);
  assert.match(goalStripHtml({ ...garden, flowers: 1, towardNext: 59 }), /1 star to our next flower.*1 flower grown|1 flower grown.*1 star to our next flower/s);
});

test("loading and waiting never show earned figures", () => {
  assert.doesNotMatch(goalStripHtml(garden, { status: "loading" }), /130 stars/);
  assert.doesNotMatch(sidebarHtml(stats, { status: "waiting" }), /83%|1<\/span> of 8/);
  assert.match(sidebarHtml(null, { status: "waiting" }), /Waiting for class/);
});

test("unknown accuracy differs from zero, and the ring is proportional", () => {
  assert.match(sidebarHtml({ ...stats, accuracy: null }), /Waiting for answers/);
  assert.match(sidebarHtml({ ...stats, accuracy: 0 }), />0%/);
  assert.match(accuracyRingHtml(83), /stroke-dasharray="83 100"/);
  assert.doesNotMatch(accuracyRingHtml(0), /pg-ring-check/);
});

test("practice copy is escaped and the roster replaces the support line", () => {
  const html = sidebarHtml(stats, { label: { title: "<img src=x onerror=alert(1)>", prompt: "A & B" }, roster: '<div class="pj-avs"></div>' });
  assert.match(html, /&lt;img src=x/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /pj-avs/);
  assert.match(sidebarHtml({ ...stats, present: 0, finished: 0, tricky: null, trickyCandidates: 0 }), /No one has started yet/);
  assert.match(sidebarHtml({ ...stats, tricky: null }), /Everything so far was right first time/);
});
