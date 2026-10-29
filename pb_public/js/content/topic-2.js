import { practiceText } from './text-rules.js';
// Topic 2: small, useful editing jobs on the classroom Windows keyboard.
import { createDoc, textOf } from "../word/model.js";

const T = (en, vi) => ({ en, vi });
const go = (target, click = "single") => ({ target, click });
const key = (key) => ({ key });
const type = (type) => ({ type });
const select = (p, from, to) => ({ select: { from: { p, offset: from }, to: { p, offset: to } } });
const body = (doc) => doc.p.map(textOf).join("\n");
const tidy = (text) => String(text).trim().replace(/\s+/g, " ");
const equals = (expected) => (doc) => practiceText(body(doc)) === practiceText(expected);
const exact = (expected) => (doc) => tidy(body(doc)) === tidy(expected);
const replay = (doc, script) => ({ mock: "word", doc, script });
const replace = (p, from, to, value) => [select(p, from, to), type(value)];
const option = (id, en, vi) => ({ id, label: T(en, vi) });
const pick = (id, skill, prompt, hint, options, answer, doc, script) => ({ id, skill, type: "pick", prompt, hint, options, answer, replay: replay(doc, script) });
const edit = (id, skill, prompt, hint, doc, expected, demo, commands = []) => ({ id, skill, type: "do", prompt, hint, doc, tabs: ["home"], expectedText: expected, check: (doc, ctx) => equals(expected)(doc) && commands.every((command) => used(ctx, command)), demo, replay: replay(doc, demo) });
const fix = (id, skill, prompt, hint, text, expected, demo, extra = []) => ({ id, skill, type: "fix", prompt, hint, text, accept: [expected, ...extra], check: (value) => [expected, ...extra].some((e) => tidy(value) === tidy(e)), replay: replay(text, demo) });
const step = (en, vi, hintEn, hintVi, done, demo, spotlight) => ({ text: T(en, vi), hint: T(hintEn, hintVi), done, demo, ...(spotlight ? { spotlight } : {}) });
const mission = (id, skill, title, scenario, startDoc, targetDoc, steps, check = (doc, ctx) => steps.every((s) => s.done(doc, ctx))) => ({ id, skill, title, scenario, startDoc, targetDoc, tabs: ["home"], steps, goal: { check, progress: (doc, ctx) => steps.filter((s) => s.done(doc, ctx)).length / steps.length } });

// The screen records real command ids. Ghost demos never enter this log.
const used = (ctx, command) => (ctx?.commands ?? []).includes(command);
const undoneThenRedone = (ctx) => {
  const commands = ctx?.commands ?? [];
  const undo = commands.indexOf("qat.undo");
  return undo >= 0 && commands.indexOf("qat.redo", undo + 1) > undo;
};
const undoDemo = [go("doc:0,3"), key("."), go("qat.undo")];
const redoDemo = [go("doc:0,3"), key("."), go("qat.undo"), go("qat.redo")];
const spellDoc = (text, spellings) => ({ ...createDoc(text), spellings });
const spellDemo = (p, offset, suggestion) => [go(`doc:${p},${offset}`, "right"), go(`spelling.${suggestion}`)];

