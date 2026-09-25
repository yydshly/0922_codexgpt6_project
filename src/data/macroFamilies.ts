import {localDisplayDistance} from './localDisplayScale';
import {bodyById} from './catalog';
import {BODY_IDS,type StateFrame,type Vec3} from '../types';
import type {OverviewSatelliteState} from '../hooks/useOverviewSatellites';
import type {SatelliteBodyState} from '../components/SatelliteSystem';
export const MACRO_FAMILIES=['earth','mars','jupiter','saturn','uranus','neptune'] as const;
export type MacroFamilyId=typeof MACRO_FAMILIES[number];
export type MacroMoon=SatelliteBodyState&{parentId:MacroFamilyId;sourceUrl:string;orbitalPeriodDays:number};
export const isMacroFamily=(id:string|null):id is MacroFamilyId=>MACRO_FAMILIES.some(p=>p===id);
export const familyPlanetRadius=(id:MacroFamilyId)=>(id==='earth'||id==='mars') ? .09 : .13;
export const familyMoonRadius=(radiusKm:number,parentId:MacroFamilyId)=>familyPlanetRadius(parentId)*radiusKm/bodyById[parentId].radiusKm;
/** Same monotone radial display map as the dedicated satellite view, in macro drawing units. */
export function familyLocalPosition(position:Vec3,parentId:MacroFamilyId):Vec3{
 const d=Math.hypot(...position);if(!d)return [0,0,0];
 const r=familyPlanetRadius(parentId)*localDisplayDistance(d/bodyById[parentId].radiusKm);
 return [position[0]/d*r,position[2]/d*r,-position[1]/d*r];
}
export function macroMoonStates(frame:StateFrame|null,states:readonly OverviewSatelliteState[]):MacroMoon[]{
 if(!frame)return [];
 const earth=BODY_IDS.indexOf('earth')*3,moon=BODY_IDS.indexOf('moon')*3;
 const relative=(values:Float64Array):Vec3=>[values[moon]-values[earth],values[moon+1]-values[earth+1],values[moon+2]-values[earth+2]];
 const m=bodyById.moon;
 return [{id:'moon',parentId:'earth',name:m.name,radiusKm:m.radiusKm,position:relative(frame.positions),velocity:relative(frame.velocities),gm:m.gm,color:m.color,appearance:'rock',sourceUrl:m.sourceUrl,orbitalPeriodDays:m.orbitalPeriodDays},...states.filter(s=>isMacroFamily(s.parentId)).map(s=>({...s,parentId:s.parentId as MacroFamilyId}))];
}
