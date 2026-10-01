import { useEffect,useRef,useState } from 'react';
import type { ExplorationReport } from '../flight/explorationReport';
import './ExplorationTransitionDialog.css';

export type ExplorationTransition='overview'|'practice'|'story'|'restart';
const routes:Record<ExplorationTransition,{title:string;action:string;next:string}>={
  overview:{title:'准备返回太阳系全景',action:'结束航程，返回全景',next:'再次进入飞船环境会开始新的六站航程。'},
  practice:{title:'准备进入独立练习',action:'结束航程，进入练习',next:'独立练习重新给定位置、速度与推进剂，不继承本次六站的状态。'},
  story:{title:'准备进入启航故事',action:'结束航程，开始故事',next:'故事从任务简报开始；发射、单站训练及后续新航程分别初始化。'},
  restart:{title:'准备重新开始航程',action:'清空本次，重新开始',next:'回到六站航区起点，时间与访问记录清零，推进剂重新设为 100 kg。'},
};

export function ExplorationTransitionDialog({intent,report,resumeOnCancel,onCancel,onConfirm,onDownload}:{
  intent:ExplorationTransition;report:ExplorationReport;resumeOnCancel:boolean;
  onCancel:()=>void;onConfirm:()=>void;onDownload:(format:'md'|'json')=>void;
}){
  const root=useRef<HTMLElement>(null),cancel=useRef<HTMLButtonElement>(null),[downloadStatus,setDownloadStatus]=useState('');
  useEffect(()=>{cancel.current?.focus({preventScroll:true});},[]);
  const route=routes[intent];
  const download=(format:'md'|'json')=>{try{onDownload(format);setDownloadStatus('已请求浏览器下载；请在下载列表中确认文件。');}catch{setDownloadStatus('未能启动下载。可以取消离开，在航程回顾中再试。');}};
  return <div className="exploration-transition-backdrop"><section className="exploration-transition-dialog" ref={root} role="alertdialog" aria-modal="true" aria-labelledby="exploration-transition-title" aria-describedby="exploration-transition-description" onKeyDown={e=>{
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();onCancel();return;}
    if(e.key==='Tab'){
      const items=[...root.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],first=items[0],last=items.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  }}>
    <small>本次航程已暂停 · 状态尚未清空</small><h2 id="exploration-transition-title">{route.title}</h2>
    <p id="exploration-transition-description">{route.next}确认后，本次内存中的航迹、到达记录、阅读笔记与讲解将清空。</p>
    <dl><div><dt>已抵达</dt><dd>{report.totals.arrivedCount} / {report.totals.stationCount}</dd></div><div><dt>阅读笔记</dt><dd>{report.totals.noteCount} / {report.totals.stationCount}</dd></div><div><dt>本次用时</dt><dd>{report.totals.time.toFixed(1)} s</dd></div><div><dt>已用推进剂</dt><dd>{report.totals.fuelUsed.toFixed(2)} kg</dd></div></dl>
    <p>可以先下载打开此提示时的记录。它是文字与数据快照，不能恢复驾驶进度；下载期间航程保持暂停。</p>
    <div className="exploration-transition-downloads"><button className="exploration-transition-md" onClick={()=>download('md')}>下载文字记录</button><button className="exploration-transition-json" onClick={()=>download('json')}>下载 JSON 数据</button></div>
    {downloadStatus&&<p className="exploration-transition-download-status" role="status">{downloadStatus}</p>}
    <div className="exploration-transition-actions"><button ref={cancel} className="exploration-transition-cancel" onClick={onCancel}>{resumeOnCancel?'取消，继续当前航程':'取消，保持当前暂停'}</button><button className="exploration-transition-confirm" onClick={onConfirm}>{route.action}</button></div>
    <small>Esc 只取消本次离开；保留目的地、速度、推进剂、记录与停留状态。</small>
  </section></div>;
}
