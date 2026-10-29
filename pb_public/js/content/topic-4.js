import { practiceText, punctuationReminder } from './text-rules.js';
// Topic 4: lists, everyday notes and readable notices.
import { createDoc, Para, makeRun, textOf } from '../word/model.js';

const T = (en, vi) => ({ en, vi });
const go = (target, click = 'single') => ({ target, click });
const key = (key) => ({ key });
const type = (type) => ({ type });
const select = (first, last, end) => ({ select: { from: { p: first, offset: 0 }, to: { p: last, offset: end } } });
const menu = (cmd, arg) => [go(`menu:${cmd}`), go(`choice:${cmd}:${arg}`)];
const clean = (value) => practiceText(value).toLowerCase();
const line = (doc, p) => doc.p[p] ? textOf(doc.p[p]) : '';
const sameLines = (doc, expected) => {
  const actual = doc.p.map(textOf).filter((s) => s.trim());
  return actual.length === expected.length && actual.every((s, i) => clean(s) === clean(expected[i]));
};
const replay = (doc, script) => ({ mock: 'word', doc, script });
const option = (id, en, vi) => ({ id, label: T(en, vi) });
const listDoc = (lines, first, last, kind) => createDoc({
  p: lines.map((text, p) => new Para(p >= first && p <= last ? { list: { type: kind, format: kind === 'bullet' ? '•' : '1.' } } : {}, [makeRun(text)])),
});
const listed = (doc, first, last, kind) => doc.p.length > last && doc.p.slice(first, last + 1).every((p) => p.list?.type === kind && textOf(p).trim());
const plainLine = (doc, p, expected) => {
  const actual = doc.p.filter((para) => textOf(para).trim());
  return Boolean(actual[p] && !actual[p].list && clean(textOf(actual[p])) === clean(expected));
};
const doItem = (id, skill, prompt, hint, doc, check, demo, spotlight = 'home.paragraph') => ({
  id, skill, type: 'do', prompt, hint, doc, tabs: ['home'], check, demo, spotlight, replay: replay(doc, demo),
});
const step = (text, hint, done, demo, spotlight = 'home.paragraph') => ({ text, hint, done, demo, spotlight });
const mission = (id, skill, title, scenario, startDoc, targetDoc, steps, check, extra = {}) => ({
  id, skill, title, scenario, startDoc, targetDoc, tabs: ['home'], steps, ...extra,
  goal: { check, progress: (doc, ctx) => check(doc, ctx) ? 1 : steps.filter((s) => s.done(doc, ctx)).length / steps.length },
});

const sortBins = [option('bullet', 'Bullets: items in any order', 'Bullets: các món không cần theo thứ tự'), option('number', 'Numbering: steps in order', 'Numbering: các bước phải theo thứ tự')];
const sortReplay = replay('Bread\nMilk\nWash rice.\nAdd water.', [select(0, 1, 4), go('home.paragraph.bullets'), select(2, 3, 10), go('home.paragraph.numbering')]);
const endDoc = listDoc(['Bread', 'Milk'], 0, 1, 'bullet');
const endScript = [go('doc:1,4'), key('Enter'), key('Enter'), type('Bring a bag.')];
const endCheck = (doc) => sameLines(doc, ['Bread', 'Milk', 'Bring a bag.']) && listed(doc, 0, 1, 'bullet') && plainLine(doc, 2, 'Bring a bag.');
const headingText = ['Lost cat', 'Black cat with a white tail.', 'Please call Lan.'];
function headingFormat(doc, props, text = 'lost cat') {
  const runs = doc.p[0]?.runs.filter((r) => r.text.trim()) ?? [];
  return clean(line(doc, 0)) === text && runs.length > 0 && runs.every((r) => Object.entries(props).every(([key, value]) => r[key] === value));
}
const headingCheck = (doc) => sameLines(doc, headingText) && headingFormat(doc, { size: 20, b: true }) && doc.p[0].align === 'center';
const headingScript = [select(0, 0, 8), ...menu('home.font.size', 20), go('home.font.bold'), go('home.paragraph.alignCenter')];

