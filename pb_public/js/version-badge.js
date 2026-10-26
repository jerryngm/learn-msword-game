// Small "v0.1.0" label so the trainer can see which build a laptop or the projector is running.
import { APP_VERSION } from "./version.js";

export function mountVersionBadge(parent = document.body) {
  const badge = document.createElement("div");
  badge.className = "app-version";
  badge.textContent = `v${APP_VERSION}`;
  badge.setAttribute("aria-label", `Version ${APP_VERSION}`);
  parent.append(badge);
  return badge;
}
