import type {HistoricalView} from './macroHistoricalScene';
import {useEffect,useMemo,useRef,useState,type KeyboardEvent} from 'react';
import {borisovProvider,historicalHeliocentric} from '../ephemeris/borisov';
import type {MonthlyManifest} from '../ephemeris/stateProvider';
import {utcToTdb,tdbToUtc,AU_KM} from '../data/time';
import {publicAsset} from '../data/publicAsset';
import './HistoricalVisitor.css';
const INITIAL=utcToTdb(new Date('2019-12-08T00:00:00Z'));
export function HistoricalVisitor({onClose,onView,onViewport}:{onClose:()=>void;onView:(value:HistoricalView|null)=>void;onViewport:(rect:{left:number;top:number;width:number;height:number})=>void}){
 const [manifest,setManifest]=useState<MonthlyManifest|null>(null),[time,setTime]=useState(INITIAL),[error,setError]=useState(''),[retry,setRetry]=useState(0),[playing,setPlaying]=useState(false),[view,setView]=useState<'oblique'|'edge'|'top'>('oblique');const root=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 const viewport=useRef<HTMLElement>(null);
 useEffect(()=>{onView({manifest,time,view});},[manifest,time,view,onView]);
 useEffect(()=>()=>onView(null),[onView]);
 useEffect(()=>{const element=viewport.current!;const measure=()=>{const r=element.getBoundingClientRect();onViewport({left:r.left,top:r.top,width:r.width,height:r.height});};const observer=new ResizeObserver(measure);observer.observe(element);window.addEventListener('scroll',measure,true);window.addEventListener('resize',measure);measure();return()=>{observer.disconnect();window.removeEventListener('scroll',measure,true);window.removeEventListener('resize',measure);};},[onViewport]);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{requestAnimationFrame(()=>{if(previous?.isConnected)previous.focus();});};},[]);
 useEffect(()=>{let cancelled=false;setError('');void(async()=>{try{const m=await borisovProvider.loadManifest();await borisovProvider.get(INITIAL);if(!cancelled)setManifest(m);}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'历史历表加载失败');}})();return()=>{cancelled=true;};},[retry]);
 useEffect(()=>{if(!playing||!manifest)return;let raf=0,last=performance.now();const tick=(now:number)=>{const delta=Math.min((now-last)/1000,.25);last=now;setTime(t=>Math.min(manifest.endTdb,t+delta*5*86400));raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[playing,manifest]);
 useEffect(()=>{if(manifest&&time>=manifest.endTdb)setPlaying(false);},[time,manifest]);
 const state=useMemo(()=>manifest?historicalHeliocentric(borisovProvider.sample(time)!).find(s=>s.id==='borisov'):null,[time,manifest]);
 const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){const items=[...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')];if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}};
 const date=tdbToUtc(time).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
 return <section className="historical-visitor is-embedded" ref={root} role="dialog" aria-modal="true" aria-labelledby="history-title" onKeyDown={key}>
  <header><div><small>全景历史场景 · 2019.09 — 2020.06</small><h1 id="history-title">星际访客如何穿过太阳系？</h1></div><button ref={close} onClick={onClose}>返回原全景</button></header>
  <div className="history-layout"><main ref={viewport}>{!manifest&&<p className="history-load-status" role="status">{error||'正在读取 2I/Borisov 历史历表…'}{error&&<button onClick={()=>setRetry(n=>n+1)}>重试历史历表</button>}</p>}<div className="history-view-controls">{([['oblique','斜视'],['edge','侧视'],['top','俯视']] as const).map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div><p className="history-caption">拖动旋转 · 滚轮缩放 · 距离为线性比例，网格每格 1 AU；球体放大。黄道面只是参照，竖箭头指向黄道北。轨迹是窗口内的日心位置采样连线。</p></main>
  <aside><h2>2I/Borisov · 星际彗星</h2><p>2019 年被发现的星际彗星。它的开放双曲轨道支持太阳系外来源；不是围绕太阳反复运行的封闭椭圆，也不是奥尔特云成员。</p><p className="history-notice">这里播放历史位置。主页日期已暂停并保留，返回后可继续原来的观察；本案例不计入主页的当前天体数量。</p>
   <h3>从来访到离开</h3><p>拖动日期观察紫色彗星穿过黄道面附近，再离开。蓝线是同一历史窗口里的地球路径，不能与 2026—2027 年地球位置混用。</p>
   <dl>{state&&<><div><dt>距太阳中心</dt><dd>{(Math.hypot(...state.position)/AU_KM).toFixed(3)} AU</dd></div><div><dt>相对太阳速度</dt><dd>{Math.hypot(...state.velocity).toFixed(3)} km/s</dd></div><div><dt>日心黄道高度</dt><dd>{(state.position[2]/AU_KM).toFixed(3)} AU</dd></div></>}</dl>
   <p>这里只显示观测窗口内的轨迹段，不外推完整来路、出发恒星或遥远未来；没有模拟当日彗尾与活动强度。</p><a href="https://science.nasa.gov/solar-system/comets/2i-borisov/" target="_blank" rel="noreferrer">NASA：2I/Borisov 介绍 ↗</a><a href={publicAsset('/data/borisov/manifest.json')} target="_blank" rel="noreferrer">JPL：历史历表、坐标与误差检查 ↗</a>
  </aside></div>
  <footer><strong>{date} · 北京时间（UTC+8）</strong><input aria-label="历史访客日期" type="range" disabled={!manifest} min={manifest?.startTdb??INITIAL} max={manifest?.endTdb??INITIAL+1} step={86400} value={time} onChange={e=>{setPlaying(false);setTime(Number(e.target.value));}}/><div><button disabled={!manifest} onClick={()=>{if(manifest&&time>=manifest.endTdb)setTime(manifest.startTdb);setPlaying(v=>!v);}}>{playing?'暂停历史播放':'播放历史 · 5 天/秒'}</button><button disabled={!manifest} onClick={()=>{setPlaying(false);setTime(INITIAL);}}>2019-12-08 · 近日点日期</button></div></footer>
 </section>;
}
