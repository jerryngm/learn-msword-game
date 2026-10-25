// Live class data for the trainer page: one set of realtime watchers, shared by both views.
import { liveSession, watchAllAttempts, watchClassSettings, watchLearners, watchOpenAsks } from "../live.js";

/**
 * Starts the watchers. `state` holds the latest {session, settings, learners, attempts, asks, errors}.
 * on(fn) calls fn(state) after every change (and once now); it returns an unsubscribe.
 */
export function createStore() {
  const state = { session: null, settings: null, learners: [], attempts: [], asks: [], errors: {}, ready: new Set() };
  const listeners = new Set();
  let queued = false;

  const emit = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      listeners.forEach((fn) => fn(state));
    });
  };
  const put = (key) => (value, err) => {
    state[key] = value;
    state.ready.add(key);
    if (err) {
      console.error(`could not load ${key}`, err);
      state.errors[key] = err;
    } else delete state.errors[key];
    emit();
  };

  const stops = [
    liveSession(put("session")),
    watchClassSettings(put("settings")),
    watchLearners(put("learners")),
    watchAllAttempts(put("attempts")),
    watchOpenAsks(put("asks")),
  ];

  return {
    state,
    on(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    stop() {
      listeners.clear();
      stops.forEach((off) => off());
    },
  };
}
