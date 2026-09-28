import { LAUNCH_EARTH } from '../data/launchMission';
import { compileVehicle, STANDARD_GRAVITY, type VehicleConfig } from './vehicle';
import type { AscentPhase, AscentTelemetry } from './ascent';
import type { OrbitPhase, OrbitTelemetry } from './orbitInsertion';
import type { DeploymentPhase, DeploymentTelemetry } from './deployment';
import type { ReentryPhase, ReentryTelemetry } from './reentry';
import type { LifecyclePhase, LifecycleTelemetry } from './satelliteLifecycle';
import type { OperationsPhase, OperationsTelemetry } from './satelliteOperations';

/** E3 only: constrained vertical departure, metres/seconds/kg. No orbit or E4 guidance. */
export const LIFTOFF = { stepS: .05, countdownS: 10, ignitionT: -3, rampS: 2, endHeightM: 150,
  padHeightM: 8.1, maxTimeS: 120, densityKgM3: 1.225, scaleHeightM: 8500, cd: .35, areaM2: Math.PI * (4.3 / 2) ** 2 } as const;
export type FlightPhase = 'ready' | 'countdown' | 'ignition' | 'ascending' | 'complete' | 'aborted' | AscentPhase | OrbitPhase | DeploymentPhase | ReentryPhase | OperationsPhase | LifecyclePhase;
export interface FlightEvent { time: number; label: string }
export interface FlightState {
  phase: FlightPhase; time: number; heightM: number; speedMS: number; fuelKg: number;
  massKg: number; thrustN: number; weightN: number; dragN: number; accelerationMS2: number;
  throttle: number; released: boolean; events: FlightEvent[]; message: string;
  ascent?: AscentTelemetry;
  orbit?: OrbitTelemetry;
  deployment?: DeploymentTelemetry;
  reentry?: ReentryTelemetry;
  operations?: OperationsTelemetry;
  lifecycle?: LifecycleTelemetry;
}
export interface VerticalState { heightM: number; speedMS: number; fuelKg: number }
export interface VerticalModel { carriedKg: number; flowKgS: number; ispS: number; mu: number; radiusM: number; rho: number; cdArea: number }
export function verticalForces(state: VerticalState, model: VerticalModel, throttle: number) {
  const massKg = model.carriedKg + Math.max(0, state.fuelKg);
  const thrustN = state.fuelKg > 0 ? model.flowKgS * STANDARD_GRAVITY * model.ispS * throttle : 0;
  const weightN = massKg * model.mu / (model.radiusM + Math.max(0, state.heightM)) ** 2;
  const density = model.rho * Math.exp(-Math.max(0, state.heightM) / LIFTOFF.scaleHeightM);
  const dragN = .5 * density * model.cdArea * state.speedMS * Math.abs(state.speedMS);
  return { massKg, thrustN, weightN, dragN, accelerationMS2: (thrustN - weightN - dragN) / massKg };
}
/** RK4 with an exact split at propellant exhaustion. Throttle is constant on this substep. */
export function integrateVertical(s: VerticalState, m: VerticalModel, throttle: number, dt: number): VerticalState {
  const flow = Math.max(0, throttle) * m.flowKgS;
  if (flow > 0 && s.fuelKg > 0 && s.fuelKg < flow * dt - 1e-9) {
    const burn = s.fuelKg / flow;
    const end = integrateVertical(s, m, throttle, burn);
    return integrateVertical({ ...end, fuelKg: 0 }, m, 0, dt - burn);
  }
  const derivative = (h: number, v: number, t: number) => ({ h: v, v: verticalForces({ heightM: h, speedMS: v, fuelKg: Math.max(s.fuelKg - flow * t, 1e-12) }, m, s.fuelKg > 0 ? throttle : 0).accelerationMS2 });
  const a = derivative(s.heightM, s.speedMS, 0), b = derivative(s.heightM + a.h * dt / 2, s.speedMS + a.v * dt / 2, dt / 2);
  const c = derivative(s.heightM + b.h * dt / 2, s.speedMS + b.v * dt / 2, dt / 2), d = derivative(s.heightM + c.h * dt, s.speedMS + c.v * dt, dt);
  return { heightM: s.heightM + dt / 6 * (a.h + 2 * b.h + 2 * c.h + d.h), speedMS: s.speedMS + dt / 6 * (a.v + 2 * b.v + 2 * c.v + d.v), fuelKg: Math.max(0, s.fuelKg - flow * dt) };
}
export class LiftoffSimulation {
  stepsTaken = 0;
  private model: VerticalModel;
  private steps = 0;
  state: FlightState;
  constructor(config: VehicleConfig, readonly stepS: number = LIFTOFF.stepS) {
    if (![.05, .025, .0125].includes(stepS)) throw Error('不支持的发射步长');
    const vehicle = compileVehicle(config), stage = vehicle.stages[0];
    this.model = { carriedKg: vehicle.wetKg - stage.fuelKg, flowKgS: stage.massFlowKgS, ispS: stage.ispSeaS,
      mu: LAUNCH_EARTH.gmM3S2, radiusM: LAUNCH_EARTH.semiMajorM + LIFTOFF.padHeightM, rho: LIFTOFF.densityKgM3, cdArea: LIFTOFF.cd * LIFTOFF.areaM2 };
    const initial = { heightM: 0, speedMS: 0, fuelKg: stage.fuelKg };
    this.state = { ...initial, ...verticalForces(initial, this.model, 0), accelerationMS2: 0, phase: 'ready', time: -10, throttle: 0, released: false, events: [], message: '检查通过后，开始 10 秒倒计时。' };
  }
  snapshot(): FlightState { return { ...this.state, events: this.state.events.map(e => ({ ...e })) }; }
  private event(label: string) { this.state.events.push({ time: this.state.time, label }); }
  start() {
    if (this.state.phase !== 'ready') return;
    this.state.phase = 'countdown'; this.state.message = '倒计时中，可以取消。'; this.event('开始倒计时');
  }
  cancel() {
    if (!['countdown', 'ignition'].includes(this.state.phase)) return;
    this.stop('发射已取消，发动机关机；消耗的推进剂不会自动补回。');
  }
  private stop(message: string) {
    Object.assign(this.state, verticalForces(this.state, this.model, 0), { phase: 'aborted', throttle: 0, accelerationMS2: 0, message }); this.event(message);
  }
  step() {
    const s = this.state;
    if (!['countdown', 'ignition', 'ascending'].includes(s.phase)) return;
    this.stepsTaken++;
    const nextT = -10 + ++this.steps * this.stepS;
    const midThrottle = Math.max(0, Math.min(1, (s.time + this.stepS / 2 - LIFTOFF.ignitionT) / LIFTOFF.rampS));
    if (s.released) Object.assign(s, integrateVertical(s, this.model, midThrottle, this.stepS));
    else s.fuelKg = Math.max(0, s.fuelKg - this.model.flowKgS * midThrottle * this.stepS);
    s.time = nextT;
    s.throttle = s.fuelKg > 0 ? Math.max(0, Math.min(1, (nextT - LIFTOFF.ignitionT) / LIFTOFF.rampS)) : 0;
    Object.assign(s, verticalForces(s, this.model, s.throttle));
    if (!s.released) s.accelerationMS2 = 0; // Hold-down reaction, including while thrust exceeds weight.
    if (s.phase === 'countdown' && nextT >= LIFTOFF.ignitionT - 1e-9) {
      s.phase = 'ignition'; s.message = '点火建压中，固定支撑仍锁定；火箭尚未离台。'; this.event('发动机点火，建立推力');
    }
    if (!s.released && nextT >= -1e-9) {
      if (s.thrustN <= s.weightN || s.fuelKg <= 0) { this.stop('推力不足以离台，支撑未释放，已关机。'); return; }
      s.released = true; s.phase = 'ascending'; s.accelerationMS2 = (s.thrustN - s.weightN - s.dragN) / s.massKg;
      s.message = '支撑已释放，按净推力竖直上升。'; this.event('支撑释放，开始离台');
    }
    if (s.released && s.heightM >= LIFTOFF.endHeightM) {
      s.phase = 'complete'; s.message = '离台段完成，模拟已冻结在此刻；不是关机或入轨。'; this.event('离台高度达到 150 m，暂停检查');
    } else if (s.released && (s.fuelKg <= 0 || s.speedMS < 0 || nextT >= LIFTOFF.maxTimeS)) this.stop('离台段未完成，试飞已停止；请重置并检查配置。');
  }
}

/** Fixed physical steps, independent of rendering; pause/resume never catches up hidden wall time. */
export class LiftoffClock {
  paused = false;
  private debt = 0;
  constructor(readonly simulation: LiftoffSimulation) {}
  pause(value: boolean) { this.paused = value; this.debt = 0; }
  advance(wallSeconds: number, onStep?: (state: FlightState) => void) {
    if (this.paused || !Number.isFinite(wallSeconds) || wallSeconds <= 0) return;
    this.debt += Math.min(wallSeconds, .25); // Slow down under load rather than leap through launch events.
    let budget = 5;
    while (this.debt + 1e-9 >= this.simulation.stepS && budget-- > 0) { this.simulation.step(); onStep?.(this.simulation.state); this.debt -= this.simulation.stepS; }
    this.debt = Math.min(this.debt, .25);
  }
}