export const items = [
  pick("t2-backspace-left", "t2-backspace-delete", T("You typed an extra letter. Which key removes the letter to the LEFT of the cursor?", "Bạn gõ thừa một chữ cái ở bên TRÁI con trỏ. Nhấn phím nào để xoá chữ cái đó?"), T("Backspace removes the letter just before the cursor.", "Backspace xoá chữ cái ngay trước con trỏ."), [option("back", "Backspace", "Backspace"), option("del", "Delete", "Delete")], "back", "helllo", [go("doc:0,4"), key("Backspace")]),
  pick("t2-delete-right", "t2-backspace-delete", T("You want to remove a letter after the cursor. Which key removes the letter to the RIGHT?", "Bạn muốn xoá một chữ cái ở bên PHẢI con trỏ. Nhấn phím nào?"), T("Delete removes the letter just after the cursor.", "Delete xoá chữ cái ngay sau con trỏ."), [option("back", "Backspace", "Backspace"), option("del", "Delete", "Delete")], "del", "helllo", [go("doc:0,3"), key("Delete")]),
  pick("t2-missing-letter", "t2-backspace-delete", T('Your greeting says "helo". Which action adds the missing "l"?', 'Lời chào của bạn đang là “helo”, thiếu một chữ “l”. Làm gì để thêm chữ “l”?'), T('Click between "l" and "o". Type "l".', 'Bấm vào giữa chữ “l” và “o”. Gõ thêm chữ “l”.'), [option("type", 'Click before "o", then type "l"', 'Bấm trước chữ “o” rồi gõ “l”'), option("back", "Press Backspace", "Nhấn Backspace"), option("del", "Press Delete", "Nhấn Delete")], "type", "helo", [go("doc:0,3"), type("l")]),
  edit("t2-backspace-do", "t2-backspace-delete", T("Fix this greeting. Click just after the extra l in helllo, then press Backspace to make hello.", "Sửa lời chào này. Bấm ngay sau chữ l thừa trong helllo, rồi nhấn Backspace để thành hello."), T("Click between the third l and o. Press Backspace once.", "Bấm giữa chữ l thứ ba và chữ o. Nhấn Backspace một lần."), "helllo", "hello", [go("doc:0,5"), key("Backspace")]),
  edit("t2-delete-do", "t2-backspace-delete", T("Fix this greeting. Click just before the extra l in helllo, then press Delete to make hello.", "Sửa lời chào này. Bấm ngay trước chữ l thừa trong helllo, rồi nhấn Delete để thành hello."), T("Click between the second and third l. Press Delete once.", "Bấm giữa chữ l thứ hai và thứ ba. Nhấn Delete một lần."), "helllo", "hello", [go("doc:0,4"), key("Delete")]),
  pick("t2-capitals-shift", "t2-capitals", T("You are typing Monday on your class timetable. How do you type one capital M?", "Bạn đang gõ Monday vào lịch học. Làm sao để gõ một chữ M hoa?"), T("Hold Shift while you press M. Then release Shift.", "Giữ Shift khi nhấn M. Sau đó thả Shift ra."), [option("shift", "Hold Shift and press M", "Giữ Shift rồi nhấn M"), option("space", "Press Space then M", "Nhấn phím cách rồi nhấn M")], "shift", "", [key("Shift+M"), type("onday")]),
  pick("t2-capitals-lock", "t2-capitals", T("Your keyboard keeps typing capitals. Which key turns Caps Lock off?", "Bàn phím cứ gõ toàn chữ hoa. Nhấn phím nào để tắt Caps Lock?"), T("Press Caps Lock again to turn it off.", "Nhấn Caps Lock thêm một lần để tắt."), [option("caps", "Caps Lock", "Phím Caps Lock"), option("enter", "Enter", "Enter"), option("tab", "Tab", "Tab")], "caps", "", [key("CapsLock"), type("HI"), key("CapsLock"), type(" there")]),
  fix("t2-capitals-monday", "t2-capitals", T("Fix the day on your timetable. Change monday to Monday.", "Sửa tên ngày trong lịch học. Đổi monday thành Monday."), T("Days of the week begin with a capital. Only M needs to be a capital.", "Tên ngày trong tuần bắt đầu bằng chữ hoa. Chỉ chữ M cần viết hoa."), "monday", "Monday", replace(0, 0, 1, "M")),
  fix("t2-capitals-name", "t2-capitals", T("Fix the name on a place card. Change lAN to Lan.", "Sửa tên trên thẻ chỗ ngồi. Đổi lAN thành Lan."), T("A name begins with a capital. The letters a and n are small.", "Tên bắt đầu bằng chữ hoa. Chữ a và n viết thường."), "lAN", "Lan", replace(0, 0, 3, "Lan")),
  edit("t2-cursor-middle", "t2-move-cursor", T("Your note has a capital inside a word. Click after A in nAme, press Backspace, then type a.", "Trong lời nhắn có một chữ cái viết hoa nằm giữa từ. Bấm sau A trong nAme, nhấn Backspace rồi gõ a."), T("Put the cursor between A and m. Backspace removes A.", "Đặt con trỏ giữa A và m. Backspace xoá A."), "My nAme is Lan.", "My name is Lan.", [go("doc:0,5"), key("Backspace"), type("a")]),
  edit("t2-cursor-end", "t2-move-cursor", T("Fix your class note. Click after R in computeRs, press Backspace, then type r.", "Sửa ghi chú về lớp học. Bấm sau R trong computeRs, nhấn Backspace rồi gõ r."), T("Click between R and s. Change just that letter.", "Bấm giữa R và s. Chỉ sửa chữ đó."), "I like computeRs.", "I like computers.", [go("doc:0,15"), key("Backspace"), type("r")]),
  edit("t2-spelling-bread", "t2-spelling", T("Fix the shopping note. Right-click the red-underlined bred and choose bread.", "Sửa lời nhắn đi chợ. Bấm chuột phải vào bred có gạch đỏ, rồi chọn bread."), T("Right-click bred. Then click bread in the suggestions.", "Bấm chuột phải vào bred. Sau đó bấm bread trong các từ gợi ý."), spellDoc("Buy bred.", { bred: ["bread"] }), "Buy bread.", spellDemo(0, 5, "bread"), ["spelling.bread"]),
  edit("t2-spelling-milk", "t2-spelling", T("Fix the shopping note. Right-click the red-underlined milkk and choose milk.", "Sửa lời nhắn đi chợ. Bấm chuột phải vào milkk có gạch đỏ, rồi chọn milk."), T("Right-click milkk. Click milk in the suggestions.", "Bấm chuột phải vào milkk. Bấm milk trong các từ gợi ý."), spellDoc("Buy milkk.", { milkk: ["milk"] }), "Buy milk.", spellDemo(0, 6, "milk"), ["spelling.milk"]),
  fix("t2-punctuation-stop", "t2-punctuation", T("Finish this sentence for your note. Add a full stop at the end.", "Hoàn thành câu trong lời nhắn. Thêm dấu chấm ở cuối câu."), T("Put . straight after tea, with no space before it.", "Đặt dấu . ngay sau tea, không có dấu cách ở trước."), "I like tea", "I like tea.", [go("doc:0,10"), key(".")]),
  fix("t2-punctuation-comma", "t2-punctuation", T("Make your shopping sentence easy to read. Add commas after bread and after milk.", "Làm câu nhắc đi chợ dễ đọc hơn. Thêm dấu phẩy sau bread và sau milk."), T("Write: Buy bread, milk, eggs and rice.", "Viết: Buy bread, milk, eggs and rice."), "Buy bread milk eggs and rice.", "Buy bread, milk, eggs and rice.", [...replace(0, 14, 14, ","), ...replace(0, 9, 9, ",")], ["Buy bread, milk, eggs, and rice."]),
  fix("t2-punctuation-space", "t2-punctuation", T("Make this note tidy. Remove the space before the comma and add a space after it.", "Chỉnh lại lời nhắn cho gọn. Xoá dấu cách trước dấu phẩy và thêm một dấu cách sau dấu phẩy."), T("Write: Tea, coffee.", "Viết: Tea, coffee."), "Tea ,coffee.", "Tea, coffee.", [select(0, 3, 4), key("Backspace"), go("doc:0,4"), key("Space")]),
  { ...edit("t2-undo-do", "t2-undo-redo", T("Practise recovering a mistake. Click after Tea, type a full stop, then click Undo to remove it.", "Tập quay lại bước trước khi gõ nhầm. Bấm sau chữ Tea, gõ dấu chấm rồi bấm Undo để quay lại."), T("Type . first. Undo is the curved arrow at the top left.", "Gõ dấu . trước. Undo là mũi tên cong ở góc trên bên trái."), "Tea", "Tea", undoDemo), check: (doc, ctx) => used(ctx, "qat.undo") && exact("Tea")(doc) },
  { ...edit("t2-redo-do", "t2-undo-redo", T("Practise bringing an edit back. Add a full stop after Tea, click Undo, then click Redo.", "Tập lấy lại phần vừa sửa. Thêm dấu chấm sau chữ Tea, bấm Undo rồi bấm Redo."), T("Type . → Undo → Redo. The full stop comes back.", "Gõ . → Undo → Redo. Dấu chấm sẽ hiện lại."), "Tea", "Tea.", redoDemo), check: (doc, ctx) => undoneThenRedone(ctx) && exact("Tea.")(doc) },
  pick("t2-undo-choice", "t2-undo-redo", T("You deleted the wrong word in your letter. Which button brings it back?", "Bạn xoá nhầm một từ trong thư. Nút nào lấy lại từ đó?"), T("Undo goes back one action. The shortcut is Ctrl+Z.", "Undo giúp quay lại bước vừa làm. Phím tắt là Ctrl+Z."), [option("undo", "Undo", "Undo"), option("redo", "Redo", "Redo"), option("save", "Save", "Save")], "undo", "Tea", [select(0, 0, 3), key("Backspace"), go("qat.undo")]),
  { id: "t2-copy-order", skill: "t2-copy-paste", type: "order", prompt: T("You are making two address labels with the same address. Put the steps in order to copy it.", "Bạn đang làm hai nhãn địa chỉ giống nhau. Hãy xếp các bước sao chép theo đúng thứ tự."), hint: T("Select the address, Copy, click the new place, then Paste.", "Bôi đen địa chỉ, bấm Copy, bấm chỗ mới rồi bấm Paste."), steps: [option("select", "Select the address", "Bôi đen địa chỉ"), option("copy", "Click Copy", "Bấm Copy"), option("place", "Click the new place", "Bấm vào chỗ mới"), option("paste", "Click Paste", "Bấm Paste")], replay: replay("12 Rose Road\n", [select(0, 0, 12), go("home.clipboard.copy"), go("doc:1,0"), go("home.clipboard.paste")]) },
  edit("t2-copy-do", "t2-copy-paste", T("Make a second address label below the first. Select 12 Rose Road, click Copy, click the empty line, then click Paste.", "Tạo thêm một nhãn địa chỉ ở dòng dưới. Bôi đen 12 Rose Road, bấm Copy, bấm dòng trống rồi bấm Paste."), T("Copy keeps the first address. Paste puts a copy on the empty line.", "Copy giữ lại địa chỉ ban đầu. Paste dán một bản vào dòng trống."), "12 Rose Road\n", "12 Rose Road\n12 Rose Road", [select(0, 0, 12), go("home.clipboard.copy"), go("doc:1,0"), go("home.clipboard.paste")], ["home.clipboard.copy", "home.clipboard.paste"]),
  edit("t2-cut-do", "t2-copy-paste", T("Move the address below the shop name. Select 12 Rose Road, click Cut, click the bottom empty line, then click Paste.", "Chuyển địa chỉ xuống dưới tên cửa hàng. Bôi đen 12 Rose Road, bấm Cut, bấm dòng trống cuối rồi bấm Paste."), T("Cut removes the selected address. Paste puts it in the new place.", "Cut lấy địa chỉ ra khỏi chỗ cũ. Paste dán vào chỗ mới."), "12 Rose Road\nLan's shop\n", "\nLan's shop\n12 Rose Road", [select(0, 0, 12), go("home.clipboard.cut"), go("doc:2,0"), go("home.clipboard.paste")], ["home.clipboard.cut", "home.clipboard.paste"]),
];

