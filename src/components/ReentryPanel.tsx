import { useEffect, useId, useRef, useState } from 'react';
import type { FlightState } from '../launch/liftoff';
import type { LaunchCommand } from '../launch/liftoff.worker';
import { REENTRY, REENTRY_RUNNING, type ReentrySample } from '../launch/reentry';
import reportUrl from '../../docs/REENTRY.md?url';
import './AvoidancePanel.css';
import './DeorbitPanel.css';
import './ReentryPanel.css';

const descriptions: Record<string, [string, string]> = {
  'reentry-ready': ['先确认：这枚二级将怎样回来', '接续上一段的真实计算状态，保留质量、速度和少量推进剂残留。发动机已锁定；接下来依靠原有轨道下降，空气阻力逐渐改变运动。'],
  'reentry-coast': ['还在高空，正在向下走', '地球引力使二级沿降低后的轨道前进。当前可以用 100 倍观察滑行；到下降穿过 120 km 时自动暂停。卫星不跟随二级下降。'],
  'reentry-interface': ['120 km：先停下来认识环境', '空气并没有在这里突然出现。这只是本演示选定的检查点；稀薄气体已产生微弱阻力。点击继续后，观察密度、速度和受热怎样一起变化。'],
  'reentry-atmosphere': ['空气变稠，速度与受热一起变化', '空气经过迎风区域时受到压缩，激波和黏性作用参与能量转换。速度很快时，即使空气稀薄也会强烈加热；明显减速以后，热流会下降，动压峰值也可能出现在另一时刻。'],
  'reentry-complete': ['本段结束：20 km 是模型边界', '已经展示下降、减速与受热趋势。完整箭体只是等效模型的显示载体；未求解材料烧蚀和结构解体，不能据此判断真实箭体完整到达这里，更不能宣称烧毁或着陆。'],
  'reentry-failed': ['本段已停止', '轨迹或时长超出范围，当前状态保留。先看任务停止原因；此结果没有被标记为完成再入。'],
};
function HistoryChart({ samples, field, title, unit, factor, color }: { samples: ReentrySample[]; field: 'speedMS' | 'altitudeM' | 'heatFluxWm2' | 'dynamicPressurePa'; title: string; unit: string; factor: number; color: string }) {
  const id = useId(), maxTime = Math.max(1, samples.at(-1)?.t ?? 0), valid = samples.filter(s => s[field] !== null);
  const max = Math.max(1, ...valid.map(s => s[field]! * factor)) * 1.12;
  // Null means outside the heating approximation, never zero. Break paths across gaps.
  let pen = false; const path = samples.map(s => { const value = s[field]; if (value === null) { pen = false; return ''; } const segment = `${pen ? 'L' : 'M'}${48 + s.t / maxTime * 364},${112 - value * factor / max * 76}`; pen = true; return segment; }).join(' ');
  return <svg className="avoidance-chart reentry-chart" viewBox="0 0 450 151" role="img" aria-labelledby={id}>
    <title id={id}>{title}，纵轴 {unit}，横轴为进入 120 km 后的秒数。空白段代表不适用或尚未计算。</title>
    <text x="12" y="19">{title} / {unit}</text>
    {[0, .5, 1].map(f => <g key={f}><path d={`M48 ${112 - f * 76}H412`} stroke="#345058"/><text x="42" y={116 - f * 76} textAnchor="end">{(max * f).toFixed(max < 10 ? 1 : 0)}</text><text x={48 + f * 364} y="129" textAnchor="middle">{(maxTime * f).toFixed(0)}</text></g>)}
    <path d={path} stroke={color} strokeWidth="2.3" fill="none"/>
    {!valid.length && <text x="230" y="74" textAnchor="middle">等待适用区间的计算数据</text>}<text x="410" y="144" textAnchor="end">进入 120 km 后 / 秒</text>
  </svg>;
}
interface Props { onOperations: () => void; state: FlightState; paused: boolean; ready: boolean; rate: number; effects: boolean; onEffects: (value: boolean) => void; send: (command: LaunchCommand) => void; onClose: () => void; onCarrier: () => void; onSatellite: () => void; onOverview: () => void }
export function ReentryPanel({ state: s, paused, ready, rate, effects, onEffects, send, onClose, onCarrier, onSatellite, onOverview, onOperations }: Props) {
  const close = useRef<HTMLButtonElement>(null), [chart, setChart] = useState<'loads' | 'motion'>('loads');
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; close.current?.focus(); return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  const r = s.reentry, a = s.ascent!;
  if (!r) return <section className="avoidance-panel reentry-panel" aria-label="再入与大气受热"><header><h2>正在接续二级状态…</h2><button ref={close} onClick={onClose}>收起再入分析</button></header></section>;
  const running = REENTRY_RUNNING.includes(s.phase), [title, description] = descriptions[s.phase] ?? ['查看本段状态', s.message];
  const enterAt = r.entryTime === null ? null : r.entryTime - r.startTime;
  const samples = enterAt === null ? [] : r.samples.filter(p => p.t >= enterAt - 1e-7).map(p => ({ ...p, t: Math.max(0, p.t - enterAt) }));
  const heat = r.heatFluxWm2 === null ? '范围外 · 不估算' : `${(r.heatFluxWm2 / 1000).toFixed(1)} kW/m²`;
  return <section className="avoidance-panel reentry-panel" aria-label="再入与大气受热">
    <header><div><small>部署之后 / 第三段</small><h2>二级 · 下降与受热</h2></div><button ref={close} onClick={onClose}>收起再入分析</button></header>
    <ol className="deorbit-route"><li>接续离轨</li><li>120 km 检查</li><li>受热与减速</li><li>20 km 边界</li></ol>
    <section className="avoidance-explanation"><span>{running ? paused ? '模拟暂停' : '计算中' : '检查点冻结'} · 本段 +{r.elapsedS.toFixed(1)} s</span><h3>{title}</h3><p>{description}</p></section>
    <div className="avoidance-actions">
      {s.phase === 'reentry-complete' && <button className="avoidance-primary" disabled={!ready} onClick={onOperations}>下一段：卫星开始工作 →</button>}
      {s.phase === 'reentry-ready' && <button className="avoidance-primary" disabled={!ready} onClick={() => { onCarrier(); send({ type: 'coast-reentry' }); send({ type: 'rate', value: 100 }); }}>开始滑行至 120 km →</button>}
      {s.phase === 'reentry-interface' && <button className="avoidance-primary" disabled={!ready} onClick={() => { onCarrier(); send({ type: 'enter-reentry' }); }}>继续下降，观察受热与减速 →</button>}
      {running && <button className="avoidance-primary" disabled={!ready} onClick={() => send({ type: 'pause', value: !paused })}>{paused ? '继续再入计算' : '暂停再入计算'}</button>}
      <button onClick={onCarrier}>跟随下降的二级</button><button onClick={onOverview}>看下降路径与卫星轨道</button><button onClick={onSatellite}>看仍在轨的卫星</button>
    </div>
    <div className="avoidance-actions" aria-label="再入倍率">{[1, 10, 100].map(v => <button key={v} disabled={!ready} aria-pressed={rate === v} onClick={() => send({ type: 'rate', value: v })}>{v} 倍</button>)}</div>
    <label className="reentry-effects"><input type="checkbox" checked={effects} onChange={e => onEffects(e.target.checked)}/> 迎风热流提示 · 放大的假彩色包络</label>
    <p>包络沿相对空气速度的迎风方向显示，亮度跟随估算热流。空白或消失也可能是超出公式范围；不是发动机喷焰、真实发光照片或烧毁判据。</p>
    <dl className="avoidance-readings">
      <div><dt>二级高度 · 椭球面</dt><dd data-reentry-height>{(a.altitudeM / 1000).toFixed(2)} km</dd></div><div><dt>相对空气速度</dt><dd data-reentry-speed>{(a.airSpeedMS / 1000).toFixed(3)} km/s</dd></div>
      <div><dt>空气密度 · 标准参考</dt><dd data-reentry-density>{a.density.toExponential(2)} kg/m³</dd></div><div><dt>动压 / 阻力</dt><dd>{(a.dynamicPressurePa / 1000).toFixed(2)} kPa / {(s.dragN / 1000).toFixed(2)} kN</dd></div>
      <div><dt>阻力减速度 · 不含重力</dt><dd data-reentry-deceleration>{r.dragG.toFixed(3)} g</dd></div><div><dt>驻点对流热流 · 估算</dt><dd className="reentry-heat" data-reentry-heat>{heat}</dd></div>
    </dl>
    <nav className="avoidance-tabs" aria-label="再入图表"><button aria-pressed={chart === 'loads'} onClick={() => setChart('loads')}>热流与动压</button><button aria-pressed={chart === 'motion'} onClick={() => setChart('motion')}>高度与速度</button></nav>
    {chart === 'loads' ? <><HistoryChart samples={samples} field="heatFluxWm2" title="驻点对流热流估算" unit="kW/m²" factor={.001} color="#ffb06b"/><HistoryChart samples={samples} field="dynamicPressurePa" title="气流动压" unit="kPa" factor={.001} color="#7cd5c7"/></> : <><HistoryChart samples={samples} field="altitudeM" title="当前高度" unit="km" factor={.001} color="#94bfff"/><HistoryChart samples={samples} field="speedMS" title="相对空气速度" unit="km/s" factor={.001} color="#e4d09b"/></>}
    <p>两图分别标注单位，各用自己的纵轴；曲线来自本次计算，横轴随进度延长。热流只在 ≤80 km 且 Mach ≥5 时作钝体近似，超出区间留空，不能当成零。</p>
    <table><caption>本次记录 · 随计算更新</caption><tbody>
      <tr><th>已记录最高热流</th><td data-reentry-peak>{r.peakHeat ? `${(r.peakHeat.value / 1000).toFixed(1)} kW/m² · 高度 ${(r.peakHeat.altitudeM / 1000).toFixed(2)} km` : '尚未进入热流估算区间'}</td></tr>
      <tr><th>已记录最高动压</th><td>{(r.peakPressure.value / 1000).toFixed(2)} kPa · 高度 {(r.peakPressure.altitudeM / 1000).toFixed(2)} km</td></tr>
      <tr><th>适用区间累计热载荷</th><td>{(r.heatLoadJm2 / 1000000).toFixed(2)} MJ/m² · 已积分 {r.heatingSeconds.toFixed(1)} s</td></tr>
      <tr><th>参考环境温度 / 马赫数</th><td>{r.temperatureK.toFixed(1)} K / {r.mach === null ? '高空不输出' : r.mach.toFixed(2)}</td></tr>
      <tr><th>箭体表面温度</th><td>未计算 · 需要材料热响应</td></tr><tr><th>卫星当前高度</th><td>{(s.deployment!.satellite.altitudeM / 1000).toFixed(2)} km · 独立在轨</td></tr>
    </tbody></table>
    <details open={s.phase === 'reentry-ready'}><summary>这段模型算了什么，哪些是设定</summary><p>采用无升力、质量不变的等效物体。质量 {r.startMassKg.toFixed(2)} kg 和残余推进剂 {r.startFuelKg.toFixed(2)} kg 继承钝化结果；无再次点火、无继续泄放。姿态沿用 P2 结束时的惯性指向，未计算翻滚或气动力矩。</p><p>开放箭体的阻力采用自定教学有效系数 Cd={REENTRY.cd}、面积 {REENTRY.areaM2.toFixed(2)} m²；热流以等效钝体半径 {REENTRY.noseRadiusM} m 估算。它们不是实测二级规格，不按显示外形逐点求解。固定 0.25 秒步长计算，倍率只增加步数。</p><p>冷壁驻点热流不是整个箭体吸热功率，也不是表面温度。未计算辐射加热、烧蚀、碎裂、落区和残骸风险；20 km 仅为课程停止高度，不是材料安全阈值。卫星继续沿原模型运动，工作任务属于下一段 P4。</p></details>
    <details><summary>数据来源与本地使用方式</summary><p>项目内置 US Standard Atmosphere 1976 的参考表：使用 PDAS 表 1 的高度、温度、压力与密度，压力和密度作对数插值，温度作线性插值。不是实时天气、风场或空间天气预报。</p>
      <a href="https://ntrs.nasa.gov/citations/19770009539" target="_blank" rel="noreferrer">NASA · 1976 标准大气 ↗</a><br/><a href="https://www.pdas.com/bigtables.html" target="_blank" rel="noreferrer">PDAS · 本地表的计算数值来源 ↗</a>
      <p>热流采用 Sutton–Graves 冷壁驻点对流关系：1.74153×10⁻⁴ × √(密度/钝体半径) × 相对空气速度³，SI 单位，输出 W/m²。教学范围筛选不等于经过真实箭体验证。</p><a href="https://ntrs.nasa.gov/citations/20060004824" target="_blank" rel="noreferrer">NASA · 对流热流与材料热响应的区别 ↗</a><br/><a href="https://orbitaldebris.jsc.nasa.gov/reentry/" target="_blank" rel="noreferrer">NASA · 再入与残骸存活分析 ↗</a>
    </details>
    <p><a href={reportUrl} download="再入大气与受热说明.md">下载本段模型、操作和验证说明 ↗</a></p>
  </section>;
}
