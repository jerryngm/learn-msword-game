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

/** True when `name` looks like About_Me_<learner's name>. Spaces, capitals and a typed .docx don't matter. */
function isAboutMeName(name, learnerName) {
  const n = plain(String(name ?? "").replace(/\.docx$/i, ""));
  if (!n.startsWith("aboutme") || n.length <= "aboutme".length) return false;
  const rest = n.slice("aboutme".length);
  const tokens = String(learnerName ?? "").split(/\s+/).map(plain).filter((t) => t.length >= 2);
  return tokens.length === 0 || tokens.some((t) => rest.includes(t));
}

/** Word keeps the zoom and the Backstage in its own DOM; steps read them there (the screens re-check on change). */
const zoomNow = () => Number.parseInt(document.querySelector(".wd-zl")?.textContent ?? "100", 10) || 100;
/** Show-me scripts for the Save As steps point at things that only exist once the Backstage is open, so each reads the DOM when the script is built. */
const has = (sel) => Boolean(document.querySelector(sel));
const saveStage = () => document.querySelector(".bs")?.dataset.stage ?? "";
const typedFileName = () => document.querySelector(".bs .sa-name")?.value ?? "";
const savedInDocuments = (ctx) => Boolean(ctx.saved && ctx.saved.folder.length === 1 && ctx.saved.folder[0] === "Documents");
const savedOk = (ctx) => savedInDocuments(ctx) && isAboutMeName(ctx.saved.name, ctx.learner?.name);

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

/* ---------- revision items ---------- */

