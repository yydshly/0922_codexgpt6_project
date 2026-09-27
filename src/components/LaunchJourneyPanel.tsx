import { useEffect, useRef } from 'react';
import type { FlightState } from '../launch/liftoff';
import { missionProgress, MISSION_STEPS, MISSION_STATUS_TEXT } from '../launch/missionProgress';
import { flightPhaseName, flightTime } from './LaunchControl';
import deliveryUrl from '../../docs/EARTH-LAUNCH-DELIVERY.md?url';
import './LaunchJourneyPanel.css';

interface Props { state: FlightState; ready: boolean; error: string; onClose: () => void; onCurrent: () => void; onAssembly: () => void; onSave: () => void }
export function LaunchJourneyPanel({ state, ready, error, onClose, onCurrent, onAssembly, onSave }: Props) {
  const close = useRef<HTMLButtonElement>(null), progress = missionProgress(state);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; close.current?.focus(); return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  return <section className="launch-journey-panel" aria-label="任务总览与验收">
    <header><div><small>EARTH TO ORBIT / 六步教学首版</small><h2>这次旅程，到哪里了？</h2></div><button ref={close} onClick={onClose} aria-label="关闭任务总览">关闭</button></header>
    <p className="launch-journey-boundary">六步功能已接通，当前等待使用体验验收。下面读取本次任务计算结果；不代表你已认可画面或完成产品验收。</p>
    <div className="launch-journey-current"><span>当前：{flightPhaseName(state)} · {flightTime(state.time)}</span><strong>四段飞行检查 · 已通过 {progress.checksPassed} / 4</strong><p>{error || progress.result}</p><small>打开总览会暂停飞行；关闭后请在操作面板继续。</small>
      <div>{state.phase === 'ready' && <button disabled={!ready} onClick={onAssembly}>查看组装配置</button>}<button disabled={!ready} onClick={onCurrent}>{state.phase === 'ready' ? '前往检查点火 →' : progress.failed ? '查看停止原因 →' : '返回当前步骤操作 →'}</button></div>
    </div>
    <ol className="launch-journey-steps">{MISSION_STEPS.map((step, index) => <li key={step.title} data-status={progress.statuses[index]} aria-current={index === progress.current ? 'step' : undefined}><span className="launch-journey-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div><small>{MISSION_STATUS_TEXT[progress.statuses[index]]}</small></li>)}</ol>
    <section className="launch-journey-review"><h3>你只需核对三组操作</h3><p>请实际操作场景；阅读这份说明不会自动标记验收通过。</p>
      <ol><li><strong>过程能否看懂</strong><p>区分倒计时、点火和离台；一级燃尽后能分离，入轨前后能看到推力、燃料与轨道的变化。</p></li><li><strong>对象与画面是否对应</strong><p>开舱时卫星仍连接，释放后两者分开；卫星近景、同景、轨道全景和沉浸视角对应同一任务。</p></li><li><strong>离开后能否继续</strong><p>保存飞行 → 返回太阳系 → 从 E01 任务入口回来；需要刷新时，先保存，再从“飞行存档”恢复，核对时间、燃料和状态。</p></li></ol>
      <button disabled={!ready} onClick={onSave}>打开飞行存档</button><a href={deliveryUrl} download="地球出发首版交付与验收.md">下载交付摘要与验收路径 ↗</a>
    </section>
    <footer>本轮范围：一个教学基地、一套两级火箭与无人卫星任务。真实天气、碰撞、再入回收、变轨和月球航程另行规划。</footer>
  </section>;
}
