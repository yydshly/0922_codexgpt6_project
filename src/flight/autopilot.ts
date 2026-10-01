import { MathUtils, Vector3 } from 'three';
import { PRACTICE_ACCELERATION, PRACTICE_FUEL_RATE, SHIP_COLLISION_RADIUS, targetReading, type FlightInput, type FlightState, type Obstacle } from './flightPractice';
import { brakingGuidance } from './flightGuidance';
import { pointingInput } from './attitudeControl';

export type AutopilotPhase = 'off'|'stabilize'|'align'|'thrust'|'coast'|'brake'|'hold'|'blocked'|'complete';
export interface Autopilot {
  enabled:boolean; phase:AutopilotPhase; message:string; alignedFor:number;
  automaticSeconds:number; manualSeconds:number; takeovers:number;
}
export const AUTOPILOT_LABELS:Record<AutopilotPhase,string>={off:'手动控制',stabilize:'消除已有滑行',align:'自动对准',thrust:'点火接近',coast:'惯性滑行',brake:'反推减速',hold:'停稳观察',blocked:'自动接近中止',complete:'自动驾驶已结束'};
export const idleInput=():FlightInput=>({thrust:0,yaw:0,pitch:0,roll:0,brake:false});
export const hasManualInput=(input:FlightInput)=>!!(input.thrust||input.yaw||input.pitch||input.roll||input.brake);
export function createAutopilot():Autopilot {return {enabled:false,phase:'off',message:'自动驾驶会通过实际推力，完成对准、接近、减速和停稳。',alignedFor:0,automaticSeconds:0,manualSeconds:0,takeovers:0};}
/** Mode switches never mutate the physical state. */
export function engageAutopilot(pilot:Autopilot) {pilot.enabled=true;pilot.phase='stabilize';pilot.alignedFor=0;pilot.message='先检查当前速度与前方路线，再开始接近。';}
export function takeOverAutopilot(pilot:Autopilot) {
  if(!pilot.enabled)return;
  pilot.enabled=false;pilot.phase='off';pilot.takeovers++;pilot.message='你已接管。位置、速度和推进剂保持连续；松开按键后仍会滑行。';
}

/** Fixed-step local guidance, through the SAME inputs as manual control. No pose/velocity writes. */
export interface AutopilotOptions { cruiseSpeed?:number; stopClearance?:number; minClearance?:number; holdBand?:number }
export function autopilotInput(pilot:Autopilot,state:FlightState,target:Vector3,radius:number,obstacles:Obstacle[],dt:number,options:AutopilotOptions={}):FlightInput {
  const cruiseSpeed=options.cruiseSpeed??3,stopClearance=options.stopClearance??25,minClearance=options.minClearance??15,holdBand=options.holdBand??3;
  const input=idleInput();
  if(!pilot.enabled||dt<=0||state.contact)return input;
  pilot.automaticSeconds+=dt;
  const speed=state.velocity.length(),reading=targetReading(state,target,radius);
  const reject=(message:string)=>{pilot.phase='blocked';pilot.message=message;input.brake=speed>.001;return input;};
  // A rejected route stays rejected until explicit takeover/re-engagement, avoiding restart loops.
  if(pilot.phase==='blocked')return reject(pilot.message);
  const navigation=brakingGuidance(state,obstacles);
  if(navigation.level==='danger')return reject('停止自动接近并尽力减速：当前速度已超过可用制动距离，不能保证避开接触。');
  if(navigation.level==='fuel')return reject('推进剂不足以完成当前制动。停止接近并尽力减速；可重置后重新练习。');
  if(reading.clearance<minClearance)return reject('已经越过观察区内边界。自动接近中止并减速，请手动退回或重置。');
  if(pilot.phase==='stabilize'){
    if(speed>.001){input.brake=true;pilot.message='先用反向推力消除已有速度，再重新选择接近方向；减速会消耗推进剂。';return input;}
    pilot.phase='align';
  }
  const direction=target.clone().sub(state.position).normalize();
  // Check the straight approach corridor, not a fabricated all-purpose obstacle avoidance system.
  const travel=Math.max(0,reading.clearance-stopClearance);
  for(const obstacle of obstacles){
    if(obstacle.position.distanceToSquared(target)<1e-8)continue;
    const offset=obstacle.position.clone().sub(state.position),along=MathUtils.clamp(offset.dot(direction),0,travel);
    if(offset.addScaledVector(direction,-along).length()<obstacle.radius+SHIP_COLLISION_RADIUS+4)
      return reject(`接近路线经过${obstacle.name}的安全范围，自动接近中止并减速。请手动绕开后重新开启。`);
  }
  const local=direction.clone().applyQuaternion(state.attitude.clone().invert());
  const bearing=Math.acos(MathUtils.clamp(-local.z,-1,1));
  Object.assign(input,pointingInput(state.attitude,direction));
  if(pilot.phase==='brake'){
    if(speed>.001){input.brake=true;pilot.message='正在反向推力减速。喷流与推进剂消耗同步变化，停下后再开始观察计时。';return input;}
    pilot.phase='align';pilot.alignedFor=0;
  }
  if(bearing>.015||state.angularVelocity.length()>.003){
    pilot.phase='align';pilot.alignedFor=0;input.brake=speed>.001;
    pilot.message='姿态喷口先建立转动，再反向制止转动；稳定对准后才启动主推进。转船头本身不改变原有滑行方向。';return input;
  }
  pilot.alignedFor+=dt;
  if(pilot.alignedFor<1.1){pilot.phase='align';input.brake=speed>.001;pilot.message='船头已对准，保持方向并检查速度。';return input;}
  if(reading.clearance<=stopClearance+holdBand&&speed<.001){
    pilot.phase='hold';pilot.message='已停止推进，在观察区保持 5 秒；可以环顾舱外，完成后自动暂停。';return input;
  }
  if(speed>.001&&state.velocity.clone().normalize().dot(direction)<.995){
    pilot.phase='stabilize';input.brake=true;pilot.message='检测到横向滑行，先减速再重新接近。';return input;
  }
  const stopping=speed*speed/(2*PRACTICE_ACCELERATION);
  if(reading.clearance-stopClearance<=stopping&&speed>.001){pilot.phase='brake';input.brake=true;pilot.message='按当前速度计算，已经到达减速点；开始反推。';return input;}
  // Reserve enough fuel for a full acceleration/deceleration cycle at the selected speed.
  const desired=Math.min(cruiseSpeed,Math.sqrt(2*PRACTICE_ACCELERATION*Math.max(0,reading.clearance-stopClearance))*.7);
  if(state.fuel<(speed+Math.max(0,desired-speed)*2)/PRACTICE_ACCELERATION*PRACTICE_FUEL_RATE+.05)
    return reject('剩余推进剂不足以完成接近并预留制动，自动接近中止。请重新准备任务。');
  if(speed<desired-.005){pilot.phase='thrust';input.thrust=Math.min(1,(desired-speed)*3);pilot.message=`沿船头方向点火，接近速率限制为 ${cruiseSpeed} m/s；点火会消耗推进剂。`;}
  else {pilot.phase='coast';pilot.message='已关闭主推进，依靠惯性接近；此时不耗推进剂，持续检查减速距离。';}
  return input;
}
