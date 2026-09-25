import physics from '../../public/data/eris-system/physical.json';
import {combineStateBatches,type StateBatch} from '../ephemeris/stateProvider';
import type {StateFrame,Vec3} from '../types';
export const ERIS_PHYSICS=physics;
export interface ErisChoices {moon:boolean;distance:boolean;selected:'eris'|'dysnomia'}
export const defaultErisChoices=():ErisChoices=>({moon:true,distance:false,selected:'eris'});
const compatible=(frame:StateFrame|null,batch:StateBatch|null)=>!!frame&&!!batch&&Math.abs(frame.time-batch.timeTdb)<1e-5&&batch.originId==='ssb'&&batch.frame==='ECLIPJ2000'&&batch.positionUnit==='km'&&batch.velocityUnit==='km/s';
export function erisSystemState(frame:StateFrame|null,batch:StateBatch|null){
 if(!compatible(frame,batch)||!batch!.sourceVersion.startsWith('horizons-eris-dysnomia-'))return null;
 if(['eris','dysnomia'].some(id=>batch!.states.filter(s=>s.id===id).length!==1))return null;
 const parent=batch!.states.find(s=>s.id==='eris')!,moon=batch!.states.find(s=>s.id==='dysnomia')!;
 if(![...parent.position,...moon.position,...parent.velocity,...moon.velocity].every(Number.isFinite))return null;
 const relative=moon.position.map((v,i)=>v-parent.position[i]) as Vec3,velocity=moon.velocity.map((v,i)=>v-parent.velocity[i]) as Vec3;
 return {time:frame!.time,parent,moon,relative,velocity,separationKm:Math.hypot(...relative),speedKmS:Math.hypot(...velocity)};
}
export type ErisSystemState=ReturnType<typeof erisSystemState>;
/** Retire the old barycenter-as-body marker. Missing new data must not silently revive it. */
export function replaceErisPrimary(frame:StateFrame|null,base:StateBatch|null,system:StateBatch|null):StateBatch|null{
 const remaining=base?{...base,states:base.states.filter(s=>s.id!=='eris')}:null;
 const state=erisSystemState(frame,system);
 if(!state)return remaining;
 const primary={...system!,states:[state.parent]};
 return remaining?combineStateBatches(remaining,primary):primary;
}
export const erisLocal=(relative:Vec3):Vec3=>[relative[0],relative[2],-relative[1]].map(v=>v*.13/physics.radiusKm.eris) as Vec3;