const greetingStart = "Helllo, Lan.\nWelcomme to class.";
const greetingTarget = "Hello, Lan.\nWelcome to class.";
const greetingSteps = [
  step("Line 1: click just after the third l in Helllo, then press Backspace.", "Dòng 1: bấm ngay sau chữ l thứ ba trong Helllo, rồi nhấn Backspace.", "Click between the third l and o. Backspace removes the letter to the left of the cursor.", "Bấm vào giữa chữ l thứ ba và chữ o. Backspace xoá chữ ở bên trái con trỏ.", (doc) => practiceText(textOf(doc.p[0] ?? { runs: [] })) === practiceText("Hello, Lan."), [go("doc:0,5"), key("Backspace")]),
  step("Line 2: click between the two m letters in Welcomme, then press Delete.", "Dòng 2: bấm vào giữa hai chữ m trong Welcomme, rồi nhấn Delete.", "Delete removes the letter to the right of the cursor. Press Delete once to make Welcome.", "Delete xoá chữ ở bên phải con trỏ. Nhấn Delete một lần để thành Welcome.", equals(greetingTarget), [go("doc:1,6"), key("Delete")]),
];
const days = ["Monday", "Tuesday", "Friday"];
const daysSteps = days.map((day, p) =>
  step(
    `Line ${p + 1}: type "${day}". ${p < days.length - 1 ? "Press Enter for the next line." : ""}`,
    `Dòng ${p + 1}: gõ “${day}”. ${p < days.length - 1 ? "Nhấn Enter để xuống dòng tiếp theo." : ""}`,
    p === 0
      ? "Hold Shift for the first letter M, then release it. Keep Caps Lock off."
      : p === 1
        ? "Hold Shift for the capital T. Small letters for the rest."
        : "Hold Shift for the capital F. Keep Caps Lock off.",
    p === 0
      ? "Giữ Shift để gõ chữ M hoa rồi thả ra. Nhớ để Caps Lock tắt."
      : p === 1
        ? "Giữ Shift để gõ chữ T hoa, các chữ còn lại viết thường."
        : "Giữ Shift để gõ chữ F hoa. Nhớ để Caps Lock tắt.",
    (doc) => tidy(textOf(doc.p[p] ?? { runs: [] })).replace(/\.$/, "") === day,
    [go(`doc:${p},0`), key(`Shift+${day[0]}`), type(day.slice(1)), ...(p < days.length - 1 ? [key("Enter")] : [])]
  )
);
const cursorSteps = [
  step(
    'Fix the first part so it says: "My name is Lan."',
    'Sửa phần đầu thành: “My name is Lan.”',
    "Use the mouse to put the cursor beside each wrong letter. Add a full stop after Lan.",
    "Dùng chuột đặt con trỏ cạnh chữ sai. Thêm dấu chấm sau Lan.",
    (doc) => /^My name is Lan(?:\.|\s|$)/.test(tidy(body(doc))),
    [...replace(0, 0, 1, "M"), ...replace(0, 4, 5, "a"), ...replace(0, 11, 12, "L"), go("doc:0,14"), key(".")]
  ),
  step(
    'Fix the second part so it says: "I like computers."',
    'Sửa phần sau thành: “I like computers.”',
    "Change i to I and R to r.",
    "Đổi i thành I và R thành r.",
    equals("My name is Lan. I like computers."),
    [...replace(0, 16, 17, "I"), ...replace(0, 30, 31, "r")]
  ),
];
const shopping = spellDoc("Buy bred, milkk and aples.", { bred: ["bread"], milkk: ["milk"], aples: ["apples"] });
const spellingSteps = [["bred", "bread"], ["milkk", "milk"], ["aples", "apples"]].map(([wrong, correct]) => ({ text: T(`Right-click ${wrong}. Click ${correct} in the suggestions.`, `Bấm chuột phải vào ${wrong}. Bấm ${correct} trong các từ gợi ý.`), hint: T("The red wavy line marks a spelling mistake. Right-click the word itself.", "Đường gạch đỏ lượn sóng báo hiệu từ có thể sai chính tả. Bấm chuột phải ngay trên từ đó."), done: (doc, ctx) => used(ctx, `spelling.${correct}`) && new RegExp(`\\b${correct}\\b`, "i").test(body(doc)) && !new RegExp(`\\b${wrong}\\b`, "i").test(body(doc)), get demo() { const offsets = { bred: 5, milkk: 13, aples: 22 }; return spellDemo(0, offsets[wrong], correct); } }));
const punctuated = (doc) => /^Buy bread, milk, eggs,? and rice\.$/.test(tidy(body(doc)));
const punctuationSteps = [step("Put a comma after bread and after milk.", "Thêm dấu phẩy sau bread và sau milk.", "Click after each word and press the comma key. Leave one space after each comma.", "Bấm ngay sau từng từ rồi nhấn phím dấu phẩy. Để một dấu cách sau mỗi dấu phẩy.", (doc) => /^Buy bread,\s+milk,\s+eggs(?:,)?\s+and rice\.?$/.test(tidy(body(doc))), [...replace(0, 14, 14, ","), ...replace(0, 9, 9, ",")]), step("Add a full stop after rice.", "Thêm dấu chấm sau rice.", "Click at the end of the sentence. Press the full stop key once.", "Bấm vào cuối câu. Nhấn phím dấu chấm một lần.", punctuated, [go("doc:0,30"), key(".")])];
const recoveryStart = "Shopping list\nBread\nMilk\nSugar";
const recoveryTarget = "Shopping list\nBread\nMilk";
const recoverySteps = [
  step(
    "Select Sugar on the last line and press Backspace to remove it.",
    "Bôi đen chữ Sugar ở dòng cuối rồi nhấn Backspace để xoá.",
    "Drag across Sugar, then press Backspace or Delete.",
    "Kéo chuột bôi đen chữ Sugar, rồi nhấn Backspace hoặc Delete.",
    (doc) => equals(recoveryTarget)(doc),
    [select(3, 0, 5), key("Backspace")]
  ),
  step(
    "Click Undo to see Sugar come back.",
    "Bấm Undo để thấy chữ Sugar hiện lại.",
    "Undo is the curved arrow at the top left. Ctrl+Z also works.",
    "Undo là mũi tên cong ở góc trên bên trái. Nhấn Ctrl+Z cũng được.",
    (doc, ctx) => used(ctx, "qat.undo"),
    [go("qat.undo")],
    "qat.undo"
  ),
  step(
    "Click Redo to remove Sugar again.",
    "Bấm Redo để xoá chữ Sugar một lần nữa.",
    "Redo is beside Undo (Ctrl+Y). Make sure Sugar is gone at the end.",
    "Redo nằm cạnh Undo (Ctrl+Y). Đảm bảo cuối cùng chữ Sugar đã được xoá.",
    (doc, ctx) => undoneThenRedone(ctx) && equals(recoveryTarget)(doc),
    [go("qat.redo")],
    "qat.redo"
  ),
];
const scheduleStart = "Tuesday class\n9 am, Room 4\nThursday class\n";
const scheduleTarget = "Tuesday class\n9 am, Room 4\nThursday class\n9 am, Room 4";
const signSteps = [step("Select the line: 9 am, Room 4. Click Copy.", "Bôi đen dòng: 9 am, Room 4. Bấm Copy.", "Drag across 9 am, Room 4, then click Copy in the Clipboard group.", "Kéo chuột bôi đen 9 am, Room 4 rồi bấm Copy trong nhóm Clipboard.", (doc, ctx) => used(ctx, "home.clipboard.copy"), [select(1, 0, 12), go("home.clipboard.copy")], "home.clipboard.copy"), step("Click the empty line below Thursday class. Click Paste.", "Bấm vào dòng trống dưới Thursday class. Bấm Paste.", "Keep the first 9 am, Room 4. Paste puts a copy under Thursday class.", "Giữ nguyên dòng 9 am, Room 4 ở trên. Paste sẽ dán thêm một bản xuống dưới Thursday class.", equals(scheduleTarget), [go("doc:3,0"), go("home.clipboard.paste")], "home.clipboard.paste")];

