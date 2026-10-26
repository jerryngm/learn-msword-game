// Command registry. Every ribbon button, menu item, shortcut and QAT/status button is a command:
//   { id, tab, group, level: 'a'|'b'|'c', label, effectName: {en, vi}, scope, run, menu, popup, pressed, ... }
// Level a: real effect with Undo. Level b: a harmless popup. Level c: "works in real Word" toast.
//
// run(doc, sel, ctx) -> doc | {doc, sel}. `sel` is the resolved target {anchor, focus, from, to}:
//   scope 'chars': the selection, or the word around a collapsed caret (Word's edge case);
//   scope 'paras': whole paragraphs touched by the selection; scope 'sel': the raw selection.
// ctx = { arg, props, ui } where ui is the engine's helper surface (toast, clipboard, popups...).

import {
  ALIGNS, BULLET_GLYPHS, DEFAULT_PARA, DEFAULT_RUN, FONTS, MAX_INDENT, NUMBER_FORMATS, SIZES, UNDERLINES,
  insertPicture, updatePicture, insertTable, editTable, setPage, applyFormat, applyParaFormat, createDoc, deleteRange, fragment, insertFragment, isWordChar, paraProps, propsAt, slices, transformText,
} from "./model.js";

const registry = new Map();

/** Register or replace a command. Placeholders (auto-made level c) are replaced silently. */
export function registerCommand(def) {
  if (!def || typeof def.id !== "string" || !def.id) throw new TypeError("registerCommand: id is required");
  if (!["a", "b", "c"].includes(def.level)) throw new TypeError(`registerCommand(${def.id}): level must be a, b or c`);
  if (def.level === "a" && typeof def.run !== "function" && !def.special) throw new TypeError(`registerCommand(${def.id}): level a needs run()`);
  const prev = registry.get(def.id);
  if (prev && !prev.placeholder && !def.placeholder) console.warn(`command ${def.id} replaced`);
  if (prev && !prev.placeholder && def.placeholder) return prev;
  const [tab, group] = def.id.split(".");
  const label = def.label ?? def.id;
  registry.set(
    def.id,
    Object.freeze({
      tab: def.tab ?? tab,
      group: def.group ?? `${tab}.${group}`,
      scope: "sel",
      effectName: def.effectName ?? { en: `use ${label}`, vi: `thay đổi (${label})` },
      ...def,
      label,
    }),
  );
  return registry.get(def.id);
}

export function getCommand(id) {
  return registry.get(id) ?? null;
}

/** A level-c placeholder for a button whose real behaviour is not built yet. */
export function ensureCommand(id, label) {
  return registry.get(id) ?? registerCommand({ id, label, level: "c", placeholder: true });
}

const c = (id, label, extra = {}) => registerCommand({ id, label, level: "c", ...extra });

/* ---------- small helpers ---------- */

const toggleKey = (key, extra = {}) => (doc, sel) => {
  const on = slices(doc, sel).every((s) => s.run[key] || !s.run.text.trim());
  const allOn = on && slices(doc, sel).some((s) => s.run[key]);
  return applyFormat(doc, sel, { [key]: !allOn, ...(allOn ? {} : extra) });
};
const pendingToggle = (key, extra = {}) => (props) => ({ [key]: !props[key], ...(props[key] ? {} : extra) });

function stepSize(cur, dir) {
  if (dir > 0) return SIZES.find((s) => s > cur) ?? Math.min(1638, Math.floor(cur / 10) * 10 + 10);
  for (let i = SIZES.length - 1; i >= 0; i--) if (SIZES[i] < cur) return SIZES[i];
  return Math.max(1, cur - 1);
}

const CASES = {
  sentence: (t, before) => {
    let start = !/\S/.test(before) || /[.!?]\s*$/.test(before);
    let out = "";
    for (const ch of t.toLowerCase()) {
      if (start && isWordChar(ch)) { out += ch.toUpperCase(); start = false; }
      else { out += ch; if (/[.!?]/.test(ch)) start = true; }
    }
    return out;
  },
  lower: (t) => t.toLowerCase(),
  upper: (t) => t.toUpperCase(),
  title: (t, before) => {
    let start = !before || /\s$/.test(before);
    let out = "";
    for (const ch of t.toLowerCase()) {
      out += start && isWordChar(ch) ? ch.toUpperCase() : ch;
      start = /\s/.test(ch);
    }
    return out;
  },
  toggle: (t) => Array.from(t).map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())).join(""),
};

const alignCmd = (align, label, key, effectName) =>
  registerCommand({
    id: `home.paragraph.align${align[0].toUpperCase()}${align.slice(1)}`,
    label,
    key,
    level: "a",
    scope: "paras",
    effectName,
    pressed: (s) => s.align === align,
    run: (doc, sel) => {
      const all = doc.p.slice(sel.from.p, sel.to.p + 1).every((p) => p.align === align);
      return applyParaFormat(doc, sel.from.p, sel.to.p, { align: all && align !== "left" ? "left" : align });
    },
  });

function listCmd(type, formats) {
  return (doc, sel, ctx) => {
    const arg = ctx.arg;
    const paras = doc.p.slice(sel.from.p, sel.to.p + 1);
    if (arg === "none") return applyParaFormat(doc, sel.from.p, sel.to.p, { list: null });
    const format = formats.includes(arg) ? arg : (ctx.ui.lastList(type) ?? formats[0]);
    if (formats.includes(arg)) ctx.ui.lastList(type, arg);
    const all = paras.every((p) => p.list?.type === type && (arg === undefined || p.list.format === format));
    return applyParaFormat(doc, sel.from.p, sel.to.p, { list: all && arg === undefined ? null : { type, format } });
  };
}

/* ---------- theme colours (Office 2023+ theme) ---------- */

