// Navigation pane (Home › Editing › Find, Ctrl+F), docked left of the page as in Windows Word 365.
// Search is non-modal: typing marks every match in yellow and selects the current one; ↑/↓ move between
// matches. Highlights are a CSS Custom Highlight over the rendered page, never a document change, so
// formatting predicates and Undo don't see them.
//
//   const pane = createNavPane({ host, page, onPick(match, how), onClose(), isDemo() });
//   pane.open(prefill?) pane.close() pane.setTerm(text) pane.step(±1) pane.refresh(doc) pane.snapshot()/restore(s)

import { findMatches } from "./model.js";
import { domRange } from "./selection.js";
import { ico } from "./icons.js";
import { esc } from "./strings.js";

// One highlight registry per page load; each pane contributes its own ranges (several engines may be mounted).
const ALL = new Map();
const CUR = new Map();
const canHighlight = () => typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function";
function publish() {
  if (!canHighlight()) return;
  CSS.highlights.set("wd-find", new Highlight(...[...ALL.values()].flat()));
  const cur = new Highlight(...[...CUR.values()].flat());
  cur.priority = 1;
  CSS.highlights.set("wd-find-cur", cur);
}

const SNIP = 34; // characters of context either side of a match in the Results list

export function createNavPane({ host, page, onPick, onClose, isDemo }) {
  const el = document.createElement("aside");
  el.className = "wd-nav";
  el.hidden = true;
  el.setAttribute("aria-label", "Navigation");
  el.innerHTML = `<div class="wd-nav-head"><span class="wd-nav-t">Navigation</span>
      <button type="button" class="wd-nav-ib" data-nav="options" aria-label="Task Pane Options">${ico("chevron_down_12")}</button>
      <button type="button" class="wd-nav-ib wd-nav-x" data-nav="close" aria-label="Close">${ico("dismiss_16")}</button></div>
    <div class="wd-nav-box"><input type="text" class="wd-nav-q" placeholder="Search document" aria-label="Search document" spellcheck="false" autocomplete="off">
      <button type="button" class="wd-nav-ib wd-nav-go" data-nav="clear" aria-label="Search">${ico("search_20")}</button>
      <button type="button" class="wd-nav-ib wd-nav-more" data-nav="options" aria-label="Search for more things">${ico("chevron_down_12")}</button></div>
    <div class="wd-nav-count"><span class="wd-nav-n" aria-live="polite"></span>
      <button type="button" class="wd-nav-ib" data-nav="prev" aria-label="Previous result">${ico("chevron_up_12")}</button>
      <button type="button" class="wd-nav-ib" data-nav="next" aria-label="Next result">${ico("chevron_down_12")}</button></div>
    <div class="wd-nav-tabs" role="tablist"><span data-tab="headings">Headings</span><span data-tab="pages">Pages</span><span data-tab="results">Results</span></div>
    <div class="wd-nav-list"></div>`;
  host.prepend(el);
  const input = el.querySelector(".wd-nav-q");
  const countEl = el.querySelector(".wd-nav-n");
  const list = el.querySelector(".wd-nav-list");
  let term = "";
  let matches = [];
  let at = -1;
  let doc = null;
  const key = {};

  function paint() {
    if (el.hidden || !matches.length) {
      ALL.delete(key);
      CUR.delete(key);
      return publish();
    }
    const ranges = matches.map((m) => {
      try {
        return domRange(page, m);
      } catch {
        return null; // a paragraph not rendered yet; the next refresh picks it up
      }
    });
    ALL.set(key, ranges.filter((r, i) => r && i !== at));
    CUR.set(key, ranges[at] ? [ranges[at]] : []);
    publish();
  }
  function drawCount() {
    const q = term.trim();
    countEl.textContent = !q ? "" : !matches.length ? "No results" : at >= 0 ? `Result ${at + 1} of ${matches.length}` : `${matches.length} result${matches.length === 1 ? "" : "s"}`;
    el.querySelectorAll('[data-nav="prev"],[data-nav="next"]').forEach((b) => (b.disabled = !matches.length));
    // Word swaps the magnifier for an ✕ that clears the search once there is text in the box.
    if (el.classList.contains("has-term") !== Boolean(q)) {
      const go = el.querySelector(".wd-nav-go");
      go.innerHTML = q ? ico("dismiss_16") : ico("search_20");
      go.setAttribute("aria-label", q ? "Clear search" : "Search");
    }
    el.classList.toggle("has-term", Boolean(q));
    el.querySelectorAll(".wd-nav-tabs span").forEach((t) => t.classList.toggle("is-on", t.dataset.tab === (q ? "results" : "headings")));
  }
  function drawList() {
    if (!term.trim()) {
      list.innerHTML = `<p class="wd-nav-empty">Create an interactive outline of your document.</p><p class="wd-nav-empty">It's a great way to keep track of where you are or quickly move your content around.</p><p class="wd-nav-empty">To get started, go to the Home tab and apply Heading styles to the headings in your document.</p>`;
      return;
    }
    if (!matches.length) {
      list.innerHTML = `<p class="wd-nav-empty">We couldn't find what you're looking for.</p>`;
      return;
    }
    list.innerHTML = matches
      .map((m, i) => {
        const text = doc.p[m.from.p].text;
        const a = Math.max(0, m.from.offset - SNIP);
        const b = Math.min(text.length, m.to.offset + SNIP);
        return `<button type="button" class="wd-nav-hit${i === at ? " is-on" : ""}" data-nav="pick" data-i="${i}">${a > 0 ? "…" : ""}${esc(text.slice(a, m.from.offset))}<b>${esc(text.slice(m.from.offset, m.to.offset))}</b>${esc(text.slice(m.to.offset, b))}${b < text.length ? "…" : ""}</button>`;
      })
      .join("");
  }
  function draw() {
    drawCount();
    drawList();
    paint();
  }

  /** Recompute matches against `next` (the learner's document or a demo's view) after any render. */
  function refresh(next) {
    doc = next;
    if (el.hidden) return paint();
    const before = matches[at];
    matches = findMatches(doc, term.trim());
    if (at >= matches.length) at = matches.length - 1;
    // An edit that shifts text keeps the same match current where it still exists.
    if (before) {
      const same = matches.findIndex((m) => m.from.p === before.from.p && m.from.offset === before.from.offset);
      if (same >= 0) at = same;
    }
    draw();
  }

  function pick(i, how) {
    if (!matches.length) return;
    at = ((i % matches.length) + matches.length) % matches.length;
    draw();
    el.querySelector(".wd-nav-hit.is-on")?.scrollIntoView?.({ block: "nearest" });
    onPick(matches[at], how, { term: term.trim(), count: matches.length });
  }

  function setTerm(text) {
    term = String(text ?? "");
    if (input.value !== term) input.value = term;
    matches = findMatches(doc, term.trim());
    at = -1;
    // Like Word: the first match is selected as you type.
    if (matches.length) pick(0, "search");
    else {
      draw();
      onPick(null, "search", { term: term.trim(), count: 0 });
    }
  }

  function step(dir) {
    if (!matches.length) return;
    pick(at < 0 ? (dir > 0 ? 0 : matches.length - 1) : at + dir, dir > 0 ? "next" : "prev");
  }

  function open(prefill, { focus = true } = {}) {
    const wasHidden = el.hidden;
    el.hidden = false;
    host.classList.add("has-nav");
    if (typeof prefill === "string" && prefill.trim()) setTerm(prefill);
    else if (wasHidden) refresh(doc);
    if (focus) {
      input.focus({ preventScroll: true });
      input.select();
    }
  }

  function close({ silent = false } = {}) {
    if (el.hidden) return;
    el.hidden = true;
    host.classList.remove("has-nav");
    paint();
    if (!silent) onClose();
  }

  input.addEventListener("input", () => setTerm(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      step(e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey) ? -1 : 1);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      e.stopPropagation();
      input.select();
    } else if (e.ctrlKey || e.metaKey) e.stopPropagation(); // Ctrl+A, Ctrl+Z... belong to the box, not the document
  });
  // Buttons keep the focus in the search box, as in Word.
  el.addEventListener("mousedown", (e) => {
    if (e.target !== input) e.preventDefault();
  });
  el.addEventListener("click", (e) => {
    if (isDemo()) return;
    const b = e.target.closest("[data-nav]");
    if (!b || b.disabled) return;
    const act = b.dataset.nav;
    if (act === "close") close();
    else if (act === "next") step(1);
    else if (act === "prev") step(-1);
    else if (act === "pick") pick(Number(b.dataset.i), "pick");
    else if (act === "clear" && term) setTerm("");
  });

  return {
    el,
    input,
    open,
    close,
    setTerm,
    step,
    pick: (i) => pick(i, "pick"),
    refresh,
    get isOpen() {
      return !el.hidden;
    },
    get current() {
      return matches[at] ?? null;
    },
    get count() {
      return matches.length;
    },
    snapshot: () => ({ open: !el.hidden, term, at }),
    /** Put the pane back as a snapshot had it, without selecting anything or reporting a search. */
    restore(s, next) {
      doc = next;
      term = s.term;
      input.value = term;
      el.hidden = !s.open;
      host.classList.toggle("has-nav", s.open);
      matches = findMatches(doc, term.trim());
      at = Math.min(s.at, matches.length - 1);
      draw();
    },
    destroy() {
      ALL.delete(key);
      CUR.delete(key);
      publish();
      el.remove();
    },
  };
}
