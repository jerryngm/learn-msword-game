// Fluent UI System Icons (MIT, vendor/fluent-icons/LICENSE) drawn as CSS masks so they take
// the current text colour. A few Office-only marks (Word logo, Copilot) are drawn here as neutral SVG.

const BASE = "vendor/fluent-icons/";

/** <span> showing icon `name` (e.g. "text_bold_20"). Extra classes colour or size it. */
export function ico(name, cls = "") {
  if (!name) return "";
  if (CUSTOM[name]) return `<span class="wi wi-svg ${cls}" aria-hidden="true">${CUSTOM[name]}</span>`;
  const size = Number(name.replace(/_filled$/, "").split("_").pop()) || 20;
  // Inline mask-image so the URL resolves against the page, not against word.css.
  const file = name.endsWith("_filled") ? `ic_fluent_${name.replace(/_filled$/, "")}_filled.svg` : `ic_fluent_${name}_regular.svg`;
  const url = `url('${BASE}${file}')`;
  return `<span class="wi ${cls}" data-s="${size}" style="-webkit-mask-image:${url};mask-image:${url}" aria-hidden="true"></span>`;
}

const CUSTOM = {
  pictures: `<svg viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="22" fill="#e6f2fa" stroke="#46769b"/><circle cx="22" cy="11" r="3" fill="#70b5e1"/><path d="m4 25 8-11 7 8 4-5 5 8" fill="#387bb6"/></svg>`,
  orientation: `<svg viewBox="0 0 32 32" fill="white" stroke="#536675" stroke-width="1.2"><path d="M4 2h16v25H4z"/><path d="M11 13h19v16H11z"/><path d="M7 6h10M7 9h10M14 18h13M14 22h13M14 25h13" stroke="#468ac1"/></svg>`,
  margins: `<svg viewBox="0 0 32 32" fill="none" stroke="#536675" stroke-width="1.2"><path fill="white" d="M6 2h20v28H6z"/><path fill="#dcebf8" stroke="#468ac1" stroke-dasharray="2 1" d="M10 7h12v18H10z"/><path d="M12 11h8M12 15h8M12 19h8" stroke="#468ac1"/></svg>`,
  // Word app mark: a blue tile with a white W (neutral drawing, not Microsoft's logo art).
  wordlogo: `<svg viewBox="0 0 20 20"><rect x="1" y="2" width="18" height="16" rx="3" fill="#185ABD"/><path d="M4.6 6.4h1.6l1.1 5 1.3-5h1.4l1.3 5 1.1-5h1.6l-2 7.2H10.6L9.3 8.9 8 13.6H6.6z" fill="#fff"/></svg>`,
  // Copilot placeholder: a soft multicolour knot of two rounded shapes.
  copilot: `<svg viewBox="0 0 32 32"><defs><linearGradient id="wgCp1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2FB5F3"/><stop offset=".5" stop-color="#7B6CF6"/><stop offset="1" stop-color="#E84FA4"/></linearGradient><linearGradient id="wgCp2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7B733"/><stop offset=".6" stop-color="#F0637A"/><stop offset="1" stop-color="#3FB26B"/></linearGradient></defs><rect x="4" y="4" width="15" height="19" rx="7" fill="url(#wgCp1)"/><rect x="13" y="9" width="15" height="19" rx="7" fill="url(#wgCp2)" opacity=".92"/></svg>`,
  // Window caption glyphs.
  capmin: `<svg viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" stroke-width="1"/></svg>`,
  caprestore: `<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="2.5" width="7" height="7" rx="1"/><path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1"/></svg>`,
  capclose: `<svg viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="1"/></svg>`,
  launcher: `<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 9V1h8"/><path d="M4 4l5 5M9 5.5V9H5.5"/></svg>`,
  chev: `<svg viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`,
  more: `<svg viewBox="0 0 10 10"><path d="M2 2.5h6" stroke="currentColor"/><path d="M2 5l3 3 3-3" fill="none" stroke="currentColor"/></svg>`,
  // Clear All Formatting: an "A" with a pink eraser, as on Word's ribbon.
  clearfmt: `<svg viewBox="0 0 20 20"><path d="M3 15 7.4 3.5h1.3L13 15h-1.5l-1.2-3.2H5.7L4.5 15zm3.2-4.6h3.6L8 5.6z" fill="#424242"/><rect x="11.6" y="11" width="7" height="4.2" rx="1" transform="rotate(-40 15 13)" fill="#E3609A"/><rect x="11.6" y="13.6" width="3" height="1.6" transform="rotate(-40 15 13)" fill="#fff" opacity=".7"/></svg>`,
  // Replace: "b" turning into "c" with a small blue arrow.
  replace: `<svg viewBox="0 0 20 20"><text x="8" y="8.5" font-family="Segoe UI,Arial,sans-serif" font-size="8" fill="#424242">b</text><text x="9.5" y="18" font-family="Segoe UI,Arial,sans-serif" font-size="8" fill="#424242">c</text><path d="M5 5.5a4 4 0 0 0 0 7.2" fill="none" stroke="#2A62B8" stroke-width="1.4"/><path d="M3.2 11.2 5.3 13l1.6-2.3" fill="none" stroke="#2A62B8" stroke-width="1.4"/></svg>`,
  // Borders: a dotted grid with a solid bottom line.
  borders: `<svg viewBox="0 0 20 20" fill="none" stroke="#424242"><path d="M3 3.5h14M3 10h14M3.5 3v13M10 3v13M16.5 3v13" stroke-dasharray="1 1.6"/><path d="M2.5 16.5h15" stroke-width="1.3"/></svg>`,
  // Delete: a neutral trash can (no Fluent delete icon is vendored).
  delete: `<svg viewBox="0 0 20 20" fill="none" stroke="#424242" stroke-width="1.2" stroke-linejoin="round"><path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 5.5l.8 10.6a1 1 0 0 0 1 .9h6.4a1 1 0 0 0 1-.9L15 5.5M8.5 8.5v6M11.5 8.5v6"/></svg>`,
  ghost: `<svg viewBox="0 0 30 36" aria-hidden="true"><path d="M3 2 L3 28 L10 21 L15 33 L20 31 L15 19 L25 19 Z" fill="#fff" stroke="#17324D" stroke-width="2" stroke-linejoin="round"/></svg>`,
};
