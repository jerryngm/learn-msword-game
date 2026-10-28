// Topic 8: plan for a reader, then combine familiar skills in a useful document.
import { createDoc, textOf } from '../word/model.js';
import { templateDoc } from '../word/templates.js';
import { PICTURES } from '../word/pictures.js';
const T = (en, vi) => ({ en, vi });
const go = target => ({ target, click: 'single' });
const key = key => ({ key });
const type = (type, at) => ({ type, ...(at ? { at } : {}) });
const say = (en, vi) => ({ say: T(en, vi) });
const option = (id, en, vi) => ({ id, label: T(en, vi) });
const loose = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const words = s => loose(s).replace(/[^a-z0-9]/g, '');
const matching = (doc, text) => doc.p.find(p => !p.cell && words(textOf(p)) === words(text));
const hasText = (doc, text) => Boolean(matching(doc, text));
const formatted = (doc, text, props) => {
  const p = matching(doc, text); if (!p) return false;
  const runs = p.runs.filter(r => r.text.trim());
  return runs.length > 0 && runs.every(r => Object.entries(props).every(([k, v]) => r[k] === v));
};
const centered = (doc, text) => matching(doc, text)?.align === 'center';
const picture = (doc, id) => {
  const all = doc.p.map((p, i) => ({ p, i })).filter(({ p }) => p.picture);
  if (all.length !== 1 || all[0].p.picture.id !== id) return false;
  // The photo belongs directly under the first text heading; spare empty lines are harmless.
  const before = doc.p.slice(0, all[0].i).filter(p => !p.cell && textOf(p).trim());
  return before.length === 1 && before[0] === doc.p.find(p => !p.cell && textOf(p).trim());
};
const pic = id => { const p = PICTURES.find(p => p.id === id); return { picture: { id, width: 240, height: Math.round(240 * p.height / p.width), wrap: 'inline' } }; };
const selection = (p, text) => ({ select: { from: { p, offset: 0 }, to: { p, offset: text.length } } });
const selectTitle = text => [go('tab.home'), selection(0, text)];
const size20 = text => [...selectTitle(text), go('menu:home.font.size'), go('choice:home.font.size:20')];
const bold = text => [...selectTitle(text), go('home.font.bold')];
const center = () => [go('tab.home'), go('doc:0,0'), go('home.paragraph.alignCenter')];
// Reuse the taught routes: heading end, Enter for a new line, then insert from This Device or Online Pictures.
const insertFlower = heading => [go(`doc:0,${heading.length}`), key('Enter'), go('tab.insert'), go('menu:insert.pictures'), go('insert.pictures.device'), go('insert.pictures.nav:downloads'), go('choice:insert.pictures.choose:flower'), go('insert.pictures.insert')];
const insertOnlinePic = (heading, id) => [go(`doc:0,${heading.length}`), key('Enter'), go('tab.insert'), go('menu:insert.pictures'), go('insert.pictures.online'), go(`insert.pictures.online.category:${id}`), go(`choice:insert.pictures.choose:${id}`), go('insert.pictures.insert')];
const saveScript = name => [go('file'), go('bs.saveas'), go('sa.browse'), go('sa.documents'), go('sa.name'), type(name, 'sa.name'), go('sa.save')];
const saved = (ctx, name) => ctx?.saved?.folder?.length === 1 && ctx.saved.folder[0] === 'Documents' && words(String(ctx.saved.name).replace(/\.docx$/i, '')) === words(name);
const printScript = [go('file'), go('bs.print'), go('print.submit')];
const printed = ctx => ctx?.commands?.includes('file.print.copies.1');
const step = (skill, text, hint, done, demo, spotlight) => ({ skill, text, hint, done, demo, ...(spotlight ? { spotlight } : {}) });
const boldStep = text => step('t3-bold-italic-underline', T(`Select "${text}" and click Bold (B).`, `Bôi đen dòng “${text}” rồi bấm nút Bold (chữ B đậm).`), T('Select the heading. On the Home tab, click Bold (B).', 'Bôi đen tiêu đề. Trên thẻ Home, bấm nút Bold (chữ B đậm).'), doc => formatted(doc, text, { b: true }), bold(text), 'home.font');
const sizeStep = text => step('t3-font-size', T(`Select "${text}" and change Font Size to 20.`, `Bôi đen dòng “${text}” rồi đổi ô cỡ chữ (Font Size) thành 20.`), T('Select the heading. On the Home tab, open Font Size and click 20.', 'Bôi đen tiêu đề. Trên thẻ Home, mở danh sách Font Size rồi bấm 20.'), doc => formatted(doc, text, { size: 20 }), size20(text), 'home.font');
const centerStep = text => step('t3-align', T(`Center the "${text}" heading.`, `Canh giữa dòng tiêu đề “${text}” bằng nút Center (các gạch xếp giữa).`), T('Click in the heading. On the Home tab, click Center in the Paragraph group.', 'Bấm vào tiêu đề. Trên thẻ Home, bấm nút Center (các gạch xếp giữa) trong nhóm Paragraph.'), doc => centered(doc, text), center(text), 'home.paragraph');
const flowerStep = heading => step('t6-insert-picture', T('Add the flower.png picture on a new line under the heading.', 'Chèn hình flower.png vào dòng mới dưới tiêu đề.'), T('Click at the end of the heading. Press Enter. Click Insert, Pictures, then This Device. Click Downloads. Click flower.png, then Insert.', 'Bấm vào cuối tiêu đề. Nhấn Enter. Bấm Insert, Pictures, rồi This Device. Bấm Downloads. Bấm flower.png, rồi Insert.'), doc => picture(doc, 'flower'), insertFlower(heading), 'insert.pictures.insert');
const onlinePicStep = (heading, id, labelEn, labelVi) => step(
  't6-insert-picture',
  T(`Add the ${labelEn} picture on a new line under ${heading}.`, `Chèn hình ${labelEn} vào dòng mới dưới ${heading}.`),
  T(`Click at the end of ${heading} and press Enter. Click Insert, Pictures, then Online Pictures. Click ${labelEn}, choose the ${labelEn.toLowerCase()} picture, then click Insert. (Stock Images works too.)`, `Bấm vào cuối dòng ${heading} rồi nhấn Enter. Bấm Insert, Pictures, rồi Online Pictures. Bấm ô ${labelEn}, chọn hình ${labelVi}, rồi bấm Insert. (Dùng Stock Images cũng được.)`),
  doc => picture(doc, id),
  insertOnlinePic(heading, id),
  'insert.pictures.insert',
);
const saveStep = name => step('t1-save', T(`Save in Documents as ${name}. A space is fine too.`, `Lưu vào Documents với tên ${name}. Dùng dấu cách cũng được.`), T(`Click File, Save As, Browse, then Documents. Click File name and type ${name}. Click Save.`, `Bấm File, Save As, Browse, rồi Documents. Bấm ô File name và gõ ${name}. Bấm Save.`), (doc, ctx) => saved(ctx, name), saveScript(name));
const printStep = () => step('t7-print', T('Practise printing one copy.', 'Thực hành in một bản.'), T('Click File, then Print. Leave Copies at 1. Click the large Print button. The game does not print paper.', 'Bấm File, rồi Print. Giữ số 1 trong ô Copies. Bấm nút Print lớn. Trò chơi không in ra giấy.'), (doc, ctx) => printed(ctx), printScript);
const mission = (id, title, scenario, startDoc, targetDoc, steps, check) => ({
  id, skill: 't8-capstone', title, scenario, startDoc, targetDoc, tabs: ['home', 'insert'], steps,
  goal: { check, progress: (doc, ctx) => check(doc, ctx) ? 1 : steps.filter(s => s.done(doc, ctx)).length / steps.length },
});

