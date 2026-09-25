import {bodyById} from '../data/catalog';
import {MACRO_FAMILIES,type MacroFamilyId,type MacroMoon} from '../data/macroFamilies';
import {RingLearning} from './RingLearning';
import type {StateFrame} from '../types';
import type {MacroTimeControls} from './CometPanel';

interface Props {
 enabled:boolean;frame:StateFrame|null;date:string;states:MacroMoon[];active:MacroFamilyId|null;selected:MacroMoon|undefined;
 loading:boolean;error:string;onRetry:()=>void;onFocus:(id:MacroFamilyId)=>void;onSelect:(id:string)=>void;
 moons:boolean;rings:boolean;enhanced:boolean;orbits:boolean;
 onMoons:()=>void;onRings:()=>void;onEnhanced:()=>void;onOrbits:()=>void;time:MacroTimeControls;
}
export function MacroFamilyPanel(p:Props){
 const moons=p.states.filter(m=>m.parentId===p.active),ready=p.enabled&&!!p.frame;
 return <section className="panorama-families" aria-label="全景卫星与环系">
  <h3>卫星与环系 · 同场景</h3>
  <p>沿着母星找到它的卫星。系统近景仍在同一个主全景中，默认暂隐其他成员，避免混淆不同距离尺度；可用画面开关重新显示，返回全景恢复。各家族内母星与卫星本体大小同比例，小卫星可通过名称寻找。母星中心 3.25 倍半径以内保持线性距离，外侧逐渐压缩；不能据此比较不同家族。</p>
  <div className="panorama-family-links">{MACRO_FAMILIES.map(id=><button key={id} disabled={!ready} aria-pressed={p.active===id} onClick={()=>p.onFocus(id)}>定位{id==='earth'?'地月':bodyById[id].name}系统</button>)}</div>
  <p role="status">{!p.enabled?'阶段 04 已隐藏，请从阶段导览开启。':!p.frame?'等待真实太阳系历表。':p.error?'部分卫星历表未加载；已加载成员仍可查看。':p.loading?'正在同步卫星历表…':`已同步 ${p.states.length} 颗已收录卫星（含月球），不是全部已知卫星。`}</p>
  {p.error&&<><p role="alert">{p.error}</p><button onClick={p.onRetry}>重试卫星历表</button></>}
  <div className="panorama-family-toggles">
   <label><input type="checkbox" checked={p.moons} disabled={!p.enabled} onChange={p.onMoons}/>显示已收录卫星</label>
   <label><input type="checkbox" checked={p.rings} disabled={!p.enabled} onChange={p.onRings}/>显示行星环</label>
   <label><input type="checkbox" checked={p.enhanced} disabled={!p.enabled||!p.rings} onChange={p.onEnhanced}/>细环宽度增强（不改中心半径）</label>
   <label><input type="checkbox" checked={p.orbits} disabled={!p.enabled||!p.moons} onChange={p.onOrbits}/>显示卫星参考轨道</label>
  </div>
  {p.active&&ready&&<div className="panorama-family-detail">
   {p.active==='earth'&&<p className="earth-moon-scale-note">月球直径约为地球的 {(bodyById.moon.radiusKm/bodyById.earth.radiusKm*100).toFixed(1)}%。当前地月中心距约 {moons[0]?Math.hypot(...moons[0].position).toLocaleString('zh-CN',{maximumFractionDigits:0}):'—'} km；画面中的轨道线属于月球，金星绕太阳运行，不是地球的卫星。默认镜头让两球处于相同景深便于比较；自行旋转镜头后，近大远小仍会改变屏幕上的比例。距离仍为压缩展示，不是地月真实间距比例。</p>}
   <strong>{bodyById[p.active].name}系统 · {moons.length} 颗已加载卫星</strong>
   <p>点击名称或场景球体查看参数。镜头随母星移动，所有成员共用主页时间。</p>
   <div className="panorama-moon-list">{moons.map(m=><button key={m.id} aria-pressed={p.selected?.id===m.id} onClick={()=>p.onSelect(m.id)}>{m.name}</button>)}</div>
   {p.selected&&p.selected.parentId===p.active&&<dl className="panorama-moon-parameters" aria-label="卫星当前参数">
    <div><dt>当前卫星</dt><dd>{p.selected.name}</dd></div>
    <div><dt>距{bodyById[p.active].name}中心</dt><dd>{Math.hypot(...p.selected.position).toLocaleString('zh-CN',{maximumFractionDigits:0})} km</dd></div>
    <div><dt>相对母星速度</dt><dd>{Math.hypot(...p.selected.velocity).toFixed(3)} km/s</dd></div>
    <div><dt>直径 / 母星直径</dt><dd>{(p.selected.radiusKm/bodyById[p.active].radiusKm*100).toLocaleString('zh-CN',{maximumFractionDigits:3})}%</dd></div>
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
   <RingLearning parentId={p.active} visible={p.rings} enhanced={p.enhanced} onToggle={p.onRings} onEnhance={p.onEnhanced} appearance="reference"/>
   {p.selected&&<a href={p.selected.sourceUrl} target="_blank" rel="noreferrer">{p.selected.name}物理资料 ↗</a>}
  </div>}
  <details><summary>位置、轨道线与环分别代表什么？</summary><p>卫星位置和速度读取已有 NASA/JPL NAIF SPK 内核生成的月度数据包，以母星为参照；月球取主历表中的月球减去地球。每次日期变化重新插值，缺少该月数据时隐藏对应卫星。</p><p>细线是当前位置、速度构成的瞬时二体参考椭圆，约每 30 分钟观测时间刷新；不是实测完整路径，也不是实体环。环由绕母星公转的颗粒组成，本图用有来源的环段尺度和说明性亮度绘制；没有逐粒子模拟。</p><p>行星和月球使用静态可视化贴图；月球跟随日期使用参考姿态，未精确还原天平动和贴图经度。其余卫星使用示意颜色球，不展示实测表面或自转姿态；局部球体共用母星的半径比例，远处间距另行压缩；屏幕上还存在近大远小。冥王星—卡戎可在下方双体模块继续原位观察；此处不代表完整卫星名录。</p><a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">主历表 Horizons 数据说明 ↗</a><br/><a href="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/" target="_blank" rel="noreferrer">扩展卫星 NAIF SPK 来源 ↗</a></details>
 </section>;
}
