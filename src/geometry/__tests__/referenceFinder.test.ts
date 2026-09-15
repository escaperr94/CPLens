import {it,expect} from 'vitest';
import {parseReferenceCoordinate} from '../referenceFinder';
import {groupFoldSteps,foldInstruction} from '../foldInstructions';
it('accepts exact fractional and quadratic references without eval',()=>{expect(parseReferenceCoordinate('(sqrt(2)-1)/2')).toBe((Math.SQRT2-1)/2);expect(parseReferenceCoordinate('1-3/8')).toBe(.625);expect(parseReferenceCoordinate('√2-1')).toBe(Math.SQRT2-1);});
it('rejects malformed, nonfinite, out-of-paper and executable expressions',()=>{for(const s of ['','1/0','1.2','-1','sqrt(-1)','window.alert(1)','2**3','1;2','sqrt(2','1abc'])expect(parseReferenceCoordinate(s)).toBeNull();});
it('matches engine diagrams by merging intermediate intersection steps',()=>{
 const steps=groupFoldSteps([{axiom:2,p0:'nw',p1:'ne',x:'A'},{axiom:0,l0:'n',l1:'A',x:'P'},{axiom:3,l0:'n',l1:'A',x:'B'},{axiom:0,l0:'w',l1:'B',x:'Q'}]);
 expect(steps).toHaveLength(3);expect(steps[0].intersection?.x).toBe('P');expect(foldInstruction(steps[0])).toContain('top-left corner');expect(foldInstruction(steps[0])).toContain('Mark P');expect(steps[2].x).toBe('Q');
});
