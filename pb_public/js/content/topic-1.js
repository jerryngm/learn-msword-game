// Topic 1: Getting started. Revision items and missions (shapes: see skills.js).
// Windows and Word names stay in English in both languages (File, Save As, Browse, Documents, Ribbon, Shift...),
// because the learners meet them in English on the class laptops.

import { textOf } from "../word/model.js";

/* ---------- predicate helpers ---------- */

// Plain-text version of a name for comparing: no accents, no spaces, no punctuation, lower case.
const plain = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * True when `name` looks like About_Me_<a name>. Spaces, capitals and a typed .docx don't matter.
 * Any name after About Me is accepted: the name a learner joined with may be a nickname, not the one they type.
 */
function isAboutMeName(name) {
  const n = plain(String(name ?? "").replace(/\.docx$/i, ""));
  return n.startsWith("aboutme") && n.length >= "aboutme".length + 2;
}

/** Word keeps the zoom and the Backstage in its own DOM; steps read them there (the screens re-check on change). */
const zoomNow = () => Number.parseInt(document.querySelector(".wd-zl")?.textContent ?? "100", 10) || 100;
/** Show-me scripts for the Save As steps point at things that only exist once the Backstage is open, so each reads the DOM when the script is built. */
const has = (sel) => Boolean(document.querySelector(sel));
const saveStage = () => document.querySelector(".bs")?.dataset.stage ?? "";
const typedFileName = () => document.querySelector(".bs .sa-name")?.value ?? "";
const savedInDocuments = (ctx) => Boolean(ctx.saved && ctx.saved.folder.length === 1 && ctx.saved.folder[0] === "Documents");
const savedOk = (ctx) => savedInDocuments(ctx) && isAboutMeName(ctx.saved.name);

const cap = /^\p{Lu}/u;
/** Splits text into sentences (up to and including . ! ?). A last piece with no end mark still counts as a piece. */
const sentencesOf = (text) => (String(text).match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
const goodSentence = (s) => cap.test(s) && /[.!?]$/.test(s) && /\s/.test(s);

/** fix check: same words as the model (any capitals), but the start is a capital and the end a full stop. */
const sentenceFix = (model) => (text) => {
  const t = String(text).trim().replace(/\s+/g, " ");
  return cap.test(t) && t.endsWith(".") && t.toLowerCase() === model.toLowerCase();
};

const progressOf = (steps) => (doc, ctx) => steps.filter((s) => s.done(doc, ctx)).length / steps.length;

const T = (en, vi) => ({ en, vi });
const say = (en, vi) => ({ say: { en, vi } });
// Demo / replay script steps (the shared player's contract): click a target, type text (at a target), light a key.
const go = (target, click = "single") => ({ target, click });
const typ = (text, at) => (at ? { type: text, at } : { type: text });
const key = (k) => ({ key: k });

/** First name as the demos type it: plain A-Z (the class keyboard is English), capitalised. "Lan" when the screen gave no name. */
const asciiFirst = (name) => {
  const t = String(name ?? "").trim().split(/\s+/)[0] ?? "";
  const a = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z]/g, "");
  return a ? a[0].toUpperCase() + a.slice(1).toLowerCase() : "";
};
/** Mission steps remember the learner's name each time the screen checks them, so a later Show me types that name. */
let demoWho = "Lan";
const withWho = (fn) => (doc, ctx) => {
  demoWho = asciiFirst(ctx?.learner?.name) || "Lan";
  return fn(doc, ctx);
};

/* ---------- revision items ---------- */