/* ---------- doctor's appointment note: spelling, a capital and a full stop ---------- */

const doctorStart = spellDoc("My apointment is on monday at 10 am with Dr Tran\nPlease bring your Medicare card.", { apointment: ["appointment"] });
const doctorTarget = "My appointment is on Monday at 10 am with Dr Tran.\nPlease bring your Medicare card.";
const firstLine = (doc) => tidy(textOf(doc.p[0]));
// Demo offsets below are for the line after the spelling fix: "apointment" becomes "appointment" (one letter longer).
const doctorSteps = [
  step("Right-click apointment. Click appointment in the suggestions.", "Bấm chuột phải vào apointment. Bấm appointment trong các từ gợi ý.", "The red wavy line marks a spelling mistake. Right-click the word itself.", "Đường gạch đỏ lượn sóng báo hiệu từ có thể sai chính tả. Bấm chuột phải ngay trên từ đó.", (doc, ctx) => used(ctx, "spelling.appointment") && /\bappointment\b/.test(firstLine(doc)), spellDemo(0, 5, "appointment")),
  { ...step("Click just after the m in monday. Press Backspace.", "Bấm ngay sau chữ m trong monday. Nhấn Backspace.", "Put the cursor between m and onday. Backspace removes the small m on its left.", "Đặt con trỏ giữa chữ m và onday. Backspace xoá chữ m nhỏ ở bên trái con trỏ.", (doc) => /\bonday\b|\bMonday\b/.test(firstLine(doc)), [go("doc:0,22"), key("Backspace")]), skill: "t2-move-cursor" },
  { ...step("Hold Shift and type M to make Monday.", "Giữ Shift và gõ chữ M để thành Monday.", "Days of the week begin with a capital. Hold Shift, press M, then let go. Keep Caps Lock off.", "Tên ngày trong tuần bắt đầu bằng chữ hoa. Giữ Shift, nhấn M rồi thả ra. Nhớ để Caps Lock tắt.", (doc) => /\bMonday\b/.test(firstLine(doc)), [go("doc:0,21"), key("Shift+M")]), skill: "t2-capitals" },
  { ...step("Click at the end of the first line, after Tran. Press the full stop key (.).", "Bấm vào cuối dòng đầu, sau chữ Tran. Nhấn phím dấu chấm (.).", "Put . straight after Tran, with no space before it.", "Đặt dấu . ngay sau chữ Tran, không có dấu cách ở trước.", (doc) => /\bTran\.$/.test(firstLine(doc)), [go("doc:0,49"), key(".")]), skill: "t2-punctuation" },
];

