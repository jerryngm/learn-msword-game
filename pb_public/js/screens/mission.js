import { instructionPair, punctuationReminder } from "../content/text-rules.js";
// Missions (#s4, with the stuck helps of #s5 folded into the Help ladder and the 🙋 Ask button).
// Left: the task column (goal, "Make it look like this" picture, steps that tick themselves, Help).
// Right: Word (or a mini mock such as File Explorer). The text is never pre-selected.
//
// Help ladder (game-rules.md): 2 unhelpful tries make Help glow. Help 1 = hint for the current step,
// Help 2 = spotlight, Help 3 = Show me (the document never changes), then Your turn and Show me again.
// Exploring is free; stars come only from the highest Help used (rules.starsFor).
//
// `ctx` for predicates: {saved: {folder, name} | null, opened: string | null, learner: {name},
// selection: {anchor:{p,offset}, focus:{p,offset}}} (selection is an addition, for "select the words" steps).

import { VI_CHANGE_EVENT, biPair, esc, labelPair } from "../i18n.js";
import { TOPICS, skillById } from "../content/skills.js";
import { getInternals, mountWord } from "../word/index.js";
import { createHints, setHelpGlow } from "../word/hints.js";
import { createDoc } from "../word/model.js";
import { createRenderer } from "../word/render.js";
import { pickNextMission } from "../revision.js";
import { skillState, starsFor, supportLevel } from "../rules.js";
import { mountAsk } from "../ask.js";
import { mountHelperAlert } from "../helper-alerts.js";
import { getRun, learnerAttempts, loadAllContent, missionsPerRun, playContext, recordAttempt, setRun, tapGuard } from "../game-data.js";
import { gbi, glabel, gt } from "../strings-game.js";
import { calmHtml, renderSuccess } from "./success.js";
import { loadMock } from "./revision.js";

const pair = (p) => (p && typeof p === "object" ? { en: String(p.en ?? ""), vi: String(p.vi ?? p.en ?? "") } : { en: String(p ?? ""), vi: String(p ?? "") });
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const HELP_LABELS = ["helpMe", "moreHelp", "showMe", "showMeAgain"];

function initialsOf(name) {
  return String(name ?? "").trim().split(/\s+/).filter(Boolean).map((w) => Array.from(w)[0]).slice(0, 2).join("");
}

function safeBool(fn) {
  try {
    return Boolean(fn());
  } catch (err) {
    console.error("mission predicate failed", err);
    return false;
  }
}

function safeNum(fn) {
  try {
    const v = Number(fn());
    return Number.isFinite(v) ? v : 0;
  } catch (err) {
    console.error("mission progress failed", err);
    return 0;
  }
}

/** Fits the entire goal page in the thumbnail and opens a readable native dialog. */
function drawThumb(box, targetDoc) {
  const page = box.querySelector(".wg-thumb-page");
  try {
    createRenderer(page).render(createDoc(targetDoc));
  } catch (err) {
    console.error("goal picture could not be drawn", err);
    box.hidden = true;
    return () => {};
  }
  const fit = () => {
    // Fit to the width so the words stay readable; a long page is cropped to its top band.
    const scale = box.clientWidth / page.offsetWidth;
    if (!(scale > 0)) return;
    page.style.transform = `scale(${scale})`;
    page.style.left = "0px";
    box.style.height = `${Math.min(96, Math.ceil(page.offsetHeight * scale))}px`;
  };
  const ro = new ResizeObserver(fit);
  ro.observe(box);
  fit();
  let dialog = null;
  const open = () => {
    if (dialog) return;
    dialog = document.createElement("dialog");
    dialog.className = "wg-goal-preview";
    dialog.setAttribute("aria-labelledby", "wg-goal-title");
    dialog.innerHTML = `<div class="wg-goal-head"><h2 id="wg-goal-title">${gbi("goalPicture")}</h2><button type="button" class="btn">${gbi("closeGoalPicture")}</button></div><div class="wg-goal-scroll" tabindex="0"><div class="wg-goal-page"></div></div>`;
    createRenderer(dialog.querySelector(".wg-goal-page")).render(createDoc(targetDoc));
    const preview = dialog;
    const close = () => {
      preview.remove();
      if (dialog === preview) dialog = null;
      if (box.isConnected) box.focus();
    };
    dialog.addEventListener("close", close, { once: true });
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector("button").focus();
  };
  const syncLabel = () => box.setAttribute("aria-label", glabel("enlargeGoalPicture"));
  window.addEventListener(VI_CHANGE_EVENT, syncLabel);
  box.addEventListener("click", open);
  return () => {
    ro.disconnect();
    window.removeEventListener(VI_CHANGE_EVENT, syncLabel);
    box.removeEventListener("click", open);
    dialog?.remove();
    dialog = null;
  };
}

