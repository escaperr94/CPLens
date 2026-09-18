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
        const clampedT = Math.max(0, Math.min(1, t));
        const projPt = {
          x: line.p1.x + clampedT * ax,
          y: line.p1.y + clampedT * ay,
        };
        cutsPerLine[lineIdx].push({ t: clampedT, p: projPt });
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
  return weldCreaseJunctions(result, options);
}

/**
 * Unifies endpoints and junctions of crease lines so every meeting stroke shares
 * the exact same vertex point with zero gaps.
 */
export function weldCreaseJunctions(
  input: CreaseLine[],
  options: SplitCreaseOptions = {}
): CreaseLine[] {
  if (input.length <= 1) return input;
  const size = options.size;
  const gridN = options.gridN;
  const tolerance = options.tolerance ?? (size ? 3.5 / size : 0.005);
  const weldRadius = Math.max(1e-4, size ? 4.5 / size : tolerance);
  const boundaryDist = Math.max(1e-4, size ? 6.0 / size : 0.006);

  // 1. Boundary snapping for endpoints near borders
  let lines: CreaseLine[] = input.map((c) => {
    const p1 = { ...c.p1 };
    const p2 = { ...c.p2 };

    if (p1.x <= boundaryDist) p1.x = 0;
    else if (p1.x >= 1 - boundaryDist) p1.x = 1;
    if (p1.y <= boundaryDist) p1.y = 0;
    else if (p1.y >= 1 - boundaryDist) p1.y = 1;

    if (p2.x <= boundaryDist) p2.x = 0;
    else if (p2.x >= 1 - boundaryDist) p2.x = 1;
    if (p2.y <= boundaryDist) p2.y = 0;
    else if (p2.y >= 1 - boundaryDist) p2.y = 1;

    return { ...c, p1, p2, equation: lineFromPoints(p1, p2) };
  });

  // 2. T-junction projection: project endpoints that terminate close to another line onto it
  const snapToLineDist = Math.max(1e-4, size ? 4.5 / size : tolerance);
  const tJunctions: { lineIdx: number; t: number; pt: Point2D }[] = [];

  for (let i = 0; i < lines.length; i++) {
    for (const endpoint of [lines[i].p1, lines[i].p2]) {
      for (let j = 0; j < lines.length; j++) {
        if (i === j) continue;
        const target = lines[j];
        const tx = target.p2.x - target.p1.x;
        const ty = target.p2.y - target.p1.y;
        const len2 = tx * tx + ty * ty;
        if (len2 < 1e-8) continue;

        const t = ((endpoint.x - target.p1.x) * tx + (endpoint.y - target.p1.y) * ty) / len2;
        if (t > 0.01 && t < 0.99) {
          const projX = target.p1.x + t * tx;
          const projY = target.p1.y + t * ty;
          const d = Math.hypot(endpoint.x - projX, endpoint.y - projY);
          if (d <= snapToLineDist && d > 1e-7) {
            endpoint.x = projX;
            endpoint.y = projY;
            tJunctions.push({ lineIdx: j, t, pt: { x: projX, y: projY } });
          }
        }
      }
    }
  }

  if (tJunctions.length > 0) {
    const splitsByLine = new Map<number, { t: number; pt: Point2D }[]>();
    for (const tj of tJunctions) {
      if (!splitsByLine.has(tj.lineIdx)) splitsByLine.set(tj.lineIdx, []);
      splitsByLine.get(tj.lineIdx)!.push({ t: tj.t, pt: tj.pt });
    }

    const nextLines: CreaseLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      const splits = splitsByLine.get(i);
      if (!splits || splits.length === 0) {
        nextLines.push(lines[i]);
        continue;
      }
      splits.sort((a, b) => a.t - b.t);
      const pts = [lines[i].p1];
      for (const sp of splits) {
        const last = pts[pts.length - 1];
        if (Math.hypot(sp.pt.x - last.x, sp.pt.y - last.y) > 0.003) {
          pts.push(sp.pt);
        }
      }
      pts.push(lines[i].p2);

      for (let k = 0; k < pts.length - 1; k++) {
        if (Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y) > 0.002) {
          nextLines.push({
            ...lines[i],
            id: k === 0 && pts.length === 2 ? lines[i].id : `${lines[i].id}_tj${k}`,
            p1: pts[k],
            p2: pts[k + 1],
            equation: lineFromPoints(pts[k], pts[k + 1]),
          });
        }
      }
    }
    lines = nextLines;
  }

  // 3. Endpoint clustering & welding
  interface EndpointRef {
    pt: Point2D;
    lineIdx: number;
    which: 'p1' | 'p2';
  }
  const allEndpoints: EndpointRef[] = [];
  lines.forEach((l, idx) => {
    allEndpoints.push({ pt: l.p1, lineIdx: idx, which: 'p1' });
    allEndpoints.push({ pt: l.p2, lineIdx: idx, which: 'p2' });
  });

  interface VertexCluster {
    x: number;
    y: number;
    count: number;
    refs: EndpointRef[];
  }
  const clusters: VertexCluster[] = [];

  for (const ep of allEndpoints) {
    let bestCluster: VertexCluster | null = null;
    let minDist = weldRadius;

    for (const cl of clusters) {
      const d = Math.hypot(ep.pt.x - cl.x, ep.pt.y - cl.y);
      if (d <= minDist) {
        minDist = d;
        bestCluster = cl;
      }
    }

    if (bestCluster) {
      bestCluster.x = (bestCluster.x * bestCluster.count + ep.pt.x) / (bestCluster.count + 1);
      bestCluster.y = (bestCluster.y * bestCluster.count + ep.pt.y) / (bestCluster.count + 1);
      bestCluster.count++;
      bestCluster.refs.push(ep);
    } else {
      clusters.push({
        x: ep.pt.x,
        y: ep.pt.y,
        count: 1,
        refs: [ep],
      });
    }
  }

  // Snap clusters to gridN if present
  if (gridN && gridN >= 8 && size) {
    const maxGridSnap = Math.min(0.4 / gridN, 2.5 / size);
    for (const cl of clusters) {
      const gx = Math.round(cl.x * gridN) / gridN;
      const gy = Math.round(cl.y * gridN) / gridN;
      if (Math.hypot(cl.x - gx, cl.y - gy) <= maxGridSnap) {
        cl.x = gx;
        cl.y = gy;
      }
    }
  }

  // Boundary snap clusters
  for (const cl of clusters) {
    if (cl.x <= boundaryDist) cl.x = 0;
    else if (cl.x >= 1 - boundaryDist) cl.x = 1;
    if (cl.y <= boundaryDist) cl.y = 0;
    else if (cl.y >= 1 - boundaryDist) cl.y = 1;
  }

  // 4. Reassign welded vertices back to all incident line endpoints
  for (const cl of clusters) {
    const unifiedPoint: Point2D = {
      x: Number(cl.x.toFixed(6)),
      y: Number(cl.y.toFixed(6)),
    };
    for (const r of cl.refs) {
      const line = lines[r.lineIdx];
      const lx = line.p2.x - line.p1.x;
      const ly = line.p2.y - line.p1.y;
      const len2 = lx * lx + ly * ly;
      let targetPt = unifiedPoint;
      if (len2 > 1e-8) {
        const isH = Math.abs(ly) < 1e-4;
        const isV = Math.abs(lx) < 1e-4;
        const isD1 = Math.abs(ly - lx) < 1e-4;
        const isD2 = Math.abs(ly + lx) < 1e-4;
        if (isH) {
          targetPt = { x: unifiedPoint.x, y: line.p1.y };
        } else if (isV) {
          targetPt = { x: line.p1.x, y: unifiedPoint.y };
        } else if (isD1) {
          const d = line.p1.y - line.p1.x;
          targetPt = { x: (unifiedPoint.x + unifiedPoint.y - d) / 2, y: (unifiedPoint.x + unifiedPoint.y + d) / 2 };
        } else if (isD2) {
          const s = line.p1.y + line.p1.x;
          targetPt = { x: (unifiedPoint.x - unifiedPoint.y + s) / 2, y: (unifiedPoint.y - unifiedPoint.x + s) / 2 };
        }
      }
      if (r.which === 'p1') {
        lines[r.lineIdx].p1 = targetPt;
      } else {
        lines[r.lineIdx].p2 = targetPt;
      }
    }
  }

  // 5. Remove degenerate zero-length segments and duplicate parallel segments
  const validLines: CreaseLine[] = [];
  const seen = new Set<string>();

  for (const l of lines) {
    const d = Math.hypot(l.p2.x - l.p1.x, l.p2.y - l.p1.y);
    if (d < 0.002) continue; // skip degenerate stubs < 2px

    const k1 = `${l.p1.x.toFixed(4)},${l.p1.y.toFixed(4)}`;
    const k2 = `${l.p2.x.toFixed(4)},${l.p2.y.toFixed(4)}`;
    const key = k1 < k2 ? `${l.type}_${k1}->${k2}` : `${l.type}_${k2}->${k1}`;

    if (!seen.has(key)) {
      seen.add(key);
      validLines.push({
        ...l,
        equation: lineFromPoints(l.p1, l.p2),
      });
    }
  }

  return validLines;
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
