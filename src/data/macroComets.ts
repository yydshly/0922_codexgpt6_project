import {AU_KM} from './catalog';
import {macroEcliptic,halleyPoint} from './macroLayers';
import {heliocentricComets} from '../ephemeris/cometState';
import type {StateBatch} from '../ephemeris/stateProvider';
import type {StateFrame,Vec3} from '../types';
import type {CometId} from '../ephemeris/comets';
export interface CometDisplay {selected:CometId|null;paths:boolean;orbits:boolean;direction:boolean}
export function macroCometAnchor(frame:StateFrame|null,batch:StateBatch|null,id:CometId):Vec3|null{
 const s=heliocentricComets(frame,batch).find(s=>s.id===id);
 return s&&s.position.every(Number.isFinite)&&Math.hypot(...s.position)>0?macroEcliptic(s.position.map(v=>v/AU_KM)):null;
}
/** A unit direction, not a tail-length or activity prediction. */
export function cometAntiSolar(position:Vec3):Vec3|null{
 const d=Math.hypot(...position);return d>0&&Number.isFinite(d)?[position[0]/d,position[2]/d,-position[1]/d]:null;
}

export const COMET_DEMO_ANCHOR=macroEcliptic(halleyPoint(.35));
