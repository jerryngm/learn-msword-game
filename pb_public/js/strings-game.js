// Learner strings for the game screens (revision, missions, success, garden, end, Ask).
// English first, natural Vietnamese second. Shared shell strings stay in i18n.js.
// gt(key, vars) -> {en, vi}; gbi(key, vars) -> HTML with the .vi line; glabel(key, vars) -> aria/title text.

import { biPair, labelPair } from "./i18n.js";

export const GAME_STRINGS = {
  // Shared
  finish: { en: "Finish for today", vi: "Hôm nay học đến đây" },
  next: { en: "Next ▶", vi: "Tiếp theo" },
  check: { en: "Check ✓", vi: "Kiểm tra" },
  backHome: { en: "Back to home", vi: "Về trang chính" },
  myGarden: { en: "My garden", vi: "Khu vườn của tôi" },
  loading: { en: "Getting things ready…", vi: "Đang chuẩn bị…" },
  saveFailed: {
    en: "Your stars are kept on this laptop and will be sent when the wifi is back.",
    vi: "Số sao của bạn vẫn được giữ trên máy này và sẽ tự gửi đi khi có wifi.",
  },
  saveRefused: {
    en: "This one could not be saved, but you still finished it. Keep going.",
    vi: "Câu này chưa lưu được, nhưng bạn đã làm xong rồi. Cứ tiếp tục nhé.",
  },
  topicChip: { en: "🌿 Topic {n}", vi: "Chủ đề {n}" },

  // Empty states
  emptyRevisionTitle: { en: "Your questions are on their way", vi: "Câu hỏi của bạn sắp có rồi" },
  emptyRevisionBody: {
    en: "There is nothing to revise yet. Your teacher is getting this week ready.",
    vi: "Hiện chưa có gì để ôn. Giáo viên đang chuẩn bị bài cho tuần này.",
  },
  emptyMissionTitle: { en: "No missions ready yet", vi: "Chưa có nhiệm vụ nào" },
  emptyMissionBody: {
    en: "Missions for this topic are coming soon. You can practise freely in Word.",
    vi: "Nhiệm vụ cho chủ đề này sắp có. Bạn cứ tự luyện tập trong Word nhé.",
  },
  missionsDoneTitle: { en: "You have done every mission for today", vi: "Bạn đã làm hết nhiệm vụ của hôm nay" },
  missionsDoneBody: {
    en: "Well done. Come back next week, or water a plant in your garden.",
    vi: "Bạn làm tốt lắm. Tuần sau quay lại nhé, hoặc tưới cây trong vườn của bạn.",
  },
  practiceFree: { en: "✏️ Free practice", vi: "Luyện tập tự do" },

  // Revision
  progress: { en: "{n} of {total}", vi: "Câu {n}/{total}" },
  progressLabel: { en: "Question {n} of {total}", vi: "Câu {n} trên {total}" },
  lastOne: { en: "Last one!", vi: "Câu cuối!" },
  warmUp: { en: "☀️ Warm-up · an easy start", vi: "Khởi động · bắt đầu nhẹ nhàng" },
  coolDown: { en: "🌙 Cool-down · an easy one", vi: "Thư giãn · một câu dễ" },
  notYet: { en: "Not yet. Try again. Mistakes help you learn.", vi: "Chưa đúng, thử lại nhé. Có sai mới học được." },
  revealPick: { en: "Here it is. Now you tap it.", vi: "Đáp án đây rồi. Giờ bạn bấm vào nhé." },
  revealOrder: { en: "The numbers show the order. Now you tap the steps 1, 2, 3…", vi: "Các con số cho biết thứ tự. Giờ bạn bấm các bước theo 1, 2, 3…" },
  revealSort: { en: "The glowing box is the right one. Now you tap it.", vi: "Ô đang sáng là ô đúng. Giờ bạn bấm vào nhé." },
  revealFix: { en: "Type it like this:", vi: "Bạn gõ như thế này:" },
  revealDo: { en: "Watch, then you do it.", vi: "Xem trước, rồi bạn tự làm nhé." },
  rightFirst: { en: "Right first time! ⭐⭐⭐", vi: "Đúng ngay lần đầu!" },
  rightNow: { en: "Yes, that's it! ✓", vi: "Đúng rồi!" },
  didIt: { en: "You did it ✓ Practice makes it stick.", vi: "Bạn làm được rồi ✓ Luyện nhiều sẽ nhớ lâu." },
  socialProof: { en: "{n} people in your class needed a hint too.", vi: "{n} người trong lớp cũng cần gợi ý như bạn." },
  socialProofOne: { en: "1 person in your class needed a hint too.", vi: "1 người trong lớp cũng cần gợi ý như bạn." },
  orderTapHint: { en: "Tap the steps in the order you do them.", vi: "Bấm các bước theo đúng thứ tự bạn làm." },
  orderYours: { en: "Your order", vi: "Thứ tự của bạn" },
  orderTapBack: { en: "Tap a step to take it back.", vi: "Bấm vào một bước để bỏ ra." },
  sortWhere: { en: "Where does this go?", vi: "Mục này thuộc ô nào?" },
  sortCount: { en: "{n} of {total}", vi: "{n}/{total}" },
  fixLabel: { en: "Fix the words here", vi: "Sửa lại chữ ở đây" },
  mockSoon: { en: "Practice picture", vi: "Hình luyện tập" },
  regionN: { en: "Part {n}", vi: "Phần {n}" },


  // Mission
  missionN: { en: "🧩 Mission {n} of {total}", vi: "Nhiệm vụ {n}/{total}" },
  missionOne: { en: "🧩 Mission", vi: "Nhiệm vụ" },
  lookLike: { en: "Make it look like this →", vi: "Làm cho giống hình này →" },
  goalPicture: { en: "Goal picture", vi: "Hình mẫu" },
  helpMe: { en: "Help me", vi: "Giúp tôi" },
  moreHelp: { en: "More help", vi: "Giúp thêm" },
  showMe: { en: "Show me", vi: "Chỉ cho tôi xem" },
  showMeAgain: { en: "Show me again", vi: "Chỉ lại cho tôi" },
  offerSpot: { en: "💡 Show me where to click", vi: "Chỉ cho tôi chỗ cần bấm" },
  explore: {
    en: "🧭 Explore freely: trying buttons does not lose stars.",
    vi: "Cứ thoải mái khám phá: bấm thử các nút không bị mất sao.",
  },
  missionLater: { en: "Skip this one for now", vi: "Tạm bỏ qua bài này" },
  mockMissingTitle: { en: "This practice is nearly ready", vi: "Bài luyện tập này sắp có" },
  mockMissingBody: {
    en: "Your teacher is still setting up this screen. Let's do the next one.",
    vi: "Giáo viên vẫn đang chuẩn bị màn hình này. Mình làm bài tiếp theo nhé.",
  },
  stepAria: { en: "Step {n}", vi: "Bước {n}" },
  stepDoneAria: { en: "Step {n}, done", vi: "Bước {n}, đã xong" },

  // Success
  headClean: { en: "Well done! 🌟", vi: "Làm tốt lắm!" },
  headHelp: { en: "You did it yourself! 🌿", vi: "Bạn đã tự làm được!" },
  headTried: { en: "You didn't give up! 💪", vi: "Bạn đã kiên trì đến cùng!" },
  headWatered: { en: "Your plant is watered 💧", vi: "Cây của bạn đã được tưới" },
  newBadge: { en: "New: I can {ican} ✅", vi: "Mới: Tôi biết {ican}" },
  starsLabel: { en: "{n} of 3 stars", vi: "{n} trên 3 sao" },
  toEnd: { en: "See my session ▶", vi: "Xem kết quả buổi học" },
  toGarden: { en: "Back to my garden ▶", vi: "Về khu vườn của tôi" },

  // Garden
  plantsN: { en: "{n} plants", vi: "{n} cây" },
  plantsOne: { en: "1 plant", vi: "1 cây" },
  needWater: { en: "💧 {n} need water", vi: "{n} cây cần tưới" },
  needWaterOne: { en: "💧 1 needs water", vi: "1 cây cần tưới" },
  tapPlant: { en: "👆 Tap a plant", vi: "Bấm vào một cây" },
  stage_seed: { en: "Seed", vi: "Hạt giống" },
  stage_sprout: { en: "Sprout", vi: "Nảy mầm" },
  stage_leafy: { en: "Leafy", vi: "Ra lá" },
  stage_flowering: { en: "Flowering", vi: "Ra hoa" },
  stage_wilted: { en: "Needs water", vi: "Cần tưới nước" },
  chip_seed: { en: "🌰 Seed: not tried yet", vi: "Hạt giống: chưa thử" },
  chip_sprout: { en: "🌱 Sprout", vi: "Nảy mầm" },
  chip_leafy: { en: "🌿 Leafy", vi: "Ra lá" },
  chip_flowering: { en: "🌼 Flowering: you know this!", vi: "Ra hoa: bạn đã thạo việc này!" },
  chip_wilted: { en: "💧 Thirsty: time to practise", vi: "Khát nước: đến lúc ôn lại" },
  canDo: { en: "I can {ican}", vi: "Tôi biết {ican}" },
  waterIt: { en: "💧 Water it", vi: "Tưới cây" },
  practiseAgain: { en: "Practise again", vi: "Luyện tập lại" },
  plantIt: { en: "🌱 Plant it: try it now", vi: "Gieo hạt: thử ngay" },
  noPractice: { en: "Practice for this one is coming soon.", vi: "Bài luyện cho phần này sắp có." },
  close: { en: "Close", vi: "Đóng" },
  kitchen: { en: "🍳 Kitchen", vi: "Nhà bếp" },
  badges: { en: "🏅 Badges", vi: "Huy hiệu" },
  dishTopic: { en: "Topic {n}", vi: "Chủ đề {n}" },
  dishCooked: { en: "Topic {n} ✓", vi: "Chủ đề {n} ✓" },
  kitchenNote: { en: "Finish a topic to cook its dish.", vi: "Học xong mỗi chủ đề sẽ nấu được một món." },
  noBadges: {
    en: "A plant that flowers gives you an “I can…” badge.",
    vi: "Mỗi cây ra hoa sẽ cho bạn một huy hiệu “Tôi biết…”.",
  },
  helperBadges: { en: "Helper badges", vi: "Huy hiệu giúp đỡ" },
  helpedN: { en: "Helped a classmate ×{n}", vi: "Đã giúp bạn cùng lớp ×{n}" },
  givenByTeacher: { en: "Given by your teacher", vi: "Giáo viên tặng" },
  fromTeacher: { en: "⭐ From your teacher", vi: "Giáo viên tặng bạn" },
  gardenEmpty: {
    en: "Your garden is ready. Each question or mission you finish plants a seed.",
    vi: "Khu vườn đã sẵn sàng. Mỗi câu hỏi hay nhiệm vụ bạn làm xong sẽ gieo một hạt giống.",
  },
  plantLabel: { en: "{stage}: I can {ican}", vi: "{stage}: Tôi biết {ican}" },

  // End
  endHero: { en: "⭐ Great session, {name}! 🌿", vi: "Buổi học thật tuyệt, {name}!" },
  endHeroQuiet: { en: "Thank you for coming today, {name} 🌿", vi: "Cảm ơn bạn đã đến lớp hôm nay, {name}" },
  starsTodayN: { en: "{n} ⭐ from {k} finished", vi: "{n} sao từ {k} bài đã xong" },
  watered: { en: "Plants watered today 💧", vi: "Cây đã được tưới hôm nay" },
  better: { en: "You are getting better", vi: "Bạn đang tiến bộ" },
  before: { en: "Before", vi: "Trước đây" },
  today: { en: "Today", vi: "Hôm nay" },
  tell: { en: "Tell your teacher one thing you learned today.", vi: "Hãy kể cho giáo viên một điều bạn đã học hôm nay." },
  finishBtn: { en: "Finish ✓", vi: "Kết thúc" },
  comeBack: { en: "Come back next week. Practise again to remember. 🌱", vi: "Hẹn bạn tuần sau. Ôn lại để nhớ lâu nhé." },
  nothingYet: { en: "Every visit helps your garden grow.", vi: "Mỗi lần bạn đến lớp là khu vườn lại xanh thêm." },

  // Ask
  ask: { en: "Ask teacher", vi: "Hỏi giáo viên" },
  asked: { en: "Teacher is coming", vi: "Giáo viên sắp đến" },
  askTitle: { en: "How can we help?", vi: "Bạn cần giúp gì?" },
  askPrivate: { en: "🔒 Only your teacher sees this.", vi: "Chỉ giáo viên mới thấy." },
  askFree: { en: "Asking never costs stars.", vi: "Hỏi bao nhiêu cũng không mất sao." },
  askStuck: { en: "I'm stuck", vi: "Tôi bị kẹt rồi" },
  askMore: { en: "I want to learn more", vi: "Tôi muốn học thêm" },
  askMate: { en: "Ask a classmate", vi: "Hỏi bạn cùng lớp" },
  askSent: { en: "Your teacher will come to you 🙂", vi: "Giáo viên sẽ đến giúp bạn." },
  askSentMore: { en: "Your teacher will come and show you more 🙂", vi: "Giáo viên sẽ đến chỉ thêm cho bạn." },
  askMateFound: { en: "{name} knows this! You can ask them.", vi: "{name} biết làm việc này! Bạn có thể hỏi bạn ấy." },
  askMateNone: { en: "Your teacher will find someone to help you 🙂", vi: "Giáo viên sẽ tìm người giúp bạn." },
  askDone: { en: "✓ I'm OK now", vi: "Tôi ổn rồi" },
  askThanks: { en: "Great. Keep going! 🌱", vi: "Tốt quá. Làm tiếp nhé!" },
  askFail: { en: "That did not send. Please try again.", vi: "Chưa gửi được. Bạn thử lại nhé." },
  askWaiting: { en: "You asked your teacher. They will come soon.", vi: "Bạn đã hỏi giáo viên. Giáo viên sẽ đến ngay thôi." },
};

/**
 * {en, vi} for a key. A var may itself be an {en, vi} pair (e.g. a skill's "I can" text);
 * each language line then takes its own half.
 */
export function gt(key, vars = {}) {
  const entry = GAME_STRINGS[key];
  if (!entry) throw new Error(`Missing game string: ${key}`);
  const pick = (lang) => (s) =>
    s.replace(/\{(\w+)\}/g, (_, k) => {
      if (!(k in vars)) return `{${k}}`;
      const v = vars[k];
      return v && typeof v === "object" ? String(v[lang] ?? v.en ?? "") : String(v);
    });
  return { en: pick("en")(entry.en), vi: pick("vi")(entry.vi) };
}

export function gbi(key, vars) {
  return biPair(gt(key, vars));
}

export function glabel(key, vars) {
  return labelPair(gt(key, vars));
}
