import { satellitePlan, type SatellitePlan } from './satellitePlan';
import { FlightSession } from './flightSession';
import { demoCheckpoint } from './demoSequence';
import { BASELINE_VEHICLE } from './vehicle';
import type { FlightState } from './liftoff';
import { completedDemoResult, type DemoResult } from './demoComparison';
import { satelliteDemoPacing } from './satelliteDemo';

export interface DemoStatus { active: boolean; paused: boolean; finished: boolean; error: string; chapter: number; speed: 1 | 3; holdS: number; plan: SatellitePlan; visited: number[]; results: Partial<Record<SatellitePlan, DemoResult>> }
export const DEMO_IDLE: DemoStatus = { active: false, paused: true, finished: false, error: '', chapter: 0, speed: 1, holdS: 0, plan: 'unpowered', visited: [], results: {} };
export const DEMO_CHAPTERS = [
  { title: '准备与点火', description: '使用基准两级火箭与 500 kg 无推进卫星。自动检查起飞条件，观察倒计时、建压和离台。' },
  { title: '上升与分级', description: '辅助转弯、耗油、阻力与分级来自同一计算；一级燃尽后自动分离并启动二级。' },
  { title: '入轨与验证', description: '达到轨道条件后关机，实际滑行一圈再判断入轨；长滑行会自动加速。' },
  { title: '部署与分离', description: '开舱、释放卫星并分析侧向避让；卫星与二级成为独立对象。' },
  { title: '二级离轨与再入', description: '二级反向点火后处理剩余储能，继续下降；20 km 后用等效物体标记延伸到地表，非材料存活预测。' },
  { title: '卫星开始工作', description: '自动演示定向供电、地表观测范围、机上保存、窗口下传与交付。观测时切入地表近景，下传时返回轨道全景。' },
  { title: '退役与最终结果', description: '自动展示结束业务、隔离充电和电能收尾。无推进 E01 仍在轨；两条路线的结果分别解释。' },
] as const;
export function demoChapter(s: FlightState) { return s.satelliteDisposal || s.lifecycle ? 6 : s.operations ? 5 : s.reentry || s.deployment?.deorbit ? 4 : s.deployment ? 3 : s.orbit ? 2 : s.ascent ? 1 : 0; }

/** Runs real, journalled commands in a separate session. No fabricated checkpoints or state injection. */
export class FullFlightDemo {
  readonly original: FlightSession;
  session: FlightSession;
  status: DemoStatus = { ...DEMO_IDLE, active: true, paused: false, visited: [], results: {} };
  private checkpoints = new Map<number, string>();
  private lastPhase = '';
  constructor(original: FlightSession, plan: SatellitePlan = satellitePlan(original.config)) { this.original = original; original.pause(true); this.status.plan=plan; this.session = new FlightSession({...BASELINE_VEHICLE, ...(plan === 'powered' ? {satellitePlan: plan} : {})}, original.baseTime); this.rememberChapter(); }
  private rememberChapter() {
    const chapter = demoChapter(this.session.state); this.status.chapter = chapter;
    if (!this.checkpoints.has(chapter)) { this.checkpoints.set(chapter, JSON.stringify(this.session.save())); this.status.visited = [...this.checkpoints.keys()].sort((a,b)=>a-b); }
  }
  revisit(chapter: number) {
    if (!Number.isInteger(chapter) || !this.checkpoints.has(chapter)) throw Error('只能回看本方案已经实际运行过的章节。');
    const restored = FlightSession.restore(this.checkpoints.get(chapter)!);
    this.session = restored; this.lastPhase = '';
    Object.assign(this.status, { chapter, paused: true, finished: false, error: '', holdS: 0 });
  }
  restartPlan(plan: SatellitePlan) {
    if (!['powered','unpowered'].includes(plan)) throw Error('演示方案无效。');
    this.session = new FlightSession({...BASELINE_VEHICLE, ...(plan === 'powered' ? { satellitePlan: plan } : {})}, this.original.baseTime);
    this.checkpoints.clear(); this.lastPhase = '';
    Object.assign(this.status, { plan, chapter: 0, paused: true, finished: false, error: '', holdS: 0, visited: [] });
    this.rememberChapter();
  }
  pause(v: boolean) { this.status.paused = v || this.status.finished || !!this.status.error; this.session.pause(this.status.paused); }
  setSpeed(v: 1 | 3) { this.status.speed = v; }
  stop() { this.pause(true); this.original.pause(true); return this.original; }
  advance(seconds: number) {
    if (this.status.paused || this.status.finished || this.status.error || !Number.isFinite(seconds) || seconds <= 0) return;
    const s = this.session.state, phase = s.phase;
    this.rememberChapter();
    if (phase === 'aborted' || phase.endsWith('-failed')) { this.status.error = s.message; this.pause(true); return; }
    if (phase === 'life-observed' || phase === 'disposal-complete') { const result = completedDemoResult(s, this.session.baseTime); if (result) this.status.results[result.plan] = result; this.status.finished = true; this.pause(true); return; }
    if (phase !== this.lastPhase) { this.lastPhase = phase; this.status.holdS = 0; }
    try {
      const pacing = satelliteDemoPacing(s);
      if (!this.session.running) {
        const checkpoint = demoCheckpoint(s);
        if (!checkpoint) throw Error(`演示停在未安排的检查点：${phase}`);
        this.status.holdS += Math.min(seconds, .25);
        if (this.status.holdS < checkpoint.durationS) return;
        this.session.action(checkpoint.action); this.rememberChapter(); this.session.pause(false);
        this.status.holdS = 0; this.lastPhase = ''; return;
      }
      const rate = phase === 'ops-align' ? 1 : pacing.visibleWork || ['disposal-align','disposal-burn'].includes(phase) ? 10 : !s.ascent ? 1 : !s.orbit || phase === 'orbit-burn' ? 10 : ['avoidance-align','avoidance-burn','deorbit-align','deorbit-burn'].includes(phase) ? 1 : 100;
      if (this.session.rate !== rate) this.session.setRate(rate);
      if (this.session.clock.paused) this.session.pause(false);
      // Speed increases solver work only. Bound each slice and retain the clocks' own CPU limits.
      let remaining = Math.min(seconds, .25) * (pacing.visibleWork || ['countdown','ignition'].includes(phase) ? 1 : this.status.speed);
      while (remaining > 1e-9 && this.session.running) {
        // Notice the first usable sunlight/contact step before a fast slice can finish the work.
        const dt = Math.min(['ops-cycle','ops-downlink'].includes(phase) && !pacing.visibleWork ? .01 : .2, remaining);
        this.session.advance(dt); remaining -= dt;
        if (!pacing.visibleWork && satelliteDemoPacing(this.session.state).visibleWork) break;
      }
    } catch (e) { this.status.error = e instanceof Error ? e.message : '演示停止'; this.pause(true); }
  }
}
