import {motionSpeedLabel} from '../data/motionLessons';
import {useEffect,useState} from 'react';
import {utcToTdb} from '../data/time';
import type {MacroTimeControls} from './CometPanel';
export function HomeTimeControls({date,time,onSpeed,playDisabled=false}:{playDisabled?:boolean;date:string;time:MacroTimeControls;onSpeed:(speed:number)=>void}){
 const [draft,setDraft]=useState(date),[editing,setEditing]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!editing)setDraft(date);},[date,editing]);
 return <form className="home-time" aria-label="全景统一时间" onSubmit={event=>{event.preventDefault();const ms=Date.parse(`${draft}+08:00`);const t=Number.isFinite(ms)?utcToTdb(ms):NaN;if(!Number.isFinite(t)||t<time.start||t>time.end){setError('日期超出内置历表范围，请选择 2026—2027 年的有效北京时间。');return;}setError('');setEditing(false);time.onSeek(t);}}>
  <button type="button" disabled={!date||time.loading||playDisabled} onClick={time.onToggle}>{time.playing?'暂停时间':'播放时间'}</button>
  <label>北京时间 <input aria-label="全景北京时间" type="datetime-local" step="1" value={draft} onFocus={()=>setEditing(true)} onChange={e=>{setEditing(true);setDraft(e.target.value);}}/></label>
  <button disabled={!date||time.loading} type="submit">应用日期</button>
  <label>倍率 <select aria-label="全景时间倍率" value={time.speed} onChange={e=>onSpeed(Number(e.target.value))}>{![1,3600,21600,86400,8640000].includes(time.speed)&&<option value={time.speed}>课程 · {motionSpeedLabel(time.speed)}</option>}{[1,3600,21600,86400,8640000].map(value=><option key={value} value={value}>{value===1?'实时':`${value/86400>=1?value/86400+' 天':value/3600+' 小时'}/秒`}</option>)}</select></label>
  <button type="button" onClick={()=>{setError('');setEditing(false);time.onNow();}}>现在</button>
  <span>历表运动与现象示意分别控制</span>
  {(error||time.error)&&<p role="alert">{error||time.error}</p>}
 </form>;
}
