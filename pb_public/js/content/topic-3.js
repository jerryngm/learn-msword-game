// Topic 3: select first, then format text and paragraphs in Windows Word.
import { createDoc, makeRun, Para, textOf, DEFAULT_RUN } from '../word/model.js';

const T = (en, vi) => ({ en, vi });
const go = (target, click = 'single') => ({ target, click });
const say = (en, vi) => ({ say: T(en, vi) });
const key = (key) => ({ key });
const range = (p, end, start = 0) => ({ from: { p, offset: start }, to: { p, offset: end } });
const select = (p, end, start = 0) => ({ select: range(p, end, start) });
const menu = (cmd, arg) => [go(`menu:${cmd}`), go(`choice:${cmd}:${arg}`)];
const normal = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const paraText = (doc, p) => textOf(doc.p[p]);
const sameText = (doc, expected) => normal(textOf(doc)) === normal(expected);

// Check every letter in the requested words, even if formatting has split a word into runs.
function formatted(doc, p, start, end, props) {
  let offset = 0;
  let letters = 0;
  let good = true;
  for (const run of doc.p[p]?.runs ?? []) {
    const from = Math.max(start, offset);
    const to = Math.min(end, offset + run.text.length);
    if (to > from && run.text.slice(from - offset, to - offset).trim()) {
      letters += to - from;
      if (!Object.entries(props).every(([k, v]) => run[k] === v)) good = false;
    }
    offset += run.text.length;
  }
  return letters > 0 && offset >= end && good;
}
const wholeFormatted = (doc, p, props) => formatted(doc, p, 0, paraText(doc, p).length, props);
function selected(doc, ctx, p, start, end) {
  const s = ctx?.selection;
  if (!s) return false;
  const a = s.anchor ?? s.from;
  const b = s.focus ?? s.to;
  if (!a || !b || a.p !== p || b.p !== p) return false;
  const left = Math.min(a.offset, b.offset);
  const right = Math.max(a.offset, b.offset);
  // Word's double-click includes a trailing space. It is still the right word.
  return left <= start && right >= end &&
    !paraText(doc, p).slice(left, start).trim() && !paraText(doc, p).slice(end, right).trim();
}
function selectedAll(doc, ctx) {
  const s = ctx?.selection;
  const a = s?.anchor ?? s?.from;
  const b = s?.focus ?? s?.to;
  if (!a || !b) return false;
  const [left, right] = a.p < b.p || (a.p === b.p && a.offset <= b.offset) ? [a, b] : [b, a];
  return left.p === 0 && left.offset === 0 && right.p === doc.p.length - 1 && right.offset === paraText(doc, right.p).length;
}
const docWith = (text, run = {}, paragraph = {}) => createDoc({ p: text.split('\n').map((s) => new Para(paragraph, [makeRun(s, run)])) });
const replay = (doc, script) => ({ mock: 'word', doc, script });
function doItem(id, skill, prompt, hint, doc, check, script, spotlight = 'home.font') {
  return { id: `t3-${id}`, skill: `t3-${skill}`, type: 'do', prompt, hint, doc, tabs: ['home'], check, spotlight, demo: script, replay: replay(doc, script) };
}
function pick(id, skill, prompt, hint, options, answer, doc, script) {
  return { id: `t3-${id}`, skill: `t3-${skill}`, type: 'pick', prompt, hint, options: options.map(([id, en, vi]) => ({ id, label: T(en, vi) })), answer, replay: replay(doc, script) };
}
const biuOptions = [['bold', 'B — Bold', 'B — In đậm'], ['italic', 'I — Italic', 'I — In nghiêng'], ['underline', 'U — Underline', 'U — Gạch chân']];
const alignOptions = [['left', 'Align Left', 'Canh trái'], ['center', 'Center', 'Canh giữa'], ['right', 'Align Right', 'Canh phải']];
const selectHint = T('Hold the left mouse button and move across the words. Let go when the words are blue.', 'Giữ nút chuột trái và kéo qua các chữ. Thả chuột khi các chữ đã được bôi đen.');

