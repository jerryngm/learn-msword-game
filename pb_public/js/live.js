// Realtime list helpers shared by the trainer and projector pages.
// At this scale (under 10 learners) the simplest correct thing is: load the full list,
// then reload it on every change and on every realtime (re)connect.
import { pb } from "./pb.js";

export { pb, liveSession, classSettings } from "./pb.js";

const RELOAD_DELAY_MS = 150; // bursts of events (a learner finishing several items) cause one reload

/**
 * Calls cb(list, error?) with every record of `collection` matching `options`
 * ({filter, sort, fields, expand}) now, and again after any create/update/delete
 * in that collection and after every realtime reconnect. On a failed load the last
 * good list is passed with the error. Returns an unsubscribe function.
 */
export function watchList(collection, options, cb) {
  const query = { ...(options ?? {}), requestKey: null };
  let closed = false;
  let latest = 0; // ignore out-of-order responses
  let timer = null;
  let list = [];

  const load = async () => {
    const mine = ++latest;
    try {
      const rows = await pb.collection(collection).getFullList(query);
      if (closed || mine !== latest) return;
      list = rows;
      cb(list);
    } catch (err) {
      if (!closed && mine === latest) cb(list, err);
    }
  };
  const soon = () => {
    if (closed) return;
    clearTimeout(timer);
    timer = setTimeout(load, RELOAD_DELAY_MS);
  };

  load();
  const subs = [pb.collection(collection).subscribe("*", soon), pb.realtime.subscribe("PB_CONNECT", soon)];
  subs.forEach((p) => p.catch((err) => !closed && cb(list, err)));

  return () => {
    closed = true;
    clearTimeout(timer);
    subs.forEach((p) => p.then((off) => off()).catch(() => {}));
  };
}

/** Attempts of one session, oldest first. A null session gives an empty list (no subscription). */
export function watchSessionAttempts(sessionId, cb) {
  if (!sessionId) {
    cb([]);
    return () => {};
  }
  return watchList(
    "attempts",
    {
      filter: pb.filter("session = {:id}", { id: sessionId }),
      sort: "created",
      fields: "id,learner,session,skill,item,kind,stars,help_level,tries,created,client_at",
    },
    cb,
  );
}

/** Every attempt (all learners, all sessions), oldest first: plant stages need the full history. */
export function watchAllAttempts(cb) {
  return watchList(
    "attempts",
    { sort: "created", fields: "id,learner,session,skill,item,kind,stars,help_level,tries,created,client_at" },
    cb,
  );
}

/** All learners, oldest first (inactive ones included; filter on `active` in the page). */
export function watchLearners(cb) {
  return watchList("learners", { sort: "created" }, cb);
}

/** Open asks, newest first. */
export function watchOpenAsks(cb) {
  return watchList("asks", { filter: 'status = "open"', sort: "-created" }, cb);
}

/** Encouragements, newest first (optionally only those since an ISO/PocketBase time). */
export function watchEncouragements(cb, { since } = {}) {
  const filter = since ? pb.filter("created >= {:since}", { since }) : "";
  return watchList("encouragements", { filter, sort: "-created" }, cb);
}

/** The class_settings record, now and on every change. cb(record | null, error?). */
export function watchClassSettings(cb) {
  return watchList("class_settings", {}, (list, err) => cb(list[0] ?? null, err));
}
