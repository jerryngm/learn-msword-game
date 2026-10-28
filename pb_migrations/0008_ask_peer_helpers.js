/// <reference path="../pb_data/types.d.ts" />
// Peer helpers: learners can see open asks for skills they know and volunteer to assist.
// Asks gain item/kind (for task overview) and helper/helper_status (for real-time coordination).

const TRAINER = '@request.auth.collectionName = "trainers"';
const LEARNER_ALLOWED_UPDATE =
  '@request.body.learner:isset = false && @request.body.session:isset = false && ' +
  '@request.body.type:isset = false && @request.body.skill:isset = false && ' +
  '@request.body.item:isset = false && @request.body.kind:isset = false';

const OLD_LEARNER_STATUS_ONLY =
  '@request.body.status:isset = true && @request.body.learner:isset = false && ' +
  '@request.body.session:isset = false && @request.body.type:isset = false && @request.body.skill:isset = false';

migrate((app) => {
  const asks = app.findCollectionByNameOrId("asks");
  const learners = app.findCollectionByNameOrId("learners");

  asks.fields.add(new TextField({ name: "item", max: 60 }));
  asks.fields.add(new TextField({ name: "kind", max: 20 }));
  asks.fields.add(new RelationField({
    name: "helper",
    collectionId: learners.id,
    maxSelect: 1,
    cascadeDelete: false,
  }));
  asks.fields.add(new SelectField({
    name: "helper_status",
    values: ["open", "accepted", "declined"],
    maxSelect: 1,
  }));

  asks.updateRule = `${TRAINER} || (${LEARNER_ALLOWED_UPDATE})`;
  app.save(asks);
}, (app) => {
  const asks = app.findCollectionByNameOrId("asks");
  asks.fields.removeByName("item");
  asks.fields.removeByName("kind");
  asks.fields.removeByName("helper");
  asks.fields.removeByName("helper_status");
  asks.updateRule = `${TRAINER} || (${OLD_LEARNER_STATUS_ONLY})`;
  app.save(asks);
});