export const items = [
  doItem('select-word', 'select', T('You want to change one word in a sign. Double-click OPEN to select it.', 'Bạn muốn đổi kiểu một chữ trên bảng hiệu. Hãy bấm đúp vào OPEN để bôi đen chữ đó.'), T('Click twice quickly on OPEN. Only this word should be blue.', 'Bấm hai lần thật nhanh vào OPEN. Chỉ bôi đen chữ này.'), 'We are OPEN today.', (d, c) => selected(d, c, 0, 7, 11), [go('doc:0,8', 'double'), select(0, 11, 7)]),
  doItem('select-line', 'select', T('You want to change the heading on a notice. Drag across the whole first line: Class notice.', 'Bạn muốn đổi kiểu tiêu đề thông báo. Hãy kéo chuột để bôi đen cả dòng đầu: Class notice.'), selectHint, 'Class notice\nBring a pen.', (d, c) => selected(d, c, 0, 0, 12), [go('doc:0,0'), select(0, 12)]),
  doItem('select-all', 'select', T('You want to change all the text in a note. Click in the note, then press Ctrl+A to select everything.', 'Bạn muốn đổi kiểu toàn bộ lời nhắn. Hãy bấm vào lời nhắn, rồi nhấn Ctrl+A để bôi đen tất cả.'), T('Click the white page. Hold Ctrl and press A.', 'Bấm vào trang giấy trắng. Giữ Ctrl và nhấn A.'), 'Dear Mai,\nPlease bring tea.', (d, c) => selectedAll(d, c), [go('doc:0,0'), key('Ctrl+A'), { select: { from: { p: 0, offset: 0 }, to: { p: 1, offset: 17 } } }]),
  pick('bold-pick', 'bold-italic-underline', T('You want OPEN to look thick on a shop sign. Which button makes it bold?', 'Bạn muốn chữ OPEN trên bảng hiệu cửa hàng trông đậm hơn. Nút nào làm chữ in đậm?'), T('Bold is the B button in the Font group.', 'Bold là nút B trong nhóm Font.'), biuOptions, 'bold', 'OPEN', [select(0, 4), go('home.font.bold')]),
  pick('italic-pick', 'bold-italic-underline', T('You want a word in your menu to lean to the side. Which button makes it italic?', 'Bạn muốn một chữ trong thực đơn nghiêng sang bên. Nút nào làm chữ in nghiêng?'), T('Italic is the I button in the Font group.', 'Italic là nút I trong nhóm Font.'), biuOptions, 'italic', 'Special', [select(0, 7), go('home.font.italic')]),
  pick('underline-pick', 'bold-italic-underline', T('You want a line under the date on a notice. Which button adds an underline?', 'Bạn muốn có một nét gạch dưới ngày trên thông báo. Nút nào gạch chân chữ?'), T('Underline is the U button with a line under it.', 'Underline là nút U có nét gạch bên dưới.'), biuOptions, 'underline', 'Monday', [select(0, 6), go('home.font.underline')]),
  doItem('bold-do', 'bold-italic-underline', T('Customers need to see your shop sign. Select OPEN, then click Bold (B).', 'Khách cần nhìn rõ bảng hiệu cửa hàng. Hãy bôi đen OPEN, rồi bấm Bold (B).'), T('Double-click OPEN. Click B in the Font group.', 'Bấm đúp vào OPEN. Bấm B trong nhóm Font.'), 'OPEN', (d) => sameText(d, 'OPEN') && wholeFormatted(d, 0, { b: true }), [go('doc:0,1', 'double'), select(0, 4), go('home.font.bold')]),
  doItem('italic-underline-do', 'bold-italic-underline', T('You want the word Special to stand out on your menu. Make it italic and underlined.', 'Bạn muốn chữ Special nổi bật trên thực đơn. Hãy làm chữ này in nghiêng và gạch chân.'), T('Select Special. Click Italic (I), then Underline (U).', 'Bôi đen Special. Bấm Italic (I), rồi bấm Underline (U).'), 'Special', (d) => sameText(d, 'Special') && wholeFormatted(d, 0, { i: true, u: 'single' }), [go('doc:0,1', 'double'), select(0, 7), go('home.font.italic'), go('home.font.underline')]),
  doItem('font-do', 'font-size', T('You want your menu title in Arial. Select Menu, then change the Font to Arial.', 'Bạn muốn tiêu đề thực đơn dùng kiểu chữ Arial. Hãy bôi đen Menu, rồi đổi Font thành Arial.'), T('Select Menu. Open the Font list and click Arial.', 'Bôi đen Menu. Mở danh sách Font và bấm Arial.'), 'Menu', (d) => sameText(d, 'Menu') && wholeFormatted(d, 0, { font: 'Arial' }), [select(0, 4), ...menu('home.font.name', 'Arial')]),
  doItem('size-do', 'font-size', T('You want a bigger menu title. Select Menu and change Font Size to 20.', 'Bạn muốn tiêu đề thực đơn to hơn. Hãy bôi đen Menu và đổi Font Size thành 20.'), T('Select Menu. Open the Font Size list and click 20.', 'Bôi đen Menu. Mở danh sách Font Size và bấm 20.'), 'Menu', (d) => sameText(d, 'Menu') && wholeFormatted(d, 0, { size: 20 }), [select(0, 4), ...menu('home.font.size', 20)]),
  pick('size-pick', 'font-size', T('People will read your shop sign from far away. Which is the largest font size?', 'Mọi người sẽ đọc bảng hiệu cửa hàng từ xa. Cỡ chữ nào lớn nhất?'), T('A bigger number makes bigger letters.', 'Số càng lớn thì chữ càng to.'), [['12', '12', '12'], ['16', '16', '16'], ['20', '20', '20'], ['36', '36', '36']], '36', 'OPEN', [select(0, 4), ...menu('home.font.size', 36)]),
  doItem('colour-do', 'font-colour', T('You want a red festival heading. Select Festival and change Font Color to Red.', 'Bạn muốn tiêu đề lễ hội có màu đỏ. Hãy bôi đen Festival và đổi Font Color thành Red.'), T('Select Festival. Open the arrow beside Font Color (A with a colour bar). Choose Red in Standard Colors.', 'Bôi đen Festival. Bấm mũi tên cạnh Font Color (chữ A có vạch màu). Chọn Red trong Standard Colors.'), 'Festival', (d) => sameText(d, 'Festival') && wholeFormatted(d, 0, { colour: '#FF0000' }), [select(0, 8), ...menu('home.font.colour', '#FF0000')]),
  pick('colour-pick', 'font-colour', T('Your notice is on white paper. Which letter colour is easier to read?', 'Thông báo được in trên giấy trắng. Màu chữ nào dễ đọc hơn?'), T('Dark letters show clearly on white paper.', 'Chữ màu đậm nổi rõ trên giấy trắng.'), [['dark', 'Black letters', 'Chữ màu đen'], ['pale', 'Yellow letters', 'Chữ màu vàng']], 'dark', 'Class notice', [select(0, 12), ...menu('home.font.colour', 'auto'), say('Dark letters are easy to read on white paper.', 'Chữ màu đậm dễ đọc trên giấy trắng.')]),
  doItem('highlight-do', 'highlight', T('You want readers to notice the date. Select 12 May and add yellow Text Highlight Color.', 'Bạn muốn người đọc chú ý đến ngày. Hãy bôi đen 12 May và tô nền vàng bằng Text Highlight Color.'), T('Select 12 May. Click Text Highlight Color, the pen with a yellow bar.', 'Bôi đen 12 May. Bấm Text Highlight Color, hình bút có vạch vàng.'), '12 May', (d) => sameText(d, '12 May') && wholeFormatted(d, 0, { highlight: '#FFFF00' }), [select(0, 6), ...menu('home.font.highlight', '#FFFF00')]),
  pick('highlight-pick', 'highlight', T('You want a yellow background behind a date. Which tool puts colour behind the letters?', 'Bạn muốn có nền vàng phía sau ngày. Công cụ nào tô màu phía sau chữ?'), T('The pen is Text Highlight Color. Font Color changes the letters themselves.', 'Hình bút là Text Highlight Color, dùng để tô nền. Font Color đổi màu của chữ.'), [['highlight', 'Text Highlight Color (pen)', 'Text Highlight Color (hình bút)'], ['colour', 'Font Color (A)', 'Font Color (chữ A)']], 'highlight', '12 May', [select(0, 6), ...menu('home.font.highlight', '#FFFF00')]),
  pick('align-letter-pick', 'align', T('You are writing a letter to your bank. Which alignment is usual for the message?', 'Bạn đang viết thư gửi ngân hàng. Nội dung thư thường canh theo kiểu nào?'), T('Normal letter writing starts at the left edge.', 'Nội dung thư thường bắt đầu từ mép trái.'), alignOptions, 'left', 'Dear Sir or Madam,', [go('doc:0,0'), go('home.paragraph.alignLeft')]),
  pick('align-title-pick', 'align', T('You want your title in the middle of the page. Which alignment should you choose?', 'Bạn muốn tiêu đề nằm giữa trang. Bạn chọn cách canh nào?'), T('Center puts the line in the middle.', 'Center đưa dòng chữ vào giữa.'), alignOptions, 'center', 'Class notice', [go('doc:0,0'), go('home.paragraph.alignCenter')]),
  doItem('align-centre-do', 'align', T('You want the notice title in the middle. Centre the line Class notice.', 'Bạn muốn tiêu đề thông báo nằm giữa. Hãy canh giữa dòng Class notice.'), T('Click in the title. Click Center in the Paragraph group.', 'Bấm vào tiêu đề. Bấm Center trong nhóm Paragraph.'), 'Class notice', (d) => sameText(d, 'Class notice') && d.p[0].align === 'center', [go('doc:0,2'), go('home.paragraph.alignCenter')], 'home.paragraph'),
  doItem('align-right-do', 'align', T('You want your name at the right side of a note. Right-align the line From Lan.', 'Bạn muốn tên mình ở phía bên phải lời nhắn. Hãy canh phải dòng From Lan.'), T('Click in From Lan. Click Align Right in the Paragraph group.', 'Bấm vào dòng From Lan. Bấm Align Right trong nhóm Paragraph.'), 'From Lan', (d) => sameText(d, 'From Lan') && d.p[0].align === 'right', [go('doc:0,2'), go('home.paragraph.alignRight')], 'home.paragraph'),
  pick('spacing-pick', 'line-spacing', T('You want more room between lines in a note. What happens when you change line spacing from 1.0 to 1.5?', 'Bạn muốn các dòng trong lời nhắn thoáng hơn. Khi đổi khoảng cách dòng từ 1.0 lên 1.5, điều gì xảy ra?'), T('Line spacing changes the space between lines, not the size of the letters.', 'Khoảng cách dòng chỉ làm các dòng xa hoặc gần nhau hơn, không đổi cỡ chữ.'), [['apart', 'The lines move further apart', 'Các dòng cách xa nhau hơn'], ['big', 'The letters become bigger', 'Chữ trở nên to hơn'], ['colour', 'The letters change colour', 'Chữ đổi màu']], 'apart', docWith('Bring a pen.\nBring your laptop.', {}, { spacing: { line: 1 } }), [go('doc:0,0'), key('Ctrl+A'), ...menu('home.paragraph.spacing', 1.5)]),
  doItem('spacing-do', 'line-spacing', T('You want an easy-to-read note. Select all the text and set line spacing to 1.5.', 'Bạn muốn lời nhắn dễ đọc hơn. Hãy bôi đen tất cả và đặt khoảng cách dòng là 1.5.'), T('Click in the note and press Ctrl+A. Open Line and Paragraph Spacing. Click 1.5.', 'Bấm vào lời nhắn và nhấn Ctrl+A. Mở Line and Paragraph Spacing. Bấm 1.5.'), 'Bring a pen.\nBring your laptop.', (d) => sameText(d, 'Bring a pen.\nBring your laptop.') && d.p.every((p) => p.spacing.line === 1.5), [go('doc:0,0'), key('Ctrl+A'), ...menu('home.paragraph.spacing', 1.5)], 'home.paragraph'),
  doItem('clear-do', 'clear-format', T('Your note has too many text styles. Select all the text and use Clear All Formatting to make it plain.', 'Lời nhắn có quá nhiều kiểu chữ. Hãy bôi đen tất cả và dùng Clear All Formatting để chữ trở lại bình thường, dễ đọc.'), T('Press Ctrl+A. Click Clear All Formatting, the A with an eraser in the Font group.', 'Nhấn Ctrl+A. Bấm Clear All Formatting, hình chữ A có cục tẩy trong nhóm Font.'), docWith('Please bring tea.', { b: true, i: true, size: 20, colour: '#FF0000' }), (d) => sameText(d, 'Please bring tea.') && wholeFormatted(d, 0, DEFAULT_RUN) && d.p[0].align === 'left', [go('doc:0,0'), key('Ctrl+A'), go('home.font.clear')]),
  doItem('case-do', 'change-case', T('You want a notice heading in capitals. Select lost cat and use Change Case to make it UPPERCASE.', 'Bạn muốn tiêu đề thông báo viết hoa toàn bộ. Hãy bôi đen lost cat và dùng Change Case để đổi thành UPPERCASE.'), T('Select lost cat. Click Change Case (Aa), then UPPERCASE.', 'Bôi đen lost cat. Bấm Change Case (Aa), rồi bấm UPPERCASE.'), 'lost cat', (d) => normal(textOf(d)) === 'LOST CAT', [select(0, 8), ...menu('home.font.case', 'upper')]),
  doItem('indent-do', 'indent', T('You want the recipe step to sit further from the left edge. Click in Wash the rice. and click Increase Indent once.', 'Bạn muốn bước nấu ăn nằm cách mép trái xa hơn. Hãy bấm vào Wash the rice. rồi bấm Increase Indent một lần.'), T('Increase Indent is in the Paragraph group. Its arrow points right.', 'Increase Indent nằm trong nhóm Paragraph, có mũi tên chỉ sang phải.'), 'Wash the rice.', (d) => sameText(d, 'Wash the rice.') && d.p[0].indent.left === 0.5, [go('doc:0,2'), go('home.paragraph.indentInc')], 'home.paragraph'),
];

