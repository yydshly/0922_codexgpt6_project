import {COMETS} from './comets';
import { AU_KM } from '../data/catalog';
import type { StateFrame } from '../types';
import type { StateBatch, ObjectState } from './stateProvider';

/** Never combine a new comet epoch with an old Sun, or with a physics frame. */
export function heliocentricComets(frame: StateFrame | null, batch: StateBatch | null): ObjectState[] {
  if (!frame || !batch || Math.abs(frame.time-batch.timeTdb)>1e-5 || batch.originId!=='ssb' ||
      batch.frame!=='ECLIPJ2000' || batch.positionUnit!=='km' || batch.velocityUnit!=='km/s') return [];
  return batch.states.map(state => ({ id:state.id,
    position: [state.position[0]-frame.positions[0],state.position[1]-frame.positions[1],state.position[2]-frame.positions[2]],
    velocity: [state.velocity[0]-frame.velocities[0],state.velocity[1]-frame.velocities[1],state.velocity[2]-frame.velocities[2]],
  }));
}
export const cometMetrics = (state: ObjectState) => ({ distanceAu:Math.hypot(...state.position)/AU_KM, speedKmS:Math.hypot(...state.velocity) });
export interface CometTracks { tracks: {id:string;points:number[][]}[] }

/** Registry-based validation prevents a new comet being rejected by a stale count. */
export function validCometTracks(value:unknown):value is CometTracks {
 if(!value||typeof value!=='object')return false;
 const data=value as {frame?:unknown;origin?:unknown;units?:unknown;tracks?:unknown};
 if(data.frame!=='ECLIPJ2000'||data.origin!=='sun'||data.units!=='km'||!Array.isArray(data.tracks)||data.tracks.length!==COMETS.length)return false;
 const ids=new Set<string>();
 for(const item of data.tracks){if(!item||typeof item!=='object')return false;const track=item as {id?:unknown;points?:unknown};
  if(typeof track.id!=='string'||!COMETS.some(c=>c.id===track.id)||ids.has(track.id)||!Array.isArray(track.points)||track.points.length<2)return false;
  ids.add(track.id);let previous=-Infinity;
  for(const point of track.points){if(!Array.isArray(point)||point.length!==4||!point.every(v=>typeof v==='number'&&Number.isFinite(v))||point[0]<=previous)return false;previous=point[0];}
 }
 return true;
}
