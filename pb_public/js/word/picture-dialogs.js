// Insert › Pictures windows, drawn after the classroom's Windows Word 365:
//  - This Device: the Windows "Insert Picture" file window. It opens on Pictures (empty); the learner's
//    photos are in Downloads. A click highlights a file and fills File name; Insert or a double-click
//    (or Enter) inserts it. Cancel, X and Escape insert nothing.
//  - Stock Images: tabs, search, category chips and a photo grid; a picked photo enables Insert.
//  - Online Pictures: category tiles; a tile or a search shows a results grid; a picked photo enables Insert.
// Every window resolves with a picture id (from PICTURES) or null. Controls Word has but the lesson does not
// use (Organize, New folder, views, Tools, the Insert arrow, tabs other than Images) are drawn but do nothing.
//
// Demo and spotlight ids (data-spot / data-cmd on the elements):
//   insert.pictures.insert                 the Insert button of whichever picture window is open
//   insert.pictures.cancel                 its Cancel button
//   insert.pictures.nav:<folder>           a folder in the Insert Picture left pane (home, gallery, onedrive,
//                                          desktop, downloads, documents, pictures, music, videos)
//   insert.pictures.online.category:<term> an Online Pictures category tile (term in lower case, e.g. "cats")
//   choice:insert.pictures.choose:<id>     a file / photo (data-picture-file="<id>")
import { DEVICE_PICTURES, PICTURES, ONLINE_CATEGORIES, STOCK_CHIPS, STOCK_DEFAULT, matchPictures, onlineResults } from "./pictures.js";
import { ico } from "./icons.js";
import { esc } from "./strings.js";

export const PICTURE_INSERT = "insert.pictures.insert";
export const PICTURE_CANCEL = "insert.pictures.cancel";
export const PICTURE_NAV = "insert.pictures.nav:";
export const ONLINE_CATEGORY = "insert.pictures.online.category:";
const CHOOSE = "insert.pictures.choose";

const byId = (id) => PICTURES.find((p) => p.id === id) ?? null;

/* ---------- glyphs (Windows 11 Explorer look) ---------- */
const svg = (body, vb = 20) => `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true">${body}</svg>`;
const PIC_GLYPH = svg(`<rect x="2" y="3" width="16" height="14" rx="1.5" fill="#2B88D8"/><path d="m3 16 5-6 3.5 4 2-2.2L17 16z" fill="#fff"/><circle cx="14" cy="7" r="1.6" fill="#fff"/>`);
const GLYPH = {
  home: svg(`<path d="M4.5 9.5V17h11V9.5" fill="#B9B9B9"/><path d="M2.5 10 10 3l7.5 7" fill="none" stroke="#E07A2F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><rect x="8.5" y="12" width="3" height="5" fill="#7A7A7A"/>`),
  gallery: PIC_GLYPH,
  onedrive: svg(`<path d="M1.5 4.5A1.5 1.5 0 0 1 3 3h4.2l1.6 1.8H17A1.5 1.5 0 0 1 18.5 6.3V15A1.5 1.5 0 0 1 17 16.5H3A1.5 1.5 0 0 1 1.5 15z" fill="#F8C94E"/><path d="M1.5 7.2h17V15a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 15z" fill="#FDDA7A"/>`),
  desktop: svg(`<defs><linearGradient id="pdDesk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#54B3F0"/><stop offset="1" stop-color="#1A73C9"/></linearGradient></defs><rect x="1.5" y="4" width="17" height="12" rx="1.2" fill="url(#pdDesk)"/><rect x="1.5" y="13.5" width="17" height="2.5" fill="#0E5AA7"/>`),
  downloads: svg(`<path d="M10 2.5v10.5M5.2 8.6 10 13.3l4.8-4.7" fill="none" stroke="#2E9E6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 17h13" stroke="#2E9E6B" stroke-width="2" stroke-linecap="round"/>`),
  documents: svg(`<path d="M4.5 2.5h8l3 3v12h-11z" fill="#E8EDF3" stroke="#8193A8"/><path d="M7 8h6M7 10.5h6M7 13h6" stroke="#8193A8"/>`),
  pictures: PIC_GLYPH,
  music: svg(`<circle cx="10" cy="10" r="8" fill="#E9785A"/><path d="M8.5 13.2V6.5l4-1v6.2" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="7.4" cy="13.3" r="1.6" fill="#fff"/><circle cx="11.4" cy="11.8" r="1.6" fill="#fff"/>`),
  videos: svg(`<rect x="2" y="3.5" width="16" height="13" rx="1.5" fill="#8B5CD6"/><path d="M8 7v6l5-3z" fill="#fff"/>`),
};
const PIN = svg(`<path d="M11.8 2.8 17.2 8.2l-1.6.6-3 3 .3 3-1.3 1.3-3.2-3.2-4 4-.8-.8 4-4-3.2-3.2 1.3-1.3 3 .3 3-3z" fill="#7A7A7A"/>`);
const VIEW_GLYPH = svg(`<rect x="3" y="4" width="14" height="12" fill="none" stroke="#1A1A1A" stroke-width="1.3"/><path d="M3 13.5h14" stroke="#1A1A1A" stroke-width="1.3"/>`);
const PANE_GLYPH = svg(`<rect x="3" y="4" width="14" height="12" fill="none" stroke="#1A1A1A" stroke-width="1.3"/><rect x="11" y="4" width="6" height="12" fill="#1F6FD1"/>`);
const HELP_GLYPH = svg(`<circle cx="10" cy="10" r="8.5" fill="#1F6FD1"/><path d="M7.7 7.8a2.3 2.3 0 1 1 3.4 2c-.8.5-1.1.9-1.1 1.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="14.4" r="1" fill="#fff"/>`);
const CARET = `<i class="pd-caret" aria-hidden="true">▾</i>`;
// The classroom laptops draw some Online Pictures icons as empty boxes (a missing font); the windows copy that.
const BOX = `<span class="pd-box" aria-hidden="true"></span>`;

