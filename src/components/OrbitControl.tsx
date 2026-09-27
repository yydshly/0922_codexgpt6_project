import type { FlightState } from '../launch/liftoff';
import { meetsOrbitTarget } from '../launch/orbitInsertion';
import { norm } from '../launch/ascent';
import { flightPhaseName, flightTime } from './LaunchControl';
import orbitReportUrl from '../../docs/ORBIT-INSERTION.md?url';
interface Props { state: FlightState; rate: number; paused: boolean; ready: boolean; error: string; onRate: (rate: number) => void; onPause: () => void; onCutoff: () => void; onCoast: () => void; onReset: () => void; onOverview: () => void; onContinue: () => void }
export function OrbitControl({ state: s, rate, paused, ready, error, onRate, onPause, onCutoff, onCoast, onReset, onOverview, onContinue }: Props) {
  const o = s.orbit!, a = s.ascent!, e = o.elements, running = ['orbit-burn', 'orbit-coast'].includes(s.phase), valid = meetsOrbitTarget(e);
  const progress = Math.min(100, o.coastAngleRad / (2 * Math.PI) * 100), disabled = !ready || !!error;
  return <div className="launch-control orbit-control">
    <span className="launch-kicker">05 / 入轨、关机与验证</span><h2>让速度托住旅程。</h2>
    <p>先加速并调整方向，再关机。让真实计算的轨迹绕地一圈，检验它是否留在目标轨道。</p>
    <ol className="orbit-procedure" aria-label="入轨三步"><li aria-current={s.phase === 'orbit-burn' ? 'step' : undefined}>1　加速 · 让预测轨道进入目标</li><li aria-current={s.phase === 'orbit-review' ? 'step' : undefined}>2　关机 · 检查后开始滑行</li><li aria-current={['orbit-coast', 'orbit-complete', 'orbit-failed'].includes(s.phase) ? 'step' : undefined}>3　绕地一圈 · 核验结果</li></ol>
    <div className="launch-flight-state"><small role="status">{paused && running ? '已暂停 · ' : ''}{flightPhaseName(s)}</small><strong data-flight-time>{flightTime(s.time)}</strong><p>{s.message}</p></div>
    <div className="ascent-rate" aria-label="入轨时间倍率">{[1, 10, 100].map(value => <button key={value} aria-pressed={rate === value} disabled={disabled || value === 100 && s.phase === 'orbit-burn'} onClick={() => onRate(value)}>{value} 倍</button>)}</div><small>100 倍用于关机后滑行；计算不及时时减慢推进。</small>
    {error && <p className="launch-flight-error" role="alert">{error}</p>}
    <div className="launch-flight-actions">
      {running && <button className="launch-ignite" onClick={onPause} disabled={disabled}>{paused ? s.phase === 'orbit-burn' ? '开始 / 继续入轨加速 →' : '继续滑行' : '暂停模拟'}</button>}
      {s.phase === 'orbit-burn' && <button onClick={onCutoff} disabled={disabled}>手动关机，查看结果</button>}
      {s.phase === 'orbit-review' && <button className="launch-ignite" onClick={onCoast} disabled={disabled}>开始无动力滑行验证 →</button>}
      {s.phase === 'orbit-complete' && <button className="launch-ignite" disabled={disabled} onClick={onContinue}>继续第 6 步：部署卫星 →</button>}<button onClick={onOverview}>查看整条预测轨道</button><button onClick={onReset}>重置并返回发射准备</button>
    </div>
    <section className={`orbit-verdict ${valid && s.phase !== 'orbit-failed' ? 'orbit-in-target' : ''}`}><strong>{s.phase === 'orbit-complete' ? '入轨验证通过' : s.phase === 'orbit-failed' ? '入轨验证未通过' : valid ? '预测轨道达标 · 仍需滑行验证' : '尚未满足任务轨道'}</strong>
      <p>{!e.bound ? '当前为开放轨迹，无法形成闭合绕地轨道。' : e.periapsisM < 0 ? '预测近地点在地球内部：若现在关机，会返回稠密大气，不能绕地持续飞行。' : '目标：近地点与远地点均在 380–420 km，倾角 28.5° ±1°。'} {s.phase === 'orbit-complete' ? '卫星仍连接二级，第 6 步再部署。' : ''}</p>
      {o.cutoff && <><label htmlFor="coast-progress">关机后实际绕行 {progress.toFixed(1)}%</label><progress id="coast-progress" value={progress} max={100}/><small>已滑行 {(o.coastElapsedS / 60).toFixed(1)} 分钟；需要完整一圈并全程达标。</small></>}
    </section>
    <dl className="launch-telemetry" aria-label="入轨实时参数">
      <div><dt>预测近地点 / 远地点</dt><dd data-orbit-apsides>{(e.periapsisM / 1000).toFixed(1)} / {e.apoapsisM === null ? '开放' : (e.apoapsisM / 1000).toFixed(1)} <small>km</small></dd></div>
      <div><dt>预测倾角 / 偏心率</dt><dd>{e.inclinationDeg.toFixed(2)}° / {e.eccentricity.toFixed(4)}</dd></div>
      <div><dt>椭球面高度 / 惯性速度</dt><dd>{(a.altitudeM / 1000).toFixed(1)} <small>km</small> / {(norm(a.velocity) / 1000).toFixed(3)} <small>km/s</small></dd></div>
      <div><dt>二级剩余推进剂</dt><dd data-orbit-fuel>{a.upperFuelKg.toFixed(1)} <small>kg</small></dd></div>
      <div><dt>推力 / 油门</dt><dd data-orbit-thrust>{(s.thrustN / 1000).toFixed(2)} <small>kN</small> / {(s.throttle * 100).toFixed(1)}%</dd></div>
      <div><dt>预测周期</dt><dd>{e.periodS === null ? '开放轨迹' : `${(e.periodS / 60).toFixed(2)} 分钟`}</dd></div>
    </dl>
    <p className="orbit-scale-note">近远地点以地心距离减去 WGS84 赤道半径定义，和当地椭球面高度略有不同。青色线是当前状态的二体关机预测，发动机工作时会继续变化；地球会遮住穿入内部的线段。</p>
    <a href={orbitReportUrl} download="入轨原理与验证记录.md">下载本步原理、来源与验证记录 ↗</a>
    {o.cutoff && <details><summary>关机记录与滑行检查</summary><p>{flightTime(o.cutoff.time)} · {o.cutoff.reason}。关机燃料 {o.cutoff.fuelKg.toFixed(1)} kg。</p><p>滑行实测径向高度：{o.minCoastAltitudeM === null ? '尚未开始' : `${(o.minCoastAltitudeM / 1000).toFixed(2)}–${(o.maxCoastAltitudeM! / 1000).toFixed(2)} km`}。当前比机械能相对变化 {o.relativeEnergyChange.toExponential(2)}；含简化阻力影响，不单独等同于数值误差。</p></details>}
    <details className="launch-flight-boundary"><summary>制导、环境与真实性边界</summary><p>这是教学辅助制导：按高度、径向速度与切向速度反馈调整方向；允许理想的 0–100% 连续油门和即时指向。不是实际火箭飞控，未模拟发动机最低油门、姿态转动惯量或点火寿命。</p><p>位置与速度始终由同一引力、推力、阻力积分得到，没有跳到预设轨道。关机后保持燃料不变；整流罩与载荷仍保留。滑行到 80 km 以下停止，不模拟再入。</p><p>地球大气、云层及空间物体可在“飞行环境与说明”查看。示例物体不参与碰撞；空一级下降至 80 km 后结束跟踪。未加入 J2、真实高层大气与太阳月球摄动，结果不是导航级验证。</p><a href="https://science.nasa.gov/learn/basics-of-space-flight/chapter3-4/" target="_blank" rel="noreferrer">NASA · 引力、轨道与自由落体 ↗</a><a href="https://science.nasa.gov/learn/basics-of-space-flight/chapter5-1/" target="_blank" rel="noreferrer">NASA · 行星轨道 ↗</a></details>
    <section className="launch-events"><h3>本次事件</h3><ol>{s.events.map((event, i) => <li key={i}><time>{flightTime(event.time)}</time>{event.label}</li>)}</ol></section>
  </div>;
}
