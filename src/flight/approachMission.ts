import { Vector3 } from 'three';
import { PRACTICE_ACCELERATION, SHIP_COLLISION_RADIUS, targetReading, type FlightState, type Obstacle } from './flightPractice';
import { brakingGuidance, steeringToTarget } from './flightGuidance';

export const APPROACH_RULES={minClearance:15,maxClearance:30,maxSpeed:.15,maxBearing:8,holdSeconds:5,alignSeconds:1,minTravel:10} as const;
export type ApproachPhase='align'|'approach'|'brake'|'hold';
export const APPROACH_PHASES:{id:ApproachPhase;label:string}[]=[{id:'align',label:'对准'},{id:'approach',label:'接近'},{id:'brake',label:'减速'},{id:'hold',label:'停稳'}];
export interface ApproachResult { elapsed:number; fuelUsed:number; clearance:number; speed:number; peakSpeed:number; closestClearance:number; assistedAimCount:number }
export interface ApproachMission {
  status:'running'|'success'|'failed'; phase:ApproachPhase; hint:string; result:ApproachResult|null;
  startedAt:number; lastTime:number; initialFuel:number; initialDistance:number;
  elapsed:number; alignmentTime:number; aligned:boolean; approached:boolean; heldFor:number;
  clearance:number; speed:number; bearing:number; predictedClearance:number|null; stopWarning:string|null;
  peakSpeed:number; closestClearance:number; assistedAimCount:number;
}

export function createApproachMission(flight:FlightState,target:Vector3,targetRadius:number):ApproachMission {
  const {distance,clearance}=targetReading(flight,target,targetRadius);
  return {status:'running',phase:'align',hint:'让船头对准目标并保持 1 秒；可手动转向或使用“对准目标”。',result:null,
    startedAt:flight.time,lastTime:flight.time,initialFuel:flight.fuel,initialDistance:distance,elapsed:0,
    alignmentTime:0,aligned:false,approached:false,heldFor:0,clearance,speed:flight.velocity.length(),bearing:steeringToTarget(flight,target).bearing,
    predictedClearance:null,stopWarning:null,peakSpeed:flight.velocity.length(),closestClearance:clearance,assistedAimCount:0};
}

/** Called once after each actual physics step. Pausing/re-rendering never advances the hold. */
export function advanceApproachMission(mission:ApproachMission,flight:FlightState,target:Vector3,targetRadius:number,obstacles:Obstacle[]=[{position:target,radius:targetRadius,name:'目标'}]) {
  if(mission.status!=='running')return;
  const dt=Math.max(0,flight.time-mission.lastTime);mission.lastTime=flight.time;mission.elapsed=flight.time-mission.startedAt;
  const {distance,clearance,closing}=targetReading(flight,target,targetRadius),speed=flight.velocity.length(),bearing=steeringToTarget(flight,target).bearing;
  mission.clearance=clearance;mission.speed=speed;mission.bearing=bearing;
  mission.peakSpeed=Math.max(mission.peakSpeed,speed);mission.closestClearance=Math.min(mission.closestClearance,clearance);
  const braking=brakingGuidance(flight,obstacles);
  mission.stopWarning=braking.level==='danger'||braking.level==='fuel'?braking.instruction:null;
  // A stop point beyond a collision is unreachable, even if its radial clearance looks safe.
  mission.predictedClearance=braking.stoppingDistance!==null&&!mission.stopWarning?flight.position.clone().addScaledVector(flight.velocity,speed/(2*PRACTICE_ACCELERATION)).distanceTo(target)-targetRadius-SHIP_COLLISION_RADIUS:null;
  const finish=(status:'success'|'failed',hint:string)=>{
    mission.status=status;mission.hint=hint;
    mission.result={elapsed:mission.elapsed,fuelUsed:Math.max(0,mission.initialFuel-flight.fuel),clearance,speed,peakSpeed:mission.peakSpeed,closestClearance:mission.closestClearance,assistedAimCount:mission.assistedAimCount};
  };
  if(flight.contact){finish('failed',flight.contact);return;}
  if(flight.fuel<=0){finish('failed','推进剂已耗尽，本次接近任务结束。可重新开始。');return;}
  if(dt===0)return;
  mission.alignmentTime=bearing<=APPROACH_RULES.maxBearing?mission.alignmentTime+dt:0;
  if(mission.alignmentTime+1e-8>=APPROACH_RULES.alignSeconds)mission.aligned=true;
  if(mission.aligned&&mission.initialDistance-distance>=APPROACH_RULES.minTravel)mission.approached=true;
  const inZone=clearance>=APPROACH_RULES.minClearance&&clearance<=APPROACH_RULES.maxClearance;
  const ready=mission.aligned&&mission.approached&&inZone&&speed<=APPROACH_RULES.maxSpeed&&bearing<=APPROACH_RULES.maxBearing&&flight.firing<=.001;
  mission.heldFor=ready?Math.min(APPROACH_RULES.holdSeconds,mission.heldFor+dt):0;
  if(mission.heldFor+1e-8>=APPROACH_RULES.holdSeconds){mission.heldFor=APPROACH_RULES.holdSeconds;finish('success','已在观察区低速保持 5 秒，并持续朝向目标。');return;}
  if(mission.stopWarning){mission.phase='brake';mission.hint=mission.stopWarning;return;}
  if(!mission.aligned){mission.phase='align';mission.hint='让船头对准目标并保持 1 秒；拖动环顾只改变视线。';}
  else if(inZone&&speed<=APPROACH_RULES.maxSpeed&&mission.approached){
    mission.phase='hold';mission.hint=bearing>APPROACH_RULES.maxBearing?'重新让船头对准目标，偏角需不超过 8°。':flight.firing>.001?'松开推进，让位置和速度稳定。':'保持当前状态 5 秒；暂停期间不计时。';
  }else if(clearance<APPROACH_RULES.minClearance){
    mission.phase='brake';mission.hint='已太靠近：先按 B 停住，再对准目标短按 S，退回 15–30 m 余量区间。';
  }else if(mission.approached&&(clearance<=APPROACH_RULES.maxClearance||(closing>0&&speed*speed/(2*PRACTICE_ACCELERATION)>=clearance-APPROACH_RULES.maxClearance))){
    mission.phase='brake';mission.hint='现在按住 B 减速；停下后可短按 W / S 微调位置，避免越过观察区。';
  }else{
    mission.phase='approach';mission.hint='短按 W，使速率约为 2–3 m/s 后松开滑行；预计停止余量进入 15–30 m 时减速。';
  }
}
