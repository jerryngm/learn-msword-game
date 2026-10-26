import { PICTURES } from "./pictures.js";
// Document model for the Word mock. Pure functions over frozen snapshots; nothing here touches the DOM.
//
// doc  = { p: [Para, ...] }
// Para = { style, align, spacing:{before, after, line}, indent:{left, right}, list, shading, borders, runs:[Run] }
// Run  = { text, font, size, b, i, u, strike, sub, sup, colour, highlight, effect }
// Positions are { p, offset } with offset counted in UTF-16 code units, the same unit the DOM uses.

export const FONTS = Object.freeze([
  "Aptos",
  "Aptos Display",
  "Arial",
  "Calibri",
  "Cambria",
  "Comic Sans MS",
  "Courier New",
  "Georgia",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Verdana",
]);
export const SIZES = Object.freeze([8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72]);
export const UNDERLINES = Object.freeze(["single", "double", "thick", "dotted", "dashed", "wave"]);
export const EFFECTS = Object.freeze(["outline", "shadow", "glow"]);
export const ALIGNS = Object.freeze(["left", "center", "right", "justify"]);
export const BORDER_SIDES = Object.freeze(["top", "bottom", "left", "right"]);
export const BULLET_GLYPHS = Object.freeze(["•", "○", "■", "◆", "➢", "✓"]);
export const NUMBER_FORMATS = Object.freeze(["1.", "1)", "I.", "A.", "a)", "a.", "i."]);
export const MAX_INDENT = 6; // inches; Word stops at the right margin

/** Classroom default: Aptos (Body) 12, spacing Before 0 / After 8 pt, line spacing 1.15. */
export const DEFAULT_RUN = Object.freeze({
  font: "Aptos",
  size: 12,
  b: false,
  i: false,
  u: false,
  strike: false,
  sub: false,
  sup: false,
  colour: null,
  highlight: null,
  effect: null,
});
export const RUN_KEYS = Object.freeze(Object.keys(DEFAULT_RUN));

export const DEFAULT_PARA = Object.freeze({
  style: "Normal",
  align: "left",
  spacing: Object.freeze({ before: 0, after: 8, line: 1.15 }),
  indent: Object.freeze({ left: 0, right: 0 }),
  list: null,
  shading: null,
  borders: Object.freeze([]),
});
const PARA_KEYS = Object.freeze([...Object.keys(DEFAULT_PARA), "cell", "picture"]);

const HEX = /^#[0-9A-Fa-f]{6}$/;

/* ---------- validation helpers (data from missions or the server is untrusted) ---------- */

function num(value, fallback, min, max) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function colour(value) {
  return typeof value === "string" && HEX.test(value) ? value.toUpperCase() : null;
}
function oneOf(value, list, fallback) {
  return list.includes(value) ? value : fallback;
}

/** A run with every key present and in a fixed order, so JSON.stringify is stable. */
export function makeRun(text, props = {}) {
  if (typeof text !== "string") throw new TypeError("run text must be a string");
  const u = props.u === true ? "single" : props.u;
  return Object.freeze({
    text: text.replace(/[\r\n]/g, ""),
    font: typeof props.font === "string" && props.font.trim() ? props.font.trim() : DEFAULT_RUN.font,
    size: Math.round(num(props.size, DEFAULT_RUN.size, 1, 1638) * 2) / 2,
    b: Boolean(props.b),
    i: Boolean(props.i),
    u: oneOf(u, UNDERLINES, false),
    strike: Boolean(props.strike),
    sub: Boolean(props.sub) && !props.sup,
    sup: Boolean(props.sup),
    colour: colour(props.colour),
    highlight: colour(props.highlight),
    effect: oneOf(props.effect, EFFECTS, null),
  });
}

/** Formatting of a run without its text. */
export function runProps(run) {
  const out = {};
  for (const k of RUN_KEYS) out[k] = run[k];
  return out;
}

function sameProps(a, b) {
  return RUN_KEYS.every((k) => a[k] === b[k]);
}

function makeList(list) {
  if (!list || typeof list !== "object") return null;
  if (list.type === "bullet") return Object.freeze({ type: "bullet", format: oneOf(list.format, BULLET_GLYPHS, "•") });
  if (list.type === "number") return Object.freeze({ type: "number", format: oneOf(list.format, NUMBER_FORMATS, "1.") });
  return null;
}

/* ---------- paragraphs ---------- */

