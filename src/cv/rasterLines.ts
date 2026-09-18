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

export interface GridInference {
  n: number;
  confidence: number;
  isGrid: boolean;
}

export function analyzeRasterGrid(lines: CreaseLine[], size: number, preferredGrid?: number): GridInference {
  const values: number[] = [];
  for (const crease of lines) {
    if (Math.abs(crease.p1.x - crease.p2.x) < 3.5 / size && Math.abs(crease.p1.y - crease.p2.y) > 10 / size) values.push((crease.p1.x + crease.p2.x) / 2);
    if (Math.abs(crease.p1.y - crease.p2.y) < 3.5 / size && Math.abs(crease.p1.x - crease.p2.x) > 10 / size) values.push((crease.p1.y + crease.p2.y) / 2);
  }
  const unique = [...new Set(values.filter(v => v > 0.01 && v < 0.99).map(v => Math.round(v * size) / size))];
  if (unique.length < 5) {
    return { n: 32, confidence: 0, isGrid: false };
  }
  const candidateList = [8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 120, 128];
  if (preferredGrid && !candidateList.includes(preferredGrid)) {
    candidateList.push(preferredGrid);
  }
  const candidates = candidateList.map(n => {
    const avgResidual = unique.reduce((s, v) => s + Math.abs(v - Math.round(v * n) / n) * size, 0) / unique.length;
    const prefBonus = (preferredGrid === n) ? -0.2 : 0;
    return { n, avgResidual, score: avgResidual + 0.015 * n + prefBonus };
  }).sort((a, b) => a.score - b.score);

  const best = candidates[0];
  const isGrid = best.avgResidual <= 1.8 && unique.length >= 5;
  const confidence = Math.max(0, Math.min(1, 1 - best.avgResidual / 2.5));
  return { n: best.n, confidence, isGrid };
}

export function inferRasterGrid(lines: CreaseLine[], size: number, preferredGrid?: number): number {
  return analyzeRasterGrid(lines, size, preferredGrid).n;
}

/**
 * Snaps detected raster lines to the exact origami grid lattice (box-pleating constraints).
 * Eliminates wobble, tilts, small breaks, and false spurs.
 */
