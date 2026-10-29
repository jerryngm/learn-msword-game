// Topic 7: local templates, placeholder text, Save As versions and practice printing.
import { practiceText } from './text-rules.js';
import { createDoc, textOf } from '../word/model.js';
import { templateDoc } from '../word/templates.js';
const T = (en, vi) => ({ en, vi });
const go = target => ({ target, click: 'single' });
const key = key => ({ key });
const type = (type, at) => ({ type, ...(at ? { at } : {}) });
const option = (id, en, vi) => ({ id, label: T(en, vi) });
const replay = (doc, script) => ({ mock: 'word', doc, script });
const resume = templateDoc('resume');
const contactLine = 'Phone: 0400 123 456 | Melbourne';
const skillsHeading = 'Skills:';
const lines = doc => doc.p.map(textOf).map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
const same = (doc, expected) => JSON.stringify(lines(doc)) === JSON.stringify(expected);
const validName = s => {
  const t = String(s ?? '').trim();
  return Boolean(t && !/[\[\]]/.test(t) && practiceText(t).toLowerCase() !== 'your name' && /\p{L}.*\p{L}/u.test(t));
};
const openedResume = (doc, ctx) => ctx?.commands?.includes('file.new.template.resume') && same(doc, lines(resume));
const named = doc => {
  const ls = lines(doc);
  return ls.length === 5 && validName(ls[0]) && ls[1] === contactLine && ls[2] === skillsHeading && ls[3] === '[Your skills]' && ls[4] === '[Optional interests]';
};
const trimmed = doc => same(doc, ['[Your name]', contactLine, skillsHeading, '[Your skills]']);
const filled = createDoc({ p: [{ runs: [{ text: 'Lan Nguyen', b: true, size: 20 }] }, contactLine, skillsHeading, 'Cooking and cleaning', ''] });
const filledCheck = doc => {
  const ls = lines(doc);
  return ls.length === 4 && validName(ls[0]) &&
    practiceText(ls[1]).toLowerCase() === practiceText(contactLine).toLowerCase() &&
    practiceText(ls[2]).toLowerCase() === practiceText(skillsHeading).toLowerCase() &&
    practiceText(ls[3]).toLowerCase() === 'cooking and cleaning';
};
// Match meaningful words, accepting spaces, punctuation, accents, capitals and a typed extension.
const versionName = name => String(name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\.docx$/i,'').toLowerCase().replace(/[^a-z0-9]/g,'') === 'resumev2';
const savedVersion = (doc, ctx) => filledCheck(doc) && ctx?.saved?.folder?.length === 1 && ctx.saved.folder[0] === 'Documents' && versionName(ctx.saved.name);
const printedTwo = (doc, ctx) => filledCheck(doc) && ctx?.commands?.includes('file.print.copies.2');
const stage = () => typeof document === 'undefined' ? '' : document.querySelector('.bs')?.dataset.stage ?? '';
const inPage = id => typeof document !== 'undefined' && Boolean(document.querySelector(`.bs-item.is-on[data-bs="${id}"]`));
const field = selector => typeof document === 'undefined' ? '' : document.querySelector(selector)?.value ?? '';
const resumePreview = () => typeof document !== 'undefined' && Boolean(document.querySelector('.bn-preview [data-new="create"][data-id="resume"]'));
const searchedResume = () => inPage('new') && /^resume$/i.test(field('[data-new="search"]').trim());
const templateRoute = [go('file'),go('bs.new'),go('new.search'),type('resume','new.search'),go('new.template:resume'),go('new.create')];
const replaceName = [go('placeholder:0'),type('Lan Nguyen','doc:0,0')];
const deleteOptional = [go('placeholder:4'),key('Delete')];
const saveRoute = [go('file'),go('bs.saveas'),go('sa.browse'),go('sa.documents'),go('sa.name'),type('Resume_V2','sa.name'),go('sa.save')];
const printRoute = [go('file'),go('bs.print'),go('print.copies'),key('ArrowUp'),go('print.submit')];
const step = (text, hint, done, demo) => ({ text, hint, done, demo });
const mission = (id,skill,title,scenario,startDoc,targetDoc,steps,check,extra={}) => ({
  id,skill,title,scenario,startDoc,targetDoc,tabs:['home'],steps,...extra,
  goal:{check,progress:(doc,ctx)=>check(doc,ctx)?1:steps.filter(s=>s.done(doc,ctx)).length/steps.length},
});
const replaceHint = T('Click the grey [Your name] text once. The whole block is selected. Type your name (for example: Lan Nguyen) to replace it.', 'Bấm một lần vào phần chữ màu xám [Your name]. Cả phần chữ sẽ được bôi đen. Gõ tên của bạn (ví dụ: Lan Nguyen) để thay thế.');
const deleteHint = T('Click [Optional interests] once to select the whole block. Press Delete. Keep the other lines.', 'Bấm một lần vào [Optional interests] để bôi đen cả phần chữ. Nhấn Delete. Giữ lại các dòng khác.');
const versionHint = T('Use File, Save As, Browse, then Documents. Click File name and type Resume_V2. Click Save. A space instead of the underscore is fine.', 'Bấm File, Save As, Browse, rồi Documents. Bấm ô File name và gõ Resume_V2. Bấm Save. Bạn có thể dùng dấu cách thay cho dấu gạch dưới (_).');
export const items = [
  {
    id:'t7-template-order',skill:'t7-template',type:'order',
    prompt:T('You need a resume for a job application. Put the steps in order to open a resume template.', 'Bạn cần làm sơ yếu lý lịch để xin việc. Hãy xếp các bước theo thứ tự để mở mẫu resume.'),
    hint:T('A template is a document with a layout ready for you. Find templates in File, New. Search for resume.', 'Mẫu là văn bản đã có sẵn bố cục. Tìm mẫu trong File, New. Gõ resume để tìm.'),
    steps:[option('new','Click File, then New','Bấm File, rồi New'),option('search','Type "resume" in the "Search for online templates" box','Gõ “resume” vào ô tìm mẫu Search for online templates'),option('choose','Click Simple resume','Bấm Simple resume'),option('create','Click Create','Bấm Create')],
    replay:replay('',templateRoute),
  },
  {
    id:'t7-placeholder-replace-do',skill:'t7-placeholder',type:'do',tabs:['home'],doc:resume,
    prompt:T('This resume template has example text in brackets. Replace [Your name] with your name (or Lan Nguyen). Keep the other lines.', 'Mẫu resume này có phần chữ trong ngoặc vuông để bạn thay. Hãy thay [Your name] bằng tên của bạn (hoặc Lan Nguyen). Giữ lại các dòng khác.'),
    hint:replaceHint,check:named,demo:replaceName,replay:replay(resume,replaceName),
  },
  {
    id:'t7-placeholder-delete-do',skill:'t7-placeholder',type:'do',tabs:['home'],doc:resume,
    prompt:T('You do not want to include interests in this resume. Delete [Optional interests]. Keep the other lines.', 'Bạn không muốn ghi sở thích vào resume này. Hãy xoá [Optional interests]. Giữ lại các dòng khác.'),
    hint:deleteHint,check:trimmed,demo:deleteOptional,replay:replay(resume,deleteOptional),
  },
  {
    id:'t7-version-order',skill:'t7-save-version',type:'order',
    prompt:T('You changed Resume_V1. Put the steps in order to keep it and save Resume_V2 in Documents.', 'Bạn đã sửa Resume_V1. Hãy xếp các bước để giữ bản cũ và lưu thêm Resume_V2 vào Documents.'),
    hint:versionHint,
    steps:[option('saveas','Click File, then Save As','Bấm File, rồi Save As'),option('browse','Click Browse, then Documents','Bấm Browse, rồi Documents'),option('name','Click File name and type Resume_V2','Bấm ô File name và gõ Resume_V2'),option('save','Click Save','Bấm Save')],
    replay:replay(filled,saveRoute),
  },
  {
    id:'t7-version-v2-pick',skill:'t7-save-version',type:'pick',
    prompt:T('Your first resume is called Resume_V1. You changed it and want to keep both versions. Which name makes the new version easy to find?', 'Bản resume đầu tiên của bạn tên là Resume_V1. Bạn đã sửa và muốn giữ cả hai bản. Tên nào giúp bạn dễ tìm bản mới?'),
    hint:T('V1 means version 1. V2 means version 2. A different name keeps the first version.', 'V1 là bản thứ nhất. V2 là bản thứ hai. Dùng tên khác để giữ được bản đầu tiên.'),
    options:[option('v2','Resume_V2','Resume_V2'),option('v1','Resume_V1','Resume_V1'),option('untitled','Document1','Document1')],answer:'v2',
    replay:replay(filled,saveRoute),
  },
  {
    id:'t7-version-final-pick',skill:'t7-save-version',type:'pick',
    prompt:T('You checked your resume and it is ready to send. Which name clearly shows that it is the finished version?', 'Bạn đã kiểm tra resume và đã sẵn sàng gửi đi. Tên nào cho biết rõ đây là bản đã hoàn tất?'),
    hint:T('Final tells you the document is finished and ready to use.', 'Final cho biết văn bản đã hoàn tất và sẵn sàng dùng.'),
    options:[option('final','Resume_Final','Resume_Final'),option('v1','Resume_V1','Resume_V1'),option('file','My_file','My_file')],answer:'final',
    replay:replay(filled,[go('file'),go('bs.saveas'),go('sa.browse'),go('sa.documents'),go('sa.name'),type('Resume_Final','sa.name'),go('sa.save')]),
  },
  {
    id:'t7-print-order',skill:'t7-print',type:'order',
    prompt:T('You need two resume copies for an interview. Put the steps in order to practise printing them.', 'Bạn cần hai bản resume để đi phỏng vấn. Hãy xếp các bước để thực hành in hai bản.'),
    hint:T('Click File, then Print. Copies starts at 1. Change it to 2, then click the large Print button. This game does not print paper.', 'Bấm File, rồi Print. Ô Copies đang là 1. Đổi thành 2, rồi bấm nút Print lớn. Trò chơi không in ra giấy.'),
    steps:[option('file','Click File','Bấm File'),option('page','Click Print on the left','Bấm Print ở bên trái'),option('copies','Set Copies to 2','Đổi số trong ô Copies thành 2'),option('print','Click the large Print button','Bấm nút Print lớn')],
    replay:replay(filled,printRoute),
  },
];
const templateSteps = [
  step(T('Click File, then New.', 'Bấm File, rồi New.'),T('File is at the top left. New is on the left of the File screen.', 'File nằm ở góc trên bên trái. New nằm bên trái màn hình File.'),(doc,ctx)=>inPage('new')||openedResume(doc,ctx),[go('file'),go('bs.new')]),
  step(T('Click the "Search for online templates" box and type "resume".', 'Bấm vào ô “Search for online templates” và gõ “resume”.'),T('Click the Search for online templates box. Type "resume". The Simple resume picture appears below.', 'Bấm ô tìm mẫu Search for online templates. Gõ “resume”. Hình Simple resume hiện ra bên dưới.'),(doc,ctx)=>searchedResume()||resumePreview()||openedResume(doc,ctx),[go('new.search'),type('resume','new.search')]),
  step(T('Click Simple resume.', 'Bấm Simple resume.'),T('Click the Simple resume picture to see a larger preview.', 'Bấm vào hình Simple resume để xem mẫu lớn hơn.'),(doc,ctx)=>resumePreview()||openedResume(doc,ctx),[go('new.template:resume')]),
  step(T('Click Create.', 'Bấm Create.'),T('Create opens a new document using this template.', 'Create mở một văn bản mới theo mẫu này.'),openedResume,[go('new.create')]),
];
const fillSteps = [
  step(T('Click [Your name] once and type your name (or Lan Nguyen).', 'Bấm một lần vào [Your name] và gõ tên của bạn (hoặc Lan Nguyen).'),replaceHint,(doc)=>validName(textOf(doc.p[0]??{})),replaceName),
  step(T('Click [Your skills] once and type "Cooking and cleaning".', 'Bấm một lần vào [Your skills] và gõ “Cooking and cleaning”.'),T('Click [Your skills] once. Type "Cooking and cleaning".', 'Bấm một lần vào [Your skills]. Gõ “Cooking and cleaning”.'),(doc)=>doc.p.some(p=>practiceText(textOf(p)).toLowerCase()==='cooking and cleaning'),[go('placeholder:3'),type('Cooking and cleaning','doc:3,0')]),
  {
    text:T('Click [Optional interests] once and press Delete.', 'Bấm một lần vào [Optional interests] rồi nhấn phím Delete.'),
    hint:deleteHint,
    done:(doc)=>!doc.p.some(p=>textOf(p).includes('[Optional interests]')),
    get demo() {
      const p = typeof document !== 'undefined' ? document.querySelector('[data-placeholder="[Optional interests]"]')?.dataset.p ?? 4 : 4;
      return [go(`placeholder:${p}`),key('Delete')];
    },
  },
];
const saveSteps = [
  step(T('Click File, then Save As.', 'Bấm File, rồi Save As.'),T('Save As makes a new version with a different name.', 'Save As lưu thêm một bản với tên khác.'),(doc,ctx)=>/^(saveas|dialog)/.test(stage())||savedVersion(doc,ctx),[go('file'),go('bs.saveas')]),
  step(T('Click Browse, then Documents.', 'Bấm Browse, rồi Documents.'),T('Browse opens the Save As window. Click Documents on its left.', 'Browse mở cửa sổ Save As. Bấm Documents ở bên trái cửa sổ.'),(doc,ctx)=>stage()==='dialog-documents'||savedVersion(doc,ctx),[go('sa.browse'),go('sa.documents')]),
  step(T('Type Resume_V2 in File name. A space is fine too.', 'Gõ Resume_V2 vào ô File name. Dùng dấu cách cũng được.'),T('Click File name. Replace the old name with Resume_V2. You can use a space instead of the underscore.', 'Bấm ô File name. Thay tên cũ bằng Resume_V2. Bạn có thể dùng dấu cách thay cho dấu gạch dưới (_).'),(doc,ctx)=>(stage()==='dialog-documents'&&versionName(field('.sa-name')))||savedVersion(doc,ctx),[go('sa.name'),type('Resume_V2','sa.name')]),
  step(T('Click Save.', 'Bấm Save.'),T('Save keeps this version under the new name in Documents.', 'Save lưu bản này vào Documents với tên mới.'),savedVersion,[go('sa.save')]),
];
const printSteps = [
  step(T('Click File, then Print.', 'Bấm File, rồi Print.'),T('Print on the left opens the print preview.', 'Mục Print bên trái mở phần xem trước khi in.'),(doc,ctx)=>inPage('print')||printedTwo(doc,ctx),[go('file'),go('bs.print')]),
  step(T('Set Copies to 2.', 'Đổi số trong ô Copies thành 2.'),T('Copies starts at 1. Click its up arrow once, or click the box and type 2.', 'Ô Copies đang là 1. Bấm mũi tên lên một lần, hoặc bấm vào ô và gõ 2.'),(doc,ctx)=>(inPage('print')&&Number(field('[data-print="copies"]'))===2)||printedTwo(doc,ctx),[go('print.copies'),key('ArrowUp')]),
  step(T('Click the large Print button.', 'Bấm nút Print lớn.'),T('The game confirms your two copies. No paper is printed.', 'Trò chơi xác nhận bạn đã thực hành in hai bản. Không in ra giấy.'),printedTwo,[go('print.submit')]),
];
const skilled = (skill, ...args) => ({ skill, ...step(...args) });
const loweredText = p => practiceText(textOf(p)).toLowerCase();
const hasLine = (doc, text) => doc.p.some(p => loweredText(p) === text.toLowerCase());
const placeholderP = (placeholder, fallback) => typeof document === 'undefined' ? fallback : Number(document.querySelector(`[data-placeholder="${placeholder}"]`)?.dataset.p ?? fallback);

