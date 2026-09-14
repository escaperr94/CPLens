import { it, expect } from 'vitest';
import { extractRasterLines } from '../../cv/rasterLines';
import { findSnapTarget, DEFAULT_SNAP_OPTIONS } from '../snapping';
import { DEFAULT_GRID_CONFIG } from '../grid';
import { quadraticReference, referenceFinderCoordinates } from '../referenceFinder';
const size=257;
function raster(segments:number[][]){
 const data=new Uint8ClampedArray(size*size*4).fill(255);
 for(const [x1,y1,x2,y2] of segments){
  const n=Math.ceil(Math.hypot(x2-x1,y2-y1)*4);
  for(let i=0;i<=n;i++){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);const k=(y*size+x)*4;data[k]=230;data[k+1]=30;data[k+2]=30;}
 }
 return extractRasterLines(data,size,size,{x0:0,y0:0,width:256,height:256});
}
it('retains an off-grid short crease and does not bridge a blank gap',async()=>{
 const lines=(await raster([[30,73,90,73],[110,73,190,73]])).filter(c=>Math.abs(c.p1.y-c.p2.y)<1e-5);
 expect(lines.length).toBe(2);
 expect(lines[0].p1.y*256).toBeCloseTo(73,0);
 expect(lines.some(c=>c.p1.x*256<95 && c.p2.x*256>105)).toBe(false);
});
it('joins a small raster break on one straight centerline',async()=>{
 const lines=(await raster([[20,81,104,81],[112,81,236,81]])).filter(c=>Math.abs(c.p1.y-c.p2.y)<1e-5);
 expect(lines.some(c=>Math.min(c.p1.x,c.p2.x)*256<24 && Math.max(c.p1.x,c.p2.x)*256>232)).toBe(true);
});
it('detects a 22.5 degree crease with irrational endpoint',async()=>{
 const lines=await raster([[20,40,220,40+200*Math.tan(Math.PI/8)]]);
 const match=lines.find(c=>Math.hypot(c.p2.x-c.p1.x,c.p2.y-c.p1.y)>.7);
 expect(match).toBeDefined();
 expect(Math.atan2(match!.p2.y-match!.p1.y,match!.p2.x-match!.p1.x)*180/Math.PI).toBeCloseTo(22.5,0);
});
it('snap radius uses screen pixels, not unit-square coordinates',()=>{
 const scene={referencePoints:[{id:'p',x:.5,y:.5}],intersections:[],creases:[],gridConfig:DEFAULT_GRID_CONFIG};
 const options={...DEFAULT_SNAP_OPTIONS,enabledTargets:{points:true,intersections:false,grid:false,creases:false,paperBounds:false,symmetry:false}};
 expect(findSnapTarget({x:.7,y:.5},scene,options)).toBeNull();
 expect(findSnapTarget({x:.505,y:.5},scene,options)?.sourceId).toBe('p');
});
it('provides bounded quadratic candidates and converts ReferenceFinder origin',()=>{
 expect(quadraticReference(Math.SQRT2-1)?.error).toBe(0);
 expect(quadraticReference(.33333)).toBeNull();
 expect(referenceFinderCoordinates({x:.25,y:.75})).toEqual({x:.25,y:.25});
});
