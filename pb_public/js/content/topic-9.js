// Topic 9: review. Revision items and missions mix skills from topics 1-7 in one real job.
// Each mission step carries its own `skill`, so its stars count for the skill it practises.
import { createDoc, textOf } from '../word/model.js';
import { PICTURES } from '../word/pictures.js';

const T = (en, vi) => ({ en, vi });
const go = (target, click = 'single') => ({ target, click });
const key = key => ({ key });
const type = (type, at) => ({ type, ...(at ? { at } : {}) });
const say = (en, vi) => ({ say: T(en, vi) });
const drag = (target, dx, dy) => ({ target, drag: { dx, dy } });
const option = (id, en, vi) => ({ id, label: T(en, vi) });
const select = (p, from, to, lastP = p) => ({ select: { from: { p, offset: from }, to: { p: lastP, offset: to } } });
const replay = (doc, script) => ({ mock: 'word', doc, script });

const loose = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const words = s => loose(s).replace(/[^a-z0-9]/g, '');
const tidy = s => String(s ?? '').trim().replace(/\s+/g, ' ');
const matching = (doc, text) => doc.p.find(p => !p.cell && words(textOf(p)) === words(text));
const hasText = (doc, text) => Boolean(matching(doc, text));
const formatted = (doc, text, props) => {
  const p = matching(doc, text);
  if (!p) return false;
  const runs = p.runs.filter(r => r.text.trim());
  return runs.length > 0 && runs.every(r => Object.entries(props).every(([k, v]) => r[k] === v));
};
const centered = (doc, text) => matching(doc, text)?.align === 'center';
// The non-empty lines outside tables, as plain comparable text.
const lineTexts = doc => doc.p.filter(p => !p.cell && !p.picture).map(textOf).filter(s => s.trim());
const sameLines = (doc, expected) => {
  const got = lineTexts(doc);
  return got.length === expected.length && got.every((s, i) => words(s) === words(expected[i]));
};
const used = (ctx, command) => (ctx?.commands ?? []).includes(command);
const saved = (ctx, name) => ctx?.saved?.folder?.length === 1 && ctx.saved.folder[0] === 'Documents' && words(String(ctx.saved.name).replace(/\.docx$/i, '')) === words(name);
const printed = ctx => used(ctx, 'file.print.copies.1');

// The selection covers paragraphs `first`..`last`; a character range is checked when both ends sit in one paragraph.
const selectionEnds = ctx => {
  const s = ctx?.selection;
  const a = s?.anchor ?? s?.from;
  const b = s?.focus ?? s?.to;
  if (!a || !b) return null;
  return a.p < b.p || (a.p === b.p && a.offset <= b.offset) ? [a, b] : [b, a];
};
const selectedText = (ctx, p, start, end) => {
  const ends = selectionEnds(ctx);
  return Boolean(ends && ends[0].p === p && ends[1].p === p && ends[0].offset <= start && ends[1].offset >= end);
};
const selectedLines = (ctx, first, last) => {
  const ends = selectionEnds(ctx);
  return Boolean(ends && ends[0].p <= first && ends[1].p >= last && (ends[1].p > last || ends[1].offset > 0 || ends[0].p < ends[1].p));
};
const caretAt = ctx => ctx?.selection?.focus ?? ctx?.selection?.anchor ?? null;

const pic = (id, width) => {
  const asset = PICTURES.find(p => p.id === id);
  return { picture: { id, width, height: Math.round(width * asset.height / asset.width), wrap: 'inline' } };
};
const pictures = doc => doc.p.map((p, i) => ({ i, ...p.picture })).filter(p => p.id);
const bullet = text => ({ list: { type: 'bullet', format: '•' }, runs: [{ text }] });