export const THEME_BASE = ["#FFFFFF", "#000000", "#E8E8E8", "#0E2841", "#156082", "#E97132", "#196B24", "#0F9ED5", "#A02B93", "#4EA72E"];
export const STANDARD_COLOURS = ["#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050", "#00B050", "#00B0F0", "#0070C0", "#002060", "#7030A0"];
export const HIGHLIGHTS = [
  ["#FFFF00", "Yellow"], ["#00FF00", "Bright Green"], ["#00FFFF", "Turquoise"], ["#FF00FF", "Pink"], ["#0000FF", "Blue"],
  ["#FF0000", "Red"], ["#000080", "Dark Blue"], ["#008080", "Teal"], ["#008000", "Green"], ["#800080", "Violet"],
  ["#800000", "Dark Red"], ["#808000", "Dark Yellow"], ["#808080", "Gray 50%"], ["#C0C0C0", "Gray 25%"], ["#000000", "Black"],
];

function mix(hex, target, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (target - v) * amount));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
/** 6 rows x 10 columns: the theme colours, then their tints and shades, like Word's palette. */
export function themeGrid() {
  return THEME_BASE.map((base, i) => {
    if (i === 0) return [base, mix(base, 0, 0.05), mix(base, 0, 0.15), mix(base, 0, 0.25), mix(base, 0, 0.35), mix(base, 0, 0.5)];
    if (i === 1) return [base, mix(base, 255, 0.5), mix(base, 255, 0.35), mix(base, 255, 0.25), mix(base, 255, 0.15), mix(base, 255, 0.05)];
    return [base, mix(base, 255, 0.8), mix(base, 255, 0.6), mix(base, 255, 0.4), mix(base, 0, 0.25), mix(base, 0, 0.5)];
  });
}

/* ---------- effect names (plain words first, then Word's name) ---------- */

const E = {
  bold: { en: "thick and dark (Bold)", vi: "in đậm (Bold)" },
  italic: { en: "leaning (Italic)", vi: "in nghiêng (Italic)" },
  underline: { en: "underlined (Underline)", vi: "có gạch chân (Underline)" },
  strike: { en: "crossed out (Strikethrough)", vi: "bị gạch ngang (Strikethrough)" },
  sub: { en: "small and low (Subscript)", vi: "nhỏ và thấp xuống (Subscript)" },
  sup: { en: "small and high (Superscript)", vi: "nhỏ và nhô lên (Superscript)" },
  font: { en: "a different shape (Font)", vi: "đổi kiểu (Font)" },
  size: { en: "a different size (Font Size)", vi: "đổi cỡ (Font Size)" },
  grow: { en: "bigger (Increase Font Size)", vi: "to hơn (Increase Font Size)" },
  shrink: { en: "smaller (Decrease Font Size)", vi: "nhỏ hơn (Decrease Font Size)" },
  case: { en: "use different capital letters (Change Case)", vi: "đổi hoa, thường (Change Case)" },
  clear: { en: "plain again (Clear All Formatting)", vi: "trở lại bình thường (Clear All Formatting)" },
  effects: { en: "look special (Text Effects)", vi: "có hiệu ứng đặc biệt (Text Effects)" },
  highlight: { en: "highlighted like a marker pen (Highlight)", vi: "được tô nền như bút dạ quang (Highlight)" },
  colour: { en: "a different colour (Font Color)", vi: "đổi màu (Font Color)" },
  bullets: { en: "a list with dots (Bullets)", vi: "thành danh sách có dấu chấm (Bullets)" },
  numbering: { en: "a numbered list (Numbering)", vi: "thành danh sách đánh số (Numbering)" },
  indentInc: { en: "move to the right (Increase Indent)", vi: "dịch sang phải (Increase Indent)" },
  indentDec: { en: "move to the left (Decrease Indent)", vi: "dịch sang trái (Decrease Indent)" },
  alignLeft: { en: "line up on the left (Align Left)", vi: "canh trái (Align Left)" },
  alignCenter: { en: "sit in the middle (Center)", vi: "canh giữa (Center)" },
  alignRight: { en: "line up on the right (Align Right)", vi: "canh phải (Align Right)" },
  alignJustify: { en: "stretch edge to edge (Justify)", vi: "canh đều hai bên (Justify)" },
  spacing: { en: "spread out differently (Line Spacing)", vi: "đổi khoảng cách dòng (Line Spacing)" },
  shading: { en: "sit on a coloured box (Shading)", vi: "có nền màu (Shading)" },
  borders: { en: "have a line around them (Borders)", vi: "có đường viền (Borders)" },
  sort: { en: "change order (Sort)", vi: "đổi thứ tự (Sort)" },
  paste: { en: "appear (Paste)", vi: "xuất hiện (Paste)" },
  cut: { en: "disappear (Cut)", vi: "biến mất (Cut)" },
  copy: { en: "copied (Copy)", vi: "được sao chép (Copy)" },
  painter: { en: "copy another look (Format Painter)", vi: "mang kiểu của chữ khác (Format Painter)" },
  marks: { en: "show hidden marks (Show/Hide)", vi: "hiện các dấu ẩn (Show/Hide)" },
  selectAll: { en: "all selected (Select All)", vi: "được bôi đen hết (Select All)" },
  typing: { en: "change (typing)", vi: "thay đổi (gõ chữ)" },
  undo: { en: "go back (Undo)", vi: "trở lại như trước (Undo)" },
  redo: { en: "come back (Redo)", vi: "hiện lại (Redo)" },
  zoom: { en: "look bigger or smaller (Zoom)", vi: "to hơn hoặc nhỏ hơn (Zoom)" },
};
export const EFFECT_NAMES = E;

/* ================= Home: Clipboard ================= */

