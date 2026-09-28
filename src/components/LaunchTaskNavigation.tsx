import { useRef } from 'react';
import type { FlightState } from '../launch/liftoff';
import { DEMO_CHAPTERS, type DemoStatus } from '../launch/fullFlightDemo';
import { demoTaskLocation, TASK_STEPS, taskStep } from '../launch/taskJourney';
import type { SatellitePlan } from '../launch/satellitePlan';
import { flightPhaseName } from './LaunchControl';
import './LaunchTaskNavigation.css';

export const planName = (plan: SatellitePlan) => plan === 'powered' ? 'E02 · 动力离轨' : 'E01 · 无推进留轨';
export function NewFlightDemo({ plan, disabled, onPlan, onStart }: { plan: SatellitePlan; disabled: boolean; onPlan: (plan: SatellitePlan) => void; onStart: () => void }) {
  const picker = useRef<HTMLDetailsElement>(null);
  return <details ref={picker} className="launch-demo-picker" onKeyDown={event => {
    if (event.key === 'Escape' && picker.current?.open) { event.preventDefault(); event.stopPropagation(); picker.current.open = false; picker.current.querySelector('summary')?.focus(); }
  }}><summary>新建全程演示</summary><div className="launch-demo-setup">
    <strong>为新演示选择方案</strong><p>使用基准载具建立独立演示。原任务与浏览器存档保留，退出演示后返回原任务。</p>
    <label className="launch-demo-choice">仅用于新演示<select disabled={disabled} aria-label="新演示的卫星方案" value={plan} onChange={event => onPlan(event.target.value as SatellitePlan)}><option value="unpowered">E01 · 无推进留轨</option><option value="powered">E02 · 动力离轨</option></select></label>
    <small>选择不会修改当前任务；当前任务的方案由发射前的载具配置决定。</small>
    <button className="launch-demo-entry" disabled={disabled} onClick={() => { if (picker.current) picker.current.open = false; onStart(); }}>从头到尾演示 · {plan === 'powered' ? 'E02' : 'E01'} →</button>
  </div></details>;
}
export function LaunchTaskContext({ state, plan, demo, flightView, editing }: { state: FlightState; plan: SatellitePlan; demo: DemoStatus; flightView: boolean; editing: boolean }) {
  const current = taskStep(state, flightView, editing);
  return <section className="launch-task-context" aria-label="当前任务位置">
    <small>{demo.active ? '自动演示' : '当前任务'} · {planName(plan)}</small>
    <strong>{demo.active ? `演示第 ${demo.chapter + 1} / ${DEMO_CHAPTERS.length} 章` : `任务步骤 ${String(current + 1).padStart(2, '0')} / ${TASK_STEPS.length}`} · {TASK_STEPS[current]}</strong>
    <span>{demo.active ? demoTaskLocation(demo.chapter) : flightView || state.phase !== 'ready' ? flightPhaseName(state) : editing ? '编辑草稿，应用后才用于发射' : '先组装载具，或使用当前配置准备发射'}</span>
  </section>;
}
export function DemoChapterNavigation({ demo, busy, onRevisit }: { demo: DemoStatus; busy: boolean; onRevisit: (chapter: number) => void }) {
  return <footer className="launch-stages launch-demo-stages" aria-label="自动演示七章进度">{DEMO_CHAPTERS.map((chapter, index) => <button key={chapter.title} disabled={busy || !demo.visited.includes(index)} aria-current={demo.chapter === index ? 'step' : undefined} onClick={() => onRevisit(index)}>
    <span>{String(index + 1).padStart(2, '0')}</span><strong>{demo.plan === 'powered' && index === 6 ? '动力离轨与结尾' : chapter.title}</strong><small>{!demo.visited.includes(index) ? '未到达 · 顺序播放解锁' : demo.chapter === index ? '当前章节 · 回看章首' : '已到达 · 回看章首'}</small>
  </button>)}</footer>;
}
