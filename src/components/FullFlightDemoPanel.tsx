import { DEMO_CHAPTERS, type DemoStatus } from '../launch/fullFlightDemo';
import type { FlightState } from '../launch/liftoff';
import { flightPhaseName, flightTime } from './LaunchControl';
import { FlightEnding } from './FlightEnding';
export function FullFlightDemoPanel({ demo, state, onPause, onExit, onSpeed, onResults }: { demo: DemoStatus; state: FlightState; onPause: () => void; onExit: () => void; onSpeed: (v: 1 | 3) => void; onResults: () => void }) {
  const chapter = DEMO_CHAPTERS[demo.chapter];
  return <section className="full-flight-demo" aria-label="从头到尾自动演示">
    <small>独立演示 · 原任务与浏览器存档保留</small>
    <h2>{demo.finished ? '演示结束 · 查看两条路线的结果' : `${demo.chapter + 1} / ${DEMO_CHAPTERS.length} · ${chapter.title}`}</h2>
    <p>{chapter.description}</p>
    <div className="demo-controls">{!demo.finished && <button disabled={!!demo.error} onClick={onPause}>{demo.paused ? '继续全程演示' : '暂停全程演示'}</button>}<button onClick={onExit}>退出演示，返回原任务</button></div>
    <p role="status">{flightPhaseName(state)} · {flightTime(state.time)}<br/>{demo.finished ? '本次自动演示已走完；不代表卫星已完成空间处置。' : demo.paused ? '已暂停，时间与自动衔接都已停止。' : demo.holdS > 0 ? '检查点短暂停留讲解，即将自动继续。' : '按真实计算推进 · 长滑行自动加速'}</p>
    {demo.error && <p role="alert">{demo.error}。演示已停下，未跳过失败；可退出返回原任务。</p>}
    {!demo.finished && <div className="demo-controls" aria-label="自动演示速度">{([1,3] as const).map(v => <button key={v} aria-pressed={demo.speed === v} onClick={() => onSpeed(v)}>{v === 1 ? '讲解节奏' : '快速演示'}</button>)}</div>}
    <details><summary>本次路线与当前发生的事</summary><ol>{DEMO_CHAPTERS.map((c,i) => <li key={c.title} aria-current={demo.chapter===i?'step':undefined}>{c.title}</li>)}</ol><p>{state.message}</p><p>阶段命令由演示自动执行；没有预录视频或伪造成功状态。长时段压缩播放，倍率增加计算次数。鼠标可自由旋转和缩放，阶段切换才自动取景。</p></details>
    {demo.finished && <><FlightEnding state={state}/><button onClick={onResults}>查看本次任务结果与摘要</button></>}
  </section>;
}
