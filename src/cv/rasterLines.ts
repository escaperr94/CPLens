import { CreaseLine } from '../store/types';
import { lineFromPoints } from '../geometry/line';

type Region = { x0: number; y0: number; width: number; height: number };
type Run = { x1:number;y1:number;x2:number;y2:number;length:number;type:number;confidence:number;score:number };

/** Hough proposals followed by continuous pixel support and exclusive ink ownership.
 * Work in image pixels, not a guessed lattice. Black ink carries no M/V information.
 */
export function extractRasterLines(data: Uint8ClampedArray, width: number, height: number, region: Region): CreaseLine[] {
  const mask = new Uint8Array(width * height);
  const groups: {x:number;y:number}[][] = [[],[],[],[]];
  for(let y=Math.max(0,Math.ceil(region.y0));y<=Math.min(height-1,region.y0+region.height);y++) {
    for(let x=Math.max(0,Math.ceil(region.x0));x<=Math.min(width-1,region.x0+region.width);x++) {
      const i=(y*width+x)*4, r=data[i],g=data[i+1],b=data[i+2];
      if(data[i+3]<128) continue;
      const type=r-Math.max(g,b)>18&&r+g+b<570?1:b-Math.max(r,g)>18&&r+g+b<570?2:Math.max(r,g,b)-Math.min(r,g,b)<35&&r+g+b<660?3:0;
      if(type){mask[y*width+x]=type;groups[type].push({x:x-region.x0,y:y-region.y0});}
    }
  }
  // On a colored diagram, neutral ink is usually border/text. On monochrome
  // drawings it is the source geometry and must never be randomly colorized.
  const colored=groups[1].length+groups[2].length;
  const types=colored>Math.max(30,groups[3].length*.1)?[1,2]:[3];
  const size=Math.max(region.width,region.height), radius=Math.ceil(Math.hypot(region.width,region.height))+3;
  const minLength=Math.max(5,size/160), candidates:Run[]=[];
  const at=(x:number,y:number,type:number)=>{
    const px=Math.round(x+region.x0),py=Math.round(y+region.y0);
    return px>=0&&px<width&&py>=0&&py<height&&mask[py*width+px]===type;
  };
  const hasInk=(x:number,y:number)=>{
    const px=Math.round(x+region.x0),py=Math.round(y+region.y0);
    if(px<0||px>=width||py<0||py>=height)return false;
    if(mask[py*width+px]!==0)return true;
    const k=(py*width+px)*4;
    return(data[k]+data[k+1]+data[k+2])<680;
  };
  // 1-degree proposals plus exact common origami slopes. Accepted runs are
  // fitted to their own ink, so arbitrary angles do not become 22.5° stairs.
  const angles=[...Array.from({length:180},(_,i)=>i*Math.PI/180),...Array.from({length:8},(_,i)=>i*Math.PI/8),...[-3,-2,-.5,-1/3,1/3,.5,2,3].map(s=>(Math.atan(s)+Math.PI)%Math.PI)];
  for(const type of types) for(const angle of angles){
    const ux=Math.cos(angle),uy=Math.sin(angle),nx=-uy,ny=ux;
    const votes=new Uint32Array(radius*2+1);
    for(const p of groups[type]) votes[Math.round(p.x*nx+p.y*ny)+radius]++;
    for(let peak=1;peak<votes.length-1;peak++){
      if(votes[peak]<minLength*.8||votes[peak]<votes[peak-1]||votes[peak]<=votes[peak+1])continue;
      const rho=((peak-1-radius)*votes[peak-1]+(peak-radius)*votes[peak]+(peak+1-radius)*votes[peak+1])/(votes[peak-1]+votes[peak]+votes[peak+1]);
      let start=NaN,last=NaN,hits=0,ink=0,blankGap=0;
      const flush=()=>{
        const length=last-start,confidence=hits/(length+1);
        if(!Number.isFinite(start)||length<minLength||confidence<.88)return;
        candidates.push({x1:nx*rho+ux*start,y1:ny*rho+uy*start,x2:nx*rho+ux*last,y2:ny*rho+uy*last,length,type,confidence,score:length*(ink/(length+1))**3});
      };
      // Clip the infinite proposal before sampling; no scan through empty space.
      let lo=-radius,hi=radius;
      for(const [base,delta,limit] of [[nx*rho,ux,region.width],[ny*rho,uy,region.height]]){
        if(Math.abs(delta)<1e-9){if(base<0||base>limit){hi=lo-1;break;}}
        else {const a=-base/delta,b=(limit-base)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
      }
      for(let t=Math.ceil(lo);t<=Math.floor(hi);t++){
        const x=nx*rho+ux*t,y=ny*rho+uy*t;
        const off=type===3?.35:.65;
        const hit=at(x,y,type)||at(x+nx*off,y+ny*off,type)||at(x-nx*off,y-ny*off,type);
        if(hit){if(!Number.isFinite(start))start=t;last=t;hits++;blankGap=0;
          const px=Math.round(region.x0+x),py=Math.round(region.y0+y),k=(py*width+px)*4;
          ink+=Math.max(0,1-(data[k]+data[k+1]+data[k+2])/765);
        }
        else if(Number.isFinite(start)){
          const crossing = type!==3 && (hasInk(x,y)||hasInk(x+nx*off,y+ny*off)||hasInk(x-nx*off,y-ny*off));
          if(crossing){
            if(t-last>14){flush();start=NaN;hits=0;ink=0;blankGap=0;}
          }else{
            blankGap++;
            if(blankGap>(type===3?2:8)||t-last>14){flush();start=NaN;hits=0;ink=0;blankGap=0;}
          }
        }
      }
      flush();
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  const claimed=new Uint8Array(width*height), lines:CreaseLine[]=[];
  for(const run of candidates){
    const ux=(run.x2-run.x1)/run.length,uy=(run.y2-run.y1)/run.length;
    const footprint=new Set<number>();let fresh=0,hits=0;
    const points:{x:number;y:number}[]=[];
    for(let t=0;t<=run.length;t++){
      const x=run.x1+ux*t,y=run.y1+uy*t;
      let hit=false,unused=false;
      for(let off=-1;off<=1;off++){
        const px=Math.round(region.x0+x-uy*off),py=Math.round(region.y0+y+ux*off);
        if(px<0||px>=width||py<0||py>=height)continue;
        const k=py*width+px;
        if(mask[k]!==run.type)continue;
        hit=true;unused ||= !claimed[k];
        if(!footprint.has(k)){footprint.add(k);points.push({x:px-region.x0,y:py-region.y0});}
      }
      if(hit)hits++;if(unused)fresh++;
    }
    // Long lines own crossing ink first. Short spurs from junctions have very
    // little independent support and are discarded instead of being exported.
    if(fresh/Math.max(1,hits)<.5||fresh<minLength*.5)continue;
    let cx=0,cy=0;for(const p of points){cx+=p.x;cy+=p.y;}cx/=points.length;cy/=points.length;
    let xx=0,yy=0,xy=0;for(const p of points){const x=p.x-cx,y=p.y-cy;xx+=x*x;yy+=y*y;xy+=x*y;}
    const theta=.5*Math.atan2(2*xy,xx-yy),fx=Math.cos(theta),fy=Math.sin(theta);
    let lo=Infinity,hi=-Infinity;for(const p of points){const t=(p.x-cx)*fx+(p.y-cy)*fy;lo=Math.min(lo,t);hi=Math.max(hi,t);}
    const p1={x:Math.max(0,Math.min(1,(cx+lo*fx)/region.width)),y:Math.max(0,Math.min(1,(cy+lo*fy)/region.height))};
    const p2={x:Math.max(0,Math.min(1,(cx+hi*fx)/region.width)),y:Math.max(0,Math.min(1,(cy+hi*fy)/region.height))};
    for(const k of footprint){const px=k%width,py=Math.floor(k/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=px+dx,y=py+dy;if(x>=0&&x<width&&y>=0&&y<height)claimed[y*width+x]=1;}}
    const boundary=run.type===3&&((p1.x<.004&&p2.x<.004)||(p1.x>.996&&p2.x>.996)||(p1.y<.004&&p2.y<.004)||(p1.y>.996&&p2.y>.996));
    lines.push({id:`raster_${lines.length+1}`,p1,p2,type:boundary?'edge':run.type===1?'mountain':run.type===2?'valley':'unknown',confirmed:false,confidence:run.confidence,equation:lineFromPoints(p1,p2)});
  }
  return lines;
}

export function inferRasterGrid(lines: CreaseLine[], size: number): number {
  const values: number[] = [];
  for (const crease of lines) {
    if (Math.abs(crease.p1.x - crease.p2.x) < 2 / size && Math.abs(crease.p1.y - crease.p2.y) > 10 / size) values.push((crease.p1.x + crease.p2.x) / 2);
    if (Math.abs(crease.p1.y - crease.p2.y) < 2 / size && Math.abs(crease.p1.x - crease.p2.x) > 10 / size) values.push((crease.p1.y + crease.p2.y) / 2);
  }
  const unique = [...new Set(values.filter(v=>v>.01&&v<.99).map(v=>Math.round(v*size)/size))];
  return [8,12,16,20,24,32,40,48,64,96,128].map(n=>({n,score:unique.length?unique.reduce((s,v)=>s+Math.min(5,Math.abs(v-Math.round(v*n)/n)*size),0)/unique.length+.015*n:n})).sort((a,b)=>a.score-b.score)[0].n;
}