const ITEMS = [
  // t1-screen-parts
  {
    id: "t1-screen-parts-ribbon",
    skill: "t1-screen-parts",
    type: "click-ui",
    mock: "word-static",
    prompt: T(
      "You want to find a button. All the buttons are in one area, the Ribbon. Click the Ribbon.",
      "Bạn muốn tìm một nút lệnh. Các nút nằm trong khu vực gọi là Ribbon (thanh công cụ). Hãy bấm vào Ribbon.",
    ),
    hint: T("The Ribbon is under the words File, Home and Insert.", "Ribbon nằm ngay dưới các chữ File, Home và Insert."),
    answer: "ribbon",
  },
  {
    id: "t1-screen-parts-qat",
    skill: "t1-screen-parts",
    type: "click-ui",
    mock: "word-static",
    prompt: T(
      "You want to find the Save button. Click the Quick Access Toolbar, the small bar at the top left.",
      "Bạn muốn tìm nút Save. Hãy bấm vào Quick Access Toolbar, thanh nhỏ ở góc trên bên trái.",
    ),
    hint: T("Look at the very top left. Find the Save and Undo buttons.", "Nhìn lên góc trên cùng bên trái. Tìm nút Save và nút Undo."),
    answer: "qat",
  },
  {
    id: "t1-screen-parts-document",
    skill: "t1-screen-parts",
    type: "click-ui",
    mock: "word-static",
    prompt: T(
      "You want to type your letter. Click the place where you type, the document area.",
      "Bạn muốn gõ một lá thư. Hãy bấm vào nơi để gõ chữ, gọi là vùng gõ chữ (document area).",
    ),
    hint: T("It is the big white page.", "Đó là trang giấy trắng lớn."),
    answer: "document",
  },

  // t1-mouse-clicks
  {
    id: "t1-mouse-clicks-open",
    skill: "t1-mouse-clicks",
    type: "pick",
    prompt: T(
      "You want to open a file on your computer. Which click opens it?",
      "Bạn muốn mở một tệp trong máy tính. Bấm kiểu nào thì mở được tệp?",
    ),
    hint: T(
      "Click two times, fast. A double-click opens things. One click only chooses.",
      "Bấm hai lần liên tiếp, thật nhanh. Bấm đúp thì mở ra. Bấm một lần chỉ là chọn.",
    ),
    options: [
      { id: "single", label: T("Click once", "Bấm một lần"), img: "img/t1/single-click.svg" },
      { id: "double", label: T("Double-click", "Bấm đúp"), img: "img/t1/double-click.svg" },
    ],
    answer: "double",
  },
  {
    id: "t1-mouse-clicks-single",
    skill: "t1-mouse-clicks",
    type: "pick",
    prompt: T(
      "You are looking at your files. You click one time on a file. What happens?",
      "Bạn đang xem các tệp của mình. Bạn bấm một lần vào một tệp. Điều gì sẽ xảy ra?",
    ),
    hint: T("One click only chooses the file. It turns blue.", "Bấm một lần chỉ là chọn tệp. Tệp sẽ đổi sang màu xanh dương."),
    options: [
      { id: "opens", label: T("It opens", "Tệp mở ra"), img: "📂" },
      { id: "chosen", label: T("It is chosen", "Tệp được chọn"), img: "✅" },
      { id: "deleted", label: T("It is deleted", "Tệp bị xoá"), img: "🗑️" },
    ],
    answer: "chosen",
  },

  // t1-open-word
  {
    id: "t1-open-word-order",
    skill: "t1-open-word",
    type: "order",
    prompt: T(
      "You want to write a new letter. Put the steps in order to open Word with a blank page.",
      "Bạn muốn viết một lá thư mới. Hãy sắp xếp các bước để mở Word với một trang trống.",
    ),
    hint: T(
      "Start with the Windows key. It is on the bottom row of the keyboard, next to Ctrl and Alt.",
      "Bắt đầu bằng phím Windows. Phím này nằm ở hàng dưới cùng của bàn phím, gần phím Ctrl và Alt.",
    ),
    steps: [
      { id: "windows", label: T("Press the Windows key", "Nhấn phím Windows") },
      { id: "type", label: T("Type: Word", "Gõ chữ: Word") },
      { id: "word", label: T("Click Word", "Bấm vào Word") },
      { id: "blank", label: T("Click Blank document", "Bấm vào Blank document") },
    ],
  },
  {
    id: "t1-open-word-start",
    skill: "t1-open-word",
    type: "click-ui",
    mock: "start-menu",
    prompt: T(
      "You want to write a letter. You pressed the Windows key and typed Word. Now click Word.",
      "Bạn muốn viết thư. Bạn đã nhấn phím Windows và gõ chữ Word. Giờ hãy bấm vào Word.",
    ),
    hint: T("Look at the top of the list, under Best match.", "Nhìn lên đầu danh sách, ngay dưới chữ Best match."),
    answer: "word-app",
  },

  // t1-keys
  {
    id: "t1-keys-space",
    skill: "t1-keys",
    type: "pick",
    prompt: T(
      "You are typing two words: Hello Lan. Which key makes a gap between the two words?",
      "Bạn đang gõ hai chữ: Hello Lan. Phím nào tạo khoảng cách giữa hai chữ?",
    ),
    hint: T("It is the longest key at the bottom of the keyboard.", "Đó là phím dài nhất ở phía dưới bàn phím."),
    options: [
      { id: "enter", label: T("Enter", "Enter") },
      { id: "space", label: T("Space bar", "Phím cách (Space bar)") },
      { id: "backspace", label: T("Backspace", "Backspace") },
      { id: "shift", label: T("Shift", "Shift") },
    ],
    answer: "space",
  },
  {
    id: "t1-keys-enter",
    skill: "t1-keys",
    type: "pick",
    prompt: T(
      "You finished one line and want to start the next line. Which key moves you to a new line?",
      "Bạn đã gõ xong một dòng và muốn viết dòng tiếp theo. Phím nào giúp xuống dòng?",
    ),
    hint: T("It is on the right side of the keyboard. It says Enter.", "Phím này ở phía bên phải bàn phím, có chữ Enter."),
    options: [
      { id: "shift", label: T("Shift", "Shift") },
      { id: "backspace", label: T("Backspace", "Backspace") },
      { id: "enter", label: T("Enter", "Enter") },
      { id: "space", label: T("Space bar", "Phím cách (Space bar)") },
    ],
    answer: "enter",
  },
  {
    id: "t1-keys-backspace",
    skill: "t1-keys",
    type: "pick",
    prompt: T(
      "You typed a wrong letter by mistake and want to rub it out. Which key do you press?",
      "Bạn lỡ gõ sai một chữ và muốn xoá đi. Bạn nhấn phím nào?",
    ),
    hint: T(
      "Backspace is at the top right of the letters. It has an arrow pointing left.",
      "Phím Backspace nằm phía trên bên phải các phím chữ, có mũi tên chỉ sang trái.",
    ),
    options: [
      { id: "backspace", label: T("Backspace", "Backspace") },
      { id: "enter", label: T("Enter", "Enter") },
      { id: "space", label: T("Space bar", "Phím cách (Space bar)") },
      { id: "shift", label: T("Shift", "Shift") },
    ],
    answer: "backspace",
  },
  {
    id: "t1-keys-shift",
    skill: "t1-keys",
    type: "pick",
    prompt: T(
      "Your name starts with a capital letter, like A. How do you type a capital A?",
      "Tên của bạn bắt đầu bằng chữ hoa, ví dụ chữ A. Làm sao để gõ chữ A hoa?",
    ),
    hint: T("Shift makes capital letters. Hold it down while you press the letter.", "Phím Shift dùng để gõ chữ hoa. Giữ Shift trong lúc nhấn phím chữ."),
    options: [
      { id: "enter", label: T("Press Enter, then A", "Nhấn Enter, rồi nhấn A") },
      { id: "shift", label: T("Hold Shift and press A", "Giữ Shift và nhấn A") },
      { id: "space", label: T("Press Space bar, then A", "Nhấn phím cách, rồi nhấn A") },
    ],
    answer: "shift",
  },
  {
    id: "t1-keys-do-capital",
    skill: "t1-keys",
    type: "do",
    prompt: T(
      "You want to write a greeting to your teacher. Type the word Hello with a capital H.",
      "Bạn muốn viết lời chào gửi giáo viên. Hãy gõ chữ Hello, chữ H viết hoa.",
    ),
    hint: T("Hold down Shift, press H, then let go. Now type e, l, l, o.", "Giữ phím Shift, nhấn H rồi thả ra. Sau đó gõ e, l, l, o."),
    doc: "",
    tabs: ["home"],
    check: (doc) => textOf(doc).trim() === "Hello",
    demo: [
      go("doc:0,0"),
      say("Shift for the capital H. Then e, l, l, o.", "Giữ Shift để gõ H hoa. Rồi gõ e, l, l, o."),
      typ("Hello"),
    ],
  },
  {
    id: "t1-keys-do-fullstop",
    skill: "t1-keys",
    type: "do",
    prompt: T(
      "You want to write a short sentence about a drink you like. Type this sentence: I like tea.",
      "Bạn muốn viết một câu ngắn về thức uống bạn thích. Hãy gõ câu này: I like tea.",
    ),
    hint: T(
      "Type the words with a space between them. The full stop key is at the bottom right of the letters, next to the comma.",
      "Gõ các chữ, cách nhau bằng phím cách. Phím dấu chấm nằm ở hàng dưới cùng bên phải, cạnh phím dấu phẩy.",
    ),
    doc: "",
    tabs: ["home"],
    check: (doc) => /^i like tea\.$/i.test(textOf(doc).trim().replace(/\s+/g, " ")),
    demo: [
      go("doc:0,0"),
      say("Space bar between words. Full stop at the end.", "Các chữ cách nhau bằng phím cách. Cuối câu có dấu chấm."),
      typ("I like tea."),
    ],
  },

  // t1-sentence
  {
    id: "t1-sentence-fix-name",
    skill: "t1-sentence",
    type: "fix",
    prompt: T(
      "Your teacher will read this sentence. Fix it: start with a capital letter and end with a full stop.",
      "Giáo viên sẽ đọc câu này. Hãy sửa lại: bắt đầu bằng chữ hoa, kết thúc bằng dấu chấm.",
    ),
    hint: T("Change the first letter to a capital. Then add a full stop (.) at the end.", "Đổi chữ cái đầu thành chữ hoa. Rồi thêm dấu chấm (.) ở cuối câu."),
    text: "my name is lan",
    accept: ["My name is Lan."],
    check: sentenceFix("My name is Lan."),
  },
  {
    id: "t1-sentence-fix-tea",
    skill: "t1-sentence",
    type: "fix",
    prompt: T(
      "You are writing about tea. Fix the sentence: start with a capital letter and end with a full stop.",
      "Bạn đang viết về trà. Hãy sửa câu: bắt đầu bằng chữ hoa, kết thúc bằng dấu chấm.",
    ),
    hint: T("The word I is always a capital. Then add a full stop (.) at the end.", "Chữ I luôn viết hoa. Rồi thêm dấu chấm (.) ở cuối câu."),
    text: "i like to drink tea",
    accept: ["I like to drink tea."],
    check: sentenceFix("I like to drink tea."),
  },

  // t1-save
  {
    id: "t1-save-order-full",
    skill: "t1-save",
    type: "order",
    prompt: T(
      "You wrote a letter and want to keep it. Put the steps in order to save it in the Documents folder.",
      "Bạn đã viết xong một lá thư và muốn giữ lại. Hãy sắp xếp các bước để lưu thư vào thư mục Documents.",
    ),
    hint: T("Start with File at the top left of Word. The last step is Documents.", "Bắt đầu từ File ở góc trên bên trái của Word. Bước cuối cùng là bấm Documents."),
    steps: [
      { id: "file", label: T("Click File", "Bấm File") },
      { id: "saveas", label: T("Click Save As", "Bấm Save As") },
      { id: "browse", label: T("Click Browse", "Bấm Browse") },
      { id: "documents", label: T("Click Documents", "Bấm Documents") },
    ],
  },
  {
    id: "t1-save-order-window",
    skill: "t1-save",
    type: "order",
    prompt: T(
      "The Save As window is open. You want to name your file About_Me. Put the steps in order.",
      "Cửa sổ Save As đang mở. Bạn muốn đặt tên tệp là About_Me. Hãy sắp xếp các bước.",
    ),
    hint: T("First click the File name box, so you can type there. Last, click Save.", "Trước tiên bấm vào ô File name để gõ chữ vào đó. Cuối cùng bấm Save."),
    // A small picture of where the learner is, shown above the steps: the mock is mounted without click handlers and
    // mock.resolve(at) puts it on the right stage (the Save As window, Documents chosen).
    context: { mock: "word-static", at: "sa.name" },
    steps: [
      { id: "namebox", label: T("Click the File name box", "Bấm vào ô File name") },
      { id: "name", label: T("Type the name: About_Me", "Gõ tên tệp: About_Me") },
      { id: "save", label: T("Click Save", "Bấm Save") },
    ],
  },

  // t1-file-names
  {
    id: "t1-file-names-about",
    skill: "t1-file-names",
    type: "pick",
    prompt: T(
      "You wrote a page about yourself and want to find it easily next week. Which file name is best?",
      "Bạn đã viết một trang giới thiệu về mình và muốn tuần sau dễ tìm lại. Tên tệp nào tốt nhất?",
    ),
    hint: T("A good name tells you what is inside. You can find it again easily.", "Tên tốt là tên cho biết bên trong có gì. Nhờ vậy bạn dễ tìm lại."),
    options: [
      { id: "doc1", label: T("document1", "document1") },
      { id: "about", label: T("About_Me_Lan", "About_Me_Lan") },
    ],
    answer: "about",
  },
  {
    id: "t1-file-names-shopping",
    skill: "t1-file-names",
    type: "pick",
    prompt: T(
      "You wrote your shopping list. Which file name will help you find it next week?",
      "Bạn đã viết xong danh sách đi chợ. Tên tệp nào giúp bạn dễ tìm lại vào tuần sau?",
    ),
    hint: T("Choose the name with real words that say what the file is.", "Hãy chọn tên có chữ rõ nghĩa, nói lên tệp đó là gì."),
    options: [
      { id: "asdf", label: T("asdf", "asdf") },
      { id: "shopping", label: T("Shopping_List", "Shopping_List") },
      { id: "new", label: T("new (1)", "new (1)") },
    ],
    answer: "shopping",
  },
  {
    id: "t1-file-names-letter",
    skill: "t1-file-names",
    type: "pick",
    prompt: T(
      "You wrote a letter to your bank in May and want to find it again later. Which file name is best?",
      "Bạn viết một lá thư gửi ngân hàng vào tháng Năm và muốn dễ tìm lại sau này. Tên tệp nào tốt nhất?",
    ),
    hint: T("A good name says what it is and when. You can join the words with a space or _ .", "Tên tốt cho biết đó là tệp gì và làm lúc nào. Giữa các chữ có thể dùng dấu cách hoặc dấu gạch dưới (_)."),
    options: [
      { id: "doc1", label: T("doc1", "doc1") },
      { id: "letter", label: T("letter", "letter") },
      { id: "bank", label: T("Bank_Letter_May2025", "Bank_Letter_May2025") },
    ],
    answer: "bank",
  },

  // t1-find-file
  {
    id: "t1-find-file-order",
    skill: "t1-find-file",
    type: "order",
    prompt: T(
      "You closed Word. You want to read your saved file again. Put the steps in order to open it.",
      "Bạn đã đóng Word và muốn đọc lại tệp đã lưu. Hãy sắp xếp các bước để mở tệp đó.",
    ),
    hint: T(
      "Start with the yellow folder on the taskbar at the bottom of the screen. The last step opens your file.",
      "Bắt đầu bằng thư mục màu vàng trên thanh taskbar ở cuối màn hình. Bước cuối cùng là mở tệp của bạn.",
    ),
    steps: [
      { id: "explorer", label: T("Open File Explorer (the yellow folder)", "Mở File Explorer (thư mục màu vàng)") },
      { id: "documents", label: T("Click Documents", "Bấm Documents") },
      { id: "open", label: T("Double-click your file", "Bấm đúp vào tệp của bạn") },
    ],
  },
  {
    id: "t1-find-file-documents",
    skill: "t1-find-file",
    type: "click-ui",
    mock: "explorer",
    prompt: T(
      "You want to find your saved file. It is in the Documents folder. Click Documents in the list on the left.",
      "Bạn muốn tìm tệp đã lưu. Tệp nằm trong thư mục Documents. Hãy bấm vào Documents trong danh sách bên trái.",
    ),
    hint: T("Look on the left side. Find the word Documents.", "Nhìn sang bên trái. Tìm chữ Documents."),
    answer: "nav-documents",
  },

  // t1-zoom
  {
    id: "t1-zoom-in",
    skill: "t1-zoom",
    type: "do",
    prompt: T(
      "The words are too small to read. Click the + button at the bottom right until it says 120% or more.",
      "Chữ nhỏ quá, khó đọc. Hãy bấm nút + ở góc dưới bên phải cho đến khi hiện 120% trở lên.",
    ),
    hint: T("The + button is next to the number at the bottom right of Word.", "Nút + nằm cạnh con số ở góc dưới bên phải của Word."),
    doc: "Our class starts at nine o'clock on Tuesday.",
    tabs: ["home"],
    check: () => zoomNow() >= 120,
    spotlight: "status.zoomIn",
    demo: [say("Click the + button at the bottom right.", "Bấm nút + ở góc dưới bên phải."), go("status.zoomIn"), go("status.zoomIn")],
  },
];

