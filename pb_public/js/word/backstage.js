// Backstage (File) shell: the frame, the Home page, the Save As flow (Save As > Browse > the Save As
// dialog) and Export > Create PDF/XPS (the Publish as PDF or XPS window reuses the Save As window).
// Other pages are stubs that later work replaces with registerBackstagePage().

import { TEMPLATES, templateDoc } from "./templates.js";
import { createRenderer } from "./render.js";
import { ico } from "./icons.js";
import { biPair, esc, labelPair, ws } from "./strings.js";
import { GLYPH, PIN, VIEW_GLYPH, PANE_GLYPH, HELP_GLYPH, CARET } from "./picture-dialogs.js";

const NAV = [
  { id: "home", label: "Home", icon: "home_20" },
  { id: "new", label: "New", icon: "add_circle_20" },
  { id: "open", label: "Open", icon: "folder_open_20" },
  { id: "share", label: "Share", icon: "share_ios_20" },
  { sep: true },
  { id: "info", label: "Info" },
  { id: "save", label: "Save" },
  { id: "saveas", label: "Save As" },
  { id: "print", label: "Print" },
  { id: "export", label: "Export" },
  { id: "close", label: "Close" },
  { spacer: true },
  { id: "account", label: "Account" },
  { id: "options", label: "Options" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Page renderers: (ctx) => HTML. ctx = {title, doc}. */
const PAGES = new Map([
  [
    "home",
    (ctx) => `<h1 class="bs-h1">${greeting()}</h1>
      <div class="bs-sec">${ico("chev")} New</div>
      <div class="bs-tiles"><button type="button" class="bs-tile" data-cmd="file.new.blank"><span class="bs-thumb"></span>Blank document</button></div>
      <div class="bs-search">${ico("search_20")}<span>Search for a file</span></div>
      <div class="bs-tabsrow"><span class="is-on">Recent</span><span>Favorites</span><span>Shared with Me</span></div>
      <div class="bs-list"><div class="bs-listhead"><span>Name</span><span>Date modified</span></div>
        <div class="bs-row">${ico("document_20", "wi-blue")}<span>${esc(ctx.title)}</span><span>Just now</span></div></div>`,
  ],
  // Save and Save As open the same page: a document that has never been saved always goes to Save As.
  ["new", newPage],
  ["print", printPage],
  ["saveas", saveAsPage],
  ["save", saveAsPage],
]);

/** Optional `mount(main, ctx)` runs after a page's HTML is in place (wire events there). */
const MOUNTS = new Map([
  ["new", mountNew],
  ["print", mountPrint],
  ["saveas", mountSaveAs],
  ["save", mountSaveAs],
]);

/** ctx for a page = {title, doc, close, el, saved({folder, name}), exported({folder, name, type, open}), printed(n), setStage(name)}. */
export function registerBackstagePage(id, render, mount) {
  if (!NAV.some((n) => n.id === id)) throw new Error(`registerBackstagePage: unknown page ${id}`);
  if (typeof render !== "function") throw new TypeError("registerBackstagePage: render must be a function");
  if (mount != null && typeof mount !== "function") throw new TypeError("registerBackstagePage: mount must be a function");
  PAGES.set(id, render);
  if (mount) MOUNTS.set(id, mount);
  else MOUNTS.delete(id);
}

// The last save per Word window. "save" (Ctrl+S, the QAT button) on an already-saved document saves again
// under the same name with no Save As page, as in real Word. Otherwise "save" shows Save As, and F12 always does.
const lastSave = new WeakMap();
export const clearSavedDocument = (root) => lastSave.delete(root);

/**
 * Open the Backstage over the Word window. hooks: {title(), doc(), onCommand(id, level), onClose()}.
 * Returns {close(), show(page)}.
 */
export function openBackstage(root, page, hooks) {
  const el = document.createElement("div");
  el.className = "bs";
  el.innerHTML = `<div class="bs-title">${ico("wordlogo")}<span>${esc(hooks.title())} - Word</span><span class="bs-caption">${ico("capmin")}${ico("caprestore")}${ico("capclose")}</span></div><nav class="bs-nav">
      <button type="button" class="bs-back" data-bs="back" aria-label="Back">${ico("arrow_left_20")}</button>
      ${NAV.map((n) => (n.sep ? `<hr>` : n.spacer ? `<div class="bs-spacer"></div><hr>` : `<button type="button" class="bs-item" data-bs="${n.id}">${n.icon ? ico(n.icon) : '<span class="bs-noic"></span>'}${esc(n.label)}</button>`)).join("")}
    </nav><main class="bs-main"></main>`;
  root.appendChild(el);
  const main = el.querySelector(".bs-main");
  let current = null;

  // Where the learner is in the Save As flow ("saveas", "dialog", "dialog-documents"), for mission steps.
  // Mission screens re-check their steps on `selectionchange`, so a change of stage nudges them.
  function setStage(stage) {
    if ((el.dataset.stage ?? "") === stage) return;
    if (stage) el.dataset.stage = stage;
    else delete el.dataset.stage;
    document.dispatchEvent(new Event("selectionchange"));
  }
  function show(id) {
    current = id;
    setStage("");
    el.querySelectorAll(".bs-item").forEach((b) => b.classList.toggle("is-on", b.dataset.bs === id));
    const render = PAGES.get(id);
    if (render) {
      const ctx = { title: hooks.title(), doc: hooks.doc(), close, el, setStage, newDocument: hooks.newDocument, printed: hooks.printed, exported: hooks.exported, onCommand: hooks.onCommand, saved: (p) => {
        lastSave.set(root, { folder: [...p.folder], name: p.name });
        hooks.saved?.(p);
      } };
      main.innerHTML = render(ctx);
      MOUNTS.get(id)?.(main, ctx);
      hooks.onCommand(`file.${id}`, "b");
    } else {
      main.innerHTML = `<h1 class="bs-h1">${esc(NAV.find((n) => n.id === id)?.label ?? id)}</h1>`;
      hooks.onCommand(`file.${id}`, "c");
    }
  }
  function close() {
    el.remove();
    document.removeEventListener("keydown", onKey, true);
    hooks.onClose();
    document.dispatchEvent(new Event("selectionchange"));
  }
  function onKey(e) {
    // The Save As dialog is on top: Escape belongs to it (it closes only the dialog).
    if (e.key === "Escape" && !el.querySelector(".sa-scrim")) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bs]");
    if (!b) return;
    if (b.dataset.bs === "back") close();
    else show(b.dataset.bs);
  });
  document.addEventListener("keydown", onKey, true);
  const again = page === "save" ? lastSave.get(root) : null;
  if (again) {
    // Save in place. Closing waits a microtask so the caller has stored the returned handle first.
    queueMicrotask(() => {
      hooks.saved?.({ folder: [...again.folder], name: again.name });
      close();
    });
  } else show(page === "save" ? "saveas" : page);
  return { close, show, get page() { return current; }, el };
}