export const items = [
  {
    id: 't4-bullets-sort', skill: 't4-bullets', type: 'sort',
    prompt: T('Choose a clear list for each job. Sort these jobs into Bullets or Numbering.', 'Chọn kiểu danh sách dễ hiểu cho từng việc. Xếp các việc vào Bullets hoặc Numbering.'),
    hint: T('Use Bullets when the order does not matter. Use Numbering for steps that must follow an order.', 'Dùng Bullets khi không cần theo thứ tự. Dùng Numbering cho các bước phải làm theo thứ tự.'),
    bins: sortBins,
    cards: [
      { ...option('shopping', 'Foods to buy at the shop', 'Các món cần mua ở cửa hàng'), bin: 'bullet' },
      { ...option('packing', 'Things to pack in your bag', 'Những thứ cần bỏ vào túi'), bin: 'bullet' },
      { ...option('rice', 'Steps to cook rice', 'Các bước nấu cơm'), bin: 'number' },
      { ...option('word', 'Steps to open Word', 'Các bước mở Word'), bin: 'number' },
    ], replay: sortReplay,
  },
  doItem('t4-bullets-do', 't4-bullets',
    T('Make this shopping list easy to scan. Select Bread and Milk, then click Bullets.', 'Làm danh sách đi chợ dễ nhìn. Bôi đen cả Bread và Milk rồi bấm Bullets.'),
    T('Drag across both lines. Click the dots button, Bullets, in the Paragraph group.', 'Kéo chuột bôi đen cả hai dòng. Bấm nút có các dấu chấm, Bullets, trong nhóm Paragraph.'),
    'Bread\nMilk', (doc) => sameLines(doc, ['Bread', 'Milk']) && listed(doc, 0, 1, 'bullet'),
    [select(0, 1, 4), go('home.paragraph.bullets')]),
  {
    id: 't4-numbering-sort', skill: 't4-numbering', type: 'sort',
    prompt: T('Help a friend choose a list style. Sort these jobs into Bullets or Numbering.', 'Giúp một người bạn chọn kiểu danh sách phù hợp. Hãy xếp từng việc vào nhóm Bullets hoặc Numbering.'),
    hint: T('Numbers show what to do first, next and last. Dots list things without an order.', 'Số cho biết việc nào làm trước, làm sau. Dấu chấm dùng để liệt kê các thứ không cần theo thứ tự.'),
    bins: sortBins,
    cards: [
      { ...option('tea', 'Steps to make a cup of tea', 'Các bước pha một tách trà'), bin: 'number' },
      { ...option('save', 'Steps to save a new document', 'Các bước lưu văn bản mới'), bin: 'number' },
      { ...option('foods', 'Foods you like', 'Các món ăn bạn thích'), bin: 'bullet' },
      { ...option('plants', 'Plants for your garden', 'Các loại cây cho vườn'), bin: 'bullet' },
    ], replay: sortReplay,
  },
  doItem('t4-numbering-do', 't4-numbering',
    T('Show the order for cooking rice. Select both steps, then click Numbering.', 'Cho biết thứ tự nấu cơm. Bôi đen cả hai bước rồi bấm Numbering.'),
    T('Select Wash the rice. and Add water. Click the 1, 2, 3 button in the Paragraph group.', 'Bôi đen cả Wash the rice. và Add water. Bấm nút có số 1, 2, 3 trong nhóm Paragraph.'),
    'Wash the rice.\nAdd water.', (doc) => sameLines(doc, ['Wash the rice.', 'Add water.']) && listed(doc, 0, 1, 'number'),
    [select(0, 1, 10), go('home.paragraph.numbering')]),
  {
    id: 't4-end-list-pick', skill: 't4-end-list', type: 'pick',
    prompt: T('You finished the last item in your shopping list. Which key sequence ends the list so you can write a normal sentence?', 'Bạn đã gõ xong món cuối cùng trong danh sách đi chợ. Nhấn phím nào để kết thúc danh sách và viết câu bình thường?'),
    hint: T('The first Enter makes an empty list item. The second Enter removes its dot or number.', 'Enter lần đầu tạo một mục trống. Enter lần thứ hai bỏ dấu chấm hoặc số của mục đó.'),
    options: [option('twice', 'Press Enter twice', 'Nhấn Enter hai lần'), option('once', 'Press Enter once', 'Nhấn Enter một lần'), option('space', 'Press Space twice', 'Nhấn phím cách hai lần')],
    answer: 'twice', replay: replay(endDoc, endScript),
  },
  { ...doItem('t4-end-list-do', 't4-end-list',
    T('Add a reminder under this shopping list. Click after Milk, press Enter twice, then type "Bring a bag." without a bullet.', 'Thêm câu nhắc bên dưới danh sách đi chợ. Bấm sau chữ Milk, nhấn Enter hai lần rồi gõ “Bring a bag.” ở dòng không có dấu chấm đầu dòng.'),
    T('Press Enter once for an empty bullet. Press Enter again to end the list. Then type "Bring a bag."', 'Nhấn Enter một lần để ra mục trống. Nhấn thêm lần nữa để kết thúc danh sách. Sau đó gõ “Bring a bag.”'),
    endDoc, endCheck, endScript), expectedText: 'Bread\nMilk\nBring a bag.' },
  {
    id: 't4-note-tea-order', skill: 't4-note', type: 'order',
    prompt: T('You want Mai to bring tea. Put the steps in order to write her a short note.', 'Bạn muốn nhờ Mai mang trà đến. Xếp các bước theo thứ tự để viết lời nhắn cho Mai.'),
    hint: T('Begin with the greeting. Write the message next. Put your signature line at the end.', 'Đầu tiên là lời chào kèm tên người nhận, tiếp theo là lời nhắn, cuối cùng là dòng ký tên ở cuối.'),
    steps: [option('greeting', 'Type the greeting: Dear Mai,', 'Gõ lời chào: Dear Mai,'), option('message', 'Press Enter. Type: Bring tea.', 'Nhấn Enter. Gõ: Bring tea.'), option('name', 'Press Enter. Type: Thanks, Lan', 'Nhấn Enter. Gõ: Thanks, Lan')],
    replay: replay('', [go('doc:0,0'), type('Dear Mai,'), key('Enter'), type('Bring tea.'), key('Enter'), type('Thanks, Lan')]),
  },
  {
    id: 't4-note-call-order', skill: 't4-note', type: 'order',
    prompt: T('You want Nam to call you. Put the steps in order to write him a short note.', 'Bạn muốn nhờ Nam gọi cho mình. Xếp các bước theo thứ tự để viết lời nhắn cho Nam.'),
    hint: T('The reader sees their name first, your message next, then your signature line.', 'Đầu tiên là lời chào kèm tên người nhận, tiếp theo là lời nhắn, cuối cùng là dòng ký tên ở cuối.'),
    steps: [option('greeting', 'Type the greeting: Dear Nam,', 'Gõ lời chào: Dear Nam,'), option('message', 'Press Enter. Type: Please call.', 'Nhấn Enter. Gõ: Please call.'), option('name', 'Press Enter. Type: From Lan', 'Nhấn Enter. Gõ: From Lan')],
    replay: replay('', [go('doc:0,0'), type('Dear Nam,'), key('Enter'), type('Please call.'), key('Enter'), type('From Lan')]),
  },
  doItem('t4-heading-do', 't4-heading-sign',
    T('Help people notice your lost cat sign. Make only Lost cat size 20, bold and centred.', 'Giúp mọi người dễ thấy thông báo tìm mèo lạc. Chỉ đổi Lost cat thành cỡ 20, in đậm và canh giữa.'),
    T('Select Lost cat. Set Font Size to 20. Click Bold, then Center.', 'Bôi đen Lost cat. Đặt Font Size là 20. Bấm Bold rồi bấm Center.'),
    headingText.join('\n'), headingCheck, headingScript, 'home.font'),
];

