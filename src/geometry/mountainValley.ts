import { CreaseLine } from '../store/types';
import { lineFromPoints } from './line';
import { Point2D, distance } from './point';

/** Split at true junctions; an M/V assignment belongs to an edge between vertices. */
export function splitCreaseJunctions(input:CreaseLine[], tolerance=1e-5):CreaseLine[]{
  const cuts=input.map(c=>[{t:0,p:c.p1},{t:1,p:c.p2}]);
  for(let i=0;i<input.length;i++)for(let j=i+1;j<input.length;j++){
    const a=input[i],b=input[j],ax=a.p2.x-a.p1.x,ay=a.p2.y-a.p1.y,bx=b.p2.x-b.p1.x,by=b.p2.y-b.p1.y;
    const cross=ax*by-ay*bx,al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
    if(al<1e-8||bl<1e-8||Math.abs(cross)/(al*bl)<.08)continue;
    const dx=b.p1.x-a.p1.x,dy=b.p1.y-a.p1.y,t=(dx*by-dy*bx)/cross,u=(dx*ay-dy*ax)/cross;
    if(t < -tolerance/al||t>1+tolerance/al||u < -tolerance/bl||u>1+tolerance/bl)continue;
    const p={x:a.p1.x+t*ax,y:a.p1.y+t*ay};
    if(p.x<0||p.x>1||p.y<0||p.y>1)continue;
    cuts[i].push({t,p});cuts[j].push({t:u,p});
  }
  return input.flatMap((c,i)=>{
    const length=distance(c.p1,c.p2);if(length<1e-8)return [];
    const ordered=cuts[i].sort((a,b)=>a.t-b.t),distinct:typeof ordered=[];
    for(const cut of ordered){const last=distinct[distinct.length-1];if(last&&Math.abs(cut.t-last.t)*length<=tolerance){
      // Prefer the intersection over an isolated raster endpoint.
      if(cut.t!==0&&cut.t!==1)distinct[distinct.length-1]=cut;
    }else distinct.push(cut);}
    return distinct.slice(1).map((end,k)=>({...c,id:distinct.length===2?c.id:`${c.id}_s${k}`,p1:distinct[k].p,p2:end.p,equation:lineFromPoints(distinct[k].p,end.p)}));
  });
}

export type MVResult={creases:CreaseLine[];inferred:number;unresolved:number;conflicts:number;invalidVertices:number;checkedVertices:number};
/** Conservative constraint propagation, NOT a global flat-foldability certificate.
 * Consensus only: never pick one arbitrary assignment from several solutions.
 */
export function inferMountainValley(input:CreaseLine[],tolerance=1e-4):MVResult{
  const creases=input.map(c=>({...c}));
  const vertices:{p:Point2D;rays:{edge:number;angle:number}[]}[]=[];
  creases.forEach((c,edge)=>{
    if(c.type==='edge'||c.type==='auxiliary')return;
    for(const [p,q] of [[c.p1,c.p2],[c.p2,c.p1]]){
      let v=vertices.find(v=>distance(v.p,p)<=tolerance);
      if(!v){v={p,rays:[]};vertices.push(v);}
      v.rays.push({edge,angle:(Math.atan2(q.y-p.y,q.x-p.x)+2*Math.PI)%(2*Math.PI)});
    }
  });
  let invalidVertices=0;const constraints:{edges:number[];assignments:number[]}[]=[];
  for(const v of vertices){
    if(Math.min(v.p.x,v.p.y,1-v.p.x,1-v.p.y)<=tolerance)continue;
    v.rays.sort((a,b)=>a.angle-b.angle);const n=v.rays.length;
    if(n<4||n%2||n>12){invalidVertices++;continue;}
    const sectors=v.rays.map((r,i)=>(v.rays[(i+1)%n].angle-r.angle+2*Math.PI)%(2*Math.PI));
    const alternating=sectors.reduce((s,a,i)=>s+(i%2===0?a:0),0);
    if(Math.abs(alternating-Math.PI)>.035||Math.min(...sectors)<.015){invalidVertices++;continue;}
    const assignments:number[]=[];
    for(let bits=0;bits<2**n;bits++){
      let m=0;for(let i=0;i<n;i++)m+=(bits>>i)&1;
      if(Math.abs(2*m-n)!==2)continue;
      // Strict local minimum sector => its bounding creases have opposite signs.
      if(sectors.some((a,i)=>a+.015<sectors[(i+n-1)%n]&&a+.015<sectors[(i+1)%n]&&((bits>>i)&1)===((bits>>((i+1)%n))&1)))continue;
      assignments.push(bits);
    }
    constraints.push({edges:v.rays.map(r=>r.edge),assignments});
  }
  let changed=true,conflicts=0;
  while(changed){changed=false;conflicts=0;
    for(const c of constraints){
      c.assignments=c.assignments.filter(bits=>c.edges.every((e,i)=>creases[e].type==='unknown'||((bits>>i)&1)===(creases[e].type==='mountain'?1:0)));
      if(!c.assignments.length){conflicts++;continue;}
      c.edges.forEach((e,i)=>{
        if(creases[e].type!=='unknown')return;
        const sign=(c.assignments[0]>>i)&1;
        if(c.assignments.every(bits=>((bits>>i)&1)===sign)){creases[e]={...creases[e],type:sign?'mountain':'valley',confirmed:false,assignmentSource:'inferred'};changed=true;}
      });
    }
  }
  // Inconsistent seeds/geometry invalidate the proposal; preserve the user's work.
  const result=conflicts?input:creases;
  return {creases:result,inferred:result.filter((c,i)=>input[i].type==='unknown'&&c.type!=='unknown').length,unresolved:result.filter(c=>c.type==='unknown').length,conflicts,invalidVertices,checkedVertices:constraints.length};
}
