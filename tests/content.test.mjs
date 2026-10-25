// Content checks for every topic file: the mechanical half of plans/.../content-guide.md.
// The clarity review covers what can't be checked by code (is the purpose clear to a learner?).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { ITEM_TYPES, SKILLS, skillById } from "../pb_public/js/content/skills.js";

// CONTENT_DIR checks another copy of the content folder (e.g. an older version).
const CONTENT = process.env.CONTENT_DIR ? new URL(`file://${process.env.CONTENT_DIR.replace(/\/?$/, "/")}`) : new URL("../pb_public/js/content/", import.meta.url);
const STAGES = new Set(["word", "word-static", "start-menu", "explorer", "keyboard", "none"]);
const STEP_KINDS = ["target", "select", "type", "key", "say", "wait"];
const NO_ITEMS_NEEDED = new Set(["t8-capstone"]); // the capstone is missions only (skill-map.md)
const NO_PICTURE_SKILLS = new Set(["t1-save", "t1-find-file", "t1-zoom", "t7-save-version", "t7-print", "t7-template"]);
const VAGUE = [/in the same way/i, /\bas before\b/i, /\band so on\b/i, /\betc\b\.?/i, /\bstart (at|from)\b.*\bend (at|on|with)\b/i];
const UNFINISHED = /\bdraft\b|nháp/i;
const MAX_DEMO_MS = 15000; // the guide's ~10 s target, plus slack for the estimate

const topics = [];
for (let n = 1; n <= 9; n++) {
  if (existsSync(new URL(`topic-${n}.js`, CONTENT))) topics.push({ n, mod: await import(new URL(`topic-${n}.js`, CONTENT)) });
}

const isPair = (p) => p && typeof p.en === "string" && p.en.trim() && typeof p.vi === "string" && p.vi.trim();

/** Every {en, vi} pair inside a value (prompts, labels, captions, step texts...). */
function pairsIn(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  if (isPair(value)) return [value];
  return Object.values(value).flatMap((v) => pairsIn(v, seen));
}

/** Script steps, or null when the script is built at run time from the page (a getter that needs the DOM). */
function readScript(owner, key) {
  const desc = Object.getOwnPropertyDescriptor(owner, key);
  if (!desc) return undefined;
  if (desc.get) {
    try {
      return desc.get.call(owner);
    } catch {
      return null;
    }
  }
  return desc.value;
}

function checkScript(script, where, errors) {
  if (script === null) return; // DOM-dependent getter, checked in the app
  if (!Array.isArray(script) || script.length === 0) return errors.push(`${where}: script is missing or empty`);
  let ms = 0;
  script.forEach((step, i) => {
    const kinds = STEP_KINDS.filter((k) => k in step);
    if (kinds.length !== 1) errors.push(`${where}[${i}]: step must have exactly one of ${STEP_KINDS.join("/")}`);
    if (step.say && !isPair(step.say)) errors.push(`${where}[${i}]: say needs {en, vi}`);
    ms += "type" in step ? String(step.type).length * 120 + 400 : "wait" in step ? Number(step.wait) || 0 : 900;
  });
  if (ms > MAX_DEMO_MS) errors.push(`${where}: about ${Math.round(ms / 1000)} s, keep it to about 10 s`);
}

function checkText(owner, where, errors) {
  for (const p of pairsIn(owner)) {
    if (p.en.trim() === p.vi.trim() && /[a-z]{4,}\s+[a-z]{3,}/i.test(p.en)) errors.push(`${where}: Vietnamese is a copy of the English: "${p.en}"`);
    for (const re of VAGUE) if (re.test(p.en)) errors.push(`${where}: vague wording ${re}: "${p.en}"`);
    if (UNFINISHED.test(p.en) || UNFINISHED.test(p.vi)) errors.push(`${where}: never say draft/nháp: "${p.en}"`);
  }
}