/* ---------- class jobs: Cut one line and Paste it at the end ---------- */

const jobsStart = "Lock the door\nWash the cups\nPut the chairs away\n";
const jobsOrder = ["Wash the cups", "Put the chairs away", "Lock the door"];
/** Non-empty lines, so the empty line left by Cut never matters. */
const jobLines = (doc) => doc.p.map((para) => tidy(textOf(para))).filter(Boolean);
const jobsInOrder = (doc) => {
  const lines = jobLines(doc);
  return lines.length === jobsOrder.length && jobsOrder.every((line, i) => lines[i] === line);
};
/** The first line is selected whole, or with the line break that triple-click takes. */
const jobSelected = (ctx) => {
  const s = ctx?.selection;
  const a = s?.anchor ?? s?.from;
  const b = s?.focus ?? s?.to;
  if (!a || !b) return false;
  const [left, right] = a.p < b.p || (a.p === b.p && a.offset <= b.offset) ? [a, b] : [b, a];
  return left.p === 0 && left.offset === 0 && ((right.p === 0 && right.offset >= 13) || (right.p === 1 && right.offset === 0));
};
const jobCut = (doc, ctx) => used(ctx, "home.clipboard.cut") && jobLines(doc)[0] !== "Lock the door";
const jobSelect = [go("doc:0,0"), select(0, 0, 13)];
const jobsSteps = [
  step("Select the line: Lock the door", "Bôi đen dòng: Lock the door", "Drag across Lock the door. Only this line should be blue.", "Kéo chuột qua dòng Lock the door. Chỉ bôi đen dòng này.", (doc, ctx) => jobSelected(ctx) || used(ctx, "home.clipboard.cut"), jobSelect),
  step("Click Cut.", "Bấm Cut.", "Cut is the scissors in the Clipboard group on Home. It takes the line out and keeps it ready to paste.", "Cut là hình cái kéo trong nhóm Clipboard trên Home. Cut lấy dòng ra và giữ sẵn để dán.", jobCut, [...jobSelect, go("home.clipboard.cut")], "home.clipboard.cut"),
  step("Click the empty line at the bottom. Click Paste.", "Bấm vào dòng trống ở cuối. Bấm Paste.", "Paste puts the line in its new place, after Put the chairs away.", "Paste dán dòng vào chỗ mới, sau dòng Put the chairs away.", (doc, ctx) => jobCut(doc, ctx) && used(ctx, "home.clipboard.paste") && jobsInOrder(doc), [go("doc:3,0"), go("home.clipboard.paste")], "home.clipboard.paste"),
];

