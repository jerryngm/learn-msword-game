// Trainer dashboard (#s10): ask queue, learners × skills heatmap, struggle flags, who can help,
// the class garden (pick the next flower), send ⭐ / 🤝, and learner admin. Everything redraws from the shared live store.
import { pb } from "../live.js";
import { BONUS_TOPIC, skillsOfTopic, skillById } from "../content/skills.js";
import { gardenState } from "../rules.js";
import { PLANT_KINDS } from "../plants.js";
import { GARDEN_AREAS, gardenKind, gardenProgress, totalStars } from "../projector/class-stats.js";
import { ago, errText, esc, face, flash, sessionLine, topicList } from "./util.js";

const STAR_MESSAGES = [
  "Great work today!",
  "You are getting better every week.",
  "Well done for not giving up.",
  "Thank you for helping a classmate.",
];
const ASK_LABEL = { stuck: "I'm stuck 😕", learn_more: "Wants to learn more 💡", classmate: "Asked for a classmate 🤝" };
const STAGE_MARK = { seed: "–", sprout: "🌱", leafy: "🌿", bud: "🌷", flowering: "🌼" };
const HELP_SHOW_ME = 3; // mission Help 3 = Show me
const KIND_KEYS = PLANT_KINDS.map((k) => k.key);
const KIND_NAME = new Map(PLANT_KINDS.map((k) => [k.key, k.en]));
const gardenPicks = (settings) => {
  const p = settings?.garden_picks;
  return p && typeof p === "object" && !Array.isArray(p) ? p : {};
};
const WRONG_TRIES = 3; // tries counts the right try too, so 3 wrong = tries ≥ 4

/** "keys", "screen parts": a short column label from a skill id. */
function shortSkill(id) {
  return id.replace(/^t\d-/, "").replace(/-/g, " ");
}

function learnerName(learners, id) {
  return learners.find((l) => l.id === id)?.name ?? "Someone";
}

/** Struggle flags for this session's attempts, one line per learner. */
function struggleFlags(sessionAttempts, learners) {
  const byLearner = new Map();
  for (const a of sessionAttempts) {
    if (!byLearner.has(a.learner)) byLearner.set(a.learner, []);
    byLearner.get(a.learner).push(a);
  }
  const flags = [];
  for (const [id, list] of byLearner) {
    const showMeItems = new Set(list.filter((a) => (a.help_level ?? 0) >= HELP_SHOW_ME).map((a) => a.item));
    const hardItems = [...new Set(list.filter((a) => (a.tries ?? 0) > WRONG_TRIES).map((a) => a.item))];
    const why = [];
    if (showMeItems.size >= 2) why.push(`needed Show me on ${showMeItems.size} items`);
    if (hardItems.length) why.push(`3+ wrong tries on ${hardItems.length === 1 ? hardItems[0] : `${hardItems.length} items`}`);
    const learner = learners.find((l) => l.id === id);
    if (why.length && learner) flags.push({ learner, why: why.join(" · ") });
  }
  return flags;
}

