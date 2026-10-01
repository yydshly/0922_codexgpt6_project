import { LESSONS, type PilotLesson } from '../flight/flightStory';

export function PilotLessonPanel({lesson,speed,clearance,firing,paused,onAim,onApproach}:{lesson:PilotLesson;speed:number;clearance:number;firing:number;paused:boolean;onAim:()=>void;onApproach:()=>void}) {
  const cue=LESSONS[lesson.phase];
  const observed=paused?'当前已经暂停，运动、耗油和检查计时均冻结。继续练习后再观察变化。':lesson.phase==='coast'&&firing>.001?'你仍在施加推力，推进剂仍会消耗。松开推进与减速输入后，才开始记录无推力滑行。':lesson.phase==='coast'&&speed<.3?'当前速率不足 0.3 m/s，请短按 W 恢复滑行，再松开观察。':cue.phenomenon;
  return <section className="pilot-lesson" data-phase={lesson.phase}>
    <small>第 4 章 · 驾驶员：你 {paused?'· 已暂停':''}</small><h3>{cue.title}</h3>
    <p className="pilot-lesson-action">{cue.action}</p>
    <div className="story-phenomenon"><strong>画面与原因</strong><p>{observed}</p></div>
    {lesson.phase==='coast'&&<p className="pilot-coast-time">连续滑行 {lesson.coastSeconds.toFixed(1)} / 2 s</p>}
    {lesson.phase==='aim'&&<button className="pilot-lesson-aim" onClick={onAim}>辅助对准目标</button>}
    {lesson.phase==='ready'&&<><button className="pilot-lesson-approach" disabled={speed>.15||clearance<=40} onClick={onApproach}>从当前位置开始巡视 →</button>{(speed>.15||clearance<=40)&&<p>请先减速至 0.15 m/s 以下；余量不足 40 m 时，先反推退远，或重置本次训练。</p>}</>}
    <small>松开推进后仍会滑行。辅助对准会记入报告；重置会从操控检查重新开始。</small>
  </section>;
}
