// All learner-facing strings live here: English first, natural Vietnamese second.
// t(key, vars) -> {en, vi}. bi(key, vars) -> HTML with English plus a smaller Vietnamese line.

const STR = {
  brand: { en: "Word Garden", vi: "Vườn Word" },
  loading: { en: "Loading…", vi: "Đang tải…" },
  retry: { en: "Try again", vi: "Thử lại" },
  offline: {
    en: "We can't reach the class computer right now.",
    vi: "Hiện chưa kết nối được với máy tính của lớp.",
  },
  offlineHint: {
    en: "Check the wifi, then try again.",
    vi: "Bạn kiểm tra wifi rồi thử lại nhé.",
  },

  // Join
  joinTitle: { en: "What is your name?", vi: "Bạn tên là gì?" },
  joinPlaceholder: { en: "Type your name", vi: "Gõ tên của bạn" },
  joinPick: { en: "Pick a picture for you", vi: "Chọn một hình cho bạn" },
  joinStart: { en: "Start ▶", vi: "Bắt đầu" },
  joinSaving: { en: "One moment…", vi: "Chờ một chút…" },
  joinFail: {
    en: "That did not work. Please try again.",
    vi: "Chưa được rồi. Bạn thử lại nhé.",
  },
  welcomeBack: { en: "Welcome back!", vi: "Chào mừng bạn trở lại!" },
  continueAs: { en: "Continue as {name} ▶", vi: "Tiếp tục với tên {name}" },
  notYou: { en: "Not you?", vi: "Không phải bạn?" },

  // Home
  hi: { en: "Hi {name}", vi: "Chào {name}" },
  waterNeeded: {
    en: "{n} plants need water 💧",
    vi: "{n} cây đang cần tưới nước",
  },
  waterNeededOne: {
    en: "1 plant needs water 💧",
    vi: "1 cây đang cần tưới nước",
  },
  gardenFine: {
    en: "Your garden is looking good",
    vi: "Khu vườn của bạn đang xanh tốt",
  },
  gardenEmptyStatus: {
    en: "Your garden is ready for its first seed",
    vi: "Vườn của bạn đang chờ hạt giống đầu tiên",
  },
  streakWeeks: { en: "🔥 {n} weeks in a row", vi: "{n} tuần liên tiếp" },
  streakOne: { en: "🔥 This week is going well", vi: "Tuần này bạn làm rất tốt" },
  startHere: { en: "★ Start here", vi: "Bắt đầu ở đây" },
  revisionTitle: { en: "Weekly Revision", vi: "Ôn tập hằng tuần" },
  revisionBody: {
    en: "{n} quick questions. Water your plants.",
    vi: "{n} câu hỏi nhanh. Tưới nước cho cây nhé.",
  },
  missionsTitle: { en: "Missions", vi: "Nhiệm vụ" },
  missionsBody: { en: "Do real jobs in Word.", vi: "Làm việc thực tế trong Word." },
  go: { en: "Go ▶", vi: "Bắt đầu" },
  waitingTitle: { en: "Waiting for your teacher", vi: "Đang chờ giáo viên" },
  waitingBody: {
    en: "Your class will start soon. You can practise on your own until then.",
    vi: "Lớp học sắp bắt đầu. Trong lúc chờ, bạn có thể tự luyện tập.",
  },
  freeTitle: { en: "Free practice", vi: "Luyện tập tự do" },
  freeBody: {
    en: "Try things in Word. No score, no pressure.",
    vi: "Cứ thoải mái thử trong Word. Không chấm điểm, không áp lực.",
  },
  gardenPeek: { en: "My garden", vi: "Khu vườn của tôi" },
  gardenPeekEmpty: {
    en: "Your first plant will grow here.",
    vi: "Cây đầu tiên của bạn sẽ mọc ở đây.",
  },
  gardenPeekEmptyHint: {
    en: "Finish one question or mission to plant a seed.",
    vi: "Hoàn thành một câu hỏi hoặc nhiệm vụ để gieo hạt.",
  },
  seeGarden: { en: "See my garden ▶", vi: "Xem vườn của tôi" },
  ask: { en: "Ask teacher", vi: "Hỏi giáo viên" },
  viSwitchOn: { en: "On", vi: "Bật" },
  viSwitchOff: { en: "Off", vi: "Tắt" },

  reconnecting: { en: "Trying to reconnect…", vi: "Đang thử kết nối lại…" },

  // Not built yet
  soonTitle: { en: "Coming soon", vi: "Sắp có" },
  soonBody: {
    en: "This part of the game is being built.",
    vi: "Phần này của trò chơi đang được hoàn thiện.",
  },
  backHome: { en: "Back to home", vi: "Về trang chính" },
};

