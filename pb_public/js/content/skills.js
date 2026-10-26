// Content contract: every topic, skill id and item/mission shape the game uses.
// Skill ids are stable. `attempts.skill` and `attempts.item` store them, so never rename one.
//
// Each topic file `js/content/topic-N.js` exports `items` (revision) and `missions`.
//
// ── Revision item ─────────────────────────────────────────────────────────────
// { id: 't1-keys-pick-1', skill: 't1-keys', type, prompt: {en, vi}, hint: {en, vi}, ...payload }
//   type 'pick'     → options: [{id, label?: {en, vi}, img?: string}], answer: optionId
//                     (`img` is an emoji or a path under pb_public/, e.g. 'img/t1/double-click.svg')
//                     figure?: {table: [[text…]…], mark?: {row}|{col}|{cell: [row, col]}} shows a small table
//                     above the choices, with the marked cells shaded (say "the coloured cells" in the prompt)
//   type 'click-ui' → mock: 'word-static' | 'start-menu' | 'explorer', answer: regionId
//                     (region ids are defined by the mini mock, e.g. 'ribbon', 'qat', 'document')
//   type 'order'    → steps: [{id, label: {en, vi}}] in the CORRECT order (the runner shuffles them)
//   type 'do'       → doc (model snapshot or plain text), tabs: ['home'], check(doc, ctx) → bool,
//                     spotlight?: groupId, demo?: script (the Engine API in phase-02)
//   type 'fix'      → text: string (start), accept: [string] (exact, after trimming), or check(text) → bool
//   type 'sort'     → bins: [{id, label: {en, vi}}], cards: [{id, label: {en, vi}, bin: binId}]
// Every item may have `replay: {mock, doc?, script}`, played after the answer (see the demo script contract in phase-03,
// "Feedback round 1"). Script steps: {target, click?}, {select}, {type, at?}, {key}, {say}, {wait}.
// Revision tries: a wrong try 1 gets the gentle "Not yet" toast, a wrong try 2 shows `hint`, and a wrong try 3 reveals the answer,
// which the learner then does. Stars: right on try 1 = 3, try 2 = 2, after the hint or reveal = 1 (game-rules.md).
//
// ── Mission ───────────────────────────────────────────────────────────────────
// { id: 't1-m-about-me', skill: 't1-sentence', title: {en, vi}, scenario: {en, vi},
//   mock?: 'word' (default) | 'explorer',
//   startDoc, targetDoc,            // model snapshots or plain text; targetDoc draws the "Make it look like this" picture
//   tabs: ['home'], title_bar?: 'About_Me_Lan',
//   steps: [{ text: {en, vi}, done(doc, ctx) → bool, hint: {en, vi}, spotlight?: groupId, demo?: script }],
//   goal: { check(doc, ctx) → bool, progress(doc, ctx) → 0..1 } }
// `ctx` is built by the mission screen from engine events: { saved: {folder: [..], name} | null,
// opened: string | null, learner: {name}, selection: {anchor, focus}, commands: string[] }.
// Both revision and mission predicates receive the current selection and real command ids; ghost demos
// and menu openings do not count as learner actions. Backstage Save As emits `saved`; Explorer emits `opened`.
// Predicates using runsMatching() must also check `.length > 0` (an empty match `.every()` is true).
// Capstone missions (Topic 8) may add `skill` per step. Each step's stars then count for that step's skill.
//
// Clear purpose: every prompt starts with a short real-life goal (why), then asks ONE clear thing (what). Order items name
// the job, never "start at X, end at Y". An item that starts midway says where the learner is and shows it (a mini mock or a picture).
// All learner-facing text is {en, vi}. Vietnamese is natural, not word for word, and never says "draft"/"nháp".

export const ITEM_TYPES = ["pick", "click-ui", "order", "do", "fix", "sort"];

export const TOPICS = [
  { n: 1, title: { en: "Getting started", vi: "Làm quen với Word" } },
  { n: 2, title: { en: "Typing and editing", vi: "Gõ chữ và sửa chữ" } },
  { n: 3, title: { en: "Formatting", vi: "Định dạng chữ" } },
  { n: 4, title: { en: "Lists and simple documents", vi: "Danh sách và văn bản đơn giản" } },
  { n: 5, title: { en: "Tables and page layout", vi: "Bảng và bố cục trang" } },
  { n: 6, title: { en: "Pictures", vi: "Hình ảnh" } },
  { n: 7, title: { en: "Templates and saving safely", vi: "Mẫu có sẵn và lưu tệp an toàn" } },
  { n: 8, title: { en: "A real-life document", vi: "Làm một văn bản thực tế" } },
  { n: 9, title: { en: "Review", vi: "Ôn tập" } },
];

