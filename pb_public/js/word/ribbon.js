// Ribbon: tab row and the white ribbon card, built from data tables. Buttons carry data-cmd
// (click runs the command) or data-menu (click opens the command's dropdown). Groups carry
// data-group ("home.font") for spotlights. Click handling lives in the engine (index.js).

import { ensureCommand, getCommand, STYLE_TILES } from "./commands.js";
import { fontStack } from "./render.js";
import { esc } from "./strings.js";
import { ico } from "./icons.js";

export const TABS = [
  { id: "file", label: "File" },
  { id: "home", label: "Home" },
  { id: "insert", label: "Insert" },
  { id: "design", label: "Design" },
  { id: "layout", label: "Layout" },
  { id: "references", label: "References" },
  { id: "mailings", label: "Mailings" },
  { id: "review", label: "Review" },
  { id: "view", label: "View" },
  { id: "help", label: "Help" },
  { id: "picture", label: "Picture Format" },
  { id: "table", label: "Layout" },
];

/* ---------- layout primitives ---------- */
// big:   large button, icon above label. o.split: icon part runs, label part opens the menu.
// small: small icon button; o.text shows the label; o.split adds a separate ▾ part.
// o.menuOnly: the whole button opens the menu. o.disabled: greyed (still answers with level c).
const big = (cmd, icon, label, o = {}) => ({ t: "big", cmd, icon, label, ...o });
const sm = (cmd, icon, label, o = {}) => ({ t: "small", cmd, icon, label, ...o });
const smt = (cmd, icon, label, o = {}) => sm(cmd, icon, label, { text: true, ...o });
const stack = (...items) => ({ t: "stack", items });
const rows = (...r) => ({ t: "rows", rows: r });
const SEP = { t: "sep" };
const group = (id, label, items, o = {}) => ({ id, label, items, ...o });

const HOME = [
  group("home.clipboard", "Clipboard", [
    big("home.clipboard.paste", "clipboard_paste_32", "Paste", { split: true }),
    stack(
      smt("home.clipboard.cut", "cut_20", "Cut"),
      smt("home.clipboard.copy", "copy_20", "Copy"),
      smt("home.clipboard.painter", "paint_brush_20", "Format Painter", { cls: "wi-orange" }),
    ),
  ], { launcher: "home.clipboard.dialog" }),
  group("home.font", "Font", [
    rows(
      [{ t: "combo", kind: "font", cmd: "home.font.name" }, { t: "combo", kind: "size", cmd: "home.font.size" },
        sm("home.font.grow", "font_increase_20", "Increase Font Size"), sm("home.font.shrink", "font_decrease_20", "Decrease Font Size"), SEP,
        sm("home.font.case", null, "Change Case", { menuOnly: true, glyph: "Aa", glyphCls: "g-aa" }), SEP,
        sm("home.font.clear", "clearfmt", "Clear All Formatting")],
      [sm("home.font.bold", null, "Bold", { glyph: "B", glyphCls: "g-b" }), sm("home.font.italic", null, "Italic", { glyph: "I", glyphCls: "g-i" }),
        sm("home.font.underline", null, "Underline", { split: true, glyph: "U", glyphCls: "g-u" }),
        sm("home.font.strike", "text_strikethrough_20", "Strikethrough"), sm("home.font.sub", "text_subscript_20", "Subscript"),
        sm("home.font.sup", "text_superscript_20", "Superscript"), SEP,
        sm("home.font.effects", "text_effects_20", "Text Effects and Typography", { menuOnly: true, cls: "wi-blue" }), SEP,
        sm("home.font.highlight", "highlight_20", "Text Highlight Color", { split: true, bar: "highlight" }),
        sm("home.font.colour", "text_font_20", "Font Color", { split: true, bar: "font", glyph: "A" })],
    ),
  ], { launcher: "home.font.dialog" }),
  group("home.paragraph", "Paragraph", [
    rows(
      [sm("home.paragraph.bullets", "text_bullet_list_ltr_20", "Bullets", { split: true, cls: "wi-list" }),
        sm("home.paragraph.numbering", "text_number_list_ltr_20", "Numbering", { split: true, cls: "wi-list" }),
        sm("home.paragraph.multilevel", "text_bullet_list_tree_20", "Multilevel List", { menuOnly: true, cls: "wi-list" }), SEP,
        sm("home.paragraph.indentDec", "text_indent_decrease_ltr_20", "Decrease Indent", { cls: "wi-list" }),
        sm("home.paragraph.indentInc", "text_indent_increase_ltr_20", "Increase Indent", { cls: "wi-list" }), SEP,
        sm("home.paragraph.sort", "text_sort_ascending_20", "Sort"), SEP,
        sm("home.paragraph.marks", null, "Show/Hide ¶", { glyph: "¶", glyphCls: "g-pil" })],
      [sm("home.paragraph.alignLeft", "text_align_left_20", "Align Left"), sm("home.paragraph.alignCenter", "text_align_center_20", "Center"),
        sm("home.paragraph.alignRight", "text_align_right_20", "Align Right"), sm("home.paragraph.alignJustify", "text_align_justify_20", "Justify"), SEP,
        sm("home.paragraph.spacing", "text_line_spacing_20", "Line and Paragraph Spacing", { menuOnly: true, cls: "wi-list" }), SEP,
        sm("home.paragraph.shading", "paint_bucket_20", "Shading", { split: true, bar: "shading" }),
        sm("home.paragraph.borders", "borders", "Borders", { split: true })],
    ),
  ], { launcher: "home.paragraph.dialog" }),
  group("home.styles", "Styles", [{ t: "styles" }], { launcher: "home.styles.pane", grow: true }),
  group("home.editing", "Editing", [
    { t: "wide", items: [stack(
      smt("home.editing.find", "search_20", "Find", { split: true }),
      smt("home.editing.replace", "replace", "Replace"),
      smt("home.editing.select", "cursor_20", "Select", { menuOnly: true }),
    )] },
    { t: "narrow", items: [big("home.editing.menu", "search_20", "Editing", { menuOnly: true })] },
  ]),
  group("home.voice", "Voice", [big("home.voice.dictate", "mic_32_filled", "Dictate", { split: true, cls: "wi-mic" })]),
  group("home.sensitivity", "Sensitivity", [big("home.sensitivity.sensitivity", "tag_32", "Sensitivity", { menuOnly: true, disabled: true })]),
  group("home.addins", "Add-ins", [big("home.addins.addins", "apps_add_in_32", "Add-ins", { cls: "wi-red" })]),
  group("home.editor", "", [big("home.editor.editor", "pen_32", "Editor", { cls: "wi-blue" }), big("home.editor.copilot", "copilot", "Copilot")]),
];