/* ===================================================================== */
/* Save As: the Backstage page, then the Save As dialog that Browse opens. */
/* Layout follows the classroom screenshots (Backstage Save As, Windows Save As dialog). */

const SA = {
  browseHint: { en: "Click Browse to choose where to save your file.", vi: "Bấm Browse để chọn nơi lưu file." },
  otherPlace: { en: "In our class we use Browse. Click Browse on the left.", vi: "Ở lớp mình dùng Browse. Hãy bấm Browse ở bên trái." },
  emptyName: { en: "Type a name for your file first.", vi: "Bạn hãy gõ tên cho file trước nhé." },
  badChars: { en: "A file name cannot have these: \\ / : * ? \" < > |", vi: "Tên file không được có các ký tự này: \\ / : * ? \" < > |" },
  pickFolder: { en: "Click a folder first, for example Documents.", vi: "Hãy bấm vào một thư mục trước, ví dụ Documents." },
  newFolder: { en: "In class we save straight into Documents, so you do not need a new folder.", vi: "Ở lớp mình lưu thẳng vào Documents, nên bạn không cần tạo thư mục mới." },
  empty: { en: "This folder is empty.", vi: "Thư mục này đang trống." },
  wordAdds: { en: "Word adds .docx for you.", vi: "Word tự thêm .docx cho bạn." },
  inactive: { en: "This button is not used in our class.", vi: "Lớp mình không dùng nút này." },
  noSub: { en: "In class we save straight into Documents. You do not need to open this folder.", vi: "Ở lớp mình lưu thẳng vào Documents, bạn không cần mở thư mục này." },
  pdfAdds: { en: "Word adds .pdf for you.", vi: "Word tự thêm .pdf cho bạn." },
  pdfOptions: { en: "In class we keep the usual options. Just click Publish.", vi: "Ở lớp mình giữ nguyên các lựa chọn. Chỉ cần bấm Publish." },
  pdfOnly: { en: "In class we use Create PDF/XPS Document.", vi: "Ở lớp mình dùng Create PDF/XPS Document." },
};
const sa = (key) => biPair(SA[key]);