registerCommand({
  id: "home.clipboard.paste",
  label: "Paste",
  level: "a",
  scope: "sel",
  effectName: E.paste,
  disabled: (s) => !s.clip,
  run(doc, sel, ctx) {
    const clip = ctx.ui.clipboard();
    if (!clip) {
      ctx.ui.toast("copyFirst");
      return doc;
    }
    const base = deleteRange(doc, sel.from, sel.to);
    const res = insertFragment(base, sel.from, clip, { plain: ctx.arg === "plain" });
    return { doc: res.doc, sel: { anchor: res.pos, focus: res.pos } };
  },
  menu: (ctx) => [
    { heading: "Paste Options:" },
    { icons: [
      { cmd: "home.clipboard.paste", arg: "keep", icon: "clipboard_paste_20", label: "Keep Source Formatting (K)", disabled: !ctx.ui.clipboard() },
      { cmd: "home.clipboard.paste", arg: "plain", icon: "clipboard_paste_20", label: "Keep Text Only (T)", textOnly: true, disabled: !ctx.ui.clipboard() },
    ] },
    { sep: true },
    { cmd: "home.clipboard.pasteSpecial", label: "Paste Special..." },
    { cmd: "home.clipboard.setDefault", label: "Set Default Paste..." },
  ],
});
c("home.clipboard.pasteSpecial", "Paste Special...");
c("home.clipboard.setDefault", "Set Default Paste...");

registerCommand({
  id: "home.clipboard.cut",
  label: "Cut",
  key: "Ctrl+X",
  level: "a",
  scope: "sel",
  effectName: E.cut,
  disabled: (s) => s.collapsed,
  run(doc, sel, ctx) {
    if (sel.collapsed) {
      ctx.ui.toast("selectFirst");
      return doc;
    }
    ctx.ui.setClipboard(fragment(doc, sel));
    return { doc: deleteRange(doc, sel.from, sel.to), sel: { anchor: sel.from, focus: sel.from } };
  },
});
registerCommand({
  id: "home.clipboard.copy",
  label: "Copy",
  key: "Ctrl+C",
  level: "a",
  scope: "sel",
  effectName: E.copy,
  disabled: (s) => s.collapsed,
  run(doc, sel, ctx) {
    if (sel.collapsed) {
      ctx.ui.toast("selectFirst");
      return doc;
    }
    ctx.ui.setClipboard(fragment(doc, sel));
    if (ctx.origin !== "key") ctx.ui.toast("copied", { ok: true });
    return doc;
  },
});
registerCommand({
  id: "home.clipboard.painter",
  label: "Format Painter",
  key: "Ctrl+Shift+C",
  level: "a",
  scope: "sel",
  effectName: E.painter,
  pressed: (s) => s.painter,
  run(doc, sel, ctx) {
    if (ctx.ui.painterActive()) ctx.ui.stopPainter();
    else ctx.ui.startPainter(propsAt(doc, sel.collapsed ? sel.from : { p: sel.from.p, offset: sel.from.offset + 1 }));
    return doc;
  },
});
registerCommand({ id: "home.clipboard.dialog", label: "Clipboard", level: "b", popup: (ctx) => ctx.ui.dialog("clipboard") });

/* ================= Home: Font ================= */