const festivalTitle = 'Spring festival';
const festivalStart = createDoc('Spring festival\nSaturday 10 am\nCommunity hall\nMusic\nFood');
const festivalTarget = createDoc({ p: [{ align: 'center', runs: [{ text: festivalTitle, b: true, size: 20 }] }, '', pic('flower'), '', 'Saturday 10 am', 'Community hall', { list: { type: 'bullet', format: '•' }, runs: [{ text: 'Music' }] }, { list: { type: 'bullet', format: '•' }, runs: [{ text: 'Food' }] }] });
const menuTitle = 'Cafe menu';
const menuRows = [['Item', 'Price'], ['Tea', '$3'], ['Coffee', '$4']];
const menuTarget = createDoc({ p: [{ align: 'center', runs: [{ text: menuTitle, b: true, size: 20 }] }, '', pic('coffee'), ''], tables: [{ rows: menuRows.map(row => row.map(text => ({ p: [text] }))) }] });

export const items = [
  {
    id: 't8-plan-type-pick', skill: 't8-plan-doc', type: 'pick',
    prompt: T('Your neighbours need to know about a community festival. You want to show the name, time and place in one page. Which document should you plan?', 'Hàng xóm cần biết về lễ hội cộng đồng. Bạn muốn ghi tên lễ hội, thời gian và địa điểm trên một trang. Bạn nên làm loại văn bản nào?'),
    hint: T('A flyer tells people about an event. A menu lists food and prices. A resume tells an employer about your skills.', 'Tờ rơi giới thiệu một sự kiện. Thực đơn ghi món ăn và giá. Resume cho nơi tuyển dụng biết kỹ năng của bạn.'),
    options: [option('flyer', 'A festival flyer', 'Tờ rơi giới thiệu lễ hội'), option('menu', 'A café menu', 'Thực đơn quán cà phê'), option('resume', 'A resume', 'Sơ yếu lý lịch')], answer: 'flyer',
    replay: { mock: 'none', script: [say('Plan for your readers: a flyer tells neighbours the event, time and place.', 'Nghĩ đến người đọc: tờ rơi cho hàng xóm biết sự kiện, thời gian và địa điểm.')] },
  },
  {
    id: 't8-plan-heading-pick', skill: 't8-plan-doc', type: 'pick',
    prompt: T('You are planning an invitation for your computer class party. Your classmates will read it. Which heading tells them what the invitation is for?', 'Bạn đang chuẩn bị thiệp mời dự tiệc của lớp máy tính. Các bạn cùng lớp sẽ đọc thiệp. Tiêu đề nào cho biết rõ đây là thiệp mời dự sự kiện gì?'),
    hint: T('A clear heading names the event. Put the date, time and place below it.', 'Tiêu đề rõ ràng nêu tên sự kiện. Ghi ngày, giờ và địa điểm bên dưới.'),
    options: [option('party', 'Computer class party', 'Tiệc lớp máy tính'), option('hello', '“Hello” (Xin chào)', '“Hello” (Xin chào)'), option('file', 'My document', 'Văn bản của tôi')], answer: 'party',
    replay: { mock: 'word', doc: 'Computer class party\nSaturday 2 pm\nCommunity hall', script: [...center(), say('Name the event in the heading. Put the time and place below it.', 'Nêu tên sự kiện ở tiêu đề. Ghi thời gian và địa điểm bên dưới.')] },
  },
  {
    id: 't8-plan-details-pick', skill: 't8-plan-doc', type: 'pick',
    prompt: T('You are making a notice for a free English class. People need enough details to attend. Which details must go on the notice?', 'Bạn đang làm tờ thông báo cho lớp tiếng Anh miễn phí. Người đọc cần biết đủ thông tin để đến học. Bạn cần ghi những thông tin nào trên thông báo?'),
    hint: T('Readers need to know when the class happens and where to go.', 'Người đọc cần biết ngày giờ học và địa điểm để đến đúng chỗ.'),
    options: [
      option('when-where', 'Day, time and address', 'Ngày, giờ và địa điểm'),
      option('laptop', 'The colour of your laptop', 'Màu chiếc laptop của bạn'),
      option('breakfast', 'What you ate for breakfast', 'Sáng nay bạn ăn món gì'),
    ], answer: 'when-where',
    replay: { mock: 'word', doc: 'Free English class\nTuesday 10 am\n24 High Street', script: [...bold('Free English class'), say('Give readers the event, time and address.', 'Cho người đọc biết tên lớp, giờ học và địa chỉ.')] },
  },
  {
    id: 't8-plan-layout-sort', skill: 't8-plan-doc', type: 'sort',
    prompt: T('You are planning two community documents. Choose the clearest layout tool for each job.', 'Bạn đang chuẩn bị các văn bản cho cộng đồng. Hãy chọn cách trình bày rõ ràng nhất cho từng việc.'),
    hint: T('Use a table when each item has a matching price or time beside it. Use bullets for a simple list of things.', 'Dùng bảng (Table) khi mỗi mục đi kèm giá tiền hoặc giờ giấc tương ứng. Dùng dấu chấm đầu dòng (Bullets) cho danh sách các món đơn giản.'),
    bins: [option('table', 'A 2-column table', 'Bảng 2 cột (Table)'), option('bullet', 'A bullet list', 'Danh sách dấu chấm (Bullets)')],
    cards: [
      { ...option('prices', 'Drinks and their prices on a menu', 'Tên thức uống và giá tiền trên thực đơn'), bin: 'table' },
      { ...option('timetable', 'Days and class times on a timetable', 'Thứ ngày và giờ học trong thời khoá biểu'), bin: 'table' },
      { ...option('picnic', 'Things to bring to a picnic', 'Những thứ cần mang đi dã ngoại'), bin: 'bullet' },
      { ...option('festival', 'Activities at a spring festival', 'Các hoạt động tại lễ hội mùa xuân'), bin: 'bullet' },
    ],
    replay: { mock: 'word', doc: menuTarget, script: [say('A table lines up each drink with its price.', 'Bảng giúp căn thẳng hàng từng món uống với giá tiền.')] },
  },
  {
    id: 't8-plan-order', skill: 't8-plan-doc', type: 'order',
    prompt: T('You want to make and save a clear flyer for your community garden club. Put the main jobs in a sensible order.', 'Bạn muốn làm và lưu một tờ rơi rõ ràng cho câu lạc bộ làm vườn. Hãy xếp các việc chính theo thứ tự hợp lý.'),
    hint: T('Put your heading at the top first, add the picture and details next, then save your finished flyer.', 'Làm tiêu đề ở đầu trang trước, thêm hình và thông tin chi tiết tiếp theo, rồi lưu tờ rơi khi hoàn tất.'),
    steps: [
      option('heading', 'Type and format a big, clear heading', 'Gõ và định dạng tiêu đề to, rõ ràng'),
      option('picture', 'Insert a matching picture under the heading', 'Chèn một tấm hình phù hợp dưới tiêu đề'),
      option('details', 'Add the time, place and bullet points', 'Ghi thêm giờ, địa điểm và các ý chính'),
      option('save', 'Save the flyer in Documents with a clear name', 'Lưu tờ rơi vào Documents với tên dễ nhớ'),
    ],
    replay: { mock: 'word', doc: festivalTarget, script: [say('Heading first, picture and details next, then save.', 'Tiêu đề trước, tiếp theo là hình và nội dung, cuối cùng lưu lại.')] },
  },
  {
    id: 't8-plan-readability-pick', skill: 't8-plan-doc', type: 'pick',
    prompt: T('You are making a Lost Cat sign for a community noticeboard. People will read it while walking past. Which style helps them read it easily?', 'Bạn đang làm tờ thông báo tìm mèo lạc để dán lên bảng tin khu phố. Mọi người sẽ đọc khi đi ngang qua. Cách trình bày nào giúp họ dễ đọc nhất?'),
    hint: T('A big, bold dark heading and short lines on white paper are easy to see from a few steps away.', 'Tiêu đề chữ đậm, cỡ lớn cùng các dòng ngắn gọn trên giấy trắng sẽ dễ nhìn từ xa.'),
    options: [
      option('clear', 'A size 20 bold heading and short lines', 'Tiêu đề in đậm cỡ 20 và các dòng ngắn gọn'),
      option('tiny', 'Tiny size 8 yellow letters in one long paragraph', 'Chữ màu vàng cỡ 8 thật nhỏ viết liền một đoạn dài'),
      option('nophone', 'Only a picture, with no phone number', 'Chỉ để một tấm hình, không ghi số điện thoại'),
    ], answer: 'clear',
    replay: { mock: 'word', doc: 'LOST CAT\nBlack cat with a white tail.\nPlease call Lan: 0400 123 456', script: [...size20('LOST CAT'), ...bold('LOST CAT'), say('Big dark headings and short lines are easy to read.', 'Tiêu đề to, đậm cùng các dòng ngắn gọn giúp người đi đường dễ đọc.')] },
  },
];

