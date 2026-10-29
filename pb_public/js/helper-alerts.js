// Real-time alerts: notifies learners of peer helper asks and teacher recognitions / badges.
// Appears on Home, Garden, Success (as a prominent hero card), and Mission/Revision (as a bottom banner).

import { avatarEmoji, biPair, esc } from "./i18n.js";
import {
  acceptAsk,
  learnerAttempts,
  learnerEncouragements,
  learnersByIds,
  loadAllContent,
  watchOpenClassmateAsks,
} from "./game-data.js";
import { skillById } from "./content/skills.js";
import { skillState } from "./rules.js";
import { gbi, glabel, gt, STAR_PRESETS } from "./strings-game.js";

const DECLINE_PREFIX = "declined_ask_";
const ACK_ENC_PREFIX = "wg_ack_enc_";

/** Resolves human-friendly task details (topic, type, title, goal) for an ask. */
export async function resolveTaskOverview(ask) {
  const skill = skillById(ask.skill);
  const topic = skill?.topic ?? 1;
  const goal = skill?.ican ?? { en: ask.skill, vi: ask.skill };
  let title = goal;
  let typeKey = ask.kind === "mission" ? "taskMission" : "taskRevision";

  if (ask.kind === "mission") {
    try {
      const { missions } = await loadAllContent();
      const match = missions.find((m) => (ask.item && m.id === ask.item) || m.skill === ask.skill);
      if (match?.title) title = match.title;
    } catch (err) {
      console.error("could not load mission content for task overview", err);
    }
  }

  return { topic, typeKey, title, goal };
}

/** Determines if a learner is qualified and eligible to assist with an open ask. */
export async function canLearnerHelp(learnerId, ask) {
  if (!ask || ask.status !== "open" || ask.learner === learnerId) return false;
  if (ask.helper_status === "accepted") return false;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(DECLINE_PREFIX + ask.id) === "1") return false;

  try {
    const attempts = await learnerAttempts(learnerId);
    const mine = attempts.filter((a) => a.skill === ask.skill);
    const state = skillState(mine, ask.skill, new Date());
    const maxStars = Math.max(...mine.map((a) => Number(a.stars) || 0), 0);
    return state.stage === "flowering" || state.stage === "bud" || maxStars >= 2;
  } catch (err) {
    console.error("could not verify helper eligibility", err);
    return false;
  }
}

/** Checks if a teacher encouragement has already been acknowledged on this device. */
export function isEncouragementAcknowledged(id) {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(ACK_ENC_PREFIX + id) === "1";
    }
    return false;
  } catch {
    return false;
  }
}