registerCommand({
  id: "home.font.name",
  label: "Font",
  key: "Ctrl+Shift+F",
  level: "a",
  scope: "chars",
  effectName: E.font,
  run: (doc, sel, ctx) => (FONTS.includes(ctx.arg) ? applyFormat(doc, sel, { font: ctx.arg }) : doc),
  pending: (props, ctx) => (FONTS.includes(ctx.arg) ? { font: ctx.arg } : null),
  menu: (ctx) => [
    { heading: "Theme Fonts" },
    { cmd: "home.font.name", arg: "Aptos Display", label: "Aptos Display", hint: "(Headings)", font: "Aptos Display", checked: ctx.state.props.font === "Aptos Display" },
    { cmd: "home.font.name", arg: "Aptos", label: "Aptos", hint: "(Body)", font: "Aptos", checked: ctx.state.props.font === "Aptos" },
    { heading: "All Fonts" },
    ...FONTS.filter((f) => !f.startsWith("Aptos")).map((f) => ({ cmd: "home.font.name", arg: f, label: f, font: f, checked: ctx.state.props.font === f })),
  ],
});
registerCommand({
  id: "home.font.size",
  label: "Font Size",
  key: "Ctrl+Shift+P",
  level: "a",
  scope: "chars",
  effectName: E.size,
  run: (doc, sel, ctx) => {
    const size = Number(ctx.arg);
    return Number.isFinite(size) && size >= 1 && size <= 1638 ? applyFormat(doc, sel, { size }) : doc;
  },
  pending: (props, ctx) => (Number(ctx.arg) >= 1 && Number(ctx.arg) <= 1638 ? { size: Number(ctx.arg) } : null),
  menu: (ctx) => SIZES.map((n) => ({ cmd: "home.font.size", arg: n, label: String(n), checked: ctx.state.props.size === n })),
});
registerCommand({
  id: "home.font.grow",
  label: "Increase Font Size",
  key: "Ctrl+>",
  level: "a",
  scope: "chars",
  effectName: E.grow,
  run: (doc, sel) => applyFormat(doc, sel, (r) => ({ size: stepSize(r.size, 1) })),
  pending: (props) => ({ size: stepSize(props.size, 1) }),
});
registerCommand({
  id: "home.font.shrink",
  label: "Decrease Font Size",
  key: "Ctrl+<",
  level: "a",
  scope: "chars",
  effectName: E.shrink,
  run: (doc, sel) => applyFormat(doc, sel, (r) => ({ size: stepSize(r.size, -1) })),
  pending: (props) => ({ size: stepSize(props.size, -1) }),
});
registerCommand({
  id: "home.font.case",
  label: "Change Case",
  level: "a",
  scope: "chars",
  menuOnly: true,
  effectName: E.case,
  run: (doc, sel, ctx) => (CASES[ctx.arg] ? transformText(doc, sel, CASES[ctx.arg]) : doc),
  menu: () => [
    { cmd: "home.font.case", arg: "sentence", label: "Sentence case." },
    { cmd: "home.font.case", arg: "lower", label: "lowercase" },
    { cmd: "home.font.case", arg: "upper", label: "UPPERCASE" },
    { cmd: "home.font.case", arg: "title", label: "Capitalize Each Word" },
    { cmd: "home.font.case", arg: "toggle", label: "tOGGLE cASE" },
  ],
});
registerCommand({
  id: "home.font.clear",
  label: "Clear All Formatting",
  level: "a",
  scope: "sel",
  effectName: E.clear,
  run(doc, sel) {
    const from = sel.collapsed ? { p: sel.from.p, offset: 0 } : sel.from;
    const to = sel.collapsed ? { p: sel.to.p, offset: doc.p[sel.to.p].length } : sel.to;
    let next = applyFormat(doc, { from, to }, () => ({ ...DEFAULT_RUN }));
    next = applyParaFormat(next, from.p, to.p, () => ({ ...paraProps(DEFAULT_PARA) }));
    return next;
  },
});
registerCommand({
  id: "home.font.bold",
  label: "Bold",
  key: "Ctrl+B",
  level: "a",
  scope: "chars",
  effectName: E.bold,
  pressed: (s) => s.props.b === true,
  run: toggleKey("b"),
  pending: pendingToggle("b"),
});
registerCommand({
  id: "home.font.italic",
  label: "Italic",
  key: "Ctrl+I",
  level: "a",
  scope: "chars",
  effectName: E.italic,
  pressed: (s) => s.props.i === true,
  run: toggleKey("i"),
  pending: pendingToggle("i"),
});
registerCommand({
  id: "home.font.underline",
  label: "Underline",
  key: "Ctrl+U",
  level: "a",
  scope: "chars",
  effectName: E.underline,
  pressed: (s) => Boolean(s.props.u),
  run: (doc, sel, ctx) => {
    if (UNDERLINES.includes(ctx.arg)) return applyFormat(doc, sel, { u: ctx.arg });
    const all = slices(doc, sel).every((x) => x.run.u || !x.run.text.trim()) && slices(doc, sel).some((x) => x.run.u);
    return applyFormat(doc, sel, { u: all ? false : "single" });
  },
  pending: (props, ctx) => ({ u: UNDERLINES.includes(ctx.arg) ? ctx.arg : props.u ? false : "single" }),
  menu: () => [
    ...UNDERLINES.map((u) => ({ cmd: "home.font.underline", arg: u, label: u === "single" ? "Underline" : `${u[0].toUpperCase()}${u.slice(1)} underline`, underline: u })),
    { sep: true },
    { cmd: "home.font.moreUnderlines", label: "More Underlines..." },
    { cmd: "home.font.underlineColor", label: "Underline Color", submenu: true },
  ],
});
c("home.font.moreUnderlines", "More Underlines...");
c("home.font.underlineColor", "Underline Color");
registerCommand({
  id: "home.font.strike",
  label: "Strikethrough",
  level: "a",
  scope: "chars",
  effectName: E.strike,
  pressed: (s) => s.props.strike === true,
  run: toggleKey("strike"),
  pending: pendingToggle("strike"),
});
registerCommand({
  id: "home.font.sub",
  label: "Subscript",
  key: "Ctrl+=",
  level: "a",
  scope: "chars",
  effectName: E.sub,
  pressed: (s) => s.props.sub === true,
  run: toggleKey("sub", { sup: false }),
  pending: pendingToggle("sub", { sup: false }),
});
registerCommand({
  id: "home.font.sup",
  label: "Superscript",
  key: "Ctrl+Shift++",
  level: "a",
  scope: "chars",
  effectName: E.sup,
  pressed: (s) => s.props.sup === true,
  run: toggleKey("sup", { sub: false }),
  pending: pendingToggle("sup", { sub: false }),
});
registerCommand({
  id: "home.font.effects",
  label: "Text Effects and Typography",
  level: "a",
  scope: "chars",
  menuOnly: true,
  effectName: E.effects,
  run: (doc, sel, ctx) => applyFormat(doc, sel, { effect: ctx.arg === "none" ? null : ctx.arg }),
  menu: () => [
    { cmd: "home.font.effects", arg: "outline", label: "Outline", effect: "outline" },
    { cmd: "home.font.effects", arg: "shadow", label: "Shadow", effect: "shadow" },
    { cmd: "home.font.effects", arg: "glow", label: "Glow", effect: "glow" },
    { sep: true },
    { cmd: "home.font.effects", arg: "none", label: "No Effect" },
  ],
});
registerCommand({
  id: "home.font.highlight",
  label: "Text Highlight Color",
  level: "a",
  scope: "chars",
  effectName: E.highlight,
  run(doc, sel, ctx) {
    if (ctx.arg === "none") return applyFormat(doc, sel, { highlight: null });
    if (ctx.arg) ctx.ui.lastColour("highlight", ctx.arg);
    return applyFormat(doc, sel, { highlight: ctx.ui.lastColour("highlight") });
  },
  menu: () => [
    { palette: HIGHLIGHTS.map(([hex, name]) => ({ hex, name })), cmd: "home.font.highlight", cols: 5 },
    { sep: true },
    { cmd: "home.font.highlight", arg: "none", label: "No Color" },
    { cmd: "home.font.stopHighlighting", label: "Stop Highlighting" },
  ],
});
c("home.font.stopHighlighting", "Stop Highlighting");
registerCommand({
  id: "home.font.colour",
  label: "Font Color",
  level: "a",
  scope: "chars",
  effectName: E.colour,
  run(doc, sel, ctx) {
    if (ctx.arg === "auto") return applyFormat(doc, sel, { colour: null });
    if (ctx.arg) ctx.ui.lastColour("font", ctx.arg);
    return applyFormat(doc, sel, { colour: ctx.ui.lastColour("font") });
  },
  pending: (props, ctx) => ({ colour: ctx.arg === "auto" ? null : ctx.arg || ctx.ui.lastColour("font") }),
  menu: () => colourMenu("home.font.colour", "Automatic", "auto"),
});
c("home.font.moreColours", "More Colors...");
c("home.font.gradient", "Gradient");
registerCommand({ id: "home.font.dialog", label: "Font...", key: "Ctrl+D", level: "b", popup: (ctx) => ctx.ui.dialog("font") });

