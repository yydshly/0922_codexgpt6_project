import { LAUNCH_EARTH, LAUNCH_SITE } from '../data/launchMission';
import { LIFTOFF, type FlightState } from './liftoff';
import { compileVehicle, STANDARD_GRAVITY, type VehicleConfig } from './vehicle';

export type V3 = [number, number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a: V3) => Math.hypot(...a);
export const unit = (a: V3) => scale(a, 1 / Math.max(norm(a), 1e-12));
export const ASCENT = { modelVersion: 'ascent-0.1', omega: 7.292115e-5, separationSpeedMS: 2, separationWaitS: 3, upperReviewS: 30, maxTimeS: 600 } as const;
const R = LAUNCH_EARTH.semiMajorM, f = 1 / LAUNCH_EARTH.inverseFlattening, e2 = f * (2 - f);
const latitude = LAUNCH_SITE.latitudeDeg * Math.PI / 180, longitude = LAUNCH_SITE.longitudeDeg * Math.PI / 180;
const N = R / Math.sqrt(1 - e2 * Math.sin(latitude) ** 2);
export const SITE_FIXED: V3 = [N * Math.cos(latitude) * Math.cos(longitude), N * Math.cos(latitude) * Math.sin(longitude), N * (1 - e2) * Math.sin(latitude)];
export const SITE_UP: V3 = [Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude)];
export function rotateEarth(p: V3, seconds: number): V3 { const a = ASCENT.omega * seconds, c = Math.cos(a), s = Math.sin(a); return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]]; }
export const airVelocity = (p: V3): V3 => [-ASCENT.omega * p[1], ASCENT.omega * p[0], 0];
/** Axisymmetric WGS84 height and surface normal; valid in ECI as well as ECEF. */
export function surfaceAt(p: V3) {
  const horizontal = Math.hypot(p[0], p[1]); let lat = Math.atan2(p[2], horizontal * (1 - e2));
  for (let i = 0; i < 8; i++) { const n = R / Math.sqrt(1 - e2 * Math.sin(lat) ** 2); lat = Math.atan2(p[2] + e2 * n * Math.sin(lat), horizontal); }
  const lon = Math.atan2(p[1], p[0]), n = R / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  return { height: horizontal > 1e-6 ? horizontal / Math.cos(lat) - n : Math.abs(p[2]) - R * (1 - f), up: [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)] as V3, east: [-Math.sin(lon), Math.cos(lon), 0] as V3 };
}
export function teachingAtmosphere(height: number) { const fraction = Math.exp(-Math.max(0, height) / 8500); return { density: 1.225 * fraction, pressurePa: 101325 * fraction }; }
export function guidance(p: V3, time: number) {
  const local = surfaceAt(p), u = Math.max(0, Math.min(1, (time - 12) / 170));
  const pitchDeg = 90 - 65 * u * u * (3 - 2 * u), angle = pitchDeg * Math.PI / 180;
  return { pitchDeg, direction: add(scale(local.up, Math.sin(angle)), scale(local.east, Math.cos(angle))) };
}
export interface AscentTelemetry {
  position: V3; velocity: V3; direction: V3; fixedPosition: V3; fixedDirection: V3;
  stage: 0 | 1; boosterFuelKg: number; upperFuelKg: number; altitudeM: number; horizontalMS: number; airSpeedMS: number;
  density: number; pressurePa: number; dynamicPressurePa: number; pitchDeg: number;
  trail: V3[]; detached?: { position: V3; velocity: V3; fixedPosition: V3; fixedDirection: V3; massKg: number };
  separation?: { time: number; beforeMassKg: number; upperMassKg: number; boosterMassKg: number; momentumError: number; relativeSpeedMS: number };
}
export type AscentPhase = 'ascent' | 'stage-ready' | 'separating' | 'upper-burn' | 'ascent-complete' | 'ascent-failed';
export interface Particle { position: V3; velocity: V3; fuel: number }
interface Motor { flow: number; sea: number; vacuum: number }
export interface AscentModel { dry: number; motor?: Motor; cdArea: number; mu?: number; noAir?: boolean; atmosphere?: (height: number) => { density: number; pressurePa: number }; steer?: (state: Particle, time: number) => { direction: V3; pitchDeg: number }; throttle?: (state: Particle, time: number) => number }
export function ascentForces(s: Particle, model: AscentModel, time: number, throttle: number) {
  const local = surfaceAt(s.position), atmosphere = model.noAir ? { density: 0, pressurePa: 0 } : (model.atmosphere ?? teachingAtmosphere)(local.height);
  const relative = add(s.velocity, scale(airVelocity(s.position), -1)), airSpeed = norm(relative), mass = model.dry + Math.max(0, s.fuel);
  const guide = model.steer?.(s, time) ?? guidance(s.position, time), motor = model.motor;
  const isp = motor ? motor.vacuum - (motor.vacuum - motor.sea) * atmosphere.pressurePa / 101325 : 0;
  const thrust = motor && s.fuel > 0 ? motor.flow * STANDARD_GRAVITY * isp * (model.throttle?.(s, time) ?? throttle) : 0;
  const drag = .5 * atmosphere.density * model.cdArea * airSpeed ** 2;
  const gravity = scale(s.position, -(model.mu ?? LAUNCH_EARTH.gmM3S2) / norm(s.position) ** 3);
  const acceleration = add(gravity, scale(add(scale(guide.direction, thrust), scale(unit(relative), -drag)), 1 / mass));
  return { ...local, ...atmosphere, ...guide, acceleration, thrust, drag, mass, airSpeed, relative };
}
/** Time-dependent 3D RK4. Caller splits engine burnout and ignition event boundaries. */
export function integrateAscent(s: Particle, model: AscentModel, time: number, dt: number, throttleAt: (t: number) => number): Particle {
  const flow = model.motor?.flow ?? 0;
  const derivative = (p: Particle, t: number) => ({ p: p.velocity, v: ascentForces({ ...p, fuel: s.fuel > 0 ? Math.max(p.fuel, 1e-10) : 0 }, model, t, throttleAt(t)).acceleration, f: s.fuel > 0 ? -flow * (model.throttle?.(p, t) ?? throttleAt(t)) : 0 });
  const plus = (d: ReturnType<typeof derivative>, amount: number): Particle => ({ position: add(s.position, scale(d.p, amount)), velocity: add(s.velocity, scale(d.v, amount)), fuel: s.fuel + d.f * amount });
  const a = derivative(s, time), b = derivative(plus(a, dt / 2), time + dt / 2), c = derivative(plus(b, dt / 2), time + dt / 2), d = derivative(plus(c, dt), time + dt);
  const blend = (key: 'p' | 'v') => scale(add(add(a[key], scale(add(b[key], c[key]), 2)), d[key]), dt / 6);
  return { position: add(s.position, blend('p')), velocity: add(s.velocity, blend('v')), fuel: Math.max(0, s.fuel + dt / 6 * (a.f + 2 * b.f + 2 * c.f + d.f)) };
}
export function separateMomentum(velocity: V3, direction: V3, upperMass: number, boosterMass: number) {
  const impulse = ASCENT.separationSpeedMS * upperMass * boosterMass / (upperMass + boosterMass);
  return { upper: add(velocity, scale(direction, impulse / upperMass)), booster: add(velocity, scale(direction, -impulse / boosterMass)) };
}
export class AscentSimulation {
  stepsTaken = 0;
  state: FlightState;
  private vehicle: ReturnType<typeof compileVehicle>;
  private particle: Particle;
  private detached?: Particle;
  private detachedDirection?: V3;
  private separationTime = Infinity;
  private nextTrailTime: number;
  readonly stepS: number;
  constructor(config: VehicleConfig, handoff: FlightState, stepS = .05) {
    if (handoff.phase !== 'complete' || handoff.ascent || ![.05, .025, .0125].includes(stepS)) throw Error('请先完成离台段，再继续上升。');
    this.vehicle = compileVehicle(config); this.stepS = stepS;
    if (handoff.fuelKg <= 0 || handoff.fuelKg > this.vehicle.stages[0].fuelKg || Math.abs(handoff.massKg - (this.vehicle.wetKg - this.vehicle.stages[0].fuelKg + handoff.fuelKg)) > 1e-5) throw Error('离台状态与载具配置不匹配。');
    const fixed = add(SITE_FIXED, scale(SITE_UP, handoff.heightM + LIFTOFF.padHeightM));
    const position = rotateEarth(fixed, handoff.time), velocity = add(rotateEarth(scale(SITE_UP, handoff.speedMS), handoff.time), airVelocity(position));
    this.particle = { position, velocity, fuel: handoff.fuelKg }; this.nextTrailTime = handoff.time;
    this.state = { ...handoff, events: handoff.events.map(e => ({ ...e })), phase: 'ascent', message: '沿用离台状态，向东辅助转弯；一级燃尽后暂停等待分离。', ascent: { position, velocity, direction: rotateEarth(SITE_UP, handoff.time), fixedPosition: fixed, fixedDirection: [...SITE_UP], stage: 0, boosterFuelKg: handoff.fuelKg, upperFuelKg: this.vehicle.stages[1].fuelKg, altitudeM: handoff.heightM + LIFTOFF.padHeightM, horizontalMS: 0, airSpeedMS: handoff.speedMS, density: 0, pressurePa: 0, dynamicPressurePa: 0, pitchDeg: 90, trail: [fixed] } };
    this.event('继续三维上升，启用地球自转与向东姿态辅助'); this.refresh();
  }
  get running() { return ['ascent', 'separating', 'upper-burn'].includes(this.state.phase); }
  private event(label: string) { this.state.events.push({ time: this.state.time, label }); }
  private model(): AscentModel {
    const stage = this.state.ascent!.stage, part = this.vehicle.stages[stage];
    return { dry: stage === 0 ? this.vehicle.wetKg - part.fuelKg : part.dryKg + this.vehicle.payloadKg + this.vehicle.fairingKg,
      motor: { flow: part.massFlowKgS, sea: part.ispSeaS, vacuum: part.ispVacuumS }, cdArea: LIFTOFF.cd * LIFTOFF.areaM2 };
  }
  private throttleAt = (time: number) => this.state.ascent!.stage === 0 ? 1 : Math.max(0, Math.min(1, (time - this.separationTime - ASCENT.separationWaitS) / 2));
  private refresh() {
    const s = this.state, a = s.ascent!, force = ascentForces(this.particle, this.model(), s.time, this.throttleAt(s.time));
    s.heightM = force.height - LIFTOFF.padHeightM; s.speedMS = dot(force.relative, force.up); s.massKg = force.mass;
    s.fuelKg = a.stage === 0 ? this.particle.fuel : 0; s.throttle = this.particle.fuel > 0 ? this.throttleAt(s.time) : 0;
    s.thrustN = force.thrust; s.weightN = force.mass * LAUNCH_EARTH.gmM3S2 / norm(this.particle.position) ** 2;
    s.dragN = force.drag; s.accelerationMS2 = dot(force.acceleration, force.up);
    Object.assign(a, { position: [...this.particle.position], velocity: [...this.particle.velocity], direction: force.direction, fixedPosition: rotateEarth(this.particle.position, -s.time), fixedDirection: rotateEarth(force.direction, -s.time), altitudeM: force.height, horizontalMS: Math.sqrt(Math.max(0, force.airSpeed ** 2 - s.speedMS ** 2)), airSpeedMS: force.airSpeed, density: force.density, pressurePa: force.pressurePa, dynamicPressurePa: .5 * force.density * force.airSpeed ** 2, pitchDeg: force.pitchDeg });
    if (a.stage === 0) a.boosterFuelKg = this.particle.fuel; else a.upperFuelKg = this.particle.fuel;
    if (this.detached) a.detached = { position: [...this.detached.position], velocity: [...this.detached.velocity], fixedPosition: rotateEarth(this.detached.position, -s.time), fixedDirection: rotateEarth(this.detachedDirection!, -s.time), massKg: this.vehicle.stages[0].dryKg };
  }
  separate() {
    const s = this.state, a = s.ascent!; if (s.phase !== 'stage-ready') return;
    const boosterMass = this.vehicle.stages[0].dryKg, upperMass = s.massKg - boosterMass, beforeMass = s.massKg, velocity = [...this.particle.velocity] as V3;
    const split = separateMomentum(velocity, a.direction, upperMass, boosterMass);
    this.detached = { position: [...this.particle.position], velocity: split.booster, fuel: 0 }; this.detachedDirection = [...a.direction];
    this.particle.velocity = split.upper; this.particle.fuel = this.vehicle.stages[1].fuelKg; a.stage = 1;
    a.separation = { time: s.time, beforeMassKg: beforeMass, upperMassKg: upperMass, boosterMassKg: boosterMass, relativeSpeedMS: norm(add(split.upper, scale(split.booster, -1))), momentumError: norm(add(add(scale(split.upper, upperMass), scale(split.booster, boosterMass)), scale(velocity, -beforeMass))) };
    this.separationTime = s.time; s.phase = 'separating'; s.message = '一级已分离，3 秒后启动二级；分离相对速度为教学设定 2 m/s。'; this.event('分离一级，保留总质量与总动量'); this.refresh();
  }
  private fail(message: string) { this.state.phase = 'ascent-failed'; this.state.message = message; this.event(message); }
  step() {
    if (!this.running) return;
    this.stepsTaken++;
    const s = this.state, a = s.ascent!, model = this.model(); let dt = this.stepS;
    // Split exact depletion even when total burn duration is not an integer multiple of the step.
    if (this.throttleAt(s.time) === 1) dt = Math.min(dt, this.particle.fuel / model.motor!.flow);
    const ignition = this.separationTime + ASCENT.separationWaitS, endRamp = ignition + 2, review = ignition + ASCENT.upperReviewS;
    for (const eventTime of [ignition, endRamp, review]) if (eventTime > s.time + 1e-8) dt = Math.min(dt, eventTime - s.time);
    if (dt > 1e-10) {
      this.particle = integrateAscent(this.particle, model, s.time, dt, this.throttleAt);
      if (this.detached) this.detached = integrateAscent(this.detached, { dry: this.vehicle.stages[0].dryKg, cdArea: .7 * Math.PI * 1.85 ** 2 }, s.time, dt, () => 0);
      s.time += dt;
    }
    this.refresh();
    if (s.time >= this.nextTrailTime) { a.trail.push([...a.fixedPosition]); this.nextTrailTime = s.time + 1; }
    if (a.altitudeM < 0 || !Number.isFinite(norm(a.position)) || s.time > ASCENT.maxTimeS || (s.speedMS < -5 && a.altitudeM < 10000)) { this.fail('上升未完成，已冻结状态。当前配置或引导不足；请重置检查。'); return; }
    if (a.stage === 0 && this.particle.fuel < 1e-6) {
      this.particle.fuel = 0; this.refresh(); s.phase = 'stage-ready'; s.message = '一级燃尽，模拟暂停；检查参数后执行一级分离。'; this.event('一级燃尽，暂停等待分离');
    } else if (a.stage === 1 && this.particle.fuel < 1e-6) this.fail('二级推进剂提前耗尽，已冻结；未判定入轨。');
    else if (s.phase === 'separating' && s.time >= ignition - 1e-8) { s.phase = 'upper-burn'; s.message = '二级点火，继续向东加速；30 秒后暂停复查。'; this.event('二级点火，建立推力'); }
    else if (a.stage === 1 && s.time >= review - 1e-8) { s.phase = 'ascent-complete'; s.message = '二级点火后 30 秒检查点，模拟已冻结；尚未执行关机或入轨判定。'; this.event('上升分级段完成，冻结复查'); }
  }
  snapshot(): FlightState { return structuredClone(this.state); }
}
export class AscentClock {
  paused = false; rate = 1; private debt = 0;
  constructor(readonly simulation: AscentSimulation) {}
  pause(value: boolean) { this.paused = value; this.debt = 0; }
  setRate(value: number) { if (![1, 4, 10].includes(value)) throw Error('不支持的倍率'); this.rate = value; this.debt = 0; }
  advance(seconds: number, onStep?: (state: FlightState) => void) {
    if (this.paused || !this.simulation.running || !Number.isFinite(seconds) || seconds <= 0) return;
    this.debt += Math.min(seconds, .25) * this.rate;
    let budget = 60;
    while (this.debt + 1e-9 >= this.simulation.stepS && budget-- > 0 && this.simulation.running) { this.simulation.step(); onStep?.(this.simulation.state); this.debt -= this.simulation.stepS; }
    if (!this.simulation.running) this.debt = 0; else this.debt = Math.min(this.debt, .25 * this.rate);
  }
}
