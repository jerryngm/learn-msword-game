// Topic 6: pictures (insert, resize from a corner, Wrap Text › Square, delete) and VNI typing with Unikey (optional).
import { createDoc, textOf } from '../word/model.js';
import { PICTURES } from '../word/pictures.js';

const T = (en, vi) => ({ en, vi });
const go = (target, click = 'single') => ({ target, click });
const drag = (target, dx, dy) => ({ target, drag: { dx, dy } });
const key = (key) => ({ key });
const type = (type, at) => (at ? { type, at } : { type });
const say = (en, vi) => ({ say: T(en, vi) });
const option = (id, en, vi) => ({ id, label: T(en, vi) });
const replay = (doc, script, mock = 'word') => ({ mock, ...(mock === 'word' ? { doc } : {}), script });

// Demo notes (what the engine draws): a ghost Insert › Pictures › This Device opens the picker. A ghost file click
// only highlights the file, and the ghost Insert button (`insert.pictures.insert`) inserts it after the paragraph where
// the learner's caret is (paragraph 0 in a fresh replay; a ghost Enter doesn't move it). `picture:N` selects the
// N-th picture but keeps the tab, as in Word, so a demo clicks `tab.picture` before a Picture Format control.
// `picture:N:se` is a handle for a drag. Wrap Text › Square and the Delete key change the ghost picture only.

/** A picture paragraph at `width` px, with the height that keeps the bundled image's shape. */
const pic = (id, width, wrap = 'inline', height) => {
  const asset = PICTURES.find((p) => p.id === id);
  return { picture: { id, width, height: height ?? Math.round((width * asset.height) / asset.width), wrap } };
};
const flyer = (heading, picture, lines) => createDoc({ p: [heading, ...(picture ? [picture] : []), ...lines] });

const loose = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const pictures = (doc) => doc.p.map((p, i) => ({ i, ...p.picture })).filter((p) => p.id);
/** The text lines, without picture paragraphs and empty lines (inserting a picture adds an empty line after it). */
const lines = (doc) => doc.p.filter((p) => !p.picture && !p.cell).map(textOf).map(loose).filter(Boolean);
const sameLines = (doc, expected) => {
  const got = lines(doc);
  return got.length === expected.length && got.every((s, i) => s === loose(expected[i]));
};
const ratioOf = (id) => {
  const asset = PICTURES.find((p) => p.id === id);
  return asset.width / asset.height;
};
// A corner drag keeps the shape exactly (up to rounding); a side drag changes it.
const keepsShape = (p) => Math.abs(p.width / p.height / ratioOf(p.id) - 1) < 0.03;
// The trainer teaches "make it smaller": any real change down from the 480 px start counts, with no size target.
const smaller = (p) => p.width < 470;
/** Exactly one picture, the right one, and it sits right after the paragraph `before` (the heading or the line above). */
const onePictureAfter = (doc, id, before) => {
  const all = pictures(doc);
  if (all.length !== 1 || all[0].id !== id) return false;
  const prev = doc.p.slice(0, all[0].i).filter((p) => !p.picture && loose(textOf(p)));
  return prev.length > 0 && loose(textOf(prev[prev.length - 1])) === loose(before);
};
const caretAt = (ctx) => ctx?.selection?.focus ?? ctx?.selection?.anchor ?? null;
/** The caret is at the end of the line `text`, or (after Enter) on an empty line right below it. */
const caretAtEnd = (doc, ctx, text) => {
  const at = caretAt(ctx);
  const para = at ? doc.p[at.p] : null;
  if (!para || para.picture) return false;
  if (loose(textOf(para)) === loose(text)) return at.offset >= textOf(para).trimEnd().length;
  return !loose(textOf(para)) && at.p > 0 && loose(textOf(doc.p[at.p - 1])) === loose(text);
};
const pictureSelected = (doc, ctx) => Boolean(doc.p[caretAt(ctx)?.p]?.picture);

// Picture commands sit on the Insert tab (and its contextual Picture Format tab).
const TABS = ['home', 'insert'];
const doItem = (id, skill, prompt, hint, doc, check, demo, spotlight) => ({
  id, skill, type: 'do', prompt, hint, doc, tabs: TABS, check, demo, ...(spotlight ? { spotlight } : {}), replay: replay(doc, demo),
});
const pick = (id, skill, prompt, hint, options, answer, rep) => ({ id, skill, type: 'pick', prompt, hint, options, answer, replay: rep });
const step = (text, hint, done, demo, spotlight) => ({ text, hint, done, demo, ...(spotlight ? { spotlight } : {}) });
const mission = (id, skill, title, scenario, startDoc, targetDoc, steps, check) => ({
  id, skill, title, scenario, startDoc, targetDoc, tabs: TABS, steps,
  goal: { check, progress: (doc, ctx) => check(doc, ctx) ? 1 : steps.filter((s) => s.done(doc, ctx)).length / steps.length },
});

