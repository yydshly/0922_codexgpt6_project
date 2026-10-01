import {Euler,Quaternion,Vector3} from 'three';
import {surfaceAt,type V3} from '../launch/ascent';
import {LAUNCH_EARTH} from '../data/launchMission';
import {CREW_VEHICLE,type CrewSnapshot} from './crewMission';
import type {CockpitReading} from './pilotCockpit';

/** Fixed exterior optics. +Z is the heat-shield/base side, not a commanded Earth-pointing gimbal. */
export const CREW_GROUND_OPTICS={position:[2.6*Math.cos(Math.PI/8),2.6*Math.sin(Math.PI/8),.24] as V3,fovDeg:64,nearM:.04};
type ObservationState=Pick<CrewSnapshot,'position'|'attitude'|'serviceAttached'|'phase'>;

/** A camera pose in the same ship-centred frame used by the renderer. Never interpolates away from the eye. */
export function crewPilotView(attitude:CrewSnapshot['attitude'],eye:Vector3,head={x:0,y:0},headPivot=eye){
  const body=new Quaternion(...attitude),look=new Quaternion().setFromEuler(new Euler(head.y,head.x,0,'YXZ')),orientation=body.clone().multiply(look);
  const localEye=eye.clone().sub(headPivot).applyQuaternion(look).add(headPivot);
  return {position:localEye.applyQuaternion(body),orientation,forward:new Vector3(0,0,-1).applyQuaternion(orientation),up:new Vector3(0,1,0).applyQuaternion(orientation)};
}

/** Positive, stable centre-ray intersection with the same oblate reference Earth as the scene. */
export function earthRayDistance(position:Vector3,direction:Vector3){
  const a=LAUNCH_EARTH.semiMajorM,b=a*(1-1/LAUNCH_EARTH.inverseFlattening),p=position.clone().divide(new Vector3(a,a,b)),d=direction.clone().normalize().divide(new Vector3(a,a,b));
  const aa=d.lengthSq(),bb=p.dot(d),cc=p.lengthSq()-1,disc=bb*bb-aa*cc;
  if(cc<0||disc<0)return null;
  const root=Math.sqrt(disc),q=-bb-(bb>=0?root:-root),roots=q===0?[0]:[q/aa,cc/q];
  const positive=roots.filter(t=>Number.isFinite(t)&&t>0);return positive.length?Math.min(...positive):null;
}

export function crewGroundView(s:ObservationState){
  const body=new Quaternion(...s.attitude),position=new Vector3(...CREW_GROUND_OPTICS.position).applyQuaternion(body);
  // Camera looks along +Z, with cabin +Y as image-up; a rolled craft produces a rolled feed.
  const orientation=body.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI));
  const forward=new Vector3(0,0,1).applyQuaternion(body),up=new Vector3(0,1,0).applyQuaternion(body),absolute=position.clone().add(new Vector3(...s.position));
  const normal=new Vector3(...surfaceAt(s.position).up),available=!s.serviceAttached;
  const cameraHeightM=surfaceAt(absolute.toArray() as V3).height;
  const rangeM=available&&cameraHeightM>0?earthRayDistance(absolute,forward):null;
  return {position,orientation,forward,up,available,cameraHeightM,rangeM,downAngleDeg:forward.angleTo(normal.negate())*180/Math.PI};
}

export function crewObservation(s:ObservationState){
  const view=crewGroundView(s),pilotForward=new Vector3(0,0,-1).applyQuaternion(new Quaternion(...s.attitude)),down=new Vector3(...surfaceAt(s.position).up).negate();
  const gazeDownDeg=pilotForward.angleTo(down)*180/Math.PI;
  const windowDescription=gazeDownDeg>120?'默认舷窗视线主要朝向天空一侧，不能直接看到脚下地面。':gazeDownDeg<60?'默认舷窗视线偏向地面一侧；实际可见范围仍受窗框限制。':'默认舷窗视线偏向侧方；船头朝向与下降方向分别读取。';
  const feedDescription=!view.available?'舱底摄像头将在服务舱分离后启用。':view.cameraHeightM<=0?'镜头到达参考地表，不能继续作为地上视角。':view.rangeM===null?'镜头中心当前未指向地面；保留实际天空/地平线画面，不自动纠正飞船姿态。':'镜头中心指向参考地表。画面来自舱底摄像头，与舷窗视线不同。';
  return {...view,gazeDownDeg,windowDescription,feedDescription};
}

/** Mission-specific instruments: target-relative readings must not remain on the screen during descent. */
export function crewCockpitReading(s:CrewSnapshot):CockpitReading{
  const returning=!s.serviceAttached,launching=s.carrierStage!=='none';
  const thrustN=new Vector3(...s.thrust).length();
  if(returning)return {mode:'landing',distance:s.altitudeM,closing:s.verticalMS,speed:s.groundSpeedMS,fuel:s.landingFuelKg,firing:thrustN/CREW_VEHICLE.landingThrustN,bearing:s.landingTiltDeg,clearanceM:s.lowestPointClearanceM,loadG:s.properG,fuelCaption:'LANDING FUEL / kg',thrustCaption:'LANDING ENGINE'};
  if(launching)return {mode:'launch',distance:s.altitudeM,closing:s.verticalMS,speed:s.groundSpeedMS,fuel:s.launchFuelKg/1000,firing:thrustN/(s.carrierStage==='booster'?CREW_VEHICLE.boosterThrustN:CREW_VEHICLE.upperThrustN),bearing:s.landingTiltDeg,loadG:s.properG,fuelCaption:'LAUNCH FUEL / t',thrustCaption:'LAUNCH ENGINE'};
  const offset=new Vector3(...s.targetPosition).sub(new Vector3(...s.position));
  const closing=offset.lengthSq()>0?new Vector3(...s.velocity).sub(new Vector3(...s.targetVelocity)).dot(offset.normalize()):0;
  return {mode:'orbit',distance:s.distanceM,closing,speed:s.relativeSpeedMS,fuel:s.serviceFuelKg,firing:s.mainFraction,bearing:s.pointingDeg,loadG:s.properG,fuelCaption:'SERVICE FUEL / kg',thrustCaption:'MAIN ENGINE'};
}
