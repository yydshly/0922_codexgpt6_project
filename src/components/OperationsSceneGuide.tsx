import { useState } from 'react';
import type { FlightState } from '../launch/liftoff';
import { operationsGuideReading, type OperationsGuides } from '../launch/operationsGuides';
import './OperationsSceneGuide.css';

export function OperationsSceneGuide({ state, options, onChange, onGuide, onOverview, overview }: {
  state: FlightState; options: OperationsGuides; onChange: (value: OperationsGuides) => void;
  onGuide: () => void; onOverview: () => void; overview: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const reading = operationsGuideReading(state);
  if (!reading) return null;
  return <aside className="operations-scene-guide" aria-label="卫星工作辅助线">
    <button className="operations-guide-heading" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>卫星工作辅助线 <span>{expanded ? '收起 −' : '展开 +'}</span></button>
    {expanded && <div>
      {([['power', '01 对日与供电'], ['observation', '02 对地与采集'], ['contact', '03 地面站与下传']] as const).map(([id, title]) => <label key={id} data-line-kind={id}>
        <input type="checkbox" checked={options[id]} onChange={e => onChange({ ...options, [id]: e.target.checked })}/>
        <div><strong>{title}</strong><p>{reading[id]}</p></div>
      </label>)}
      <p className="operations-guide-key">黄箭头：对日方向。橙/绿实线：正在采集/下传，虚线：方向或可见关系。均为标注，不是可见光束或覆盖边界。</p>
      <button onClick={onOverview}>{overview?'定位当前辅助线':'拉远查看地球与连线'}</button>
      <button onClick={onGuide}>看图理解 · 观测卫星与星链 →</button>
    </div>}
  </aside>;
}
