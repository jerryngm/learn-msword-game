// Trainer page: log in, then switch between the dashboard and session setup (#/setup).
// English only: this page doesn't load the learners' Vietnamese toggle.
import { pb } from "../live.js";
import { createStore } from "./store.js";
import { errText, esc } from "./util.js";
import { mountVersionBadge } from "../version-badge.js";

const app = document.getElementById("app");
mountVersionBadge();
let store = null;
let cleanup = null;

function isTrainer() {
  return pb.authStore.isValid && pb.authStore.record?.collectionName === "trainers";
}

function renderLogin(message = "") {
  cleanup?.();
  cleanup = null;
  store?.stop();
  store = null;
  app.innerHTML = `
    <main class="t-login">
      <form class="t-card t-login-card" id="login" novalidate>
        <h1>🌱 Word Garden</h1>
        <p class="t-muted">Trainer login</p>
        <label for="email">Email</label>
        <input id="email" type="email" autocomplete="username" required>
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" required>
        <p class="t-msg" id="msg" role="alert" data-kind="error">${esc(message)}</p>
        <button class="t-btn t-btn-pri" type="submit">Log in</button>
      </form>
    </main>`;
  const form = app.querySelector("#login");
  const msg = app.querySelector("#msg");
  form.email.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) {
      msg.textContent = "Type your email and password.";
      return;
    }
    const btn = form.querySelector("button");
    btn.disabled = true;
    msg.textContent = "";
    try {
      await pb.collection("trainers").authWithPassword(email, password, { requestKey: null });
      route();
    } catch (err) {
      msg.textContent = err?.status === 400 ? "That email or password is not right." : errText(err);
      btn.disabled = false;
    }
  });
}

async function route() {
  if (!isTrainer()) {
    renderLogin();
    return;
  }
  store ??= createStore();
  cleanup?.();
  cleanup = null;
  const view = location.hash === "#/setup" ? await import("./start-session.js") : await import("./dashboard.js");
  if (!isTrainer()) return renderLogin();
  // A fresh element per view, so a view's listeners go away with it.
  const host = document.createElement("div");
  host.className = "t-view";
  app.replaceChildren(host);
  cleanup = view.render(host, { store, logout });
}

function logout() {
  pb.authStore.clear();
  location.hash = "";
  renderLogin();
}

// A token that expired or was revoked sends the trainer back to the login form.
pb.authStore.onChange(() => {
  if (!isTrainer() && store) renderLogin("Please log in again.");
});

window.addEventListener("hashchange", route);

if (isTrainer()) {
  // Check the saved token is still good before showing anything.
  pb.collection("trainers")
    .authRefresh({ requestKey: null })
    .then(route)
    .catch((err) => (err?.status === 0 ? route() : (pb.authStore.clear(), renderLogin())));
} else {
  renderLogin();
}
