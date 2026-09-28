import { SolarPointingReadout } from './SolarPointingReadout';
import type { FlightState } from '../launch/liftoff';
import { satelliteDemoCue, satelliteDemoPacing, SATELLITE_DEMO_STEPS } from '../launch/satelliteDemo';
import './SatelliteDemoCapability.css';

export function SatelliteDemoCapability({ state, onView }: { state: FlightState; onView: () => void }) {
  const cue = satelliteDemoCue(state), o = state.operations;
  if (!cue || !o) return null;
  return <section className="satellite-demo-capability" aria-label="卫星观测能力演示" data-capability-step={cue.step}>
    <small>本章能力演示 · 自动衔接</small>
    <ol aria-label="卫星工作演示进度">{SATELLITE_DEMO_STEPS.map((step, i) => <li key={step} aria-current={i === cue.step ? 'step' : undefined}><span>{i + 1}</span>{step}</li>)}</ol>
    <h3>{cue.title}</h3><p>{cue.detail}</p>
    {cue.step === 0 ? <SolarPointingReadout state={state}/> : <dl><div><dt>已采集</dt><dd>{o.collectedMB.toFixed(0)} MB</dd></div><div><dt>机上待传</dt><dd>{o.bufferMB.toFixed(0)} MB</dd></div><div><dt>地面已收</dt><dd>{o.deliveredMB.toFixed(0)} MB</dd></div></dl>}
    <button onClick={onView}>{cue.view === 'surface' ? '回到地表观测近景' : cue.view === 'power' ? '回到太阳翼定向近景' : '回到本段轨道全景'}</button>
    <small>{satelliteDemoPacing(state).visibleWork ? '关键过程放慢展示；之后自动加速长时段。' : '可暂停查看、拖动镜头；继续后自动衔接。'} 橙色范围是假设相机视场；MB 是教学计数，未生成照片，也未判定地表照明与云遮是否允许成像。</small>
  </section>;
}
