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
