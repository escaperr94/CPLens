import { FoldingSolutions } from './FoldingSolutions';
import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/projectStore';
import { quadraticReference, referenceFinderCoordinates } from '../geometry/referenceFinder';
import { Point2D } from '../geometry/point';

export function ReferenceFinderPanel({point}:{point:Point2D}) {
  const [side,setSide]=useState(300);
  const [message,setMessage]=useState('');
  const [open,setOpen]=useState(false);
  const [foldTarget,setFoldTarget]=useState(point);
  const [draftX,setDraftX]=useState(point.x.toFixed(5));
  const [draftY,setDraftY]=useState(point.y.toFixed(5));
  const state=useAppStore(useShallow(s=>({
    selectedPointId:s.selectedPointId,
    points:s.points,
    updatePoint:s.updatePoint,
    addPoint:s.addPoint,
    addRuler:s.addRuler,
    setDrawingMeasurementStart:s.setDrawingMeasurementStart,
    setActiveTool:s.setActiveTool,
  })));
  useEffect(()=>{
    setFoldTarget(point);
    setDraftX(point.x.toFixed(5));
    setDraftY(point.y.toFixed(5));
  },[point.x,point.y]);
  const rf=referenceFinderCoordinates(foldTarget);
  const valid=point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1;
  const qx=quadraticReference(point.x), qy=quadraticReference(point.y);
  const button='px-2 py-1.5 border border-neutral-200 rounded hover:bg-blue-50 text-xs';
  return <section className="space-y-2 border-t border-neutral-200 pt-3">
    <h3 className="font-semibold">Fold references · 22.5°</h3>
    <p className="text-neutral-500 text-[11px]">Measured from the top-left corner. Raster coordinates are estimates.</p>
    {state.selectedPointId && <div className="grid grid-cols-2 gap-2">{(['x','y'] as const).map(axis=>{const value=axis==='x'?draftX:draftY;const setValue=axis==='x'?setDraftX:setDraftY;return <label key={axis}>{axis.toUpperCase()} (0–1)<input aria-label={`Reference ${axis}`} className="w-full border rounded px-2 py-1" type="number" min="0" max="1" step="0.00001" value={value} onChange={e=>setValue(e.target.value)} onBlur={()=>{const next=Number(value);if(Number.isFinite(next)&&next>=0&&next<=1)state.updatePoint(state.selectedPointId!,{[axis]:next});else setValue(point[axis].toFixed(5));}} onKeyDown={e=>{if(e.key==='Enter') (e.currentTarget as HTMLInputElement).blur();}}/></label>})}</div>}
    <label className="flex justify-between items-center">Paper side (mm)<input aria-label="Paper side in mm" className="w-20 border rounded px-2 py-1" type="number" min="1" max="10000" value={side} onChange={e=>setSide(Math.max(1,Math.min(10000,Number(e.target.value)||1)))}/></label>
    <div className="font-mono text-[11px]">Left {(point.x*side).toFixed(2)} mm · Top {(point.y*side).toFixed(2)} mm<br/>Right {((1-point.x)*side).toFixed(2)} mm · Bottom {((1-point.y)*side).toFixed(2)} mm</div>
    {(qx||qy)&&<p className="text-blue-700 text-[11px]">22.5° candidates: {qx&&`x ≈ ${qx.label} (Δ ${qx.error.toFixed(5)})`} {qy&&`y ≈ ${qy.label} (Δ ${qy.error.toFixed(5)})`}</p>}
    <div className="flex gap-1 flex-wrap">
      <button className={button} onClick={()=>state.addRuler(point,'both')}>Crosshair</button>
      <button className={button} onClick={()=>{state.setDrawingMeasurementStart(point);state.setActiveTool('measure');}}>Measure from here</button>
      <button className={button} disabled={!!state.selectedPointId} onClick={()=>state.addPoint({...point,label:`Ref ${state.points.length+1}`,color:'#0D99FF'})}>Pin point</button>
    </div>
    <button className={`${button} w-full text-blue-700`} disabled={!valid} onClick={()=>{setFoldTarget(point);setOpen(!open);}}>{open?'Close':'Open'} ReferenceFinder</button>
    {open&&<>
      <FoldingSolutions point={foldTarget}/>
      <p className="text-[11px]">Robert J. Lang’s engine, web version by Mu-Tsun Tsai. Enter these bottom-left coordinates:</p>
      <div className="font-mono select-text">x = {rf.x.toFixed(8)}<br/>y = {rf.y.toFixed(8)}</div>
      <button className={button} onClick={async()=>{try{await navigator.clipboard.writeText(`${rf.x.toFixed(8)}, ${rf.y.toFixed(8)}`);setMessage('Coordinates copied');}catch{setMessage('Select and copy the coordinates above');}}}>Copy coordinates</button>
      <a className="block text-blue-700 underline" href="https://mutsuntsai.github.io/reference-finder/" target="_blank" rel="noreferrer">Launch ReferenceFinder ↗</a>
      <p role="status">{message}</p>
      <p className="text-[11px] text-neutral-500">The local search uses rank ≤ 4. For deeper searches, open the external tool. For √2 − 1: fold a diagonal, bisect its 45° angle with a paper edge; the bisector meets the opposite edge at this proportion.</p>
    </>}
  </section>;
}
