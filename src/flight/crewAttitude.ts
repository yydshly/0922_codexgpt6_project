import {Quaternion,Vector3} from 'three';

export const CREW_ATTITUDE=Object.freeze({
  carrier:{inertiaKgM2:500000,maxRateRadS:.12,maxAccelerationRadS2:.06,maxTorqueNm:30000},
  service:{inertiaKgM2:18000,maxRateRadS:.12,maxAccelerationRadS2:.06,maxTorqueNm:1080,leverM:2.4,ispS:310},
  capsule:{inertiaKgM2:9000,maxRateRadS:.06,maxAccelerationRadS2:.06,maxTorqueNm:180,leverM:2.4,ispS:70},
});
type Rig=typeof CREW_ATTITUDE[keyof typeof CREW_ATTITUDE];

/** A teaching rigid body with effective scalar inertia. The controller supplies torque;
 * quaternion and body angular velocity are integrated, never replaced by the target pose.
 * Nose tracking uses the shortest correction from the current pose, preserving roll. */
export function advanceCrewAttitude(q:Quaternion,omega:Vector3,direction:Vector3,dt:number,rig:Rig,
  fuelKg:number,passiveSpringNm=0,manualRate?:Vector3,activeAuthority=1){
  const nose=new Vector3(0,0,-1),target=direction.clone().applyQuaternion(q.clone().invert()).normalize();
  const error=new Quaternion().setFromUnitVectors(nose,target),axis=new Vector3(error.x,error.y,error.z);
  const angle=2*Math.atan2(axis.length(),Math.max(0,error.w));if(axis.lengthSq()>1e-14)axis.normalize();else axis.set(0,0,0);
  const demand=manualRate?.clone()??axis.clone().multiplyScalar(Math.min(rig.maxRateRadS,angle*1.5,Math.sqrt(2*rig.maxAccelerationRadS2*angle)));
  const requested=demand.sub(omega).multiplyScalar(rig.inertiaKgM2/dt);
  // Atmospheric stability / canopy suspension are damped restoring moments, not thrust.
  const passive=passiveSpringNm>0?axis.clone().multiplyScalar(passiveSpringNm*angle)
    .addScaledVector(omega,-2*Math.sqrt(passiveSpringNm*rig.inertiaKgM2))
    .clampLength(0,rig.inertiaKgM2*rig.maxAccelerationRadS2):new Vector3();
  const active=requested.clone().sub(passive).clampLength(0,rig.maxTorqueNm*Math.max(0,Math.min(1,activeAuthority)));
  // In a stable aerodynamic / suspended attitude, jets stand by instead of fighting
  // the passive damping every fixed step. They assist again for a >5° error.
  if(!manualRate&&passiveSpringNm>100&&angle<Math.PI/36)active.set(0,0,0);
  const flow='leverM' in rig?(Math.abs(active.x)+Math.abs(active.y)+Math.abs(active.z))/(rig.leverM*rig.ispS*9.80665):0;
  const used=Math.min(fuelKg,flow*dt),fraction=flow>0?used/(flow*dt):1;active.multiplyScalar(fraction);
  // Exhausted jets must not attenuate the independent aerodynamic/support moment.
  const combined=active.clone().add(passive),limit=rig.inertiaKgM2*rig.maxAccelerationRadS2;
  const saturation=combined.length()>limit?limit/combined.length():1;active.multiplyScalar(saturation);passive.multiplyScalar(saturation);
  const torque=active.clone().add(passive);
  const next=omega.clone().addScaledVector(torque,dt/rig.inertiaKgM2);
  const rotation=omega.clone().add(next).multiplyScalar(dt/2);
  if(rotation.lengthSq()>1e-16)q.multiply(new Quaternion().setFromAxisAngle(rotation.clone().normalize(),rotation.length())).normalize();
  omega.copy(next);
  return {fuelUsedKg:used*saturation,effort:active.clone().divideScalar(rig.maxTorqueNm),torque,passiveTorque:passive};
}
