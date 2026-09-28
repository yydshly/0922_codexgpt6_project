import { useEffect, useId, useRef } from 'react';
import type { FlightState } from '../launch/liftoff';
import type { LaunchCommand } from '../launch/liftoff.worker';
import { LIFE_LABELS, LIFE_RUNNING, disposalAssessment, type LifecyclePhase, type LifecycleSample } from '../launch/satelliteLifecycle';
import { flightTime } from './LaunchControl';
import { FlightStageGuide } from './FlightStageGuide';
import reportUrl from '../../docs/SATELLITE-LIFECYCLE.md?url';
import './AvoidancePanel.css';
import './OperationsPanel.css';

export const lifecycleStatus = (s:FlightState) => s.lifecycle?.mode==='retired' ? '已退役 · 仍在轨' : s.lifecycle?.mode==='power-lost' ? '供电异常 · 在轨保留' : s.lifecycle?.isolated ? '结束任务 · 电能收尾' : s.lifecycle?.mode==='maintaining' ? '低负载维护' : '保留工作状态';
interface ControlProps { state:FlightState; paused:boolean; ready:boolean; error:string; rate:number; send:(c:LaunchCommand)=>void; onOpen:()=>void; onOverview:()=>void; onSatellite:()=>void; onSave:()=>void; onReset:()=>void; onResults:()=>void }
export function LifecycleControl({state:s,paused,ready,error,rate,send,onOpen,onOverview,onSatellite,onSave,onReset,onResults}:ControlProps){
  const l=s.lifecycle!,o=s.operations!,running=LIFE_RUNNING.includes(s.phase),disabled=!ready||!!error;
  const step = s.phase === 'life-failed' ? null : ['life-ready', 'life-care'].includes(s.phase) ? 0 : ['life-review', 'life-working', 'life-disposal'].includes(s.phase) ? 1 : ['life-contact', 'life-commanded', 'life-closing'].includes(s.phase) ? 2 : 3;
  return <div className="launch-control operations-control lifecycle-control">
    <span className="launch-kicker">P5 / 维护与任务结束 · 无推进分支</span><h2>维护，或结束任务。</h2>
    <FlightStageGuide steps={['低负载维护 · 检查一圈', '保留工作 / 核对结束条件', '接收指令 · 电能收尾', '观察退役后的在轨运动']} current={step} complete={s.phase === 'life-observed'}><p>退役是正式结束观测、数据下传等业务，不是暂时休息。先检查能源，再选择保留工作或结束任务。E01 完成电能收尾后仍会绕地球飞行，没有推进器就不能主动离轨。</p></FlightStageGuide>
    <div className="launch-flight-state"><small role="status">{paused&&running?'已暂停 · ':''}{LIFE_LABELS[s.phase as LifecyclePhase]}</small><strong data-flight-time>{flightTime(s.time)}</strong><p>{s.message}</p></div>
    {error&&<p role="alert">{error}</p>}
    <div className="launch-flight-actions">
      {s.phase==='life-observed'&&<button className="launch-ignite" onClick={onResults}>查看本次任务结果 →</button>}
      {s.phase==='life-ready'&&<button className="launch-ignite" disabled={disabled} onClick={()=>{onOverview();send({type:'start-maintenance'});}}>1 · 开始一圈能源维护 →</button>}
      {s.phase==='life-review'&&<button className="launch-ignite" disabled={disabled} onClick={()=>send({type:'keep-maintenance'})}>保留工作状态，先不退役</button>}
      {['life-review','life-working'].includes(s.phase)&&<button disabled={disabled} onClick={()=>send({type:'review-retirement'})}>2 · 核对任务结束条件 →</button>}
      {s.phase==='life-disposal'&&<><button disabled title="当前 E01 没有推进器与推进剂">主动离轨不可用 · 未配置推进</button><p>以下入口会结束本次业务，并保留未完成处置的在轨卫星。需要主动离轨，必须在发射前设计推进或减轨装置。</p><button className="launch-ignite" disabled={disabled||o.energyJ<o.capacityJ*.1} onClick={()=>{onOverview();send({type:'command-retirement'});}}>3 · 发送结束任务指令 →</button></>}
      {s.phase==='life-commanded'&&<button className="launch-ignite" disabled={disabled} onClick={()=>send({type:'close-retirement'})}>继续执行电能收尾 →</button>}
      {s.phase==='life-retired'&&<button className="launch-ignite" disabled={disabled} onClick={()=>{onOverview();send({type:'observe-retirement'});}}>4 · 观察退役后 10 分钟 →</button>}
      {running&&<button className="launch-ignite" disabled={disabled} onClick={()=>send({type:'pause',value:!paused})}>{paused?'继续维护与退役计算':'暂停维护与退役计算'}</button>}
      <div className="flight-secondary-actions"><button onClick={onOpen}>维护记录与退役条件 →</button><button onClick={onSatellite}>{l.mode==='retired'?'靠近退役卫星':'靠近 E01 卫星'}</button><button onClick={onOverview}>查看在轨位置</button><button disabled={!ready} onClick={onSave}>保存本次飞行</button></div>
    </div>
    <div className="ascent-rate" aria-label="维护退役倍率">{[1,10,100].map(v=><button key={v} disabled={disabled} aria-pressed={v===rate} onClick={()=>send({type:'rate',value:v})}>{v} 倍</button>)}</div>
    <dl className="launch-telemetry"><div><dt>当前业务状态</dt><dd data-life-status>{lifecycleStatus(s)}</dd></div><div><dt>电池 / 充电回路</dt><dd data-life-battery>{(o.energyJ/o.capacityJ*100).toFixed(1)}% / {l.isolated?'已隔离':'连接'}</dd></div><div><dt>接入功率 / 用电</dt><dd data-life-power>{o.generationW.toFixed(0)} / {o.loadW.toFixed(0)} <small>W</small></dd></div><div><dt>推进能力 / 处置结果</dt><dd>0 N · 0 kg <small>推进剂 / 未离轨</small></dd></div></dl>
    {l.mode==='retired'&&<section className="orbit-verdict"><strong>已结束业务，尚未完成空间处置</strong><p>卫星保留在场景中。充电与主用电回路断开，保留 5% 教学残余电量；没有完全钝化认证。当前位置继续由引力和简化阻力计算，不预测坠落日期。</p>{s.phase==='life-observed'&&<p>本次无推进分支已完成，可保存和验收。带推进卫星的变轨、离轨及长期寿命另需模型，不能自动添加发动机。</p>}</section>}
    <button onClick={onReset}>重置为新的地面任务</button>
  </div>;
}
function Chart({samples,field,title,unit,max}:{samples:LifecycleSample[];field:'batteryWh'|'altitudeKm'|'loadW';title:string;unit:string;max?:number}){
  const id=useId(),end=Math.max(1,samples.at(-1)?.t??0),low=field==='altitudeKm'?Math.floor(Math.min(...samples.map(s=>s[field]))/10)*10-10:0,high=max??Math.max(low+1,...samples.map(s=>s[field]))*1.05;
  return <svg className="avoidance-chart" viewBox="0 0 450 148" role="img" aria-labelledby={id}><title id={id}>{title}，纵轴 {unit}，横轴 P5 分钟数；灰底为地影。</title><text x="12" y="19">{title} / {unit}</text>
    {samples.map((s,i)=>s.shadow&&i<samples.length-1?<rect key={i} x={48+s.t/end*364} y="35" width={Math.max(.5,(samples[i+1].t-s.t)/end*364)} height="75" fill="#42525f" opacity=".4"/>:null)}
    {[0,.5,1].map(f=><g key={f}><path d={`M48 ${110-f*75}H412`} stroke="#345058"/><text x="42" y={114-f*75} textAnchor="end">{(low+(high-low)*f).toFixed(0)}</text><text x={48+f*364} y="126" textAnchor="middle">{(end*f/60).toFixed(1)}</text></g>)}
    <path d={samples.map((s,i)=>`${i?'L':'M'}${48+s.t/end*364},${110-(s[field]-low)/(high-low)*75}`).join(' ')} stroke={field==='batteryWh'?'#c8dca1':'#87d9dc'} strokeWidth="2" fill="none"/><text x="412" y="142" textAnchor="end">P5 / 分钟 · 灰底为地影</text></svg>;
}
interface Props { state:FlightState; paused:boolean; onClose:()=>void; onSatellite:()=>void; onOverview:()=>void }
export function LifecyclePanel({state:s,paused,onClose,onSatellite,onOverview}:Props){
  const close=useRef<HTMLButtonElement>(null);useEffect(()=>{const opener=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(opener?.isConnected)opener.focus({preventScroll:true});};},[]);
  const l=s.lifecycle,o=s.operations;if(!l||!o)return <section className="avoidance-panel lifecycle-panel"><h2>正在接续卫星能源与轨道…</h2></section>;
  const assessment=disposalAssessment(s.deployment!.satellite.elements),running=LIFE_RUNNING.includes(s.phase);
  return <section className="avoidance-panel operations-panel lifecycle-panel" aria-label="卫星维护与退役分析"><header><div><small>部署之后 / 第五段 · 无推进分支</small><h2>维护，还是结束任务？</h2></div><button ref={close} onClick={onClose}>收起维护分析</button></header>
    <section className="avoidance-explanation"><span>P5 +{(l.elapsedS/60).toFixed(1)} 分钟 · {running?paused?'已暂停':'计算中':'检查点冻结'}</span><h3>{lifecycleStatus(s)}</h3><p>{s.message}</p></section>
    <div className="avoidance-actions"><button onClick={onSatellite}>看卫星与翼板</button><button onClick={onOverview}>看当前轨道</button></div>
    <dl className="avoidance-readings"><div><dt>电池 · 沿用 P4 储能</dt><dd>{(o.energyJ/3600).toFixed(1)} / {o.capacityJ/3600} Wh</dd></div><div><dt>太阳翼潜在功率 / 实际接入</dt><dd>{l.potentialW.toFixed(0)} / {o.generationW.toFixed(0)} W</dd></div><div><dt>总用电 / 其中泄放负载</dt><dd>{o.loadW.toFixed(0)} / {l.bleedW.toFixed(0)} W</dd></div><div><dt>有效指令接收 / 所需连续时间</dt><dd data-life-command>{l.commandProgressS.toFixed(1)} / 5 s</dd></div></dl>
    <Chart samples={l.samples} field="batteryWh" title="本段储能 · 不重置电池" unit="Wh" max={o.capacityJ/3600}/><Chart samples={l.samples} field="loadW" title="负载：维护、指令与电能收尾" unit="W"/>
    <p>曲线每 20 秒采样，账目逐步积分。隔离后，即使太阳翼受光，也不再给电池充电。负载消耗转为热量，但本段没有热平衡或电池化学模型。</p>
    <table><caption>退役条件核对 · 当前配置决定可做什么</caption><tbody><tr><th>任务数据</th><td>{o.deliveredMB.toFixed(0)} MB 已交付 / {o.bufferMB.toFixed(0)} MB 待传</td></tr><tr><th>推进器 / 推进剂</th><td>未配置 / 0 kg</td></tr><tr><th>可用主动速度增量</th><td>0 m/s · 主动离轨不可用</td></tr><tr><th>降低近地点到 80 km 的理想参考</th><td data-life-dv>{assessment.requiredMS===null?'当前轨道不适用':`${assessment.requiredMS.toFixed(1)} m/s`}</td></tr><tr><th>实际当前高度 / 近地点</th><td data-life-orbit>{(s.heightM/1000).toFixed(2)} / {(s.deployment!.satellite.elements.periapsisM/1000).toFixed(2)} km</td></tr><tr><th>相对进入 P5 时的近地点变化</th><td>{(s.deployment!.satellite.elements.periapsisM-l.initialPeriapsisM).toFixed(3)} m · 未执行变轨</td></tr><tr><th>主回路 / 充电回路</th><td>{l.mode==='retired'?'已关闭':l.isolated?'电能收尾中':'维持当前模式'} / {l.isolated?'已隔离':'连接'}</td></tr><tr><th>退役 / 空间处置</th><td>{l.mode==='retired'?'已退役，仍在轨':'尚未退役'} / 未完成处置</td></tr></tbody></table>
    <p>参考速度增量按远地点瞬时反向变轨估算，未执行点火；不含有限推力、姿态、燃料储备或落区控制。80 km 只是比较值，不是安全处置标准。当前配置没有推进预算，不能借用二级的发动机。</p>
    <Chart samples={l.samples} field="altitudeKm" title="同一卫星的当前高度" unit="km"/>
    <details><summary>能源账本、参数和模型边界</summary><p>本段初始 {(l.startEnergyJ/3600).toFixed(2)} Wh；接收发电 {(l.generatedJ/3600).toFixed(2)} Wh；负载 {(l.consumedJ/3600).toFixed(2)} Wh；转换损耗 {(l.lossJ/3600).toFixed(2)} Wh；满电未接收 {(l.shuntedJ/3600).toFixed(2)} Wh；未供电 {(l.unservedJ/3600).toFixed(2)} Wh。</p><p>500 kg 载荷：维护总负载 80 W，保留工作时 200 W；指令接收额外 50 W。电能收尾负载 600 W，期间主控 20 W；250 kg 版本均按一半。充放电效率沿用 P4。隔离和泄放电路是明确的教学设备假设，计入载荷总质量，不代表任何真实产品。</p><p>至少检查一圈且电量达到 85% 后暂停；接收结束指令需要 ≥10% 电量和仰角 ≥10° 的连续 5 秒窗口。电能收尾在 5% 残余处停止，这不是钝化认证阈值；电池化学能、风险、自然自放电和完整材料热响应未计算。</p><p>结束后冻结惯性姿态，不再主动对日/对地；没有求解翻滚、重力梯度或气动力矩。继续用原简化轨道模型观察 10 分钟，不能外推多年衰减；全段上限 6 小时，供电/轨迹不足就保留失败状态。</p></details>
    <details><summary>现实依据与下一种载具的前提</summary><p>安全模式常通过降低载荷用电和调整指向保护能源，但具体行为取决于设备。本演示只展示能源维护，不能宣称修好故障。</p><a href="https://www.esa.int/Enabling_Support/Operations/Safe_at_last" target="_blank" rel="noreferrer">ESA · 安全模式与指向的真实案例 ↗</a><p>退役、储能处理和离轨是不同工作。电池放电、断开充电并不能使卫星自动离开轨道；没有完成处置的退役物体仍会占用轨道环境。</p><a href="https://www.esa.int/Space_Safety/Space_Debris/Mitigating_space_debris_generation" target="_blank" rel="noreferrer">ESA · 处置与剩余能量管理 ↗</a><br/><a href="https://blogs.esa.int/cleanspace/2019/02/28/safer-batteries-for-cleaner-skies/" target="_blank" rel="noreferrer">ESA · 任务结束后的电池研究 ↗</a><p>带推进分支需要先在组装阶段明示发动机、推进剂、结构质量与能源，再重新验证从发射到维护的预算；随后才可接入有限推力变轨与相应卫星再入模型。当前分支不自动追加这些能力。</p></details>
    <p><a href={reportUrl} download="卫星维护与退役说明.md">下载本段操作、来源与验证说明 ↗</a></p><p>P1–P5 教学流程已串联；本段覆盖无推进 E01。主动离轨、材料解体与长期轨道寿命仍未实现，不把“课程结束”标成“所有物理能力完成”。</p>
  </section>;
}