function colourMenu(cmd, autoLabel, autoArg) {
  const grid = themeGrid();
  return [
    { cmd, arg: autoArg, label: autoLabel, swatch: autoArg === "auto" ? "#000000" : null },
    { heading: "Theme Colors" },
    { palette: grid[0].map((_, row) => grid.map((col) => ({ hex: col[row] }))).flat(), cmd, cols: 10, firstRowGap: true },
    { heading: "Standard Colors" },
    { palette: STANDARD_COLOURS.map((hex) => ({ hex })), cmd, cols: 10 },
    { sep: true },
    { cmd: "home.font.moreColours", label: "More Colors..." },
    ...(cmd === "home.font.colour" ? [{ cmd: "home.font.gradient", label: "Gradient", submenu: true }] : []),
  ];
}

/* ================= Home: Paragraph ================= */

registerCommand({
  id: "home.paragraph.bullets",
  label: "Bullets",
  level: "a",
  scope: "paras",
  effectName: E.bullets,
  pressed: (s) => s.list === "bullet",
  run: listCmd("bullet", BULLET_GLYPHS),
  menu: () => [
    { heading: "Bullet Library" },
    { tiles: [{ cmd: "home.paragraph.bullets", arg: "none", text: "None" }, ...BULLET_GLYPHS.map((g) => ({ cmd: "home.paragraph.bullets", arg: g, text: g, big: true }))] },
    { sep: true },
    { cmd: "home.paragraph.listLevel", label: "Change List Level", submenu: true },
    { cmd: "home.paragraph.defineBullet", label: "Define New Bullet..." },
  ],
});
registerCommand({
  id: "home.paragraph.numbering",
  label: "Numbering",
  level: "a",
  scope: "paras",
  effectName: E.numbering,
  pressed: (s) => s.list === "number",
  run: listCmd("number", NUMBER_FORMATS),
  menu: () => [
    { heading: "Numbering Library" },
    { tiles: [{ cmd: "home.paragraph.numbering", arg: "none", text: "None" }, ...NUMBER_FORMATS.map((f) => ({ cmd: "home.paragraph.numbering", arg: f, numbers: f }))] },
    { sep: true },
    { cmd: "home.paragraph.listLevel", label: "Change List Level", submenu: true },
    { cmd: "home.paragraph.defineNumber", label: "Define New Number Format..." },
    { cmd: "home.paragraph.setNumber", label: "Set Numbering Value..." },
  ],
});
c("home.paragraph.listLevel", "Change List Level");
c("home.paragraph.defineBullet", "Define New Bullet...");
c("home.paragraph.defineNumber", "Define New Number Format...");
c("home.paragraph.setNumber", "Set Numbering Value...");
c("home.paragraph.multilevel", "Multilevel List", { menuOnly: true });
registerCommand({
  id: "home.paragraph.indentDec",
  label: "Decrease Indent",
  key: "Ctrl+Shift+M",
  level: "a",
  scope: "paras",
  effectName: E.indentDec,
  run: (doc, sel) => applyParaFormat(doc, sel.from.p, sel.to.p, (p) => ({ indent: { left: Math.max(0, Math.round((p.indent.left - 0.5) * 2) / 2) } })),
});
registerCommand({
  id: "home.paragraph.indentInc",
  label: "Increase Indent",
  key: "Ctrl+M",
  level: "a",
  scope: "paras",
  effectName: E.indentInc,
  run: (doc, sel) => applyParaFormat(doc, sel.from.p, sel.to.p, (p) => ({ indent: { left: Math.min(MAX_INDENT, Math.floor(p.indent.left * 2 + 1) / 2) } })),
});
registerCommand({
  id: "home.paragraph.sort",
  label: "Sort",
  level: "a",
  scope: "sel",
  effectName: E.sort,
  prompt: (ctx) => ctx.ui.dialog("sort"),
  run(doc, sel, ctx) {
    const desc = ctx.arg === "desc";
    let a = sel.from.p;
    let b = sel.to.p;
    if (a === b) { a = 0; b = doc.p.length - 1; }
    const part = doc.p.slice(a, b + 1);
    const sorted = part.slice().sort((x, y) => (desc ? -1 : 1) * x.text.localeCompare(y.text, undefined, { sensitivity: "base", numeric: true }));
    if (sorted.every((p, i) => p === part[i])) return doc;
    const list = doc.p.slice();
    list.splice(a, sorted.length, ...sorted);
    return createDoc({ p: list, spellings: doc.spellings });
  },
});
registerCommand({
  id: "home.paragraph.marks",
  label: "Show/Hide ¶",
  key: "Ctrl+*",
  level: "a",
  scope: "sel",
  effectName: E.marks,
  pressed: (s) => s.marks,
  run: (doc, sel, ctx) => {
    ctx.ui.toggleMarks();
    return doc;
  },
});
alignCmd("left", "Align Left", "Ctrl+L", E.alignLeft);
alignCmd("center", "Center", "Ctrl+E", E.alignCenter);
alignCmd("right", "Align Right", "Ctrl+R", E.alignRight);
alignCmd("justify", "Justify", "Ctrl+J", E.alignJustify);
void ALIGNS;

