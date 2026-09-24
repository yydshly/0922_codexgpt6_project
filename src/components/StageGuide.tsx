import { useEffect,useRef,type KeyboardEvent } from 'react';
import { STAGES,allStages,type StageFlags,type StageId } from '../data/stages';
import './StageGuide.css';
export function StageGuide({flags,onChange,onVisit,onClose}:{flags:StageFlags;onChange:(flags:StageFlags)=>void;onVisit:(id:StageId,only:boolean)=>void;onClose:()=>void}){
 const root=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus();else document.querySelector<HTMLElement>('.app-header [aria-label="阶段导览"]')?.focus();};},[]);
 function key(e:KeyboardEvent){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){const items=Array.from(root.current?.querySelectorAll<HTMLElement>('button,input')??[]).filter(e=>e.getClientRects().length&&!e.hasAttribute('disabled'));if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}}
 return <div className="stage-guide-overlay"><section ref={root} className="stage-guide" role="dialog" aria-modal="true" aria-labelledby="stage-guide-title" onKeyDown={key}>
 <header><div><span>BUILD & EXPLORE</span><h2 id="stage-guide-title">阶段导览与新增内容控制</h2></div><button ref={close} onClick={onClose} aria-label="关闭阶段导览">关闭</button></header>
 <p>01–03 控制宏观页新增内容，04 控制新增环系与家族讲解，05 控制磁层与极光，06 控制辐射带与等离子体层；后两批可在同一原理图中组合。主观测页既有天体、带区与土星环保留。关闭阶段优先于图层开关；重新开启会沿用原图层设置，不修改日期或物理模型。</p>
 <div className="stage-guide-actions"><button onClick={()=>onChange(allStages())}>恢复全部阶段</button><span>{STAGES.filter(s=>flags[s.id]).length} / {STAGES.length} 批已开启 · 本次页面内生效</span></div>
 <div className="stage-guide-grid">{STAGES.map(stage=><article key={stage.id}><label><input type="checkbox" checked={flags[stage.id]} onChange={e=>onChange({...flags,[stage.id]:e.target.checked})}/><strong>{stage.title}</strong><span>{flags[stage.id]?'已开启':'已隐藏'}</span></label><h3>{stage.added}</h3><p>{stage.description}</p><dl><dt>怎么理解画面</dt><dd>{stage.evidence}</dd><dt>建议观察顺序</dt><dd>{stage.how}</dd></dl><div className="stage-guide-actions"><button onClick={()=>onVisit(stage.id,false)}>前往本阶段</button><button onClick={()=>onVisit(stage.id,true)}>只看这一批</button></div></article>)}</div>
 <footer>这是一组观察筛选，不是回滚旧版本。不同阶段可同时打开；远端发布与本地验收情况见“建设记录”。探测器仍待定。</footer>
 </section></div>;
}