const FOLDERS = [
  { id: "home", label: "Home" },
  { id: "gallery", label: "Gallery" },
  { id: "onedrive", label: "OneDrive", expand: true },
  null,
  { id: "desktop", label: "Desktop", pin: true },
  { id: "downloads", label: "Downloads", pin: true, files: DEVICE_PICTURES },
  { id: "documents", label: "Documents", pin: true },
  { id: "pictures", label: "Pictures", pin: true },
  { id: "music", label: "Music", pin: true },
  { id: "videos", label: "Videos", pin: true },
];
const folderOf = (id) => FOLDERS.find((f) => f?.id === id) ?? null;

const fileBtn = (p) =>
  `<button type="button" class="pd-file" data-picture-file="${esc(p.id)}" data-cmd="${CHOOSE}" data-arg="${esc(JSON.stringify(p.id))}" aria-pressed="false" title="${esc(p.file)}">` +
  `<span class="pd-thumb"><img src="${esc(p.src)}" alt="" draggable="false"></span><span class="pd-fn">${esc(p.file)}</span></button>`;
// A photo in the Stock / Online grids keeps its shape: its flex share follows its width/height ratio.
const photoBtn = (p) =>
  `<button type="button" class="pd-photo" data-picture-file="${esc(p.id)}" data-cmd="${CHOOSE}" data-arg="${esc(JSON.stringify(p.id))}" aria-pressed="false" aria-label="${esc(p.name)}" style="--r:${(p.width / p.height).toFixed(3)}">` +
  `<img src="${esc(p.src)}" alt="" draggable="false"><span class="pd-check" aria-hidden="true"></span></button>`;
const EMPTY = `<p class="pd-empty">No items match your search.</p>`;
const EMPTY_FOLDER = `<p class="pd-empty">This folder is empty.</p>`;