/* ---------- replays: the real actions, played after every answer (about 10 s or less) ---------- */
// The stage is the mini mock the actions play on (see skills.js). Targets are resolve() ids of that stage.
const WORD_SAMPLE = "Our class starts at nine o'clock on Tuesday.";
const REPLAYS = {
  "t1-screen-parts-ribbon": {
    mock: "word-static",
    script: [go("ribbon"), say("This is the Ribbon. All the buttons are here.", "Đây là Ribbon. Tất cả các nút lệnh nằm ở đây.")],
  },
  "t1-screen-parts-qat": {
    mock: "word-static",
    script: [go("qat"), say("This is the Quick Access Toolbar. Save and Undo are here.", "Đây là Quick Access Toolbar, có nút Save và Undo.")],
  },
  "t1-screen-parts-document": {
    mock: "word-static",
    script: [go("document"), say("This is the document area. You type here.", "Đây là vùng gõ chữ. Bạn gõ chữ ở đây.")],
  },
  "t1-mouse-clicks-open": {
    mock: "explorer",
    script: [go("file-about-me", "double"), say("A double-click opens the file.", "Bấm đúp là mở được tệp.")],
  },
  "t1-mouse-clicks-single": {
    mock: "explorer",
    script: [go("file-about-me"), say("One click only chooses the file. It turns blue.", "Bấm một lần chỉ là chọn tệp. Tệp đổi sang màu xanh.")],
  },
  "t1-open-word-order": {
    mock: "start-menu",
    script: [key("Win"), typ("Word", "search-box"), go("word-app"), go("blank-document")],
  },
  "t1-open-word-start": {
    mock: "start-menu",
    script: [go("word-app"), say("Click Word, under Best match.", "Bấm vào Word, ngay dưới chữ Best match.")],
  },
  "t1-keys-space": {
    mock: "word",
    doc: "",
    script: [typ("Hello"), key("Space"), typ("Lan"), say("The Space bar makes a gap between words.", "Phím cách tạo khoảng trống giữa các chữ.")],
  },
  "t1-keys-enter": {
    mock: "word",
    doc: "",
    script: [typ("Dear Lan,"), key("Enter"), typ("Hello."), say("Enter starts a new line.", "Enter giúp xuống dòng.")],
  },
  "t1-keys-backspace": {
    mock: "word",
    doc: "",
    script: [typ("I like teaa"), say("One letter too many? No problem.", "Thừa một chữ? Không sao."), key("Backspace"), say("Backspace rubs out the letter on the left.", "Backspace xoá chữ nằm bên trái con trỏ.")],
  },
  "t1-keys-shift": {
    mock: "word",
    doc: "",
    script: [say("Hold Shift and press A: a capital A.", "Giữ Shift và nhấn A để ra chữ A hoa."), key("Shift+A"), typ("pple")],
  },
  "t1-keys-do-capital": { mock: "word", doc: "", script: [go("doc:0,0"), say("Shift for the capital H. Then e, l, l, o.", "Giữ Shift để gõ H hoa. Rồi gõ e, l, l, o."), typ("Hello")] },
  "t1-keys-do-fullstop": {
    mock: "word",
    doc: "",
    script: [go("doc:0,0"), say("Space bar between words. Full stop at the end.", "Các chữ cách nhau bằng phím cách. Cuối câu có dấu chấm."), typ("I like tea.")],
  },
  "t1-sentence-fix-name": {
    mock: "word",
    doc: "",
    script: [say("Capital M at the start. Full stop at the end.", "Chữ M hoa ở đầu câu. Dấu chấm ở cuối câu."), typ("My name is Lan.")],
  },
  "t1-sentence-fix-tea": {
    mock: "word",
    doc: "",
    script: [say("The word I is always a capital. Full stop at the end.", "Chữ I luôn viết hoa. Cuối câu có dấu chấm."), typ("I like to drink tea.")],
  },
  "t1-save-order-full": {
    mock: "word-static",
    script: [go("file"), go("bs.saveas"), go("sa.browse"), go("sa.documents")],
  },
  "t1-save-order-window": {
    mock: "word-static",
    script: [go("sa.name"), typ("About_Me", "sa.name"), go("sa.save"), say("Your file is saved in Documents.", "Bạn đã lưu tệp vào Documents rồi.")],
  },
  "t1-file-names-about": {
    mock: "word-static",
    script: [typ("About_Me_Lan", "sa.name"), say("About_Me_Lan says what is inside. document1 does not.", "About_Me_Lan cho biết bên trong có gì. document1 thì không.")],
  },
  "t1-file-names-shopping": {
    mock: "word-static",
    script: [typ("Shopping_List", "sa.name"), say("Real words say what the file is. Easy to find next week.", "Chữ rõ nghĩa cho biết tệp là gì. Tuần sau dễ tìm lại.")],
  },
  "t1-file-names-letter": {
    mock: "word-static",
    script: [typ("Bank_Letter_May2025", "sa.name"), say("It says what the file is, and when. Words join with _.", "Tên cho biết tệp là gì và khi nào. Các chữ nối với nhau bằng dấu gạch dưới (_).")],
  },
  "t1-find-file-order": {
    mock: "explorer",
    script: [go("taskbar-explorer"), go("nav-documents"), go("file-about-me", "double"), say("A double-click opens your file.", "Bấm đúp là mở tệp của bạn ra.")],
  },
  "t1-find-file-documents": {
    mock: "explorer",
    script: [go("nav-documents"), say("Documents is in the list on the left.", "Documents nằm trong danh sách bên trái.")],
  },
  "t1-zoom-in": {
    mock: "word",
    doc: WORD_SAMPLE,
    script: [go("status.zoomIn"), go("status.zoomIn"), say("Each click makes the page bigger. 120% is enough.", "Mỗi lần bấm, trang to thêm một chút. Đến 120% là đủ.")],
  },
};

