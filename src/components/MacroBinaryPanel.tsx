import {PLUTO_MOONS} from '../data/plutoMoons';
import type {BinaryOptions} from './macroBinaryScene';
import type {MacroTimeControls} from './CometPanel';
import {dynamicDwarfById} from '../data/dwarfs';
import {publicAsset} from '../data/publicAsset';
export function MacroBinaryPanel({options,active,date,time,loading,error,onRetry,onCenter,onOrbits,onSmallMoons,onEnhanced}:{options:BinaryOptions;active:boolean;date:string;time:MacroTimeControls;loading:boolean;error:string;onRetry:()=>void;onCenter:()=>void;onOrbits:()=>void;onSmallMoons:()=>void;onEnhanced:()=>void}){
 const s=options.state,body=options.selected==='pluto'||options.selected==='charon'?dynamicDwarfById[options.selected]:null,moon=options.moonStates.find(m=>m.id===options.selected);
 return <section className="panorama-families panorama-binary" aria-label="全景冥王星卫星家族">
  <h3>冥王星 · 五颗卫星家族</h3><p>卡戎与冥王星形成中央双体，另外四颗小卫星位于外围。位置均取同一时刻历表；绿色十字是按冥王星与卡戎 GM 计算的近似质心，不是另一颗星。</p>
  <button disabled={!options.enabled||!s} aria-pressed={active} onClick={options.onFocus}>{options.smallMoons?'定位冥王星全家族':'定位冥王星—卡戎'}</button>
  <p role="status">{!options.enabled?'请开启阶段 04 和已收录卫星图层。':error?'家族历表部分读取失败；已就绪的双体仍可观察。':loading?'正在同步冥王星家族历表…':!s?'等待同一时刻的冥王星与卡戎历表。':`冥王星五颗卫星中，当前已就绪 ${1+options.moonStates.length} 颗；全产品收录 27 颗卫星`}</p>
  {error&&<><p role="alert">{error}</p><button onClick={onRetry}>重试家族历表</button></>}
  <div className="panorama-family-toggles"><label><input type="checkbox" checked={options.center} onChange={onCenter} disabled={!options.enabled}/>标记双体质心</label><label><input type="checkbox" checked={options.orbits} onChange={onOrbits} disabled={!options.enabled}/>显示参考轨道</label><label><input type="checkbox" checked={options.smallMoons} onChange={onSmallMoons} disabled={!options.enabled}/>展开四颗小卫星（家族全貌）</label><label><input type="checkbox" checked={options.enhanced} onChange={onEnhanced} disabled={!options.enabled||!options.smallMoons}/>放大小卫星标记</label></div>
  {active&&s&&<div className="panorama-family-detail">
   <p>{options.enhanced&&options.smallMoons?'四颗小卫星标记放大便于选择；位置与相对距离未单独拉开。关闭放大可看共同尺寸比例，小卫星会非常小。':'局部球体参照半径与间距采用同一比例。'} 到太阳与其他区域的距离仍压缩；拖动可侧视，滚轮可靠近。</p>
   <div className="panorama-moon-list">{(['pluto','charon'] as const).map(id=><button key={id} aria-pressed={options.selected===id} onClick={()=>options.onSelect(id)}>{dynamicDwarfById[id].name}</button>)}{options.smallMoons&&PLUTO_MOONS.map(m=><button key={m.id} disabled={!options.moonStates.some(s=>s.id===m.id)} aria-pressed={options.selected===m.id} onClick={()=>options.onSelect(m.id as 'styx'|'nix'|'kerberos'|'hydra')}>{m.name} · {m.englishName}</button>)}</div>
   <dl className="panorama-moon-parameters">
    <div><dt>两者中心间距</dt><dd>{s.separation.toLocaleString('zh-CN',{maximumFractionDigits:0})} km</dd></div>
    <div><dt>卡戎相对冥王星速度</dt><dd>{s.speed.toFixed(3)} km/s</dd></div>
    <div><dt>质心距冥王星中心</dt><dd>{s.centerFromPluto.toLocaleString('zh-CN',{maximumFractionDigits:0})} km</dd></div>
    <div><dt>卡戎相对黄道高度</dt><dd>{s.relative[2].toLocaleString('zh-CN',{maximumFractionDigits:0})} km</dd></div>
    <div><dt>冥王星平均半径</dt><dd>{dynamicDwarfById.pluto.radiusKm} km</dd></div>
    {body&&<><div><dt>选中天体</dt><dd>{body.name}</dd></div><div><dt>平均半径</dt><dd>{body.radiusKm} km</dd></div></>}
    {moon&&<><div><dt>选中小卫星</dt><dd>{moon.name} · {moon.englishName}</dd></div><div><dt>距冥王星中心</dt><dd>{moon.distanceKm.toLocaleString('zh-CN',{maximumFractionDigits:0})} km</dd></div><div><dt>相对冥王星速度</dt><dd>{moon.speedKmS.toFixed(4)} km/s</dd></div><div><dt>等体积半径</dt><dd>{moon.radiusKm} ± {moon.radiusSigmaKm} km</dd></div><div><dt>参考公转周期</dt><dd>{moon.periodDays} 天</dd></div></>}
   </dl>
   <p>相对高度以冥王星为原点，沿 J2000 黄道面的法线方向测量，可为正或负。近圆轨道下间距变化很小，公转主要表现为方向变化。</p>
   <p>{s.centerFromPluto>dynamicDwarfById.pluto.radiusKm?'当前双体质心位于冥王星球体外。':'当前双体质心位于冥王星球体内。'}这里仅按两者 GM 加权，不包含另外四颗小卫星。</p>
   <p className="panorama-family-date">{date.replace('T',' ')} · 北京时间（UTC+8）</p>
   <div className="panorama-family-links"><button disabled={time.loading||s.time<=time.start} onClick={()=>time.onSeek(Math.max(time.start,s.time-86400))}>前 1 天</button><button disabled={time.loading||s.time>=time.end} onClick={()=>time.onSeek(Math.min(time.end,s.time+86400))}>后 1 天</button><button disabled={time.loading} onClick={time.onToggle}>{time.playing?'暂停日期':'继续日期'}</button><button disabled={time.loading||s.time>=time.end} onClick={time.onPlay}>观看双体运动 · 1 天/秒</button></div>
   <p>与主页日期共用时间轴 · {time.speed.toLocaleString('zh-CN')}× · {time.playing?'运行中':'已暂停'}。卡戎公转周期资料值约 6.3872 天；实际位置由历表插值驱动。</p>{time.error&&<p role="alert">{time.error}</p>}
  </div>}
  <details><summary>数据与画面如何对应？</summary><p>冥王星与五颗卫星取同一日期的 JPL Horizons 几何位置，按原有 PLU060 GM 求近似双体质心。细线是瞬时二体参考椭圆，约每 30 分钟观测时间刷新，不是未来轨迹预报。</p><p>球体颜色为外观示意，未重建精确地形、自转经度或同步锁定姿态。四颗小卫星使用新增分月数据包，位置并非按参考周期匀速转圈。参考轨道是相对近似双体质心的瞬时二体椭圆，不等于未来实际路径。四颗小卫星形状不规则，本版仅使用等体积球形标记，不据此模拟真实自转。</p><a href={publicAsset('/data/dwarfs/manifest.json')} target="_blank" rel="noreferrer">已保存的 JPL 来源、版本与单位 ↗</a><br/><a href={publicAsset('/data/pluto-moons/manifest.json')} target="_blank" rel="noreferrer">四颗小卫星：历表版本与独立检查误差 ↗</a><br/><a href={publicAsset('/data/pluto-moons/physical.json')} target="_blank" rel="noreferrer">小卫星参数快照及 JPL 原始来源 ↗</a><br/><a href="https://science.nasa.gov/dwarf-planets/pluto/facts/" target="_blank" rel="noreferrer">NASA 冥王星与五颗卫星说明 ↗</a></details>
 </section>;
}
