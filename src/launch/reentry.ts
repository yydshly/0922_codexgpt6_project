import atmosphereData from '../data/reentryAtmosphere.json';
import { LAUNCH_EARTH } from '../data/launchMission';
import { add, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, surfaceAt, type AscentModel, type Particle, type V3 } from './ascent';
import { LIFTOFF, type FlightState } from './liftoff';
import { orbitalElements } from './orbitInsertion';

export const REENTRY = { version: 'reentry-0.1', stepS: .25, interfaceM: 120000, endM: 20000, maxS: 7200, cd: 1.2, areaM2: Math.PI * 2.15 ** 2, noseRadiusM: 2.15, heatingMaxM: 80000, heatingMinMach: 5 } as const;
export const REENTRY_LABELS = { 'reentry-ready': '再入条件说明', 'reentry-coast': '向再入区滑行', 'reentry-interface': '120 km 检查点', 'reentry-atmosphere': '大气减速与受热', 'reentry-complete': '20 km 教学边界', 'reentry-failed': '再入计算停止' } as const;
export type ReentryPhase = keyof typeof REENTRY_LABELS;
export const REENTRY_RUNNING: readonly string[] = ['reentry-coast', 'reentry-atmosphere'];

/** Geometric altitude; independent interpolated reference quantities, not a live atmosphere. */
export function reentryAtmosphere(heightM: number) {
  if (!Number.isFinite(heightM) || heightM > 1000000 || heightM < 0) throw Error('超出再入大气表 0–1000 km 范围。');
  const z = heightM / 1000, table = atmosphereData.table;
  const end = Math.max(1, table.findIndex(row => row[0] >= z));
  const lo = table[end - 1], hi = table[end], u = (z - lo[0]) / (hi[0] - lo[0]);
  const log = (i: number) => Math.exp(Math.log(lo[i]) * (1 - u) + Math.log(hi[i]) * u);
  return { temperatureK: lo[1] + (hi[1] - lo[1]) * u, pressurePa: log(2), density: log(3) };
}
/** Cold-wall blunt-body engineering estimate in W/m², NOT surface temperature. */
export function stagnationHeatFlux(density: number, speedMS: number, radiusM: number) {
  if (density < 0 || speedMS < 0 || radiusM <= 0 || !Number.isFinite(density + speedMS + radiusM)) throw Error('无效热流输入。');
  return 1.74153e-4 * Math.sqrt(density / radiusM) * speedMS ** 3;
}
export function reentryModel(massKg: number, fuelKg: number): AscentModel {
  return { dry: massKg - fuelKg, cdArea: REENTRY.cd * REENTRY.areaM2, atmosphere: reentryAtmosphere };
}
export interface ReentrySample { t: number; altitudeM: number; speedMS: number; density: number; dynamicPressurePa: number; dragG: number; heatFluxWm2: number | null; heatLoadJm2: number }
export interface ReentryTelemetry {
  startTime: number; startMassKg: number; startFuelKg: number; startAltitudeM: number; startDirection: V3;
  elapsedS: number; entryTime: number | null; temperatureK: number; mach: number | null; heatFluxWm2: number | null; heatLoadJm2: number; heatingSeconds: number;
  dragG: number; peakHeat: { value: number; altitudeM: number; t: number } | null; peakPressure: { value: number; altitudeM: number; t: number };
  samples: ReentrySample[]; outcome: 'pending' | 'model-boundary' | 'stopped';
}
export function entryReading(p: Particle, massKg: number, time: number) {
  const force = ascentForces(p, reentryModel(massKg, p.fuel), time, 0), atmo = reentryAtmosphere(force.height);
  // Below 86 km, fixed-composition ideal-gas sound speed is a useful teaching approximation.
  const mach = force.height <= 86000 ? force.airSpeed / Math.sqrt(1.4 * 287.05 * atmo.temperatureK) : null;
  const heatFluxWm2 = force.height <= REENTRY.heatingMaxM && mach !== null && mach >= REENTRY.heatingMinMach ? stagnationHeatFlux(force.density, force.airSpeed, REENTRY.noseRadiusM) : null;
  return { force, ...atmo, mach, heatFluxWm2, dragG: force.drag / massKg / 9.80665 };
}

