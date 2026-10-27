/// <reference path="../pb_data/types.d.ts" />
// Completion stays on the final real revision attempt, including attempts queued offline.
migrate((app) => {
  const sessions = app.findCollectionByNameOrId("sessions");
  const preset = sessions.fields.getByName("preset");
  preset.values = [...preset.values, "revise_everything"];
  app.save(sessions);
  const attempts = app.findCollectionByNameOrId("attempts");
  attempts.fields.add(new BoolField({ name: "review_complete" }));
  app.save(attempts);
}, (app) => {
  // Existing review sessions remain usable after rollback as ordinary mixed revision.
  const rows = app.findRecordsByFilter("sessions", 'preset = "revise_everything"', "", 0, 0);
  rows.forEach((row) => { row.set("preset", "all_covered"); app.save(row); });
  const sessions = app.findCollectionByNameOrId("sessions");
  const preset = sessions.fields.getByName("preset");
  preset.values = preset.values.filter((value) => value !== "revise_everything");
  app.save(sessions);
  const attempts = app.findCollectionByNameOrId("attempts");
  attempts.fields.removeByName("review_complete");
  app.save(attempts);
});
