// Hash router. A screen module exports render(rootEl, params) and may return a cleanup function.
import { currentLearner, saveHideVi } from "./pb.js";
import { VI_CHANGE_EVENT, bi, label, setViHidden, t, viHidden } from "./i18n.js";
import { mountVersionBadge } from "./version-badge.js";
import { mountPlantSymbols } from "./plants.js";

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

mountPlantSymbols();
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

/*
 * After an update the browser can still hold old copies of some app files, and a screen then fails to
 * load (an import that the cached file doesn't have). Re-fetch every app file past the cache and reload
 * once. If no file can be fetched the class computer really is unreachable: return false so the
 * caller shows the offline screen. A second failure soon after a reload also returns false (no loop).
 */
const UPDATE_RELOAD_KEY = "update_reload_at";

async function reloadForUpdate() {
  try {
    const last = Number(sessionStorage.getItem(UPDATE_RELOAD_KEY)) || 0;
    if (Date.now() - last < 60_000) return false;
  } catch {
    return false; // storage blocked: no way to tell a first try from a loop
  }
  const urls = new Set(
    performance
      .getEntriesByType("resource")
      .map((r) => r.name.split("#")[0])
      .filter((u) => u.startsWith(location.origin) && !u.includes("/api/")),
  );
  urls.add(location.href.split("#")[0]);
  // Any answer, even a 404 for a file the update removed, proves the server is reachable; only no answer at all means offline.
  const results = await Promise.allSettled([...urls].map((u) => fetch(u, { cache: "reload" })));
  if (!results.some((r) => r.status === "fulfilled")) {
    console.error("could not refresh app files", results[0]?.reason);
    return false;
  }
  sessionStorage.setItem(UPDATE_RELOAD_KEY, String(Date.now()));
  location.reload();
  return true;
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
  document.body.dataset.route = route.name; // lets CSS hide the version badge over the Word mock
  if (!route.load) {
    renderComingSoon(app);
    return;
  }
  const host = document.createElement("div");
  host.style.display = "contents"; // layout-neutral: the screen's own <main> lays out as if it were a child of #app
  app.append(host);
  screenHost = host;
  let mod;
  try {
    mod = await route.load();
  } catch (err) {
    console.error(`screen ${route.name} failed to load`, err);
    if (token === navToken && !(await reloadForUpdate()) && token === navToken) renderError(app, navigate);
    return;
  }
  if (token !== navToken) return;
  try {
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
    // Show both languages while Vietnamese is on, so the switch itself is understood by a Vietnamese reader.
    const state = t(on ? "viSwitchOn" : "viSwitchOff");
    btn.querySelector(".lang-state").innerHTML = on ? `${state.en}<span class="vi">· ${state.vi}</span>` : state.en;
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
mountVersionBadge();
window.addEventListener("hashchange", navigate);
navigate();
