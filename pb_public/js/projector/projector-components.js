// Projector cards around the garden: the shared-goal strip under the scene and the three side cards.
// Pure presentation: call with gardenProgress / classStats output; never calculate learning rules here.

const asset = (name) => new URL(`../../img/projector-garden/${name}`, import.meta.url).href;
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const natural = (value) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
const countLabel = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

// How the garden grows, kept short enough for one line under the bar.
const HOW = "⭐ Every star fills the bar · 🌸 ⭐⭐⭐ on 2 different days = your own flower in the front bed";

/**
 * The shared-goal strip. garden: {stars, flowers, perFlower, towardNext} (gardenProgress).
 * status is live or loading; capacity is the number of flowers the garden holds; today = session stars.
 */
export function goalStripHtml(garden, { status = "live", capacity = 13, today = 0 } = {}) {
  const ready = status === "live" && garden != null;
  const stars = ready ? natural(garden.stars) : 0;
  const flowers = ready ? natural(garden.flowers) : 0;
  const max = ready ? Math.max(1, natural(garden.perFlower)) : 1;
  const capped = ready && flowers >= capacity;
  const value = ready ? (capped ? max : Math.min(max, natural(garden.towardNext))) : 0;
  const title = ready ? `${stars} stars together` : "Loading our garden…";
  const remaining = ready ? (capped ? "Our garden is full" : `${countLabel(max - value, "star")} to our next flower`) : "Every bit of practice counts";
  const caption = ready
    ? [`${countLabel(flowers, "flower")} grown`, remaining, natural(today) ? `+${natural(today)} today` : ""].filter(Boolean)
    : [remaining];
  return `<section class="pg-goal" aria-label="Shared garden goal">
    <img class="pg-star" src="${esc(asset("shared-star.svg"))}" alt="" width="160" height="160">
    <div class="pg-goal-body"><h2>${title}</h2>
      <div class="pg-meter" role="progressbar" aria-label="Stars toward the next shared flower" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${esc(remaining)}"><span style="width:${(value / max) * 100}%"></span></div>
      <p class="pg-goal-caption">${caption.map((c) => `<span>${esc(c)}</span>`).join("")}</p>
      <p class="pg-how">${HOW}</p>
    </div><span class="pg-sunflower" aria-hidden="true"></span>
  </section>`;
}

/** Ring is decorative: the adjacent text exposes the percentage once to assistive technology. */
export function accuracyRingHtml(accuracy) {
  const known = Number.isFinite(accuracy);
  const value = known ? Math.min(100, Math.max(0, accuracy)) : 0;
  return `<svg class="pg-ring" viewBox="0 0 120 120" aria-hidden="true">
    <circle class="pg-ring-track" cx="60" cy="60" r="48"/>
    <circle class="pg-ring-value" cx="60" cy="60" r="48" pathLength="100" stroke-dasharray="${value} 100" transform="rotate(-90 60 60)"/>
    ${known && value > 0 ? `<circle class="pg-ring-centre" cx="60" cy="60" r="20"/><path class="pg-ring-check" d="m50 60 7 8 15-17"/>` : ""}
  </svg>`;
}

/**
 * The three side cards. stats: classStats output (or null while waiting). label: the resolved
 * itemLabel result, escaped here. roster: trusted, already-escaped markup of who is in the room.
 * Reconnecting is shown once, in the page header.
 */
export function sidebarHtml(stats, { status = "live", label = null, roster = "" } = {}) {
  const ready = status === "live" && stats != null;
  const present = ready ? natural(stats.present) : 0;
  const finished = ready ? Math.min(present, natural(stats.finished)) : 0;
  const accuracy = ready && Number.isFinite(stats.accuracy) ? Math.round(Math.min(100, Math.max(0, stats.accuracy))) : null;
  const title = status === "loading" ? "Loading class progress…" : !ready ? "Waiting for class" : !present ? "No one has started yet" : `<span class="pg-finished">${finished}</span> of ${present} finished`;
  const support = !ready ? "Our garden keeps growing when your teacher starts the session." : "Every bit of practice counts";
  const task = ready && stats.tricky ? label?.title || "Practise this skill together" : !ready ? "Our next practice will appear here" : stats.trickyCandidates ? "Everything so far was right first time." : "We'll see after a few more answers.";
  return `<div class="pg-sidebar">
    <section class="pg-card pg-today"><h2>Today's progress</h2>
      <p class="pg-completion">${title}</p>${ready && present && roster ? roster : `<p class="pg-support">${support}</p>`}
    </section>
    <section class="pg-card pg-success"><h2>Our shared success</h2>
      <div class="pg-success-body">${accuracyRingHtml(accuracy)}<div><p class="pg-percentage">${accuracy == null ? "—" : `${accuracy}%`}</p><p class="pg-support">${accuracy == null ? "Waiting for answers" : "right first time"}</p></div></div>
    </section>
    <section class="pg-card pg-practice"><h2>Let's practise together</h2>
      <p class="pg-task">${esc(task)}</p>${ready && stats.tricky && label?.prompt ? `<p class="pg-prompt">${esc(label.prompt)}</p>` : ""}
    </section>
  </div>`;
}
