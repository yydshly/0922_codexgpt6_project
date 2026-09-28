import reportUrl from '../../docs/DEORBIT-AND-PASSIVATION.md?url';
import { useEffect, useId, useRef } from 'react';
import type { FlightState } from '../launch/liftoff';
import type { LaunchCommand } from '../launch/liftoff.worker';
import { DEORBIT, DEORBIT_RUNNING, type DeorbitTelemetry } from '../launch/deorbit';
import './AvoidancePanel.css';
import './DeorbitPanel.css';

const explain: Record<string, [string, string]> = {
  'deorbit-review': ['先改变轨道，再处理剩余能量', '反向点火将降低轨道能量与近地点。近地点是当前状态推算的轨道最低处，和箭体此刻的高度不同；本段不会播放再入火焰。'],
  'deorbit-align': ['转过箭体，尚未减速', '发动机关闭，二级朝分析开始时速度的反方向转动。12 秒姿态辅助是理想控制，未计算姿态力矩与耗能。卫星不会跟着转。'],
  'deorbit-armed': ['已反向对准，等待你点火', '此刻冻结。点击点火后，推力反向于原飞行速度，喷流向前排出；机动改变二级轨道，卫星仍保持自己的运动。'],
  'deorbit-burn': ['二级减速，预测近地点下降', '用有限时长推力和耗油计算结果，没有直接修改轨道。10% 节流与发动机重启为教学假设；曲线读取同一计算状态。'],
  'deorbit-cutoff': ['先确认最后一次机动完成', '点火结束后冻结，比较当前高度与新近地点。只有结果通过检查，才允许开始钝化；钝化会锁定发动机重启，并逐渐减少剩余能量。'],
  'deorbit-passivating': ['二级继续飞行，同时处理剩余能量', '蓝白粒子表示理想对称泄放，抵消净喷流反冲；剩余推进剂与增压气体逐步排出，电能通过负载耗散。它们不是再次点火或空气摩擦。'],
  'deorbit-complete': ['这一段结束，箭体还在', '离轨点火与简化钝化已完成，模拟冻结。仍有少量推进剂残留，不能宣称完全无风险；尚未计算进入大气、受热、解体或落区。卫星仍独立在轨。'],
};
function OrbitChangeChart({ q }: { q: DeorbitTelemetry }) {
  const id = useId(), end = DEORBIT.alignS + q.plan.burnS, max = Math.max(450000, q.plan.initialAltitudeM * 1.12);
  const X = (t: number) => 45 + t / end * 373, Y = (m: number) => 187 - m / max * 150;
  const curve = (which: 'altitudeM' | 'perigeeM', actual = false) => (actual ? q.actual : q.plan.samples).map(p => `${X(p.t)},${Y(p[which])}`).join(' ');
  return <svg className="avoidance-chart" viewBox="0 0 450 236" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>当前高度与预测近地点：同一时刻的不同含义</title><desc id={`${id}-desc`}>横轴为离轨分析后的秒数，灰线是未机动时的初始近地点参考，蓝线是计划中的当前高度，青线是计划近地点，白线为实际近地点。80 公里虚线是当前模型停止边界，不是大气顶。</desc>
    {[0, .5, 1].map(f => <g key={f}><path d={`M45 ${187 - f * 150}H418`} stroke="#344f58"/><text x="38" y={191 - f * 150} textAnchor="end">{(f * max / 1000).toFixed(0)}</text><text x={45 + f * 373} y="206" textAnchor="middle">{(f * end).toFixed(1)}</text></g>)}
    <rect x="45" y="37" width={X(12) - 45} height="150" fill="#8dbdc6" opacity=".07"/><text x="50" y="32">转向</text><text x={X(12) + 5} y="32">点火</text>
    <path d={`M45 ${Y(q.plan.initialPerigeeM)}H418`} stroke="#a3abb8" strokeDasharray="5 5"/><path d={`M45 ${Y(80000)}H418`} stroke="#d7b578" strokeDasharray="3 4"/><text x="417" y={Y(80000) - 5} textAnchor="end">80 km · 模型边界</text>
    <polyline points={curve('altitudeM')} fill="none" stroke="#83b3ed" strokeWidth="2"/><polyline points={curve('perigeeM')} fill="none" stroke="#76e1ce" strokeWidth="2.5"/><polyline points={curve('perigeeM', true)} fill="none" stroke="#fff3cf" strokeWidth="1.5"/>
    <text x="45" y="16">高度 / km</text><text x="232" y="228" textAnchor="middle">离轨分析起点后 / 秒</text>
  </svg>;
}
interface Props { onReentry: () => void; state: FlightState; paused: boolean; ready: boolean; rate: number; send: (command: LaunchCommand) => void; onClose: () => void; onCarrier: () => void; onOverview: () => void }
export function DeorbitPanel({ state: s, paused, ready, rate, send, onClose, onCarrier, onOverview, onReentry }: Props) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; close.current?.focus(); return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  const q = s.deployment!.deorbit, running = DEORBIT_RUNNING.includes(s.phase);
  if (!q) return <section className="avoidance-panel deorbit-panel" aria-label="二级离轨与钝化"><header><h2>正在计算离轨方案…</h2><button ref={close} onClick={onClose}>收起处置分析</button></header></section>;
  const p = q.plan, [title, detail] = explain[s.phase] ?? ['先查看停止原因', s.message];
  const action = (type: 'align-deorbit' | 'ignite-deorbit' | 'passivate-deorbit') => { onCarrier(); send({ type }); };
  const remaining = s.ascent!.upperFuelKg, hasPassivation = q.passivationStart !== null;
  return <section className="avoidance-panel deorbit-panel" aria-label="二级离轨与钝化">
    <header><div><small>任务步骤 07 / 二级处置 · 离轨与钝化</small><h2>二级 · 离轨与钝化</h2></div><button ref={close} onClick={onClose}>收起处置分析</button></header>
    <ol className="deorbit-route"><li>轨道方案</li><li>反向点火</li><li>剩余能量</li><li>保留结果</li></ol>
    <section className="avoidance-explanation"><span>{running ? paused ? '模拟暂停' : '计算中' : '检查点冻结'} · 本段 +{q.elapsedS.toFixed(1)} s</span><h3>{title}</h3><p>{detail}</p></section>
    <div className="avoidance-actions">
      {s.phase === 'deorbit-complete' && <button className="avoidance-primary" disabled={!ready} onClick={onReentry}>下一段：下降与再入受热 →</button>}
      {s.phase === 'deorbit-review' && <><button className="avoidance-primary" disabled={!ready || !p.allowed} onClick={() => action('align-deorbit')}>反向对准 · 12 秒 →</button><button disabled={!ready} onClick={() => { send({ type: 'skip-deorbit' }); onClose(); }}>暂不离轨，返回分离结果</button></>}
      {s.phase === 'deorbit-armed' && <button className="avoidance-primary" disabled={!ready} onClick={() => action('ignite-deorbit')}>执行离轨点火 · {p.burnS.toFixed(2)} 秒 →</button>}
      {s.phase === 'deorbit-cutoff' && <button className="avoidance-primary" disabled={!ready || !q.cutoffVerified} onClick={() => action('passivate-deorbit')}>确认结束机动，开始钝化 →</button>}
      {running && <button disabled={!ready} onClick={() => send({ type: 'pause', value: !paused })}>{paused ? '继续本段计算' : '暂停本段计算'}</button>}
      <button onClick={onCarrier}>看二级近景</button><button onClick={onOverview}>看轨道变化</button>
    </div>
    {s.phase === 'deorbit-passivating' && <div className="avoidance-actions" aria-label="钝化倍率">{[1, 10].map(v => <button key={v} disabled={!ready} aria-pressed={rate === v} onClick={() => send({ type: 'rate', value: v })}>{v} 倍</button>)}</div>}
    <dl className="avoidance-readings"><div><dt>二级当前高度 · 椭球面</dt><dd data-deorbit-height>{(s.deployment!.carrier.altitudeM / 1000).toFixed(2)} km</dd></div><div><dt>二级预测近地点 · 赤道半径</dt><dd data-deorbit-perigee>{(s.deployment!.carrier.elements.periapsisM / 1000).toFixed(2)} km</dd></div><div><dt>点火消耗 / 计划推进剂</dt><dd data-deorbit-fuel>{q.fuelBurnedKg.toFixed(2)} / {p.fuelRequiredKg.toFixed(2)} kg</dd></div><div><dt>当前推力 / 重启权限</dt><dd data-deorbit-thrust>{(s.thrustN / 1000).toFixed(2)} kN · {q.restartLocked ? '已锁定' : s.phase === 'deorbit-burn' ? '点火中' : '未锁定'}</dd></div></dl>
    <OrbitChangeChart q={q}/><p>灰虚线：初始近地点参考；蓝：计划当前高度；青：计划近地点；白：实际近地点。图中只画转向与点火时段，钝化期间图线不再延长。</p>
    <table><caption>同一箭体 · 离轨前后</caption><tbody><tr><th>初始近地点</th><td>{(p.initialPerigeeM / 1000).toFixed(2)} km</td></tr><tr><th>关机后计划近地点</th><td>{p.samples.length ? `${(p.predictedPerigeeM / 1000).toFixed(2)} km` : '未生成有效方案'}</td></tr><tr><th>理想推进速度增量</th><td>{p.deltaVMS.toFixed(2)} m/s</td></tr><tr><th>卫星当前近地点</th><td>{(s.deployment!.satellite.elements.periapsisM / 1000).toFixed(2)} km · 未接受离轨推力</td></tr></tbody></table>
    <section className="deorbit-energy" aria-label="剩余能量处理"><h3>钝化：减少剩余能量</h3><p>{hasPassivation ? `已执行 ${q.passivationElapsedS.toFixed(1)} / 120 秒。排放和点火耗油分开记录；电能转成耗散热，不是消失。` : '先完成最后一次机动，再解锁这一段。气体和电能采用自定教学库存，不是从发射追溯的遥测。'}</p>
      <label>剩余推进剂 <strong data-deorbit-residual>{remaining.toFixed(2)} kg</strong><progress max={1} value={hasPassivation ? remaining / Math.max(1, q.passivationFuelKg) : 1}/></label>
      <label>增压气瓶压力 <strong data-deorbit-pressure>{(q.pressurePa / 1000000).toFixed(4)} MPa</strong><progress max={DEORBIT.gasKg} value={q.gasKg}/></label>
      <label>剩余电能 <strong data-deorbit-energy>{(q.batteryJ / 3600).toFixed(1)} Wh</strong><progress max={DEORBIT.batteryJ} value={q.batteryJ}/></label>
      <p>已排推进剂 {q.propellantVentedKg.toFixed(2)} kg · 增压气体 {q.gasVentedKg.toFixed(4)} kg · 耗散电能 {(q.dissipatedJ / 1000).toFixed(1)} kJ。三条进度各按自己的初始值显示，不能横向比较能量大小。</p>
      <p>{q.restartLocked ? '发动机重启已锁定，残留推进剂也不能重新点火。' : '开始钝化前保留重启条件检查；本段仅支持一次离轨机动。'} 当前没有温度、喷流污染或材料解体模型。</p>
    </section>
    <details open={s.phase === 'deorbit-review'}><summary>执行前检查与教学条件</summary><ul className="avoidance-checks">{p.checks.map(c => <li key={c.label}><strong>{c.passed ? '✓' : '未满足'} {c.label}</strong><p>{c.detail}</p></li>)}</ul><p>12 秒理想转向、10% 节流和重启能力是教学假设；不复现真实型号。按 0.25 秒步长搜索有限点火时间，失败保留当前状态。</p></details>
    <details><summary>钝化计算、视觉与来源</summary><p>剩余推进剂按 20 秒时间常数衰减；2 kg 理想氦气（计入已有干质量）按 10 秒时间常数泄放，以 0.08 m³、293.15 K 的理想气体关系换算压力。240 Wh 教学电能经 10 kW 负载耗散。恒温气体与对称零净反冲均为简化，未计算冷却、液滴和阀门流场。</p><p>近景蓝白粒子是放大的排放方向符号，不是空气中的云；不代表粒子实数与真实亮度。120 秒后保留计算残留，不用“清零”代替检查。未模拟控制器关机后的遥测链路；读数是模拟器内部状态。</p><a href="https://www.esa.int/Space_Safety/Clean_Space/Sending_a_satellite_safely_to_sleep" target="_blank" rel="noreferrer">ESA · 剩余能量与钝化 ↗</a><br/><a href="https://www.esa.int/Newsroom/Press_Releases/More_boosters_more_power_Ariane_6_lifts_off_with_four_boosters_for_the_first_time" target="_blank" rel="noreferrer">ESA · 上面级再次点火离轨的实例 ↗</a><p>现实案例用于说明目的；本页参数为教学设定。本段没有落区选择、真实任务安全认证或再入受热求解。</p></details>
    <p><a href={reportUrl} download="二级离轨与简化钝化.md">下载操作、来源与数值验证 ↗</a></p>
  </section>;
}