const INSERT = [
  group("insert.pages", "Pages", [big("insert.pages.cover", "document_text_24", "Cover Page", { menuOnly: true }), big("insert.pages.blank", "document_add_24", "Blank Page"), big("insert.pages.break", "document_page_break_24", "Page Break")]),
  group("insert.tables", "Tables", [big("insert.table", "table_32", "Table", { menuOnly: true })]),
  group("insert.illustrations", "Illustrations", [
    big("insert.pictures", "pictures", "Pictures", { menuOnly: true }), big("insert.illustrations.shapes", "shapes_32", "Shapes", { menuOnly: true }),
    big("insert.illustrations.icons", "icons_24", "Icons"), big("insert.illustrations.models", "cube_32", "3D Models", { menuOnly: true }),
    big("insert.illustrations.smartart", "organization_24", "SmartArt", { cls: "wi-green" }), big("insert.illustrations.chart", "data_bar_vertical_add_24", "Chart", { cls: "wi-blue" }),
    big("insert.illustrations.screenshot", "screenshot_24", "Screenshot", { menuOnly: true }),
  ]),
  group("insert.media", "Media", [big("insert.media.video", "video_clip_32", "Online Videos")]),
  group("insert.links", "Links", [big("insert.links.link", "link_32", "Link", { menuOnly: true }), big("insert.links.bookmark", "bookmark_32", "Bookmark"), big("insert.links.crossref", "link_24", "Cross-reference")]),
  group("insert.comments", "Comments", [big("insert.comments.comment", "comment_add_32", "Comment")]),
  group("insert.headerFooter", "Header & Footer", [big("insert.headerFooter.header", "document_header_32", "Header", { menuOnly: true }), big("insert.headerFooter.footer", "document_footer_24", "Footer", { menuOnly: true }), big("insert.headerFooter.pageNumber", "number_symbol_32", "Page Number", { menuOnly: true })]),
  group("insert.text", "Text", [
    big("insert.text.textBox", "textbox_24", "Text Box", { menuOnly: true }), big("insert.text.quickParts", "document_text_24", "Quick Parts", { menuOnly: true }),
    big("insert.text.wordArt", "text_effects_20", "WordArt", { menuOnly: true }), big("insert.text.dropCap", "text_font_24", "Drop Cap", { menuOnly: true, disabled: true }),
    stack(smt("insert.text.signature", "signature_24", "Signature Line", { split: true }), smt("insert.text.dateTime", "document_text_20", "Date & Time"), smt("insert.text.object", "document_20", "Object", { split: true })),
  ]),
  group("insert.symbols", "Symbols", [big("insert.symbols.equation", null, "Equation", { menuOnly: true, bglyph: "π" }), big("insert.symbols.symbol", null, "Symbol", { menuOnly: true, bglyph: "Ω" })]),
  group("insert.esignature", "eSignature", [big("insert.esignature.fields", "signature_32", "eSignature fields")]),
];

