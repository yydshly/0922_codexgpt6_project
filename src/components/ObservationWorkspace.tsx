import type {ObservationPanels,PanelAction} from '../data/observationPanels';
import type {ScaleStop,ScaleDestination} from '../data/observationScale';
import './ObservationWorkspace.css';

export function ObservationPanelControls({panels,onChange,id}:{panels:ObservationPanels;onChange:(action:PanelAction)=>void;id:string}) {
  const focused=!panels.regions&&!panels.info;
  return <div className="observation-panel-controls" role="group" aria-label="观察面板布局">
    <button aria-expanded={panels.regions} aria-controls={`${id}-regions`} onClick={()=>onChange({type:'toggle',panel:'regions'})}>{panels.regions?'收起区域':'显示区域'}</button>
    <button aria-expanded={panels.info} aria-controls={`${id}-info`} onClick={()=>onChange({type:'toggle',panel:'info'})}>{panels.info?'收起说明':'显示说明'}</button>
    <button aria-pressed={focused} title={focused?'恢复进入专注画面前的面板布局；也可按 Esc':'临时收起两侧面板，保留镜头和时间控制'} onClick={()=>onChange({type:'focus'})}>{focused?'恢复面板':'专注画面'}</button>
  </div>;
}

export function ObservationScaleTrail({stops,next,reason,onVisit}:{stops:ScaleStop[];next:ScaleStop|null;reason:(destination:ScaleDestination)=>string;onVisit:(destination:ScaleDestination)=>void}) {
  const link=(stop:ScaleStop)=>{
    const destination=stop.destination;
    const blocked=destination?reason(destination):'';
    return destination?<button disabled={!!blocked} title={blocked||`切换到${stop.label}；保留观测日期`} onClick={()=>onVisit(destination)}>{stop.label}</button>:<span aria-current="location">{stop.label}</span>;
  };
  return <div className="observation-scale-trail">
    <nav aria-label="观察层级"><span className="observation-scale-caption">层级</span>{stops.map((stop,i)=><span className="observation-scale-stop" key={`${i}-${stop.label}`}>{i>0&&<span aria-hidden="true">›</span>}{link(stop)}</span>)}</nav>
    {next&&<div className="observation-scale-next">{link(next)}{next.destination&&reason(next.destination)&&<small>{reason(next.destination)}</small>}</div>}
  </div>;
}
