import { test } from "node:test";
import assert from "node:assert/strict";

import { rankClassmates } from "../pb_public/js/ask.js";
import { GAME_STRINGS, gt } from "../pb_public/js/strings-game.js";

test("Ask a classmate strings exist with valid English and Vietnamese", () => {
  for (const key of ["askMate", "askMateFound", "askMateList", "askMateHere", "askMateMastered", "askMateNone"]) {
    assert.ok(GAME_STRINGS[key], `missing string key ${key}`);
    assert.ok(GAME_STRINGS[key].en, `missing en for ${key}`);
    assert.ok(GAME_STRINGS[key].vi, `missing vi for ${key}`);
  }

  const list = gt("askMateList");
  assert.equal(list.en, "These classmates know this! You can ask them:");
  assert.equal(list.vi, "Các bạn này đã làm được phần này rồi! Bạn có thể nhờ chỉ giúp:");

  const here = gt("askMateHere");
  assert.equal(here.en, "In class today");
  assert.equal(here.vi, "Có mặt hôm nay");

  const single = gt("askMateFound", { name: "Bình" });
  assert.ok(single.en.includes("Bình"));
  assert.ok(single.vi.includes("Bình"));
});

test("rankClassmates: excludes asker (me) and inactive learners", () => {
  const learners = [
    { id: "me-1", name: "Me", avatar: "mango", active: true },
    { id: "inactive-1", name: "Off", avatar: "lemon", active: false },
    { id: "active-1", name: "An", avatar: "coconut", active: true },
  ];
  const attempts = [
    { learner: "me-1", skill: "t1-save", stars: 3, created: "2026-10-28 02:00:00.000Z" },
    { learner: "inactive-1", skill: "t1-save", stars: 3, created: "2026-10-28 02:00:00.000Z" },
    { learner: "active-1", skill: "t1-save", stars: 3, created: "2026-10-28 02:00:00.000Z" },
  ];

  const res = rankClassmates({
    attempts,
    learners,
    skill: "t1-save",
    me: "me-1",
    today: "2026-10-28",
  });

  assert.equal(res.length, 1);
  assert.equal(res[0].person.id, "active-1");
});

test("rankClassmates: includes bud (3★ once today) and completed (2★), excludes 1★ only", () => {
  const learners = [
    { id: "bud-1", name: "Lan", avatar: "mango", active: true },
    { id: "two-star-1", name: "Minh", avatar: "chilli", active: true },
    { id: "one-star-1", name: "Nam", avatar: "turtle", active: true },
  ];
  const attempts = [
    { learner: "bud-1", skill: "t1-keys", stars: 3, created: "2026-10-28 02:00:00.000Z" },
    { learner: "two-star-1", skill: "t1-keys", stars: 2, created: "2026-10-28 02:00:00.000Z" },
    { learner: "one-star-1", skill: "t1-keys", stars: 1, created: "2026-10-28 02:00:00.000Z" },
  ];

  const res = rankClassmates({
    attempts,
    learners,
    skill: "t1-keys",
    me: "other-user",
    today: "2026-10-28",
  });

  const ids = res.map((r) => r.person.id);
  assert.ok(ids.includes("bud-1"), "bud learner should be included");
  assert.ok(ids.includes("two-star-1"), "2-star learner should be included");
  assert.ok(!ids.includes("one-star-1"), "1-star only learner must NOT be included");
  // bud ranks above 2-star
  assert.equal(ids[0], "bud-1");
  assert.equal(ids[1], "two-star-1");
});

test("rankClassmates: learners in today's session rank first", () => {
  const learners = [
    { id: "home-master", name: "Hoa", avatar: "mango", active: true },
    { id: "class-helper", name: "Tuấn", avatar: "coconut", active: true },
  ];
  const attempts = [
    // Hoa has flowering (clean on 2 different days), but is NOT in today's session
    { learner: "home-master", skill: "t1-save", stars: 3, created: "2026-10-21 02:00:00.000Z" },
    { learner: "home-master", skill: "t1-save", stars: 3, created: "2026-10-28 02:00:00.000Z" },
    // Tuấn only has bud today, but IS in today's session
    { learner: "class-helper", skill: "t1-save", stars: 3, session: "sess-today", created: "2026-10-28 03:00:00.000Z" },
  ];

  const res = rankClassmates({
    attempts,
    learners,
    skill: "t1-save",
    me: "other-id",
    sessionId: "sess-today",
    sessionLearners: ["class-helper"],
    today: "2026-10-28",
  });

  assert.equal(res.length, 2);
  assert.equal(res[0].person.name, "Tuấn");
  assert.equal(res[0].here, true);
  assert.equal(res[1].person.name, "Hoa");
  assert.equal(res[1].here, false);
});

test("rankClassmates: returns empty array when no classmates qualify", () => {
  const learners = [
    { id: "p1", name: "A", avatar: "mango", active: true },
  ];
  const attempts = [
    // only 1 star attempt
    { learner: "p1", skill: "t2-spelling", stars: 1, created: "2026-10-28 02:00:00.000Z" },
  ];

  const res = rankClassmates({
    attempts,
    learners,
    skill: "t2-spelling",
    me: "me-id",
    today: "2026-10-28",
  });

  assert.deepEqual(res, []);
});