// Insert › Pictures › This Device › a picture in the "Insert Picture" window › Insert.
const openPicker = [go('tab.insert'), go('menu:insert.pictures'), go('insert.pictures.device')];
const choosePicture = (id) => [go(`choice:insert.pictures.choose:${id}`), go('insert.pictures.insert')];
const insertScript = (id) => [...openPicker, ...choosePicture(id)];
// Click the end of the line, then Enter for a new empty line (where the picture goes).
const newLineAt = (p, end) => [go(`doc:${p},${end}`), key('Enter')];
const wrapScript = [go('picture:0'), go('tab.picture'), go('menu:picture.wrap'), go('choice:picture.wrap.set:square')];

/* ---------- revision items ---------- */

const gardenLines = ['We meet every Saturday at 9 am.', 'Everyone is welcome.'];
const classLines = ['I am learning Word on a laptop.'];
const bigFlower = flyer('Garden club', pic('flower', 480), gardenLines);
const mouseFlyer = flyer('Garden club', pic('mouse', 120), gardenLines);
const wrapLines = ['Grow your own herbs at home.', 'We share seeds and tips.', 'Come and meet us on Saturday.'];
const wrapStart = flyer('Garden club', pic('flower', 200), wrapLines);
// VNI in the replay: the keys go in first, then the caption says what Unikey turns them into.
const vni = (keys, en, vi) => replay(null, [type(keys), say(en, vi)], 'keyboard');

