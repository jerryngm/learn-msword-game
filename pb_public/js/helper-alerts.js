// Real-time peer helper alerts: notifies qualified classmates when a peer asks for help.
// Appears on Home, Garden, Success (as a prominent hero card), and Mission/Revision (as a top slide-down banner).

import { avatarEmoji, biPair, esc } from "./i18n.js";
import { acceptAsk, learnerAttempts, learnersByIds, loadAllContent, watchOpenClassmateAsks } from "./game-data.js";
import { skillById } from "./content/skills.js";
import { skillState } from "./rules.js";
import { gbi, glabel, gt } from "./strings-game.js";

const DECLINE_PREFIX = "declined_ask_";

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

/**
 * Mounts real-time helper alerts in the given container or slot.
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
    clearModal();
    if (slot) slot.innerHTML = "";
  };

  const onDecline = (askId) => {
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(DECLINE_PREFIX + askId, "1");
    } catch {
      /* ignore */
    }
    clearAlert();
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
        if (!closed) clearAlert();
      }, 4000);
    } catch (err) {
      console.error("could not accept ask", err);
      clearAlert();
    }
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

  const handleOpenAsks = async (asks) => {
    if (closed) return;

    // Find the first open ask where this learner is qualified to assist
    let target = null;
    for (const a of asks) {
      if (await canLearnerHelp(learner.id, a)) {
        target = a;
        break;
      }
    }

    if (!target) {
      clearAlert();
      return;
    }

    if (activeAsk?.id === target.id) return; // already showing this ask
    activeAsk = target;

    try {
      const [asker] = await learnersByIds([target.learner]);
      const overview = await resolveTaskOverview(target);
      if (closed || !activeAsk) return;

      if (variant === "banner") {
        renderBanner(target, asker, overview);
      } else {
        renderHero(target, asker, overview);
      }
    } catch (err) {
      console.error("could not render helper alert", err);
    }
  };

  const stopWatch = watchOpenClassmateAsks(sessionId ?? null, (asks, err) => {
    if (err) {
      console.error("could not watch open asks for helpers", err);
      return;
    }
    handleOpenAsks(asks);
  });

  return () => {
    closed = true;
    stopWatch();
    clearAlert();
  };
}
