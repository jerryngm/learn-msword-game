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
  // Classroom-screenshot icons (2026-10-26): Insert Picture From, Wrap Text, the picture menu, the table tabs.
  pic_device: `<svg viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="12" height="9" fill="#fff" stroke="#424242"/><path d="m3 12 3.5-4 3 3 2-2 3 3" fill="none" stroke="#2B579A"/><rect x="11" y="10" width="7" height="5" fill="#fff" stroke="#424242"/><path d="M13 17h3" stroke="#424242"/></svg>`,
  pic_generate: `<svg viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="12" height="9" fill="#fff" stroke="#424242"/><path d="m3 12 3.5-4 3 3 2-2 3 3" fill="none" stroke="#2B579A"/><path d="M15.5 9.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" fill="#2B579A"/></svg>`,
  pic_stock: `<svg viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="12" height="9" fill="#fff" stroke="#424242"/><path d="m3 12 3.5-4 3 3 2-2 3 3" fill="none" stroke="#2B579A"/><circle cx="15" cy="13.5" r="3" fill="#fff" stroke="#424242"/><path d="m17 15.5 2 2" stroke="#424242"/></svg>`,
  pic_online: `<svg viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="12" height="9" fill="#fff" stroke="#424242"/><path d="m3 12 3.5-4 3 3 2-2 3 3" fill="none" stroke="#2B579A"/><circle cx="15" cy="13.5" r="3.5" fill="#fff" stroke="#2B579A"/><path d="M11.5 13.5h7M15 10c-1.6 2.3-1.6 4.7 0 7c1.6-2.3 1.6-4.7 0-7" fill="none" stroke="#2B579A"/></svg>`,
  wrap_inline: `<svg viewBox="0 0 20 20" fill="none"><path d="M2 3.5h16M2 16.5h16" stroke="#2E75B6"/><path d="M7 10h11" stroke="#2E75B6"/><path d="M2.5 8.5a2 2 0 0 1 4 0V11h-4z" fill="#fff" stroke="#424242"/></svg>`,
  wrap_square: `<svg viewBox="0 0 20 20" fill="none"><path d="M2 3.5h16M2 16.5h16" stroke="#2E75B6"/><path d="M2 7h4M14 7h4M2 10h4M14 10h4M2 13h4M14 13h4" stroke="#2E75B6"/><rect x="7.5" y="6" width="5" height="8" fill="#fff" stroke="#424242" stroke-dasharray="1 1"/><path d="M8.5 11a1.5 1.5 0 0 1 3 0v1.5h-3z" fill="#424242"/></svg>`,
  wrap_topbottom: `<svg viewBox="0 0 20 20" fill="none"><path d="M2 3.5h16M2 16.5h16" stroke="#2E75B6"/><path d="M8 12a2 2 0 0 1 4 0v2h-4z" fill="#fff" stroke="#424242"/></svg>`,
  wrap_behind: `<svg viewBox="0 0 20 20" fill="none"><path d="M2 3.5h16M2 16.5h16" stroke="#2E75B6"/><rect x="4" y="6" width="12" height="8" fill="#D9E7F5"/><path d="M2 8h16M2 12h16" stroke="#2E75B6"/></svg>`,
  wrap_front: `<svg viewBox="0 0 20 20" fill="none"><path d="M2 3.5h16M2 16.5h16" stroke="#2E75B6"/><path d="M2 8h16M2 12h16" stroke="#2E75B6"/><path d="M7 11a3 3 0 0 1 6 0v2.5H7z" fill="#fff" stroke="#424242"/></svg>`,
  wrap_points: `<svg viewBox="0 0 20 20" fill="none"><path d="M2 3.5h16M2 16.5h16" stroke="#2E75B6"/><path d="M5 14V9l5-3 5 3v5z" fill="#fff" stroke="#A0A0A0"/><circle cx="5" cy="9" r="1" fill="#A0A0A0"/><circle cx="15" cy="9" r="1" fill="#A0A0A0"/></svg>`,
  wrap_more: `<svg viewBox="0 0 20 20"><rect x="4" y="5" width="12" height="10" fill="#fff" stroke="#424242"/><path d="M2 5h2M16 5h2M2 15h2M16 15h2M4 3v2M16 3v2M4 15v2M16 15v2" stroke="#424242"/></svg>`,
  pic_change: `<svg viewBox="0 0 20 20"><rect x="5.5" y="5.5" width="12" height="9" fill="#fff" stroke="#424242"/><path d="m6 14 3.5-4 3 3 2-2 3 3" fill="none" stroke="#2B579A"/><path d="M2 9a5 5 0 0 1 5-5M5 2.5 7 4 5.5 6" fill="none" stroke="#2B579A"/></svg>`,
  pic_group: `<svg viewBox="0 0 20 20"><rect x="3.5" y="3.5" width="13" height="13" fill="none" stroke="#A0A0A0" stroke-dasharray="1.5 1"/><rect x="5.5" y="5.5" width="6" height="5" fill="#fff" stroke="#A0A0A0"/><rect x="9" y="9" width="6" height="5" fill="#fff" stroke="#A0A0A0"/></svg>`,
  pic_front: `<svg viewBox="0 0 20 20"><rect x="3.5" y="3.5" width="9" height="8" fill="#E6E6E6" stroke="#A0A0A0"/><rect x="7.5" y="8.5" width="9" height="8" fill="#fff" stroke="#A0A0A0"/></svg>`,
  pic_back: `<svg viewBox="0 0 20 20"><rect x="7.5" y="8.5" width="9" height="8" fill="#E6E6E6" stroke="#A0A0A0"/><rect x="3.5" y="3.5" width="9" height="8" fill="#fff" stroke="#A0A0A0"/></svg>`,
  pic_caption: `<svg viewBox="0 0 20 20"><rect x="3.5" y="3.5" width="13" height="9" fill="#fff" stroke="#424242"/><path d="m4 12 3.5-4 3 3 2-2 3 3" fill="none" stroke="#2B579A"/><path d="M3 15.5h14" stroke="#C00000" stroke-width="1.4"/></svg>`,
  pic_alt: `<svg viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="11" height="9" fill="#fff" stroke="#424242"/><path d="m3 12 3-3.5 2.5 2.5" fill="none" stroke="#2B579A"/><rect x="10.5" y="10.5" width="7" height="6" fill="#fff" stroke="#424242"/><path d="M12 12.5h4M12 14.5h3" stroke="#424242"/></svg>`,
  pic_size: `<svg viewBox="0 0 20 20"><rect x="5.5" y="5.5" width="9" height="9" fill="#fff" stroke="#424242"/><path d="M2 3.5h16M2 16.5h16M3.5 2v16M16.5 2v16" stroke="#424242" stroke-width=".8"/></svg>`,
  pic_format: `<svg viewBox="0 0 20 20"><path d="M3 14.5 12.5 5l2.5 2.5L5.5 17H3z" fill="#fff" stroke="#424242"/><path d="M13.5 4 15 2.5l2.5 2.5L16 6.5" fill="#F4B183" stroke="#424242"/><path d="M2 18h6" stroke="#2B579A" stroke-width="1.5"/></svg>`,
  pic_saveas: `<svg viewBox="0 0 20 20"><rect x="3.5" y="3.5" width="13" height="13" fill="#fff" stroke="#424242"/><path d="m4 14 3.5-4 3 3 2-2 3 3" fill="none" stroke="#2B579A"/></svg>`,
  tbl_select: `<svg viewBox="0 0 32 32"><path d="M8 5v20l5-5 4 8 3-1.4-4-8h7z" fill="#fff" stroke="#424242" stroke-linejoin="round"/></svg>`,
  tbl_gridlines: `<svg viewBox="0 0 32 32"><path d="M4 6h24v20H4zM4 12.7h24M4 19.3h24M12 6v20M20 6v20" fill="none" stroke="#2E75B6" stroke-dasharray="2 1.5"/></svg>`,
  tbl_properties: `<svg viewBox="0 0 32 32"><path d="M3 6h20v18H3zM3 12h20M3 18h20M10 6v18" fill="none" stroke="#424242"/><rect x="17" y="15" width="12" height="13" fill="#fff" stroke="#424242"/><path d="M19.5 19h7M19.5 22h7M19.5 25h5" stroke="#2E75B6"/></svg>`,
  tbl_draw: `<svg viewBox="0 0 32 32"><path d="M3 9h18v16H3zM3 17h18M12 9v16" fill="none" stroke="#424242"/><path d="m17 20 10-12 3 2.5-10 12-4 1.5z" fill="#fff" stroke="#2E75B6"/></svg>`,
  tbl_eraser: `<svg viewBox="0 0 32 32"><path d="M3 9h18v16H3zM3 17h18M12 9v16" fill="none" stroke="#424242"/><path d="m14 21 9-10 6 5-8 9h-5z" fill="#E899D8" stroke="#8B3A80"/></svg>`,
  tbl_delete: `<svg viewBox="0 0 32 32"><path d="M4 7h24v18H4zM4 13h24M4 19h24M12 7v18M20 7v18" fill="none" stroke="#424242"/><path d="m20 18 10 10M30 18 20 28" stroke="#D13438" stroke-width="2"/></svg>`,
  tbl_above: `<svg viewBox="0 0 32 32"><rect x="4" y="2" width="24" height="7" fill="#9DC3E6" stroke="#2E75B6"/><path d="M4 7h24v18H4zM4 13h24M4 19h24M12 7v18M20 7v18" fill="none" stroke="#424242"/><path d="M16 3v4M14 5l2-2 2 2" stroke="#fff" fill="none"/></svg>`,
  tbl_below: `<svg viewBox="0 0 32 32"><rect x="4" y="23" width="24" height="7" fill="#9DC3E6" stroke="#2E75B6"/><path d="M4 7h24v18H4zM4 13h24M4 19h24M12 7v18M20 7v18" fill="none" stroke="#424242"/><path d="M16 25v4M14 27l2 2 2-2" stroke="#fff" fill="none"/></svg>`,
  tbl_left: `<svg viewBox="0 0 32 32"><rect x="1" y="7" width="8" height="18" fill="#9DC3E6" stroke="#2E75B6"/><path d="M4 7h24v18H4zM4 13h24M4 19h24M12 7v18M20 7v18" fill="none" stroke="#424242"/></svg>`,
  tbl_right: `<svg viewBox="0 0 32 32"><rect x="23" y="7" width="8" height="18" fill="#9DC3E6" stroke="#2E75B6"/><path d="M4 7h24v18H4zM4 13h24M4 19h24M12 7v18M20 7v18" fill="none" stroke="#424242"/></svg>`,
  tbl_merge: `<svg viewBox="0 0 32 32"><rect x="4" y="13" width="16" height="6" fill="#F3F3F3"/><path d="M4 7h24v18H4zM4 13h24M4 19h24M12 7v18M20 7v18" fill="none" stroke="#A0A0A0"/></svg>`,
  tbl_split: `<svg viewBox="0 0 32 32"><rect x="4" y="7" width="24" height="6" fill="#9DC3E6"/><path d="M4 7h24v18H4zM4 13h24M4 19h24M12 7v18M20 7v18" fill="none" stroke="#424242"/></svg>`,
  tbl_splittable: `<svg viewBox="0 0 32 32"><path d="M4 4h24v10H4zM4 9h24M12 4v10M20 4v10M4 18h24v10H4zM4 23h24M12 18v10M20 18v10" fill="none" stroke="#424242"/><path d="M4 16h24" stroke="#2E75B6" stroke-dasharray="2 1.5"/></svg>`,
  tbl_autofit: `<svg viewBox="0 0 32 32"><path d="M4 7h24v18H4zM4 13h24M4 19h24M12 7v18M20 7v18" fill="none" stroke="#424242"/><path d="M7 3h18M7 3l2-1.5M7 3l2 1.5M25 3l-2-1.5M25 3l-2 1.5" stroke="#2E75B6" fill="none"/></svg>`,
  tbl_textdir: `<svg viewBox="0 0 32 32"><path d="M5 22 10 8h2l5 14M7.5 17h7" fill="none" stroke="#2E75B6" stroke-width="1.5"/><path d="M19 10h10M19 16h10M19 22h10M26 8l3 2-3 2M26 14l3 2-3 2M26 20l3 2-3 2" fill="none" stroke="#424242"/></svg>`,
  tbl_cellmargins: `<svg viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="22" fill="#fff" stroke="#424242"/><rect x="9" y="9" width="14" height="14" fill="#9DC3E6" stroke="#2E75B6"/></svg>`,
  tbl_repeat: `<svg viewBox="0 0 32 32"><path d="M4 4h18v8H4zM4 8h18M10 4v8M16 4v8" fill="#9DC3E6" stroke="#2E75B6"/><path d="M10 15h18v13H10zM10 19.5h18M10 24h18M16 15v13M22 15v13" fill="none" stroke="#424242"/><path d="M10 15h18v4.5H10z" fill="#9DC3E6" stroke="#2E75B6"/></svg>`,
  tbl_convert: `<svg viewBox="0 0 32 32"><path d="M3 4h16v12H3zM3 8h16M3 12h16M9 4v12M14 4v12" fill="none" stroke="#424242"/><path d="M13 19h16M13 23h16M13 27h11" stroke="#424242"/><path d="M6 19c0 4 2 6 5 6M9 23l2 2-2 2" fill="none" stroke="#2E75B6"/></svg>`,
  tbl_formula: `<svg viewBox="0 0 32 32"><text x="5" y="23" font-family="Cambria Math,Cambria,Times New Roman,serif" font-style="italic" font-size="19" fill="#424242">fx</text></svg>`,
  tbl_distrows: `<svg viewBox="0 0 20 20"><path d="M3 3h14v14H3zM3 7.7h14M3 12.3h14" fill="none" stroke="#424242"/><path d="M10 4v12M8.5 5.5 10 4l1.5 1.5M8.5 14.5 10 16l1.5-1.5" fill="none" stroke="#2E75B6"/></svg>`,
  tbl_distcols: `<svg viewBox="0 0 20 20"><path d="M3 3h14v14H3zM7.7 3v14M12.3 3v14" fill="none" stroke="#424242"/><path d="M4 10h12M5.5 8.5 4 10l1.5 1.5M14.5 8.5 16 10l-1.5 1.5" fill="none" stroke="#2E75B6"/></svg>`,
  tbl_height: `<svg viewBox="0 0 20 20"><path d="M10 2v16M7.5 4.5 10 2l2.5 2.5M7.5 15.5 10 18l2.5-2.5" fill="none" stroke="#2E75B6"/><path d="M14 6h4M14 14h4" stroke="#424242"/></svg>`,
  tbl_width: `<svg viewBox="0 0 20 20"><path d="M2 10h16M4.5 7.5 2 10l2.5 2.5M15.5 7.5 18 10l-2.5 2.5" fill="none" stroke="#2E75B6"/><path d="M3 4h14v3H3z" fill="#fff" stroke="#424242"/></svg>`,
  tbl_sort: `<svg viewBox="0 0 32 32"><text x="3" y="13" font-family="Segoe UI,Arial,sans-serif" font-size="11" fill="#2E75B6">A</text><text x="3" y="27" font-family="Segoe UI,Arial,sans-serif" font-size="11" fill="#424242">Z</text><path d="M22 5v22M18.5 23.5 22 27l3.5-3.5" fill="none" stroke="#424242" stroke-width="1.3"/></svg>`,
  tbl_delcells: `<svg viewBox="0 0 20 20"><path d="M3 4h14v12H3zM3 10h14M10 4v12" fill="none" stroke="#424242"/><rect x="10" y="10" width="7" height="6" fill="#F4CCCC"/><path d="m11.5 11.5 4 3M15.5 11.5l-4 3" stroke="#D13438"/></svg>`,
  tbl_delcol: `<svg viewBox="0 0 20 20"><path d="M3 4h14v12H3zM3 10h14M10 4v12" fill="none" stroke="#424242"/><rect x="10" y="4" width="7" height="12" fill="#F4CCCC"/><path d="m11.5 8 4 4M15.5 8l-4 4" stroke="#D13438"/></svg>`,
  tbl_delrow: `<svg viewBox="0 0 20 20"><path d="M3 4h14v12H3zM3 10h14M10 4v12" fill="none" stroke="#424242"/><rect x="3" y="10" width="14" height="6" fill="#F4CCCC"/><path d="m8 11.5 4 3M12 11.5l-4 3" stroke="#D13438"/></svg>`,
  tbl_deltable: `<svg viewBox="0 0 20 20"><path d="M3 4h14v12H3zM3 10h14M10 4v12" fill="#F4CCCC" stroke="#424242"/><path d="m7 7 6 6M13 7l-6 6" stroke="#D13438"/></svg>`,
  tds_shading: `<svg viewBox="0 0 32 32"><path d="m8 15 8-8 9 9-8 8z" fill="#fff" stroke="#424242"/><path d="M25 16c1.5 2.5 2.5 4 2.5 5a2.5 2.5 0 0 1-5 0c0-1 1-2.5 2.5-5z" fill="#2E75B6"/><path d="M4 27h24" stroke="#2E75B6" stroke-width="3"/></svg>`,
  tds_borderstyles: `<svg viewBox="0 0 32 32"><path d="M4 12h24" stroke="#424242" stroke-width="2"/><path d="M4 18h24" stroke="#424242" stroke-dasharray="3 2"/><path d="M4 23h24" stroke="#424242" stroke-width=".8"/></svg>`,
  tds_pen: `<svg viewBox="0 0 32 32"><path d="m7 22 13-13 3 3-13 13H7z" fill="#fff" stroke="#424242"/><path d="m20 9 2-2 3 3-2 2" fill="#2E75B6"/><path d="M4 28h24" stroke="#000" stroke-width="3"/></svg>`,
  tds_borders: `<svg viewBox="0 0 32 32"><path d="M5 5h22v22H5zM5 16h22M16 5v22" fill="none" stroke="#424242" stroke-dasharray="1.5 1.5"/><path d="M5 5h22v22H5z" fill="none" stroke="#424242" stroke-width="1.6"/></svg>`,
  tds_painter: `<svg viewBox="0 0 32 32"><path d="M3 6h16v14H3zM3 13h16M11 6v14" fill="none" stroke="#424242"/><path d="m18 24 7-14 3 1.5-7 14-3.5 1z" fill="#fff" stroke="#2E75B6"/></svg>`,
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
