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
