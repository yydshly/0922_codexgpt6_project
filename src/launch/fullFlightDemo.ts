import { FlightSession, type FlightAction } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import type { FlightState } from './liftoff';

export interface DemoStatus { active: boolean; paused: boolean; finished: boolean; error: string; chapter: number; speed: 1 | 3; holdS: number }
export const DEMO_IDLE: DemoStatus = { active: false, paused: true, finished: false, error: '', chapter: 0, speed: 1, holdS: 0 };
export const DEMO_CHAPTERS = [
  { title: '准备与点火', description: '使用基准两级火箭与 500 kg 无推进卫星。自动检查起飞条件，观察倒计时、建压和离台。' },
  { title: '上升与分级', description: '辅助转弯、耗油、阻力与分级来自同一计算；一级燃尽后自动分离并启动二级。' },
  { title: '入轨与验证', description: '达到轨道条件后关机，实际滑行一圈再判断入轨；长滑行会自动加速。' },
  { title: '部署与分离', description: '开舱、释放卫星并分析侧向避让；卫星与二级成为独立对象。' },
  { title: '二级离轨与再入', description: '二级反向点火后处理剩余储能，继续下降；20 km 后用等效物体标记延伸到地表，非材料存活预测。' },
  { title: '卫星开始工作', description: '二级转为带时刻的历史记录；卫星继续定向、发电、采集和窗口下传。' },
  { title: '退役与最终结果', description: '自动展示结束业务、隔离充电和电能收尾。无推进 E01 仍在轨；两条路线的结果分别解释。' },
] as const;
export function demoChapter(s: FlightState) { return s.lifecycle ? 6 : s.operations ? 5 : s.reentry || s.deployment?.deorbit ? 4 : s.deployment ? 3 : s.orbit ? 2 : s.ascent ? 1 : 0; }
const transitions: Partial<Record<FlightState['phase'], Exclude<FlightAction, 'reset'>>> = {
  ready: 'start', complete: 'continue-ascent', 'stage-ready': 'separate', 'ascent-complete': 'continue-orbit',
  'orbit-review': 'coast', 'orbit-complete': 'continue-deployment', 'deployment-ready': 'open-fairing', 'deployment-open': 'deploy',
  'deployment-complete': 'analyze-avoidance', 'avoidance-review': 'align-avoidance', 'avoidance-armed': 'ignite-avoidance',
  'avoidance-cutoff': 'observe-avoidance', 'avoidance-complete': 'analyze-deorbit', 'deorbit-review': 'align-deorbit',
  'deorbit-armed': 'ignite-deorbit', 'deorbit-cutoff': 'passivate-deorbit', 'deorbit-complete': 'prepare-reentry',
  'reentry-ready': 'coast-reentry', 'reentry-interface': 'enter-reentry', 'reentry-complete': 'descend-reentry', 'reentry-surface': 'prepare-operations',
  'ops-ready': 'align-operations', 'ops-power-ready': 'observe-operations', 'ops-data-ready': 'downlink-operations', 'ops-complete': 'prepare-maintenance',
  'life-ready': 'start-maintenance', 'life-review': 'review-retirement', 'life-disposal': 'command-retirement', 'life-commanded': 'close-retirement', 'life-retired': 'observe-retirement',
};

/** Runs real, journalled commands in a separate session. No fabricated checkpoints or state injection. */
export class FullFlightDemo {
  readonly original: FlightSession;
  readonly session: FlightSession;
  status: DemoStatus = { ...DEMO_IDLE, active: true, paused: false };
  private lastPhase = '';
  constructor(original: FlightSession) { this.original = original; original.pause(true); this.session = new FlightSession(BASELINE_VEHICLE, original.baseTime); }
  pause(v: boolean) { this.status.paused = v || this.status.finished || !!this.status.error; this.session.pause(this.status.paused); }
  setSpeed(v: 1 | 3) { this.status.speed = v; }
  stop() { this.pause(true); this.original.pause(true); return this.original; }
  advance(seconds: number) {
    if (this.status.paused || this.status.finished || this.status.error || !Number.isFinite(seconds) || seconds <= 0) return;
    const s = this.session.state, phase = s.phase;
    this.status.chapter = demoChapter(s);
    if (phase === 'aborted' || phase.endsWith('-failed')) { this.status.error = s.message; this.pause(true); return; }
    if (phase === 'life-observed') { this.status.finished = true; this.pause(true); return; }
    if (phase !== this.lastPhase) { this.lastPhase = phase; this.status.holdS = 0; }
    try {
      if (!this.session.running) {
        this.status.holdS += Math.min(seconds, .25);
        if (this.status.holdS < (phase === 'ready' || phase === 'reentry-surface' || phase === 'life-disposal' ? 4 : 2)) return;
        const action = transitions[phase];
        if (!action) throw Error(`演示停在未安排的检查点：${phase}`);
        this.session.action(action); this.session.pause(false); this.lastPhase = ''; return;
      }
      const rate = !s.ascent ? 1 : !s.orbit || phase === 'orbit-burn' ? 10 : ['avoidance-align','avoidance-burn','deorbit-align','deorbit-burn','ops-align'].includes(phase) ? 1 : 100;
      if (this.session.rate !== rate) this.session.setRate(rate);
      if (this.session.clock.paused) this.session.pause(false);
      // Speed increases solver work only. Bound each slice and retain the clocks' own CPU limits.
      let remaining = Math.min(seconds, .25) * (['countdown','ignition'].includes(phase) ? 1 : this.status.speed);
      while (remaining > 1e-9 && this.session.running) { const dt = Math.min(.2, remaining); this.session.advance(dt); remaining -= dt; }
    } catch (e) { this.status.error = e instanceof Error ? e.message : '演示停止'; this.pause(true); }
  }
}
