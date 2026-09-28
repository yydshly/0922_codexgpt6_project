import { LAUNCH_EARTH } from '../data/launchMission';
import { tdbToUtc, J2000_UNIX_MS } from '../data/time';
import { add, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, surfaceAt, unit, type Particle, type V3 } from './ascent';
import { orbitalElements } from './orbitInsertion';
import type { FlightState } from './liftoff';

export const OPS = { stepS: 1, alignS: 30, maxS: 21600, solarWM2: 1361, arrayM2: 5.5, efficiency: .24, packing: .85, batteryWh: 800, initialCharge: .6, reserve: .2, recover: .35, busW: 180, pointingW: 20, observeW: 250, transmitW: 150, observeMBs: 2, downlinkMBs: 4, targetMB: 240, chargeEfficiency: .92, dischargeEfficiency: .9, minElevationDeg: 10 } as const;
export const OPS_LABELS = { 'ops-ready': '卫星工作条件', 'ops-align': '对日定向', 'ops-power-ready': '发电检查点', 'ops-cycle': '一圈日夜与观测', 'ops-data-ready': '数据已保存 · 等待下传', 'ops-downlink': '地面站窗口与下传', 'ops-complete': '观测数据已下传', 'ops-failed': '卫星任务停止' } as const;
export type OperationsPhase = keyof typeof OPS_LABELS;
export const OPS_RUNNING: readonly string[] = ['ops-align', 'ops-cycle', 'ops-downlink'];
export const GROUND_STATIONS = [
  { id: 'A', name: '教学站 A · 佛州区域', latitudeDeg: 28.5, longitudeDeg: -80.6 },
  { id: 'B', name: '教学站 B · 赤道区域', latitudeDeg: 0, longitudeDeg: 20 },
  { id: 'C', name: '教学站 C · 南纬区域', latitudeDeg: -20, longitudeDeg: 120 },
  { id: 'D', name: '教学站 D · 南美区域', latitudeDeg: -20, longitudeDeg: -60 },
  { id: 'E', name: '教学站 E · 南亚区域', latitudeDeg: 20, longitudeDeg: 80 },
  { id: 'F', name: '教学站 F · 太平洋岛区', latitudeDeg: 20, longitudeDeg: -155 },
] as const;
const rad = Math.PI / 180;
/** USNO low-precision Sun; UTC used as UT1 approximation. Flight ECI axes coincide with ECEF at T=0. */
export function operationsSun(baseTime: number, elapsed: number) {
  const days = (tdbToUtc(baseTime + elapsed).getTime() - J2000_UNIX_MS) / 86400000;
  const g = (357.529 + .98560028 * days) * rad, q = (280.459 + .98564736 * days) * rad;
  const lon = q + (1.915 * Math.sin(g) + .020 * Math.sin(2 * g)) * rad, eps = (23.439 - .00000036 * days) * rad;
  const equatorial: V3 = [Math.cos(lon), Math.cos(eps) * Math.sin(lon), Math.sin(eps) * Math.sin(lon)];
  const baseDays = (tdbToUtc(baseTime).getTime() - J2000_UNIX_MS) / 86400000;
  const midnight = Math.floor(baseDays + .5) - .5, hours = (baseDays - midnight) * 24, T = baseDays / 36525;
  const theta = (6.697375 + .065709824279 * midnight + 1.0027379 * hours + .0000258 * T * T) * 15 * rad;
  const c = Math.cos(theta), s = Math.sin(theta);
  return { direction: [c * equatorial[0] + s * equatorial[1], -s * equatorial[0] + c * equatorial[1], equatorial[2]] as V3, distanceAu: 1.00014 - .01671 * Math.cos(g) - .00014 * Math.cos(2 * g) };
}
export function inEarthShadow(position: V3, sunDirection: V3) { const along = dot(position, sunDirection); return along < 0 && Math.max(0, dot(position, position) - along * along) < LAUNCH_EARTH.semiMajorM ** 2; }
export function stationFixed(station: { latitudeDeg: number; longitudeDeg: number }): V3 {
  const lat = station.latitudeDeg * rad, lon = station.longitudeDeg * rad, f = 1 / LAUNCH_EARTH.inverseFlattening, e2 = f * (2 - f), n = LAUNCH_EARTH.semiMajorM / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  return [n * Math.cos(lat) * Math.cos(lon), n * Math.cos(lat) * Math.sin(lon), n * (1 - e2) * Math.sin(lat)];
}
export function stationLink(position: V3, time: number, station: typeof GROUND_STATIONS[number]) {
  const fixed = stationFixed(station), p = rotateEarth(fixed, time), up = rotateEarth(surfaceAt(fixed).up, time), line = add(position, scale(p, -1));
  const elevationDeg = Math.asin(Math.max(-1, Math.min(1, dot(unit(line), up)))) / rad;
  return { id: station.id, name: station.name, elevationDeg, rangeM: norm(line), visible: elevationDeg >= OPS.minElevationDeg, position: p, fixedPosition: fixed };
}
/** Ideal bounded slew, including antipodal inputs; this does not model control torque. */
export function slewDirection(from: V3, to: V3, u: number): V3 {
  const a = unit(from), b = unit(to), t = Math.max(0, Math.min(1, u)), cosine = Math.max(-1, Math.min(1, dot(a, b)));
  if (t === 1) return b;
  if (cosine > .9999) return unit(add(scale(a, 1 - t), scale(b, t)));
  if (cosine < -.9999) { const axis: V3 = Math.abs(a[0]) < .8 ? [1, 0, 0] : [0, 1, 0], side = unit(add(axis, scale(a, -dot(axis, a)))); return add(scale(a, Math.cos(t * Math.PI)), scale(side, Math.sin(t * Math.PI))); }
  const angle = Math.acos(cosine); return scale(add(scale(a, Math.sin((1 - t) * angle)), scale(b, Math.sin(t * angle))), 1 / Math.sin(angle));
}
export function electricalStep(energyJ: number, capacityJ: number, generationW: number, loadW: number, dt: number) {
  const surplus = (generationW - loadW) * dt;
  if (surplus >= 0) { const accepted = Math.min(surplus, Math.max(0, capacityJ - energyJ) / OPS.chargeEfficiency), stored = accepted * OPS.chargeEfficiency; return { energyJ: energyJ + stored, lossJ: accepted - stored, shuntedJ: surplus - accepted, unservedJ: 0 }; }
  const supplied = Math.min(-surplus, energyJ * OPS.dischargeEfficiency), drawn = supplied / OPS.dischargeEfficiency;
  return { energyJ: Math.max(0, energyJ - drawn), lossJ: drawn - supplied, shuntedJ: 0, unservedJ: -surplus - supplied };
}
export interface OperationsSample { t: number; batteryWh: number; generationW: number; loadW: number; shadow: boolean; bufferMB: number; deliveredMB: number; elevationDeg: number }
export interface OperationsTelemetry {
  startTime: number; carrierRecordTime: number; origin: 'P1' | 'P3'; elapsedS: number; cycleStart: number | null; cyclePeriodS: number; initialDirection: V3; direction: V3; arrayNormal: V3; sunDirection: V3;
  shadow: boolean; previousShadow: boolean; eclipseSeen: boolean; sunlightAfterEclipse: boolean; eclipseS: number; sunlightS: number; incidence: number;
  capacityJ: number; initialEnergyJ: number; energyJ: number; reserveMode: boolean; generationW: number; loadW: number; generatedJ: number; consumedJ: number; lossJ: number; shuntedJ: number; unservedJ: number;
  collectedMB: number; bufferMB: number; deliveredMB: number; collecting: boolean; transmitting: boolean; activeStation: string | null; links: ReturnType<typeof stationLink>[]; samples: OperationsSample[];
}
export function operationsReading(position: V3, time: number, baseTime: number, o: OperationsTelemetry, mass: number, phase: string) {
  const sun = operationsSun(baseTime, time), shadow = inEarthShadow(position, sun.direction), u = (time - o.startTime) / OPS.alignS;
  const arrayNormal = slewDirection(o.initialDirection, sun.direction, u), links = GROUND_STATIONS.map(st => stationLink(position, time, st));
  const best = [...links].sort((a, b) => b.elevationDeg - a.elevationDeg)[0], activeStation = best.visible ? best.id : null;
  const factor = mass / 500, area = OPS.arrayM2 * (mass === 500 ? 1 : .64), incidence = Math.max(0, dot(arrayNormal, sun.direction));
  const generationW = shadow ? 0 : OPS.solarWM2 / sun.distanceAu ** 2 * area * OPS.efficiency * OPS.packing * incidence;
  const collecting = phase === 'ops-cycle' && !shadow && !o.reserveMode && o.collectedMB < OPS.targetMB - 1e-8;
  const transmitting = phase === 'ops-downlink' && activeStation !== null && !o.reserveMode && o.bufferMB > 1e-8;
  const loadW = factor * (OPS.busW + OPS.pointingW + (collecting ? OPS.observeW : 0) + (transmitting ? OPS.transmitW : 0));
  const target = transmitting ? unit(add(best.position, scale(position, -1))) : scale(unit(position), -1);
  return { sunDirection: sun.direction, direction: slewDirection(o.initialDirection, target, u), arrayNormal, shadow, incidence, links, activeStation, generationW, loadW, collecting, transmitting };
}
export class OperationsSimulation {
  state: FlightState; stepsTaken = 0; private satellite: Particle; private nextSample = 0;
  constructor(handoff: FlightState, readonly baseTime: number, readonly stepS: number = OPS.stepS) {
    const d = handoff.deployment;
    if (!['avoidance-complete', 'reentry-complete'].includes(handoff.phase) || !d?.verified || !d.released || d.panels < 1 || !handoff.ascent || !d.satellite.elements.periodS || d.satellite.elements.periapsisM < 80000) throw Error('请先完成 P1 分离检查或 P3 教学再入，保留已展开翼板的有效在轨卫星。');
    if (![1, .5, .25].includes(stepS)) throw Error('不支持的卫星工作步长。');
    this.state = structuredClone(handoff); this.state.phase = 'ops-ready';
    this.satellite = { position: [...d.satellite.position], velocity: [...d.satellite.velocity], fuel: 0 };
    const capacityJ = OPS.batteryWh * 3600 * d.satellite.massKg / 500, sun = operationsSun(baseTime, handoff.time).direction;
    this.state.operations = { startTime: handoff.time, carrierRecordTime: handoff.time, origin: handoff.phase === 'reentry-complete' ? 'P3' : 'P1', elapsedS: 0, cycleStart: null, cyclePeriodS: d.satellite.elements.periodS, initialDirection: [...d.direction], direction: [...d.direction], arrayNormal: [...d.direction], sunDirection: sun,
      shadow: inEarthShadow(d.satellite.position, sun), previousShadow: inEarthShadow(d.satellite.position, sun), eclipseSeen: false, sunlightAfterEclipse: false, eclipseS: 0, sunlightS: 0, incidence: 0,
      capacityJ, initialEnergyJ: capacityJ * OPS.initialCharge, energyJ: capacityJ * OPS.initialCharge, reserveMode: false, generationW: 0, loadW: 0, generatedJ: 0, consumedJ: 0, lossJ: 0, shuntedJ: 0, unservedJ: 0,
      collectedMB: 0, bufferMB: 0, deliveredMB: 0, collecting: false, transmitting: false, activeStation: null, links: [], samples: [] };
    this.state.ascent!.trail = []; this.state.message = '接续同一颗卫星的位置与速度。P4 从 60% 教学初始电量开始计账，不追溯此前用电；二级保留上一步历史记录，不再作为当前运动对象。'; this.refresh(); this.event('进入 P4 卫星工作段，初始化独立教学能源与数据库存');
  }
  get running() { return OPS_RUNNING.includes(this.state.phase); }
  private event(label: string) { this.state.events.push({ time: this.state.time, label }); }
  align() { if (this.state.phase !== 'ops-ready') throw Error('当前不能启动定向。'); this.state.phase = 'ops-align'; this.state.message = '30 秒理想辅助：卫星朝向地球、翼板朝向太阳，发电随入射角变化；未模拟姿态力矩与真实驱动机构。'; this.event('启动理想对日定向'); }
  observe() { if (this.state.phase !== 'ops-power-ready') throw Error('请先完成定向检查。'); this.state.operations!.cycleStart = this.state.time; this.state.phase = 'ops-cycle'; this.state.message = '观察至少一圈：日照时收集 240 MB 教学数据，地影中停止成像并用电池供电；数据留在机上，尚未下传。'; this.event('启动日夜与一次对地观测任务'); this.refresh(); }
  downlink() { if (this.state.phase !== 'ops-data-ready') throw Error('请先完成观测检查。'); this.state.phase = 'ops-downlink'; this.state.message = '等待教学地面站仰角达到 10°，满足电量条件才传送；离开窗口即停止，未发完的数据继续保留。'; this.event('申请教学地面站下传'); this.refresh(); }
  private refresh() {
    const s = this.state, o = s.operations!, a = s.ascent!, body = s.deployment!.satellite;
    Object.assign(o, operationsReading(this.satellite.position, s.time, this.baseTime, o, body.massKg, s.phase), { elapsedS: s.time - o.startTime });
    Object.assign(body, { position: [...this.satellite.position], velocity: [...this.satellite.velocity], fixedPosition: rotateEarth(this.satellite.position, -s.time), altitudeM: surfaceAt(this.satellite.position).height, elements: orbitalElements(this.satellite.position, this.satellite.velocity) });
    const f = ascentForces(this.satellite, { dry: body.massKg, cdArea: 4.4 }, s.time, 0), vertical = dot(f.relative, f.up);
    Object.assign(a, { position: [...body.position], velocity: [...body.velocity], fixedPosition: [...body.fixedPosition], direction: o.direction, fixedDirection: rotateEarth(o.direction, -s.time), altitudeM: body.altitudeM, airSpeedMS: f.airSpeed, horizontalMS: Math.sqrt(Math.max(0, f.airSpeed ** 2 - vertical ** 2)), density: f.density, pressurePa: f.pressurePa, dynamicPressurePa: .5 * f.density * f.airSpeed ** 2, pitchDeg: Math.asin(Math.max(-1, Math.min(1, dot(o.direction, f.up)))) / rad });
    Object.assign(s, { massKg: body.massKg, heightM: body.altitudeM, speedMS: vertical, thrustN: 0, throttle: 0, weightN: body.massKg * LAUNCH_EARTH.gmM3S2 / norm(body.position) ** 2, dragN: f.drag, accelerationMS2: dot(f.acceleration, f.up) });
    s.orbit!.elements = body.elements;
    if (o.elapsedS >= this.nextSample - 1e-8) { this.sample(); this.nextSample = o.elapsedS + 10; }
  }
  private sample() { const o = this.state.operations!; if (o.samples.at(-1)?.t === o.elapsedS) return; o.samples.push({ t: o.elapsedS, batteryWh: o.energyJ / 3600, generationW: o.generationW, loadW: o.loadW, shadow: o.shadow, bufferMB: o.bufferMB, deliveredMB: o.deliveredMB, elevationDeg: Math.max(...o.links.map(l => l.elevationDeg)) }); }
  step() {
    if (!this.running) return;
    const s = this.state, o = s.operations!, mass = s.deployment!.satellite.massKg;
    let dt = Math.min(this.stepS, OPS.maxS - o.elapsedS);
    if (s.phase === 'ops-align') dt = Math.min(dt, OPS.alignS - o.elapsedS);
    if (o.energyJ <= o.capacityJ * OPS.reserve) o.reserveMode = true; else if (o.energyJ >= o.capacityJ * OPS.recover) o.reserveMode = false;
    const advance = (t: number) => integrateAscent(this.satellite, { dry: mass, cdArea: 4.4 }, s.time, t, () => 0);
    const midpoint = advance(dt / 2), reading = operationsReading(midpoint.position, s.time + dt / 2, this.baseTime, o, mass, s.phase);
    const energy = electricalStep(o.energyJ, o.capacityJ, reading.generationW, reading.loadW, dt);
    o.energyJ = energy.energyJ; o.generatedJ += reading.generationW * dt; o.consumedJ += reading.loadW * dt; o.lossJ += energy.lossJ; o.shuntedJ += energy.shuntedJ; o.unservedJ += energy.unservedJ;
    if (reading.shadow) { o.eclipseS += dt; o.eclipseSeen = true; } else { o.sunlightS += dt; if (o.eclipseSeen) o.sunlightAfterEclipse = true; }
    if (reading.collecting && energy.unservedJ === 0) { const count = Math.min(OPS.targetMB - o.collectedMB, OPS.observeMBs * dt); o.collectedMB += count; o.bufferMB += count; }
    if (reading.transmitting && energy.unservedJ === 0) { const count = Math.min(o.bufferMB, OPS.downlinkMBs * dt); o.bufferMB -= count; o.deliveredMB += count; }
    this.satellite = advance(dt); s.time += dt; this.stepsTaken++; this.refresh();
    if (o.shadow !== o.previousShadow) { this.event(o.shadow ? '卫星进入几何地影，太阳翼发电降为零' : '卫星离开几何地影，恢复日照发电'); o.previousShadow = o.shadow; }
    if (o.elapsedS >= OPS.maxS - 1e-8 || s.deployment!.satellite.altitudeM < 80000 || !Number.isFinite(o.energyJ)) { s.phase = 'ops-failed'; s.message = '达到 6 小时教学时限或轨迹边界，保留电量和未下传数据；没有强行完成任务。'; }
    else if (s.phase === 'ops-align' && o.elapsedS >= OPS.alignS - 1e-8) { s.phase = 'ops-power-ready'; s.message = '理想定向完成，时间冻结。先查看太阳翼发电与电池状态，再开启一圈日夜观测。'; }
    else if (s.phase === 'ops-cycle' && s.time - o.cycleStart! >= o.cyclePeriodS && o.collectedMB >= OPS.targetMB - 1e-8 && o.eclipseSeen && o.sunlightAfterEclipse) { s.phase = 'ops-data-ready'; s.message = '一圈日夜观察完成，240 MB 教学观测数据已存入卫星，尚未送到地面。确认后申请地面站窗口。'; }
    else if (s.phase === 'ops-downlink' && o.bufferMB <= 1e-8 && o.deliveredMB >= OPS.targetMB - 1e-8) { s.phase = 'ops-complete'; s.message = '240 MB 教学数据已通过可见窗口下传完毕，当前冻结。卫星继续具有在轨状态，尚未执行 P5 维护或退役。'; }
    if (!this.running) { this.refresh(); this.sample(); this.event(s.message); }
  }
  snapshot(): FlightState { return structuredClone(this.state); }
}
export class OperationsClock {
  paused = true; rate = 1; private debt = 0;
  constructor(readonly simulation: OperationsSimulation) {}
  pause(value: boolean) { this.paused = value; this.debt = 0; }
  setRate(value: number) { if (![1, 10, 100].includes(value)) throw Error('不支持的卫星任务倍率。'); this.rate = value; this.debt = 0; }
  advance(seconds: number) { if (this.paused || !this.simulation.running || !Number.isFinite(seconds) || seconds <= 0) return; this.debt += Math.min(seconds, .25) * this.rate; let budget = 120; while (this.debt + 1e-9 >= this.simulation.stepS && budget-- > 0 && this.simulation.running) { this.simulation.step(); this.debt -= this.simulation.stepS; } this.debt = this.simulation.running ? Math.min(this.debt, Math.max(this.simulation.stepS, .25 * this.rate)) : 0; }
}
