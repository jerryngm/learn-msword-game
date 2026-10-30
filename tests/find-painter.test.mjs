import { test } from "node:test";
import assert from "node:assert/strict";

import { applyPainter, applyFormat, applyParaFormat, createDoc, findMatches, painterFormat } from "../pb_public/js/word/model.js";

test("findMatches finds every case-insensitive match in reading order", () => {
  const doc = createDoc("Sunday market\nOpen on sunday and SUNDAY\nNo match here");
  const m = findMatches(doc, "sunday");
  assert.deepEqual(m.map((x) => [x.from.p, x.from.offset, x.to.offset]), [[0, 0, 6], [1, 8, 14], [1, 19, 25]]);
  assert.deepEqual(findMatches(doc, ""), []);
  assert.deepEqual(findMatches(doc, "zzz"), []);
});

test("findMatches does not overlap matches", () => {
  assert.equal(findMatches(createDoc("aaaa"), "aa").length, 2);
});

test("painterFormat copies characters only for a partial selection", () => {
  let doc = createDoc("Big title\nplain words");
  doc = applyFormat(doc, { from: { p: 0, offset: 0 }, to: { p: 0, offset: 9 } }, { b: true, size: 20 });
  doc = applyParaFormat(doc, 0, 0, { align: "center" });
  const part = painterFormat(doc, { from: { p: 0, offset: 0 }, to: { p: 0, offset: 3 } });
  assert.equal(part.run.b, true);
  assert.equal(part.run.size, 20);
  assert.equal(part.para, null);
  const whole = painterFormat(doc, { from: { p: 0, offset: 0 }, to: { p: 0, offset: 9 } });
  assert.deepEqual(whole.para, { align: "center" });
});

test("applyPainter paints characters and, for a whole-paragraph source, the alignment", () => {
  let doc = createDoc("Big title\nplain words");
  doc = applyFormat(doc, { from: { p: 0, offset: 0 }, to: { p: 0, offset: 9 } }, { b: true, colour: "#FF0000" });
  doc = applyParaFormat(doc, 0, 0, { align: "center" });
  const target = { from: { p: 1, offset: 0 }, to: { p: 1, offset: 5 } };
  const charsOnly = applyPainter(doc, target, painterFormat(doc, { from: { p: 0, offset: 0 }, to: { p: 0, offset: 3 } }));
  assert.equal(charsOnly.p[1].runs[0].b, true);
  assert.equal(charsOnly.p[1].runs[0].colour, "#FF0000");
  assert.equal(charsOnly.p[1].align, "left");
  const withPara = applyPainter(doc, target, painterFormat(doc, { from: { p: 0, offset: 0 }, to: { p: 0, offset: 9 } }));
  assert.equal(withPara.p[1].align, "center");
  assert.equal(withPara.p[1].runs.at(-1).b, false, "the words after the painted range keep their format");
});
