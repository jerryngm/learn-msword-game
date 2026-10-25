/// <reference path="../pb_data/types.d.ts" />
// Per-learner language choice: hide the Vietnamese second line for learners
// who don't read Vietnamese. Learners may change only this field.

const TRAINER = '@request.auth.collectionName = "trainers"';
const LANGUAGE_ONLY =
  '@request.body.hide_vi:isset = true && @request.body.name:isset = false && ' +
  '@request.body.avatar:isset = false && @request.body.colour:isset = false && ' +
  '@request.body.helper_badges:isset = false && @request.body.active:isset = false';

migrate((app) => {
  const learners = app.findCollectionByNameOrId("learners");
  learners.fields.add(new BoolField({ name: "hide_vi" }));
  learners.updateRule = `${TRAINER} || (${LANGUAGE_ONLY})`;
  app.save(learners);
}, (app) => {
  const learners = app.findCollectionByNameOrId("learners");
  learners.fields.removeByName("hide_vi");
  learners.updateRule = TRAINER;
  app.save(learners);
});
