import { satelliteName } from './satellitePlan';
import { DISPOSAL_RUNNING } from './satelliteDisposal';
import { STANDARD_GRAVITY } from './vehicle';
import { LIFE_RUNNING } from './satelliteLifecycle';
import { OPS_RUNNING } from './satelliteOperations';
import { REENTRY, REENTRY_RUNNING } from './reentry';
import { DEORBIT_RUNNING } from './deorbit';
import { LIFTOFF, type FlightState } from './liftoff';
import { compileVehicle, type VehicleConfig } from './vehicle';
import { flightEnvironmentReading } from './flightPhenomena';

export const COUNTDOWN_SOURCE = 'https://www.nasa.gov/missions/artemis/orion/artemis-i-launch-countdown-101/';
export const FLIGHT_RUNNING_PHASES = ['countdown', 'ignition', 'ascending', 'ascent', 'separating', 'upper-burn', 'orbit-burn', 'orbit-coast', 'deploying', 'deployed-coast', 'avoidance-align', 'avoidance-burn', 'avoidance-coast', ...DEORBIT_RUNNING, ...REENTRY_RUNNING, ...OPS_RUNNING, ...LIFE_RUNNING, ...DISPOSAL_RUNNING];

/** Display-only interpretation of the existing launch clock; no new commands or event timestamps. */
export function ignitionReading(s: FlightState) {
  const started = s.events.some(e => e.label === '发动机点火，建立推力');
  const phase = s.phase === 'aborted' ? 'stopped' : s.released ? 'released' : !started ? 'waiting' : s.throttle >= 1 ? 'holding' : 'ramping';
  return { phase, started, fraction: s.throttle, label: {
    stopped: '已取消或停止 · 发动机关机', released: '支撑已释放 · 火箭离台', waiting: '等待点火 · 不是已经燃烧',
    ramping: '点火建压 · 推力逐渐建立', holding: '推力已建立 · 等待 T=0 释放支撑',
  }[phase], ignitionT: LIFTOFF.ignitionT, fullThrustT: LIFTOFF.ignitionT + LIFTOFF.rampS };
}

/** All numeric readings come from the active solver/config; unsupported thermal fields stay null. */
export function flightTelemetry(s: FlightState, config: VehicleConfig) {
  const env = flightEnvironmentReading(s), vehicle = compileVehicle(config), a = s.ascent, stage = a?.stage ?? 0;
  const held = !s.released && !a;
  const thermal = s.satelliteDisposal ?? (!s.operations ? s.reentry : undefined), equipment = s.satelliteEquipment;
  return {
    ...env, stage, object: s.operations ? `${satelliteName(s)} 卫星 · ${s.satelliteDisposal ? '任务末期离轨' : s.lifecycle ? '维护与退役' : '工作任务'}` : s.deployment?.released ? '运载二级 · 卫星已独立' : stage === 1 ? '二级与连接中的载荷' : '整箭 · 一级工作段',
    verticalMS: s.speedMS, horizontalMS: a?.horizontalMS ?? 0,
    inertialMS: a ? Math.hypot(...a.velocity) : null,
    upwardAccelerationMS2: s.accelerationMS2, gravityMS2: s.weightN / s.massKg,
    thrustN: s.thrustN, weightN: s.weightN, dragN: Math.abs(s.dragN), twr: s.thrustN / s.weightN,
    // Signed force along the E3 vertical axis. Hold-down can push down when thrust exceeds weight.
    supportN: held ? s.weightN + s.dragN - s.thrustN : 0, held,
    densityFraction: env.density / LIFTOFF.densityKgM3,
    massKg: s.massKg, throttle: s.throttle,
    flowKgS: !env.powered ? 0 : s.satelliteDisposal && equipment ? s.thrustN / (STANDARD_GRAVITY * equipment.ispS) : s.operations ? 0 : vehicle.stages[stage].massFlowKgS * s.throttle,
    satelliteFuelKg: equipment?.fuelKg ?? null, thermalModel: !!thermal,
    boosterFuelKg: s.operations ? 0 : a?.boosterFuelKg ?? s.fuelKg, upperFuelKg: s.operations ? 0 : a?.upperFuelKg ?? vehicle.stages[1].fuelKg,
    pitchDeg: a?.pitchDeg ?? 90, cd: s.operations ? 1 : s.reentry ? REENTRY.cd : LIFTOFF.cd, areaM2: s.operations ? 4.4 : s.reentry ? REENTRY.areaM2 : LIFTOFF.areaM2,
    ambientTemperatureK: thermal?.temperatureK ?? null, surfaceTemperatureK: null, heatFluxWm2: thermal?.heatFluxWm2 ?? null, mach: thermal?.mach ?? null,
  };
}

/** Tiny orbital density/drag stays visible instead of rounding a positive value to zero. */
export function telemetryNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  if (Math.abs(value) < 10 ** -digits || Math.abs(value) >= 1e8) return value.toExponential(2);
  return value.toFixed(digits);
}