// Avatars: a stable key is stored in `learners.avatar`; the emoji is only for display.
export const AVATARS = [
  { key: "mango", emoji: "🥭", en: "Mango", vi: "Xoài" },
  { key: "watermelon", emoji: "🍉", en: "Watermelon", vi: "Dưa hấu" },
  { key: "lemon", emoji: "🍋", en: "Lemon", vi: "Chanh" },
  { key: "chilli", emoji: "🌶️", en: "Chilli", vi: "Ớt" },
  { key: "coconut", emoji: "🥥", en: "Coconut", vi: "Dừa" },
  { key: "corn", emoji: "🌽", en: "Corn", vi: "Bắp" },
  { key: "rooster", emoji: "🐓", en: "Rooster", vi: "Gà trống" },
  { key: "fish", emoji: "🐟", en: "Fish", vi: "Cá" },
  { key: "butterfly", emoji: "🦋", en: "Butterfly", vi: "Bướm" },
  { key: "turtle", emoji: "🐢", en: "Turtle", vi: "Rùa" },
  { key: "duck", emoji: "🦆", en: "Duck", vi: "Vịt" },
  { key: "bee", emoji: "🐝", en: "Bee", vi: "Ong" },
  { key: "noodles", emoji: "🍜", en: "Noodles", vi: "Mì" },
  { key: "dumpling", emoji: "🥟", en: "Dumpling", vi: "Há cảo" },
  { key: "rice", emoji: "🍚", en: "Rice", vi: "Cơm" },
  { key: "tea", emoji: "🍵", en: "Tea", vi: "Trà" },
];

export function avatarEmoji(key) {
  const found = AVATARS.find((a) => a.key === key);
  return found ? found.emoji : "🌱";
}

/** @returns {{en: string, vi: string}} */
export function t(key, vars = {}) {
  const entry = STR[key];
  if (!entry) throw new Error(`Missing string: ${key}`);
  const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
  return { en: fill(entry.en), vi: fill(entry.vi) };
}

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** HTML for an {en, vi} pair: English text, then Vietnamese on a smaller second line. */
export function biPair(pair) {
  return `${esc(pair.en)}<span class="vi">${esc(pair.vi)}</span>`;
}

export function bi(key, vars) {
  return biPair(t(key, vars));
}

/** Plain-text label for aria attributes: "English / Tiếng Việt", or English only when Vietnamese is hidden. */
export function labelPair(pair) {
  return viHidden() ? pair.en : `${pair.en} / ${pair.vi}`;
}

export function label(key, vars) {
  return labelPair(t(key, vars));
}

/* ---------- Vietnamese on/off (per learner, cached on this laptop) ---------- */

const HIDE_VI_KEY = "hide_vi";
export const VI_CHANGE_EVENT = "vi-change";

export function viHidden() {
  return document.documentElement.classList.contains("hide-vi");
}

/** Hide or show every Vietnamese line. index.html applies the cached value before first paint. */
export function setViHidden(hidden) {
  document.documentElement.classList.toggle("hide-vi", hidden);
  try {
    localStorage.setItem(HIDE_VI_KEY, hidden ? "1" : "0");
  } catch {
    /* storage blocked: the choice lasts until reload */
  }
  window.dispatchEvent(new CustomEvent(VI_CHANGE_EVENT, { detail: hidden }));
}
