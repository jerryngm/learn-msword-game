// A mini Windows File Explorer. Two uses:
//  - click-ui item (item.mock === "explorer"): a still picture; every part is a click target.
//  - mission (mission.mock === "explorer"): you can move between folders (a click in the left list, or a
//    double-click on a big folder), and a double-click on a file opens it.
// Region ids: nav-home, nav-desktop, nav-downloads, nav-documents, nav-pictures, nav-music, nav-videos,
// tile-<folder> (the big folders on Home), address, search, toolbar, content, file-about-me, file-other.
// mount(el, {item, mission, learner, onRegion(id, el), onOpen(name), onWrong()})
//   -> {destroy(), reveal(regionId), spotlight(regionId|null), demo(script), resolve(id)}
// resolve(id) -> Element|null, for the replay/demo player (visual only, never clicks anything). Ids: the region ids above,
// 'documents' (= nav-documents), 'file:About_Me_<Name>' (that file's row; any 'file:About_Me_...' finds the learner's own file,
// and so does 'file-about-me'), and 'taskbar-explorer' (the yellow folder on the taskbar strip, which a still picture shows
// only when it is mounted without onRegion, i.e. as a replay stage; a click-ui item keeps its full height).
// In a still picture (not a mission) a file row only exists once Documents is showing, so resolving a file id switches the
// picture to Documents. A mission never changes view on resolve: it is the learner's own window.
// onOpen(name) reports the folder you went to ("Documents") or the file you opened ("About_Me_Lan.docx").

import { ico } from "../word/icons.js";
import { biPair, esc, labelPair } from "../i18n.js";

function useStyles(root) {
  let link = document.head.querySelector("link[data-wg-mocks]");
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../../css/mocks.css", import.meta.url).href;
    link.dataset.wgMocks = "";
    document.head.append(link);
  }
  if (link.sheet) return;
  root.style.visibility = "hidden";
  const show = () => (root.style.visibility = "");
  link.addEventListener("load", show, { once: true });
  link.addEventListener("error", show, { once: true });
}

const MSG = {
  other: { en: "That is a different file. Look for About_Me_ and your name.", vi: "Đó là tệp khác. Hãy tìm tệp About_Me_ có tên của bạn." },
  opening: { en: "Your file is opening in Word.", vi: "Tệp của bạn đang mở trong Word." },
  oneClick: { en: "One click only chooses a file. Double-click to open it.", vi: "Bấm một lần chỉ là chọn tệp. Muốn mở, hãy bấm đúp." },
  folder: { en: "That folder is empty.", vi: "Thư mục đó đang trống." },
};

const FOLDERS = [
  { id: "desktop", label: "Desktop", color: "#2B88D8", icon: "window_20" },
  { id: "downloads", label: "Downloads", color: "#2E9E6B", icon: "DL" },
  { id: "documents", label: "Documents", color: "#5B7AA8", icon: "document_text_20" },
  { id: "pictures", label: "Pictures", color: "#2B88D8", icon: "image_24" },
  { id: "music", label: "Music", color: "#D13438", icon: "MU" },
  { id: "videos", label: "Videos", color: "#8764B8", icon: "video_clip_24" },
];
const LABEL = Object.fromEntries(FOLDERS.map((f) => [f.id, f.label]));

const PIN = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 1.8 14.2 6.5 12.6 7.2 10.8 9.6 11.2 12 10.4 12.8 7.6 10 3.4 14.2 2.6 13.4 6 9.6 3.2 6.8 4 6 6.4 6.4 8.8 4.6 9.5 3z" fill="none" stroke="#6B6B6B" stroke-width="1"/></svg>`;
const FOLDER_SVG = `<svg class="mke-fold" viewBox="0 0 20 16" aria-hidden="true"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h4.2l1.6 1.8h9.2A1.5 1.5 0 0 1 19 4.3V13.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 1 13.5z" fill="#F8D775"/><path d="M1 5.2h18v8.3a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 1 13.5z" fill="#FDE9A0"/></svg>`;

