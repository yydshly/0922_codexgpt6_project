import type { FlightState } from '../launch/liftoff';
import { norm } from '../launch/ascent';
import type { LaunchCommand } from '../launch/liftoff.worker';
import { flightPhaseName, flightTime } from './LaunchControl';
import reportUrl from '../../docs/DEPLOYMENT-AND-SAVES.md?url';

export type MissionFocus = 'pair' | 'carrier' | 'satellite';
interface Props { state: FlightState; paused: boolean; rate: number; ready: boolean; error: string; send: (command: LaunchCommand) => void; onFocus: (focus: MissionFocus) => void; onOverview: () => void; onImmersive: () => void; onSave: () => void; onReset: () => void }
export function DeploymentControl({ state: s, paused, rate, ready, error, send, onFocus, onOverview, onImmersive, onSave, onReset }: Props) {
  const d = s.deployment!, running = ['deploying', 'deployed-coast'].includes(s.phase), disabled = !ready || !!error;
  return <div className="launch-control deployment-control">
    <span className="launch-kicker">06 / 释放卫星 · 完成第一次任务</span><h2>从搭载，到独立飞行。</h2>
    <p>先打开保留在二级上的教学舱盖，再由弹簧释放卫星。两者从此分别计算位置与速度。轨道全景中两条线非常接近，可能重叠；近景及各自参数可看出差异。</p>
    <ol className="orbit-procedure"><li aria-current={s.phase === 'deployment-ready' ? 'step' : undefined}>1　开舱 · 卫星仍连接二级</li><li aria-current={s.phase === 'deployment-open' ? 'step' : undefined}>2　释放 · 给予相反分离冲量</li><li aria-current={d.released ? 'step' : undefined}>3　观察 · 独立绕地与展开翼板</li></ol>
    <div className="launch-flight-state"><small role="status">{running && paused ? '已暂停 · ' : ''}{flightPhaseName(s)}</small><strong data-flight-time>{flightTime(s.time)}</strong><p>{s.message}</p></div>
    {error && <p role="alert" className="launch-flight-error">{error}</p>}
    <div className="launch-flight-actions">
      {s.phase === 'deployment-ready' && <button className="launch-ignite" disabled={disabled} onClick={() => send({ type: 'open-fairing' })}>打开教学载荷舱 →</button>}
      {s.phase === 'deployment-open' && <button className="launch-ignite" disabled={disabled} onClick={() => send({ type: 'deploy' })}>释放 E01 卫星 →</button>}
      {running && <button className="launch-ignite" disabled={disabled} onClick={() => send({ type: 'pause', value: !paused })}>{paused ? '继续部署观察' : '暂停模拟'}</button>}
      {s.phase === 'deployment-complete' && <button disabled={disabled} onClick={() => send({ type: 'continue-deployed' })}>继续在轨观察 →</button>}
      <button onClick={() => onFocus('pair')}>同时观察二级与卫星</button><button onClick={() => onFocus('carrier')}>跟随二级</button>
      <button disabled={!d.released} onClick={() => onFocus('satellite')}>靠近 E01 卫星</button><button onClick={onOverview}>查看两条预测轨道</button>
      {d.released && <button onClick={onImmersive}>卫星沉浸观察</button>}<button disabled={!ready} onClick={onSave}>保存本次飞行</button>
    </div>
    <div className="ascent-rate" aria-label="部署观察倍率">{[1, 10, 100].map(value => <button key={value} disabled={disabled} aria-pressed={rate === value} onClick={() => send({ type: 'rate', value })}>{value} 倍</button>)}</div>
    <section className={`orbit-verdict ${d.verified ? 'orbit-in-target' : ''}`}><strong>{d.verified ? 'E01 部署检查通过' : d.released ? '正在检查独立飞行' : '完成入轨验证 · 等待部署'}</strong><p>{d.released ? '释放后计算 120 秒，检查两个对象仍处于绕地轨道且分开；这不是长期任务安全认证。' : '舱盖打开后时间仍冻结，确认卫星位置再释放。'}</p><progress aria-label="部署检查进度" value={Math.min(120, d.elapsedS)} max={120}/></section>
    <dl className="launch-telemetry" aria-label="卫星分离参数">
      <div><dt>两者中心距离 / 相对速度</dt><dd data-deployment-separation>{d.separationM.toFixed(2)} <small>m</small> / {d.relativeSpeedMS.toFixed(3)} <small>m/s</small></dd></div>
      <div><dt>卫星 / 二级质量</dt><dd>{d.satellite.massKg.toFixed(0)} / {d.carrier.massKg.toFixed(1)} <small>kg</small></dd></div>
      <div><dt>释放后时间 / 翼板展开</dt><dd>{d.elapsedS.toFixed(1)} <small>s</small> / {(d.panels * 100).toFixed(0)}%</dd></div>
      <div><dt>二级剩余推进剂</dt><dd>{s.ascent!.upperFuelKg.toFixed(1)} <small>kg · 无消耗</small></dd></div>
    </dl>
    {(['satellite', 'carrier'] as const).map(id => <section className="deployment-body" key={id}><h3>{id === 'satellite' ? 'E01 卫星' : '运载二级'}{!d.released && ' · 仍连接'}</h3><p>椭球面高度 {(d[id].altitudeM / 1000).toFixed(2)} km · 惯性速度 {(norm(d[id].velocity) / 1000).toFixed(3)} km/s</p><p>预测近 / 远地点 {(d[id].elements.periapsisM / 1000).toFixed(2)} / {d[id].elements.apoapsisM === null ? '开放' : (d[id].elements.apoapsisM! / 1000).toFixed(2)} km</p></section>)}
    <details className="launch-flight-boundary"><summary>部署的依据与教学设定</summary><p>弹簧释放是实际卫星部署的一种方式。本任务把相对分离速度设为 0.5 m/s，两者获得相反冲量，质量与线动量守恒；弹簧提供分离动能。</p><p>600 kg 舱盖留在二级上，不作为碎片抛出。11 m 初始中心间距、释放后 10–22 秒展开翼板均为教学设定。未计算舱盖动作、姿态控制、互相引力、相互碰撞及翼板发电。</p><p>两对象均受地球引力与简化阻力；二级无推力。近远地点以 WGS84 赤道半径定义。在轨观察最多延伸至释放后两小时；低于 80 km 或轨迹异常即停止。当前没有处置二级或长期碎片管理能力。</p><a href="https://www.nasa.gov/reference/sls-space-launch-system-secondary-payloads/" target="_blank" rel="noreferrer">NASA · 弹簧释放载荷的实例 ↗</a></details>
    <a href={reportUrl} download="卫星部署与飞行存档.md">下载部署、存档与验收说明 ↗</a>
    <section className="launch-events"><h3>本次任务事件</h3><ol>{s.events.map((e, i) => <li key={i}><time>{flightTime(e.time)}</time>{e.label}</li>)}</ol></section>
    <button onClick={onReset}>重置为新的地面任务</button>
  </div>;
}
