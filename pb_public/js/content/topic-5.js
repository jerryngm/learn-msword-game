// Topic 5: tables (rows, columns, cells, Tab) and page layout (orientation, margins).
import { createDoc, textOf } from '../word/model.js';

const T = (en, vi) => ({ en, vi });
const go = (target, click = 'single') => ({ target, click });
const key = (key) => ({ key });
const type = (type, at) => (at ? { type, at } : { type });
const say = (en, vi) => ({ say: T(en, vi) });
const option = (id, en, vi) => ({ id, label: T(en, vi) });
const replay = (doc, script) => ({ mock: 'word', doc, script });
// Layout menus open from `layout.X`; their items are `layout.X.set`.
const layoutMenu = (cmd, arg) => [go(`menu:${cmd}`), go(`choice:${cmd}.set:${arg}`)];
// Menu items without an argument (Delete › Delete Rows); the engine matches them as the text "undefined".
const menuItem = (cmd) => go(`choice:${cmd}:undefined`);
const cellAt = (row, col, offset) => `cell:0,${row},${col}${offset === undefined ? '' : `,${offset}`}`;

// Demo notes (what the engine draws): Insert Table and the table Layout tab's ribbon buttons change the ghost picture,
// and the ribbon buttons always act on the table's first cell. A menu item without an argument (Delete Rows) only shows the click.
// Tab lights the key but doesn't move the ghost text, so typing after Tab names its cell with `at`.
const tableDoc = (rows, heading, page) => createDoc({
  p: heading ? [heading] : [],
  tables: [{ rows: rows.map((row) => row.map((text) => ({ p: [text] }))) }],
  ...(page ? { page } : {}),
});
const loose = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
// Prices and times: "$3", "3", "10 am" and "10am" are all fine.
const value = (s) => loose(s).replace(/[$\s]/g, '');
const cellText = (doc, t, r, c) => (doc.tables?.[t]?.rows?.[r]?.[c]?.p ?? []).map(textOf).join(' ');
const grid = (doc, t = 0) => (doc.tables?.[t]?.rows ?? []).map((row) => row.map((cell) => cell.p.map(textOf).join(' ')));
// Tab in the last cell adds an empty row. That extra row never makes an answer wrong.
const trimmed = (rows) => {
  const out = [...rows];
  while (out.length && out[out.length - 1].every((s) => !s.trim())) out.pop();
  return out;
};
const sameGrid = (doc, expected, t = 0) => {
  const rows = trimmed(grid(doc, t));
  return rows.length === expected.length && rows.every((row, r) => row.length === expected[r].length && row.every((s, c) => value(s) === value(expected[r][c])));
};
const size = (doc, cols, rows, t = 0) => {
  const table = doc.tables?.[t];
  return Boolean(table && table.rows.length === rows && table.rows.every((row) => row.length === cols));
};
const heading = (doc, text) => doc.p.some((p) => !p.cell && loose(textOf(p)) === loose(text));
// The table cell where the caret or selection starts (null when it is outside a table).
const caretCell = (doc, ctx) => {
  const s = ctx?.selection;
  const at = s?.focus ?? s?.to ?? s?.anchor ?? s?.from;
  return at ? doc.p[at.p]?.cell ?? null : null;
};
const landscape = (doc) => doc.page?.orientation === 'landscape';
const narrow = (doc) => doc.page?.margins === 'narrow';

const TABLE_TABS = ['home', 'insert'];
const LAYOUT_TABS = ['home', 'layout'];
const doItem = (id, skill, prompt, hint, doc, check, demo, spotlight, tabs = TABLE_TABS) => ({
  id, skill, type: 'do', prompt, hint, doc, tabs, check, demo, ...(spotlight ? { spotlight } : {}), replay: replay(doc, demo),
});
const pick = (id, skill, prompt, hint, options, answer, doc, script) => ({ id, skill, type: 'pick', prompt, hint, options, answer, replay: replay(doc, script) });
const step = (text, hint, done, demo, spotlight) => ({ text, hint, done, demo, ...(spotlight ? { spotlight } : {}) });
const mission = (id, skill, title, scenario, startDoc, targetDoc, tabs, steps, check) => ({
  id, skill, title, scenario, startDoc, targetDoc, tabs, steps,
  goal: { check, progress: (doc, ctx) => check(doc, ctx) ? 1 : steps.filter((s) => s.done(doc, ctx)).length / steps.length },
});

