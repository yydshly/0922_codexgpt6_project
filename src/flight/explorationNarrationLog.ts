import type { ExplorationSession } from './exploration';
import { narrativeCue,type NarrativeCue } from './explorationNarrative';

export interface NarrationEntry {id:number;time:number;targetId:string;targetName:string;cue:NarrativeCue}

/** Use the displayed state, never live numbers or a browsed destination, as identity. */
function narrationKind(session:ExplorationSession,paused:boolean):string {
  const {state,pilot,status}=session;
  if(state.contact||status==='blocked'||pilot.phase==='blocked')return 'warning';
  if(paused)return status==='arrived'?'paused-arrival':status==='free'||!pilot.enabled?'paused-manual':'paused-cruise';
  if(status==='arrived')return session.tour[0]?`${session.staying?'staying':'countdown'}:${session.tour[0]}`:'arrived';
  if(status!=='free'&&pilot.enabled)return 'automatic';
  if(state.fuel<=0)return 'empty';
  if(state.mainThrust>.001)return 'manual-main';
  // Reverse thrust and braking can produce the same physical state and displayed cue.
  if(state.firing>.001&&state.rcsTranslation.length()>.001)return 'manual-translation';
  if(state.angularVelocity.length()>.003||state.rcsTorque.length()>.005)return 'manual-turn';
  return state.velocity.length()>.01?'manual-coast':'manual-idle';
}

/** A bounded, immutable history of cues actually published alongside the live flight. */
export class ExplorationNarrationLog {
  private history:readonly NarrationEntry[]=Object.freeze([]);
  private lastKey:string|null=null;
  private nextId=1;
  private removed=0;

  get entries():readonly NarrationEntry[]{return this.history;}
  get discarded():number{return this.removed;}

  capture(session:ExplorationSession,paused:boolean):void {
    const cue=narrativeCue(session,paused),destination=session.destination;
    const key=JSON.stringify([destination.id,cue.title,narrationKind(session,paused)]);
    if(key===this.lastKey)return;
    const entry:NarrationEntry=Object.freeze({
      id:this.nextId++,time:session.state.time,targetId:destination.id,targetName:destination.name,
      cue:Object.freeze({...cue}),
    });
    const history=[...this.history,entry];
    if(history.length>60){history.shift();this.removed++;}
    this.history=Object.freeze(history);
    this.lastKey=key;
  }
}