function selectStep(p, text, all = false) {
  return {
    skill: 't3-select',
    text: all ? T('Click in the note. Press Ctrl+A to select all the text.', 'Bấm vào lời nhắn. Nhấn Ctrl+A để bôi đen tất cả.') : T(`Select the line: ${text}`, `Bôi đen dòng: ${text}`),
    hint: all ? T('Hold Ctrl and press A. All the text should be blue.', 'Giữ Ctrl và nhấn A. Toàn bộ chữ sẽ được bôi đen.') : selectHint,
    done: (d, c) => all ? selectedAll(d, c) : selected(d, c, p, 0, text.length),
    demo: all ? [go('doc:0,0'), key('Ctrl+A')] : [go(`doc:${p},0`), select(p, text.length)],
  };
}
function actionStep(text, hint, done, demo, spotlight = 'home.font') {
  return { text, hint, done, demo, spotlight };
}
function mission(id, skill, title, scenario, startDoc, targetDoc, steps, check) {
  // Each Show me sequence can be followed even after the learner loses the selection.
  let selectionDemo = [];
  steps = steps.map((s) => {
    if (s.skill === 't3-select') {
      selectionDemo = s.demo;
      return s;
    }
    return { ...s, demo: [...selectionDemo, ...s.demo] };
  });
  return { id: `t3-m-${id}`, skill: `t3-${skill}`, title, scenario, startDoc, targetDoc, tabs: ['home'], steps,
    goal: { check, progress: (d, c) => check(d, c) ? 1 : steps.filter((s) => s.done(d, c)).length / steps.length } };
}
const boldCheck = (d) => sameText(d, 'OPEN\nFresh bread every day.') && wholeFormatted(d, 0, { b: true });
const menuCheck = (d) => sameText(d, 'Menu\nTea $3\nCoffee $4') && wholeFormatted(d, 0, { font: 'Arial', size: 20 });
const colourCheck = (d) => sameText(d, 'Festival\nEveryone is welcome.') && wholeFormatted(d, 0, { colour: '#FF0000' }) &&
  (wholeFormatted(d, 1, { colour: null }) || wholeFormatted(d, 1, { colour: '#000000' }));
