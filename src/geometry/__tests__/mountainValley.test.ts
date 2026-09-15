import {describe,it,expect} from 'vitest';
import {inferMountainValley,splitCreaseJunctions} from '../mountainValley';
import {CreaseLine} from '../../store/types';
const vertex=(types:CreaseLine['type'][]):CreaseLine[]=>types.map((type,i)=>({id:String(i),p1:{x:.5,y:.5},p2:{x:.5+.5*Math.cos(i*Math.PI/2),y:.5+.5*Math.sin(i*Math.PI/2)},type,confirmed:false}));
describe('M/V propagation',()=>{
 it('does not invent directions for an unseeded black CP',()=>{const r=inferMountainValley(vertex(['unknown','unknown','unknown','unknown']));expect(r.inferred).toBe(0);expect(r.unresolved).toBe(4);});
 it('infers the fourth direction from three mountain seeds',()=>{const r=inferMountainValley(vertex(['mountain','mountain','mountain','unknown']));expect(r.creases[3].type).toBe('valley');expect(r.inferred).toBe(1);});
 it('reports conflicting seeds without modifying anything',()=>{const input=vertex(['mountain','mountain','valley','valley']);const r=inferMountainValley(input);expect(r.conflicts).toBe(1);expect(r.creases).toEqual(input);});
 it('skips vertices that fail Kawasaki',()=>{const input=vertex(['mountain','mountain','mountain','unknown']);input[1].p2={x:.7,y:.9};const r=inferMountainValley(input);expect(r.inferred).toBe(0);expect(r.invalidVertices).toBeGreaterThanOrEqual(1);});
 it('splits crossings so M/V can differ on either side',()=>{const input:CreaseLine[]=[{id:'h',p1:{x:0,y:.5},p2:{x:1,y:.5},type:'unknown',confirmed:false},{id:'v',p1:{x:.5,y:0},p2:{x:.5,y:1},type:'unknown',confirmed:false}];const split=splitCreaseJunctions(input);expect(split).toHaveLength(4);expect(new Set(split.map(c=>c.id)).size).toBe(4);expect(split.every(c=>[c.p1,c.p2].some(p=>p.x===.5&&p.y===.5))).toBe(true);expect(splitCreaseJunctions(split)).toEqual(split);});
 it('does not infer an interior rule on paper boundary vertices',()=>{const input=vertex(['mountain','mountain','mountain','unknown']).map(c=>({...c,p1:{x:0,y:.5}}));expect(inferMountainValley(input).inferred).toBe(0);});
});