const festivalBody = doc => ['Saturday 10 am', 'Community hall', 'Music', 'Food'].every(t => hasText(doc, t));
const festivalBullets = doc => ['Music', 'Food'].every(t => matching(doc, t)?.list?.type === 'bullet');
const festivalCheck = (doc, ctx) => festivalBody(doc) && formatted(doc, festivalTitle, { b: true, size: 20 }) && centered(doc, festivalTitle) && festivalBullets(doc) && picture(doc, 'flower') && saved(ctx, 'Festival_Flyer') && printed(ctx);
const festivalSteps = [
  boldStep(festivalTitle), sizeStep(festivalTitle), centerStep(festivalTitle), flowerStep(festivalTitle),
  {
    skill: 't4-bullets',
    text: T('Make Music and Food into a bullet list.', 'Thêm dấu chấm đầu dòng cho hai dòng Music và Food.'),
    hint: T('Select both lines, Music and Food. On the Home tab, click Bullets in the Paragraph group.', 'Bôi đen cả hai dòng Music và Food. Trên thẻ Home, bấm Bullets trong nhóm Paragraph.'),
    done: festivalBullets,
    get demo() {
      let first = 6, last = 7;
      if (typeof document !== 'undefined' && document.querySelector('.wd-page .wd-picture')) {
        const paras = [...document.querySelectorAll('.wd-page .wd-p')];
        const m = paras.find(el => words(el.textContent) === 'music');
        const f = paras.find(el => words(el.textContent) === 'food');
        if (m && f) { first = Number(m.dataset.p); last = Number(f.dataset.p); }
      }
      return [go('tab.home'), { select: { from: { p: first, offset: 0 }, to: { p: last, offset: 4 } } }, go('home.paragraph.bullets')];
    },
    spotlight: 'home.paragraph',
  },
  saveStep('Festival_Flyer'), printStep(),
];

