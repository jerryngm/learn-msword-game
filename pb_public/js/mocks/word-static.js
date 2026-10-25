// A still picture of the Word window for click-ui items. Each part of the screen is a click target.
// Region ids: title, qat, tabs, ribbon, document, status.
// mount(el, {item, learner, onRegion(id, el)}) -> {destroy(), reveal(regionId), resolve(id)}
// resolve(id) -> Element|null, for the replay/demo player (visual only, never clicks anything). Ids: the region ids above,
// 'file' (the File tab), and the Save As route: 'bs.saveas' (Save As in the File menu), 'sa.browse', 'sa.documents' (alias 'documents'),
// 'sa.name' (the File name box, empty so a {type, at: 'sa.name'} step shows in it) and 'sa.save'.
// The picture has these stages: the window, the File menu, the Save As window on Desktop ('sa.documents', before Documents is
// clicked) and the Save As window with Documents chosen ('sa.name', 'sa.save'). resolve() switches to the stage the id lives in,
// so a "where you are" picture is mount() + resolve('sa.name').

import { ico } from "../word/icons.js";
import { esc, labelPair } from "../i18n.js";

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

const NAMES = {
  title: "Title bar",
  qat: "Quick Access Toolbar",
  tabs: "Tabs",
  ribbon: "Ribbon",
  document: "Document area",
  status: "Status bar",
};
const ORDER = Object.keys(NAMES);

const btn = (icon, label) => `<span class="mkw-b">${ico(icon)}${label ? `<em>${label}</em>` : ""}</span>`;
const group = (name, body) => `<div class="mkw-g"><div class="mkw-gb">${body}</div><div class="mkw-gl">${name}</div></div>`;

function initialsOf(name) {
  return String(name ?? "").trim().split(/\s+/).filter(Boolean).map((w) => Array.from(w)[0]).slice(0, 2).join("").toUpperCase();
}

function saveAsHtml() {
  const nav = ["Desktop", "Downloads", "Documents", "Pictures", "Music"]
    .map((f) => `<span${f === "Desktop" ? ' class="is-on"' : ""}${f === "Documents" ? ' data-t="sa.documents"' : ""}>${f}</span>`)
    .join("");
  const items = ["Home", "New", "Open", "Info", "Save", "Save As", "Print", "Share", "Close"]
    .map((f) => `<span${f === "Save As" ? ' class="is-on" data-t="bs.saveas"' : ""}>${f}</span>`)
    .join("");
  return `<div class="mkb" aria-hidden="true">
    <div class="mkb-nav"><span class="mkb-back">&larr;</span>${items}</div>
    <div class="mkb-main"><div class="mkb-h">Save As</div>
      <div class="mkb-loc"><span>OneDrive</span><span>This PC</span><span>Add a Place</span><span class="mkb-browse" data-t="sa.browse">${ico("folder_open_20")}Browse</span></div></div>
    <div class="mkb-dim"></div>
    <div class="mkb-dlg">
      <div class="mkb-dh">Save As</div>
      <div class="mkb-db"><div class="mkb-dn">${nav}</div><div class="mkb-dl"><span class="mkb-empty">This folder is empty.</span><ul class="mkb-files"><li>My_Resume_May2025.docx</li><li>Recipe_Pho.docx</li></ul></div></div>
      <div class="mkb-df"><label>File name:</label><span class="mkb-name" data-t="sa.name"></span></div>
      <div class="mkb-df"><label>Save as type:</label><span class="mkb-type">Word Document (*.docx)</span></div>
      <div class="mkb-dbtn"><span class="mkb-save" data-t="sa.save">Save</span><span>Cancel</span></div>
    </div>
  </div>`;
}