function deviceHtml() {
  const nav = FOLDERS.map((f) =>
    f
      ? `<button type="button" class="pd-n" data-folder="${f.id}" data-spot="${PICTURE_NAV}${f.id}"><span class="pd-exp">${f.expand ? ico("chevron_right_12") : ""}</span><span class="pd-ni">${GLYPH[f.id]}</span><span class="pd-nl">${esc(f.label)}</span>${f.pin ? `<span class="pd-pin">${PIN}</span>` : ""}</button>`
      : `<hr class="pd-sep">`,
  ).join("");
  return `<div class="pd-tb"><span class="pd-tb-ic">${ico("wordlogo")}</span><span class="pd-tb-t">Insert Picture</span>
      <button type="button" class="pd-x" data-dlg="__close" aria-label="Close">${ico("capclose")}</button></div>
    <div class="pd-addr">
      <button type="button" class="pd-ab" data-inert aria-label="Back">${ico("arrow_left_20")}</button>
      <button type="button" class="pd-ab" data-inert aria-label="Forward">${ico("arrow_forward_20")}</button>
      <button type="button" class="pd-ab pd-recent" data-inert aria-label="Recent locations">${ico("chevron_down_12")}</button>
      <button type="button" class="pd-ab pd-up" data-inert aria-label="Up">${ico("arrow_forward_20")}</button>
      <div class="pd-path"><span class="pd-crumb"></span><i>›</i><span class="pd-where"></span><span class="pd-grow"></span>
        <button type="button" class="pd-ab pd-sm" data-inert aria-label="Previous locations">${ico("chevron_down_12")}</button>
        <button type="button" class="pd-ab pd-sm" data-inert aria-label="Refresh">${ico("arrow_clockwise_20")}</button></div>
      <div class="pd-search" aria-hidden="true"><span class="pd-search-t"></span>${ico("search_20")}</div>
    </div>
    <div class="pd-cmd"><button type="button" class="pd-c" data-inert>Organize ${CARET}</button><button type="button" class="pd-c" data-inert>New folder</button>
      <span class="pd-grow"></span><button type="button" class="pd-c pd-ic" data-inert aria-label="Change your view">${VIEW_GLYPH}</button><button type="button" class="pd-c pd-ic pd-narrow" data-inert aria-label="More options">${CARET}</button>
      <button type="button" class="pd-c pd-ic" data-inert aria-label="Show the preview pane">${PANE_GLYPH}</button><button type="button" class="pd-c pd-ic" data-inert aria-label="Get help">${HELP_GLYPH}</button></div>
    <div class="pd-body"><nav class="pd-nav" aria-label="Folders">${nav}</nav><div class="pd-files" role="group" aria-label="Files"></div></div>
    <div class="pd-form">
      <div class="pd-frow"><label class="pd-row"><span class="pd-lbl">File name:</span><span class="pd-combo"><input class="pd-name" type="text" autocomplete="off" spellcheck="false" maxlength="120">${ico("chevron_down_12")}</span></label>
        <span class="pd-type">All Pictures${ico("chevron_down_12")}</span></div>
      <div class="pd-frow pd-fbtns"><button type="button" class="pd-c pd-tools" data-inert>Tools ${CARET}</button>
      <span class="pd-split"><button type="button" class="pd-btn pd-insert" data-spot="${PICTURE_INSERT}">Insert</button><button type="button" class="pd-arrow" data-inert aria-label="Insert options">${CARET}</button></span>
      <button type="button" class="pd-btn" data-dlg="cancel" data-spot="${PICTURE_CANCEL}">Cancel</button></div>
    </div>`;
}

const STOCK_TABS = ["Images", "Icons", "Cutout People", "Stickers", "Illustrations", "Cartoon People"];
function stockHtml() {
  const chips = STOCK_CHIPS.map((c) => `<button type="button" class="pd-chip" data-chip="${esc(c.label)}" aria-pressed="false" style="--bg:url('${esc(byId(c.ids[0]).src)}')"><span>${esc(c.label)}</span></button>`).join("");
  return `<button type="button" class="pd-x pd-xo" data-dlg="__close" aria-label="Close">${ico("capclose")}</button>
    <h2 class="pd-h pd-h-stock">Stock Images</h2>
    <div class="pd-tabs" role="tablist">${STOCK_TABS.map((t, i) => `<button type="button" role="tab" class="pd-tab${i ? "" : " is-on"}" aria-selected="${!i}" data-inert>${esc(t)}</button>`).join("")}</div>
    <input class="pd-q" type="text" placeholder="Search Stock Images" aria-label="Search Stock Images" autocomplete="off" spellcheck="false" maxlength="60">
    <div class="pd-chips">${chips}<span class="pd-more">${ico("chevron_right_12")}</span></div>
    <div class="pd-grid" role="group" aria-label="Stock Images"></div>
    <div class="pd-foot"><span class="pd-info">${ico("info_20")}</span><span class="pd-note">As a Microsoft 365 subscriber, you have access to the full library of creative content.</span>
      <span class="pd-grow"></span><button type="button" class="pd-btn pd-primary" data-spot="${PICTURE_INSERT}" disabled>Insert</button>
      <button type="button" class="pd-btn" data-dlg="cancel" data-spot="${PICTURE_CANCEL}">Cancel</button></div>`;
}

