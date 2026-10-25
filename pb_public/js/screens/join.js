// Join screen: name + picture for a new learner, or "Continue as" on a return visit.
import { pb, setCurrentLearner, forgetLearner } from "../pb.js";
import { AVATARS, avatarEmoji, bi, esc, label, labelPair, t, viHidden } from "../i18n.js";

const NAME_MAX = 20;
// Ring colours that tell apart learners who share a first name.
const COLOURS = ["#2F7370", "#F29B38", "#5E9E4F", "#C4553B", "#6A5ACD", "#D6609A", "#2B79B8", "#8A6D3B"];

/** First palette colour not already used by a learner with the same name. */
async function pickColour(name) {
  const wanted = name.trim().toLowerCase();
  const found = await pb.collection("learners").getFullList({
    filter: pb.filter("name ~ {:n}", { n: name.trim() }),
    fields: "name,colour",
    requestKey: null,
  });
  const same = found.filter((l) => l.name.trim().toLowerCase() === wanted);
  const used = new Set(same.map((l) => l.colour));
  return COLOURS.find((c) => !used.has(c)) ?? COLOURS[same.length % COLOURS.length];
}

function header() {
  return `<header class="lhead"><span class="brand">🌱 ${esc(t("brand").en)}</span></header>`;
}

function renderReturning(root, learner, onNotYou) {
  root.innerHTML = `
    <main class="screen">
      ${header()}
      <div class="join-solo card returning">
        <h2>${bi("welcomeBack")}</h2>
        <div class="face face-lg" style="--ring:${esc(learner.colour || COLOURS[0])}" aria-hidden="true">${avatarEmoji(learner.avatar)}</div>
        <a class="btn btn-primary" href="#/home">${bi("continueAs", { name: learner.name })}</a>
        <button class="btn btn-ghost" type="button" id="notYou">${bi("notYou")}</button>
      </div>
    </main>`;
  root.querySelector("#notYou").addEventListener("click", onNotYou);
}

function renderForm(root) {
  const tiles = AVATARS.map(
    (a, i) =>
      `<button class="av" type="button" data-key="${a.key}" aria-pressed="${i === 0}" aria-label="${esc(labelPair(a))}">${a.emoji}</button>`,
  ).join("");

  root.innerHTML = `
    <main class="screen">
      ${header()}
      <form class="join" id="joinForm" novalidate>
        <section class="card join-name">
          <h1>${bi("joinTitle")}</h1>
          <div class="field">
            <input id="nameIn" type="text" maxlength="${NAME_MAX}" autocomplete="off" autocapitalize="words"
              placeholder="${esc(t("joinPlaceholder").en)}" aria-label="${esc(label("joinTitle"))}">
          </div>
          <div class="join-foot">
            <button class="btn btn-primary" type="submit" id="startBtn" disabled>${bi("joinStart")}</button>
            <div class="me-preview"><span class="face" id="mePrev" aria-hidden="true"></span><span id="meName"></span></div>
          </div>
          <p class="form-error" id="joinErr" role="alert" hidden>${bi("joinFail")}</p>
        </section>
        <section class="card join-pick">
          <div class="label">${bi("joinPick")}</div>
          <div class="avatars" id="avatars" role="group" aria-label="${esc(label("joinPick"))}">${tiles}</div>
        </section>
      </form>
    </main>`;

  const form = root.querySelector("#joinForm");
  const input = root.querySelector("#nameIn");
  const startBtn = root.querySelector("#startBtn");
  const grid = root.querySelector("#avatars");
  const prevFace = root.querySelector("#mePrev");
  const prevName = root.querySelector("#meName");
  const errBox = root.querySelector("#joinErr");
  let avatarKey = AVATARS[0].key;
  let saving = false;

  const sync = () => {
    const name = input.value.trim();
    prevName.textContent = name;
    prevFace.textContent = avatarEmoji(avatarKey);
    startBtn.disabled = saving || name.length === 0;
  };

  grid.addEventListener("click", (e) => {
    const tile = e.target.closest(".av");
    if (!tile) return;
    avatarKey = tile.dataset.key;
    grid.querySelectorAll(".av").forEach((b) => b.setAttribute("aria-pressed", String(b === tile)));
    sync();
  });
  input.addEventListener("input", sync);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = input.value.trim().slice(0, NAME_MAX);
    if (!name || saving) return;
    saving = true;
    errBox.hidden = true;
    startBtn.innerHTML = bi("joinSaving");
    sync();
    try {
      const colour = await pickColour(name);
      const learner = await pb.collection("learners").create(
        { name, avatar: avatarKey, colour, helper_badges: 0, active: true, hide_vi: viHidden() },
        { requestKey: null },
      );
      setCurrentLearner(learner.id);
      location.hash = "#/home";
    } catch (err) {
      console.error("join failed", err);
      saving = false;
      startBtn.innerHTML = bi("joinStart");
      errBox.hidden = false;
      sync();
    }
  });

  sync();
  input.focus();
}

export function render(root, { learner }) {
  const showForm = () => renderForm(root);
  if (learner) {
    renderReturning(root, learner, () => {
      forgetLearner();
      showForm();
    });
  } else {
    showForm();
  }
}