const LAYOUT = [
  group("layout.pageSetup", "Page Setup", [
    big("layout.margins", "margins", "Margins", { menuOnly: true }), big("layout.orientation", "orientation", "Orientation", { menuOnly: true }),
    big("layout.pageSetup.size", "document_24", "Size", { menuOnly: true }), big("layout.pageSetup.columns", "text_column_two_24", "Columns", { menuOnly: true }),
    stack(smt("layout.pageSetup.breaks", "document_page_break_24", "Breaks", { menuOnly: true }), smt("layout.pageSetup.lineNumbers", "text_number_list_ltr_20", "Line Numbers", { menuOnly: true }), smt("layout.pageSetup.hyphenation", "text_font_size_20", "Hyphenation", { menuOnly: true })),
  ], { launcher: "layout.pageSetup.dialog" }),
  group("layout.paragraph", "Paragraph", [{ t: "spinners" }], { launcher: "layout.paragraph.dialog" }),
  group("layout.arrange", "Arrange", [
    big("layout.arrange.position", "text_position_square_24", "Position", { menuOnly: true, disabled: true }), big("layout.arrange.wrap", "text_wrap_24", "Wrap Text", { menuOnly: true, disabled: true }),
    big("layout.arrange.forward", "position_forward_24", "Bring Forward", { menuOnly: true, disabled: true }), big("layout.arrange.backward", "position_backward_24", "Send Backward", { menuOnly: true, disabled: true }),
    big("layout.arrange.selectionPane", "layer_24", "Selection Pane", { cls: "wi-orange" }),
    stack(smt("layout.arrange.align", "align_left_20", "Align", { menuOnly: true }), smt("layout.arrange.group", "square_multiple_16", "Group", { menuOnly: true, disabled: true }), smt("layout.arrange.rotate", "arrow_redo_20", "Rotate", { menuOnly: true, disabled: true })),
  ]),
];

const DESIGN = [
  group("design.themes", "", [big("design.themes.themes", "color_32", "Themes", { menuOnly: true })]),
  group("design.formatting", "Document Formatting", [
    { t: "tiles", cmd: "design.formatting.styleSet", tiles: ["Title", "Title", "Title", "Title", "Title", "Title"] },
    big("design.formatting.colors", "color_24", "Colors", { menuOnly: true }), big("design.formatting.fonts", "text_font_24", "Fonts", { menuOnly: true }),
    stack(smt("design.formatting.spacing", "text_line_spacing_20", "Paragraph Spacing", { menuOnly: true }), smt("design.formatting.effects", "text_effects_20", "Effects", { menuOnly: true }), smt("design.formatting.default", "checkmark_16", "Set as Default")),
  ]),
  group("design.background", "Page Background", [big("design.background.watermark", "document_text_24", "Watermark", { menuOnly: true }), big("design.background.pageColor", "paint_bucket_20", "Page Color", { menuOnly: true }), big("design.background.borders", "document_margins_24", "Page Borders")]),
];

