// Topic 8: plan for a reader, then combine familiar skills in a useful document.
import { createDoc, textOf } from '../word/model.js';
import { templateDoc } from '../word/templates.js';
import { PICTURES } from '../word/pictures.js';
const T = (en, vi) => ({ en, vi });
const go = target => ({ target, click: 'single' });
const key = key => ({ key });
const type = (type, at) => ({ type, ...(at ? { at } : {}) });
const say = (en, vi) => ({ say: T(en, vi) });
const option = (id,en,vi) => ({ id,label:T(en,vi) });
const loose = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const words = s => loose(s).replace(/[^a-z0-9]/g,'');
const matching = (doc,text) => doc.p.find(p => !p.cell && words(textOf(p)) === words(text));
const hasText = (doc,text) => Boolean(matching(doc,text));
const formatted = (doc,text,props) => {
  const p=matching(doc,text); if(!p) return false;
  const runs=p.runs.filter(r=>r.text.trim());
  return runs.length>0 && runs.every(r=>Object.entries(props).every(([k,v])=>r[k]===v));
};
const centered = (doc,text) => matching(doc,text)?.align==='center';
const picture = (doc,id) => {
  const all=doc.p.map((p,i)=>({p,i})).filter(({p})=>p.picture);
  if (all.length!==1 || all[0].p.picture.id!==id) return false;
  // The photo belongs directly under the first text heading; spare empty lines are harmless.
  const before=doc.p.slice(0,all[0].i).filter(p=>textOf(p).trim());
  return before.length===1 && before[0]===doc.p.find(p=>textOf(p).trim());
};
const pic = id => {const p=PICTURES.find(p=>p.id===id);return {picture:{id,width:240,height:Math.round(240*p.height/p.width),wrap:'inline'}};};
const selection = (p,text) => ({select:{from:{p,offset:0},to:{p,offset:text.length}}});
const selectTitle = text => [go('tab.home'),selection(0,text)];
const size20 = text => [...selectTitle(text),go('menu:home.font.size'),go('choice:home.font.size:20')];
const bold = text => [...selectTitle(text),go('home.font.bold')];
const center = text => [go('tab.home'),go('doc:0,0'),go('home.paragraph.alignCenter')];
const insertFlower = heading => [go(`doc:0,${heading.length}`),key('Enter'),go('tab.insert'),go('menu:insert.pictures'),go('insert.pictures.device'),go('insert.pictures.nav:downloads'),go('choice:insert.pictures.choose:flower'),go('insert.pictures.insert')];
// Reuse the taught route: heading end, Enter for a new line, then insert the photo.
const saveScript = name => [go('file'),go('bs.saveas'),go('sa.browse'),go('sa.documents'),go('sa.name'),type(name,'sa.name'),go('sa.save')];
const saved = (ctx,name) => ctx?.saved?.folder?.length===1 && ctx.saved.folder[0]==='Documents' && words(String(ctx.saved.name).replace(/\.docx$/i,''))===words(name);
const printScript = [go('file'),go('bs.print'),go('print.submit')];
const printed = ctx => ctx?.commands?.includes('file.print.copies.1');
const step = (skill,text,hint,done,demo,spotlight) => ({skill,text,hint,done,demo,...(spotlight?{spotlight}:{})});
const boldStep = text => step('t3-bold-italic-underline',T(`Make ${text} bold.`,`In đậm dòng ${text}.`),T('Select the heading. On the Home tab, click Bold (B).','Bôi đen tiêu đề. Trên thẻ Home, bấm Bold (B).'),doc=>formatted(doc,text,{b:true}),bold(text),'home.font');
const sizeStep = text => step('t3-font-size',T(`Set the ${text} heading to Font Size 20.`,`Đặt Font Size của tiêu đề ${text} thành 20.`),T('Select the heading. On the Home tab, open Font Size and click 20.','Bôi đen tiêu đề. Trên thẻ Home, mở danh sách Font Size rồi bấm 20.'),doc=>formatted(doc,text,{size:20}),size20(text),'home.font');
const centerStep = text => step('t3-align',T(`Centre the ${text} heading.`,`Canh giữa tiêu đề ${text}.`),T('Click in the heading. On the Home tab, click Center in the Paragraph group.','Bấm vào tiêu đề. Trên thẻ Home, bấm Center trong nhóm Paragraph.'),doc=>centered(doc,text),center(text),'home.paragraph');
const flowerStep = heading => step('t6-insert-picture',T('Add the Flower picture on a new line under the heading.','Chèn hình Flower vào dòng mới dưới tiêu đề.'),T('Click at the end of the heading. Press Enter. Click Insert, Pictures, then This Device. Click Downloads. Click Flower, then Insert.','Bấm vào cuối tiêu đề. Nhấn Enter. Bấm Insert, Pictures, rồi This Device. Bấm Downloads. Bấm Flower, rồi Insert.'),doc=>picture(doc,'flower'),insertFlower(heading),'insert.pictures.insert');
const saveStep = name => step('t1-save',T(`Save in Documents as ${name}. A space is fine too.`,`Lưu vào Documents với tên ${name}. Dùng dấu cách cũng được.`),T(`Click File, Save As, Browse, then Documents. Click File name and type ${name}. Click Save.`,`Bấm File, Save As, Browse, rồi Documents. Bấm ô File name và gõ ${name}. Bấm Save.`),(doc,ctx)=>saved(ctx,name),saveScript(name));
const printStep = () => step('t7-print',T('Practise printing one copy.','Thực hành in một bản.'),T('Click File, then Print. Leave Copies at 1. Click the large Print button. The game does not print paper.','Bấm File, rồi Print. Giữ số 1 trong ô Copies. Bấm nút Print lớn. Trò chơi không in ra giấy.'),(doc,ctx)=>printed(ctx),printScript);
const mission = (id,title,scenario,startDoc,targetDoc,steps,check) => ({
  id,skill:'t8-capstone',title,scenario,startDoc,targetDoc,tabs:['home','insert'],steps,
  goal:{check,progress:(doc,ctx)=>check(doc,ctx)?1:steps.filter(s=>s.done(doc,ctx)).length/steps.length},
});

