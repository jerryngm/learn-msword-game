// Small helpers shared by the trainer views.
import { avatarEmoji, esc } from "../i18n.js";
import { TOPICS } from "../content/skills.js";

export { esc, avatarEmoji };

export const PRESETS = [
  { key: "revise_everything", label: "Revise everything" },
  { key: "all_covered", label: "All covered so far" },
  { key: "last_week", label: "Only last week" },
  { key: "most_faded", label: "Most faded" },
];
export const MODES = [
  { key: "revision", label: "Revision", small: "quick mixed practice" },
  { key: "missions", label: "Missions", small: "tasks in Word" },
  { key: "both", label: "Both", small: "recommended" },
];
export const LENGTHS = [6, 10, 15];

/** Valid topic numbers from a JSON field, sorted. */
export function topicList(value) {
  const valid = new Set(TOPICS.map((t) => t.n));
  return [...new Set((Array.isArray(value) ? value : []).map(Number).filter((n) => valid.has(n)))].sort((a, b) => a - b);
}

export function topicTitle(n) {
  return TOPICS.find((t) => t.n === n)?.title.en ?? `Topic ${n}`;
}

/** "Topics 1, 3 · Both · 10 items" for a session record. */
export function sessionLine(session) {
  if (!session) return "No session running";
  const topics = topicList(session.topics);
  const preset = PRESETS.find((p) => p.key === session.preset)?.label;
  const mode = MODES.find((m) => m.key === session.mode)?.label ?? session.mode;
  return [preset, topics.length ? `Topics ${topics.join(", ")}` : null, mode, `${session.length} items`].filter(Boolean).join(" · ");
}

export function face(learner, size = "") {
  return `<span class="t-face ${size}" style="--ring:${esc(learner?.colour || "#2F7370")}" aria-hidden="true">${avatarEmoji(learner?.avatar)}</span>`;
}

/** "just now", "4 min ago", "2 h ago", or the date. */
export function ago(created) {
  const ms = Date.parse(String(created).replace(" ", "T"));
  if (!Number.isFinite(ms)) return "";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`;
  return new Date(ms).toLocaleDateString();
}

/** Brief status line inside `el` that clears itself. */
export function flash(el, text, kind = "ok") {
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.textContent = ""), kind === "error" ? 8000 : 4000);
}

/** Readable message from a PocketBase error. */
export function errText(err) {
  if (err?.status === 0) return "Can't reach the class computer. Check the wifi.";
  if (err?.status === 403 || err?.status === 401) return "Not allowed. Please log in again.";
  return err?.response?.message || err?.message || "Something went wrong.";
}
