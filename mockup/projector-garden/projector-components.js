// Pure presentation helpers. Call with classStats output; never calculate learning rules here.
const asset = name => new URL(`./assets/${name}`, import.meta.url).href;
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const natural = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const countLabel = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** A live HTML progress strip. status is live, loading or waiting; caller owns reconnect state. */
export function goalStripHtml(stats, { status = 'live', capacity = 13 } = {}) {
  const ready = status === 'live' && stats != null;
  const stars = ready ? natural(stats.stars) : 0;
  const flowers = ready ? natural(stats.flowers) : 0;
  const max = ready ? Math.max(1, natural(stats.perFlower)) : 1;
  const capped = ready && flowers >= capacity;
  const value = ready ? capped ? max : Math.min(max, natural(stats.towardNext)) : 0;
  const title = ready ? `${stars} stars together` : status === 'loading' ? 'Loading our garden…' : 'Waiting for class';
  const remaining = ready ? capped ? 'The garden is full' : `${countLabel(max - value, 'star')} to our next flower` : 'Ready to grow together';
  return `<section class="pg-goal" aria-label="Shared garden goal">
    <img class="pg-star" src="${esc(asset('shared-star.svg'))}" alt="" width="160" height="160">
    <div class="pg-goal-body"><h2>${title}</h2>
      <div class="pg-meter" role="progressbar" aria-label="Stars toward the next shared flower" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${esc(remaining)}"><span style="width:${value / max * 100}%"></span></div>
      <p class="pg-goal-caption"><span>${ready ? `${countLabel(flowers, 'flower')} grown` : 'Every bit of practice counts'}</span><span>${esc(remaining)}</span></p>
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
    ${known && value > 0 ? `<circle class="pg-ring-centre" cx="60" cy="60" r="20"/><path class="pg-ring-check" d="m50 60 7 8 15-17"/>` : ''}
  </svg>`;
}

/** label is the resolved itemLabel result. Only opt into flower-photo artwork for a relevant task. */
export function sidebarHtml(stats, { status = 'live', offline = false, label = null, practiceArtwork = null } = {}) {
  const ready = status === 'live' && stats != null;
  const present = ready ? natural(stats.present) : 0;
  const finished = ready ? Math.min(present, natural(stats.finished)) : 0;
  const accuracy = ready && Number.isFinite(stats.accuracy) ? Math.round(Math.min(100, Math.max(0, stats.accuracy))) : null;
  const title = status === 'loading' ? 'Loading class progress…' : !ready ? 'Waiting for class' : !present ? 'No one has started yet' : `<span class="pg-finished">${finished}</span> of ${present} finished`;
  const task = ready && stats.tricky ? label?.title || 'Practise this skill together' : !ready ? 'Our next practice will appear here' : stats.trickyCandidates ? 'Everything so far was right first time.' : "We'll see after a few more answers.";
  const hasArt = ready && Boolean(stats.tricky) && practiceArtwork === 'flower-photo';
  return `<div class="pg-sidebar">
    <section class="pg-card pg-today"><h2>Today's progress</h2>
      <p class="pg-completion">${title}</p><p class="pg-support">Every bit of practice counts</p>
      ${offline ? '<p class="pg-offline" role="status">Reconnecting… Showing the last update.</p>' : ''}
    </section>
    <section class="pg-card pg-success"><h2>Our shared success</h2>
      <div class="pg-success-body">${accuracyRingHtml(accuracy)}<div><p class="pg-percentage">${accuracy == null ? '—' : `${accuracy}%`}</p><p class="pg-support">${accuracy == null ? 'Waiting for answers' : 'right first time'}</p></div></div>
    </section>
    <section class="pg-card pg-practice"><h2>Let's practise together</h2><div class="pg-practice-body${hasArt ? ' has-art' : ''}">
      <div><p class="pg-task">${esc(task)}</p>${ready && stats.tricky && label?.prompt ? `<p class="pg-prompt">${esc(label.prompt)}</p>` : ''}</div>
      ${hasArt ? `<img class="pg-document" src="${esc(asset('practice-flower-document.png'))}" alt="" width="1145" height="1374">` : ''}
    </div></section>
  </div>`;
}