const dateCheck = (d) => sameText(d, 'Class notice\n12 May\nBring your laptop.') && wholeFormatted(d, 1, { highlight: '#FFFF00' });
const alignCheck = (d) => sameText(d, 'Thank you\nThank you for your help.\nFrom Lan') && d.p[0].align === 'center' && d.p[2].align === 'right';
const spacingText = 'Please bring a pen.\nPlease bring your laptop.';
const spacingCheck = (d) => sameText(d, spacingText) && d.p.every((p) => p.spacing.line === 1.5);
const clearText = 'Please water the plants.\nThank you for your help.';
const clearCheck = (d) => sameText(d, clearText) && d.p.every((p, i) => wholeFormatted(d, i, DEFAULT_RUN) && p.align === 'left' && p.spacing.line === 1.15 && p.indent.left === 0);
const caseCheck = (d) => sameText(d, 'LOST CAT\nPlease call Lan.');
const recipeText = 'Cook rice\nWash the rice.\nAdd water.';
const indentCheck = (d) => sameText(d, recipeText) && d.p[0].indent.left === 0 && d.p.slice(1).every((p) => p.indent.left === 0.5);

export const missions = [
  mission('shop-sign', 'bold-italic-underline', T('A shop sign', 'Bảng hiệu cửa hàng'), T('Help customers see that your shop is open. Make OPEN bold.', 'Giúp khách nhìn rõ cửa hàng đang mở cửa. Hãy làm chữ OPEN in đậm.'), 'OPEN\nFresh bread every day.', createDoc({ p: [new Para({}, [makeRun('OPEN', { b: true })]), new Para({}, [makeRun('Fresh bread every day.')])] }), [selectStep(0, 'OPEN'), actionStep(T('Click Bold (B).', 'Bấm Bold (B).'), T('B is in the Font group on Home.', 'Nút B nằm trong nhóm Font trên Home.'), boldCheck, [go('home.font.bold')])], boldCheck),
  mission('menu-title', 'font-size', T('A menu title', 'Tiêu đề thực đơn'), T('Make your menu title easy to see. Change Menu to Arial, size 20.', 'Làm tiêu đề thực đơn dễ nhìn hơn. Đổi chữ Menu thành kiểu Arial, cỡ 20.'), 'Menu\nTea $3\nCoffee $4', createDoc({ p: [new Para({}, [makeRun('Menu', { font: 'Arial', size: 20 })]), new Para({}, [makeRun('Tea $3')]), new Para({}, [makeRun('Coffee $4')])] }), [selectStep(0, 'Menu'), actionStep(T('Open the Font list. Click Arial.', 'Mở danh sách Font. Bấm Arial.'), T('The Font list is the box showing Aptos (Body).', 'Danh sách Font là ô đang hiện Aptos (Body).'), (d) => wholeFormatted(d, 0, { font: 'Arial' }), menu('home.font.name', 'Arial')), actionStep(T('Open the Font Size list. Click 20.', 'Mở danh sách Font Size. Bấm 20.'), T('The size box is beside the Font box.', 'Ô cỡ chữ nằm cạnh ô Font.'), menuCheck, menu('home.font.size', 20))], menuCheck),
  mission('festival-colour', 'font-colour', T('A festival heading', 'Tiêu đề lễ hội'), T('Give your festival notice a red heading. Change only Festival to Red.', 'Tạo tiêu đề màu đỏ cho thông báo lễ hội. Chỉ đổi chữ Festival thành màu Red.'), 'Festival\nEveryone is welcome.', createDoc({ p: [new Para({}, [makeRun('Festival', { colour: '#FF0000' })]), new Para({}, [makeRun('Everyone is welcome.')])] }), [selectStep(0, 'Festival'), actionStep(T('Open Font Color. Choose Red in Standard Colors.', 'Mở Font Color. Chọn Red trong Standard Colors.'), T('Click the arrow beside the A with a colour bar. Red is in Standard Colors.', 'Bấm mũi tên cạnh chữ A có vạch màu. Red nằm trong Standard Colors.'), colourCheck, menu('home.font.colour', '#FF0000'))], colourCheck),
  mission('notice-date', 'highlight', T('Highlight the date', 'Tô nền ngày trên thông báo'), T('Help your classmates remember the date. Add yellow highlighting to 12 May.', 'Giúp các bạn cùng lớp nhớ ngày. Hãy tô nền vàng cho 12 May.'), 'Class notice\n12 May\nBring your laptop.', createDoc({ p: [new Para({}, [makeRun('Class notice')]), new Para({}, [makeRun('12 May', { highlight: '#FFFF00' })]), new Para({}, [makeRun('Bring your laptop.')])] }), [selectStep(1, '12 May'), actionStep(T('Open Text Highlight Color. Choose Yellow.', 'Mở Text Highlight Color. Chọn Yellow.'), T('Use the arrow beside the pen with a yellow bar.', 'Bấm mũi tên cạnh hình bút có vạch vàng.'), dateCheck, menu('home.font.highlight', '#FFFF00'))], dateCheck),
  mission('thank-you', 'align', T('A thank-you note', 'Lời nhắn cảm ơn'), T('Arrange your thank-you note. Centre the title Thank you and right-align From Lan.', 'Sắp xếp lời nhắn cảm ơn. Canh giữa tiêu đề Thank you và canh phải dòng From Lan.'), 'Thank you\nThank you for your help.\nFrom Lan', createDoc({ p: [new Para({ align: 'center' }, [makeRun('Thank you')]), new Para({}, [makeRun('Thank you for your help.')]), new Para({ align: 'right' }, [makeRun('From Lan')])] }), [selectStep(0, 'Thank you'), actionStep(T('Click Center in the Paragraph group.', 'Bấm Center trong nhóm Paragraph.'), T('Center puts the title in the middle.', 'Center đưa tiêu đề vào giữa.'), (d) => d.p[0].align === 'center', [go('home.paragraph.alignCenter')], 'home.paragraph'), selectStep(2, 'From Lan'), actionStep(T('Click Align Right.', 'Bấm Align Right.'), T('Align Right moves From Lan to the right side.', 'Align Right đưa dòng From Lan sang bên phải.'), alignCheck, [go('home.paragraph.alignRight')], 'home.paragraph')], alignCheck),
  mission('easy-read-note', 'line-spacing', T('An easy-to-read note', 'Lời nhắn dễ đọc'), T('Give the lines in your class note more room. Change all the line spacing to 1.5.', 'Làm cho các dòng trong lời nhắn thoáng hơn. Hãy đổi khoảng cách dòng của cả lời nhắn thành 1.5.'), spacingText, docWith(spacingText, {}, { spacing: { line: 1.5 } }), [selectStep(0, '', true), actionStep(T('Open Line and Paragraph Spacing. Click 1.5.', 'Mở Line and Paragraph Spacing. Bấm 1.5.'), T('Find the up-and-down arrows beside the alignment buttons.', 'Tìm hình mũi tên lên xuống cạnh các nút canh chữ.'), spacingCheck, menu('home.paragraph.spacing', 1.5), 'home.paragraph')], spacingCheck),
  mission('plain-note', 'clear-format', T('Make a note plain', 'Đưa lời nhắn về kiểu chữ bình thường'), T('Your neighbour needs a clear note. Remove the mixed formatting with Clear All Formatting.', 'Bạn muốn gửi hàng xóm một lời nhắn dễ đọc. Hãy dùng Clear All Formatting để xoá các kiểu định dạng đang lẫn lộn.'), docWith(clearText, { font: 'Georgia', b: true, i: true, size: 20, colour: '#FF0000', highlight: '#FFFF00' }, { align: 'center', indent: { left: 0.5 } }), clearText, [selectStep(0, '', true), actionStep(T('Click Clear All Formatting.', 'Bấm Clear All Formatting.'), T('Find the A with an eraser in the Font group.', 'Tìm hình chữ A có cục tẩy trong nhóm Font.'), clearCheck, [go('home.font.clear')])], clearCheck),
  mission('lost-cat', 'change-case', T('A lost cat heading', 'Tiêu đề tìm mèo lạc'), T('Make the lost cat heading stand out. Use Change Case to make lost cat UPPERCASE.', 'Làm tiêu đề tìm mèo lạc nổi bật. Dùng Change Case để đổi lost cat thành UPPERCASE.'), 'lost cat\nPlease call Lan.', 'LOST CAT\nPlease call Lan.', [selectStep(0, 'lost cat'), actionStep(T('Click Change Case (Aa). Click UPPERCASE.', 'Bấm Change Case (Aa). Bấm UPPERCASE.'), T('Aa is in the top row of the Font group.', 'Aa nằm ở hàng trên của nhóm Font.'), caseCheck, menu('home.font.case', 'upper'))], caseCheck),
  mission('recipe-indent', 'indent', T('Arrange recipe steps', 'Thụt lề các bước nấu ăn'), T('Keep the recipe title at the left. Move both recipe steps one indent to the right.', 'Giữ tiêu đề ở mép trái. Thụt cả hai bước nấu ăn sang phải một nấc.'), recipeText, createDoc({ p: [new Para({}, [makeRun('Cook rice')]), new Para({ indent: { left: 0.5 } }, [makeRun('Wash the rice.')]), new Para({ indent: { left: 0.5 } }, [makeRun('Add water.')])] }), [{ skill: 't3-select', text: T('Drag across both steps: Wash the rice. and Add water.', 'Kéo chuột để bôi đen cả hai bước: Wash the rice. và Add water.'), hint: T('Begin before Wash. Hold the left mouse button and drag to the end of Add water.', 'Bắt đầu trước chữ Wash. Giữ nút chuột trái, kéo đến hết dòng Add water.'), done: (d, c) => { const s = c?.selection; if (!s) return false; const a = s.anchor ?? s.from; const b = s.focus ?? s.to; return Boolean(a && b && ((a.p === 1 && a.offset === 0 && b.p === 2 && b.offset === 10) || (b.p === 1 && b.offset === 0 && a.p === 2 && a.offset === 10))); }, demo: [go('doc:1,0'), { select: { from: { p: 1, offset: 0 }, to: { p: 2, offset: 10 } } }] }, actionStep(T('Click Increase Indent once.', 'Bấm Increase Indent một lần.'), T('Use the button with an arrow pointing right in the Paragraph group. If you move too far, click Decrease Indent.', 'Dùng nút có mũi tên sang phải trong nhóm Paragraph. Nếu thụt quá xa, bấm Decrease Indent.'), indentCheck, [go('home.paragraph.indentInc')], 'home.paragraph')], indentCheck),
];
