import { solarPointingReading } from '../launch/solarPointing';
import { satelliteName } from '../launch/satellitePlan';
import { satelliteDeliveryExplanation } from '../launch/satelliteDemo';
import { useEffect, useId, useRef, useState } from 'react';
import type { FlightState } from '../launch/liftoff';
import type { LaunchCommand } from '../launch/liftoff.worker';
import { OPS, OPS_LABELS, OPS_RUNNING, type OperationsPhase, type OperationsSample } from '../launch/satelliteOperations';
import { flightTime } from './LaunchControl';
import { FlightStageGuide } from './FlightStageGuide';
import reportUrl from '../../docs/SATELLITE-OPERATIONS.md?url';
import './AvoidancePanel.css';
import './OperationsPanel.css';

interface ControlProps { onGuide:()=>void; onMaintenance:()=>void; state: FlightState; paused: boolean; ready: boolean; error: string; rate: number; send: (command: LaunchCommand) => void; onOpen: () => void; onOverview: () => void; onSatellite: () => void; onSave: () => void; onReset: () => void }
export function OperationsControl({ onGuide, state: s, paused, ready, error, rate, send, onOpen, onOverview, onSatellite, onSave, onReset, onMaintenance }: ControlProps) {
  const o = s.operations!, running = OPS_RUNNING.includes(s.phase), disabled = !ready || !!error;
  const step = s.phase === 'ops-ready' || s.phase === 'ops-align' ? 0 : s.phase === 'ops-power-ready' || s.phase === 'ops-cycle' ? 1 : 2;
  return <div className="launch-control operations-control">
    <span className="launch-kicker">P4 / {satelliteName(s)} 卫星开始工作</span><h2>把观测带回地球。</h2><p>本次任务：完成一次对地观测数据的采集与交付。这里用数据量演示工作过程，尚未生成真实遥感图像。</p><button onClick={onGuide}>这颗卫星做什么？范围和能力 →</button>
    <FlightStageGuide steps={['太阳翼定向 · 核对供电', '日夜循环 · 观测并保存', '地面站窗口 · 下传数据']} current={s.phase === 'ops-failed' ? null : step} complete={s.phase === 'ops-complete'}><p>接续同一颗已部署的卫星。先让太阳翼对准太阳方向、核对是否在地影中，再观察一圈日夜，最后等待通信窗口下传。</p></FlightStageGuide>
    <div className="launch-flight-state"><small role="status">{running && paused ? '已暂停 · ' : ''}{OPS_LABELS[s.phase as OperationsPhase]}</small><strong data-flight-time>{flightTime(s.time)}</strong><p>{satelliteDeliveryExplanation(s) ?? s.message}</p></div>
    {s.phase === 'ops-complete' && <section className="avoidance-entry"><strong>{s.satelliteEquipment ? '第五段：E02 任务末期离轨' : '第五段：卫星维护与退役'}</strong><p>{s.satelliteEquipment ? '继承当前电量、轨道和发射前携带的离轨燃料，核对条件后执行动力离轨。' : '继承当前电量与轨道，先检查一圈能源；E01 无推进器，任务结束后会保留退役在轨结果。'}</p><button disabled={disabled} onClick={onMaintenance}>{s.satelliteEquipment ? '下一段：动力离轨 →' : '下一段：维护与退役 →'}</button></section>}
    {error && <p role="alert">{error}</p>}
    <div className="launch-flight-actions">
      {s.phase === 'ops-ready' && <button className="launch-ignite" disabled={disabled} onClick={() => send({type:'align-operations'})}>1 · 开始对日定向 →</button>}
      {s.phase === 'ops-power-ready' && <button className="launch-ignite" disabled={disabled} onClick={() => { onOverview(); send({type:'observe-operations'}); }}>2 · 观察一圈日夜并采集 →</button>}
      {s.phase === 'ops-data-ready' && <button className="launch-ignite" disabled={disabled} onClick={() => { onOverview(); send({type:'downlink-operations'}); }}>3 · 等待窗口并下传 →</button>}
      {running && <button className="launch-ignite" disabled={disabled} onClick={() => send({type:'pause',value:!paused})}>{paused ? '继续卫星任务' : '暂停卫星任务'}</button>}
      <div className="flight-secondary-actions"><button onClick={onOpen}>工作参数与曲线 →</button><button onClick={onSatellite}>靠近工作中的卫星</button><button onClick={onOverview}>查看日夜与地面站</button><button disabled={!ready} onClick={onSave}>保存本次飞行</button></div>
    </div>
    <div className="ascent-rate" aria-label="卫星任务倍率">{[1,10,100].map(v => <button key={v} disabled={disabled} aria-pressed={v===rate} onClick={() => send({type:'rate',value:v})}>{v} 倍</button>)}</div>
    <dl className="launch-telemetry">
      <div><dt>当前环境 / 发电</dt><dd data-ops-light>{o.shadow ? '地影' : '日照'} / {o.generationW.toFixed(0)} <small>W</small></dd></div>
      <div><dt>电池 / 容量</dt><dd data-ops-battery>{(o.energyJ/o.capacityJ*100).toFixed(1)}% <small>· {(o.energyJ/3600).toFixed(1)} / {o.capacityJ/3600} Wh</small></dd></div>
      <div><dt>机上待传 / 地面已收</dt><dd data-ops-data>{o.bufferMB.toFixed(0)} / {o.deliveredMB.toFixed(0)} <small>MB</small></dd></div>
      <div><dt>当前通信</dt><dd data-ops-link>{o.transmitting ? `正在下传 · 站 ${o.activeStation}` : o.activeStation ? `站 ${o.activeStation} 可见 · 未传送` : '无可见站 · 数据保留'}</dd></div>
    </dl>
    {s.phase === 'ops-complete' && <section className="orbit-verdict orbit-in-target"><strong>一次观测任务完成</strong><p>已采集 {o.collectedMB.toFixed(0)} MB，地面收到 {o.deliveredMB.toFixed(0)} MB，机上剩余 {o.bufferMB.toFixed(0)} MB。结果已冻结，可保存并回看曲线。{s.satelliteEquipment ? '从上方入口进入 E02「动力离轨」，继续使用预装推进器与剩余燃料。' : '从上方入口进入 E01「维护与退役」；无推进器，退役后仍在轨。'}</p></section>}
    <details className="launch-flight-boundary"><summary>二级去了哪里？电量从哪里开始？</summary><p>二级保留在 {o.origin} 结束时的历史记录（{flightTime(o.carrierRecordTime)}）。本段只推进卫星，因此不再显示二级的当前位置；这不代表二级已消失或已烧毁。</p><p>电池从本段开始设为 60%，容量、负载、数据速率为教学参数。此前发射过程没有跟踪卫星用电。能源设备视为已包含在载荷质量内。</p></details>
    <button onClick={onReset}>重置为新的地面任务</button>
  </div>;
}

