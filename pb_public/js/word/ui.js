// Popups inside the Word window: dropdown menus, Word-style dialogs, the game toast and notes.
// Everything is positioned relative to the engine root so several engines can live on one page.

import { getCommand } from "./commands.js";
import { fontStack } from "./render.js";
import { ico } from "./icons.js";
import { biPair, esc, ws } from "./strings.js";

/** Encode a menu argument so numbers stay numbers. */
export function encArg(arg) {
  return arg === undefined ? "" : esc(JSON.stringify(arg));
}
export function decArg(el) {
  const raw = el.getAttribute("data-arg");
  if (raw == null || raw === "") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // plain string written straight into markup (ribbon style tiles)
  }
}

const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function focusables(el) {
  return Array.from(el.querySelectorAll(FOCUSABLE)).filter((x) => x.offsetParent !== null);
}

function relRect(root, el) {
  const r = el.getBoundingClientRect();
  const R = root.getBoundingClientRect();
  return { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height };
}

const UL_CSS = { single: "solid", double: "double", thick: "solid", dotted: "dotted", dashed: "dashed", wave: "wavy" };

function itemHtml(it, i) {
  if (it.tableGrid) return `<div class="wm-table-grid" aria-label="Choose table size">${Array.from({length:80},(_,i)=>{ const cols=i%10+1,rows=Math.floor(i/10)+1; return `<button type="button" data-cmd="insert.table.create" data-arg="${cols}x${rows}" data-cols="${cols}" data-rows="${rows}" aria-label="${cols} columns, ${rows} rows" title="${cols} columns, ${rows} rows"></button>`; }).join("")}</div>`;
  if (it.sep) return `<div class="wm-sep" role="separator"></div>`;
  if (it.searchbox) return `<button type="button" class="wm-searchbox" data-cmd="${it.cmd}">${esc(it.label)}</button>`;
  if (it.inert) return `<div class="wm-item is-inert"><span class="wm-lead">${ico(it.icon)}</span><span class="wm-label"><b>${esc(it.label)}</b></span></div>`;
  if (it.heading) return `<div class="wm-head">${esc(it.heading)}</div>`;
  if (it.palette) {
    const cells = it.palette
      .map((c) => `<button type="button" class="wm-sw" data-cmd="${it.cmd}" data-arg="${encArg(c.hex)}" title="${esc(c.name ?? c.hex)}" style="background:${c.hex}"></button>`)
      .join("");
    return `<div class="wm-pal${it.firstRowGap ? " gap-first" : ""}" style="--cols:${it.cols ?? 10}">${cells}</div>`;
  }
  if (it.tiles) {
    return `<div class="wm-tiles">${it.tiles
      .map((t) => {
        const face = t.numbers
          ? [1, 2, 3].map((n) => `<span>${esc(numberLabel(t.numbers, n))} ——</span>`).join("")
          : t.big ? `<span class="wm-glyph">${esc(t.text)}</span>` : `<span>${esc(t.text)}</span>`;
        return `<button type="button" class="wm-tile" data-cmd="${t.cmd}" data-arg="${encArg(t.arg)}" title="${esc(t.text ?? t.numbers)}">${face}</button>`;
      })
      .join("")}</div>`;
  }
  if (it.icons) {
    return `<div class="wm-icons${it.indent ? " is-indent" : ""}">${it.icons
      .map((b) => `<button type="button" class="wm-iconbtn${b.disabled ? " is-disabled" : ""}" data-cmd="${b.cmd}" data-arg="${encArg(b.arg)}" title="${esc(b.label)}">${ico(b.icon)}${b.textOnly ? '<span class="wm-a">A</span>' : ""}</button>`)
      .join("")}</div>`;
  }
  let face = accel(it.label);
  if (it.underline) face = `<span style="text-decoration:underline;text-decoration-style:${UL_CSS[it.underline]};${it.underline === "thick" ? "text-decoration-thickness:2.5px;" : ""}text-decoration-skip-ink:none">${face}</span>`;
  if (it.effect) face = `<span class="wm-fx-${it.effect}">${face}</span>`;
  if (it.font) face = `<span style="font-family:${esc(fontStack(it.font))};font-size:14px">${face}</span>${it.hint ? ` <span class="wm-hint">${esc(it.hint)}</span>` : ""}`;
  const lead = it.swatch ? `<span class="wm-auto" style="background:${it.swatch}"></span>` : it.leadGlyph ? `<span class="wm-leadglyph">${esc(it.leadGlyph)}</span>` : it.icon ? ico(it.icon, it.iconCls ?? "") : `<span class="wm-ck">${it.checked ? "✓" : ""}</span>`;
  // A submenu item (submenu: [items]) opens its list beside the menu on hover or click; it runs no command.
  const sub = Array.isArray(it.submenu) ? ` data-sub="${i}" aria-haspopup="menu"` : ` data-cmd="${it.cmd}" data-arg="${encArg(it.arg)}"`;
  return `<button type="button" class="wm-item${it.checked ? " is-checked" : ""}${it.disabled ? " is-disabled" : ""}"${sub}>
    <span class="wm-lead">${lead}</span><span class="wm-label">${face}</span>${it.submenu ? `<span class="wm-sub">${ico("chevron_right_12")}</span>` : ""}</button>`;
}

