/// <reference path="../pb_data/types.d.ts" />
// Word Garden data model. Learner skill state is derived from `attempts`,
// so there is no skill_state collection.

const TRAINER = '@request.auth.collectionName = "trainers"';
const PUBLIC = "";
const ADMIN = null;

const timestamps = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

migrate((app) => {
  const trainers = new Collection({
    type: "auth",
    name: "trainers",
    listRule: ADMIN,
    viewRule: ADMIN,
    createRule: ADMIN,
    updateRule: ADMIN,
    deleteRule: ADMIN,
    fields: [{ name: "name", type: "text", max: 60 }, ...timestamps],
  });
  app.save(trainers);

  const learners = new Collection({
    type: "base",
    name: "learners",
    listRule: PUBLIC,
    viewRule: PUBLIC,
    createRule: PUBLIC,
    updateRule: TRAINER,
    deleteRule: TRAINER,
    fields: [
      { name: "name", type: "text", required: true, max: 20 },
      { name: "avatar", type: "text", required: true, max: 32 },
      { name: "colour", type: "text", max: 16 },
      { name: "helper_badges", type: "number", min: 0, onlyInt: true },
      { name: "active", type: "bool" },
      ...timestamps,
    ],
  });
  app.save(learners);

  const sessions = new Collection({
    type: "base",
    name: "sessions",
    listRule: PUBLIC,
    viewRule: PUBLIC,
    createRule: TRAINER,
    updateRule: TRAINER,
    deleteRule: TRAINER,
    fields: [
      { name: "topics", type: "json" },
      { name: "preset", type: "select", maxSelect: 1, values: ["all_covered", "last_week", "most_faded", "custom"] },
      { name: "mode", type: "select", required: true, maxSelect: 1, values: ["revision", "missions", "both"] },
      { name: "length", type: "number", onlyInt: true, min: 1, max: 30 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["live", "ended"] },
      { name: "show_names", type: "bool" },
      ...timestamps,
    ],
  });
  app.save(sessions);

  const attempts = new Collection({
    type: "base",
    name: "attempts",
    listRule: PUBLIC,
    viewRule: PUBLIC,
    createRule: PUBLIC,
    updateRule: TRAINER,
    deleteRule: TRAINER,
    fields: [
      { name: "learner", type: "relation", required: true, maxSelect: 1, collectionId: learners.id, cascadeDelete: true },
      { name: "session", type: "relation", maxSelect: 1, collectionId: sessions.id, cascadeDelete: false },
      { name: "skill", type: "text", required: true, max: 40 },
      { name: "item", type: "text", required: true, max: 60 },
      { name: "kind", type: "select", required: true, maxSelect: 1, values: ["revision", "mission", "free"] },
      { name: "stars", type: "number", required: true, onlyInt: true, min: 1, max: 3 },
      { name: "help_level", type: "number", onlyInt: true, min: 0, max: 3 },
      { name: "tries", type: "number", onlyInt: true, min: 0 },
      ...timestamps,
    ],
    indexes: [
      "CREATE INDEX idx_attempts_learner_skill ON attempts (learner, skill)",
      "CREATE INDEX idx_attempts_session ON attempts (session)",
    ],
  });
  app.save(attempts);

  // Learners may only flip an ask to done; every other field is fixed after create.
  const asksUpdate =
    '@request.body.status:isset = true && @request.body.learner:isset = false && ' +
    '@request.body.session:isset = false && @request.body.type:isset = false && @request.body.skill:isset = false';
  const asks = new Collection({
    type: "base",
    name: "asks",
    listRule: PUBLIC,
    viewRule: PUBLIC,
    createRule: PUBLIC,
    updateRule: asksUpdate,
    deleteRule: TRAINER,
    fields: [
      { name: "learner", type: "relation", required: true, maxSelect: 1, collectionId: learners.id, cascadeDelete: true },
      { name: "session", type: "relation", maxSelect: 1, collectionId: sessions.id, cascadeDelete: false },
      { name: "type", type: "select", required: true, maxSelect: 1, values: ["stuck", "learn_more", "classmate"] },
      { name: "skill", type: "text", max: 40 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["open", "done"] },
      ...timestamps,
    ],
  });
  app.save(asks);

  const encouragements = new Collection({
    type: "base",
    name: "encouragements",
    listRule: PUBLIC,
    viewRule: PUBLIC,
    createRule: TRAINER,
    updateRule: TRAINER,
    deleteRule: TRAINER,
    fields: [
      { name: "learner", type: "relation", required: true, maxSelect: 1, collectionId: learners.id, cascadeDelete: true },
      { name: "kind", type: "select", required: true, maxSelect: 1, values: ["star", "helper"] },
      { name: "message", type: "text", max: 200 },
      ...timestamps,
    ],
  });
  app.save(encouragements);

  const classSettings = new Collection({
    type: "base",
    name: "class_settings",
    listRule: PUBLIC,
    viewRule: PUBLIC,
    createRule: ADMIN,
    updateRule: TRAINER,
    deleteRule: ADMIN,
    fields: [
      { name: "taught_topics", type: "json" },
      { name: "dish_names", type: "json" },
      ...timestamps,
    ],
  });
  app.save(classSettings);

  // The single settings record. Dish names are keyed by topic number.
  const settings = new Record(classSettings);
  settings.set("taught_topics", [1]);
  settings.set("dish_names", {
    1: "Phở",
    2: "Bánh mì",
    3: "Gỏi cuốn",
    4: "Há cảo",
    5: "Cơm chiên Dương Châu",
    6: "Bánh xèo",
    7: "Mì hoành thánh",
    8: "Bánh bao",
    9: "Lẩu",
  });
  app.save(settings);
}, (app) => {
  for (const name of ["class_settings", "encouragements", "asks", "attempts", "sessions", "learners", "trainers"]) {
    app.delete(app.findCollectionByNameOrId(name));
  }
});
