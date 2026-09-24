import {useState} from 'react';
import {motionComparison,MOTION_METRICS,type MotionMetric} from '../data/motionComparison';
import {PHYSICAL_SOURCE} from '../data/catalog';
import {publicAsset} from '../data/publicAsset';
import type {PrimaryId} from '../data/macroPrimary';
import type {StateFrame} from '../types';
import type {MacroTimeControls} from './CometPanel';

export function MacroMotionPanel({frame,date,time,onFocus}:{frame:StateFrame|null;date:string;time:MacroTimeControls;onFocus:(id:PrimaryId)=>void}){
 const [metric,setMetric]=useState<MotionMetric>('speed');
 const config=MOTION_METRICS[metric],rows=motionComparison(time.loading||time.error?null:frame,metric);
 return <section className="panorama-families panorama-motion" aria-label="行星运动比较">
  <h3>行星运动 · 谁转得快</h3><p>公转速度、自转周期和公转周期是三种不同的量。切换指标比较，再定位行星观察。</p>
  <div className="panorama-family-links" role="group" aria-label="比较运动指标">{(Object.keys(MOTION_METRICS) as MotionMetric[]).map(key=><button key={key} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{MOTION_METRICS[key].label}</button>)}</div>
  <p className="motion-metric-note">{config.note}</p>
  <p className="panorama-family-date">{metric==='speed'?`${date.replace('T',' ')} · 北京时间`:'资料参考值 · 不随观测日期改变'}</p>
  {metric==='speed'&&<p role="status">{time.error?`历表读取失败：${time.error}`:time.loading?'正在切换日期，暂不显示速度。':!frame?'当前没有真实历表，返回真实太阳系后可比较速度。':'当前历表 · 所有数值采用同一观测时刻'}</p>}
  <ul className="motion-comparison-rows" aria-label={`${config.label}，单位${config.unit}`}>{rows.map(row=><li key={row.id} data-body={row.id}>
   <button disabled={!frame||time.loading} onClick={()=>onFocus(row.id)} aria-label={`从运动比较定位${row.name}`}>{row.name}</button><span>{row.value===null?'等待历表':`${row.value.toLocaleString('zh-CN',{maximumFractionDigits:metric==='speed'?3:2})} ${config.unit}`}{row.retrograde&&<small>逆行自转</small>}</span>
   <div className="motion-value-track" aria-hidden="true">{row.fraction!==null&&<i style={{width:`${row.fraction*100}%`,background:row.color}}/>}</div>
  </li>)}</ul>
  <p>横条使用共同的线性比例，最长条是本项最大值。周期越长，转一周所需时间越久；横条不表示运动轨迹。点击行星名称会移动镜头。</p>
  {metric==='speed'&&<div className="panorama-family-links"><button disabled={!frame||time.loading||frame.time<=time.start} onClick={()=>time.onSeek(Math.max(time.start,frame!.time-30*86400))}>比较前 30 天</button><button disabled={!frame||time.loading} onClick={time.onToggle}>{time.playing?'暂停日期':'继续日期'}</button><button disabled={!frame||time.loading||frame.time>=time.end} onClick={()=>time.onSeek(Math.min(time.end,frame!.time+30*86400))}>比较后 30 天</button></div>}
  <details><summary>数值从哪里来，怎样理解</summary><p>速度由同一时刻的行星中心速度减去太阳中心速度，再取三维向量长度；它来自现有 JPL 几何历表，不从画面位移估算。原点速度已扣除，三个坐标方向都参与计算。</p><p>公转和自转周期沿用项目保存的 JPL 参数。巨行星没有刚性固体表面，这里的自转参考周期不能代表所有纬度的云层转速。逆行标记来自参考周期的符号，显示时长使用绝对值。</p><p>场景采用近似姿态与静态贴图，高时间倍率下画面自转可能采样不足；应以参数理解周期。切换比较指标不改变日期或图层；日期按钮使用同一条观测时间轴。</p><a href={PHYSICAL_SOURCE} target="_blank" rel="noreferrer">JPL 参考物理参数 ↗</a><br/><a href={publicAsset('/data/manifest.json')} target="_blank" rel="noreferrer">历表版本、单位与时间范围 ↗</a></details>
 </section>;
}
