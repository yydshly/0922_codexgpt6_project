import type {StateFrame,Vec3} from '../types';
import type {StateBatch} from '../ephemeris/stateProvider';
import {AU_KM} from './catalog';
import {dynamicDwarfById} from './dwarfs';
import {macroEcliptic} from './macroLayers';
import {PLUTO_GM,CHARON_GM} from '../components/dwarfOrbit';
export const BINARY_SCALE=.13/dynamicDwarfById.pluto.radiusKm;
const subtract=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const binaryLocal=(v:Vec3):Vec3=>[v[0]*BINARY_SCALE,v[2]*BINARY_SCALE,-v[1]*BINARY_SCALE];
/** Approximate two-body barycenter, not the full Pluto-system barycenter. Scientific input stays untouched. */
export function macroBinaryState(frame:StateFrame|null,batch:StateBatch|null){
 if(!frame||!batch||Math.abs(frame.time-batch.timeTdb)>1e-5||batch.originId!=='ssb'||batch.frame!=='ECLIPJ2000'||batch.positionUnit!=='km'||batch.velocityUnit!=='km/s')return null;
 const pluto=batch.states.find(s=>s.id==='pluto'),charon=batch.states.find(s=>s.id==='charon');
 if(!pluto||!charon||![...pluto.position,...charon.position,...pluto.velocity,...charon.velocity].every(Number.isFinite))return null;
 const total=PLUTO_GM+CHARON_GM;
 const center=pluto.position.map((v,i)=>(v*PLUTO_GM+charon.position[i]*CHARON_GM)/total) as Vec3;
 const relative=subtract(charon.position,pluto.position),velocity=subtract(charon.velocity,pluto.velocity),separation=Math.hypot(...relative);
 if(!separation)return null;
 return {time:frame.time,pluto,charon,relative,velocity,separation,speed:Math.hypot(...velocity),
  center,anchor:macroEcliptic(center.map((v,i)=>(v-frame.positions[i])/AU_KM)),
  plutoLocal:binaryLocal(subtract(pluto.position,center)),charonLocal:binaryLocal(subtract(charon.position,center)),
  centerFromPluto:separation*CHARON_GM/total};
}
export type MacroBinaryState=ReturnType<typeof macroBinaryState>;
