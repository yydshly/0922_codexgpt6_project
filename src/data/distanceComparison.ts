import {AU_KM, BODIES, bodyById} from './catalog';
import {BODY_IDS, type BodyId, type StateFrame} from '../types';
import {macroRadius} from './macroStructure';

/** Geometry only: same epoch, same origin and axes, before rendering transforms. */
export function centerDistance(frame:StateFrame|null, left:BodyId, right:BodyId):number|null {
 if(!frame||!Number.isFinite(frame.time)||left===right)return null;
 const a=BODY_IDS.indexOf(left)*3,b=BODY_IDS.indexOf(right)*3;
 const delta=[0,1,2].map(k=>frame.positions[b+k]-frame.positions[a+k]);
 if(!delta.every(Number.isFinite))return null;
 const distance=Math.hypot(...delta);
 return Number.isFinite(distance)&&distance>0?distance:null;
}
export function distancePair(frame:StateFrame|null,left:BodyId,right:BodyId){
 const km=centerDistance(frame,left,right);if(km===null)return null;
 const bodies=[bodyById[left],bodyById[right]] as const;
 // All dimensions share this factor. Never introduce a minimum rendered radius.
 const scale=Math.min(720/(km+bodies[0].radiusKm+bodies[1].radiusKm),90/(2*Math.max(...bodies.map(b=>b.radiusKm))));
 const radii=bodies.map(b=>b.radiusKm*scale);
 const start=(800-(km*scale+radii[0]+radii[1]))/2+radii[0];
 return {bodies,km,au:km/AU_KM,diameters:km/(2*bodies[0].radiusKm),radii,x:[start,start+km*scale]};
}
export function solarDistanceRows(frame:StateFrame|null){
 const planets=BODIES.filter(b=>b.kind==='planet');
 const distances=planets.map(b=>centerDistance(frame,'sun',b.id));
 if(distances.some(d=>d===null))return null;
 const maxKm=Math.max(...distances as number[]),maxAu=maxKm/AU_KM;
 return {maxAu,rows:planets.map((body,i)=>{
  const au=distances[i]!/AU_KM;
  return {body,au,linear:au/maxAu,compressed:macroRadius(au)/macroRadius(maxAu)};
 })};
}
