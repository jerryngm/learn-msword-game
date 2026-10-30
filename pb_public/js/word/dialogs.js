// Level-b dialogs and panes: they look like Word's and show real values, but change nothing
// (except Sort, whose OK runs the Sort command). Word's own labels stay in English.

import { STYLE_TILES } from "./commands.js";
import { orderRange, slices, wordCount } from "./model.js";
import { fontStack } from "./render.js";
import { biPair, esc, ws } from "./strings.js";

const tip = () => `<p class="wd-dlg-tip">${biPair(ws("practiceTip"))}</p>`;
const field = (label, value, wide = false) =>
  `<label class="wd-fld${wide ? " is-wide" : ""}"><span>${esc(label)}</span><input type="text" readonly value="${esc(value)}"></label>`;
const check = (label, on) => `<label class="wd-chk"><input type="checkbox" disabled ${on ? "checked" : ""}> ${esc(label)}</label>`;

function selectedText(eng, max = 80) {
  const { doc, sel } = eng;
  const r = orderRange(sel().anchor, sel().focus);
  const t = slices(doc(), r).map((s) => s.run.text).join(" ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

const DIALOGS = {
  font(eng) {
    const s = eng.state().props;
    const style = s.b && s.i ? "Bold Italic" : s.b ? "Bold" : s.i ? "Italic" : "Regular";
    const sample = selectedText(eng, 40) || (s.font ?? "Aptos");
    return {
      title: "Font",
      width: 470,
      body: `<div class="wd-tabs"><span class="is-on">Font</span><span>Advanced</span></div>
        <div class="wd-grid3">${field("Font:", s.font === "Aptos" ? "+Body" : s.font ?? "")}${field("Font style:", s.b === undefined ? "" : style)}${field("Size:", s.size ?? "")}</div>
        <div class="wd-grid3">${field("Font color:", s.colour ?? "Automatic")}${field("Underline style:", s.u ? String(s.u) : "(none)")}${field("Underline color:", "Automatic")}</div>
        <fieldset class="wd-fs"><legend>Effects</legend>${check("Strikethrough", s.strike)}${check("Double strikethrough", false)}${check("Superscript", s.sup)}${check("Subscript", s.sub)}</fieldset>
        <div class="wd-preview" style="font-family:${fontStack(s.font ?? "Aptos")};font-weight:${s.b ? 700 : 400};font-style:${s.i ? "italic" : "normal"}">${esc(sample)}</div>${tip()}`,
      buttons: [{ label: "Set As Default", value: "default" }, { label: "OK", value: "ok", primary: true }, { label: "Cancel", value: "cancel" }],
    };
  },
  paragraph(eng) {
    const s = eng.state();
    const line = { 1: "Single", 1.5: "1.5 lines", 2: "Double" }[s.line] ?? "Multiple";
    return {
      title: "Paragraph",
      width: 470,
      body: `<div class="wd-tabs"><span class="is-on">Indents and Spacing</span><span>Line and Page Breaks</span></div>
        <fieldset class="wd-fs"><legend>General</legend><div class="wd-grid3">${field("Alignment:", s.align ? s.align[0].toUpperCase() + s.align.slice(1) : "")}${field("Outline level:", "Body Text")}</div></fieldset>
        <fieldset class="wd-fs"><legend>Indentation</legend><div class="wd-grid3">${field("Left:", s.indentLeft === undefined ? "" : `${s.indentLeft}"`)}${field("Right:", s.indentRight === undefined ? "" : `${s.indentRight}"`)}${field("Special:", s.list ? "Hanging" : "(none)")}</div></fieldset>
        <fieldset class="wd-fs"><legend>Spacing</legend><div class="wd-grid3">${field("Before:", s.before === undefined ? "" : `${s.before} pt`)}${field("After:", s.after === undefined ? "" : `${s.after} pt`)}${field("Line spacing:", s.line === undefined ? "" : line)}</div>${field("At:", s.line ?? "")}</fieldset>${tip()}`,
      buttons: [{ label: "Tabs...", value: "tabs" }, { label: "Set As Default", value: "default" }, { label: "OK", value: "ok", primary: true }, { label: "Cancel", value: "cancel" }],
    };
  },
  sort() {
    return {
      title: "Sort Text",
      width: 400,
      body: `<div class="wd-grid3">${field("Sort by", "Paragraphs")}${field("Type:", "Text")}</div>
        <div class="wd-radios"><label><input type="radio" name="wdsort" value="asc" checked> Ascending</label><label><input type="radio" name="wdsort" value="desc"> Descending</label></div>`,
      buttons: [{ label: "OK", value: "ok", primary: true }, { label: "Cancel", value: "cancel" }],
      read: (el, v) => (v === "ok" ? el.querySelector("input[name=wdsort]:checked")?.value ?? "asc" : null),
    };
  },
  clipboard(eng) {
    const clip = eng.clipboard();
    const body = clip
      ? `<p class="wd-small">Click an Item to Paste:</p><button type="button" class="wd-clipitem" data-cmd="home.clipboard.paste">${esc(clip.text.slice(0, 120) || " ")}</button>`
      : `<p class="wd-small">Clipboard empty.<br>Copy or cut to collect items.</p>`;
    return { title: "Clipboard", width: 300, body, buttons: [{ label: "Close", value: "close", primary: true }] };
  },
  wordcount(eng) {
    const doc = eng.doc();
    const text = doc.p.map((p) => p.text).join("");
    const rows = [
      ["Pages", eng.pages()],
      ["Words", wordCount(doc)],
      ["Characters (no spaces)", text.replace(/\s/g, "").length],
      ["Characters (with spaces)", text.length],
      ["Paragraphs", doc.p.filter((p) => p.text.trim()).length],
    ];
    return {
      title: "Word Count",
      width: 320,
      body: `<p class="wd-small">Statistics:</p><table class="wd-stats">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>${check("Include textboxes, footnotes and endnotes", false)}`,
      buttons: [{ label: "Close", value: "close", primary: true }],
    };
  },
  replace(eng) {
    return {
      title: "Find and Replace",
      width: 460,
      body: `<div class="wd-tabs"><span>Find</span><span class="is-on">Replace</span><span>Go To</span></div>
        <label class="wd-fld is-wide"><span>Find what:</span><input type="text" class="wd-find" value="${esc(selectedText(eng, 40))}" spellcheck="false"></label>
        <label class="wd-fld is-wide"><span>Replace with:</span><input type="text" spellcheck="false"></label>${tip()}`,
      buttons: [{ label: "More >>", value: "more" }, { label: "Replace", value: "replace" }, { label: "Replace All", value: "replaceAll" }, { label: "Find Next", value: "next", primary: true }, { label: "Cancel", value: "cancel" }],
    };
  },
  styles() {
    const tiles = STYLE_TILES.map(
      (s) => `<button type="button" class="wr-style" data-cmd="home.styles.apply" data-arg="${esc(s.name)}" title="${esc(s.name)}"><span style="font-family:${fontStack(s.font)};font-size:${Math.min(s.size, 24)}px;color:${s.colour};${s.italic ? "font-style:italic;" : ""}${s.bold ? "font-weight:700;" : ""}">${esc(s.name)}</span></button>`,
    ).join("");
    return {
      title: "Styles",
      width: 520,
      body: `<div class="wd-stylegrid">${tiles}</div><div class="wd-linklist"><button type="button" data-cmd="home.styles.apply" data-arg="create">Create a Style</button><button type="button" data-cmd="home.font.clear">Clear Formatting</button><button type="button" data-cmd="home.styles.apply" data-arg="apply">Apply Styles...</button></div>`,
      buttons: [{ label: "Close", value: "close", primary: true }],
    };
  },
  stylesPane() {
    return {
      title: "Styles",
      width: 300,
      body: `<div class="wd-panelist">${STYLE_TILES.map((s) => `<button type="button" data-cmd="home.styles.apply" data-arg="${esc(s.name)}">${esc(s.name)}<span>¶</span></button>`).join("")}</div>`,
      buttons: [{ label: "Close", value: "close", primary: true }],
    };
  },
  autosave() {
    return {
      title: "AutoSave",
      width: 340,
      body: `<p class="wd-small">To AutoSave your file, save it to OneDrive or SharePoint.</p>`,
      buttons: [{ label: "OK", value: "ok", primary: true }],
    };
  },
};

/** Open a named dialog. Resolves with the dialog's value (null when cancelled). */
export function openDialog(name, eng) {
  const make = DIALOGS[name];
  if (!make) throw new Error(`Unknown dialog: ${name}`);
  return eng.popups.dialog(make(eng));
}
