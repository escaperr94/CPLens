import {FoldingSolutions} from './FoldingSolutions';
import React,{useEffect,useState} from 'react';
import {useAppStore} from '../store/projectStore';
import {quadraticReference,referenceFinderCoordinates,parseReferenceCoordinate} from '../geometry/referenceFinder';
import {Point2D} from '../geometry/point';
export function ReferenceFinderPanel({point}:{point:Point2D}){
 const [side,setSide]=useState(300),[message,setMessage]=useState(''),[open,setOpen]=useState(false);
 const [target,setTarget]=useState(point),[draftX,setDraftX]=useState(String(point.x)),[draftY,setDraftY]=useState(String(point.y));
 // Freeze the target during a search. Cursor motion must not reset the worker.
 useEffect(()=>{if(!open){setTarget(point);setDraftX(point.x.toFixed(6));setDraftY(point.y.toFixed(6));}},[point.x,point.y,open]);
 const rf=referenceFinderCoordinates(target),qx=quadraticReference(target.x),qy=quadraticReference(target.y);
 const button='px-2 py-1.5 border border-neutral-200 rounded hover:bg-blue-50 text-xs';
 const apply=()=>{const x=parseReferenceCoordinate(draftX),y=parseReferenceCoordinate(draftY);if(x===null||y===null){setMessage('Use coordinates in [0, 1], for example (sqrt(2)-1)/2 or 3/8.');return;}setTarget({x,y});setOpen(true);setMessage('Target fixed. Moving the canvas cursor will not change this search.');};
 return <section className="space-y-2 border-b border-neutral-200 p-3">
  <h3 className="font-semibold">Fold references · 22.5°</h3>
  <p className="text-neutral-500 text-[11px]">Origin: top-left. Enter decimals, fractions or sqrt(2). {open?'Target locked.':'Following the selected point / cursor.'}</p>
  <div className="grid grid-cols-2 gap-2">{(['x','y'] as const).map(axis=><label key={axis}>{axis.toUpperCase()} (0–1)<input aria-label={`Reference ${axis}`} className="w-full border rounded px-2 py-1 select-text" value={axis==='x'?draftX:draftY} onFocus={()=>setOpen(true)} onChange={e=>(axis==='x'?setDraftX:setDraftY)(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')apply();}}/></label>)}</div>
  <div className="flex gap-1"><button className={button} onClick={apply}>Set target</button><button className={button} onClick={()=>{setTarget(point);setDraftX(point.x.toFixed(6));setDraftY(point.y.toFixed(6));setMessage('Current point captured.');}}>Use current point</button></div>
  <label className="flex justify-between items-center">Paper side (mm)<input aria-label="Paper side in mm" className="w-20 border rounded px-2 py-1" type="number" min="1" max="10000" value={side} onChange={e=>setSide(Math.max(1,Math.min(10000,Number(e.target.value)||1)))}/></label>
  <div className="font-mono text-[11px]">Left {(target.x*side).toFixed(2)} mm · Top {(target.y*side).toFixed(2)} mm</div>
  {(qx||qy)&&<p className="text-blue-700 text-[11px]">Candidates: {qx&&`x ≈ ${qx.label}`} {qy&&`y ≈ ${qy.label}`}. Raster coordinates remain estimates.</p>}
  <div className="flex gap-1 flex-wrap">
   <button className={button} onClick={()=>useAppStore.getState().addRuler(target,'both')}>Crosshair</button>
   <button className={button} onClick={()=>{const s=useAppStore.getState();s.setDrawingMeasurementStart(target);s.setActiveTool('measure');}}>Measure from here</button>
   <button className={button} onClick={()=>{const s=useAppStore.getState();s.addPoint({...target,label:`Ref ${s.points.length+1}`,color:'#0D99FF'});setMessage('Target pinned.');}}>Pin target</button>
  </div>
  <button className={`${button} w-full text-blue-700`} onClick={()=>setOpen(!open)}>{open?'Close / follow cursor':'Open ReferenceFinder'}</button>
  {open&&<><FoldingSolutions point={target} side={side}/>
   <p className="text-[11px]">Robert J. Lang’s engine, web port by Mu-Tsun Tsai. External tool coordinates (bottom-left):</p>
   <div className="font-mono select-text">x = {rf.x.toFixed(8)} · y = {rf.y.toFixed(8)}</div>
   <button className={button} onClick={async()=>{try{await navigator.clipboard.writeText(`${rf.x.toFixed(8)}, ${rf.y.toFixed(8)}`);setMessage('Coordinates copied');}catch{setMessage('Select and copy the coordinates above');}}}>Copy coordinates</button>
   <a className="block text-blue-700 underline" href="https://mutsuntsai.github.io/reference-finder/" target="_blank" rel="noreferrer">Deeper search in ReferenceFinder ↗</a>
  </>}
  <p role="status" className="text-[11px]">{message}</p>
 </section>;
}
