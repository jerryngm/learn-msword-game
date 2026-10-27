// Shared demo player: shows a sequence of actions over a host element. Visual only: it never
// dispatches real input and never changes any model; everything it draws lives in one overlay layer.
//
//   await playDemo(host, script, { resolve, reducedMotion, signal, caret?, selectRects? });
//
// Script steps (one kind per step):
//   {target, click?: 'single'|'double'|'right'}  ghost cursor moves to resolve(target) and clicks
//                                                 (legacy `dbl: true` means a double click)
//   {target, drag: {dx, dy}}                     ghost drag in screen pixels; optional opts.drag
//                                                 updates only the host's temporary demo view
//   {select: {from:{p,offset}, to:{p,offset}}}    ghost selection highlight (needs opts.selectRects)
//   {type: "About me", at?: target}               ghost text types letter by letter (~240 ms each),
//                                                 lighting Shift for capitals, the full stop, Space
//   {key: "Enter" | "Shift+A" | "Ctrl+S" | ...}   lights those keys on the on-screen keyboard
//   {say: {en, vi}}                               caption bubble
//   {wait: ms}
//
// Options:
//   resolve(target) -> Element | {getBoundingClientRect()} | null   where a target is on screen
//   reducedMotion   no moving cursor: numbered markers instead, typing appears at once
//                   (default: the prefers-reduced-motion media query)
//   signal          AbortSignal; aborting removes every overlay at once and resolves the promise
//   caret(target|null) -> {x, y, h, left, right, font} | null   (client px) optional host hook for a
//                   text host (Word): where typing starts for a target, or the current caret for null
//   selectRects(select) -> DOMRect[]   optional host hook: client rects of a model range
//   key(combo)      optional host hook, called after a `key` step lights its keys: the host may
//                   show the key's effect in its temporary demo view only (Word: Delete on a picture)
//   act(target)     optional host hook, called after each ghost click on an element: the host may
//                   open what the click opens (a menu, a Backstage page) so later targets exist.
//                   It must never change the document; the host restores the UI when the demo ends.
//
// The keyboard appears only when the script has a `type` or `key` step, and it (with the caption)
// is docked where it covers neither the current target nor the line being typed.
// In reduced motion the numbered markers and the typed text stay after the promise resolves, so the
// learner can read them; they go when `signal` aborts (callers abort when the learner moves on).

import { biPair } from "../i18n.js";
import { ico } from "../word/icons.js";
import { createKeyboard, keysForChar, parseCombo } from "./keyboard.js";

// Slow enough for a first-time typist to follow each key.
const LETTER_MS = 240;
const CLICKS = new Set(["single", "double", "right"]);
const CLICK_TAG = {
  double: { en: "Double-click", vi: "Bấm đúp chuột" },
  right: { en: "Right-click", vi: "Bấm chuột phải" },
};

const cssReady = (() => {
  if (typeof document === "undefined") return Promise.resolve();
  const href = new URL("../../css/demo.css", import.meta.url).href;
  let link = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((l) => l.href === href);
  if (link?.sheet) return Promise.resolve();
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  return new Promise((done) => {
    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", () => {
      console.error("demo: could not load css/demo.css");
      done();
    }, { once: true });
    setTimeout(done, 2000);
  });
})();

const prefersReduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const isPos = (p) => p && Number.isInteger(p.p) && Number.isInteger(p.offset);