// Folders the dialog can show. `files` are Word documents already there; the learner's own saves are added at save time.
const FOLDERS = {
  home: { label: "Home", path: ["Home"], saveable: false, items: [] },
  gallery: { label: "Gallery", path: ["Gallery"], saveable: false, items: [] },
  onedrive: { label: "OneDrive", path: ["OneDrive"], saveable: true, items: [] },
  desktop: { label: "Desktop", path: ["Desktop"], saveable: true, items: [] },
  downloads: { label: "Downloads", path: ["Downloads"], saveable: true, items: [] },
  documents: {
    label: "Documents",
    path: ["Documents"],
    saveable: true,
    items: [
      { kind: "folder", name: "Custom Office Templates", date: "10/24/2026 9:45 PM" },
      { kind: "file", name: "My_Resume_May2025.docx", date: "5/14/2026 3:10 PM", size: "18 KB" },
      { kind: "file", name: "Shopping_List.docx", date: "9/2/2026 10:22 AM", size: "13 KB" },
    ],
  },
  pictures: { label: "Pictures", path: ["Pictures"], saveable: true, items: [] },
  music: { label: "Music", path: ["Music"], saveable: true, items: [] },
  videos: { label: "Videos", path: ["Videos"], saveable: true, items: [] },
  thispc: { label: "This PC", path: ["This PC"], saveable: false, items: [] },
};
const NAV_LIST = [
  { id: "home", label: "Home" },
  { id: "gallery", label: "Gallery" },
  { id: "onedrive", label: "OneDrive", expand: true },
  null,
  { id: "desktop", label: "Desktop", pin: true },
  { id: "downloads", label: "Downloads", pin: true },
  { id: "documents", label: "Documents", pin: true },
  { id: "pictures", label: "Pictures", pin: true },
  { id: "music", label: "Music", pin: true },
  { id: "videos", label: "Videos", pin: true },
];
const PC_FOLDERS = ["desktop", "documents", "downloads", "music", "pictures", "videos"];
// Files saved (and PDFs published) in this browser tab, so a later window shows them in the folder they went to.
const SAVED_FILES = [];
const EXPORTED_FILES = [];

const FOLDER_SVG = `<svg class="sa-fold" viewBox="0 0 20 16" aria-hidden="true"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h4.2l1.6 1.8h9.2A1.5 1.5 0 0 1 19 4.3V13.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 1 13.5z" fill="#F8D775"/><path d="M1 5.2h18v8.3a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 1 13.5z" fill="#FDE9A0"/></svg>`;
const DOC_ICON = `<span class="sa-docic" aria-hidden="true">${ico("wordlogo")}</span>`;
const PDF_SVG = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 2.5h12.5l6.5 6.5v20.5H8z" fill="#fff" stroke="#8A8A8A"/><path d="M20.5 2.5V9H27" fill="none" stroke="#8A8A8A"/><rect x="3" y="14.5" width="19" height="10" rx="1.5" fill="#C4314B"/><text x="12.5" y="22" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="7" font-weight="700" fill="#fff">PDF</text></svg>`;
const PDF_ICON = `<span class="sa-docic sa-pdfic">${PDF_SVG}</span>`;