const saveScript = name => [go('file'), go('bs.saveas'), go('sa.browse'), go('sa.documents'), go('sa.name'), type(name, 'sa.name'), go('sa.save')];
const printScript = [go('file'), go('bs.print'), go('print.submit')];
const step = (skill, text, hint, done, demo, spotlight) => ({ skill, text, hint, done, demo, ...(spotlight ? { spotlight } : {}) });
const selectHint = T('Hold the left mouse button and drag across the words. Let go when they are blue.', 'Giữ nút chuột trái và kéo qua các chữ. Thả chuột khi các chữ đã được bôi đen.');
const saveStep = name => step('t1-save',
  T(`Save in Documents as ${name}. A space is fine too.`, `Lưu vào Documents với tên ${name}. Dùng dấu cách cũng được.`),
  T(`Click File, Save As, Browse, then Documents. Click File name and type ${name}. Click Save.`, `Bấm File, Save As, Browse, rồi Documents. Bấm ô File name và gõ ${name}. Bấm Save.`),
  (doc, ctx) => saved(ctx, name), saveScript(name));
const mission = (id, title, scenario, startDoc, targetDoc, tabs, steps, check, extra = {}) => ({
  id, skill: 't9-mixed-review', title, scenario, startDoc, targetDoc, tabs, steps, ...extra,
  goal: { check, progress: (doc, ctx) => check(doc, ctx) ? 1 : steps.filter(s => s.done(doc, ctx)).length / steps.length },
});

/* ---------- revision items ---------- */

const thankYouText = 'Thank you\nThank you for the flowers.';
const flyerTabText = 'Garden club';

export const items = [
  {
    id: 't9-thank-you-order', skill: 't9-mixed-review', type: 'order',
    prompt: T('You typed a thank-you note. Now you want the heading bold, and you want to keep the note in Documents as Thank_You. Put the steps in order.', 'Bạn đã gõ xong lời cảm ơn. Bây giờ bạn muốn tiêu đề in đậm và lưu lại trong Documents với tên Thank_You. Hãy xếp các bước theo thứ tự.'),
    hint: T('Select the heading first, then click Bold. Save last, so the saved file keeps the bold heading.', 'Bôi đen tiêu đề trước, rồi bấm Bold. Lưu sau cùng để file đã lưu có tiêu đề in đậm.'),
    steps: [
      option('select', 'Select the heading "Thank you"', 'Bôi đen tiêu đề “Thank you”'),
      option('bold', 'Click Bold (B)', 'Bấm Bold (chữ B đậm)'),
      option('saveas', 'Click File, Save As, Browse, then Documents', 'Bấm File, Save As, Browse, rồi Documents'),
      option('save', 'Type Thank_You in File name, then click Save', 'Gõ Thank_You vào ô File name, rồi bấm Save'),
    ],
    replay: replay(thankYouText, [select(0, 0, 9), go('home.font.bold'), go('file'), go('bs.saveas'), go('sa.browse'), go('sa.documents'), type('Thank_You', 'sa.name'), go('sa.save')]),
  },
  {
    id: 't9-flyer-tabs-sort', skill: 't9-mixed-review', type: 'sort',
    prompt: T('You are making a flyer for your garden club. Sort each job by the tab where you find its button.', 'Bạn đang làm tờ rơi cho câu lạc bộ làm vườn. Hãy xếp từng việc vào thẻ có nút để làm việc đó.'),
    hint: T('Bold and Center are on the Home tab. Tables and pictures are on the Insert tab. The page shape and margins are on the Layout tab.', 'Bold và Center nằm ở thẻ Home. Bảng và hình nằm ở thẻ Insert. Hướng trang và lề trang nằm ở thẻ Layout.'),
    bins: [option('home', 'The Home tab', 'Thẻ Home'), option('insert', 'The Insert tab', 'Thẻ Insert'), option('layout', 'The Layout tab', 'Thẻ Layout')],
    cards: [
      { ...option('bold', 'Make the heading bold', 'Làm tiêu đề in đậm'), bin: 'home' },
      { ...option('centre', 'Centre the heading', 'Canh giữa tiêu đề'), bin: 'home' },
      { ...option('table', 'Insert a table', 'Chèn một bảng'), bin: 'insert' },
      { ...option('picture', 'Insert a picture', 'Chèn một hình'), bin: 'insert' },
      { ...option('landscape', 'Turn the page to Landscape', 'Xoay trang sang trang ngang (Landscape)'), bin: 'layout' },
      { ...option('margins', 'Make the margins Narrow', 'Đổi lề trang thành Narrow'), bin: 'layout' },
    ],
    replay: replay(flyerTabText, [select(0, 0, 11), go('home.font.bold'), go('tab.insert'), go('menu:insert.table'), go('tab.layout'), go('menu:layout.orientation'), say('Home, Insert and Layout each hold different buttons.', 'Home, Insert và Layout mỗi thẻ có những nút khác nhau.')]),
  },
];

