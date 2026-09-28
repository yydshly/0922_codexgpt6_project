import { satelliteName } from '../launch/satellitePlan';
import { REENTRY_RUNNING } from '../launch/reentry';
import { DEORBIT_RUNNING } from '../launch/deorbit';
import { AVOIDANCE_RUNNING } from '../launch/avoidance';
import type { FlightState } from '../launch/liftoff';
import { norm } from '../launch/ascent';
import type { LaunchCommand } from '../launch/liftoff.worker';
import { flightPhaseName, flightTime } from './LaunchControl';
import reportUrl from '../../docs/DEPLOYMENT-AND-SAVES.md?url';
import { PostDeploymentPlan } from './PostDeploymentPlan';

export type MissionFocus = 'pair' | 'carrier' | 'satellite';
interface Props { onOperations: () => void; onReentry: () => void; onDeorbit: () => void; onAnalysis: () => void; state: FlightState; paused: boolean; rate: number; ready: boolean; error: string; send: (command: LaunchCommand) => void; onFocus: (focus: MissionFocus) => void; onOverview: () => void; onImmersive: () => void; onSave: () => void; onReset: () => void }
export function DeploymentControl({ state: s, paused, rate, ready, error, send, onFocus, onOverview, onImmersive, onSave, onReset, onAnalysis, onDeorbit, onReentry, onOperations }: Props) {
  const d = s.deployment!, running = ['deploying', 'deployed-coast', ...AVOIDANCE_RUNNING, ...DEORBIT_RUNNING, ...REENTRY_RUNNING].includes(s.phase), disabled = !ready || !!error;
  return <div className="launch-control deployment-control">
    <span className="launch-kicker">{d.avoidance || d.deorbit || s.reentry ? '07 / 二级处置' : '06 / 释放卫星 · 完成部署检查'}</span><h2>{d.avoidance || d.deorbit ? '部署完成，处理二级。' : '从搭载，到独立飞行。'}</h2>
    <div className="launch-flight-actions">
      {d.verified && !d.deorbit && <button className="launch-ignite" disabled={disabled || !d.avoidance && !['deployment-complete','deployed-coast','deployment-ended'].includes(s.phase)} onClick={s.phase === 'avoidance-complete' ? onDeorbit : onAnalysis}>{s.phase === 'avoidance-complete' ? '下一步：分析二级离轨 →' : d.avoidance ? '继续二级避让操作 →' : '下一步：分析分离与二级避让 →'}</button>}
      {d.deorbit && !s.reentry && <button className="launch-ignite" disabled={disabled} onClick={s.phase === 'deorbit-complete' ? onReentry : onDeorbit}>{s.phase === 'deorbit-complete' ? '下一步：下降与再入 →' : '继续二级离轨操作 →'}</button>}
      {s.reentry && <button className="launch-ignite" disabled={disabled} onClick={onReentry}>查看二级再入操作 →</button>}
      {['avoidance-complete','reentry-complete','reentry-surface'].includes(s.phase) && <button disabled={disabled} onClick={onOperations}>进入卫星工作任务 →</button>}
      {s.phase === 'deployment-ready' && <button className="launch-ignite" disabled={disabled} onClick={() => send({ type: 'open-fairing' })}>打开教学载荷舱 →</button>}
      {s.phase === 'deployment-open' && <button className="launch-ignite" disabled={disabled} onClick={() => send({ type: 'deploy' })}>释放 {satelliteName(s)} 卫星 →</button>}
      {running && <button className="launch-ignite" disabled={disabled} onClick={() => send({ type: 'pause', value: !paused })}>{paused ? '继续当前阶段' : '暂停模拟'}</button>}
      {s.phase === 'deployment-complete' && <button disabled={disabled} onClick={() => send({ type: 'continue-deployed' })}>继续在轨观察 →</button>}
      <details><summary>视角、参数与保存</summary><div className="flight-secondary-actions">      <button onClick={() => onFocus('pair')}>同时观察二级与卫星</button><button onClick={() => onFocus('carrier')}>跟随二级</button>
      <button disabled={!d.released} onClick={() => onFocus('satellite')}>靠近 {satelliteName(s)} 卫星</button><button onClick={onOverview}>{s.reentry ? '查看下降路径与卫星轨道' : '查看两条预测轨道'}</button>
      {d.released && <button onClick={onImmersive}>卫星沉浸观察</button>}<button disabled={!ready} onClick={onSave}>保存本次飞行</button></div></details>
    </div>

    <p>{s.reentry ? '二级正在完成运输后的下降观察，卫星仍独立在轨。进入下方“第三段”可看同一时刻的空气、受力与受热；右侧分析面板可收起，主画面始终支持拖动。' : d.avoidance ? '卫星已独立飞行。当前处理二级的避让、离轨与再入；完成避让后也可转入卫星工作，尚未执行的二级处置会保留为未完成。' : '先打开保留在二级上的教学舱盖，再由弹簧释放卫星。两者从此分别计算位置与速度。轨道全景中两条线非常接近，可能重叠；近景及各自参数可看出差异。'}</p>
    {!s.reentry && !d.avoidance && <ol className="orbit-procedure"><li aria-current={s.phase === 'deployment-ready' ? 'step' : undefined}>1　开舱 · 卫星仍连接二级</li><li aria-current={s.phase === 'deployment-open' ? 'step' : undefined}>2　释放 · 给予相反分离冲量</li><li aria-current={d.released ? 'step' : undefined}>3　观察 · 独立绕地与展开翼板</li></ol>}
    <div className="launch-flight-state"><small role="status">{running && paused ? '已暂停 · ' : ''}{flightPhaseName(s)}</small><strong data-flight-time>{flightTime(s.time)}</strong><p>{s.message}</p></div>
    {d.verified && !d.deorbit && <section className="avoidance-entry"><strong>部署之后：先看两者怎样分开</strong><p>比较保持滑行与侧向机动的距离曲线，再逐步转向、点火、观察结果。这里尚未安排离轨。</p><button disabled={disabled || !d.avoidance && !['deployment-complete', 'deployed-coast', 'deployment-ended'].includes(s.phase)} onClick={onAnalysis}>{d.avoidance ? "打开分离分析与操作 →" : "分析分离与二级避让 →"}</button></section>}
    {!s.reentry && (s.phase === 'avoidance-complete' || d.deorbit) && <section className="avoidance-entry"><strong>第二段：二级离轨与钝化</strong><p>先检查轨道与预算，再反向点火降低近地点；最后处理剩余能量。二级仍保留在场景内，尚未模拟再入。</p><button disabled={disabled} onClick={onDeorbit}>{d.deorbit ? '打开离轨与钝化 →' : '分析二级离轨方案 →'}</button></section>}
    {(s.phase === 'deorbit-complete' || s.reentry) && <section className="avoidance-entry"><strong>第三段：下降与再入受热</strong><p>接续二级状态，先滑行至 120 km，再观察密度、阻力、减速与受热曲线；20 km 后可继续等效物体参考下降至地表；仍不判定真实烧毁或安全着陆。</p><button disabled={disabled} onClick={onReentry}>{s.reentry ? '打开再入与受热分析 →' : '下一段：下降与再入受热 →'}</button></section>}
    {['avoidance-complete', 'reentry-complete', 'reentry-surface'].includes(s.phase) && <section className="avoidance-entry"><strong>第四段：卫星开始工作</strong><p>定向发电 → 日夜观测 → 地面站下传。可以从 P1 直接转入卫星线，也可先完成二级任务。</p><button disabled={disabled} onClick={onOperations}>进入卫星工作任务 →</button></section>}
    {error && <p role="alert" className="launch-flight-error">{error}</p>}

    <div className="ascent-rate" aria-label="部署观察倍率">{[1, 10, 100].map(value => <button key={value} disabled={disabled || value > 1 && ['avoidance-align', 'avoidance-burn', 'deorbit-align', 'deorbit-burn'].includes(s.phase)} aria-pressed={rate === value} onClick={() => send({ type: 'rate', value })}>{value} 倍</button>)}</div>
    <section className="deployment-status-note" aria-label="二级与卫星当前状态">
      <h3>{s.phase.endsWith('-failed') ? '本段已停止，请先检查轨道状态' : d.released ? '卫星已释放 · 两个对象分别计算运动' : '卫星仍连接二级 · 一起绕地飞行'}</h3>
      <p>{d.deorbit ? s.message : d.avoidance?.started ? (s.thrustN > 0 ? "二级正在侧向点火，卫星保持无动力滑行。" : "二级当前无推力；避让阶段与结果请看分离分析。") : "二级发动机已关机。关机不等于停止运动。"} {s.reentry ? '二级按等效模型下降；卫星仍在轨，工作任务尚未启动。' : d.deorbit ? '卫星工作任务与再入受热尚未计算。' : '当前没有安排二级离轨，也没有启动卫星工作任务。'}</p>
      {s.phase === 'deployment-complete' && <p>这里冻结的是模拟时间。点击上方“继续在轨观察 →”，可继续看两者的独立运动。</p>}
      {s.phase === 'deployment-ended' && <p>已到释放后两小时的观察上限。二级与卫星的状态仍保留，尚未计算退役或再入结果。</p>}
      <p>后续路线在下方“入轨之后，两条任务线”展开查看。</p>
    </section>
    <section className={`orbit-verdict ${d.verified ? 'orbit-in-target' : ''}`}><strong>{d.verified ? d.deorbit ? `此前 ${satelliteName(s)} 部署检查已通过` : `${satelliteName(s)} 部署检查通过` : d.released ? '正在检查独立飞行' : '完成入轨验证 · 等待部署'}</strong><p>{d.released ? '释放后计算 120 秒，检查两个对象仍处于绕地轨道且分开；这不是长期任务安全认证。' : '舱盖打开后时间仍冻结，确认卫星位置再释放。'}</p><progress aria-label="部署检查进度" value={Math.min(120, d.elapsedS)} max={120}/></section>
    <dl className="launch-telemetry" aria-label="卫星分离参数">
      <div><dt>两者中心距离 / 相对速度</dt><dd data-deployment-separation>{d.separationM.toFixed(2)} <small>m</small> / {d.relativeSpeedMS.toFixed(3)} <small>m/s</small></dd></div>
      <div><dt>卫星 / 二级质量</dt><dd>{d.satellite.massKg.toFixed(0)} / {d.carrier.massKg.toFixed(1)} <small>kg</small></dd></div>
      <div><dt>释放后时间 / 翼板展开</dt><dd>{d.elapsedS.toFixed(1)} <small>s</small> / {(d.panels * 100).toFixed(0)}%</dd></div>
      <div><dt>二级剩余推进剂</dt><dd>{s.ascent!.upperFuelKg.toFixed(1)} <small>kg · {s.phase === "deorbit-passivating" ? "正在泄放" : s.thrustN > 0 ? "正在消耗" : "当前无消耗"}</small></dd></div>
    </dl>
    {(['satellite', 'carrier'] as const).map(id => <section className="deployment-body" key={id}><h3>{id === 'satellite' ? `${satelliteName(s)} 卫星` : '运载二级'}{!d.released && ' · 仍连接'}</h3><p>椭球面高度 {(d[id].altitudeM / 1000).toFixed(2)} km · 惯性速度 {(norm(d[id].velocity) / 1000).toFixed(3)} km/s</p><p>预测近 / 远地点 {(d[id].elements.periapsisM / 1000).toFixed(2)} / {d[id].elements.apoapsisM === null ? '开放' : (d[id].elements.apoapsisM! / 1000).toFixed(2)} km</p></section>)}
    <details className="launch-flight-boundary"><summary>部署的依据与教学设定</summary><p>弹簧释放是实际卫星部署的一种方式。本任务把相对分离速度设为 0.5 m/s，两者获得相反冲量，质量与线动量守恒；弹簧提供分离动能。</p><p>600 kg 舱盖留在二级上，不作为碎片抛出。11 m 初始中心间距、释放后 10–22 秒展开翼板均为教学设定。未计算舱盖动作、姿态控制、互相引力、相互碰撞及翼板发电。</p><p>两对象均受地球引力与简化阻力；普通在轨观察无推力，可在分离分析中另行执行一次教学侧向机动。近远地点以 WGS84 赤道半径定义。在轨观察最多延伸至释放后两小时；低于 80 km 或轨迹异常即停止。P2 另提供教学离轨与简化钝化；P3 可继续观察等效二级的大气减速与热流估算，另有 120 km 检查点和 20 km 教学边界；尚未计算解体、落区或长期碎片管理。</p><a href="https://www.nasa.gov/reference/sls-space-launch-system-secondary-payloads/" target="_blank" rel="noreferrer">NASA · 弹簧释放载荷的实例 ↗</a></details>
    <PostDeploymentPlan/>
    <a href={reportUrl} download="卫星部署与飞行存档.md">下载部署、存档与验收说明 ↗</a>
    <section className="launch-events"><h3>本次任务事件</h3><ol>{s.events.map((e, i) => <li key={i}><time>{flightTime(e.time)}</time>{e.label}</li>)}</ol></section>
    <button onClick={onReset}>重置为新的地面任务</button>
  </div>;
}
