import {bodyById} from '../data/catalog';
import {MACRO_FAMILIES,type MacroFamilyId,type MacroMoon} from '../data/macroFamilies';
import {ringProfile} from '../data/rings';
import type {StateFrame} from '../types';
import type {MacroTimeControls} from './CometPanel';

interface Props {
 enabled:boolean;frame:StateFrame|null;date:string;states:MacroMoon[];active:MacroFamilyId|null;selected:MacroMoon|undefined;
 loading:boolean;error:string;onRetry:()=>void;onFocus:(id:MacroFamilyId)=>void;onSelect:(id:string)=>void;
 moons:boolean;rings:boolean;enhanced:boolean;orbits:boolean;
 onMoons:()=>void;onRings:()=>void;onEnhanced:()=>void;onOrbits:()=>void;time:MacroTimeControls;
}
export function MacroFamilyPanel(p:Props){
 const profile=p.active?ringProfile(p.active):undefined;
 const moons=p.states.filter(m=>m.parentId===p.active),ready=p.enabled&&!!p.frame;
 return <section className="panorama-families" aria-label="全景卫星与环系">
  <h3>卫星与环系 · 同场景</h3>
  <p>沿着母星找到它的卫星。系统近景暂时收起其他太阳与行星球体、参考平面及高度线，返回后恢复。位置随观测日期变化；球体大小和局部距离已放大、压缩，不能据画面测量真实比例。</p>
  <div className="panorama-family-links">{MACRO_FAMILIES.map(id=><button key={id} disabled={!ready} aria-pressed={p.active===id} onClick={()=>p.onFocus(id)}>定位{id==='earth'?'地月':bodyById[id].name}系统</button>)}</div>
  <p role="status">{!p.enabled?'阶段 04 已隐藏，请从阶段导览开启。':!p.frame?'等待真实太阳系历表。':p.error?'部分卫星历表未加载；已加载成员仍可查看。':p.loading?'正在同步卫星历表…':`已同步 ${p.states.length} 颗已收录卫星（含月球），不是全部已知卫星。`}</p>
  {p.error&&<><p role="alert">{p.error}</p><button onClick={p.onRetry}>重试卫星历表</button></>}
  <div className="panorama-family-toggles">
   <label><input type="checkbox" checked={p.moons} disabled={!p.enabled} onChange={p.onMoons}/>显示已收录卫星</label>
   <label><input type="checkbox" checked={p.rings} disabled={!p.enabled} onChange={p.onRings}/>显示行星环</label>
   <label><input type="checkbox" checked={p.enhanced} disabled={!p.enabled||!p.rings} onChange={p.onEnhanced}/>增强暗淡细环</label>
   <label><input type="checkbox" checked={p.orbits} disabled={!p.enabled||!p.moons} onChange={p.onOrbits}/>显示卫星参考轨道</label>
  </div>
  {p.active&&ready&&<div className="panorama-family-detail">
   <strong>{bodyById[p.active].name}系统 · {moons.length} 颗已加载卫星</strong>
   <p>点击名称或场景球体查看参数。镜头随母星移动，所有成员共用主页时间。</p>
   <div className="panorama-moon-list">{moons.map(m=><button key={m.id} aria-pressed={p.selected?.id===m.id} onClick={()=>p.onSelect(m.id)}>{m.name}</button>)}</div>
   {p.selected&&p.selected.parentId===p.active&&<dl className="panorama-moon-parameters" aria-label="卫星当前参数">
    <div><dt>当前卫星</dt><dd>{p.selected.name}</dd></div>
    <div><dt>距{bodyById[p.active].name}中心</dt><dd>{Math.hypot(...p.selected.position).toLocaleString('zh-CN',{maximumFractionDigits:0})} km</dd></div>
    <div><dt>相对母星速度</dt><dd>{Math.hypot(...p.selected.velocity).toFixed(3)} km/s</dd></div>
    <div><dt>平均 / 等效半径</dt><dd>{p.selected.radiusKm.toLocaleString('zh-CN')} km</dd></div>
    <div><dt>公转周期（资料值）</dt><dd>{p.selected.orbitalPeriodDays.toLocaleString('zh-CN',{maximumFractionDigits:4})} 天</dd></div>
   </dl>}
   <p className="panorama-family-date">{p.date.replace('T',' ')} · 北京时间（UTC+8）</p>
   <div className="panorama-family-links">
    <button disabled={p.time.loading||p.frame!.time<=p.time.start} onClick={()=>p.time.onSeek(Math.max(p.time.start,p.frame!.time-86400))}>前 1 天</button>
    <button disabled={p.time.loading||p.frame!.time>=p.time.end} onClick={()=>p.time.onSeek(Math.min(p.time.end,p.frame!.time+86400))}>后 1 天</button>
    <button disabled={p.time.loading} onClick={p.time.onToggle}>{p.time.playing?'暂停日期':'继续日期'}</button>
    <button disabled={p.time.loading||p.frame!.time>=p.time.end} onClick={p.time.onPlay}>观看公转 · 1 天/秒</button>
   </div>
   {p.time.error&&<p role="alert">{p.time.error}</p>}
   <p>当前时间倍率：{p.time.speed.toLocaleString('zh-CN')}×{p.time.playing?'（运行中）':'（已暂停）'}。日期控制改变真实位置，与下方现象示意进度分开。</p>
   {profile&&<div className="panorama-ring-note"><strong>{profile.name}环系</strong><p>{profile.summary}{p.active==='saturn'?'本全景绘制 C、B、A 主环分段与间隙；颜色和亮度为示意，暗淡外延未全部绘制。':profile.lesson}</p><a href={profile.sourceUrl} target="_blank" rel="noreferrer">NASA 环段尺度与来源 ↗</a></div>}
   {p.selected&&<a href={p.selected.sourceUrl} target="_blank" rel="noreferrer">{p.selected.name}物理资料 ↗</a>}
  </div>}
  <details><summary>位置、轨道线与环分别代表什么？</summary><p>卫星位置和速度读取已有 NASA/JPL NAIF SPK 内核生成的月度数据包，以母星为参照；月球取主历表中的月球减去地球。每次日期变化重新插值，缺少该月数据时隐藏对应卫星。</p><p>细线是当前位置、速度构成的瞬时二体参考椭圆，约每 30 分钟观测时间刷新；不是实测完整路径，也不是实体环。环由绕母星公转的颗粒组成，本图用有来源的环段尺度和说明性亮度绘制；没有逐粒子模拟。</p><p>行星表面使用静态贴图，卫星使用示意颜色；局部球体尺寸与距离分别缩放。冥王星—卡戎可在下方双体模块继续原位观察；此处不代表完整卫星名录。</p><a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">主历表 Horizons 数据说明 ↗</a><br/><a href="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/" target="_blank" rel="noreferrer">扩展卫星 NAIF SPK 来源 ↗</a></details>
 </section>;
}