export const items = ITEMS.map((item) => ({ ...item, replay: REPLAYS[item.id] }));

/* ---------- missions ---------- */

const typeNameSteps = [
  {
    text: T("Type the first words: My name is. Hold Shift for the capital M.", "Gõ phần đầu câu: My name is. Giữ phím Shift để gõ chữ M hoa."),
    hint: T("Hold Shift, press M, then let go. Type y, press the Space bar, and type name is.", "Giữ phím Shift, nhấn M rồi thả ra. Gõ y, nhấn phím cách, rồi gõ name is."),
    done: withWho((doc) => /^My name is\b/.test(textOf(doc).trim())),
    demo: [go("doc:0,0"), say("Hold Shift for the capital M.", "Giữ Shift để gõ M hoa."), typ("My name is")],
  },
  {
    text: T("Press the Space bar. Type your name with a capital letter.", "Nhấn phím cách. Gõ tên của bạn, chữ cái đầu viết hoa."),
    hint: T("Press the Space bar once. Then hold Shift for the first letter of your name.", "Nhấn phím cách một lần. Rồi giữ Shift để gõ chữ cái đầu của tên bạn."),
    done: withWho((doc) => /^My name is\s+\p{Lu}\p{L}*/u.test(textOf(doc).trim())),
    get demo() {
      return [key("Space"), say("Your name starts with a capital letter.", "Tên của bạn bắt đầu bằng chữ hoa."), typ(demoWho)];
    },
  },
  {
    text: T("Press the full stop key (.) at the end.", "Nhấn phím dấu chấm (.) ở cuối câu."),
    hint: T("The full stop key is at the bottom right of the letters, next to the comma.", "Phím dấu chấm nằm ở hàng dưới cùng bên phải, cạnh phím dấu phẩy."),
    done: withWho((doc) => /^My name is\s+\p{Lu}[^.]*\.\s*$/u.test(textOf(doc).trim())),
    demo: [say("The full stop key is next to the comma.", "Phím dấu chấm nằm cạnh phím dấu phẩy."), typ(".")],
  },
];

