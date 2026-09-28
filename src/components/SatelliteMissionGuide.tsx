import { SatelliteNetworkGuide } from './SatelliteNetworkGuide';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { FlightState } from '../launch/liftoff';
import type { VehicleConfig } from '../launch/vehicle';
import { satellitePlan, satelliteWetKg } from '../launch/satellitePlan';
import { GROUND_STATIONS, OPS, OPS_LABELS, type OperationsPhase } from '../launch/satelliteOperations';
import { flightTime } from './LaunchControl';
import notesUrl from '../../docs/SATELLITE-MISSION-GUIDE.md?url';
import './SatelliteMissionGuide.css';

interface Props { state:FlightState; config:VehicleConfig; onClose:()=>void; onOverview:()=>void; onParameters:()=>void }
export function SatelliteMissionGuide({state:s,config,onClose,onOverview,onParameters}:Props) {
 const dialog=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 const closeAction=useRef(onClose);closeAction.current=onClose;
 const [tab,setTab]=useState<'mission'|'range'|'ability'|'network'>('mission');
 useEffect(()=>{
  const opener=document.activeElement as HTMLElement|null;close.current?.focus();
  return()=>{if(opener?.isConnected)opener.focus({preventScroll:true});};
 },[]);
 const key=(e:KeyboardEvent<HTMLElement>)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeAction.current();}else if(e.key==='Tab'){
   const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],summary')??[]).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'),first=items[0],last=items.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }};
 const powered=satellitePlan(config)==='powered',name=powered?'E02':'E01',o=s.operations,body=s.deployment?.released?s.deployment.satellite:null;
 const activeOperations=!!o&&s.phase.startsWith('ops-'),factor=config.payloadKg/500,area=OPS.arrayM2*(config.payloadKg===500?1:.64);
 const phase=OPS_LABELS[s.phase as OperationsPhase]??(s.satelliteDisposal?'任务结束与动力离轨':s.lifecycle?'维护与退役阶段':body?'已释放，尚未开始观测任务':'尚未释放卫星');
 const workflowStep=activeOperations&&!s.phase.endsWith('failed')?(s.phase==='ops-complete'?4:s.phase==='ops-downlink'?3:s.phase==='ops-data-ready'?2:s.phase==='ops-cycle'?1:0):null;
 const steps=[['定向与供电','主体朝向地球，太阳翼朝向太阳；日照发电，进入地影后靠电池。'],['采集观测数据',`日照且电量允许时，以 ${OPS.observeMBs} MB/s 累积数据；本次目标 ${OPS.targetMB} MB。`],['保存在机上','没有下传窗口时留在卫星里；采集完成不等于地面已经收到。'],['经过地面站并下传',`进入可见窗口后，以 ${OPS.downlinkMBs} MB/s 传送；离开窗口就停止，未传完的继续保留。`],['核对任务结果','检查已采集、机上待传、地面已收三项，再进入维护或任务末期处置。']];
 return <div className="satellite-guide-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section ref={dialog} className="satellite-mission-guide" role="dialog" aria-modal="true" aria-labelledby="satellite-guide-title" onKeyDown={key}>
   <header><div><small>本次 {name} · 对地观测教学任务</small><h2 id="satellite-guide-title">卫星入轨以后，做什么？</h2></div><button ref={close} onClick={onClose} aria-label="关闭卫星任务说明">关闭</button></header>
   <p className="satellite-guide-intro">沿轨道观测地球，把数据带回地面。这里展示一次“供电 → 采集 → 保存 → 下传”的完整工作过程。</p>
   <p className="satellite-guide-status" data-mission-guide-status>本次状态：{phase} · 主任务 {flightTime(s.time)}。阅读时任务暂停，关闭后可从原操作区继续。</p>
   <nav aria-label="卫星任务说明栏目">{([['mission','用途与流程'],['range','范围与通信'],['ability','能力与边界'],['network','星链与其他用途']] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
   {tab==='mission'&&<div data-guide-section="mission">
    <h3>这次任务交付什么？</h3><p>目标是把 {OPS.targetMB} MB 教学观测数据交付到地面。现实中对地观测可用于了解地表和环境；本项目用数据计数演示工作流程，还没有生成照片、地图或环境分析产品。</p>
    <ol className="satellite-workflow" aria-label="卫星从供电到交付的工作流程">{steps.map(([title,detail],i)=><li key={title} aria-current={workflowStep===i?'step':undefined}><span>{i+1}</span><div><strong>{title}{workflowStep===i?' · 本次所在步骤':''}</strong><p>{detail}</p></div></li>)}</ol>
    {o?<section className="satellite-guide-result"><h3>本次数据记录</h3><dl><div><dt>已采集</dt><dd>{o.collectedMB.toFixed(0)} MB</dd></div><div><dt>机上待传</dt><dd>{o.bufferMB.toFixed(0)} MB</dd></div><div><dt>地面已收</dt><dd>{o.deliveredMB.toFixed(0)} MB</dd></div></dl><p>已采集 = 机上待传 + 地面已收。{!activeOperations&&'当前已离开工作阶段，以上是本次任务保留的数据记录。'}</p></section>:<p className="satellite-guide-note">尚未进入卫星工作段；这里先介绍任务，未填入采集或交付结果。</p>}
    <h3>完成工作以后</h3><p>{powered?'E02 在发射前预装了离轨组件，可在完成工作后用自己的燃料降低轨道，继续再入参考下降。':'E01 没有推进器，后续维护与退役会结束业务并处理电能，卫星仍留在轨道上。'} 两种配置执行相同的观测教学任务；E02 增加的是任务末期离轨能力。</p>
   </div>}
   {tab==='range'&&<div data-guide-section="range">
    <h3>经过哪里，与拍到多大范围是两回事</h3>
    {body?<><dl className="satellite-orbit-facts"><div><dt>当前椭球参考高度</dt><dd>{(body.altitudeM/1000).toFixed(1)} km</dd></div><div><dt>轨道倾角</dt><dd>{body.elements.inclinationDeg.toFixed(2)}°</dd></div><div><dt>当前轨道周期估算</dt><dd>{body.elements.periodS===null?'当前无闭合轨道周期':`${(body.elements.periodS/60).toFixed(1)} 分钟`}</dd></div></dl><p>这些数值取自本次模拟的卫星状态。轨道倾角描述轨道面相对赤道的倾斜；卫星随轨道经过不同地区，地球也在自转，不能默认始终盯住同一地点或覆盖全球。</p></>:<p className="satellite-guide-note">卫星尚未独立释放，暂不提供“当前卫星轨道”。释放后这里显示本次实际高度、倾角与周期。</p>}
    <div className="satellite-scope-grid"><article><strong>橙线：观测朝向</strong><p>主画面实线表示正在采集，虚线仅标出星下点方向。没有相机视场和扫描幅宽，不能把线或地球可见部分当成拍摄覆盖区。</p></article><article><strong>绿线：正在下传</strong><p>实线表示正在下传，虚线表示当前几何可见但未下传；没有可见站时不画连线。几何可见不等于正在传送，也不等于观测到了地面站附近。</p></article></div>
    <p>主画面可分别开关三类辅助线：01 黄色对日箭头、02 橙色星下点方向、03 绿色地面通信关系。进入地影时对日方向仍存在，但不代表太阳能穿过地球供电；箭头长度不表示日地距离。</p>
    <h3>通信范围由地面站窗口决定</h3><p>采用 {GROUND_STATIONS.length} 个自定教学站，最低仰角 {OPS.minElevationDeg}°。卫星绕到地球背后或仰角不足时不能在本模型中下传；数据保留，等待后续窗口。未模拟真实射频覆盖、天气、地形或误码。</p>
    <div className="satellite-station-list" aria-label="教学地面站可见条件">{GROUND_STATIONS.map(st=>{const link=activeOperations?o?.links.find(l=>l.id===st.id):undefined;return <p key={st.id}><strong>{st.name}</strong><span>{link?`${link.elevationDeg.toFixed(1)}° · ${o?.transmitting&&o.activeStation===st.id?'正在下传':link.visible?'几何可见，未下传':'窗口外'}`:'教学站位置；当前不展示工作段实时窗口'}</span></p>;})}</div>
    <p className="satellite-guide-note">有效拍摄面积、空间分辨率、某地重访间隔和全球覆盖率：本版均未求解。补齐载荷视场、任务目标、轨迹和成像条件后才能给出这些指标。</p>
   </div>}
   {tab==='ability'&&<div data-guide-section="ability">
    <h3>这颗卫星具备哪些教学能力？</h3><table><caption>{name} 当前配置 · 自定教学参数</caption><tbody>
     <tr><th>发射时载荷总质量</th><td>{satelliteWetKg(config)} kg；基体 {config.payloadKg} kg{powered?'，另含 75 kg 离轨组件与推进剂':''}</td></tr>
     <tr><th>电源</th><td>{area.toFixed(2)} m² 太阳翼；{OPS.batteryWh*factor} Wh 电池。进入工作段时从 {OPS.initialCharge*100}% 教学初始电量开始计账。</td></tr>
     <tr><th>采集与交付</th><td>{OPS.observeMBs} MB/s 采集、{OPS.downlinkMBs} MB/s 下传；本次目标 {OPS.targetMB} MB。这是数据量，不对应既定照片张数或画质。</td></tr>
     <tr><th>用电需求</th><td>基础与定向 {(OPS.busW+OPS.pointingW)*factor} W；采集额外 {OPS.observeW*factor} W，下传额外 {OPS.transmitW*factor} W。</td></tr>
     <tr><th>低电量保护</th><td>电量 ≤{OPS.reserve*100}% 暂停采集和下传，≥{OPS.recover*100}% 才恢复；仍需维持基础用电。</td></tr>
     <tr><th>姿态与推进</th><td>理想辅助对地、对日和对站定向。{powered?'预装推进器用于既定末期离轨流程。':'没有推进器。'} 自由驾驶、姿态力矩与真实机构尚未实现。</td></tr>
    </tbody></table>
    <h3>能力到哪里为止？</h3><ul><li>本版已接入：轨道运动、日照与地影、能量收支、数据库存及几何通信窗口。</li><li>本版未接入：真实遥感图像、相机分辨率与幅宽、云遮与成像质量、指定城市的观测计划、射频链路预算。</li><li>导航定位、卫星互联网中继、气象反演等属于其他任务和设备配置，本卫星未实现。</li></ul>
    <p>一次交付完成后进入后续阶段；工作段最长 {OPS.maxS/3600} 小时是模拟时限，不是卫星真实寿命。没有有效窗口或越过模型边界时停止并保留结果，不强行算成功。</p>
   </div>}
   {tab==='network'&&<SatelliteNetworkGuide/>}
   <div className="satellite-guide-actions"><button disabled={!s.operations} onClick={onParameters}>{activeOperations?'查看工作参数与曲线':'查看当前任务参数'}</button><button disabled={!activeOperations} onClick={onOverview}>在主画面查看日夜与地面站</button></div>
   {s.operations&&!activeOperations&&<p>当前已进入维护或任务末期阶段，保留本次采集记录；工作段窗口不作为此刻的实时通信结果。</p>}
   {!s.operations&&<p>部署并完成分离检查后，从「卫星开始工作」进入演示；当前可以先阅读以上说明。</p>}
   <details><summary>来源、参数出处与完整说明</summary><p>原理参考 NASA；本次设备参数来自项目自身教学配置，不对应现实中的 E01/E02 卫星。来源核对：2026-09-28。</p><a href="https://science.nasa.gov/earth/earth-observatory/catalog-of-earth-satellite-orbits/" target="_blank" rel="noreferrer">NASA · 轨道与对地观察范围</a><a href="https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/" target="_blank" rel="noreferrer">NASA · 卫星电源系统</a><a href="https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/" target="_blank" rel="noreferrer">NASA · 地面系统与任务运行</a><a href={notesUrl}>项目能力与边界说明</a></details>
  </section>
 </div>;
}
