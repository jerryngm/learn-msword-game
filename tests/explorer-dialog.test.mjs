import { test } from "node:test";
import assert from "node:assert/strict";

import { GLYPH, PIN, VIEW_GLYPH, PANE_GLYPH, HELP_GLYPH, CARET } from "../pb_public/js/word/picture-dialogs.js";

test("GLYPH exports modern Windows 11 Explorer icons", () => {
  const keys = ["home", "gallery", "onedrive", "desktop", "downloads", "documents", "pictures", "music", "videos", "thispc"];
  for (const k of keys) {
    assert.ok(GLYPH[k], `GLYPH[${k}] must exist`);
    assert.match(GLYPH[k], /<svg/i, `GLYPH[${k}] must be SVG`);
  }
  assert.match(PIN, /<svg/i, "PIN must be SVG");
  assert.match(VIEW_GLYPH, /<svg/i, "VIEW_GLYPH must be SVG");
  assert.match(PANE_GLYPH, /<svg/i, "PANE_GLYPH must be SVG");
  assert.match(HELP_GLYPH, /<svg/i, "HELP_GLYPH must be SVG");
  assert.match(CARET, /▾/, "CARET must contain chevron down");
});
