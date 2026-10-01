import { MathUtils, Quaternion, Vector3 } from 'three';

// Teaching limits, not specifications for a real spacecraft.
export const ATTITUDE_RATE = MathUtils.degToRad(8);
export const ATTITUDE_ACCELERATION = MathUtils.degToRad(4);
export const ATTITUDE_FUEL_RATE = .012;

/** Shortest pointing rotation, without an aircraft bank or successive Euler-axis turns. */
export function pointingInput(attitude:Quaternion,direction:Vector3) {
  const local=direction.clone().normalize().applyQuaternion(attitude.clone().invert());
  const angle=Math.acos(MathUtils.clamp(-local.z,-1,1));
  const axis=new Vector3(local.y,-local.x,0);
  if(axis.lengthSq()<1e-12)axis.set(0,1,0);else axis.normalize();
  const rate=Math.min(ATTITUDE_RATE,angle*1.4,Math.sqrt(2*ATTITUDE_ACCELERATION*angle)*.7);
  axis.multiplyScalar(rate/ATTITUDE_RATE);
  return {pitch:axis.x,yaw:axis.y,roll:0};
}

export function attitudeActivity(angularVelocity:Vector3,torque:Vector3) {
  if(torque.length()<.005)return angularVelocity.length()>.001?'匀速转姿':'姿态保持';
  return torque.dot(angularVelocity)<-1e-6?'反向喷气 · 制止转动':'成对喷气 · 建立转动';
}
