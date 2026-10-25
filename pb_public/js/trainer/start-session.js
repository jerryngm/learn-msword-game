// Start a session: topics (tick "taught" to unlock), preset, mode, length, a live summary, then Start.
import { pb } from "../live.js";
import { TOPICS } from "../content/skills.js";
import { missionsPerRun } from "../game-data.js";
import { LENGTHS, MODES, PRESETS, errText, esc, flash, sessionLine, topicList } from "./util.js";

/** Ends every live session, then creates the new one as the only live session. */
export async function startSession(body) {
  const live = await pb.collection("sessions").getFullList({ filter: 'status = "live"', fields: "id", requestKey: null });
  for (const s of live) await pb.collection("sessions").update(s.id, { status: "ended" }, { requestKey: null });
  return pb.collection("sessions").create({ ...body, status: "live" }, { requestKey: null });
}

export async function endSessions() {
  const live = await pb.collection("sessions").getFullList({ filter: 'status = "live"', fields: "id", requestKey: null });
  for (const s of live) await pb.collection("sessions").update(s.id, { status: "ended" }, { requestKey: null });
}

function topicsForPreset(preset, taught) {
  if (preset === "last_week") return taught.length ? [Math.max(...taught)] : [];
  return [...taught];
}

export function render(root, { store, logout }) {
  const pick = { preset: "all_covered", topics: null, mode: "both", length: 10, showNames: false };
  let busy = false;

  root.innerHTML = `
    <header class="t-head">
      <h1>Start a session</h1>
      <span class="t-sess" id="current"></span>
      <a class="t-btn" href="#/">← Back to dashboard</a>
      <button class="t-btn t-link" type="button" id="logout">Log out</button>
    </header>
    <div class="t-setup">
      <div class="t-col">
        <section class="t-card">
          <h2>Topics</h2>
          <p class="t-muted">Tick <b>Taught</b> when you have taught a topic. Only taught topics can be practised.</p>
          <div class="t-topics" id="topics"></div>
          <div class="t-quick" id="presets" role="group" aria-label="Preset"></div>
        </section>
      </div>
      <div class="t-col">
        <section class="t-card">
          <h2>Mode</h2>
          <div class="t-seg" id="modes" role="group" aria-label="Mode"></div>
        </section>
        <section class="t-card">
          <h2>Length</h2>
          <div class="t-seg" id="lengths" role="group" aria-label="Length"></div>
          <p class="t-note">No timers. Length is counted in items, never minutes.</p>
        </section>
        <section class="t-card">
          <h2>This session</h2>
          <div class="t-preview" id="preview"></div>
          <label class="t-chk"><input type="checkbox" id="names"> Show names on the projector</label>
          <div class="t-actions">
            <button class="t-btn t-btn-pri" type="button" id="start">▶ Start session</button>
            <button class="t-btn" type="button" id="end">■ End session</button>
          </div>
          <p class="t-msg" id="msg" role="status"></p>
        </section>
      </div>
    </div>`;

  const $ = (sel) => root.querySelector(sel);
  const msg = $("#msg");
  $("#logout").addEventListener("click", logout);

  const taughtNow = () => topicList(store.state.settings?.taught_topics);
  const chosen = () => {
    const taught = taughtNow();
    const list = pick.topics ?? topicsForPreset(pick.preset, taught);
    return list.filter((n) => taught.includes(n));
  };

  function draw(state) {
    const taught = taughtNow();
    const on = new Set(chosen());
    $("#current").textContent = state.session ? `Running now: ${sessionLine(state.session)}` : "No session running";
    $("#end").disabled = busy || !state.session;

    $("#topics").innerHTML = TOPICS.map((t) => {
      const isTaught = taught.includes(t.n);
      return `<div class="t-topic ${isTaught ? "" : "is-locked"} ${on.has(t.n) ? "is-on" : ""}">
          <button type="button" class="t-topic-pick" data-topic="${t.n}" ${isTaught ? "" : "disabled"} aria-pressed="${on.has(t.n)}">
            <b>${t.n}</b><span>${esc(t.title.en)}<small>${isTaught ? (on.has(t.n) ? "In this session" : "Not in this session") : "Not taught yet"}</small></span>
          </button>
          <label class="t-taught"><input type="checkbox" data-taught="${t.n}" ${isTaught ? "checked" : ""}> Taught</label>
        </div>`;
    }).join("");

    $("#presets").innerHTML = PRESETS.map((p) => {
      const sel = pick.topics === null && pick.preset === p.key;
      const extra = p.key === "last_week" && taught.length ? ` (${Math.max(...taught)})` : p.key === "all_covered" && taught.length ? ` (${taught.join(", ")})` : "";
      return `<button type="button" class="t-chip ${sel ? "is-on" : ""}" data-preset="${p.key}" aria-pressed="${sel}">${esc(p.label + extra)}</button>`;
    }).join("");

    $("#modes").innerHTML = MODES.map((m) => `<button type="button" class="${pick.mode === m.key ? "is-on" : ""}" data-mode="${m.key}" aria-pressed="${pick.mode === m.key}">${m.label}<small>${m.small}</small></button>`).join("");
    $("#lengths").innerHTML = LENGTHS.map((n) => `<button type="button" class="${pick.length === n ? "is-on" : ""}" data-length="${n}" aria-pressed="${pick.length === n}">${{ 6: "Short", 10: "Medium", 15: "Long" }[n]}<small>${n} items</small></button>`).join("");

    const topics = [...on];
    const missions = missionsPerRun(pick.length);
    const presetLabel = pick.topics === null ? PRESETS.find((p) => p.key === pick.preset).label : "Topics you picked";
    const lines = [];
    if (pick.mode !== "missions") lines.push(`<b>${pick.length}</b> revision items, ${pick.preset === "most_faded" && pick.topics === null ? "most faded skills first" : "faded skills first"}, topics mixed`);
    if (pick.mode !== "revision") lines.push(`<b>${missions}</b> Word missions in a Missions run`);
    if (pick.mode === "both") lines.push("Learners choose Revision or Missions on their home screen");
    lines.push(`<span class="t-muted">${esc(presetLabel)} · Topics: ${topics.length ? topics.join(", ") : "none"} · help fades by each learner's plant stage</span>`);
    $("#preview").innerHTML = lines.join("<br>");
    $("#start").disabled = busy || topics.length === 0;
    $("#names").checked = pick.showNames;
  }

  root.addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    if (!t || t.disabled) return;
    if (t.dataset.topic) {
      const n = Number(t.dataset.topic);
      const cur = new Set(chosen());
      cur.has(n) ? cur.delete(n) : cur.add(n);
      pick.topics = [...cur].sort((a, b) => a - b);
    } else if (t.dataset.preset) {
      pick.preset = t.dataset.preset;
      pick.topics = null;
    } else if (t.dataset.mode) pick.mode = t.dataset.mode;
    else if (t.dataset.length) pick.length = Number(t.dataset.length);
    else if (t.id === "start") return start();
    else if (t.id === "end") return end();
    else return;
    draw(store.state);
  });

  $("#names").addEventListener("change", (e) => (pick.showNames = e.target.checked));

  // Ticking "Taught" writes class_settings.taught_topics straight away.
  root.addEventListener("change", async (e) => {
    const n = Number(e.target.dataset?.taught);
    if (!n) return;
    const settings = store.state.settings;
    if (!settings) return flash(msg, "Class settings are missing. Create them in the admin first.", "error");
    const set = new Set(taughtNow());
    e.target.checked ? set.add(n) : set.delete(n);
    e.target.disabled = true;
    try {
      await pb.collection("class_settings").update(settings.id, { taught_topics: [...set].sort((a, b) => a - b) }, { requestKey: null });
      flash(msg, e.target.checked ? `Topic ${n} is now taught.` : `Topic ${n} is no longer taught.`);
    } catch (err) {
      e.target.checked = !e.target.checked;
      e.target.disabled = false;
      flash(msg, errText(err), "error");
    }
  });

  async function start() {
    const topics = chosen();
    if (!topics.length) return;
    busy = true;
    draw(store.state);
    try {
      await startSession({
        topics,
        preset: pick.topics === null ? pick.preset : "custom",
        mode: pick.mode,
        length: pick.length,
        show_names: pick.showNames,
      });
      location.hash = "#/";
    } catch (err) {
      flash(msg, errText(err), "error");
    } finally {
      busy = false;
      if (root.isConnected) draw(store.state);
    }
  }

  async function end() {
    if (!confirm("End the session for everyone?")) return;
    busy = true;
    draw(store.state);
    try {
      await endSessions();
      flash(msg, "Session ended.");
    } catch (err) {
      flash(msg, errText(err), "error");
    } finally {
      busy = false;
      draw(store.state);
    }
  }

  return store.on(draw);
}
