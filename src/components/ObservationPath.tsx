import type {ReactNode} from 'react';
import './ObservationPath.css';
export function ObservationPath({title,hint,back,forward,backReason,forwardReason,onBack,onForward,learning,onLesson}:{title:string;hint:string;back?:string;forward?:string;backReason:string;forwardReason:string;onBack:()=>void;onForward:()=>void;learning:ReactNode;onLesson?:()=>void}){
 return <nav className="observation-path" aria-label="全景观察路径">
  <div className="observation-path-heading"><strong title={hint} aria-live="polite">当前位置 · {title}</strong></div>
  <div className="observation-path-buttons"><button disabled={!back||!!backReason} title={backReason||back||'没有更早的浏览位置'} onClick={onBack}>← 后退</button><button disabled={!forward||!!forwardReason} title={forwardReason||forward||'没有更后的浏览位置'} onClick={onForward}>前进 →</button></div>
  {onLesson&&<button className="learning-return" onClick={onLesson}>本节引导</button>}
  <details><summary title="从整体到细节的六章学习路线">学习路线</summary><div className="observation-path-popover">{learning}<p>{hint}</p>{(backReason||forwardReason)&&<p role="status">{backReason&&`浏览后退：${backReason}。`}{forwardReason&&`浏览前进：${forwardReason}。`}</p>}<p>浏览历史恢复离开时的镜头，不回退日期；学习路线按当前日期定位。学习取景会调整图层，退出引导恢复全景显示，日期和阶段开关保持不变。</p></div></details>
 </nav>;
}