export const items = [
  {
    id: 't6-insert-order', skill: 't6-insert-picture', type: 'order',
    prompt: T('Your garden club flyer needs a flower photo under the heading. Put the steps in order to insert the picture.', 'Tờ rơi của câu lạc bộ làm vườn cần một tấm hình hoa ngay dưới tiêu đề. Hãy xếp các bước theo thứ tự để chèn hình.'),
    hint: T('First make a new line under the heading. Then use Pictures on the Insert tab.', 'Trước tiên tạo một dòng mới dưới tiêu đề. Sau đó dùng Pictures trên thẻ Insert.'),
    steps: [
      option('place', 'Click at the end of the heading. Press Enter for a new line.', 'Bấm vào cuối tiêu đề. Nhấn Enter để xuống dòng mới.'),
      option('insert', 'Click the Insert tab', 'Bấm thẻ Insert'),
      option('device', 'Click Pictures, then This Device', 'Bấm Pictures, rồi bấm This Device'),
      option('choose', 'Click the flower photo, then click Insert', 'Bấm vào tấm hình hoa, rồi bấm Insert'),
    ],
    replay: replay(flyer('Garden club', null, gardenLines), [...newLineAt(0, 11), ...insertScript('flower'), say('The picture goes on the new line.', 'Hình nằm ở dòng mới.')]),
  },
  doItem('t6-insert-do', 't6-insert-picture',
    T('You are writing about your computer class. Add the Laptop picture under the heading My computer class.', 'Bạn đang viết về lớp học máy tính của mình. Hãy chèn hình Laptop dưới tiêu đề My computer class.'),
    T('Click at the end of My computer class and press Enter. Click Insert, then Pictures, then This Device. Click Laptop, then click Insert.', 'Bấm vào cuối dòng My computer class rồi nhấn Enter. Bấm Insert, rồi Pictures, rồi This Device. Bấm vào hình Laptop, rồi bấm Insert.'),
    flyer('My computer class', null, classLines),
    (doc) => onePictureAfter(doc, 'laptop', 'My computer class') && sameLines(doc, ['My computer class', ...classLines]),
    [...newLineAt(0, 17), ...insertScript('laptop')], 'insert.pictures.insert'),
  pick('t6-resize-pick', 't6-resize',
    T('When you click a picture, small squares show on its corners and sides. They are called handles. You drag a handle to change the size. Your flower picture is too big for the flyer. You want it smaller, but not squashed. Which handle do you drag?', 'Khi bấm vào hình, các ô vuông nhỏ hiện ra ở các góc và các cạnh của hình. Các ô này gọi là điểm kéo (handle). Kéo một điểm kéo để đổi cỡ hình. Hình hoa trên tờ rơi của bạn quá to. Bạn muốn hình nhỏ lại mà không bị méo. Bạn kéo điểm kéo nào?'),
    T('A corner handle keeps the shape of the picture. A side handle stretches or squashes it.', 'Điểm kéo ở góc giữ nguyên hình dạng. Điểm kéo ở cạnh làm hình bị kéo giãn hoặc bị bẹp.'),
    [option('corner', 'A corner handle', 'Điểm kéo ở góc hình'), option('side', 'A side handle', 'Điểm kéo ở giữa một cạnh')], 'corner',
    replay(bigFlower, [go('picture:0'), drag('picture:0:se', -200, -140), say('A corner keeps the flower the same shape.', 'Kéo ở góc thì hình hoa vẫn giữ nguyên hình dạng.')])),
  doItem('t6-resize-do', 't6-resize',
    T('The flower picture fills half of your flyer. Make it smaller. Drag a corner, so it keeps its shape.', 'Hình hoa chiếm tới nửa tờ rơi. Hãy làm hình nhỏ lại. Kéo ở góc hình để hình giữ nguyên hình dạng.'),
    T('Click the picture once. Point at the small square on the bottom-right corner (the handle). Hold the mouse button and drag towards the middle of the picture. If it looks stretched, press Ctrl+Z and try again.', 'Bấm vào hình một lần. Đưa chuột tới ô vuông nhỏ ở góc dưới bên phải (điểm kéo). Giữ nút chuột và kéo vào phía giữa hình. Nếu hình bị méo, nhấn Ctrl+Z rồi làm lại.'),
    bigFlower,
    (doc) => {
      const all = pictures(doc);
      return all.length === 1 && smaller(all[0]) && keepsShape(all[0]) && sameLines(doc, ['Garden club', ...gardenLines]);
    },
    [go('picture:0'), drag('picture:0:se', -200, -140)]),
  pick('t6-stretched-pick', 't6-resize',
    T('You dragged a side handle by mistake. Now the flower picture looks squashed. What is the quickest way to fix it?', 'Bạn lỡ kéo điểm kéo ở cạnh hình. Bây giờ hình hoa bị bẹp. Cách sửa nhanh nhất là gì?'),
    T('Undo takes the last change back. Then a corner handle changes the size without changing the shape.', 'Undo huỷ thay đổi vừa làm. Sau đó kéo điểm kéo ở góc để đổi cỡ mà không làm méo hình.'),
    [
      option('undo', 'Press Ctrl+Z, then drag a corner handle', 'Nhấn Ctrl+Z, rồi kéo điểm kéo ở góc hình'),
      option('other-side', 'Drag the other side handle', 'Kéo điểm kéo ở cạnh bên kia'),
      option('delete', 'Delete the picture and insert it again', 'Xoá hình rồi chèn lại từ đầu'),
    ], 'undo',
    replay(bigFlower, [key('Ctrl+Z'), say('Ctrl+Z is Undo. It takes back the side drag. Here is the picture with its shape back.', 'Ctrl+Z là Undo. Nó huỷ lần kéo cạnh vừa rồi. Hình đã trở lại hình dạng cũ.'), go('picture:0'), drag('picture:0:se', -200, -140), say('Then drag a corner handle.', 'Sau đó kéo điểm kéo ở góc hình.')])),
  pick('t6-wrap-pick', 't6-move-wrap',
    T('Your flyer has a picture and some lines of text. The text is under the picture, so the flyer is too long for one page. You want the text next to the picture. Which Wrap Text choice do you pick?', 'Tờ rơi của bạn có một tấm hình và vài dòng chữ. Chữ nằm dưới hình nên tờ rơi dài quá một trang. Bạn muốn chữ nằm cạnh hình. Bạn chọn mục nào trong Wrap Text?'),
    T('Square lets the text go around the picture. In Line with Text keeps the picture in the line, like a big letter, so the text stays above or below it.', 'Square cho chữ chạy quanh hình. In Line with Text để hình nằm trong dòng như một chữ lớn, nên chữ chỉ nằm ở phía trên hoặc phía dưới hình.'),
    [option('square', 'Square', 'Mục Square'), option('inline', 'In Line with Text', 'Mục In Line with Text')], 'square',
    replay(wrapStart, [...wrapScript, say('Square: the text moves up next to the picture.', 'Chọn Square: chữ chuyển lên nằm cạnh hình.')])),
  doItem('t6-wrap-do', 't6-move-wrap',
    T('On your flyer, the text is under the picture, so the flyer is too long. Put the text next to the picture, so it fits on one page: set Wrap Text to Square.', 'Trên tờ rơi của bạn, chữ đang nằm dưới hình nên tờ rơi bị dài. Hãy đưa chữ lên cạnh hình cho vừa một trang: đặt Wrap Text thành Square.'),
    T('Click the picture once. A new tab, Picture Format, shows at the top. Click it. Click Wrap Text, then Square.', 'Bấm vào hình một lần. Ở phía trên sẽ hiện thêm thẻ mới tên Picture Format. Bấm vào thẻ đó. Bấm Wrap Text, rồi bấm Square.'),
    wrapStart,
    (doc) => pictures(doc).length === 1 && pictures(doc)[0].wrap === 'square' && sameLines(doc, ['Garden club', ...wrapLines]),
    wrapScript, 'picture.arrange'),
  doItem('t6-delete-do', 't6-delete-picture',
    T('Your garden club flyer has a picture of a computer mouse by mistake. Delete the picture, and keep the text.', 'Tờ rơi câu lạc bộ làm vườn bị chèn nhầm hình con chuột máy tính. Hãy xoá hình đó và giữ lại phần chữ.'),
    T('Click the picture once. Small squares (handles) show around it. Then press the Delete key.', 'Bấm vào hình một lần. Các ô vuông nhỏ (điểm kéo) hiện ra quanh hình. Sau đó nhấn phím Delete.'),
    mouseFlyer,
    (doc) => pictures(doc).length === 0 && sameLines(doc, ['Garden club', ...gardenLines]),
    [go('picture:0'), key('Delete'), say('The picture is gone. The text stays.', 'Hình đã được xoá. Phần chữ vẫn còn.')]),
  pick('t6-delete-pick', 't6-delete-picture',
    T('You want to take a wrong picture out of your letter. You will press the Delete key. What do you do first?', 'Bạn muốn bỏ một tấm hình chèn nhầm ra khỏi lá thư. Bạn sẽ nhấn phím Delete. Nhưng trước đó, bạn cần làm gì?'),
    T('Click the picture once, so the small squares (handles) show. Then Delete takes away the picture.', 'Bấm vào hình một lần để các ô vuông nhỏ (điểm kéo) hiện ra. Lúc đó phím Delete mới xoá được hình.'),
    [
      option('click', 'Click the picture once', 'Bấm vào hình một lần'),
      option('end', 'Click at the end of the letter', 'Bấm vào cuối lá thư'),
      option('select-all', 'Press Ctrl+A', 'Nhấn Ctrl+A'),
    ], 'click',
    replay(mouseFlyer, [go('picture:0'), say('The small squares show: the picture is selected.', 'Các ô vuông nhỏ đã hiện: hình đang được chọn.'), key('Delete')])),
  pick('t6-vni-circumflex-pick', 't6-unikey',
    T('Unikey is the program that types Vietnamese letters. It is on, and set to VNI. You are writing a shopping note and want the word "cân". Which keys make â?', 'Unikey là chương trình giúp gõ chữ tiếng Việt. Unikey đang bật, kiểu gõ VNI. Bạn đang viết danh sách đi chợ và muốn gõ chữ "cân". Nhấn những phím nào để ra chữ â?'),
    T('In VNI, the number 6 adds the little hat: a6 makes â, e6 makes ê, o6 makes ô.', 'Với VNI, phím số 6 thêm dấu mũ: a6 ra â, e6 ra ê, o6 ra ô.'),
    [option('a6', 'a 6', 'a 6'), option('a8', 'a 8', 'a 8'), option('a1', 'a 1', 'a 1')], 'a6',
    vni('ca6n', 'c a 6 n: Unikey writes "cân".', 'c a 6 n: Unikey hiện ra chữ "cân".')),
  pick('t6-vni-d-pick', 't6-unikey',
    T('Unikey is the program that types Vietnamese letters. It is on, and set to VNI. You want to write "đi chợ" in a message. Which keys make đ?', 'Unikey là chương trình giúp gõ chữ tiếng Việt. Unikey đang bật, kiểu gõ VNI. Bạn muốn gõ "đi chợ" trong tin nhắn. Nhấn những phím nào để ra chữ đ?'),
    T('In VNI, press d and then the number 9 to get đ.', 'Với VNI, nhấn phím d rồi phím số 9 sẽ ra chữ đ.'),
    [option('d9', 'd 9', 'd 9'), option('d6', 'd 6', 'd 6'), option('dd', 'd d', 'd d')], 'd9',
    vni('d9i', 'd 9 i: Unikey writes "đi".', 'd 9 i: Unikey hiện ra chữ "đi".')),
  pick('t6-vni-tone-pick', 't6-unikey',
    T('Unikey is the program that types Vietnamese letters. It is on, and set to VNI. You want to greet your class with "Xin chào". After typing chao, which key turns a into à?', 'Unikey là chương trình giúp gõ chữ tiếng Việt. Unikey đang bật, kiểu gõ VNI. Bạn muốn chào cả lớp bằng câu "Xin chào". Gõ xong chao, bạn nhấn phím nào để có dấu huyền (à)?'),
    T('VNI tone keys are numbers, typed after the word: 1 makes á, 2 makes à, 3 makes ả, 4 makes ã, 5 makes ạ.', 'Với VNI, phím bỏ dấu là phím số, gõ sau chữ: 1 là dấu sắc (á), 2 là dấu huyền (à), 3 là dấu hỏi (ả), 4 là dấu ngã (ã), 5 là dấu nặng (ạ).'),
    [option('2', '2', '2'), option('1', '1', '1'), option('5', '5', '5'), option('3', '3', '3')], '2',
    vni('Xin chao2', 'c h a o 2: Unikey writes "chào".', 'c h a o 2: Unikey hiện ra chữ "chào".')),
];

