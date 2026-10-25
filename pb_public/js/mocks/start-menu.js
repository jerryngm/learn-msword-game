// The Windows Start menu after typing "Word", for click-ui items.
// Region ids: word-app (the Word result and its Open button), search-box, filters, web-result, detail,
// start-button, taskbar.
// mount(el, {item, learner, onRegion(id, el)}) -> {destroy(), reveal(regionId)}

import { ico } from "../word/icons.js";
import { labelPair } from "../i18n.js";

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
  "word-app": "Word",
  "search-box": "Search box",
  filters: "Filters",
  "web-result": "Web search",
  detail: "App details",
  "start-button": "Start button",
  taskbar: "Taskbar",
};
const r = (id, cls, inner, tag = true) => `<div class="mk-r ${cls}" data-region="${id}" role="button" tabindex="0">${tag ? `<span class="mk-tag">${NAMES[id]}</span>` : ""}${inner}</div>`;

const WIN_LOGO = `<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="#0078D4" d="M2 3.4 9 2.4v7H2zM10 2.3l8-1.2v8.3h-8zM2 10.6h7v7l-7-1zM10 10.6h8v8.3l-8-1.2z"/></svg>`;

function html() {
  const filters = ["All", "Apps", "Documents", "Web", "Settings", "Folders"].map((f, i) => `<span class="mks-f${i === 0 ? " is-on" : ""}">${f}</span>`).join("");
  return `<div class="mk-start" aria-label="Windows">
    <div class="mks-menu">
      ${r("search-box", "mks-search", `${ico("search_20")}<span class="mks-typed">word</span><span class="mks-caret"></span>`)}
      ${r("filters", "mks-filters", filters)}
      <div class="mks-cols">
        <div class="mks-left">
          <div class="mks-h">Best match</div>
          ${r("word-app", "mks-best", `<span class="mks-wlogo">${ico("wordlogo")}</span><span class="mks-bt"><b>Word</b><small>App</small></span>`)}
          <div class="mks-h">Search the web</div>
          ${r("web-result", "mks-web", `${ico("search_20")}<span>word <small>- See web results</small></span>`)}
        </div>
        ${r(
          "detail",
          "mks-right",
          `<span class="mks-big">${ico("wordlogo")}</span><b>Word</b><small>App</small>
            ${r("word-app", "mks-act", `${ico("document_20")}<span>Open</span>`, false)}
            <span class="mks-act-i">${ico("shield_24")}<span>Run as administrator</span></span>`,
        )}
      </div>
    </div>
    ${r(
      "taskbar",
      "mks-bar",
      `<span class="mks-ic">${r("start-button", "mks-startbtn", WIN_LOGO, false)}</span>
       <span class="mks-ic mks-pill">${ico("search_20")}Search</span><span class="mks-ic">${ico("folder_open_20")}</span><span class="mks-ic">${ico("globe_20")}</span>
       <span class="mks-clock">9:30 AM<br>10/25/2026</span>`,
    )}
  </div>`;
}

export function mount(el, { onRegion } = {}) {
  const root = document.createElement("div");
  root.className = "mk-root";
  root.innerHTML = html();
  useStyles(root);
  el.appendChild(root);
  root.querySelectorAll('.mk-r').forEach((n, i) => {
    n.setAttribute("aria-label", labelPair({ en: `Part ${i + 1} of the screen`, vi: `Phần ${i + 1} của màn hình` }));
  });

  const onClick = (e) => {
    const n = e.target.closest(".mk-r");
    if (n && root.contains(n)) onRegion?.(n.dataset.region, n);
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
      // The Word result is shown twice (the list and the Open button); point at the list one.
      const n = root.querySelector(`.mk-best[data-region="${CSS.escape(String(id))}"]`) ?? root.querySelector(`[data-region="${CSS.escape(String(id))}"]`);
      n?.classList.add("is-reveal", "is-tagged");
    },
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}

