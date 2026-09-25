import physics from '../../public/data/pluto-moons/physical.json';
import type {StateBatch} from '../ephemeris/stateProvider';
import {binaryLocal,type MacroBinaryState} from './macroBinary';
import type {Vec3} from '../types';
export const PLUTO_MOON_IDS=['styx','nix','kerberos','hydra'] as const;
export type PlutoMoonId=typeof PLUTO_MOON_IDS[number];
export type PlutoSystemId='pluto'|'charon'|PlutoMoonId;
export const PLUTO_MOONS=physics.records;
export const isPlutoSmallMoon=(id:string|null):id is PlutoMoonId=>PLUTO_MOON_IDS.some(m=>m===id);
/** A common current epoch and SSB origin are mandatory before subtracting the display centre. */
export function plutoMoonStates(binary:MacroBinaryState,batch:StateBatch|null){
 if(!binary||!batch||Math.abs(binary.time-batch.timeTdb)>1e-5||batch.originId!=='ssb'||batch.frame!=='ECLIPJ2000'||batch.positionUnit!=='km'||batch.velocityUnit!=='km/s')return [];
 if(PLUTO_MOON_IDS.some(id=>batch.states.filter(s=>s.id===id).length!==1))return [];
 return PLUTO_MOONS.flatMap(body=>{
  const state=batch.states.find(s=>s.id===body.id)!;
  if(![...state.position,...state.velocity].every(Number.isFinite))return [];
  const relative=state.position.map((v,i)=>v-binary.pluto.position[i]) as Vec3,velocity=state.velocity.map((v,i)=>v-binary.pluto.velocity[i]) as Vec3;
  const fromCenter=state.position.map((v,i)=>v-binary.center[i]) as Vec3;
  return [{...body,id:body.id as PlutoMoonId,state,local:binaryLocal(fromCenter),distanceKm:Math.hypot(...relative),speedKmS:Math.hypot(...velocity),relative,centerDistanceKm:Math.hypot(...fromCenter)}];
 });
}
export type PlutoMoonState=ReturnType<typeof plutoMoonStates>[number];
