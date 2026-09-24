import {useEffect,useRef,useState} from 'react';
import {BODIES,PHYSICAL_SOURCE} from '../data/catalog';
import {publicAsset} from '../data/publicAsset';
import {tdbToUtc} from '../data/time';
import {distancePair,solarDistanceRows} from '../data/distanceComparison';
import type {BodyId,StateFrame} from '../types';
import './SizeComparison.css';
import './DistanceComparison.css';

const number=(n:number)=>n.toLocaleString('zh-CN',{maximumFractionDigits:3});
const presets:[BodyId,BodyId,string][]=[['earth','moon','地球—月球'],['sun','earth','太阳—地球'],['sun','neptune','太阳—海王星'],['earth','mars','地球—火星']];
export function DistanceComparison({frame,onClose}:{frame:StateFrame|null;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),returnFocus=useRef(document.activeElement);
 // Freeze an owned snapshot so comparisons stay readable while the main clock runs.
 const [snapshot]=useState(()=>frame?{time:frame.time,positions:frame.positions.slice(),velocities:frame.velocities.slice()}:null);
 const [left,setLeft]=useState<BodyId>('earth'),[right,setRight]=useState<BodyId>('moon');
 useEffect(()=>{const d=dialog.current!;d.showModal();return()=>{d.close();const previous=returnFocus.current;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};},[]);
 const pair=distancePair(snapshot,left,right),solar=solarDistanceRows(snapshot);
 const date=snapshot&&Number.isFinite(snapshot.time)?tdbToUtc(snapshot.time).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):null;
 return <dialog ref={dialog} className="size-comparison distance-comparison" aria-labelledby="distance-title" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}
   if(e.key==='Tab'){
    const items=Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),summary,a[href]')).filter(el=>el.getClientRects().length>0&&(!el.closest('details:not([open])')||el.matches('summary')));
    if(items.length){e.preventDefault();const index=items.indexOf(document.activeElement as HTMLElement);items[(index+(e.shiftKey?-1:1)+items.length)%items.length].focus();}
   }
  }}>
  <header><div><span>从球体大小，走向真实空间</span><h2 id="distance-title">尺度与距离比较</h2></div><button autoFocus onClick={onClose} aria-label="关闭距离比较">关闭</button></header>
  <div className="size-comparison-content">
   <p className="distance-snapshot">{date?`历表快照 · ${date} 北京时间（UTC+8）`:'暂无可用历表快照'}</p>
   <p>保留打开时刻的数据，方便慢慢比较。主场景按原播放状态运行；关闭后重新打开可读取新的观测时刻。</p>
   <h3>① 两颗天体之间，究竟有多空？</h3>
   <div className="size-pair-presets">{presets.map(([a,b,name])=><button key={name} aria-pressed={left===a&&right===b} onClick={()=>{setLeft(a);setRight(b);}}>{name}</button>)}</div>
   <div className="size-pair-selectors"><label>起点天体<select value={left} onChange={e=>setLeft(e.target.value as BodyId)}>{BODIES.map(b=><option key={b.id} value={b.id} disabled={b.id===right}>{b.name}</option>)}</select></label><button onClick={()=>{setLeft(right);setRight(left);}}>交换起终点</button><label>终点天体<select value={right} onChange={e=>setRight(e.target.value as BodyId)}>{BODIES.map(b=><option key={b.id} value={b.id} disabled={b.id===left}>{b.name}</option>)}</select></label></div>
   {pair?<>
    <div className="distance-reading" aria-live="polite"><strong>{pair.bodies[0].name} → {pair.bodies[1].name}</strong><span>中心距约 <b>{number(pair.km)} km</b>（{pair.au.toLocaleString('zh-CN',{maximumSignificantDigits:6})} AU）</span><span>相当于约 <b>{number(pair.diameters)}</b> 个{pair.bodies[0].name}参考直径</span></div>
    <svg className="distance-ruler" viewBox="0 0 800 155" role="img" aria-label={`${pair.bodies[0].name}与${pair.bodies[1].name}按同一线性比例绘制直径与中心距；小于一个像素的球体可能看不见，虚线仅标记中心`}>
     <text x="20" y="20" fill={pair.bodies[0].color}>{pair.bodies[0].name}</text><text x="780" y="20" textAnchor="end" fill={pair.bodies[1].color}>{pair.bodies[1].name}</text>
     {pair.bodies.map((body,i)=><g key={body.id}><circle cx={pair.x[i]} cy="67" r={pair.radii[i]} fill={body.color}/><line x1={pair.x[i]} y1={67+pair.radii[i]+5} x2={pair.x[i]} y2="120" stroke="#9bbabd" strokeDasharray="3 4"/></g>)}
     <line x1={pair.x[0]} y1="120" x2={pair.x[1]} y2="120" stroke="#779b99"/>
     {[0,.25,.5,.75,1].map(f=><line key={f} x1={pair.x[0]+(pair.x[1]-pair.x[0])*f} y1="115" x2={pair.x[0]+(pair.x[1]-pair.x[0])*f} y2="125" stroke="#bcd6ce"/>)}
     <text x={pair.x[0]} y="145" textAnchor="middle">0</text><text x="400" y="145" textAnchor="middle">中心距 · {number(pair.km)} km</text>
    </svg>
    <p>圆形表示球体截面；直径和距离使用同一线性比例，未给小球设置最小尺寸。虚线只是中心定位标记。两球被转到同一条横线上便于量距，这不是它们在天空中的方位，也不是轨道图。</p>
    <p className="distance-note">从“地球—月球”切到“太阳—海王星”，小球逐渐难以辨认是尺度差距的结果。可回到“天体大小比较”单独看球体；那个窗口的间距仅用于排版。</p>
   </>:<p role="status">该组合缺少有效历表位置，无法计算距离。关闭窗口，待真实历表加载完成后重试；这里不会用零或平均轨道距离代替。</p>}
   <h3>② 为什么全景看起来更紧凑？</h3>
   <p>以下比较同一快照中八大行星到太阳中心的距离。两列都从太阳出发，并把最远行星放在右端；只比较径向距离，不把行星排成真实的一条线。</p>
   {solar?<div className="distance-chart" role="table" aria-label="当前日心距离：真实线性与全景压缩对照">
    <div className="distance-chart-head" role="row"><span role="columnheader">天体 / 实际 AU</span><span role="columnheader">真实线性距离</span><span role="columnheader">全景压缩距离</span></div>
    {solar.rows.map(row=><div className="distance-chart-row" role="row" key={row.body.id}><span role="rowheader">{row.body.name}<small>{number(row.au)} AU</small></span><span role="cell" aria-label={`线性比例 ${number(row.linear*100)}%`}><i style={{width:`${row.linear*100}%`,background:row.body.color}}/></span><span role="cell" aria-label={`压缩比例 ${number(row.compressed*100)}%`}><i style={{width:`${row.compressed*100}%`,background:row.body.color}}/></span></div>)}
    <div className="distance-chart-head distance-chart-foot" role="row"><span role="cell">共同端点</span><span role="cell">0 → {number(solar.maxAu)} AU</span><span role="cell">0 → 同一最远行星</span></div>
   </div>:<p role="status">缺少完整行星历表，暂不能生成距离对照。</p>}
   <p className="distance-note">全景把越远的区域压得越紧，同时单独放大球体，才可在一屏辨认。恢复真实距离会使空间更空旷，却不会把行星轨道变成球状分布；轨道的倾角和三维方向，与采用哪种距离比例是两件事。</p>
   <h3>③ 不同视图，分别可以看什么？</h3>
   <ul className="distance-guide"><li><strong>综合全景：</strong>认识各区域的相互关系。距离对数压缩，球体与局部家族另作展示缩放，不能拿屏幕像素量真实距离。</li><li><strong>天体大小比较：</strong>用同一比例比较参考直径；两球间的空隙不代表真实间距。</li><li><strong>本窗口的双体尺：</strong>直径与中心距共用同一尺度；只画本体，不含环、大气和日冕。</li><li><strong>近景与家族观察：</strong>看表面、卫星与环系；以各模块显示的比例说明和参数为准。切换镜头不代表真实飞行。</li></ul>
   <details><summary>数据来源、换算与画面边界</summary><p>位置取本项目已校验的 JPL 几何历表插值快照，采用天体中心、相同 TDB 时刻与 ECLIPJ2000 坐标轴。两点中心距 = 三维位置差的长度；不是沿轨道走过的路程、表面间距或光行时修正后的视位置。1 AU = 149,597,870.7 km。</p><p>全景径向映射为 R = 22 × log₁₀(1 + d) / log₁₀(100001)，d 以 AU 计。右列复用该函数，再除以最远行星的映射半径以便对照；条长是相对比例，不是场景像素或 km。该列不模拟高度增强、透视和各卫星家族的局部缩放。</p><p>球体半径沿用本地 JPL 参数目录；太阳的参考半径为 695,700 km，与 IAU 名义值一致。数字显示经过取舍，不代表新的精度保证。此处覆盖太阳、八大行星与月球；远缘区域含不确定的结构范围，不冒充精确天体距离。</p><a href={publicAsset('/data/manifest.json')} target="_blank" rel="noreferrer">本地历表版本、时间与单位</a><a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">JPL Horizons · 几何状态</a><a href={PHYSICAL_SOURCE} target="_blank" rel="noreferrer">JPL 行星参数</a><a href="https://ssd.jpl.nasa.gov/sats/phys_par/" target="_blank" rel="noreferrer">JPL 卫星参数</a><a href="https://www.iau.org/static/resolutions/IAU2015_English.pdf" target="_blank" rel="noreferrer">IAU 名义太阳半径</a></details>
  </div>
 </dialog>;
}