function onlineHtml() {
  const tiles = ONLINE_CATEGORIES.map((c) => {
    const term = c.term.toLowerCase();
    return `<button type="button" class="pd-tile" data-term="${esc(term)}" data-spot="${ONLINE_CATEGORY}${esc(term)}" style="--bg:url('${esc(byId(c.picture).src)}')">${BOX}<span>${esc(c.label)}</span></button>`;
  }).join("");
  return `<button type="button" class="pd-x pd-xo" data-dlg="__close" aria-label="Close">${ico("capclose")}</button>
    <div class="pd-ohead"><h2 class="pd-h pd-h-online">Online Pictures</h2><span class="pd-grow"></span><span class="pd-hicons" aria-hidden="true">${BOX}${BOX}</span></div>
    <div class="pd-osearch"><button type="button" class="pd-back" aria-label="Back">${BOX}</button>
      <label class="pd-obox">${BOX}<input class="pd-q" type="text" placeholder="Search Bing" aria-label="Search Bing" autocomplete="off" spellcheck="false" maxlength="60"><button type="button" class="pd-clear" aria-label="Clear search">${BOX}</button></label></div>
    <p class="pd-bing">Powered by <b class="pd-bing-b">${svg(`<path d="M5 2l3.5 1.2v10.6l4.6-2.7-2.2-1-1.4-3.3 6.5 2.2v3.6L8.5 18 5 16z" fill="#1F7FE0"/>`)}Bing</b></p>
    <div class="pd-filters"><button type="button" class="pd-filter" data-inert aria-label="Filter">${BOX}</button><button type="button" class="pd-cc" aria-pressed="true">${BOX}Creative Commons only</button></div>
    <div class="pd-tiles">${tiles}</div>
    <div class="pd-grid" role="group" aria-label="Online Pictures"></div>
    <div class="pd-foot"><span class="pd-note">You are responsible for respecting others' rights, including copyright. <a class="pd-link" href="#" data-inert>Learn more here</a></span>
      <span class="pd-grow"></span><button type="button" class="pd-btn pd-primary" data-spot="${PICTURE_INSERT}" disabled>Insert</button>
      <button type="button" class="pd-btn" data-dlg="cancel" data-spot="${PICTURE_CANCEL}">Cancel</button></div>`;
}

const SPECS = {
  device: { title: "Insert Picture", html: deviceHtml },
  stock: { title: "Stock Images", html: stockHtml },
  online: { title: "Online Pictures", html: onlineHtml },
};

/**
 * The picture windows for one Word mount. `popups` is the mount's popup layer; `isLocked()` is true while a
 * demo plays (learner clicks then do nothing; the demo drives the window through the methods below).
 */
