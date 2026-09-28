import { useEffect, useRef } from 'react';
import type { FlightState } from '../launch/liftoff';
import { missionProgress, MISSION_STEPS, MISSION_STATUS_TEXT } from '../launch/missionProgress';
import { flightPhaseName, flightTime } from './LaunchControl';
import deliveryUrl from '../../docs/EARTH-LAUNCH-DELIVERY.md?url';
import './LaunchJourneyPanel.css';
import { PostDeploymentPlan } from './PostDeploymentPlan';
import { TaskResultSummary } from './TaskResultSummary';

interface Props { state: FlightState; ready: boolean; error: string; onClose: () => void; onCurrent: () => void; onAssembly: () => void; onSave: () => void }
export function LaunchJourneyPanel({ state, ready, error, onClose, onCurrent, onAssembly, onSave }: Props) {
  const close = useRef<HTMLButtonElement>(null), progress = missionProgress(state);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; close.current?.focus(); return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  return <section className="launch-journey-panel" aria-label="任务总览与验收">
    <header><div><small>EARTH TO ORBIT / 出发、部署与后续任务</small><h2>这次旅程，到哪里了？</h2></div><button ref={close} onClick={onClose} aria-label="关闭任务总览">关闭</button></header>
    <p className="launch-journey-boundary">本版已阶段归档；下面读取本次计算结果，不会自动标记本次任务或体验验收通过。已部署不等于完成后续任务，已退役也不等于已离轨。</p>
    <div className="launch-journey-current"><span>当前：{flightPhaseName(state)} · {flightTime(state.time)}</span><strong>出发与部署检查 · 已通过 {progress.checksPassed} / 4</strong><p>{error || progress.result}</p><small>打开总览会暂停飞行；关闭后请在操作面板继续。</small>
      <div>{state.phase === 'ready' && <button disabled={!ready} onClick={onAssembly}>查看组装配置</button>}<button disabled={!ready} onClick={onCurrent}>{state.phase === 'ready' ? '前往检查点火 →' : progress.failed ? '查看停止原因 →' : '返回当前步骤操作 →'}</button></div>
    </div>
    {state.deployment?.verified && <TaskResultSummary state={state} ready={ready} onCurrent={onCurrent} onSave={onSave}/>}
    <details className="launch-base-progress" open={!state.deployment?.verified}><summary>回看出发到部署的六步记录</summary><ol className="launch-journey-steps">{MISSION_STEPS.map((step, index) => <li key={step.title} data-status={progress.statuses[index]} aria-current={index === progress.current ? 'step' : undefined}><span className="launch-journey-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div><small>{MISSION_STATUS_TEXT[progress.statuses[index]]}</small></li>)}</ol></details>
    <section className="launch-journey-review"><h3>你只需核对三组操作</h3><p>请实际操作场景；阅读这份说明不会自动标记验收通过。</p>
      <ol><li><strong>过程能否看懂</strong><p>区分倒计时、点火和离台；入轨前后核对推力、燃料与轨道。部署后按两条任务线，区分业务结束、模型停止和空间处置。</p></li><li><strong>对象与画面是否对应</strong><p>释放后两者分开；进入卫星工作段后，二级只保留标明时刻的历史记录。能源、数据和当前位置属于同一颗卫星。</p></li><li><strong>离开后能否继续</strong><p>保存飞行 → 返回太阳系 → 从本次卫星任务入口回来；刷新前先保存，再从“飞行存档”恢复，核对时间、燃料、电量及状态。下载摘要只便于阅读，不能恢复任务。</p></li></ol>
      <button disabled={!ready} onClick={onSave}>打开飞行存档</button><a href={deliveryUrl} download="地球出发首版交付与验收.md">下载交付摘要与验收路径 ↗</a>
    </section>
    <PostDeploymentPlan/>
    <footer>E1–E6 与 P1–P5 的已有教学范围已归档。原归档二级止于 20 km；后续已补 0 m 参考下降与 E02 动力离轨。无推进 E01 退役后仍在轨。航天器操控仅作后期记录，未启动；材料解体、完整回收、长期寿命与月球航程另行规划。</footer>
  </section>;
}
