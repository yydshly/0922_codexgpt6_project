import { LiftoffClock, LiftoffSimulation, type FlightState } from './liftoff';
import { AscentClock, AscentSimulation } from './ascent';
import { OrbitClock, OrbitSimulation } from './orbitInsertion';
import { DeploymentClock, DeploymentSimulation } from './deployment';
import { computeDeparture } from './launchEntry';
import { parseVehicle, type VehicleConfig } from './vehicle';

export const FLIGHT_VERSION = 'earth-flight-1/e3-1/e4-1/e5-1/e6-1';
export const FLIGHT_ACTIONS = ['reset', 'start', 'cancel', 'preview-ascent', 'continue-ascent', 'separate', 'continue-orbit', 'cutoff', 'coast', 'continue-deployment', 'open-fairing', 'deploy', 'continue-deployed'] as const;
export type FlightAction = typeof FLIGHT_ACTIONS[number];
export interface FlightJournal { action: FlightAction; steps: number }
export interface FlightSave {
  version: typeof FLIGHT_VERSION; savedAt: string; baseTime: number; config: VehicleConfig; rate: number;
  journal: FlightJournal[]; snapshot: FlightState; checksum: string;
}
type Clock = LiftoffClock | AscentClock | OrbitClock | DeploymentClock;
export function flightChecksum(snapshot: FlightState) { let h = 2166136261; const data = JSON.stringify(snapshot); for (let i = 0; i < data.length; i++) h = Math.imul(h ^ data.charCodeAt(i), 16777619); return (h >>> 0).toString(16); }
/** Replay is the restore boundary: no untrusted snapshot is injected into a physics object. */
export function parseFlightSave(raw: string): FlightSave {
  if (raw.length > 2_000_000) throw Error('飞行存档过大。');
  const value = JSON.parse(raw) as FlightSave;
  if (!value || value.version !== FLIGHT_VERSION) throw Error('飞行存档版本不兼容，请保留原文件。');
  parseVehicle(value.config);
  if (!Number.isFinite(value.baseTime) || value.baseTime < 800000000 || value.baseTime > 900000000 || !Number.isFinite(Date.parse(value.savedAt)) || ![1, 4, 10, 100].includes(value.rate)) throw Error('存档日期或倍率无效。');
  if (!Array.isArray(value.journal) || value.journal.length < 1 || value.journal.length > 200 || value.journal[0].action !== 'reset') throw Error('存档操作记录无效。');
  let total = 0;
  for (const [i, item] of value.journal.entries()) {
    if (!FLIGHT_ACTIONS.includes(item.action) || i > 0 && item.action === 'reset' || !Number.isInteger(item.steps) || item.steps < 0 || item.steps > 100000) throw Error('存档计算步数或操作无效。');
    total += item.steps;
  }
  if (total > 100000 || !value.snapshot || !Number.isFinite(value.snapshot.time) || !Array.isArray(value.snapshot.events) || value.snapshot.events.length > 300 || value.checksum !== flightChecksum(value.snapshot)) throw Error('存档校验失败，请保留原文件。');
  return value;
}
export class FlightSession {
  clock: Clock;
  journal: FlightJournal[] = [{ action: 'reset', steps: 0 }];
  readonly config: VehicleConfig;
  constructor(config: VehicleConfig, readonly baseTime: number) { this.config = parseVehicle(config); this.clock = new LiftoffClock(new LiftoffSimulation(this.config)); }
  get state() { return this.clock.simulation.state; }
  get rate() { return this.clock instanceof LiftoffClock ? 1 : this.clock.rate; }
  get running() { return this.clock instanceof LiftoffClock ? ['countdown', 'ignition', 'ascending'].includes(this.state.phase) : this.clock.simulation.running; }
  pause(value: boolean) { this.clock.pause(value); }
  setRate(value: number) { if (this.clock instanceof LiftoffClock) { if (value !== 1) throw Error('离台仅支持 1 倍'); } else this.clock.setRate(value); }
  action(action: Exclude<FlightAction, 'reset'>) {
    const c = this.clock, before = this.state.phase;
    if (action === 'start' && c instanceof LiftoffClock && before === 'ready') c.simulation.start();
    else if (action === 'cancel' && c instanceof LiftoffClock && ['countdown', 'ignition'].includes(before)) c.simulation.cancel();
    else if (action === 'preview-ascent' && c instanceof LiftoffClock && before === 'ready') { this.clock = new AscentClock(new AscentSimulation(this.config, computeDeparture(this.config, c.simulation.snapshot()))); this.pause(true); }
    else if (action === 'continue-ascent' && c instanceof LiftoffClock) this.clock = new AscentClock(new AscentSimulation(this.config, c.simulation.snapshot()));
    else if (action === 'separate' && c instanceof AscentClock && before === 'stage-ready') { c.simulation.separate(); this.pause(false); }
    else if (action === 'continue-orbit' && c instanceof AscentClock) { this.clock = new OrbitClock(new OrbitSimulation(this.config, c.simulation.snapshot())); this.pause(true); }
    else if (action === 'cutoff' && c instanceof OrbitClock && before === 'orbit-burn') c.simulation.cutoff();
    else if (action === 'coast' && c instanceof OrbitClock && before === 'orbit-review') { c.simulation.startCoast(); this.pause(false); }
    else if (action === 'continue-deployment' && c instanceof OrbitClock) { this.clock = new DeploymentClock(new DeploymentSimulation(this.config, c.simulation.snapshot())); this.pause(true); }
    else if (action === 'open-fairing' && c instanceof DeploymentClock && before === 'deployment-ready') c.simulation.openFairing();
    else if (action === 'deploy' && c instanceof DeploymentClock && before === 'deployment-open') { c.simulation.deploy(); this.pause(false); }
    else if (action === 'continue-deployed' && c instanceof DeploymentClock && before === 'deployment-complete') { c.simulation.continueObservation(); this.pause(false); }
    else throw Error('当前阶段不能执行此操作。');
    this.journal.push({ action, steps: 0 });
  }
  advance(seconds: number) { const before = this.clock.simulation.stepsTaken; this.clock.advance(seconds); this.journal.at(-1)!.steps += this.clock.simulation.stepsTaken - before; }
  /** Used for deterministic replay and tests; same individual physical steps as the live clock. */
  advanceSteps(count: number) {
    for (let i = 0; i < count; i++) { if (!this.running) throw Error('存档包含越过暂停检查点的计算步数。'); this.clock.simulation.step(); this.journal.at(-1)!.steps++; }
  }
  save(): FlightSave {
    const snapshot = this.clock.simulation.snapshot();
    return { version: FLIGHT_VERSION, savedAt: new Date().toISOString(), baseTime: this.baseTime, config: { ...this.config }, rate: this.rate, journal: structuredClone(this.journal), snapshot, checksum: flightChecksum(snapshot) };
  }
  static restore(raw: string): FlightSession {
    const save = parseFlightSave(raw), session = new FlightSession(save.config, save.baseTime);
    for (const [index, item] of save.journal.entries()) { if (index > 0) session.action(item.action as Exclude<FlightAction, 'reset'>); session.advanceSteps(item.steps); }
    if (flightChecksum(session.clock.simulation.snapshot()) !== save.checksum) throw Error('重算结果与存档不一致，未替换当前飞行。');
    session.setRate(save.rate); session.pause(true); return session;
  }
}
