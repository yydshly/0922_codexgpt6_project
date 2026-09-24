import {AU_KM} from '../data/catalog';
import {publicAsset} from '../data/publicAsset';
import type {CometDisplay} from '../data/macroComets';
import { COMETS,type CometId } from '../ephemeris/comets';
import { heliocentricComets, cometMetrics } from '../ephemeris/cometState';
import type { StateBatch } from '../ephemeris/stateProvider';
import type { StateFrame } from '../types';

export interface MacroTimeControls {
  playing: boolean; speed: number; loading: boolean; error: string;
  start: number; end: number;
  onSeek: (time:number) => void;
  onToggle: () => void; onPlay: () => void; onNow: () => void;
}
export function CometPanel({frame,batch,loading,error,onRetry,time,showActivity,onActivity,trackError,scene}: {
  scene?:CometDisplay&{enabled:boolean;date:string;onFocus:(id:CometId)=>void;onDemo:()=>void;onPaths:()=>void;onOrbits:()=>void;onDirection:()=>void};
  frame:StateFrame|null; batch:StateBatch|null; loading:boolean; error:string; onRetry:()=>void;
  time:MacroTimeControls; showActivity:boolean; onActivity:()=>void; trackError:string;
}) {
  const states=heliocentricComets(frame,batch);
  const current=frame?.time ?? time.start;
  const available=!!frame&&(!scene||scene.enabled);
  return <section className="comet-panel" aria-label="彗星日期与状态">
    <h3>让彗星随日期运行</h3>
    <p>两颗彗核采用 JPL 历表位置。亮线是 2026—2027 年逐日路径，淡线是当前状态对应的完整参考椭圆。</p>
    {scene&&<><div className="panorama-family-links">{COMETS.map(body=><button key={body.id} disabled={!scene.enabled||!states.some(s=>s.id===body.id)} aria-pressed={scene.selected===body.id} onClick={()=>scene.onFocus(body.id)}>定位{body.name}</button>)}</div>
    {!scene.enabled&&<p>阶段 02 已隐藏，请在阶段导览中开启。</p>}
    <div className="panorama-family-toggles"><label><input type="checkbox" checked={scene.paths} disabled={!scene.enabled} onChange={scene.onPaths}/>显示两年历表路径（亮线）</label><label><input type="checkbox" checked={scene.orbits} disabled={!scene.enabled} onChange={scene.onOrbits}/>显示瞬时参考椭圆（淡线）</label><label><input type="checkbox" checked={scene.direction} disabled={!scene.enabled} onChange={scene.onDirection}/>显示背日方向箭头</label></div>
    {scene.selected&&states.filter(s=>s.id===scene.selected).map(s=><div key={s.id} className="panorama-family-detail"><strong>当前定位：{COMETS.find(c=>c.id===s.id)?.name}</strong><dl className="panorama-moon-parameters"><div><dt>距太阳中心</dt><dd>{cometMetrics(s).distanceAu.toFixed(3)} AU</dd></div><div><dt>相对太阳速度</dt><dd>{cometMetrics(s).speedKmS.toFixed(3)} km/s</dd></div><div><dt>日心黄道高度</dt><dd>{(s.position[2]/AU_KM).toFixed(3)} AU</dd></div></dl><p className="panorama-family-date">{scene.date.replace('T',' ')} · 北京时间（UTC+8）</p></div>)}
    <p>点击彗核或名称可原位定位，镜头随日期跟随。球体是放大的位置标记，不是精确彗核形状。金色箭头长度固定，只表示背离太阳的方向，不代表彗尾长度或当天活动。</p></>}
    <div className="comet-time-actions">
      <button disabled={!available || time.loading} onClick={time.onToggle}>{time.playing ? '暂停日期' : '继续日期'}</button>
      <button disabled={!available || time.loading} onClick={time.onPlay}>观看运行 · 1 天/秒</button>
      <button disabled={!available||time.loading} onClick={time.onNow}>返回现在</button>
    </div>
    <label className="comet-range">观测日期 · 与主页共用时间轴
      <input type="range" aria-label="彗星观测日期" min={time.start} max={time.end} step={86400} value={current} disabled={!available || time.loading} onChange={e=>time.onSeek(Number(e.target.value))}/>
      <span>2026.01 — 2027.12 · 北京时间见画面顶部</span>
    </label>
    <div className="comet-time-actions">
      <button disabled={!available || time.loading || current<=time.start} onClick={()=>time.onSeek(Math.max(time.start,current-30*86400))}>前 30 天</button>
      <button disabled={!available || time.loading || current>=time.end} onClick={()=>time.onSeek(Math.min(time.end,current+30*86400))}>后 30 天</button>
    </div>
    <p role="status">{time.error || error || (time.loading || loading ? '正在同步观测历表…' : !frame ? '请返回真实太阳系模式读取历表。' : '当前参数 · 相对太阳')}{time.playing && frame && ` · ${time.speed===1 ? '实时 1×' : `${(time.speed/3600).toLocaleString('zh-CN',{maximumFractionDigits:2})} 小时/秒`}`}</p>
    {error && <button onClick={onRetry}>重试彗星历表</button>}
    <div className="comet-current-states">{COMETS.map(body=>{
      const state=states.find(s=>s.id===body.id), metrics=state ? cometMetrics(state) : null;
      return <article key={body.id}><strong style={{color:body.color}}>{body.name}</strong><span>{metrics ? `${metrics.distanceAu.toFixed(3)} AU · ${metrics.speedKmS.toFixed(3)} km/s` : '等待同一时刻的历表'}</span></article>;
    })}</div>
    <a href={publicAsset('/data/comets/manifest.json')} target="_blank" rel="noreferrer">JPL 历表来源、版本与单位 ↗</a>
    {trackError && <p role="alert">{trackError}；彗核仍按历表定位。</p>}
    <button disabled={!available} aria-pressed={showActivity} onClick={onActivity}>{showActivity ? '隐藏彗尾原理示意' : '显示彗尾原理示意'}</button>
    {scene&&<button disabled={!scene.enabled} onClick={scene.onDemo}>定位彗尾原理示例</button>}
    <p>彗尾示例固定在近太阳处，与两颗当前彗核分开；不代表当天亮度、活动强度或真实尾长。仅宏观页新增这两颗彗星，主观测页仍为 32 个动态天体。</p>
  </section>;
}