const REFERENCES = [
  group("references.toc", "Table of Contents", [big("references.toc.toc", "document_text_24", "Table of Contents", { menuOnly: true }), stack(smt("references.toc.addText", "text_font_size_20", "Add Text", { menuOnly: true }), smt("references.toc.update", "arrow_redo_20", "Update Table"))]),
  group("references.footnotes", "Footnotes", [big("references.footnotes.insert", "text_superscript_20", "Insert Footnote"), stack(smt("references.footnotes.endnote", "text_subscript_20", "Insert Endnote"), smt("references.footnotes.next", "arrow_forward_20", "Next Footnote", { split: true }), smt("references.footnotes.show", "document_text_20", "Show Notes", { disabled: true }))]),
  group("references.research", "Research", [big("references.research.search", "search_20", "Search"), big("references.research.researcher", "book_open_24", "Researcher")]),
  group("references.citations", "Citations & Bibliography", [big("references.citations.insert", "comment_20", "Insert Citation", { menuOnly: true }), stack(smt("references.citations.manage", "book_open_20", "Manage Sources"), smt("references.citations.style", "text_font_20", "Style: APA", { menuOnly: true }), smt("references.citations.bibliography", "book_letter_20", "Bibliography", { menuOnly: true }))]),
  group("references.captions", "Captions", [big("references.captions.insert", "image_24", "Insert Caption"), stack(smt("references.captions.figures", "document_text_20", "Insert Table of Figures"), smt("references.captions.update", "arrow_redo_20", "Update Table", { disabled: true }), smt("references.captions.crossref", "link_20", "Cross-reference"))]),
  group("references.index", "Index", [big("references.index.mark", "document_text_24", "Mark Entry"), stack(smt("references.index.insert", "document_text_20", "Insert Index"), smt("references.index.update", "arrow_redo_20", "Update Index", { disabled: true }))]),
  group("references.authorities", "Table of Authorities", [big("references.authorities.mark", "document_text_24", "Mark Citation"), stack(smt("references.authorities.insert", "document_text_20", "Insert Table of Authorities"), smt("references.authorities.update", "arrow_redo_20", "Update Table", { disabled: true }))]),
];

const MAILINGS = [
  group("mailings.create", "Create", [big("mailings.create.envelopes", "document_landscape_24", "Envelopes"), big("mailings.create.labels", "document_text_24", "Labels")]),
  group("mailings.start", "Start Mail Merge", [big("mailings.start.start", "document_copy_20", "Start Mail Merge", { menuOnly: true }), big("mailings.start.recipients", "person_20", "Select Recipients", { menuOnly: true }), big("mailings.start.edit", "edit_20", "Edit Recipient List", { disabled: true })]),
  group("mailings.fields", "Write & Insert Fields", [big("mailings.fields.highlight", "highlight_20", "Highlight Merge Fields", { disabled: true }), big("mailings.fields.address", "document_text_24", "Address Block", { disabled: true }), big("mailings.fields.greeting", "comment_20", "Greeting Line", { disabled: true }), big("mailings.fields.insert", "document_add_24", "Insert Merge Field", { menuOnly: true, disabled: true })]),
  group("mailings.preview", "Preview Results", [big("mailings.preview.preview", "glance_20", "Preview Results", { disabled: true })]),
  group("mailings.finish", "Finish", [big("mailings.finish.finish", "document_copy_20", "Finish & Merge", { menuOnly: true, disabled: true })]),
];

