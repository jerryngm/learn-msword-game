// Hash router. A screen module exports render(rootEl, params) and may return a cleanup function.
import { currentLearner, saveHideVi } from "./pb.js";
import { VI_CHANGE_EVENT, bi, label, setViHidden, t, viHidden } from "./i18n.js";

// Routes whose screens are not built yet fall back to a calm placeholder.
const ROUTES = [
  { name: "join", pattern: /^#\/join$/, load: () => import("./screens/join.js") },
  { name: "home", pattern: /^#\/home$/, load: () => import("./screens/home.js") },
  { name: "revision", pattern: /^#\/revision$/, load: () => import("./screens/revision.js") },
  { name: "mission", pattern: /^#\/mission\/([^/]+)$/, keys: ["id"], load: () => import("./screens/mission.js") },
  { name: "garden", pattern: /^#\/garden$/, load: () => import("./screens/garden.js") },
  { name: "free", pattern: /^#\/free$/, load: () => import("./screens/free.js") },
  { name: "end", pattern: /^#\/end$/, load: () => import("./screens/end.js") },
];

const app = document.getElementById("app");
let cleanup = null;
let navToken = 0;
let screenHost = null; // the element the current screen renders into

function match(hash) {
  for (const route of ROUTES) {
    const m = route.pattern.exec(hash);
    if (m) {
      const params = {};
      (route.keys ?? []).forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route, params };
    }
  }
  return null;
}

function runCleanup() {
  if (typeof cleanup === "function") {
    try {
      cleanup();
    } catch (err) {
      console.error("screen cleanup failed", err);
    }
  }
  cleanup = null;
}

function renderComingSoon(root) {
  root.innerHTML = `
    <main class="screen center-screen">
      <div class="card soon">
        <div class="soon-ico" aria-hidden="true">🌱</div>
        <h1>${bi("soonTitle")}</h1>
        <p class="lead">${bi("soonBody")}</p>
        <a class="btn btn-primary" href="#/home">${bi("backHome")}</a>
      </div>
    </main>`;
}

function renderError(root, retry) {
  root.innerHTML = `
    <main class="screen center-screen">
      <div class="card soon">
        <div class="soon-ico" aria-hidden="true">📡</div>
        <h1>${bi("offline")}</h1>
        <p class="lead">${bi("offlineHint")}</p>
        <button class="btn btn-primary" type="button" id="retry">${bi("retry")}</button>
      </div>
    </main>`;
  root.querySelector("#retry").addEventListener("click", retry);
}

async function navigate() {
  const token = ++navToken;
  runCleanup();
  // A screen that is still loading keeps writing into its own element; once that is detached its late paint is harmless.
  screenHost?.remove();
  screenHost = null;

  let hash = location.hash;
  if (!hash || hash === "#" || hash === "#/") hash = "#/home";
  const found = match(hash);
  if (!found) {
    location.replace("#/home");
    return;
  }

  let learner = null;
  try {
    learner = await currentLearner();
  } catch (err) {
    console.error("could not load learner", err);
    if (token === navToken) renderError(app, navigate);
    return;
  }
  if (token !== navToken) return; // a newer navigation took over

  if (!learner && found.route.name !== "join") {
    location.replace("#/join");
    return;
  }

  app.replaceChildren();
  document.title = `${t("brand").en}`;
  const { route, params } = found;
  if (!route.load) {
    renderComingSoon(app);
    return;
  }
  const host = document.createElement("div");
  host.style.display = "contents"; // layout-neutral: the screen's own <main> lays out as if it were a child of #app
  app.append(host);
  screenHost = host;
  try {
    const mod = await route.load();
    if (token !== navToken) return;
    const done = (await mod.render(host, { ...params, learner })) ?? null;
    if (token === navToken) cleanup = done;
    else if (typeof done === "function") {
      // The learner moved on while this screen was loading: stop it without touching the new screen's cleanup.
      try {
        done();
      } catch (err) {
        console.error("screen cleanup failed", err);
      }
    }
  } catch (err) {
    console.error(`screen ${route.name} failed`, err);
    if (token === navToken) renderError(app, navigate);
  }
}

/* Vietnamese on/off switch: lives in the shell so every learner screen has it. */
function mountLanguageSwitch() {
  const slot = document.getElementById("lang");
  slot.innerHTML = `<button class="lang-switch" type="button" role="switch" id="langSwitch">
      <span class="lang-name" lang="vi">Tiếng Việt</span>
      <span class="lang-track" aria-hidden="true"><span class="lang-knob"></span></span>
      <span class="lang-state"></span>
    </button>`;
  const btn = slot.querySelector("#langSwitch");
  const sync = () => {
    const on = !viHidden();
    btn.setAttribute("aria-checked", String(on));
    btn.setAttribute("aria-label", `Tiếng Việt: ${label(on ? "viSwitchOn" : "viSwitchOff")}`);
    btn.querySelector(".lang-state").textContent = t(on ? "viSwitchOn" : "viSwitchOff").en;
  };
  window.addEventListener(VI_CHANGE_EVENT, sync);
  btn.addEventListener("click", async () => {
    const previous = viHidden();
    setViHidden(!previous);
    try {
      await saveHideVi(!previous);
    } catch (err) {
      console.error("could not save language choice", err);
      setViHidden(previous); // show that the change did not stick
    }
  });
  sync();
}

mountLanguageSwitch();
window.addEventListener("hashchange", navigate);
navigate();