type Field = 'generationW'|'loadW'|'batteryWh'|'bufferMB'|'deliveredMB'|'elevationDeg';
function Plot({ samples, fields, title, unit, ceiling }: { samples: OperationsSample[]; fields: {key:Field;name:string;color:string}[]; title:string;unit:string;ceiling?:number }) {
  const id=useId(), duration=Math.max(1,samples.at(-1)?.t??0), min=fields[0].key==='elevationDeg'?-90:0;
  const max=ceiling??Math.max(1,...samples.flatMap(s=>fields.map(f=>s[f.key])))*1.12;
  const x=(t:number)=>48+t/duration*364, y=(v:number)=>114-(v-min)/(max-min)*76;
  return <figure className="ops-figure"><svg className="avoidance-chart" viewBox="0 0 450 152" role="img" aria-labelledby={id}><title id={id}>{title}。纵轴 {unit}，横轴本段分钟数，灰色背景为地影采样区间。</title><text x="12" y="19">{title} / {unit}</text>
    {samples.map((s,i)=>s.shadow&&i<samples.length-1?<rect key={i} x={x(s.t)} y="38" width={Math.max(.5,x(samples[i+1].t)-x(s.t))} height="76" fill="#465767" opacity=".4"/>:null)}
    {[0,.5,1].map(f=><g key={f}><path d={`M48 ${114-f*76}H412`} stroke="#345058"/><text x="42" y={118-f*76} textAnchor="end">{(min+(max-min)*f).toFixed(0)}</text><text x={48+f*364} y="130" textAnchor="middle">{(duration*f/60).toFixed(1)}</text></g>)}
    {fields.map(field=><path key={field.key} d={samples.map((s,i)=>`${i?'L':'M'}${x(s.t)},${y(s[field.key])}`).join(' ')} stroke={field.color} strokeWidth="2" fill="none"/>)}
    {fields[0].key==='elevationDeg'&&<path d={`M48 ${y(10)}H412`} stroke="#e6c184" strokeDasharray="5 4"/>}<text x="412" y="145" textAnchor="end">本段 / 分钟</text>
  </svg><figcaption>{fields.map(f=><span key={f.key} style={{color:f.color}}>{f.name}</span>)}<span>灰底 · 地影</span></figcaption></figure>;
}