const aboutMeSteps = [
  {
    text: T("Title: type About me. Then press Enter.", "Tiêu đề: gõ About me. Rồi nhấn Enter."),
    hint: T("Type About me with a capital A. Then press the Enter key to go to a new line.", "Gõ About me, chữ A viết hoa. Rồi nhấn phím Enter để xuống dòng."),
    done: (doc) => doc.p.length >= 2 && /^about me[.!]?$/i.test(textOf(doc.p[0]).trim()),
    demo: [go("doc:0,0"), typ("About me"), key("Enter"), say("A new line for your sentences.", "Xuống dòng để viết các câu.")],
  },
  {
    text: T(
      "Sentence 1: My name is ___. Start with a capital letter. End with a full stop.",
      "Câu 1: My name is ___. Bắt đầu bằng chữ hoa, kết thúc bằng dấu chấm.",
    ),
    hint: T(
      "Type My name is, then your name, then a full stop (.). For example: My name is Lan.",
      "Gõ My name is, rồi đến tên của bạn, rồi dấu chấm (.). Ví dụ: My name is Lan.",
    ),
    done: withWho((doc) => {
      const body = sentencesOf(doc.p.slice(1).map(textOf).join(" "));
      return body.length > 0 && goodSentence(body[0]);
    }),
    get demo() {
      return [go("doc:1,0"), say("Capital M, your name, then a full stop.", "Chữ M hoa, tên của bạn, rồi dấu chấm."), typ(`My name is ${demoWho}.`)];
    },
  },
  {
    text: T(
      "Press the Space bar. Sentence 2: I live in ___. Capital letter at the start, full stop at the end.",
      "Nhấn phím cách. Câu 2: I live in ___. Chữ hoa ở đầu, dấu chấm ở cuối câu.",
    ),
    hint: T(
      "Press the Space bar after the first full stop. Type I live in and your city. End with a full stop. For example: I live in Melbourne.",
      "Nhấn phím cách sau dấu chấm thứ nhất. Gõ I live in và tên thành phố của bạn. Kết thúc bằng dấu chấm. Ví dụ: I live in Melbourne.",
    ),
    done: (doc) => {
      const body = sentencesOf(doc.p.slice(1).map(textOf).join(" "));
      return body.length >= 2 && body.every(goodSentence);
    },
    demo: [key("Space"), say("Capital I, your city, then a full stop.", "Chữ I hoa, thành phố của bạn, rồi dấu chấm."), typ("I live in Melbourne.")],
  },
];

