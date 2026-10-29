import { test } from "node:test";
import assert from "node:assert/strict";

import { GAME_STRINGS, gt } from "../pb_public/js/strings-game.js";
import {
  acknowledgeEncouragements,
  groupTeacherRecognitions,
  isEncouragementAcknowledged,
  resolveTaskOverview,
} from "../pb_public/js/helper-alerts.js";

// Polyfill localStorage in test if absent
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

test("Peer Helper Alert strings exist with valid English and Vietnamese", () => {
  const keys = [
    "helperAlertTitle",
    "helperAlertAsking",
    "helperAlertBanner",
    "helperAlertView",
    "helperAlertGoal",
    "helperAlertPrompt",
    "helperAlertAccept",
    "helperAlertDecline",
    "helperAlertAccepted",
    "helperComing",
    "helperTopicTask",
    "taskMission",
    "taskRevision",
  ];

  for (const key of keys) {
    assert.ok(GAME_STRINGS[key], `missing string key ${key}`);
    assert.ok(GAME_STRINGS[key].en, `missing en for ${key}`);
    assert.ok(GAME_STRINGS[key].vi, `missing vi for ${key}`);
  }

  const asking = gt("helperAlertAsking", { name: "Lan" });
  assert.ok(asking.en.includes("Lan"));
  assert.ok(asking.vi.includes("Lan"));

  const coming = gt("helperComing", { name: "John" });
  assert.ok(coming.en.includes("John"));
  assert.ok(coming.vi.includes("John"));
});

test("Teacher Recognition strings exist with valid English and Vietnamese", () => {
  const keys = [
    "teacherPraiseTitle",
    "teacherBadgeTitle",
    "teacherCombinedTitle",
    "teacherBadgeAwarded",
    "teacherBadgeSub",
    "teacherAck",
    "teacherAckCelebration",
    "teacherDismiss",
  ];

  for (const key of keys) {
    assert.ok(GAME_STRINGS[key], `missing string key ${key}`);
    assert.ok(GAME_STRINGS[key].en, `missing en for ${key}`);
    assert.ok(GAME_STRINGS[key].vi, `missing vi for ${key}`);
  }
});

test("resolveTaskOverview: resolves skill topic and goal for mission and revision", async () => {
  const missionOverview = await resolveTaskOverview({
    skill: "t1-save",
    kind: "mission",
    item: "t1-m-about-me",
  });

  assert.equal(missionOverview.topic, 1);
  assert.equal(missionOverview.typeKey, "taskMission");
  assert.ok(missionOverview.goal.en.includes("save"));
  assert.ok(missionOverview.goal.vi.includes("lưu"));

  const revisionOverview = await resolveTaskOverview({
    skill: "t1-keys",
    kind: "revision",
    item: "t1-keys-1",
  });

  assert.equal(revisionOverview.topic, 1);
  assert.equal(revisionOverview.typeKey, "taskRevision");
  assert.ok(revisionOverview.goal.en);
  assert.ok(revisionOverview.goal.vi);
});

test("groupTeacherRecognitions: groups star and helper badge recognitions correctly", () => {
  globalThis.localStorage.clear();

  // Empty list returns null
  assert.equal(groupTeacherRecognitions([]), null);
  assert.equal(groupTeacherRecognitions(null), null);

  const now = new Date().toISOString();

  // 1. Star encouragement only
  const starOnly = [{ id: "s1", kind: "star", message: "Great work today!", created: now }];
  const resStar = groupTeacherRecognitions(starOnly);
  assert.ok(resStar);
  assert.equal(resStar.hasStar, true);
  assert.equal(resStar.hasHelper, false);
  assert.equal(resStar.message, "Great work today!");
  assert.equal(resStar.titleKey, "teacherPraiseTitle");
  assert.deepEqual(resStar.ids, ["s1"]);

  // 2. Helper badge only
  const helperOnly = [{ id: "h1", kind: "helper", message: "", created: now }];
  const resHelper = groupTeacherRecognitions(helperOnly);
  assert.ok(resHelper);
  assert.equal(resHelper.hasStar, false);
  assert.equal(resHelper.hasHelper, true);
  assert.equal(resHelper.titleKey, "teacherBadgeTitle");
  assert.deepEqual(resHelper.ids, ["h1"]);

  // 3. Combined Star + Helper badge within 10s
  const combined = [
    { id: "s2", kind: "star", message: "Thank you for helping a classmate.", created: now },
    { id: "h2", kind: "helper", message: "", created: now },
  ];
  const resComb = groupTeacherRecognitions(combined);
  assert.ok(resComb);
  assert.equal(resComb.hasStar, true);
  assert.equal(resComb.hasHelper, true);
  assert.equal(resComb.titleKey, "teacherCombinedTitle");
  assert.equal(resComb.message, "Thank you for helping a classmate.");
  assert.deepEqual(resComb.ids, ["s2", "h2"]);

  // 4. Acknowledging removes them from unacknowledged list
  acknowledgeEncouragements(resComb.ids);
  assert.equal(isEncouragementAcknowledged("s2"), true);
  assert.equal(isEncouragementAcknowledged("h2"), true);
  assert.equal(groupTeacherRecognitions(combined), null);
});