/* ---------- mission 1: thank-you card ---------- */

const thanksSentence = 'Thank you for the flowers.';
const thanksStart = createDoc({ p: ['Thank you', '', 'From your freind'], spellings: { freind: ['friend'] } });
const thanksTarget = createDoc({ p: [{ align: 'center', runs: [{ text: 'Thank you', colour: '#FF0000' }] }, thanksSentence, 'From your friend'] });
const sentenceDone = doc => doc.p.some(p => !p.cell && tidy(textOf(p)) === thanksSentence);
const spellDone = (doc, ctx) => used(ctx, 'spelling.friend') && doc.p.some(p => /\bfriend\b/i.test(textOf(p))) && !doc.p.some(p => /freind/i.test(textOf(p)));
const redHeading = doc => formatted(doc, 'Thank you', { colour: '#FF0000' });
const centreHeading = doc => centered(doc, 'Thank you');
const headingSelected = (doc, ctx) => selectedText(ctx, 0, 0, 9) || redHeading(doc) || centreHeading(doc);
const thanksCheck = (doc, ctx) => sentenceDone(doc) && spellDone(doc, ctx) && redHeading(doc) && centreHeading(doc) && saved(ctx, 'Thank_You');
const thanksSteps = [
  step('t1-sentence',
    T(`On the empty line, type: ${thanksSentence}`, `Ở dòng trống, gõ: ${thanksSentence}`),
    T('Click the empty line under the heading. Start with a capital letter (hold Shift) and end with a full stop.', 'Bấm vào dòng trống dưới tiêu đề. Bắt đầu bằng chữ hoa (giữ Shift) và kết thúc bằng dấu chấm.'),
    sentenceDone, [go('doc:1,0'), type(thanksSentence)]),
  step('t2-spelling',
    T('Right-click freind. Click friend in the suggestions.', 'Bấm chuột phải vào freind. Bấm friend trong các từ gợi ý.'),
    T('The red wavy line shows a spelling mistake. Right-click the word itself.', 'Đường gạch đỏ lượn sóng báo hiệu từ có thể sai chính tả. Bấm chuột phải ngay trên từ đó.'),
    spellDone, [go('doc:2,13', 'right'), go('spelling.friend')]),
  step('t3-select',
    T('Select the heading: Thank you', 'Bôi đen tiêu đề: Thank you'),
    selectHint, headingSelected, [go('doc:0,0'), select(0, 0, 9)]),
  step('t3-font-colour',
    T('Open Font Color. Choose Red in Standard Colors.', 'Mở Font Color. Chọn Red trong Standard Colors.'),
    T('Click the arrow beside the A with a colour bar. Red is in Standard Colors.', 'Bấm mũi tên cạnh chữ A có vạch màu. Red nằm trong Standard Colors.'),
    redHeading, [go('tab.home'), select(0, 0, 9), go('menu:home.font.colour'), go('choice:home.font.colour:#FF0000')], 'home.font'),
  step('t3-align',
    T('Center the heading.', 'Canh giữa tiêu đề bằng nút Center (các gạch xếp giữa).'),
    T('Click in the heading. On the Home tab, click Center in the Paragraph group.', 'Bấm vào tiêu đề. Trên thẻ Home, bấm nút Center (các gạch xếp giữa) trong nhóm Paragraph.'),
    centreHeading, [go('doc:0,0'), go('home.paragraph.alignCenter')], 'home.paragraph'),
  saveStep('Thank_You'),
];