/* ---------- missions ---------- */

const flyerLines = ['We meet every Saturday at 9 am.', 'Bring gloves and a hat.', 'Everyone is welcome.'];
const flyerText = ['Garden club', ...flyerLines];

const insertCheck = (doc) => onePictureAfter(doc, 'flower', 'Garden club') && sameLines(doc, flyerText);
// Enter at the end of the heading opens an empty line right under it (the place for the picture).
const newLineUnder = (doc, text) => doc.p.some((p, i) => i > 0 && !p.picture && !loose(textOf(p)) && loose(textOf(doc.p[i - 1])) === loose(text));
const insertSteps = [
  step(T('Click at the end of Garden club.', 'Bấm vào cuối dòng Garden club.'),
    T('Click just after the last letter of Garden club.', 'Bấm ngay sau chữ cái cuối cùng của Garden club.'),
    (doc, ctx) => caretAtEnd(doc, ctx, 'Garden club') || newLineUnder(doc, 'Garden club') || insertCheck(doc), [go('doc:0,11')]),
  step(T('Press Enter.', 'Nhấn Enter.'),
    T('Enter makes a new empty line under Garden club. The picture will go on this new line.', 'Phím Enter tạo một dòng trống mới dưới Garden club. Hình sẽ nằm ở dòng mới này.'),
    (doc) => newLineUnder(doc, 'Garden club') || insertCheck(doc), [key('Enter')]),
  step(T('Click Insert, then Pictures, then This Device. Click Flower, then click Insert.', 'Bấm Insert, rồi Pictures, rồi This Device. Bấm vào hình Flower, rồi bấm Insert.'),
    T('First click the Insert tab. Click Pictures, then This Device. In the Insert Picture window, click the flower photo, then click the Insert button. If the picture goes to the wrong place, press Ctrl+Z and try again.', 'Trước tiên bấm thẻ Insert. Bấm Pictures, rồi This Device. Trong cửa sổ Insert Picture, bấm vào tấm hình hoa, rồi bấm nút Insert. Nếu hình nằm sai chỗ, nhấn Ctrl+Z rồi làm lại.'),
    insertCheck, insertScript('flower'), 'insert.pictures.insert'),
];

