import { Vector3 } from 'three';

export interface ReactionJet {id:string;position:[number,number,number];exhaust:[number,number,number];torque:[number,number,number];translation:[number,number,number]}
// Symmetric pairs around the teaching model's reference centre. Force is opposite exhaust.
export const REACTION_JETS:ReactionJet[]=[];
for(const end of [-1,1])for(const side of [-1,1]){
  REACTION_JETS.push({id:`yaw-${end}-${side}`,position:[side*2.4,0,end*2],exhaust:[side,0,0],torque:[0,-end*side,0],translation:[-side,0,0]});
  REACTION_JETS.push({id:`pitch-${end}-${side}`,position:[0,side*2.4,end*2],exhaust:[0,side,0],torque:[end*side,0,0],translation:[0,-side,0]});
}

/** Separate capsule jets: balanced couples around its own centre, retained after jettison.
 * The axial pairs generate pitch/yaw; tangential pairs generate roll. No net translation. */
export const CAPSULE_REACTION_JETS:ReactionJet[]=[];
for(const side of [-1,1])for(const exhaust of [-1,1]){
  CAPSULE_REACTION_JETS.push({id:`capsule-pitch-${side}-${exhaust}`,position:[0,side*2.4,-2.6],exhaust:[0,0,exhaust],torque:[-side*exhaust,0,0],translation:[0,0,0]});
  CAPSULE_REACTION_JETS.push({id:`capsule-yaw-${side}-${exhaust}`,position:[side*2.4,0,-2.6],exhaust:[0,0,exhaust],torque:[0,side*exhaust,0],translation:[0,0,0]});
  CAPSULE_REACTION_JETS.push({id:`capsule-roll-${side}-${exhaust}`,position:[side*2.4,0,-2.6],exhaust:[0,exhaust,0],torque:[0,0,-side*exhaust],translation:[0,0,0]});
}
for(const side of [-1,1])for(const exhaust of [-1,1]){
  REACTION_JETS.push({id:`roll-${side}-${exhaust}`,position:[side*2.45,0,-.9],exhaust:[0,exhaust,0],torque:[0,0,-side*exhaust],translation:[0,0,0]});
  REACTION_JETS.push({id:`axial-${side}-${exhaust}`,position:[side*2.4,0,exhaust*2],exhaust:[0,0,exhaust],torque:[0,0,0],translation:[0,0,-exhaust]});
}

/** Display allocation for ideal balanced pairs. Per-valve flow and minimum impulse bits are not modelled. */
export function reactionJetStrength(jet:ReactionJet,torque:Vector3,translation:Vector3) {
  return Math.max(0,new Vector3(...jet.torque).dot(torque))+Math.max(0,new Vector3(...jet.translation).dot(translation));
}
