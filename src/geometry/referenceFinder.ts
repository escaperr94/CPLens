import { Point2D } from './point';

/** Small, explicit 22.5-degree reference family, never an exactness assertion. */
export function quadraticReference(value: number, tolerance = 0.002) {
  const s = Math.SQRT2;
  const bases = [
    { value: s-1, label: '√2 − 1' },
    { value: 2-s, label: '2 − √2' },
    { value: s/2, label: '√2 / 2' },
    { value: 1-s/2, label: '1 − √2 / 2' },
  ];
  const candidates = bases.flatMap(b => [1,2,4,8].map(d => ({value:b.value/d,label:d===1?b.label:`(${b.label}) / ${d}`,error:Math.abs(value-b.value/d)})));
  const best=candidates.sort((a,b)=>a.error-b.error)[0];
  return best.error<=tolerance?best:null;
}
export function referenceFinderCoordinates(p: Point2D) {
  // CP Lens origin: top left. ReferenceFinder: bottom left.
  return { x: p.x, y: 1-p.y };
}

/** Small arithmetic parser for reference coordinates; never executes JavaScript. */
export function parseReferenceCoordinate(expression:string):number|null {
 const text=expression.replace(/√2/g,'sqrt(2)').replace(/\s+/g,'');
 if(text.length>120)return null;
 const tokens=text.match(/sqrt|\d+(?:\.\d*)?|\.\d+|[()+*/-]/g)||[];
 if(tokens.join('')!==text)return null;
 let index=0;
 const primary=():number=>{
  const t=tokens[index++];
  if(t==='+'||t==='-')return (t==='-'?-1:1)*primary();
  if(t==='sqrt'){if(tokens[index++]!=='(')throw Error();const n=add();if(tokens[index++]!==')')throw Error();return Math.sqrt(n);}
  if(t==='('){const n=add();if(tokens[index++]!==')')throw Error();return n;}
  if(!t||!/^\d|^\./.test(t))throw Error();return Number(t);
 };
 const multiply=():number=>{let n=primary();while(tokens[index]==='*'||tokens[index]==='/'){const op=tokens[index++],r=primary();n=op==='*'?n*r:n/r;}return n;};
 const add=():number=>{let n=multiply();while(tokens[index]==='+'||tokens[index]==='-'){const op=tokens[index++],r=multiply();n=op==='+'?n+r:n-r;}return n;};
 try{const value=add();return index===tokens.length&&Number.isFinite(value)&&value>=0&&value<=1?value:null;}catch{return null;}
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export interface ProportionCandidate {
  label: string;
  error: number;
  value: number;
  type: 'rational' | 'quadratic';
}

/** Finds the best rational fraction or quadratic origami proportion candidate. */
export function findOrigamiProportionCandidate(
  value: number,
  tolerance = 0.003
): ProportionCandidate | null {
  const quad = quadraticReference(value, tolerance);

  // Check common origami rational fractions up to denominator 16
  const denominators = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16];
  let bestRational: ProportionCandidate | null = null;
  for (const d of denominators) {
    const n = Math.round(value * d);
    if (n >= 0 && n <= d) {
      const v = n / d;
      const err = Math.abs(value - v);
      if (err <= tolerance) {
        const g = gcd(n, d) || 1;
        const reducedN = n / g;
        const reducedD = d / g;
        const label = reducedD === 1 ? `${reducedN}` : `${reducedN}/${reducedD}`;
        if (!bestRational || err < bestRational.error) {
          bestRational = { label, error: err, value: v, type: 'rational' };
        }
      }
    }
  }

  if (quad && bestRational) {
    if (bestRational.error <= 0.0001) {
      return bestRational;
    }
    if (quad.error < bestRational.error * 0.5) {
      return { label: quad.label, error: quad.error, value: quad.value, type: 'quadratic' };
    }
    return bestRational;
  }
  if (bestRational) return bestRational;
  if (quad) return { label: quad.label, error: quad.error, value: quad.value, type: 'quadratic' };
  return null;
}