/** Throws a TypeError naming the first bad step. Old {target}/{select}/{say} scripts stay valid. */
export function validateScript(script) {
  if (!Array.isArray(script)) throw new TypeError("demo: script must be an array");
  script.forEach((step, i) => {
    const bad = (why) => {
      throw new TypeError(`demo: step ${i + 1} ${why}`);
    };
    if (!step || typeof step !== "object") bad("is not an object");
    if ("target" in step) {
      if (typeof step.target !== "string" || !step.target) bad("needs a target id");
      if (step.click !== undefined && !CLICKS.has(step.click)) bad("click must be single, double or right");
      if (step.drag !== undefined && (!Number.isFinite(step.drag?.dx) || !Number.isFinite(step.drag?.dy))) bad("drag needs finite dx and dy");
    } else if ("select" in step) {
      if (!isPos(step.select?.from) || !isPos(step.select?.to)) bad("select needs from/to {p, offset}");
    } else if ("type" in step) {
      if (typeof step.type !== "string") bad("type must be a string");
      if (step.at !== undefined && typeof step.at !== "string") bad("at must be a target id");
    } else if ("key" in step) {
      if (!parseCombo(step.key)) bad(`has an unknown key "${step.key}"`);
    } else if ("say" in step) {
      if (!step.say || typeof step.say.en !== "string") bad("say needs {en, vi}");
    } else if ("wait" in step) {
      if (!Number.isFinite(step.wait) || step.wait < 0) bad("wait must be a number of ms");
    } else {
      bad("needs target, select, type, key, say or wait");
    }
  });
}