const REVIEW = [
  group("review.proofing", "Proofing", [big("review.proofing.spelling", "text_proofing_tools_20", "Spelling & Grammar", { split: true }), stack(smt("review.proofing.thesaurus", "book_open_20", "Thesaurus"), smt("review.proofing.wordCount", "text_word_count_20", "Word Count"))]),
  group("review.speech", "Speech", [big("review.speech.readAloud", "read_aloud_20", "Read Aloud")]),
  group("review.accessibility", "Accessibility", [big("review.accessibility.check", "accessibility_checkmark_20", "Check Accessibility", { menuOnly: true })]),
  group("review.language", "Language", [big("review.language.translate", "translate_20", "Translate", { menuOnly: true }), big("review.language.language", "globe_20", "Language", { menuOnly: true })]),
  group("review.comments", "Comments", [big("review.comments.new", "comment_add_32", "New Comment"), big("review.comments.delete", "dismiss_20", "Delete", { menuOnly: true, disabled: true }), big("review.comments.previous", "arrow_left_24", "Previous", { disabled: true }), big("review.comments.next", "arrow_forward_20", "Next", { disabled: true }), big("review.comments.show", "comment_20", "Show Comments", { menuOnly: true })]),
  group("review.tracking", "Tracking", [big("review.tracking.track", "edit_20", "Track Changes", { split: true }), stack(smt("review.tracking.display", "document_text_20", "Simple Markup", { menuOnly: true }), smt("review.tracking.showMarkup", "document_text_20", "Show Markup", { menuOnly: true }), smt("review.tracking.pane", "document_text_20", "Reviewing Pane", { menuOnly: true }))], { launcher: "review.tracking.dialog" }),
  group("review.changes", "Changes", [big("review.changes.accept", "checkmark_16", "Accept", { split: true }), stack(smt("review.changes.reject", "dismiss_16", "Reject", { split: true }), smt("review.changes.previous", "arrow_left_20", "Previous"), smt("review.changes.next", "arrow_forward_20", "Next"))]),
  group("review.compare", "Compare", [big("review.compare.compare", "document_copy_20", "Compare", { menuOnly: true })]),
  group("review.protect", "Protect", [big("review.protect.block", "person_20", "Block Authors", { menuOnly: true }), big("review.protect.restrict", "shield_24", "Restrict Editing")]),
  group("review.ink", "Ink", [big("review.ink.hide", "pen_sparkle_24", "Hide Ink", { menuOnly: true })]),
];

const VIEW = [
  group("view.views", "Views", [big("view.views.readMode", "book_open_24", "Read Mode"), big("view.views.printLayout", "document_24", "Print Layout", { on: true }), big("view.views.webLayout", "globe_20", "Web Layout"), stack(smt("view.views.outline", "text_bullet_list_ltr_20", "Outline"), smt("view.views.draft", "document_text_20", "Draft"))]),
  group("view.immersive", "Immersive", [big("view.immersive.focus", "page_fit_24", "Focus"), big("view.immersive.reader", "book_open_24", "Immersive Reader")]),
  group("view.movement", "Page Movement", [big("view.movement.vertical", "document_24", "Vertical", { on: true }), big("view.movement.side", "book_open_24", "Side to Side")]),
  group("view.show", "Show", [stack({ t: "check", cmd: "view.show.ruler", label: "Ruler" }, { t: "check", cmd: "view.show.gridlines", label: "Gridlines" }, { t: "check", cmd: "view.show.navigation", label: "Navigation Pane" })]),
  group("view.zoom", "Zoom", [big("view.zoom.zoom", "search_20", "Zoom"), big("view.zoom.100", "document_24", "100%"), stack(smt("view.zoom.onePage", "document_20", "One Page"), smt("view.zoom.multiple", "document_copy_20", "Multiple Pages"), smt("view.zoom.pageWidth", "page_fit_24", "Page Width"))]),
  group("view.window", "Window", [big("view.window.new", "window_20", "New Window"), big("view.window.arrange", "square_multiple_16", "Arrange All"), big("view.window.split", "text_column_two_24", "Split"), stack(smt("view.window.side", "text_column_two_24", "View Side by Side"), smt("view.window.sync", "arrow_sort_20", "Synchronous Scrolling", { disabled: true }), smt("view.window.reset", "window_20", "Reset Window Position", { disabled: true })), big("view.window.switch", "square_multiple_16", "Switch Windows", { menuOnly: true })]),
  group("view.macros", "Macros", [big("view.macros.macros", "document_text_24", "Macros", { menuOnly: true })]),
  group("view.sharepoint", "SharePoint", [big("view.sharepoint.properties", "info_20", "Properties")]),
];

const HELP = [
  group("help.help", "Help", [big("help.help.help", "question_circle_20", "Help"), big("help.help.support", "person_20", "Contact Support"), big("help.help.feedback", "person_feedback_20", "Feedback"), big("help.help.training", "video_clip_24", "Show Training"), big("help.help.whatsNew", "sparkle_24", "What's New")]),
];

const TAB_GROUPS = new Map([
  ["picture", [group("picture.arrange", "Arrange", [big("picture.wrap", "text_wrap_24", "Wrap Text", {menuOnly:true}),big("picture.delete", "delete", "Delete Picture")])]],
  ["table", [group("table.rows", "Rows & Columns", [big("table.insertBelow", "table_32", "Insert Below"),big("table.insertRight", "table_32", "Insert Right"),big("table.delete", "delete", "Delete", {menuOnly:true})])]],
  ["home", HOME], ["insert", INSERT], ["design", DESIGN], ["layout", LAYOUT], ["references", REFERENCES],
  ["mailings", MAILINGS], ["review", REVIEW], ["view", VIEW], ["help", HELP],
]);