const saveSteps = [
  {
    text: T("Click File at the top left. Then click Save As.", "Bấm File ở góc trên bên trái. Rồi bấm Save As."),
    hint: T("File is the first word in the top row of Word. Save As is in the list on the left.", "File là chữ đầu tiên ở hàng trên cùng của Word. Save As nằm trong danh sách bên trái."),
    done: (doc, ctx) => /^(saveas|dialog)/.test(saveStage()) || Boolean(ctx.saved),
    // Show me opens what each ghost click opens, so the later steps' targets exist when they play.
    get demo() {
      const saveAs = [say("Click Save As in the list on the left.", "Bấm Save As trong danh sách bên trái."), go("bs.saveas")];
      return has(".bs") ? saveAs : [say("Click File at the top left.", "Bấm File ở góc trên bên trái."), go("file"), ...saveAs];
    },
  },
  {
    text: T("Click Browse.", "Bấm Browse."),
    hint: T("Browse is the last choice in the list, with a folder picture.", "Browse là mục cuối cùng trong danh sách, có hình thư mục."),
    done: (doc, ctx) => saveStage().startsWith("dialog") || Boolean(ctx.saved),
    demo: [say("Click Browse.", "Bấm Browse."), go("sa.browse")],
  },
  {
    text: T("Click Documents in the list on the left.", "Bấm Documents trong danh sách bên trái."),
    hint: T("Look at the list on the left side of the Save As window. Find Documents.", "Nhìn vào danh sách bên trái của cửa sổ Save As. Tìm chữ Documents."),
    done: (doc, ctx) => saveStage() === "dialog-documents" || savedInDocuments(ctx),
    demo: [say("Click Documents on the left.", "Bấm Documents ở bên trái."), go("sa.documents")],
  },
  {
    text: T(
      "File name: type About Me and your name. For example: About_Me_Lan or About Me Lan.",
      "Tên tệp: gõ About Me và tên của bạn. Ví dụ: About_Me_Lan hoặc About Me Lan.",
    ),
    hint: T("Click in the File name box. Type About Me and then your name. Spaces or _ are both fine.", "Bấm vào ô File name. Gõ About Me rồi đến tên bạn. Dùng dấu cách hay dấu gạch dưới (_) đều được."),
    done: withWho((doc, ctx) => (saveStage() === "dialog-documents" && isAboutMeName(typedFileName())) || savedOk(ctx)),
    get demo() {
      return [
        go("sa.name"),
        say("Type About Me and your name. A space or _ between words is fine.", "Gõ About Me và tên bạn. Giữa các chữ dùng dấu cách hay dấu gạch dưới (_) đều được."),
        typ(`About_Me_${demoWho}`, "sa.name"),
      ];
    },
  },
  {
    text: T("Click Save.", "Bấm Save."),
    hint: T("The Save button is at the bottom right of the window.", "Nút Save nằm ở góc dưới bên phải của cửa sổ."),
    done: (doc, ctx) => savedOk(ctx),
    demo: [say("Click Save.", "Bấm Save."), go("sa.save")],
  },
];

