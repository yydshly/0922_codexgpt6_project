import avoidanceReportUrl from '../../docs/SEPARATION-AVOIDANCE.md?url';
import { useEffect, useId, useRef, useState } from 'react';
import type { FlightState } from '../launch/liftoff';
import type { LaunchCommand } from '../launch/liftoff.worker';
import { AVOIDANCE_RUNNING, separationSample, type AvoidanceTelemetry, type SeparationSample } from '../launch/avoidance';
import './AvoidancePanel.css';

export const AVOIDANCE_LABELS = {
  'avoidance-review': '分离分析 · 等待选择', 'avoidance-align': '二级转向 · 发动机关机', 'avoidance-armed': '侧向已对准 · 等待点火',
  'avoidance-burn': '二级侧向点火', 'avoidance-cutoff': '点火完成 · 关机检查', 'avoidance-coast': '避让后 · 滑行对照', 'avoidance-complete': '15 分钟对照完成 · 已冻结',
};
const explanations: Record<string, [string, string]> = {
  'avoidance-review': ['先比较，再决定是否点火', '灰色是保持滑行的假设，青色是侧向点火的预测。两条曲线从同一时刻出发；自然分离已经在发生，演示一次机动不代表当前一定有碰撞危险。'],
  'avoidance-align': ['转向不等于改变飞行方向', '二级正在朝轨道面的侧方转动，发动机关闭。卫星仍独立滑行，不会跟着二级转向。理想姿态辅助未计算力矩与耗能。'],
  'avoidance-armed': ['方向已对准，下一步才产生推力', '当前时间冻结。点击点火后，喷流、推力、燃料消耗和二级轨道一起变化；点火默认恢复到 1 倍速，方便观察。'],
  'avoidance-burn': ['二级获得侧向推力，卫星没有', '1 秒建立推力、4 秒保持、1 秒关断。发动机按 2% 教学节流工作；这不是某个真实发动机已验证的工作范围。'],
  'avoidance-cutoff': ['关机以后，速度变化仍然保留', '当前冻结在点火结束。核对已消耗的燃料，再继续滑行，看看两者距离怎样变化；这次侧推仍把二级留在轨道上。'],
  'avoidance-coast': ['距离由两条轨道共同决定', '二级和卫星都在运动。白点是当前计算结果；图上前方曲线仍是原方案预测，灰线只是未机动的假设对象，不是第三个真实箭体。'],
  'avoidance-complete': ['完成这一段对照，尚未离轨处置', '本段已走完分析起点后的 15 分钟。二级仍在轨道上；长期避碰、离轨与再入属于后续步骤，不能由本次结果推定。'],
};

function ComparisonChart({ p, actual, time, spatial }: { p: AvoidanceTelemetry; actual: SeparationSample; time: number; spatial: boolean }) {
  const id = useId(), series = [p.plan.coast.samples, p.plan.maneuver?.samples ?? [], p.actual];
  const points = series.flat(), xs = points.map(v => spatial ? v.alongM : v.t), ys = points.map(v => spatial ? v.normalM : v.distanceM);
  const x0 = spatial ? Math.min(0, ...xs) - 40 : 0, x1 = spatial ? Math.max(0, ...xs) + 40 : 900;
  const y0 = spatial ? Math.min(0, ...ys) - 40 : 0, y1 = Math.max(spatial ? 80 : 100, ...ys) * 1.12;
  const X = (n: number) => 52 + (n - x0) / (x1 - x0) * 370, Y = (n: number) => 194 - (n - y0) / (y1 - y0) * 157;
  const xy = (v: SeparationSample) => `${X(spatial ? v.alongM : v.t)},${Y(spatial ? v.normalM : v.distanceM)}`;
  return <svg className="avoidance-chart" viewBox="0 0 450 242" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>{spatial ? '相对卫星的侧向轨迹投影' : '二级与卫星中心距离：保持滑行与执行机动对照'}</title>
    <desc id={`${id}-desc`}>灰虚线为保持滑行，青线为机动预测，白线和白点为本次计算。{spatial ? '横纵轴是分析起点固定的切向与法向，投影不包含径向距离，两个轴的显示比例不同。' : '横轴从分析起点开始，范围为十五分钟。'}</desc>
    {[0, .5, 1].map(f => <g key={f}><path d={`M52 ${194 - f * 157}H422`} stroke="#36505a"/><text x="45" y={198 - f * 157} textAnchor="end">{((y0 + f * (y1 - y0)) / 1000).toFixed(1)}</text><text x={52 + f * 370} y="213" textAnchor="middle">{spatial ? ((x0 + f * (x1 - x0)) / 1000).toFixed(1) : f * 15}</text></g>)}
    <text x="52" y="19">{spatial ? '轨道法向 / km' : '三维中心距离 / km'}</text><text x="235" y="234" textAnchor="middle">{spatial ? '轨道切向 / km · 固定初始坐标' : '自分析起点 / 分钟'}</text>
    <polyline points={series[0].map(xy).join(' ')} fill="none" stroke="#b4bcc9" strokeWidth="2" strokeDasharray="5 4"/>
    <polyline points={series[1].map(xy).join(' ')} fill="none" stroke="#76e1ce" strokeWidth="2.5"/>
    {p.started && <><polyline points={p.actual.map(xy).join(' ')} fill="none" stroke="#fff3cf" strokeWidth="1.5"/>
      <circle cx={X(spatial ? actual.alongM : time)} cy={Y(spatial ? actual.normalM : actual.distanceM)} r="4" fill="#fff3cf" stroke="#13292f"/>
    </>}
    {spatial && <><circle cx={X(0)} cy={Y(0)} r="4" fill="#e7b78b"/><text x={X(0) + 7} y={Y(0) - 9}>卫星原点</text></>}
  </svg>;
}