export function createPictureDialogs({ root, popups, isLocked }) {
  if (!(root instanceof Element) || !popups || typeof isLocked !== "function") throw new TypeError("createPictureDialogs: root, popups and isLocked are required");
  const win = () => root.querySelector(".wd-dlg.wd-pic");

  /** Highlight one picture (the others lose it); the device window also fills File name. Returns the id or null. */
  function pick(id, { fillName = true } = {}) {
    const w = win();
    if (!w) return null;
    let picked = null;
    w.querySelectorAll("[data-picture-file]").forEach((b) => {
      const on = b.dataset.pictureFile === id;
      b.classList.toggle("is-picked", on);
      b.setAttribute("aria-pressed", String(on));
      if (on) picked = id;
    });
    if (w.dataset.kind === "device") {
      const name = w.querySelector(".pd-name");
      if (picked && fillName && name) name.value = byId(picked).file;
    }
    // Insert stays off until a picture is chosen (a click, or a file name that matches).
    const insert = w.querySelector(`[data-spot="${PICTURE_INSERT}"]`);
    if (insert) insert.disabled = !picked;
    return picked;
  }
  const picked = () => win()?.querySelector("[data-picture-file].is-picked")?.dataset.pictureFile ?? null;

  /** Insert Picture: show a folder of the left pane (unknown ids are ignored). */
  function showFolder(id) {
    const w = win();
    const f = folderOf(id);
    if (!w || w.dataset.kind !== "device" || !f) return;
    w.dataset.folder = f.id;
    w.querySelectorAll(".pd-n").forEach((b) => b.classList.toggle("is-on", b.dataset.folder === f.id));
    w.querySelector(".pd-crumb").innerHTML = GLYPH[f.id];
    w.querySelector(".pd-where").textContent = f.label;
    w.querySelector(".pd-search-t").textContent = `Search ${f.label}`;
    const files = f.files ?? [];
    w.querySelector(".pd-files").innerHTML = files.length ? `<div class="pd-fgrid">${files.map(fileBtn).join("")}</div>` : EMPTY_FOLDER;
    syncName();
  }
  // A typed file name that matches a file in this folder highlights it (Insert then inserts it), as in Windows.
  function syncName() {
    const w = win();
    const typed = w?.querySelector(".pd-name")?.value.trim().toLowerCase() ?? "";
    const files = folderOf(w?.dataset.folder)?.files ?? [];
    const match = typed ? files.find((p) => p.file.toLowerCase() === typed || p.id === typed) : null;
    pick(match?.id ?? null, { fillName: false });
  }

  /** Stock Images: redraw the grid for the search box text, else the chosen chip, else the default set. */
  function showStock() {
    const w = win();
    if (!w || w.dataset.kind !== "stock") return;
    const was = picked();
    const q = w.querySelector(".pd-q").value;
    const chip = STOCK_CHIPS.find((c) => c.label === w.dataset.chip);
    const list = q.trim() ? matchPictures(q) : (chip ? chip.ids : STOCK_DEFAULT).map(byId);
    w.querySelector(".pd-grid").innerHTML = list.length ? list.map(photoBtn).join("") : EMPTY;
    pick(was);
  }

  /** Online Pictures: results for a search word (a tile or the box); an empty word goes back to the tiles. */
  function search(term) {
    const w = win();
    if (!w || w.dataset.kind !== "online") return;
    const q = String(term ?? "").trim();
    const input = w.querySelector(".pd-q");
    const label = ONLINE_CATEGORIES.find((c) => c.term.toLowerCase() === q.toLowerCase())?.label;
    input.value = q ? label ?? q : "";
    w.dataset.view = q ? "results" : "tiles";
    w.querySelector(".pd-grid").innerHTML = q ? onlineResults(q).map(photoBtn).join("") : "";
    pick(null);
  }

  function onClick(e) {
    const w = win();
    const t = e.target.closest("button,a,[data-inert]");
    if (!w || !t || !w.contains(t)) return;
    if (t.matches("[data-dlg]")) return; // X and Cancel: the popup layer closes the window with null
    e.preventDefault();
    e.stopPropagation();
    if (isLocked() || t.matches("[data-inert]")) return;
    if (t.dataset.pictureFile) {
      const id = pick(t.dataset.pictureFile);
      if (id && e.detail >= 2 && w.dataset.kind === "device") popups.closeDialog(id);
    } else if (t.dataset.spot === PICTURE_INSERT) {
      const id = picked();
      if (id) popups.closeDialog(id);
    } else if (t.dataset.folder) showFolder(t.dataset.folder);
    else if (t.dataset.chip) {
      w.dataset.chip = w.dataset.chip === t.dataset.chip ? "" : t.dataset.chip;
      w.querySelectorAll(".pd-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.chip === w.dataset.chip)));
      showStock();
    } else if (t.dataset.term) search(t.dataset.term);
    else if (t.matches(".pd-back")) search("");
    else if (t.matches(".pd-clear")) {
      w.querySelector(".pd-q").value = "";
      w.querySelector(".pd-q").focus();
    } else if (t.matches(".pd-cc")) t.setAttribute("aria-pressed", String(t.getAttribute("aria-pressed") !== "true"));
  }
  function onKey(e) {
    const w = win();
    if (!w || e.key !== "Enter" || isLocked()) return;
    const file = e.target.closest?.("[data-picture-file]");
    const box = e.target.closest?.(".pd-name,.pd-q");
    if (!file && !box) return;
    e.preventDefault();
    e.stopPropagation();
    if (file) {
      const id = pick(file.dataset.pictureFile);
      if (id && w.dataset.kind === "device") popups.closeDialog(id);
    } else if (box.matches(".pd-name")) {
      const id = picked();
      if (id) popups.closeDialog(id);
    } else if (w.dataset.kind === "online") search(box.value);
    else showStock();
  }
  function onInput(e) {
    if (isLocked()) return;
    if (e.target.matches(".pd-name")) syncName();
    else if (e.target.matches(".pd-q") && win()?.dataset.kind === "stock") showStock();
  }

  /** Open a picture window ("device", "stock" or "online"). Resolves with the picture id to insert, or null. */
  function open(kind) {
    const spec = SPECS[kind];
    if (!spec) return Promise.reject(new TypeError(`picture window: unknown kind ${kind}`));
    return popups.dialog({
      title: spec.title,
      bare: true,
      cls: `wd-pic pd-${kind}`,
      body: spec.html(),
      read: () => null,
      onMount(back) {
        const w = back.querySelector(".wd-dlg");
        w.dataset.kind = kind;
        w.addEventListener("click", onClick);
        w.addEventListener("keydown", onKey);
        w.addEventListener("input", onInput);
        if (kind === "device") {
          // Opens on Pictures (empty), as on the class laptops, with Pictures highlighted in the left pane.
          showFolder("pictures");
        } else if (kind === "stock") showStock();
        else search("");
      },
    });
  }

  return {
    open,
    pick,
    picked,
    showFolder,
    search,
    /** "device" | "stock" | "online" | null */
    kind: () => win()?.dataset.kind ?? null,
    insertButton: () => win()?.querySelector(`[data-spot="${PICTURE_INSERT}"]`) ?? null,
  };
}
