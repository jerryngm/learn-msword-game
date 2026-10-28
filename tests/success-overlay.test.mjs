import { test } from "node:test";
import assert from "node:assert/strict";

import { GAME_STRINGS } from "../pb_public/js/strings-game.js";
import { renderSuccess, starsHtml, icanOf } from "../pb_public/js/screens/success.js";

test("strings for mission completion overlay exist with English and Vietnamese", () => {
  assert.ok(GAME_STRINGS.viewMyWork, "missing viewMyWork");
  assert.ok(GAME_STRINGS.viewMyWork.en, "missing en for viewMyWork");
  assert.ok(GAME_STRINGS.viewMyWork.vi, "missing vi for viewMyWork");

  assert.ok(GAME_STRINGS.backToResult, "missing backToResult");
  assert.ok(GAME_STRINGS.backToResult.en, "missing en for backToResult");
  assert.ok(GAME_STRINGS.backToResult.vi, "missing vi for backToResult");
});

test("renderSuccess: standalone mode renders standard screen without overlay class", () => {
  // Mock window and document listeners if running in node environment without full DOM
  if (typeof globalThis.window === "undefined") {
    globalThis.window = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
  if (typeof globalThis.document === "undefined") {
    globalThis.document = {
      documentElement: { classList: { contains: () => false } },
    };
  }

  function createMockElement(tag = "div") {
    const listeners = {};
    const classes = new Set();
    return {
      tagName: tag.toUpperCase(),
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        toggle: (c, force) => {
          if (force === undefined) {
            if (classes.has(c)) classes.delete(c);
            else classes.add(c);
          } else if (force) classes.add(c);
          else classes.delete(c);
          return classes.has(c);
        },
        contains: (c) => classes.has(c),
      },
      addEventListener: (type, fn) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener: (type, fn) => {
        if (listeners[type]) listeners[type] = listeners[type].filter((f) => f !== fn);
      },
      dispatchEvent: (e) => (listeners[e.type] || []).forEach((f) => f(e)),
      focus: () => {},
      innerHTML: "",
      style: {},
      querySelector: function (sel) {
        if (sel === ".wg-win-next") return createMockElement("button");
        if (sel === ".wg-win-screen") return this;
        if (sel === ".wg-win-peek") return null;
        if (sel === "#helperAlertSlot") return createMockElement("div");
        if (sel === "main") return this;
        return null;
      },
    };
  }

  const root = createMockElement("div");
  const cleanup = renderSuccess(root, {
    stars: 3,
    skill: "t1-bold",
    before: { stage: 1, wilted: false, mastered: false },
    after: { stage: 2, wilted: false, mastered: false },
    help_level: 0,
    tries: 1,
    nextKey: "next",
    onNext: () => {},
  });

  assert.ok(root.innerHTML.includes('class="screen wg-win-screen"'), "should have standard wg-win-screen class");
  assert.ok(!root.innerHTML.includes("is-overlay"), "standalone mode should NOT have is-overlay class");
  assert.ok(root.innerHTML.includes("lhead"), "standalone mode should render header");
  assert.ok(!root.innerHTML.includes("wg-win-peek"), "standalone mode should not have peek button");

  cleanup();
});

test("renderSuccess: asOverlay mode renders is-overlay, dialog role, and peek button", () => {
  if (typeof globalThis.window === "undefined") {
    globalThis.window = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }

  function createMockElement(tag = "div") {
    const listeners = {};
    const classes = new Set();
    const el = {
      tagName: tag.toUpperCase(),
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        toggle: (c, force) => {
          if (force === undefined) {
            if (classes.has(c)) classes.delete(c);
            else classes.add(c);
          } else if (force) classes.add(c);
          else classes.delete(c);
          return classes.has(c);
        },
        contains: (c) => classes.has(c),
      },
      addEventListener: (type, fn) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener: (type, fn) => {
        if (listeners[type]) listeners[type] = listeners[type].filter((f) => f !== fn);
      },
      dispatchEvent: (e) => (listeners[e.type] || []).forEach((f) => f(e)),
      focus: () => {},
      innerHTML: "",
      style: {},
      querySelector: function (sel) {
        if (sel === ".wg-win-next") return createMockElement("button");
        if (sel === ".wg-win-screen") return this;
        if (sel === ".wg-win-peek") return createMockElement("button");
        if (sel === "#helperAlertSlot") return createMockElement("div");
        if (sel === "main") return this;
        return null;
      },
    };
    return el;
  }

  const root = createMockElement("div");
  const cleanup = renderSuccess(
    root,
    {
      stars: 3,
      skill: "t1-bold",
      before: { stage: 1, wilted: false, mastered: false },
      after: { stage: 2, wilted: false, mastered: false },
      help_level: 0,
      tries: 1,
      nextKey: "next",
      onNext: () => {},
    },
    { asOverlay: true },
  );

  assert.ok(root.innerHTML.includes("is-overlay"), "overlay mode must have is-overlay class");
  assert.ok(root.innerHTML.includes('role="dialog" aria-modal="true"'), "overlay mode must have dialog role and aria-modal");
  assert.ok(!root.innerHTML.includes("lhead"), "overlay mode should omit redundant lhead");
  assert.ok(root.innerHTML.includes("wg-win-peek"), "overlay mode must have peek button");
  assert.ok(root.innerHTML.includes("helperAlertSlot"), "overlay mode must preserve #helperAlertSlot for assistance notifications");

  // In overlay mode, no floating ask button is added (it avoids duplicate ask button)
  assert.equal(root.querySelector(".ask-fab"), null, "should not mount floating ask button in overlay mode");

  cleanup();
});
