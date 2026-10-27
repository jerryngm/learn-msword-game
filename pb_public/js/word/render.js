import { PICTURES } from "./pictures.js";
import { spellingRanges } from "./model.js";
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

function buildPara(para, marker, spellings) {
  const el = document.createElement("p");
  el.className = "wd-p";
  if (para.placeholder && para.text === para.placeholder) {
    el.classList.add("wd-placeholder");
    el.dataset.placeholder = para.placeholder;
  }
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
  if (para.picture) {
    const picture=para.picture, asset=PICTURES.find(p=>p.id===picture.id);
    const frame=document.createElement("span"); frame.className=`wd-picture is-${picture.wrap}`; frame.contentEditable="false";
    if (["front","behind"].includes(picture.wrap)) { frame.style.left=`${picture.x}px`; frame.style.top=`${picture.y}px`; }
    frame.style.width=`${picture.width}px`; frame.style.height=`${picture.height}px`; frame.setAttribute("role","img"); frame.setAttribute("aria-label",asset.name);
    const img=document.createElement("img"); img.src=asset.src; img.alt=asset.name; img.draggable=false; frame.append(img);
    for (const handle of ["n","ne","e","se","s","sw","w","nw"]) {
      const b=document.createElement("button"); b.type="button"; b.className="wd-picture-handle"; b.dataset.handle=handle;
      b.setAttribute("aria-label",`Resize ${handle}`); b.tabIndex=-1; frame.append(b);
    }
    el.append(frame);
  }
  let offset = 0;
  for (const run of para.runs) {
    const span = document.createElement("span");
    span.className = "wd-r";
    runStyle(run, span);
    if (run.text) {
      const end = offset + run.text.length;
      let at = offset;
      for (const spelling of spellings) {
        const from = Math.max(offset, spelling.from.offset);
        const to = Math.min(end, spelling.to.offset);
        if (to <= from) continue;
        span.append(document.createTextNode(run.text.slice(at - offset, from - offset)));
        const mark = document.createElement("span");
        mark.className = "wd-spelling";
        mark.textContent = run.text.slice(from - offset, to - offset);
        span.append(mark);
        at = to;
      }
      span.append(document.createTextNode(run.text.slice(at - offset)));
      offset = end;
    }
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
      pageEl.classList.toggle("has-floating",doc.p.some(p=>["front","behind"].includes(p.picture?.wrap)));
      const markers = listMarkers(doc);
      const next = new Map();
      const els = doc.p.map((para, i) => {
        const pool = cache.get(para);
        let hit = pool?.find((x) => x.marker === markers[i] && x.spellings === doc.spellings);
        if (hit) pool.splice(pool.indexOf(hit), 1);
        else hit = { el: buildPara(para, markers[i], spellingRanges(doc, i)), marker: markers[i], spellings: doc.spellings };
        hit.el.dataset.p = String(i);
        const picture=hit.el.querySelector(".wd-picture"); if (picture) picture.dataset.picture=String(doc.p.slice(0,i).filter(p=>p.picture).length);
        if (!next.has(para)) next.set(para, []);
        next.get(para).push(hit);
        return hit.el;
      });
      const blocks = [], tables = new Map();
      els.forEach((el,i) => {
        const cell = doc.p[i].cell;
        if (!cell) { blocks.push(el); return; }
        let table = tables.get(cell.table);
        if (!table) { table=document.createElement("table"); table.className="wd-table"; table.dataset.table=cell.table; tables.set(cell.table,table); blocks.push(table); }
        while (table.rows.length <= cell.row) table.insertRow();
        const row=table.rows[cell.row];
        while (row.cells.length <= cell.col) row.insertCell();
        const td=row.cells[cell.col]; td.dataset.cell=`${cell.table},${cell.row},${cell.col}`; td.append(el);
      });
      pageEl.replaceChildren(...blocks);
      const landscape = doc.page?.orientation === "landscape";
      pageEl.style.width = landscape ? "11in" : "8.5in";
      pageEl.style.minHeight = landscape ? "8.5in" : "11in";
      pageEl.style.padding = doc.page?.margins === "narrow" ? "0.5in" : "1in";
      cache = next;
    },
    /** Forget cached elements (after the browser changed the DOM itself, e.g. IME composition). */
    invalidate() {
      cache = new Map();
      pageEl.replaceChildren();
    },
    paraEl(p) {
      return pageEl.querySelector(`.wd-p[data-p="${p}"]`);
    },
  };
}
