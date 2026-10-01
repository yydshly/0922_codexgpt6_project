import type { ExplorationSession } from './exploration';
import { OBSERVATIONS } from './explorationObservation';

export interface ExplorationNote { id:string; time:number; parts:string[] }
export interface ExplorationNotebook { opened:Record<string,string[]>; notes:ExplorationNote[] }
export const createExplorationNotebook=():ExplorationNotebook=>({opened:{},notes:[]});
const atStop=(s:ExplorationSession)=>s.status==='arrived'&&!s.state.contact&&s.visits.some(v=>v.id===s.destination.id);

/** Opening a description is reading evidence, never evidence of a completed spacecraft task. */
export function openExplorationPart(book:ExplorationNotebook,s:ExplorationSession,part:string):ExplorationNotebook {
  const id=s.destination.id,profile=OBSERVATIONS[id];
  if(!atStop(s)||!profile?.parts.some(p=>p.id===part)||book.opened[id]?.includes(part))return book;
  return {...book,opened:{...book.opened,[id]:[...(book.opened[id]??[]),part]}};
}
export function canSaveExplorationNote(book:ExplorationNotebook,s:ExplorationSession){
  const id=s.destination.id,profile=OBSERVATIONS[id];
  return atStop(s)&&!!profile&&!book.notes.some(n=>n.id===id)&&profile.parts.every(p=>book.opened[id]?.includes(p.id));
}
export function saveExplorationNote(book:ExplorationNotebook,s:ExplorationSession):ExplorationNotebook {
  if(!canSaveExplorationNote(book,s))return book;
  const id=s.destination.id;
  return {...book,notes:[...book.notes,{id,time:s.state.time,parts:[...(book.opened[id]??[])]}]};
}
