import {it,expect,vi,afterEach} from 'vitest';
import {runCPAnalysisPipeline} from '../client';
class FakeWorker{
 static instances:FakeWorker[]=[];onmessage:any;onerror:any;terminate=vi.fn();postMessage=vi.fn();
 constructor(){FakeWorker.instances.push(this);}
}
const canvas={width:1,height:1,getContext:()=>({getImageData:()=>({data:new Uint8ClampedArray([255,255,255,255])})})} as unknown as HTMLCanvasElement;
afterEach(()=>{vi.unstubAllGlobals();FakeWorker.instances=[];});
it('terminates a superseded image worker and ignores late results',async()=>{
 vi.stubGlobal('Worker',FakeWorker);const abort=new AbortController();const p=runCPAnalysisPipeline(canvas,undefined,abort.signal);const assertion=expect(p).rejects.toMatchObject({name:'AbortError'});abort.abort();await assertion;expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
 const next=runCPAnalysisPipeline(canvas);FakeWorker.instances[0].onmessage({data:{result:{old:true}}});FakeWorker.instances[1].onmessage({data:{result:{current:true}}});await expect(next).resolves.toEqual({current:true});
});
it('does not start an already cancelled job',async()=>{vi.stubGlobal('Worker',FakeWorker);const abort=new AbortController();abort.abort();await expect(runCPAnalysisPipeline(canvas,undefined,abort.signal)).rejects.toMatchObject({name:'AbortError'});expect(FakeWorker.instances).toHaveLength(0);});
