import {moonPhase,phaseDiskPath} from '../data/moonPhase';
import type {StateFrame} from '../types';
export function MoonPhaseReadout({frame,compact=false}:{frame:StateFrame|null;compact?:boolean}){
 const phase=moonPhase(frame);if(!phase)return null;
 return <aside className={compact?'moon-phase-inset':'moon-phase-readout'} data-moon-phase={compact?'inset':'detail'} aria-label="地心月相示意">
 <strong>从地球中心看月球</strong>
 <svg viewBox="-1.15 -1.15 2.3 2.3" role="img" aria-label={`几何亮面比例 ${(phase.fraction*100).toFixed(1)}%`}><circle r="1" fill="#182630" stroke="#658291" strokeWidth=".012"/><path d={phaseDiskPath(phase.cosPhase)} transform={`rotate(${phase.rotation})`} fill="#e8e6cd"/></svg>
 <b>{phase.name} · <span data-phase-fraction>{(phase.fraction*100).toFixed(1)}%</span></b>
 <small>比例指可见圆面的受照面积；非亮度。</small>
 {!compact&&<><p>距地心 {Math.round(phase.distanceKm).toLocaleString('zh-CN')} km；日月地相位角 {phase.phaseAngle.toFixed(1)}°（顶点在月球）。</p><p>圆面上方取投影黄道北向，不是你所在地的天顶。阶段名按日月黄经差粗分，只帮助辨认形态，不是精确朔望时刻。</p></>}
 <small>同日历表几何示意 · 非实拍<br/>未计算地影、地照、大气及地面视差</small>
 </aside>;
}
