import React, { useEffect, useRef, useState } from 'react';
import { Point2D } from '../geometry/point';
import { referenceFinderCoordinates } from '../geometry/referenceFinder';
type Element={type:number;from?:number[];to?:number[];pt?:number[];text?:string;style:number};
type Step={axiom:number;x:string;p0?:string;p1?:string;l0?:string;l1?:string};
type Solution={err:number;rank:number;steps:Step[];diagrams:Element[][]};
function instruction(s:Step){
 const text=[`Mark ${s.x} where ${s.l0} meets ${s.l1}.`,`Fold ${s.x} through ${s.p0} and ${s.p1}.`,`Fold ${s.p0} onto ${s.p1} to make ${s.x}.`,`Fold line ${s.l0} onto ${s.l1} to make ${s.x}.`,`Fold ${s.x} through ${s.p0}, perpendicular to ${s.l0}.`,`Fold ${s.p0} onto ${s.l0}, through ${s.p1}, making ${s.x}.`,`Fold ${s.p0} onto ${s.l0} and ${s.p1} onto ${s.l1}, making ${s.x}.`,`Fold ${s.p0} onto ${s.l0}, perpendicular to ${s.l1}, making ${s.x}.`];
 return text[s.axiom]||`Construct ${s.x}.`;
}
export function FoldingSolutions({point}:{point:Point2D}){
 const [solutions,setSolutions]=useState<Solution[]>([]),[status,setStatus]=useState(''),[running,setRunning]=useState(false);
 const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>>();
 const stop=()=>{worker.current?.terminate();worker.current=null;clearTimeout(timer.current);setRunning(false);};
 useEffect(()=>{stop();setSolutions([]);setStatus('');return stop;},[point.x,point.y]);
 const find=()=>{
  stop();setSolutions([]);setRunning(true);setStatus('Building fold database…');
  const w=new Worker('/vendor/reference-finder/worker.js',{type:'module'});worker.current=w;
  timer.current=setTimeout(()=>{stop();setStatus('Search timed out. Try again or use the external ReferenceFinder.');},30000);
  w.onerror=()=>{stop();setStatus('Could not load fold engine. Use the external link below.');};
  w.onmessage=({data})=>{
   if(data.solution)setSolutions(old=>[...old,data.solution]);
   if(data.progress)setStatus(`Building rank ${data.progress.rank}…`);
   if(data.done){stop();setStatus('Search complete · rank ≤ 4');}
   if(data.error){stop();setStatus(String(data.error));}
  };
  w.postMessage(referenceFinderCoordinates(point));
 };
 return <div className="space-y-2">
  <button className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50" disabled={running} onClick={find}>Find folding sequences</button>
  {running&&<button onClick={()=>{stop();setStatus('Cancelled');}} className="underline">Cancel</button>}
  <p role="status" className="text-[11px]">{status}</p>
  {solutions.map((s,i)=><details key={i} className="border rounded p-2" open={i===0}><summary className="cursor-pointer">Solution {i+1} · rank {s.rank} · error {s.err.toFixed(6)}</summary>
   {s.steps.map((step,j)=><div key={j} className="py-2 border-t mt-2"><p className="text-[11px]">{j+1}. {instruction(step)}</p>
    <svg viewBox="-0.15 -0.15 1.3 1.3" className="w-full bg-neutral-50" aria-label={`Fold step ${j+1}`}>
     <rect x="0" y="0" width="1" height="1" fill="white" stroke="#737373" strokeWidth=".006"/>
     {(s.diagrams[j]||[]).map((e,k)=>!e?null:e.type===1&&e.from&&e.to?<line key={k} x1={e.from[0]} y1={1-e.from[1]} x2={e.to[0]} y2={1-e.to[1]} stroke={e.style>=2?'#2563eb':'#737373'} strokeWidth={e.style>=2?'.012':'.004'} strokeDasharray={e.style===3?'.03 .02':undefined}/>:e.type===0&&e.pt?<circle key={k} cx={e.pt[0]} cy={1-e.pt[1]} r=".015" fill="#dc2626"/>:e.type===4&&e.pt?<text key={k} x={e.pt[0]} y={1-e.pt[1]} fontSize=".07" fill="#171717">{e.text}</text>:null)}
    </svg></div>)}
  </details>)}
 </div>;
}