export const items = [
  {
    id:'t8-plan-type-pick',skill:'t8-plan-doc',type:'pick',
    prompt:T('Your neighbours need to know about a community festival. You want to show the name, time and place in one page. Which document should you plan?', 'Hàng xóm cần biết về lễ hội cộng đồng. Bạn muốn ghi tên lễ hội, thời gian và địa điểm trên một trang. Bạn nên làm loại văn bản nào?'),
    hint:T('A flyer tells people about an event. A menu lists food and prices. A resume tells an employer about your skills.', 'Tờ rơi giới thiệu một sự kiện. Thực đơn ghi món ăn và giá. Resume cho nơi tuyển dụng biết kỹ năng của bạn.'),
    options:[option('flyer','A festival flyer','Tờ rơi giới thiệu lễ hội'),option('menu','A café menu','Thực đơn quán cà phê'),option('resume','A resume','Sơ yếu lý lịch')],answer:'flyer',
    replay:{mock:'none',script:[say('Plan for your readers: a flyer tells neighbours the event, time and place.','Nghĩ đến người đọc: tờ rơi cho hàng xóm biết sự kiện, thời gian và địa điểm.')]},
  },
  {
    id:'t8-plan-heading-pick',skill:'t8-plan-doc',type:'pick',
    prompt:T('You are planning an invitation for your computer class party. Your classmates will read it. Which heading tells them what the invitation is for?', 'Bạn đang chuẩn bị thiệp mời dự tiệc của lớp máy tính. Các bạn cùng lớp sẽ đọc thiệp. Tiêu đề nào cho biết rõ đây là thiệp mời dự sự kiện gì?'),
    hint:T('A clear heading names the event. Put the date, time and place below it.', 'Tiêu đề rõ ràng nêu tên sự kiện. Ghi ngày, giờ và địa điểm bên dưới.'),
    options:[option('party','Computer class party','Tiệc lớp máy tính'),option('hello','Hello','Lời chào'),option('file','My document','Văn bản của tôi')],answer:'party',
    replay:{mock:'word',doc:'Computer class party\nSaturday 2 pm\nCommunity hall',script:[...center('Computer class party'),say('Name the event in the heading. Put the time and place below it.','Nêu tên sự kiện ở tiêu đề. Ghi thời gian và địa điểm bên dưới.')]},
  },
];