const cell = (doc, r, c) => (doc.tables?.[0]?.rows?.[r]?.[c]?.p ?? []).map(textOf).join(' ');
const tableShape = doc => {
  const rows = doc.tables?.[0]?.rows;
  return doc.tables?.length === 1 && rows.length >= 3 && rows.every(row => row.length === 2) &&
    rows.slice(3).every(row => row.every(c => !c.p.map(textOf).join('').trim()));
};
const rowCheck = (doc, r) => menuRows[r].every((text, c) => words(cell(doc, r, c)) === words(text));
const tableBelowPicture = doc => {
  const picIdx = doc.p.findIndex(p => p.picture);
  const cellIdx = doc.p.findIndex(p => p.cell);
  return picIdx >= 0 && cellIdx > picIdx;
};
const menuCheck = (doc, ctx) => formatted(doc, menuTitle, { b: true, size: 20 }) && centered(doc, menuTitle) && picture(doc, 'coffee') && tableShape(doc) && tableBelowPicture(doc) && menuRows.every((_, r) => rowCheck(doc, r)) && saved(ctx, 'Cafe_Menu') && printed(ctx);
const menuSteps = [
  boldStep(menuTitle), sizeStep(menuTitle), centerStep(menuTitle),
  onlinePicStep(menuTitle, 'coffee', 'Coffee', 'ly cà phê'),
  {
    skill: 't5-insert-table',
    text: T('Click on the empty line under the picture. Insert a table with 2 columns and 3 rows.', 'Bấm vào dòng trống bên dưới hình. Chèn bảng có 2 cột và 3 hàng.'),
    hint: T('Click below the Coffee picture. Click Insert, then Table, and choose 2x3 Table on the grid.', 'Bấm vào dòng trống dưới hình Coffee. Bấm Insert, rồi Table, và chọn 2x3 Table trên lưới ô.'),
    done: doc => tableShape(doc) && (!doc.p.some(p => p.picture) || tableBelowPicture(doc)),
    get demo() {
      let p = 3;
      if (typeof document !== 'undefined' && document.querySelector('.wd-page .wd-picture')) {
        const picP = Number(document.querySelector('.wd-page .wd-picture')?.closest('.wd-p')?.dataset.p ?? 2);
        p = picP + 1;
      }
      return [go(`doc:${p},0`), go('tab.insert'), go('menu:insert.table'), go('choice:insert.table.create:2x3')];
    },
    spotlight: 'insert.tables',
  },
  ...menuRows.map(([left, right], r) => step(
    't5-table-type',
    T(`Row ${r + 1}: click the left cell, type ${left}, press Tab, then type ${right}.`, `Hàng ${r + 1}: bấm vào ô bên trái, gõ ${left}, nhấn Tab, rồi gõ ${right}.`),
    T(`Click the left cell of row ${r + 1} and type ${left}. Press Tab to move right, then type ${right}.`, `Bấm vào ô bên trái của hàng ${r + 1} và gõ ${left}. Nhấn Tab để sang ô bên phải, rồi gõ ${right}.`),
    doc => rowCheck(doc, r),
    [go(`cell:0,${r},0,0`), type(left, `cell:0,${r},0,0`), key('Tab'), type(right, `cell:0,${r},1,0`)],
  )),
  saveStep('Cafe_Menu'), printStep(),
];

