// Only bundled classroom images are accepted by the document model.
export const PICTURES = Object.freeze([
  {id:"flower",name:"Flower",width:600,height:420},
  {id:"laptop",name:"Laptop",width:1432,height:848},
  {id:"mouse",name:"Mouse",width:624,height:848},
  {id:"keyboard",name:"Keyboard",width:1634,height:866},
  {id:"documents",name:"Documents",width:1350,height:692},
].map(p=>Object.freeze({...p,src:`/img/pictures/${p.id}.png`})));

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