export function snapCreasesToOrigamiGrid(lines: CreaseLine[], N: number, size: number): CreaseLine[] {
  const snapped: CreaseLine[] = [];
  const maxTolPx = Math.min(3.8, (size / N) * 0.42);
  for (const c of lines) {
    const dx = c.p2.x - c.p1.x;
    const dy = c.p2.y - c.p1.y;
    const len = Math.hypot(dx, dy);
    if (len * size < 4.0) continue; // discard tiny noise < 4px

    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 180) % 180;

    // 1. Check if near horizontal (within 14 degrees of 0 or 180)
    if (angle < 14 || angle > 166) {
      const midY = (c.p1.y + c.p2.y) / 2;
      const gridY = Math.round(midY * N) / N;
      if (Math.abs(midY - gridY) * size <= maxTolPx) {
        const minX = Math.min(c.p1.x, c.p2.x);
        const maxX = Math.max(c.p1.x, c.p2.x);
        const gridX1 = Math.max(0, Math.min(1, Math.round(minX * N) / N));
        const gridX2 = Math.max(0, Math.min(1, Math.round(maxX * N) / N));
        if (gridX2 > gridX1) {
          snapped.push({
            ...c,
            p1: { x: gridX1, y: gridY },
            p2: { x: gridX2, y: gridY },
            equation: lineFromPoints({ x: gridX1, y: gridY }, { x: gridX2, y: gridY }),
          });
          continue;
        }
      }
    }

    // 2. Check if near vertical (within 14 degrees of 90)
    if (Math.abs(angle - 90) < 14) {
      const midX = (c.p1.x + c.p2.x) / 2;
      const gridX = Math.round(midX * N) / N;
      if (Math.abs(midX - gridX) * size <= maxTolPx) {
        const minY = Math.min(c.p1.y, c.p2.y);
        const maxY = Math.max(c.p1.y, c.p2.y);
        const gridY1 = Math.max(0, Math.min(1, Math.round(minY * N) / N));
        const gridY2 = Math.max(0, Math.min(1, Math.round(maxY * N) / N));
        if (gridY2 > gridY1) {
          snapped.push({
            ...c,
            p1: { x: gridX, y: gridY1 },
            p2: { x: gridX, y: gridY2 },
            equation: lineFromPoints({ x: gridX, y: gridY1 }, { x: gridX, y: gridY2 }),
          });
          continue;
        }
      }
    }

    // 3. Check if near diagonal 45 deg (dy/dx ~ 1)
    if (Math.abs(angle - 45) < 14) {
      const midD = (c.p1.y - c.p1.x + c.p2.y - c.p2.x) / 2;
      const gridD = Math.round(midD * N) / N;
      if (Math.abs(midD - gridD) * size <= maxTolPx) {
        const minX = Math.min(c.p1.x, c.p2.x);
        const maxX = Math.max(c.p1.x, c.p2.x);
        const gX1 = Math.max(0, Math.min(1, Math.round(minX * N) / N));
        const gX2 = Math.max(0, Math.min(1, Math.round(maxX * N) / N));
        const gY1 = gX1 + gridD;
        const gY2 = gX2 + gridD;
        if (gX2 > gX1 && gY1 >= 0 && gY1 <= 1 && gY2 >= 0 && gY2 <= 1) {
          snapped.push({
            ...c,
            p1: { x: gX1, y: gY1 },
            p2: { x: gX2, y: gY2 },
            equation: lineFromPoints({ x: gX1, y: gY1 }, { x: gX2, y: gY2 }),
          });
          continue;
        }
      }
    }

    // 4. Check if near anti-diagonal 135 deg (dy/dx ~ -1)
    if (Math.abs(angle - 135) < 14) {
      const midS = (c.p1.y + c.p1.x + c.p2.y + c.p2.x) / 2;
      const gridS = Math.round(midS * N) / N;
      if (Math.abs(midS - gridS) * size <= maxTolPx) {
        const minX = Math.min(c.p1.x, c.p2.x);
        const maxX = Math.max(c.p1.x, c.p2.x);
        const gX1 = Math.max(0, Math.min(1, Math.round(minX * N) / N));
        const gX2 = Math.max(0, Math.min(1, Math.round(maxX * N) / N));
        const gY1 = gridS - gX1;
        const gY2 = gridS - gX2;
        if (gX2 > gX1 && gY1 >= 0 && gY1 <= 1 && gY2 >= 0 && gY2 <= 1) {
          snapped.push({
            ...c,
            p1: { x: gX1, y: gY1 },
            p2: { x: gX2, y: gY2 },
            equation: lineFromPoints({ x: gX1, y: gY1 }, { x: gX2, y: gY2 }),
          });
          continue;
        }
      }
    }

    // 5. Check if rational 1:2 or 2:1 slope (angles ~26.565°, 63.435°, 116.565°, 153.435°)
    const rationalSlopes: [number, number, number][] = [
      [26.565, 0.5, 10],
      [153.435, -0.5, 10],
      [63.435, 2.0, 10],
      [116.565, -2.0, 10],
    ];
    let snappedSlope = false;
    for (const [targetAngle, m, tolDeg] of rationalSlopes) {
      if (Math.abs(angle - targetAngle) <= tolDeg) {
        const midX = (c.p1.x + c.p2.x) / 2;
        const midY = (c.p1.y + c.p2.y) / 2;
        const intercept = midY - m * midX;
        let k: number;
        let gridIntercept: number;
        if (Math.abs(m) === 0.5) {
          k = Math.round(2 * intercept * N);
          gridIntercept = k / (2 * N);
        } else {
          k = Math.round(intercept * N);
          gridIntercept = k / N;
        }
        const distPx = (Math.abs(midY - (m * midX + gridIntercept)) / Math.sqrt(1 + m * m)) * size;
        if (distPx <= maxTolPx * 1.25) {
          const minX = Math.min(c.p1.x, c.p2.x);
          const maxX = Math.max(c.p1.x, c.p2.x);
          const gX1 = Math.max(0, Math.min(1, Math.round(minX * N) / N));
          const gX2 = Math.max(0, Math.min(1, Math.round(maxX * N) / N));
          const gY1 = Math.max(0, Math.min(1, m * gX1 + gridIntercept));
          const gY2 = Math.max(0, Math.min(1, m * gX2 + gridIntercept));
          if (Math.hypot(gX2 - gX1, gY2 - gY1) * size >= 4.0) {
            snapped.push({
              ...c,
              p1: { x: gX1, y: gY1 },
              p2: { x: gX2, y: gY2 },
              equation: lineFromPoints({ x: gX1, y: gY1 }, { x: gX2, y: gY2 }),
            });
            snappedSlope = true;
            break;
          }
        }
      }
    }
    if (snappedSlope) continue;

    // Retain off-grid lines or 22.5 deg lines if they are sufficiently long (> 20px)
    if (len * size >= 20.0) {
      snapped.push(c);
    }
  }

  return mergeCollinearGridSegments(snapped, N);
}