const inviteTitle = 'Class party';
const invitationStart = templateDoc('flyer');
const invitationTarget = createDoc({ p: [{ align: 'center', runs: [{ text: inviteTitle, b: true, size: 20 }] }, '', pic('balloons'), '', 'Saturday 2 pm', 'Community hall'] });
const invitationWords = doc => ['Class party', 'Saturday 2 pm', 'Community hall'].every(t => hasText(doc, t)) && !doc.p.some(p => /\[(Event name|Date and time|Place)\]/.test(textOf(p)));
const invitationCheck = (doc, ctx) => invitationWords(doc) && centered(doc, inviteTitle) && picture(doc, 'balloons') && saved(ctx, 'Class_Invitation') && printed(ctx);
const placeholderStep = (placeholder, value, fallbackP) => ({
  skill: 't7-placeholder',
  text: T(`Replace ${placeholder} with ${value}.`, `Thay ${placeholder} bằng ${value}.`),
  hint: T(`Click ${placeholder} once. The whole block is selected. Type ${value}.`, `Bấm một lần vào ${placeholder}. Cả phần chữ sẽ được bôi đen. Gõ ${value}.`),
  done: doc => hasText(doc, value),
  get demo() {
    let p = fallbackP;
    if (typeof document !== 'undefined' && document.querySelector('.wd-page .wd-picture')) {
      const el = document.querySelector(`.wd-page [data-placeholder="${placeholder}"]`);
      if (el) p = Number(el.dataset.p);
    }
    return [go(`placeholder:${p}`), type(value, `doc:${p},0`)];
  },
});
const invitationSteps = [
  step('t7-placeholder',
    T('Replace [Event name] with Class party.', 'Thay [Event name] bằng Class party.'),
    T('Click [Event name] once. The whole block is selected. Type Class party.', 'Bấm một lần vào [Event name]. Cả phần chữ sẽ được bôi đen. Gõ Class party.'),
    doc => hasText(doc, inviteTitle), [go('placeholder:0'), type(inviteTitle, 'doc:0,0')]),
  centerStep(inviteTitle),
  onlinePicStep(inviteTitle, 'balloons', 'Balloons', 'bóng bay'),
  placeholderStep('[Date and time]', 'Saturday 2 pm', 4),
  placeholderStep('[Place]', 'Community hall', 5),
  saveStep('Class_Invitation'), printStep(),
];