/* ---------- mission 2: market list ---------- */

const marketStart = createDoc('Market list\nRice\nEggs\nTomatoes\n');
const marketLines = ['Market list', 'Eggs', 'Tomatoes', 'Rice'];
const marketTarget = createDoc({ p: [{ runs: [{ text: 'Market list', b: true }] }, '', bullet('Eggs'), bullet('Tomatoes'), bullet('Rice')] });
const marketBold = doc => formatted(doc, 'Market list', { b: true });
const riceLast = doc => sameLines(doc, marketLines);
const itemsBulleted = doc => ['Eggs', 'Tomatoes', 'Rice'].every(t => matching(doc, t)?.list?.type === 'bullet') && !matching(doc, 'Market list')?.list;
const marketCheck = (doc, ctx) => marketBold(doc) && riceLast(doc) && itemsBulleted(doc) && printed(ctx);
const marketSteps = [
  step('t3-select', T('Select the heading: Market list', 'Bôi đen tiêu đề: Market list'), selectHint,
    (doc, ctx) => selectedText(ctx, 0, 0, 11) || marketBold(doc), [go('doc:0,0'), select(0, 0, 11)]),
  step('t3-bold-italic-underline', T('Click Bold (B).', 'Bấm Bold (chữ B đậm).'),
    T('B is in the Font group on the Home tab.', 'Nút B nằm trong nhóm Font trên thẻ Home.'),
    marketBold, [go('tab.home'), select(0, 0, 11), go('home.font.bold')], 'home.font'),
  step('t3-select', T('The rice stall is the last stall you visit. Select the line: Rice', 'Quầy gạo là quầy cuối cùng bạn ghé qua. Bôi đen dòng: Rice'), selectHint,
    (doc, ctx) => selectedText(ctx, 1, 0, 4) || used(ctx, 'home.clipboard.cut') || riceLast(doc), [go('doc:1,0'), select(1, 0, 4)]),
  step('t2-copy-paste', T('Click Cut, so you can move Rice to the end of the list.', 'Bấm Cut để chuyển Rice xuống cuối danh sách.'),
    T('Cut is the scissors in the Clipboard group on the Home tab. It takes Rice out of its place and keeps it ready to paste.', 'Cut là hình cái kéo trong nhóm Clipboard trên thẻ Home. Nút này lấy Rice ra khỏi chỗ cũ và giữ sẵn để dán.'),
    (doc, ctx) => used(ctx, 'home.clipboard.cut'), [select(1, 0, 4), go('home.clipboard.cut')], 'home.clipboard'),
  step('t2-copy-paste', T('Click the empty line at the bottom. Click Paste.', 'Bấm vào dòng trống ở cuối. Bấm Paste.'),
    T('The empty line is below Tomatoes. Paste puts Rice there, as the last item.', 'Dòng trống nằm dưới Tomatoes. Paste đặt Rice vào đó, làm món cuối cùng.'),
    (doc, ctx) => used(ctx, 'home.clipboard.cut') && used(ctx, 'home.clipboard.paste') && riceLast(doc), [go('doc:4,0'), go('home.clipboard.paste')], 'home.clipboard'),
  step('t3-select', T('Select the three items: Eggs, Tomatoes and Rice', 'Bôi đen ba món: Eggs, Tomatoes và Rice'),
    T('Start on Eggs. Hold the left mouse button and drag down to the end of Rice. Leave the heading out.', 'Bắt đầu từ chữ Eggs. Giữ nút chuột trái và kéo xuống hết chữ Rice. Không bôi đen tiêu đề.'),
    (doc, ctx) => selectedLines(ctx, 2, 4) || itemsBulleted(doc), [go('doc:2,0'), select(2, 0, 4, 4)]),
  step('t4-bullets', T('Click Bullets.', 'Bấm Bullets.'),
    T('Bullets is in the Paragraph group on the Home tab.', 'Bullets nằm trong nhóm Paragraph trên thẻ Home.'),
    itemsBulleted, [go('tab.home'), select(2, 0, 4, 4), go('home.paragraph.bullets')], 'home.paragraph'),
  step('t7-print', T('Practise printing one copy.', 'Thực hành in một bản.'),
    T('Click File, then Print. Leave Copies at 1. Click the large Print button. The game does not print paper.', 'Bấm File, rồi Print. Giữ số 1 trong ô Copies. Bấm nút Print lớn. Trò chơi không in ra giấy.'),
    (doc, ctx) => printed(ctx), printScript),
];

