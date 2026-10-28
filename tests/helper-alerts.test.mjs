import { test } from "node:test";
import assert from "node:assert/strict";

import { GAME_STRINGS, gt } from "../pb_public/js/strings-game.js";
import { resolveTaskOverview } from "../pb_public/js/helper-alerts.js";

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
