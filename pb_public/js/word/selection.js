// DOM Selection <-> model positions. Paragraph elements carry data-p; text offsets are measured
// with a Range from the start of the paragraph, so list markers (CSS ::before) never count.

import { clampPos, cmpPos, docEnd, orderRange } from "./model.js";

function paraElOf(pageEl, node) {
  let n = node?.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (n && n !== pageEl) {
    if (n.classList?.contains("wd-p") && n.parentNode === pageEl) return n;
    n = n.parentNode;
  }
  return null;
}

/** Model position for a DOM point inside the page, or null when the point is outside it. */
export function domToPos(pageEl, node, offset) {
  if (!node || !pageEl.contains(node)) return null;
  if (node === pageEl) {
    // Between paragraphs: the start of the paragraph at `offset`, or the end of the last one.
    const kids = pageEl.children;
    if (offset < kids.length) return { p: Number(kids[offset].dataset.p), offset: 0 };
    const last = kids[kids.length - 1];
    return last ? { p: Number(last.dataset.p), offset: last.textContent.length } : { p: 0, offset: 0 };
  }
  const para = paraElOf(pageEl, node);
  if (!para) return null;
  const r = document.createRange();
  r.setStart(para, 0);
  try {
    r.setEnd(node, offset);
  } catch {
    return { p: Number(para.dataset.p), offset: 0 };
  }
  return { p: Number(para.dataset.p), offset: r.toString().length };
}

/** DOM point {node, offset} for a model position. */
export function posToDom(pageEl, pos) {
  const para = pageEl.querySelector(`:scope > .wd-p[data-p="${pos.p}"]`);
  if (!para) return { node: pageEl, offset: 0 };
  const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
  let left = pos.offset;
  let last = null;
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (left <= t.data.length) return { node: t, offset: left };
    left -= t.data.length;
    last = t;
  }
  if (last) return { node: last, offset: last.data.length };
  const span = para.querySelector(".wd-r") ?? para;
  return { node: span, offset: 0 };
}

/** The current DOM selection as {anchor, focus}, or null when it is not inside the page. */
export function readSelection(pageEl) {
  const s = document.getSelection();
  if (!s || s.rangeCount === 0) return null;
  const anchor = domToPos(pageEl, s.anchorNode, s.anchorOffset);
  const focus = domToPos(pageEl, s.focusNode, s.focusOffset);
  if (!anchor || !focus) return null;
  return { anchor, focus };
}

export function writeSelection(pageEl, sel) {
  const s = document.getSelection();
  if (!s) return;
  const a = posToDom(pageEl, sel.anchor);
  const f = posToDom(pageEl, sel.focus);
  try {
    s.setBaseAndExtent(a.node, a.offset, f.node, f.offset);
  } catch (err) {
    console.warn("could not place the selection", err);
  }
}

/** A DOM Range covering a model range (for drawing demo highlights and placing cards). */
export function domRange(pageEl, range) {
  const { from, to } = orderRange(range.from, range.to);
  const a = posToDom(pageEl, from);
  const b = posToDom(pageEl, to);
  const r = document.createRange();
  r.setStart(a.node, a.offset);
  r.setEnd(b.node, b.offset);
  return r;
}

/** Client rect of the caret line at a position (falls back to the paragraph box). */
export function caretRect(pageEl, pos) {
  const { node, offset } = posToDom(pageEl, pos);
  const r = document.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  const rects = r.getClientRects();
  if (rects.length) return rects[0];
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  const box = el.getBoundingClientRect();
  return new DOMRect(box.left, box.top, 1, box.height || 18);
}

/** Model position under a viewport point, or null. */
export function posFromPoint(pageEl, x, y) {
  let node = null;
  let offset = 0;
  if (document.caretPositionFromPoint) {
    const cp = document.caretPositionFromPoint(x, y);
    if (cp) ({ offsetNode: node, offset } = cp);
  } else if (document.caretRangeFromPoint) {
    const cr = document.caretRangeFromPoint(x, y);
    if (cr) ({ startContainer: node, startOffset: offset } = cr);
  }
  return node ? domToPos(pageEl, node, offset) : null;
}

/** Normalised selection helpers. */
export function selRange(sel) {
  return orderRange(sel.anchor, sel.focus);
}
export function collapsedSel(pos) {
  return { anchor: { ...pos }, focus: { ...pos } };
}
export function clampSel(doc, sel) {
  return { anchor: clampPos(doc, sel.anchor), focus: clampPos(doc, sel.focus) };
}
export function selectAll(doc) {
  return { anchor: { p: 0, offset: 0 }, focus: docEnd(doc) };
}
export function sameSel(a, b) {
  return a && b && cmpPos(a.anchor, b.anchor) === 0 && cmpPos(a.focus, b.focus) === 0;
}
