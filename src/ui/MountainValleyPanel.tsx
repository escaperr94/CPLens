import React,{useState} from 'react';
import {useAppStore} from '../store/projectStore';
import {inferMountainValley,splitCreaseJunctions} from '../geometry/mountainValley';
export function MountainValleyPanel(){
 const [message,setMessage]=useState('');
 const unknown=useAppStore(s=>s.creases.filter(c=>c.type==='unknown').length);
 return <section className="border rounded-lg p-3 space-y-2"><h3 className="font-semibold">Mountain / valley assistant</h3>
 <p className="text-[11px] text-neutral-500">{unknown} unassigned edges. Select a crease and mark a known mountain or valley, then propagate. Black ink alone cannot determine the fold direction.</p>
 <button className="rounded bg-blue-50 text-blue-700 px-2 py-2 w-full" onClick={()=>{
  const state=useAppStore.getState();const split=splitCreaseJunctions(state.creases.map(c=>c.assignmentSource==='inferred'?{...c,type:'unknown' as const,assignmentSource:undefined}:c));
  const result=inferMountainValley(split);
  if(!result.conflicts){state.pushHistory();useAppStore.setState({creases:result.creases,selectedCreaseId:null});}
  setMessage(`${result.inferred} inferred · ${result.unresolved} unresolved · ${result.conflicts} conflicts · ${result.invalidVertices} incomplete/non-flat vertices. ${result.conflicts?'No changes applied. Check assigned signs and junctions.':'Review inferred signs before folding. Local constraints do not prove the whole model folds flat.'}`);
 }}>Propagate known folds</button><button className="underline text-[11px]" onClick={()=>{const s=useAppStore.getState();if(!s.creases.some(c=>c.assignmentSource==='inferred'))return;s.pushHistory();useAppStore.setState({creases:s.creases.map(c=>c.assignmentSource==='inferred'?{...c,type:'unknown',assignmentSource:undefined}:c)});setMessage('Inferred signs cleared. Manual signs retained.');}}>Clear inferred signs</button><p role="status" className="text-[11px]">{message}</p></section>;
}