/**
 * Merges overlapping or contiguous collinear segments on the same grid line.
 */
export function mergeCollinearGridSegments(lines: CreaseLine[], N: number): CreaseLine[] {
  const groups = new Map<string, CreaseLine[]>();
  for (const c of lines) {
    let key = '';
    if (Math.abs(c.p1.y - c.p2.y) < 1e-6) {
      key = `H_${c.type}_${c.p1.y.toFixed(5)}`;
    } else if (Math.abs(c.p1.x - c.p2.x) < 1e-6) {
      key = `V_${c.type}_${c.p1.x.toFixed(5)}`;
    } else if (Math.abs((c.p2.y - c.p1.y) - (c.p2.x - c.p1.x)) < 1e-5) {
      key = `D1_${c.type}_${(c.p1.y - c.p1.x).toFixed(5)}`;
    } else if (Math.abs((c.p2.y - c.p1.y) + (c.p2.x - c.p1.x)) < 1e-5) {
      key = `D2_${c.type}_${(c.p1.y + c.p1.x).toFixed(5)}`;
    } else {
      key = `OTHER_${c.id}`;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const merged: CreaseLine[] = [];
  for (const [key, segs] of groups) {
    if (key.startsWith('OTHER') || segs.length <= 1) {
      merged.push(...segs);
      continue;
    }
    const isV = key.startsWith('V');
    const intervals = segs.map(s => {
      const a = isV ? Math.min(s.p1.y, s.p2.y) : Math.min(s.p1.x, s.p2.x);
      const b = isV ? Math.max(s.p1.y, s.p2.y) : Math.max(s.p1.x, s.p2.x);
      return [a, b] as [number, number];
    });
    intervals.sort((a, b) => a[0] - b[0]);

    const mergedIntervals: [number, number][] = [intervals[0]];
    for (let k = 1; k < intervals.length; k++) {
      const prev = mergedIntervals[mergedIntervals.length - 1];
      const curr = intervals[k];
      if (curr[0] <= prev[1] + (1 / N + 1e-4)) {
        prev[1] = Math.max(prev[1], curr[1]);
      } else {
        mergedIntervals.push(curr);
      }
    }

    const sample = segs[0];
    for (let m = 0; m < mergedIntervals.length; m++) {
      const [start, end] = mergedIntervals[m];
      let p1: { x: number; y: number }, p2: { x: number; y: number };
      if (key.startsWith('H')) {
        p1 = { x: start, y: sample.p1.y };
        p2 = { x: end, y: sample.p1.y };
      } else if (key.startsWith('V')) {
        p1 = { x: sample.p1.x, y: start };
        p2 = { x: sample.p1.x, y: end };
      } else if (key.startsWith('D1')) {
        const d = sample.p1.y - sample.p1.x;
        p1 = { x: start, y: start + d };
        p2 = { x: end, y: end + d };
      } else {
        const s = sample.p1.y + sample.p1.x;
        p1 = { x: start, y: s - start };
        p2 = { x: end, y: s - end };
      }
      merged.push({
        ...sample,
        id: segs.length === 1 ? sample.id : `${sample.id}_m${m}`,
        p1,
        p2,
        equation: lineFromPoints(p1, p2),
      });
    }
  }

  return merged;
}
