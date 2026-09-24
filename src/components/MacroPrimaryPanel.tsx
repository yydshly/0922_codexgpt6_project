import {useEffect,useRef} from 'react';
import {bodyById,PHYSICAL_SOURCE} from '../data/catalog';
import {PRIMARY_BODIES,primaryMetrics,type PrimaryId} from '../data/macroPrimary';
import {isMacroFamily,type MacroFamilyId} from '../data/macroFamilies';
import {publicAsset} from '../data/publicAsset';
import type {StateFrame} from '../types';
import type {MacroTimeControls} from './CometPanel';
export function MacroPrimaryPanel({autoReveal=true,active,frame,date,time,onFocus,onFamily,familiesEnabled}:{autoReveal?:boolean;active:PrimaryId|null;frame:StateFrame|null;date:string;time:MacroTimeControls;onFocus:(id:PrimaryId)=>void;onFamily:(id:MacroFamilyId)=>void;familiesEnabled:boolean}){
 const detail=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(active&&autoReveal)detail.current?.scrollIntoView({block:'nearest'});},[active,autoReveal]);
 const body=active?bodyById[active]:null,metrics=active?primaryMetrics(frame,active):null;
 return <section className="panorama-families panorama-primary" aria-label="太阳与八大行星观察">
  <h3>太阳与八大行星</h3><p>点击球体或名称定位；从同一全景查看参数，再进入已有卫星家族。</p>
  <div className="panorama-family-links">{PRIMARY_BODIES.map(b=><button key={b.id} disabled={!frame} aria-pressed={active===b.id} onClick={()=>onFocus(b.id as PrimaryId)}>定位{b.name}</button>)}</div>
  {!frame&&<p role="status">等待真实太阳系历表；物理推演中不显示观测参数。</p>}
  {body&&<div ref={detail} className="panorama-primary-detail panorama-family-detail">
   <h3>{body.name} · {body.englishName}</h3><p>{body.description}</p><p>{body.fact}</p>
   <p className="panorama-family-date">{date.replace('T',' ')} · 北京时间</p>
   <p role="status">{metrics?'镜头跟随日期；拖动可环绕，滚轮可调整距离。':'正在等待同一日期的真实历表。'}</p>
   <dl className="panorama-moon-parameters"><div><dt>参考半径</dt><dd>{body.radiusKm.toLocaleString('zh-CN')} km</dd></div><div><dt>质量</dt><dd>{body.massKg.toExponential(5)} kg</dd></div><div><dt>恒星自转周期</dt><dd>{Math.abs(body.rotationHours).toFixed(2)} 小时{body.rotationHours<0?'（逆行）':''}</dd></div><div><dt>绕太阳公转周期</dt><dd>{body.id==='sun'?'不适用':`${body.orbitalPeriodDays.toFixed(2)} 天`}</dd></div><div><dt>自转轴倾角</dt><dd>{body.obliquityDeg.toFixed(2)}°</dd></div><div><dt>距{body.id==='sun'?'太阳系质心':'太阳中心'}</dt><dd>{metrics?`${metrics.distanceAu.toFixed(5)} AU`:'等待历表'}</dd></div><div><dt>相对速度</dt><dd>{metrics?`${metrics.speedKmS.toFixed(3)} km/s`:'等待历表'}</dd></div><div><dt>黄道面高度</dt><dd>{metrics?`${metrics.heightAu.toFixed(5)} AU`:'等待历表'}</dd></div></dl>
   <p>动态参数参照：{metrics?.reference??(body.id==='sun'?'太阳系质心（SSB）':'太阳中心')}。太阳在本全景作为空间原点，质心运动由参数说明；高度数值未作视觉放大。</p>
   <div className="panorama-family-links"><button disabled={!frame||time.loading||frame.time<=time.start} onClick={()=>time.onSeek(Math.max(time.start,frame!.time-86400))}>前 1 天</button><button disabled={!frame||time.loading} onClick={time.onToggle}>{time.playing?'暂停日期':'继续日期'}</button><button disabled={!frame||time.loading||frame.time>=time.end} onClick={()=>time.onSeek(Math.min(time.end,frame!.time+86400))}>后 1 天</button></div>
   {isMacroFamily(active)&&<button disabled={!familiesEnabled||!frame} onClick={()=>onFamily(active)}>观察{body.name}的卫星与环系</button>}
   {isMacroFamily(active)&&!familiesEnabled&&<p>阶段 04 已隐藏，开启后可观察已接入家族。</p>}
   <p>本体近景暂时收起其他太阳与行星球体、参考平面及高度线，返回后恢复原图层选择。球体尺寸放大、间距压缩，不是统一比例；表面为静态贴图，不是实时影像。自转周期为参考值，太阳与巨行星不应理解为刚性表面统一转速。</p>
   <a href={body.sourceUrl} target="_blank" rel="noreferrer">天体介绍与参数来源 ↗</a><br/><a href={PHYSICAL_SOURCE} target="_blank" rel="noreferrer">JPL 物理参数 ↗</a><br/><a href={publicAsset('/data/manifest.json')} target="_blank" rel="noreferrer">保存的历表来源与时间范围 ↗</a>
  </div>}
 </section>;
}
