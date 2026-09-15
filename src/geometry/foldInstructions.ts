export type FoldStep={axiom:number;x:string;p0?:string|number[];p1?:string;l0?:string;l1?:string;intersection?:FoldStep};
export function groupFoldSteps(steps:FoldStep[]):FoldStep[]{
 const result:FoldStep[]=[];
 steps.forEach((step,i)=>{
  if(step.axiom>0||i===steps.length-1||!result.length)result.push({...step});
  else result[result.length-1].intersection={...step};
 });
 return result;
}
const names:Record<string,string>={n:'top edge',s:'bottom edge',w:'left edge',e:'right edge',nw:'top-left corner',ne:'top-right corner',sw:'bottom-left corner',se:'bottom-right corner',sw_ne:'bottom-left / top-right diagonal',nw_se:'top-left / bottom-right diagonal'};
const name=(v?:string|number[])=>typeof v==='string'?(names[v]||v):Array.isArray(v)?`(${v.map(n=>n.toFixed(4)).join(', ')})`:'reference';
export function foldInstruction(s:FoldStep):string{
 const p0=name(s.p0),p1=name(s.p1),l0=name(s.l0),l1=name(s.l1);
 const texts=[`Mark ${s.x} where ${l0} meets ${l1}.`,`Fold ${s.x} through ${p0} and ${p1}.`,`Fold ${p0} onto ${p1} to make ${s.x}.`,`Fold ${l0} onto ${l1} to make ${s.x}.`,`Fold ${s.x} through ${p0}, perpendicular to ${l0}.`,`Fold ${p0} onto ${l0}, through ${p1}, making ${s.x}.`,`Fold ${p0} onto ${l0} and ${p1} onto ${l1}, making ${s.x}.`,`Fold ${p0} onto ${l0}, perpendicular to ${l1}, making ${s.x}.`];
 return (texts[s.axiom]||`Construct ${s.x}.`)+(s.intersection?` ${foldInstruction(s.intersection)}`:'');
}
