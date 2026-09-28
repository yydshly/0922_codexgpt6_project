import { SatelliteDisposalClock, SatelliteDisposalSimulation } from './satelliteDisposal';
import { LiftoffClock, LiftoffSimulation, type FlightState } from './liftoff';
import { AscentClock, AscentSimulation } from './ascent';
import { OrbitClock, OrbitSimulation } from './orbitInsertion';
import { DeploymentClock, DeploymentSimulation } from './deployment';
import { computeDeparture } from './launchEntry';
import { parseVehicle, type VehicleConfig } from './vehicle';
import { LifecycleClock, LifecycleSimulation } from './satelliteLifecycle';
import { OperationsClock, OperationsSimulation } from './satelliteOperations';
import { ReentryClock, ReentrySimulation } from './reentry';
import { AscentRecord } from './ascentRecord';
import { BoosterDescent } from './boosterDescent';
import { replayMatches } from './flightReplayComparison';

export const LEGACY_FLIGHT_VERSION = 'earth-flight-1/e3-1/e4-1/e5-1/e6-1';
export const P1_FLIGHT_VERSION = 'earth-flight-1/e3-1/e4-1/e5-1/e6-1/p1-1';
export const P2_FLIGHT_VERSION = 'earth-flight-1/e3-1/e4-1/e5-1/e6-1/p1-1/p2-1';
export const P3_FLIGHT_VERSION = P2_FLIGHT_VERSION + '/p3-1';
export const P4_FLIGHT_VERSION = P3_FLIGHT_VERSION + '/p4-1';
export const P5_FLIGHT_VERSION = P4_FLIGHT_VERSION + '/p5-1';
export const GROUND_FLIGHT_VERSION = P5_FLIGHT_VERSION + '/ground-1';
export const FLIGHT_VERSION = GROUND_FLIGHT_VERSION + '/sat-disposal-1';
export const FLIGHT_ACTIONS = ['reset', 'start', 'cancel', 'preview-ascent', 'continue-ascent', 'separate', 'continue-orbit', 'cutoff', 'coast', 'continue-deployment', 'open-fairing', 'deploy', 'continue-deployed', 'analyze-avoidance', 'skip-avoidance', 'align-avoidance', 'ignite-avoidance', 'observe-avoidance', 'analyze-deorbit', 'skip-deorbit', 'align-deorbit', 'ignite-deorbit', 'passivate-deorbit', 'prepare-reentry', 'coast-reentry', 'enter-reentry', 'descend-reentry', 'prepare-operations', 'align-operations', 'observe-operations', 'downlink-operations', 'prepare-maintenance', 'start-maintenance', 'keep-maintenance', 'review-retirement', 'command-retirement', 'close-retirement', 'observe-retirement', 'prepare-disposal', 'command-disposal', 'align-disposal', 'ignite-disposal', 'passivate-disposal', 'coast-disposal', 'enter-disposal', 'lower-disposal'] as const;
export type FlightAction = typeof FLIGHT_ACTIONS[number];
export interface FlightJournal { action: FlightAction; steps: number }
export interface FlightSave {
  version: typeof FLIGHT_VERSION | typeof GROUND_FLIGHT_VERSION | typeof P5_FLIGHT_VERSION | typeof LEGACY_FLIGHT_VERSION | typeof P1_FLIGHT_VERSION | typeof P2_FLIGHT_VERSION | typeof P3_FLIGHT_VERSION | typeof P4_FLIGHT_VERSION; savedAt: string; baseTime: number; config: VehicleConfig; rate: number;
  journal: FlightJournal[]; snapshot: FlightState; checksum: string;
}
type Clock = SatelliteDisposalClock | LiftoffClock | AscentClock | OrbitClock | DeploymentClock | ReentryClock | OperationsClock | LifecycleClock;
export function flightChecksum(snapshot: FlightState) { let h = 2166136261; const data = JSON.stringify(snapshot); for (let i = 0; i < data.length; i++) h = Math.imul(h ^ data.charCodeAt(i), 16777619); return (h >>> 0).toString(16); }
/** Replay is the restore boundary: no untrusted snapshot is injected into a physics object. */
export function parseFlightSave(raw: string): FlightSave {
  if (raw.length > 2_000_000) throw Error('飞行存档过大。');
  const value = JSON.parse(raw) as FlightSave;
  if (!value || ![FLIGHT_VERSION, GROUND_FLIGHT_VERSION, P5_FLIGHT_VERSION, LEGACY_FLIGHT_VERSION, P1_FLIGHT_VERSION, P2_FLIGHT_VERSION, P3_FLIGHT_VERSION, P4_FLIGHT_VERSION].includes(value.version)) throw Error('飞行存档版本不兼容，请保留原文件。');
  parseVehicle(value.config);
  if (!Number.isFinite(value.baseTime) || value.baseTime < 800000000 || value.baseTime > 900000000 || !Number.isFinite(Date.parse(value.savedAt)) || ![1, 4, 10, 100].includes(value.rate)) throw Error('存档日期或倍率无效。');
  if (!Array.isArray(value.journal) || value.journal.length < 1 || value.journal.length > 200 || value.journal[0].action !== 'reset') throw Error('存档操作记录无效。');
  if (value.config.satellitePlan === 'powered' && value.version !== FLIGHT_VERSION) throw Error('旧版存档不能携带新的离轨设备。');
  let total = 0;
  for (const [i, item] of value.journal.entries()) {
    if (!FLIGHT_ACTIONS.includes(item.action) || i > 0 && item.action === 'reset' || !Number.isInteger(item.steps) || item.steps < 0 || item.steps > 100000) throw Error('存档计算步数或操作无效。');
    if (value.version === LEGACY_FLIGHT_VERSION && item.action.endsWith('-avoidance')) throw Error('旧版存档不能包含新的避让操作。');
    if (value.version !== FLIGHT_VERSION && value.version !== GROUND_FLIGHT_VERSION && value.version !== P5_FLIGHT_VERSION && value.version !== P4_FLIGHT_VERSION && value.version !== P2_FLIGHT_VERSION && value.version !== P3_FLIGHT_VERSION && item.action.endsWith('-deorbit')) throw Error('旧版存档不能包含离轨操作。');
    if (value.version !== FLIGHT_VERSION && value.version !== GROUND_FLIGHT_VERSION && value.version !== P5_FLIGHT_VERSION && value.version !== P4_FLIGHT_VERSION && value.version !== P3_FLIGHT_VERSION && item.action.endsWith('-reentry')) throw Error('旧版存档不能包含再入操作。');
    if (value.version !== FLIGHT_VERSION && value.version !== GROUND_FLIGHT_VERSION && value.version !== P5_FLIGHT_VERSION && value.version !== P4_FLIGHT_VERSION && item.action.endsWith('-operations')) throw Error('旧版存档不能包含卫星工作操作。');
    if (value.version !== FLIGHT_VERSION && value.version !== GROUND_FLIGHT_VERSION && value.version !== P5_FLIGHT_VERSION && (item.action.endsWith('-maintenance') || item.action.endsWith('-retirement'))) throw Error('旧版存档不能包含维护退役操作。');
    if (item.action === 'descend-reentry' && value.version !== FLIGHT_VERSION && value.version !== GROUND_FLIGHT_VERSION) throw Error('旧版存档不能包含地表参考下降。');
    if (item.action.endsWith('-disposal') && value.version !== FLIGHT_VERSION) throw Error('旧版存档不能包含卫星离轨操作。');
    total += item.steps;
  }
  if (total > 100000 || !value.snapshot || !Number.isFinite(value.snapshot.time) || !Array.isArray(value.snapshot.events) || value.snapshot.events.length > 300 || value.checksum !== flightChecksum(value.snapshot)) throw Error('存档校验失败，请保留原文件。');
  return value;
}
export class FlightSession {
  clock: Clock;
  restoredWithRoundoff = false;
  ascentRecord = new AscentRecord();
  boosterDescent?: BoosterDescent;
  private observe = (state: FlightState) => { this.ascentRecord.observe(state); this.boosterDescent?.advanceTo(state.time); };
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
    else if (action === 'preview-ascent' && c instanceof LiftoffClock && before === 'ready') {
      const record = new AscentRecord();
      const departure = computeDeparture(this.config, c.simulation.snapshot(), state => record.observe(state));
      this.clock = new AscentClock(new AscentSimulation(this.config, departure)); this.ascentRecord = record; this.pause(true);
    }
    else if (action === 'continue-ascent' && c instanceof LiftoffClock) this.clock = new AscentClock(new AscentSimulation(this.config, c.simulation.snapshot()));
    else if (action === 'separate' && c instanceof AscentClock && before === 'stage-ready') { c.simulation.separate(); this.boosterDescent=new BoosterDescent(this.state); this.pause(false); }
    else if (action === 'continue-orbit' && c instanceof AscentClock) { this.clock = new OrbitClock(new OrbitSimulation(this.config, c.simulation.snapshot())); this.pause(true); }
    else if (action === 'cutoff' && c instanceof OrbitClock && before === 'orbit-burn') c.simulation.cutoff();
    else if (action === 'coast' && c instanceof OrbitClock && before === 'orbit-review') { c.simulation.startCoast(); this.pause(false); }
    else if (action === 'continue-deployment' && c instanceof OrbitClock) { this.clock = new DeploymentClock(new DeploymentSimulation(this.config, c.simulation.snapshot())); this.pause(true); }
    else if (action === 'open-fairing' && c instanceof DeploymentClock && before === 'deployment-ready') c.simulation.openFairing();
    else if (action === 'deploy' && c instanceof DeploymentClock && before === 'deployment-open') { c.simulation.deploy(); this.pause(false); }
    else if (action === 'continue-deployed' && c instanceof DeploymentClock && before === 'deployment-complete') { c.simulation.continueObservation(); this.pause(false); }
    else if (action === 'analyze-avoidance' && c instanceof DeploymentClock) { c.simulation.analyzeAvoidance(); this.pause(true); }
    else if (action === 'skip-avoidance' && c instanceof DeploymentClock) { c.simulation.skipAvoidance(); this.pause(true); }
    else if (action === 'align-avoidance' && c instanceof DeploymentClock) { c.simulation.alignAvoidance(); c.setRate(1); this.pause(false); }
    else if (action === 'ignite-avoidance' && c instanceof DeploymentClock) { c.simulation.igniteAvoidance(); c.setRate(1); this.pause(false); }
    else if (action === 'observe-avoidance' && c instanceof DeploymentClock) { c.simulation.observeAvoidance(); this.pause(false); }
    else if (action === 'analyze-deorbit' && c instanceof DeploymentClock) { c.simulation.analyzeDeorbit(); this.pause(true); }
    else if (action === 'skip-deorbit' && c instanceof DeploymentClock) { c.simulation.skipDeorbit(); this.pause(true); }
    else if (action === 'align-deorbit' && c instanceof DeploymentClock) { c.simulation.alignDeorbit(); c.setRate(1); this.pause(false); }
    else if (action === 'ignite-deorbit' && c instanceof DeploymentClock) { c.simulation.igniteDeorbit(); c.setRate(1); this.pause(false); }
    else if (action === 'passivate-deorbit' && c instanceof DeploymentClock) { c.simulation.passivateDeorbit(); c.setRate(1); this.pause(false); }
    else if (action === 'prepare-reentry' && c instanceof DeploymentClock) { this.clock = new ReentryClock(new ReentrySimulation(c.simulation.snapshot())); this.pause(true); }
    else if (action === 'coast-reentry' && c instanceof ReentryClock) { c.simulation.startCoast(); this.pause(false); }
    else if (action === 'enter-reentry' && c instanceof ReentryClock) { c.simulation.startEntry(); c.setRate(10); this.pause(false); }
    else if (action === 'descend-reentry' && c instanceof ReentryClock) { c.simulation.startLower(); c.setRate(10); this.pause(false); }
    else if (action === 'prepare-operations' && (c instanceof DeploymentClock || c instanceof ReentryClock)) { this.clock = new OperationsClock(new OperationsSimulation(c.simulation.snapshot(), this.baseTime)); this.pause(true); }
    else if (action === 'align-operations' && c instanceof OperationsClock) { c.simulation.align(); c.setRate(1); this.pause(false); }
    else if (action === 'observe-operations' && c instanceof OperationsClock) { c.simulation.observe(); c.setRate(100); this.pause(false); }
    else if (action === 'downlink-operations' && c instanceof OperationsClock) { c.simulation.downlink(); c.setRate(100); this.pause(false); }
    else if (action === 'prepare-maintenance' && c instanceof OperationsClock && !this.state.satelliteEquipment) { this.clock = new LifecycleClock(new LifecycleSimulation(c.simulation.snapshot(), this.baseTime)); this.pause(true); }
    else if (action === 'start-maintenance' && c instanceof LifecycleClock) { c.simulation.care(); c.setRate(100); this.pause(false); }
    else if (action === 'keep-maintenance' && c instanceof LifecycleClock) { c.simulation.keepWorking(); this.pause(true); }
    else if (action === 'review-retirement' && c instanceof LifecycleClock) { c.simulation.reviewDisposal(); this.pause(true); }
    else if (action === 'command-retirement' && c instanceof LifecycleClock) { c.simulation.commandRetirement(); c.setRate(100); this.pause(false); }
    else if (action === 'close-retirement' && c instanceof LifecycleClock) { c.simulation.closeEnergy(); c.setRate(100); this.pause(false); }
    else if (action === 'observe-retirement' && c instanceof LifecycleClock) { c.simulation.observeRetired(); c.setRate(100); this.pause(false); }
    else if (action === 'prepare-disposal' && c instanceof OperationsClock) { this.clock = new SatelliteDisposalClock(new SatelliteDisposalSimulation(c.simulation.snapshot(), this.baseTime)); this.pause(true); }
    else if (c instanceof SatelliteDisposalClock && action.endsWith('-disposal')) {
      const methods = { 'command-disposal': 'command', 'align-disposal': 'align', 'ignite-disposal': 'ignite', 'passivate-disposal': 'passivate', 'coast-disposal': 'coast', 'enter-disposal': 'enter', 'lower-disposal': 'lower' } as const;
      const method = methods[action as keyof typeof methods]; if (!method) throw Error('当前阶段不能执行此操作。');
      c.simulation[method](); c.setRate(action === 'ignite-disposal' || action === 'align-disposal' ? 10 : 100); this.pause(false);
    }
    else throw Error('当前阶段不能执行此操作。');
    this.journal.push({ action, steps: 0 });
    this.observe(this.state);
  }
  advance(seconds: number) {
    const before = this.clock.simulation.stepsTaken;
    if ((this.clock instanceof DeploymentClock || this.clock instanceof ReentryClock || this.clock instanceof OperationsClock || this.clock instanceof LifecycleClock || this.clock instanceof SatelliteDisposalClock)) this.clock.advance(seconds); else this.clock.advance(seconds, this.observe);
    this.journal.at(-1)!.steps += this.clock.simulation.stepsTaken - before;
    this.boosterDescent?.advanceTo(this.state.time);
  }
  /** Used for deterministic replay and tests; same individual physical steps as the live clock. */
  advanceSteps(count: number) {
    for (let i = 0; i < count; i++) { if (!this.running) throw Error('存档包含越过暂停检查点的计算步数。'); this.clock.simulation.step(); this.observe(this.state); this.journal.at(-1)!.steps++; }
  }
  save(): FlightSave {
    const snapshot = this.clock.simulation.snapshot();
    return { version: FLIGHT_VERSION, savedAt: new Date().toISOString(), baseTime: this.baseTime, config: { ...this.config }, rate: this.rate, journal: structuredClone(this.journal), snapshot, checksum: flightChecksum(snapshot) };
  }
  static restore(raw: string): FlightSession {
    const save = parseFlightSave(raw), session = new FlightSession(save.config, save.baseTime);
    for (const [index, item] of save.journal.entries()) { if (index > 0) session.action(item.action as Exclude<FlightAction, 'reset'>); session.advanceSteps(item.steps); }
    const replayed = session.clock.simulation.snapshot();
    if (flightChecksum(replayed) !== save.checksum) {
      if (!replayMatches(save.snapshot, replayed)) throw Error('重算结果与存档不一致，未替换当前飞行。');
      session.restoredWithRoundoff = true;
    }
    session.setRate(save.rate); session.pause(true); return session;
  }
}