// `extra: true` marks skills beyond the module spine. `mission: false` means the skill has revision items only.
// `optional: true` lets a learner skip its items in a round without an attempt (not every learner needs it).
export const SKILLS = [
  // Topic 1
  { id: "t1-screen-parts", topic: 1, mission: false, ican: { en: "name the Ribbon, Quick Access Toolbar and document area", vi: "gọi đúng tên Ribbon, Quick Access Toolbar và vùng gõ chữ" } },
  { id: "t1-mouse-clicks", topic: 1, mission: false, ican: { en: "tell a single-click from a double-click", vi: "phân biệt bấm một lần và bấm đúp chuột" } },
  { id: "t1-open-word", topic: 1, mission: false, ican: { en: "open Word and a blank document", vi: "mở Word và tạo một văn bản trống" } },
  { id: "t1-keys", topic: 1, ican: { en: "use Space, Enter, Backspace, Shift and full stop", vi: "dùng phím cách, Enter, Backspace, Shift và dấu chấm" } },
  { id: "t1-sentence", topic: 1, ican: { en: "write a sentence with a capital letter and a full stop", vi: "viết một câu có chữ hoa ở đầu và dấu chấm ở cuối" } },
  { id: "t1-save", topic: 1, ican: { en: "save a new document in Documents", vi: "lưu văn bản mới vào thư mục Documents" } },
  { id: "t1-file-names", topic: 1, mission: false, ican: { en: "choose a good file name", vi: "đặt tên tệp dễ nhớ, dễ tìm" } },
  { id: "t1-find-file", topic: 1, ican: { en: "find my saved file again", vi: "tìm lại tệp mình đã lưu" } },
  { id: "t1-zoom", topic: 1, extra: true, ican: { en: "zoom in and out to see better", vi: "phóng to, thu nhỏ để nhìn rõ hơn" } },
  // Topic 2
  { id: "t2-backspace-delete", topic: 2, ican: { en: "use Backspace (left) and Delete (right)", vi: "dùng Backspace (xoá bên trái) và Delete (xoá bên phải)" } },
  { id: "t2-capitals", topic: 2, ican: { en: "use Shift for capitals, and turn Caps Lock on and off", vi: "dùng Shift để viết hoa, bật và tắt Caps Lock" } },
  { id: "t2-move-cursor", topic: 2, ican: { en: "click to move the cursor and fix a mistake", vi: "bấm chuột để đưa con trỏ tới chỗ sai và sửa lại" } },
  { id: "t2-spelling", topic: 2, ican: { en: "fix a word with a red wavy line using right-click", vi: "sửa chữ bị gạch đỏ bằng cách bấm chuột phải" } },
  { id: "t2-punctuation", topic: 2, ican: { en: "use full stops and commas correctly", vi: "dùng dấu chấm và dấu phẩy cho đúng" } },
  { id: "t2-undo-redo", topic: 2, extra: true, ican: { en: "undo and redo", vi: "dùng Undo và Redo" } },
  { id: "t2-copy-paste", topic: 2, extra: true, ican: { en: "copy, cut and paste", vi: "sao chép, cắt và dán" } },
  // Topic 3
  { id: "t3-select", topic: 3, ican: { en: "select a word, a line, or everything", vi: "bôi đen một chữ, một dòng hoặc tất cả" } },
  { id: "t3-bold-italic-underline", topic: 3, ican: { en: "make words bold, italic or underlined", vi: "làm chữ in đậm, in nghiêng hoặc gạch chân" } },
  { id: "t3-font-size", topic: 3, ican: { en: "change the font and size", vi: "đổi kiểu chữ và cỡ chữ" } },
  { id: "t3-font-colour", topic: 3, ican: { en: "change the font colour (dark colours are easy to read)", vi: "đổi màu chữ (màu đậm dễ đọc hơn)" } },
  { id: "t3-highlight", topic: 3, extra: true, ican: { en: "highlight words", vi: "tô nền nổi bật cho chữ" } },
  { id: "t3-align", topic: 3, ican: { en: "align text left, centre or right", vi: "canh chữ trái, giữa hoặc phải" } },
  { id: "t3-line-spacing", topic: 3, ican: { en: "change the line spacing", vi: "đổi khoảng cách giữa các dòng" } },
  { id: "t3-clear-format", topic: 3, extra: true, ican: { en: "clear formatting", vi: "xoá định dạng chữ" } },
  { id: "t3-change-case", topic: 3, extra: true, ican: { en: "change between capitals and small letters", vi: "đổi chữ hoa thành chữ thường và ngược lại" } },
  { id: "t3-indent", topic: 3, extra: true, ican: { en: "increase or decrease the indent", vi: "tăng hoặc giảm thụt lề" } },
  // Topic 4
  { id: "t4-bullets", topic: 4, ican: { en: "make a bullet list", vi: "làm danh sách có dấu chấm đầu dòng" } },
  { id: "t4-numbering", topic: 4, ican: { en: "make a numbered list", vi: "làm danh sách đánh số" } },
  { id: "t4-end-list", topic: 4, ican: { en: "end a list by pressing Enter twice", vi: "kết thúc danh sách bằng cách nhấn Enter hai lần" } },
  { id: "t4-note", topic: 4, ican: { en: "write a note with a greeting, a message and a sign-off", vi: "viết một lời nhắn có lời chào, nội dung và lời kết" } },
  { id: "t4-heading-sign", topic: 4, ican: { en: "make a heading or sign big, bold and centred", vi: "làm tiêu đề hay bảng thông báo to, đậm và canh giữa" } },
  // Topic 5
  { id: "t5-table-words", topic: 5, mission: false, ican: { en: "tell a row, a column and a cell apart", vi: "phân biệt hàng, cột và ô trong bảng" } },
  { id: "t5-insert-table", topic: 5, ican: { en: "insert a table", vi: "chèn bảng" } },
  { id: "t5-table-type", topic: 5, ican: { en: "type in a table and use Tab to go to the next cell", vi: "gõ chữ vào bảng và nhấn Tab để sang ô tiếp theo" } },
  { id: "t5-row-col", topic: 5, ican: { en: "add or delete a row or column", vi: "thêm hoặc xoá hàng, cột" } },
  { id: "t5-orientation", topic: 5, ican: { en: "choose portrait or landscape", vi: "chọn trang dọc hoặc trang ngang" } },
  { id: "t5-margins", topic: 5, ican: { en: "change the margins", vi: "đổi lề trang" } },
  // Topic 6
  { id: "t6-insert-picture", topic: 6, ican: { en: "insert a picture", vi: "chèn hình ảnh" } },
  { id: "t6-resize", topic: 6, ican: { en: "make a picture bigger or smaller with a corner dot, so it doesn't stretch", vi: "kéo chấm tròn ở góc để làm hình to hơn hay nhỏ hơn mà hình không bị méo" } },
  { id: "t6-move-wrap", topic: 6, ican: { en: "move a picture anywhere with Wrap Text › In Front of Text", vi: "dùng Wrap Text › In Front of Text để kéo hình đi chỗ nào cũng được" } },
  { id: "t6-delete-picture", topic: 6, mission: false, ican: { en: "delete a picture", vi: "xoá hình" } },
  { id: "t6-unikey", topic: 6, mission: false, optional: true, ican: { en: "type Vietnamese with the VNI number keys", vi: "gõ tiếng Việt kiểu VNI bằng phím số" } },
  // Topic 7
  { id: "t7-template", topic: 7, ican: { en: "find and open a template", vi: "tìm và mở một mẫu có sẵn" } },
  { id: "t7-placeholder", topic: 7, ican: { en: "replace the sample text in a template", vi: "thay chữ mẫu bằng thông tin của mình" } },
  { id: "t7-save-version", topic: 7, ican: { en: "save a new version with Save As", vi: "dùng Save As để lưu thành bản mới" } },
  { id: "t7-print", topic: 7, extra: true, ican: { en: "print a document", vi: "in văn bản" } },
  // Topic 8
  { id: "t8-plan-doc", topic: 8, mission: false, ican: { en: "plan a document: what it is, who it's for, and its heading", vi: "lên ý cho văn bản: loại gì, viết cho ai, tiêu đề là gì" } },
  { id: "t8-capstone", topic: 8, ican: { en: "make a real-life document from start to finish", vi: "tự làm một văn bản thực tế từ đầu đến cuối" } },
  // Topic 9 has no new skills. It's the "Revise everything" preset.
];

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export function skillById(id) {
  return BY_ID.get(id) ?? null;
}

export function skillsOfTopic(n) {
  return SKILLS.filter((s) => s.topic === n);
}

/** Loads a topic's content. A topic whose file isn't written yet has no items and no missions. */
export async function loadTopic(n) {
  try {
    const mod = await import(`./topic-${n}.js`);
    return { items: mod.items ?? [], missions: mod.missions ?? [] };
  } catch (err) {
    if (err instanceof TypeError || err?.name === "TypeError") return { items: [], missions: [] };
    throw err;
  }
}
