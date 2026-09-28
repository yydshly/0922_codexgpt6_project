import { add, dot, integrateAscent, norm, scale, surfaceAt, unit, type AscentModel, type Particle, type V3 } from './ascent';
import { cross, orbitalElements } from './orbitInsertion';
import { LIFTOFF, type FlightState } from './liftoff';
import { compileVehicle, STANDARD_GRAVITY, type VehicleConfig } from './vehicle';

/** A bounded teaching manoeuvre, not a real engine operating envelope or a collision-risk service. */
export const AVOIDANCE = { version: 'avoidance-0.1', alignS: 12, burnS: 6, rampS: 1, throttle: .02, horizonS: 900, sampleS: 10, minimumM: 50, stepS: .25 } as const;
export const AVOIDANCE_RUNNING = ['avoidance-align', 'avoidance-burn', 'avoidance-coast'];
export type AvoidancePhase = 'avoidance-review' | 'avoidance-align' | 'avoidance-armed' | 'avoidance-burn' | 'avoidance-cutoff' | 'avoidance-coast' | 'avoidance-complete';
export interface SeparationSample { t: number; distanceM: number; alongM: number; normalM: number }
export interface SeparationPrediction { samples: SeparationSample[]; minimumM: number; minimumAtS: number; finalM: number; valid: boolean }
export interface AvoidancePlan {
  startTime: number; startFuelKg: number; startMassKg: number; initialDirection: V3; direction: V3; along: V3;
  fuelRequiredKg: number; idealDeltaVMS: number; thrustN: number;
  coast: SeparationPrediction; maneuver: SeparationPrediction | null;
  checks: { label: string; passed: boolean; detail: string }[]; allowed: boolean;
}
export interface AvoidanceTelemetry {
  plan: AvoidancePlan; shadow: Particle; started: boolean; elapsedS: number; fuelUsedKg: number;
  actual: SeparationSample[]; nextSampleS: number; baselineDistanceM: number; velocityDifferenceMS: number;
}
export const relativeVector = (carrier: V3, satellite: V3) => add(carrier, scale(satellite, -1));
export function separationSample(t: number, carrier: V3, satellite: V3, along: V3, normal: V3): SeparationSample {
  const relative = relativeVector(carrier, satellite);
  return { t, distanceM: norm(relative), alongM: dot(relative, along), normalM: dot(relative, normal) };
}
export function avoidanceThrottle(elapsed: number) {
  const t = elapsed - AVOIDANCE.alignS;
  if (t <= 0 || t >= AVOIDANCE.burnS) return 0;
  return AVOIDANCE.throttle * Math.min(1, t / AVOIDANCE.rampS, (AVOIDANCE.burnS - t) / AVOIDANCE.rampS);
}
export function avoidanceDirection(plan: Pick<AvoidancePlan, 'initialDirection' | 'direction'>, elapsed: number): V3 {
  const u = Math.max(0, Math.min(1, elapsed / AVOIDANCE.alignS)), f = u * u * (3 - 2 * u);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(plan.initialDirection, plan.direction))));
  if (angle < 1e-8) return [...plan.direction];
  return unit(add(scale(plan.initialDirection, Math.sin((1 - f) * angle)), scale(plan.direction, Math.sin(f * angle))));
}
export function carrierCoastModel(dryKg: number): AscentModel { return { dry: dryKg, cdArea: LIFTOFF.cd * LIFTOFF.areaM2 }; }
export function maneuverModel(config: VehicleConfig, plan: AvoidancePlan): AscentModel {
  const upper = compileVehicle(config).stages[1];
  return { ...carrierCoastModel(plan.startMassKg - plan.startFuelKg), motor: { flow: upper.massFlowKgS, sea: upper.ispSeaS, vacuum: upper.ispVacuumS },
    steer: (_p, time) => ({ direction: avoidanceDirection(plan, time - plan.startTime), pitchDeg: 0 }) };
}
/** Same integrator as flight. Segment minima include endpoints and a linear relative-position interpolation. */
function predict(config: VehicleConfig, initial: Particle, satelliteInitial: Particle, plan: AvoidancePlan, powered: boolean, stepS: number): SeparationPrediction {
  const vehicle = compileVehicle(config), dry = plan.startMassKg - plan.startFuelKg;
  const model = powered ? maneuverModel(config, plan) : carrierCoastModel(dry);
  const satelliteModel = { dry: vehicle.payloadKg, cdArea: 2.2 * 2 };
  let carrier = structuredClone(initial), satellite = structuredClone(satelliteInitial), elapsed = 0;
  const samples = [separationSample(0, carrier.position, satellite.position, plan.along, plan.direction)];
  let minimumM = samples[0].distanceM, minimumAtS = 0, nextSample = AVOIDANCE.sampleS, valid = true;
  while (elapsed < AVOIDANCE.horizonS - 1e-8) {
    const dt = Math.min(stepS, AVOIDANCE.horizonS - elapsed);
    const previous = relativeVector(carrier.position, satellite.position);
    carrier = integrateAscent(carrier, model, plan.startTime + elapsed, dt, time => powered ? avoidanceThrottle(time - plan.startTime) : 0);
    satellite = integrateAscent(satellite, satelliteModel, plan.startTime + elapsed, dt, () => 0);
    const next = relativeVector(carrier.position, satellite.position), movement = add(next, scale(previous, -1));
    const fraction = Math.max(0, Math.min(1, -dot(previous, movement) / Math.max(1e-20, dot(movement, movement))));
    const distance = norm(add(previous, scale(movement, fraction)));
    if (distance < minimumM) { minimumM = distance; minimumAtS = elapsed + fraction * dt; }
    elapsed += dt;
    if (![carrier, satellite].every(p => Number.isFinite(norm(p.position)) && surfaceAt(p.position).height >= 80000)) { valid = false; break; }
    if (elapsed + 1e-8 >= nextSample || elapsed + 1e-8 >= AVOIDANCE.horizonS) {
      samples.push(separationSample(elapsed, carrier.position, satellite.position, plan.along, plan.direction)); nextSample += AVOIDANCE.sampleS;
    }
  }
  const elements = orbitalElements(carrier.position, carrier.velocity);
  valid &&= elements.bound && elements.periapsisM > 80000;
  return { samples, minimumM, minimumAtS, finalM: norm(relativeVector(carrier.position, satellite.position)), valid };
}
export function createAvoidancePlan(config: VehicleConfig, s: FlightState, stepS: number = AVOIDANCE.stepS): AvoidancePlan {
  const d = s.deployment, a = s.ascent;
  if (!d?.released || !d.verified || !a) throw Error('请先完成卫星释放与 120 秒部署检查。');
  const vehicle = compileVehicle(config), upper = vehicle.stages[1];
  const fuelRequiredKg = upper.massFlowKgS * AVOIDANCE.throttle * (AVOIDANCE.burnS - AVOIDANCE.rampS);
  const direction = unit(cross(d.carrier.position, d.carrier.velocity));
  const plan: AvoidancePlan = {
    startTime: s.time, startFuelKg: a.upperFuelKg, startMassKg: d.carrier.massKg,
    initialDirection: [...a.direction], direction, along: unit(d.carrier.velocity), fuelRequiredKg,
    idealDeltaVMS: d.carrier.massKg > fuelRequiredKg ? STANDARD_GRAVITY * upper.ispVacuumS * Math.log(d.carrier.massKg / (d.carrier.massKg - fuelRequiredKg)) : 0,
    thrustN: upper.thrustN * AVOIDANCE.throttle, coast: null!, maneuver: null, checks: [], allowed: false,
  };
  plan.checks = [
    { label: '部署结果', passed: d.verified, detail: '两对象已独立；复用当前任务状态。' },
    { label: '剩余燃料', passed: a.upperFuelKg >= fuelRequiredKg + 1, detail: `计划耗油 ${fuelRequiredKg.toFixed(2)} kg，另保留至少 1 kg 教学余量。` },
    { label: '初始间距', passed: d.separationM >= AVOIDANCE.minimumM, detail: '中心距至少 50 m；教学门限，不是实际任务安全标准。' },
    { label: '有限预测范围', passed: d.elapsedS + AVOIDANCE.horizonS <= 7200 && [d.carrier, d.satellite].every(b => b.elements.bound && b.elements.periapsisM > 80000), detail: '只检查接下来的 15 分钟，并保持在本段两小时与 80 km 模型边界内。' },
    { label: '侧向指向', passed: norm(direction) > .99 && Math.abs(dot(unit(relativeVector(d.carrier.position, d.satellite.position)), direction)) < .5, detail: '沿当前轨道面法向侧推，避免直接朝卫星方向喷射；未计算喷流污染。' },
  ];
  const carrier = { position: d.carrier.position, velocity: d.carrier.velocity, fuel: a.upperFuelKg }, satellite = { position: d.satellite.position, velocity: d.satellite.velocity, fuel: 0 };
  plan.coast = predict(config, carrier, satellite, plan, false, stepS);
  if (plan.checks.every(c => c.passed)) {
    plan.maneuver = predict(config, carrier, satellite, plan, true, stepS);
    const m = plan.maneuver;
    plan.checks.push({ label: '方案对照', passed: plan.coast.valid && m.valid && m.minimumM >= AVOIDANCE.minimumM && m.minimumM >= plan.coast.minimumM - .1 && m.finalM > plan.coast.finalM + 100,
      detail: '15 分钟内间距不低于门限，最近距离不明显变差，终点间距比保持滑行至少增加 100 m。' });
  }
  plan.allowed = !!plan.maneuver && plan.checks.every(c => c.passed);
  return plan;
}