/** Merge neighbours with equal formatting and drop empty runs; an empty paragraph keeps one empty run. */
function normaliseRuns(runs) {
  const out = [];
  for (const r of runs) {
    if (!r.text) continue;
    const last = out[out.length - 1];
    if (last && sameProps(last, r)) out[out.length - 1] = makeRun(last.text + r.text, last);
    else out.push(r);
  }
  if (!out.length) out.push(makeRun("", runs[0] ?? DEFAULT_RUN));
  return Object.freeze(out);
}

export class Para {
  constructor(props = {}, runs = []) {
    const spacing = props.spacing ?? {};
    const indent = props.indent ?? {};
    const picture = PICTURES.find(p=>p.id===props.picture?.id);
    if (picture) this.picture=Object.freeze({id:picture.id,width:num(props.picture.width,240,24,600),height:num(props.picture.height,240*picture.height/picture.width,24,600),wrap:["square","front","behind"].includes(props.picture.wrap)?props.picture.wrap:"inline",x:num(props.picture.x,0,-1200,1200),y:num(props.picture.y,0,-1600,1600)});
    if (props.cell) this.cell = Object.freeze({ table: props.cell.table | 0, row: props.cell.row | 0, col: props.cell.col | 0 });
    this.style = typeof props.style === "string" ? props.style : DEFAULT_PARA.style;
    this.align = oneOf(props.align, ALIGNS, DEFAULT_PARA.align);
    this.spacing = Object.freeze({
      before: num(spacing.before, DEFAULT_PARA.spacing.before, 0, 1584),
      after: num(spacing.after, DEFAULT_PARA.spacing.after, 0, 1584),
      line: num(spacing.line, DEFAULT_PARA.spacing.line, 0.5, 5),
    });
    this.indent = Object.freeze({
      left: num(indent.left, 0, 0, MAX_INDENT),
      right: num(indent.right, 0, 0, MAX_INDENT),
    });
    this.list = makeList(props.list);
    this.shading = colour(props.shading);
    const sides = Array.isArray(props.borders) ? props.borders : [];
    this.borders = Object.freeze(BORDER_SIDES.filter((s) => sides.includes(s)));
    this.runs = normaliseRuns(runs.map((r) => (Object.isFrozen(r) && "effect" in r ? r : makeRun(String(r.text ?? ""), r))));
    Object.freeze(this);
  }

  /** Plain text of the paragraph. Not serialised (lives on the prototype). */
  get text() {
    return this.runs.map((r) => r.text).join("");
  }
  get length() {
    return this.runs.reduce((n, r) => n + r.text.length, 0);
  }
  textOf() {
    return this.text;
  }
  /** See runsMatching() below. */
  runsMatching(needle, opts) {
    return runsMatching(this, needle, opts);
  }
}

/** Paragraph formatting without the runs, as a plain object. */
export function paraProps(para) {
  const out = {};
  for (const k of PARA_KEYS) out[k] = para[k];
  return out;
}

function withRuns(para, runs) {
  return new Para(paraProps(para), runs);
}

/** New paragraph with some paragraph properties replaced (deep keys spacing/indent are merged). */
export function updatePara(para, patch) {
  const base = paraProps(para);
  const next = { ...base, ...patch };
  if (patch.spacing) next.spacing = { ...base.spacing, ...patch.spacing };
  if (patch.indent) next.indent = { ...base.indent, ...patch.indent };
  return new Para(next, para.runs);
}

/* ---------- documents ---------- */

function freezeDoc(paras, spellings, page) {
  if (!paras.length) paras = [new Para()];
  const tables = [];
  for (const para of paras) if (para.cell) {
    const {table, row, col} = para.cell;
    tables[table] ??= {rows: []};
    tables[table].rows[row] ??= [];
    tables[table].rows[row][col] ??= {p: []};
    tables[table].rows[row][col].p.push(para);
  }
  for (const table of tables) if (table) {
    for (const row of table.rows) if (row) { for (const cell of row) if (cell) { Object.freeze(cell.p); Object.freeze(cell); } Object.freeze(row); }
    Object.freeze(table.rows); Object.freeze(table);
  }
  return Object.freeze({ p: Object.freeze(paras), ...(spellings ? { spellings } : {}),
    ...(paras.some(p=>p.picture) ? {pictures:Object.freeze(paras.filter(p=>p.picture).map(p=>p.picture))} : {}),
    ...(tables.length ? {tables: Object.freeze(tables)} : {}),
    ...(page ? {page: Object.freeze({orientation: page.orientation === "landscape" ? "landscape" : "portrait", margins: page.margins === "narrow" ? "narrow" : "normal"})} : {}) });
}

