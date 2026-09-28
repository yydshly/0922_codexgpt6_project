import { useEffect, useId, useRef } from 'react';
import type { FlightState } from '../launch/liftoff';
import type { LaunchCommand } from '../launch/liftoff.worker';
import { DISPOSAL_LABELS, DISPOSAL_RUNNING, type DisposalPhase, type DisposalSample } from '../launch/satelliteDisposal';
import { flightTime } from './LaunchControl';
import { FlightEnding } from './FlightEnding';
import { FlightStageGuide } from './FlightStageGuide';

export function disposalStatus(s:FlightState) {
 const q=s.satelliteDisposal;
 if(q?.outcome==='surface-reference')return '再入参考下降结束';
 if(q?.outcome==='stopped')return '流程停止 · 保留结果';
 if(q?.entryAt!=null)return '已进入大气段';
 if(q?.cutoffAt!=null)return '已降低轨道 · 未判定销毁';
 if(s.phase==='disposal-burn')return '离轨点火中 · 正在耗油';
 return '结束业务 · 准备离轨';
}
const actions:Partial<Record<DisposalPhase,[string,LaunchCommand['type']]>>={
 'disposal-review':['发送结束与离轨指令 →','command-disposal'], 'disposal-commanded':['开始反向定向 →','align-disposal'],
 'disposal-armed':['启动卫星自身发动机 →','ignite-disposal'], 'disposal-cutoff':['锁定推进，处理剩余储能 →','passivate-disposal'],
 'disposal-coast-ready':['继续下降至 120 km →','coast-disposal'], 'disposal-interface':['继续等效物体再入 →','enter-disposal'],
 'disposal-boundary':['继续至 0 m 参考面 →','lower-disposal'],
};
interface ControlProps { state:FlightState; paused:boolean; ready:boolean; error:string; rate:number; send:(c:LaunchCommand)=>void; onOpen:()=>void; onSatellite:()=>void; onOverview:()=>void; onSave:()=>void; onReset:()=>void; onResults:()=>void }
export function SatelliteDisposalControl({state:s,paused,ready,error,rate,send,onOpen,onSatellite,onOverview,onSave,onReset,onResults}:ControlProps){
 const q=s.satelliteDisposal!,e=s.satelliteEquipment!,action=actions[s.phase as DisposalPhase],running=DISPOSAL_RUNNING.includes(s.phase),disabled=!ready||!!error;
 const index=q.groundAt!==null?4:q.entryAt!==null?3:q.cutoffAt!==null?2:q.burnAt!==null?1:0;
 return <div className="launch-control operations-control disposal-control">
  <span className="launch-kicker">E02 / 任务末期 · 预留动力离轨</span><h2>完成工作，再执行离轨。</h2>
  <FlightStageGuide steps={['核对资源 · 接收指令','反向定向 · 点火','关机核对 · 储能处理','下降 · 再入受热','参考终点 · 材料结局未求解']} current={index} complete={q.groundAt!==null}><p>发动机负责降低轨道；进入空气后发生减速和受热。没有控制落区、完整烧毁或安全着陆的保证。</p></FlightStageGuide>
  <div className="launch-flight-state"><small role="status">{running&&paused?'已暂停 · ':''}{DISPOSAL_LABELS[s.phase as DisposalPhase]}</small><strong data-flight-time>{flightTime(s.time)}</strong><p>{s.message}</p></div>
  {error&&<p role="alert">{error}</p>}
  {s.phase==='disposal-review'&&<p>{q.plan.reason}<br/>可用理想速度增量 {q.plan.availableMS.toFixed(1)} m/s；有限点火预测耗油 {q.plan.predictedFuelKg.toFixed(2)} kg。</p>}
  <div className="launch-flight-actions">
   {action&&<button className="launch-ignite" disabled={disabled||s.phase==='disposal-review'&&!q.plan.allowed} onClick={()=>{onSatellite();send({type:action[1]} as LaunchCommand);}}>{action[0]}</button>}
   {running&&<button className="launch-ignite" disabled={disabled} onClick={()=>send({type:'pause',value:!paused})}>{paused?'继续卫星离轨计算':'暂停卫星离轨计算'}</button>}
   {s.phase==='disposal-complete'&&<button onClick={onResults}>查看两条路线的结果 →</button>}
   <div className="flight-secondary-actions"><button onClick={onOpen}>离轨参数、曲线与来源 →</button><button onClick={onSatellite}>靠近当前计算对象</button><button onClick={onOverview}>查看下降轨迹</button><button disabled={!ready} onClick={onSave}>保存本次飞行</button></div>
  </div>
  <div className="ascent-rate" aria-label="卫星离轨倍率">{[1,10,100].map(v=><button key={v} disabled={disabled} aria-pressed={rate===v} onClick={()=>send({type:'rate',value:v})}>{v} 倍</button>)}</div>
  <dl className="launch-telemetry"><div><dt>当前高度 / 近地点</dt><dd data-disposal-height>{(s.heightM/1000).toFixed(2)} / {(s.deployment!.satellite.elements.periapsisM/1000).toFixed(2)} km</dd></div><div><dt>卫星总质量 / 剩余推进剂</dt><dd data-disposal-fuel>{s.massKg.toFixed(2)} / {e.fuelKg.toFixed(2)} kg</dd></div><div><dt>实际推力 / 电量</dt><dd>{s.thrustN.toFixed(0)} N / {(s.operations!.energyJ/s.operations!.capacityJ*100).toFixed(1)}%</dd></div><div><dt>点火耗油 / 对称排放</dt><dd>{q.burnedKg.toFixed(2)} / {q.ventedKg.toFixed(2)} kg</dd></div></dl>
  {q.groundAt!==null&&<FlightEnding state={s}/>}<button onClick={onReset}>重置为新的地面任务</button>
 </div>;
}
function Chart({samples,field,title,unit,factor}:{samples:DisposalSample[];field:'altitudeM'|'fuelKg'|'heatFluxWm2';title:string;unit:string;factor:number}){
 const id=useId(),end=Math.max(1,samples.at(-1)?.t??0),max=Math.max(1,...samples.map(p=>(p[field]??0)*factor))*1.05;
 let pen=false;const path=samples.map(p=>{if(p[field]===null){pen=false;return '';}const d=`${pen?'L':'M'}${48+p.t/end*364},${110-p[field]!*factor/max*76}`;pen=true;return d;}).join(' ');
 return <svg className="avoidance-chart" viewBox="0 0 450 148" role="img" aria-labelledby={id}><title id={id}>{title}，纵轴 {unit}，横轴本段秒数；空白表示公式不适用。</title><text x="12" y="18">{title} / {unit}</text>{[0,.5,1].map(f=><g key={f}><path d={`M48 ${110-f*76}H412`} stroke="#345058"/><text x="42" y={114-f*76} textAnchor="end">{(max*f).toFixed(1)}</text><text x={48+f*364} y="130" textAnchor="middle">{(end*f).toFixed(0)}</text></g>)}<path d={path} fill="none" stroke="#ebc58b" strokeWidth="2"/><text x="412" y="144" textAnchor="end">本段 / 秒</text></svg>;
}
export function SatelliteDisposalPanel({state:s,onClose,onSatellite,onOverview}:{state:FlightState;onClose:()=>void;onSatellite:()=>void;onOverview:()=>void}){
 const close=useRef<HTMLButtonElement>(null);useEffect(()=>{const old=document.activeElement as HTMLElement;close.current?.focus();return()=>{if(old?.isConnected)old.focus();};},[]);
 const q=s.satelliteDisposal!,e=s.satelliteEquipment!,a=s.ascent!,o=s.operations!;
 return <section className="avoidance-panel operations-panel disposal-panel" aria-label="卫星动力离轨与再入分析"><header><div><small>发射前已配置 · E02</small><h2>动力离轨与再入参考</h2></div><button ref={close} onClick={onClose}>收起卫星离轨分析</button></header>
  <section className="avoidance-explanation"><h3>{DISPOSAL_LABELS[s.phase as DisposalPhase]}</h3><p>{s.message}</p></section><div className="avoidance-actions"><button onClick={onSatellite}>近看当前对象</button><button onClick={onOverview}>看下降轨迹</button></div>
  <dl className="avoidance-readings"><div><dt>当前高度 / 相对空气速度</dt><dd>{(a.altitudeM/1000).toFixed(2)} km / {a.airSpeedMS.toFixed(1)} m/s</dd></div><div><dt>空气密度 / 阻力</dt><dd>{a.density.toExponential(2)} kg/m³ / {s.dragN.toFixed(1)} N</dd></div><div><dt>实际推力 / 卫星剩余燃料</dt><dd>{s.thrustN.toFixed(0)} N / {e.fuelKg.toFixed(2)} kg</dd></div><div><dt>动压 / 马赫数</dt><dd>{(a.dynamicPressurePa/1000).toFixed(2)} kPa / {q.mach===null?'范围外':q.mach.toFixed(2)}</dd></div><div><dt>驻点热流 · 非表面温度</dt><dd>{q.heatFluxWm2===null?'公式不适用':`${(q.heatFluxWm2/1000).toFixed(1)} kW/m²`}</dd></div><div><dt>环境温度 / 材料温度</dt><dd>{q.temperatureK.toFixed(1)} K / 未计算</dd></div></dl>
  <Chart samples={q.samples} field="altitudeM" title="实际参考下降高度" unit="km" factor={.001}/><Chart samples={q.samples} field="fuelKg" title="燃烧与排放后的推进剂" unit="kg" factor={1}/><Chart samples={q.samples} field="heatFluxWm2" title="驻点热流估算" unit="kW/m²" factor={.001}/>
  <p>质量账本：起始 {q.startMassKg.toFixed(2)} kg − 点火消耗 {q.burnedKg.toFixed(2)} kg − 对称排放 {q.ventedKg.toFixed(2)} kg = 当前 {s.massKg.toFixed(2)} kg。二级资源未用于卫星离轨。</p>
  <p>储能账本：初始 {(q.startEnergyJ/3600).toFixed(1)} Wh，当前 {(o.energyJ/3600).toFixed(1)} Wh；发电 {(q.generatedJ/3600).toFixed(1)} Wh，用电 {(q.consumedJ/3600).toFixed(1)} Wh，损耗 {(q.lossJ/3600).toFixed(1)} Wh，未接收 {(q.shuntedJ/3600).toFixed(1)} Wh。隔离后停止充电，残余电能没有凭空消失。</p>
  <details><summary>设备、预测与模型边界</summary><p>离轨组件为本项目教学设定：35 kg 干质量、40 kg 推进剂、200 N 推力、220 s 比冲。它们从发射前计入质量。反向定向为理想辅助，未求解姿态力矩。有限点火以近地点 60 km 为教学关机条件，并非安全处置标准。</p><p>轨迹由地球引力、阻力和有限推力逐步计算；大气为本地标准参考表，非实时天气。120 km 后切换为等效物体标记；阻力面积系数积 4.4 m²、热流等效半径 0.5 m，不按卫星外形逐面计算。低于 80 km 且 Mach≥5 才输出冷壁驻点热流。未求解解体、烧蚀、材料存活、真实地形或落区控制。</p><p>储能处理为简化操作：发动机锁定、对称排放至 0.1 kg、隔离充电和部分放电。剩余电能仍在账本，不代表全部钝化或工程处置认证。0 m 只表示等效物体到达参考面，不能标称卫星完全销毁。</p></details>
  <details><summary>官方依据 · 教学参数与真实任务分开</summary><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/" target="_blank" rel="noreferrer">NASA · 火箭方程与质量变化 ↗</a><br/><a href="https://orbitaldebris.jsc.nasa.gov/reentry/" target="_blank" rel="noreferrer">NASA · 降低近地点、受控再入与残骸分析 ↗</a><br/><a href="https://www.esa.int/Space_Safety/Space_Debris/Mitigating_space_debris_generation" target="_blank" rel="noreferrer">ESA · 任务末期处置和剩余能源管理 ↗</a></details>
 </section>;
}
