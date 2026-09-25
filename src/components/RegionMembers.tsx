import {OUTER_CLASSES} from '../data/r02Members';
import { R01MemberParameters } from './R01MemberParameters';
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

export function RegionMembers({autoReveal=true,date,includeNewMembers=true,zone,family,selectedId,onSelect,onReturn,onLocate,onRegion,onBinary,frame,batch,loading,error,onRetry,time}: {
 autoReveal?:boolean; date:string; includeNewMembers?:boolean; zone:MacroZoneId; family?:SolarFamilyId; selectedId:string|null; onSelect:(id:string)=>void;
 onBinary?:()=>void; onReturn:()=>void; onLocate:()=>void; onRegion:()=>void;
 frame:StateFrame|null; batch:StateBatch|null; loading:boolean; error:string; onRetry:()=>void; time:MacroTimeControls;
}){
 const [preview,setPreview]=useState(false);
 const [listExpanded,setListExpanded]=useState(false);
 const detail=useRef<HTMLElement>(null);
 useEffect(()=>{setPreview(false);if(selectedId&&autoReveal)detail.current?.scrollIntoView({block:'nearest'});},[selectedId,autoReveal]);
 const selected=regionMemberById(selectedId);
 const candidates=membersForRegion(zone,family).filter(b=>includeNewMembers||['ceres','pluto'].includes(b.id));
 const members=candidates.length||!selected?candidates:membersForRegion(selected.zone).filter(b=>includeNewMembers||['ceres','pluto'].includes(b.id));
 const added=members.filter(b=>['eros','achilles','aneas','chariklo'].includes(b.id));
 const states=heliocentricComets(frame,batch), state=states.find(s=>s.id===selectedId), metrics=state?cometMetrics(state):null;
 if(!members.length && !selected)return null;
 return <section className="region-members" aria-label="区域真实成员">
   <div className="region-members-title"><span>REAL MEMBERS</span><h3>从区域找到真实成员</h3></div>
   <p>带名称的标记是已接入的天体，可以点击；背景点云只说明分布，不是一点一颗实测天体。</p>
   {(zone==='all'||zone==='kuiper'||zone==='scattered')&&<details className="outer-orbit-guide"><summary>海王星外：四类轨道怎么区分？</summary><p>先看长期轨道关系，再看当前位置；这些类别不是四层互不重叠的壳。</p>{OUTER_CLASSES.map(group=><article key={group.id}><h4>{group.name}</h4><p>{group.description}</p>{group.member&&<button disabled={!includeNewMembers&&group.member!=='pluto'} onClick={()=>onSelect(group.member!)}>定位{group.label}</button>}<a href={group.source} target="_blank" rel="noreferrer">分类依据 ↗</a></article>)}<p>奥尔特云是依据彗星等证据推断的远方储库，场景中的点不是已观测成员。</p></details>}
   {!selected&&added.length>0&&<div className="region-member-actions" aria-label="R01 新增代表"><p>新增观察顺序：地球轨道附近 → 木星前后 → 巨行星之间。</p>{added.map(body=><button key={body.id} onClick={()=>onSelect(body.id)}>{body.name} · {body.id==='eros'?'近地':body.id==='achilles'?'L4':body.id==='aneas'?'L5':'半人马族'}</button>)}</div>}
   {(zone==='all'||selected) && <button className="region-member-list-toggle" aria-expanded={listExpanded} onClick={()=>setListExpanded(v=>!v)}>{listExpanded?'收起成员清单':`查看 ${members.length} 个区域成员`}</button>}
   <div hidden={(zone==='all'||!!selected)&&!listExpanded} className="region-member-list">{members.map(body=><button key={body.id} aria-pressed={selectedId===body.id} onClick={()=>{setPreview(false);setListExpanded(false);onSelect(body.id);}}><i style={{background:body.color}}/><span>{body.name}<small>{body.region} · {body.category==='dwarf'?'矮行星':'小行星'}</small></span><em>{states.some(s=>s.id===body.id)?'可定位':'待历表'}</em></button>)}</div>
   {(loading||error||!frame) && <p role="status">{!frame?'当前模式没有真实历表，请返回真实太阳系。':error||'部分成员历表加载中；已加载成员仍可观察。'}</p>}
   {error && <button onClick={onRetry}>重试成员历表</button>}
   {selected && <article ref={detail} className="region-member-detail" aria-label={`${selected.name}的区域与参数`}>
     <p className="panorama-family-date">{date.replace('T',' ')} · 北京时间</p><p role="status">{state?"镜头跟随当日位置；拖动和缩放仍可调整观察角度。":"正在等待同一日期的历表；不使用旧位置跟随。"}</p><h3>{selected.name}<small>{selected.englishName}</small></h3><p>{selected.relation}</p>
     <div className="region-member-actions"><button onClick={onRegion}>查看所属区域</button><button disabled={!state} onClick={onLocate}>定位此天体</button><button onClick={onReturn}>返回定位前视角</button></div>
     <dl><div><dt>当前距太阳</dt><dd>{metrics?`${metrics.distanceAu.toFixed(3)} AU`:'等待历表'}</dd></div><div><dt>相对太阳速度</dt><dd>{metrics?`${metrics.speedKmS.toFixed(3)} km/s`:'等待历表'}</dd></div><div><dt>黄道面高度（相对太阳）</dt><dd>{state?`${(state.position[2]/AU_KM).toFixed(3)} AU`:'等待历表'}</dd></div><div><dt>参考半径</dt><dd>{selected.radiusKm===null?'不使用单一半径，见下方说明':`${selected.radiusKm.toLocaleString('zh-CN')} km`}</dd></div></dl>
     <R01MemberParameters id={selected.id} state={state} frame={frame}/>
     {selected.id==='pluto'&&onBinary&&<button disabled={!state} onClick={onBinary}>在全景观察冥王星—卡戎</button>}
     <p>{selected.radiusNote}</p><p>{selected.description}</p>
     <div className="region-member-actions"><button disabled={!state||time.loading||!frame||frame.time<=time.start} onClick={()=>time.onSeek(Math.max(time.start,frame!.time-30*86400))}>前 30 天</button><button disabled={!state||time.loading} onClick={time.onToggle}>{time.playing?'暂停日期':'继续日期'}</button><button disabled={!state||time.loading||!frame||frame.time>=time.end} onClick={()=>time.onSeek(Math.min(time.end,frame!.time+30*86400))}>后 30 天</button>{selected.id!=='eros'&&<button aria-expanded={preview} onClick={()=>setPreview(v=>!v)}>{preview?'收起外观近景':'展开外观近景'}</button>}</div>
     {selected.id==='eros'&&<p>主画布已接入 PDS 不规则形状；在下方“爱神星并不是圆球”切换资料形状、同体积球与网格。</p>}
     {preview && <div className="region-member-preview"><AtlasPreview key={selected.id} body={selected}/><p>独立取景的外观示意；拖动旋转，不代表实时影像、精确地形或真实自转。宏观定位仍使用历表。</p></div>}
     <p>细线是当期状态估算的二体参考轨道，不是未来历表路径。球体标记已放大；高度的正负表示黄道面两侧。</p>
     <a href={selected.sourceUrl} target="_blank" rel="noreferrer">天体介绍与参数来源 ↗</a>
     <a href={publicAsset(`/data/${selected.id==='patroclus'?'patroclus-system':selected.id==='eris'?'eris-system':['ceres','pluto'].includes(selected.id)?'dwarfs':'small-bodies'}/manifest.json`)} target="_blank" rel="noreferrer">JPL：保存的历表来源与验证 ↗</a>
   </article>}
 </section>;
}
