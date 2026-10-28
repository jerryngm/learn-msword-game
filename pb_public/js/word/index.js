import { PICTURES, pictureSize } from "./pictures.js";
// mountWord(): the Windows Word mock. The model is the source of truth: keyboard and beforeinput
// events are intercepted and turned into model edits, then the page is re-rendered from the model.
//
//   const word = mountWord(el, { doc, tabs: ['home'], title: 'Document1', goal: { check, progress } });
//   word.on('change', ({doc, prevDoc, lastCommand}) => ...);   also 'command', 'goal', 'wrong'
//   word.getDoc(); word.setDoc(doc); word.setSpotlight('home.font'); await word.demo(script);
//   word.undo(); word.redo(); word.destroy();

import { getCommand, ensureCommand, SHORTCUTS, EFFECT_NAMES, WRAP_MENU } from "./commands.js";
import { openDialog } from "./dialogs.js";
import { templateDoc } from "./templates.js";
import { openBackstage, clearSavedDocument } from "./backstage.js";
import { ico } from "./icons.js";
import {
  updatePicture, editTable, FONTS, RUN_KEYS, applyFormat, clampPos, cmpPos, createDoc, deleteRange, docEnd, fragment, insertText, isCollapsed,
  spellingRanges, orderRange, propsAt, slices, splitParagraph, applyParaFormat, wordAround, wordCount, wordSelectionAt,
} from "./model.js";
import { createRenderer } from "./render.js";
import { fitRibbon, itemsHtml, ribbonHtml, tabRowHtml, TABS, ribbonParts } from "./ribbon.js";
import {
  caretRect, clampSel, collapsedSel, domRange, domToPos, posFromPoint, posToDom, readSelection, sameSel, selectAll, selRange, writeSelection,
} from "./selection.js";
import { createHistory } from "./undo.js";
import { createPopups, decArg } from "./ui.js";
import { createPictureDialogs, PICTURE_INSERT, PICTURE_CANCEL, PICTURE_NAV, ONLINE_CATEGORY } from "./picture-dialogs.js";
import { esc, labelPair, ws, biPair } from "./strings.js";
import { playDemo, validateScript } from "../demo/player.js";

// Ctrl+key combos that Word owns but the browser would act on (print, new window, open, link, close tab).
const BROWSER_KEYS = { p: "file.print", n: "file.new.blank", o: "file.openDocument", k: "insert.links.link", w: "file.close" };
const RIBBON_TABS = new Set(TABS.map((t) => t.id).filter((id) => id !== "file"));
// Contextual tabs: shown only while a picture / a table is selected.
const CONTEXT_TABS = new Set(["picture", "tabledesign", "table"]);
const internals = new WeakMap();