/* ---------- mission 3: club timetable ---------- */

const clubStart = createDoc('Club timetable');
const clubRows = [['Day', 'Time'], ['Tuesday', '10 am'], ['Friday', '9 am']];
const clubTarget = createDoc({ p: [{ runs: [{ text: 'Club timetable', b: true }] }], tables: [{ rows: clubRows.map(row => row.map(text => ({ p: [text] }))) }] });
const value = s => loose(s).replace(/\s/g, '');
const cellId = (r, c, off = 0) => `cell:0,${r},${c},${off}`;
const gridOf = doc => (doc.tables?.[0]?.rows ?? []).map(row => row.map(cell => cell.p.map(textOf).join(' ')));
// Tab in the last cell adds an empty row; an empty row at the end never makes an answer wrong.
const gridRows = doc => {
  const rows = gridOf(doc);
  while (rows.length && rows[rows.length - 1].every(s => !s.trim())) rows.pop();
  return rows;
};
const rowIndex = (doc, day, time) => gridOf(doc).findIndex(row => value(row[0]) === value(day) && value(row[1]) === value(time));
const tableSize = doc => doc.tables?.length === 1 && doc.tables[0].rows.length >= 2 && doc.tables[0].rows.every(row => row.length === 2);
const headerDone = doc => tableSize(doc) && value(gridOf(doc)[0]?.[0]) === 'day' && value(gridOf(doc)[0]?.[1]) === 'time';
const rowInserted = doc => {
  const rows = gridOf(doc);
  return tableSize(doc) && rows.length >= 3 && value(rows[1][0]) !== 'friday';
};
const clubBold = doc => formatted(doc, 'Club timetable', { b: true });
const clubCheck = doc => {
  const rows = gridRows(doc);
  return hasText(doc, 'Club timetable') && tableSize(doc) && headerDone(doc) && rows.length === 3 &&
    rowIndex(doc, 'Tuesday', '10 am') === 1 && rowIndex(doc, 'Friday', '9 am') === 2 && clubBold(doc);
};
const clubSteps = [
  step('t3-select', T('Select the heading: Club timetable', 'Bôi đen tiêu đề: Club timetable'), selectHint,
    (doc, ctx) => selectedText(ctx, 0, 0, 14) || clubBold(doc), [go('doc:0,0'), select(0, 0, 14)]),
  step('t3-bold-italic-underline', T('Click Bold (B).', 'Bấm Bold (chữ B đậm).'),
    T('B is in the Font group on the Home tab.', 'Nút B nằm trong nhóm Font trên thẻ Home.'),
    clubBold, [go('tab.home'), select(0, 0, 14), go('home.font.bold')], 'home.font'),
  step('t5-insert-table',
    T('Click after "Club timetable". On the Insert tab, click Table. Choose 2x2 Table.', 'Bấm ngay sau chữ “Club timetable”. Trên thẻ Insert, bấm Table. Chọn 2x2 Table.'),
    T('First click at the end of Club timetable. Then click Insert, then Table. 2x2 means 2 columns and 2 rows: move the mouse over the squares until the top says 2x2 Table, then click.', 'Trước tiên bấm vào cuối dòng Club timetable. Sau đó bấm Insert, rồi bấm Table. 2x2 nghĩa là 2 cột và 2 hàng: đưa chuột qua các ô vuông đến khi phía trên hiện chữ 2x2 Table, rồi bấm.'),
    tableSize, [go('doc:0,14'), go('tab.insert'), go('menu:insert.table'), go('choice:insert.table.create:2x2')], 'insert.tables'),
  step('t5-table-type',
    T('Top row: click the left cell, type Day, press Tab, then type Time.', 'Hàng trên cùng: bấm vào ô bên trái, gõ Day, nhấn Tab, rồi gõ Time.'),
    T('Click the top-left cell and type Day. Press Tab to move right, then type Time. Use Shift for the capital letters.', 'Bấm vào ô trên cùng bên trái và gõ Day. Nhấn Tab để sang ô bên phải, rồi gõ Time. Giữ Shift để gõ chữ hoa.'),
    headerDone, [go(cellId(0, 0)), type('Day', cellId(0, 0)), key('Tab'), type('Time', cellId(0, 1))]),
  step('t5-table-type',
    T('Bottom row: click the left cell, type Friday, press Tab, then type 9 am.', 'Hàng dưới cùng: bấm vào ô bên trái, gõ Friday, nhấn Tab, rồi gõ 9 am.'),
    T('Click the left cell of the second row and type Friday. Press Tab to move right, then type 9 am.', 'Bấm vào ô bên trái của hàng thứ hai và gõ Friday. Nhấn Tab để sang ô bên phải, rồi gõ 9 am.'),
    doc => rowIndex(doc, 'Friday', '9 am') >= 1, [go(cellId(1, 0)), type('Friday', cellId(1, 0)), key('Tab'), type('9 am', cellId(1, 1))]),
  step('t5-row-col',
    T('The club also meets on Tuesday, before Friday. Click in the top row. On the Layout tab on the far right (next to Table Design), click Insert Below.', 'Câu lạc bộ còn họp vào thứ Ba, trước thứ Sáu. Bấm vào hàng trên cùng. Trên thẻ Layout ở góc bên phải (cạnh Table Design), bấm Insert Below.'),
    T('Click in the top row. Insert Below adds an empty row under it, above Friday. Or right-click the row.', 'Bấm vào hàng trên cùng. Insert Below thêm một hàng trống bên dưới hàng đó, phía trên Friday. Hoặc bấm chuột phải vào hàng đó.'),
    rowInserted, [go(cellId(0, 0, 3)), go('tab.table'), go('table.insertBelow')], 'table.rows'),
  step('t5-table-type',
    T('New row: click the left cell, type Tuesday, press Tab, then type 10 am.', 'Hàng mới: bấm vào ô bên trái, gõ Tuesday, nhấn Tab, rồi gõ 10 am.'),
    T('The new row is under Day and Time. Click its left cell and type Tuesday. Press Tab, then type 10 am.', 'Hàng mới nằm dưới Day và Time. Bấm vào ô bên trái của hàng đó và gõ Tuesday. Nhấn Tab, rồi gõ 10 am.'),
    doc => rowIndex(doc, 'Tuesday', '10 am') >= 1, [go(cellId(1, 0)), type('Tuesday', cellId(1, 0)), key('Tab'), type('10 am', cellId(1, 1))]),
];

