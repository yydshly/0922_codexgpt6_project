import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { PRACTICE_ACCELERATION, PRACTICE_FUEL_RATE, SHIP_COLLISION_RADIUS, type FlightState, type Obstacle } from './flightPractice';
import { ATTITUDE_ACCELERATION,ATTITUDE_FUEL_RATE } from './attitudeControl';

export function steeringToTarget(state:FlightState,target:Vector3) {
  const local=target.clone().sub(state.position).normalize().applyQuaternion(state.attitude.clone().invert());
  const bearing=MathUtils.radToDeg(Math.acos(MathUtils.clamp(-local.z,-1,1)));
  const yaw=MathUtils.radToDeg(Math.atan2(-local.x,-local.z));
  const pitch=MathUtils.radToDeg(Math.atan2(local.y,Math.hypot(local.x,local.z)));
  const axes=[Math.abs(yaw)>3?`${yaw>0?'左转':'右转'} ${Math.abs(yaw).toFixed(0)}°`:'',Math.abs(pitch)>3?`${pitch>0?'抬头':'低头'} ${Math.abs(pitch).toFixed(0)}°`:''].filter(Boolean);
  return {bearing,behind:local.z>0,cue:bearing<3?'目标在船头前方':`${local.z>0?'目标在后方 · ':''}${axes.join(' · ')}`};
}

export interface BrakeGuidance {
  speed:number; stoppingDistance:number|null; stoppingTime:number|null; fuelRequired:number;
  firstContactDistance:number|null; obstacleName:string|null; margin:number|null;
  level:'idle'|'clear'|'caution'|'danger'|'fuel'; title:string; instruction:string;
}

/** Hold B now: fixed local inertial model, static obstacle centres, and enough fuel to finish. */
export function brakingGuidance(state:FlightState,obstacles:Obstacle[]):BrakeGuidance {
  const speed=state.velocity.length(),time=speed/PRACTICE_ACCELERATION;
  const rotationReserve=(Math.abs(state.angularVelocity.x)+Math.abs(state.angularVelocity.y)+Math.abs(state.angularVelocity.z))/ATTITUDE_ACCELERATION*ATTITUDE_FUEL_RATE;
  const fuelRequired=time*PRACTICE_FUEL_RATE+rotationReserve;
  const canStop=state.fuel+1e-9>=fuelRequired,stoppingDistance=canStop?speed*speed/(2*PRACTICE_ACCELERATION):null;
  const direction=speed>0?state.velocity.clone().divideScalar(speed):new Vector3();
  let firstContactDistance:number|null=null,obstacleName:string|null=null;
  for(const obstacle of obstacles){
    const offset=state.position.clone().sub(obstacle.position),radius=obstacle.radius+SHIP_COLLISION_RADIUS;
    const c=offset.lengthSq()-radius*radius,b=offset.dot(direction),d=b*b-c;
    const entry=c<=0?0:speed>0&&d>=0?-b-Math.sqrt(d):Infinity;
    if(entry>=0&&Number.isFinite(entry)&&(firstContactDistance===null||entry<firstContactDistance)){firstContactDistance=entry;obstacleName=obstacle.name;}
  }
  const margin=firstContactDistance!==null&&stoppingDistance!==null?firstContactDistance-stoppingDistance:null;
  let level:BrakeGuidance['level']='clear',title='滑行中',instruction='松开推进仍会移动；按住 B 或减速按钮逐渐停住。';
  if(state.fuel<=0){level='fuel';title=speed>.001?'推进剂耗尽，仍在滑行':'推进剂已耗尽';instruction='无法再推进或主动减速，可重置练习。';}
  else if(!canStop){level='fuel';title='推进剂不足以停住';instruction='当前辅助减速所需燃料超过余量；不会自动停车，可重置练习。';}
  else if(margin!==null&&margin<=0){level='danger';title='当前方向来不及刹停';instruction=`按此直线减速仍会进入${obstacleName}接触范围；这是当前运动方向的参考。`;}
  else if(margin!==null&&margin<Math.max(8,speed*2)){level='caution';title='该开始减速了';instruction='预计停止位置接近接触范围，按住 B 或减速按钮。';}
  else if(speed<.05){level='idle';title='可以开始接近';instruction='先对准目标，再短按推进；观察接近速度和停止距离。';}
  return {speed,stoppingDistance,stoppingTime:canStop?time:null,fuelRequired,firstContactDistance,obstacleName,margin,level,title,instruction};
}

/** Camera-relative HUD placement, including rear targets without mirrored front projections. */
export function directionOnScreen(worldDirection:Vector3,camera:PerspectiveCamera) {
  if(worldDirection.lengthSq()<1e-12)return null;
  const local=worldDirection.clone().normalize().applyQuaternion(camera.quaternion.clone().invert());
  const behind=local.z>=0,tan=Math.tan(MathUtils.degToRad(camera.fov)/2);
  const depth=Math.max(.001,Math.abs(local.z));
  let x=local.x/(depth*tan*camera.aspect),y=local.y/(depth*tan);
  const offscreen=behind||Math.abs(x)>.78||Math.abs(y)>.64;
  if(offscreen){
    // Exactly aft has no preferred turn direction; choose right consistently.
    if(Math.abs(x)+Math.abs(y)<.001)x=1;
    const scale=1/Math.max(Math.abs(x)/.78,Math.abs(y)/.64);x*=scale;y*=scale;
  }
  return {x,y,behind,offscreen,angle:Math.atan2(-y,x)};
}
