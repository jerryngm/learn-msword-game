// PocketBase reads and writes for the game screens. Every value sent to the server is
// checked here first, so a screen bug can't write a bad attempt or ask.
import { classSettings, pb } from "./pb.js";
import { TOPICS, loadTopic } from "./content/skills.js";

const KINDS = new Set(["revision", "mission", "free"]);
const ASK_TYPES = new Set(["stuck", "learn_more", "classmate"]);
const ID_RE = /^[a-z0-9]{15}$/; // PocketBase record ids
const PENDING_KEY = "wg_pending_attempts";
const ATTEMPT_FIELDS = "id,learner,session,skill,item,kind,stars,help_level,tries,created,client_at,review_complete";

function intIn(value, min, max, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new RangeError(`${name} must be an integer ${min}..${max}, got ${value}`);
  return n;
}

function text(value, max, name) {
  const s = String(value ?? "").trim();
  if (!s || s.length > max) throw new RangeError(`${name} must be 1..${max} characters`);
  return s;
}

function optionalId(value, name) {
  if (value == null || value === "") return "";
  if (!ID_RE.test(String(value))) throw new RangeError(`${name} is not a record id`);
  return String(value);
}

function requiredId(value, name) {
  const id = optionalId(value, name);
  if (!id) throw new RangeError(`${name} is required`);
  return id;
}

/** Returns a function that is true at most once per `ms`: wraps a button action so a double-click or held key counts once. */
export function tapGuard(ms) {
  let until = 0;
  return () => {
    const at = performance.now();
    if (at < until) return false;
    until = at + ms;
    return true;
  };
}

/* ---------- attempts ---------- */

function attemptBody({ learner, session, skill, item, kind, stars, help_level = 0, tries = 1, review_complete = false }) {
  if (!KINDS.has(kind)) throw new RangeError(`kind must be revision, mission or free, got ${kind}`);
  return {
    learner: requiredId(learner, "learner"),
    session: optionalId(session, "session"),
    skill: text(skill, 40, "skill"),
    item: text(item, 60, "item"),
    kind,
    stars: intIn(stars, 1, 3, "stars"),
    help_level: intIn(help_level, 0, 3, "help_level"),
    tries: intIn(Math.min(Number(tries), 99), 0, 99, "tries"),
    ...(review_complete === true && kind === "revision" ? { review_complete: true } : {}),
  };
}

const isRefused = (err) => err?.status >= 400 && err.status < 500 && err.status !== 429;

function newCid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The saved queue. Entries are attempt bodies plus {cid, at}: a client id and the time the item was finished. */
function readPending() {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    return Array.isArray(list) ? list.filter((e) => e && typeof e === "object") : [];
  } catch {
    return [];
  }
}

function writePending(list) {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-200)));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage blocked: the attempt stays in memory only */
  }
}

/** Adds an entry. The queue is re-read right before every write, so concurrent changes are merged, not overwritten. */
function enqueue(entry) {
  const list = readPending().filter((e) => e.cid !== entry.cid);
  writePending([...list, entry]);
}

/** Removes entries by client id, again from a fresh read. */
function dequeue(cids) {
  const gone = new Set(cids);
  if (!gone.size) return;
  writePending(readPending().filter((e) => !gone.has(e.cid)));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createWithRetry(body, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await pb.collection("attempts").create(body, { requestKey: null });
    } catch (err) {
      lastErr = err;
      // 4xx (other than 429) means the server refused this body; retrying won't help.
      if (isRefused(err)) throw err;
      await sleep(400 * (i + 1));
    }
  }
  throw lastErr;
}

/**
 * Sends one queued entry. `created` is the server clock, so the time the learner finished travels as
 * `client_at` (the rules prefer it, so an attempt sent late still lands on the right class day).
 * A refused body (for example a session that was deleted) is retried once without the session, so the stars stay.
 */
async function sendEntry(entry, attempts) {
  const { cid, at, ...body } = entry;
  const wire = { ...body, client_at: at };
  try {
    return await createWithRetry(wire, attempts);
  } catch (err) {
    if (isRefused(err) && wire.session) return createWithRetry({ ...wire, session: "" }, 1);
    throw err;
  }
}

const inFlight = new Set(); // client ids being sent by recordAttempt right now (flush must not send them too)
let flushing = null;

/**
 * Sends attempts saved on this laptop while the wifi was down. Safe to call any time: only the entries it
 * sent are removed afterwards, and entries queued meanwhile are sent too. Resolves to how many are still waiting.
 */