/* ---------- mission 4: festival flyer update ---------- */

const festivalTitle = 'Spring festival';
const dateLine = 'Sunday 12 July';
const festivalStart = createDoc(`${festivalTitle}\n${dateLine}\nCommunity hall`);
const festivalTarget = createDoc({ p: [festivalTitle, '', pic('flower', 140), '', { runs: [{ text: dateLine, highlight: '#FFFF00' }] }, 'Community hall'] });
const highlighted = doc => formatted(doc, dateLine, { highlight: '#FFFF00' });
const flowerPictures = doc => pictures(doc).filter(p => p.id === 'flower');
// Exactly one flower, directly under the heading; spare empty lines are harmless.
const flowerUnderHeading = doc => {
  const all = pictures(doc);
  if (all.length !== 1 || all[0].id !== 'flower') return false;
  const before = doc.p.slice(0, all[0].i).filter(p => !p.cell && textOf(p).trim());
  return before.length === 1 && words(textOf(before[0])) === words(festivalTitle);
};
const newLineUnderHeading = doc => doc.p.some((p, i) => i > 0 && !p.picture && !textOf(p).trim() && words(textOf(doc.p[i - 1])) === words(festivalTitle));
const ratio = id => { const a = PICTURES.find(p => p.id === id); return a.width / a.height; };
// Inserted at 240 px wide. Any real drop counts, and a corner dot keeps the shape.
const smallerFlower = doc => {
  const all = flowerPictures(doc);
  return all.length === 1 && all[0].width < 230 && Math.abs(all[0].width / all[0].height / ratio('flower') - 1) < 0.03;
};
const caretAtHeadingEnd = (doc, ctx) => {
  const at = caretAt(ctx);
  return Boolean(at && at.p === 0 && at.offset >= festivalTitle.length);
};
const festivalCheck = (doc, ctx) => sameLines(doc, [festivalTitle, dateLine, 'Community hall']) && highlighted(doc) &&
  flowerUnderHeading(doc) && smallerFlower(doc) && saved(ctx, 'Festival_V2');
