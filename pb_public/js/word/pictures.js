// Only bundled classroom images are accepted by the document model. The first five are the learner's
// own photos (files in Downloads in Insert › Pictures › This Device); content depends on their ids.
// The rest are local flat illustrations shown by Stock Images and Online Pictures (no internet in class).
// `tags` are the search words that find a picture in those two dialogs.
const DEVICE = [
  {id:"flower",name:"Flower",width:600,height:420,tags:["flower","garden","plant","nature"]},
  {id:"laptop",name:"Laptop",width:1432,height:848,tags:["laptop","computer","office","technology"]},
  {id:"mouse",name:"Mouse",width:624,height:848,tags:["mouse","computer","office","technology"]},
  {id:"keyboard",name:"Keyboard",width:1634,height:866,tags:["keyboard","computer","office","technology"]},
  {id:"documents",name:"Documents",width:1350,height:692,tags:["document","paper","office","school"]},
].map(p=>({...p,src:`/img/pictures/${p.id}.png`,file:`${p.id}.png`,device:true}));

const LIBRARY = [
  {id:"cat",name:"Cat",width:640,height:480,tags:["cat","kitten","animal","pet"]},
  {id:"kitten",name:"Kitten",width:480,height:480,tags:["cat","kitten","animal","pet"]},
  {id:"cat-black",name:"Black cat",width:640,height:427,tags:["cat","animal","pet","dark"]},
  {id:"dog",name:"Dog",width:640,height:480,tags:["dog","puppy","animal","pet"]},
  {id:"bird",name:"Bird",width:480,height:600,tags:["bird","animal","nature"]},
  {id:"fish",name:"Fish",width:640,height:427,tags:["fish","animal","sea","pet"]},
  {id:"apple",name:"Apple",width:480,height:480,tags:["apple","fruit","food"]},
  {id:"cake",name:"Birthday cake",width:640,height:480,tags:["cake","birthday","food","party","celebration"]},
  {id:"coffee",name:"Coffee",width:480,height:480,tags:["coffee","cup","drink","food","indoors"]},
  {id:"balloons",name:"Balloons",width:480,height:600,tags:["balloon","party","birthday","celebration"]},
  {id:"beach",name:"Beach",width:640,height:427,tags:["beach","sea","summer","holiday","travel"]},
  {id:"house",name:"House",width:640,height:480,tags:["house","home","building"]},
  {id:"tulips",name:"Tulips",width:480,height:600,tags:["flower","tulip","garden","plant","nature","spring"]},
  {id:"sunflower",name:"Sunflower",width:480,height:600,tags:["flower","sunflower","garden","plant","nature","summer"]},
  {id:"car",name:"Car",width:640,height:427,tags:["car","road","travel","transport"]},
  {id:"airplane",name:"Airplane",width:640,height:427,tags:["airplane","plane","sky","travel","holiday","transport"]},
  {id:"books",name:"Books",width:640,height:480,tags:["book","school","reading","indoors"]},
].map(p=>({...p,src:`/img/pictures/${p.id}.svg`,device:false}));

export const PICTURES = Object.freeze([...DEVICE,...LIBRARY].map(p=>Object.freeze({...p,tags:Object.freeze(p.tags)})));

/** The learner's photo files (Insert Picture › Downloads). */
export const DEVICE_PICTURES = Object.freeze(PICTURES.filter(p=>p.device));
/** The illustrations Stock Images shows. */
export const LIBRARY_PICTURES = Object.freeze(PICTURES.filter(p=>!p.device));
/** What a search with no match shows in Online Pictures. */
const DEFAULT_RESULTS = ["tulips","cat","beach","apple","house","balloons"];

// "Cats" finds "cat", "Flowers" finds "flower"; anything else is matched as typed.
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g," ");
const stem = (w) => (w.length>3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0,-1) : w);

/** Pictures whose name or a tag matches `term` (every word must match). `pool` defaults to all pictures. */
export function matchPictures(term,pool=PICTURES) {
  const words=norm(term).split(" ").filter(Boolean).map(stem);
  if (!words.length) return [];
  return pool.filter(p=>words.every(w=>p.tags.some(t=>t===w||t.startsWith(w))||norm(p.name).split(" ").some(n=>stem(n)===w)));
}
/** Online Pictures results: the matches, or a small default set when nothing matches. */
export function onlineResults(term) {
  const hits=matchPictures(term);
  return hits.length ? hits : DEFAULT_RESULTS.map(id=>PICTURES.find(p=>p.id===id));
}

/** Online Pictures category tiles (as in the classroom screenshot): label, the picture on the tile, and the search it runs. */
export const ONLINE_CATEGORIES = Object.freeze([
  ["Airplane","airplane"],["Animals","dog","animal"],["Apple","apple"],["Balloons","balloons"],["Beach","beach"],["Birds","bird"],["Birthday Cake","cake","cake"],["Books","books"],
  ["Car","car"],["Cats","cat"],["Celebration","balloons"],["Coffee","coffee"],["Computer","laptop"],["Dog","dog"],["Fish","fish"],["Flower","flower"],
  ["Flowers","tulips"],["Food","apple"],["Garden","sunflower"],["House","house"],["Office","keyboard"],["Pets","kitten"],["Summer","beach"],["Travel","airplane"],
].map(([label,picture,term])=>Object.freeze({label,picture,term:term??label})));

/** Stock Images category chips (labels from the classroom screenshot) and the pictures each one shows. */
export const STOCK_CHIPS = Object.freeze([
  ["Dark",["cat-black","books","coffee"]],["Cooperation",["books","laptop","documents"]],["Indoors",["coffee","books","kitten","laptop"]],
  ["Tranquility",["beach","tulips","sunflower"]],["Growth",["sunflower","tulips","flower"]],["Standing",["bird","house"]],["Paper",["documents","books"]],
  ["Success",["balloons","cake"]],["Communication",["laptop","keyboard","mouse"]],["Furniture",["house","books"]],
].map(([label,ids])=>Object.freeze({label,ids:Object.freeze(ids)})));
/** What Stock Images shows before a chip or a search narrows it. */
export const STOCK_DEFAULT = Object.freeze(["cat","beach","coffee","tulips","house","balloons","dog","apple","airplane","books","sunflower","cake","bird","fish","car","kitten","cat-black"]);

export function pictureSize(picture,handle,dx,dy) {
  let width=picture.width, height=picture.height;
  if (handle.includes("e")) width+=dx;
  if (handle.includes("w")) width-=dx;
  if (handle.includes("s")) height+=dy;
  if (handle.includes("n")) height-=dy;
  if (handle.length===2) {
    const scale=Math.abs(width-picture.width)/picture.width >= Math.abs(height-picture.height)/picture.height ? width/picture.width : height/picture.height;
    const bounded=Math.max(24/Math.min(picture.width,picture.height),Math.min(600/Math.max(picture.width,picture.height),scale));
    return {width:Math.round(picture.width*bounded),height:Math.round(picture.height*bounded)};
  }
  return {width:Math.round(Math.max(24,Math.min(600,width))),height:Math.round(Math.max(24,Math.min(600,height)))};
}
