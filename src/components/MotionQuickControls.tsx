import type {MotionLesson} from '../data/motionLessons';
import {motionPlaybackBlock} from '../data/motionPlayback';
import type {MacroTimeControls} from './CometPanel';
export function MotionQuickControls({current,time,now,enabled,onRead,onExit}:{current:MotionLesson;time:MacroTimeControls;now:number|null;enabled:boolean;onRead:()=>void;onExit:()=>void}){
 const reason=motionPlaybackBlock({...time,now,enabled});
 return <div className="motion-quick-controls" data-motion-quick role="group" aria-label="当前运动课快捷操作">
  {current.id!=='tidal-cause'&&<button disabled={!time.playing&&!!reason} title={!time.playing&&reason?reason:undefined} aria-label={time.playing?'暂停本节运动':'播放本节运动'} onClick={time.onToggle}>{time.playing?'暂停':'播放'}</button>}
  <button onClick={onRead}>本节讲解</button><button onClick={()=>{if(time.playing)time.onToggle();onExit();}}>返回全景</button>
  {!!reason&&!time.playing&&current.id!=='tidal-cause'&&<small role="status">{reason}</small>}
 </div>;
}
