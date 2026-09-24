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