interface Props { onDeorbit: () => void; state: FlightState; paused: boolean; ready: boolean; rate: number; send: (command: LaunchCommand) => void; onClose: () => void; onCarrier: () => void; onPair: () => void; onOverview: () => void }
export function AvoidancePanel({ onDeorbit, state: s, paused, ready, rate, send, onClose, onCarrier, onPair, onOverview }: Props) {
  const close = useRef<HTMLButtonElement>(null), [spatial, setSpatial] = useState(false);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; close.current?.focus(); return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  const d = s.deployment!, p = d.avoidance, running = AVOIDANCE_RUNNING.includes(s.phase);
  if (!p) return <section className="avoidance-panel" aria-label="二级与卫星分离分析"><header><h2>正在计算两种方案…</h2><button ref={close} onClick={onClose}>收起分析</button></header><p>在独立计算线程中对照同一初态，当前飞行暂停。</p></section>;
  const { plan } = p, m = plan.maneuver, [title, why] = explanations[s.phase] ?? ['请查看当前任务状态', s.message];
  const actual = separationSample(p.elapsedS, d.carrier.position, d.satellite.position, plan.along, plan.direction);
  const action = (type: 'align-avoidance' | 'ignite-avoidance' | 'observe-avoidance') => { if (type !== 'observe-avoidance') onCarrier(); send({ type }); };
  return <section className="avoidance-panel" aria-label="二级与卫星分离分析">
    <header><div><small>任务步骤 07 / 二级处置 · 分离与避让</small><h2>二级与卫星 · 分离分析</h2></div><button ref={close} onClick={onClose}>收起分析</button></header>
    <section className="avoidance-explanation"><span>{running ? paused ? '模拟暂停' : '计算中' : '检查点冻结'} · 分析起点后 {p.elapsedS.toFixed(1)} s</span><h3>{title}</h3><p>{why}</p></section>
    <div className="avoidance-actions">
      {s.phase === 'avoidance-complete' && <button className="avoidance-primary" disabled={!ready} onClick={onDeorbit}>下一段：二级离轨与钝化 →</button>}
      {s.phase === 'avoidance-review' && <><button className="avoidance-primary" disabled={!ready || !plan.allowed} onClick={() => action('align-avoidance')}>对准侧向 · 12 秒 →</button><button disabled={!ready} onClick={() => { send({ type: 'skip-avoidance' }); onClose(); }}>暂不机动，返回观察</button></>}
      {s.phase === 'avoidance-armed' && <button className="avoidance-primary" disabled={!ready} onClick={() => action('ignite-avoidance')}>执行 6 秒点火 →</button>}
      {s.phase === 'avoidance-cutoff' && <button className="avoidance-primary" disabled={!ready} onClick={() => action('observe-avoidance')}>继续滑行，观察差异 →</button>}
      {running && <button disabled={!ready} onClick={() => send({ type: 'pause', value: !paused })}>{paused ? '继续本段计算' : '暂停本段计算'}</button>}
      <button onClick={onCarrier}>看二级朝向与喷流</button><button onClick={onPair}>同时看两个对象</button><button onClick={onOverview}>看两条轨道</button>
    </div>
    <p>低节流喷流的亮度与长度已增强，便于辨认点火；不是实测外观。双对象镜头随间距拉远，仍可拖动旋转；远处对象用名称定位。</p>
    {running && <div className="avoidance-actions" aria-label="避让观察倍率">{[1, 10, 100].map(v => <button key={v} disabled={!ready || v > 1 && s.phase !== 'avoidance-coast'} aria-pressed={rate === v} onClick={() => send({ type: 'rate', value: v })}>{v} 倍</button>)}</div>}
    <dl className="avoidance-readings">
      <div><dt>当前中心距离</dt><dd data-avoidance-distance>{d.separationM.toFixed(1)} m</dd></div><div><dt>当前相对速度</dt><dd>{d.relativeSpeedMS.toFixed(3)} m/s</dd></div>
      <div><dt>二级推力 / 计划峰值</dt><dd data-avoidance-thrust>{(s.thrustN / 1000).toFixed(2)} / {(plan.thrustN / 1000).toFixed(2)} kN</dd></div><div><dt>已消耗 / 计划推进剂</dt><dd data-avoidance-fuel>{p.fuelUsedKg.toFixed(2)} / {plan.fuelRequiredKg.toFixed(2)} kg</dd></div>
    </dl>
    <div className="avoidance-tabs" role="group" aria-label="分析图类型"><button aria-pressed={!spatial} onClick={() => setSpatial(false)}>距离随时间</button><button aria-pressed={spatial} onClick={() => setSpatial(true)}>侧向轨迹投影</button></div>
    <ComparisonChart p={p} actual={actual} time={p.elapsedS} spatial={spatial}/>
    <p className="avoidance-legend"><span>┄ 灰：保持滑行</span><span>━ 青：机动预测</span><span>● 白：本次计算</span></p>
    <p>{spatial ? '以卫星为原点，投影到分析开始时的轨道切向和法向；为便于阅读，两轴缩放不同。图中间距不能当成三维距离，三维中心距看上方读数。' : '横轴 0 是本次分析起点，不是火箭发射。两条线含转向期间，最近距离可能都出现在起点；这不表示机动没有效果。'}</p>
    <table><caption>相同初态 · 未来 15 分钟对照</caption><thead><tr><th>方案</th><th>最近距离</th><th>15 分钟末距离</th></tr></thead><tbody>
      <tr><th>保持滑行</th><td>{plan.coast.minimumM.toFixed(1)} m<br/><small>+{plan.coast.minimumAtS.toFixed(1)} s</small></td><td>{(plan.coast.finalM / 1000).toFixed(2)} km</td></tr>
      <tr><th>侧向点火</th><td>{m ? <>{m.minimumM.toFixed(1)} m<br/><small>+{m.minimumAtS.toFixed(1)} s</small></> : '条件不足'}</td><td>{m ? `${(m.finalM / 1000).toFixed(2)} km` : '未生成'}</td></tr>
    </tbody></table>
    {p.started && <p data-avoidance-result>此刻若保持滑行，间距约 {p.baselineDistanceM.toFixed(1)} m；实际间距 {d.separationM.toFixed(1)} m。二级相对未机动假设的速度差为 {p.velocityDifferenceMS.toFixed(3)} m/s（含随后引力影响）。</p>}
    <details open={s.phase === 'avoidance-review'}><summary>为什么可以执行？条件与燃料预算</summary><ul className="avoidance-checks">{plan.checks.map(c => <li key={c.label}><strong>{c.passed ? '✓' : '未满足'} {c.label}</strong><p>{c.detail}</p></li>)}</ul><p>计划理想推进速度增量约 {plan.idealDeltaVMS.toFixed(3)} m/s，由比冲与质量比估算；不等同于最后的两对象相对速度。当前只执行一次机动。</p></details>
    <details><summary>来源、模型与本段边界</summary><p>SpaceX 用户指南说明部署后按需执行污染与碰撞规避机动；本项目不复现猎鹰 9 型号或其控制参数。</p><a href="https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf#page=93" target="_blank" rel="noreferrer">SpaceX · 部署与按需规避说明 ↗</a><p>本段自定 12 秒理想转向、2% 节流与 6 秒点火；重启能力视为教学条件，未计算燃料沉底、压力、姿态力矩、重启寿命或喷流污染。重力、简化阻力、有限时长推力和耗油参与计算。</p><p>只对照这两个模拟对象的 15 分钟，不读取真实碎片目录、不计算碰撞概率、不做离轨或再入。更多远期运动不能由本图推定。</p></details>
    <p><a href={avoidanceReportUrl} download="分离分析与侧向机动.md">下载本段操作、模型与验证说明 ↗</a></p>
  </section>;
}
