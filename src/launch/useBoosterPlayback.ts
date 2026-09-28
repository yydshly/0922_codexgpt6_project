import { useEffect, useMemo, useRef, useState } from 'react';
import type { BoosterRecord } from './boosterDescent';
import { advanceBoosterPlayback, boosterPlaybackSample, type BoosterPlaybackRate } from './boosterPlayback';

export function useBoosterPlayback(record:BoosterRecord|null,active:boolean) {
  const [time,setTime]=useState<number|null>(null),[playing,setPlaying]=useState(false),[rate,setRate]=useState<BoosterPlaybackRate>(20);
  const latest=useRef(record);latest.current=record;
  const canReplay=!!record&&record.latest.time>record.startTime;
  const ended=time!==null&&!!record&&time>=record.latest.time;
  const follow=()=>{setPlaying(false);setTime(null);};
  const restart=()=>{if(canReplay){setTime(record!.startTime);setPlaying(true);}};
  const seek=(value:number)=>{if(record){setPlaying(false);setTime(Math.max(record.startTime,Math.min(record.latest.time,value)));}};
  const toggle=()=>{if(playing)setPlaying(false);else if(time===null||ended)restart();else setPlaying(true);};
  const open=()=>{if(record?.status!=='flying'&&canReplay)restart();else follow();};
  useEffect(()=>{
    if(!active||!playing)return;
    let raf=0,last=performance.now();
    const tick=(now:number)=>{const elapsed=(now-last)/1000;last=now;const data=latest.current;
      if(data)setTime(previous=>previous===null?null:advanceBoosterPlayback(previous,elapsed,rate,data.latest.time));
      raf=requestAnimationFrame(tick);
    };
    const hidden=()=>{if(document.hidden)setPlaying(false);};
    document.addEventListener('visibilitychange',hidden);raf=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',hidden);};
  },[active,playing,rate]);
  useEffect(()=>{if(ended||!active)setPlaying(false);},[ended,active]);
  const sample=useMemo(()=>active&&record ? time===null?record.latest:boosterPlaybackSample(record,time):undefined,[active,record,time]);
  return {time,playing,rate,setRate,canReplay,ended,sample,follow,restart,seek,toggle,open};
}