export const missions = [
  mission("t2-m-hello", "t2-backspace-delete", T("Fix a greeting", "Sửa lời chào"), T("Your welcome note has two extra letters. Remove the extra l with Backspace and the extra m with Delete.", "Lời chào mừng có hai chữ gõ thừa. Hãy xoá chữ l thừa bằng Backspace và chữ m thừa bằng Delete."), greetingStart, greetingTarget, greetingSteps),
  mission("t2-m-days", "t2-capitals", T("Days for your timetable", "Các ngày học trong tuần"), T("Write your three class days on separate lines: Monday, Tuesday and Friday. Start each day with a capital letter using Shift, and keep Caps Lock off.", "Gõ ba ngày học trên ba dòng riêng: Monday, Tuesday và Friday. Viết hoa chữ đầu mỗi ngày bằng phím Shift, và nhớ để Caps Lock tắt."), "", days.join("\n"), daysSteps),
  mission("t2-m-cursor", "t2-move-cursor", T("Fix an introduction", "Sửa câu tự giới thiệu"), T("Make this introduction ready to share. Use the mouse to move the cursor and fix the capitals and missing full stop. Keep the words shown in the picture.", "Sửa lời tự giới thiệu để chia sẻ với mọi người. Dùng chuột đưa con trỏ tới chỗ sai, sửa chữ hoa và thêm dấu chấm còn thiếu. Giữ các từ như trong hình mẫu."), "my nAme is lan i like computeRs.", "My name is Lan. I like computers.", cursorSteps),
  mission("t2-m-spelling", "t2-spelling", T("Check the shopping note", "Sửa chính tả lời nhắn đi chợ"), T("Fix three spelling mistakes before you go shopping. Right-click each red-underlined word and choose bread, milk or apples.", "Sửa ba lỗi chính tả trước khi đi chợ. Bấm chuột phải vào từng từ gạch đỏ rồi chọn bread, milk hoặc apples."), shopping, "Buy bread, milk and apples.", spellingSteps, (doc, ctx) => spellingSteps.every((s) => s.done(doc, ctx)) && equals("Buy bread, milk and apples.")(doc)),
  mission("t2-m-punctuation", "t2-punctuation", T("Make a shopping sentence clear", "Thêm dấu câu vào lời nhắn đi chợ"), T("Make this shopping note easy for your family to read. Add commas after bread and milk, and put a full stop at the end.", "Làm lời nhắn đi chợ dễ đọc cho người nhà. Thêm dấu phẩy sau bread và milk, rồi đặt dấu chấm ở cuối câu."), "Buy bread milk eggs and rice", "Buy bread, milk, eggs and rice.", punctuationSteps, punctuated),
  mission("t2-m-recovery", "t2-undo-redo", T("Test Undo and Redo on a list", "Thử Undo và Redo trên danh sách"), T("You already have sugar at home. Remove Sugar from your shopping list, click Undo to see it come back, then click Redo to remove it again.", "Ở nhà vẫn còn đường. Hãy xoá Sugar khỏi danh sách đi chợ, bấm Undo để thấy chữ hiện lại, rồi bấm Redo để xoá lại."), recoveryStart, recoveryTarget, recoverySteps, (doc, ctx) => undoneThenRedone(ctx) && equals(recoveryTarget)(doc)),
  mission("t2-m-copy-address", "t2-copy-paste", T("Copy class time and room", "Sao chép giờ học và số phòng"), T("Your Tuesday and Thursday classes are at the same time and room. Copy 9 am, Room 4 and paste it on the empty line below Thursday class.", "Lớp thứ Ba và thứ Năm học cùng giờ và cùng phòng. Hãy sao chép dòng 9 am, Room 4 rồi dán xuống dòng trống dưới Thursday class."), scheduleStart, scheduleTarget, signSteps, (doc, ctx) => used(ctx, "home.clipboard.copy") && used(ctx, "home.clipboard.paste") && equals(scheduleTarget)(doc)),
  mission("t2-m-doctor-note", "t2-spelling", T("Fix a doctor's appointment note", "Sửa lời nhắn lịch hẹn khám bệnh"), T("You are sending a note about your doctor visit, and it must be correct. Fix the spelling mistake, the day name that starts with a small letter, and the missing full stop.", "Bạn sắp gửi lời nhắn về buổi khám bệnh nên cần viết cho đúng. Hãy sửa từ sai chính tả, tên ngày trong tuần chưa viết hoa, và dấu chấm còn thiếu."), doctorStart, doctorTarget, doctorSteps, (doc, ctx) => doctorSteps.every((s) => s.done(doc, ctx)) && equals(doctorTarget)(doc)),
  mission("t2-m-class-jobs", "t2-copy-paste", T("Put class jobs in order", "Sắp xếp việc dọn lớp theo thứ tự"), T("At the end of class, everyone tidies the room. The door is locked last, because nobody can tidy after it is locked. Use Cut and Paste to move Lock the door to the end of the list.", "Cuối buổi học, cả lớp dọn phòng. Khoá cửa là việc làm sau cùng, vì khoá xong thì không ai vào dọn được nữa. Hãy dùng Cut và Paste để chuyển dòng Lock the door xuống cuối danh sách."), jobsStart, jobsOrder.join("\n"), jobsSteps, (doc, ctx) => used(ctx, "home.clipboard.cut") && used(ctx, "home.clipboard.paste") && jobsInOrder(doc)),
];