function saveAsPage() {
  return `<h1 class="bs-h1">Save As</h1>
    <div class="sa-page">
      <div class="sa-places">
        <button type="button" class="sa-place" data-place="recent"><span class="sa-pic">${ico("glance_20")}</span>Recent</button>
        <button type="button" class="sa-place" data-place="onedrive"><span class="sa-pic" style="color:#0F6CBD">${ico("globe_20")}</span>OneDrive</button>
        <hr>
        <button type="button" class="sa-place" data-place="thispc"><span class="sa-pic">${ico("window_20")}</span>This PC</button>
        <button type="button" class="sa-place" data-place="addplace"><span class="sa-pic">${ico("add_circle_20")}</span>Add a Place</button>
        <button type="button" class="sa-place sa-browse" data-place="browse"><span class="sa-pic">${ico("folder_open_20")}</span>Browse</button>
      </div>
      <div class="sa-pane" aria-live="polite"><p class="sa-lead"><span class="sa-arrow" aria-hidden="true">◀</span>${sa("browseHint")}</p></div>
    </div>`;
}

function dateNow() {
  return new Date().toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function firstWords(doc) {
  const text = (doc?.p ?? []).map((para) => (para.runs ?? []).map((r) => r.text).join("")).find((t) => t.trim()) ?? "";
  return text.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 40);
}

function mountSaveAs(main, ctx) {
  const { el } = ctx;
  const pane = main.querySelector(".sa-pane");
  ctx.setStage("saveas");

  main.querySelector(".sa-places").addEventListener("click", (e) => {
    const b = e.target.closest("[data-place]");
    if (!b) return;
    if (b.dataset.place === "browse") openDialog(el, ctx, saveSpec(ctx));
    else pane.innerHTML = `<p class="sa-lead"><span class="sa-arrow" aria-hidden="true">◀</span>${sa("otherPlace")}</p>`;
  });
}

// What differs between the Save As window and Publish as PDF or XPS; the folders, list and File name are shared.
function saveSpec(ctx) {
  return {
    title: "Save As", typeLabel: "Word Document (*.docx)", ext: "docx", files: SAVED_FILES, stage: "dialog", back: "saveas",
    button: "Save", buttonCls: "sa-save", start: "desktop", name: firstWords(ctx.doc) || ctx.title, note: sa("wordAdds"), extra: "",
    submit({ folder, name }) {
      ctx.saved({ folder, name });
      ctx.close();
    },
  };
}
const PDF_OPTIONS = `<div class="sa-frow sa-pdfopts">
    <label class="sa-chk"><input type="checkbox" class="sa-openafter" checked><span>Open file after publishing</span></label>
    <div class="sa-opt"><span class="sa-lbl">Optimize for:</span>
      <div class="sa-radios"><label class="sa-chk"><input type="radio" name="sa-optimize" value="standard" checked><span>Standard (publishing online and printing)</span></label>
        <label class="sa-chk"><input type="radio" name="sa-optimize" value="minimum"><span>Minimum size (publishing online)</span></label>
        <button type="button" class="sa-btn sa-options" data-act="options">Options...</button></div></div>
  </div>`;
function pdfSpec(ctx) {
  return {
    title: "Publish as PDF or XPS", typeLabel: "PDF (*.pdf)", ext: "pdf", files: EXPORTED_FILES, stage: "pdf-dialog", back: "export",
    button: "Publish", buttonCls: "sa-publish", start: "documents", note: sa("pdfAdds"), extra: PDF_OPTIONS,
    name: (/^Document\d+$/.test(ctx.title) && firstWords(ctx.doc)) || ctx.title,
    read: (scrim) => ({ open: Boolean(scrim.querySelector(".sa-openafter")?.checked), optimize: scrim.querySelector('input[name="sa-optimize"]:checked')?.value ?? "standard" }),
    // The engine closes the Backstage and confirms; the title bar and the saved name are not touched.
    submit({ folder, name, read }) {
      ctx.exported?.({ folder, name, type: "pdf", open: read.open, optimize: read.optimize });
    },
  };
}