const festivalTitle='Spring festival';
const festivalStart=createDoc('Spring festival\nSaturday 10 am\nCommunity hall\nMusic\nFood');
const festivalTarget=createDoc({p:[{align:'center',runs:[{text:festivalTitle,b:true,size:20}]},'',pic('flower'),'','Saturday 10 am','Community hall',{list:{type:'bullet',format:'•'},runs:[{text:'Music'}]},{list:{type:'bullet',format:'•'},runs:[{text:'Food'}]}]});
const festivalBody = doc => ['Saturday 10 am','Community hall','Music','Food'].every(t=>hasText(doc,t));
const festivalBullets = doc => ['Music','Food'].every(t=>matching(doc,t)?.list?.type==='bullet');
const festivalCheck = (doc,ctx) => festivalBody(doc) && formatted(doc,festivalTitle,{b:true,size:20}) && centered(doc,festivalTitle) && festivalBullets(doc) && picture(doc,'flower') && saved(ctx,'Festival_Flyer') && printed(ctx);
const festivalSteps=[
  boldStep(festivalTitle),sizeStep(festivalTitle),centerStep(festivalTitle),
  step('t4-bullets',T('Make Music and Food into a bullet list.','Thêm dấu chấm đầu dòng cho hai dòng Music và Food.'),T('Select both lines, Music and Food. On the Home tab, click Bullets in the Paragraph group.','Bôi đen cả hai dòng Music và Food. Trên thẻ Home, bấm Bullets trong nhóm Paragraph.'),festivalBullets,[go('tab.home'),{select:{from:{p:3,offset:0},to:{p:4,offset:4}}},go('home.paragraph.bullets')],'home.paragraph'),
  flowerStep(festivalTitle),saveStep('Festival_Flyer'),printStep(),
];

const menuTitle='Cafe menu';
const menuRows=[['Item','Price'],['Tea','$3'],['Coffee','$4']];
const menuTarget=createDoc({p:[{align:'center',runs:[{text:menuTitle,b:true,size:20}]},'',pic('flower'),''],tables:[{rows:menuRows.map(row=>row.map(text=>({p:[text]})))}]});
const cell = (doc,r,c) => (doc.tables?.[0]?.rows?.[r]?.[c]?.p??[]).map(textOf).join(' ');
const tableShape = doc => doc.tables?.length===1 && doc.tables[0].rows.length===3 && doc.tables[0].rows.every(row=>row.length===2);
const rowCheck = (doc,r) => menuRows[r].every((text,c)=>words(cell(doc,r,c))===words(text));
const menuCheck = (doc,ctx) => formatted(doc,menuTitle,{b:true,size:20}) && centered(doc,menuTitle) && tableShape(doc) && menuRows.every((_,r)=>rowCheck(doc,r)) && picture(doc,'flower') && saved(ctx,'Cafe_Menu') && printed(ctx);
const menuSteps=[
  boldStep(menuTitle),sizeStep(menuTitle),centerStep(menuTitle),
  step('t5-insert-table',T('Insert a table with 2 columns and 3 rows under Cafe menu.','Chèn bảng có 2 cột và 3 hàng dưới Cafe menu.'),T('Click at the end of Cafe menu. Click Insert, then Table. Choose 2x3 Table on the grid.','Bấm vào cuối dòng Cafe menu. Bấm Insert, rồi Table. Chọn 2x3 Table trên lưới ô.'),tableShape,[go('doc:0,9'),go('tab.insert'),go('menu:insert.table'),go('choice:insert.table.create:2x3')],'insert.tables'),
  ...menuRows.flatMap((row,r)=>[
    step('t5-table-type',T(`Type ${row[0]} in the left cell of row ${r+1}.`,`Gõ ${row[0]} vào ô bên trái của hàng ${r+1}.`),T(`Click the left cell in row ${r+1}. Type ${row[0]}.`,`Bấm vào ô bên trái của hàng ${r+1}. Gõ ${row[0]}.`),doc=>words(cell(doc,r,0))===words(row[0]),[go(`cell:0,${r},0,0`),type(row[0],`cell:0,${r},0,0`)]),
    step('t5-table-type',T(`Type ${row[1]} in the right cell of row ${r+1}.`,`Gõ ${row[1]} vào ô bên phải của hàng ${r+1}.`),T(`Click after ${row[0]} in the left cell. Press Tab to move right. Type ${row[1]}.`,`Bấm vào sau chữ ${row[0]} ở ô bên trái. Nhấn Tab để sang phải. Gõ ${row[1]}.`),doc=>words(cell(doc,r,1))===words(row[1]),[go(`cell:0,${r},0,${row[0].length}`),key('Tab'),type(row[1],`cell:0,${r},1,0`)]),
  ]),
  flowerStep(menuTitle),saveStep('Cafe_Menu'),printStep(),
];

