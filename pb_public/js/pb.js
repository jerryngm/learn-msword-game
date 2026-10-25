// PocketBase client and the few shared reads every learner screen needs.
import PocketBase from "../vendor/pocketbase.es.mjs";
import { setViHidden } from "./i18n.js";

export const pb = new PocketBase(location.origin);

const LEARNER_KEY = "learner_id";

function storedId() {
  try {
    return localStorage.getItem(LEARNER_KEY);
  } catch {
    return null; // storage blocked: behave as a first visit
  }
}

export function setCurrentLearner(id) {
  localStorage.setItem(LEARNER_KEY, id);
}

export function forgetLearner() {
  try {
    localStorage.removeItem(LEARNER_KEY);
  } catch {
    /* nothing stored, nothing to forget */
  }
}

/**
 * The learner remembered on this laptop, or null when none is stored or the
 * record was deleted by the trainer (the stale id is cleared). Any other
 * failure (network, server) is thrown so the caller can offer a retry.
 */
export async function currentLearner() {
  const id = storedId();
  if (!id) return null;
  try {
    const learner = await pb.collection("learners").getOne(id, { requestKey: null });
    setViHidden(Boolean(learner.hide_vi)); // the learner's own choice wins over this laptop's cache
    return learner;
  } catch (err) {
    if (err?.status === 404) {
      forgetLearner();
      return null;
    }
    throw err;
  }
}

/** Saves the Vietnamese on/off choice on the current learner's record (no-op when nobody has joined). */
export async function saveHideVi(hidden) {
  const id = storedId();
  if (!id) return;
  await pb.collection("learners").update(id, { hide_vi: hidden }, { requestKey: null });
}

/** The single class_settings record (taught topics, dish names). */
export function classSettings() {
  return pb
    .collection("class_settings")
    .getList(1, 1, { requestKey: null })
    .then((res) => res.items[0] ?? null);
}

async function fetchLiveSession() {
  const res = await pb.collection("sessions").getList(1, 1, {
    filter: 'status = "live"',
    sort: "-created",
    requestKey: null,
  });
  return res.items[0] ?? null;
}

/**
 * Calls callback(session | null, error?) with the newest live session now, and
 * again on every change to `sessions` and on every realtime (re)connect, so a
 * screen stays current without a reload. Returns an unsubscribe function.
 */
export function liveSession(callback) {
  let closed = false;
  let latest = 0; // ignore out-of-order responses

  const refresh = async () => {
    const mine = ++latest;
    let session = null;
    let error;
    try {
      session = await fetchLiveSession();
    } catch (err) {
      error = err;
    }
    if (closed || mine !== latest) return;
    callback(session, error);
  };

  refresh();
  const subs = [
    pb.collection("sessions").subscribe("*", refresh),
    pb.realtime.subscribe("PB_CONNECT", refresh),
  ];
  // A failed subscription must not be silent: the screen would stop updating.
  subs.forEach((p) => p.catch((err) => !closed && callback(null, err)));

  return () => {
    closed = true;
    subs.forEach((p) => p.then((off) => off()).catch(() => {}));
  };
}