/** Marks encouragement IDs as acknowledged so they aren't repeatedly shown. */
export function acknowledgeEncouragements(ids) {
  try {
    if (typeof localStorage !== "undefined") {
      for (const id of ids) {
        localStorage.setItem(ACK_ENC_PREFIX + id, "1");
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Groups recent unacknowledged teacher recognitions (stars, helper badges, praise messages).
 * Returns null if there are no new recognitions to show.
 */
export function groupTeacherRecognitions(list) {
  const unack = (list || []).filter((item) => {
    if (!item || !item.id) return false;
    if (isEncouragementAcknowledged(item.id)) return false;
    const created = new Date(item.created).getTime();
    // Only surface recognitions from the last 24 hours
    return Number.isFinite(created) ? Date.now() - created < 24 * 60 * 60 * 1000 : true;
  });
  if (!unack.length) return null;

  const first = unack[0];
  const firstTime = new Date(first.created).getTime();
  // Group recognitions created within 10 seconds of each other (e.g. Star + Helper Badge sent together)
  const group = unack.filter((item) => Math.abs(new Date(item.created).getTime() - firstTime) <= 10000);

  const hasStar = group.some((g) => g.kind === "star");
  const hasHelper = group.some((g) => g.kind === "helper");
  const starItem = group.find((g) => g.kind === "star");
  const message = starItem?.message?.trim() || group.find((g) => g.message?.trim())?.message?.trim() || "";

  const ids = group.map((g) => g.id);

  let titleKey = "teacherPraiseTitle";
  if (hasStar && hasHelper) titleKey = "teacherCombinedTitle";
  else if (hasHelper) titleKey = "teacherBadgeTitle";

  return {
    ids,
    hasStar,
    hasHelper,
    message,
    titleKey,
  };
}

/**
 * Mounts real-time alerts (peer classmate asks and teacher recognitions/badges).
 * @param {Object} options
 * @param {HTMLElement} options.slot Container element to render into
 * @param {Object} options.learner Active learner object
 * @param {Object|string|null} options.session Active session
 * @param {"hero"|"banner"} [options.variant="hero"] Display style: "hero" card or "banner"
 * @returns {Function} Cleanup function
 */
export function mountHelperAlert({ slot, learner, session, variant = "hero" } = {}) {
  if (!slot || !learner?.id) return () => {};

  const sessionId = typeof session === "object" ? session?.id : session;
  let activeAsk = null;
  let activeRecognition = null;
  let lastAsks = [];
  let lastEncouragements = [];
  let acknowledging = false;
  let closed = false;
  let popModal = null;

  const clearModal = () => {
    if (popModal) {
      popModal.remove();
      popModal = null;
    }
  };

  const clearAlert = () => {
    activeAsk = null;
    activeRecognition = null;
    clearModal();
    if (slot) slot.innerHTML = "";
  };

  const onDecline = (askId) => {
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(DECLINE_PREFIX + askId, "1");
    } catch {
      /* ignore */
    }
    activeAsk = null;
    update();
  };

  const onAccept = async (ask) => {
    try {
      await acceptAsk(ask.id, learner.id);
      const [asker] = await learnersByIds([ask.learner]);
      const askerName = asker?.name ?? "Classmate";
      clearModal();

      if (variant === "banner") {
        slot.innerHTML = `
          <aside class="wg-helper-banner wg-helper-accepted" role="status">
            <span class="face" aria-hidden="true">🌱</span>
            <div class="wg-helper-banner-msg">
              <p class="wg-helper-confirmed-msg">${gbi("helperAlertAccepted", { name: esc(askerName) })}</p>
            </div>
          </aside>`;
      } else {
        slot.innerHTML = `
          <div class="wg-helper-hero wg-helper-confirmed">
            <span class="e" aria-hidden="true">🌱</span>
            <p class="wg-helper-confirmed-msg">${gbi("helperAlertAccepted", { name: esc(askerName) })}</p>
          </div>`;
      }

      setTimeout(() => {
        if (!closed) {
          activeAsk = null;
          update();
        }
      }, 4000);
    } catch (err) {
      console.error("could not accept ask", err);
      clearAlert();
    }
  };

  const onAckTeacher = (rec) => {
    acknowledgeEncouragements(rec.ids);
    acknowledging = true;

    if (variant === "banner") {
      slot.innerHTML = `
        <aside class="wg-teacher-banner" role="status">
          <span class="wg-teacher-badge-ico" aria-hidden="true">🌟</span>
          <div class="wg-teacher-banner-msg">
            <b>${gbi("teacherAckCelebration")}</b>
          </div>
        </aside>`;
    } else {
      slot.innerHTML = `
        <div class="wg-teacher-hero wg-helper-confirmed" role="status">
          <span class="e" aria-hidden="true">🌟</span>
          <p class="wg-helper-confirmed-msg">${gbi("teacherAckCelebration")}</p>
        </div>`;
    }

    setTimeout(() => {
      acknowledging = false;
      if (!closed) {
        activeRecognition = null;
        update();
      }
    }, 2500);
  };

  const renderTeacherHero = (rec) => {
    const { titleKey, message, hasHelper } = rec;
    const bodyHtml = message
      ? (STAR_PRESETS[message] ? biPair(STAR_PRESETS[message]) : esc(message))
      : (hasHelper ? biPair(gt("teacherBadgeSub")) : "");

    const badgePillHtml = hasHelper
      ? `<div class="wg-teacher-badge-pill">
           <span>${gbi("teacherBadgeAwarded")}</span>
         </div>`
      : "";

    slot.innerHTML = `
      <section class="wg-teacher-hero card" role="alert">
        <h2 class="wg-teacher-h">
          <span class="wg-teacher-badge-ico" aria-hidden="true">${hasHelper ? "🤝" : "⭐"}</span>
          <span>${gbi(titleKey)}</span>
        </h2>
        <div class="wg-teacher-body">
          <p class="wg-teacher-msg">${bodyHtml}</p>
          ${badgePillHtml}
        </div>
        <div class="wg-teacher-actions">
          <button type="button" class="btn btn-primary wg-teacher-ack">${gbi("teacherAck")}</button>
        </div>
      </section>`;

    slot.querySelector(".wg-teacher-ack")?.addEventListener("click", () => onAckTeacher(rec));
  };

  const renderTeacherBanner = (rec) => {
    const { titleKey, message, hasHelper } = rec;
    const briefText = message
      ? (STAR_PRESETS[message] ? biPair(STAR_PRESETS[message]) : esc(message))
      : gbi(titleKey);

    slot.innerHTML = `
      <aside class="wg-teacher-banner" role="alert">
        <span class="wg-teacher-badge-ico" aria-hidden="true">${hasHelper ? "🤝" : "⭐"}</span>
        <div class="wg-teacher-banner-msg">
          <b>${briefText}</b>
        </div>
        <button type="button" class="btn-sm wg-teacher-ack wg-teacher-view">${gbi("teacherAck")}</button>
        <button type="button" class="wg-helper-banner-close" aria-label="${esc(glabel("close"))}">✕</button>
      </aside>`;

    slot.querySelector(".wg-teacher-ack")?.addEventListener("click", () => onAckTeacher(rec));
    slot.querySelector(".wg-helper-banner-close")?.addEventListener("click", () => onAckTeacher(rec));
  };

  const renderHero = (ask, asker, overview) => {
    const { topic, typeKey, title, goal } = overview;
    const type = gt(typeKey);

    slot.innerHTML = `
      <section class="wg-helper-hero card" role="alert">
        <h2 class="wg-helper-h">
          <span class="face face-sm" style="--ring:${esc(asker?.colour || "#2F7370")}" aria-hidden="true">${avatarEmoji(asker?.avatar)}</span>
          <span>${gbi("helperAlertAsking", { name: esc(asker?.name ?? "Someone") })}</span>
        </h2>
        <div class="wg-helper-task-box">
          <div class="wg-helper-task-meta">
            <span class="chip">${gbi("helperTopicTask", { topic, type, title })}</span>
          </div>
          <p class="wg-helper-task-goal">${gbi("helperAlertGoal", { ican: goal })}</p>
        </div>
        <p class="wg-helper-prompt">${gbi("helperAlertPrompt", { name: esc(asker?.name ?? "them") })}</p>
        <div class="wg-helper-actions">
          <button type="button" class="btn btn-primary wg-helper-accept">${gbi("helperAlertAccept")}</button>
          <button type="button" class="btn-sm wg-helper-decline">${gbi("helperAlertDecline")}</button>
        </div>
      </section>`;

    slot.querySelector(".wg-helper-accept")?.addEventListener("click", () => onAccept(ask));
    slot.querySelector(".wg-helper-decline")?.addEventListener("click", () => onDecline(ask.id));
  };

  const renderBanner = (ask, asker, overview) => {
    const { title, goal } = overview;
    const task = title || goal;

    slot.innerHTML = `
      <aside class="wg-helper-banner" role="alert">
        <span class="face" style="--ring:${esc(asker?.colour || "#2F7370")}" aria-hidden="true">${avatarEmoji(asker?.avatar)}</span>
        <div class="wg-helper-banner-msg">
          <b>${gbi("helperAlertBanner", { name: esc(asker?.name ?? "Someone"), task })}</b>
        </div>
        <button type="button" class="btn-sm btn-primary wg-helper-view">${gbi("helperAlertView")}</button>
        <button type="button" class="wg-helper-banner-close" aria-label="${esc(glabel("close"))}">✕</button>
      </aside>`;

    slot.querySelector(".wg-helper-banner-close")?.addEventListener("click", () => onDecline(ask.id));
    slot.querySelector(".wg-helper-view")?.addEventListener("click", () => {
      clearModal();
      popModal = document.createElement("div");
      popModal.className = "wg-helper-modal-overlay";
      popModal.innerHTML = `
        <div class="wg-helper-modal-content">
          <button type="button" class="wg-pclose wg-helper-modal-close" aria-label="${esc(glabel("close"))}">✕</button>
          <div id="modalSlot"></div>
        </div>`;
      document.body.appendChild(popModal);

      popModal.querySelector(".wg-helper-modal-close")?.addEventListener("click", clearModal);
      const modalSlot = popModal.querySelector("#modalSlot");
      renderHeroInContainer(modalSlot, ask, asker, overview);
    });
  };

  const renderHeroInContainer = (container, ask, asker, overview) => {
    const { topic, typeKey, title, goal } = overview;
    const type = gt(typeKey);

    container.innerHTML = `
      <section class="wg-helper-hero card" role="alert" style="margin-bottom:0">
        <h2 class="wg-helper-h">
          <span class="face face-sm" style="--ring:${esc(asker?.colour || "#2F7370")}" aria-hidden="true">${avatarEmoji(asker?.avatar)}</span>
          <span>${gbi("helperAlertAsking", { name: esc(asker?.name ?? "Someone") })}</span>
        </h2>
        <div class="wg-helper-task-box">
          <div class="wg-helper-task-meta">
            <span class="chip">${gbi("helperTopicTask", { topic, type, title })}</span>
          </div>
          <p class="wg-helper-task-goal">${gbi("helperAlertGoal", { ican: goal })}</p>
        </div>
        <p class="wg-helper-prompt">${gbi("helperAlertPrompt", { name: esc(asker?.name ?? "them") })}</p>
        <div class="wg-helper-actions">
          <button type="button" class="btn btn-primary wg-helper-accept">${gbi("helperAlertAccept")}</button>
          <button type="button" class="btn-sm wg-helper-decline">${gbi("helperAlertDecline")}</button>
        </div>
      </section>`;

    container.querySelector(".wg-helper-accept")?.addEventListener("click", () => onAccept(ask));
    container.querySelector(".wg-helper-decline")?.addEventListener("click", () => onDecline(ask.id));
  };

  const update = async () => {
    if (closed || acknowledging) return;

    // Priority 1: Unacknowledged teacher recognition (star, helper badge, praise)
    const rec = groupTeacherRecognitions(lastEncouragements);
    if (rec) {
      const recKey = rec.ids.join(",");
      if (activeRecognition?.ids?.join(",") !== recKey) {
        activeRecognition = rec;
        activeAsk = null;
        if (variant === "banner") {
          renderTeacherBanner(rec);
        } else {
          renderTeacherHero(rec);
        }
      }
      return;
    } else if (activeRecognition) {
      activeRecognition = null;
    }

    // Priority 2: Open peer classmate asks where this learner qualifies to help
    let targetAsk = null;
    for (const a of lastAsks) {
      if (await canLearnerHelp(learner.id, a)) {
        targetAsk = a;
        break;
      }
    }

    if (!targetAsk) {
      clearAlert();
      return;
    }

    if (activeAsk?.id === targetAsk.id) return; // already showing this ask
    activeAsk = targetAsk;

    try {
      const [asker] = await learnersByIds([targetAsk.learner]);
      const overview = await resolveTaskOverview(targetAsk);
      if (closed || !activeAsk) return;

      if (variant === "banner") {
        renderBanner(targetAsk, asker, overview);
      } else {
        renderHero(targetAsk, asker, overview);
      }
    } catch (err) {
      console.error("could not render helper alert", err);
    }
  };

  const stopWatchAsks = watchOpenClassmateAsks(sessionId ?? null, (asks, err) => {
    if (err) {
      console.error("could not watch open asks for helpers", err);
      return;
    }
    lastAsks = asks || [];
    update();
  });

  const stopWatchEnc = learnerEncouragements(learner.id, (list, err) => {
    if (err) {
      console.error("could not watch learner encouragements", err);
      return;
    }
    lastEncouragements = list || [];
    update();
  });

  return () => {
    closed = true;
    stopWatchAsks();
    stopWatchEnc();
    clearAlert();
  };
}
