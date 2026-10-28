// Learner strings for the game screens (revision, missions, success, garden, end, Ask).
// English first, natural Vietnamese second. Shared shell strings stay in i18n.js.
// gt(key, vars) -> {en, vi}; gbi(key, vars) -> HTML with the .vi line; glabel(key, vars) -> aria/title text.

import { biPair, labelPair } from "./i18n.js";

export const GAME_STRINGS = {
  icanChecklist: { en: "I can…", vi: "Tôi biết…" },
  checklistMastered: { en: "I can do this", vi: "Tôi đã làm được" },
  checklistLearning: { en: "Still learning", vi: "Tôi đang luyện tập" },
  // Shared
  finish: { en: "Finish for today", vi: "Hôm nay học đến đây" },
  next: { en: "Next ▶", vi: "Tiếp theo" },
  check: { en: "Check ✓", vi: "Kiểm tra" },
  skipOptional: { en: "Skip, this one is optional", vi: "Bỏ qua, câu này không bắt buộc" },
  backHome: { en: "Back to home", vi: "Về trang chủ" },
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
  missionsDoneTitle: { en: "You have done every mission for today", vi: "Hôm nay bạn đã làm xong hết nhiệm vụ" },
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
  revealOrder: { en: "The numbers show the order. Now you tap the steps 1, 2, 3…", vi: "Các con số cho biết thứ tự. Giờ bạn bấm lần lượt các bước theo số 1, 2, 3…" },
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
  sortCount: { en: "{n} of {total}", vi: "({n}/{total})" },
  fixLabel: { en: "Fix the words here", vi: "Sửa lại chữ ở đây" },
  mockSoon: { en: "Practice picture", vi: "Hình luyện tập" },
  regionN: { en: "Part {n}", vi: "Phần {n}" },


  // Mission
  missionN: { en: "🧩 Mission {n} of {total}", vi: "Nhiệm vụ {n}/{total}" },
  missionOne: { en: "🧩 Mission", vi: "Nhiệm vụ" },
  lookLike: { en: "Make it look like this →", vi: "Làm cho giống hình này →" },
  goalPicture: { en: "Goal picture", vi: "Hình mẫu" },
  enlargeGoalPicture: { en: "Enlarge goal picture", vi: "Bấm để xem hình mẫu lớn hơn" },
  closeGoalPicture: { en: "Close picture", vi: "Đóng hình mẫu" },
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
  aboutMission: { en: "📖 About this mission", vi: "Giới thiệu nhiệm vụ" },
  enlargeBadge: { en: "🔍 Click to enlarge", vi: "Bấm để phóng to" },
  stepProgress: { en: "Step {n} of {total}", vi: "Bước {n}/{total}" },
  chooseMission: { en: "🧩 Choose mission", vi: "Chọn nhiệm vụ" },
  pickMissionTitle: { en: "Choose a mission", vi: "Chọn một nhiệm vụ" },
  watchReplay: { en: "▶ Watch how it is done", vi: "Xem cách làm" },
  helpIdea: { en: "💡 Help me", vi: "Giúp tôi" },
  stepAria: { en: "Step {n}", vi: "Bước {n}" },
  stepDoneAria: { en: "Step {n}, done", vi: "Bước {n}, đã xong" },

  // Success
  headClean: { en: "Well done! 🌟", vi: "Làm tốt lắm!" },
  headHelp: { en: "You did it yourself! 🌿", vi: "Bạn đã tự làm được!" },
  headTried: { en: "You didn't give up! 💪", vi: "Bạn đã kiên trì đến cùng!" },
  headWatered: { en: "Your plant is watered 💧", vi: "Cây của bạn đã được tưới nước" },
  newBadge: { en: "New: I can {ican} ✅", vi: "Mới: Tôi biết {ican}" },
  starsLabel: { en: "{n} of 3 stars", vi: "{n} trên 3 sao" },
  toEnd: { en: "See my session ▶", vi: "Xem kết quả buổi học" },
  toGarden: { en: "Back to my garden ▶", vi: "Về khu vườn của tôi" },

  // Garden
  plantsN: { en: "{n} plants", vi: "{n} cây" },
  plantsOne: { en: "1 plant", vi: "1 cây" },
  youGrow: { en: "You grow: {plant}", vi: "Bạn trồng: {plant}" },
  needWater: { en: "💧 {n} need water", vi: "{n} cây cần tưới" },
  needWaterOne: { en: "💧 1 needs water", vi: "1 cây cần tưới" },
  tapPlant: { en: "👆 Tap a plant", vi: "Bấm vào một cây" },
  howGrowTab: { en: "🌱 Grow", vi: "Trồng cây" },
  howGrow: { en: "How your plant grows", vi: "Cây của bạn lớn lên thế nào" },
  grow_seed: { en: "Not tried yet", vi: "Chưa thử" },
  grow_sprout: { en: "Do it once", vi: "Làm một lần" },
  grow_leafy: { en: "Practise it again on another day", vi: "Luyện lại vào một ngày khác" },
  grow_bud: { en: "Get ⭐⭐⭐ once", vi: "Được 3 sao một lần" },
  grow_flowering: { en: "⭐⭐⭐ again on another day", vi: "Được 3 sao lần nữa vào ngày khác" },
  grow_wilted: { en: "Not practised for a while? It gets thirsty. Practise again to water it.", vi: "Lâu không luyện, cây sẽ khát nước. Luyện lại là tưới cây." },
  grow_stars: {
    en: "⭐⭐⭐ = right first time, with no help. “Show me” = ⭐. Practise again another day to earn more stars!",
    vi: "3 sao = đúng ngay lần đầu, không cần giúp. “Chỉ cho tôi xem” = 1 sao. Hôm khác luyện lại là được thêm sao nhé!",
  },
  stage_seed: { en: "Seed", vi: "Hạt giống" },
  stage_sprout: { en: "Sprout", vi: "Nảy mầm" },
  stage_leafy: { en: "Leafy", vi: "Ra lá" },
  stage_bud: { en: "Bud", vi: "Ra nụ" },
  stage_flowering: { en: "Flowering", vi: "Ra hoa" },
  stage_wilted: { en: "Needs water", vi: "Cần tưới nước" },
  chip_seed: { en: "🌰 Seed: not tried yet", vi: "Hạt giống: chưa thử" },
  chip_sprout: { en: "🌱 Sprout", vi: "Nảy mầm" },
  chip_leafy: { en: "🌿 Leafy", vi: "Ra lá" },
  chip_bud: { en: "🌷 Bud: nearly there!", vi: "Ra nụ: sắp nở rồi!" },
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
  kitchenNote: { en: "Finish a topic to cook its dish. For the feast, answer every question in a full Revise everything round.", vi: "Học xong mỗi chủ đề, bạn sẽ nấu được một món. Để có nồi lẩu, hãy trả lời hết các câu trong một lượt Ôn lại tất cả (Revise everything)." },
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
  endHero: { en: "⭐ Great session, {name}! 🌿", vi: "⭐ Hôm nay {name} học tốt lắm! 🌿" },
  endHeroQuiet: { en: "Thank you for coming today, {name} 🌿", vi: "Cảm ơn {name} đã đến lớp hôm nay nhé! 🌿" },
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
  askStuck: { en: "I'm stuck", vi: "Tôi chưa làm được" },
  askMore: { en: "I want to learn more", vi: "Tôi muốn học thêm" },
  askMate: { en: "Ask a classmate", vi: "Hỏi bạn cùng lớp" },
  askSent: { en: "Your teacher will come to you 🙂", vi: "Giáo viên sẽ đến giúp bạn." },
  askSentMore: { en: "Your teacher will come and show you more 🙂", vi: "Giáo viên sẽ đến chỉ thêm cho bạn." },
  askMateFound: { en: "{name} knows this! You can ask them.", vi: "{name} đã làm được phần này rồi! Bạn có thể nhờ {name} chỉ giúp nhé." },
  askMateNone: { en: "Your teacher will find someone to help you 🙂", vi: "Giáo viên sẽ tìm người giúp bạn." },
  askDone: { en: "✓ I'm OK now", vi: "Tôi làm được rồi" },
  askThanks: { en: "Great. Keep going! 🌱", vi: "Tốt quá. Làm tiếp nhé!" },
  askFail: { en: "That did not send. Please try again.", vi: "Chưa gửi được. Bạn thử lại nhé." },
  askWaiting: { en: "You asked your teacher. They will come soon.", vi: "Bạn đã hỏi giáo viên. Giáo viên sẽ đến sớm thôi." },
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

export const STAR_PRESETS = {
  "Great work today!": { en: "Great work today!", vi: "Hôm nay làm bài tốt lắm!" },
  "You are getting better every week.": { en: "You are getting better every week.", vi: "Mỗi tuần bạn đều tiến bộ hơn." },
  "Well done for not giving up.": { en: "Well done for not giving up.", vi: "Rất đáng khen vì bạn đã không bỏ cuộc." },
  "Thank you for helping a classmate.": { en: "Thank you for helping a classmate.", vi: "Cảm ơn bạn đã giúp bạn cùng lớp." },
};