function intersects(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export async function playDemo(host, script, opts = {}) {
  if (!(host instanceof Element)) throw new TypeError("demo: host must be an element");
  validateScript(script);
  const { signal } = opts;
  const resolve = typeof opts.resolve === "function" ? opts.resolve : () => null;
  if (signal?.aborted) return;
  await cssReady;
  if (signal?.aborted || !host.isConnected) return;
  const reduced = opts.reducedMotion ?? prefersReduced();
  const needsKeyboard = script.some((s) => "type" in s || "key" in s);

  /* ---------- layer and cleanup ---------- */
  const restorePosition = getComputedStyle(host).position === "static" ? host.style.position : null;
  if (restorePosition !== null) host.style.position = "relative";
  const layer = document.createElement("div");
  layer.className = `wg-demo dm-layer${reduced ? " is-reduced" : ""}`;
  layer.innerHTML = `<div class="wg-blocker"></div>`;
  host.appendChild(layer);
  const pressed = new Set();
  const timers = new Set();
  let cleaned = false;
  const aborted = () => cleaned || Boolean(signal?.aborted) || !host.isConnected;

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    signal?.removeEventListener("abort", cleanup);
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    pressed.forEach((el) => el.classList.remove("is-demo-press"));
    pressed.clear();
    layer.remove();
    if (restorePosition !== null) host.style.position = restorePosition;
  }
  signal?.addEventListener("abort", cleanup, { once: true });

  const sleep = (ms) =>
    new Promise((done) => {
      if (aborted()) return done();
      const t = setTimeout(() => {
        timers.delete(t);
        signal?.removeEventListener("abort", stop);
        done();
      }, ms);
      const stop = () => {
        clearTimeout(t);
        timers.delete(t);
        done();
      };
      timers.add(t);
      signal?.addEventListener("abort", stop, { once: true });
    });
  const add = (cls, html = "") => {
    const el = document.createElement("div");
    el.className = cls;
    if (html) el.innerHTML = html;
    layer.appendChild(el);
    return el;
  };
  /** Client rect -> layer coordinates. */
  const rel = (r) => {
    const H = host.getBoundingClientRect();
    return { x: r.left - H.left - host.clientLeft, y: r.top - H.top - host.clientTop, w: r.width, h: r.height };
  };
  const bounds = () => ({ x: 0, y: 0, w: host.clientWidth, h: host.clientHeight });

  /* ---------- ghost cursor, ripples, markers ---------- */
  let ghost = null;
  if (!reduced) {
    ghost = add("wg-ghost dm-ghost", `${ico("ghost")}<span class="wg-ghost-lbl">Watch</span>`);
    const b = bounds();
    ghost.style.left = `${b.w * 0.7}px`;
    ghost.style.top = `${b.h * 0.6}px`;
    await sleep(80);
  }
  const moveTo = async (x, y, ms = 1200) => {
    if (!ghost) return;
    ghost.style.transitionDuration = `${ms}ms`;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
    await sleep(ms + 60);
  };
  const ripple = (x, y, kind) => {
    const r = add(`dm-ripple${kind === "right" ? " is-right" : ""}`);
    r.style.left = `${x}px`;
    r.style.top = `${y}px`;
    const t = setTimeout(() => {
      timers.delete(t);
      r.remove();
    }, 700);
    timers.add(t);
  };
  let markerN = 0;
  const marker = (x, y, tag) => {
    const b = bounds();
    const m = add("wg-marker dm-marker");
    m.textContent = String(++markerN);
    m.style.left = `${Math.max(2, Math.min(b.w - 38, x))}px`;
    m.style.top = `${Math.max(2, Math.min(b.h - 38, y))}px`;
    if (tag) m.insertAdjacentHTML("beforeend", `<span class="dm-tag">${biPair(tag)}</span>`);
    return m;
  };

  /* ---------- dock: caption + keyboard, placed away from what the learner must see ---------- */
  const dock = add("dm-dock");
  const captionSlot = document.createElement("div");
  captionSlot.className = "dm-caption";
  captionSlot.setAttribute("role", "status");
  captionSlot.hidden = true;
  dock.appendChild(captionSlot);
  let kb = null;
  let avoid = [];

  let baseU = 40;
  const setU = (u) => kb?.el.style.setProperty("--u", `${u.toFixed(1)}px`);
  function sizeKeyboard() {
    const b = bounds();
    // 15.6 key units across (15 + gaps and padding), about 7.4 key units tall with the header.
    baseU = Math.max(22, Math.min(40, (b.w - 32) / 15.6, (b.h * 0.46) / 7.4));
    setU(baseU);
  }
  function showKeyboard() {
    if (kb) return;
    kb = createKeyboard();
    sizeKeyboard();
    dock.appendChild(kb.el);
    placeDock();
  }
  /** Bottom centre first, then the top and the corners; the first spot that covers nothing wins. */
  function chooseSpot(b, pads) {
    const w = dock.offsetWidth;
    const h = dock.offsetHeight;
    const m = 12;
    const xs = { center: (b.w - w) / 2, left: m, right: b.w - w - m };
    const ys = { bottom: b.h - h - 16, top: m };
    const spots = [["bottom", "center"], ["top", "center"], ["bottom", "left"], ["bottom", "right"], ["top", "left"], ["top", "right"]].map(([v, hz]) => {
      const o = { x: Math.max(0, xs[hz]), y: Math.max(0, ys[v]), w, h };
      return { ...o, cost: pads.reduce((s, p) => s + overlapArea(o, p), 0) };
    });
    return spots.find((o) => o.cost === 0) ?? spots.reduce((a, o) => (o.cost < a.cost ? o : a));
  }
  function placeDock() {
    const empty = captionSlot.hidden && !kb;
    dock.hidden = empty;
    if (empty) return;
    const b = bounds();
    // Ghost text stays on screen until the end, so it is always kept clear as well.
    const typed = Array.from(layer.querySelectorAll(".dm-type"), (box) => rel(box.getBoundingClientRect()));
    const pads = avoid.concat(typed).map((r) => ({ x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 }));
    if (kb) setU(baseU);
    let best = chooseSpot(b, pads);
    if (kb && best.cost > 0 && pads.length) {
      // No free spot: shrink the keyboard to fit the larger band above or below what must stay visible.
      const top = Math.min(...pads.map((p) => p.y));
      const bottom = Math.max(...pads.map((p) => p.y + p.h));
      const band = Math.max(b.h - bottom - 16, top - 12);
      let u = baseU;
      // Padding and the caption don't scale with the keys, so measure again after each step.
      for (let i = 0; i < 4 && best.cost > 0 && u > 18; i++) {
        const kbH = kb.el.offsetHeight;
        const scale = (band - (dock.offsetHeight - kbH)) / kbH;
        if (!(scale > 0)) break;
        u = Math.max(18, u * Math.min(scale, 0.97));
        setU(u);
        best = chooseSpot(b, pads);
      }
      baseU = u; // never grow back during this demo: one size change at most
    }
    dock.style.left = `${best.x}px`;
    dock.style.top = `${best.y}px`;
  }
  function setAvoid(rects) {
    avoid = rects.filter(Boolean);
    placeDock();
  }

  /* ---------- ghost typing ---------- */
  // A typing run: the line boxes it drew and where a new line starts. Reset by target/select steps.
  let typing = null;
  let lastTarget = null;
  let markedCaret = false; // the last target was a caret spot that already has a marker

  function anchorFromElement(el) {
    if (!el?.getBoundingClientRect) return null;
    const r = el.getBoundingClientRect();
    if (!(el instanceof Element)) return { x: r.left, y: r.top, h: r.height || 18, left: r.left, right: r.left + 400, font: null, single: true };
    const cs = getComputedStyle(el);
    const padL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) || 0;
    const padR = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth) || 0;
    const size = parseFloat(cs.fontSize) || 16;
    const h = Math.min(r.height || size * 1.3, size * 1.35);
    const left = r.left + padL;
    return {
      x: left,
      y: r.top + (r.height - h) / 2,
      h,
      left,
      right: Math.max(left + 40, r.right - padR),
      font: { family: cs.fontFamily, size, weight: cs.fontWeight, style: cs.fontStyle, color: cs.color },
      single: true,
      source: el, // the element typed into; see dropHiddenTyping()
      // Typing into a box replaces what it shows (Windows selects a file name when the box gets focus).
      cover: { top: r.top + parseFloat(cs.borderTopWidth || 0), bottom: r.bottom - parseFloat(cs.borderBottomWidth || 0), bg: opaque(cs.backgroundColor) },
    };
  }
  const opaque = (c) => (!c || c === "transparent" || /rgba\(.*,\s*0\)$/.test(c) ? "#fff" : c);
  const isTextEntry = (el) => el instanceof Element && (el.matches("input, textarea, [contenteditable='true'], [data-demo-type]") || el.isContentEditable);

  // Ghost text typed into a host element (a search box), keyed by its line box.
  const typedSource = new WeakMap();
  /** True when `el` is still on screen: connected, laid out, and not covered by another part of the host. */
  function onScreen(el) {
    if (!el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) return false;
    const x = r.left + Math.min(r.width / 2, 8);
    const y = r.top + r.height / 2;
    const hit = document.elementsFromPoint?.(x, y).find((n) => !layer.contains(n));
    return !hit || hit === el || el.contains(hit) || hit.contains(el);
  }
  // Reduced motion keeps the typed text on screen after each step. When a click changes the host's
  // screen (the Start menu gives way to Word's start screen), text typed into a box that is no longer
  // shown must go with it. Normal motion clears everything when it ends, so it never needs this.
  function dropHiddenTyping() {
    layer.querySelectorAll(".dm-type").forEach((box) => {
      const src = typedSource.get(box);
      if (src && !onScreen(src)) {
        box.remove();
        if (typing?.lines.some((l) => l.box === box)) typing = null;
      }
    });
  }

  // `strict` (key steps): only a real caret or a text box, never a button the cursor just clicked.
  function typingAnchor(at, strict) {
    const caret = typeof opts.caret === "function" ? opts.caret : null;
    if (at) return caret?.(at) ?? anchorFromElement(resolve(at));
    if (lastTarget) {
      const fromCaret = caret?.(lastTarget);
      if (fromCaret) return fromCaret;
      const el = resolve(lastTarget);
      if (isTextEntry(el)) return anchorFromElement(el);
    }
    return caret?.(null) ?? (lastTarget && !strict ? anchorFromElement(resolve(lastTarget)) : null);
  }

  function newLine(a, indent) {
    // Only the line being typed shows a caret.
    layer.querySelectorAll(".dm-caret").forEach((c) => c.remove());
    const box = add(`dm-type${a.single ? " is-single" : ""}`, `<span class="dm-typed"></span><span class="dm-caret"></span>`);
    if (a.source) typedSource.set(box, a.source);
    const r = rel(new DOMRect(a.left, a.y, Math.max(20, a.right - a.left), a.h));
    Object.assign(box.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, lineHeight: `${a.h}px`, minHeight: `${a.h}px`, textIndent: `${indent}px` });
    if (a.cover) {
      // Fill the box's inner height so the old value is hidden behind the ghost text.
      box.style.top = `${rel(new DOMRect(a.left, a.cover.top, 1, 1)).y}px`;
      box.style.minHeight = `${a.cover.bottom - a.cover.top}px`;
      box.style.lineHeight = `${a.cover.bottom - a.cover.top}px`;
      box.style.background = a.cover.bg;
    }
    if (a.font) {
      Object.assign(box.style, { fontFamily: a.font.family, fontSize: `${a.font.size}px`, fontWeight: a.font.weight, fontStyle: a.font.style, color: a.font.color });
    }
    return { box, text: box.querySelector(".dm-typed") };
  }
  function startTyping(at, strict = false) {
    if (typing && !at) return typing;
    const a = typingAnchor(at, strict);
    if (!a) return null;
    const line = newLine(a, Math.max(0, a.x - a.left));
    typing = { anchor: a, lines: [line] };
    if (reduced && !(markedCaret && !at)) {
      // Left of where the line starts, so the marker never hides text already on the line.
      const r = rel(new DOMRect(a.left, a.y, 1, a.h));
      marker(r.x - 44, r.y + r.h / 2 - 18);
    }
    return typing;
  }
  const currentLine = () => typing.lines[typing.lines.length - 1];
  function typingRect() {
    if (!typing) return null;
    const first = typing.lines[0].box.getBoundingClientRect();
    const last = currentLine().box.getBoundingClientRect();
    const r = rel(new DOMRect(first.left, first.top, first.width, last.bottom - first.top));
    // Keep one more line free below: the learner's eye goes there next.
    return { ...r, h: r.h + typing.anchor.h };
  }
  function enter() {
    if (!typing || typing.anchor.single) return;
    const prev = currentLine().box;
    const top = prev.getBoundingClientRect().bottom;
    typing.lines.push(newLine({ ...typing.anchor, y: top }, 0));
  }
  function backspace() {
    if (!typing) return;
    const line = currentLine();
    const chars = Array.from(line.text.textContent);
    if (chars.length) line.text.textContent = chars.slice(0, -1).join("");
    else if (typing.lines.length > 1) {
      typing.lines.pop().box.remove();
      currentLine().box.insertAdjacentHTML("beforeend", `<span class="dm-caret"></span>`);
    }
  }
  const append = (s) => {
    currentLine().text.textContent += s;
  };

  const lightKeys = async (keys, ms) => {
    kb?.press(keys);
    await sleep(ms);
    kb?.release();
  };

  /* ---------- steps ---------- */
  async function doTarget(step) {
    const el = resolve(step.target);
    if (!el?.getBoundingClientRect) {
      console.warn(`demo: no element for ${step.target}`);
      return;
    }
    typing = null;
    lastTarget = step.target;
    const caretSpot = !(el instanceof Element);
    markedCaret = reduced && caretSpot;
    const kind = step.click ?? (step.dbl ? "double" : "single");
    const r = rel(el.getBoundingClientRect());
    setAvoid([r]);
    const tag = CLICK_TAG[kind] ?? null;
    if (step.drag) {
      const x=r.x+r.w/2,y=r.y+r.h/2;
      const label={en:"Drag",vi:"Kéo"};
      if(reduced) {
        marker(x-18,y-24,label);
        marker(x+step.drag.dx-18,y+step.drag.dy+8,label);
        const line=add("dm-drag-path");
        Object.assign(line.style,{position:"absolute",left:`${x}px`,top:`${y}px`,width:`${Math.hypot(step.drag.dx,step.drag.dy)}px`,borderTop:"3px dashed #3466b3",transformOrigin:"0 0",transform:`rotate(${Math.atan2(step.drag.dy,step.drag.dx)}rad)`});
        await sleep(700);
      } else {
        await moveTo(x-4,y-2); if(aborted()) return;
        ghost.querySelector(".wg-ghost-lbl").innerHTML=biPair(label);
        ripple(x,y,"single"); await sleep(300);
        await moveTo(x+step.drag.dx-4,y+step.drag.dy-2); await sleep(300);
      }
      if(!aborted()) opts.drag?.(step.target,step.drag);
      return;
    }
    if (reduced) {
      // resolve() may have switched the host's screen already (start-menu: 'blank-document').
      dropHiddenTyping();
      // A caret spot in the text gets its marker to the left, so it doesn't cover the next line.
      if (caretSpot) marker(r.x - 44, r.y + r.h / 2 - 18, tag);
      else marker(r.x + r.w / 2 - 18, r.y + r.h + 4, tag);
      await sleep(kind === "single" ? 700 : 1100);
      if (!aborted()) {
        opts.act?.(step.target, kind);
        dropHiddenTyping();
      }
      return;
    }
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    await moveTo(cx - 4, cy - 2);
    if (aborted()) return;
    const lbl = ghost.querySelector(".wg-ghost-lbl");
    if (tag) lbl.innerHTML = biPair(tag);
    if (el instanceof Element) {
      el.classList.add("is-demo-press");
      pressed.add(el);
    }
    ripple(cx, cy, kind);
    if (kind === "double") {
      await sleep(200);
      ripple(cx, cy, kind);
    }
    await sleep(kind === "single" ? 1100 : 1400);
    if (el instanceof Element) {
      el.classList.remove("is-demo-press");
      pressed.delete(el);
    }
    if (!aborted()) opts.act?.(step.target, kind);
    if (tag) lbl.textContent = "Watch";
  }

  async function doSelect(step) {
    if (typeof opts.selectRects !== "function") {
      console.warn("demo: this host cannot show a selection");
      return;
    }
    typing = null;
    markedCaret = reduced; // its marker sits left of the selection, where typing would start
    const rects = Array.from(opts.selectRects(step.select) ?? []).map(rel);
    if (!rects.length) return;
    // The text that gets typed next replaces the selection, so typing starts at its first edge.
    const fwd = step.select.from.p < step.select.to.p || (step.select.from.p === step.select.to.p && step.select.from.offset <= step.select.to.offset);
    const start = fwd ? step.select.from : step.select.to;
    lastTarget = `doc:${start.p},${start.offset}`;
    const x = Math.min(...rects.map((q) => q.x));
    const y = Math.min(...rects.map((q) => q.y));
    setAvoid([{ x, y, w: Math.max(...rects.map((q) => q.x + q.w)) - x, h: Math.max(...rects.map((q) => q.y + q.h)) - y }]);
    const hls = rects.map((q) => {
      const h = add("wg-demohl");
      Object.assign(h.style, { left: `${q.x}px`, top: `${q.y}px`, height: `${q.h}px`, width: reduced ? `${q.w}px` : "0px" });
      return h;
    });
    if (reduced) {
      marker(rects[0].x - 44, rects[0].y + rects[0].h / 2 - 18);
      await sleep(700);
      return;
    }
    await moveTo(rects[0].x - 2, rects[0].y + rects[0].h * 0.55);
    if (aborted()) return;
    ripple(rects[0].x, rects[0].y + rects[0].h / 2, "single");
    await sleep(300);
    for (let i = 0; i < rects.length && !aborted(); i++) {
      const q = rects[i];
      const ms = Math.max(300, Math.min(1200, q.w * 3));
      hls[i].style.transition = `width ${ms}ms linear`;
      ghost.style.transition = `left ${ms}ms linear, top 200ms ease`;
      ghost.style.left = `${q.x + q.w}px`;
      ghost.style.top = `${q.y + q.h * 0.55}px`;
      hls[i].style.width = `${q.w}px`;
      await sleep(ms + 40);
    }
    if (ghost) ghost.style.transition = "";
  }

  async function doType(step) {
    showKeyboard();
    const run = startTyping(step.at ?? null);
    if (!run) {
      console.warn("demo: nowhere to show typing");
      return;
    }
    setAvoid([typingRect()]);
    const chars = Array.from(step.type);
    if (reduced) {
      for (const ch of chars) {
        if (ch === "\n") enter();
        else append(ch);
      }
      const keys = new Set();
      for (const ch of chars) for (const k of keysForChar(ch)) if (!/^[A-Z0-9]$/.test(k) || /[A-Z]/.test(ch)) keys.add(k);
      setAvoid([typingRect()]);
      await lightKeys([...keys], 1200);
      return;
    }
    let lines = run.lines.length;
    for (const ch of chars) {
      if (aborted()) return;
      kb.press(keysForChar(ch), ch === " " ? "Space" : undefined);
      if (ch === "\n") enter();
      else append(ch);
      // A capital letter or punctuation gets a little longer so the Shift key is noticed.
      await sleep(/[A-Z.,!?]/.test(ch) ? LETTER_MS * 2.5 : LETTER_MS);
      kb.release();
      await sleep(60);
      const h = currentLine().box.offsetHeight;
      if (run.lines.length !== lines || h > run.anchor.h * 1.5) {
        lines = run.lines.length;
        setAvoid([typingRect()]);
      }
    }
    setAvoid([typingRect()]);
  }

  async function doKey(step) {
    showKeyboard();
    const ids = parseCombo(step.key);
    const hasMod = ids.some((k) => k === "Ctrl" || k === "Alt" || k === "Win");
    if (!hasMod) {
      const main = ids[ids.length - 1];
      const shift = ids.includes("Shift");
      if (main === "Enter" || main === "Backspace" || main === "Space" || main.length === 1) {
        startTyping(null, true);
        if (typing) {
          if (main === "Enter") enter();
          else if (main === "Backspace") backspace();
          else if (main === "Space") append(" ");
          else append(shift ? main.toUpperCase() : main.toLowerCase());
          setAvoid([typingRect()]);
        }
      }
    }
    await lightKeys(ids, reduced ? 1200 : 1400);
    if (!aborted()) opts.key?.(step.key);
    await sleep(500);
  }

  async function doSay(step) {
    captionSlot.innerHTML = biPair({ en: String(step.say.en ?? ""), vi: String(step.say.vi ?? "") });
    captionSlot.hidden = false;
    placeDock();
    const len = String(step.say.en ?? "").length;
    await sleep(reduced ? 900 : Math.min(6000, 2200 + len * 55));
  }

  try {
    placeDock();
    for (const step of script) {
      if (aborted()) break;
      if ("target" in step) await doTarget(step);
      else if ("select" in step) await doSelect(step);
      else if ("type" in step) {
        await doType(step);
        // Hosts can persist typed text in their isolated demo view after its key animation.
        if (!aborted() && opts.typed?.(step.type, step.at ?? lastTarget)) {
          layer.querySelectorAll(".dm-type").forEach(el => el.remove());
          typing = null;
        }
      }
      else if ("key" in step) await doKey(step);
      else if ("say" in step) await doSay(step);
      else if ("wait" in step) await sleep(Math.min(10000, step.wait));
    }
    // Reduced motion: hold the last result briefly, because the host clears its demo view on return.
    if (!aborted() && reduced) await sleep(900);
    if (!aborted() && !reduced) {
      await sleep(needsKeyboard ? 900 : 400);
      layer.classList.add("is-fading");
      await sleep(450);
    }
  } finally {
    if (!reduced || aborted()) cleanup();
    else {
      // Reduced motion: keep the markers, highlights and typed text until the caller aborts.
      layer.querySelector(".wg-blocker")?.remove();
      dock.remove();
      layer.querySelectorAll(".dm-caret").forEach((c) => c.remove());
    }
  }
}
