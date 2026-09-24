import { RING_PROFILES,ringProfile,type RingPlanetId } from '../data/rings';
import { SATELLITES } from '../data/satellites';
import type { BodyId } from '../types';
export function RingFamilies({onOpen}:{onOpen:(id:RingPlanetId)=>void}){
 return <section className="ring-learning" aria-label="四大巨行星的卫星与环系"><h3>04 · 从母星看环与卫星</h3><p>四颗巨行星都有环；环是物质，轨道线只是运动路径的参考标记。先看家族，再点卫星近景，最后开关行星环比较。</p><div className="ring-family-buttons">{RING_PROFILES.map(profile=><button key={profile.id} onClick={()=>onOpen(profile.id)}>{profile.name}家族<small>{SATELLITES.filter(s=>s.parentId===profile.id).length} 颗已接入卫星 · 查看环系</small></button>)}</div><p>卫星位置沿用真实历表，本轮补充入口、环系与讲解，没有新增卫星数量。环的亮度、窄环宽度及海王星环弧为增强示意。</p></section>;
}
export function RingLearning({parentId,visible,enhanced,onToggle,onEnhance}:{parentId:BodyId;visible:boolean;enhanced:boolean;onToggle:()=>void;onEnhance:()=>void}){
 const profile=ringProfile(parentId);if(!profile)return null;
 return <section className="ring-learning" aria-label="行星环解释与控制"><h3>{profile.name}的环，和卫星有什么不同？</h3><p>{profile.summary}</p><p>{profile.lesson}</p><button aria-pressed={visible} onClick={onToggle}>{visible?'隐藏行星环':'显示行星环'}</button>{parentId!=='saturn'&&<button aria-pressed={enhanced} onClick={onEnhance}>{enhanced?'细环宽度增强 · 开':'细环宽度增强 · 关'}</button>}<p>{parentId==='saturn'?'主环外观与间隙为纹理示意；下表列出参考尺度。':enhanced?'细环已加粗；亮度经过增强，便于观察。':'环面宽度按参考尺度绘制；亮度仍为示意，细环可能难以看见。'} 环与卫星都围绕母星，粒子并非随母星表面同步自转。未模拟环粒子动力学或完整散射。</p><details><summary>环段尺度与资料来源</summary><table><thead><tr><th>本版参考环段</th><th>距行星中心（km）</th></tr></thead><tbody>{profile.bands.map(band=><tr key={band.name}><td>{band.name}</td><td>{Math.round(band.innerKm).toLocaleString()}–{Math.round(band.outerKm).toLocaleString()}</td></tr>)}</tbody></table><p>参考资料的近似尺度；部分窄环取平均宽度或范围内代表值，圆环模型省略偏心率。环纹理不对应每条实测细环。</p><a href={profile.sourceUrl} target="_blank" rel="noreferrer">{profile.sourceVersion} ↗</a></details></section>;
}