/* ---------- revision items ---------- */

const priceRows = [['Item', 'Price'], ['Tea', '$3'], ['Coffee', '$4']];
const priceDoc = tableDoc(priceRows);
const weekRows = [['Day', 'Class'], ['Monday', 'Computer'], ['Tuesday', 'English']];
const weekDoc = tableDoc(weekRows);
const insertScript = (p, end, arg) => [go(`doc:${p},${end}`), go('tab.insert'), go('menu:insert.table'), go(`choice:insert.table.create:${arg}`)];
const orientationScript = (arg) => [go('tab.layout'), ...layoutMenu('layout.orientation', arg)];
const marginScript = [go('tab.layout'), ...layoutMenu('layout.margins', 'narrow')];
const wideRows = [['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], ['Computer', 'English', 'Sewing', 'Computer', 'English', 'Market', 'Rest']];
const flyerText = 'Garden club\nWe meet every Saturday at 9 am.\nBring gloves and a hat.\nEveryone is welcome.\nCall Lan to join.';

export const items = [
  doItem('t5-cell-do', 't5-table-words',
    T('A cell is one box in a table. Find the price of coffee: click the cell that shows $4, then click Check.', 'Ô (cell) là một khung nhỏ trong bảng. Hãy tìm giá cà phê: bấm vào ô có $4, rồi bấm Kiểm tra.'),
    T('Look along the Coffee line. The price is in the box on the right.', 'Nhìn ngang theo dòng Coffee. Giá nằm ở ô bên phải.'),
    priceDoc, (doc, ctx) => {
      const c = caretCell(doc, ctx);
      return Boolean(c && c.row === 2 && c.col === 1);
    },
    [go(cellAt(2, 1, 1)), say('This box is one cell. It holds the price of coffee.', 'Khung này là một ô. Trong ô này ghi giá cà phê.')]),
  doItem('t5-row-do', 't5-table-words',
    T('A row goes across the table, from left to right. You want to check your Tuesday class. Click any cell in the Tuesday row, then click Check.', 'Hàng (row) chạy ngang qua bảng, từ trái sang phải. Bạn muốn xem thứ Ba học lớp gì. Hãy bấm vào một ô bất kỳ trong hàng Tuesday, rồi bấm Kiểm tra.'),
    T('Find Tuesday on the left. Tuesday and English are in the same row.', 'Tìm chữ Tuesday ở bên trái. Tuesday và English nằm trên cùng một hàng.'),
    weekDoc, (doc, ctx) => caretCell(doc, ctx)?.row === 2,
    [go(cellAt(2, 0, 3)), go(cellAt(2, 1, 3)), say('Tuesday and English are in one row. A row goes across.', 'Tuesday và English nằm trên cùng một hàng. Hàng chạy ngang.')]),
  doItem('t5-column-do', 't5-table-words',
    T('A column goes down the table, from top to bottom. You want to see all the prices. Click any cell in the Price column, then click Check.', 'Cột (column) chạy dọc theo bảng, từ trên xuống dưới. Bạn muốn xem giá của mọi món. Hãy bấm vào một ô bất kỳ trong cột Price, rồi bấm Kiểm tra.'),
    T('Price is at the top of the right side. Every box below it is in the Price column.', 'Chữ Price nằm ở trên cùng bên phải. Mọi ô bên dưới chữ đó đều thuộc cột Price.'),
    priceDoc, (doc, ctx) => caretCell(doc, ctx)?.col === 1,
    [go(cellAt(0, 1, 2)), go(cellAt(1, 1, 1)), go(cellAt(2, 1, 1)), say('Price, $3 and $4 are in one column. A column goes down.', 'Price, $3 và $4 nằm trong cùng một cột. Cột chạy dọc.')]),
  pick('t5-row-pick', 't5-table-words',
    T('This is your class timetable. Look at the coloured cells: Monday and Computer. What do we call this line of cells?', 'Đây là thời khoá biểu của lớp. Nhìn các ô có tô màu: Monday và Computer. Dãy ô này gọi là gì?'),
    T('Across, from left to right, is a row. Down, from top to bottom, is a column.', 'Dãy ô nằm ngang, từ trái sang phải, là hàng. Dãy ô đứng dọc, từ trên xuống dưới, là cột.'),
    [option('row', 'A row', 'Một hàng (row)'), option('column', 'A column', 'Một cột (column)'), option('cell', 'One cell', 'Một ô (cell)')], 'row',
    weekDoc, [go(cellAt(1, 0, 3)), go(cellAt(1, 1, 3)), say('Monday and Computer are in the same row.', 'Monday và Computer nằm trên cùng một hàng.')]),
  {
    id: 't5-insert-order', skill: 't5-insert-table', type: 'order',
    prompt: T('You want a timetable with 2 columns and 3 rows. Put the steps in order to insert the table.', 'Bạn muốn làm thời khoá biểu có 2 cột và 3 hàng. Hãy xếp các bước theo thứ tự để chèn bảng.'),
    hint: T('First click where the table should go. Then use Table on the Insert tab.', 'Trước tiên bấm vào chỗ muốn đặt bảng. Sau đó dùng Table trên thẻ Insert.'),
    steps: [
      option('place', 'Click on the page where the table should go', 'Bấm vào chỗ trên trang mà bạn muốn đặt bảng'),
      option('insert', 'Click the Insert tab', 'Bấm thẻ Insert'),
      option('table', 'Click Table', 'Bấm Table'),
      option('grid', 'Move the mouse over the squares until it says 2x3 Table, then click', 'Đưa chuột qua các ô vuông đến khi hiện chữ 2x3 Table, rồi bấm'),
    ],
    replay: replay('Class timetable', [...insertScript(0, 15, '2x3'), say('2 columns and 3 rows.', '2 cột và 3 hàng.')]),
  },
  doItem('t5-insert-do', 't5-insert-table',
    T('You want to list prices under the heading. Insert a table with 2 columns and 2 rows below Prices.', 'Bạn muốn ghi giá dưới tiêu đề. Hãy chèn một bảng có 2 cột và 2 hàng bên dưới chữ Prices.'),
    T('Click after Prices. Click Insert, then Table. Move the mouse over the squares until it says 2x2 Table, then click.', 'Bấm ngay sau chữ Prices. Bấm Insert, rồi bấm Table. Đưa chuột qua các ô vuông đến khi hiện chữ 2x2 Table, rồi bấm.'),
    'Prices', (doc) => heading(doc, 'Prices') && size(doc, 2, 2),
    insertScript(0, 6, '2x2'), 'insert.tables'),
  doItem('t5-type-do', 't5-table-type',
    T('Add tea to your price list. Click the empty cell under Item and type Tea. Press Tab, then type $3.', 'Hãy thêm trà vào bảng giá. Bấm vào ô trống dưới Item và gõ Tea. Nhấn Tab, rồi gõ $3.'),
    T('Tab moves to the next cell on the right. For $, hold Shift and press 4.', 'Phím Tab đưa con trỏ sang ô kế bên phải. Muốn gõ $, giữ Shift và nhấn 4.'),
    tableDoc([['Item', 'Price'], ['', '']]), (doc) => sameGrid(doc, [['Item', 'Price'], ['Tea', '$3']]),
    [go(cellAt(1, 0)), type('Tea', cellAt(1, 0)), key('Tab'), type('$3', cellAt(1, 1))]),
  doItem('t5-delete-row-do', 't5-row-col',
    T('The shop has no bread today. Delete the Bread row from the price list.', 'Hôm nay cửa hàng hết bánh mì. Hãy xoá hàng Bread khỏi bảng giá.'),
    T('Click in the Bread row. On the Layout tab next to Table Design, click Delete, then Delete Rows. Or right-click the row.', 'Bấm vào hàng Bread. Trên thẻ Layout nằm cạnh Table Design, bấm Delete, rồi bấm Delete Rows. Hoặc bấm chuột phải vào hàng đó.'),
    tableDoc([['Bread', '$2'], ['Milk', '$3'], ['Eggs', '$5']]), (doc) => sameGrid(doc, [['Milk', '$3'], ['Eggs', '$5']]),
    [go(cellAt(0, 0, 2)), go('tab.table'), go('menu:table.delete'), menuItem('table.deleteRow'), say('The Bread row is gone. Milk and Eggs stay.', 'Hàng Bread đã được xoá. Milk và Eggs vẫn còn.')], 'table.rows'),
  doItem('t5-insert-right-do', 't5-row-col',
    T('Your shopping list needs a place for prices. Add a column to the right of Food.', 'Danh sách đi chợ cần thêm chỗ ghi giá. Hãy thêm một cột bên phải cột Food.'),
    T('Click in the Food column. On the Layout tab next to Table Design, click Insert Right. Or right-click the column.', 'Bấm vào cột Food. Trên thẻ Layout nằm cạnh Table Design, bấm Insert Right. Hoặc bấm chuột phải vào cột đó.'),
    tableDoc([['Food'], ['Rice'], ['Eggs']]),
    (doc) => size(doc, 2, 3) && ['food', 'rice', 'eggs'].every((s, r) => loose(cellText(doc, 0, r, 0)) === s),
    [go(cellAt(0, 0, 4)), go('tab.table'), go('table.insertRight')], 'table.rows'),
  pick('t5-orient-wide-pick', 't5-orientation',
    T('Orientation is the way the page stands: tall or wide. Your timetable has 7 days across. It is too wide for the page. Which orientation makes the page wide?', 'Hướng trang (Orientation) là cách đặt trang giấy: dọc (cao) hay ngang (rộng). Thời khoá biểu của bạn có 7 ngày xếp ngang nên quá rộng, không vừa trang. Chọn hướng trang nào để trang rộng ra?'),
    T('Landscape turns the page on its side, so it is wide. Portrait is tall.', 'Landscape xoay trang nằm ngang, nên trang rộng ra. Portrait là trang dọc, cao.'),
    [option('landscape', 'Landscape (wide)', 'Landscape (trang ngang)'), option('portrait', 'Portrait (tall)', 'Portrait (trang dọc)')], 'landscape',
    tableDoc(wideRows, 'Class timetable'), orientationScript('landscape')),
  pick('t5-orient-letter-pick', 't5-orientation',
    T('You are writing a letter to your bank. Which orientation is usual for a letter?', 'Bạn đang viết thư gửi ngân hàng. Thư thường dùng hướng trang nào?'),
    T('Letters use a tall page. Tall is Portrait.', 'Thư dùng trang dọc (cao). Trang dọc là Portrait.'),
    [option('portrait', 'Portrait (tall)', 'Portrait (trang dọc)'), option('landscape', 'Landscape (wide)', 'Landscape (trang ngang)')], 'portrait',
    createDoc({ p: ['Dear Sir or Madam,', 'Please send me a new bank card.'], page: { orientation: 'landscape' } }), orientationScript('portrait')),
  doItem('t5-orient-do', 't5-orientation',
    T('Your restaurant menu has a wide table. Make the page wide: set Orientation to Landscape.', 'Thực đơn nhà hàng của bạn có một bảng rộng. Hãy làm trang rộng ra: đặt Orientation thành Landscape.'),
    T('Click the Layout tab. Click Orientation, then Landscape.', 'Bấm thẻ Layout. Bấm Orientation, rồi bấm Landscape.'),
    tableDoc([['Dish', 'Small', 'Medium', 'Large'], ['Pho', '$12', '$14', '$16']], 'Menu'), (doc) => landscape(doc),
    orientationScript('landscape'), 'layout.pageSetup', LAYOUT_TABS),
  pick('t5-margins-pick', 't5-margins',
    T('Margins are the empty edges around the page. Your flyer has a lot of text. Which margins leave the most room for the text?', 'Lề trang (Margins) là phần mép trống quanh trang giấy. Tờ rơi của bạn có nhiều chữ. Chọn lề nào thì còn nhiều chỗ cho chữ nhất?'),
    T('Narrow margins are thin edges, 1.27 cm. Thin edges leave more room for text.', 'Lề Narrow là lề hẹp, chỉ 1,27 cm. Lề hẹp thì còn nhiều chỗ cho chữ hơn.'),
    [option('narrow', 'Narrow (1.27 cm)', 'Narrow (1,27 cm)'), option('normal', 'Normal (2.54 cm)', 'Normal (2,54 cm)')], 'narrow',
    flyerText, marginScript),
  doItem('t5-margins-do', 't5-margins',
    T('Fit more of your flyer on the page. Change the Margins to Narrow.', 'Để tờ rơi chứa được nhiều chữ hơn trên trang, hãy đổi Margins thành Narrow.'),
    T('Click the Layout tab. Click Margins, then Narrow.', 'Bấm thẻ Layout. Bấm Margins, rồi bấm Narrow.'),
    flyerText, (doc) => narrow(doc), marginScript, 'layout.pageSetup', LAYOUT_TABS),
];

// Pick items that talk about a table show it above the choices, with the cells they mean shaded.
const FIGURES = { 't5-row-pick': { table: weekRows, mark: { row: 1 } } };
for (const item of items) if (FIGURES[item.id]) item.figure = FIGURES[item.id];

/* ---------- missions ---------- */
const timetableRows = [['Day', 'Class'], ['', ''], ['', '']];
const timetableCheck = (doc) => heading(doc, 'Class timetable') && size(doc, 2, 3) &&
  loose(cellText(doc, 0, 0, 0)) === 'day' && loose(cellText(doc, 0, 0, 1)) === 'class';
const timetableSteps = [
  step(T('Click after Class timetable. On the Insert tab, click Table. Choose 2x3 Table.', 'Bấm ngay sau chữ Class timetable. Trên thẻ Insert, bấm Table. Chọn 2x3 Table.'),
    T('First click at the end of Class timetable. Then click Insert, then Table. 2x3 means 2 columns and 3 rows: move the mouse over the squares until the top says 2x3 Table, then click.', 'Trước tiên bấm vào cuối dòng Class timetable. Sau đó bấm Insert, rồi bấm Table. 2x3 nghĩa là 2 cột và 3 hàng: đưa chuột qua các ô vuông đến khi phía trên hiện chữ 2x3 Table, rồi bấm.'),
    (doc) => size(doc, 2, 3), insertScript(0, 15, '2x3'), 'insert.tables'),
  step(T('Click the top-left cell. Type: Day', 'Bấm vào ô trên cùng bên trái. Gõ: Day'),
    T('The top-left cell is the first box of the new table. Use Shift for the capital D.', 'Ô trên cùng bên trái là ô đầu tiên của bảng mới. Giữ Shift để gõ chữ D viết hoa.'),
    (doc) => loose(cellText(doc, 0, 0, 0)) === 'day', [go(cellAt(0, 0)), type('Day', cellAt(0, 0))]),
  step(T('Press Tab. Type: Class', 'Nhấn Tab. Gõ: Class'),
    T('Tab moves you to the next cell on the right. Then type Class.', 'Phím Tab đưa bạn sang ô kế bên phải. Sau đó gõ Class.'),
    timetableCheck, [key('Tab'), type('Class', cellAt(0, 1))]),
];

const drinksStart = tableDoc([['Item', 'Price'], ['', ''], ['', '']], 'Drinks');
const drinksRows = [['Item', 'Price'], ['Tea', '$3'], ['Coffee', '$4']];
const drinksCheck = (doc) => heading(doc, 'Drinks') && sameGrid(doc, drinksRows);
const drinksSteps = [
  step(T('Click the empty cell under Item. Type: Tea', 'Bấm vào ô trống dưới Item. Gõ: Tea'),
    T('Click inside the first empty box below Item.', 'Bấm vào bên trong ô trống đầu tiên dưới chữ Item.'),
    (doc) => value(cellText(doc, 0, 1, 0)) === 'tea', [go(cellAt(1, 0)), type('Tea', cellAt(1, 0))]),
  step(T('Press Tab. Type: $3', 'Nhấn Tab. Gõ: $3'),
    T('Tab moves to the Price cell. For $, hold Shift and press 4.', 'Phím Tab đưa con trỏ sang ô Price. Muốn gõ $, giữ Shift và nhấn 4.'),
    (doc) => value(cellText(doc, 0, 1, 1)) === '3', [key('Tab'), type('$3', cellAt(1, 1))]),
  step(T('Press Tab. Type: Coffee', 'Nhấn Tab. Gõ: Coffee'),
    T('Tab at the end of a row goes to the first cell of the next row.', 'Ở ô cuối của một hàng, nhấn Tab sẽ sang ô đầu tiên của hàng bên dưới.'),
    (doc) => value(cellText(doc, 0, 2, 0)) === 'coffee', [key('Tab'), type('Coffee', cellAt(2, 0))]),
  step(T('Press Tab. Type: $4', 'Nhấn Tab. Gõ: $4'),
    T('This is the last cell. Type the price, then you are finished.', 'Đây là ô cuối cùng. Gõ giá vào là xong.'),
    drinksCheck, [key('Tab'), type('$4', cellAt(2, 1))]),
];

const classRows = [['Friday', '6 pm']];
const saturdayRows = [['Friday', '6 pm'], ['Saturday', '10 am']];
const saturdayCheck = (doc) => sameGrid(doc, saturdayRows);
const saturdaySteps = [
  step(T('Click in the Friday row. On the Layout tab next to Table Design, click Insert Below.', 'Bấm vào hàng Friday. Trên thẻ Layout nằm cạnh Table Design, bấm Insert Below.'),
    T('Click in the Friday row. Insert Below adds an empty row under Friday. Or right-click the row.', 'Bấm vào hàng Friday. Insert Below thêm một hàng trống bên dưới Friday. Hoặc bấm chuột phải vào hàng đó.'),
    (doc) => (doc.tables?.[0]?.rows.length ?? 0) >= 2 && loose(cellText(doc, 0, 0, 0)) === 'friday',
    [go(cellAt(0, 0, 3)), go('tab.table'), go('table.insertBelow')], 'table.rows'),
  step(T('Click the empty cell under Friday. Type: Saturday', 'Bấm vào ô trống dưới Friday. Gõ: Saturday'),
    T('The new row is under Friday. Click its first cell.', 'Hàng mới nằm dưới Friday. Bấm vào ô đầu tiên của hàng đó.'),
    (doc) => loose(cellText(doc, 0, 1, 0)) === 'saturday', [go(cellAt(1, 0)), type('Saturday', cellAt(1, 0))]),
  step(T('Press Tab. Type: 10 am', 'Nhấn Tab. Gõ: 10 am'),
    T('Tab moves to the time cell on the right.', 'Phím Tab đưa con trỏ sang ô ghi giờ ở bên phải.'),
    saturdayCheck, [key('Tab'), type('10 am', cellAt(1, 1))]),
];

const menuRows = [['Dish', 'Small', 'Medium', 'Large'], ['Pho', '$12', '$14', '$16'], ['Rice', '$10', '$12', '$14']];
const menuSteps = [
  step(T('Click the Layout tab. Click Orientation, then Landscape.', 'Bấm thẻ Layout. Bấm Orientation, rồi bấm Landscape.'),
    T('Orientation is in the Page Setup group. Landscape is the wide page.', 'Orientation nằm trong nhóm Page Setup. Landscape là trang nằm ngang.'),
    landscape, orientationScript('landscape'), 'layout.pageSetup'),
];

const flyerSteps = [
  step(T('Click the Layout tab. Click Margins, then Narrow.', 'Bấm thẻ Layout. Bấm Margins, rồi bấm Narrow.'),
    T('Margins is in the Page Setup group. Narrow is 1.27 cm.', 'Margins nằm trong nhóm Page Setup. Narrow là 1,27 cm.'),
    narrow, marginScript, 'layout.pageSetup'),
];

export const missions = [
  mission('t5-m-timetable', 't5-insert-table', T('Weekly class timetable', 'Thời khoá biểu hằng tuần'),
    T('Make a timetable for your week. Insert a table with 2 columns and 3 rows under the heading. Type Day and Class in the top row.', 'Hãy làm thời khoá biểu trong tuần của bạn. Chèn một bảng có 2 cột và 3 hàng dưới tiêu đề. Gõ Day và Class vào hàng trên cùng.'),
    'Class timetable', tableDoc(timetableRows, 'Class timetable'), TABLE_TABS, timetableSteps, timetableCheck),
  mission('t5-m-price-list', 't5-table-type', T('Fill in the price list', 'Điền bảng giá'),
    T('Your café needs a price list. Fill in two drinks: Tea costs $3 and Coffee costs $4. Use Tab to move to the next cell.', 'Quán cà phê của bạn cần một bảng giá. Hãy điền hai thức uống: Tea giá $3 và Coffee giá $4. Nhấn Tab để sang ô tiếp theo.'),
    drinksStart, tableDoc(drinksRows, 'Drinks'), TABLE_TABS, drinksSteps, drinksCheck),
  mission('t5-m-saturday', 't5-row-col', T('Add a row for Saturday', 'Thêm hàng cho thứ Bảy'),
    T('Your class now also meets on Saturday at 10 am. Add a row below Friday. Type Saturday and 10 am in the new row.', 'Bây giờ lớp của bạn học thêm vào thứ Bảy, lúc 10 giờ sáng. Hãy thêm một hàng dưới Friday. Gõ Saturday và 10 am vào hàng mới.'),
    tableDoc(classRows), tableDoc(saturdayRows), TABLE_TABS, saturdaySteps, saturdayCheck),
  mission('t5-m-menu-landscape', 't5-orientation', T('Make the menu landscape', 'Xoay thực đơn sang trang ngang'),
    T('Your menu table has four columns, so it needs a wide page. Turn the page to Landscape.', 'Bảng thực đơn có bốn cột nên cần trang rộng. Hãy xoay trang sang Landscape.'),
    tableDoc(menuRows, 'Menu'), tableDoc(menuRows, 'Menu', { orientation: 'landscape' }), LAYOUT_TABS, menuSteps, landscape),
  mission('t5-m-flyer-margins', 't5-margins', T('Narrow margins for a flyer', 'Lề hẹp cho tờ rơi'),
    T('Your garden club flyer needs more room for text. Make the empty edges smaller: change the Margins to Narrow.', 'Tờ rơi của câu lạc bộ làm vườn cần thêm chỗ cho chữ. Hãy làm phần mép trống nhỏ lại: đổi Margins thành Narrow.'),
    flyerText, createDoc({ p: flyerText.split('\n'), page: { margins: 'narrow' } }), LAYOUT_TABS, flyerSteps, narrow),
];
