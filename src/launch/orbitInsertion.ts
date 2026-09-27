import { LAUNCH_EARTH, LAUNCH_MISSION } from '../data/launchMission';
import { add, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, surfaceAt, unit, type AscentModel, type Particle, type V3 } from './ascent';
import { LIFTOFF, type FlightState } from './liftoff';
import { compileVehicle, type VehicleConfig } from './vehicle';

const MU = LAUNCH_EARTH.gmM3S2, R = LAUNCH_EARTH.semiMajorM;
export const ORBIT_INSERTION = { version: 'orbit-insertion-0.1', poweredStepS: .05, coastStepS: 2, maxBurnElapsedS: 1200, reentryStopM: 80000 } as const;
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export interface OrbitElements {
  energy: number; eccentricity: number; inclinationDeg: number; periapsisM: number; apoapsisM: number | null; periodS: number | null;
  bound: boolean; normal: V3; periDirection: V3; latusRectumM: number;
}
/** Osculating two-body elements in task ECI. Heights use WGS84 equatorial radius, NOT geodetic height. */
export function orbitalElements(position: V3, velocity: V3): OrbitElements {
  const r = norm(position), h = cross(position, velocity), hn = norm(h), energy = dot(velocity, velocity) / 2 - MU / r;
  const ev = add(scale(cross(velocity, h), 1 / MU), scale(position, -1 / r)), eccentricity = norm(ev), bound = energy < 0 && eccentricity < 1 && hn > 1;
  const p = hn * hn / MU, semiMajor = -MU / (2 * energy);
  return { energy, eccentricity, inclinationDeg: hn > 1 ? Math.acos(Math.max(-1, Math.min(1, h[2] / hn))) * 180 / Math.PI : 0,
    periapsisM: p / (1 + eccentricity) - R, apoapsisM: bound ? p / (1 - eccentricity) - R : null,
    periodS: bound ? 2 * Math.PI * Math.sqrt(semiMajor ** 3 / MU) : null, bound, normal: unit(h),
    periDirection: eccentricity > 1e-8 ? unit(ev) : unit(position), latusRectumM: p };
}
export function meetsOrbitTarget(e: OrbitElements) {
  return e.bound && e.periapsisM >= LAUNCH_MISSION.minOrbitAltitudeKm * 1000 && e.apoapsisM !== null && e.apoapsisM <= LAUNCH_MISSION.maxOrbitAltitudeKm * 1000
    && Math.abs(e.inclinationDeg - LAUNCH_MISSION.inclinationDeg) <= LAUNCH_MISSION.inclinationToleranceDeg;
}
// Command cutoff slightly inside the accepted band; never widen the mission's acceptance limits.
const readyForCutoff = (e: OrbitElements) => meetsOrbitTarget(e) && e.periapsisM >= LAUNCH_MISSION.minOrbitAltitudeKm * 1000 + 1000 && e.apoapsisM! <= LAUNCH_MISSION.maxOrbitAltitudeKm * 1000 - 1000;
/** Render only: open conics have a finite viewport extent; no fictitious closed orbit. */
export function sampleOrbit(e: OrbitElements, count = 257): V3[] {
  if (e.latusRectumM < 1 || norm(e.normal) < .5) return [];
  const q = cross(e.normal, e.periDirection), limitR = R * 6;
  const extent = e.bound && (e.apoapsisM ?? 0) + R <= limitR ? Math.PI : Math.acos(Math.max(-1, Math.min(1, (e.latusRectumM / limitR - 1) / Math.max(e.eccentricity, 1e-10))));
  return Array.from({ length: count }, (_, i) => { const angle = -extent + 2 * extent * i / (count - 1), r = e.latusRectumM / Math.max(1e-8, 1 + e.eccentricity * Math.cos(angle)); return scale(add(scale(e.periDirection, Math.cos(angle)), scale(q, Math.sin(angle))), r); });
}
export type OrbitPhase = 'orbit-burn' | 'orbit-review' | 'orbit-coast' | 'orbit-complete' | 'orbit-failed';
export interface OrbitTelemetry {
  elements: OrbitElements; cutoff?: { time: number; fuelKg: number; elements: OrbitElements; reason: string };
  coastAngleRad: number; coastElapsedS: number; relativeEnergyChange: number; targetHeld: boolean;
  boosterRetired: boolean; minCoastAltitudeM: number | null; maxCoastAltitudeM: number | null;
}
/** Educational ideal vector/throttle feedback; it commands acceleration, NEVER changes integrated r/v. */
export function orbitGuidance(p: Particle, dry: number, availableThrustN: number) {
  const r = norm(p.position), up = unit(p.position), vr = dot(p.velocity, up), tangent = add(p.velocity, scale(up, -vr)), vt = norm(tangent);
  const targetR = R + LAUNCH_MISSION.orbitAltitudeKm * 1000;
  const radial = (targetR - r) / 100 ** 2 - 2 * vr / 100 + MU / r ** 2 - vt ** 2 / r;
  const tangential = (Math.sqrt(MU / targetR) - vt) / 40 + vr * vt / r;
  const demand = add(scale(up, radial), scale(unit(tangent), tangential)), direction = unit(demand);
  return { direction, pitchDeg: Math.asin(Math.max(-1, Math.min(1, dot(direction, surfaceAt(p.position).up)))) * 180 / Math.PI,
    throttle: Math.min(1, norm(demand) * (dry + p.fuel) / availableThrustN) };
}
export class OrbitSimulation {
  stepsTaken = 0;
  state: FlightState;
  private particle: Particle;
  private detached?: Particle;
  private detachedDirection?: V3;
  private vehicle: ReturnType<typeof compileVehicle>;
  private startTime: number;
  private nextTrailTime = 0;
  constructor(config: VehicleConfig, handoff: FlightState, readonly poweredStepS: number = .05, readonly coastStepS: number = 2) {
    const a = handoff.ascent; this.vehicle = compileVehicle(config);
    const part = this.vehicle.stages[1], dry = part.dryKg + this.vehicle.payloadKg + this.vehicle.fairingKg;
    if (handoff.phase !== 'ascent-complete' || !a || a.stage !== 1 || handoff.orbit) throw Error('请先完成第 4 步的二级点火检查点。');
    if (![.05, .025, .0125].includes(poweredStepS) || ![2, 1, .5].includes(coastStepS)) throw Error('不支持的入轨步长');
    if (a.upperFuelKg <= 0 || a.upperFuelKg > part.fuelKg || Math.abs(handoff.massKg - dry - a.upperFuelKg) > 1e-5) throw Error('上升状态与二级配置不匹配。');
    this.particle = { position: [...a.position], velocity: [...a.velocity], fuel: a.upperFuelKg };
    if (a.detached) { this.detached = { position: [...a.detached.position], velocity: [...a.detached.velocity], fuel: 0 }; this.detachedDirection = rotateEarth(a.detached.fixedDirection, handoff.time); }
    this.startTime = handoff.time; this.state = structuredClone(handoff);
    this.state.phase = 'orbit-burn'; this.state.message = '二级继续加速，辅助调整推力方向；预测轨道达到目标后自动关机并暂停复查。';
    this.state.orbit = { elements: orbitalElements(a.position, a.velocity), coastAngleRad: 0, coastElapsedS: 0, relativeEnergyChange: 0, targetHeld: true, boosterRetired: false, minCoastAltitudeM: null, maxCoastAltitudeM: null };
    this.event('进入第 5 步，沿用三维位置、速度和剩余燃料'); this.refresh();
  }
  get running() { return this.state.phase === 'orbit-burn' || this.state.phase === 'orbit-coast'; }
  get stepS() { return this.state.phase === 'orbit-burn' ? this.poweredStepS : this.coastStepS; }
  private event(label: string) { this.state.events.push({ time: this.state.time, label }); }
  private model(): AscentModel {
    const part = this.vehicle.stages[1], dry = part.dryKg + this.vehicle.payloadKg + this.vehicle.fairingKg;
    return { dry, motor: { flow: part.massFlowKgS, sea: part.ispSeaS, vacuum: part.ispVacuumS }, cdArea: LIFTOFF.cd * LIFTOFF.areaM2,
      throttle: p => this.state.phase === 'orbit-burn' ? orbitGuidance(p, dry, part.thrustN).throttle : 0,
      steer: p => this.state.phase === 'orbit-burn' ? orbitGuidance(p, dry, part.thrustN) : { direction: unit(p.velocity), pitchDeg: Math.asin(dot(unit(p.velocity), surfaceAt(p.position).up)) * 180 / Math.PI } };
  }
  private refresh() {
    const s = this.state, a = s.ascent!, model = this.model();
    const throttle = s.phase === 'orbit-burn' && this.particle.fuel > 0 ? orbitGuidance(this.particle, model.dry, this.vehicle.stages[1].thrustN).throttle : 0;
    const force = ascentForces(this.particle, model, s.time, throttle);
    Object.assign(s, { heightM: force.height - LIFTOFF.padHeightM, speedMS: dot(force.relative, force.up), massKg: force.mass, thrustN: force.thrust,
      throttle, weightN: force.mass * MU / norm(this.particle.position) ** 2, dragN: force.drag, accelerationMS2: dot(force.acceleration, force.up) });
    Object.assign(a, { position: [...this.particle.position], velocity: [...this.particle.velocity], direction: force.direction,
      fixedPosition: rotateEarth(this.particle.position, -s.time), fixedDirection: rotateEarth(force.direction, -s.time), upperFuelKg: this.particle.fuel,
      altitudeM: force.height, horizontalMS: Math.sqrt(Math.max(0, force.airSpeed ** 2 - s.speedMS ** 2)), airSpeedMS: force.airSpeed,
      density: force.density, pressurePa: force.pressurePa, dynamicPressurePa: .5 * force.density * force.airSpeed ** 2, pitchDeg: force.pitchDeg });
    s.orbit!.elements = orbitalElements(this.particle.position, this.particle.velocity);
    if (this.detached) a.detached = { position: [...this.detached.position], velocity: [...this.detached.velocity], fixedPosition: rotateEarth(this.detached.position, -s.time), fixedDirection: rotateEarth(this.detachedDirection!, -s.time), massKg: this.vehicle.stages[0].dryKg };
    else delete a.detached;
  }
  cutoff(reason = '手动关机') {
    const s = this.state; if (s.phase !== 'orbit-burn') return;
    s.phase = 'orbit-review'; this.refresh();
    s.orbit!.cutoff = { time: s.time, fuelKg: this.particle.fuel, elements: structuredClone(s.orbit!.elements), reason };
    s.orbit!.targetHeld = meetsOrbitTarget(s.orbit!.elements);
    s.message = '发动机已关机，时间暂停。检查预测轨道，再开始无动力滑行；此刻还没有通过一圈验证。'; this.event(reason + '，冻结复查');
  }
  startCoast() {
    if (this.state.phase !== 'orbit-review') return;
    this.state.phase = 'orbit-coast'; this.state.message = '发动机保持关闭，实际积分绕地飞行；下降到 80 km 则停止本段，不模拟再入。'; this.event('开始无动力滑行验证');
  }
  private fail(message: string) { this.state.phase = 'orbit-failed'; this.state.message = message; this.refresh(); this.event(message); }
  step() {
    if (!this.running) return;
    this.stepsTaken++;
    const s = this.state, o = s.orbit!, powered = s.phase === 'orbit-burn', model = this.model();
    const throttle = powered ? orbitGuidance(this.particle, model.dry, this.vehicle.stages[1].thrustN).throttle : 0;
    let dt = this.stepS;
    if (throttle > 0) dt = Math.min(dt, this.particle.fuel / model.motor!.flow);
    const previous = [...this.particle.position] as V3;
    const integrate = (duration: number) => integrateAscent(this.particle, model, s.time, duration, () => throttle);
    let next = integrate(dt);
    // Resolve automatic cutoff inside the step, so halving dt does not shift the event by 0.05 s.
    if (powered && readyForCutoff(orbitalElements(next.position, next.velocity))) {
      let low = 0, high = dt;
      for (let i = 0; i < 24; i++) { const mid = (low + high) / 2, test = integrate(mid); if (readyForCutoff(orbitalElements(test.position, test.velocity))) high = mid; else low = mid; }
      dt = high; next = integrate(dt);
    }
    this.particle = next;
    if (this.detached) {
      this.detached = integrateAscent(this.detached, { dry: this.vehicle.stages[0].dryKg, cdArea: .7 * Math.PI * 1.85 ** 2 }, s.time, dt, () => 0);
      if (surfaceAt(this.detached.position).height < ORBIT_INSERTION.reentryStopM) { this.detached = undefined; o.boosterRetired = true; this.event('空一级下降至 80 km，结束其轨迹显示；未模拟再入或回收'); }
    }
    s.time += dt; this.refresh();
    const a = s.ascent!;
    if (s.time >= this.nextTrailTime) { a.trail.push([...a.fixedPosition]); if (a.trail.length > 800) a.trail.shift(); this.nextTrailTime = s.time + (powered ? 1 : 10); }
    if (!Number.isFinite(norm(a.position)) || a.altitudeM < ORBIT_INSERTION.reentryStopM) { this.fail('未完成入轨验证：下降至 80 km 或状态无效，已停止；不继续模拟再入。'); return; }
    if (powered) {
      if (readyForCutoff(o.elements)) this.cutoff('预测近远地点与倾角进入目标范围，保留 1 km 边界余量后自动关机');
      else if (this.particle.fuel < 1e-6) { this.particle.fuel = 0; this.cutoff('二级推进剂耗尽，强制关机'); }
      else if (s.time - this.startTime > ORBIT_INSERTION.maxBurnElapsedS) this.cutoff('辅助制导超时，关机检查未达标原因');
    } else {
      const angle = Math.atan2(norm(cross(previous, a.position)), dot(previous, a.position));
      o.coastAngleRad += angle; o.coastElapsedS += dt;
      o.relativeEnergyChange = Math.abs((o.elements.energy - o.cutoff!.elements.energy) / o.cutoff!.elements.energy);
      o.targetHeld &&= meetsOrbitTarget(o.elements);
      const altitude = norm(a.position) - R;
      o.minCoastAltitudeM = Math.min(o.minCoastAltitudeM ?? altitude, altitude); o.maxCoastAltitudeM = Math.max(o.maxCoastAltitudeM ?? altitude, altitude);
      if (o.coastAngleRad >= 2 * Math.PI * LAUNCH_MISSION.coastRevolutions) {
        if (!o.targetHeld) this.fail('已实际绕地一圈，但近远地点或倾角未全程满足本次任务目标。');
        else { s.phase = 'orbit-complete'; s.message = '关机后已实际绕地一圈，近远地点与倾角全程达标。本次入轨教学验证完成；载荷仍与二级连接。'; this.event('完成一圈无动力飞行，入轨验证通过'); }
      } else if (o.coastElapsedS > 20000) this.fail('滑行超过本段时限，尚未完成一圈目标验证。');
    }
  }
  snapshot(): FlightState { return structuredClone(this.state); }
}
export class OrbitClock {
  paused = false; rate = 1; private debt = 0;
  constructor(readonly simulation: OrbitSimulation) {}
  pause(value: boolean) { this.paused = value; this.debt = 0; }
  setRate(value: number) { if (![1, 10, 100].includes(value) || value === 100 && this.simulation.state.phase === 'orbit-burn') throw Error('100 倍仅用于关机后滑行'); this.rate = value; this.debt = 0; }
  advance(seconds: number) {
    if (this.paused || !this.simulation.running || !Number.isFinite(seconds) || seconds <= 0) return;
    this.debt += Math.min(seconds, .25) * this.rate;
    let budget = 80;
    while (this.debt + 1e-9 >= this.simulation.stepS && budget-- > 0 && this.simulation.running) { const dt = this.simulation.stepS; this.simulation.step(); this.debt -= dt; }
    // A 1× coast needs to accumulate a whole 2 s step; a 0.25 s cap would stall it forever.
    this.debt = this.simulation.running ? Math.min(this.debt, Math.max(this.simulation.stepS, .25 * this.rate)) : 0;
  }
}
