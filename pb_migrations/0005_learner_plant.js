/// <reference path="../pb_data/types.d.ts" />
// Each learner grows their own plant kind (sunflower, lotus, chilli…), picked at join so the class
// gets a mix. Learners already in the class get the kinds in join order. Learners still may change
// only `hide_vi`; the plant is fixed after create (the trainer may edit it).

const TRAINER = '@request.auth.collectionName = "trainers"';
const LANGUAGE_ONLY =
  '@request.body.hide_vi:isset = true && @request.body.name:isset = false && ' +
  '@request.body.avatar:isset = false && @request.body.colour:isset = false && ' +
  '@request.body.helper_badges:isset = false && @request.body.active:isset = false';

// Same keys and order as PLANT_KINDS in pb_public/js/plants.js.
const KINDS = ["sunflower", "tomato", "lotus", "apricot", "rose", "tulip", "chilli", "lavender", "hibiscus", "orchid", "peach", "marigold"];

migrate((app) => {
  const learners = app.findCollectionByNameOrId("learners");
  learners.fields.add(new TextField({ name: "plant", max: 32 }));
  learners.updateRule = `${TRAINER} || (${LANGUAGE_ONLY} && @request.body.plant:isset = false)`;
  app.save(learners);

  const rows = app.findRecordsByFilter("learners", "id != ''", "created", 0, 0);
  rows.forEach((row, i) => {
    row.set("plant", KINDS[i % KINDS.length]);
    app.saveNoValidate(row);
  });
}, (app) => {
  const learners = app.findCollectionByNameOrId("learners");
  learners.fields.removeByName("plant");
  learners.updateRule = `${TRAINER} || (${LANGUAGE_ONLY})`;
  app.save(learners);
});
