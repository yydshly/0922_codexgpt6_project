import { DEORBIT, DEORBIT_RUNNING, createDeorbitPlan, initializeDeorbit, deorbitModel, deorbitThrottle, deorbitForces, deorbitSample, advancePassivation, type DeorbitPhase, type DeorbitTelemetry } from './deorbit';
import { add, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, surfaceAt, unit, type Particle, type V3 } from './ascent';
import { meetsOrbitTarget, orbitalElements, type OrbitElements } from './orbitInsertion';
import { LIFTOFF, type FlightState } from './liftoff';
import { compileVehicle, type VehicleConfig } from './vehicle';
import { LAUNCH_EARTH } from '../data/launchMission';
import { AVOIDANCE, AVOIDANCE_RUNNING, avoidanceDirection, avoidanceThrottle, carrierCoastModel, createAvoidancePlan, maneuverModel, separationSample, type AvoidancePhase, type AvoidanceTelemetry } from './avoidance';

export const DEPLOYMENT = { version: 'deployment-0.1', stepS: .25, relativeSpeedMS: .5, centerSpacingM: 11, carrierModelCenterM: 43, verificationS: 120, observationLimitS: 7200 } as const;
export type DeploymentPhase = 'deployment-ready' | 'deployment-open' | 'deploying' | 'deployment-complete' | 'deployed-coast' | 'deployment-ended' | 'deployment-failed' | AvoidancePhase | DeorbitPhase;
export interface MissionBody { position: V3; velocity: V3; fixedPosition: V3; massKg: number; elements: OrbitElements; altitudeM: number }
export interface DeploymentTelemetry {
  carrier: MissionBody; satellite: MissionBody; direction: V3; fairingOpen: boolean; released: boolean;
  releaseTime: number | null; release?: { beforeMassKg: number; carrierMassKg: number; satelliteMassKg: number; momentumError: number; centerErrorM: number; relativeSpeedMS: number; springEnergyJ: number };
  separationM: number; relativeSpeedMS: number; elapsedS: number; verified: boolean; panels: number;
  satelliteTrail: V3[];
  avoidance?: AvoidanceTelemetry;
  deorbit?: DeorbitTelemetry;
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
  constructor(private config: VehicleConfig, handoff: FlightState) {
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
  get running() { return ['deploying', 'deployed-coast', ...AVOIDANCE_RUNNING, ...DEORBIT_RUNNING].includes(this.state.phase); }
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
  analyzeAvoidance() {
    if (!['deployment-complete', 'deployed-coast', 'deployment-ended'].includes(this.state.phase) || this.state.deployment!.avoidance?.started) throw Error('请在部署检查通过后、尚未执行避让时分析。');
    const plan = createAvoidancePlan(this.config, this.state), d = this.state.deployment!;
    d.avoidance = { plan, shadow: structuredClone(this.carrier), started: false, elapsedS: 0, fuelUsedKg: 0, actual: [], nextSampleS: 0, baselineDistanceM: d.separationM, velocityDifferenceMS: 0 };
    this.state.phase = 'avoidance-review'; this.state.message = plan.allowed ? '已计算保持滑行与侧向机动的 15 分钟对照。时间冻结；先查看条件与图表，再决定是否演示。' : '方案条件未满足，未开放执行。查看原因后可返回原在轨观察。'; this.event('计算二级避让对照，尚未点火');
  }
  skipAvoidance() { if (this.state.phase !== 'avoidance-review') throw Error('只有执行前可以返回。'); delete this.state.deployment!.avoidance; this.state.phase = 'deployment-complete'; this.state.message = '未执行机动，原在轨状态保留；可继续观察。'; this.event('返回部署观察，未执行避让'); }
  alignAvoidance() {
    const p = this.state.deployment?.avoidance;
    if (this.state.phase !== 'avoidance-review' || !p?.plan.allowed) throw Error('请先生成满足条件的避让方案。');
    p.started = true; this.state.phase = 'avoidance-align'; this.state.message = '用 12 秒理想姿态辅助转向轨道面法向，发动机保持关闭；卫星独立滑行。'; this.event('开始辅助侧向转向：只改变二级显示指向，未模拟姿态力矩'); this.refresh();
  }
  igniteAvoidance() {
    const p = this.state.deployment?.avoidance;
    if (this.state.phase !== 'avoidance-armed' || !p || this.carrier.fuel < p.plan.fuelRequiredKg + 1) throw Error('二级尚未对准或剩余燃料不足。');
    this.state.phase = 'avoidance-burn'; this.state.message = '二级再次点火：1 秒建立、4 秒保持、1 秒关断，2% 教学节流；推力、燃料与轨道共同计算。'; this.event('开始 6 秒侧向点火，卫星不施加推力'); this.refresh();
  }
  observeAvoidance() { if (this.state.phase !== 'avoidance-cutoff') throw Error('请先完成侧向点火。'); this.state.phase = 'avoidance-coast'; this.state.message = '二级已关机，两对象继续滑行；观察至分析起点后 15 分钟，与保持滑行的假设对照。'; this.event('继续验证避让后的相对运动'); }
  analyzeDeorbit() {
    if (this.state.deployment!.deorbit) throw Error('离轨方案已存在。');
    const plan = createDeorbitPlan(this.config, this.state);
    this.state.deployment!.deorbit = initializeDeorbit(plan); this.state.phase = 'deorbit-review';
    this.state.message = plan.allowed ? '已计算反向点火与燃料预算。先核对当前高度和预测近地点，再执行。' : '离轨方案未满足条件，执行未解锁；可返回原分离结果。'; this.event('计算离轨方案，尚未执行');
  }
  skipDeorbit() { if (this.state.phase !== 'deorbit-review') throw Error('只能在执行前返回。'); delete this.state.deployment!.deorbit; this.state.phase = 'avoidance-complete'; this.state.message = '已返回分离结果，未改变飞行状态。'; this.event('暂不执行离轨'); }
  alignDeorbit() {
    const q = this.state.deployment?.deorbit;
    if (this.state.phase !== 'deorbit-review' || !q?.plan.allowed || q.restartLocked) throw Error('离轨前提尚未满足。');
    q.started = true; this.state.phase = 'deorbit-align'; this.state.message = '12 秒理想姿态辅助，将二级指向分析起点速度的反方向；发动机关机。'; this.event('开始反向对准，姿态控制为理想辅助'); this.refresh();
  }
  igniteDeorbit() {
    const q = this.state.deployment?.deorbit;
    if (this.state.phase !== 'deorbit-armed' || !q || q.restartLocked || this.carrier.fuel < q.plan.fuelRequiredKg + 1) throw Error('未对准、燃料不足或已锁定重启。');
    this.state.phase = 'deorbit-burn'; this.state.message = '二级反向点火，降低轨道能量与预测近地点；卫星仍独立运行。'; this.event('执行有限时长离轨点火'); this.refresh();
  }
  passivateDeorbit() {
    const q = this.state.deployment?.deorbit;
    if (this.state.phase !== 'deorbit-cutoff' || !q?.cutoffVerified || q.restartLocked) throw Error('请先通过离轨关机检查。');
    q.restartLocked = true; q.passivationStart = this.state.time; q.passivationFuelKg = this.carrier.fuel;
    this.state.phase = 'deorbit-passivating'; this.state.message = '发动机重启已锁定。对称排放剩余推进剂与增压气体，并通过负载放电；数值为简化教学库存。'; this.event('开始钝化：锁定重启、开启对称泄放与放电');
  }
  private refresh() {
    const s = this.state, a = s.ascent!, d = s.deployment!;
    for (const [p, body] of [[this.carrier, d.carrier], [this.satellite, d.satellite]] as const) Object.assign(body, { position: [...p.position], velocity: [...p.velocity], fixedPosition: rotateEarth(p.position, -s.time), elements: orbitalElements(p.position, p.velocity), altitudeM: surfaceAt(p.position).height });
    const force = ascentForces(this.carrier, { dry: this.carrierMass - this.carrier.fuel, cdArea: LIFTOFF.cd * LIFTOFF.areaM2 }, s.time, 0);
    Object.assign(a, { position: [...this.carrier.position], velocity: [...this.carrier.velocity], fixedPosition: rotateEarth(this.carrier.position, -s.time), direction: [...d.direction], fixedDirection: rotateEarth(d.direction, -s.time), altitudeM: force.height,
      airSpeedMS: force.airSpeed, horizontalMS: Math.sqrt(Math.max(0, force.airSpeed ** 2 - dot(force.relative, force.up) ** 2)), density: force.density, pressurePa: force.pressurePa, dynamicPressurePa: .5 * force.density * force.airSpeed ** 2, pitchDeg: Math.asin(Math.max(-1, Math.min(1, dot(d.direction, force.up)))) * 180 / Math.PI });
    Object.assign(s, { massKg: this.carrierMass, thrustN: 0, throttle: 0, heightM: force.height - LIFTOFF.padHeightM, speedMS: dot(force.relative, force.up), dragN: force.drag, weightN: this.carrierMass * LAUNCH_EARTH.gmM3S2 / norm(this.carrier.position) ** 2, accelerationMS2: dot(force.acceleration, force.up) });
    if (d.avoidance?.started && !d.deorbit) {
      const p = d.avoidance, elapsed = s.time - p.plan.startTime;
      const model = maneuverModel(this.config, p.plan), throttle = avoidanceThrottle(elapsed);
      const current = ascentForces(this.carrier, model, s.time, throttle);
      const direction = avoidanceDirection(p.plan, elapsed);
      d.carrier.massKg = current.mass;
      Object.assign(a, { upperFuelKg: this.carrier.fuel, direction, fixedDirection: rotateEarth(direction, -s.time), pitchDeg: Math.asin(Math.max(-1, Math.min(1, dot(direction, current.up)))) * 180 / Math.PI });
      Object.assign(s, { massKg: current.mass, thrustN: current.thrust, throttle, weightN: current.mass * LAUNCH_EARTH.gmM3S2 / norm(this.carrier.position) ** 2, accelerationMS2: dot(current.acceleration, current.up) });
      p.elapsedS = elapsed; p.fuelUsedKg = p.plan.startFuelKg - this.carrier.fuel;
      p.baselineDistanceM = norm(add(this.satellite.position, scale(p.shadow.position, -1)));
      p.velocityDifferenceMS = norm(add(this.carrier.velocity, scale(p.shadow.velocity, -1)));
      if (elapsed + 1e-8 >= p.nextSampleS) { p.actual.push(separationSample(elapsed, this.carrier.position, this.satellite.position, p.plan.along, p.plan.direction)); p.nextSampleS += AVOIDANCE.sampleS; }
    }
    const q = d.deorbit;
    if (q?.started) {
      const current = deorbitForces(this.config, this.carrier, q, s.time), direction = current.direction;
      d.carrier.massKg = current.mass; q.elapsedS = s.time - q.plan.startTime;
      if (q.passivationStart === null) q.fuelBurnedKg = q.plan.startFuelKg - this.carrier.fuel;
      Object.assign(a, { upperFuelKg: this.carrier.fuel, direction, fixedDirection: rotateEarth(direction, -s.time), pitchDeg: Math.asin(Math.max(-1, Math.min(1, dot(direction, current.up)))) * 180 / Math.PI });
      Object.assign(s, { massKg: current.mass, thrustN: current.thrust, throttle: q.restartLocked ? 0 : deorbitThrottle(q.elapsedS, q.plan.burnS), weightN: current.mass * LAUNCH_EARTH.gmM3S2 / norm(this.carrier.position) ** 2, accelerationMS2: dot(current.acceleration, current.up) });
      if (q.passivationStart === null) q.actual.push(deorbitSample(q.elapsedS, this.carrier));
    }
    s.orbit!.elements = d.carrier.elements;
    d.separationM = norm(add(this.satellite.position, scale(this.carrier.position, -1))); d.relativeSpeedMS = norm(add(this.satellite.velocity, scale(this.carrier.velocity, -1)));
    d.elapsedS = s.time - d.releaseTime!; d.panels = Math.max(0, Math.min(1, (d.elapsedS - 10) / 12));
  }
  step() {
    if (!this.running) return; this.stepsTaken++;
    const s = this.state, d = s.deployment!;
    const p = d.avoidance, q = d.deorbit;
    if (q?.started) {
      this.carrier = q.passivationStart !== null ? advancePassivation(this.carrier, q, s.time, this.stepS) : integrateAscent(this.carrier, deorbitModel(this.config, q.plan), s.time, this.stepS, time => deorbitThrottle(time - q.plan.startTime, q.plan.burnS));
    } else if (p?.started) {
      this.carrier = integrateAscent(this.carrier, maneuverModel(this.config, p.plan), s.time, this.stepS, time => avoidanceThrottle(time - p.plan.startTime));
      p.shadow = integrateAscent(p.shadow, carrierCoastModel(p.plan.startMassKg - p.plan.startFuelKg), s.time, this.stepS, () => 0);
    } else this.carrier = integrateAscent(this.carrier, { dry: this.carrierMass - this.carrier.fuel, cdArea: LIFTOFF.cd * LIFTOFF.areaM2 }, s.time, this.stepS, () => 0);
    this.satellite = integrateAscent(this.satellite, { dry: this.vehicle.payloadKg, cdArea: 2.2 * 2 }, s.time, this.stepS, () => 0);
    s.time += this.stepS; this.refresh();
    if (s.time >= this.nextTrailTime) { s.ascent!.trail.push([...d.carrier.fixedPosition]); d.satelliteTrail.push([...d.satellite.fixedPosition]); if (s.ascent!.trail.length > 800) s.ascent!.trail.shift(); if (d.satelliteTrail.length > 800) d.satelliteTrail.shift(); this.nextTrailTime = s.time + 10; }
    if ([d.carrier, d.satellite].some(b => !Number.isFinite(norm(b.position)) || b.altitudeM < 80000 || !b.elements.bound)) { s.phase = q ? 'deorbit-failed' : 'deployment-failed'; s.message = '独立飞行状态超出本段范围，已暂停；不继续模拟再入或逃逸。'; this.event(s.message); }
    else if (s.phase === 'deploying' && d.elapsedS >= DEPLOYMENT.verificationS) {
      d.verified = d.satellite.elements.periapsisM > 80000 && d.carrier.elements.periapsisM > 80000 && d.separationM > DEPLOYMENT.centerSpacingM;
      s.phase = d.verified ? 'deployment-complete' : 'deployment-failed'; s.message = d.verified ? '卫星和二级已独立飞行 120 秒，部署检查通过，当前暂停。可保存飞行、观察卫星近景或返回全景。' : '独立飞行检查未通过，当前暂停，请查看各自轨道。'; this.event(s.message);
    } else if (s.phase === 'avoidance-align' && p!.elapsedS >= AVOIDANCE.alignS - 1e-8) { s.phase = 'avoidance-armed'; s.message = '二级已对准侧向，时间冻结。卫星保持原姿态示意；确认后点击“执行 6 秒点火”。'; this.event('侧向对准完成，等待点火'); }
    else if (s.phase === 'avoidance-burn' && p!.elapsedS >= AVOIDANCE.alignS + AVOIDANCE.burnS - 1e-8) { s.phase = 'avoidance-cutoff'; s.message = '避让点火完成，发动机关机并冻结。先核对消耗，再继续 15 分钟内的滑行对照。'; this.event('侧向点火完成，关机检查'); }
    else if (s.phase === 'avoidance-coast' && p!.elapsedS >= AVOIDANCE.horizonS - 1e-8) { s.phase = 'avoidance-complete'; s.message = '15 分钟对照观察完成，状态冻结。此结果仅描述本模型和本时段；二级仍在轨，尚未离轨处置。'; this.event('完成有限时段避让对照'); }
    else if (s.phase === 'deorbit-align' && q!.elapsedS >= DEORBIT.alignS - 1e-8) { s.phase = 'deorbit-armed'; s.message = '反向对准完成，当前冻结；发动机仍未点火。'; this.event('反向对准完成'); }
    else if (s.phase === 'deorbit-burn' && q!.elapsedS >= DEORBIT.alignS + q!.plan.burnS - 1e-8) {
      q!.cutoffVerified = d.carrier.elements.periapsisM >= 30000 && d.carrier.elements.periapsisM <= 70000 && d.satellite.elements.periapsisM > 80000 && d.separationM > 1000;
      s.phase = q!.cutoffVerified ? 'deorbit-cutoff' : 'deorbit-failed'; s.message = q!.cutoffVerified ? '离轨点火已结束并冻结：近地点已降低，但二级仍在高空。确认最后机动完成后才能钝化。' : '离轨结果未满足目标，保留箭体与剩余推进剂，未执行钝化。'; this.event(s.message);
    }
    else if (s.phase === 'deorbit-passivating' && q!.passivationElapsedS >= DEORBIT.passivateS - 1e-8) {
      const complete = this.carrier.fuel <= q!.passivationFuelKg * .003 && q!.pressurePa < 100000 && q!.batteryJ === 0 && q!.restartLocked;
      s.phase = complete ? 'deorbit-complete' : 'deorbit-failed'; s.message = complete ? '简化钝化步骤完成：仍保留少量推进剂残留，重启已锁定。二级与卫星没有消失；本段冻结，尚未计算再入或烧毁。' : '剩余能量检查未通过，状态冻结，不能标记处置完成。'; this.event(s.message);
    }
    else if (d.elapsedS >= DEPLOYMENT.observationLimitS) { s.phase = 'deployment-ended'; s.message = '已到释放后 2 小时的本段观察上限；保留在轨状态，可保存或回看事件。'; this.event(s.message); }
  }
  snapshot(): FlightState { return structuredClone(this.state); }
}
export class DeploymentClock {
  paused = false; rate = 1; private debt = 0;
  constructor(readonly simulation: DeploymentSimulation) {}
  pause(value: boolean) { this.paused = value; this.debt = 0; }
  setRate(value: number) { if (![1, 10, 100].includes(value)) throw Error('不支持的在轨倍率'); if (value !== 1 && ['avoidance-align', 'avoidance-burn', 'deorbit-align', 'deorbit-burn'].includes(this.simulation.state.phase)) throw Error('转向和点火使用 1 倍速，滑行时可加速。'); this.rate = value; this.debt = 0; }
  advance(seconds: number) {
    if (this.paused || !this.simulation.running || !Number.isFinite(seconds) || seconds <= 0) return;
    this.debt += Math.min(seconds, .25) * this.rate; let budget = 120;
    while (this.debt + 1e-9 >= this.simulation.stepS && budget-- > 0 && this.simulation.running) { this.simulation.step(); this.debt -= this.simulation.stepS; }
    this.debt = this.simulation.running ? Math.min(this.debt, Math.max(this.simulation.stepS, .25 * this.rate)) : 0;
  }
}
