// A still picture of the Word window for click-ui items. Each part of the screen is a click target.
// Region ids: title, qat, tabs, ribbon, document, status.
// mount(el, {item, learner, onRegion(id, el)}) -> {destroy(), reveal(regionId)}

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

function html(initials) {
  const tabs = ["File", "Home", "Insert", "Design", "Layout", "References", "Mailings", "Review", "View", "Help"]
    .map((t) => `<span class="mkw-tab${t === "Home" ? " is-on" : ""}">${t}</span>`)
    .join("");
  const region = (id, cls, inner) => `<div class="mk-r mkw-${cls}" data-region="${id}" role="button" tabindex="0"><span class="mk-tag">${NAMES[id]}</span>${inner}</div>`;
  return `<div class="mk-word" aria-label="Word">
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

  return {
    reveal(id) {
      root.querySelector(`[data-region="${CSS.escape(String(id))}"]`)?.classList.add("is-reveal", "is-tagged");
    },
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}

