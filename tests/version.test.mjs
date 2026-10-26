import { test } from "node:test";
import assert from "node:assert/strict";

import { APP_VERSION } from "../pb_public/js/version.js";

test("APP_VERSION is a plain X.Y.Z version that release.sh can bump", () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
});