const resizeStart = flyer('Garden club', pic('flower', 480), flyerLines);
const resizeCheck = (doc) => {
  const all = pictures(doc);
  return all.length === 1 && all[0].id === 'flower' && smaller(all[0]) && keepsShape(all[0]) && sameLines(doc, flyerText);
};
const resized = (doc) => pictures(doc)[0]?.width !== 480;
const resizeSteps = [
  step(T('Click the flower picture once.', 'Bấm vào hình hoa một lần.'),
    T('Click anywhere on the picture. Small squares show on its corners and sides. They are called handles.', 'Bấm vào chỗ nào trên hình cũng được. Các ô vuông nhỏ sẽ hiện ra ở các góc và các cạnh của hình. Các ô này gọi là điểm kéo (handle).'),
    (doc, ctx) => pictureSelected(doc, ctx) || resized(doc), [go('picture:0')]),
  step(T('Drag the small square on the bottom-right corner towards the middle, to make the picture smaller.', 'Kéo ô vuông nhỏ ở góc dưới bên phải vào phía giữa hình để làm hình nhỏ lại.'),
    T('Use a corner, not a side, so the flower keeps its shape. Hold the mouse button down while you drag. If it looks stretched, press Ctrl+Z and try again.', 'Kéo ở góc, đừng kéo ở cạnh, để hình hoa giữ nguyên hình dạng. Giữ nút chuột trong lúc kéo. Nếu hình bị méo, nhấn Ctrl+Z rồi làm lại.'),
    resizeCheck, [go('picture:0'), drag('picture:0:se', -240, -168)]),
];