const festivalSteps = [
  step('t3-select', T(`Select the new date: ${dateLine}`, `Bôi đen ngày mới: ${dateLine}`), selectHint,
    (doc, ctx) => selectedText(ctx, 1, 0, dateLine.length) || highlighted(doc), [go('doc:1,0'), select(1, 0, dateLine.length)]),
  step('t3-highlight', T('Open Text Highlight Color. Choose Yellow.', 'Mở Text Highlight Color. Chọn Yellow.'),
    T('Use the arrow beside the pen with a yellow bar.', 'Bấm mũi tên cạnh hình bút có vạch vàng.'),
    highlighted, [go('tab.home'), select(1, 0, dateLine.length), go('menu:home.font.highlight'), go('choice:home.font.highlight:#FFFF00')], 'home.font'),
  step('t6-insert-picture', T('Click at the end of "Spring festival".', 'Bấm vào cuối dòng “Spring festival”.'),
    T('Click just after the last letter of Spring festival. The picture will go on a new line under it.', 'Bấm ngay sau chữ cái cuối cùng của Spring festival. Hình sẽ nằm ở dòng mới bên dưới.'),
    (doc, ctx) => caretAtHeadingEnd(doc, ctx) || newLineUnderHeading(doc) || flowerUnderHeading(doc), [go(`doc:0,${festivalTitle.length}`)]),
  step('t6-insert-picture', T('Press Enter.', 'Nhấn Enter.'),
    T('Enter makes a new empty line under Spring festival. The picture will go on this new line.', 'Phím Enter tạo một dòng trống mới dưới Spring festival. Hình sẽ nằm ở dòng mới này.'),
    doc => newLineUnderHeading(doc) || flowerUnderHeading(doc), [key('Enter')]),
  step('t6-insert-picture', T('Add the flower.png picture from Downloads.', 'Chèn hình flower.png từ thư mục Downloads.'),
    T('Click the Insert tab, then Pictures, then This Device. Click Downloads on the left. Click flower.png, then the Insert button.', 'Bấm thẻ Insert, rồi Pictures, rồi This Device. Bấm Downloads ở bên trái. Bấm hình flower.png, rồi bấm nút Insert.'),
    flowerUnderHeading, [go('tab.insert'), go('menu:insert.pictures'), go('insert.pictures.device'), go('insert.pictures.nav:downloads'), go('choice:insert.pictures.choose:flower'), go('insert.pictures.insert')], 'insert.pictures.insert'),
  step('t6-resize', T('The picture is too big. Drag the little round dot on the bottom-right corner towards the middle, to make it smaller.', 'Hình quá to. Kéo chấm tròn nhỏ ở góc dưới bên phải vào phía giữa hình để làm hình nhỏ lại.'),
    T('Click the picture once, so the little round dots show. Drag a corner dot, not a side dot, so the flower keeps its shape. If it looks stretched, press Ctrl+Z and try again.', 'Bấm vào hình một lần để các chấm tròn nhỏ hiện ra. Kéo chấm tròn ở góc, đừng kéo chấm tròn ở cạnh, để hình hoa giữ nguyên hình dạng. Nếu hình bị méo, nhấn Ctrl+Z rồi làm lại.'),
    smallerFlower, [go('picture:0'), drag('picture:0:se', -100, -70)]),
  step('t7-save-version',
    T('Keep the old flyer. Save this one in Documents as Festival_V2. A space is fine too.', 'Giữ lại tờ rơi cũ. Lưu tờ rơi này vào Documents với tên Festival_V2. Dùng dấu cách cũng được.'),
    T('Click File, Save As, Browse, then Documents. Click File name and type Festival_V2. Click Save.', 'Bấm File, Save As, Browse, rồi Documents. Bấm ô File name và gõ Festival_V2. Bấm Save.'),
    (doc, ctx) => saved(ctx, 'Festival_V2'), saveScript('Festival_V2')),
];