const phoLines = ['Shopping for pho', 'Rice noodles', 'Beef', 'Onion', 'Thank you.'];
const phoCheck = (doc) => sameLines(doc, phoLines) && listed(doc, 1, 3, 'bullet') && !doc.p[0].list && plainLine(doc, 4, 'Thank you.');
const phoSteps = [
  step(T('Select the three food lines. Click Bullets.', 'Bôi đen ba dòng nguyên liệu. Bấm Bullets.'),
    T('Select Rice noodles, Beef and Onion. Leave the title out of the selection.', 'Bôi đen Rice noodles, Beef và Onion. Không bôi đen tiêu đề.'),
    (doc) => listed(doc, 1, 3, 'bullet') && !doc.p[0].list,
    [select(1, 3, 5), go('home.paragraph.bullets')]),
  step(T('Click after Onion. Press Enter twice to end the list.', 'Bấm sau Onion. Nhấn Enter hai lần để kết thúc danh sách.'),
    T('Enter once adds an empty bullet. Enter again removes that bullet.', 'Enter lần đầu thêm mục trống. Enter lần nữa bỏ dấu chấm của mục đó.'),
    (doc) => doc.p.length >= 5 && !doc.p[4].list,
    [go('doc:3,5'), key('Enter'), key('Enter')]),
  step(T('On the new line, type: Thank you.', 'Ở dòng mới, gõ: Thank you.'),
    T('The line below Onion has no bullet. Type Thank you. there.', 'Dòng dưới Onion không có dấu chấm đầu dòng. Gõ Thank you. ở đó.'),
    phoCheck, [go('doc:4,0'), type('Thank you.')]),
];
const riceLines = ['Cook rice', 'Wash the rice.', 'Add water.', 'Turn on the cooker.'];
const riceCheck = (doc) => sameLines(doc, riceLines) && listed(doc, 1, 3, 'number') && !doc.p[0].list;
const riceSteps = [
  step(T('Select the three cooking steps. Click Numbering.', 'Bôi đen ba bước nấu cơm. Bấm Numbering.'),
    T('Select the lines from Wash the rice. to Turn on the cooker. Leave the title plain.', 'Bôi đen từ dòng Wash the rice. đến hết Turn on the cooker. Giữ tiêu đề không có số.'),
    riceCheck, [select(1, 3, 19), go('home.paragraph.numbering')]),
];
const packDoc = listDoc(['Things to pack', 'Water', 'Hat'], 1, 2, 'bullet');
const packCheck = (doc) => sameLines(doc, ['Things to pack', 'Water', 'Hat', 'We leave at 9 am.']) && listed(doc, 1, 2, 'bullet') && plainLine(doc, 3, 'We leave at 9 am.');
const packSteps = [
  step(T('Click after Hat. Press Enter twice to end the list.', 'Bấm sau Hat. Nhấn Enter hai lần để kết thúc danh sách.'),
    T('The second Enter removes the bullet so you get a normal line.', 'Nhấn Enter lần thứ hai sẽ bỏ dấu chấm đầu dòng để ra dòng bình thường.'),
    (doc) => doc.p.length >= 4 && !doc.p[3].list, [go('doc:2,3'), key('Enter'), key('Enter')]),
  step(T('On the new line, type: We leave at 9 am.', 'Ở dòng mới, gõ: We leave at 9 am.'),
    T('Type We leave at 9 am. on the line without a bullet.', 'Gõ We leave at 9 am. ở dòng không có dấu chấm đầu dòng.'),
    packCheck, [go('doc:3,0'), type('We leave at 9 am.')]),
];
const asciiFirst = (name) => {
  const t = String(name ?? '').trim().split(/\s+/)[0] ?? '';
  const a = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z]/g, '');
  return a ? a[0].toUpperCase() + a.slice(1).toLowerCase() : '';
};
let demoWho = 'Lan';
const withWho = (fn) => (doc, ctx) => {
  demoWho = asciiFirst(ctx?.learner?.name) || 'Lan';
  return fn(doc, ctx);
};
const noteLines = ['Dear Mai,', 'Please water my plants.', 'I am away today.', 'Thank you, Lan'];
const thankYouLine = (s) => /^thank you\s+\p{L}[\p{L}’' -]*$/iu.test(practiceText(s));
const noteCheck = (doc, ctx) => {
  demoWho = asciiFirst(ctx?.learner?.name) || 'Lan';
  const actual = doc.p.map(textOf).filter((s) => s.trim());
  return actual.length === 4 && noteLines.slice(0, 3).every((t, i) => clean(actual[i]) === clean(t)) && thankYouLine(actual[3]);
};
const noteReminder = (doc) => {
  const actual = doc.p.map(textOf).filter((s) => s.trim());
  if (actual.length !== 4) return null;
  const m = /^thank you[, ]+\s*(.+?)\.?$/iu.exec(actual[3].trim());
  const who = m ? m[1].trim() : 'Lan';
  const dot = actual[3].trim().endsWith('.') ? '.' : '';
  return punctuationReminder(actual.join('\n'), ['Dear Mai,', 'Please water my plants.', 'I am away today.', `Thank you, ${who}${dot}`].join('\n'));
};
const noteSteps = [
  ...noteLines.slice(0, 3).map((text, p) => step(
    T(`Line ${p + 1}: type "${text}", then press Enter.`, `Dòng ${p + 1}: gõ “${text}”, rồi nhấn phím Enter để xuống dòng.`),
    T(p === 0 ? 'Begin with Dear Mai, including the comma. Then press Enter.' : 'Type the words shown for this line, then press Enter.', p === 0 ? 'Bắt đầu bằng Dear Mai, có dấu phẩy. Rồi nhấn Enter để xuống dòng.' : 'Gõ đúng chữ cho dòng này rồi nhấn Enter để xuống dòng.'),
    withWho((doc) => clean(line(doc, p)) === clean(text) && doc.p.length >= p + 2),
    [go(`doc:${p},0`), type(text), key('Enter')],
    'home.paragraph',
  )),
  {
    text: T('Line 4: type "Thank you," and your name (for example: "Thank you, Lan").', 'Dòng 4: gõ “Thank you,” kèm tên của bạn (ví dụ: “Thank you, Lan”).'),
    hint: T('Press Enter after the third line if needed. Type Thank you, then a comma, a space and your name.', 'Gõ Thank you, rồi dấu phẩy, dấu cách và tên của bạn.'),
    done: withWho((doc) => thankYouLine(line(doc, 3))),
    get demo() {
      return [go(`doc:3,0`), type(`Thank you, ${demoWho}`)];
    },
    spotlight: 'home.paragraph',
  },
];
const noticeSteps = [
  step(T('Select Lost cat. Change Font Size to 20.', 'Bôi đen Lost cat. Đổi Font Size thành 20.'),
    T('Select only the first line. Open Font Size and click 20.', 'Chỉ bôi đen dòng đầu. Mở Font Size rồi bấm 20.'),
    (doc) => headingFormat(doc, { size: 20 }), [select(0, 0, 8), ...menu('home.font.size', 20)], 'home.font'),
  step(T('Select Lost cat. Click Bold.', 'Bôi đen Lost cat. Bấm Bold.'),
    T('Select the heading again if it is no longer blue. Click B.', 'Nếu tiêu đề không còn được bôi đen, hãy bôi đen lại. Bấm B.'),
    (doc) => headingFormat(doc, { b: true }), [select(0, 0, 8), go('home.font.bold')], 'home.font'),
  step(T('Click in Lost cat. Click Center.', 'Bấm vào Lost cat. Bấm Center.'),
    T('Center is in the Paragraph group. It puts the heading in the middle.', 'Center nằm trong nhóm Paragraph, đưa tiêu đề vào giữa.'),
    (doc) => doc.p[0].align === 'center', [go('doc:0,2'), go('home.paragraph.alignCenter')]),
];

const withSkill = (skill, ...list) => list.map((s) => ({ ...s, skill }));
const phinLines = ['Phin coffee', 'Put coffee in the phin.', 'Pour hot water.', 'Wait five minutes.', 'Enjoy your coffee.'];
const phinNumbered = (doc) => listed(doc, 1, 3, 'number') && !doc.p[0].list;
const phinCheck = (doc) => sameLines(doc, phinLines) && phinNumbered(doc) && plainLine(doc, 4, 'Enjoy your coffee.');
const phinSteps = [
  step(T('Select the three steps. Click Numbering.', 'Bôi đen ba bước. Bấm Numbering.'),
    T('Select from Put coffee in the phin. to Wait five minutes. Leave the title plain.', 'Bôi đen từ dòng Put coffee in the phin. đến hết Wait five minutes. Giữ tiêu đề không có số.'),
    phinNumbered, [select(1, 3, 18), go('home.paragraph.numbering')]),
  ...withSkill('t4-end-list',
    step(T('Click after Wait five minutes. Press Enter twice to end the list.', 'Bấm sau Wait five minutes. Nhấn Enter hai lần để kết thúc danh sách.'),
      T('Enter once adds an empty number. Enter again removes that number.', 'Enter lần đầu thêm một số trống. Enter lần nữa bỏ số đó.'),
      (doc) => phinNumbered(doc) && doc.p.length >= 5 && !doc.p[4].list, [go('doc:3,18'), key('Enter'), key('Enter')]),
    step(T('On the new line, type: Enjoy your coffee.', 'Ở dòng mới, gõ: Enjoy your coffee.'),
      T('The new line has no number. Type Enjoy your coffee. there.', 'Dòng mới không có số. Gõ Enjoy your coffee. ở đó.'),
      phinCheck, [go('doc:4,0'), type('Enjoy your coffee.')])),
];
const saleLines = ['Garage sale', 'Chairs', 'Books', 'Plates', 'Saturday 9 am'];
const saleHeading = (doc, props) => headingFormat(doc, props, 'garage sale');
const saleItems = (doc) => listed(doc, 1, 3, 'bullet') && !doc.p[0].list && !doc.p[4]?.list;
const saleCheck = (doc) => sameLines(doc, saleLines) && saleHeading(doc, { size: 20, b: true }) && doc.p[0].align === 'center' && saleItems(doc);
const saleSteps = [
  step(T('Select Garage sale. Change Font Size to 20.', 'Bôi đen Garage sale. Đổi Font Size thành 20.'),
    T('Select only the first line. Open Font Size and click 20.', 'Chỉ bôi đen dòng đầu. Mở Font Size rồi bấm 20.'),
    (doc) => saleHeading(doc, { size: 20 }), [select(0, 0, 11), ...menu('home.font.size', 20)], 'home.font'),
  step(T('Select Garage sale. Click Bold.', 'Bôi đen Garage sale. Bấm Bold.'),
    T('Select the heading again if it is no longer blue. Click B.', 'Nếu tiêu đề không còn được bôi đen, hãy bôi đen lại. Bấm B.'),
    (doc) => saleHeading(doc, { b: true }), [select(0, 0, 11), go('home.font.bold')], 'home.font'),
  step(T('Click in Garage sale. Click Center.', 'Bấm vào Garage sale. Bấm Center.'),
    T('Center is in the Paragraph group. It puts the heading in the middle.', 'Center nằm trong nhóm Paragraph, đưa tiêu đề vào giữa.'),
    (doc) => doc.p[0].align === 'center', [go('doc:0,5'), go('home.paragraph.alignCenter')]),
  ...withSkill('t4-bullets',
    step(T('Select the three items. Click Bullets.', 'Bôi đen ba món đồ. Bấm Bullets.'),
      T('Select Chairs, Books and Plates. Leave Saturday 9 am out of the selection.', 'Bôi đen Chairs, Books và Plates. Không bôi đen dòng Saturday 9 am.'),
      saleItems, [select(1, 3, 6), go('home.paragraph.bullets')])),
];

export const missions = [
  mission('t4-m-pho-list', 't4-bullets', T('Shopping for pho', 'Danh sách mua đồ nấu phở'),
    T('Your family member is going to the market for you. Give each pho ingredient a bullet, then write Thank you. on a plain line below.', 'Người nhà sẽ đi chợ giúp bạn. Hãy thêm dấu chấm đầu dòng cho từng nguyên liệu nấu phở, rồi gõ Thank you. ở dòng bình thường bên dưới.'),
    phoLines.slice(0, 4).join('\n'), listDoc(phoLines, 1, 3, 'bullet'), phoSteps, phoCheck),
  mission('t4-m-rice-steps', 't4-numbering', T('Steps to cook rice', 'Các bước nấu cơm'),
    T('Help someone follow your rice instructions. Number the three steps. Keep the title without a number.', 'Giúp người khác làm theo hướng dẫn nấu cơm. Đánh số ba bước. Không đánh số tiêu đề.'),
    riceLines.join('\n'), listDoc(riceLines, 1, 3, 'number'), riceSteps, riceCheck),
  mission('t4-m-finish-list', 't4-end-list', T('Add a note below a packing list', 'Thêm lời nhắn dưới danh sách đồ mang theo'),
    T('Add the departure time below your packing list. End the bullet list after Hat, then type We leave at 9 am. on a plain line.', 'Ghi thêm giờ khởi hành bên dưới danh sách đồ mang theo. Kết thúc danh sách sau chữ Hat, rồi gõ We leave at 9 am. ở dòng không có dấu chấm đầu dòng.'),
    packDoc, listDoc(['Things to pack', 'Water', 'Hat', 'We leave at 9 am.'], 1, 2, 'bullet'), packSteps, packCheck),
  mission('t4-m-neighbour-note', 't4-note', T('A note to your neighbour', 'Lời nhắn cho hàng xóm'),
    T('Ask Mai to water your plants while you are away. Write four lines: a greeting, two sentences, and Thank you with your name.', 'Nhờ Mai tưới cây giúp khi bạn đi vắng. Viết bốn dòng: lời chào, hai câu nhắn, và lời cảm ơn kèm tên của bạn.'),
    '', noteLines.join('\n'), noteSteps, noteCheck, { completionReminder: noteReminder }),
  mission('t4-m-lost-cat-notice', 't4-heading-sign', T('A lost cat notice', 'Thông báo tìm mèo lạc'),
    T('Help your neighbours notice your missing cat. Make Lost cat size 20, bold and centred. Keep the message below it.', 'Giúp hàng xóm chú ý đến thông báo tìm mèo. Làm Lost cat cỡ 20, in đậm và canh giữa. Giữ lời nhắn ở bên dưới.'),
    headingText.join('\n'), createDoc({ p: headingText.map((text, p) => new Para(p === 0 ? { align: 'center' } : {}, [makeRun(text, p === 0 ? { size: 20, b: true } : {})])) }), noticeSteps, headingCheck),
  mission('t4-m-phin-coffee', 't4-numbering', T('Steps to make phin coffee', 'Các bước pha cà phê phin'),
    T('Show a friend how to make phin coffee. Number the three steps and keep the title without a number. Then end the list and type Enjoy your coffee. on a plain line.', 'Chỉ cho bạn bè cách pha cà phê phin. Đánh số ba bước, không đánh số tiêu đề. Rồi kết thúc danh sách và gõ Enjoy your coffee. ở dòng bình thường.'),
    phinLines.slice(0, 4).join('\n'), listDoc(phinLines, 1, 3, 'number'), phinSteps, phinCheck),
  mission('t4-m-garage-sale', 't4-heading-sign', T('A garage sale sign', 'Bảng hiệu bán đồ cũ'),
    T('You are selling things from your house on Saturday. Make Garage sale size 20, bold and centred, then give each item a bullet. Keep Saturday 9 am plain.', 'Thứ Bảy bạn bán đồ cũ trước nhà. Làm Garage sale cỡ 20, in đậm và canh giữa, rồi thêm dấu chấm đầu dòng cho từng món đồ. Giữ dòng Saturday 9 am như cũ.'),
    saleLines.join('\n'), createDoc({ p: saleLines.map((text, p) => new Para({
      ...(p === 0 ? { align: 'center' } : {}),
      ...(p >= 1 && p <= 3 ? { list: { type: 'bullet', format: '•' } } : {}),
    }, [makeRun(text, p === 0 ? { size: 20, b: true } : {})])) }), saleSteps, saleCheck),
];