const LINE_STEPS = [1, 1.15, 1.5, 2, 2.5, 3];
registerCommand({
  id: "home.paragraph.spacing",
  label: "Line and Paragraph Spacing",
  level: "a",
  scope: "paras",
  menuOnly: true,
  effectName: E.spacing,
  run(doc, sel, ctx) {
    const arg = ctx.arg;
    const range = [sel.from.p, sel.to.p];
    if (typeof arg === "number" || LINE_STEPS.includes(Number(arg))) return applyParaFormat(doc, ...range, { spacing: { line: Number(arg) } });
    if (arg === "addBefore") return applyParaFormat(doc, ...range, { spacing: { before: 12 } });
    if (arg === "removeBefore") return applyParaFormat(doc, ...range, { spacing: { before: 0 } });
    if (arg === "addAfter") return applyParaFormat(doc, ...range, { spacing: { after: 12 } });
    if (arg === "removeAfter") return applyParaFormat(doc, ...range, { spacing: { after: 0 } });
    return doc;
  },
  menu: (ctx) => {
    const s = ctx.state;
    return [
      ...LINE_STEPS.map((v) => ({ cmd: "home.paragraph.spacing", arg: v, label: v === 1 ? "1.0" : String(v), checked: s.line === v })),
      { sep: true },
      { cmd: "home.paragraph.dialog", label: "Line Spacing Options..." },
      { sep: true },
      s.before > 0
        ? { cmd: "home.paragraph.spacing", arg: "removeBefore", label: "Remove Space Before Paragraph", icon: "text_line_spacing_20" }
        : { cmd: "home.paragraph.spacing", arg: "addBefore", label: "Add Space Before Paragraph", icon: "text_line_spacing_20" },
      s.after > 0
        ? { cmd: "home.paragraph.spacing", arg: "removeAfter", label: "Remove Space After Paragraph", icon: "text_line_spacing_20" }
        : { cmd: "home.paragraph.spacing", arg: "addAfter", label: "Add Space After Paragraph", icon: "text_line_spacing_20" },
    ];
  },
});
registerCommand({
  id: "home.paragraph.shading",
  label: "Shading",
  level: "a",
  scope: "paras",
  effectName: E.shading,
  run(doc, sel, ctx) {
    if (ctx.arg === "none") return applyParaFormat(doc, sel.from.p, sel.to.p, { shading: null });
    if (ctx.arg) ctx.ui.lastColour("shading", ctx.arg);
    const hex = ctx.ui.lastColour("shading");
    if (!hex) {
      ctx.ui.openMenuFor("home.paragraph.shading");
      return doc;
    }
    return applyParaFormat(doc, sel.from.p, sel.to.p, { shading: hex });
  },
  menu: () => colourMenu("home.paragraph.shading", "No Color", "none"),
});
const BORDER_OPTIONS = [
  ["bottom", "Bottom Border"], ["top", "Top Border"], ["left", "Left Border"], ["right", "Right Border"],
  ["none", "No Border"], ["all", "All Borders"], ["outside", "Outside Borders"],
];
registerCommand({
  id: "home.paragraph.borders",
  label: "Borders",
  level: "a",
  scope: "paras",
  effectName: E.borders,
  run(doc, sel, ctx) {
    const arg = ctx.arg ?? ctx.ui.lastBorder();
    if (ctx.arg) ctx.ui.lastBorder(ctx.arg);
    return applyParaFormat(doc, sel.from.p, sel.to.p, (p) => {
      if (arg === "none") return { borders: [] };
      if (arg === "all" || arg === "outside") return { borders: ["top", "bottom", "left", "right"] };
      const has = p.borders.includes(arg);
      return { borders: has ? p.borders.filter((x) => x !== arg) : [...p.borders, arg] };
    });
  },
  menu: () => [
    ...BORDER_OPTIONS.map(([arg, label]) => ({ cmd: "home.paragraph.borders", arg, label, icon: arg === "none" ? "border_bottom_20" : "border_all_20" })),
    { sep: true },
    { cmd: "home.paragraph.bordersShading", label: "Borders and Shading..." },
  ],
});
c("home.paragraph.bordersShading", "Borders and Shading...");
registerCommand({ id: "home.paragraph.dialog", label: "Paragraph...", level: "b", popup: (ctx) => ctx.ui.dialog("paragraph") });

/* ================= Home: Styles (level b) ================= */

export const STYLE_TILES = [
  { name: "Normal", font: "Aptos", size: 12, colour: "#000000" },
  { name: "No Spacing", font: "Aptos", size: 12, colour: "#000000" },
  { name: "Heading 1", font: "Aptos Display", size: 20, colour: "#0F4761", short: "Heading" },
  { name: "Heading 2", font: "Aptos Display", size: 16, colour: "#0F4761" },
  { name: "Title", font: "Aptos Display", size: 28, colour: "#000000" },
  { name: "Subtitle", font: "Aptos", size: 14, colour: "#595959" },
  { name: "Subtle Emphasis", font: "Aptos", size: 12, colour: "#404040", italic: true },
  { name: "Emphasis", font: "Aptos", size: 12, colour: "#000000", italic: true },
  { name: "Intense Emphasis", font: "Aptos", size: 12, colour: "#0F4761", italic: true },
  { name: "Strong", font: "Aptos", size: 12, colour: "#000000", bold: true },
  { name: "Quote", font: "Aptos", size: 12, colour: "#404040", italic: true },
  { name: "List Paragraph", font: "Aptos", size: 12, colour: "#000000" },
];
registerCommand({ id: "home.styles.apply", label: "Styles", level: "b", popup: (ctx) => ctx.ui.note("stylesLater", ctx.anchor) });
registerCommand({ id: "home.styles.more", label: "More", level: "b", popup: (ctx) => ctx.ui.dialog("styles", ctx.anchor) });
registerCommand({ id: "home.styles.pane", label: "Styles", level: "b", popup: (ctx) => ctx.ui.dialog("stylesPane") });

/* ================= Home: Editing, Voice and the rest ================= */