/** A separate solver preserves the completed P2 record and legacy save replay. */
export class ReentrySimulation {
  state: FlightState; stepsTaken = 0;
  private carrier: Particle; private satellite: Particle; private nextSampleS = 0;
  constructor(handoff: FlightState, readonly stepS: number = REENTRY.stepS) {
    const d = handoff.deployment, q = d?.deorbit;
    if (handoff.phase !== 'deorbit-complete' || !d || !q?.restartLocked || !q.cutoffVerified || !handoff.ascent || d.carrier.altitudeM <= REENTRY.interfaceM || d.carrier.altitudeM >= 1000000 || d.satellite.elements.periapsisM <= 80000) throw Error('请先完成离轨点火与钝化，并保留有效的高空二级与在轨卫星。');
    if (![.25, .125, .0625].includes(stepS)) throw Error('无效再入步长。');
    this.state = structuredClone(handoff); this.state.phase = 'reentry-ready';
    this.carrier = { position: [...d.carrier.position], velocity: [...d.carrier.velocity], fuel: handoff.ascent.upperFuelKg };
    this.satellite = { position: [...d.satellite.position], velocity: [...d.satellite.velocity], fuel: 0 };
    this.state.reentry = { startTime: handoff.time, startMassKg: d.carrier.massKg, startFuelKg: this.carrier.fuel, startAltitudeM: d.carrier.altitudeM, startDirection: [...handoff.ascent.direction], elapsedS: 0, entryTime: null, temperatureK: 0, mach: null, heatFluxWm2: null, heatLoadJm2: 0, heatingSeconds: 0, dragG: 0, peakHeat: null, peakPressure: { value: 0, altitudeM: d.carrier.altitudeM, t: 0 }, samples: [], outcome: 'pending' };
    // Only the new descent is drawn as an actual path. Earlier ascent remains in its record.
    this.state.ascent!.trail = [[...d.carrier.fixedPosition]];
    this.state.message = '从钝化结果接续：发动机锁定，质量与燃料保留。先读条件，再滑行至 120 km；20 km 停在教学模型边界，不判定烧毁或着陆。';
    this.refresh(); this.event('进入 P3：启用本地标准大气表与无升力等效钝体模型');
  }
  get running() { return REENTRY_RUNNING.includes(this.state.phase); }
  private event(label: string) { this.state.events.push({ time: this.state.time, label }); }
  startCoast() { if (this.state.phase !== 'reentry-ready') throw Error('请先查看再入条件。'); this.state.phase = 'reentry-coast'; this.state.message = '无推力滑行向较低高度，卫星独立绕地。自动停在下降穿过 120 km 的教学检查点；这不是大气的硬边界。'; this.event('开始再入前滑行'); }
  startEntry() { if (this.state.phase !== 'reentry-interface') throw Error('请先到达 120 km 检查点。'); this.state.phase = 'reentry-atmosphere'; this.state.message = '继续下降：空气相对速度驱动阻力，标准大气密度随高度变化。橙色迎风包络为热流强弱的放大示意；箭体是否解体尚未计算。'; this.event('继续大气段，开始观察减速与受热'); }
  private refresh() {
    const s = this.state, r = s.reentry!, d = s.deployment!, a = s.ascent!, current = entryReading(this.carrier, r.startMassKg, s.time), f = current.force;
    for (const [p, body] of [[this.carrier, d.carrier], [this.satellite, d.satellite]] as const) Object.assign(body, { position: [...p.position], velocity: [...p.velocity], fixedPosition: rotateEarth(p.position, -s.time), elements: orbitalElements(p.position, p.velocity), altitudeM: surfaceAt(p.position).height });
    const vertical = dot(f.relative, f.up), direction = r.startDirection;
    Object.assign(s, { heightM: f.height - LIFTOFF.padHeightM, speedMS: vertical, massKg: r.startMassKg, thrustN: 0, throttle: 0, dragN: f.drag, weightN: r.startMassKg * LAUNCH_EARTH.gmM3S2 / norm(this.carrier.position) ** 2, accelerationMS2: dot(f.acceleration, f.up) });
    Object.assign(a, { position: [...this.carrier.position], velocity: [...this.carrier.velocity], fixedPosition: [...d.carrier.fixedPosition], direction, fixedDirection: rotateEarth(direction, -s.time), altitudeM: f.height, airSpeedMS: f.airSpeed, horizontalMS: Math.sqrt(Math.max(0, f.airSpeed ** 2 - vertical ** 2)), density: f.density, pressurePa: f.pressurePa, dynamicPressurePa: .5 * f.density * f.airSpeed ** 2, upperFuelKg: this.carrier.fuel, pitchDeg: Math.asin(Math.max(-1, Math.min(1, dot(direction, f.up)))) * 180 / Math.PI });
    s.orbit!.elements = d.carrier.elements; d.elapsedS = s.time - d.releaseTime!; d.separationM = norm(add(this.satellite.position, scale(this.carrier.position, -1))); d.relativeSpeedMS = norm(add(this.satellite.velocity, scale(this.carrier.velocity, -1)));
    Object.assign(r, { elapsedS: s.time - r.startTime, temperatureK: current.temperatureK, mach: current.mach, heatFluxWm2: current.heatFluxWm2, dragG: current.dragG });
    if (r.heatFluxWm2 !== null && (r.peakHeat === null || r.heatFluxWm2 > r.peakHeat.value)) r.peakHeat = { value: r.heatFluxWm2, altitudeM: f.height, t: r.elapsedS };
    if (a.dynamicPressurePa > r.peakPressure.value) r.peakPressure = { value: a.dynamicPressurePa, altitudeM: f.height, t: r.elapsedS };
    if (r.elapsedS + 1e-7 >= this.nextSampleS) { this.sample(); this.nextSampleS = r.elapsedS + (f.height > REENTRY.interfaceM ? 20 : 2); }
  }
  private sample() {
    const s = this.state, r = s.reentry!, a = s.ascent!;
    if (r.samples.at(-1)?.t === r.elapsedS) return;
    r.samples.push({ t: r.elapsedS, altitudeM: a.altitudeM, speedMS: a.airSpeedMS, density: a.density, dynamicPressurePa: a.dynamicPressurePa, dragG: r.dragG, heatFluxWm2: r.heatFluxWm2, heatLoadJm2: r.heatLoadJm2 });
    a.trail.push([...a.fixedPosition]); if (a.trail.length > 800) a.trail.shift();
  }
  step() {
    if (!this.running) return;
    const s = this.state, r = s.reentry!, target = s.phase === 'reentry-coast' ? REENTRY.interfaceM : REENTRY.endM, model = reentryModel(r.startMassKg, this.carrier.fuel);
    const advance = (dt: number) => integrateAscent(this.carrier, model, s.time, dt, () => 0);
    let dt = Math.min(this.stepS, REENTRY.maxS - r.elapsedS), next = advance(dt), boundary = surfaceAt(next.position).height <= target;
    // Split descending height crossings; neither a frame nor a multiplier can skip a checkpoint.
    if (boundary) { let lo = 0, hi = dt; for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (surfaceAt(advance(mid).position).height > target) lo = mid; else hi = mid; } dt = (lo + hi) / 2; next = advance(dt); }
    const mid = entryReading(advance(dt / 2), r.startMassKg, s.time + dt / 2);
    if (mid.heatFluxWm2 !== null) { r.heatLoadJm2 += mid.heatFluxWm2 * dt; r.heatingSeconds += dt; }
    this.carrier = next; this.satellite = integrateAscent(this.satellite, { dry: s.deployment!.satellite.massKg, cdArea: 4.4 }, s.time, dt, () => 0);
    s.time += dt; this.stepsTaken++; this.refresh();
    if (![...this.carrier.position, ...this.carrier.velocity, r.heatLoadJm2].every(Number.isFinite) || s.deployment!.satellite.altitudeM < 80000 || r.elapsedS >= REENTRY.maxS - 1e-7) { s.phase = 'reentry-failed'; r.outcome = 'stopped'; s.message = '已到计算时长或轨迹边界，保留当前状态；不能据此宣称已完成再入。'; this.sample(); this.event(s.message); }
    else if (boundary) {
      if (s.phase === 'reentry-coast') { s.phase = 'reentry-interface'; r.entryTime = s.time; s.message = '已下降至 120 km，时间冻结。这是本演示检查点，不是空气突然出现的位置；确认后进入大气减速段。'; }
      else { s.phase = 'reentry-complete'; r.outcome = 'model-boundary'; s.message = '计算已停在 20 km 教学边界。图中完整箭体只是等效质点的显示载体；没有材料与解体求解，不能判定残骸、烧毁、落区或安全着陆。卫星仍在轨。'; }
      this.sample(); this.event(s.message);
    }
  }
  snapshot(): FlightState { return structuredClone(this.state); }
}
export class ReentryClock {
  paused = true; rate = 1; private debt = 0;
  constructor(readonly simulation: ReentrySimulation) {}
  pause(value: boolean) { this.paused = value; this.debt = 0; }
  setRate(value: number) { if (![1, 10, 100].includes(value)) throw Error('不支持的再入倍率。'); this.rate = value; this.debt = 0; }
  advance(seconds: number) {
    if (this.paused || !this.simulation.running || !Number.isFinite(seconds) || seconds <= 0) return;
    this.debt += Math.min(seconds, .25) * this.rate; let budget = 120;
    while (this.debt + 1e-9 >= this.simulation.stepS && budget-- > 0 && this.simulation.running) { this.simulation.step(); this.debt -= this.simulation.stepS; }
    this.debt = this.simulation.running ? Math.min(this.debt, .25 * this.rate) : 0;
  }
}
