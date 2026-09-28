import { demoTaskLocation } from '../launch/taskJourney';
import { SatelliteDemoCapability } from './SatelliteDemoCapability';
import { useEffect, useRef } from 'react';
import { ProjectNotes } from './ProjectNotes';
import { satelliteDemoCue } from '../launch/satelliteDemo';
import type { BoosterRecord } from '../launch/boosterDescent';
import { DEMO_CHAPTERS, type DemoStatus } from '../launch/fullFlightDemo';
import type { FlightState } from '../launch/liftoff';
import { DemoPlaybackStatus } from './DemoPlaybackStatus';
import { FlightEnding } from './FlightEnding';
import { DemoPlanComparison } from './DemoPlanComparison';
import type { SatellitePlan } from '../launch/satellitePlan';
export function FullFlightDemoPanel({ booster, busy, demo, state, onPause, onRead, onExit, onSpeed, onResults, onRevisit, onPlan, onCapability }: { booster?:BoosterRecord|null; busy: boolean; demo: DemoStatus; state: FlightState; onPause: () => void; onRead: () => void; onExit: () => void; onSpeed: (v: 1 | 3) => void; onResults: () => void; onRevisit: (chapter: number) => void; onPlan: (plan: SatellitePlan) => void; onCapability: () => void }) {
  const panel = useRef<HTMLElement>(null), title = useRef<HTMLHeadingElement>(null);
  const reading = useRef({ busy, demo, onRead }); reading.current = { busy, demo, onRead };
  useEffect(() => {
    const element = panel.current;
    const pauseOnOpen = (event: Event) => {
      const { busy, demo, onRead } = reading.current;
      if (event.target instanceof HTMLDetailsElement && event.target.open && !busy && !demo.paused && !demo.finished && !demo.error) onRead();
    };
    // Native toggle does not bubble; capture nested notes and all chapter/plan disclosures.
    element?.addEventListener('toggle', pauseOnOpen, true);
    return () => element?.removeEventListener('toggle', pauseOnOpen, true);
  }, []);
  const returnToDemo = () => {
    panel.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(detail => { detail.open = false; });
    requestAnimationFrame(() => { title.current?.scrollIntoView({ block: 'start' }); title.current?.focus({ preventScroll: true }); });
  };
  const revisit = (chapter: number) => { onRevisit(chapter); returnToDemo(); };
  const locate = () => { onCapability(); returnToDemo(); };
  const chapter = demo.plan === 'powered' && demo.chapter===0 ? {title:'准备与点火',description:'E02：500 kg 卫星基体加装 35 kg 设备和 40 kg 推进剂，共 575 kg。离轨设备从起飞开始计入质量。'} : demo.plan === 'powered' && demo.chapter===6 ? {title:'E02 动力离轨与结尾',description:'结束业务后保留控制能力，执行卫星自身反向点火，再处理剩余储能并观察再入。不会自动判定全部烧毁。'} : DEMO_CHAPTERS[demo.chapter];
  return <section ref={panel} className="full-flight-demo" aria-label="从头到尾自动演示" aria-busy={busy}>
    {busy && <p role="status">正在恢复章节与读数，请稍候…</p>}<fieldset className="demo-interactions" disabled={busy} aria-label="演示操作">
    <small>独立演示 · 原任务与浏览器存档保留</small>
    <h2 ref={title} tabIndex={-1}>{demo.finished ? '演示结束 · 查看两条路线的结果' : `${demo.chapter + 1} / ${DEMO_CHAPTERS.length} · ${chapter.title}`}</h2>
    <small>{demoTaskLocation(demo.chapter)} · 章节按观看顺序组织，任务步骤表示实际工作阶段。</small><p>{chapter.description}</p>
    <div className="demo-controls">{!demo.finished && <button disabled={!!demo.error} onClick={onPause}>{demo.paused ? '继续全程演示' : '暂停全程演示'}</button>}<button onClick={onExit}>退出演示，返回原任务</button></div>
    <DemoPlaybackStatus state={state} demo={demo} busy={busy}/>
    <SatelliteDemoCapability state={state} onView={onCapability}/>
    {!demo.finished && <div className="demo-controls" aria-label="自动演示速度">{([1,3] as const).map(v => <button key={v} aria-pressed={demo.speed === v} onClick={() => onSpeed(v)}>{v === 1 ? '讲解节奏' : '快速演示'}</button>)}</div>}
    <small>展开下方章节、对比或说明会暂停演示；阅读后可点「继续全程演示」。</small>
    <details className="demo-chapters"><summary>章节回看 · 已到达 {demo.visited.length} / 7 章</summary><p>展开时暂停演示。点击已到达的章节，回到该章起点，再点「继续全程演示」。未到达的章节需先顺序运行。</p><ol>{DEMO_CHAPTERS.map((c,i)=><li key={i}><button disabled={!demo.visited.includes(i)} aria-current={demo.chapter===i?'step':undefined} onClick={()=>revisit(i)}>{i+1}. {demo.plan==='powered'&&i===6?'E02 动力离轨与结尾':c.title}{!demo.visited.includes(i)?' · 未到达':''}</button></li>)}</ol></details>
    <DemoPlanComparison demo={demo} onPlan={plan => { onPlan(plan); returnToDemo(); }}/>
    <details className="demo-acceptance"><summary>本阶段验收 · 看什么、如何演示</summary><p>下面是检查要点。实际三维效果在第 6 章自动展示：太阳翼转向 → 地表观测 → 窗口下传 → 核对交付。</p><ol><li>定向与供电：蓝箭头对齐黄箭头；核对夹角、功率与地影。</li><li>观测到交付：比较视场、拖动再取景；核对机上保存与地面已收。</li><li>结尾与恢复：比较 E01/E02，检查章节回看和退出保留原任务。</li></ol>
      <div className="demo-acceptance-actions">
        {satelliteDemoCue(state) && <button onClick={locate}>定位当前卫星演示画面</button>}
        <button disabled={!demo.visited.includes(5)} onClick={() => revisit(5)}>回看第 6 章 · 卫星工作过程</button>
        {demo.finished && <button onClick={onResults}>核对本次结果</button>}
        {!demo.finished && !demo.error && <button onClick={() => { if (demo.paused) onPause(); returnToDemo(); }}>返回画面并继续演示</button>}
      </div>
      <p className="demo-reading-note">展开说明时自动暂停；收起说明仍保持暂停，可用「返回画面并继续演示」继续播放。</p>
      <p>{demo.visited.includes(5) ? '回看会暂停在第 6 章起点，再点「继续全程演示」观看太阳翼转向和后续过程。定位画面只调整镜头，不改变时间。' : '尚未到达第 6 章。请继续全程演示，完成前面的发射、入轨与部署后自动进入；已到达的章节才可回看。'}</p>
      <p data-satellite-release="2026.09.28-satellite-rc1">卫星观测演示 · 2026.09.28 待验收版。三组体验确认后归档；真实成像、自由操控等另作后续。</p><ProjectNotes file="SATELLITE-DEMO-CLOSEOUT.md" label="阅读本阶段范围、检查记录与归档条件"/>
    </details>
    <details><summary>本次路线与当前发生的事</summary><ol>{DEMO_CHAPTERS.map((c,i) => <li key={c.title} aria-current={demo.chapter===i?'step':undefined}>{demo.plan==='powered'&&i===6?'E02 动力离轨与结尾':c.title}</li>)}</ol><p>{state.message}</p><p>阶段命令由演示自动执行；没有预录视频或伪造成功状态。长时段压缩播放，倍率增加计算次数。鼠标可自由旋转和缩放，阶段切换才自动取景。</p></details>
    {demo.finished && <><FlightEnding state={state} booster={booster}/><button onClick={onResults}>查看本次任务结果与摘要</button></>}
  </fieldset></section>;
}