export const items = [
  // t1-screen-parts
  {
    id: "t1-screen-parts-ribbon",
    skill: "t1-screen-parts",
    type: "click-ui",
    mock: "word-static",
    prompt: T("Click the Ribbon. It is the area with all the buttons.", "Hãy bấm vào Ribbon (thanh công cụ). Đây là khu vực có các nút lệnh."),
    hint: T("The Ribbon is under the words File, Home and Insert.", "Ribbon nằm ngay dưới các chữ File, Home và Insert."),
    answer: "ribbon",
  },
  {
    id: "t1-screen-parts-qat",
    skill: "t1-screen-parts",
    type: "click-ui",
    mock: "word-static",
    prompt: T(
      "Click the Quick Access Toolbar. It is the small bar at the top left with Save and Undo.",
      "Hãy bấm vào Quick Access Toolbar. Đó là thanh nhỏ ở góc trên bên trái, có nút Save và Undo.",
    ),
    hint: T("Look at the very top left. Find the Save and Undo buttons.", "Nhìn lên góc trên cùng bên trái. Tìm nút Save và nút Undo."),
    answer: "qat",
  },
  {
    id: "t1-screen-parts-document",
    skill: "t1-screen-parts",
    type: "click-ui",
    mock: "word-static",
    prompt: T("Click the document area. This is where you type.", "Hãy bấm vào vùng gõ chữ. Đây là nơi bạn gõ chữ."),
    hint: T("It is the big white page.", "Đó là trang giấy trắng lớn."),
    answer: "document",
  },

  // t1-mouse-clicks
  {
    id: "t1-mouse-clicks-open",
    skill: "t1-mouse-clicks",
    type: "pick",
    prompt: T("You want to open a file. Which click do you use?", "Bạn muốn mở một tệp. Bạn dùng kiểu bấm nào?"),
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
    prompt: T("You click once on a file. What happens?", "Bạn bấm một lần vào một tệp. Điều gì sẽ xảy ra?"),
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
    prompt: T("Put the steps in order to open Word.", "Sắp xếp các bước theo đúng thứ tự để mở Word."),
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
    prompt: T("You typed Word. Now click Word to open it.", "Bạn đã gõ chữ Word. Giờ hãy bấm vào Word để mở ra."),
    hint: T("Look at the top of the list, under Best match.", "Nhìn lên đầu danh sách, ngay dưới chữ Best match."),
    answer: "word-app",
  },

  // t1-keys
  {
    id: "t1-keys-space",
    skill: "t1-keys",
    type: "pick",
    prompt: T("Which key makes a space between words?", "Phím nào tạo khoảng cách giữa các chữ?"),
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
    prompt: T("Which key starts a new line?", "Phím nào để xuống dòng?"),
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
    prompt: T("You typed a wrong letter. Which key rubs it out?", "Bạn gõ sai một chữ. Phím nào xoá chữ đó đi?"),
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
    prompt: T("How do you type a capital A?", "Làm sao để gõ chữ A viết hoa?"),
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
    prompt: T("Type the word Hello with a capital H.", "Hãy gõ chữ Hello, chữ H viết hoa."),
    hint: T("Hold down Shift, press H, then let go. Now type e, l, l, o.", "Giữ phím Shift, nhấn H rồi thả ra. Sau đó gõ e, l, l, o."),
    doc: "",
    tabs: ["home"],
    check: (doc) => textOf(doc).trim() === "Hello",
    demo: [
      { target: "doc:0,0" },
      say("Hold Shift and press H.", "Giữ phím Shift và nhấn H."),
      say("Let go of Shift. Type e, l, l, o.", "Thả phím Shift ra. Gõ e, l, l, o."),
    ],
  },
  {
    id: "t1-keys-do-fullstop",
    skill: "t1-keys",
    type: "do",
    prompt: T("Type this sentence: I like tea.", "Hãy gõ câu này: I like tea."),
    hint: T(
      "Type the words with a space between them. The full stop key is at the bottom right of the letters, next to the comma.",
      "Gõ các chữ, cách nhau bằng phím cách. Phím dấu chấm nằm ở hàng dưới cùng bên phải, cạnh phím dấu phẩy.",
    ),
    doc: "",
    tabs: ["home"],
    check: (doc) => /^i like tea\.$/i.test(textOf(doc).trim().replace(/\s+/g, " ")),
    demo: [
      { target: "doc:0,0" },
      say("Type: I, Space bar, like, Space bar, tea.", "Gõ: I, phím cách, like, phím cách, tea."),
      say("Finish with the full stop key (.).", "Kết thúc bằng phím dấu chấm (.)."),
    ],
  },

  // t1-sentence
  {
    id: "t1-sentence-fix-name",
    skill: "t1-sentence",
    type: "fix",
    prompt: T(
      "Fix the sentence. Start with a capital letter and end with a full stop.",
      "Hãy sửa lại câu. Bắt đầu bằng chữ hoa và kết thúc bằng dấu chấm.",
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
      "Fix the sentence. Start with a capital letter and end with a full stop.",
      "Hãy sửa lại câu. Bắt đầu bằng chữ hoa và kết thúc bằng dấu chấm.",
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
    prompt: T("Put the steps in order. Start at File and end at Documents.", "Sắp xếp các bước theo thứ tự. Bắt đầu từ File và kết thúc ở Documents."),
    hint: T("Start at the top left of Word, with File. Documents is the last click in this list.", "Bắt đầu từ File ở góc trên bên trái của Word. Bấm Documents là bước cuối trong danh sách này."),
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
    prompt: T("You clicked Save As. What do you do next? Put the steps in order.", "Bạn đã bấm Save As. Tiếp theo bạn làm gì? Hãy sắp xếp các bước."),
    hint: T("First choose the place (Browse, then Documents). Last, click Save.", "Trước tiên chọn nơi lưu (Browse, rồi Documents). Cuối cùng bấm Save."),
    steps: [
      { id: "browse", label: T("Click Browse", "Bấm Browse") },
      { id: "documents", label: T("Click Documents", "Bấm Documents") },
      { id: "name", label: T("Type a file name", "Gõ tên tệp") },
      { id: "save", label: T("Click Save", "Bấm Save") },
    ],
  },

  // t1-file-names
  {
    id: "t1-file-names-about",
    skill: "t1-file-names",
    type: "pick",
    prompt: T("Which is the best file name?", "Tên tệp nào tốt nhất?"),
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
    prompt: T("You wrote a shopping list. Which name will help you find it next week?", "Bạn vừa viết một danh sách đi chợ. Tên nào giúp bạn dễ tìm lại vào tuần sau?"),
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
    prompt: T("You wrote a letter to the bank in May. Which name is best?", "Bạn viết một lá thư gửi ngân hàng vào tháng Năm. Tên nào là tốt nhất?"),
    hint: T("A good name says what it is and when. Words are joined with an underscore ( _ ).", "Tên tốt cho biết đó là tệp gì và làm lúc nào. Các chữ được nối bằng dấu gạch dưới ( _ )."),
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
    prompt: T("Put the steps in order to find your saved file again.", "Sắp xếp các bước theo đúng thứ tự để tìm lại tệp đã lưu."),
    hint: T("You find files in File Explorer, the yellow folder. The last step opens the file.", "Bạn tìm tệp trong File Explorer, biểu tượng thư mục màu vàng. Bước cuối cùng là mở tệp."),
    steps: [
      { id: "close", label: T("Close Word with the X", "Đóng Word bằng nút X") },
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
    prompt: T("Click Documents in the list on the left. Your file is in there.", "Hãy bấm vào Documents trong danh sách bên trái. Tệp của bạn nằm trong đó."),
    hint: T("Look on the left side. Find the word Documents.", "Nhìn sang bên trái. Tìm chữ Documents."),
    answer: "nav-documents",
  },

  // t1-zoom
  {
    id: "t1-zoom-in",
    skill: "t1-zoom",
    type: "do",
    prompt: T(
      "The words are small. Make the page bigger. Click the + button at the bottom right until it says 120% or more.",
      "Chữ hơi nhỏ. Hãy phóng to trang. Bấm nút + ở góc dưới bên phải cho đến khi hiện 120% trở lên.",
    ),
    hint: T("The + button is next to the number at the bottom right of Word.", "Nút + nằm cạnh con số ở góc dưới bên phải của Word."),
    doc: "Our class starts at nine o'clock on Tuesday.",
    tabs: ["home"],
    check: () => zoomNow() >= 120,
    spotlight: "status.zoomIn",
    demo: [
      say("Click the + button at the bottom right.", "Bấm nút + ở góc dưới bên phải."),
      { target: "status.zoomIn" },
      { target: "status.zoomIn" },
      say("Each click makes the page a little bigger.", "Mỗi lần bấm, trang to thêm một chút."),
    ],
  },
];

/* ---------- missions ---------- */

const typeNameSteps = [
  {
    text: T("Type: My name is. Use Shift for the capital M.", "Gõ: My name is. Giữ phím Shift để gõ chữ M hoa."),
    hint: T("Hold Shift, press M, then let go. Type y, press the Space bar, and type name is.", "Giữ phím Shift, nhấn M rồi thả ra. Gõ y, nhấn phím cách, rồi gõ name is."),
    done: (doc) => /^My name is\b/.test(textOf(doc).trim()),
    demo: [
      { target: "doc:0,0" },
      say("Hold Shift and press M.", "Giữ phím Shift và nhấn M."),
    ],
  },
  {
    text: T("Press the Space bar. Type your name with a capital letter.", "Nhấn phím cách. Gõ tên của bạn, chữ cái đầu viết hoa."),
    hint: T("Press the Space bar once. Then hold Shift for the first letter of your name.", "Nhấn phím cách một lần. Rồi giữ Shift để gõ chữ cái đầu của tên bạn."),
    done: (doc) => /^My name is\s+\p{Lu}\p{L}*/u.test(textOf(doc).trim()),
    demo: [say("Press the Space bar once.", "Nhấn phím cách một lần.")],
  },
  {
    text: T("Press the full stop key (.) at the end.", "Nhấn phím dấu chấm (.) ở cuối câu."),
    hint: T("The full stop key is at the bottom right of the letters, next to the comma.", "Phím dấu chấm nằm ở hàng dưới cùng bên phải, cạnh phím dấu phẩy."),
    done: (doc) => /^My name is\s+\p{Lu}[^.]*\.\s*$/u.test(textOf(doc).trim()),
    demo: [say("Press the full stop key (.).", "Nhấn phím dấu chấm (.).")],
  },
];

const aboutMeSteps = [
  {
    text: T("Type the title: About me. Then press Enter.", "Gõ tiêu đề: About me. Rồi nhấn Enter."),
    hint: T("Type About me with a capital A. Then press the Enter key to go to a new line.", "Gõ About me, chữ A viết hoa. Rồi nhấn phím Enter để xuống dòng."),
    done: (doc) => doc.p.length >= 2 && /^about me$/i.test(textOf(doc.p[0]).trim()),
    demo: [
      { target: "doc:0,0" },
      say("Type: About me. Then press Enter.", "Gõ: About me. Rồi nhấn Enter."),
    ],
  },
  {
    text: T("Write sentence 1 about you. Start with a capital letter. End with a full stop.", "Viết câu 1 về bản thân. Bắt đầu bằng chữ hoa. Kết thúc bằng dấu chấm."),
    hint: T(
      "For example: My name is Lan. Think of your name, your family or a food you like.",
      "Ví dụ: My name is Lan. Bạn có thể viết về tên, gia đình hoặc món ăn bạn thích.",
    ),
    done: (doc) => {
      const body = sentencesOf(doc.p.slice(1).map(textOf).join(" "));
      return body.length > 0 && goodSentence(body[0]);
    },
    demo: [say("Capital first, full stop last.", "Chữ hoa ở đầu, dấu chấm ở cuối.")],
  },
  {
    text: T("Write sentence 2 in the same way.", "Viết câu 2 theo cách tương tự."),
    hint: T("Put a space after the first full stop. Then start with a capital letter again. For example: I like to cook.", "Nhấn phím cách sau dấu chấm thứ nhất. Rồi lại bắt đầu bằng chữ hoa. Ví dụ: I like to cook."),
    done: (doc) => {
      const body = sentencesOf(doc.p.slice(1).map(textOf).join(" "));
      return body.length >= 2 && body.every(goodSentence);
    },
    demo: [say("Press Space. Write sentence 2.", "Nhấn phím cách. Viết câu 2.")],
  },
];

const saveSteps = [
  {
    text: T("Click File at the top left. Then click Save As.", "Bấm File ở góc trên bên trái. Rồi bấm Save As."),
    hint: T("File is the first word in the top row of Word. Save As is in the list on the left.", "File là chữ đầu tiên ở hàng trên cùng của Word. Save As nằm trong danh sách bên trái."),
    done: (doc, ctx) => /^(saveas|dialog)/.test(saveStage()) || Boolean(ctx.saved),
    get demo() {
      if (has(".bs")) return [{ target: "bs.saveas" }, say("Click Save As in the list on the left.", "Bấm Save As trong danh sách bên trái.")];
      return [{ target: "file" }, say("Click File. Then Save As, Browse and Documents.", "Bấm File. Rồi bấm Save As, Browse và Documents.")];
    },
  },
  {
    text: T("Click Browse.", "Bấm Browse."),
    hint: T("Browse is the last choice in the list, with a folder picture.", "Browse là mục cuối cùng trong danh sách, có hình thư mục."),
    done: (doc, ctx) => saveStage().startsWith("dialog") || Boolean(ctx.saved),
    get demo() {
      return has(".bs .sa-browse") ? [{ target: "sa.browse" }] : [];
    },
  },
  {
    text: T("Click Documents in the list on the left.", "Bấm Documents trong danh sách bên trái."),
    hint: T("Look at the list on the left side of the Save As window. Find Documents.", "Nhìn vào danh sách bên trái của cửa sổ Save As. Tìm chữ Documents."),
    done: (doc, ctx) => saveStage() === "dialog-documents" || savedInDocuments(ctx),
    get demo() {
      return has(".bs .sa-scrim") ? [{ target: "sa.documents" }] : [];
    },
  },
  {
    text: T("Type the file name: About_Me_ and your name.", "Gõ tên tệp: About_Me_ và tên của bạn."),
    hint: T("Click in the File name box. Type About_Me_ and then your name, like About_Me_Lan.", "Bấm vào ô File name. Gõ About_Me_ rồi đến tên bạn, ví dụ About_Me_Lan."),
    done: (doc, ctx) => (saveStage() === "dialog-documents" && isAboutMeName(typedFileName(), ctx.learner?.name)) || savedOk(ctx),
    get demo() {
      if (!has(".bs .sa-scrim")) return [];
      return [{ target: "sa.name" }, say("Type About_Me_ and your name. The _ is Shift and the minus key.", "Gõ About_Me_ và tên bạn. Muốn gõ dấu _, giữ Shift và nhấn phím dấu trừ.")];
    },
  },
  {
    text: T("Click Save.", "Bấm Save."),
    hint: T("The Save button is at the bottom right of the window.", "Nút Save nằm ở góc dưới bên phải của cửa sổ."),
    done: (doc, ctx) => savedOk(ctx),
    get demo() {
      return has(".bs .sa-scrim") ? [{ target: "sa.save" }] : [];
    },
  },
];

const findFileSteps = [
  {
    text: T("Click Documents in the list on the left.", "Bấm Documents trong danh sách bên trái."),
    hint: T("Look on the left side. Find the word Documents.", "Nhìn sang bên trái. Tìm chữ Documents."),
    done: (doc, ctx) => ctx.opened === "Documents" || /\.docx$/i.test(ctx.opened ?? ""),
    spotlight: "nav-documents",
    demo: [{ target: "nav-documents" }],
  },
  {
    text: T("Double-click your file, About_Me_ and your name.", "Bấm đúp vào tệp của bạn, About_Me_ và tên bạn."),
    hint: T("Click two times, fast, on your file. One click only chooses it.", "Bấm hai lần liên tiếp thật nhanh vào tệp của bạn. Bấm một lần chỉ là chọn."),
    done: (doc, ctx) => /^About_Me_.+\.docx$/i.test(ctx.opened ?? ""),
    spotlight: "file-about-me",
    demo: [{ target: "file-about-me", dbl: true }],
  },
];

const zoomSteps = [
  {
    text: T("Click the + button at the bottom right of Word.", "Bấm nút + ở góc dưới bên phải của Word."),
    hint: T("The + button is next to the number at the bottom right.", "Nút + nằm cạnh con số ở góc dưới bên phải."),
    done: () => zoomNow() > 100,
    spotlight: "status.zoomIn",
    demo: [say("Click the + button at the bottom right.", "Bấm nút + ở góc dưới bên phải."), { target: "status.zoomIn" }],
  },
  {
    text: T("Keep clicking + until it says 150% or more.", "Tiếp tục bấm + cho đến khi hiện 150% trở lên."),
    hint: T("Each click makes the page bigger. Look at the number: it must be 150% or more.", "Mỗi lần bấm, trang to thêm một chút. Hãy nhìn con số: phải là 150% trở lên."),
    done: () => zoomNow() >= 150,
    spotlight: "status.zoomIn",
    demo: [say("Keep clicking +. Watch the number go up.", "Cứ tiếp tục bấm +. Nhìn con số tăng dần."), { target: "status.zoomIn" }],
  },
];

export const missions = [
  {
    id: "t1-m-type-name",
    skill: "t1-keys",
    title: T("Type your name", "Gõ tên của bạn"),
    scenario: T("Your teacher asks you to type: My name is … Use your own name.", "Giáo viên nhờ bạn gõ câu: My name is … rồi điền tên của bạn."),
    startDoc: "",
    targetDoc: "My name is Lan.",
    tabs: ["home"],
    steps: typeNameSteps,
    goal: { check: typeNameSteps[2].done, progress: progressOf(typeNameSteps) },
  },
  {
    id: "t1-m-about-me",
    skill: "t1-sentence",
    title: T("About me", "Giới thiệu về tôi"),
    scenario: T("Write a title and two sentences about you.", "Viết một tiêu đề và hai câu giới thiệu về bạn."),
    startDoc: "",
    targetDoc: "About me\nMy name is Lan. I live in Melbourne.",
    tabs: ["home"],
    steps: aboutMeSteps,
    goal: { check: (doc, ctx) => aboutMeSteps[0].done(doc, ctx) && aboutMeSteps[2].done(doc, ctx), progress: progressOf(aboutMeSteps) },
  },
  {
    id: "t1-m-save",
    skill: "t1-save",
    title: T("Save your About me page", "Lưu trang About me của bạn"),
    scenario: T(
      "Your page is finished. Save it in the Documents folder. Name it About_Me_ and your name, like About_Me_Lan.",
      "Bạn đã viết xong trang này. Hãy lưu vào thư mục Documents. Đặt tên là About_Me_ và tên bạn, ví dụ About_Me_Lan.",
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
      "You closed Word. Use File Explorer to find your About_Me file and open it again.",
      "Bạn đã đóng Word. Hãy dùng File Explorer để tìm tệp About_Me của bạn và mở lại.",
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
    scenario: T("The words are small. Make the page bigger so it is easy to read.", "Chữ hơi nhỏ. Hãy phóng to trang để đọc cho dễ."),
    startDoc: "Class notice\nOur class starts at nine o'clock on Tuesday morning.\nPlease bring your laptop and a pen.",
    tabs: ["home"],
    steps: zoomSteps,
    goal: { check: () => zoomNow() >= 150, progress: () => Math.max(0, Math.min(1, (zoomNow() - 100) / 50)) },
  },
];
