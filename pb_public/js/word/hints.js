// Hint ladder UI. The mission screen decides *when* each level shows; this module draws it.
//   const hints = createHints(word, { hint1: {en, vi}, spotlight: 'home.font', demo: script });
//   hints.show(1)  hint bubble with the text hint
//   hints.show(2)  hint bubble pointing at the spotlit ribbon group (numbered marker if reduced motion)
//   hints.show(3)  "Show me": plays the demo script through js/demo/player.js (ghost cursor, ghost
//                  typing, on-screen keyboard; the document never changes), then the "Your turn"
//                  card, placed so it never covers the target line, with "▶ Show me again"
//   hints.hide()   removes everything

import { getInternals } from "./index.js";
import { biPair, ws } from "./strings.js";

/** Make a mission's Help button pulse gently (the "glow" state of the ladder). */
export function setHelpGlow(button, on) {
  button?.classList.toggle("wg-help-glow", Boolean(on));
}

function intersects(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Where to put a card of size w x h inside `bounds` without overlapping `avoid` (the target line).
 * Tries below, above, right, then left of the target; returns {x, y, side}.
 */
export function placeAvoiding(avoid, w, h, bounds, gap = 16) {
  const pad = { x: avoid.x - 6, y: avoid.y - 6, w: avoid.w + 12, h: avoid.h + 12 };
  const cx = Math.max(bounds.x + 8, Math.min(bounds.x + bounds.w - w - 8, avoid.x + avoid.w / 2 - w / 2));
  const cy = Math.max(bounds.y + 8, Math.min(bounds.y + bounds.h - h - 8, avoid.y + avoid.h / 2 - h / 2));
  const options = [
    { x: cx, y: avoid.y + avoid.h + gap, side: "below" },
    { x: cx, y: avoid.y - h - gap, side: "above" },
    { x: avoid.x + avoid.w + gap, y: cy, side: "right" },
    { x: avoid.x - w - gap, y: cy, side: "left" },
  ];
  const fits = (o) => o.x >= bounds.x && o.y >= bounds.y && o.x + w <= bounds.x + bounds.w && o.y + h <= bounds.y + bounds.h;
  const ok = options.find((o) => fits(o) && !intersects({ x: o.x, y: o.y, w, h }, pad));
  if (ok) return ok;
  // Nothing fits cleanly: take the side with the most room, then clamp away from the line.
  const below = bounds.y + bounds.h - (avoid.y + avoid.h);
  const above = avoid.y - bounds.y;
  return below >= above
    ? { x: cx, y: Math.min(bounds.y + bounds.h - h, avoid.y + avoid.h + gap), side: "below" }
    : { x: cx, y: Math.max(bounds.y, avoid.y - h - gap), side: "above" };
}

export function createHints(word, cfg = {}) {
  const w = getInternals(word);
  const { root, popups } = w;
  const hint1 = cfg.hint1 && typeof cfg.hint1.en === "string" ? cfg.hint1 : null;
  const spot = typeof cfg.spotlight === "string" ? cfg.spotlight : null;
  const script = Array.isArray(cfg.demo) ? cfg.demo : [];
  let bubble = null;
  let card = null;
  let again = null;
  let running = false;
  let runId = 0; // bumped by hide(); a demo that settles after it must not show the Your-turn card
  let alive = true;

  function removeBubble() {
    bubble?.remove();
    bubble = null;
  }
  function removeCard() {
    card?.remove();
    card = null;
  }
  function removeAgain() {
    again?.remove();
    again = null;
  }

  function showBubble(pointAt) {
    removeBubble();
    if (!hint1) return;
    bubble = document.createElement("div");
    bubble.className = "wg-hint";
    bubble.setAttribute("role", "status");
    bubble.innerHTML = `<span class="wg-hint-ic" aria-hidden="true">💡</span><div class="wg-hint-txt">${biPair(hint1)}</div>
      <button type="button" class="wg-hint-x" aria-label="${w.labelPair(ws("close"))}">×</button>`;
    bubble.querySelector(".wg-hint-x").addEventListener("click", removeBubble);
    popups.layer.appendChild(bubble);
    const R = root.getBoundingClientRect();
    const canvas = popups.relRect(w.canvas);
    const bw = bubble.offsetWidth;
    if (pointAt) {
      const g = popups.relRect(pointAt);
      const x = Math.max(8, Math.min(R.width - bw - 8, g.x + g.w / 2 - bw / 2));
      bubble.style.left = `${x}px`;
      bubble.style.top = `${g.y + g.h + 14}px`;
      bubble.style.setProperty("--wg-arrow", `${Math.max(18, Math.min(bw - 18, g.x + g.w / 2 - x))}px`);
      bubble.classList.add("has-arrow");
    } else {
      bubble.style.left = `${Math.max(8, canvas.x + canvas.w / 2 - bw / 2)}px`;
      bubble.style.top = `${canvas.y + 14}px`;
    }
  }

  function showAgain() {
    removeAgain();
    if (!script.length) return;
    again = document.createElement("button");
    again.type = "button";
    again.className = "wg-again";
    again.innerHTML = biPair(ws("showAgain"));
    again.addEventListener("click", () => show(3));
    popups.layer.appendChild(again);
  }

  function showYourTurn() {
    removeCard();
    card = document.createElement("div");
    card.className = "wg-yourturn";
    card.setAttribute("role", "dialog");
    card.innerHTML = `<p>${biPair(ws("yourTurn"))}</p>
      <div class="wg-yourturn-btns"><button type="button" class="wg-btn wg-btn-ok">${biPair(ws("okMyTurn"))}</button>
      ${script.length ? `<button type="button" class="wg-btn wg-btn-again">${biPair(ws("showAgain"))}</button>` : ""}</div>`;
    card.querySelector(".wg-btn-ok").addEventListener("click", () => {
      removeCard();
      w.clearDemo();
      showAgain();
      word.focus();
    });
    card.querySelector(".wg-btn-again")?.addEventListener("click", () => show(3));
    popups.layer.appendChild(card);
    const canvas = popups.relRect(w.canvas);
    const target = w.scriptTargetRect(script);
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const pos = target
      ? placeAvoiding(target, cw, ch, canvas)
      : { x: canvas.x + canvas.w / 2 - cw / 2, y: canvas.y + canvas.h - ch - 20, side: "none" };
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;
    card.dataset.side = pos.side;
  }

  async function show(level) {
    if (!alive) return;
    if (level === 1) {
      removeCard();
      word.setSpotlight(null);
      showBubble(null);
    } else if (level === 2) {
      removeCard();
      if (spot) word.setSpotlight(spot);
      const target = spot ? w.commandEl(spot) ?? w.groupEl(spot.split(".").slice(0, 2).join(".")) : null;
      showBubble(target);
    } else if (level === 3) {
      if (running) return;
      removeBubble();
      removeCard();
      removeAgain();
      word.setSpotlight(null);
      if (!script.length) return;
      running = true;
      const id = ++runId;
      try {
        await word.demo(script);
      } catch (err) {
        console.error("Show me demo failed", err);
      } finally {
        if (id === runId) running = false;
      }
      if (alive && id === runId) showYourTurn();
    } else {
      throw new RangeError("hints.show: level must be 1, 2 or 3");
    }
  }

  return {
    show,
    hide() {
      removeBubble();
      removeCard();
      removeAgain();
      word.setSpotlight(null);
      if (running) w.cancelDemo();
      runId += 1;
      running = false;
      w.clearDemo();
    },
    destroy() {
      alive = false;
      this.hide();
    },
  };
}