// Mission: a shopping list from the List template.
const listWords = ['Shopping list', 'Rice', 'Eggs'];
const listFilled = createDoc({ p: [{ runs: [{ text: 'Shopping list', b: true, size: 20 }] }, 'Rice', 'Eggs'] });
const openedList = (doc, ctx) => Boolean(ctx?.commands?.includes('file.new.template.list'));
const listPreview = () => typeof document !== 'undefined' && Boolean(document.querySelector('.bn-preview [data-new="create"][data-id="list"]'));
const searchedList = () => inPage('new') && /list/i.test(field('[data-new="search"]').trim());
const listCheck = (doc, ctx) => openedList(doc, ctx) && JSON.stringify(doc.p.map(loweredText).filter(Boolean)) === JSON.stringify(listWords.map(s => s.toLowerCase()));
const listPlaceholderStep = (placeholder, value, fallbackP) => ({
  skill: 't7-placeholder',
  text: T(`Click ${placeholder} once and type ${value}.`, `Bấm một lần vào ${placeholder} và gõ ${value}.`),
  hint: T(`Click the grey ${placeholder} text once. The whole block is selected. Type ${value} to replace it.`, `Bấm một lần vào phần chữ màu xám ${placeholder}. Cả phần chữ sẽ được bôi đen. Gõ ${value} để thay thế.`),
  done: doc => hasLine(doc, value),
  get demo() { const p = placeholderP(placeholder, fallbackP); return [go(`placeholder:${p}`), type(value, `doc:${p},0`)]; },
});
const listSteps = [
  skilled('t7-template', T('Click File, then New.', 'Bấm File, rồi New.'), T('File is at the top left. New is on the left of the File screen.', 'File nằm ở góc trên bên trái. New nằm bên trái màn hình File.'), (doc, ctx) => inPage('new') || openedList(doc, ctx), [go('file'), go('bs.new')]),
  skilled('t7-template', T('Click the "Search for online templates" box and type "list".', 'Bấm vào ô “Search for online templates” và gõ “list”.'), T('Click the Search for online templates box. Type "list". The Shopping list picture appears below.', 'Bấm ô tìm mẫu Search for online templates. Gõ “list”. Hình Shopping list hiện ra bên dưới.'), (doc, ctx) => searchedList() || listPreview() || openedList(doc, ctx), [go('new.search'), type('list', 'new.search')]),
  skilled('t7-template', T('Click Shopping list.', 'Bấm Shopping list.'), T('Click the Shopping list picture to see a larger preview.', 'Bấm vào hình Shopping list để xem mẫu lớn hơn.'), (doc, ctx) => listPreview() || openedList(doc, ctx), [go('new.template:list')]),
  skilled('t7-template', T('Click Create.', 'Bấm Create.'), T('Create opens a new document using this template.', 'Create mở một văn bản mới theo mẫu này.'), openedList, [go('new.create')]),
  listPlaceholderStep('[Item 1]', 'Rice', 1),
  listPlaceholderStep('[Item 2]', 'Eggs', 2),
];

