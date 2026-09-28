import { LIFE_LABELS } from '../launch/satelliteLifecycle';
import { OPS_LABELS } from '../launch/satelliteOperations';
import { REENTRY_LABELS } from '../launch/reentry';
import { DEORBIT_LABELS } from '../launch/deorbit';
import type { FlightState } from '../launch/liftoff';
import { deriveVehicle, type VehicleConfig } from '../launch/vehicle';
import { AVOIDANCE_LABELS } from './AvoidancePanel';
import { IgnitionSequence } from './IgnitionSequence';
import { ignitionReading } from '../launch/flightTelemetry';
import './LaunchControl.css';

export const flightTime = (time: number) => `${time < 0 ? 'T −' : 'T +'} ${Math.abs(time).toFixed(1)} s`;
export const flightPhaseName = (state: FlightState) => state.phase === 'ignition' ? ignitionReading(state).label : ({ ...LIFE_LABELS, ...OPS_LABELS, ...AVOIDANCE_LABELS, ...REENTRY_LABELS, ...DEORBIT_LABELS, ready: '等待检查', countdown: '倒计时', ignition: '点火建压 · 支撑锁定', ascending: '离台上升', complete: '离台段完成 · 已冻结', aborted: '试飞停止', ascent: '一级上升 · 辅助转弯', 'stage-ready': '一级燃尽 · 等待分离', separating: '两级分离 · 二级待点火', 'upper-burn': '二级点火 · 继续加速', 'ascent-complete': '上升分级完成 · 已冻结', 'ascent-failed': '上升未完成 · 已冻结', 'orbit-burn': '入轨加速 · 辅助制导', 'orbit-review': '发动机关机 · 等待滑行', 'orbit-coast': '无动力绕地验证', 'orbit-complete': '入轨验证通过 · 已冻结', 'orbit-failed': '入轨验证未通过 · 已冻结', 'deployment-ready': '入轨后 · 等待开舱', 'deployment-open': '载荷舱已打开 · 等待释放', deploying: '卫星已释放 · 独立飞行检查', 'deployment-complete': '部署检查通过 · 已冻结', 'deployed-coast': '二级与卫星 · 在轨观察', 'deployment-ended': '两小时观察完成 · 已冻结', 'deployment-failed': '部署检查未通过 · 已冻结' })[state.phase];
interface Props {
  config: VehicleConfig; state: FlightState; paused: boolean; ready: boolean; error: string; checked: boolean;
  onCheck: () => void; onStart: () => void; onPause: () => void; onCancel: () => void; onReset: () => void;
  onContinue: () => void;
}
export function LaunchControl({ config, state: s, paused, ready, error, checked, onCheck, onStart, onPause, onCancel, onReset, onContinue }: Props) {
  const v = deriveVehicle(config), running = ['countdown', 'ignition', 'ascending'].includes(s.phase);
  return <div className="launch-control">
    <span className="launch-kicker">03 / 发射准备与离台</span><h2>准备，让它升空。</h2>
    <p>本段从发射台竖直升高约 150 m 后冻结，先观察离台过程。完成后可继续第 4 步，体验上升转弯与分级；第 5 步继续入轨与关机验证。</p>
    <div className="launch-flight-state"><small role="status">{paused && running ? '模拟已暂停 · ' : ''}{s.phase === 'ignition' ? ignitionReading(s).label : flightPhaseName(s)}</small><strong data-flight-time>{flightTime(s.time)}</strong><p>{s.phase === 'ignition' ? '点火后先建立推力；支撑在 T=0 检查推力条件后释放。' : s.message}</p></div>
    <IgnitionSequence state={s}/>
    <ol className="launch-prechecks" aria-label="发射前检查">
      <li><span>{checked ? '✓' : '01'}</span><div>配置已应用<small>整箭 {(v.wetKg / 1000).toFixed(2)} t · 载荷 {config.payloadKg} kg</small></div></li>
      <li><span>{checked ? '✓' : '02'}</span><div>推进剂与推力<small>一级 {(v.stages[0].fuelKg / 1000).toFixed(1)} t · 起飞推重比 {v.twr.toFixed(2)}</small></div></li>
      <li><span>{checked && ready ? '✓' : '03'}</span><div>离台模型就绪<small>{ready ? '竖直姿态辅助 · 独立任务时钟 · 1 倍速' : '正在启动发射计算…'}</small></div></li>
    </ol>
    {error && <p className="launch-flight-error" role="alert">{error}</p>}
    <div className="launch-flight-actions">
      {s.phase === 'ready' && <><button onClick={onCheck} disabled={!ready || !!error || checked}>{checked ? '发射前检查已通过' : '执行发射前检查'}</button><button className="launch-ignite" onClick={onStart} disabled={!checked || !ready || !!error}>开始 10 秒倒计时 →</button></>}
      {running && <button onClick={onPause} disabled={!ready || !!error}>{paused ? '继续模拟' : '暂停模拟'}</button>}
      {['countdown', 'ignition'].includes(s.phase) && <button className="launch-cancel" onClick={onCancel}>取消发射并关机</button>}
      {s.phase === 'complete' && <button className="launch-ignite" onClick={onContinue} disabled={!ready || !!error}>继续第 4 步：上升与分级 →</button>}
      {(s.phase !== 'ready' || !!error) && <button onClick={onReset}>重置本次试飞</button>}
      <small>{s.phase === 'complete' ? '点击上方继续第 4 步，沿用当前时间、速度和剩余燃料。本段完成不等于入轨。' : '推力、耗油与上升由同一计算驱动；点火时仍可能未离台。'} 重置恢复已应用配置的初始加注量。</small>
    </div>
    <dl className="launch-telemetry" aria-label="离台实时参数">
      <div><dt>相对发射台升高</dt><dd data-flight-height>{s.heightM.toFixed(1)} <small>m</small></dd></div>
      <div><dt>向上速度</dt><dd data-flight-speed>{s.speedMS.toFixed(2)} <small>m/s</small></dd></div>
      <div><dt>整箭当前质量</dt><dd>{(s.massKg / 1000).toFixed(2)} <small>t</small></dd></div>
      <div><dt>一级剩余推进剂</dt><dd data-flight-fuel>{(s.fuelKg / 1000).toFixed(3)} <small>t</small></dd></div>
      <div><dt>发动机推力 / 重力</dt><dd>{(s.thrustN / 1e6).toFixed(2)} / {(s.weightN / 1e6).toFixed(2)} <small>MN</small></dd></div>
      <div><dt>空气阻力</dt><dd>{(s.dragN / 1000).toFixed(2)} <small>kN</small></dd></div>
      <div><dt>竖直净加速度</dt><dd>{s.accelerationMS2.toFixed(2)} <small>m/s²</small></dd></div>
      <div><dt>固定支撑</dt><dd>{s.released ? '已释放' : '锁定'}</dd></div>
    </dl>
    <section className="launch-events"><h3>本次事件</h3>{s.events.length ? <ol>{s.events.map((e, i) => <li key={i}><time>{flightTime(e.time)}</time>{e.label}</li>)}</ol> : <p>检查通过后开始记录。返回观测会暂停并保留任务；重开网页前请在顶部保存飞行。</p>}</section>
    <details className="launch-flight-boundary"><summary>这一段如何计算？</summary><p>固定 0.05 秒步长，一级海平面推力按 2 秒建立，推进剂按推力对应的质量流率消耗。T−3 秒点火，T+0 时推力大于重量才释放支撑。</p><p>重力采用地球 μ/r²；阻力采用 ½ρCdAv²，Cd=0.35、迎风面积按 4.3 m 整流罩计算，密度以 1.225 kg/m³、8.5 km 标高指数衰减。这些气动值为教学设定，非实测天气或风洞数据。</p><p>只计算最初 150 m 的竖直位移，尚未加入地球自转、风、转弯和分级。尾焰与烟羽是随发动机状态变化的视觉示意，不是流体模拟。冻结时保留瞬时推力，不代表已经关机。</p><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/four-rocket-forces/" target="_blank" rel="noreferrer">NASA · 火箭受力 ↗</a><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/" target="_blank" rel="noreferrer">NASA · 阻力方程 ↗</a></details>
  </div>;
}
