import {LEARNING_CHAPTERS,LEARNING_STEPS} from '../data/learningRoute';
import './LearningRoute.css';
interface Props {
 index:number|null; following:boolean; reason:(index:number)=>string;
 onGo:(index:number)=>void; onExit:()=>void; onFinish:()=>void; onStages:()=>void;
 mode:'map'|'lesson'; onRead:()=>void;
}
export function LearningRoute({index,following,reason,onGo,onExit,onFinish,onStages,mode,onRead}:Props){
 const step=index===null?null:LEARNING_STEPS[index];
 if(mode==='map')return <div className="learning-map">
  <h3>按层级认识太阳系</h3><p>整体 → 恒星与行星 → 卫星家族 → 小天体 → 外围 → 宇宙。展开章节选择课程。</p>
  {step&&<p className="learning-map-current">保留位置：第 {index!+1} / {LEARNING_STEPS.length} 节 · {step.title}</p>}
  {LEARNING_CHAPTERS.map((chapter,i)=>{
   const items=LEARNING_STEPS.map((s,n)=>({s,n})).filter(({s})=>s.chapter===i);
   return <section key={chapter}><details className="learning-chapter" open={step?step.chapter===i:i===0}>
    <summary><strong>{i+1} · {chapter}</strong><span>{items.length} 节{step?.chapter===i?' · 当前':''}</span></summary>
    {items.map(({s,n})=>{const unavailable=reason(n);return <div key={s.id}><button disabled={!!unavailable} aria-current={index===n?'step':undefined} aria-describedby={unavailable?`learning-unavailable-${s.id}`:undefined} onClick={()=>onGo(n)}>{n+1}. {s.title}</button>{unavailable&&<small id={`learning-unavailable-${s.id}`}>{unavailable}</small>}</div>;})}
   </details></section>;
  })}
  <button onClick={onStages}>查看阶段开关</button><p>“后退 / 前进”是浏览历史；“上一节 / 下一节”是学习顺序。阶段关闭或数据未就绪时会说明原因，不自动跳过。</p>
 </div>;
 if(!step)return <section className="learning-lesson learning-start"><span>推荐学习主线 · {LEARNING_CHAPTERS.length} 章 / {LEARNING_STEPS.length} 节</span><h3>先整体，再主体，最后展开细节</h3><p>先看太阳系地图，再认识太阳、行星和卫星；区域中的小天体随后展开。</p><button className="learning-primary" disabled={!!reason(0)} onClick={()=>onGo(0)}>从整体开始</button>{reason(0)&&<><p role="status">{reason(0)}</p><button onClick={onStages}>查看阶段开关</button></>}</section>;
 const blocked=reason(index!);const next=index!+1;
 const nextReason=next<LEARNING_STEPS.length?reason(next):'';
 const previousReason=index!>0?reason(index!-1):'';
 return <section className="learning-lesson" aria-label="当前学习章节" tabIndex={-1}>
  <span>第 {step.chapter+1} 章 · {LEARNING_CHAPTERS[step.chapter]} / 第 {index!+1} 节，共 {LEARNING_STEPS.length} 节</span>
  <p className="learning-current">本节观察{following?' · 已定位':' · 未在当前画面'}</p><h3>{step.title}</h3><p className="learning-breadcrumb">{step.path}</p>
  <p><b>为什么看：</b>{step.why}</p><p className="learning-task"><b>观察任务：</b>{step.look}</p><p className="learning-evidence">{step.boundary}</p>
  {(!following||blocked)&&<p role="status">{blocked||'正在自由浏览，学习位置已保留。回到本节后可继续主线。'}</p>}
  <div className="learning-actions">
   {!following?<button className="learning-primary" disabled={!!blocked} onClick={()=>onGo(index!)}>回到本节</button>:<>
    {next<LEARNING_STEPS.length?<button className="learning-primary" disabled={!!blocked||!!nextReason} onClick={()=>onGo(next)}>前往下一节 →<small>{LEARNING_STEPS[next].title}</small></button>:<button className="learning-primary" onClick={onFinish}>结束主线 · 自由探索</button>}
    <div className="learning-secondary"><button disabled={index===0||!!previousReason} title={previousReason||'返回上一节课程'} onClick={()=>onGo(index!-1)}>上一节</button><button onClick={onRead}>查看本节资料</button></div>
   </>}
   <button className="learning-exit" onClick={onExit}>退出并恢复全景</button>
  </div>
  {following&&next<LEARNING_STEPS.length&&<p className="learning-next-context">{nextReason?`下一节暂不可用：${nextReason}`:LEARNING_STEPS[next].chapter!==step.chapter?`接下来进入第 ${LEARNING_STEPS[next].chapter+1} 章「${LEARNING_CHAPTERS[LEARNING_STEPS[next].chapter]}」。`:'完成观察后，再进入下一节。'}</p>}
  {following&&previousReason&&<p role="status">上一节暂不可用：{previousReason}</p>}
  {(blocked||nextReason||previousReason)&&<button onClick={onStages}>查看阶段开关</button>}
  <p className="learning-branch">更多工具和自由目录是延伸阅读；退出恢复全景显示，日期与阶段开关保持不变。</p>
 </section>;
}