export const missions = [
  mission('t9-m-thank-you-card', T('Thank-you card', 'Thiệp cảm ơn'),
    T('Your neighbour gave you flowers. Make a thank-you card: type one sentence, fix the spelling mistake, make the heading red and centred, then save the card.', 'Hàng xóm tặng hoa cho bạn. Hãy làm thiệp cảm ơn: gõ một câu, sửa lỗi chính tả, làm tiêu đề màu đỏ và canh giữa, rồi lưu thiệp lại.'),
    thanksStart, thanksTarget, ['home'], thanksSteps, thanksCheck),
  mission('t9-m-market-list', T('Market list', 'Danh sách đi chợ'),
    T('You are going to the market. Make the heading bold, move Rice to the end because that stall comes last, make the three items a bullet list, then practise printing one copy.', 'Bạn sắp đi chợ. Hãy làm tiêu đề in đậm, chuyển Rice xuống cuối vì quầy gạo ghé sau cùng, tạo dấu chấm đầu dòng cho ba món, rồi thực hành in một bản.'),
    marketStart, marketTarget, ['home'], marketSteps, marketCheck),
  mission('t9-m-club-timetable', T('Club timetable', 'Thời khoá biểu câu lạc bộ'),
    T('Your garden club meets on Friday at 9 am. A new Tuesday meeting at 10 am comes first in the week. Make a timetable for the noticeboard: make the heading bold, insert a table under the heading, type the Friday row, then add a row above it for Tuesday.', 'Câu lạc bộ làm vườn họp vào thứ Sáu lúc 9 giờ. Buổi họp mới vào thứ Ba lúc 10 giờ đứng trước trong tuần. Hãy làm thời khoá biểu để dán lên bảng tin: làm tiêu đề in đậm, chèn bảng dưới tiêu đề, gõ hàng thứ Sáu, rồi thêm một hàng phía trên cho thứ Ba.'),
    clubStart, clubTarget, ['home', 'insert'], clubSteps, clubCheck),
  mission('t9-m-festival-update', T('Festival flyer update', 'Cập nhật tờ rơi lễ hội'),
    T('The festival date has changed, and the new date is already typed. Highlight it so people see it. Add a flower picture under the heading Spring festival and make it smaller. Then save this flyer as Festival_V2 and keep the old one.', 'Ngày lễ hội đã đổi và ngày mới đã được gõ sẵn. Hãy tô nền ngày mới để mọi người dễ thấy. Chèn hình hoa dưới tiêu đề Spring festival và làm hình nhỏ lại. Rồi lưu tờ rơi này thành Festival_V2 và giữ lại tờ rơi cũ.'),
    festivalStart, festivalTarget, ['home', 'insert'], festivalSteps, festivalCheck, { title_bar: 'Festival_V1' }),
];
