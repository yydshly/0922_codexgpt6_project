import { satelliteWetKg } from './satellitePlan';
import { add, ascentForces, dot, integrateAscent, norm, scale, surfaceAt, unit, type AscentModel, type Particle, type V3 } from './ascent';
import { avoidanceDirection, carrierCoastModel } from './avoidance';
import { orbitalElements } from './orbitInsertion';
import { type FlightState } from './liftoff';
import { compileVehicle, STANDARD_GRAVITY, type VehicleConfig } from './vehicle';

export const DEORBIT = { version: 'deorbit-0.1', alignS: 12, throttle: .1, rampS: 1, maxBurnS: 90, targetPerigeeM: 50000, stepS: .25, passivateS: 120,
  gasKg: 2, gasVolumeM3: .08, gasTemperatureK: 293.15, gasMolarKg: .0040026, propellantTauS: 20, gasTauS: 10, batteryJ: 864000, dischargeW: 10000 } as const;
export const DEORBIT_RUNNING = ['deorbit-align', 'deorbit-burn', 'deorbit-passivating'];
export const DEORBIT_LABELS = {
  'deorbit-review': '离轨方案 · 等待选择', 'deorbit-align': '二级反向对准', 'deorbit-armed': '反向已对准 · 等待点火',
  'deorbit-burn': '二级离轨点火', 'deorbit-cutoff': '离轨关机 · 核对结果', 'deorbit-passivating': '释放剩余能量 · 简化钝化',
  'deorbit-complete': '本段完成 · 尚未再入', 'deorbit-failed': '离轨处置检查未通过',
};
export type DeorbitPhase = keyof typeof DEORBIT_LABELS;
export interface DeorbitSample { t: number; altitudeM: number; perigeeM: number; fuelKg: number }
export interface DeorbitPlan {
  startTime: number; initialDirection: V3; direction: V3; startMassKg: number; startFuelKg: number; dryKg: number;
  burnS: number; fuelRequiredKg: number; deltaVMS: number; predictedPerigeeM: number; initialPerigeeM: number; initialAltitudeM: number;
  minimumSeparationM: number; samples: DeorbitSample[]; checks: { label: string; passed: boolean; detail: string }[]; allowed: boolean;
}
export interface DeorbitTelemetry {
  plan: DeorbitPlan; started: boolean; elapsedS: number; fuelBurnedKg: number; actual: DeorbitSample[];
  cutoffVerified: boolean; passivationStart: number | null; passivationFuelKg: number; passivationElapsedS: number;
  propellantVentedKg: number; gasVentedKg: number; gasKg: number; pressurePa: number; batteryJ: number; dissipatedJ: number; restartLocked: boolean;
}
export function gasPressurePa(kg: number) { return kg / DEORBIT.gasMolarKg * 8.314462618 * DEORBIT.gasTemperatureK / DEORBIT.gasVolumeM3; }
export function deorbitThrottle(elapsed: number, burnS: number) {
  const t = elapsed - DEORBIT.alignS;
  return t <= 0 || t >= burnS ? 0 : DEORBIT.throttle * Math.min(1, t / DEORBIT.rampS, (burnS - t) / DEORBIT.rampS);
}
export function deorbitModel(config: VehicleConfig, plan: DeorbitPlan): AscentModel {
  const u = compileVehicle(config).stages[1];
  return { ...carrierCoastModel(plan.dryKg), motor: { flow: u.massFlowKgS, sea: u.ispSeaS, vacuum: u.ispVacuumS },
    steer: (_p, time) => ({ direction: avoidanceDirection(plan, time - plan.startTime), pitchDeg: 0 }) };
}
export function deorbitSample(t: number, p: Particle): DeorbitSample { return { t, altitudeM: surfaceAt(p.position).height, perigeeM: orbitalElements(p.position, p.velocity).periapsisM, fuelKg: p.fuel }; }
export function predictDeorbit(config: VehicleConfig, carrier: Particle, satellite: Particle, plan: DeorbitPlan, stepS = DEORBIT.stepS as number) {
  if (![.25, .125, .0625].includes(stepS)) throw Error('不支持的离轨验证步长');
  let c = structuredClone(carrier), s = structuredClone(satellite), t = 0, minimumM = norm(add(c.position, scale(s.position, -1)));
  const samples = [deorbitSample(0, c)], model = deorbitModel(config, plan), end = DEORBIT.alignS + plan.burnS;
  let valid = true;
  while (t < end - 1e-9) {
    const dt = Math.min(stepS, end - t), before = add(c.position, scale(s.position, -1));
    c = integrateAscent(c, model, plan.startTime + t, dt, time => deorbitThrottle(time - plan.startTime, plan.burnS));
    s = integrateAscent(s, { dry: satelliteWetKg(config), cdArea: 4.4 }, plan.startTime + t, dt, () => 0);
    const after = add(c.position, scale(s.position, -1)), change = add(after, scale(before, -1));
    const f = Math.max(0, Math.min(1, -dot(before, change) / Math.max(1e-20, dot(change, change))));
    minimumM = Math.min(minimumM, norm(add(before, scale(change, f)))); t += dt;
    samples.push(deorbitSample(t, c));
    if (!Number.isFinite(norm(c.position)) || surfaceAt(c.position).height < 150000 || c.fuel < 1) { valid = false; break; }
  }
  return { carrier: c, satellite: s, samples, minimumM, valid, perigeeM: orbitalElements(c.position, c.velocity).periapsisM };
}
export function createDeorbitPlan(config: VehicleConfig, state: FlightState): DeorbitPlan {
  const d = state.deployment, a = state.ascent;
  if (state.phase !== 'avoidance-complete' || !d?.verified || !a) throw Error('先完成 P1 的 15 分钟分离对照。');
  const p: DeorbitPlan = { startTime: state.time, initialDirection: [...a.direction], direction: scale(unit(d.carrier.velocity), -1), startMassKg: d.carrier.massKg,
    startFuelKg: a.upperFuelKg, dryKg: d.carrier.massKg - a.upperFuelKg, burnS: DEORBIT.maxBurnS, fuelRequiredKg: 0, deltaVMS: 0,
    initialPerigeeM: d.carrier.elements.periapsisM, initialAltitudeM: d.carrier.altitudeM, predictedPerigeeM: d.carrier.elements.periapsisM,
    minimumSeparationM: d.separationM, samples: [], allowed: false, checks: [] };
  const c: Particle = { position: d.carrier.position, velocity: d.carrier.velocity, fuel: a.upperFuelKg }, sat = { position: d.satellite.position, velocity: d.satellite.velocity, fuel: 0 };
  const upper = compileVehicle(config).stages[1];
  let lo = 8, hi = Math.min(DEORBIT.maxBurnS * 4, Math.floor((a.upperFuelKg - 1) / (upper.massFlowKgS * DEORBIT.throttle) * 4 + 4));
  const feasible = hi >= lo && d.carrier.elements.bound && p.initialPerigeeM > 80000 && p.initialAltitudeM > 150000 && d.separationM >= 1000;
  if (feasible) {
    // Find the shortest quarter-second burn reaching the target, then validate the complete finite burn.
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); p.burnS = mid / 4; const result = predictDeorbit(config, c, sat, p); if (result.valid && result.perigeeM <= DEORBIT.targetPerigeeM) hi = mid; else lo = mid + 1; }
    p.burnS = lo / 4; const result = predictDeorbit(config, c, sat, p);
    p.samples = result.samples; p.predictedPerigeeM = result.perigeeM; p.minimumSeparationM = result.minimumM;
    p.fuelRequiredKg = p.startFuelKg - result.carrier.fuel;
    p.deltaVMS = STANDARD_GRAVITY * upper.ispVacuumS * Math.log(p.startMassKg / (p.startMassKg - p.fuelRequiredKg));
    p.checks.push({ label: '有限点火预测', passed: result.valid && result.perigeeM >= 30000 && result.perigeeM <= 70000, detail: '目标近地点约 50 km，验收窗口 30–70 km；当前高度仍需高于 150 km。近地点进入大气不等于已完成再入。' });
  }
  p.checks.push(
    { label: '分离与轨道前提', passed: feasible, detail: 'P1 完成；中心距至少 1 km，当前高度超过 150 km，原近地点超过 80 km。均为教学门限。' },
    { label: '推进剂预算', passed: p.samples.length > 0 && p.fuelRequiredKg > 0 && p.startFuelKg - p.fuelRequiredKg >= 1, detail: `预计点火消耗 ${p.fuelRequiredKg.toFixed(2)} kg，当前 ${p.startFuelKg.toFixed(2)} kg。` },
    { label: '有限时段间距', passed: p.samples.length > 0 && p.minimumSeparationM >= 1000, detail: `只核对转向与点火期间，预测最近中心距 ${p.minimumSeparationM.toFixed(0)} m；不是长期碰撞预警。` },
    { label: '时间与模型边界', passed: d.elapsedS + DEORBIT.alignS + p.burnS + DEORBIT.passivateS <= 7200 && p.dryKg > DEORBIT.gasKg, detail: '本段在释放后两小时内结束；低于 80 km 停止，保留给后续再入模型。' },
  );
  p.allowed = p.checks.every(c => c.passed); return p;
}
export function initializeDeorbit(plan: DeorbitPlan): DeorbitTelemetry {
  return { plan, started: false, elapsedS: 0, fuelBurnedKg: 0, actual: [], cutoffVerified: false, passivationStart: null, passivationFuelKg: 0,
    passivationElapsedS: 0, propellantVentedKg: 0, gasVentedKg: 0, gasKg: DEORBIT.gasKg, pressurePa: gasPressurePa(DEORBIT.gasKg),
    batteryJ: DEORBIT.batteryJ, dissipatedJ: 0, restartLocked: false };
}
/** Ideal symmetric vents: expelled material carries its bulk momentum; net relative exhaust impulse is zero. */
export function advancePassivation(carrier: Particle, q: DeorbitTelemetry, time: number, dt: number) {
  const elapsed = time + dt - q.passivationStart!, mid = time + dt / 2 - q.passivationStart!;
  const gas = DEORBIT.gasKg * Math.exp(-elapsed / DEORBIT.gasTauS), fuel = q.passivationFuelKg * Math.exp(-elapsed / DEORBIT.propellantTauS);
  const midFuel = q.passivationFuelKg * Math.exp(-mid / DEORBIT.propellantTauS), midGas = DEORBIT.gasKg * Math.exp(-mid / DEORBIT.gasTauS);
  const next = integrateAscent({ ...carrier, fuel: midFuel }, carrierCoastModel(q.plan.dryKg - DEORBIT.gasKg + midGas), time, dt, () => 0);
  q.passivationElapsedS = elapsed; q.gasKg = gas; q.gasVentedKg = DEORBIT.gasKg - gas; q.pressurePa = gasPressurePa(gas);
  q.propellantVentedKg = q.passivationFuelKg - fuel; q.batteryJ = Math.max(0, DEORBIT.batteryJ - DEORBIT.dischargeW * elapsed); q.dissipatedJ = DEORBIT.batteryJ - q.batteryJ;
  return { ...next, fuel };
}
export function deorbitForces(config: VehicleConfig, carrier: Particle, q: DeorbitTelemetry, time: number) {
  const model = q.passivationStart === null ? deorbitModel(config, q.plan) : { ...carrierCoastModel(q.plan.dryKg - q.gasVentedKg), steer: () => ({ direction: q.plan.direction, pitchDeg: 0 }) };
  return ascentForces(carrier, model, time, q.restartLocked ? 0 : deorbitThrottle(time - q.plan.startTime, q.plan.burnS));
}
