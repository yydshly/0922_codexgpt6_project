import physics from '../../public/data/patroclus-system/physical.json';
import {combineStateBatches,type StateBatch} from '../ephemeris/stateProvider';
import type {StateFrame,Vec3} from '../types';
export const PATROCLUS_PHYSICS=physics;
export interface PatroclusChoices {moon:boolean;distance:boolean;selected:'patroclus'|'menoetius'}
export const defaultPatroclusChoices=():PatroclusChoices=>({moon:true,distance:false,selected:'patroclus'});
const compatible=(frame:StateFrame|null,batch:StateBatch|null)=>!!frame&&!!batch&&Math.abs(frame.time-batch.timeTdb)<1e-5&&batch.originId==='ssb'&&batch.frame==='ECLIPJ2000'&&batch.positionUnit==='km'&&batch.velocityUnit==='km/s';
export function patroclusSystemState(frame:StateFrame|null,batch:StateBatch|null){
 if(!compatible(frame,batch)||!batch!.sourceVersion.startsWith('horizons-patroclus-menoetius-'))return null;
 if(['patroclus','menoetius'].some(id=>batch!.states.filter(s=>s.id===id).length!==1))return null;
 const parent=batch!.states.find(s=>s.id==='patroclus')!,moon=batch!.states.find(s=>s.id==='menoetius')!;
 if(![...parent.position,...moon.position,...parent.velocity,...moon.velocity].every(Number.isFinite))return null;
 const relative=moon.position.map((v,i)=>v-parent.position[i]) as Vec3,velocity=moon.velocity.map((v,i)=>v-parent.velocity[i]) as Vec3;
 return {time:frame!.time,parent,moon,relative,velocity,separationKm:Math.hypot(...relative),speedKmS:Math.hypot(...velocity)};
}
export type PatroclusSystemState=ReturnType<typeof patroclusSystemState>;
/** Only the primary joins the heliocentric member list; the companion remains a child in local space. */
export function appendPatroclusPrimary(frame:StateFrame|null,base:StateBatch|null,system:StateBatch|null):StateBatch|null{
 const state=patroclusSystemState(frame,system);if(!state)return base;
 const primary={...system!,states:[state.parent]};return base?combineStateBatches(base,primary):primary;
}
export const patroclusLocal=(relative:Vec3):Vec3=>[relative[0],relative[2],-relative[1]].map(v=>v*.13/physics.radiusKm.patroclus) as Vec3;
