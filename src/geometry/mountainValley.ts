import { CreaseLine } from '../store/types';
import { lineFromPoints } from './line';
import { Point2D, distance } from './point';

/** Split at true junctions; an M/V assignment belongs to an edge between vertices. */
export interface SplitCreaseOptions {
  tolerance?: number;
  gridN?: number;
  size?: number;
}

/** Split at true junctions; an M/V assignment belongs to an edge between vertices. */
export function splitCreaseJunctions(
  input: CreaseLine[],
  toleranceOrOptions: number | SplitCreaseOptions = 1e-5
): CreaseLine[] {
  const options: SplitCreaseOptions =
    typeof toleranceOrOptions === 'number'
      ? { tolerance: toleranceOrOptions }
      : (toleranceOrOptions ?? {});

  const tolerance = options.tolerance ?? 1e-5;
  const gridN = options.gridN;
  const size = options.size;

  // Extension tolerance: how far past endpoints can we extend to reach an intersection?
  const extTol = Math.max(tolerance, size ? 6.5 / size : tolerance);

  // 1. Find all pairwise intersections with extension tolerance
  interface RawJunction {
    p: Point2D;
    lines: [number, number];
  }
  const rawJunctions: RawJunction[] = [];

  for (let i = 0; i < input.length; i++) {
    for (let j = i + 1; j < input.length; j++) {
      const a = input[i], b = input[j];
      const ax = a.p2.x - a.p1.x, ay = a.p2.y - a.p1.y;
      const bx = b.p2.x - b.p1.x, by = b.p2.y - b.p1.y;
      const cross = ax * by - ay * bx;
      const al = Math.hypot(ax, ay), bl = Math.hypot(bx, by);
      if (al < 1e-8 || bl < 1e-8 || Math.abs(cross) / (al * bl) < 0.08) continue;

      const dx = b.p1.x - a.p1.x, dy = b.p1.y - a.p1.y;
      const t = (dx * by - dy * bx) / cross;
      const u = (dx * ay - dy * ax) / cross;

      if (t < -extTol / al || t > 1 + extTol / al || u < -extTol / bl || u > 1 + extTol / bl) continue;

      const px = a.p1.x + t * ax;
      const py = a.p1.y + t * ay;
      if (px < -0.01 || px > 1.01 || py < -0.01 || py > 1.01) continue;

      rawJunctions.push({ p: { x: px, y: py }, lines: [i, j] });
    }
  }

  // 2. Cluster raw junctions that are close to each other
  const clusterDist = Math.max(tolerance, size ? 3.5 / size : 1e-4);
  interface VertexCluster {
    x: number;
    y: number;
    count: number;
    lineIndices: Set<number>;
  }
  const clusters: VertexCluster[] = [];
  for (const rj of rawJunctions) {
    let found = false;
    for (const c of clusters) {
      if (Math.hypot(rj.p.x - c.x, rj.p.y - c.y) <= clusterDist) {
        c.x = (c.x * c.count + rj.p.x) / (c.count + 1);
        c.y = (c.y * c.count + rj.p.y) / (c.count + 1);
        c.count++;
        rj.lines.forEach(l => c.lineIndices.add(l));
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({
        x: rj.p.x,
        y: rj.p.y,
        count: 1,
        lineIndices: new Set(rj.lines),
      });
    }
  }

  // 3. Grid snap cluster vertices if within threshold of gridN
  if (gridN && gridN >= 8 && size) {
    const maxSnapDist = Math.min(2.5, (size / gridN) * 0.4);
    for (const c of clusters) {
      const gx = Math.round(c.x * gridN) / gridN;
      const gy = Math.round(c.y * gridN) / gridN;
      if (Math.hypot(c.x - gx, c.y - gy) * size <= maxSnapDist) {
        c.x = gx;
        c.y = gy;
      }
    }
  }

  // 4. Project cluster vertices onto incident lines to create cuts
  const cutsPerLine: { t: number; p: Point2D }[][] = input.map(c => [
    { t: 0, p: c.p1 },
    { t: 1, p: c.p2 },
  ]);

  for (const c of clusters) {
    const v = { x: c.x, y: c.y };
    for (const lineIdx of c.lineIndices) {
      const line = input[lineIdx];
      const ax = line.p2.x - line.p1.x, ay = line.p2.y - line.p1.y;
      const al2 = ax * ax + ay * ay;
      if (al2 < 1e-12) continue;
      const t = ((v.x - line.p1.x) * ax + (v.y - line.p1.y) * ay) / al2;
      const distToLine = Math.hypot(line.p1.x + t * ax - v.x, line.p1.y + t * ay - v.y);
      const maxDistToLine = size ? 3.5 / size : Math.max(tolerance, 1e-4);
      const al = Math.sqrt(al2);
      if (distToLine <= maxDistToLine && t >= -extTol / al && t <= 1 + extTol / al) {
        cutsPerLine[lineIdx].push({ t, p: v });
      }
    }
  }

  // 5. Generate split creases
  const minSegLen = size ? 3.0 / size : tolerance;
  const result: CreaseLine[] = [];

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const al = Math.hypot(c.p2.x - c.p1.x, c.p2.y - c.p1.y);
    if (al < 1e-8) continue;

    const cuts = cutsPerLine[i].sort((a, b) => a.t - b.t);
    const minT = cuts[0].t;
    const maxT = cuts[cuts.length - 1].t;
    const filteredCuts = cuts.filter(cut => {
      if (cut.t === 0 && minT < -1e-5) return false;
      if (cut.t === 1 && maxT > 1 + 1e-5) return false;
      return true;
    });

    const distinct: typeof cuts = [];
    const mergeDist = size ? 3.5 / size : Math.max(tolerance, 1e-5);
    for (const cut of filteredCuts) {
      const last = distinct[distinct.length - 1];
      if (last && Math.abs(cut.t - last.t) * al <= mergeDist) {
        if (cut.t !== 0 && cut.t !== 1) {
          distinct[distinct.length - 1] = cut;
        }
      } else {
        distinct.push(cut);
      }
    }

    distinct.slice(1).forEach((endCut, k) => {
      const startCut = distinct[k];
      if (Math.hypot(endCut.p.x - startCut.p.x, endCut.p.y - startCut.p.y) >= minSegLen) {
        result.push({
          ...c,
          id: distinct.length === 2 ? c.id : `${c.id}_s${k}`,
          p1: startCut.p,
          p2: endCut.p,
          equation: lineFromPoints(startCut.p, endCut.p),
        });
      }
    });
  }

  return result;
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
