// Model -> DOM for the page. Paragraph elements are reused by object identity, so a change
// re-renders only the paragraphs whose snapshot objects changed.

const FALLBACK = "'Segoe UI', Calibri, Arial, sans-serif";

export function fontStack(font) {
  const safe = String(font).replace(/["'\\;]/g, "");
  if (safe.startsWith("Aptos")) return `'${safe}', 'Aptos', ${FALLBACK}`;
  return `'${safe}', ${FALLBACK}`;
}

const ROMAN = [
  [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
  [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
];
function roman(n) {
  let out = "";
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}
function letters(n) {
  let out = "";
  while (n > 0) { n -= 1; out = String.fromCharCode(97 + (n % 26)) + out; n = Math.floor(n / 26); }
  return out;
}

/** Marker text for a list paragraph at position `n` (1-based) of its run of numbered items. */
export function listMarker(list, n) {
  if (!list) return "";
  if (list.type === "bullet") return list.format;
  switch (list.format) {
    case "1)": return `${n})`;
    case "I.": return `${roman(n).toUpperCase()}.`;
    case "A.": return `${letters(n).toUpperCase()}.`;
    case "a)": return `${letters(n)})`;
    case "a.": return `${letters(n)}.`;
    case "i.": return `${roman(n)}.`;
    default: return `${n}.`;
  }
}

/** Numbers restart whenever the run of same-format numbered paragraphs at the same indent breaks. */
export function listMarkers(doc) {
  const out = [];
  let prev = null;
  let n = 0;
  for (const para of doc.p) {
    const l = para.list;
    if (l?.type === "number") {
      const same = prev && prev.list?.type === "number" && prev.list.format === l.format && prev.indent.left === para.indent.left;
      n = same ? n + 1 : 1;
    } else n = 0;
    out.push(listMarker(l, n));
    prev = para;
  }
  return out;
}

export function runStyle(run, el) {
  const s = el.style;
  s.fontFamily = fontStack(run.font);
  s.fontSize = `${run.sub || run.sup ? Math.round(run.size * 0.65 * 10) / 10 : run.size}pt`;
  s.fontWeight = run.b ? "700" : "";
  s.fontStyle = run.i ? "italic" : "";
  const deco = [];
  if (run.u) deco.push("underline");
  if (run.strike) deco.push("line-through");
  s.textDecorationLine = deco.join(" ");
  s.textDecorationStyle = { double: "double", dotted: "dotted", dashed: "dashed", wave: "wavy" }[run.u] ?? "";
  s.textDecorationThickness = run.u === "thick" ? "2.5px" : "";
  s.verticalAlign = run.sub ? "sub" : run.sup ? "super" : "";
  s.color = run.colour ?? "";
  s.backgroundColor = run.highlight ?? "";
  s.textShadow = run.effect === "shadow" ? "1.5px 1.5px 2px rgba(0,0,0,.45)" : run.effect === "glow" ? "0 0 4px #8DB8F2, 0 0 9px #8DB8F2" : "";
  s.webkitTextStroke = run.effect === "outline" ? `0.7px ${run.colour ?? "#000"}` : "";
  if (run.effect === "outline") s.color = "#fff";
}

function buildPara(para, marker) {
  const el = document.createElement("p");
  el.className = "wd-p";
  const s = el.style;
  s.textAlign = para.align;
  s.margin = `${para.spacing.before}pt ${para.indent.right}in ${para.spacing.after}pt 0`;
  s.paddingLeft = `${para.indent.left + (para.list ? 0.5 : 0)}in`;
  s.lineHeight = String(Math.round(para.spacing.line * 1.2 * 1000) / 1000);
  s.backgroundColor = para.shading ?? "";
  if (para.borders.length) {
    for (const side of para.borders) s.setProperty(`border-${side}`, "0.75pt solid #000");
    s.padding = `${para.borders.includes("top") ? 1 : 0}pt 4pt ${para.borders.includes("bottom") ? 1 : 0}pt`;
    s.paddingLeft = `calc(${para.indent.left + (para.list ? 0.5 : 0)}in + 4pt)`;
  }
  if (marker) {
    el.dataset.marker = marker;
    const first = para.runs[0];
    s.setProperty("--wd-mk-left", `${para.indent.left + 0.25}in`);
    s.setProperty("--wd-mk-font", fontStack(para.list.type === "bullet" && marker === "•" ? "Arial" : first.font));
    s.setProperty("--wd-mk-size", `${first.size}pt`);
    s.setProperty("--wd-mk-colour", first.colour ?? "inherit");
  }
  for (const run of para.runs) {
    const span = document.createElement("span");
    span.className = "wd-r";
    runStyle(run, span);
    if (run.text) span.textContent = run.text;
    else span.appendChild(document.createElement("br"));
    el.appendChild(span);
  }
  return el;
}

export function createRenderer(pageEl) {
  /** @type {Map<object, {el: HTMLElement, marker: string}[]>} */
  let cache = new Map();

  return {
    render(doc) {
      const markers = listMarkers(doc);
      const next = new Map();
      const els = doc.p.map((para, i) => {
        const pool = cache.get(para);
        let hit = pool?.find((x) => x.marker === markers[i]);
        if (hit) pool.splice(pool.indexOf(hit), 1);
        else hit = { el: buildPara(para, markers[i]), marker: markers[i] };
        hit.el.dataset.p = String(i);
        if (!next.has(para)) next.set(para, []);
        next.get(para).push(hit);
        return hit.el;
      });
      els.forEach((el, i) => {
        if (pageEl.children[i] !== el) pageEl.insertBefore(el, pageEl.children[i] ?? null);
      });
      while (pageEl.children.length > els.length) pageEl.lastElementChild.remove();
      cache = next;
    },
    /** Forget cached elements (after the browser changed the DOM itself, e.g. IME composition). */
    invalidate() {
      cache = new Map();
      pageEl.replaceChildren();
    },
    paraEl(p) {
      return pageEl.querySelector(`:scope > .wd-p[data-p="${p}"]`);
    },
  };
}