interface Props { onGuide:()=>void; state:FlightState; paused:boolean; onClose:()=>void; onSatellite:()=>void; onOverview:()=>void }
export function OperationsPanel({onGuide,state:s,paused,onClose,onSatellite,onOverview}:Props) {
  const close=useRef<HTMLButtonElement>(null),[tab,setTab]=useState<'power'|'data'>('power');
  useEffect(()=>{const opener=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(opener?.isConnected)opener.focus({preventScroll:true});};},[]);
  const o=s.operations;
  if(!o)return <section className="avoidance-panel operations-panel"><h2>正在接续卫星状态…</h2></section>;
  const best=Math.max(...o.links.map(l=>l.elevationDeg)), solar=solarPointingReading(s);
  return <section className="avoidance-panel operations-panel" aria-label="卫星工作参数与曲线">
    <header><div><small>部署之后 / 第四段</small><h2>卫星 · 能源与任务</h2></div><button ref={close} onClick={onClose}>收起工作分析</button></header>
    <button onClick={onGuide}>先了解用途、工作流程与覆盖边界 →</button><section className="avoidance-explanation"><span>本段 +{(o.elapsedS/60).toFixed(1)} 分钟 · {OPS_RUNNING.includes(s.phase) ? paused ? '已暂停' : '计算中' : '检查点冻结'} · {o.reserveMode?'低电量保护':solar?.supplyKind==='unserved'?'供电不足':'能源核对'}</span><h3>{solar?.supplyTitle ?? '工作段记录'}</h3>{solar && <p data-power-supply>{solar.supply}</p>}<p>{OPS_RUNNING.includes(s.phase)&&!paused?s.message:'当前时间冻结；参数表示此刻可用能力，电量与数据量不会在暂停期间变化。操作按钮在左侧。'}</p></section>
    <div className="avoidance-actions"><button onClick={onSatellite}>看翼板与卫星定向</button><button onClick={onOverview}>看日夜与通信连线</button></div>
    <dl className="avoidance-readings"><div><dt>发电 / 总用电</dt><dd>{o.generationW.toFixed(0)} / {o.loadW.toFixed(0)} W</dd></div><div><dt>翼板入射角</dt><dd>{solar ? `${solar.angleDeg.toFixed(1)}°` : '—'}</dd></div><div><dt>已经历日照 / 地影</dt><dd>{(o.sunlightS/60).toFixed(1)} / {(o.eclipseS/60).toFixed(1)} min</dd></div><div><dt>最佳站仰角 / 门槛</dt><dd>{best.toFixed(1)}° / 10°</dd></div></dl>
    <nav className="avoidance-tabs" aria-label="卫星工作图表"><button aria-pressed={tab==='power'} onClick={()=>setTab('power')}>发电与电池</button><button aria-pressed={tab==='data'} onClick={()=>setTab('data')}>数据与通信窗口</button></nav>
    {tab==='power'?<><Plot samples={o.samples} title="发电和用电" unit="W" fields={[{key:'generationW',name:'太阳翼发电',color:'#eaca89'},{key:'loadW',name:'总用电',color:'#88d9dc'}]}/><Plot samples={o.samples} title="电池储能" unit="Wh" ceiling={o.capacityJ/3600} fields={[{key:'batteryWh',name:'剩余电能',color:'#b1d59c'}]}/></>:<><Plot samples={o.samples} title="数据保存与交付" unit="MB" ceiling={OPS.targetMB} fields={[{key:'bufferMB',name:'机上待传',color:'#eaca89'},{key:'deliveredMB',name:'地面已收',color:'#88d9dc'}]}/><Plot samples={o.samples} title="最佳地面站仰角" unit="度" ceiling={90} fields={[{key:'elevationDeg',name:'最佳仰角 · 虚线为 10° 门槛',color:'#b1d59c'}]}/></>}
    <p>曲线每 10 秒采样，能量与数据每秒计算。地影边界为硬切换，灰底只按采样定位；图线不是实际遥测。</p>
    <table><caption>教学地面站 · 随地球自转</caption><thead><tr><th>站点</th><th>仰角</th><th>斜距 / 状态</th></tr></thead><tbody>{o.links.map(l=><tr key={l.id}><th>{l.name}</th><td>{l.elevationDeg.toFixed(1)}°</td><td>{(l.rangeM/1000).toFixed(0)} km<br/>{o.transmitting&&o.activeStation===l.id?'正在下传':l.visible?'几何可见':'不可用'}</td></tr>)}</tbody></table>
    <p>总览地表青点为放大的教学站；绿色连线在下传阶段的有效窗口出现，橙线在采集时指向星下点，暂停时保留该帧。均为解释线。站点是自定网络，不代表现实设施、预约或接收许可。卫星在地球背后时会被遮挡，可拖动镜头转向另一侧。</p>
    <details><summary>本次账本与教学参数</summary><p>已发电 {(o.generatedJ/3600).toFixed(2)} Wh；负载需求 {(o.consumedJ/3600).toFixed(2)} Wh；充放电损耗 {(o.lossJ/3600).toFixed(2)} Wh；满电后未接收 {(o.shuntedJ/3600).toFixed(2)} Wh；未供电 {(o.unservedJ/3600).toFixed(2)} Wh。</p><p>已采集 {o.collectedMB.toFixed(0)} MB = 机上 {o.bufferMB.toFixed(0)} MB + 地面 {o.deliveredMB.toFixed(0)} MB。数据是计数，不生成真实遥感图像。</p><p>500 kg 版本：太阳翼 5.5 m²、效率 24%、有效填充 85%；1361 W/m² 按日地距离平方反比与入射余弦缩放。电池 800 Wh，初始 60%；基础与定向共 200 W，观测增加 250 W，下传增加 150 W。250 kg 版本面积按 0.64 倍、容量与负载按 0.5 倍配置。</p><p>充电效率 92%，放电效率 90%。电量 ≤20% 暂停观测与下传，≥35% 才恢复；保护模式中仍消耗基础电力。观测速率 2 MB/s，下传 4 MB/s，目标 240 MB；下传还需仰角 ≥10°。全部为教学设定，未模拟带宽、云遮、指向精度或链路误码。</p></details>
    <details><summary>计算依据与展示边界</summary><p>卫星接续原位置和速度，以 1 秒固定步长推进地球引力与原简化阻力；倍率只增加步数。卫星理想对地定向，下传时理想对站；太阳翼独立对日转向。30 秒转向是辅助控制，未求解力矩、机构限位或转向遮挡。</p><p>太阳方向使用 USNO 近似太阳位置与恒星时，UTC 近似 UT1；并非 JPL 精密太阳向量。地影采用地球球体的圆柱形硬阴影，未模拟半影。图中光照、太阳翼功率与地影判定共用该方向；弱环境补光仅为辨认模型。</p><a href="https://aa.usno.navy.mil/faq/sun_approx" target="_blank" rel="noreferrer">USNO · 近似太阳位置 ↗</a><br/><a href="https://aa.usno.navy.mil/faq/GAST" target="_blank" rel="noreferrer">USNO · 恒星时 ↗</a><br/><a href="https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/" target="_blank" rel="noreferrer">NASA · 卫星电源系统 ↗</a><br/><a href="https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/" target="_blank" rel="noreferrer">NASA · 地面系统与任务运行 ↗</a><p>时限 6 小时；没有有效窗口时保留数据并停止，不把未交付任务标记为成功。交付后按发射前方案继续：E01 维护与无推进退役；E02 使用预装设备动力离轨。自由操控变轨仍未接入。</p></details>
    <p><a href={reportUrl} download="卫星工作任务说明.md">下载操作、模型与验证说明 ↗</a></p>
  </section>;
}
