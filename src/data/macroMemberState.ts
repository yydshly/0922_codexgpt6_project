import {AU_KM} from './catalog';
import {macroEcliptic} from './macroLayers';
import {heliocentricComets} from '../ephemeris/cometState';
import type {StateBatch} from '../ephemeris/stateProvider';
import type {StateFrame,Vec3} from '../types';

/** The same date, origin, units and mapping are required for meshes and camera targets. */
export function macroMemberAnchor(frame:StateFrame|null,batch:StateBatch|null,id:string):Vec3|null {
 const state=heliocentricComets(frame,batch).find(s=>s.id===id);
 return state&&state.position.every(Number.isFinite)&&Math.hypot(...state.position)>0
  ? macroEcliptic(state.position.map(v=>v/AU_KM)):null;
}
