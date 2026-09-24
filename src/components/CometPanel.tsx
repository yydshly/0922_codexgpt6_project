import { COMETS } from '../ephemeris/comets';
import { heliocentricComets, cometMetrics } from '../ephemeris/cometState';
import type { StateBatch } from '../ephemeris/stateProvider';
import type { StateFrame } from '../types';

export interface MacroTimeControls {
  playing: boolean; speed: number; loading: boolean; error: string;
  start: number; end: number;
  onSeek: (time:number) => void;
  onToggle: () => void; onPlay: () => void; onNow: () => void;
}
export function CometPanel({frame,batch,loading,error,onRetry,time,showActivity,onActivity,trackError}: {
  frame:StateFrame|null; batch:StateBatch|null; loading:boolean; error:string; onRetry:()=>void;
  time:MacroTimeControls; showActivity:boolean; onActivity:()=>void; trackError:string;
}) {
  const states=heliocentricComets(frame,batch);
  const current=frame?.time ?? time.start;
  return <section className="comet-panel" aria-label="彗星日期与状态">
    <h3>让彗星随日期运行</h3>
    <p>两颗彗核采用 JPL 历表位置。亮线是 2026—2027 年逐日路径，淡线是当前状态对应的完整参考椭圆。</p>
    <div className="comet-time-actions">
      <button disabled={!frame || time.loading} onClick={time.onToggle}>{time.playing ? '暂停日期' : '继续日期'}</button>
      <button disabled={!frame || time.loading} onClick={time.onPlay}>观看运行 · 1 天/秒</button>
      <button disabled={time.loading} onClick={time.onNow}>返回现在</button>
    </div>
    <label className="comet-range">观测日期 · 与主页共用时间轴
      <input type="range" aria-label="彗星观测日期" min={time.start} max={time.end} step={86400} value={current} disabled={!frame || time.loading} onChange={e=>time.onSeek(Number(e.target.value))}/>
      <span>2026.01 — 2027.12 · 北京时间见画面顶部</span>
    </label>
    <div className="comet-time-actions">
      <button disabled={!frame || time.loading || current<=time.start} onClick={()=>time.onSeek(Math.max(time.start,current-30*86400))}>前 30 天</button>
      <button disabled={!frame || time.loading || current>=time.end} onClick={()=>time.onSeek(Math.min(time.end,current+30*86400))}>后 30 天</button>
    </div>
    <p role="status">{time.error || error || (time.loading || loading ? '正在同步观测历表…' : !frame ? '请返回真实太阳系模式读取历表。' : '当前参数 · 相对太阳')}{time.playing && frame && ` · ${time.speed===1 ? '实时 1×' : `${(time.speed/3600).toLocaleString('zh-CN',{maximumFractionDigits:2})} 小时/秒`}`}</p>
    {error && <button onClick={onRetry}>重试彗星历表</button>}
    <div className="comet-current-states">{COMETS.map(body=>{
      const state=states.find(s=>s.id===body.id), metrics=state ? cometMetrics(state) : null;
      return <article key={body.id}><strong style={{color:body.color}}>{body.name}</strong><span>{metrics ? `${metrics.distanceAu.toFixed(3)} AU · ${metrics.speedKmS.toFixed(3)} km/s` : '等待同一时刻的历表'}</span></article>;
    })}</div>
    {trackError && <p role="alert">{trackError}；彗核仍按历表定位。</p>}
    <button aria-pressed={showActivity} onClick={onActivity}>{showActivity ? '隐藏彗尾原理示意' : '显示彗尾原理示意'}</button>
    <p>彗尾示例固定在近太阳处，与两颗当前彗核分开；不代表当天亮度、活动强度或真实尾长。仅宏观页新增这两颗彗星，主观测页仍为 32 个动态天体。</p>
  </section>;
}
