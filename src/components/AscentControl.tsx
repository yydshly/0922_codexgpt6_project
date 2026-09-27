import type { FlightState } from '../launch/liftoff';
import { flightPhaseName, flightTime } from './LaunchControl';
import { norm } from '../launch/ascent';
interface Props { state: FlightState; rate: number; paused: boolean; ready: boolean; error: string; onRate: (rate: number) => void; onPause: () => void; onSeparate: () => void; onReset: () => void; onContinue: () => void }
export function AscentControl({ state: s, rate, paused, ready, error, onRate, onPause, onSeparate, onReset, onContinue }: Props) {
  const a = s.ascent!, running = ['ascent', 'separating', 'upper-burn'].includes(s.phase);
  return <div className="launch-control ascent-control">
    <span className="launch-kicker">04 / 上升、分级与太空过渡</span><h2>告别地面，接力加速。</h2><p>{s.events.some(event => event.label.startsWith('快速体验')) ? '已先计算完整离台结果，沿用剩余燃料和速度；点击继续开始上升。' : '从刚才的离台状态继续。'}一级燃尽后暂停，由你执行分离；二级点火后 30 秒再次冻结复查。</p>
    <div className="launch-flight-state"><small role="status">{paused && running ? '已暂停 · ' : ''}{flightPhaseName(s)}</small><strong data-flight-time>{flightTime(s.time)}</strong><p>{s.message}</p></div>
    <div className="ascent-rate" aria-label="上升时间倍率">{[1, 4, 10].map(value => <button key={value} aria-pressed={rate === value} onClick={() => onRate(value)} disabled={!ready}>{value} 倍</button>)}</div>
    <p>倍率增加计算次数；卡顿时放慢推进。姿态由辅助程序控制，始终可以拖动镜头。</p>
    {error && <p className="launch-flight-error" role="alert">{error}</p>}
    <div className="launch-flight-actions">
      {running && <button onClick={onPause} disabled={!ready || !!error}>{paused ? '继续模拟' : '暂停模拟'}</button>}
      {s.phase === 'stage-ready' && <button className="launch-ignite" onClick={onSeparate} disabled={!ready || !!error}>分离一级，准备二级点火 →</button>}
      {s.phase === 'ascent-complete' && <button className="launch-ignite" onClick={onContinue} disabled={!ready || !!error}>继续第 5 步：入轨与关机 →</button>}<button onClick={onReset}>重置并返回发射准备</button>
      <small>{s.phase === 'ascent-complete' ? '本段已完成。点击上方继续第 5 步：预测轨道、关机与一圈验证。' : '达到高空不等于入轨；当前没有轨道成功判定。'} 试飞状态只保留在此窗口。</small>
    </div>
    <dl className="launch-telemetry">
      <div><dt>地球椭球面高度</dt><dd data-ascent-altitude>{(a.altitudeM / 1000).toFixed(2)} <small>km</small></dd></div>
      <div><dt>向上 / 水平对地速度</dt><dd>{s.speedMS.toFixed(0)} / {a.horizontalMS.toFixed(0)} <small>m/s</small></dd></div>
      <div><dt>地心惯性速度</dt><dd>{(norm(a.velocity) / 1000).toFixed(3)} <small>km/s</small></dd></div>
      <div><dt>箭轴高于当地水平</dt><dd>{a.pitchDeg.toFixed(1)} <small>°</small></dd></div>
      <div><dt>当前受控箭体质量</dt><dd data-ascent-mass>{(s.massKg / 1000).toFixed(3)} <small>t</small></dd></div>
      <div><dt>一级 / 二级剩余推进剂</dt><dd>{(a.boosterFuelKg / 1000).toFixed(2)} / {(a.upperFuelKg / 1000).toFixed(2)} <small>t</small></dd></div>
      <div><dt>当前发动机推力</dt><dd>{(s.thrustN / 1000).toFixed(1)} <small>kN</small></dd></div>
      <div><dt>动压 / 空气密度</dt><dd>{(a.dynamicPressurePa / 1000).toFixed(2)} <small>kPa</small> / {a.density.toExponential(1)} <small>kg/m³</small></dd></div>
    </dl>
    {a.separation && <section className="ascent-separation"><h3>分离时发生了什么？</h3><p>分离前 {(a.separation.beforeMassKg / 1000).toFixed(2)} t = 二级与载荷 {(a.separation.upperMassKg / 1000).toFixed(2)} t + 空一级 {(a.separation.boosterMassKg / 1000).toFixed(2)} t。</p><p>两级获得相反的分离冲量，相对速度 2 m/s。橙色航迹是本次模拟路径，分离的一级继续独立运动；未模拟回收。</p></section>}
    <section className="launch-events"><h3>本次事件</h3><ol>{s.events.map((e, i) => <li key={i}><time>{flightTime(e.time)}</time>{e.label}</li>)}</ol></section>
    <details className="launch-flight-boundary"><summary>模型、画面与来源</summary><p>采用米制三维惯性状态、地心引力和随地球共转的静止大气；阻力按相对大气速度计算。发动机比冲按教学气压模型在海平面与真空值之间变化。</p><p>向东转弯为预设辅助姿态，不是完整制导或刚体控制。一级与二级以质点参考位置计算，分离弹簧设定相对速度 2 m/s；整流罩暂时保留。</p><p>大气采用指数近似，背景逐渐变暗不代表气体突然消失；星点为背景示意，云图不是实时天气。局部基地与地球底图分辨率不同，镜头切换不改变物理位置。</p><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/" target="_blank" rel="noreferrer">NASA · 推力与环境压力 ↗</a><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/structural-system/" target="_blank" rel="noreferrer">NASA · 结构与分级 ↗</a></details>
  </div>;
}
