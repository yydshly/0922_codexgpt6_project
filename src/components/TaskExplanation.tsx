import type { FlightState } from '../launch/liftoff';
import type { flightTelemetry } from '../launch/flightTelemetry';
import { telemetryNumber } from '../launch/flightTelemetry';
import { observationExplanation, powerExplanation, satelliteTaskReceipt } from '../launch/taskExplanation';
import './TaskExplanation.css';

export function CalculationLabel() {
  return <p className="calculation-label"><span>近似计算</span><span>设备与任务为教学设定</span><span>关系图为辅助标注</span></p>;
}

export function AirLoadExplanation({ reading: r }: { reading: ReturnType<typeof flightTelemetry> }) {
  return <figure className="task-explanation air-load-explanation" aria-label="空气与阻力的关系">
    <figcaption>为什么空气稀薄了，阻力仍可能很大？</figcaption>
    <ol className="explanation-flow">
      <li><span>空气与运动</span><strong>{telemetryNumber(r.density, 4)} <small>kg/m³</small></strong><small>密度 ρ</small><strong>{telemetryNumber(r.airSpeedMS, 1)} <small>m/s</small></strong><small>相对空气速度 v</small></li>
      <li><span>共同决定动压</span><strong>{telemetryNumber(r.dynamicPressurePa / 1000)} <small>kPa</small></strong><small>q = ½ρv²</small></li>
      <li><span>外形参与决定阻力</span><strong>{telemetryNumber(r.dragN / 1000)} <small>kN</small></strong><small>D = q × Cd × A</small></li>
    </ol>
    <p>密度下降会减小动压，速度增加会提高动压；不能只看高度判断阻力。箭头表示计算关系，数值沿用当前时刻。</p>
    <p className="explanation-boundary">阻力耗能率 {telemetryNumber(r.dragPowerW / 1e6, 3)} MW ≠ 箭体吸收热功率，也不是表面温度。</p>
  </figure>;
}

export function PowerExplanation({ state, paused }: { state: FlightState; paused: boolean }) {
  const r = powerExplanation(state, paused);
  if (!r) return null;
  return <figure className="task-explanation" data-power-explanation={r.supplyKind}>
    <figcaption>{r.supplyTitle}<small>{r.status}</small></figcaption>
    <ol className="explanation-flow power-flow">
      <li data-tone="sun"><span>{r.shadow ? '地球遮挡阳光' : '阳光到达太阳翼'}</span><strong>{r.generationW.toFixed(0)} <small>W</small></strong><small>板面与太阳 {r.angleDeg.toFixed(1)}°</small></li>
      <li><span>设备用电需求</span><strong>{r.loadW.toFixed(0)} <small>W</small></strong><small>基础设备 + 当前任务</small></li>
      <li data-tone={r.supplyKind === 'unserved' ? 'warning' : 'battery'}><span>电池 {r.batteryPercent.toFixed(1)}%</span><strong className="explanation-action">{r.batteryAction}</strong><small>{r.supplyKind === 'unserved' ? '缺口未被补足' : r.differenceW < -1e-6 ? '← 补充负载缺口' : r.differenceW > 1e-6 ? '剩余电力 →' : '收支平衡'}</small></li>
    </ol>
    <p>{r.result} {!r.running && '当前时间冻结，电量不会自行变化。'}</p>
    <p className="explanation-boundary">图示为功率分配关系；充放电损耗另计入下方账本。地影优先：即使对准太阳，遮挡时仍不发电。</p>
  </figure>;
}

export function ObservationExplanation({ state, paused }: { state: FlightState; paused: boolean }) {
  const r = observationExplanation(state, paused), o = state.operations;
  if (!r || !o) return null;
  return <figure className="task-explanation" aria-label="观测数据流向">
    <figcaption>采到的数据，到地面了吗？<small>{r.status}</small></figcaption>
    <ol className="explanation-flow">
      <li data-active={r.collecting}><span>累计采集</span><strong>{o.collectedMB.toFixed(0)} <small>MB</small></strong><small>{r.collecting ? '正在增加' : '采集计数'}</small></li>
      <li><span>机上待传</span><strong>{o.bufferMB.toFixed(0)} <small>MB</small></strong><small>尚未交付地面</small></li>
      <li data-active={r.transmitting}><span>地面已收</span><strong>{o.deliveredMB.toFixed(0)} <small>MB</small></strong><small>{r.transmitting ? '窗口内下传' : r.complete ? '目标已交付' : '等待交付'}</small></li>
    </ol>
    <p>{r.reason}</p><p className="explanation-boundary">累计采集 = 机上待传 + 地面已收。这里记录教学数据量，未生成影像，也未计算累计覆盖面积。</p>
  </figure>;
}

function receiptTime(t: number) { return `T${t < 0 ? '−' : '+'}${Math.abs(t).toFixed(1)} s`; }
export function SatelliteTaskReceipt({ state }: { state: FlightState }) {
  const r = satelliteTaskReceipt(state);
  if (!r) return null;
  return <section className="task-receipt" aria-label="卫星任务回执">
    <h3>本次任务回执 <small>教学计算记录</small></h3>
    <dl>
      <div><dt>工作段{r.historical ? '历史' : '记录'}区间</dt><dd>{receiptTime(r.start)} → {receiptTime(r.end)}<small>共 {(r.duration / 60).toFixed(1)} 分钟，不含后续维护或离轨。</small></dd></div>
      <div><dt>业务成果</dt><dd>{r.outcome}<small>采集 {r.collectedMB.toFixed(0)} MB · 地面 {r.deliveredMB.toFixed(0)} MB · 待传 {r.bufferMB.toFixed(0)} MB</small></dd></div>
      <div><dt>卫星去向</dt><dd>{r.disposition}</dd></div>
    </dl>
    <p>数据交付与物体处置分别判断。画出的相机范围是瞬时假设视场，不能当作已拍摄面积；参考下降也不代表真实烧毁或安全落地。</p>
  </section>;
}
