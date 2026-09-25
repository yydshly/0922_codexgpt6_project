import {bodyById} from '../data/catalog';
import {publicAsset} from '../data/publicAsset';
import { RING_PROFILES,ringProfile,ringDisplayBounds,ringWidthNote,type RingPlanetId } from '../data/rings';
import { SATELLITES } from '../data/satellites';
import type { BodyId } from '../types';
export function RingFamilies({onOpen}:{onOpen:(id:RingPlanetId)=>void}){
 return <section className="ring-learning" aria-label="四大巨行星的卫星与环系"><h3>04 · 从母星看环与卫星</h3><p>四颗巨行星都有环；环是物质，轨道线只是运动路径的参考标记。先看家族，再点卫星近景，最后开关行星环比较。</p><div className="ring-family-buttons">{RING_PROFILES.map(profile=><button key={profile.id} onClick={()=>onOpen(profile.id)}>{profile.name}家族<small>{SATELLITES.filter(s=>s.parentId===profile.id).length} 颗已接入卫星 · 查看环系</small></button>)}</div><p>卫星位置沿用真实历表，本轮补充入口、环系与讲解，没有新增卫星数量。环的亮度、窄环宽度及海王星环弧为增强示意。</p></section>;
}
export function RingLearning({parentId,visible,enhanced,onToggle,onEnhance,appearance='texture'}:{parentId:BodyId;visible:boolean;enhanced:boolean;onToggle:()=>void;onEnhance:()=>void;appearance?:'reference'|'texture'}){
 const profile=ringProfile(parentId);if(!profile)return null;
 const radius=bodyById[parentId].radiusKm;
 const fmt=(n:number)=>n.toLocaleString('zh-CN',{maximumFractionDigits:2});
 return <section className="ring-learning" data-ring-profile={parentId} aria-label="行星环解释与控制">
  <h3>{profile.name}的环，和卫星有什么不同？</h3>
  <p>{profile.summary}</p><p>{profile.lesson}</p>
  <button aria-pressed={visible} onClick={onToggle}>{visible?'隐藏行星环':'显示行星环'}</button>
  {parentId!=='saturn'&&<button aria-pressed={enhanced} onClick={onEnhance}>{enhanced?'细环宽度增强 · 开':'细环宽度增强 · 关'}</button>}
  <p>{parentId==='saturn'?(appearance==='reference'?'当前主全景以 C、B、A 三段参考几何显示，颜色和亮度为示意。':'当前使用 C、B、A 参考边界和外观纹理，细纹理不对应逐条实测环缝。'):enhanced?'细环绘制宽度至少为本体参考半径的 1.6%；环的中心半径不变，可能掩盖细小间隔。':'环面径向宽度按下表参考值绘制；亮度仍为示意，细环可能难以看见。'} 环不是实体圆盘，也不随母星表面同步自转；未模拟环粒子动力学或完整散射。</p>
  <details><summary>环段尺度与资料来源</summary>
   <p>本体采用平均半径 {fmt(radius)} km 的球形参考。环与本体共用局部比例；源表的赤道半径比值未直接套用。全景中的卫星间距另有压缩，不能把环和卫星的画面间隔当作同一距离尺。</p>
   <div className="ring-scale-table"><table><thead><tr><th>参考环段</th><th>距中心与宽度（km）</th></tr></thead><tbody>{profile.bands.map(band=>{
    const bounds=ringDisplayBounds(band,radius,parentId!=='saturn'&&enhanced);
    return <tr key={band.name}><th scope="row">{band.name}</th><td><span>半径 {fmt(band.innerKm)}–{fmt(band.outerKm)}</span><span>参考宽 {fmt(band.outerKm-band.innerKm)}</span><span>绘制宽 {fmt((bounds[1]-bounds[0])*radius)}</span></td></tr>;
   })}</tbody></table></div>
   <ul>{profile.bands.map(band=><li key={band.name}>{band.name}：{ringWidthNote(profile.id,band)}。</li>)}</ul>
   <p>“绘制宽度”是将局部画面比例换算为 km 后的示意值，不是新增测量。圆环省略偏心率；海王星亮弧方位和长度不是当日观测。厚度和稀薄外延尚未完整复原。</p>
   <a href={profile.sourceUrl} target="_blank" rel="noreferrer">{profile.sourceVersion} ↗</a>
   <a href={publicAsset('/data/rings/giant-planets.json')} target="_blank" rel="noreferrer">本地环段参考记录与来源</a>
  </details>
 </section>;
}
