/// <reference path="../pb_data/types.d.ts" />
// The class garden is kept across sessions; each new flower is a surprise kind unless the trainer
// picks one. Picks are {flower index: plant kind key}, edited by the trainer (class_settings rule).

migrate((app) => {
  const settings = app.findCollectionByNameOrId("class_settings");
  settings.fields.add(new JSONField({ name: "garden_picks" }));
  app.save(settings);
}, (app) => {
  const settings = app.findCollectionByNameOrId("class_settings");
  settings.fields.removeByName("garden_picks");
  app.save(settings);
});
