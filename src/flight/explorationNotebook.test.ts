import { describe,it,expect } from 'vitest';
import { ExplorationSession } from './exploration';
import { OBSERVATIONS } from './explorationObservation';
import { createExplorationNotebook,openExplorationPart,saveExplorationNote,canSaveExplorationNote } from './explorationNotebook';

function stop(s:ExplorationSession,id:string){s.selectedId=id;s.status='arrived';s.visits.push({id,time:s.state.time,fuel:s.state.fuel,travel:s.distanceTravelled});}
describe('a notebook records deliberate reading, not automatic mission work',()=>{
  it('does not record a preview, a flight in progress, or an unverified arrived state',()=>{
    const s=new ExplorationSession(),book=createExplorationNotebook();s.select('satellite');
    expect(openExplorationPart(book,s,'panel')).toBe(book);
    s.status='arrived';expect(saveExplorationNote(book,s)).toBe(book);
    s.status='cruise';s.visits.push({id:'satellite',time:0,fuel:100,travel:0});
    expect(openExplorationPart(book,s,'panel')).toBe(book);
  });
  it('requires all part descriptions and explicit saving, and separates preview from the actual stop',()=>{
    const s=new ExplorationSession();stop(s,'satellite');s.select('stage');let book=createExplorationNotebook();
    expect(canSaveExplorationNote(book,s)).toBe(false);
    book=openExplorationPart(book,s,'panel');expect(book.opened.stage).toBeUndefined();
    expect(canSaveExplorationNote(book,s)).toBe(false);
    for(const p of OBSERVATIONS.satellite.parts)book=openExplorationPart(book,s,p.id);
    expect(book.opened.satellite).toHaveLength(3);expect(book.notes).toHaveLength(0);
    s.state.time=42;const saved=saveExplorationNote(book,s);
    expect(saved.notes).toEqual([{id:'satellite',time:42,parts:['panel','payload','antenna']}]);
    expect(saveExplorationNote(saved,s)).toBe(saved);expect(book.notes).toHaveLength(0);
  });
  it('does not count automatic visits as reading and permits empty virtual viewpoints after arrival',()=>{
    const s=new ExplorationSession();const book=createExplorationNotebook();
    for(const id of Object.keys(OBSERVATIONS))stop(s,id);
    expect(book.notes).toHaveLength(0);expect(canSaveExplorationNote(book,s)).toBe(true);
    const saved=saveExplorationNote(book,s);expect(saved.notes[0].id).toBe('home');expect(saved.notes[0].parts).toEqual([]);
    expect(createExplorationNotebook()).toEqual({opened:{},notes:[]});
  });
  it('blocks contact and ignores unknown parts without touching flight state',()=>{
    const s=new ExplorationSession();stop(s,'view');const book=createExplorationNotebook();
    expect(openExplorationPart(book,s,'invented')).toBe(book);
    const before=JSON.stringify(s);saveExplorationNote(book,s);expect(JSON.stringify(s)).toBe(before);
    s.state.contact='接触';expect(canSaveExplorationNote(book,s)).toBe(false);
  });
});
