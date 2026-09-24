import { BODIES, AU_KM } from '../data/catalog';
import type { ObjectState } from './stateProvider';
import type { StateFrame } from '../types';
/** Both inputs are geometric ECLIPJ2000 states at the same TDB time.
 * The member is already Sun-relative; primary positions are barycentric.
 */
export function memberRelation(state:ObjectState, frame:StateFrame, primary:'earth'|'jupiter') {
 const index=BODIES.findIndex(body=>body.id===primary)*3;
 const p=[0,1,2].map(k=>frame.positions[index+k]-frame.positions[k]);
 const delta=Math.atan2(state.position[1],state.position[0])-Math.atan2(p[1],p[0]);
 const longitudeDegrees=Math.atan2(Math.sin(delta),Math.cos(delta))*180/Math.PI;
 return {distanceAu:Math.hypot(...state.position.map((v,k)=>v-p[k]))/AU_KM,longitudeDegrees};
}