/** "Cu&t" -> "Cu<u>t</u>": Word underlines each menu item's access key. */
function accel(label) {
  const parts = String(label ?? "").split("&");
  return esc(parts[0]) + parts.slice(1).map((p) => (p ? `<u>${esc(p[0])}</u>${esc(p.slice(1))}` : "&amp;")).join("");
}

function numberLabel(fmt, n) {
  const map = { "1.": `${n}.`, "1)": `${n})`, "I.": `${["I", "II", "III"][n - 1]}.`, "A.": `${"ABC"[n - 1]}.`, "a)": `${"abc"[n - 1]})`, "a.": `${"abc"[n - 1]}.`, "i.": `${["i", "ii", "iii"][n - 1]}.` };
  return map[fmt] ?? `${n}.`;
}

export function createPopups(root) {
  const layer = document.createElement("div");
  layer.className = "wm-layer";
  root.appendChild(layer);
  let menuEl = null;
  let subEl = null;
  let dialogEl = null;
  let noteEl = null;
  let toastEl = null;
  let toastTimer = 0;
  let noteTimer = 0;
  let dialogResolve = null;

  function place(el, anchor, { below = true, alignRight = false } = {}) {
    const R = root.getBoundingClientRect();
    const a = anchor ? relRect(root, anchor) : { x: R.width / 2, y: R.height / 3, w: 0, h: 0 };
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = alignRight ? a.x + a.w - w : a.x;
    let y = below ? a.y + a.h + 2 : a.y - h - 2;
    if (y + h > R.height - 4) y = Math.max(4, a.y - h - 2);
    x = Math.max(4, Math.min(R.width - w - 4, x));
    y = Math.max(4, Math.min(R.height - h - 4, y));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  const api = {
    layer,
    /** Show a dropdown menu under `anchor`. Items are data from command.menu(). */
    openMenu(anchor, items, opts = {}) {
      api.closeMenu();
      menuEl = document.createElement("div");
      menuEl.className = `wm-menu${opts.className ? ` ${opts.className}` : ""}`;
      menuEl.setAttribute("role", "menu");
      menuEl.innerHTML = items.map(itemHtml).join("");
      layer.appendChild(menuEl);
      const own = menuEl;
      const showSub = (e) => {
        const btn = e.target.closest?.(".wm-item");
        if (!btn || !own.contains(btn) || btn.classList.contains("is-disabled")) return;
        if (!btn.dataset.sub) return api.closeSubmenu();
        if (subEl?._from === btn) return;
        api.closeSubmenu();
        subEl = document.createElement("div");
        subEl.className = "wm-menu wm-submenu";
        subEl.setAttribute("role", "menu");
        subEl.innerHTML = items[Number(btn.dataset.sub)].submenu.map(itemHtml).join("");
        subEl._from = btn;
        btn.classList.add("is-open");
        layer.appendChild(subEl);
        // Beside the item, flipped to the left when there is no room on the right.
        const R = root.getBoundingClientRect();
        const b = relRect(root, btn);
        const m = relRect(root, own);
        let x = m.x + m.w - 2;
        if (x + subEl.offsetWidth > R.width - 4) x = Math.max(4, m.x - subEl.offsetWidth + 2);
        subEl.style.left = `${x}px`;
        subEl.style.top = `${Math.max(4, Math.min(R.height - subEl.offsetHeight - 4, b.y - 5))}px`;
      };
      own.addEventListener("mouseover", showSub);
      own.addEventListener("click", (e) => { if (e.target.closest?.("[data-sub]")) { e.stopPropagation(); showSub(e); } });
      if (opts.at) {
        menuEl.style.left = `${opts.at.x}px`;
        menuEl.style.top = `${opts.at.y}px`;
        place(menuEl, null);
        const R = root.getBoundingClientRect();
        const x = Math.max(4, Math.min(R.width - menuEl.offsetWidth - 4, opts.at.x));
        const y = Math.max(4, Math.min(R.height - menuEl.offsetHeight - 4, opts.at.y));
        menuEl.style.left = `${x}px`;
        menuEl.style.top = `${y}px`;
      } else place(menuEl, anchor, opts);
      if (anchor) anchor.classList.add("is-open");
      menuEl._anchor = anchor;
      return menuEl;
    },
    closeSubmenu() {
      subEl?._from?.classList.remove("is-open");
      subEl?.remove();
      subEl = null;
    },
    closeMenu() {
      api.closeSubmenu();
      if (!menuEl) return;
      menuEl._anchor?.classList.remove("is-open");
      menuEl.remove();
      menuEl = null;
    },
    get menuOpen() {
      return Boolean(menuEl);
    },
    /** Extra floating element (mini toolbar). Closed with closeMenu's sibling closeFloat. */
    float(html, at, className) {
      api.closeFloat();
      const el = document.createElement("div");
      el.className = className;
      el.innerHTML = html;
      layer.appendChild(el);
      const R = root.getBoundingClientRect();
      el.style.left = `${Math.max(4, Math.min(R.width - el.offsetWidth - 4, at.x))}px`;
      el.style.top = `${Math.max(4, Math.min(R.height - el.offsetHeight - 4, at.y))}px`;
      api._float = el;
      return el;
    },
    closeFloat() {
      api._float?.remove();
      api._float = null;
    },
    /**
     * Word-style dialog. spec = {title, body (HTML), buttons:[{label, value, primary}], width, onMount(el, close)}.
     * Resolves with the clicked button value, or null when closed with X/Escape.
     */
    dialog(spec) {
      api.closeDialog(null);
      dialogEl = document.createElement("div");
      dialogEl.className = "wd-dlg-back";
      const buttons = (spec.buttons ?? [{ label: "OK", value: "ok", primary: true }])
        .map((b) => `<button type="button" class="wd-dbtn${b.primary ? " is-primary" : ""}" data-dlg="${esc(b.value)}">${esc(b.label)}</button>`)
        .join("");
      dialogEl.innerHTML = `<div class="wd-dlg" role="dialog" aria-label="${esc(spec.title)}" style="width:${spec.width ?? 420}px">
        <div class="wd-dlg-title"><span>${esc(spec.title)}</span><button type="button" class="wd-dlg-x" data-dlg="__close" aria-label="Close">${ico("dismiss_16")}</button></div>
        <div class="wd-dlg-body">${spec.body}</div>
        <div class="wd-dlg-foot">${buttons}</div></div>`;
      layer.appendChild(dialogEl);
      return new Promise((resolve) => {
        dialogResolve = resolve;
        dialogEl.addEventListener("click", (e) => {
          const b = e.target.closest("[data-dlg]");
          if (!b) return;
          const v = b.getAttribute("data-dlg");
          const value = v === "__close" ? null : spec.read ? spec.read(dialogEl, v) : v;
          api.closeDialog(value);
        });
        // Modal: Escape closes it (like Cancel), Tab stays inside, and the focus leaves the page so
        // typing can't reach the document behind it.
        dialogEl.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            api.closeDialog(null);
          } else if (e.key === "Tab") {
            const items = focusables(dialogEl);
            if (!items.length) return e.preventDefault();
            const i = items.indexOf(document.activeElement);
            const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1;
            e.preventDefault();
            items[next].focus();
          }
        });
        spec.onMount?.(dialogEl);
        const first = dialogEl.querySelector("input:not([readonly]):not([disabled]),textarea:not([disabled]),select:not([disabled])") ?? dialogEl.querySelector(".wd-dbtn.is-primary") ?? focusables(dialogEl)[0];
        first?.focus({ preventScroll: true });
      });
    },
    closeDialog(value = null) {
      if (!dialogEl) return;
      dialogEl.remove();
      dialogEl = null;
      const r = dialogResolve;
      dialogResolve = null;
      r?.(value);
    },
    get dialogOpen() {
      return Boolean(dialogEl);
    },
    /** Game toast at the bottom of the canvas. opts: {undo: fn, ok: bool, ms}. */
    toast(pair, opts = {}) {
      clearTimeout(toastTimer);
      toastEl?.remove();
      toastEl = document.createElement("div");
      toastEl.className = `wg-toast${opts.ok ? " is-ok" : ""}`;
      toastEl.setAttribute("role", "status");
      toastEl.innerHTML = `<div class="wg-toast-msg">${biPair(pair)}</div>${opts.undo ? `<button type="button" class="wg-toast-undo">${biPair(ws("undo"))}</button>` : ""}`;
      if (opts.undo) {
        toastEl.querySelector(".wg-toast-undo").addEventListener("click", () => {
          opts.undo();
          api.toast(ws("undone"), { ok: true });
        });
      }
      layer.appendChild(toastEl);
      const el = toastEl;
      requestAnimationFrame(() => el.classList.add("is-shown"));
      toastTimer = setTimeout(() => api.closeToast(), opts.ms ?? (opts.undo ? 8000 : 3500));
    },
    closeToast() {
      clearTimeout(toastTimer);
      toastEl?.remove();
      toastEl = null;
    },
    /** Friendly bilingual note bubble pointing at an element (for level-b explanations). */
    note(pair, anchor) {
      api.closeNote();
      noteEl = document.createElement("div");
      noteEl.className = "wg-note";
      noteEl.setAttribute("role", "status");
      noteEl.innerHTML = `<div>${biPair(pair)}</div>`;
      layer.appendChild(noteEl);
      place(noteEl, anchor, { below: true });
      noteTimer = setTimeout(() => api.closeNote(), 6000);
    },
    closeNote() {
      clearTimeout(noteTimer);
      noteEl?.remove();
      noteEl = null;
    },
    /** Close everything except the toast. */
    closeAll() {
      api.closeMenu();
      api.closeFloat();
      api.closeNote();
    },
    destroy() {
      clearTimeout(toastTimer);
      clearTimeout(noteTimer);
      api.closeDialog(null);
      layer.remove();
    },
    relRect: (el) => relRect(root, el),
  };
  return api;
}

/** Level of a command id, for menu items built from data. */
export function levelOf(id) {
  return getCommand(id)?.level ?? "c";
}
