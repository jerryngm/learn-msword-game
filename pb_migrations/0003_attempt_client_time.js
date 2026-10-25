/// <reference path="../pb_data/types.d.ts" />
// When the learner actually finished an item. Attempts queued offline reach the server later,
// so `created` (server time) can fall on the wrong class day. The rules prefer `client_at`.

migrate((app) => {
  const attempts = app.findCollectionByNameOrId("attempts");
  attempts.fields.add(new DateField({ name: "client_at" }));
  app.save(attempts);
}, (app) => {
  const attempts = app.findCollectionByNameOrId("attempts");
  attempts.fields.removeByName("client_at");
  app.save(attempts);
});
