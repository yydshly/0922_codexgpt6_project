import {publicAsset} from '../data/publicAsset';
import type {PlanetOrbitOptions} from '../data/macroPlanetOrbits';
export function MacroOrbitPanel({options,enabled,onChange,onOverview,onEdge}:{options:PlanetOrbitOptions;enabled:boolean;onChange:(key:keyof PlanetOrbitOptions)=>void;onOverview:()=>void;onEdge:()=>void}){
 return <section className="panorama-families panorama-orbits" aria-label="行星轨道与尺度圆环">
  <h3>行星如何绕太阳运行</h3><p>彩色曲线是当期状态推算的参考轨道；灰蓝圆环只帮助比较距离，两者可以分开看。</p>
  <div className="panorama-family-links"><button onClick={onOverview}>总览行星轨道</button><button onClick={onEdge}>侧看轨道倾角</button></div>
  <div className="panorama-family-toggles"><label><input type="checkbox" checked={options.orbits} onChange={()=>onChange('orbits')}/>显示行星参考轨道</label><label><input type="checkbox" checked={options.scales} onChange={()=>onChange('scales')}/>显示距离参照圆环</label><label><input type="checkbox" checked={options.direction} onChange={()=>onChange('direction')}/>显示运动方向箭头</label></div>
  {!enabled&&<p role="status">等待真实行星历表；不显示推算轨道与方向。</p>}
  <p>这里的开关只控制八大行星；彗星和其他成员的轨道在各自模块控制。定位某颗行星时，只突出它的轨道和箭头。浅绿箭头长度固定，表示当前运动方向，不表示速度大小；速度请看行星参数。</p>
  <details><summary>轨道、尺度环与实体环怎么区分</summary><p>参考轨道由当前相对太阳的位置、速度和引力参数计算，为瞬时二体椭圆，约每 6 小时观测时间刷新；它不是完整未来历表路径，真实位置仍持续读取历表。</p><p>圆环以各行星参考公转距离为标尺，统一位于黄道面，不是行星的真实运行路线。土星等行星周围的环则表示物质结构，与这些辅助线不同。</p><p>宏观距离经过压缩，画面曲线不再保持真实椭圆形状。侧视默认保留历表高度；“行星高度 ×10”会同时放大行星和轨道高度，属于教学示意。箭头按同一距离映射转换方向，不能用屏幕长度推算速度。</p><a href={publicAsset('/data/manifest.json')} target="_blank" rel="noreferrer">历表来源与时间范围 ↗</a></details>
 </section>;
}
