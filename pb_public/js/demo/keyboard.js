// On-screen keyboard for demos: a plain English (US/UK-neutral) Windows laptop layout.
//   const kb = createKeyboard();   host.appendChild(kb.el);
//   kb.press(["Shift", "A"]);      lights those keys (and shows "Shift + A" in the header)
//   kb.release();                  unlights everything
// It is a picture only: it never listens to or sends real key events.
// Key names: letters and digits, ". , / ; ' [ ] \ - = `", Space, Enter, Backspace, Tab, CapsLock,
// Shift, Ctrl, Alt, Win, Fn, Esc, Delete, Home, End, F1-F12, ArrowLeft/Right/Up/Down.

import { esc, labelPair } from "../i18n.js";

// Each key: [id, label, width in key units, shifted label?]. Every row adds up to 15 units.
const ROWS = [
  [["Esc", "Esc", 1], ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `F${i + 1}`, 0.92]), ["Home", "Home", 1], ["End", "End", 1], ["Delete", "Delete", 0.96]],
  [["`", "`", 1, "~"], ["1", "1", 1, "!"], ["2", "2", 1, "@"], ["3", "3", 1, "#"], ["4", "4", 1, "$"], ["5", "5", 1, "%"], ["6", "6", 1, "^"], ["7", "7", 1, "&"], ["8", "8", 1, "*"], ["9", "9", 1, "("], ["0", "0", 1, ")"], ["-", "-", 1, "_"], ["=", "=", 1, "+"], ["Backspace", "⟵ Backspace", 2]],
  [["Tab", "Tab ⇥", 1.5], ..."QWERTYUIOP".split("").map((c) => [c, c, 1]), ["[", "[", 1, "{"], ["]", "]", 1, "}"], ["\\", "\\", 1.5, "|"]],
  [["CapsLock", "Caps Lock", 1.75], ..."ASDFGHJKL".split("").map((c) => [c, c, 1]), [";", ";", 1, ":"], ["'", "'", 1, '"'], ["Enter", "Enter ↵", 2.25]],
  [["Shift", "⇧ Shift", 2.25], ..."ZXCVBNM".split("").map((c) => [c, c, 1]), [",", ",", 1, "<"], [".", ".", 1, ">"], ["/", "/", 1, "?"], ["ShiftRight", "⇧ Shift", 2.75]],
  [["Ctrl", "Ctrl", 1.25], ["Fn", "Fn", 1], ["Win", "", 1.25], ["Alt", "Alt", 1.25], ["Space", "", 5.75], ["AltRight", "Alt", 1.25], ["CtrlRight", "Ctrl", 1.25], ["ArrowLeft", "←", 1], ["ArrowsUD", "", 1], ["ArrowRight", "→", 1]],
];

const SHIFTED = new Map(ROWS.flat().filter((k) => k[3]).map((k) => [k[3], k[0]]));
const KEY_IDS = new Set(ROWS.flat().map((k) => k[0]).concat(["ArrowUp", "ArrowDown"]));

const ALIASES = {
  control: "Ctrl", ctrl: "Ctrl", shift: "Shift", alt: "Alt", win: "Win", windows: "Win", fn: "Fn",
  enter: "Enter", return: "Enter", backspace: "Backspace", tab: "Tab", capslock: "CapsLock", caps: "CapsLock",
  space: "Space", spacebar: "Space", " ": "Space", esc: "Esc", escape: "Esc", del: "Delete", delete: "Delete",
  home: "Home", end: "End", left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown",
  arrowleft: "ArrowLeft", arrowright: "ArrowRight", arrowup: "ArrowUp", arrowdown: "ArrowDown",
  "←": "ArrowLeft", "→": "ArrowRight", "↑": "ArrowUp", "↓": "ArrowDown", period: ".", fullstop: ".", comma: ",",
};

// Words shown in the header for a combo ("Ctrl + S"); keys not listed show their own id.
const SHOW = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Space: "Space", ".": ". (full stop)", ",": ", (comma)" };

const WIN_LOGO = `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M0 0h7.5v7.5H0zM8.5 0H16v7.5H8.5zM0 8.5h7.5V16H0zM8.5 8.5H16V16H8.5z"/></svg>`;

/** Canonical key id for a name ("ctrl" -> "Ctrl", "a" -> "A"), or null if the keyboard has no such key. */
export function keyId(name) {
  const s = String(name ?? "");
  if (s.length === 1 && /[a-z]/i.test(s)) return s.toUpperCase();
  if (KEY_IDS.has(s)) return s;
  const alias = ALIASES[s.toLowerCase()] ?? ALIASES[s];
  if (alias) return alias;
  const f = /^f(\d{1,2})$/i.exec(s);
  if (f && Number(f[1]) >= 1 && Number(f[1]) <= 12) return `F${Number(f[1])}`;
  return null;
}