export const missions = [
  mission('t8-m-festival-flyer', T('Make a festival flyer', 'Làm tờ rơi lễ hội'), T('Tell your neighbours about the Spring festival. The words are ready. Make the heading big, bold and centred. Add a flower photo under the heading, then make Music and Food into bullets. Save your flyer and practise printing one copy.', 'Làm tờ rơi báo tin lễ hội mùa xuân (“Spring festival”) cho hàng xóm. Phần chữ đã có sẵn. Hãy làm tiêu đề to, in đậm và canh giữa. Chèn hình flower.png dưới tiêu đề, rồi tạo dấu chấm đầu dòng cho Music và Food. Lưu tờ rơi và thực hành in một bản.'), festivalStart, festivalTarget, festivalSteps, festivalCheck),
  mission('t8-m-cafe-menu', T('Make a café menu', 'Làm thực đơn quán cà phê'), T('Your café sells tea for $3 and coffee for $4. Make the heading big, bold and centred. Add a coffee picture under the heading, then add a 2x3 price table below it. Save your menu and practise printing one copy.', 'Quán cà phê bán trà giá $3 và cà phê giá $4. Hãy làm tiêu đề to, in đậm và canh giữa. Chèn hình ly cà phê dưới tiêu đề, rồi thêm bảng giá 2x3 bên dưới. Lưu thực đơn và thực hành in một bản.'), 'Cafe menu', menuTarget, menuSteps, menuCheck),
  mission('t8-m-class-invitation', T('Make a class party invitation', 'Làm thiệp mời dự tiệc của lớp'), T('The Community flyer template is open. Replace the heading with Class party, centre it, and add a balloons picture under it. Fill in Saturday 2 pm and Community hall, then save and practise printing one copy.', 'Mẫu Community flyer đang mở. Hãy thay tiêu đề thành “Class party”, canh giữa, rồi chèn hình bóng bay bên dưới. Điền tiếp Saturday 2 pm và Community hall, sau đó lưu lại và thực hành in một bản.'), invitationStart, invitationTarget, invitationSteps, invitationCheck),
];