/* ---------- the screen ---------- */

export async function render(root, { id, learner }) {
  root.innerHTML = `<main class="screen center-screen"><p class="lead">${gbi("loading")}</p></main>`;
  const [play, attempts, content] = await Promise.all([playContext(), learnerAttempts(learner.id), loadAllContent()]);
  const sessionId = play.session?.id ?? null;
  const missions = content.missions.filter((m) => m && typeof m.id === "string" && m.goal && typeof m.goal.check === "function");
  let active = null; // cleanup of the mission on screen
  let closed = false;

  function calm(opts) {
    active?.();
    active = null;
    root.innerHTML = calmHtml(opts);
  }

  /** Starts the next mission of this run, or a given mission id. */
  function start(which) {
    active?.();
    active = null;
    if (closed) return;
    let run = getRun();
    let mission = null;
    let inRun = false;

    if (which === "next") {
      const sameRun = run?.kind === "missions" && run.sessionId === sessionId && Array.isArray(run.done);
      if (sameRun && run.done.length >= run.target) {
        // A reload on the last success screen: the run is finished, so show its end screen (not a new run).
        location.replace("#/end");
        return;
      }
      if (!sameRun) {
        run = { kind: "missions", sessionId, started: Date.now(), target: missionsPerRun(play.length), done: [], results: [] };
      }
      const left = missions.filter((m) => !run.done.includes(m.id));
      mission = pickNextMission({ missions: left, attempts, topics: play.topics, today: new Date() });
      if (!mission) {
        if (run.done.length) {
          location.hash = "#/end";
          return;
        }
        const any = missions.some((m) => play.topics.includes(skillById(m.skill)?.topic));
        calm(
          any
            ? { icon: "🌼", titleKey: "missionsDoneTitle", bodyKey: "missionsDoneBody", actions: [{ href: "#/garden", key: "myGarden", primary: true }, { href: "#/home", key: "backHome" }] }
            : { icon: "🧩", titleKey: "emptyMissionTitle", bodyKey: "emptyMissionBody", actions: [{ href: "#/home", key: "backHome", primary: true }, { href: "#/free", key: "practiceFree" }] },
        );
        return;
      }
      run.current = mission.id;
      setRun(run);
      inRun = true;
    } else {
      mission = missions.find((m) => m.id === which) ?? null;
      if (!mission) {
        calm({ icon: "🧩", titleKey: "emptyMissionTitle", bodyKey: "emptyMissionBody", actions: [{ href: "#/home", key: "backHome", primary: true }, { href: "#/garden", key: "myGarden" }] });
        return;
      }
      inRun = run?.kind === "missions" && run.current === mission.id && run.done.length < run.target;
    }
    active = mount(mission, inRun ? run : null);
  }

  function mount(mission, run) {
    const steps = Array.isArray(mission.steps) ? mission.steps : [];
    const completedSteps = steps.map(() => false);
    const now = new Date();
    const before = skillState(attempts, mission.skill, now);
    const support = supportLevel(before.cleanDays);
    const usesWord = (mission.mock ?? "word") === "word";
    const ctx = { saved: null, opened: null, commands: [], learner: { name: learner.name }, selection: null };
    const n = run ? run.done.length + 1 : 0;

    root.innerHTML = `
      <main class="wg-mis support-${support}">
        <aside class="wg-mcol card" aria-label="${esc(labelPair(pair(mission.title)))}">
          <div class="wg-m-head">
            <div class="wg-m-nav">
              <a class="wg-m-navbtn" href="#/home">🏠 ${gbi("backHome")}</a>
              <button type="button" class="wg-m-navbtn wg-pick-btn">${gbi("chooseMission")}</button>
            </div>
            <div class="wg-eyebrow">${run ? gbi("missionN", { n, total: run.target }) : gbi("missionOne")}</div>
            <h1 class="wg-m-goal">${biPair(pair(mission.title))}</h1>
            ${steps.length ? `<span class="wg-m-pill" aria-live="polite"></span>` : ""}
          </div>
          <div class="wg-m-body">
            ${steps.length ? `<ol class="wg-msteps">${steps
              .map((s, i) => `<li class="wg-mstep" data-step="${i}"><span class="wg-num" aria-hidden="true"><span>${i + 1}</span></span><span class="wg-mstep-t">${instructionPair(pair(s.text), { ...s, targetDoc: mission.targetDoc })}</span></li>`)
              .join("")}</ol>` : ""}
            ${mission.targetDoc != null ? `<div class="wg-m-look">${gbi("lookLike")}
              <button type="button" class="wg-thumb" aria-haspopup="dialog" aria-label="${esc(glabel("enlargeGoalPicture"))}"><span class="wg-thumb-page" aria-hidden="true"></span><span class="wg-thumb-ok" aria-hidden="true">✓</span><span class="wg-thumb-badge" aria-hidden="true">${gbi("enlargeBadge")}</span></button></div>` : ""}
            ${mission.scenario ? `<details class="wg-m-story"${window.innerHeight >= 760 || !steps.length ? " open" : ""}><summary>${gbi("aboutMission")}</summary><p class="wg-m-scn">${instructionPair(pair(mission.scenario), mission)}</p></details>` : ""}
          </div>
          <div class="wg-m-foot">
            <button type="button" class="wg-offer" hidden>${gbi("offerSpot")}</button>
            <p class="wg-explore">${gbi("explore")}</p>
          </div>
        </aside>
        <section class="wg-mwork">
          <div class="wg-mtop">
            ${run ? `<div class="wg-dots" aria-hidden="true">${Array.from({ length: run.target }, (_, k) => `<i class="${k < n - 1 ? "done" : k === n - 1 ? "now" : ""}"></i>`).join("")}</div>` : ""}
            <a class="wg-finish-in" href="${run ? "#/end" : "#/garden"}">${gbi(run ? "finish" : "myGarden")}</a>
            <button type="button" class="btn wg-check" hidden>${gbi("check")}</button>
            <button type="button" class="wg-helpbtn"><span aria-hidden="true">💡</span><span class="wg-help-t"></span><span class="wg-ladder" aria-hidden="true" hidden><i></i><i></i><i></i></span></button>
            <div class="wg-ask-slot"></div>
            <div id="helperBannerSlot"></div>
          </div>
          <div class="wg-whost"></div>
        </section>
      </main>`;

    const col = root.querySelector(".wg-mcol");
    const host = root.querySelector(".wg-whost");
    const helpBtn = root.querySelector(".wg-helpbtn");
    const checkBtn = root.querySelector(".wg-check");
    const offerBtn = col.querySelector(".wg-offer");
    const pill = col.querySelector(".wg-m-pill");
    const stepBody = col.querySelector(".wg-m-body");
    const stepEls = [...col.querySelectorAll(".wg-mstep")];
    const thumb = col.querySelector(".wg-thumb");
    root.querySelector(".wg-pick-btn").addEventListener("click", () => openPicker());
    const stopThumb = thumb ? drawThumb(thumb, mission.targetDoc) : () => {};
    const stopAsk = mountAsk(root.querySelector(".wg-ask-slot"), {
      learner,
      inline: true,
      context: () => ({ session: sessionId, skill: mission.skill, item: mission.id, kind: "mission" }),
    });
    const stopAlert = mountHelperAlert({
      slot: root.querySelector("#helperBannerSlot") || root.querySelector("main"),
      learner,
      session: sessionId,
      variant: "banner",
    });

    let help = 0; // highest Help level used
    let lastLevel = 0; // the level the Help button last showed
    let wrongs = 0; // unhelpful tries (document moved away from the goal)
    let sinceHelp = 0;
    let current = 0;
    let complete = false;
    let alive = true;
    const helpByStep = steps.map(() => 0);
    const offs = [];
    let word = null;
    let mock = null;
    let hints = null;

    const initialDoc = typeof mission.startDoc === "function" ? mission.startDoc(learner) : (mission.startDoc ?? "");
    const docNow = () => (word ? word.getDoc() : createDoc(initialDoc));
    const goalMet = () => safeBool(() => mission.goal.check(docNow(), ctx));
    const reminderNow = () => mission.completionReminder?.(docNow()) ?? punctuationReminder(docNow(), mission.targetDoc);
    checkBtn.addEventListener("click", () => goalMet() && finish());

    /* ----- choose another mission ----- */
    function openPicker() {
      if (root.querySelector(".wg-picker-back")) return;
      const taught = play.taught?.length ? play.taught : play.topics;
      const doneIds = new Set(attempts.filter((a) => a.kind === "mission").map((a) => a.item));
      const groups = TOPICS.filter((tp) => taught.includes(tp.n))
        .map((tp) => ({ tp, list: missions.filter((m) => skillById(m.skill)?.topic === tp.n) }))
        .filter((g) => g.list.length);
      const back = document.createElement("div");
      back.className = "wg-picker-back";
      back.innerHTML = `<div class="card wg-picker" role="dialog" aria-modal="true" aria-label="${esc(glabel("pickMissionTitle"))}">
        <h2>${gbi("pickMissionTitle")}</h2>
        ${groups.map((g) => `<div class="wg-picker-t">${gbi("dishTopic", { n: g.tp.n })} · ${biPair(pair(g.tp.title))}</div>${g.list
          .map((m) => `<button type="button" class="wg-picker-item" data-id="${esc(m.id)}"><span class="tick" aria-hidden="true">${doneIds.has(m.id) ? "✅" : "🧩"}</span><span>${biPair(pair(m.title))}</span></button>`)
          .join("")}`).join("")}
        <button type="button" class="btn btn-ghost wg-picker-x">${gbi("close")}</button></div>`;
      const close = () => {
        back.remove();
        document.removeEventListener("keydown", onKey, true);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      };
      back.addEventListener("mousedown", (e) => e.target === back && close());
      back.querySelector(".wg-picker-x").addEventListener("click", close);
      back.addEventListener("click", (e) => {
        const b = e.target.closest(".wg-picker-item");
        if (!b) return;
        close();
        if (b.dataset.id !== mission.id) location.hash = `#/mission/${encodeURIComponent(b.dataset.id)}`;
      });
      document.addEventListener("keydown", onKey, true);
      root.append(back);
      back.querySelector(".wg-picker-item")?.focus();
    }

    /* ----- hint ladder ----- */
    // Show me plays only the step the learner is on, never the whole rest of the mission.
    const stepDemo = (i) => (Array.isArray(steps[i]?.demo) ? steps[i].demo : []);
    const maxLevel = () => {
      if (word) return stepDemo(current).length ? 3 : 2;
      if (typeof mock?.demo === "function") return 3;
      return typeof mock?.spotlight === "function" ? 2 : 1;
    };
    const stepHint = () => pair(steps[current]?.hint ?? mission.hint ?? steps[current]?.text ?? mission.title);

    function rebuildHints() {
      hints?.destroy();
      hints = null;
      if (!word) return;
      const step = steps[current] ?? {};
      try {
        hints = createHints(word, { hint1: stepHint(), spotlight: step.spotlight ?? mission.spotlight, demo: stepDemo(current) });
      } catch (err) {
        console.error("hints could not be set up", err);
      }
    }

    function syncHelpBtn() {
      const max = maxLevel();
      const label = lastLevel >= max && max === 3 ? HELP_LABELS[3] : HELP_LABELS[Math.min(lastLevel, max - 1)];
      helpBtn.querySelector(".wg-help-t").innerHTML = gbi(label);
      helpBtn.setAttribute("aria-label", glabel(label));
      helpBtn.querySelectorAll(".wg-ladder i").forEach((d, k) => {
        d.hidden = k >= max;
        d.classList.toggle("f", k < lastLevel);
      });
      helpBtn.querySelector(".wg-ladder").hidden = lastLevel === 0;
    }

    function useHelp(level) {
      if (complete) return;
      help = Math.max(help, level);
      helpByStep[current] = Math.max(helpByStep[current] ?? 0, level);
      lastLevel = Math.max(lastLevel, level);
      sinceHelp = 0;
      setHelpGlow(helpBtn, false);
      offerBtn.hidden = true;
      if (word) {
        hints?.show(level)?.catch?.((err) => console.error("help could not be shown", err));
      } else if (mock) {
        if (level >= 3 && typeof mock.demo === "function") mock.demo(steps[current]?.demo);
        else if (level >= 2 && typeof mock.spotlight === "function") mock.spotlight(steps[current]?.spotlight);
        else showColumnHint();
      }
      syncHelpBtn();
    }

    function showColumnHint() {
      col.querySelector(".wg-colhint")?.remove();
      const p = document.createElement("p");
      p.className = "wg-colhint";
      p.setAttribute("role", "status");
      p.innerHTML = `💡 ${biPair(stepHint())}`;
      offerBtn.before(p);
    }

    // A double-click or a held key presses a Help button once: it must not jump two levels.
    const helpTap = tapGuard(700);
    const onceKey = (e) => e.repeat && e.preventDefault();
    for (const btn of [helpBtn, offerBtn]) btn?.addEventListener("keydown", onceKey);
    helpBtn.addEventListener("click", () => {
      if (!helpTap()) return;
      const max = maxLevel();
      useHelp(Math.min(max, lastLevel + 1));
    });
    offerBtn.addEventListener("click", () => helpTap() && useHelp(2));

    /* ----- steps tick themselves ----- */
    function updateSteps() {
      if (!steps.length) return;
      const doc = docNow();
      const nowDone = steps.map((s) => typeof s.done === "function" && safeBool(() => s.done(doc, ctx)));
      // Keep observed actions (such as a selection) after they stop holding. An independent
      // later step must never tick earlier work the learner has not done.
      const done = nowDone.map((value, i) => (completedSteps[i] ||= value));
      const firstPending = done.indexOf(false);
      const next = complete || firstPending < 0 ? steps.length : firstPending;
      stepEls.forEach((el, i) => {
        const d = complete || done[i];
        el.classList.toggle("done", d);
        el.classList.toggle("now", !d && i === next);
        el.setAttribute("aria-label", labelPair(gt(d ? "stepDoneAria" : "stepAria", { n: i + 1 })) + ": " + labelPair(pair(steps[i].text)));
      });
      if (pill) {
        const shown = Math.min(complete ? steps.length : next + 1, steps.length);
        pill.innerHTML = biPair(gt("stepProgress", { n: shown, total: steps.length }));
      }
      if (!complete && next !== current && next < steps.length) {
        current = next;
        if (current > 0) stepEls[current]?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
        hints?.hide();
        lastLevel = 0;
        rebuildHints();
        syncHelpBtn();
      }
    }

    /* ----- completion ----- */
    function evaluate() {
      if (complete || !alive) return;
      // A picture click selects it without a browser selectionchange; refresh before the steps check it.
      if (word) ctx.selection = word.selection;
      const met = goalMet();
      const reminder = met ? reminderNow() : null;
      checkBtn.hidden = !reminder;
      if (met && !reminder) finish();
      updateSteps();
    }

    async function finish() {
      if (complete) return;
      complete = true;
      hints?.destroy();
      hints = null;
      setHelpGlow(helpBtn, false);
      offerBtn.hidden = true;
      updateSteps();
      thumb?.classList.add("is-met");
      helpBtn.disabled = true;
      checkBtn.disabled = true;

      const tries = wrongs + 1; // 1-based like revision: a clean run is 1 try
      const stars = starsFor({ kind: "mission", help_level: help, tries });
      const at = new Date();
      // Capstone missions may give steps their own skill: each skill gets the stars of the Help used on its steps.
      const skills = new Map([[mission.skill, help]]);
      steps.forEach((s, i) => {
        if (typeof s.skill === "string" && s.skill && s.skill !== mission.skill) skills.set(s.skill, Math.max(skills.get(s.skill) ?? 0, helpByStep[i]));
      });
      const saves = [];
      for (const [skill, lvl] of skills) {
        const st = skill === mission.skill ? stars : starsFor({ kind: "mission", help_level: lvl, tries });
        attempts.push({ skill, item: mission.id, kind: "mission", stars: st, help_level: lvl, tries, created: at.toISOString() });
        saves.push(
          recordAttempt({ learner: learner.id, session: sessionId, skill, item: mission.id, kind: "mission", stars: st, help_level: lvl, tries }).catch((err) => {
            console.error("mission attempt could not be saved", err);
            return { refused: true };
          }),
        );
      }
      const after = skillState(attempts, mission.skill, at);
      const result = { stars, skill: mission.skill, before, after, help_level: help, tries, reminder: reminderNow() };

      let nextKey = "toGarden";
      let onNext = () => (location.hash = "#/garden");
      if (run) {
        const fresh = getRun();
        const r = fresh?.kind === "missions" && fresh.started === run.started ? fresh : run;
        if (!r.done.includes(mission.id)) r.done.push(mission.id);
        r.results = [...(r.results ?? []), { skill: mission.skill, item: mission.id, kind: "mission", stars, before: before.stage, after: after.stage, wasWilted: before.wilted }];
        r.lastResult = result;
        r.current = null;
        setRun(r);
        const more =
          r.done.length < r.target &&
          pickNextMission({ missions: missions.filter((m) => !r.done.includes(m.id)), attempts, topics: play.topics, today: at }) !== null;
        nextKey = more ? "next" : "toEnd";
        onNext = () => (more ? start("next") : (location.hash = "#/end"));
      }
      // Keep the completed document in place, make inputs inert while celebrating
      col.setAttribute("inert", "");
      host.setAttribute("inert", "");
      host.style.pointerEvents = "none";

      await new Promise((res) => setTimeout(res, reducedMotion() ? 150 : 1000));
      if (!alive) return;
      // Say so calmly if the stars were not sent (given a moment to finish; a slow save never holds the learner back).
      const outcomes = await Promise.race([Promise.all(saves), new Promise((res) => setTimeout(() => res([]), 1200))]);
      if (!alive) return;
      const noteKey = outcomes.some((o) => o?.refused) ? "saveRefused" : outcomes.some((o) => o?.queued) ? "saveFailed" : null;

      // Stop the in-mission banner helper alert so the result page hero alert can take over
      stopAlert?.();

      const overlay = document.createElement("div");
      overlay.className = "wg-win-overlay-host";
      root.appendChild(overlay);

      let nextDone = false;
      const handleNext = () => {
        if (nextDone) return;
        nextDone = true;
        stopSuccess?.();
        overlay.remove();
        cleanupMission();
        onNext?.();
      };

      const stopSuccess = renderSuccess(
        overlay,
        { ...result, nextKey, onNext: handleNext, note: noteKey ? gt(noteKey) : null },
        { learner, sessionId, asOverlay: true },
      );

      active = () => {
        stopSuccess?.();
        overlay.remove();
        cleanupMission();
      };
    }

    /* ----- work area: Word or a mini mock ----- */
    if (usesWord) {
      word = mountWord(host, {
        doc: initialDoc,
        tabs: Array.isArray(mission.tabs) ? mission.tabs : ["home"],
        title: mission.title_bar || "Document1",
        initials: initialsOf(learner.name),
        goal: {
          check: (d) => safeBool(() => mission.goal.check(d, ctx)),
          progress: (d) => (typeof mission.goal.progress === "function" ? safeNum(() => mission.goal.progress(d, ctx)) : 0),
          // A command the current step does not use counts as a wrong try. Steps without a demo can't say, so allow all.
          stepAllowsCommand: (id) => {
            const targets = stepDemo(current).map((d) => String(d?.target ?? "").split(":")[0]).filter(Boolean);
            if (!targets.length) return true;
            const key = String(id).split(".").slice(0, 3).join(".");
            return targets.some((t) => t.split(".").slice(0, 3).join(".") === key);
          },
        },
      });
      offs.push(word.on("command", (event) => {
        if (!event.menu && !getInternals(word).demoRunning) {
          ctx.commands.push(event.id);
          // Copy changes the command history without changing the document or selection.
          // Check after the command has run so its step can tick immediately.
          queueMicrotask(evaluate);
        }
      }));
      offs.push(word.on("change", evaluate));
      offs.push(word.on("goal", evaluate));
      offs.push(
        word.on("wrong", () => {
          if (complete) return;
          wrongs += 1;
          sinceHelp += 1;
          // A learner who needs the most support is offered a pointer after one wrong try, not two.
          const spot = steps[current]?.spotlight ?? mission.spotlight;
          if (sinceHelp >= 2) setHelpGlow(helpBtn, true);
          if (sinceHelp >= (support === 0 ? 1 : 2) && support === 0 && spot && lastLevel < 2) offerBtn.hidden = false;
        }),
      );
      const onSaved = (p) => {
        ctx.saved = p && typeof p === "object" ? { folder: Array.isArray(p.folder) ? p.folder.map(String) : [], name: String(p.name ?? "") } : null;
        evaluate();
      };
      offs.push(word.on("saved", onSaved));
      const onSavedDom = (e) => onSaved(e.detail);
      host.addEventListener("wg-saved", onSavedDom);
      offs.push(() => host.removeEventListener("wg-saved", onSavedDom));
      // Steps such as "Select the words" depend on the selection, which isn't part of the document.
      let raf = 0;
      const onSel = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          // Show me opens the Backstage itself; its stages must not tick steps (that would cut the demo short).
          if (!alive || !word || getInternals(word).demoRunning) return;
          ctx.selection = word.selection;
          updateSteps();
        });
      };
      document.addEventListener("selectionchange", onSel);
      offs.push(() => {
        cancelAnimationFrame(raf);
        document.removeEventListener("selectionchange", onSel);
      });
      rebuildHints();
    } else {
      loadMock(mission.mock).then((mod) => {
        if (!alive) return;
        if (!mod) {
          host.innerHTML = `<div class="card wg-mock-missing"><div class="soon-ico" aria-hidden="true">🗂️</div>
            <h2>${gbi("mockMissingTitle")}</h2><p class="lead">${gbi("mockMissingBody")}</p>
            <button type="button" class="btn btn-primary">${gbi(run ? "missionLater" : "myGarden")}</button></div>`;
          host.querySelector("button").addEventListener("click", () => {
            if (run) {
              const r = getRun() ?? run;
              if (!r.done.includes(mission.id)) r.done.push(mission.id); // skipped, no attempt written
              r.current = null;
              setRun(r);
              if (r.done.length < r.target) start("next");
              else location.hash = "#/end";
            } else location.hash = "#/garden";
          });
          return;
        }
        try {
          mock = mod.mount(host, {
            mission,
            learner,
            onOpen: (name) => {
              ctx.opened = String(name ?? "");
              evaluate();
            },
            onRegion: () => {},
            onWrong: () => {
              wrongs += 1;
              sinceHelp += 1;
              if (sinceHelp >= 2) setHelpGlow(helpBtn, true);
            },
          });
        } catch (err) {
          console.error(`mock ${mission.mock} failed`, err);
        }
        syncHelpBtn();
      });
    }

    syncHelpBtn();
    updateSteps();

    function cleanupMission() {
      if (!alive) return;
      alive = false;
      offs.forEach((off) => off());
      hints?.destroy();
      word?.destroy();
      mock?.destroy?.();
      stopThumb();
      stopAlert?.();
      stopAsk();
    }
    return cleanupMission;
  }

  start(id === "next" ? "next" : id);

  return () => {
    closed = true;
    active?.();
    active = null;
  };
}