const inviteTitle='Class party';
const invitationStart=templateDoc('flyer');
const invitationTarget=createDoc({p:[{align:'center',runs:[{text:inviteTitle,b:true,size:20}]},'',pic('flower'),'','Saturday 2 pm','Community hall']});
const invitationWords = doc => ['Class party','Saturday 2 pm','Community hall'].every(t=>hasText(doc,t)) && !doc.p.some(p=>/\[(Event name|Date and time|Place)\]/.test(textOf(p)));
const invitationCheck = (doc,ctx) => invitationWords(doc) && centered(doc,inviteTitle) && picture(doc,'flower') && saved(ctx,'Class_Invitation') && printed(ctx);
const inviteFields=[['[Event name]','Class party'],['[Date and time]','Saturday 2 pm'],['[Place]','Community hall']];
const invitationSteps=[
  ...inviteFields.map(([placeholder,value],p)=>step('t7-placeholder',
    T(`Replace ${placeholder} with ${value}.`,`Thay ${placeholder} bằng ${value}.`),
    T(`Click ${placeholder} once. The whole block is selected. Type ${value}.`,`Bấm một lần vào ${placeholder}. Cả phần chữ sẽ được bôi đen. Gõ ${value}.`),
    doc=>hasText(doc,value),[go(`placeholder:${p}`),type(value,`doc:${p},0`)])),
  centerStep(inviteTitle),flowerStep(inviteTitle),saveStep('Class_Invitation'),printStep(),
];
export const missions=[
  mission('t8-m-festival-flyer',T('Make a festival flyer','Làm tờ rơi lễ hội'),T('Tell your neighbours about the Spring festival. The words are ready. Make the heading big, bold and centred. Add bullets and a flower photo. Save your flyer and practise printing one copy.','Giới thiệu Spring festival với hàng xóm. Phần chữ đã có sẵn. Hãy làm tiêu đề to, đậm và canh giữa. Thêm dấu chấm đầu dòng và hình hoa. Lưu tờ rơi và thực hành in một bản.'),festivalStart,festivalTarget,festivalSteps,festivalCheck),
  mission('t8-m-cafe-menu',T('Make a café menu','Làm thực đơn quán cà phê'),T('Your café sells tea for $3 and coffee for $4. Make the heading big, bold and centred. Add a price table and a flower photo to decorate the menu. Save it and practise printing one copy.','Quán cà phê bán trà giá $3 và cà phê giá $4. Hãy làm tiêu đề to, đậm và canh giữa. Thêm bảng giá và hình hoa để trang trí thực đơn. Lưu lại và thực hành in một bản.'),'Cafe menu',menuTarget,menuSteps,menuCheck),
  mission('t8-m-class-invitation',T('Make a class party invitation','Làm thiệp mời dự tiệc của lớp'),T('The Community flyer template is open. Turn it into an invitation: Class party, Saturday 2 pm, Community hall. The template heading is already big and bold. Centre it. Add a flower photo, save it and practise printing one copy.','Mẫu Community flyer đang mở. Hãy đổi thành thiệp mời với nội dung: Class party, Saturday 2 pm, Community hall. Tiêu đề của mẫu đã to và đậm. Hãy canh giữa tiêu đề. Thêm hình hoa, lưu lại và thực hành in một bản.'),invitationStart,invitationTarget,invitationSteps,invitationCheck),
];