export function render(root, { store, logout }) {
  const ui = { to: "", msgIndex: 0, custom: "", helper: false };
  let busy = false;

  root.innerHTML = `
    <header class="t-head">
      <h1>Trainer view</h1>
      <span class="t-live" id="live"></span>
      <span class="t-sess" id="sess"></span>
      <label class="t-chk t-names"><input type="checkbox" id="names"> Show names on projector</label>
      <a class="t-btn t-btn-pri" href="#/setup">▶ Start session</a>
      <button class="t-btn t-link" type="button" id="logout">Log out</button>
    </header>
    <p class="t-msg t-banner" id="err" role="alert" data-kind="error"></p>
    <div class="t-grid">
      <section class="t-card t-queue">
        <h2>🙋 Asking for help <span class="t-count" id="qCount">0</span></h2>
        <div id="queue" class="t-scroll"></div>
      </section>
      <section class="t-card t-heat">
        <h2>🌱 Learners × skills <small class="t-muted">private · only you see names</small></h2>
        <div class="t-scroll" id="heat"></div>
        <div class="t-legend">
          <span>🌼 Mastered (3★ on 2 days)</span><span>🌷 3★ once</span><span>🌿 Came back</span><span>🌱 Tried</span><span>💧 Wilting</span><span>– Not started</span><span>★ last stars</span>
        </div>
      </section>
      <div class="t-col">
        <section class="t-card">
          <h2>🚩 May need you</h2>
          <div id="flags"></div>
        </section>
        <section class="t-card">
          <h2>🤝 Who can help?</h2>
          <div id="helpers" class="t-scroll t-short"></div>
        </section>
        <section class="t-card t-garden">
          <h2>🌻 Class garden</h2>
          <p id="gardenLine"></p>
          <div class="t-gpick" id="gardenPick" role="group" aria-label="Next flower"></div>
          <p class="t-msg" id="gardenMsg" role="status"></p>
        </section>
        <section class="t-card t-send">
          <h2>⭐ Send a star</h2>
          <label for="toWho">To</label>
          <select id="toWho"></select>
          <div class="t-msgs" id="msgs" role="group" aria-label="Message"></div>
          <label for="custom">Or write your own</label>
          <input id="custom" type="text" maxlength="200" placeholder="Optional">
          <label class="t-chk"><input type="checkbox" id="helper"> Also give a 🤝 Helper badge</label>
          <button class="t-btn t-btn-pri" type="button" id="send">Send ⭐</button>
          <p class="t-msg" id="sendMsg" role="status"></p>
        </section>
      </div>
    </div>
    <details class="t-card t-admin">
      <summary><h2>👥 Learners</h2><span class="t-muted">rename, merge duplicates, deactivate, delete</span></summary>
      <div id="admin"></div>
      <p class="t-msg" id="adminMsg" role="status"></p>
    </details>`;

  const $ = (sel) => root.querySelector(sel);
  $("#logout").addEventListener("click", logout);

  function draw(state) {
    const { session, learners, attempts, asks, errors } = state;
    const active = learners.filter((l) => l.active !== false);
    const errKeys = Object.keys(errors);
    $("#err").textContent = errKeys.length ? `Live updates paused (${errKeys.join(", ")}). Retrying…` : "";

    $("#live").textContent = session ? "Live" : "No session";
    $("#live").classList.toggle("is-off", !session);
    $("#sess").textContent = sessionLine(session);
    $("#names").checked = Boolean(session?.show_names);
    $("#names").disabled = !session || busy;

    /* ask queue */
    $("#qCount").textContent = String(asks.length);
    $("#queue").innerHTML = asks.length
      ? asks
          .map((a) => {
            const l = learners.find((x) => x.id === a.learner);
            const h = a.helper ? learners.find((x) => x.id === a.helper) : null;
            const skill = a.skill ? skillById(a.skill)?.ican.en ?? a.skill : "";
            const helperLine = h ? `<div class="t-helper-line" style="color:var(--leaf);font-weight:700">🤝 <b>${esc(h.name)}</b> is helping</div>` : "";
            return `<div class="t-q t-q-${esc(a.type)}${h ? " is-helping" : ""}">
              ${face(l)}
              <div><b>${esc(l?.name ?? "Someone")}</b>
                <div>${esc(ASK_LABEL[a.type] ?? a.type)}</div>
                ${helperLine}
                ${skill ? `<small class="t-muted">${esc(skill)}</small>` : ""}
                <small class="t-muted">${esc(ago(a.created))}</small></div>
              <button class="t-btn t-btn-sm" type="button" data-done="${esc(a.id)}">Done</button>
            </div>`;
          })
          .join("")
      : `<p class="t-empty">All clear 🌿 Nobody is waiting.</p>`;

    /* heatmap: skills of the session's topics, or of the taught topics with no session */
    const topics = topicList(session?.topics).length ? topicList(session.topics) : topicList(state.settings?.taught_topics);
    const skills = topics.flatMap((n) => skillsOfTopic(n));
    const today = Date.now();
    const byLearner = new Map(active.map((l) => [l.id, []]));
    for (const a of attempts) byLearner.get(a.learner)?.push(a);
    const gardens = new Map(active.map((l) => [l.id, gardenState(byLearner.get(l.id), skills.map((s) => s.id), today)]));
    const sessionAttempts = session ? attempts.filter((a) => a.session === session.id) : [];
    const flags = struggleFlags(sessionAttempts, active);
    const flagged = new Set(flags.map((f) => f.learner.id));

    $("#heat").innerHTML = !active.length
      ? `<p class="t-empty">No learners yet. They join on their own laptops.</p>`
      : !skills.length
        ? `<p class="t-empty">No topics taught yet. Tick one in Start session.</p>`
        : `<table class="t-hm">
            <thead><tr><th></th>${skills.map((s) => `<th title="${esc(s.ican.en)}"><span>${esc(shortSkill(s.id))}</span><small>${s.topic === BONUS_TOPIC ? "🌟" : `T${s.topic}`}</small></th>`).join("")}</tr></thead>
            <tbody>${active
              .map((l) => {
                const g = gardens.get(l.id);
                return `<tr class="${flagged.has(l.id) ? "is-flagged" : ""}"><th>${face(l, "t-face-sm")}${esc(l.name)}</th>${skills
                  .map((s) => {
                    const st = g.get(s.id);
                    const mark = st.wilted ? "💧" : STAGE_MARK[st.stage];
                    const cls = st.wilted ? "c-wilt" : `c-${st.stage}`;
                    const tip = `${l.name} · ${s.ican.en}: ${st.wilted ? "wilting" : st.stage}${st.lastStars ? `, last ${st.lastStars}★` : ""}`;
                    return `<td class="${cls}" title="${esc(tip)}">${mark}${st.lastStars ? `<small>${"★".repeat(st.lastStars)}</small>` : ""}</td>`;
                  })
                  .join("")}</tr>`;
              })
              .join("")}</tbody></table>`;

    /* struggle flags */
    $("#flags").innerHTML = flags.length
      ? flags.map((f) => `<div class="t-flag">${face(f.learner)}<div><b>${esc(f.learner.name)}</b><small>${esc(f.why)}</small></div></div>`).join("")
      : `<p class="t-empty">${session ? "Nobody is struggling right now." : "Flags show during a session."}</p>`;

    /* who can help: per skill, learners who completed it cleanly (flowering or bud) */
    const helperRows = skills
      .map((s) => ({
        s,
        who: active.filter((l) => {
          const st = gardens.get(l.id)?.get(s.id);
          return st && (st.stage === "flowering" || st.stage === "bud");
        }),
      }))
      .filter((r) => r.who.length);
    $("#helpers").innerHTML = helperRows.length
      ? helperRows
          .map((r) => `<div class="t-pair"><span>${esc(s0(r.s))}</span><span>${r.who.map((l) => `${face(l, "t-face-sm")}${esc(l.name)}`).join(" ")}</span></div>`)
          .join("")
      : `<p class="t-empty">Nobody has completed a skill with 3★ yet.</p>`;

    /* class garden: kept across sessions; the next flower is a surprise unless the trainer picks it */
    const garden = gardenProgress(totalStars(attempts));
    const picks = gardenPicks(state.settings);
    const nextKey = gardenKind(garden.flowers, KIND_KEYS, picks);
    const picked = picks[String(garden.flowers)];
    const area = `level ${garden.level} of ${GARDEN_AREAS.length}`;
    $("#gardenLine").innerHTML = garden.full
      ? `<b>${garden.flowers} flowers</b> · the garden is full 🌻 (${garden.stars} ★)`
      : `<b>${garden.flowers} flowers</b> · ${area} · ${garden.perFlower - garden.towardNext} ★ to the next one<br>
         <small class="t-muted">Next flower: ${picked ? `<b>${esc(KIND_NAME.get(nextKey))}</b> (your pick)` : "a surprise 🎲"}</small>`;
    $("#gardenPick").innerHTML = garden.full
      ? ""
      : [["", "🎲 Surprise"], ...PLANT_KINDS.map((k) => [k.key, k.en])]
          .map(([key, name]) => {
            const on = (picked ?? "") === key;
            return `<button type="button" class="t-chip ${on ? "is-on" : ""}" data-pick="${esc(key)}" data-at="${garden.flowers}" aria-pressed="${on}" ${busy || !state.settings ? "disabled" : ""}>${esc(name)}</button>`;
          })
          .join("");

    /* send a star */
    if (!active.some((l) => l.id === ui.to)) ui.to = active[0]?.id ?? "";
    $("#toWho").innerHTML = active.map((l) => `<option value="${esc(l.id)}" ${l.id === ui.to ? "selected" : ""}>${esc(l.name)}</option>`).join("");
    $("#msgs").innerHTML = STAR_MESSAGES.map(
      (m, i) => `<button type="button" class="t-chip ${ui.msgIndex === i && !ui.custom ? "is-on" : ""}" data-msg="${i}" aria-pressed="${ui.msgIndex === i && !ui.custom}">${esc(m)}</button>`,
    ).join("");
    $("#send").disabled = busy || !ui.to;

    /* learner admin (skip while the trainer is typing a new name) */
    if (!root.querySelector("#admin").contains(document.activeElement)) drawAdmin(learners, attempts);
  }

  function s0(skill) {
    return skill.ican.en.charAt(0).toUpperCase() + skill.ican.en.slice(1);
  }

  function drawAdmin(learners, attempts) {
    const counts = new Map();
    for (const a of attempts) counts.set(a.learner, (counts.get(a.learner) ?? 0) + 1);
    $("#admin").innerHTML = learners.length
      ? `<table class="t-admin-tbl"><thead><tr><th>Learner</th><th>Name</th><th>Items done</th><th>Active</th><th>Merge into</th><th></th></tr></thead><tbody>${learners
          .map(
            (l) => `<tr data-id="${esc(l.id)}" class="${l.active === false ? "is-inactive" : ""}">
              <td>${face(l, "t-face-sm")}</td>
              <td><input type="text" maxlength="20" value="${esc(l.name)}" data-rename="${esc(l.id)}" aria-label="Name of ${esc(l.name)}"></td>
              <td>${counts.get(l.id) ?? 0}</td>
              <td><input type="checkbox" data-active="${esc(l.id)}" ${l.active === false ? "" : "checked"} aria-label="${esc(l.name)} is active"></td>
              <td><select data-merge="${esc(l.id)}" aria-label="Merge ${esc(l.name)} into"><option value="">–</option>${learners
                .filter((o) => o.id !== l.id)
                .map((o) => `<option value="${esc(o.id)}">${esc(o.name)} (${counts.get(o.id) ?? 0})</option>`)
                .join("")}</select></td>
              <td><button class="t-btn t-btn-sm t-danger" type="button" data-delete="${esc(l.id)}">Delete</button></td>
            </tr>`,
          )
          .join("")}</tbody></table>`
      : `<p class="t-empty">No learners yet.</p>`;
  }

  /* ---------- actions ---------- */

  async function act(msgEl, fn, okText) {
    busy = true;
    draw(store.state);
    try {
      await fn();
      if (okText) flash(msgEl, okText);
    } catch (err) {
      console.error(err);
      flash(msgEl, errText(err), "error");
    } finally {
      busy = false;
      if (root.isConnected) draw(store.state);
    }
  }

  async function mergeLearner(fromId, intoId) {
    const filter = pb.filter("learner = {:id}", { id: fromId });
    for (const coll of ["attempts", "asks", "encouragements"]) {
      const rows = await pb.collection(coll).getFullList({ filter, fields: "id", requestKey: null });
      for (const r of rows) await pb.collection(coll).update(r.id, { learner: intoId }, { requestKey: null });
    }
    const [from, into] = await Promise.all([
      pb.collection("learners").getOne(fromId, { requestKey: null }),
      pb.collection("learners").getOne(intoId, { requestKey: null }),
    ]);
    const badges = (Number(into.helper_badges) || 0) + (Number(from.helper_badges) || 0);
    await pb.collection("learners").update(intoId, { helper_badges: badges }, { requestKey: null });
    await pb.collection("learners").delete(fromId, { requestKey: null });
  }

  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.done) {
      return act($("#err"), () => pb.collection("asks").update(b.dataset.done, { status: "done" }, { requestKey: null }));
    }
    if (b.dataset.msg) {
      ui.msgIndex = Number(b.dataset.msg);
      ui.custom = "";
      $("#custom").value = "";
      return draw(store.state);
    }
    if (b.dataset.at != null && b.dataset.pick != null) {
      const settings = store.state.settings;
      if (!settings) return;
      // Only the flower growing now can be picked; bloomed flowers keep their kind.
      const picks = { ...gardenPicks(settings) };
      if (b.dataset.pick) picks[b.dataset.at] = b.dataset.pick;
      else delete picks[b.dataset.at];
      const name = KIND_NAME.get(b.dataset.pick);
      return act(
        $("#gardenMsg"),
        () => pb.collection("class_settings").update(settings.id, { garden_picks: picks }, { requestKey: null }),
        name ? `The next flower will be a ${name.toLowerCase()} 🌱` : "The next flower will be a surprise 🎲",
      );
    }
    if (b.id === "send") {
      const learner = store.state.learners.find((l) => l.id === ui.to);
      if (!learner) return;
      const message = ui.custom.trim() || STAR_MESSAGES[ui.msgIndex];
      const helper = ui.helper;
      return act(
        $("#sendMsg"),
        async () => {
          await pb.collection("encouragements").create({ learner: learner.id, kind: "star", message }, { requestKey: null });
          if (helper) {
            await pb.collection("encouragements").create({ learner: learner.id, kind: "helper", message: "" }, { requestKey: null });
            const fresh = await pb.collection("learners").getOne(learner.id, { requestKey: null });
            await pb.collection("learners").update(learner.id, { helper_badges: (Number(fresh.helper_badges) || 0) + 1 }, { requestKey: null });
          }
          ui.custom = "";
          ui.helper = false;
          $("#custom").value = "";
          $("#helper").checked = false;
        },
        `Sent ✓ It will appear in ${learner.name}'s garden.`,
      );
    }
    if (b.dataset.delete) {
      const l = store.state.learners.find((x) => x.id === b.dataset.delete);
      if (!l || !confirm(`Delete ${l.name} and all their stars? Their stars also leave the class garden. This can't be undone.`)) return;
      return act($("#adminMsg"), () => pb.collection("learners").delete(l.id, { requestKey: null }), `${l.name} deleted.`);
    }
  });

  root.addEventListener("input", (e) => {
    if (e.target.id === "custom") ui.custom = e.target.value;
  });

  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "toWho") ui.to = t.value;
    else if (t.id === "helper") ui.helper = t.checked;
    else if (t.id === "names") {
      const session = store.state.session;
      if (session) act($("#err"), () => pb.collection("sessions").update(session.id, { show_names: t.checked }, { requestKey: null }));
    } else if (t.dataset.rename) {
      const name = t.value.trim().slice(0, 20);
      const l = store.state.learners.find((x) => x.id === t.dataset.rename);
      if (!l || !name || name === l.name) return (t.value = l?.name ?? "");
      act($("#adminMsg"), () => pb.collection("learners").update(l.id, { name }, { requestKey: null }), `Renamed to ${name}.`).then(() => t.blur());
    } else if (t.dataset.active) {
      act($("#adminMsg"), () => pb.collection("learners").update(t.dataset.active, { active: t.checked }, { requestKey: null }));
    } else if (t.dataset.merge && t.value) {
      const learners = store.state.learners;
      const from = t.dataset.merge;
      const into = t.value;
      const ok = confirm(`Move all of ${learnerName(learners, from)}'s stars to ${learnerName(learners, into)}, then delete ${learnerName(learners, from)}?`);
      if (!ok) return (t.value = "");
      act($("#adminMsg"), () => mergeLearner(from, into), `Merged into ${learnerName(learners, into)}.`);
    }
  });

  return store.on(draw);
}
