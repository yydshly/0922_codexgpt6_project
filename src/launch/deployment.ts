import { add, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, surfaceAt, unit, type Particle, type V3 } from './ascent';
import { meetsOrbitTarget, orbitalElements, type OrbitElements } from './orbitInsertion';
import { LIFTOFF, type FlightState } from './liftoff';
import { compileVehicle, type VehicleConfig } from './vehicle';
import { LAUNCH_EARTH } from '../data/launchMission';

export const DEPLOYMENT = { version: 'deployment-0.1', stepS: .25, relativeSpeedMS: .5, centerSpacingM: 11, carrierModelCenterM: 43, verificationS: 120, observationLimitS: 7200 } as const;
export type DeploymentPhase = 'deployment-ready' | 'deployment-open' | 'deploying' | 'deployment-complete' | 'deployed-coast' | 'deployment-ended' | 'deployment-failed';
export interface MissionBody { position: V3; velocity: V3; fixedPosition: V3; massKg: number; elements: OrbitElements; altitudeM: number }
export interface DeploymentTelemetry {
  carrier: MissionBody; satellite: MissionBody; direction: V3; fairingOpen: boolean; released: boolean;
  releaseTime: number | null; release?: { beforeMassKg: number; carrierMassKg: number; satelliteMassKg: number; momentumError: number; centerErrorM: number; relativeSpeedMS: number; springEnergyJ: number };
  separationM: number; relativeSpeedMS: number; elapsedS: number; verified: boolean; panels: number;
  satelliteTrail: V3[];
}
export function splitPayload(position: V3, velocity: V3, direction: V3, totalMass: number, payloadMass: number) {
  const carrierMass = totalMass - payloadMass, reducedMass = payloadMass * carrierMass / totalMass, impulse = reducedMass * DEPLOYMENT.relativeSpeedMS;
  return { carrierPosition: add(position, scale(direction, -DEPLOYMENT.centerSpacingM * payloadMass / totalMass)),
    satellitePosition: add(position, scale(direction, DEPLOYMENT.centerSpacingM * carrierMass / totalMass)),
    carrierVelocity: add(velocity, scale(direction, -impulse / carrierMass)), satelliteVelocity: add(velocity, scale(direction, impulse / payloadMass)),
    carrierMass, impulse, springEnergyJ: .5 * reducedMass * DEPLOYMENT.relativeSpeedMS ** 2 };
}
export class DeploymentSimulation {
  state: FlightState; stepsTaken = 0; readonly stepS = DEPLOYMENT.stepS;
  private carrier: Particle; private satellite: Particle; private nextTrailTime: number;
  private vehicle: ReturnType<typeof compileVehicle>; private carrierMass: number;
  constructor(config: VehicleConfig, handoff: FlightState) {
    if (handoff.phase !== 'orbit-complete' || !handoff.orbit?.targetHeld || handoff.orbit.coastAngleRad < 2 * Math.PI || !handoff.ascent || !meetsOrbitTarget(handoff.orbit.elements)) throw Error('请先通过第 5 步的一圈入轨验证。');
    this.vehicle = compileVehicle(config); this.carrierMass = this.vehicle.stages[1].dryKg + this.vehicle.fairingKg + handoff.ascent.upperFuelKg;
    if (Math.abs(this.carrierMass + this.vehicle.payloadKg - handoff.massKg) > 1e-5) throw Error('任务质量与载具配置不匹配。');
    this.state = structuredClone(handoff); this.state.phase = 'deployment-ready';
    const a = handoff.ascent, direction = unit(a.velocity), parts = splitPayload(a.position, a.velocity, direction, handoff.massKg, this.vehicle.payloadKg);
    this.carrier = { position: parts.carrierPosition, velocity: [...a.velocity], fuel: a.upperFuelKg };
    this.satellite = { position: parts.satellitePosition, velocity: [...a.velocity], fuel: 0 }; this.nextTrailTime = handoff.time;
    const body = (p: Particle, massKg: number): MissionBody => ({ position: [...p.position], velocity: [...p.velocity], fixedPosition: rotateEarth(p.position, -handoff.time), massKg, elements: orbitalElements(p.position, p.velocity), altitudeM: surfaceAt(p.position).height });
    this.state.deployment = { carrier: body(this.carrier, this.carrierMass), satellite: body(this.satellite, this.vehicle.payloadKg), direction, fairingOpen: false, released: false, releaseTime: null, separationM: DEPLOYMENT.centerSpacingM, relativeSpeedMS: 0, elapsedS: 0, verified: false, panels: 0, satelliteTrail: [] };
    this.state.message = '入轨已验证。先打开教学铰接载荷舱，再释放卫星；当前两者仍连接，时间暂停。'; this.event('进入第 6 步，载荷仍与二级连接');
  }
  get running() { return ['deploying', 'deployed-coast'].includes(this.state.phase); }
  private event(label: string) { this.state.events.push({ time: this.state.time, label }); }
  openFairing() { if (this.state.phase !== 'deployment-ready') return; this.state.deployment!.fairingOpen = true; this.state.phase = 'deployment-open'; this.state.message = '载荷舱已打开，外罩仍铰接在二级上，质量不变。确认后释放卫星。'; this.event('打开教学铰接外罩，保留 600 kg 外罩质量'); }
  deploy() {
    if (this.state.phase !== 'deployment-open') return;
    const s = this.state, d = s.deployment!, beforeMass = s.massKg, beforePosition = s.ascent!.position, beforeVelocity = s.ascent!.velocity;
    const split = splitPayload(beforePosition, beforeVelocity, d.direction, beforeMass, this.vehicle.payloadKg);
    this.carrier.velocity = split.carrierVelocity; this.satellite.velocity = split.satelliteVelocity;
    d.released = true; d.releaseTime = s.time;
    d.release = { beforeMassKg: beforeMass, carrierMassKg: this.carrierMass, satelliteMassKg: this.vehicle.payloadKg,
      momentumError: norm(add(add(scale(this.carrier.velocity, this.carrierMass), scale(this.satellite.velocity, this.vehicle.payloadKg)), scale(beforeVelocity, -beforeMass))),
      centerErrorM: norm(add(scale(add(scale(this.carrier.position, this.carrierMass), scale(this.satellite.position, this.vehicle.payloadKg)), 1 / beforeMass), scale(beforePosition, -1))),
      relativeSpeedMS: norm(add(this.satellite.velocity, scale(this.carrier.velocity, -1))), springEnergyJ: split.springEnergyJ };
    s.phase = 'deploying'; s.message = '卫星已成为独立对象。弹簧赋予两者相反冲量；接下来观察 120 秒，太阳翼按任务时间展开。';
    this.event('释放 E01-SAT 卫星：相对分离速度 0.5 m/s，二级保留剩余燃料'); this.refresh();
  }
  continueObservation() { if (this.state.phase !== 'deployment-complete') return; this.state.phase = 'deployed-coast'; this.state.message = '两对象继续独立绕地运行；本段观察最多到释放后 2 小时，可随时暂停或保存。'; this.event('继续在轨观察'); }
  private refresh() {
    const s = this.state, a = s.ascent!, d = s.deployment!;
    for (const [p, body] of [[this.carrier, d.carrier], [this.satellite, d.satellite]] as const) Object.assign(body, { position: [...p.position], velocity: [...p.velocity], fixedPosition: rotateEarth(p.position, -s.time), elements: orbitalElements(p.position, p.velocity), altitudeM: surfaceAt(p.position).height });
    const force = ascentForces(this.carrier, { dry: this.carrierMass - this.carrier.fuel, cdArea: LIFTOFF.cd * LIFTOFF.areaM2 }, s.time, 0);
    Object.assign(a, { position: [...this.carrier.position], velocity: [...this.carrier.velocity], fixedPosition: rotateEarth(this.carrier.position, -s.time), direction: [...d.direction], fixedDirection: rotateEarth(d.direction, -s.time), altitudeM: force.height,
      airSpeedMS: force.airSpeed, horizontalMS: Math.sqrt(Math.max(0, force.airSpeed ** 2 - dot(force.relative, force.up) ** 2)), density: force.density, pressurePa: force.pressurePa, dynamicPressurePa: .5 * force.density * force.airSpeed ** 2, pitchDeg: Math.asin(Math.max(-1, Math.min(1, dot(d.direction, force.up)))) * 180 / Math.PI });
    Object.assign(s, { massKg: this.carrierMass, thrustN: 0, throttle: 0, heightM: force.height - LIFTOFF.padHeightM, speedMS: dot(force.relative, force.up), dragN: force.drag, weightN: this.carrierMass * LAUNCH_EARTH.gmM3S2 / norm(this.carrier.position) ** 2, accelerationMS2: dot(force.acceleration, force.up) });
    s.orbit!.elements = d.carrier.elements;
    d.separationM = norm(add(this.satellite.position, scale(this.carrier.position, -1))); d.relativeSpeedMS = norm(add(this.satellite.velocity, scale(this.carrier.velocity, -1)));
    d.elapsedS = s.time - d.releaseTime!; d.panels = Math.max(0, Math.min(1, (d.elapsedS - 10) / 12));
  }
  step() {
    if (!this.running) return; this.stepsTaken++;
    const s = this.state, d = s.deployment!;
    this.carrier = integrateAscent(this.carrier, { dry: this.carrierMass - this.carrier.fuel, cdArea: LIFTOFF.cd * LIFTOFF.areaM2 }, s.time, this.stepS, () => 0);
    this.satellite = integrateAscent(this.satellite, { dry: this.vehicle.payloadKg, cdArea: 2.2 * 2 }, s.time, this.stepS, () => 0);
    s.time += this.stepS; this.refresh();
    if (s.time >= this.nextTrailTime) { s.ascent!.trail.push([...d.carrier.fixedPosition]); d.satelliteTrail.push([...d.satellite.fixedPosition]); if (s.ascent!.trail.length > 800) s.ascent!.trail.shift(); if (d.satelliteTrail.length > 800) d.satelliteTrail.shift(); this.nextTrailTime = s.time + 10; }
    if ([d.carrier, d.satellite].some(b => !Number.isFinite(norm(b.position)) || b.altitudeM < 80000 || !b.elements.bound)) { s.phase = 'deployment-failed'; s.message = '独立飞行状态超出本段范围，已暂停；不继续模拟再入或逃逸。'; this.event(s.message); }
    else if (s.phase === 'deploying' && d.elapsedS >= DEPLOYMENT.verificationS) {
      d.verified = d.satellite.elements.periapsisM > 80000 && d.carrier.elements.periapsisM > 80000 && d.separationM > DEPLOYMENT.centerSpacingM;
      s.phase = d.verified ? 'deployment-complete' : 'deployment-failed'; s.message = d.verified ? '卫星和二级已独立飞行 120 秒，部署检查通过，当前暂停。可保存飞行、观察卫星近景或返回全景。' : '独立飞行检查未通过，当前暂停，请查看各自轨道。'; this.event(s.message);
    } else if (d.elapsedS >= DEPLOYMENT.observationLimitS) { s.phase = 'deployment-ended'; s.message = '已到释放后 2 小时的本段观察上限；保留在轨状态，可保存或回看事件。'; this.event(s.message); }
  }
  snapshot(): FlightState { return structuredClone(this.state); }
}
export class DeploymentClock {
  paused = false; rate = 1; private debt = 0;
  constructor(readonly simulation: DeploymentSimulation) {}
  pause(value: boolean) { this.paused = value; this.debt = 0; }
  setRate(value: number) { if (![1, 10, 100].includes(value)) throw Error('不支持的在轨倍率'); this.rate = value; this.debt = 0; }
  advance(seconds: number) {
    if (this.paused || !this.simulation.running || !Number.isFinite(seconds) || seconds <= 0) return;
    this.debt += Math.min(seconds, .25) * this.rate; let budget = 120;
    while (this.debt + 1e-9 >= this.simulation.stepS && budget-- > 0 && this.simulation.running) { this.simulation.step(); this.debt -= this.simulation.stepS; }
    this.debt = this.simulation.running ? Math.min(this.debt, Math.max(this.simulation.stepS, .25 * this.rate)) : 0;
  }
}