const wrapMissionLines = ['Learn to type a letter in Word.', 'Every Tuesday at 10 am.', 'The class is free.'];
const wrapMissionStart = flyer('Free computer class', pic('laptop', 200), wrapMissionLines);
const wrapCheck = (doc) => {
  const all = pictures(doc);
  return all.length === 1 && all[0].id === 'laptop' && all[0].wrap === 'square' && sameLines(doc, ['Free computer class', ...wrapMissionLines]);
};
const wrapSteps = [
  step(T('Click the laptop picture once.', 'Bấm vào hình laptop một lần.'),
    T('Click anywhere on the picture. A new tab, Picture Format, shows at the top.', 'Bấm vào chỗ nào trên hình cũng được. Ở phía trên sẽ hiện thêm thẻ mới tên Picture Format.'),
    (doc, ctx) => pictureSelected(doc, ctx) || wrapCheck(doc), [go('picture:0')]),
  step(T('Click the Picture Format tab. Click Wrap Text, then Square.', 'Bấm thẻ Picture Format. Bấm Wrap Text, rồi bấm Square.'),
    T('First click the Picture Format tab at the top. If you cannot see that tab, click the picture first. Then click Wrap Text, then Square. Square puts the text next to the picture.', 'Trước tiên bấm thẻ Picture Format ở phía trên. Nếu không thấy thẻ đó, hãy bấm vào hình trước. Rồi bấm Wrap Text, rồi bấm Square. Square đưa chữ lên nằm cạnh hình.'),
    wrapCheck, [go('picture:0'), go('tab.picture'), go('menu:picture.wrap'), go('choice:picture.wrap.set:square')], 'picture.arrange'),
];

export const missions = [
  mission('t6-m-flower-flyer', 't6-insert-picture', T('Add a flower photo to the flyer', 'Thêm hình hoa vào tờ rơi'),
    T('Your garden club flyer has text but no picture. Add the Flower picture on a new line under the heading Garden club.', 'Tờ rơi của câu lạc bộ làm vườn mới có chữ mà chưa có hình. Hãy chèn hình Flower vào một dòng mới dưới tiêu đề Garden club.'),
    flyerText.join('\n'), createDoc({ p: ['Garden club', '', pic('flower', 240), '', ...flyerLines] }), insertSteps, insertCheck),
  mission('t6-m-smaller-picture', 't6-resize', T('Make the picture smaller', 'Làm hình nhỏ lại'),
    T('The flower picture is too big for your flyer. Make it smaller. Drag a corner, so the flower does not get squashed.', 'Hình hoa quá to so với tờ rơi. Hãy làm hình nhỏ lại. Kéo ở góc hình để hình hoa không bị bẹp.'),
    resizeStart, flyer('Garden club', pic('flower', 240), flyerLines), resizeSteps, resizeCheck),
  mission('t6-m-picture-beside-text', 't6-move-wrap', T('Put the picture beside the text', 'Đặt hình bên cạnh chữ'),
    T('Your notice for a free computer class has a laptop picture. The text is under the picture, so the notice is too long. Put the text next to the picture, so the notice fits on one page: set Wrap Text to Square.', 'Tờ thông báo lớp máy tính miễn phí của bạn có một hình laptop. Chữ đang nằm dưới hình nên tờ thông báo bị dài. Hãy đưa chữ lên cạnh hình cho vừa một trang: đặt Wrap Text thành Square.'),
    wrapMissionStart, flyer('Free computer class', pic('laptop', 200, 'square'), wrapMissionLines), wrapSteps, wrapCheck),
];
