// Learner-facing strings of the Word engine: English first, natural Vietnamese second.
// Word's own UI labels (ribbon, menus, dialogs) stay in English, as on the classroom laptops,
// and live next to the ribbon data instead.

import { biPair, esc, labelPair } from "../i18n.js";

const S = {
  levelC: {
    en: "This one works in real Word. Ask your teacher to show you 💡",
    vi: "Nút này dùng được trong Word thật. Hãy nhờ giáo viên chỉ cho bạn nhé 💡",
  },
  wrong: {
    en: "That made the words {effect}. Not this one 🙂",
    vi: "Nút vừa bấm làm chữ {effect}. Chưa đúng nút rồi 🙂",
  },
  nearlyWrong: {
    en: "Nearly! That made the word “{word}” {effect}. Not this one 🙂",
    vi: "Gần đúng rồi! Nút vừa bấm làm chữ “{word}” {effect}. Chưa đúng nút rồi 🙂",
  },
  wrongOff: {
    en: "That turned {name} off. Not this one 🙂",
    vi: "Nút vừa bấm đã tắt {name}. Chưa đúng nút rồi 🙂",
  },
  nearlyWrongOff: {
    en: "Nearly! That turned {name} off for the word “{word}”. Not this one 🙂",
    vi: "Gần đúng rồi! Nút vừa bấm đã tắt {name} ở chữ “{word}”. Chưa đúng nút rồi 🙂",
  },
  nearlyPart: {
    en: "Nearly! Only the word “{word}” changed. Select all the words first, then try again.",
    vi: "Gần đúng rồi! Chỉ có chữ “{word}” thay đổi. Hãy bôi đen hết các chữ trước, rồi thử lại.",
  },
  undo: { en: "↶ Undo", vi: "Hoàn tác" },
  undone: { en: "Undone ✓ Back as it was.", vi: "Đã hoàn tác ✓ Mọi thứ trở lại như cũ." },
  nothingToUndo: { en: "Nothing to undo yet.", vi: "Chưa có gì để hoàn tác." },
  nothingToRedo: { en: "Nothing to redo.", vi: "Chưa có gì để làm lại." },
  selectFirst: { en: "Select some words first 🖱️", vi: "Hãy bôi đen chữ trước nhé 🖱️" },
  copyFirst: { en: "Copy or cut some words first 🙂", vi: "Hãy sao chép hoặc cắt chữ trước nhé 🙂" },
  copied: { en: "Copied ✓ Now click where you want it, then Paste.", vi: "Đã sao chép ✓ Bấm vào chỗ muốn dán, rồi bấm Paste." },
  painterOn: {
    en: "Now select the words that should look the same.",
    vi: "Bây giờ hãy bôi đen những chữ muốn có cùng kiểu.",
  },
  stylesLater: {
    en: "Styles change the look of a whole paragraph at once. You will learn them in a later lesson.",
    vi: "Styles đổi kiểu cho cả đoạn văn cùng lúc. Bạn sẽ học phần này ở bài sau.",
  },
  practiceTip: {
    en: "In this practice, use the buttons on the ribbon to make changes.",
    vi: "Trong bài luyện tập này, hãy dùng các nút trên Ribbon (thanh công cụ).",
  },
  saveLater: {
    en: "Saving comes in a later mission.",
    vi: "Phần lưu tệp sẽ học ở nhiệm vụ sau.",
  },
  watch: { en: "Watch", vi: "Xem nhé" },
  yourTurn: { en: "Your turn! Now you try the same steps.", vi: "Đến lượt bạn! Giờ bạn tự làm lại các bước này nhé." },
  okMyTurn: { en: "OK, my turn", vi: "Được, để tôi làm" },
  showAgain: { en: "▶ Show me again", vi: "Chỉ lại cho tôi" },
  hintTitle: { en: "Hint", vi: "Gợi ý" },
  close: { en: "Close", vi: "Đóng" },
  lookHere: { en: "Look here", vi: "Nhìn chỗ này" },
};

/** {en, vi} pair with {vars} filled in. `viVars` lets the Vietnamese line use translated values. */
export function ws(key, vars = {}, viVars = vars) {
  const entry = S[key];
  if (!entry) throw new Error(`Missing Word string: ${key}`);
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : `{${k}}`));
  return { en: fill(entry.en, vars), vi: fill(entry.vi, viVars) };
}

/** HTML: English line plus the Vietnamese line in a .vi span (hidden by the Vietnamese toggle). */
export function wbi(key, vars, viVars) {
  return biPair(ws(key, vars, viVars));
}

export { biPair, esc, labelPair };
