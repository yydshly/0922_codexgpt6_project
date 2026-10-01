import type { RefObject } from 'react';
import type { NarrationEntry } from '../flight/explorationNarrationLog';

export function ExplorationNarrationPanel({entries,discarded,selectedEntry,detailsRef,paused,disabled,onOpen,onSelect,onResume}:{
  entries:readonly NarrationEntry[];discarded:number;selectedEntry:NarrationEntry|null;
  detailsRef:RefObject<HTMLDetailsElement|null>;paused:boolean;disabled:boolean;
  onOpen:()=>void;onSelect:(id:number)=>void;onResume:()=>void;
}){
  const selected=selectedEntry??entries.at(-1);
  return <details className="exploration-narration-log" ref={detailsRef} onToggle={e=>{if(e.currentTarget.open)onOpen();}}>
    <summary>讲解回看 · {entries.length} 条 <small>展开会暂停</small></summary>
    <p>{paused?'运动已暂停。':'运动正在继续，当前显示旧讲解。'}回看文字不回退飞船，也不改道；记录不代表已经阅读或完成操作。</p>
    {selected?<article className="exploration-narration-review" data-id={selected.id} data-target={selected.targetId}>
      <small>{selected.id===0?'暂停阅读前的画面讲解':'当时的讲解'} · T+{selected.time.toFixed(1)} s · {selected.targetName}</small>
      <h3>{selected.cue.title}</h3><p>{selected.cue.text}</p><p className="exploration-past-action">当时的提示：{selected.cue.action}</p>
      <small>文字中的倒计时与下一站属于当时；当前航行状态看主画面。</small>
    </article>:<p>进入航程后，阶段提示会记录在这里。</p>}
    <button className="exploration-finish-reading" disabled={disabled} onClick={onResume}>{paused?'结束阅读，继续运行':'收起回看，回到当前'}</button>
    <small className="exploration-log-hint">继续时保留原驾驶方式与停留状态。仅收起面板不会自动恢复运行。</small>
    <ol className="exploration-narration-list" aria-label="已出现的讲解，最新在前">{[...entries].reverse().map(entry=><li key={entry.id}><button aria-pressed={selected?.id===entry.id} onClick={()=>onSelect(entry.id)} data-id={entry.id} data-target={entry.targetId}><small>T+{entry.time.toFixed(1)} s · {entry.targetName}</small><span>{entry.cue.title}</span></button></li>)}</ol>
    <small className="exploration-log-hint">本航程最多保留最近 60 条，退出后清空。{discarded>0?`更早的 ${discarded} 条已移出列表。`:''}</small>
  </details>;
}
