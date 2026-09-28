import type { FlightState } from '../launch/liftoff';
import { solarPointingReading } from '../launch/solarPointing';
import './SolarPointingReadout.css';

export function SolarPointingReadout({ state }: { state: FlightState }) {
  const r = solarPointingReading(state);
  if (!r) return null;
  return <section className="solar-pointing-readout" aria-label="太阳翼定向与供电读数">
    <strong>{r.alignment}</strong>
    <dl><div><dt>板面朝向与太阳夹角</dt><dd data-solar-angle>{r.angleDeg.toFixed(1)}°</dd></div><div><dt>发电 / 用电</dt><dd data-solar-power>{r.generationW.toFixed(0)} / {r.loadW.toFixed(0)} W</dd></div></dl>
    {['ops-ready','ops-align','ops-power-ready'].includes(state.phase) && <><progress aria-label="教学定向进度" value={r.progress} max={1}/><small>30 秒理想转向 · {(r.progress * 100).toFixed(0)}%</small></>}
    <p data-solar-supply>{r.supply}</p>
    <small>黄箭头指向太阳；蓝箭头垂直于蓝色发电正面。两者同向时夹角接近 0°，板面正对太阳。主体可朝地球，太阳翼独立转动。地影中的弱补光仅用于看清模型，不参与发电。</small>
  </section>;
}
