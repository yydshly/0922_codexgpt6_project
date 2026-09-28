import { DEMO_CHAPTERS, type DemoStatus } from '../launch/fullFlightDemo';
import type { FlightState } from '../launch/liftoff';
import { flightPhaseName, flightTime } from './LaunchControl';
import { FlightEnding } from './FlightEnding';
import { DemoPlanComparison } from './DemoPlanComparison';
import type { SatellitePlan } from '../launch/satellitePlan';
export function FullFlightDemoPanel({ busy, demo, state, onPause, onExit, onSpeed, onResults, onRevisit, onPlan }: { busy: boolean; demo: DemoStatus; state: FlightState; onPause: () => void; onExit: () => void; onSpeed: (v: 1 | 3) => void; onResults: () => void; onRevisit: (chapter: number) => void; onPlan: (plan: SatellitePlan) => void }) {
  const chapter = demo.plan === 'powered' && demo.chapter===0 ? {title:'准备与点火',description:'E02：500 kg 卫星基体加装 35 kg 设备和 40 kg 推进剂，共 575 kg。离轨设备从起飞开始计入质量。'} : demo.plan === 'powered' && demo.chapter===6 ? {title:'E02 动力离轨与结尾',description:'结束业务后保留控制能力，执行卫星自身反向点火，再处理剩余储能并观察再入。不会自动判定全部烧毁。'} : DEMO_CHAPTERS[demo.chapter];
  return <section className="full-flight-demo" aria-label="从头到尾自动演示" aria-busy={busy}>
    {busy && <p role="status">正在恢复章节与读数，请稍候…</p>}<fieldset className="demo-interactions" disabled={busy} aria-label="演示操作">
    <small>独立演示 · 原任务与浏览器存档保留</small>
    <h2>{demo.finished ? '演示结束 · 查看两条路线的结果' : `${demo.chapter + 1} / ${DEMO_CHAPTERS.length} · ${chapter.title}`}</h2>
    <p>{chapter.description}</p>
    <div className="demo-controls">{!demo.finished && <button disabled={!!demo.error} onClick={onPause}>{demo.paused ? '继续全程演示' : '暂停全程演示'}</button>}<button onClick={onExit}>退出演示，返回原任务</button></div>
    <p role="status">{flightPhaseName(state)} · {flightTime(state.time)}<br/>{demo.finished ? '本次教学路线已走完；最终处置结论以两条路线的结果与模型边界为准。' : demo.paused ? '已暂停，时间与自动衔接都已停止。' : demo.holdS > 0 ? '检查点短暂停留讲解，即将自动继续。' : '按真实计算推进 · 长滑行自动加速'}</p>
    {demo.error && <p role="alert">{demo.error}。演示已停下，未跳过失败；可退出返回原任务。</p>}
    {!demo.finished && <div className="demo-controls" aria-label="自动演示速度">{([1,3] as const).map(v => <button key={v} aria-pressed={demo.speed === v} onClick={() => onSpeed(v)}>{v === 1 ? '讲解节奏' : '快速演示'}</button>)}</div>}
    <details className="demo-chapters"><summary>章节回看 · 已到达 {demo.visited.length} / 7 章</summary><p>点击已到达的章节，暂停在该章起点，再点「继续全程演示」。未到达的章节需先顺序运行。</p><ol>{DEMO_CHAPTERS.map((c,i)=><li key={i}><button disabled={!demo.visited.includes(i)} aria-current={demo.chapter===i?'step':undefined} onClick={()=>onRevisit(i)}>{i+1}. {demo.plan==='powered'&&i===6?'E02 动力离轨与结尾':c.title}{!demo.visited.includes(i)?' · 未到达':''}</button></li>)}</ol></details>
    <DemoPlanComparison demo={demo} onPlan={onPlan}/>
    <details><summary>本次路线与当前发生的事</summary><ol>{DEMO_CHAPTERS.map((c,i) => <li key={c.title} aria-current={demo.chapter===i?'step':undefined}>{demo.plan==='powered'&&i===6?'E02 动力离轨与结尾':c.title}</li>)}</ol><p>{state.message}</p><p>阶段命令由演示自动执行；没有预录视频或伪造成功状态。长时段压缩播放，倍率增加计算次数。鼠标可自由旋转和缩放，阶段切换才自动取景。</p></details>
    {demo.finished && <><FlightEnding state={state}/><button onClick={onResults}>查看本次任务结果与摘要</button></>}
  </fieldset></section>;
}
