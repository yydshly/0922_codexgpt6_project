import type { FlightState } from '../launch/liftoff';
import { COUNTDOWN_SOURCE, ignitionReading } from '../launch/flightTelemetry';

export function IgnitionSequence({ state }: { state: FlightState }) {
  const r = ignitionReading(state);
  return <section className="ignition-sequence" aria-label="点火与离台时序">
    <strong data-ignition-status>{r.label}</strong>
    <ol><li data-done={r.started}>T−3 s<span>开始点火</span></li><li data-done={r.started && state.time >= r.fullThrustT}>T−1 s<span>2 秒建压完成</span></li><li data-done={state.released}>T=0<span>检查推力后离台</span></li></ol>
    <label>发动机指令水平 <b data-ignition-throttle>{(r.fraction * 100).toFixed(0)}%</b><progress max="1" value={r.fraction}/></label>
    <p>倒计时从 T−10 秒开始；点火后火箭仍被支撑锁住，喷焰从弱到强。以上是本项目教学时序。</p>
    <details><summary>真实火箭也在倒计时结束前点火吗？</summary><p>液体发动机可提前启动、建立推力，再进入离台步骤；不同火箭的时序不同。NASA 的 Artemis I 时间表列出 T−6.36 秒启动 RS-25，T=0 点燃固体助推器并离台。本项目没有复刻 SLS 发动机或整套联锁检查。</p><a href={COUNTDOWN_SOURCE} target="_blank" rel="noreferrer">NASA · Artemis I 倒计时依据 ↗</a></details>
  </section>;
}