function openDialog(el, ctx, spec) {
  if (el.querySelector(".sa-scrim")) return;
  const opener = document.activeElement;
  const scrim = document.createElement("div");
  scrim.className = "sa-scrim";
  const navHtml = NAV_LIST.map((f) =>
    f
      ? `<button type="button" class="sa-n" data-folder="${f.id}" data-spot="sa.nav:${f.id}"><span class="sa-exp">${f.expand ? ico("chevron_right_12") : ""}</span><span class="sa-ni">${GLYPH[f.id]}</span><span class="sa-nl">${esc(f.label)}</span>${f.pin ? `<span class="sa-pin">${PIN}</span>` : ""}</button>`
      : `<hr class="sa-sep">`,
  ).join("");
  scrim.innerHTML = `<div class="sa-dlg" role="dialog" aria-modal="true" aria-labelledby="sa-dlg-title">
    <div class="sa-tb"><span class="sa-tb-ic">${ico("wordlogo")}</span><span id="sa-dlg-title" class="sa-tb-t">${esc(spec.title)}</span>
      <button type="button" class="sa-x" data-act="cancel" aria-label="${esc(labelPair({ en: "Close", vi: "Đóng" }))}">${ico("capclose")}</button></div>
    <div class="sa-addr">
      <button type="button" class="sa-ab" data-act="back" aria-label="Back">${ico("arrow_left_20")}</button>
      <button type="button" class="sa-ab" data-act="fwd" aria-label="Forward">${ico("arrow_forward_20")}</button>
      <button type="button" class="sa-ab sa-recent" data-act="inactive" aria-label="Recent locations">${ico("chevron_down_12")}</button>
      <button type="button" class="sa-ab sa-up" data-act="up" aria-label="Up">${ico("arrow_forward_20")}</button>
      <div class="sa-path" aria-live="polite">
        <span class="sa-pcrumb"></span><i>›</i><span class="sa-where"></span><span class="sa-grow"></span>
        <button type="button" class="sa-ab sa-sm" data-act="inactive" aria-label="Previous locations">${ico("chevron_down_12")}</button>
        <button type="button" class="sa-ab sa-sm" data-act="refresh" aria-label="Refresh">${ico("arrow_clockwise_20")}</button>
      </div>
      <div class="sa-search" aria-hidden="true"><span class="sa-search-t"></span>${ico("search_20")}</div>
    </div>
    <div class="sa-cmd">
      <button type="button" class="sa-c" data-act="inactive">Organize ${CARET}</button>
      <button type="button" class="sa-c" data-act="newfolder">New folder</button>
      <span class="sa-grow"></span>
      <button type="button" class="sa-c sa-ic" data-act="inactive" aria-label="Change your view">${VIEW_GLYPH}</button>
      <button type="button" class="sa-c sa-ic sa-narrow" data-act="inactive" aria-label="More options">${CARET}</button>
      <button type="button" class="sa-c sa-ic" data-act="inactive" aria-label="Show the preview pane">${PANE_GLYPH}</button>
      <button type="button" class="sa-c sa-ic" data-act="inactive" aria-label="Get help">${HELP_GLYPH}</button>
    </div>
    <div class="sa-body">
      <nav class="sa-nav" aria-label="Folders">${navHtml}</nav>
      <div class="sa-files">
        <div class="sa-fh"><span>Name</span><span>Date modified</span><span>Type</span><span>Size</span></div>
        <div class="sa-fl" role="listbox" aria-label="Files"></div>
      </div>
    </div>
    <div class="sa-form">
      <div class="sa-frow">
        <label class="sa-row">
          <span class="sa-lbl">File name:</span>
          <span class="sa-combo"><input class="sa-name" type="text" autocomplete="off" spellcheck="false" maxlength="120">${ico("chevron_down_12")}</span>
        </label>
        <span class="sa-type" title="Save as type">${esc(spec.typeLabel)}${ico("chevron_down_12")}</span>
      </div>
      <div class="sa-fnotes">
        <p class="sa-note">${spec.note}</p>
        <p class="sa-msg" role="alert"></p>
      </div>
      ${spec.extra}
      <div class="sa-frow sa-fbtns">
        <button type="button" class="sa-hide" data-act="hide"><i>▴</i><span>Hide Folders</span></button>
        <button type="button" class="sa-c sa-tools" data-act="inactive">Tools ${CARET}</button>
        <span class="sa-grow"></span>
        <button type="button" class="sa-btn ${spec.buttonCls}" data-act="save">${esc(spec.button)}</button>
        <button type="button" class="sa-btn" data-act="cancel">Cancel</button>
      </div>
    </div>
  </div>`;
  el.appendChild(scrim);

  const dlg = scrim.querySelector(".sa-dlg");
  const nameInput = scrim.querySelector(".sa-name");
  const msg = scrim.querySelector(".sa-msg");
  const pathEl = scrim.querySelector(".sa-path");
  const listEl = scrim.querySelector(".sa-fl");
  const searchT = scrim.querySelector(".sa-search-t");
  const hist = [];
  let at = -1;
  let folder = spec.start;
  const extRe = new RegExp(`\\.${spec.ext}$`, "i");

  const say = (key) => {
    msg.innerHTML = key ? sa(key) : "";
  };
  const stageFor = () => (folder === "documents" ? `${spec.stage}-documents` : spec.stage);

  function rowsOf(id) {
    const f = FOLDERS[id];
    if (!f) return [];
    if (id === "thispc") return PC_FOLDERS.map((k) => ({ kind: "folder", name: FOLDERS[k].label, go: k, date: "", type: "File folder" }));
    // Like Windows, the window lists folders and only files of the type being saved.
    const items = f.items.filter((i) => i.kind === "folder" || extRe.test(i.name));
    const mine = spec.files.filter((s) => s.folder === id).map((s) => ({ kind: "file", name: `${s.name}.${spec.ext}`, date: s.date, size: spec.ext === "pdf" ? "48 KB" : "12 KB" }));
    return [...items, ...mine.filter((m) => !items.some((i) => i.name.toLowerCase() === m.name.toLowerCase()))];
  }

  function draw() {
    const f = FOLDERS[folder];
    scrim.querySelectorAll(".sa-n").forEach((b) => b.classList.toggle("is-on", b.dataset.folder === folder));
    const pcrumb = scrim.querySelector(".sa-pcrumb");
    if (pcrumb) pcrumb.innerHTML = GLYPH[folder] ?? "";
    const where = scrim.querySelector(".sa-where");
    if (where) where.textContent = f?.label ?? "";
    const searchT = scrim.querySelector(".sa-search-t");
    if (searchT) searchT.textContent = `Search ${f?.label ?? ""}`;
    const rows = rowsOf(folder);
    listEl.innerHTML = rows.length
      ? rows
          .map(
            (r, i) => `<div class="sa-r" role="option" tabindex="-1" data-i="${i}" data-name="${esc(r.name)}"${r.go ? ` data-go="${r.go}"` : ""}${r.kind === "folder" ? ' data-kind="folder"' : ""}>
              <span class="sa-rn">${r.kind === "folder" ? FOLDER_SVG : spec.ext === "pdf" ? PDF_ICON : DOC_ICON}<span>${esc(r.name)}</span></span><span>${esc(r.date)}</span>
              <span>${r.kind === "folder" ? "File folder" : spec.ext === "pdf" ? "Microsoft Edge PDF Document" : "Microsoft Word Document"}</span><span>${esc(r.size ?? "")}</span></div>`,
          )
          .join("")
      : `<p class="sa-empty">${sa("empty")}</p>`;
    scrim.querySelector('[data-act="back"]').disabled = at <= 0;
    scrim.querySelector('[data-act="fwd"]').disabled = at >= hist.length - 1;
    ctx.setStage(stageFor());
  }
  function go(id, { record = true } = {}) {
    if (!FOLDERS[id]) return;
    folder = id;
    if (record) {
      hist.splice(at + 1);
      hist.push(id);
      at = hist.length - 1;
    }
    say("");
    draw();
  }

  function closeDialog() {
    scrim.remove();
    ctx.setStage(spec.back);
    if (opener?.isConnected) opener.focus();
  }

  function save() {
    const raw = nameInput.value.trim();
    if (ctx.el.closest(".is-demo")) return;
    if (!raw) return say("emptyName");
    if (/[\\/:*?"<>|]/.test(raw)) return say("badChars");
    const name = raw.replace(extRe, "").trim();
    if (!name) return say("emptyName");
    const f = FOLDERS[folder];
    if (!f.saveable) return say("pickFolder");
    const date = dateNow();
    const same = (s) => s.folder === folder && s.name.toLowerCase() === name.toLowerCase();
    const at2 = spec.files.findIndex(same);
    if (at2 >= 0) spec.files.splice(at2, 1);
    spec.files.push({ folder, name, date });
    const read = spec.read?.(scrim) ?? {};
    scrim.remove();
    spec.submit({ folder: [...f.path], name, read });
  }

  scrim.addEventListener("click", (e) => {
    const nav = e.target.closest(".sa-n");
    if (nav) return go(nav.dataset.folder);
    const row = e.target.closest(".sa-r");
    if (row) {
      listEl.querySelectorAll(".sa-r.is-on").forEach((x) => x.classList.remove("is-on"));
      row.classList.add("is-on");
      if (row.dataset.name && row.dataset.kind !== "folder") {
        nameInput.value = row.dataset.name.replace(extRe, "");
      }
      return;
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "cancel") closeDialog();
    else if (act === "save") save();
    else if (act === "refresh") draw();
    else if (act === "back" && at > 0) {
      at -= 1;
      go(hist[at], { record: false });
    } else if (act === "fwd" && at < hist.length - 1) {
      at += 1;
      go(hist[at], { record: false });
    } else if (act === "up") go("thispc");
    else if (act === "newfolder") say("newFolder");
    else if (act === "options") say("pdfOptions");
    else if (act === "inactive") say("inactive");
    else if (act === "hide") {
      const hidden = dlg.classList.toggle("no-nav");
      scrim.querySelector(".sa-hide span").textContent = hidden ? "Browse Folders" : "Hide Folders";
      scrim.querySelector(".sa-hide i").textContent = hidden ? "▾" : "▴";
    }
  });
  scrim.addEventListener("dblclick", (e) => {
    const row = e.target.closest(".sa-r");
    if (!row) return;
    const id = row.dataset.go ?? null;
    if (id) go(id);
    else if (row.dataset.kind === "folder") say("noSub");
    else nameInput.value = row.dataset.name.replace(extRe, "");
  });
  // Like Windows: clicking into File name selects the old name, so typing replaces it instead of adding to it.
  let selectOnUp = false;
  nameInput.addEventListener("focus", () => {
    nameInput.select();
    selectOnUp = true;
  });
  nameInput.addEventListener("mouseup", (e) => {
    if (selectOnUp) e.preventDefault();
    selectOnUp = false;
  });
  nameInput.addEventListener("input", () => {
    say("");
    document.dispatchEvent(new Event("selectionchange"));
  });
  scrim.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
    } else if (e.key === "Enter" && e.target === nameInput) {
      e.preventDefault();
      save();
    } else if (e.key === "Tab") {
      const items = [...dlg.querySelectorAll("button:not([disabled]),input,select")].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  nameInput.value = spec.name;
  go(spec.start);
  nameInput.focus();
  nameInput.select();
}


/* Export: Create PDF/XPS Document (Word 365 layout). Create PDF/XPS opens Publish as PDF or XPS. */
function exportPage() {
  return `<h1 class="bs-h1">Export</h1>
    <div class="ex-page">
      <div class="ex-list">
        <button type="button" class="ex-item is-on" data-export="pdf"><span class="ex-ic">${PDF_SVG}</span><span>Create PDF/XPS Document</span></button>
        <button type="button" class="ex-item" data-export="type"><span class="ex-ic">${ico("wordlogo")}</span><span>Change File Type</span></button>
      </div>
      <div class="ex-pane">
        <h2 class="ex-h2">Create a PDF/XPS Document</h2>
        <ul class="ex-bul"><li>Preserves layout, formatting, fonts, and images</li><li>Content can't be easily changed</li><li>Free viewers are available on the web</li></ul>
        <button type="button" class="ex-create" data-export="create"><span class="ex-cic">${PDF_SVG}</span><span>Create<br>PDF/XPS</span></button>
        <p class="sa-lead ex-msg" aria-live="polite"></p>
      </div>
    </div>`;
}
function mountExport(main, ctx) {
  ctx.setStage("export");
  const msg = main.querySelector(".ex-msg");
  main.querySelector(".ex-page").addEventListener("click", (e) => {
    const b = e.target.closest("[data-export]");
    if (!b) return;
    const what = b.dataset.export;
    if (what === "create") return openDialog(ctx.el, ctx, pdfSpec(ctx));
    main.querySelectorAll(".ex-item").forEach((x) => x.classList.toggle("is-on", x === b));
    msg.innerHTML = what === "type" ? `<span class="sa-arrow" aria-hidden="true">◀</span>${sa("pdfOnly")}` : "";
  });
}

/* New: local template search, preview, and Create. */
function newPage() {
  return `<h1 class="bs-h1">New</h1><div class="bn-search"><input type="search" data-new="search" aria-label="Search for online templates" placeholder="Search for online templates"><button type="button" data-new="search-go" aria-label="Search">${ico("search_20")}</button></div>
    <div class="bn-results"></div><div class="bn-preview"></div>`;
}
function mountNew(main, ctx) {
  ctx.setStage("new");
  const input = main.querySelector('[data-new="search"]');
  const results = main.querySelector('.bn-results');
  const preview = main.querySelector('.bn-preview');
  function draw() {
    const q = input.value.trim().toLowerCase();
    const found = TEMPLATES.filter(t => `${t.name} ${t.search}`.toLowerCase().includes(q));
    results.innerHTML = `${!q ? '<button type="button" class="bs-tile" data-new="blank"><span class="bs-thumb"></span>Blank document</button>' : ''}${found.map(t => `<button type="button" class="bs-tile" data-template="${t.id}"><span class="bs-thumb bn-thumb">${esc(t.lines.join('\n'))}</span>${esc(t.name)}</button>`).join('')}${!found.length ? `<p>${biPair({en:'No templates found. Try resume, list or flyer.', vi:'Không tìm thấy mẫu. Thử gõ resume, list hoặc flyer.'})}</p>` : ''}`;
  }
  input.addEventListener('input', () => { draw(); document.dispatchEvent(new Event('selectionchange')); });
  main.addEventListener('click', e => {
    const id = e.target.closest('[data-template]')?.dataset.template;
    if (id) {
      const t = TEMPLATES.find(t => t.id === id);
      preview.innerHTML = `<section class="bn-preview-card" role="dialog" aria-label="${esc(t.name)}"><button type="button" data-new="cancel" class="bn-close" aria-label="Close">×</button><div class="bn-sample"></div><div><h2>${esc(t.name)}</h2><p>${biPair({en:'Replace the text in brackets with your own words.',vi:'Thay phần chữ trong dấu ngoặc vuông bằng nội dung của bạn.'})}</p><button type="button" class="sa-btn sa-save" data-new="create" data-id="${id}">Create</button></div></section>`;
      createRenderer(preview.querySelector('.bn-sample')).render(templateDoc(id));
      document.dispatchEvent(new Event('selectionchange'));
    }
    const action = e.target.closest('[data-new]');
    if (!action) return;
    if (action.dataset.new === 'search-go') draw();
    if (action.dataset.new === 'cancel') preview.replaceChildren();
    if (action.dataset.new === 'blank') ctx.newDocument?.(null);
    if (action.dataset.new === 'create') ctx.newDocument?.(action.dataset.id);
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); draw(); } });
  draw();
}