/**
 * Build a document from a model snapshot, plain JSON of one, an array of paragraph strings,
 * or plain text (one paragraph per line).
 */
export function createDoc(input) {
  if (input == null || input === "") return freezeDoc([]);
  if (typeof input === "string") {
    return freezeDoc(input.split(/\r?\n/).map((line) => new Para({}, [makeRun(line)])));
  }
  if (Array.isArray(input)) return createDoc({ p: input });
  if (typeof input !== "object" || !Array.isArray(input.p)) throw new TypeError("createDoc: expected text or {p:[...]}");
  if (Object.isFrozen(input) && input.p.every((x) => x instanceof Para)) return input;
  const paras = input.p.map((raw) => {
    if (raw instanceof Para) return raw;
    if (typeof raw === "string") return new Para({}, [makeRun(raw)]);
    if (!raw || typeof raw !== "object") throw new TypeError("createDoc: bad paragraph");
    const runs = Array.isArray(raw.runs) ? raw.runs : [{ text: String(raw.text ?? "") }];
    return new Para(raw, runs.map((r) => makeRun(String(r?.text ?? ""), r ?? {})));
  });
  if (input.tables && !paras.some(p => p.cell)) input.tables.forEach((table, t) => table.rows.forEach((row, r) => row.forEach((cell, c) => {
    const items = createDoc(cell.p ?? [""]).p;
    paras.push(...items.map(p => new Para({...paraProps(p), cell: {table:t,row:r,col:c}}, p.runs)));
  })));
  const spellings = input.spellings && typeof input.spellings === "object"
    ? Object.freeze(Object.fromEntries(Object.entries(input.spellings)
      .filter(([word, suggestions]) => word && Array.isArray(suggestions))
      .map(([word, suggestions]) => [word.toLowerCase(), Object.freeze(suggestions.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()))])))
    : undefined;
  return freezeDoc(paras, spellings, input.page);
}

export function docToJSON(doc) {
  return JSON.stringify(doc);
}

