import { useEffect, useMemo, useState } from 'react';
import type { FlightState } from '../launch/liftoff';
import { operationsGuideReading, type OperationsGuides } from '../launch/operationsGuides';
import './OperationsSceneGuide.css';
import { FOOTPRINT_ANGLES, observationFootprint, type FootprintOptions } from '../launch/observationFootprint';
import { dot, rotateEarth, surfaceAt } from '../launch/ascent';

export function OperationsSceneGuide({ state, options, onChange, onGuide, onOverview, overview, footprint, onFootprintChange, onFootprintFocus, onPower }: {
  state: FlightState; options: OperationsGuides; onChange: (value: OperationsGuides) => void;
  onPower: () => void; onGuide: () => void; onOverview: () => void; overview: boolean;
  footprint:FootprintOptions;onFootprintChange:(value:FootprintOptions)=>void;onFootprintFocus:()=>void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [footprintOpen,setFootprintOpen]=useState(footprint.enabled);
  useEffect(()=>{if(footprint.enabled){setFootprintOpen(true);setExpanded(true);}},[footprint.enabled]);
  const reading = operationsGuideReading(state);
  const preview=useMemo(()=>state.deployment?.released&&footprint.enabled?observationFootprint(state.deployment.satellite.fixedPosition,footprint.angle):null,[state,footprint]);
  const centerSunlit=preview?.valid&&state.operations?dot(surfaceAt(preview.center).up,rotateEarth(state.operations.sunDirection,-state.time))>0:null;
  if (!reading) return null;
  return <aside className="operations-scene-guide" aria-label="卫星工作辅助线">
    <button className="operations-guide-heading" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>卫星工作辅助线 <span>{expanded ? '收起 −' : '展开 +'}</span></button>
    {expanded && <div>
      {([['power', '01 对日与供电'], ['observation', '02 对地与采集'], ['contact', '03 地面站与下传']] as const).map(([id, title]) => <label key={id} data-line-kind={id}>
        <input type="checkbox" checked={options[id]} onChange={e => onChange({ ...options, [id]: e.target.checked })}/>
        <div><strong>{title}</strong><p>{reading[id]}</p></div>
      </label>)}
      <button onClick={onPower}>近看太阳翼对准</button>
      <p className="operations-guide-key">黄箭头：指向太阳；近景蓝箭头：板面朝向，不是飞行方向。橙/绿实线：正在采集/下传，虚线：方向或可见关系。均为标注，不是可见光束或覆盖边界。</p>
      {!overview && reading.shadow && <p className="operations-guide-key">地影中的教学补光仅用于看清模型，不参与发电。{reading.supply}</p>}
      <details className="operations-footprint-controls" open={footprintOpen} onToggle={e=>setFootprintOpen(e.currentTarget.open)}>
        <summary>04 观测范围 · 假设视场</summary>
        <label><input type="checkbox" checked={footprint.enabled} onChange={e=>{onFootprintChange({...footprint,enabled:e.target.checked});if(e.target.checked)onFootprintFocus();}}/><strong>显示地表轮廓与边界线</strong></label>
        <div className="footprint-angle-options" aria-label="假设相机全视场角">{FOOTPRINT_ANGLES.map((angle,i)=><button key={angle} disabled={!footprint.enabled} aria-pressed={angle===footprint.angle} onClick={()=>onFootprintChange({...footprint,angle})}>{['窄','中','宽'][i]} {angle}°</button>)}</div>
        {preview?.valid?<p data-footprint-size>当前高度 {(preview.heightM/1000).toFixed(1)} km<br/><strong>地表跨度约 {(preview.maxChordM/1000).toFixed(1)} km</strong><br/>轮廓两端直线距离；不是像素分辨率。<br/>范围中心：{centerSunlit?'几何日照面':'几何夜面'}</p>:preview?<p role="status">{preview.reason}</p>:null}
        <p>假设一台圆形视场、始终对准星下点的相机。橙色轮廓是此刻几何范围，随卫星移动；画在地表上不代表已拍摄或已交付。</p>
        <p>{reading.shadow?'当前卫星在地影中，教学任务暂停采集；轮廓仅作几何参考。':'卫星有日照，不等于地表也有日照。教学采集按卫星日照计数，尚未判定地面影像是否可用。'} 未计算图像清晰度、云遮、重访和累计覆盖。</p>
        <button disabled={!preview?.valid} onClick={onFootprintFocus}>看清地表范围</button>
      </details>
      <button onClick={onOverview}>{overview?'定位当前辅助线':'拉远查看地球与连线'}</button>
      <button onClick={onGuide}>看图理解 · 观测卫星与星链 →</button>
    </div>}
  </aside>;
}