registerCommand({ id: "home.editing.find", label: "Find", key: "Ctrl+F", level: "b", popup: (ctx) => ctx.ui.dialog("find"), menu: () => [
  { cmd: "home.editing.find", label: "Find", icon: "search_20" },
  { cmd: "home.editing.advancedFind", label: "Advanced Find..." },
  { cmd: "home.editing.goTo", label: "Go To...", icon: "arrow_forward_20" },
] });
c("home.editing.advancedFind", "Advanced Find...");
c("home.editing.goTo", "Go To...");
registerCommand({ id: "home.editing.replace", label: "Replace", key: "Ctrl+H", level: "b", popup: (ctx) => ctx.ui.dialog("replace") });
registerCommand({
  id: "home.editing.selectAll",
  label: "Select All",
  key: "Ctrl+A",
  level: "a",
  scope: "sel",
  effectName: E.selectAll,
  run: (doc, sel, ctx) => {
    ctx.ui.selectAll();
    return doc;
  },
});
registerCommand({ id: "home.editing.select", label: "Select", level: "b", menuOnly: true, menu: () => [
  { cmd: "home.editing.selectAll", label: "Select All", icon: "cursor_20" },
  { cmd: "home.editing.selectObjects", label: "Select Objects", icon: "cursor_click_20" },
  { cmd: "home.editing.selectSimilar", label: "Select All Text With Similar Formatting (No Data)" },
  { cmd: "home.editing.selectionPane", label: "Selection Pane...", icon: "layer_24" },
] });
c("home.editing.selectObjects", "Select Objects");
c("home.editing.selectSimilar", "Select All Text With Similar Formatting");
c("home.editing.selectionPane", "Selection Pane...");
registerCommand({ id: "home.editing.menu", label: "Editing", level: "b", menuOnly: true, menu: () => [
  { cmd: "home.editing.find", label: "Find", icon: "search_20" },
  { cmd: "home.editing.replace", label: "Replace", icon: "arrow_swap_20" },
  { cmd: "home.editing.selectAll", label: "Select All", icon: "cursor_20" },
] });
c("home.voice.dictate", "Dictate");
c("home.sensitivity.sensitivity", "Sensitivity");
c("home.addins.addins", "Add-ins");
c("home.editor.editor", "Editor");
c("home.editor.copilot", "Copilot");

/* ================= Title bar, QAT, status bar, context menu ================= */

registerCommand({ id: "qat.undo", label: "Undo", key: "Ctrl+Z", level: "a", special: "undo", effectName: E.undo, tab: "qat" });
registerCommand({ id: "qat.redo", label: "Redo", key: "Ctrl+Y", level: "a", special: "redo", effectName: E.redo, tab: "qat" });
registerCommand({ id: "qat.undoList", label: "Undo", level: "b", tab: "qat", popup: (ctx) => ctx.ui.undoList(ctx.anchor) });
registerCommand({ id: "qat.autosave", label: "AutoSave", level: "b", tab: "qat", popup: (ctx) => ctx.ui.dialog("autosave", ctx.anchor) });
registerCommand({ id: "qat.save", label: "Save", key: "Ctrl+S", level: "b", tab: "qat", popup: (ctx) => ctx.ui.backstage("save") });
registerCommand({ id: "file.saveas", label: "Save As", key: "F12", level: "b", tab: "file", popup: (ctx) => ctx.ui.backstage("saveas") });
registerCommand({ id: "qat.customize", label: "Customize Quick Access Toolbar", level: "b", tab: "qat", menuOnly: true, menu: () => [
  { heading: "Customize Quick Access Toolbar" },
  ...["AutoSave", "New", "Open", "Save", "Email", "Quick Print", "Print Preview and Print", "Read Aloud", "Spelling & Grammar", "Undo", "Redo", "Draw Table", "Touch/Mouse Mode"].map((l) => ({
    cmd: "qat.customizeItem", label: l, checked: ["AutoSave", "Save", "Undo", "Redo"].includes(l),
  })),
  { sep: true },
  { cmd: "qat.customizeItem", label: "More Commands..." },
  { cmd: "qat.customizeItem", label: "Show Below the Ribbon" },
] });
c("qat.customizeItem", "Customize Quick Access Toolbar", { tab: "qat" });
c("title.search", "Search", { tab: "title" });
c("title.account", "Account", { tab: "title" });
c("title.minimize", "Minimize", { tab: "title" });
c("title.restore", "Restore Down", { tab: "title" });
c("title.close", "Close", { tab: "title" });
c("title.comments", "Comments", { tab: "title" });
c("title.share", "Share", { tab: "title" });
c("title.editingMode", "Editing", { tab: "title", menuOnly: true });
c("title.ribbonOptions", "Ribbon Display Options", { tab: "title" });
c("file.open", "File", { tab: "file" });
c("file.new.blank", "Blank document", { tab: "file" });
c("file.print", "Print", { tab: "file" });
c("file.openDocument", "Open", { tab: "file" });
c("file.close", "Close", { tab: "file" });
// Ctrl+K target. A placeholder, so a later phase can register the real Link command over it.
ensureCommand("insert.links.link", "Link");

registerCommand({ id: "status.words", label: "Word Count", level: "b", tab: "status", popup: (ctx) => ctx.ui.dialog("wordcount") });
c("status.page", "Page Number in Document", { tab: "status" });
c("status.proofing", "Proofing", { tab: "status" });
c("status.accessibility", "Accessibility Checker", { tab: "status" });
c("status.focus", "Focus", { tab: "status" });
c("status.readMode", "Read Mode", { tab: "status" });
registerCommand({ id: "status.printLayout", label: "Print Layout", level: "a", scope: "sel", tab: "status", pressed: () => true, run: (doc) => doc });
c("status.webLayout", "Web Layout", { tab: "status" });
const zoomCmd = (id, label, fn) =>
  registerCommand({ id, label, level: "a", scope: "sel", tab: "status", effectName: E.zoom, run: (doc, sel, ctx) => { ctx.ui.setZoom(fn(ctx.ui.zoom(), ctx.arg)); return doc; } });
