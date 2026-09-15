import React,{useEffect,useRef,useState,useId} from 'react';
import {Point2D} from '../geometry/point';
import {referenceFinderCoordinates} from '../geometry/referenceFinder';
import {FoldStep,groupFoldSteps,foldInstruction} from '../geometry/foldInstructions';
type Element={type:number;from?:number[]|number;to?:number[]|number;pt?:number[];text?:string;style:number;center?:number[];radius?:number;ccw?:number};
type Solution={solution:number[];err:number;rank:number;steps:FoldStep[];diagrams:Element[][]};
export function FoldingSolutions({point,side=300}:{point:Point2D;side?:number}){
 const [solutions,setSolutions]=useState<Solution[]>([]),[status,setStatus]=useState(''),[running,setRunning]=useState(false),[rank,setRank]=useState(4);
 const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>>();const marker=useId().replace(/:/g,'');
 const stop=()=>{worker.current?.terminate();worker.current=null;clearTimeout(timer.current);setRunning(false);};
 useEffect(()=>{stop();setSolutions([]);setStatus('');return ()=>{worker.current?.terminate();clearTimeout(timer.current);};},[point.x,point.y]);
 const find=()=>{
  stop();setSolutions([]);setRunning(true);setStatus('Building fold database…');
  const w=new Worker(`${import.meta.env.BASE_URL}vendor/reference-finder/worker.js`,{type:'module'});worker.current=w;
  timer.current=setTimeout(()=>{stop();setStatus('Search timed out. Try rank 4 or the external ReferenceFinder.');},60000);
  w.onerror=()=>{stop();setStatus('Could not load fold engine. Check the local vendor files or use the external link.');};
  w.onmessage=({data})=>{
   if(worker.current!==w)return;
   if(data.solution)setSolutions(old=>[...old,{...data.solution,steps:groupFoldSteps(data.solution.steps)}]);
   if(data.progress)setStatus(`Building rank ${data.progress.rank} · ${data.progress.marks??0} reference points…`);
   if(data.done){stop();setStatus(`Search complete · rank ≤ ${rank}. Compare the error before using a solution.`);}
   if(data.error){stop();setStatus(String(data.error));}
  };
  w.postMessage({...referenceFinderCoordinates(point),rank});
 };
 return <div className="space-y-2">
  <label className="flex justify-between">Search depth<select aria-label="Search depth" value={rank} disabled={running} onChange={e=>setRank(Number(e.target.value))}><option value={4}>4 · fast</option><option value={5}>5 · deeper</option></select></label>
  <button className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50" disabled={running} onClick={find}>Find folding sequences</button>
  {running&&<button onClick={()=>{stop();setStatus('Cancelled');}} className="underline">Cancel</button>}
  <p role="status" className="text-[11px]">{status}</p>
  {solutions.map((s,i)=><details key={i} className="border rounded p-2" open={i===0}><summary className="cursor-pointer">Solution {i+1} · rank {s.rank} · Δ {(s.err*side).toFixed(3)} mm</summary>
   <p className="text-[11px] py-2">Target: ({point.x.toFixed(6)}, {point.y.toFixed(6)}). Found: ({s.solution[0].toFixed(6)}, {(1-s.solution[1]).toFixed(6)}). Pre-fold a diagonal when a step uses it as a reference.</p>
   {s.steps.map((step,j)=><div key={j} className="py-2 border-t mt-2"><p className="text-[11px]">{j+1}. {foldInstruction(step)}</p>
    <svg viewBox="-0.15 -0.15 1.3 1.3" className="w-full bg-neutral-50" aria-label={`Fold step ${j+1}`}>
     <defs><marker id={`${marker}-${i}-${j}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626"/></marker></defs>
     <rect width="1" height="1" fill="white" stroke="#737373" strokeWidth=".006"/>
     {(s.diagrams[j]||[]).map((e,k)=>{
      if(!e)return null;
      if(e.type===1&&Array.isArray(e.from)&&Array.isArray(e.to))return <line key={k} x1={e.from[0]} y1={1-e.from[1]} x2={e.to[0]} y2={1-e.to[1]} stroke={e.style===4?'#dc2626':e.style>=2?'#2563eb':'#737373'} strokeWidth={e.style>=2?'.01':'.004'} strokeDasharray={e.style===3?'.03 .02':e.style===6?'.01 .015':undefined}/>;
      if(e.type===0&&e.pt)return <circle key={k} cx={e.pt[0]} cy={1-e.pt[1]} r=".013" fill="#dc2626"/>;
      if(e.type===4&&e.pt)return <text key={k} x={e.pt[0]+.015} y={1-e.pt[1]-.015} fontSize=".06" fill="#171717">{e.text}</text>;
      if(e.type===2&&e.center&&e.radius&&typeof e.from==='number'&&typeof e.to==='number'){
       const start=e.ccw?e.from:e.to,end=e.ccw?e.to:e.from,delta=(end-start+2*Math.PI)%(2*Math.PI);
       const x1=e.center[0]+e.radius*Math.cos(start),y1=1-e.center[1]-e.radius*Math.sin(start),x2=e.center[0]+e.radius*Math.cos(end),y2=1-e.center[1]-e.radius*Math.sin(end);
       return <path key={k} d={`M ${x1} ${y1} A ${e.radius} ${e.radius} 0 ${delta>Math.PI?1:0} 0 ${x2} ${y2}`} fill="none" stroke="#dc2626" strokeWidth=".008" markerEnd={e.ccw?`url(#${marker}-${i}-${j})`:undefined} markerStart={!e.ccw?`url(#${marker}-${i}-${j})`:undefined}/>;
      }return null;
     })}
    </svg></div>)}
  </details>)}
 </div>;
}