// Mission: keep the old flyer and save a new version, then print one copy.
const flyerLines = ['Computer class', 'Tuesday 11 am', 'Community centre'];
const flyerStart = createDoc({ p: [{ runs: [{ text: 'Computer class', b: true, size: 20 }] }, 'Tuesday 11 am', 'Community centre'] });
const flyerVersionName = name => String(name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.docx$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'flyerv2';
const flyerUnchanged = doc => same(doc, flyerLines);
const savedFlyer = (doc, ctx) => flyerUnchanged(doc) && ctx?.saved?.folder?.length === 1 && ctx.saved.folder[0] === 'Documents' && flyerVersionName(ctx.saved.name);
const printedOne = ctx => Boolean(ctx?.commands?.includes('file.print.copies.1'));
const flyerDone = (doc, ctx) => savedFlyer(doc, ctx) && printedOne(ctx);
const flyerSaveHint = T('Use File, Save As, Browse, then Documents. Click File name and type Flyer_V2. Click Save. A space instead of the underscore is fine.', 'Bấm File, Save As, Browse, rồi Documents. Bấm ô File name và gõ Flyer_V2. Bấm Save. Bạn có thể dùng dấu cách thay cho dấu gạch dưới (_).');
const flyerSteps = [
  skilled('t7-save-version', T('Click File, then Save As.', 'Bấm File, rồi Save As.'), T('Save As makes a new version with a different name. The old Flyer_V1 stays as it is.', 'Save As lưu thêm một bản với tên khác. Bản Flyer_V1 cũ vẫn còn nguyên.'), (doc, ctx) => /^(saveas|dialog)/.test(stage()) || savedFlyer(doc, ctx) || printedOne(ctx), [go('file'), go('bs.saveas')]),
  skilled('t7-save-version', T('Click Browse, then Documents.', 'Bấm Browse, rồi Documents.'), T('Browse opens the Save As window. Click Documents on its left.', 'Browse mở cửa sổ Save As. Bấm Documents ở bên trái cửa sổ.'), (doc, ctx) => stage() === 'dialog-documents' || savedFlyer(doc, ctx) || printedOne(ctx), [go('sa.browse'), go('sa.documents')]),
  skilled('t7-save-version', T('Type Flyer_V2 in File name. A space is fine too.', 'Gõ Flyer_V2 vào ô File name. Dùng dấu cách cũng được.'), flyerSaveHint, (doc, ctx) => (stage() === 'dialog-documents' && flyerVersionName(field('.sa-name'))) || savedFlyer(doc, ctx) || printedOne(ctx), [go('sa.name'), type('Flyer_V2', 'sa.name')]),
  skilled('t7-save-version', T('Click Save.', 'Bấm Save.'), T('Save keeps this version under the new name in Documents.', 'Save lưu bản này vào Documents với tên mới.'), (doc, ctx) => savedFlyer(doc, ctx) || printedOne(ctx), [go('sa.save')]),
  skilled('t7-print', T('Click File, then Print.', 'Bấm File, rồi Print.'), T('Print on the left opens the print preview.', 'Mục Print bên trái mở phần xem trước khi in.'), (doc, ctx) => inPage('print') || printedOne(ctx), [go('file'), go('bs.print')]),
  skilled('t7-print', T('Click the large Print button. Leave Copies at 1.', 'Bấm nút Print lớn. Giữ số 1 trong ô Copies.'), T('Copies already shows 1, which is what you need. The game confirms your copy. No paper is printed.', 'Ô Copies đã là 1, đúng như bạn cần. Trò chơi xác nhận bạn đã in một bản. Không in ra giấy.'), (doc, ctx) => printedOne(ctx), [go('print.submit')]),
];

export const missions = [
  mission('t7-m-open-template','t7-template',T('Open a resume template','Mở mẫu resume'),T('You want to apply for a job. Open the Simple resume template so the layout is ready for you.', 'Bạn muốn xin việc. Hãy mở mẫu Simple resume để có sẵn bố cục.'),'',resume,templateSteps,openedResume),
  mission('t7-m-fill-resume','t7-placeholder',T('Fill in a simple resume','Điền thông tin vào resume'),T('Fill in this resume with your own name (or Lan Nguyen) and your skills, then remove the optional interests line. Use Cooking and cleaning for the skills.', 'Điền tên của bạn (hoặc Lan Nguyen) và kỹ năng vào resume này, rồi xoá dòng sở thích không bắt buộc. Ghi Cooking and cleaning ở phần kỹ năng.'),resume,filled,fillSteps,filledCheck),
  mission('t7-m-save-version','t7-save-version',T('Save a new resume version','Lưu thêm bản resume mới'),T('You updated Resume_V1. Keep the first version and save this one in Documents as Resume_V2. A space instead of the underscore is fine.', 'Bạn vừa sửa Resume_V1. Hãy giữ bản đầu và lưu bản này vào Documents với tên Resume_V2. Bạn có thể dùng dấu cách thay cho dấu gạch dưới (_).'),filled,undefined,saveSteps,savedVersion,{title_bar:'Resume_V1'}),
  mission('t7-m-print-two','t7-print',T('Print two resume copies','In hai bản resume'),T('You need two copies of your resume for an interview. Practise printing 2 copies. The game shows a confirmation and does not print paper.', 'Bạn cần hai bản resume để đi phỏng vấn. Hãy thực hành in 2 bản. Trò chơi hiện thông báo xác nhận và không in ra giấy.'),filled,undefined,printSteps,printedTwo),
  mission('t7-m-shopping-template','t7-template',T('A shopping list from a template','Danh sách đi chợ từ mẫu có sẵn'),T('You are going to the market. Open the Shopping list template, then replace its two example items with Rice and Eggs.', 'Bạn sắp đi chợ. Hãy mở mẫu Shopping list, rồi thay hai món mẫu bằng Rice và Eggs.'),'',listFilled,listSteps,listCheck),
  mission('t7-m-class-time-v2','t7-save-version',T('The class time changed','Giờ học đã đổi'),T('Your computer class now starts at 11 am, and the flyer on the screen already says so. This flyer is saved as Flyer_V1. Keep Flyer_V1 as it is, and save this one as a new file called Flyer_V2 in Documents. Then practise printing 1 copy for the noticeboard.', 'Lớp máy tính giờ bắt đầu lúc 11 giờ, và tờ rơi đang mở đã ghi giờ mới. Tờ rơi này đang lưu với tên Flyer_V1. Hãy giữ nguyên Flyer_V1 và lưu bản này thành file mới tên Flyer_V2 trong Documents. Sau đó thực hành in 1 bản để dán lên bảng tin.'),flyerStart,undefined,flyerSteps,flyerDone,{title_bar:'Flyer_V1'}),
];