/** Replace a tab's groups (phase 5 fills tabs in by registering commands plus these rows). */
export function setTabGroups(tabId, groups) {
  if (!TABS.some((t) => t.id === tabId) || tabId === "file") throw new Error(`setTabGroups: unknown tab ${tabId}`);
  if (!Array.isArray(groups)) throw new TypeError("setTabGroups: groups must be an array");
  TAB_GROUPS.set(tabId, groups);
}
export const ribbonParts = { big, sm, smt, stack, rows, SEP, group };

/* ---------- markup ---------- */

function attrs(item) {
  const cmd = getCommand(item.cmd) ?? ensureCommand(item.cmd, item.label);
  const tip = cmd.key ? `${item.label} (${cmd.key})` : item.label;
  return `title="${esc(tip)}" aria-label="${esc(item.label)}"`;
}
const chev = `<span class="wr-chev">${ico("chev")}</span>`;
const disabled = (item) => (item.disabled ? " is-disabled" : "");

function bar(item) {
  return item.bar ? `<span class="wr-bar" data-bar="${item.bar}"></span>` : "";
}
function smallIcon(item) {
  if (item.glyph) return `<span class="wr-glyph ${item.glyphCls ?? ""}" aria-hidden="true">${esc(item.glyph)}</span>${bar(item)}`;
  return `${ico(item.icon, item.cls)}${bar(item)}`;
}

function smallHtml(item) {
  const txt = item.text ? `<span class="wr-txt">${esc(item.label)}</span>` : "";
  const cls = `wr-btn wr-sm${item.text ? " has-txt" : ""}${disabled(item)}`;
  if (item.menuOnly) {
    return `<button type="button" class="${cls} wr-menu" data-menu="${item.cmd}" ${attrs(item)}><span class="wr-ic">${smallIcon(item)}</span>${txt}${chev}</button>`;
  }
  const main = `<button type="button" class="${cls}${item.split ? " wr-split-main" : ""}" data-cmd="${item.cmd}" ${attrs(item)}><span class="wr-ic">${smallIcon(item)}</span>${txt}</button>`;
  if (!item.split) return main;
  return `<span class="wr-split">${main}<button type="button" class="wr-btn wr-split-arrow${disabled(item)}" data-menu="${item.cmd}" title="${esc(item.label)}" aria-label="${esc(item.label)} options">${chev}</button></span>`;
}

/** Large-button label as Word draws it: a two-word label breaks onto two lines and the ▾ sits on
 * the last line; a one-word label puts the ▾ on its own second line. */
function bigLabel(label, withChev) {
  const c = withChev ? chev : "";
  let head = "";
  let tail = label;
  const space = label.lastIndexOf(" ");
  if (space > 0) {
    head = label.slice(0, space);
    tail = label.slice(space + 1);
  } else if (label.length > 10 && label.includes("-")) {
    const dash = label.indexOf("-") + 1;
    head = label.slice(0, dash);
    tail = label.slice(dash);
  }
  if (head) return `<span class="wr-blbl">${esc(head)}<br>${esc(tail)}${c}</span>`;
  return `<span class="wr-blbl">${esc(label)}${withChev ? `<br>${c}` : ""}</span>`;
}

function bigHtml(item) {
  const glyph = item.bglyph ? `<span class="wr-bglyph" aria-hidden="true">${esc(item.bglyph)}</span>` : null;
  const icon = `<span class="wr-bic">${glyph ?? ico(item.icon, `wi-big ${item.cls ?? ""}`)}</span>`;
  const cls = `wr-btn wr-big${disabled(item)}${item.on ? " is-on" : ""}`;
  if (item.split) {
    return `<span class="wr-bigsplit${disabled(item)}"><button type="button" class="${cls} wr-big-top" data-cmd="${item.cmd}" ${attrs(item)}>${icon}</button><button type="button" class="wr-btn wr-big-bottom${disabled(item)}" data-menu="${item.cmd}" title="${esc(item.label)}"><span class="wr-blbl">${esc(item.label)}</span>${chev}</button></span>`;
  }
  const attr = item.menuOnly ? `data-menu="${item.cmd}"` : `data-cmd="${item.cmd}"`;
  return `<button type="button" class="${cls}" ${attr} ${attrs(item)}>${icon}${bigLabel(item.label, item.menuOnly)}</button>`;
}