function folderIcon(f) {
  if (f.icon === "DL") return `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10M5.5 9 10 13.5 14.5 9M4 16.5h12" fill="none" stroke="#2E9E6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (f.icon === "MU") return `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="15" r="3" fill="#D13438"/><path d="M10 15V4l7-1.5V12" fill="none" stroke="#D13438" stroke-width="2"/><circle cx="14" cy="12" r="3" fill="#D13438"/></svg>`;
  return `<span style="color:${f.color}">${ico(f.icon)}</span>`;
}

/** Windows file names can't hold \ / : * ? " < > |. The learner's first name is used in the file name. */
function aboutMeFile(learnerName) {
  const first = String(learnerName ?? "").trim().split(/\s+/)[0] ?? "";
  const safe = first.replace(/[\\/:*?"<>|]/g, "").slice(0, 30) || "Name";
  return `About_Me_${safe}.docx`;
}

function filesOf(folder, mine) {
  if (folder === "documents") {
    return [
      { kind: "folder", name: "Custom Office Templates", date: "10/24/2026 9:45 PM", type: "File folder", size: "" },
      { kind: "file", region: "file-about-me", name: mine, date: "10/25/2026 9:12 AM", type: "Microsoft Word Document", size: "12 KB" },
      { kind: "file", region: "file-other", name: "My_Resume_May2025.docx", date: "5/14/2026 3:10 PM", type: "Microsoft Word Document", size: "18 KB" },
      { kind: "file", region: "file-other", name: "Recipe_Pho.docx", date: "8/30/2026 6:48 PM", type: "Microsoft Word Document", size: "14 KB" },
      { kind: "file", region: "file-other", name: "Shopping_List.docx", date: "9/2/2026 10:22 AM", type: "Microsoft Word Document", size: "13 KB" },
    ];
  }
  if (folder === "downloads") {
    return [
      { kind: "file", region: "file-other", name: "Bus_Map.pdf", date: "10/12/2026 4:01 PM", type: "PDF File", size: "220 KB", pdf: true },
      { kind: "file", region: "file-other", name: "Class_Timetable.pdf", date: "10/3/2026 8:15 AM", type: "PDF File", size: "96 KB", pdf: true },
    ];
  }
  return [];
}

const WIN_LOGO = `<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="#4CA6F0" d="M2 3.4 9 2.4v7H2zM10 2.3l8-1.2v8.3h-8zM2 10.6h7v7l-7-1zM10 10.6h8v8.3l-8-1.2z"/></svg>`;

/** The Windows taskbar under a still File Explorer picture. Not a click target; the replay points at the yellow folder. */
function taskbar() {
  return `<div class="mke-task" aria-hidden="true"><span class="mke-tb">${WIN_LOGO}</span><span class="mke-tb mke-tsearch">${ico("search_20")}Search</span><span class="mke-tb mke-tfold" data-t="taskbar-explorer">${FOLDER_SVG}</span><span class="mke-tb">${ico("globe_20")}</span><span class="mke-tclock">9:30 AM<br>10/25/2026</span></div>`;
}

function html({ view, mine, interactive, withTaskbar }) {
  const nav = FOLDERS.map(
    (f) => `<div class="mk-r mke-n${view === f.id ? " is-on" : ""}" data-region="nav-${f.id}" data-folder="${f.id}" role="button" tabindex="0"><span class="mk-tag">${f.label}</span>${folderIcon(f)}<span class="mke-nl">${f.label}</span><i class="mke-pin">${PIN}</i></div>`,
  ).join("");
  const crumb = view === "home" ? "Home" : `<span>This PC</span><i>›</i><b>${LABEL[view]}</b>`;
  let content;
  if (view === "home") {
    content = `<div class="mke-sec">Quick access</div><div class="mke-tiles">${FOLDERS.map(
      (f) => `<div class="mk-r mke-tile" data-region="tile-${f.id}" data-folder="${f.id}" role="button" tabindex="0"><span class="mk-tag">${f.label}</span><span class="mke-tic">${folderIcon(f)}</span><span class="mke-tn"><b>${f.label}</b><small>Stored locally</small></span></div>`,
    ).join("")}</div>`;
  } else {
    const rows = filesOf(view, mine);
    content = `<div class="mke-fh"><span>Name</span><span>Date modified</span><span>Type</span><span>Size</span></div>${
      rows.length
        ? rows
            .map(
              (f) => `<div class="mk-r mke-r" data-region="${f.region ?? "content"}" data-kind="${f.kind}" data-name="${esc(f.name)}" role="button" tabindex="0">${f.region === "file-about-me" ? '<span class="mk-tag">Your file</span>' : ""}
                <span class="mke-rn">${f.kind === "folder" ? FOLDER_SVG : f.pdf ? '<span class="mke-pdf">PDF</span>' : `<span class="mke-w">${ico("wordlogo")}</span>`}<span>${esc(f.name)}</span></span>
                <span>${esc(f.date)}</span><span>${esc(f.type)}</span><span>${esc(f.size)}</span></div>`,
            )
            .join("")
        : `<p class="mke-empty">This folder is empty.</p>`
    }`;
  }
  const count = view === "home" ? FOLDERS.length : filesOf(view, mine).length;
  return `<div class="mk-ex${interactive ? " is-live" : withTaskbar ? " has-task" : ""}" aria-label="File Explorer">
    <div class="mke-title"><span class="mke-tab">${ico("folder_open_20")}<span>${view === "home" ? "Home" : LABEL[view]}</span><i>×</i></span><span class="mke-caps">${ico("capmin")}${ico("caprestore")}${ico("capclose")}</span></div>
    <div class="mk-r mke-cmd" data-region="toolbar" role="button" tabindex="0"><span class="mk-tag">Toolbar</span>
      <span class="mke-cb">${ico("add_circle_20")}New <i>▾</i></span><span class="mke-sep"></span>
      <span class="mke-cb">${ico("cut_20")}</span><span class="mke-cb">${ico("copy_20")}</span><span class="mke-cb">${ico("clipboard_paste_20")}</span><span class="mke-cb">${ico("edit_20")}</span><span class="mke-cb">${ico("share_ios_20")}</span>
      <span class="mke-sep"></span><span class="mke-cb">${ico("arrow_sort_20")}Sort <i>▾</i></span><span class="mke-cb">${ico("text_align_left_20")}View <i>▾</i></span></div>
    <div class="mke-addr">
      <span class="mke-ab">${ico("arrow_left_20")}</span><span class="mke-ab">${ico("arrow_forward_20")}</span><span class="mke-ab mke-up">${ico("arrow_forward_20")}</span>
      <div class="mk-r mke-path" data-region="address" role="button" tabindex="0"><span class="mk-tag">Address bar</span>${ico("document_text_20")}<i>›</i>${crumb}<i>›</i></div>
      <div class="mk-r mke-search" data-region="search" role="button" tabindex="0"><span class="mk-tag">Search box</span>Search ${view === "home" ? "Home" : LABEL[view]}${ico("search_20")}</div>
    </div>
    <div class="mke-body">
      <nav class="mke-nav" aria-label="Folders"><div class="mk-r mke-n${view === "home" ? " is-on" : ""}" data-region="nav-home" data-folder="home" role="button" tabindex="0"><span class="mk-tag">Home</span><span style="color:#0F6CBD">${ico("home_20")}</span><span class="mke-nl">Home</span></div>
        <hr>${nav}</nav>
      <div class="mk-r mke-main" data-region="content" role="group"><span class="mk-tag">Files</span>${content}</div>
    </div>
    <div class="mke-status"><span>${count} item${count === 1 ? "" : "s"}</span><span class="mke-sel"></span></div>
    ${withTaskbar ? taskbar() : ""}
    <div class="mke-toast" role="status" hidden></div>
  </div>`;
}

export function mount(el, { item, mission, learner, onRegion, onOpen, onWrong } = {}) {
  const interactive = Boolean(mission) && !item;
  // A still picture mounted without onRegion is a replay stage: it also shows the taskbar (the yellow File Explorer folder).
  const withTaskbar = !interactive && typeof onRegion !== "function";
  const mine = aboutMeFile(learner?.name);
  const root = document.createElement("div");
  root.className = `mk-root${interactive ? " is-tall" : ""}`;
  useStyles(root);
  el.appendChild(root);
  let view = "home";
  let spot = null;
  let toastTimer = 0;
  let demoRun = 0;
  const timers = new Set();

  function draw() {
    root.innerHTML = html({ view, mine, interactive, withTaskbar });
    root.querySelectorAll(".mk-r").forEach((n, i) => {
      n.setAttribute("aria-label", labelPair({ en: `Part ${i + 1} of the File Explorer window`, vi: `Phần ${i + 1} của cửa sổ File Explorer` }));
    });
    // Fixed element names are read by screen readers once the learner has found them; until then they stay neutral.
    applySpot();
  }
  function applySpot() {
    root.querySelectorAll(".is-spot").forEach((n) => n.classList.remove("is-spot"));
    if (spot) root.querySelector(`[data-region="${CSS.escape(spot)}"]`)?.classList.add("is-spot");
  }
  function toast(msg, good = false) {
    const t = root.querySelector(".mke-toast");
    if (!t) return;
    t.innerHTML = biPair(msg);
    t.classList.toggle("is-good", good);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 3600);
  }
  function go(folder) {
    if (!interactive || (folder !== "home" && !LABEL[folder])) return;
    view = folder;
    draw();
    // Going to a folder counts as "opening" it: the mission's first step ticks on "Documents".
    onOpen?.(folder === "home" ? "Home" : LABEL[folder]);
  }

  /** A still picture shows another folder when a replay points at something that lives there. */
  function showView(folder) {
    if (interactive || view === folder) return;
    view = folder;
    draw();
  }
  const fileKey = (name) => String(name).replace(/\.docx$/i, "").toLowerCase();
  function resolve(id) {
    if (typeof id !== "string" || !id) return null;
    const q = (sel) => root.querySelector(sel);
    if (id === "taskbar-explorer") return q('[data-t="taskbar-explorer"]');
    if (id === "file-about-me" || id.startsWith("file:")) {
      if (view !== "documents") showView("documents");
      const rows = [...root.querySelectorAll(".mke-r[data-kind='file']")];
      const want = id.startsWith("file:") ? fileKey(id.slice(5)) : "";
      return (want && rows.find((r) => fileKey(r.dataset.name) === want)) || q('.mke-r[data-region="file-about-me"]');
    }
    return q(`[data-region="${CSS.escape(id === "documents" ? "nav-documents" : id)}"]`);
  }

  const onClick = (e) => {
    const n = e.target.closest(".mk-r");
    if (!n || !root.contains(n)) return;
    if (!interactive) {
      onRegion?.(n.dataset.region, n);
      return;
    }
    if (n.classList.contains("mke-n") && n.dataset.folder) return go(n.dataset.folder);
    if (n.classList.contains("mke-r") || n.classList.contains("mke-tile")) {
      root.querySelectorAll(".mke-r.is-sel,.mke-tile.is-sel").forEach((x) => x.classList.remove("is-sel"));
      n.classList.add("is-sel");
      const sel = root.querySelector(".mke-sel");
      if (sel) sel.textContent = "1 item selected";
      if (n.dataset.kind === "file") toast(MSG.oneClick);
    }
  };
  const onDbl = (e) => {
    if (!interactive) return;
    const n = e.target.closest(".mk-r");
    if (!n) return;
    if (n.classList.contains("mke-tile")) return go(n.dataset.folder);
    if (n.classList.contains("mke-r")) {
      if (n.dataset.kind === "folder") return toast(MSG.folder);
      const name = n.dataset.name;
      onOpen?.(name);
      if (n.dataset.region === "file-about-me") toast(MSG.opening, true);
      else {
        toast(MSG.other);
        onWrong?.();
      }
    }
  };
  const onKey = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const n = e.target;
    if (!n.classList?.contains("mk-r")) return;
    e.preventDefault();
    if (!interactive) return onRegion?.(n.dataset.region, n);
    // Keyboard: Enter opens (like a double-click), Space chooses (like a click).
    if (e.key === "Enter") onDbl(e);
    else onClick(e);
  };
  root.addEventListener("click", onClick);
  root.addEventListener("dblclick", onDbl);
  root.addEventListener("keydown", onKey);
  draw();

  /* ----- help: spotlight and Show me ----- */
  const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const wait = (ms) => new Promise((res) => timers.add(setTimeout(res, ms)));

  async function demo(script) {
    const steps = Array.isArray(script) ? script : [];
    const run = ++demoRun;
    root.querySelector(".mke-ghost")?.remove();
    root.querySelectorAll(".mk-marker").forEach((n) => n.remove());
    const box = root.querySelector(".mk-ex");
    if (!box || !steps.length) return;
    box.classList.add("is-demo");
    const ghost = document.createElement("div");
    ghost.className = "mke-ghost";
    ghost.innerHTML = `<svg viewBox="0 0 30 36" aria-hidden="true"><path d="M3 2 L3 28 L10 21 L15 33 L20 31 L15 19 L25 19 Z" fill="#fff" stroke="#17324D" stroke-width="2" stroke-linejoin="round"/></svg>`;
    const B = box.getBoundingClientRect();
    ghost.style.left = `${B.width * 0.7}px`;
    ghost.style.top = `${B.height * 0.75}px`;
    if (!reduced()) box.appendChild(ghost);
    let n = 0;
    try {
      for (const step of steps) {
        if (run !== demoRun) return;
        const target = resolve(step?.target);
        if (!target) continue;
        const R = target.getBoundingClientRect();
        const x = R.left - B.left + Math.min(R.width / 2, 90);
        const y = R.top - B.top + R.height / 2;
        if (reduced()) {
          const m = document.createElement("div");
          m.className = "mk-marker";
          m.textContent = String(++n);
          m.style.left = `${x - 14}px`;
          m.style.top = `${y + 10}px`;
          box.appendChild(m);
          await wait(1100);
          continue;
        }
        ghost.style.left = `${x - 4}px`;
        ghost.style.top = `${y - 2}px`;
        await wait(950);
        const dbl = step.dbl || step.click === "double";
        for (let k = 0; k < (dbl ? 2 : 1); k++) {
          if (run !== demoRun) return;
          ghost.classList.remove("is-press");
          void ghost.offsetWidth;
          ghost.classList.add("is-press");
          target.classList.add("is-demo-press");
          await wait(dbl ? 330 : 520);
          target.classList.remove("is-demo-press");
        }
        await wait(350);
      }
    } finally {
      if (run === demoRun) {
        ghost.remove();
        box.classList.remove("is-demo");
        root.querySelectorAll(".mk-marker").forEach((m) => m.remove());
      }
    }
  }

  return {
    reveal(id) {
      root.querySelector(`[data-region="${CSS.escape(String(id))}"]`)?.classList.add("is-reveal", "is-tagged");
    },
    spotlight(id) {
      spot = typeof id === "string" && id ? id : null;
      applySpot();
    },
    demo,
    resolve,
    destroy() {
      demoRun += 1;
      clearTimeout(toastTimer);
      timers.forEach((t) => clearTimeout(t));
      root.removeEventListener("click", onClick);
      root.removeEventListener("dblclick", onDbl);
      root.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
