import {BODIES,bodyById,AU_KM} from './catalog';
import {BODY_IDS,type StateFrame,type Vec3} from '../types';
import {macroRadius} from './macroStructure';
import {dwarfReferenceOrbit} from '../components/dwarfOrbit';
import type {PrimaryId} from './macroPrimary';
export type OrbitPlanetId=Exclude<PrimaryId,'sun'>;
export interface PlanetOrbitOptions {orbits:boolean;scales:boolean;direction:boolean}
export const ORBIT_PLANETS=BODIES.filter(b=>b.kind==='planet');
export function planetRelativeState(frame:StateFrame|null,id:OrbitPlanetId){
 if(!frame)return null;const i=BODY_IDS.indexOf(id)*3;
 const position=[0,1,2].map(k=>frame.positions[i+k]-frame.positions[k]) as Vec3;
 const velocity=[0,1,2].map(k=>frame.velocities[i+k]-frame.velocities[k]) as Vec3;
 return [...position,...velocity].every(Number.isFinite)&&Math.hypot(...position)>0?{id,position,velocity}:null;
}
/** Derivative of the radial display mapping; arrow length does not encode speed. */
export function planetDisplayDirection(position:Vec3,velocity:Vec3,heightScale:1|10=1):Vec3|null{
 const p=position.map(v=>v/AU_KM),v=velocity.map(v=>v/AU_KM),d=Math.hypot(...p);
 if(!Number.isFinite(d)||d<=0||!v.every(Number.isFinite))return null;
 const u=p.map(x=>x/d),radial=u.reduce((sum,x,i)=>sum+x*v[i],0),tangent=macroRadius(d)/d,derivative=22/(Math.log(100001)*(1+d));
 const mapped=v.map((x,i)=>x*tangent+u[i]*radial*(derivative-tangent));
 const out:Vec3=[mapped[0],mapped[2]*heightScale,-mapped[1]],length=Math.hypot(...out);
 return length>0&&Number.isFinite(length)?out.map(x=>x/length) as Vec3:null;
}
export function planetReferencePoints(frame:StateFrame|null,id:OrbitPlanetId,heightScale:1|10=1){
 const state=planetRelativeState(frame,id);if(!state)return [];
 return dwarfReferenceOrbit(state,{id:'sun',position:[0,0,0],velocity:[0,0,0]},bodyById.sun.gm+bodyById[id].gm).map(p=>{
  const d=p.length();if(d)p.multiplyScalar(macroRadius(d)/d);p.y*=heightScale;return p;
 });
}