function comboHtml(item) {
  const isFont = item.kind === "font";
  return `<span class="wr-combo wr-combo-${item.kind}" data-group-cmd="${item.cmd}">
    <input class="wr-combo-in" data-combo="${item.kind}" type="text" spellcheck="false" autocomplete="off" title="${isFont ? "Font (Ctrl+Shift+F)" : "Font Size (Ctrl+Shift+P)"}" aria-label="${isFont ? "Font" : "Font Size"}" value="${isFont ? "Aptos (Body)" : "12"}">
    <button type="button" class="wr-combo-arrow" data-menu="${item.cmd}" tabindex="-1" aria-label="${isFont ? "Font list" : "Size list"}">${chev}</button>
  </span>`;
}

function stylesHtml() {
  const tiles = STYLE_TILES.slice(0, 5)
    .map((s, i) => {
      const style = `font-family:${fontStack(s.font)};font-size:${Math.min(36, Math.round(s.size * 1.25))}px;color:${s.colour}`;
      return `<button type="button" class="wr-style${i === 0 ? " is-on" : ""}" data-cmd="home.styles.apply" data-arg="${esc(s.name)}" title="${esc(s.name)}"><span style="${style}">${esc(s.short ?? s.name)}</span></button>`;
    })
    .join("");
  return `<div class="wr-gallery wide-only"><div class="wr-gallery-tiles">${tiles}</div>
      <button type="button" class="wr-btn wr-gallery-more" data-cmd="home.styles.more" title="More" aria-label="More styles">${ico("more")}</button></div>
    <div class="narrow-only">${bigHtml({ cmd: "home.styles.more", icon: "text_edit_style_24", label: "Styles", menuOnly: false })}</div>`;
}

function spinnersHtml() {
  const spin = (key, label, icon, unit) => `<label class="wr-spinrow" title="${label}"><span class="wr-spinlbl">${ico(icon)}${label}:</span>
      <span class="wr-spin" data-cmd="layout.paragraph.${key}"><input data-spin="${key}" type="text" readonly value="0${unit}" tabindex="-1"><span class="wr-spinbtns"><span>${ico("chevron_up_12")}</span><span>${ico("chevron_down_12")}</span></span></span></label>`;
  ensureCommand("layout.paragraph.indentLeft", "Indent Left");
  ensureCommand("layout.paragraph.indentRight", "Indent Right");
  ensureCommand("layout.paragraph.spaceBefore", "Spacing Before");
  ensureCommand("layout.paragraph.spaceAfter", "Spacing After");
  return `<div class="wr-spincols">
    <div><div class="wr-spinhead">Indent</div>${spin("indentLeft", "Left", "text_indent_increase_ltr_20", '"')}${spin("indentRight", "Right", "text_indent_decrease_ltr_20", '"')}</div>
    <div><div class="wr-spinhead">Spacing</div>${spin("spaceBefore", "Before", "text_line_spacing_20", " pt")}${spin("spaceAfter", "After", "text_line_spacing_20", " pt")}</div>
  </div>`;
}

function itemHtml(item) {
  switch (item.t) {
    case "big": return bigHtml(item);
    case "small": return smallHtml(item);
    case "combo": return comboHtml(item);
    case "sep": return `<span class="wr-sep" aria-hidden="true"></span>`;
    case "stack": return `<div class="wr-stack">${item.items.map(itemHtml).join("")}</div>`;
    case "rows": return `<div class="wr-rows">${item.rows.map((r) => `<div class="wr-row">${r.map(itemHtml).join("")}</div>`).join("")}</div>`;
    case "styles": return stylesHtml();
    case "spinners": return spinnersHtml();
    case "wide": return `<div class="wide-only">${item.items.map(itemHtml).join("")}</div>`;
    case "narrow": return `<div class="narrow-only">${item.items.map(itemHtml).join("")}</div>`;
    case "check":
      ensureCommand(item.cmd, item.label);
      return `<button type="button" class="wr-btn wr-check" data-cmd="${item.cmd}" title="${esc(item.label)}"><span class="wr-box"></span>${esc(item.label)}</button>`;
    case "tiles":
      ensureCommand(item.cmd, "Style Set");
      return `<div class="wr-gallery"><div class="wr-gallery-tiles">${item.tiles.map((t) => `<button type="button" class="wr-style wr-set" data-cmd="${item.cmd}"><b>${esc(t)}</b><i></i><i></i></button>`).join("")}</div><button type="button" class="wr-btn wr-gallery-more" data-cmd="${item.cmd}" aria-label="More">${ico("more")}</button></div>`;
    default:
      throw new Error(`ribbon: unknown item type ${item.t}`);
  }
}