function html(initials) {
  const tabs = ["File", "Home", "Insert", "Design", "Layout", "References", "Mailings", "Review", "View", "Help"]
    .map((t) => `<span class="mkw-tab${t === "Home" ? " is-on" : ""}"${t === "File" ? ' data-t="file"' : ""}>${t}</span>`)
    .join("");
  const region = (id, cls, inner) => `<div class="mk-r mkw-${cls}" data-region="${id}" role="button" tabindex="0"><span class="mk-tag">${NAMES[id]}</span>${inner}</div>`;
  return `<div class="mk-word" data-stage="window" aria-label="Word">
    <div class="mkw-top">
      ${region("qat", "qat", `<span class="mkw-logo">${ico("wordlogo")}</span><span class="mkw-auto">AutoSave<i>Off</i></span>${btn("save_20")}${btn("arrow_undo_20")}${btn("arrow_clockwise_20")}`)}
      ${region("title", "title", `<span class="mkw-name">Document1 &nbsp;-&nbsp; Word</span><span class="mkw-search">${ico("search_20")}Search</span><span class="mkw-av">${esc(initials)}</span>`)}
    </div>
    ${region("tabs", "tabs", `<div class="mkw-tablist">${tabs}</div><div class="mkw-pills"><span>${ico("comment_20")}Comments</span><span class="mkw-share">${ico("share_ios_20")}Share</span></div>`)}
    ${region(
      "ribbon",
      "ribbon",
      `<div class="mkw-groups">${group("Clipboard", `<span class="mkw-big">${ico("clipboard_paste_32")}<em>Paste</em></span><span class="mkw-col">${btn("cut_20", "Cut")}${btn("copy_20", "Copy")}${btn("paint_brush_20", "Format Painter")}</span>`)}
        ${group("Font", `<span class="mkw-col"><span class="mkw-row"><span class="mkw-box">Aptos (Body) ▾</span><span class="mkw-box s">12 ▾</span>${btn("font_increase_20")}${btn("font_decrease_20")}</span><span class="mkw-row"><b class="mkw-bi">B</b><i class="mkw-bi">I</i><u class="mkw-bi">U</u>${btn("text_strikethrough_20")}${btn("highlight_20")}${btn("text_font_20")}</span></span>`)}
        ${group("Paragraph", `<span class="mkw-col"><span class="mkw-row">${btn("text_bullet_list_ltr_20")}${btn("text_number_list_ltr_20")}${btn("text_indent_decrease_ltr_20")}${btn("text_indent_increase_ltr_20")}</span><span class="mkw-row">${btn("text_align_left_20")}${btn("text_align_center_20")}${btn("text_align_right_20")}${btn("text_line_spacing_20")}</span></span>`)}
        ${group("Styles", `<span class="mkw-style"><b>Normal</b></span><span class="mkw-style h">Heading 1</span>`)}
        ${group("Editing", `<span class="mkw-col">${btn("search_20", "Find")}${btn("replace", "Replace")}</span>`)}</div>`,
    )}
    ${region("document", "doc", `<div class="mkw-page"><p>My name is Lan.</p><p>I am learning Word.<span class="mkw-caret"></span></p></div>`)}
    ${region("status", "status", `<span>Page 1 of 1</span><span>8 words</span><span class="mkw-sp"></span><span>Focus</span><span class="mkw-zoom">&minus; <i></i> + &nbsp;100%</span>`)}
    ${saveAsHtml()}
  </div>`;
}

export function mount(el, { learner, onRegion } = {}) {
  const root = document.createElement("div");
  root.className = "mk-root";
  root.innerHTML = html(initialsOf(learner?.name));
  useStyles(root);
  el.appendChild(root);
  root.querySelectorAll(".mk-r").forEach((r) => {
    r.setAttribute("aria-label", labelPair({ en: `Part ${ORDER.indexOf(r.dataset.region) + 1} of the Word window`, vi: `Phần ${ORDER.indexOf(r.dataset.region) + 1} của cửa sổ Word` }));
  });

  const onClick = (e) => {
    const r = e.target.closest(".mk-r");
    if (r && root.contains(r)) onRegion?.(r.dataset.region, r);
  };
  const onKey = (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("mk-r")) {
      e.preventDefault();
      onRegion?.(e.target.dataset.region, e.target);
    }
  };
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKey);

  const word = root.querySelector(".mk-word");
  const STAGE_OF = { "bs.saveas": "backstage", "sa.browse": "backstage", "sa.documents": "dialog", "sa.name": "dialog-docs", "sa.save": "dialog-docs" };

  return {
    reveal(id) {
      root.querySelector(`[data-region="${CSS.escape(String(id))}"]`)?.classList.add("is-reveal", "is-tagged");
    },
    resolve(id) {
      if (typeof id !== "string" || !id) return null;
      const key = id === "documents" ? "sa.documents" : id;
      if (key in STAGE_OF) {
        word.dataset.stage = STAGE_OF[key];
        return root.querySelector(`[data-t="${key}"]`);
      }
      if (key === "file" || ORDER.includes(key)) {
        word.dataset.stage = "window";
        return key === "file" ? root.querySelector('[data-t="file"]') : root.querySelector(`[data-region="${key}"]`);
      }
      return null;
    },
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}