/* Print is a classroom simulation: show the document and copies, never invoke window.print(). */
function printPage() {
  return `<h1 class="bs-h1">Print</h1><div class="bp-layout"><section><div class="bp-actions"><button type="button" class="bp-print" data-print="submit">${ico("document_20")}Print</button><label>Copies: <input type="number" min="1" max="99" value="1" data-print="copies" aria-label="Copies"></label></div><h2>Printer</h2><p>Classroom printer</p><p>${biPair({en:'Practice only. No paper is printed.',vi:'Chỉ thực hành. Không in ra giấy.'})}</p><h2>Settings</h2><p>Print All Pages</p><p>Print One Sided</p></section><div class="bp-paper"></div></div>`;
}
function mountPrint(main, ctx) {
  ctx.setStage("print");
  createRenderer(main.querySelector('.bp-paper')).render(ctx.doc);
  const input = main.querySelector('[data-print="copies"]');
  input.addEventListener('input', () => document.dispatchEvent(new Event('selectionchange')));
  main.querySelector('[data-print="submit"]').addEventListener('click', () => {
    const copies = Number(input.value);
    if (!Number.isInteger(copies) || copies < 1 || copies > 99) { input.reportValidity(); return; }
    ctx.printed?.(copies);
  });
}

registerBackstagePage("export", exportPage, mountExport);