/**
 * Parse a combo like "Shift+A", "Ctrl+S", "Enter" or "Ctrl++" into key ids.
 * Returns null when any part is not on the keyboard.
 */
export function parseCombo(combo) {
  const s = String(combo ?? "").trim();
  if (!s) return null;
  const parts = s === "+" ? ["+"] : s.replace(/\+\+$/, "+plus").split("+").map((p) => (p === "plus" ? "+" : p.trim()));
  const ids = [];
  for (const p of parts) {
    const shifted = p.length === 1 && SHIFTED.has(p);
    const id = shifted ? SHIFTED.get(p) : keyId(p);
    if (!id) return null;
    if (shifted && !ids.includes("Shift")) ids.unshift("Shift");
    ids.push(id);
  }
  return [...new Set(ids)];
}

/** Keys a learner presses to type one character ("A" -> Shift + A, "." -> full stop). [] if none. */
export function keysForChar(ch) {
  if (ch === " ") return ["Space"];
  if (ch === "\n") return ["Enter"];
  if (ch === "\t") return ["Tab"];
  if (/^[A-Z]$/.test(ch)) return ["Shift", ch];
  if (/^[a-z]$/.test(ch)) return [ch.toUpperCase()];
  if (SHIFTED.has(ch)) return ["Shift", SHIFTED.get(ch)];
  if (ch.length === 1 && KEY_IDS.has(ch)) return [ch];
  // Vietnamese and other accented letters: show the base letter (the tone keys depend on the IME).
  const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  if (base.length !== 1 || !/[a-z]/i.test(base)) return [];
  return base === base.toUpperCase() ? ["Shift", base] : [base.toUpperCase()];
}

function keyHtml([id, text, units, shifted]) {
  const style = `style="flex-grow:${units}"`;
  if (id === "ArrowsUD") {
    return `<span class="kb-col" ${style}><span class="kb-k kb-half" data-k="ArrowUp">↑</span><span class="kb-k kb-half" data-k="ArrowDown">↓</span></span>`;
  }
  const word = text.length > 1 && !/^F\d+$/.test(text) ? " kb-word" : "";
  const fn = /^(Esc|F\d+|Home|End|Delete)$/.test(id) ? " kb-fn" : "";
  const inner = id === "Win" ? WIN_LOGO : shifted ? `<span class="kb-sh">${esc(shifted)}</span><span>${esc(text)}</span>` : esc(text);
  return `<span class="kb-k${word}${fn}${shifted ? " kb-two" : ""}" data-k="${esc(id)}" ${style}>${inner}</span>`;
}

// Left and right modifiers light together only when the right one is named; a combo uses the left.
const MIRROR = { ShiftRight: "Shift", CtrlRight: "Ctrl", AltRight: "Alt" };

export function createKeyboard() {
  const el = document.createElement("div");
  el.className = "kb";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", labelPair({ en: "On-screen keyboard", vi: "Bàn phím trên màn hình" }));
  el.innerHTML = `<div class="kb-combo" aria-hidden="true"></div><div class="kb-keys">${ROWS.map((r, i) => `<div class="kb-row${i === 0 ? " kb-row-fn" : ""}">${r.map(keyHtml).join("")}</div>`).join("")}</div>`;
  const combo = el.querySelector(".kb-combo");
  const keyEls = new Map();
  for (const k of el.querySelectorAll("[data-k]")) keyEls.set(k.dataset.k, k);

  function release() {
    for (const k of el.querySelectorAll(".kb-k.is-lit")) k.classList.remove("is-lit");
    combo.textContent = "";
    combo.classList.remove("is-on");
  }

  /** Light keys (ids or names). Unknown names are ignored. `caption` overrides the header text. */
  function press(keys, caption) {
    release();
    const ids = (Array.isArray(keys) ? keys : [keys]).map((k) => (keyEls.has(k) ? k : keyId(k))).filter(Boolean);
    for (const id of ids) keyEls.get(id)?.classList.add("is-lit");
    const text = caption ?? ids.map((id) => SHOW[id] ?? (MIRROR[id] || id)).join(" + ");
    combo.textContent = text;
    combo.classList.toggle("is-on", Boolean(text));
  }

  return { el, press, release, destroy: () => el.remove() };
}
