import { useEffect, useRef, useState } from 'react';
import { AtlasPreview } from './AtlasPreview';
import { membersForRegion, regionMemberById } from '../data/regionMembers';
import { heliocentricComets, cometMetrics } from '../ephemeris/cometState';
import { AU_KM } from '../data/catalog';
import { publicAsset } from '../data/publicAsset';
import type { MacroZoneId } from '../data/macroStructure';
import type { SolarFamilyId } from '../data/cosmicContext';
import type { StateFrame } from '../types';
import type { StateBatch } from '../ephemeris/stateProvider';
import type { MacroTimeControls } from './CometPanel';

export function RegionMembers({includeNewMembers=true,zone,family,selectedId,onSelect,onReturn,onLocate,onRegion,onBinary,frame,batch,loading,error,onRetry,time}: {
 includeNewMembers?:boolean; zone:MacroZoneId; family?:SolarFamilyId; selectedId:string|null; onSelect:(id:string)=>void;
 onBinary?:()=>void; onReturn:()=>void; onLocate:()=>void; onRegion:()=>void;
 frame:StateFrame|null; batch:StateBatch|null; loading:boolean; error:string; onRetry:()=>void; time:MacroTimeControls;
}){
 const [preview,setPreview]=useState(false);
 const [listExpanded,setListExpanded]=useState(false);
 const detail=useRef<HTMLElement>(null);
 useEffect(()=>{setPreview(false);if(selectedId)detail.current?.scrollIntoView({block:'nearest'});},[selectedId]);
 const selected=regionMemberById(selectedId);
 const candidates=membersForRegion(zone,family).filter(b=>includeNewMembers||['ceres','pluto'].includes(b.id));
 const members=candidates.length||!selected?candidates:membersForRegion(selected.zone).filter(b=>includeNewMembers||['ceres','pluto'].includes(b.id));
 const states=heliocentricComets(frame,batch), state=states.find(s=>s.id===selectedId), metrics=state?cometMetrics(state):null;
 if(!members.length && !selected)return null;
 return <section className="region-members" aria-label="区域真实成员">
   <div className="region-members-title"><span>REAL MEMBERS</span><h3>从区域找到真实成员</h3></div>
   <p>带名称的标记是已接入的天体，可以点击；背景点云只说明分布，不是一点一颗实测天体。</p>
   {(zone==='all'||selected) && <button className="region-member-list-toggle" aria-expanded={listExpanded} onClick={()=>setListExpanded(v=>!v)}>{listExpanded?'收起成员清单':`查看 ${members.length} 个区域成员`}</button>}
   <div hidden={(zone==='all'||!!selected)&&!listExpanded} className="region-member-list">{members.map(body=><button key={body.id} aria-pressed={selectedId===body.id} onClick={()=>{setPreview(false);setListExpanded(false);onSelect(body.id);}}><i style={{background:body.color}}/><span>{body.name}<small>{body.region} · {body.category==='dwarf'?'矮行星':'小行星'}</small></span><em>{states.some(s=>s.id===body.id)?'可定位':'待历表'}</em></button>)}</div>
   {(loading||error||!frame) && <p role="status">{!frame?'当前模式没有真实历表，请返回真实太阳系。':error||'部分成员历表加载中；已加载成员仍可观察。'}</p>}
   {error && <button onClick={onRetry}>重试成员历表</button>}
   {selected && <article ref={detail} className="region-member-detail" aria-label={`${selected.name}的区域与参数`}>
     <h3>{selected.name}<small>{selected.englishName}</small></h3><p>{selected.relation}</p>
     <div className="region-member-actions"><button onClick={onRegion}>查看所属区域</button><button disabled={!state} onClick={onLocate}>定位此天体</button><button onClick={onReturn}>返回区域全景</button></div>
     <dl><div><dt>当前距太阳</dt><dd>{metrics?`${metrics.distanceAu.toFixed(3)} AU`:'等待历表'}</dd></div><div><dt>相对太阳速度</dt><dd>{metrics?`${metrics.speedKmS.toFixed(3)} km/s`:'等待历表'}</dd></div><div><dt>黄道面高度（相对太阳）</dt><dd>{state?`${(state.position[2]/AU_KM).toFixed(3)} AU`:'等待历表'}</dd></div><div><dt>参考半径</dt><dd>{selected.radiusKm===null?'长椭球形，不使用单一半径':`${selected.radiusKm.toLocaleString('zh-CN')} km`}</dd></div></dl>
     {selected.id==='pluto'&&onBinary&&<button disabled={!state} onClick={onBinary}>在全景观察冥王星—卡戎</button>}
     <p>{selected.radiusNote}</p><p>{selected.description}</p>
     <div className="region-member-actions"><button disabled={!state||time.loading} onClick={time.onToggle}>{time.playing?'暂停日期':'继续日期'}</button><button disabled={!state||time.loading||!frame||frame.time>=time.end} onClick={()=>time.onSeek(Math.min(time.end,frame!.time+30*86400))}>后 30 天</button><button aria-expanded={preview} onClick={()=>setPreview(v=>!v)}>{preview?'收起外观近景':'展开外观近景'}</button></div>
     {preview && <div className="region-member-preview"><AtlasPreview key={selected.id} body={selected}/><p>独立取景的外观示意；拖动旋转，不代表实时影像、精确地形或真实自转。宏观定位仍使用历表。</p></div>}
     <p>细线是当期状态估算的二体参考轨道，不是未来历表路径。球体标记已放大；高度的正负表示黄道面两侧。</p>
     <a href={selected.sourceUrl} target="_blank" rel="noreferrer">NASA：天体介绍与物理资料 ↗</a>
     <a href={publicAsset(`/data/${['ceres','pluto'].includes(selected.id)?'dwarfs':'small-bodies'}/manifest.json`)} target="_blank" rel="noreferrer">JPL：保存的历表来源与验证 ↗</a>
   </article>}
 </section>;
}