const findFileSteps = [
  {
    text: T("Click Documents in the list on the left.", "Bấm Documents trong danh sách bên trái."),
    hint: T("Look on the left side. Find the word Documents.", "Nhìn sang bên trái. Tìm chữ Documents."),
    done: (doc, ctx) => ctx.opened === "Documents" || /\.docx$/i.test(ctx.opened ?? ""),
    spotlight: "nav-documents",
    demo: [say("Click Documents on the left.", "Bấm Documents ở bên trái."), go("nav-documents")],
  },
  {
    text: T("Double-click your file. Its name starts with About Me.", "Bấm đúp vào tệp của bạn. Tên tệp bắt đầu bằng About Me."),
    hint: T("Click two times, fast, on your file. One click only chooses it.", "Bấm hai lần liên tiếp thật nhanh vào tệp của bạn. Bấm một lần chỉ là chọn."),
    done: (doc, ctx) => /\.docx$/i.test(ctx.opened ?? "") && plain(ctx.opened).startsWith("aboutme"),
    spotlight: "file-about-me",
    demo: [say("Double-click your file.", "Bấm đúp vào tệp của bạn."), go("file-about-me", "double")],
  },
];

const zoomSteps = [
  {
    text: T("Click the + button at the bottom right of Word.", "Bấm nút + ở góc dưới bên phải của Word."),
    hint: T("The + button is next to the number at the bottom right.", "Nút + nằm cạnh con số ở góc dưới bên phải."),
    done: () => zoomNow() > 100,
    spotlight: "status.zoomIn",
    demo: [say("Click the + button at the bottom right.", "Bấm nút + ở góc dưới bên phải."), go("status.zoomIn")],
  },
  {
    text: T("Keep clicking + until it says 150% or more.", "Tiếp tục bấm + cho đến khi hiện 150% trở lên."),
    hint: T("Each click makes the page bigger. Look at the number: it must be 150% or more.", "Mỗi lần bấm, trang to thêm một chút. Hãy nhìn con số: phải là 150% trở lên."),
    done: () => zoomNow() >= 150,
    spotlight: "status.zoomIn",
    demo: [say("Keep clicking + until 150%.", "Cứ bấm + cho đến khi hiện 150%."), go("status.zoomIn"), go("status.zoomIn"), go("status.zoomIn"), go("status.zoomIn")],
  },
];