export function docEquals(a, b) {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/* ---------- positions and ranges ---------- */

export function cmpPos(a, b) {
  return a.p - b.p || a.offset - b.offset;
}

export function clampPos(doc, pos) {
  const p = Math.max(0, Math.min(doc.p.length - 1, pos?.p | 0));
  const offset = Math.max(0, Math.min(doc.p[p].length, pos?.offset | 0));
  return { p, offset };
}

/** {from, to} in document order. */
export function orderRange(a, b) {
  return cmpPos(a, b) <= 0 ? { from: a, to: b } : { from: b, to: a };
}

export function isCollapsed(range) {
  return cmpPos(range.from, range.to) === 0;
}

export function docEnd(doc) {
  const p = doc.p.length - 1;
  return { p, offset: doc.p[p].length };
}

/** Position reached after inserting `text` at `pos` (newlines start new paragraphs). */
export function endOfInsert(pos, text) {
  const lines = String(text).split(/\r?\n/);
  if (lines.length === 1) return { p: pos.p, offset: pos.offset + lines[0].length };
  return { p: pos.p + lines.length - 1, offset: lines[lines.length - 1].length };
}

/* ---------- run splitting ---------- */

/** Runs of a paragraph cut so that `offsets` fall on run boundaries. */
function cutRuns(para, offsets) {
  const cuts = [...new Set(offsets)].sort((x, y) => x - y);
  const out = [];
  let at = 0;
  for (const r of para.runs) {
    let start = 0;
    const end = r.text.length;
    for (const c of cuts) {
      const local = c - at;
      if (local > start && local < end) {
        out.push({ run: makeRun(r.text.slice(start, local), r), start: at + start });
        start = local;
      }
    }
    out.push({ run: start === 0 ? r : makeRun(r.text.slice(start), r), start: at + start });
    at += end;
  }
  return out;
}

/** Formatting that applies at a position: the character before it, else the one after. */
export function propsAt(doc, pos) {
  const para = doc.p[pos.p];
  let at = 0;
  let prev = null;
  for (const r of para.runs) {
    const end = at + r.text.length;
    if (pos.offset > at && pos.offset <= end) return runProps(r);
    if (pos.offset <= at && !prev) return runProps(r);
    prev = r;
    at = end;
  }
  return runProps(prev ?? para.runs[0]);
}

/** Each piece of text inside a range: {p, run, start, end} with offsets relative to the paragraph. */
export function slices(doc, range) {
  const { from, to } = range;
  const out = [];
  for (let p = from.p; p <= to.p; p++) {
    const para = doc.p[p];
    const a = p === from.p ? from.offset : 0;
    const b = p === to.p ? to.offset : para.length;
    let at = 0;
    for (const r of para.runs) {
      const end = at + r.text.length;
      const s = Math.max(a, at);
      const e = Math.min(b, end);
      if (e > s) out.push({ p, run: makeRun(r.text.slice(s - at, e - at), r), start: s, end: e });
      at = end;
    }
  }
  return out;
}

function replaceParas(doc, start, count, paras) {
  const list = doc.p.slice();
  list.splice(start, count, ...paras);
  return freezeDoc(list, doc.spellings, doc.page);
}

/* ---------- pure edits ---------- */

/**
 * Apply character formatting to a range. `patch` is an object of run props, or a function
 * (run, index) => patch for per-run changes (Grow Font, Change Case...). Returns the same doc
 * when nothing changes.
 */
export function applyFormat(doc, range, patch) {
  const { from, to } = orderRange(range.from, range.to);
  if (isCollapsed({ from, to })) return doc;
  const fn = typeof patch === "function" ? patch : () => patch;
  const paras = [];
  let changed = false;
  let index = 0;
  for (let p = from.p; p <= to.p; p++) {
    const para = doc.p[p];
    const a = p === from.p ? from.offset : 0;
    const b = p === to.p ? to.offset : para.length;
    const pieces = cutRuns(para, [a, b]);
    // An empty paragraph whose mark lies inside the range takes the format too (Word formats the
    // paragraph mark, so text typed there later comes out bold).
    const emptyInside = para.length === 0 && p < to.p;
    const runs = pieces.map(({ run, start }) => {
      if (!run.text && emptyInside) {
        const next = makeRun("", { ...runProps(run), ...fn(run, index++) });
        if (!sameProps(next, run)) changed = true;
        return next;
      }
      if (start < a || start >= b || !run.text) return run;
      const next = makeRun(run.text, { ...runProps(run), ...fn(run, index++) });
      if (!sameProps(next, run) || next.text !== run.text) changed = true;
      return next;
    });
    paras.push(withRuns(para, runs));
  }
  return changed ? replaceParas(doc, from.p, paras.length, paras) : doc;
}

/** Replace the text of a range piece by piece, keeping each character's formatting where lengths allow. */
export function transformText(doc, range, fn) {
  const { from, to } = orderRange(range.from, range.to);
  if (isCollapsed({ from, to })) return doc;
  const paras = [];
  let changed = false;
  for (let p = from.p; p <= to.p; p++) {
    const para = doc.p[p];
    const a = p === from.p ? from.offset : 0;
    const b = p === to.p ? to.offset : para.length;
    const pieces = cutRuns(para, [a, b]);
    const inside = pieces.filter(({ start, run }) => start >= a && start < b && run.text);
    const before = para.text.slice(0, a);
    const original = inside.map(({ run }) => run.text).join("");
    const result = fn(original, before);
    let runs;
    if (result.length === original.length) {
      let at = 0;
      runs = pieces.map((piece) => {
        if (!inside.includes(piece)) return piece.run;
        const t = result.slice(at, at + piece.run.text.length);
        at += piece.run.text.length;
        return makeRun(t, piece.run);
      });
    } else {
      // Length changed (rare, e.g. "ß" -> "SS"): transform each run on its own.
      runs = pieces.map((piece) => (inside.includes(piece) ? makeRun(fn(piece.run.text, ""), piece.run) : piece.run));
    }
    if (result !== original) changed = true;
    paras.push(withRuns(para, runs));
  }
  return changed ? replaceParas(doc, from.p, paras.length, paras) : doc;
}

/** Apply a paragraph patch (object, or function para => patch) to paragraphs pFrom..pTo. */
export function applyParaFormat(doc, pFrom, pTo, patch) {
  const fn = typeof patch === "function" ? patch : () => patch;
  const paras = [];
  let changed = false;
  for (let p = pFrom; p <= pTo; p++) {
    const para = doc.p[p];
    const next = updatePara(para, fn(para, p));
    if (JSON.stringify(next) !== JSON.stringify(para)) changed = true;
    paras.push(next);
  }
  return changed ? replaceParas(doc, pFrom, paras.length, paras) : doc;
}

/** Insert text at a position. Newlines split paragraphs. `props` defaults to the formatting at pos. */
export function insertText(doc, pos, text, props) {
  const str = String(text ?? "");
  if (!str) return doc;
  const at = clampPos(doc, pos);
  const style = props ?? propsAt(doc, at);
  const lines = str.split(/\r?\n/);
  let next = doc;
  let cur = at;
  lines.forEach((line, i) => {
    if (i > 0) {
      next = splitParagraph(next, cur);
      cur = { p: cur.p + 1, offset: 0 };
    }
    if (!line) return;
    const para = next.p[cur.p];
    const pieces = cutRuns(para, [cur.offset]);
    const runs = [];
    let placed = false;
    for (const { run, start } of pieces) {
      if (!placed && start >= cur.offset) {
        runs.push(makeRun(line, style));
        placed = true;
      }
      runs.push(run);
    }
    if (!placed) runs.push(makeRun(line, style));
    next = replaceParas(next, cur.p, 1, [withRuns(para, runs)]);
    cur = { p: cur.p, offset: cur.offset + line.length };
  });
  return next;
}

/** Delete a range; paragraphs it spans are merged into the first one. */
export function deleteRange(doc, from, to) {
  const r = orderRange(clampPos(doc, from), clampPos(doc, to));
  if (isCollapsed(r)) return doc;
  // Cell boundaries are structural: Delete clears text across them without merging cells.
  if (r.from.p !== r.to.p && JSON.stringify(doc.p[r.from.p].cell) !== JSON.stringify(doc.p[r.to.p].cell)) {
    let next = doc;
    for (let p = r.to.p; p >= r.from.p; p--) next = deleteRange(next, {p, offset:p === r.from.p ? r.from.offset : 0}, {p, offset:p === r.to.p ? r.to.offset : next.p[p].length});
    return next;
  }
  const first = doc.p[r.from.p];
  const last = doc.p[r.to.p];
  const head = cutRuns(first, [r.from.offset])
    .filter(({ start }) => start < r.from.offset)
    .map(({ run }) => run);
  const tail = cutRuns(last, [r.to.offset])
    .filter(({ start }) => start >= r.to.offset)
    .map(({ run }) => run);
  // Keep the formatting of the deleted text so typing straight after continues in it.
  const firstDeleted = r.from.offset < first.length ? { p: r.from.p, offset: r.from.offset + 1 } : r.from;
  const keep = head.length || tail.length ? [] : [makeRun("", propsAt(doc, firstDeleted))];
  // Joining onto an empty paragraph keeps the lower paragraph's formatting (Backspace at the start
  // of a centred title under a blank line leaves the title centred, as in Word).
  const merged = withRuns(first.length === 0 && r.to.p > r.from.p ? last : first, [...head, ...tail, ...keep]);
  return replaceParas(doc, r.from.p, r.to.p - r.from.p + 1, [merged]);
}

/** Split a paragraph at a position (Enter). The new paragraph keeps the paragraph formatting. */
export function splitParagraph(doc, pos) {
  const at = clampPos(doc, pos);
  const para = doc.p[at.p];
  const pieces = cutRuns(para, [at.offset]);
  const left = pieces.filter(({ start }) => start < at.offset).map(({ run }) => run);
  const right = pieces.filter(({ start }) => start >= at.offset).map(({ run }) => run);
  const carry = makeRun("", propsAt(doc, at));
  return replaceParas(doc, at.p, 1, [withRuns(para, left.length ? left : [carry]), new Para({...paraProps(para),picture:null}, right.length ? right : [carry])]);
}

/* ---------- copy / paste fragments ---------- */

/** A copy of the content inside a range: paragraphs with their runs and paragraph props. */
export function fragment(doc, range) {
  const { from, to } = orderRange(range.from, range.to);
  const paras = [];
  for (let p = from.p; p <= to.p; p++) {
    const para = doc.p[p];
    const a = p === from.p ? from.offset : 0;
    const b = p === to.p ? to.offset : para.length;
    const runs = slices(doc, { from: { p, offset: a }, to: { p, offset: b } }).map((s) => s.run);
    paras.push({ props: paraProps(para), runs });
  }
  return Object.freeze({ paras: Object.freeze(paras), text: paras.map((x) => x.runs.map((r) => r.text).join("")).join("\n") });
}

/** Insert a fragment at a position. `plain` drops its formatting (Keep Text Only). Returns {doc, pos}. */
export function insertFragment(doc, pos, frag, { plain = false } = {}) {
  const at = clampPos(doc, pos);
  if (plain) {
    const next = insertText(doc, at, frag.text);
    return { doc: next, pos: endOfInsert(at, frag.text) };
  }
  let next = doc;
  let cur = at;
  frag.paras.forEach((fp, i) => {
    if (i > 0) {
      next = splitParagraph(next, cur);
      cur = { p: cur.p + 1, offset: 0 };
      next = replaceParas(next, cur.p, 1, [new Para(fp.props, next.p[cur.p].runs)]);
    }
    for (const run of fp.runs) {
      next = insertText(next, cur, run.text, runProps(run));
      cur = { p: cur.p, offset: cur.offset + run.text.length };
    }
  });
  return { doc: next, pos: cur };
}

/* ---------- words and counts ---------- */

const WORD_CHAR = /[\p{L}\p{N}\p{M}_'’]/u;
export function isWordChar(ch) {
  return WORD_CHAR.test(ch);
}

/** Range of the word that strictly contains `pos` (the caret is between two word characters), or null. */
export function wordAround(doc, pos) {
  const text = doc.p[pos.p].text;
  const o = pos.offset;
  if (o <= 0 || o >= text.length || !isWordChar(text[o - 1]) || !isWordChar(text[o])) return null;
  let s = o;
  let e = o;
  while (s > 0 && isWordChar(text[s - 1])) s--;
  while (e < text.length && isWordChar(text[e])) e++;
  return { from: { p: pos.p, offset: s }, to: { p: pos.p, offset: e } };
}

/** Word double-click selection: the word plus its trailing spaces, or a single other character. */
export function wordSelectionAt(doc, pos) {
  const text = doc.p[pos.p].text;
  if (!text.length) return { from: { p: pos.p, offset: 0 }, to: { p: pos.p, offset: 0 } };
  let o = Math.min(pos.offset, text.length - 1);
  if (!isWordChar(text[o]) && o > 0 && isWordChar(text[o - 1]) && /\s/.test(text[o])) o -= 1;
  let s = o;
  let e = o + 1;
  if (isWordChar(text[o])) {
    while (s > 0 && isWordChar(text[s - 1])) s--;
    while (e < text.length && isWordChar(text[e])) e++;
  } else if (/\s/.test(text[o])) {
    while (s > 0 && /\s/.test(text[s - 1])) s--;
  }
  while (e < text.length && text[e] === " ") e++;
  return { from: { p: pos.p, offset: s }, to: { p: pos.p, offset: e } };
}

export function wordCount(doc) {
  return doc.p.reduce((n, para) => n + (para.text.match(/\S+/g)?.length ?? 0), 0);
}

/* ---------- helpers for mission predicates ---------- */

/** Text of a doc (paragraphs joined by "\n"), a paragraph, or a run. */
export function textOf(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (Array.isArray(x.p)) return x.p.map((para) => textOf(para)).join("\n");
  if (Array.isArray(x.runs)) return x.runs.map((r) => r.text).join("");
  if (typeof x.text === "string") return x.text;
  return "";
}

/**
 * The run pieces covering every occurrence of `needle` in a paragraph. Each piece is a run
 * (same props) whose text is just the matched part. Returns [] when the text is not there,
 * so predicates should also check `.length` (an empty array passes `.every`).
 * Options: { ignoreCase = false, first = false }.
 */
export function runsMatching(para, needle, { ignoreCase = false, first = false } = {}) {
  if (!para || !needle) return [];
  const text = textOf(para);
  const hay = ignoreCase ? text.toLowerCase() : text;
  const key = ignoreCase ? String(needle).toLowerCase() : String(needle);
  const out = [];
  const single = Object.freeze({ p: [para instanceof Para ? para : new Para(para, para.runs ?? [])] });
  let from = hay.indexOf(key);
  while (from >= 0) {
    for (const s of slices(single, { from: { p: 0, offset: from }, to: { p: 0, offset: from + key.length } })) out.push(s.run);
    if (first) break;
    from = hay.indexOf(key, from + key.length);
  }
  return out;
}

/** The first paragraph whose text contains `needle` (or matches a RegExp), else null. */
export function paraOf(doc, needle, { ignoreCase = false } = {}) {
  if (!doc?.p) return null;
  return (
    doc.p.find((para) => {
      const t = textOf(para);
      if (needle instanceof RegExp) return needle.test(t);
      return ignoreCase ? t.toLowerCase().includes(String(needle).toLowerCase()) : t.includes(needle);
    }) ?? null
  );
}

/** Mission-owned proofing only: no browser dictionary or network lookup. */
export function spellingRanges(doc, p) {
  const text = doc.p[p]?.text ?? "";
  const out = [];
  for (const match of text.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)) {
    const suggestions = doc.spellings?.[match[0].toLowerCase()];
    if (suggestions?.length) out.push({ from: { p, offset: match.index }, to: { p, offset: match.index + match[0].length }, suggestions });
  }
  return out;
}


/** Table cells retain ordinary paragraphs, with flat positions for all text commands. */
export function insertTable(doc, at, columns, rows) {
  columns = Math.max(1, Math.min(10, columns | 0)); rows = Math.max(1, Math.min(8, rows | 0));
  if (doc.p[at.p].cell) return {doc};
  const table = doc.tables?.length ?? 0;
  const parts = [];
  for (let row=0; row<rows; row++) for (let col=0; col<columns; col++) parts.push(new Para({cell:{table,row,col}}));
  const index = at.p + 1;
  parts.push(new Para());
  const next = replaceParas(doc,index,0,parts);
  const pos = {p:index,offset:0};
  return {doc:next,sel:{anchor:pos,focus:pos}};
}

export function editTable(doc, pos, action) {
  const cell = doc.p[pos.p]?.cell;
  if (!cell) return {doc};
  const table = doc.tables[cell.table];
  const rows = table.rows.length, cols = table.rows[0].length;
  const rowAction = action === "insertBelow" || action === "deleteRow";
  const deleting = action.startsWith("delete");
  if (deleting && ((rowAction ? rows : cols) === 1 || action === "deleteTable")) {
    const paras = doc.p.filter(p => p.cell?.table !== cell.table).map(p => p.cell?.table > cell.table ? new Para({...paraProps(p),cell:{...p.cell,table:p.cell.table-1}},p.runs) : p);
    const next = freezeDoc(paras,doc.spellings,doc.page);
    const at = clampPos(next,pos); return {doc:next,sel:{anchor:at,focus:at}};
  }
  const grid = table.rows.map(row => row.map(c => c.p));
  if (rowAction) {
    if (deleting) grid.splice(cell.row,1);
    else grid.splice(cell.row+1,0,Array.from({length:cols},()=>[new Para()]));
  } else for (const row of grid) {
    if (deleting) row.splice(cell.col,1);
    else row.splice(cell.col+1,0,[new Para()]);
  }
  const parts = grid.flatMap((row,r)=>row.flatMap((ps,c)=>ps.map(p=>new Para({...paraProps(p),cell:{table:cell.table,row:r,col:c}},p.runs))));
  const start = doc.p.findIndex(p=>p.cell?.table===cell.table);
  const count = doc.p.filter(p=>p.cell?.table===cell.table).length;
  const next = replaceParas(doc,start,count,parts);
  const r = Math.min(cell.row+(action === "insertBelow" ? 1:0),grid.length-1);
  const c = Math.min(cell.col+(action === "insertRight" ? 1:0),grid[0].length-1);
  const p = next.p.findIndex(p=>p.cell?.table===cell.table && p.cell.row===r && p.cell.col===c);
  const at = {p,offset:0}; return {doc:next,sel:{anchor:at,focus:at}};
}
export function setPage(doc, patch) { return freezeDoc(doc.p,doc.spellings,{...doc.page,...patch}); }


export function insertPicture(doc,pos,id) {
  const asset=PICTURES.find(p=>p.id===id); if (!asset) return {doc};
  const picture={id,width:240,height:Math.round(240*asset.height/asset.width),wrap:"inline"};
  const index=pos.p+1;
  const next=replaceParas(doc,index,0,[new Para({picture}),new Para()]);
  const at={p:index,offset:0}; return {doc:next,sel:{anchor:at,focus:at}};
}
export function updatePicture(doc,pos,patch) {
  const para=doc.p[pos.p]; if (!para?.picture) return doc;
  return replaceParas(doc,pos.p,1,[new Para({...paraProps(para),picture:patch===null?null:{...para.picture,...patch}},para.runs)]);
}