/** Markup for a list of layout items (the mini toolbar reuses the ribbon buttons). */
export function itemsHtml(items) {
  return items.map(itemHtml).join("");
}

function firstIcon(items) {
  for (const it of items) {
    if (it.icon && it.icon !== "copilot") return it.icon;
    const inner = it.items ?? it.rows?.flat();
    const found = inner && firstIcon(inner);
    if (found) return found;
  }
  return null;
}

/**
 * Fold groups (rightmost first) until the card fits its width, like Word does on narrow windows.
 * Home relies on its CSS steps first, so its groups fold only as a last resort.
 */
export function fitRibbon(card) {
  const groups = [...card.querySelectorAll(":scope > .wr-group")];
  groups.forEach((g) => g.classList.remove("is-folded"));
  card.querySelectorAll(".wr-style.is-clipped").forEach((t) => t.classList.remove("is-clipped"));
  const fits = () => card.scrollWidth <= card.clientWidth + 1;
  for (let i = groups.length - 1; i >= 0 && !fits(); i--) groups[i].classList.add("is-folded");
  // A gallery shows whole tiles only, as Word does; the rest stay behind the More button.
  card.querySelectorAll(".wr-gallery-tiles").forEach((box) => {
    const right = box.getBoundingClientRect().right + 0.5;
    for (const t of box.children) if (t.getBoundingClientRect().right > right) t.classList.add("is-clipped");
  });
}

function groupHtml(g) {
  if (g.launcher) ensureCommand(g.launcher, `${g.label} Settings`);
  const launcher = g.launcher
    ? `<button type="button" class="wr-launch" data-cmd="${g.launcher}" title="${esc(g.label)} Settings" aria-label="${esc(g.label)} Settings">${ico("launcher")}</button>`
    : "";
  const icon = firstIcon(g.items) ?? "document_24";
  const name = g.label || "More";
  // When the window is too narrow, Word folds a group into one large button that opens it.
  const folded = `<div class="wr-gfold"><button type="button" class="wr-btn wr-big" data-expand="${g.id}" title="${esc(name)}"><span class="wr-bic">${ico(icon, "wi-big")}</span><span class="wr-blbl">${esc(name)}</span>${chev}</button></div>`;
  return `<div class="wr-group${g.grow ? " wr-grow" : ""}" data-group="${g.id}" role="group" aria-label="${esc(g.label || g.id)}">
    <div class="wr-gbody">${g.items.map(itemHtml).join("")}</div>${folded}
    <div class="wr-glabel">${esc(g.label)}${launcher}</div>
  </div>`;
}

export function tabRowHtml() {
  const tabs = TABS.map(
    (t) => `<button type="button" class="wt-tab" role="tab" data-tab="${t.id}" aria-selected="false">${esc(t.label)}</button>`,
  ).join("");
  return `<div class="wt-row"><div class="wt-tabs" role="tablist">${tabs}</div>
    <div class="wt-right">
      <button type="button" class="wt-pill" data-cmd="title.comments">${ico("comment_20")}Comments</button>
      <button type="button" class="wt-pill" data-menu="title.editingMode">${ico("edit_20")}Editing${chev}</button>
      <button type="button" class="wt-pill wt-share" data-cmd="title.share">${ico("share_ios_20")}Share${chev}</button>
    </div></div>`;
}

/** Ribbon card for one tab. */
export function ribbonHtml(tabId) {
  const groups = TAB_GROUPS.get(tabId) ?? [];
  return `<div class="wr-card" data-tab="${tabId}">${groups.map(groupHtml).join("")}
    <button type="button" class="wr-collapse" data-cmd="title.ribbonOptions" title="Ribbon Display Options" aria-label="Ribbon Display Options">${ico("chev")}</button></div>`;
}
