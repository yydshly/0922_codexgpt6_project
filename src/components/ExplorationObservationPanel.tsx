import { OBSERVATIONS } from '../flight/explorationObservation';
import { EXPLORATION_STORIES } from '../flight/explorationNarrative';
import type { ExplorationNotebook } from '../flight/explorationNotebook';

export function ExplorationObservationPanel({id,name,staying,dwell,paused,next,nextId,part,onPart,onObserve,onStay,onContinue,book,canSave,onSave}:{id:string;name:string;staying:boolean;dwell:number;paused:boolean;next:string|null;nextId:string|null;part:string|null;onPart:(id:string)=>void;onObserve:()=>void;onStay:()=>void;onContinue:()=>void;book:ExplorationNotebook;canSave:boolean;onSave:()=>void}){
  const profile=OBSERVATIONS[id],selected=profile.parts.find(p=>p.id===part),story=EXPLORATION_STORIES[id],saved=book.notes.some(n=>n.id===id);
  return <section className="exploration-observation" data-id={id} data-staying={staying}>
    <small>已抵达 · {name}</small><h2>{profile.title}</h2><p>{profile.summary}</p>
    <p className="exploration-observation-question"><b>观察问题</b> {story.observe}</p>
    <button className="exploration-inspect" onClick={onObserve}>近看并停留观察</button>
    {profile.parts.length>0&&<><div className="exploration-part-list">{profile.parts.map(p=><button key={p.id} aria-pressed={part===p.id} onClick={()=>onPart(p.id)}>{p.label}{book.opened[id]?.includes(p.id)?' · 已打开':''}</button>)}</div><p className="exploration-part-detail" role="status">{selected?.detail??'点选部件标注或上方名称，查看对应介绍；点选后会停留在本站。'}</p></>}
    <div className="exploration-save-note"><button disabled={!canSave} onClick={onSave}>{saved?'本站阅读笔记已保存':'保存本站阅读笔记'}</button><small>{saved?story.finding:profile.parts.length?`已打开 ${book.opened[id]?.length??0} / ${profile.parts.length} 个部件介绍；全部打开后可自愿保存，不影响巡游。`:'读完本站说明后，可保存这份笔记；无需完成额外操作。'}</small></div>
    <p className="exploration-stop-clock">{paused?'运动与下一站倒计时已暂停':staying?'已停留，等你决定何时出发':next?`${dwell.toFixed(1)} 秒后前往 ${next} · 到站使用 1× 时间`:'本次巡游已结束，可继续自由驾驶或再选目的地'}</p>
    <div className="exploration-stop-actions">{!staying&&next&&<button className="exploration-stay" onClick={onStay}>停留，不自动离开</button>}{next&&<button className="exploration-continue" onClick={onContinue}>继续下一站 →</button>}</div>
    {next&&<p className="exploration-departure-story">接下来前往 {next}。{nextId?EXPLORATION_STORIES[nextId]?.purpose:''}</p>}
    <small>观察镜头只改变取景，不移动飞船。拖动可绕看，滚轮可调整距离。</small>
  </section>;
}