/** Engine internals for hints.js (not part of the mission API). */
export function getInternals(word) {
  const i = internals.get(word);
  if (!i) throw new Error("not a Word engine");
  return i;
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function shortcutOf(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  parts.push(k);
  return parts.join("+");
}

function commonProps(runs) {
  if (!runs.length) return {};
  const out = {};
  for (const k of RUN_KEYS) out[k] = runs.every((r) => r[k] === runs[0][k]) ? runs[0][k] : undefined;
  return out;
}
function common(list, fn) {
  if (!list.length) return undefined;
  const v = fn(list[0]);
  return list.every((x) => fn(x) === v) ? v : undefined;
}

function fontLabel(font) {
  if (font === undefined) return "";
  if (font === "Aptos") return "Aptos (Body)";
  if (font === "Aptos Display") return "Aptos Display (Headings)";
  return font;
}

function titleBarHtml(title, initials) {
  const caps = `<button type="button" class="wd-cap" data-cmd="title.minimize" aria-label="Minimize">${ico("capmin")}</button>
    <button type="button" class="wd-cap" data-cmd="title.restore" aria-label="Restore Down">${ico("caprestore")}</button>
    <button type="button" class="wd-cap wd-cap-close" data-cmd="title.close" aria-label="Close">${ico("capclose")}</button>`;
  return `<div class="wd-title">
    <span class="wd-logo">${ico("wordlogo")}</span>
    <button type="button" class="wd-autosave" data-cmd="qat.autosave" title="AutoSave">AutoSave<span class="wd-toggle"><i></i>Off</span></button>
    <button type="button" class="wd-qb wd-save" data-cmd="qat.save" title="Save (Ctrl+S)" aria-label="Save">${ico("save_20", "wi-save")}</button>
    <span class="wd-qsplit"><button type="button" class="wd-qb" data-cmd="qat.undo" title="Undo (Ctrl+Z)" aria-label="Undo">${ico("arrow_undo_20")}</button><button type="button" class="wd-qb wd-qarrow" data-cmd="qat.undoList" aria-label="Undo list">${ico("chev")}</button></span>
    <button type="button" class="wd-qb" data-cmd="qat.redo" title="Redo (Ctrl+Y)" aria-label="Redo">${ico("arrow_clockwise_20")}</button>
    <button type="button" class="wd-qb wd-cust" data-menu="qat.customize" title="Customize Quick Access Toolbar" aria-label="Customize Quick Access Toolbar">${ico("more")}</button>
    <span class="wd-name">${esc(title)}&nbsp; - &nbsp;Word</span>
    <button type="button" class="wd-search" data-cmd="title.search">${ico("search_20")}<span>Search</span></button>
    <span class="wd-tright">
      <button type="button" class="wd-avatar" data-cmd="title.account" aria-label="Account">${initials ? `<span class="wd-initials">${esc(initials)}</span>` : ico("person_20")}</button>
      ${caps}
    </span>
  </div>`;
}

function statusHtml() {
  return `<div class="wd-status">
    <button type="button" class="wd-sb" data-cmd="status.page" data-status="page">Page 1 of 1</button>
    <button type="button" class="wd-sb" data-cmd="status.words" data-status="words">0 words</button>
    <button type="button" class="wd-sb" data-cmd="status.proofing" aria-label="Proofing">${ico("book_letter_20")}</button>
    <button type="button" class="wd-sb" data-cmd="status.accessibility">${ico("accessibility_checkmark_20")}Accessibility: Good to go</button>
    <span class="wd-caps" role="status" hidden>Caps Lock</span>
    <span class="wd-sright">
      <button type="button" class="wd-sb" data-cmd="status.focus">${ico("page_fit_24")}Focus</button>
      <button type="button" class="wd-sb" data-cmd="status.readMode" aria-label="Read Mode">${ico("book_open_20")}</button>
      <button type="button" class="wd-sb is-on" data-cmd="status.printLayout" aria-label="Print Layout">${ico("document_20")}</button>
      <button type="button" class="wd-sb" data-cmd="status.webLayout" aria-label="Web Layout">${ico("document_globe_20")}</button>
      <span class="wd-zoom">
        <button type="button" class="wd-sb wd-zb" data-cmd="status.zoomOut" aria-label="Zoom Out">−</button>
        <input type="range" class="wd-zr" min="0" max="100" value="50" aria-label="Zoom" tabindex="-1">
        <button type="button" class="wd-sb wd-zb" data-cmd="status.zoomIn" aria-label="Zoom In">+</button>
        <button type="button" class="wd-sb wd-zl" data-menu="status.zoomMenu">100%</button>
      </span>
    </span>
  </div>`;
}

const { sm, smt, big } = ribbonParts;
const MINI_ROW1 = [
  { t: "combo", kind: "font", cmd: "home.font.name" }, { t: "combo", kind: "size", cmd: "home.font.size" },
  sm("home.font.grow", "font_increase_20", "Increase Font Size"), sm("home.font.shrink", "font_decrease_20", "Decrease Font Size"),
  sm("home.clipboard.painter", "paint_brush_20", "Format Painter", { cls: "wi-orange" }),
];
const MINI_ROW2 = [
  sm("home.font.bold", null, "Bold", { glyph: "B", glyphCls: "g-b" }), sm("home.font.italic", null, "Italic", { glyph: "I", glyphCls: "g-i" }), sm("home.font.underline", null, "Underline", { glyph: "U", glyphCls: "g-u" }),
  sm("home.font.highlight", "highlight_20", "Text Highlight Color", { split: true, bar: "highlight" }),
  sm("home.font.colour", "text_font_20", "Font Color", { split: true, bar: "font", glyph: "A" }),
  sm("home.paragraph.bullets", "text_bullet_list_ltr_20", "Bullets", { split: true, cls: "wi-list" }),
  sm("home.paragraph.numbering", "text_number_list_ltr_20", "Numbering", { split: true, cls: "wi-list" }),
];
void smt;

/* ===================================================================== */

export function mountWord(el, opts = {}) {
  if (!(el instanceof HTMLElement)) throw new TypeError("mountWord: el must be an element");
  let title = typeof opts.title === "string" && opts.title.trim() ? opts.title.trim() : "Document1";
  // Optional account initials for the title-bar avatar (Word shows the signed-in user).
  // Code points, not UTF-16 units, so a name starting with an emoji never leaves a lone surrogate.
  const initials = typeof opts.initials === "string" ? Array.from(opts.initials.trim()).slice(0, 2).join("").toUpperCase() : "";
  const interactive = new Set(Array.isArray(opts.tabs) ? opts.tabs : ["home"]);
  let goal = opts.goal && typeof opts.goal.check === "function" ? opts.goal : null;

  /* ---------- state ---------- */
  let doc = createDoc(opts.doc ?? "");
  let sel = collapsedSel({ p: 0, offset: 0 });
  const history = createHistory();
  let pending = null; // formatting chosen with a bare caret, used by the next typed text
  let marks = false;
  let zoom = 100;
  let painter = null;
  let clip = null;
  let clipEvent = null;
  let spellingMenu = null;
  const lastColours = { highlight: "#FFFF00", font: "#FF0000", shading: null };
  const lastLists = { bullet: "•", number: "1." };
  let lastBorderSide = "bottom";
  let tab = "home";
  let prevTab = "home"; // the tab in use before a contextual tab was opened
  let goalFired = false;
  // True while the goal already holds without the learner having made it hold (a start doc that
  // meets it). `goal` only fires on a false -> true transition, so it is cleared once the goal fails.
  let goalBaseline = false;
  let composing = false;
  let compSel = null;
  let compClick = null; // a click made while composing; the caret goes there once the text commits
  let locked = false;
  let destroyed = false;
  let rendering = false;
  let spotlight = null;
  let backstage = null;
  let demoToken = 0;
  let demoDoc = null;
  let selectedPicture = -1;
  let cancelResize = null;
  let demoPicture = -1;
  let demoAt = null;
  let demoPlaceholder = null;
  let demoSelection = null;
  let demoHistory = null;
  let demoClipboard = null;
  const listeners = new Map();

  function resetDemoTracking() {
    demoPicture = -1;
    demoAt = null;
    demoPlaceholder = null;
    demoSelection = null;
    demoHistory = null;
    demoClipboard = null;
    root.querySelectorAll(".is-demo-placeholder").forEach((el) => el.classList.remove("is-demo-placeholder"));
  }

  /* ---------- DOM ---------- */
  const root = document.createElement("div");
  root.className = "wd";
  root.innerHTML = `${titleBarHtml(title, initials)}${tabRowHtml()}<div class="wr-wrap"></div>
    <div class="wd-canvas"><div class="wd-pagewrap"><div class="wd-page" contenteditable="true" spellcheck="false" role="textbox" aria-multiline="true" aria-label="Document"></div></div></div>
    ${statusHtml()}`;
  el.appendChild(root);
  const page = root.querySelector(".wd-page");
  const canvas = root.querySelector(".wd-canvas");
  const pagewrap = root.querySelector(".wd-pagewrap");
  const ribbonWrap = root.querySelector(".wr-wrap");
  const renderer = createRenderer(page);
  const popups = createPopups(root);
  const observer = new MutationObserver(() => {
    if (!rendering && !composing) queueMicrotask(repaintFromModel);
  });

  /* ---------- events ---------- */
  function emit(name, payload) {
    if (locked) return; // Demonstration actions and restoration are never learner activity.
    for (const fn of listeners.get(name) ?? []) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`word '${name}' listener failed`, err);
      }
    }
  }

  /* ---------- rendering ---------- */
  function render() {
    rendering = true;
    renderer.render(doc);
    page.classList.toggle("is-marks", marks);
    observer.takeRecords();
    rendering = false;
  }
  function writeSel() {
    if (document.activeElement === page || page.contains(document.getSelection()?.anchorNode)) writeSelection(page, sel);
  }
  function repaintFromModel() {
    if (destroyed || composing) return;
    rendering = true;
    renderer.invalidate();
    rendering = false;
    render();
    writeSel();
  }
  function focusPage() {
    if (document.activeElement !== page) page.focus({ preventScroll: true });
    writeSelection(page, sel);
  }

  /* ---------- state for buttons ---------- */
  function computeState() {
    const source = demoDoc ?? doc;
    const r = selRange(clampSel(source, demoSelection ?? sel));
    const collapsed = isCollapsed(r);
    const props = collapsed ? { ...propsAt(source, r.from), ...(pending ?? {}) } : commonProps(slices(source, r).map((s) => s.run));
    const paras = source.p.slice(r.from.p, r.to.p + 1);
    return {
      props,
      collapsed,
      align: common(paras, (p) => p.align),
      list: common(paras, (p) => p.list?.type ?? null),
      line: common(paras, (p) => p.spacing.line),
      before: common(paras, (p) => p.spacing.before),
      after: common(paras, (p) => p.spacing.after),
      indentLeft: common(paras, (p) => p.indent.left),
      indentRight: common(paras, (p) => p.indent.right),
      marks: demoSelection ? demoState.marks : marks,
      painter: Boolean(demoSelection ? demoState.painter : painter),
      clip: Boolean(demoSelection ? demoClipboard : clip),
    };
  }

  function pageCount() {
    const inch = 96;
    return Math.max(1, Math.ceil((page.scrollHeight + 0.5) / (11 * inch)));
  }

  function updateUI() {
    if (destroyed) return;
    const s = computeState();
    const tableTab = root.querySelector('[data-tab="table"].wt-tab');
    const pictureTab = root.querySelector('[data-tab="picture"].wt-tab');
    pictureTab.hidden = !doc.p[selectedPicture]?.picture && demoPicture<0;
    page.querySelectorAll(".wd-picture").forEach(el=>el.classList.toggle("is-selected",Number(el.closest(".wd-p").dataset.p)===(demoPicture>=0?demoPicture:selectedPicture)));
    tableTab.hidden = !doc.p[sel.focus.p]?.cell && !demoDoc?.tables?.length;
    root.querySelector('[data-tab="tabledesign"].wt-tab').hidden = tableTab.hidden;
    // A contextual tab that disappears while it is active hands the ribbon back to the tab used
    // before it (Home if that one is gone too). A demo's own tab changes are put back when it ends.
    if (!locked && CONTEXT_TABS.has(tab) && root.querySelector(`.wt-tab[data-tab="${tab}"]`)?.hidden) {
      const back = RIBBON_TABS.has(prevTab) && !CONTEXT_TABS.has(prevTab) ? prevTab : "home";
      setTab(back);
      return; // setTab re-renders the ribbon and runs updateUI again
    }
    root.querySelectorAll("[data-cmd]").forEach((b) => {
      const cmd = getCommand(b.dataset.cmd);
      if (!cmd) return;
      if (cmd.pressed) b.classList.toggle("is-on", Boolean(cmd.pressed(s)));
      if (cmd.disabled) b.classList.toggle("is-disabled", Boolean(cmd.disabled(s)));
    });
    root.querySelectorAll('[data-combo="font"]').forEach((i) => { if (document.activeElement !== i) i.value = fontLabel(s.props.font); });
    root.querySelectorAll('[data-combo="size"]').forEach((i) => { if (document.activeElement !== i) i.value = s.props.size ?? ""; });
    root.querySelectorAll('[data-bar="highlight"]').forEach((b) => (b.style.background = lastColours.highlight));
    root.querySelectorAll('[data-bar="font"]').forEach((b) => (b.style.background = lastColours.font));
    root.querySelectorAll('[data-bar="shading"]').forEach((b) => (b.style.background = lastColours.shading ?? "transparent"));
    root.querySelector('[data-cmd="qat.undo"]').classList.toggle("is-disabled", !history.canUndo);
    root.querySelector('[data-cmd="qat.redo"]').classList.toggle("is-disabled", !history.canRedo);
    root.querySelectorAll(".wr-style[data-arg]").forEach((t) => t.classList.toggle("is-on", t.dataset.arg === "Normal"));
    const spin = { indentLeft: [s.indentLeft, '"'], indentRight: [s.indentRight, '"'], spaceBefore: [s.before, " pt"], spaceAfter: [s.after, " pt"] };
    root.querySelectorAll("[data-spin]").forEach((i) => {
      const [v, unit] = spin[i.dataset.spin];
      i.value = v === undefined ? "" : `${v}${unit}`;
    });
    const total = wordCount(doc);
    const r = selRange(sel);
    const selWords = isCollapsed(r) ? 0 : slices(doc, r).map((x) => x.run.text).join(" ").match(/\S+/g)?.length ?? 0;
    root.querySelector('[data-status="words"]').textContent = selWords ? `${selWords} of ${total} words` : `${total} ${total === 1 ? "word" : "words"}`;
    const caretTop = caretRect(page, sel.focus).top - page.getBoundingClientRect().top;
    const pages = pageCount();
    const at = Math.min(pages, Math.max(1, Math.floor(caretTop / (11 * 96 * (zoom / 100))) + 1));
    root.querySelector('[data-status="page"]').textContent = `Page ${at} of ${pages}`;
    root.classList.toggle("is-painting", Boolean(painter));
  }

  /* ---------- changes, undo, goal ---------- */
  function progressOf(d) {
    try {
      const v = Number(goal.progress(d));
      return Number.isFinite(v) ? v : 0;
    } catch (err) {
      console.error("goal.progress failed", err);
      return 0;
    }
  }
  function goalMet(d) {
    try {
      return Boolean(goal.check(d));
    } catch (err) {
      console.error("goal.check failed", err);
      return false;
    }
  }

  function resetGoalState() {
    goalFired = false;
    goalBaseline = Boolean(goal) && goalMet(doc);
  }

  function evaluateGoal(prev, next, cmd, meta) {
    if (!goal) return;
    const met = goalMet(next);
    if (!met) goalBaseline = false;
    if (met && !goalFired && !goalBaseline) {
      goalFired = true;
      popups.closeToast();
      emit("goal", { doc: next });
      return;
    }
    if (!cmd || met || cmd.level !== "a") return;
    if (typeof goal.progress !== "function") return;
    const before = progressOf(prev);
    const after = progressOf(next);
    const word = meta.word;
    const fx = cmd.effectName;
    if (after < before - 1e-9) {
      emit("wrong", { lastCommand: cmd.id, effectName: fx, nearly: Boolean(word) });
      // A toggle that switched a format off (Bold on bold text) must not be described as switching it on.
      const name = cmd.label;
      const isDocAction = cmd.id.startsWith("table.") || cmd.id.startsWith("layout.") || cmd.id.startsWith("insert.") || cmd.id.startsWith("picture.") || cmd.id.startsWith("qat.");
      let pair;
      if (meta.removed) pair = word ? ws("nearlyWrongOff", { word, name }) : ws("wrongOff", { name });
      else if (isDocAction) pair = ws("wrongAction", { effect: fx.en }, { effect: fx.vi });
      else pair = word ? ws("nearlyWrong", { word, effect: fx.en }, { word, effect: fx.vi }) : ws("wrong", { effect: fx.en }, { effect: fx.vi });
      popups.toast(pair, { undo: () => undo() });
    } else if (word && after > before + 1e-9) {
      // The caret-in-word case helped, but only one word changed.
      popups.toast(ws("nearlyPart", { word }), { undo: () => undo() });
    } else if (Math.abs(after - before) <= 1e-9) {
      // Step progress is discrete, so most tries leave it unchanged. Tell the two cases apart.
      const full = meta.full;
      if (word && full && (goalMet(full) || progressOf(full) > before + 1e-9)) {
        popups.toast(ws("nearlyPart", { word }), { undo: () => undo() });
      } else if (typeof goal.stepAllowsCommand === "function" && !goal.stepAllowsCommand(cmd.id)) {
        emit("wrong", { lastCommand: cmd.id, effectName: fx, nearly: false });
        const isDocAction = cmd.id.startsWith("table.") || cmd.id.startsWith("layout.") || cmd.id.startsWith("insert.") || cmd.id.startsWith("picture.") || cmd.id.startsWith("qat.");
        const pair = meta.removed
          ? ws("wrongOff", { name: cmd.label })
          : isDocAction
            ? ws("wrongAction", { effect: fx.en }, { effect: fx.vi })
            : ws("wrong", { effect: fx.en }, { effect: fx.vi });
        popups.toast(pair, { undo: () => undo() });
      }
    }
  }

  /** Scroll the canvas just enough to show the caret (beforeinput is cancelled, so the browser never does). */
  function scrollCaretIntoView() {
    if (!isCollapsed(selRange(sel))) return; // formatting a selection keeps the view where it is
    const r = caretRect(page, sel.focus);
    const c = canvas.getBoundingClientRect();
    const m = 24;
    if (r.bottom > c.bottom - m) canvas.scrollTop += r.bottom - (c.bottom - m);
    else if (r.top < c.top + m) canvas.scrollTop -= c.top + m - r.top;
    if (r.right > c.right - m) canvas.scrollLeft += r.right - (c.right - m);
    else if (r.left < c.left + m) canvas.scrollLeft -= c.left + m - r.left;
  }

  function commit(next, { id, label, group = null, newSel = null, cmd = null, word = null, wasPressed = false, full = null }) {
    const prev = doc;
    history.record({ doc: prev, sel }, label, group);
    if (!group) history.seal();
    doc = next;
    sel = clampSel(next, newSel ?? sel);
    const inserted = id === "insert.pictures.choose" && Boolean(doc.p[sel.focus.p]?.picture);
    if (inserted) selectedPicture=sel.focus.p;
    else if (!doc.p[selectedPicture]?.picture) selectedPicture=-1;
    pending = null;
    render();
    writeSel();
    scrollCaretIntoView();
    // Word opens Picture Format by itself only right after a picture is inserted.
    if (inserted) setTab("picture");
    updateUI();
    emit("change", { doc, prevDoc: prev, lastCommand: id });
    // A pressed button that is no longer pressed means the command switched its format off.
    const removed = Boolean(wasPressed && cmd?.pressed && !cmd.pressed(computeState()));
    evaluateGoal(prev, next, cmd, { word, removed, full });
  }

  function restore(entry, id) {
    const prev = doc;
    doc = entry.doc;
    selectedPicture=-1;
    sel = clampSel(doc, entry.sel);
    pending = null;
    render();
    writeSel();
    scrollCaretIntoView();
    updateUI();
    emit("change", { doc, prevDoc: prev, lastCommand: id });
    evaluateGoal(prev, doc, null, {});
  }
  function undo() {
    if (locked || destroyed) return false;
    const entry = history.undo({ doc, sel });
    if (!entry) return false;
    restore(entry, "qat.undo");
    return true;
  }
  function redo() {
    if (locked || destroyed) return false;
    const entry = history.redo({ doc, sel });
    if (!entry) return false;
    restore(entry, "qat.redo");
    return true;
  }

  /* ---------- Insert › Pictures windows (This Device, Stock Images, Online Pictures) ---------- */
  // The windows live in picture-dialogs.js (layout, demo ids). Each resolves with a picture id; the insert
  // itself goes through `insert.pictures.choose`, so undo, goals and Picture Format work as for any command.
  const pictureDialogs = createPictureDialogs({ root, popups, isLocked: () => locked });
  function openPictureDialog(kind) {
    const shown = pictureDialogs.open(kind);
    applySpotlight();
    return shown
      .then((id) => {
        if (destroyed || locked) return;
        focusPage();
        applySpotlight();
        if (typeof id === "string" && PICTURES.some((p) => p.id === id)) return exec("insert.pictures.choose", id);
      })
      .catch((err) => console.error("picture window failed", err));
  }

  /* ---------- ui surface handed to commands ---------- */
  const ui = {
    toast: (key, o) => popups.toast(ws(key), o),
    note: (key, anchor) => popups.note(ws(key), anchor),
    pictureDialog: openPictureDialog,
    clipboard: () => clip,
    setClipboard(frag) {
      clip = frag;
      if (clipEvent) clipEvent.clipboardData?.setData("text/plain", frag.text);
      else navigator.clipboard?.writeText?.(frag.text).catch(() => {});
    },
    lastColour(kind, value) {
      if (value !== undefined) lastColours[kind] = value;
      return lastColours[kind];
    },
    lastList(type, value) {
      if (value !== undefined) lastLists[type] = value;
      return lastLists[type];
    },
    lastBorder(value) {
      if (value !== undefined && value !== "none") lastBorderSide = value;
      return lastBorderSide;
    },
    painterActive: () => Boolean(painter),
    startPainter(props) {
      painter = props;
      popups.note(ws("painterOn"), root.querySelector('[data-cmd="home.clipboard.painter"]'));
      updateUI();
    },
    stopPainter() {
      painter = null;
      updateUI();
    },
    toggleMarks() {
      marks = !marks;
      render();
      updateUI();
    },
    selectAll() {
      sel = selectAll(doc);
      focusPage();
      updateUI();
    },
    zoom: () => zoom,
    setZoom,
    // Dialogs take the focus; give it back to the page (with the model selection) when they close.
    dialog: (name) =>
      openDialog(name, dialogEnv).finally(() => {
        if (!destroyed && !popups.dialogOpen && !backstage) focusPage();
      }),
    undoList: (anchor) => {
      const labels = history.undoLabels().slice(0, 12);
      if (!labels.length) return popups.toast(ws("nothingToUndo"));
      const menu = popups.openMenu(anchor, labels.map((l, i) => ({ cmd: "qat.undoTo", arg: i + 1, label: l })));
      menu.classList.add("wm-undolist");
    },
    backstage: (pageId) => openFile(pageId),
    newDocument: () => newDocument(null),
    openMenuFor: (id) => openMenuFor(id, root.querySelector(`[data-menu="${id}"]`)),
  };
  const dialogEnv = {
    popups,
    doc: () => doc,
    sel: () => sel,
    state: computeState,
    clipboard: () => clip,
    pages: pageCount,
  };

  function setZoom(z, notify = true) {
    const before = zoom;
    zoom = Math.max(30, Math.min(300, Math.round(Number(z) || 100)));
    pagewrap.style.zoom = String(zoom / 100);
    root.querySelector(".wd-zl").textContent = `${zoom}%`;
    root.querySelector(".wd-zr").value = String(zoom <= 100 ? ((zoom - 30) / 70) * 50 : 50 + ((zoom - 100) / 200) * 50);
    updateUI();
    // Zoom is a view change, not a document change, but mission and item checks re-run on `change`.
    if (notify && zoom !== before) emit("change", { doc, prevDoc: doc, lastCommand: "status.zoom" });
  }

  /* ---------- command execution ---------- */
  function effectiveLevel(cmd) {
    if (cmd.level === "c") return "c";
    if (RIBBON_TABS.has(cmd.tab) && !interactive.has(cmd.tab)) return "c";
    return cmd.level;
  }

  async function exec(id, arg, { anchor = null, origin = "click" } = {}) {
    if (locked || destroyed) return;
    if (id === "qat.undoTo") {
      emit("command", { id, level: "a", effectName: getCommand("qat.undo")?.effectName ?? EFFECT_NAMES.undo });
      for (let n = Number(arg) || 1; n > 0; n--) if (!undo()) break;
      return;
    }
    if (id.startsWith("spelling.")) {
      const suggestion = id.slice(9);
      const match = spellingMenu;
      spellingMenu = null;
      if (!match?.suggestions.includes(suggestion)) return;
      const result = insertText(deleteRange(doc, match.from, match.to), match.from, suggestion);
      const effectName = { en: "corrected the spelling", vi: "sửa chính tả" };
      emit("command", { id, level: "a", effectName });
      commit(result, { id, label: suggestion, newSel: collapsedSel({ p: match.from.p, offset: match.from.offset + suggestion.length }), cmd: { level: "a", effectName } });
      focusPage();
      return;
    }
    const cmd = getCommand(id);
    if (!cmd) {
      console.warn(`unknown command ${id}`);
      return;
    }
    const level = effectiveLevel(cmd);
    emit("command", { id, level, effectName: cmd.effectName });
    if (level === "c") {
      popups.toast(ws("levelC"));
      return;
    }
    const ctx = { arg, ui, anchor, origin, state: computeState(), props: computeState().props };
    if (level === "b") {
      try {
        await cmd.popup?.(ctx);
      } catch (err) {
        console.error(`command ${id} popup failed`, err);
      }
      return;
    }
    if (cmd.special === "undo") return void (undo() || popups.toast(ws("nothingToUndo")));
    if (cmd.special === "redo") return void (redo() || popups.toast(ws("nothingToRedo")));
    if (cmd.prompt && arg === undefined) {
      const value = await cmd.prompt(ctx);
      if (value == null || destroyed) return;
      ctx.arg = value;
    }
    const raw = selRange(sel);
    let target = raw;
    let word = null;
    if (cmd.scope === "chars" && isCollapsed(raw)) {
      const w = wordAround(doc, raw.from);
      if (!w) {
        const patch = cmd.pending?.(computeState().props, ctx);
        if (patch) {
          pending = { ...(pending ?? {}), ...patch };
          updateUI();
        }
        return;
      }
      target = w;
      word = doc.p[w.from.p].text.slice(w.from.offset, w.to.offset);
    } else if (cmd.scope === "paras") {
      let pTo = raw.to.p;
      if (!isCollapsed(raw) && raw.to.offset === 0 && pTo > raw.from.p) pTo -= 1;
      target = { from: { p: raw.from.p, offset: 0 }, to: { p: pTo, offset: doc.p[pTo].length } };
    }
    const s = { anchor: target.from, focus: target.to, from: target.from, to: target.to, collapsed: isCollapsed(target) };
    const wasPressed = Boolean(cmd.pressed?.(ctx.state));
    let result;
    try {
      result = cmd.run(doc, s, ctx);
    } catch (err) {
      console.error(`command ${id} failed`, err);
      return;
    }
    const next = result && Array.isArray(result.p) ? result : result?.doc;
    if (!next || !Array.isArray(next.p)) {
      console.error(`command ${id} returned no document`);
      return;
    }
    if (next !== doc) {
      // A caret-in-word format only touched one word: see what the whole paragraph would have scored.
      let full = null;
      if (word && goal) {
        try {
          const p = target.from.p;
          const all = { from: { p, offset: 0 }, to: { p, offset: doc.p[p].length } };
          const r = cmd.run(doc, { anchor: all.from, focus: all.to, from: all.from, to: all.to, collapsed: false }, ctx);
          full = r && Array.isArray(r.p) ? r : r?.doc ?? null;
        } catch {
          full = null;
        }
      }
      commit(next, { id, label: cmd.label, newSel: result.sel ?? null, cmd: { ...cmd, level }, word, wasPressed, full });
    }
    else if (result.sel) {
      sel = clampSel(doc, result.sel);
      writeSel();
      updateUI();
    } else updateUI();
    if (origin !== "key" && !popups.dialogOpen && !root.contains(document.activeElement?.closest?.(".wr-combo"))) focusPage();
  }

  // A menu button inside a folded group (or its flyout) has no place on screen once the menu opens: the
  // flyout closes and the ribbon copy is hidden. The menu then hangs under the folded group's button.
  function menuAnchor(el) {
    const fold = el?.closest?.(".wm-fold");
    if (fold) return fold._anchor ?? el;
    const group = el?.closest?.(".wr-group.is-folded");
    return group?.querySelector("[data-expand]") ?? el;
  }
  function openMenuFor(id, rawAnchor) {
    const anchor = menuAnchor(rawAnchor);
    const cmd = getCommand(id);
    if (!cmd || locked) return;
    const level = effectiveLevel(cmd);
    if (popups.menuOpen && rawAnchor?.classList.contains("is-open")) {
      popups.closeMenu();
      return;
    }
    if (level === "c" || !cmd.menu) {
      if (level === "c") {
        emit("command", { id, level, effectName: cmd.effectName, menu: true });
        popups.toast(ws("levelC"));
      } else exec(id, undefined, { anchor });
      return;
    }
    emit("command", { id, level: "b", effectName: cmd.effectName, menu: true });
    const ctx = { ui, state: computeState(), anchor };
    popups.openMenu(anchor, cmd.menu(ctx));
  }

  /* ---------- tabs and ribbon ---------- */
  function openFoldedGroup(btn) {
    if (popups.menuOpen && btn.classList.contains("is-open")) return popups.closeMenu();
    const group = btn.closest(".wr-group");
    const id = btn.dataset.expand;
    emit("command", { id, level: "b", effectName: { en: `open ${id}`, vi: `mở ${id}` }, menu: true });
    const menu = popups.openMenu(btn, [], { className: "wm-fold" });
    menu.innerHTML = `<div class="wr-gbody">${group.querySelector(".wr-gbody").innerHTML}</div>`;
    const r = popups.relRect(btn);
    const R = root.getBoundingClientRect();
    menu.style.left = `${Math.max(4, Math.min(R.width - menu.offsetWidth - 4, r.x))}px`;
    updateUI();
  }
  function renderRibbon() {
    ribbonWrap.innerHTML = ribbonHtml(tab);
    fitRibbon(ribbonWrap.firstElementChild);
    root.querySelectorAll(".wt-tab").forEach((t) => {
      const on = t.dataset.tab === tab;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", String(on));
    });
    applySpotlight();
    updateUI();
  }
  function setTab(id) {
    if (id === "file") return openFile("home");
    if (!RIBBON_TABS.has(id) || id === tab) return;
    if (CONTEXT_TABS.has(id) && !CONTEXT_TABS.has(tab)) prevTab = tab;
    tab = id;
    popups.closeAll();
    renderRibbon();
  }
  function newDocument(template) {
    if (locked || destroyed) return;
    const prev = doc;
    doc = template ? templateDoc(template) : createDoc("");
    sel = collapsedSel({ p: 0, offset: 0 });
    history.clear(); pending = null; selectedPicture = -1;
    clearSavedDocument(root);
    title = "Document1";
    root.querySelector(".wd-name").innerHTML = `${esc(title)}&nbsp; - &nbsp;Word`;
    backstage?.close();
    render(); focusPage(); updateUI();
    const id = template ? `file.new.template.${template}` : "file.new.blank";
    emit("command", { id, level: "a", effectName: {en:"open a new document",vi:"mở văn bản mới"} });
    emit("change", {doc, prevDoc: prev, lastCommand:id});
    evaluateGoal(prev, doc);
  }
  function openFile(pageId) {
    if (backstage) return backstage.show(pageId);
    popups.closeAll();
    emit("command", { id: "file.open", level: "b", effectName: getCommand("file.open")?.effectName });
    backstage = openBackstage(root, pageId, {
      title: () => title,
      doc: () => demoDoc ?? doc,
      newDocument,
      printed(copies) {
        if (locked || destroyed) return;
        emit("command", {id:`file.print.copies.${copies}`, level:"a", effectName:{en:"print copies",vi:"in số bản"}});
        backstage?.close();
        popups.toast({en:`Practice complete: ${copies} ${copies === 1 ? 'copy' : 'copies'} sent to the classroom printer. No paper is printed.`,vi:`Đã thực hành in ${copies} bản trên máy in của lớp. Không in ra giấy.`});
        emit("change", {doc, prevDoc:doc, lastCommand:"file.print.submit"});
      },
      // The Save As page reports a finished save: the title bar takes the new name, then `saved` fires.
      saved({ folder, name }) {
        title = name;
        const nameEl = root.querySelector(".wd-name");
        if (nameEl) nameEl.innerHTML = `${esc(title)}&nbsp; - &nbsp;Word`;
        emit("saved", { folder: [...folder], name });
      },
      onCommand(id, level) {
        emit("command", { id, level, effectName: getCommand(id)?.effectName ?? { en: id, vi: id } });
        if (level === "c") popups.toast(ws("levelC"));
      },
      onClose() {
        backstage = null;
        focusPage();
      },
    });
  }

  /* ---------- spotlight ---------- */
  const spotLayer = document.createElement("div");
  spotLayer.className = "wg-spotlayer";
  root.appendChild(spotLayer);

  function applySpotlight() {
    root.querySelectorAll(".is-spot-target,.is-spot-btn").forEach((x) => x.classList.remove("is-spot-target", "is-spot-btn"));
    spotLayer.replaceChildren();
    root.classList.toggle("is-spot", Boolean(spotlight));
    if (!spotlight) return;
    const parts = spotlight.split(".");
    // The open picture window's Insert button; with no window open, Insert › Illustrations › Pictures,
    // where the route to it starts.
    const pickerBtn = spotlight === PICTURE_INSERT ? pictureDialogs.insertButton() : null;
    const groupId = spotlight === PICTURE_INSERT ? "insert.illustrations" : parts.slice(0, 2).join(".");
    const g = pickerBtn ?? root.querySelector(`[data-group="${groupId}"]`);
    if (!g) return;
    let target = g;
    if (pickerBtn) pickerBtn.classList.add("is-spot-btn");
    else g.classList.add("is-spot-target");
    if (!pickerBtn && parts.length > 2) {
      const id = spotlight === PICTURE_INSERT ? "insert.pictures" : spotlight;
      const b = g.querySelector(`[data-cmd="${id}"],[data-menu="${id}"]`);
      if (b) {
        b.classList.add("is-spot-btn");
        target = b;
      }
    }
    if (reducedMotion()) {
      const m = document.createElement("div");
      m.className = "wg-marker";
      m.textContent = "1";
      const r = popups.relRect(target);
      m.style.left = `${r.x + r.w / 2 - 18}px`;
      m.style.top = `${r.y + r.h + 4}px`;
      spotLayer.appendChild(m);
    }
  }
  function setSpotlight(id) {
    if (id != null && typeof id !== "string") throw new TypeError("setSpotlight: expected a group id or null");
    spotlight = id || null;
    if (spotlight) {
      const t = spotlight.split(".")[0];
      if (RIBBON_TABS.has(t) && t !== tab) {
        tab = t;
        renderRibbon();
        return;
      }
    }
    applySpotlight();
  }

  /* ---------- typing ---------- */
  function syncSelFromDom() {
    const s = readSelection(page);
    if (s) sel = clampSel(doc, s);
  }

  function typeText(text, range = selRange(sel)) {
    if (!text) return;
    selectedPicture=-1;
    const r = orderRange(range.from, range.to);
    const collapsed = isCollapsed(r);
    const props = collapsed
      ? { ...propsAt(doc, r.from), ...(pending ?? {}) }
      : propsAt(doc, r.from.offset < doc.p[r.from.p].length ? { p: r.from.p, offset: r.from.offset + 1 } : r.from);
    const base = collapsed ? doc : deleteRange(doc, r.from, r.to);
    const next = insertText(base, r.from, text, props);
    const lines = text.split(/\r?\n/);
    const end = lines.length === 1 ? { p: r.from.p, offset: r.from.offset + text.length } : { p: r.from.p + lines.length - 1, offset: lines[lines.length - 1].length };
    commit(next, { id: "doc.type", label: "Typing", group: "type", newSel: collapsedSel(end) });
  }

  function enter() {
    const r = selRange(sel);
    let base = isCollapsed(r) ? doc : deleteRange(doc, r.from, r.to);
    const para = base.p[r.from.p];
    if (!para.length && para.list) {
      commit(applyParaFormat(base, r.from.p, r.from.p, { list: null }), { id: "doc.enter", label: "Typing", group: "type", newSel: collapsedSel(r.from) });
      return;
    }
    base = splitParagraph(base, r.from);
    commit(base, { id: "doc.enter", label: "Typing", group: "type", newSel: collapsedSel({ p: r.from.p + 1, offset: 0 }) });
  }

  function deleteFrom(e) {
    const r = selRange(sel);
    if (!isCollapsed(r)) {
      commit(deleteRange(doc, r.from, r.to), { id: "doc.delete", label: "Delete", group: "delete", newSel: collapsedSel(r.from) });
      return;
    }
    const backward = /Backward/.test(e.inputType);
    const at = r.from;
    if (backward && at.offset === 0 && doc.p[at.p].list) {
      commit(applyParaFormat(doc, at.p, at.p, { list: null }), { id: "doc.delete", label: "Delete", group: "delete" });
      return;
    }
    let range = null;
    const tr = e.getTargetRanges?.()[0];
    if (tr) {
      const a = domToPos(page, tr.startContainer, tr.startOffset);
      const b = domToPos(page, tr.endContainer, tr.endOffset);
      if (a && b && cmpPos(a, b) !== 0) range = orderRange(a, b);
    }
    if (!range) {
      if (backward) {
        if (at.offset > 0) range = { from: { p: at.p, offset: at.offset - 1 }, to: at };
        else if (at.p > 0) range = { from: { p: at.p - 1, offset: doc.p[at.p - 1].length }, to: at };
      } else if (at.offset < doc.p[at.p].length) range = { from: at, to: { p: at.p, offset: at.offset + 1 } };
      else if (at.p < doc.p.length - 1) range = { from: at, to: { p: at.p + 1, offset: 0 } };
    }
    if (!range) return;
    // Same group as typing: "tie", Backspace, "ê" is one undo step, as in Word (Vietnamese
    // keyboards send a Backspace plus a retyped letter for every tone mark).
    commit(deleteRange(doc, range.from, range.to), { id: "doc.delete", label: "Typing", group: "type", newSel: collapsedSel(range.from) });
  }

  const FORMAT_INPUTS = { formatBold: "home.font.bold", formatItalic: "home.font.italic", formatUnderline: "home.font.underline", formatStrikeThrough: "home.font.strike", formatSubscript: "home.font.sub", formatSuperscript: "home.font.sup" };

  function onBeforeInput(e) {
    if (composing || e.inputType === "insertCompositionText") return;
    e.preventDefault();
    if (locked || popups.dialogOpen) return;
    syncSelFromDom();
    const t = e.inputType;
    if (t === "insertText" || t === "insertReplacementText") {
      const text = e.data ?? e.dataTransfer?.getData("text/plain") ?? "";
      const tr = e.getTargetRanges?.()[0];
      let range;
      if (tr && t === "insertReplacementText") {
        const a = domToPos(page, tr.startContainer, tr.startOffset);
        const b = domToPos(page, tr.endContainer, tr.endOffset);
        if (a && b) range = orderRange(a, b);
      }
      typeText(text.replace(/\r?\n/g, "\n"), range);
    } else if (t === "insertParagraph" || t === "insertLineBreak") enter();
    else if (t.startsWith("delete") && t !== "deleteByDrag") deleteFrom(e);
    else if (t === "historyUndo") undo();
    else if (t === "historyRedo") redo();
    else if (FORMAT_INPUTS[t]) exec(FORMAT_INPUTS[t], undefined, { origin: "key" });
  }

  function updateCapsLock(e) {
    if (locked) return;
    const indicator = root.querySelector(".wd-caps");
    indicator.hidden = !e.getModifierState?.("CapsLock");
  }

  function onKeyDown(e) {
    updateCapsLock(e);
    if (locked || popups.dialogOpen) {
      e.preventDefault();
      return;
    }
    if (e.isComposing || composing) return;
    if (e.key === "Escape") {
      selectedPicture=-1; updateUI();
      popups.closeAll();
      if (painter) ui.stopPainter();
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && doc.p[selectedPicture]?.picture) {
      e.preventDefault(); exec("picture.delete",undefined,{origin:"key"}); return;
    }
    if (e.key === "Tab") {
      selectedPicture=-1;
      e.preventDefault();
      const r = selRange(sel);
      const para = doc.p[r.from.p];
      if (para.cell) {
        const c = para.cell;
        const cells = doc.p.map((p,i)=>({p,i})).filter(({p},i,all)=>p.cell?.table===c.table && (i===0 || JSON.stringify(all[i-1].p.cell)!==JSON.stringify(p.cell)));
        const index = cells.findIndex(({p})=>p.cell.row===c.row && p.cell.col===c.col);
        const next = cells[index+(e.shiftKey?-1:1)];
        if (next) { sel= {anchor:{p:next.i,offset:0},focus:{p:next.i,offset:next.p.length}}; focusPage(); updateUI(); }
        else if (!e.shiftKey) { const result=editTable(doc,r.from,"insertBelow"); const p=result.doc.p.findIndex(p=>p.cell?.table===c.table && p.cell.row===c.row+1 && p.cell.col===0); commit(result.doc,{id:"table.insertBelow",label:"Insert row",newSel:collapsedSel({p,offset:0})}); focusPage(); }
        return;
      }
      if ((para.list && r.from.offset === 0) || r.from.p !== r.to.p) exec(e.shiftKey ? "home.paragraph.indentDec" : "home.paragraph.indentInc", undefined, { origin: "key" });
      else if (!e.shiftKey) typeText("\t");
      return;
    }
    const key = shortcutOf(e);
    const clipboardCommand = { "ctrl+c": "home.clipboard.copy", "ctrl+x": "home.clipboard.cut", "ctrl+v": "home.clipboard.paste" }[key];
    if (clipboardCommand && (key !== "ctrl+v" || clip)) {
      e.preventDefault();
      syncSelFromDom();
      exec(clipboardCommand, undefined, { origin: "key" });
      return;
    }
    const id = SHORTCUTS[key];
    if (id) {
      e.preventDefault();
      syncSelFromDom();
      exec(id, undefined, { origin: "key" });
      return;
    }
    // Browser shortcuts that would leave the page: swallow them and report Word's own command.
    const browserKey = e.ctrlKey || e.metaKey ? BROWSER_KEYS[e.key.toLowerCase()] : null;
    if (browserKey) {
      e.preventDefault();
      exec(browserKey, undefined, { origin: "key" });
    }
  }

  function onSelectionChange() {
    if (destroyed || composing || locked) return;
    const s = readSelection(page);
    if (!s) return;
    const next = clampSel(doc, s);
    if (sameSel(next, sel)) return;
    sel = next;
    // The caret left the picture (arrow keys, a click in the text): the picture is deselected.
    if (selectedPicture >= 0 && (sel.anchor.p !== selectedPicture || sel.focus.p !== selectedPicture)) selectedPicture = -1;
    pending = null;
    history.seal();
    updateUI();
  }

  function applyPainterNow() {
    const r = selRange(sel);
    let range = r;
    if (isCollapsed(r)) {
      range = wordAround(doc, r.from);
      if (!range) return;
    }
    const props = painter;
    painter = null;
    const next = applyFormat(doc, range, props);
    const cmd = getCommand("home.clipboard.painter");
    if (next !== doc) commit(next, { id: cmd.id, label: cmd.label, cmd: { ...cmd, level: effectiveLevel(cmd) } });
    else updateUI();
  }

  /* ---------- mouse ---------- */
  function onPageMouseDown(e) {
    if (locked) {
      e.preventDefault();
      return;
    }
    const placeholder=e.target.closest(".wd-placeholder");
    if (placeholder && e.button === 0) {
      e.preventDefault(); popups.closeAll();
      const p=Number(placeholder.dataset.p);
      sel={anchor:{p,offset:0},focus:{p,offset:doc.p[p].length}};
      pending=null; history.seal(); focusPage(); updateUI();
      emit("change", {doc,prevDoc:doc,lastCommand:"placeholder.select"});
      return;
    }
    const picture=e.target.closest(".wd-picture");
    if (picture && e.button===2) {
      // Word selects a picture on right-click too, then shows the picture menu (onContextMenu).
      e.preventDefault();
      const p=Number(picture.closest(".wd-p").dataset.p);
      const changed=p!==selectedPicture;
      popups.closeAll();
      selectedPicture=p; sel=collapsedSel({p,offset:0}); pending=null;
      focusPage(); updateUI();
      if (changed) emit("change", { doc, prevDoc: doc, lastCommand: "picture.select" });
      return;
    }
    if (picture && e.button===0) {
      e.preventDefault();
      const p=Number(picture.closest(".wd-p").dataset.p);
      const changed=p!==selectedPicture || sel.focus.p!==p || sel.anchor.p!==p;
      popups.closeAll();
      selectedPicture=p;
      sel=collapsedSel({p,offset:0}); pending=null; history.seal();
      // Clicking a picture shows Picture Format but keeps the current tab (as in Word).
      focusPage(); updateUI();
      // A selection is not a document change, but mission and revision checks re-run on `change`
      // ("the picture is selected" must tick on the click itself).
      if (changed) emit("change", { doc, prevDoc: doc, lastCommand: "picture.select" });
      const handle=e.target.closest("[data-handle]")?.dataset.handle;
      if (handle) startPictureResize(e,picture,handle);
      else if (["front","behind"].includes(doc.p[p].picture.wrap)) startPictureMove(e,picture);
      return;
    }
    selectedPicture=-1; updateUI();
    if (composing && e.button === 0 && e.detail === 1) {
      // Page-relative, because committing the text may scroll the canvas before compositionend.
      const P = page.getBoundingClientRect();
      compClick = { x: e.clientX - P.left, y: e.clientY - P.top };
    }
    popups.closeAll();
    if (e.button === 2) {
      // Right-click inside the selection keeps it (the menu then acts on it), as in Windows Word.
      syncSelFromDom();
      const pos = posFromPoint(page, e.clientX, e.clientY);
      const r = selRange(sel);
      if (pos && !isCollapsed(r) && cmpPos(pos, r.from) >= 0 && cmpPos(pos, r.to) <= 0) e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    if (e.detail === 2 || e.detail === 3) {
      e.preventDefault();
      const pos = charAtPoint(e.clientX, e.clientY) ?? sel.focus;
      const r = e.detail === 2 ? wordSelectionAt(doc, pos) : { from: { p: pos.p, offset: 0 }, to: { p: pos.p, offset: doc.p[pos.p].length } };
      sel = { anchor: r.from, focus: r.to };
      pending = null;
      focusPage();
      updateUI();
    }
  }
  function pictureMove(picture,element,dx,dy) {
    const scale=zoom/100, frame=element.getBoundingClientRect(), bounds=page.getBoundingClientRect();
    const anchorX=(frame.left-bounds.left)/scale-parseFloat(element.style.left||0);
    const anchorY=(frame.top-bounds.top)/scale-parseFloat(element.style.top||0);
    return {x:Math.round(Math.max(-anchorX,Math.min(bounds.width/scale-anchorX-picture.width,picture.x+dx))),
      y:Math.round(Math.max(-anchorY,Math.min(bounds.height/scale-anchorY-picture.height,picture.y+dy)))};
  }
  function pictureResize(picture,handle,dx,dy) {
    const size=pictureSize(picture,handle,dx,dy);
    if (["front","behind"].includes(picture.wrap)) {
      size.x=picture.x+(handle.includes("w")?picture.width-size.width:0);
      size.y=picture.y+(handle.includes("n")?picture.height-size.height:0);
    }
    return size;
  }
  function startPictureMove(e,element) {
    cancelResize?.();
    const p=selectedPicture, original=doc.p[p].picture, x=e.clientX, y=e.clientY;
    let patch={x:original.x,y:original.y};
    const move=ev=>{
      patch=pictureMove(original,element,(ev.clientX-x)/(zoom/100),(ev.clientY-y)/(zoom/100));
      element.style.left=`${patch.x}px`; element.style.top=`${patch.y}px`;
    };
    const cleanup=()=>{document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);cancelResize=null;};
    const up=()=>{cleanup();if(patch.x!==original.x||patch.y!==original.y) commit(updatePicture(doc,{p},patch),{id:"picture.move",label:"Move Picture"});};
    cancelResize=()=>{cleanup();element.style.left=`${original.x}px`;element.style.top=`${original.y}px`;};
    document.addEventListener("mousemove",move);document.addEventListener("mouseup",up,{once:true});
  }
  function startPictureResize(e,element,handle) {
    cancelResize?.();
    const p=selectedPicture, original=doc.p[p].picture, x=e.clientX,y=e.clientY;
    let size={width:original.width,height:original.height};
    const move=ev=>{size=pictureResize(original,handle,(ev.clientX-x)/(zoom/100),(ev.clientY-y)/(zoom/100)); element.style.width=`${size.width}px`; element.style.height=`${size.height}px`; if(size.x!==undefined){element.style.left=`${size.x}px`;element.style.top=`${size.y}px`;} };
    const cleanup=()=>{document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);cancelResize=null;};
    const up=()=>{cleanup(); if (size.width!==original.width || size.height!==original.height) commit(updatePicture(doc,{p},size),{id:"picture.resize",label:"Resize Picture"});};
    cancelResize=()=>{cleanup();element.style.width=`${original.width}px`;element.style.height=`${original.height}px`;if(["front","behind"].includes(original.wrap)){element.style.left=`${original.x}px`;element.style.top=`${original.y}px`;} };
    document.addEventListener("mousemove",move);document.addEventListener("mouseup",up,{once:true});
  }
  /**
   * Position of the character under a point. posFromPoint returns the nearest caret boundary, so the
   * right half of a letter maps to the offset after it; step back when the point is on that letter.
   */
  function charAtPoint(x, y) {
    const pos = posFromPoint(page, x, y);
    if (!pos || pos.offset === 0) return pos;
    const prev = { p: pos.p, offset: pos.offset - 1 };
    const hit = Array.from(domRange(page, { from: prev, to: pos }).getClientRects()).some(
      (r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
    );
    return hit ? prev : pos;
  }

  function onPageMouseUp() {
    if (!painter || locked) return;
    syncSelFromDom();
    applyPainterNow();
  }

  function openContextMenu(x, y, position = selRange(sel).from) {
    spellingMenu = spellingRanges(demoDoc ?? doc, position.p).find((r) => position.offset >= r.from.offset && position.offset < r.to.offset) ?? null;
    const r = selRange(sel);
    const hasSel = !isCollapsed(r);
    const R = root.getBoundingClientRect();
    const at = { x: x - R.left, y: y - R.top };
    const mini = popups.float(
      `<div class="wr-row">${itemsHtml(MINI_ROW1)}<span class="wr-sep"></span>${itemsHtml([big("context.styles", "text_edit_style_24", "Styles", { menuOnly: false })])}<span class="wr-sep"></span>${itemsHtml([big("context.newComment", "comment_add_24", "New Comment")])}</div>
       <div class="wr-row wm-mini-row2">${itemsHtml(MINI_ROW2)}</div>`,
      { x: at.x - 10, y: at.y - 96 },
      "wm-mini",
    );
    const items = [
      ...((demoDoc??doc).p[position.p]?.cell ? [
        {cmd:"table.insertBelow",label:"Insert Rows Below"},{cmd:"table.insertRight",label:"Insert Columns to the Right"},
        {cmd:"table.deleteRow",label:"Delete Rows"},{cmd:"table.deleteColumn",label:"Delete Columns"},{sep:true},
      ] : []),
      ...(spellingMenu ? [
        { heading: "Spelling" },
        ...spellingMenu.suggestions.map((word) => ({ cmd: `spelling.${word}`, label: word })),
        { sep: true },
      ] : []),
      { searchbox: true, cmd: "context.search", label: "Search the menus" },
      ...(hasSel ? [{ cmd: "context.editor", label: "Review selection in &Editor", icon: "pen_24", iconCls: "wi-blue" }] : []),
      { sep: true },
      { cmd: "home.clipboard.cut", label: "Cu&t", icon: "cut_20", iconCls: "wi-blue", disabled: !hasSel },
      { cmd: "home.clipboard.copy", label: "&Copy", icon: "document_copy_20", disabled: !hasSel },
      { cmd: "home.clipboard.paste", label: "Paste Options:", icon: "clipboard_paste_20", bold: true, inert: true },
      { icons: clip
        ? [{ cmd: "home.clipboard.paste", arg: "keep", icon: "clipboard_paste_20", label: "Keep Source Formatting (K)" }, { cmd: "home.clipboard.paste", arg: "plain", icon: "clipboard_paste_20", label: "Keep Text Only (T)", textOnly: true }]
        : [{ cmd: "home.clipboard.paste", icon: "clipboard_paste_20", label: "Paste", disabled: true }], indent: true },
      { sep: true },
      { cmd: "context.copyLink", label: "&Copy Link to Location...", icon: "document_text_20", iconCls: "wi-blue" },
      { sep: true },
      { cmd: "home.font.dialog", label: "&Font...", leadGlyph: "A" },
      { cmd: "home.paragraph.dialog", label: "&Paragraph...", icon: "text_paragraph_20" },
      { sep: true },
      { cmd: "context.synonyms", label: "Sy&nonyms", submenu: true },
      { cmd: "context.readAloud", label: "&Read Aloud", icon: "read_aloud_20" },
      { cmd: "context.translate", label: "Tran&slate", icon: "translate_20", iconCls: "wi-green" },
      { sep: true },
      { cmd: "context.link", label: "&Link", icon: "link_20", submenu: true },
      { cmd: "context.newComment", label: "New Co&mment", icon: "comment_add_20", iconCls: "wi-greenplus" },
    ];
    const menu = popups.openMenu(null, items, { at: { x: at.x + 2, y: at.y + 2 }, className: "wm-context" });
    keepMiniClear(menu, mini, R);
    updateUI();
  }

  /** The right-click menu on a picture, as in Word 365 (classroom screenshot, 2026-10-26). */
  function openPictureMenu(x, y) {
    const R = root.getBoundingClientRect();
    const at = { x: x - R.left, y: y - R.top };
    const mini = popups.float(`<div class="wr-row">${itemsHtml([big("picture.style", "pic_format", "Style", { menuOnly: true }), big("picture.crop", "pic_size", "Crop")])}</div>`,
      { x: at.x - 10, y: at.y - 70 }, "wm-mini");
    for (const [id, label] of [["changePicture","Change Picture"],["group","Group"],["bringFront","Bring to Front"],["sendBack","Send to Back"],["link","Link"],["saveAs","Save as Picture"],["caption","Insert Caption"],["altText","View Alt Text"],["sizePosition","Size and Position"],["format","Format Picture"],["officeMath","Convert to Office Math"],["editPicture","Edit Picture"],["cut","Cut"],["copy","Copy"]])
      ensureCommand(`picture.menu.${id}`, label);
    const items = [
      { searchbox: true, cmd: "context.search", label: "Search the menus" },
      // Word enables Cut and Copy for a picture; copying pictures is not built, so these answer as level c.
      { cmd: "picture.menu.cut", label: "Cu&t", icon: "cut_20", iconCls: "wi-blue" },
      { cmd: "picture.menu.copy", label: "&Copy", icon: "document_copy_20" },
      { cmd: "home.clipboard.paste", label: "Paste Options:", icon: "clipboard_paste_20", bold: true, inert: true },
      { icons: [{ cmd: "home.clipboard.paste", icon: "clipboard_paste_20", label: "Paste", disabled: !clip }], indent: true },
      { sep: true },
      { cmd: "picture.menu.officeMath", label: "C&onvert to Office Math", disabled: true },
      { cmd: "picture.menu.officeMath", label: "Convert &All to Office Math", disabled: true },
      { sep: true },
      { cmd: "picture.menu.editPicture", label: "&Edit Picture", disabled: true },
      { cmd: "picture.menu.changePicture", label: "Chan&ge Picture", icon: "pic_change", submenu: [{ cmd: "picture.menu.changePicture", label: "From a &File..." }] },
      { sep: true },
      { cmd: "picture.menu.group", label: "&Group", icon: "pic_group", disabled: true },
      { cmd: "picture.menu.bringFront", label: "Bring to F&ront", icon: "pic_front", disabled: true },
      { cmd: "picture.menu.sendBack", label: "Send to Bac&k", icon: "pic_back", disabled: true },
      { sep: true },
      { cmd: "picture.menu.link", label: "&Link", icon: "link_20", submenu: [{ cmd: "picture.menu.link", label: "&Insert Link" }] },
      { cmd: "picture.menu.saveAs", label: "&Save as Picture..." },
      { sep: true },
      { cmd: "picture.menu.caption", label: "I&nsert Caption...", icon: "pic_caption" },
      { cmd: "picture.wrap", label: "&Wrap Text", icon: "wrap_square", submenu: WRAP_MENU() },
      { sep: true },
      { cmd: "picture.menu.altText", label: "View &Alt Text...", icon: "pic_alt" },
      { cmd: "picture.menu.sizePosition", label: "Si&ze and Position...", icon: "pic_size" },
      { cmd: "picture.menu.format", label: "F&ormat Picture...", icon: "pic_format" },
    ];
    const menu = popups.openMenu(null, items, { at: { x: at.x + 2, y: at.y + 2 }, className: "wm-context wm-picmenu" });
    keepMiniClear(menu, mini, R);
    updateUI();
  }

  /** Keep the mini toolbar clear of the menu: above it when there is room, else beside it. */
  function keepMiniClear(menu, mini, R) {
    const m = popups.relRect(menu);
    const t = popups.relRect(mini);
    const overlaps = t.y < m.y + m.h && t.y + t.h > m.y && t.x < m.x + m.w && t.x + t.w > m.x;
    if (!overlaps) return;
    if (m.y - t.h - 6 >= 4) mini.style.top = `${m.y - t.h - 6}px`;
    else {
      const right = m.x + m.w + 6;
      mini.style.left = `${right + t.w <= R.width - 4 ? right : Math.max(4, m.x - t.w - 6)}px`;
      mini.style.top = `${Math.max(4, m.y)}px`;
    }
  }

  function onContextMenu(e) {
    e.preventDefault();
    if (locked) return;
    const pictureEl = e.target.closest?.(".wd-picture");
    if (pictureEl && selectedPicture >= 0) return openPictureMenu(e.clientX, e.clientY);
    const pos = charAtPoint(e.clientX, e.clientY);
    const r = selRange(sel);
    if (pos && (isCollapsed(r) || cmpPos(pos, r.from) < 0 || cmpPos(pos, r.to) > 0)) {
      sel = collapsedSel(pos);
      focusPage();
    }
    openContextMenu(e.clientX, e.clientY, pos ?? r.from);
  }

  /* ---------- clipboard events ---------- */
  function withClipEvent(e, fn) {
    clipEvent = e;
    try {
      fn();
    } finally {
      clipEvent = null;
    }
  }
  function onCopy(e) {
    e.preventDefault();
    syncSelFromDom();
    withClipEvent(e, () => exec("home.clipboard.copy", undefined, { origin: "key" }));
  }
  function onCut(e) {
    e.preventDefault();
    syncSelFromDom();
    withClipEvent(e, () => exec("home.clipboard.cut", undefined, { origin: "key" }));
  }
  function onPaste(e) {
    e.preventDefault();
    if (locked || popups.dialogOpen) return;
    syncSelFromDom();
    const text = (e.clipboardData?.getData("text/plain") ?? "").replace(/\r\n/g, "\n");
    const norm = (s) => s.replace(/\s+/g, " ").trim();
    if (clip && (!text || norm(text) === norm(clip.text))) {
      exec("home.clipboard.paste", undefined, { origin: "key" });
      return;
    }
    if (!text) return;
    const tmp = createDoc(text);
    clip = fragment(tmp, { from: { p: 0, offset: 0 }, to: docEnd(tmp) });
    exec("home.clipboard.paste", "plain", { origin: "key" });
  }

  /* ---------- composition (IME) ---------- */
  function onCompositionStart() {
    if (locked) return;
    syncSelFromDom();
    composing = true;
    compSel = sel;
    compClick = null;
  }
  function onCompositionEnd(e) {
    if (!composing) return;
    composing = false;
    const range = selRange(compSel ?? sel);
    compSel = null;
    rendering = true;
    renderer.invalidate();
    rendering = false;
    sel = { anchor: range.from, focus: range.to };
    if (e.data) typeText(e.data, range);
    else repaintFromModel();
    // A click that ended the composition must not lose its caret position to the commit above.
    const click = compClick;
    compClick = null;
    const P = page.getBoundingClientRect();
    const pos = click && posFromPoint(page, P.left + click.x, P.top + click.y);
    if (pos) {
      sel = collapsedSel(clampPos(doc, pos));
      history.seal();
      writeSel();
      updateUI();
    }
  }

  /* ---------- root clicks ---------- */
  function onRootMouseDown(e) {
    const t = e.target;
    if (locked && !t.closest(".wg-yourturn,.wg-again,.wg-hint")) {
      e.preventDefault();
      return;
    }
    if (popups.menuOpen && !t.closest(".wm-menu,.wm-mini,[data-menu]")) popups.closeMenu();
    if (!t.closest(".wm-mini,.wm-menu") && !page.contains(t)) popups.closeFloat();
    if (page.contains(t)) return;
    if (t.closest("input,textarea,select,label")) return;
    e.preventDefault(); // keep the page focus and selection while using the ribbon
  }
  function onRootClick(e) {
    if (locked) return;
    const t = e.target;
    const tabBtn = t.closest(".wt-tab");
    if (tabBtn) {
      emit("command", { id: `tab.${tabBtn.dataset.tab}`, level: "b", effectName: { en: `open the ${tabBtn.textContent} tab`, vi: `mở thẻ ${tabBtn.textContent}` } });
      setTab(tabBtn.dataset.tab);
      return;
    }
    const fold = t.closest("[data-expand]");
    if (fold) {
      openFoldedGroup(fold);
      return;
    }
    const menuBtn = t.closest("[data-menu]");
    if (menuBtn && root.contains(menuBtn)) {
      openMenuFor(menuBtn.dataset.menu, menuBtn);
      return;
    }
    const btn = t.closest("[data-cmd]");
    if (!btn || !root.contains(btn) || btn.matches("[data-spin] *")) return;
    if (btn.closest(".wm-item.is-inert")) return;
    const inMenu = Boolean(btn.closest(".wm-menu,.wm-mini"));
    const inDialog = Boolean(btn.closest(".wd-dlg"));
    if (inMenu) {
      popups.closeMenu();
      popups.closeFloat();
    }
    const id = btn.dataset.cmd;
    const cmd = getCommand(id);
    if (inDialog && cmd && effectiveLevel(cmd) === "a") popups.closeDialog(null);
    exec(id, decArg(btn), { anchor: btn });
  }

  /* ---------- combos (font name and size boxes) ---------- */
  function onComboKey(e) {
    const input = e.target.closest?.("[data-combo]");
    if (!input) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const v = input.value.trim();
      if (input.dataset.combo === "size") {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 1 && n <= 1638) exec("home.font.size", Math.round(n * 2) / 2);
        else updateUI();
      } else {
        const name = v.replace(/\s*\((Body|Headings)\)\s*$/i, "").toLowerCase();
        const font = FONTS.find((f) => f.toLowerCase() === name);
        if (font) exec("home.font.name", font);
        else updateUI();
      }
      popups.closeMenu();
      focusPage();
    } else if (e.key === "Escape") {
      e.preventDefault();
      updateUI();
      focusPage();
    }
  }
  function onComboFocus(e) {
    const input = e.target.closest?.("[data-combo]");
    if (!input) return;
    input.select();
    // The mouseup that follows a focusing click would drop the selection; skip that one.
    input.addEventListener("mouseup", (ev) => ev.preventDefault(), { once: true });
  }
  function onComboBlur(e) {
    if (e.target.closest?.("[data-combo]")) setTimeout(updateUI, 0);
  }

  function onZoomInput(e) {
    const v = Number(e.target.value);
    const z = v <= 50 ? 30 + (v / 50) * 70 : 100 + ((v - 50) / 50) * 200;
    exec("status.zoom", Math.round(z / 5) * 5);
  }

  function onDocMouseDown(e) {
    if (!root.contains(e.target)) {
      popups.closeMenu();
      popups.closeFloat();
    }
  }
  function onResize() {
    popups.closeAll();
    const card = ribbonWrap.firstElementChild;
    if (card) fitRibbon(card);
    applySpotlight();
  }

  /* ---------- demo (Show me): drawn by js/demo/player.js, never touches the document ---------- */
  let demoState = null;

  function demoRange() {
    return selRange(clampSel(demoDoc ?? doc, demoSelection ?? sel));
  }
  function demoCommit(next, selection = demoSelection, label = "Demo") {
    const source = demoDoc ?? doc;
    if (next !== source) demoHistory?.record({ doc: source, sel: demoSelection ?? sel }, label);
    demoDoc = next;
    demoSelection = clampSel(next, selection ?? sel);
    demoAt = demoSelection.focus;
    renderer.render(next);
    observer.takeRecords();
    updateUI();
  }
  function demoType(text) {
    const source = demoDoc ?? doc;
    const range = demoPlaceholder ?? demoRange();
    demoPlaceholder = null;
    const next = insertText(deleteRange(source, range.from, range.to), range.from, text);
    const lines = text.split("\n");
    const at = { p: range.from.p + lines.length - 1, offset: lines.length > 1 ? lines.at(-1).length : range.from.offset + text.length };
    demoCommit(next, collapsedSel(at), "Typing");
  }
  // Run the same document commands as the learner, using only temporary state. In particular,
  // clipboard and history operations must never reach the system clipboard or learner history.
  function demoCommand(id, arg) {
    const source = demoDoc ?? doc;
    if (id === "qat.undo" || id === "qat.redo") {
      const entry = demoHistory?.[id === "qat.undo" ? "undo" : "redo"]({ doc: source, sel: demoSelection ?? sel });
      if (entry) {
        demoDoc = entry.doc; demoSelection = entry.sel; demoAt = entry.sel.focus;
        renderer.render(demoDoc); observer.takeRecords(); updateUI();
      }
      return;
    }
    if (id.startsWith("spelling.")) {
      const match = spellingMenu;
      const text = id.slice(9);
      if (match?.suggestions.includes(text)) {
        demoSelection = { anchor: match.from, focus: match.to };
        demoType(text);
      }
      spellingMenu = null;
      return;
    }
    if (id === "home.editing.selectAll") {
      demoSelection = selectAll(source);
      writeSelection(page, demoSelection);
      return;
    }
    const cmd = getCommand(id);
    if (!cmd?.run) return;
    let range = demoRange();
    if (cmd.scope === "chars" && isCollapsed(range)) range = wordAround(source, range.from) ?? range;
    if (cmd.scope === "paras") {
      const pTo = !isCollapsed(range) && range.to.offset === 0 && range.to.p > range.from.p ? range.to.p - 1 : range.to.p;
      range = { from: { p: range.from.p, offset: 0 }, to: { p: pTo, offset: source.p[pTo].length } };
    }
    const demoUI = {
      ...ui,
      clipboard: () => demoClipboard,
      setClipboard: (value) => { demoClipboard = value; },
      setZoom: (value) => setZoom(value, false),
      lastColour: (kind, value) => {
        if (value !== undefined) demoState.colours[kind] = value;
        return demoState.colours[kind];
      },
      lastList: (kind, value) => {
        if (value !== undefined) demoState.lists[kind] = value;
        return demoState.lists[kind];
      },
      lastBorder: (value) => {
        if (value !== undefined && value !== "none") demoState.border = value;
        return demoState.border;
      },
      painterActive: () => Boolean(demoState.painter),
      startPainter: (props) => { demoState.painter = props; },
      stopPainter: () => { demoState.painter = null; },
      toggleMarks: () => { demoState.marks = !demoState.marks; page.classList.toggle("is-marks", demoState.marks); },
    };
    const target = { ...range, anchor: range.from, focus: range.to, collapsed: isCollapsed(range) };
    const result = cmd.run(source, target, { arg, ui: demoUI, props: propsAt(source, range.from), state: computeState(), origin: "key" });
    const next = result?.doc ?? result;
    if (next?.p) demoCommit(next, result.sel ?? demoSelection, cmd.label);
  }
  function demoKey(combo) {
    const shortcut = { "ctrl+c": "home.clipboard.copy", "ctrl+x": "home.clipboard.cut", "ctrl+v": "home.clipboard.paste", ...SHORTCUTS }[combo.toLowerCase()];
    if (shortcut) { demoCommand(shortcut); return true; }
    const source = demoDoc ?? doc;
    let range = demoPlaceholder ?? demoRange();
    if (combo === "Backspace" || combo === "Delete") {
      if (demoPicture >= 0) { demoDeletePicture(); return true; }
      if (isCollapsed(range)) {
        const at = range.from;
        if (combo === "Backspace") range = { from: at.offset ? { p: at.p, offset: at.offset - 1 } : at.p ? { p: at.p - 1, offset: source.p[at.p - 1].length } : at, to: at };
        else range = { from: at, to: at.offset < source.p[at.p].length ? { p: at.p, offset: at.offset + 1 } : at.p < source.p.length - 1 ? { p: at.p + 1, offset: 0 } : at };
      }
      demoPlaceholder = null;
      demoCommit(deleteRange(source, range.from, range.to), collapsedSel(range.from), "Delete");
      return true;
    }
    if (combo === "Enter") {
      const base = deleteRange(source, range.from, range.to);
      const para = base.p[range.from.p];
      const next = para.list && !para.length ? applyParaFormat(base, range.from.p, range.from.p, { list: null }) : splitParagraph(base, range.from);
      const at = next.p.length === base.p.length ? range.from : { p: range.from.p + 1, offset: 0 };
      demoCommit(next, collapsedSel(at), "Enter");
      return true;
    }
    if (combo === "Tab") {
      const cell = source.p[range.from.p].cell;
      if (!cell) { demoType("\t"); return true; }
      const p = source.p.findIndex((para, index) => index > range.from.p && para.cell?.table === cell.table && (para.cell.row !== cell.row || para.cell.col !== cell.col));
      if (p >= 0) {
        demoSelection = { anchor: { p, offset: 0 }, focus: { p, offset: source.p[p].length } }; demoAt = demoSelection.focus;
        writeSelection(page, demoSelection);
      }
      return true;
    }
    if (combo === "Space") { demoType(" "); return true; }
    if (combo.length === 1 || /^Shift\+.$/.test(combo)) { demoType(combo.length === 1 ? combo : combo.slice(6).toUpperCase()); return true; }
    return false;
  }

  function restoreDemoView(view) {
    if (!view || destroyed) return;
    setZoom(view.zoom, false);
    root.querySelector(".wd-name").innerHTML = view.title;
    tab = view.tab; prevTab = view.prevTab;
    renderRibbon();
    canvas.scrollTop = view.top; canvas.scrollLeft = view.left;
    writeSel();
  }

  // Aborting the player removes all of its overlays, including the markers that stay after a
  // reduced-motion demo.
  function clearDemo() {
    if (demoState) popups.closeDialog();
    demoState?.ctrl.abort();
    root.querySelectorAll(".is-demo-press").forEach((x) => x.classList.remove("is-demo-press"));
    demoState = null;
    resetDemoTracking();
    if (demoDoc) { demoDoc=null; render(); writeSel(); }
  }
  function cancelDemo() {
    const was = demoState?.was;
    const view = demoState?.view;
    demoToken += 1;
    clearDemo();
    popups.closeAll();
    root.classList.remove("is-demo");
    if (was && !destroyed) restoreBackstage(was);
    restoreDemoView(view);
    locked = false;
    if (!destroyed) updateUI();
  }

  function relOf(rect) {
    const R = root.getBoundingClientRect();
    return { x: rect.left - R.left, y: rect.top - R.top, w: rect.width, h: rect.height };
  }
  function ensureVisible(clientRect) {
    const c = canvas.getBoundingClientRect();
    if (clientRect.top < c.top + 20 || clientRect.bottom > c.bottom - 20) {
      canvas.scrollTop += clientRect.top - c.top - c.height / 3;
    }
  }
  function rangeRects(range) {
    const r = { from: clampPos(demoDoc??doc, range.from), to: clampPos(demoDoc??doc, range.to) };
    const dr = domRange(page, r);
    return Array.from(dr.getClientRects()).filter((x) => x.width > 0.5);
  }
  function parseDocTarget(target) {
    const cell = /^cell:(\d+),(\d+),(\d+)(?:,(\d+))?$/.exec(target);
    if (cell) {
      const source=demoDoc??doc;
      const p=source.p.findIndex(p=>p.cell?.table===Number(cell[1]) && p.cell.row===Number(cell[2]) && p.cell.col===Number(cell[3]));
      return p<0 ? null : clampPos(source,{p,offset:Number(cell[4]??0)});
    }
    const m = /^doc:(\d+),(\d+)$/.exec(target);
    return m ? clampPos(demoDoc??doc, { p: Number(m[1]), offset: Number(m[2]) }) : null;
  }
  function commandEl(id) {
    if (id.startsWith("menu:")) return commandEl(id.slice(5));
    if (id.startsWith("tab.")) return root.querySelector(`.wt-tab[data-tab="${id.slice(4)}"]`);
    if (id.startsWith("choice:")) {
      const [, command, ...parts] = id.split(":");
      const value = parts.join(":");
      return Array.from(root.querySelectorAll(".wm-menu [data-cmd],.wd-dlg [data-cmd]"))
        .find((el) => el.dataset.cmd === command && String(decArg(el)).toLowerCase() === value.toLowerCase()) ?? null;
    }
    if (id.startsWith("spelling.") || id.startsWith("context.") || id.startsWith("home.clipboard.")) {
      const item = Array.from(root.querySelectorAll(".wm-menu [data-cmd]" )).find((el) => el.dataset.cmd === id);
      if (item) return item;
    }
    if (id.startsWith("insert.pictures.")) {
      const item=root.querySelector(`.wm-menu [data-cmd="${id}"],.wd-dlg [data-cmd="${id}"],.wd-dlg [data-spot="${id}"]`); if(item) return item;
    }
    // "file" is the File tab; "bs.<page>" is a Backstage list item (e.g. "bs.saveas"); "sa.browse|documents|name|save" are Save As controls.
    const localTarget = id.startsWith("new.template:") ? `.bs [data-template="${id.slice(13)}"]` : id.startsWith("placeholder:") ? `.wd-p[data-p="${Number(id.slice(12))}"]` : ({"new.search":'.bs [data-new="search"]',"new.search-go":'.bs [data-new="search-go"]',"new.create":'.bs [data-new="create"]',"new.cancel":'.bs [data-new="cancel"]',"print.copies":'.bs [data-print="copies"]',"print.submit":'.bs [data-print="submit"]'})[id];
    if (localTarget) return root.querySelector(localTarget);
    const BS_TARGETS = { file: '.wt-tab[data-tab="file"]', "sa.browse": ".bs .sa-browse", "sa.documents": '.bs .sa-n[data-folder="documents"]', "sa.name": ".bs .sa-name", "sa.save": ".bs .sa-save" };
    const bsSel = BS_TARGETS[id] ?? (id.startsWith("bs.") ? `.bs .bs-item[data-bs="${id.slice(3)}"]` : null);
    const find = () => root.querySelector(bsSel ?? `.wr-card [data-cmd="${id}"],.wr-card [data-menu="${id}"],.wd-title [data-cmd="${id}"],.wd-title [data-menu="${id}"],.wd-status [data-cmd="${id}"]`);
    let b = find();
    if (!b) {
      const t = id.startsWith("picture.") ? "picture" : id.startsWith("tabledesign.") ? "tabledesign" : id.startsWith("table.") ? "table" : getCommand(id)?.tab ?? id.split(".")[0];
      if (RIBBON_TABS.has(t) && t !== tab) {
        tab = t;
        renderRibbon();
        b = find();
      }
    }
    return b;
  }

  /** How many paragraphs a `doc:` target lies past the last one (a demo types into lines its ghost Enter opened). */
  function linesPastEnd(target) {
    const source = demoDoc ?? doc;
    const m = /^doc:(\d+),\d+$/.exec(target ?? "");
    return m ? Math.max(0, Number(m[1]) - (source.p.length - 1)) : 0;
  }
  /** Caret rect for a doc position; `past` lines below the end of the document start at the left margin. */
  function demoCaretRect(pos, past) {
    const source = demoDoc ?? doc;
    if (!past) return caretRect(page, pos);
    const last = source.p.length - 1;
    const end = caretRect(page, { p: last, offset: source.p[last].length });
    const para = page.querySelector(`.wd-p[data-p="${last}"]`);
    const pr = para?.getBoundingClientRect() ?? end;
    const pad = para ? (parseFloat(getComputedStyle(para).paddingLeft) || 0) * (zoom / 100) : 0;
    const h = end.height || 18;
    return new DOMRect(pr.left + pad, pr.bottom + (past - 1) * h, 1, h);
  }

  /** Targets the player can point at: command ids, `file`, `bs.*`, `sa.*`, or `doc:p,offset`. */
  function demoResolve(target) {
    const picture=/^picture:(\d+)(?::(n|ne|e|se|s|sw|w|nw))?$/.exec(target);
    if(picture) {
      const el=page.querySelector(`.wd-picture[data-picture="${picture[1]}"]`);
      const target = picture[2] ? el?.querySelector(`[data-handle="${picture[2]}"]`) : el;
      if (el && target) {
        el.classList.add("is-selected");
        const rect = target.getBoundingClientRect();
        // A large picture can extend beyond the canvas: show the dot or body centre being used.
        ensureVisible(picture[2] ? rect : new DOMRect(rect.left + rect.width / 2, rect.top + rect.height / 2, 1, 1));
      }
      return target;
    }
    const pos = parseDocTarget(target);
    if (!pos) {
      const el = commandEl(target);
      // Scripts written before Insert Picture opened on Pictures click a file straight away: the window
      // then shows Downloads, where the files are, so the target is still on screen.
      if (!el && target.startsWith("choice:insert.pictures.choose:") && pictureDialogs.kind() === "device") {
        pictureDialogs.showFolder("downloads");
        return commandEl(target);
      }
      return el;
    }
    const past = linesPastEnd(target);
    ensureVisible(demoCaretRect(pos, past));
    return { getBoundingClientRect: () => demoCaretRect(pos, past) };
  }
  /** Where ghost typing starts: a `doc:` target, or the caret (start of the selection) for null. */
  function demoCaret(target) {
    const source = demoDoc ?? doc;
    let pos;
    let past = 0;
    if (target == null) {
      if (backstage) return null;
      pos = demoRange().from;
    } else {
      pos = parseDocTarget(target);
      if (!pos) return null;
      past = linesPastEnd(target);
      if (past) pos = { p: source.p.length - 1, offset: source.p[source.p.length - 1].length };
    }
    ensureVisible(demoCaretRect(pos, past));
    const cr = demoCaretRect(pos, past);
    const para = page.querySelector(`.wd-p[data-p="${pos.p}"]`) ?? page;
    const pr = para.getBoundingClientRect();
    const pcs = getComputedStyle(para);
    const { node } = posToDom(page, pos);
    const runEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const cs = getComputedStyle(runEl ?? para);
    const z = zoom / 100;
    return {
      x: cr.left,
      y: cr.top,
      h: cr.height || 18,
      left: pr.left + (parseFloat(pcs.paddingLeft) || 0) * z,
      right: pr.right - (parseFloat(pcs.paddingRight) || 0) * z,
      font: { family: cs.fontFamily, size: (parseFloat(cs.fontSize) || 15) * z, weight: cs.fontWeight, style: cs.fontStyle, color: cs.color },
    };
  }
  function demoSelectRects(range) {
    const r = orderRange(clampPos(demoDoc??doc, range.from), clampPos(demoDoc??doc, range.to));
    demoAt = r.from;
    demoSelection = { anchor: r.from, focus: r.to };
    const first = rangeRects(r)[0];
    if (first) ensureVisible(first);
    return rangeRects(r);
  }

  // Ghost Delete Picture (button or key): the demo view loses the demo-selected picture; the learner's document is untouched.
  function demoDeletePicture() {
    const source=demoDoc??doc;
    if(demoPicture<0||!source.p[demoPicture]?.picture) return;
    const next=updatePicture(source,{p:demoPicture},null); demoPicture=-1;
    demoCommit(next); popups.closeAll();
  }
  // Ghost insert of the file chosen in the picker: the picture lands in the demo view only, and
  // Picture Format opens, as after a real insert.
  function demoInsertPicture(id) {
    if (!id) return;
    const source=demoDoc??doc;
    const at=clampPos(source,demoAt??selRange(sel).from);
    const result=getCommand("insert.pictures.choose").run(source,{from:at,to:at},{arg:id,ui});
    demoPicture=result.sel?.focus.p??demoPicture;
    demoCommit(result.doc??result, result.sel); popups.closeAll();popups.closeDialog();
    if (demoPicture>=0) setTab("picture");
    updateUI();
  }
  // A ghost click on File, a Backstage item, Browse or a Save As folder opens what the real click
  // opens, so the next target is on screen. The file name box and Save are never pressed: a demo
  // must not save.
  function demoAct(target, kind) {
    if (target.startsWith("placeholder:")) {
      const p=Number(target.slice(12));
      const para=(demoDoc??doc).p[p];
      if (para) {
        demoPlaceholder={from:{p,offset:0},to:{p,offset:para.length}};
        demoSelection={anchor:demoPlaceholder.from,focus:demoPlaceholder.to};
        demoAt=demoPlaceholder.from;
        commandEl(target)?.classList.add("is-demo-placeholder");
      }
      return;
    }
    if (target === "new.create") {
      const id=commandEl(target)?.dataset.id;
      if (id) {demoCommit(templateDoc(id), collapsedSel({p:0,offset:0}), "Template"); backstage?.close();}
      return;
    }
    if (target === "print.submit") {
      popups.toast({en:"Practice print complete. No paper is printed.",vi:"Đã thực hành in. Không in ra giấy."});
      return;
    }
    if (target.startsWith("new.")) {if (target !== "new.search") commandEl(target)?.click(); return;}
    if(target.startsWith("picture:")) {
      // Like a real click: the picture is selected and Picture Format shows, but the tab stays.
      const el=demoResolve(target); demoPicture=Number(el?.closest(".wd-p")?.dataset.p??-1); updateUI(); return;
    }
    // Insert › Pictures: the ghost opens the same windows and clicks through them; only the Insert
    // button (or a double-click on a file) changes the demo view, never the learner's document.
    const PICTURE_SOURCES={"insert.pictures.device":"device","insert.pictures.stock":"stock","insert.pictures.online":"online"};
    if(PICTURE_SOURCES[target]) {popups.closeMenu();openPictureDialog(PICTURE_SOURCES[target]);return;}
    if(target.startsWith(PICTURE_NAV)) {pictureDialogs.showFolder(target.slice(PICTURE_NAV.length));return;}
    if(target.startsWith(ONLINE_CATEGORY)) {pictureDialogs.search(target.slice(ONLINE_CATEGORY.length));return;}
    if(target===PICTURE_INSERT) {demoInsertPicture(pictureDialogs.picked());return;}
    if(target===PICTURE_CANCEL) {popups.closeDialog();return;}
    if(target.startsWith("choice:insert.pictures.choose:")) {
      // A click highlights the picture; a double-click on a file inserts it at once.
      const picked=pictureDialogs.pick(target.split(":").slice(2).join(":"));
      if (kind==="double" && pictureDialogs.kind()==="device") demoInsertPicture(picked);
      return;
    }
    if(target==="picture.delete") {demoDeletePicture();return;}
    if(target.startsWith("choice:picture.wrap.set:")) {
      const [,id,arg]=target.split(":"); const source=demoDoc??doc;
      const at=demoPicture>=0?{p:demoPicture,offset:0}:selRange(sel).from;
      const result=getCommand(id).run(source,{from:at,to:at},{arg,ui});
      demoPicture=result.sel?.focus.p??demoPicture;
      demoCommit(result.doc??result,result.sel);popups.closeAll();popups.closeDialog();return;
    }
    const pos = parseDocTarget(target);
    if (pos) { demoAt=pos; demoSelection=collapsedSel(pos); }
    if (pos && kind === "right") {
      const rect = demoCaretRect(pos, 0);
      openContextMenu(rect.left, rect.bottom, pos);
      return;
    }
    if (target.startsWith("menu:")) {
      const id = target.slice(5);
      const cmd = getCommand(id);
      const anchor = menuAnchor(commandEl(id));
      if (cmd?.menu) popups.openMenu(anchor, cmd.menu({ ui, state: computeState(), anchor }));
      return;
    }
    if (target.startsWith("tab.")) { setTab(target.slice(4)); return; }
    if (target.startsWith("choice:")) {
      const [, id, ...parts] = target.split(":");
      demoCommand(id, parts.join(":"));
      popups.closeAll();
      return;
    }
    if (target.startsWith("spelling.") || getCommand(target)?.run || getCommand(target)?.special) {
      demoCommand(target); popups.closeAll(); return;
    }
    if (target === "file") return openFile("home");
    if (target === "sa.name") return;
    if (target === "sa.save") {
      const name = commandEl("sa.name")?.value.trim();
      if (name) {
        root.querySelector(".wd-name").textContent = `${name} - Word`;
        backstage?.close();
      }
      return;
    }
    if (target.startsWith("bs.") || target.startsWith("sa.")) commandEl(target)?.click();
  }
  // What the demo opened is closed again, so the learner starts from where they were.
  function backstageSnapshot() {
    return { inputs: [...root.querySelectorAll(".bs input")].map(el=>({selector:el.className ? `input.${el.className.split(" ")[0]}` : el.dataset.new ? `[data-new="${el.dataset.new}"]` : `[data-print="${el.dataset.print}"]`,value:el.value})), preview: root.querySelector(".bn-preview [data-new=create]")?.dataset.id, open: Boolean(backstage), page: backstage?.page ?? null, dialog: Boolean(root.querySelector(".bs .sa-scrim")), stage: root.querySelector(".bs")?.dataset.stage ?? "" };
  }
  function restoreBackstage(was) {
    if (!backstage && was.open) openFile(was.page);
    if (!backstage) return;
    if (!was.open) return backstage.close();
    const now = backstageSnapshot();
    if (now.dialog && (!was.dialog || now.stage !== was.stage)) root.querySelector('.bs .sa-scrim [data-act="cancel"]')?.click();
    if (now.page !== was.page || was.page === "new" || was.page === "print") backstage.show(was.page);
    if (was.dialog && !root.querySelector(".bs .sa-scrim")) root.querySelector(".bs .sa-browse")?.click();
    if (was.stage === "dialog-documents") root.querySelector('.bs [data-folder="documents"]')?.click();
    for (const saved of was.inputs ?? []) { const input=root.querySelector(`.bs ${saved.selector}`); if(input) {input.value=saved.value; input.dispatchEvent(new Event("input"));} }
    if (was.preview) root.querySelector(`.bs [data-template="${was.preview}"]`)?.click();
  }

  async function demo(script) {
    validateScript(script);
    cancelDemo();
    const token = ++demoToken;
    const ctrl = new AbortController();
    const wasBackstage = backstageSnapshot();
    const view = { zoom, tab, prevTab, top: canvas.scrollTop, left: canvas.scrollLeft, title: root.querySelector(".wd-name").innerHTML };
    demoState = { ctrl, was: wasBackstage, view, colours: { ...lastColours }, lists: { ...lastLists }, border: lastBorderSide, marks, painter };
    demoSelection = clampSel(doc, sel);
    demoHistory = history.fork();
    demoClipboard = clip;
    const before = JSON.stringify(doc);
    const beforeSel = JSON.stringify(sel);
    locked = true;
    root.classList.add("is-demo");
    popups.closeAll();
    popups.closeToast();
    try {
      await playDemo(root, script, {
        resolve: demoResolve,
        caret: demoCaret,
        selectRects: demoSelectRects,
        act: demoAct,
        drag: (target,delta)=>{
          const el=demoResolve(target), handle=el?.dataset.handle;
          const p=Number(el?.closest(".wd-p")?.dataset.p);
          const source=demoDoc??doc, picture=source.p[p]?.picture;
          if(!picture) return;
          const dx=delta.dx/(zoom/100),dy=delta.dy/(zoom/100);
          const patch=handle?pictureResize(picture,handle,dx,dy):["front","behind"].includes(picture.wrap)?pictureMove(picture,el,dx,dy):null;
          if(!patch) return;
          demoPicture=p;demoCommit(updatePicture(source,{p},patch));
        },
        typed: (text, target, explicitTarget) => {
          if (target === "new.search") {
            const input=commandEl(target); if(input) {input.value=text;input.dispatchEvent(new Event("input"));} return true;
          }
          if (target === "sa.name") {
            const input = commandEl(target); if (input) input.value = text;
            return true;
          }
          if (!backstage) {
            const at = explicitTarget && parseDocTarget(target);
            if (at) demoSelection = collapsedSel(at);
            demoType(text); return true;
          }
          return false;
        },
        key: (combo)=>{
          if (combo === "ArrowUp") { const copies=commandEl("print.copies"); if(copies) copies.stepUp(); return true; }
          if (!backstage) return demoKey(combo);
          return false;
        },
        reducedMotion: reducedMotion(),
        signal: ctrl.signal,
      });
    } finally {
      if (token === demoToken) {
        popups.closeAll();
        popups.closeDialog();
        resetDemoTracking();
        if (demoDoc) { demoDoc=null; render(); writeSel(); }
        updateUI(); // a contextual tab the demo opened goes away with the demo view
        root.classList.remove("is-demo");
        if (JSON.stringify(doc) !== before || JSON.stringify(sel) !== beforeSel) console.error("demo changed the document or selection; this must never happen");
        // A demo that ran to the end puts the Backstage back itself; cancelDemo does it for one cut short.
        if (demoState) { demoState.was = null; demoState.view = null; }
        if (!destroyed) restoreBackstage(wasBackstage);
        restoreDemoView(view);
        locked = false;
        updateUI();
      }
    }
  }

  /** Union rect (root coordinates) of the document places a script points at. */
  function scriptTargetRect(script) {
    const rects = [];
    let typeAt = null; // caret rect where the next ghost typing lands: last doc target, else the caret
    let lines = 0;
    for (const step of script ?? []) {
      if (step.select) {
        rects.push(...rangeRects(step.select).map(relOf));
        typeAt = caretRect(page, orderRange(clampPos(doc, step.select.from), clampPos(doc, step.select.to)).from);
      }
      const pos = typeof step.target === "string" ? parseDocTarget(step.target) : null;
      if (pos) {
        typeAt = demoCaretRect(pos, linesPastEnd(step.target));
        rects.push(relOf(typeAt));
      }
      if (typeof step.type === "string") {
        const at = typeof step.at === "string" ? parseDocTarget(step.at) : null;
        typeAt = (at && demoCaretRect(at, linesPastEnd(step.at))) || typeAt || caretRect(page, orderRange(clampPos(doc, sel.anchor), clampPos(doc, sel.focus)).from);
        lines += 1 + (step.type.match(/\n/g)?.length ?? 0);
      }
      if (step.key === "Enter") lines += 1;
    }
    // The typed text covers the caret line and the lines Enter opens below it.
    if (typeAt && lines) {
      const c = relOf(typeAt);
      const p = relOf(page.getBoundingClientRect());
      rects.push({ x: p.x, y: c.y, w: p.w, h: c.h * lines });
    }
    if (!rects.length) return null;
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    const x2 = Math.max(...rects.map((r) => r.x + r.w));
    const y2 = Math.max(...rects.map((r) => r.y + r.h));
    return { x, y, w: x2 - x, h: y2 - y };
  }

  // The heading above the table grid reads "2x3 Table" while the pointer is over a square, as in real Word.
  function setTableHead(from, text) {
    const head = from.closest(".wm-menu")?.querySelector(".wm-head");
    if (head) head.textContent = text;
  }

  /* ---------- wire up ---------- */
  page.addEventListener("beforeinput", onBeforeInput);
  page.addEventListener("keydown", onKeyDown);
  page.addEventListener("keyup", updateCapsLock);
  page.addEventListener("mousedown", onPageMouseDown);
  page.addEventListener("mouseup", onPageMouseUp);
  page.addEventListener("contextmenu", onContextMenu);
  page.addEventListener("copy", onCopy);
  page.addEventListener("cut", onCut);
  page.addEventListener("paste", onPaste);
  page.addEventListener("compositionstart", onCompositionStart);
  page.addEventListener("compositionend", onCompositionEnd);
  page.addEventListener("dragstart", (e) => e.preventDefault());
  page.addEventListener("drop", (e) => e.preventDefault());
  root.addEventListener("mousedown", onRootMouseDown);
  root.addEventListener("click", onRootClick);
  root.addEventListener("pointerover", e=>{
    const cell=e.target.closest?.(".wm-table-grid button"); if (!cell) return;
    cell.parentElement.querySelectorAll("button").forEach(b=>b.classList.toggle("is-on",+b.dataset.cols<=+cell.dataset.cols && +b.dataset.rows<=+cell.dataset.rows));
    setTableHead(cell, `${cell.dataset.cols}x${cell.dataset.rows} Table`);
  });
  root.addEventListener("focusin", e=>{
    const cell=e.target.closest?.(".wm-table-grid button"); if (cell) setTableHead(cell, `${cell.dataset.cols}x${cell.dataset.rows} Table`);
  });
  root.addEventListener("pointerleave", e=>{
    if (e.target.closest?.(".wm-table-grid")) setTableHead(e.target, "Insert Table");
  }, true);
  root.addEventListener("keydown", onComboKey);
  root.addEventListener("focusin", onComboFocus);
  root.addEventListener("focusout", onComboBlur);
  root.querySelector(".wd-zr").addEventListener("change", onZoomInput);
  root.addEventListener("keydown", (e) => {
    if (e.target === page || e.target.closest?.("[data-combo]") || popups.dialogOpen) return;
    if (e.key === "Escape") popups.closeAll();
    const id = SHORTCUTS[shortcutOf(e)];
    if (id && (e.ctrlKey || e.metaKey) && !e.target.closest?.("input,textarea")) {
      e.preventDefault();
      exec(id, undefined, { origin: "key" });
    }
  });
  canvas.addEventListener("mousedown", (e) => {
    if (e.target === canvas || e.target === pagewrap) {
      e.preventDefault();
      sel = collapsedSel(e.clientY > page.getBoundingClientRect().bottom ? docEnd(doc) : sel.focus);
      focusPage();
      updateUI();
    }
  });
  document.addEventListener("selectionchange", onSelectionChange);
  document.addEventListener("mousedown", onDocMouseDown);
  window.addEventListener("resize", onResize);
  const resizeObserver = new ResizeObserver(() => {
    const card = ribbonWrap.firstElementChild;
    if (card) fitRibbon(card);
  });
  resizeObserver.observe(ribbonWrap);
  observer.observe(page, { childList: true, characterData: true, subtree: true });

  render();
  renderRibbon();
  resetGoalState();
  requestAnimationFrame(() => {
    if (destroyed) return;
    focusPage();
    updateUI();
  });

  /* ---------- public API ---------- */
  const word = {
    on(name, fn) {
      if (typeof fn !== "function") throw new TypeError("on: listener must be a function");
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name)?.delete(fn);
    },
    off(name, fn) {
      listeners.get(name)?.delete(fn);
    },
    getDoc: () => doc,
    setDoc(next) {
      clearSavedDocument(root);
      selectedPicture=-1;
      doc = createDoc(next);
      sel = collapsedSel({ p: 0, offset: 0 });
      history.clear();
      pending = null;
      render();
      resetGoalState();
      writeSel();
      updateUI();
    },
    setGoal(next) {
      goal = next && typeof next.check === "function" ? next : null;
      resetGoalState();
    },
    setSpotlight,
    demo,
    undo,
    redo,
    focus: focusPage,
    get selection() {
      return { anchor: { ...sel.anchor }, focus: { ...sel.focus } };
    },
    /** Select a model range (missions may preselect text). Does not change the document. */
    select(from, to = from) {
      sel = clampSel(doc, { anchor: from, focus: to });
      focusPage();
      updateUI();
    },
    destroy() {
      if (destroyed) return;
      cancelDemo();
      cancelResize?.();
      destroyed = true;
      backstage?.close();
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      observer.disconnect();
      popups.destroy();
      listeners.clear();
      root.remove();
    },
  };
  internals.set(word, {
    root,
    page,
    canvas,
    popups,
    labelPair,
    reducedMotion,
    scriptTargetRect,
    clearDemo,
    cancelDemo,
    groupEl: (id) => root.querySelector(`[data-group="${id}"]`),
    commandEl,
    get demoRunning() {
      return locked;
    },
  });
  return word;
}

export { EFFECT_NAMES };
