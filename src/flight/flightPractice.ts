import { Quaternion, Vector3 } from 'three';
import { ATTITUDE_RATE,ATTITUDE_ACCELERATION,ATTITUDE_FUEL_RATE } from './attitudeControl';

export type EnvironmentId = 'earth' | 'moon' | 'asteroid';
export interface FlightInput { thrust: number; yaw: number; pitch: number; roll: number; brake: boolean }
export interface FlightState { position: Vector3; velocity: Vector3; attitude: Quaternion; angularVelocity:Vector3; rcsTorque:Vector3; rcsTranslation:Vector3; mainThrust:number; fuel: number; time: number; contact: string | null; firing: number }
export interface Obstacle { position: Vector3; radius: number; name: string }
export const FLIGHT_STEP = 1 / 120;
export const PRACTICE_RANGE = 1500;
export const SHIP_COLLISION_RADIUS = 12;
export const PRACTICE_ACCELERATION = .8;
export const PRACTICE_FUEL_RATE = .22;
export const ENVIRONMENTS: { id: EnvironmentId; title: string; subtitle: string; description: string; target: string; position: [number, number, number] }[] = [
  { id: 'earth', title: '蓝色地平线', subtitle: '近地轨道 · 卫星接近', description: '绕看地球云层、大气边缘与人造卫星。右侧翻滚的是合成废弃级段，不是实时碎片目录。', target: '教学卫星', position: [0, 0, -125] },
  { id: 'moon', title: '月球在前方', subtitle: '月球附近 · 舷窗观察', description: '月球没有地球式云层和蓝色大气。观察陨坑、明暗交界，以及前方探测器的结构。', target: '教学探测器', position: [0, 2, -105] },
  { id: 'asteroid', title: '靠近岩石世界', subtitle: '小天体 · 近距练习', description: '不规则岩体、自转与阴影均为三维效果。小岩块为刻意布置的练习对象，不代表小行星带的真实密度。', target: '合成小天体', position: [0, 0, -190] },
];
export function createFlightState(): FlightState { return { position: new Vector3(), velocity: new Vector3(), attitude: new Quaternion(), angularVelocity:new Vector3(),rcsTorque:new Vector3(),rcsTranslation:new Vector3(),mainThrust:0,fuel: 100, time: 0, contact: null, firing: 0 }; }

/** Local inertial exercise, simplified equal-axis rotational response and active rate damping. */
export function stepFlight(state: FlightState, input: FlightInput, dt: number, obstacles: Obstacle[]) {
  if (state.contact || !Number.isFinite(dt) || dt <= 0 || dt > .1) return;
  const clamp = (n: number) => Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
  const requestedRate=new Vector3(clamp(input.pitch),clamp(input.yaw),clamp(input.roll)).clampLength(0,1).multiplyScalar(ATTITUDE_RATE);
  const angularChange=requestedRate.sub(state.angularVelocity).clampLength(0,ATTITUDE_ACCELERATION*dt);
  const linearDemand=input.brake?Math.min(PRACTICE_ACCELERATION,state.velocity.length()/dt):Math.abs(clamp(input.thrust))*PRACTICE_ACCELERATION;
  const angularDemand=(Math.abs(angularChange.x)+Math.abs(angularChange.y)+Math.abs(angularChange.z))/(ATTITUDE_ACCELERATION*dt);
  const requested=(linearDemand/PRACTICE_ACCELERATION*PRACTICE_FUEL_RATE+angularDemand*ATTITUDE_FUEL_RATE)*dt;
  const fuelFraction=requested>0?Math.min(1,state.fuel/requested):1;
  state.fuel=Math.max(0,state.fuel-requested*fuelFraction);
  angularChange.multiplyScalar(fuelFraction);
  state.rcsTorque.copy(angularChange).divideScalar(ATTITUDE_ACCELERATION*dt);
  const rotation=state.angularVelocity.clone().addScaledVector(angularChange,.5).multiplyScalar(dt);
  state.angularVelocity.add(angularChange);
  const angle=rotation.length();if(angle>0)state.attitude.multiply(new Quaternion().setFromAxisAngle(rotation.divideScalar(angle),angle)).normalize();
  const acceleration=new Vector3(0,0,-clamp(input.thrust)).applyQuaternion(state.attitude).multiplyScalar(PRACTICE_ACCELERATION);
  if(input.brake)acceleration.copy(state.velocity).multiplyScalar(-1/dt).clampLength(0,PRACTICE_ACCELERATION);
  acceleration.multiplyScalar(fuelFraction);
  state.mainThrust=!input.brake&&input.thrust>0?clamp(input.thrust)*fuelFraction:0;
  state.rcsTranslation.copy(state.mainThrust>0?new Vector3():acceleration).applyQuaternion(state.attitude.clone().invert()).divideScalar(PRACTICE_ACCELERATION);
  state.firing = acceleration.length() / PRACTICE_ACCELERATION;
  const next = state.position.clone().addScaledVector(state.velocity, dt).addScaledVector(acceleration, .5 * dt * dt);
  const delta = next.clone().sub(state.position);
  let hitAt = Infinity, hit: string | null = null;
  // Swept sphere, so a long/high-speed step cannot tunnel through a target.
  for (const obstacle of obstacles) {
    const offset = state.position.clone().sub(obstacle.position), radius = obstacle.radius + SHIP_COLLISION_RADIUS;
    const c = offset.lengthSq() - radius * radius, a = delta.lengthSq(), b = 2 * offset.dot(delta);
    const discriminant = b * b - 4 * a * c;
    const t = c <= 0 ? 0 : a > 0 && discriminant >= 0 ? (-b - Math.sqrt(discriminant)) / (2 * a) : Infinity;
    if (t >= 0 && t <= 1 && t < hitAt) { hitAt = t; hit = obstacle.name; }
  }
  if (hit) {
    state.position.addScaledVector(delta, Math.max(0, hitAt - .0001));
    state.contact = `已进入${hit}的保守接触范围，练习暂停。可重置再试。`;
    state.velocity.set(0, 0, 0); state.firing = 0;
  } else if (next.length() > PRACTICE_RANGE) {
    state.contact = '已到达 1.5 km 局部练习边界。可重置返回起点。'; state.firing = 0;
  } else { state.position.copy(next); state.velocity.addScaledVector(acceleration, dt); }
  state.time += dt;
}

export function targetReading(state: FlightState, target: Vector3, targetRadius: number) {
  const offset = target.clone().sub(state.position), distance = offset.length();
  return { distance, clearance: Math.max(0, distance - targetRadius - SHIP_COLLISION_RADIUS), closing: distance > 0 ? state.velocity.dot(offset) / distance : 0 };
}
