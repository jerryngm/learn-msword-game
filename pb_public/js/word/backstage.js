// Backstage (File) shell: the frame, the Home page and the Save As flow (Save As > Browse > the Save As
// dialog). Other pages are stubs that later work replaces with registerBackstagePage().

import { ico } from "./icons.js";
import { biPair, esc, labelPair, ws } from "./strings.js";

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
  ["saveas", saveAsPage],
  ["save", saveAsPage],
]);

/** Optional `mount(main, ctx)` runs after a page's HTML is in place (wire events there). */
const MOUNTS = new Map([
  ["saveas", mountSaveAs],
  ["save", mountSaveAs],
]);

/** ctx for a page = {title, doc, close, el, saved({folder, name}), setStage(name)}. */
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

/**
 * Open the Backstage over the Word window. hooks: {title(), doc(), onCommand(id, level), onClose()}.
 * Returns {close(), show(page)}.
 */
export function openBackstage(root, page, hooks) {
  const el = document.createElement("div");
  el.className = "bs";
  el.innerHTML = `<nav class="bs-nav">
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
      const ctx = { title: hooks.title(), doc: hooks.doc(), close, el, setStage, saved: (p) => {
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
  browseHint: { en: "Click Browse to choose where to save your file.", vi: "Bấm Browse để chọn nơi lưu tệp." },
  otherPlace: { en: "In our class we use Browse. Click Browse on the left.", vi: "Ở lớp mình dùng Browse. Hãy bấm Browse ở bên trái." },
  emptyName: { en: "Type a name for your file first.", vi: "Bạn hãy gõ tên cho tệp trước nhé." },
  badChars: { en: "A file name cannot have these: \\ / : * ? \" < > |", vi: "Tên tệp không được có các ký tự này: \\ / : * ? \" < > |" },
  pickFolder: { en: "Click a folder first, for example Documents.", vi: "Hãy bấm vào một thư mục trước, ví dụ Documents." },
  newFolder: { en: "In class we save straight into Documents, so you do not need a new folder.", vi: "Ở lớp mình lưu thẳng vào Documents, nên bạn không cần tạo thư mục mới." },
  empty: { en: "This folder is empty.", vi: "Thư mục này đang trống." },
  wordAdds: { en: "Word adds .docx for you.", vi: "Word tự thêm .docx cho bạn." },
  inactive: { en: "This button is not used in our class.", vi: "Lớp mình không dùng nút này." },
  noSub: { en: "In class we save straight into Documents. You do not need to open this folder.", vi: "Ở lớp mình lưu thẳng vào Documents, bạn không cần mở thư mục này." },
};
const sa = (key) => biPair(SA[key]);

// Folders the dialog can show. `files` are Word documents already there; the learner's own saves are added at save time.
const FOLDERS = {
  onedrive: { label: "OneDrive", path: ["OneDrive"], saveable: true, color: "#0F6CBD", icon: "globe_20", items: [] },
  desktop: { label: "Desktop", path: ["Desktop"], saveable: true, color: "#2B88D8", icon: "window_20", items: [] },
  downloads: { label: "Downloads", path: ["Downloads"], saveable: true, color: "#2E9E6B", icon: "DL", items: [] },
  documents: {
    label: "Documents",
    path: ["Documents"],
    saveable: true,
    color: "#5B7AA8",
    icon: "document_text_20",
    items: [
      { kind: "folder", name: "Custom Office Templates", date: "10/24/2026 9:45 PM" },
      { kind: "file", name: "My_Resume_May2025.docx", date: "5/14/2026 3:10 PM", size: "18 KB" },
      { kind: "file", name: "Shopping_List.docx", date: "9/2/2026 10:22 AM", size: "13 KB" },
    ],
  },
  pictures: { label: "Pictures", path: ["Pictures"], saveable: true, color: "#2B88D8", icon: "image_24", items: [] },
  music: { label: "Music", path: ["Music"], saveable: true, color: "#D13438", icon: "MU", items: [] },
  videos: { label: "Videos", path: ["Videos"], saveable: true, color: "#8764B8", icon: "video_clip_24", items: [] },
  thispc: { label: "This PC", path: ["This PC"], saveable: false, color: "#2B88D8", icon: "window_20", items: [] },
};
const NAV_ORDER = ["onedrive", "desktop", "downloads", "documents", "pictures", "music", "videos", "thispc"];
const PC_FOLDERS = ["desktop", "documents", "downloads", "music", "pictures", "videos"];
// Files saved in this browser tab, so a later Save As shows them in the folder they went to.
const SAVED_FILES = [];

const FOLDER_SVG = `<svg class="sa-fold" viewBox="0 0 20 16" aria-hidden="true"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h4.2l1.6 1.8h9.2A1.5 1.5 0 0 1 19 4.3V13.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 1 13.5z" fill="#F8D775"/><path d="M1 5.2h18v8.3a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 1 13.5z" fill="#FDE9A0"/></svg>`;
const DOC_ICON = `<span class="sa-docic" aria-hidden="true">${ico("wordlogo")}</span>`;

function navIcon(f) {
  if (f.icon === "DL") return `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10M5.5 9 10 13.5 14.5 9M4 16.5h12" fill="none" stroke="#2E9E6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (f.icon === "MU") return `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="15" r="3" fill="#D13438"/><path d="M10 15V4l7-1.5V12" fill="none" stroke="#D13438" stroke-width="2"/><circle cx="14" cy="12" r="3" fill="#D13438"/></svg>`;
  return `<span style="color:${f.color}">${ico(f.icon)}</span>`;
}

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
    if (b.dataset.place === "browse") openDialog(el, ctx);
    else pane.innerHTML = `<p class="sa-lead"><span class="sa-arrow" aria-hidden="true">◀</span>${sa("otherPlace")}</p>`;
  });
}

function openDialog(el, ctx) {
  if (el.querySelector(".sa-scrim")) return;
  const opener = document.activeElement;
  const scrim = document.createElement("div");
  scrim.className = "sa-scrim";
  const navHtml = NAV_ORDER.map((id) => {
    const f = FOLDERS[id];
    return `<button type="button" class="sa-n" data-folder="${id}">${navIcon(f)}<span>${esc(f.label)}</span></button>`;
  }).join("");
  scrim.innerHTML = `<div class="sa-dlg" role="dialog" aria-modal="true" aria-labelledby="sa-dlg-title">
    <div class="sa-tb"><span class="sa-tb-ic">${ico("wordlogo")}</span><span id="sa-dlg-title" class="sa-tb-t">Save As</span>
      <button type="button" class="sa-x" data-act="cancel" aria-label="${esc(labelPair({ en: "Close", vi: "Đóng" }))}">${ico("capclose")}</button></div>
    <div class="sa-addr">
      <button type="button" class="sa-ab" data-act="back" aria-label="Back">${ico("arrow_left_20")}</button>
      <button type="button" class="sa-ab" data-act="fwd" aria-label="Forward">${ico("arrow_forward_20")}</button>
      <button type="button" class="sa-ab sa-up" data-act="up" aria-label="Up">${ico("arrow_forward_20")}</button>
      <div class="sa-path" aria-live="polite"></div>
      <div class="sa-search" aria-hidden="true"><span class="sa-search-t"></span>${ico("search_20")}</div>
    </div>
    <div class="sa-cmd"><button type="button" class="sa-c sa-c-off" data-act="inactive">Organize <i>▾</i></button>
      <button type="button" class="sa-c" data-act="newfolder">New folder</button></div>
    <div class="sa-body"><nav class="sa-nav" aria-label="Folders">${navHtml}</nav>
      <div class="sa-files"><div class="sa-fh"><span>Name</span><span>Date modified</span><span>Type</span><span>Size</span></div><div class="sa-fl" role="listbox" aria-label="Files"></div></div></div>
    <div class="sa-form">
      <label class="sa-row"><span class="sa-lbl">File name:</span><input class="sa-name" type="text" autocomplete="off" spellcheck="false" maxlength="120"></label>
      <label class="sa-row"><span class="sa-lbl">Save as type:</span><select class="sa-type"><option>Word Document</option></select></label>
      <p class="sa-note">${sa("wordAdds")}</p>
      <p class="sa-msg" role="alert"></p>
    </div>
    <div class="sa-foot"><button type="button" class="sa-hide" data-act="hide"><i>▴</i><span>Hide Folders</span></button>
      <span class="sa-grow"></span><button type="button" class="sa-c sa-c-off" data-act="inactive">Tools <i>▾</i></button>
      <button type="button" class="sa-btn sa-save" data-act="save">Save</button><button type="button" class="sa-btn" data-act="cancel">Cancel</button></div>
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
  let folder = "desktop";

  const say = (key) => {
    msg.innerHTML = key ? sa(key) : "";
  };
  const stageFor = () => (folder === "documents" ? "dialog-documents" : "dialog");

  function rowsOf(id) {
    const f = FOLDERS[id];
    if (id === "thispc") return PC_FOLDERS.map((k) => ({ kind: "folder", name: FOLDERS[k].label, go: k, date: "", type: "File folder" }));
    const mine = SAVED_FILES.filter((s) => s.folder === id).map((s) => ({ kind: "file", name: `${s.name}.docx`, date: s.date, size: "12 KB" }));
    return [...f.items, ...mine.filter((m) => !f.items.some((i) => i.name.toLowerCase() === m.name.toLowerCase()))];
  }

  function draw() {
    const f = FOLDERS[folder];
    scrim.querySelectorAll(".sa-n").forEach((b) => b.classList.toggle("is-on", b.dataset.folder === folder));
    pathEl.innerHTML = `<span class="sa-pcrumb">${navIcon(f)}</span><i>›</i><b>${esc(f.label)}</b><i>›</i>`;
    searchT.textContent = `Search ${f.label}`;
    const rows = rowsOf(folder);
    listEl.innerHTML = rows.length
      ? rows
          .map(
            (r, i) => `<div class="sa-r" role="option" tabindex="-1" data-i="${i}" data-name="${esc(r.name)}"${r.go ? ` data-go="${r.go}"` : ""}${r.kind === "folder" ? ' data-kind="folder"' : ""}>
              <span class="sa-rn">${r.kind === "folder" ? FOLDER_SVG : DOC_ICON}<span>${esc(r.name)}</span></span><span>${esc(r.date)}</span>
              <span>${r.kind === "folder" ? "File folder" : "Microsoft Word Document"}</span><span>${esc(r.size ?? "")}</span></div>`,
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
    ctx.setStage("saveas");
    if (opener?.isConnected) opener.focus();
  }

  function save() {
    const raw = nameInput.value.trim();
    if (!raw) return say("emptyName");
    if (/[\\/:*?"<>|]/.test(raw)) return say("badChars");
    const name = raw.replace(/\.docx$/i, "").trim();
    if (!name) return say("emptyName");
    const f = FOLDERS[folder];
    if (!f.saveable) return say("pickFolder");
    const date = dateNow();
    const same = (s) => s.folder === folder && s.name.toLowerCase() === name.toLowerCase();
    const at2 = SAVED_FILES.findIndex(same);
    if (at2 >= 0) SAVED_FILES.splice(at2, 1);
    SAVED_FILES.push({ folder, name, date });
    scrim.remove();
    ctx.saved({ folder: [...f.path], name });
    ctx.close();
  }

  scrim.addEventListener("click", (e) => {
    const nav = e.target.closest(".sa-n");
    if (nav) return go(nav.dataset.folder);
    const row = e.target.closest(".sa-r");
    if (row) {
      listEl.querySelectorAll(".sa-r.is-on").forEach((x) => x.classList.remove("is-on"));
      row.classList.add("is-on");
      return;
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "cancel") closeDialog();
    else if (act === "save") save();
    else if (act === "back" && at > 0) {
      at -= 1;
      go(hist[at], { record: false });
    } else if (act === "fwd" && at < hist.length - 1) {
      at += 1;
      go(hist[at], { record: false });
    } else if (act === "up") go("thispc");
    else if (act === "newfolder") say("newFolder");
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
    else nameInput.value = row.dataset.name.replace(/\.docx$/i, "");
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

  nameInput.value = firstWords(ctx.doc) || ctx.title;
  go("desktop");
  nameInput.focus();
  nameInput.select();
}