zoomCmd("status.zoomOut", "Zoom Out", (z) => Math.ceil(z / 10) * 10 - 10);
zoomCmd("status.zoomIn", "Zoom In", (z) => Math.floor(z / 10) * 10 + 10);
zoomCmd("status.zoom", "Zoom", (z, arg) => Number(arg) || z);
registerCommand({ id: "status.zoomMenu", label: "Zoom...", level: "b", tab: "status", menuOnly: true, menu: (ctx) => [
  ...[200, 150, 125, 100, 75, 50].map((z) => ({ cmd: "status.zoom", arg: z, label: `${z}%`, checked: ctx.ui.zoom() === z })),
] });

for (const [id, label] of [
  ["context.search", "Search the menus"], ["context.editor", "Review selection in Editor"], ["context.copyLink", "Copy Link to Location..."],
  ["context.synonyms", "Synonyms"], ["context.readAloud", "Read Aloud"], ["context.translate", "Translate"], ["context.link", "Link"],
  ["context.newComment", "New Comment"],
]) c(id, label, { tab: "context" });
registerCommand({ id: "context.styles", label: "Styles", level: "b", tab: "context", popup: (ctx) => ctx.ui.note("stylesLater", ctx.anchor) });

/* ---------- keyboard shortcuts (Windows Word) ---------- */

export const SHORTCUTS = {
  "ctrl+b": "home.font.bold",
  "ctrl+i": "home.font.italic",
  "ctrl+u": "home.font.underline",
  "ctrl+=": "home.font.sub",
  "ctrl+shift++": "home.font.sup",
  "ctrl+shift+=": "home.font.sup",
  "ctrl+shift+>": "home.font.grow",
  "ctrl+shift+.": "home.font.grow",
  "ctrl+]": "home.font.grow",
  "ctrl+shift+<": "home.font.shrink",
  "ctrl+shift+,": "home.font.shrink",
  "ctrl+[": "home.font.shrink",
  "ctrl+l": "home.paragraph.alignLeft",
  "ctrl+e": "home.paragraph.alignCenter",
  "ctrl+r": "home.paragraph.alignRight",
  "ctrl+j": "home.paragraph.alignJustify",
  "ctrl+m": "home.paragraph.indentInc",
  "ctrl+shift+m": "home.paragraph.indentDec",
  "ctrl+shift+*": "home.paragraph.marks",
  "ctrl+shift+8": "home.paragraph.marks",
  "ctrl+shift+c": "home.clipboard.painter",
  "ctrl+d": "home.font.dialog",
  "ctrl+a": "home.editing.selectAll",
  "ctrl+f": "home.editing.find",
  "ctrl+h": "home.editing.replace",
  "ctrl+z": "qat.undo",
  "ctrl+y": "qat.redo",
  "ctrl+shift+z": "qat.redo",
  "ctrl+s": "qat.save",
  "f12": "file.saveas",
};


registerCommand({id:"insert.table",label:"Table",level:"b",menu:()=>[{heading:"Insert Table"},{tableGrid:true}]});
registerCommand({id:"insert.table.create",label:"Insert Table",level:"a",run:(doc,sel,ctx)=>{
  const [columns,rows]=String(ctx.arg).split("x").map(Number); return insertTable(doc,sel.from,columns,rows);
}});
for (const [id,label] of [["insertBelow","Insert Below"],["insertRight","Insert Right"],["deleteRow","Delete Rows"],["deleteColumn","Delete Columns"],["deleteTable","Delete Table"]])
  registerCommand({id:`table.${id}`,tab:"insert",label,level:"a",run:(doc,sel)=>editTable(doc,sel.from,id)});
registerCommand({id:"table.delete",tab:"insert",label:"Delete",level:"b",menu:()=>["deleteRow","deleteColumn","deleteTable"].map(id=>({cmd:`table.${id}`,label:getCommand(`table.${id}`).label}))});
for (const [name,values] of [["orientation",[["portrait","Portrait"],["landscape","Landscape"]]],["margins",[["normal","Normal — 2.54 cm"],["narrow","Narrow — 1.27 cm"]]]]) {
  registerCommand({id:`layout.${name}`,label:name,level:"b",menu:()=>values.map(([arg,label])=>({cmd:`layout.${name}.set`,arg,label}))});
  registerCommand({id:`layout.${name}.set`,label:name,level:"a",run:(doc,sel,ctx)=>values.some(([v])=>v===ctx.arg)?setPage(doc,{[name]:ctx.arg}):doc});
}

registerCommand({id:"insert.pictures",label:"Pictures",level:"b",menu:()=>[{cmd:"insert.pictures.device",label:"This Device…"}]});
registerCommand({id:"insert.pictures.device",label:"This Device",level:"b",popup:ctx=>ctx.ui.picturePicker()});
registerCommand({id:"insert.pictures.choose",label:"Insert Picture",level:"a",run:(doc,sel,ctx)=>insertPicture(doc,sel.from,ctx.arg)});
registerCommand({id:"picture.wrap",tab:"insert",label:"Wrap Text",level:"b",menu:()=>[{cmd:"picture.wrap.set",arg:"inline",label:"In Line with Text"},{cmd:"picture.wrap.set",arg:"square",label:"Square"}]});
registerCommand({id:"picture.wrap.set",tab:"insert",label:"Wrap Text",level:"a",run:(doc,sel,ctx)=>updatePicture(doc,sel.from,{wrap:ctx.arg})});
registerCommand({id:"picture.delete",tab:"insert",label:"Delete Picture",level:"a",run:(doc,sel)=>updatePicture(doc,sel.from,null)});