export const missions = [
  {
    id: "t1-m-type-name",
    skill: "t1-keys",
    title: T("Type your name", "Gõ tên của bạn"),
    scenario: T(
      "You want to introduce yourself. Type one sentence: My name is ___. Write your own name in the blank.",
      "Bạn muốn tự giới thiệu. Hãy gõ một câu: My name is ___. Điền tên của bạn vào chỗ trống.",
    ),
    startDoc: "",
    targetDoc: "My name is Lan.",
    tabs: ["home"],
    steps: typeNameSteps,
    goal: { check: typeNameSteps[2].done, progress: progressOf(typeNameSteps) },
  },
  {
    id: "t1-m-about-me",
    skill: "t1-sentence",
    title: T("About me", "Giới thiệu bản thân"),
    scenario: T(
      "You want to introduce yourself to your class. Write a title and two sentences about you.",
      "Bạn muốn giới thiệu về mình với cả lớp. Hãy viết một tiêu đề và hai câu về bạn.",
    ),
    startDoc: "",
    targetDoc: "About me\nMy name is Lan. I live in Melbourne.",
    tabs: ["home"],
    steps: aboutMeSteps,
    goal: { check: (doc, ctx) => aboutMeSteps.every((s) => s.done(doc, ctx)), progress: progressOf(aboutMeSteps) },
  },
  {
    id: "t1-m-save",
    skill: "t1-save",
    title: T("Save your About me page", "Lưu trang About me của bạn"),
    scenario: T(
      "Your page is finished and you want to keep it. Save it in the Documents folder. Name it About Me and your name, like About_Me_Lan or About Me Lan.",
      "Bạn đã viết xong trang này và muốn giữ lại. Hãy lưu vào thư mục Documents. Đặt tên là About Me và tên bạn, ví dụ About_Me_Lan hoặc About Me Lan.",
    ),
    startDoc: "About me\nI am learning Word. I like to cook.",
    tabs: ["home"],
    steps: saveSteps,
    goal: { check: (doc, ctx) => savedOk(ctx), progress: progressOf(saveSteps) },
  },
  {
    id: "t1-m-find-file",
    skill: "t1-find-file",
    mock: "explorer",
    title: T("Find your file again", "Tìm lại tệp của bạn"),
    scenario: T(
      "You closed Word, but you want to read your page again. Use File Explorer to find your About_Me file and open it.",
      "Bạn đã đóng Word nhưng muốn đọc lại trang của mình. Hãy dùng File Explorer để tìm tệp About_Me và mở ra.",
    ),
    startDoc: "",
    steps: findFileSteps,
    goal: {
      check: (doc, ctx) => findFileSteps[1].done(doc, ctx),
      progress: (doc, ctx) => (findFileSteps[1].done(doc, ctx) ? 1 : findFileSteps[0].done(doc, ctx) ? 0.5 : 0),
    },
  },
  {
    id: "t1-m-zoom",
    skill: "t1-zoom",
    title: T("Make the page bigger", "Phóng to trang cho dễ đọc"),
    scenario: T(
      "The words on the page are too small to read easily. Make the page bigger: 150% or more.",
      "Chữ trên trang nhỏ quá, khó đọc. Hãy phóng to trang lên 150% hoặc hơn.",
    ),
    startDoc: "Class notice\nOur class starts at nine o'clock on Tuesday morning.\nPlease bring your laptop and a pen.",
    tabs: ["home"],
    steps: zoomSteps,
    goal: { check: () => zoomNow() >= 150, progress: () => Math.max(0, Math.min(1, (zoomNow() - 100) / 50)) },
  },
];
