import {BODIES,AU_KM} from './catalog';
import {BODY_IDS,type BodyId,type StateFrame} from '../types';
export type PrimaryId=Exclude<BodyId,'moon'>;
export type PrimaryTarget=`body:${PrimaryId}`;
export const PRIMARY_BODIES=BODIES.filter(b=>b.kind!=='moon');
export const primaryTarget=(id:PrimaryId):PrimaryTarget=>`body:${id}`;
export function primaryId(target:string|null):PrimaryId|null {
 const id=target?.startsWith('body:')?target.slice(5):null;
 return PRIMARY_BODIES.some(b=>b.id===id)?id as PrimaryId:null;
}
/** Relative positions and velocities use the same primary frame, never display coordinates. */
export function primaryMetrics(frame:StateFrame|null,id:PrimaryId){
 if(!frame)return null;
 const i=BODY_IDS.indexOf(id)*3,ref=id==='sun'?'太阳系质心（SSB）':'太阳中心';
 const p=[0,1,2].map(k=>frame.positions[i+k]-(id==='sun'?0:frame.positions[k]));
 const v=[0,1,2].map(k=>frame.velocities[i+k]-(id==='sun'?0:frame.velocities[k]));
 if(![...p,...v].every(Number.isFinite))return null;
 return {reference:ref,distanceAu:Math.hypot(...p)/AU_KM,speedKmS:Math.hypot(...v),heightAu:p[2]/AU_KM};
}
