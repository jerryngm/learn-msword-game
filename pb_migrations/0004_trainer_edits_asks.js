/// <reference path="../pb_data/types.d.ts" />
// The trainer may edit any ask field (merging duplicate learners moves their asks).
// Learners keep the old rule: they may only flip status.

const TRAINER = '@request.auth.collectionName = "trainers"';
const LEARNER_STATUS_ONLY =
  '@request.body.status:isset = true && @request.body.learner:isset = false && ' +
  '@request.body.session:isset = false && @request.body.type:isset = false && @request.body.skill:isset = false';

migrate((app) => {
  const asks = app.findCollectionByNameOrId("asks");
  asks.updateRule = `${TRAINER} || (${LEARNER_STATUS_ONLY})`;
  app.save(asks);
}, (app) => {
  const asks = app.findCollectionByNameOrId("asks");
  asks.updateRule = LEARNER_STATUS_ONLY;
  app.save(asks);
});