function checkItem(item, n, errors) {
  const at = `topic-${n} item ${item.id}`;
  const skill = skillById(item.skill);
  if (!skill) errors.push(`${at}: unknown skill ${item.skill}`);
  else if (skill.topic !== n) errors.push(`${at}: skill ${item.skill} belongs to topic ${skill.topic}`);
  if (!ITEM_TYPES.includes(item.type)) errors.push(`${at}: unknown type ${item.type}`);
  if (!isPair(item.prompt)) errors.push(`${at}: prompt needs {en, vi}`);
  if (!isPair(item.hint)) errors.push(`${at}: hint needs {en, vi}`);
  checkText(item, at, errors);

  const replay = item.replay;
  if (!replay) errors.push(`${at}: every item needs a replay`);
  else {
    if (!STAGES.has(replay.mock)) errors.push(`${at}: replay.mock must be one of ${[...STAGES].join(", ")}`);
    checkScript(readScript(replay, "script"), `${at} replay`, errors);
  }

  switch (item.type) {
    case "pick":
      if (!Array.isArray(item.options) || item.options.length < 2) errors.push(`${at}: pick needs 2+ options`);
      else if (!item.options.some((o) => o.id === item.answer)) errors.push(`${at}: answer is not an option id`);
      break;
    case "order": {
      const steps = item.steps ?? [];
      if (steps.length < 3 || steps.length > 4) errors.push(`${at}: order items have 3 or 4 real steps (has ${steps.length})`);
      if (steps.some((s) => !isPair(s.label))) errors.push(`${at}: every order step needs a {en, vi} label`);
      // Purpose first: a goal sentence, then the ask.
      if (isPair(item.prompt) && item.prompt.en.split(/[.?!](\s|$)/).filter((s) => s && s.trim()).length < 2)
        errors.push(`${at}: start with the real-life goal, then the ask: "${item.prompt.en}"`);
      break;
    }
    case "sort": {
      const bins = new Set((item.bins ?? []).map((b) => b.id));
      if (bins.size < 2) errors.push(`${at}: sort needs 2 bins`);
      if (!(item.cards ?? []).length || item.cards.some((c) => !bins.has(c.bin))) errors.push(`${at}: every card needs a known bin`);
      break;
    }
    case "fix":
      if (!Array.isArray(item.accept) && typeof item.check !== "function") errors.push(`${at}: fix needs accept[] or check()`);
      break;
    case "do":
      if (typeof item.check !== "function") errors.push(`${at}: do needs check(doc, ctx)`);
      break;
    case "click-ui":
      if (!item.mock || !item.answer) errors.push(`${at}: click-ui needs mock and answer`);
      break;
  }
}

function checkMission(m, n, errors) {
  const at = `topic-${n} mission ${m.id}`;
  if (!skillById(m.skill)) errors.push(`${at}: unknown skill ${m.skill}`);
  if (!isPair(m.title) || !isPair(m.scenario)) errors.push(`${at}: title and scenario need {en, vi}`);
  // A mission that changes the document shows the result. Save, zoom and Explorer goals aren't a document change.
  if (m.startDoc !== undefined && m.targetDoc === undefined && !NO_PICTURE_SKILLS.has(m.skill) && m.mock !== "explorer")
    errors.push(`${at}: needs a targetDoc for "Make it look like this"`);
  if (typeof m.goal?.check !== "function" || typeof m.goal?.progress !== "function") errors.push(`${at}: goal needs check() and progress()`);
  checkText({ title: m.title, scenario: m.scenario }, at, errors);
  (m.steps ?? []).forEach((s, i) => {
    const sat = `${at} step ${i + 1}`;
    if (!isPair(s.text) || !isPair(s.hint)) errors.push(`${sat}: text and hint need {en, vi}`);
    if (typeof s.done !== "function") errors.push(`${sat}: needs done(doc, ctx)`);
    checkText({ text: s.text, hint: s.hint }, sat, errors);
    const demo = readScript(s, "demo");
    if (demo === undefined) errors.push(`${sat}: every step needs a demo (Show me)`);
    else checkScript(demo, `${sat} demo`, errors);
  });
  if (!(m.steps ?? []).length) errors.push(`${at}: needs steps`);
}

test("every topic file follows the content guide", () => {
  assert.ok(topics.length > 0, "no topic files found");
  const errors = [];
  const ids = new Set();
  for (const { n, mod } of topics) {
    const items = mod.items ?? [];
    const missions = mod.missions ?? [];
    for (const x of [...items, ...missions]) {
      if (ids.has(x.id)) errors.push(`topic-${n}: duplicate id ${x.id}`);
      ids.add(x.id);
    }
    items.forEach((it) => checkItem(it, n, errors));
    missions.forEach((m) => checkMission(m, n, errors));
    for (const s of SKILLS.filter((k) => k.topic === n)) {
      if (!NO_ITEMS_NEEDED.has(s.id) && !items.some((i) => i.skill === s.id)) errors.push(`topic-${n}: skill ${s.id} has no revision item`);
      if (s.mission !== false && !missions.some((m) => m.skill === s.id || (m.steps ?? []).some((st) => st.skill === s.id)))
        errors.push(`topic-${n}: skill ${s.id} has no mission`);
    }
  }
  assert.deepEqual(errors, [], `\n${errors.join("\n")}`);
});

test("About me finishes when the title ends with a full stop", async () => {
  const { createDoc } = await import("../pb_public/js/word/model.js");
  const { missions } = await import("../pb_public/js/content/topic-1.js");
  const m = missions.find((x) => x.id === "t1-m-about-me");
  const ctx = { learner: { name: "Lan" } };
  for (const title of ["About me", "About me."]) {
    const doc = createDoc(`${title}\nMy name is Lan. I live in Melbourne.`);
    assert.equal(m.goal.check(doc, ctx), true, `title "${title}"`);
  }
});