export function flushPendingAttempts() {
  if (flushing) return flushing;
  flushing = (async () => {
    const saved = readPending();
    if (saved.some((e) => !e.cid)) writePending(saved.map((e) => (e.cid ? e : { ...e, cid: newCid() }))); // entries from an older version
    const tried = new Set();
    for (;;) {
      const batch = readPending().filter((e) => e.cid && !tried.has(e.cid) && !inFlight.has(e.cid));
      if (!batch.length) break;
      const sent = [];
      for (const entry of batch) {
        tried.add(entry.cid);
        try {
          await sendEntry(entry, 1);
          sent.push(entry.cid);
        } catch (err) {
          if (isRefused(err)) {
            console.error("dropping an attempt the server refused", err, entry);
            sent.push(entry.cid);
          }
        }
      }
      dequeue(sent);
    }
    return readPending().length;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/**
 * Writes one finished item. Returns {record, queued, refused}. The attempt is saved on this laptop first and
 * removed once the server has it, so a wifi drop or a reload mid-send never loses stars (queued: true means it
 * is still waiting; refused: true means the server rejected it, which a retry won't fix).
 * Invalid input throws (that is a bug in the caller, not something to hide).
 */
export async function recordAttempt(input) {
  const entry = { ...attemptBody(input), cid: newCid(), at: new Date().toISOString() };
  enqueue(entry);
  inFlight.add(entry.cid);
  try {
    const record = await sendEntry(entry, 3);
    dequeue([entry.cid]);
    flushPendingAttempts().catch((err) => console.error("could not flush saved attempts", err));
    return { record, queued: false, refused: false };
  } catch (err) {
    if (isRefused(err)) {
      console.error("the server refused this attempt", err);
      dequeue([entry.cid]);
      return { record: null, queued: false, refused: true };
    }
    console.error("attempt kept on this laptop until the wifi is back", err);
    return { record: null, queued: true, refused: false };
  } finally {
    inFlight.delete(entry.cid);
  }
}

/** Sends anything left from an earlier visit when the app starts, and again whenever the wifi comes back. */
if (typeof window !== "undefined") {
  const sync = () => flushPendingAttempts().catch((err) => console.error("could not flush saved attempts", err));
  window.addEventListener("online", sync);
  sync();
}

/** Attempts still waiting on this laptop, shaped like records (so the garden counts them now). */
function pendingAsRecords(learnerId) {
  const now = new Date().toISOString();
  return readPending()
    .filter((b) => b.learner === learnerId)
    .map((b, i) => ({ ...b, id: `pending${i}`, created: String(b.at || now).replace("T", " ") }));
}

/** Every attempt of one learner, oldest first (including any still waiting to be sent). */
export async function learnerAttempts(learnerId) {
  const id = requiredId(learnerId, "learner");
  const list = await pb.collection("attempts").getFullList({
    filter: pb.filter("learner = {:id}", { id }),
    fields: ATTEMPT_FIELDS,
    sort: "created",
    requestKey: null,
  });
  return [...list, ...pendingAsRecords(id)];
}

/** Every attempt in one session (all learners). */
export async function sessionAttempts(sessionId) {
  const id = optionalId(sessionId, "session");
  if (!id) return [];
  return pb.collection("attempts").getFullList({
    filter: pb.filter("session = {:id}", { id }),
    fields: ATTEMPT_FIELDS,
    sort: "created",
    requestKey: null,
  });
}

/**
 * How many other learners needed a hint (help_level >= 1) on this item in this session.
 * Social proof only ever shows a real count, so any failure returns 0 (nothing is shown).
 */
export async function hintCount({ session, item, exceptLearner }) {
  const sid = optionalId(session, "session");
  if (!sid || !item) return 0;
  try {
    const list = await pb.collection("attempts").getFullList({
      filter: pb.filter("session = {:s} && item = {:i} && help_level >= 1 && learner != {:me}", {
        s: sid,
        i: String(item),
        me: String(exceptLearner ?? ""),
      }),
      fields: "learner",
      requestKey: null,
    });
    return new Set(list.map((a) => a.learner)).size;
  } catch (err) {
    console.error("could not count hints", err);
    return 0;
  }
}

/** Every attempt on one skill, all learners (for "Ask a classmate"). */
export async function skillAttempts(skillId) {
  const skill = text(skillId, 40, "skill");
  return pb.collection("attempts").getFullList({
    filter: pb.filter("skill = {:s}", { s: skill }),
    fields: "learner,skill,stars,kind,item,created,client_at,session",
    requestKey: null,
  });
}

export async function learnersByIds(ids) {
  const clean = [...new Set(ids)].filter((id) => ID_RE.test(id));
  if (!clean.length) return [];
  const filter = clean.map((_, i) => `id = {:id${i}}`).join(" || ");
  const params = Object.fromEntries(clean.map((id, i) => [`id${i}`, id]));
  return pb.collection("learners").getFullList({ filter: pb.filter(filter, params), fields: "id,name,avatar,colour,active", requestKey: null });
}

/* ---------- session ---------- */

/** The newest live session, or null. */
export async function currentSession() {
  const res = await pb.collection("sessions").getList(1, 1, { filter: 'status = "live"', sort: "-created", requestKey: null });
  return res.items[0] ?? null;
}

function topicList(value) {
  const list = Array.isArray(value) ? value : [];
  const valid = new Set(TOPICS.map((t) => t.n));
  return [...new Set(list.map(Number).filter((n) => valid.has(n)))].sort((a, b) => a - b);
}

/**
 * What to play now: the live session (or null), the taught topics, and the topics, length and
 * preset to use. With no live session it falls back to every taught topic, length 6.
 */
export async function playContext() {
  const [session, settings] = await Promise.all([currentSession(), classSettings()]);
  const taught = topicList(settings?.taught_topics);
  const sessionTopics = topicList(session?.topics);
  const topics = sessionTopics.length ? sessionTopics : taught.length ? taught : [1];
  const length = Number.isInteger(session?.length) && session.length > 0 ? session.length : 6;
  return {
    session,
    settings,
    taught: taught.length ? taught : topics,
    topics,
    length,
    preset: session?.preset || "custom",
    dishNames: settings?.dish_names && typeof settings.dish_names === "object" ? settings.dish_names : {},
  };
}

/** Missions per Missions run: 2 for a 6-item session, 3 for 10, 5 for 15. */
export function missionsPerRun(length) {
  if (length >= 15) return 5;
  if (length >= 10) return 3;
  return 2;
}

/** Revision items and missions of the given topics. A topic file that fails to load counts as empty. */
const topicExists = new Map();

/** True when js/content/topic-N.js is a real module (the server answers missing files with the app page). */
function hasTopicFile(n) {
  if (!topicExists.has(n)) {
    const url = new URL(`./content/topic-${n}.js`, import.meta.url);
    topicExists.set(
      n,
      fetch(url, { method: "HEAD" })
        .then((r) => r.ok && /javascript/.test(r.headers.get("content-type") ?? ""))
        .catch(() => true), // offline probe: let loadTopic decide
    );
  }
  return topicExists.get(n);
}

export async function loadContent(topicNs) {
  const load = async (n) => {
    if (!(await hasTopicFile(n))) return { items: [], missions: [] };
    try {
      return await loadTopic(n);
    } catch (err) {
      console.error(`topic ${n} content failed to load`, err);
      return { items: [], missions: [] };
    }
  };
  const parts = await Promise.all(topicNs.map(load));
  return {
    items: parts.flatMap((p) => (Array.isArray(p.items) ? p.items : [])),
    missions: parts.flatMap((p) => (Array.isArray(p.missions) ? p.missions : [])),
  };
}

/** Content of every topic (for the garden, which links any plant to its practice). */
export function loadAllContent() {
  return loadContent(TOPICS.map((t) => t.n));
}

/* ---------- asks ---------- */

export async function createAsk({ learner, session, type, skill, item = null, kind = null }) {
  if (!ASK_TYPES.has(type)) throw new RangeError(`ask type must be stuck, learn_more or classmate, got ${type}`);
  const body = {
    learner: requiredId(learner, "learner"),
    session: optionalId(session, "session"),
    type,
    skill: skill ? text(skill, 40, "skill") : "",
    item: item ? text(item, 60, "item") : "",
    kind: kind ? text(kind, 20, "kind") : "",
    helper_status: "open",
    status: "open",
  };
  return pb.collection("asks").create(body, { requestKey: null });
}

/** A classmate accepts an open ask to help their peer. */
export async function acceptAsk(askId, helperId) {
  const id = requiredId(askId, "ask");
  const helper = requiredId(helperId, "helper");
  return pb.collection("asks").update(id, {
    helper,
    helper_status: "accepted",
  }, { requestKey: null });
}

/** A learner may only flip their own ask to done (the API rule allows nothing else). */
export async function markAskDone(askId) {
  const id = requiredId(askId, "ask");
  return pb.collection("asks").update(id, { status: "done" }, { requestKey: null });
}

/** The learner's newest open ask, or null. */
export async function openAsk(learnerId) {
  const id = requiredId(learnerId, "learner");
  const res = await pb.collection("asks").getList(1, 1, {
    filter: pb.filter('learner = {:id} && status = "open"', { id }),
    sort: "-created",
    requestKey: null,
  });
  return res.items[0] ?? null;
}

/** Calls cb(record) whenever one of this learner's asks changes (e.g. the teacher marks it done). Returns unsubscribe. */
export function watchAsks(learnerId, cb) {
  const id = requiredId(learnerId, "learner");
  let closed = false;
  const sub = pb
    .collection("asks")
    .subscribe("*", (e) => !closed && e.record?.learner === id && cb(e.record), { filter: pb.filter("learner = {:id}", { id }) })
    .catch((err) => {
      console.error("could not watch asks", err);
      return () => {};
    });
  return () => {
    closed = true;
    sub.then((off) => off()).catch(() => {});
  };
}

/**
 * Watch open classmate asks in the session so eligible helpers are notified in real-time.
 * Calls cb(asks) on any change. Returns unsubscribe function.
 */
export function watchOpenClassmateAsks(sessionId, cb) {
  let closed = false;
  let list = [];
  let latest = 0;

  const load = async () => {
    const mine = ++latest;
    try {
      const filter = sessionId
        ? pb.filter('status = "open" && type = "classmate" && session = {:sid}', { sid: sessionId })
        : 'status = "open" && type = "classmate"';
      const rows = await pb.collection("asks").getFullList({
        filter,
        sort: "-created",
        requestKey: null,
      });
      if (closed || mine !== latest) return;
      list = rows;
      cb(list);
    } catch (err) {
      if (!closed && mine === latest) cb(list, err);
    }
  };

  load();
  const sub = pb.collection("asks").subscribe("*", () => {
    if (closed) return;
    load();
  }).catch((err) => {
    console.error("could not subscribe to classmate asks", err);
    return () => {};
  });

  const offConnect = pb.realtime.subscribe("PB_CONNECT", load);

  return () => {
    closed = true;
    sub.then((off) => off?.()).catch(() => {});
    offConnect.then((off) => off?.()).catch(() => {});
  };
}

/* ---------- encouragements (teacher ⭐ messages) ---------- */

/**
 * Calls cb(list, error?) with the learner's encouragements (newest first) now and again whenever
 * the teacher sends or removes one. Returns unsubscribe.
 */
export function learnerEncouragements(learnerId, cb) {
  const id = requiredId(learnerId, "learner");
  let closed = false;
  let list = [];
  let latest = 0;
  const load = async () => {
    const mine = ++latest;
    try {
      const rows = await pb.collection("encouragements").getFullList({
        filter: pb.filter("learner = {:id}", { id }),
        sort: "-created",
        requestKey: null,
      });
      if (closed || mine !== latest) return;
      list = rows;
      cb(list);
    } catch (err) {
      if (!closed && mine === latest) cb(list, err);
    }
  };
  load();
  const subs = [
    pb.collection("encouragements").subscribe("*", (e) => e.record?.learner === id && load(), { filter: pb.filter("learner = {:id}", { id }) }),
    pb.realtime.subscribe("PB_CONNECT", load),
  ];
  subs.forEach((p) => p.catch((err) => !closed && cb(list, err)));
  return () => {
    closed = true;
    subs.forEach((p) => p.then((off) => off()).catch(() => {}));
  };
}

/* ---------- this laptop's run state (survives a reload, not a new browser) ---------- */

const RUN_KEY = "wg_run";

/**
 * The current run: {kind: 'revision'|'missions', sessionId, started, target, done: [missionId],
 * current, round: [itemId], index, results: [{skill, item, kind, stars, before, after}]}.
 */
export function getRun() {
  try {
    const run = JSON.parse(sessionStorage.getItem(RUN_KEY) || "null");
    return run && typeof run === "object" ? run : null;
  } catch {
    return null;
  }
}

export function setRun(run) {
  try {
    if (run) sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
    else sessionStorage.removeItem(RUN_KEY);
  } catch {
    /* storage blocked: the run lives until this page closes */
  }
}

const PRACTICE_KEY = "wg_practice";

/** Garden → revision handoff: practise the items of one skill. Read once. */
export function setPracticeSkill(skillId) {
  try {
    sessionStorage.setItem(PRACTICE_KEY, String(skillId));
  } catch {
    /* ignore */
  }
}

export function takePracticeSkill() {
  try {
    const v = sessionStorage.getItem(PRACTICE_KEY);
    sessionStorage.removeItem(PRACTICE_KEY);
    return v;
  } catch {
    return null;
  }
}
