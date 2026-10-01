import { useEffect, useRef, useState } from 'react';
import type { StateFrame } from '../types';
import { STORY_CHAPTERS, type LaunchStoryRecord, type PilotReport } from '../flight/flightStory';
import { deferDialog } from './DeferredDialog';
import './FlightJourney.css';
import {CrewedMission} from './CrewedMission';

export function FlightJourney({onClose}:{frame:StateFrame|null;onClose:()=>void;onExplore?:()=>void}){
  return <CrewedMission onClose={onClose}/>;
}

const Launch=deferDialog('故事发射场',async()=>({default:(await import('./EarthLaunchBase')).EarthLaunchBase}));
const Pilot=deferDialog('故事驾驶舱',async()=>({default:(await import('./FlightEnvironment')).FlightEnvironment}));
type Chapter='briefing'|'launch'|'handover'|'pilot'|'report';
export function TrainingFlightJourney({frame,onClose,onExplore}:{frame:StateFrame|null;onClose:()=>void;onExplore?:()=>void}) {
  const [chapter,setChapter]=useState<Chapter>('briefing'),[launch,setLaunch]=useState<LaunchStoryRecord|null>(null),[report,setReport]=useState<PilotReport|null>(null);
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{root.current?.querySelector<HTMLButtonElement>('button')?.focus();},[chapter]);
  const handover=(record:LaunchStoryRecord|null)=>{setLaunch(record);setChapter('handover');};
  if(chapter==='launch'&&frame)return <Launch frame={frame} onClose={onClose} training={{onHandover:handover}}/>;
  if(chapter==='pilot')return <Pilot onClose={onClose} story={{onReport:value=>{setReport(value);setChapter('report');}}}/>;
  const index=chapter==='briefing'?0:chapter==='handover'?2:4;
  return <section className="flight-story" role="dialog" aria-modal="true" aria-label="蓝色地平线启航故事" ref={root} onKeyDown={e=>{
    e.stopPropagation();if(e.key==='Escape')onClose();
    if(e.key==='Tab'){
      const nodes=[...root.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  }}>
    <header><button onClick={onClose}>← 返回探索（新航程）</button><span>ORBIT / FIRST FLIGHT</span><small>训练故事 · 非真实任务复刻</small></header>
    <nav aria-label="故事章节">{STORY_CHAPTERS.map((label,i)=><span key={label} aria-current={i===index?'step':undefined}><b>0{i+1}</b>{label}</span>)}</nav>
    <div className="flight-story-content">
      <article>
        <small className="story-eyebrow">BLUE HORIZON / 01</small>
        <h1>{chapter==='briefing'?'蓝色地平线：第一次巡视':chapter==='handover'?'从发射观摩，交接到你的驾驶座':'巡视记录已提交'}</h1>
        {chapter==='briefing'?<>
          <p className="story-lead">近地教学航区里，卫星、废弃级段与中继平台等待你辨认。出发前，先完成一次单站巡视：看懂怎样出发，再学会区分船头朝向与滑行方向，最后在卫星附近停稳。你可以亲自驾驶，也可以授权系统执行、观察并随时接管。</p>
          <ol className="story-route">
            <li><b>地面 · 看懂怎样出发</b><span>观察点火、分级与关机，完成一圈轨道验证后获得发射记录。已了解发射，也可直接进入驾驶准备。</span></li>
            <li><b>交接 · 明确你的起点</b><span>确认局部练习的距离、速度与推进剂；接过观察任务，开始一段新的驾驶训练。</span></li>
            <li><b>近距 · 理解怎样接近</b><span>观察自动驾驶，或亲自练习转向、点火、滑行与减速；实际完成的操作会记入报告。</span></li>
            <li><b>目标 · 留下第一份记录</b><span>在观察区停稳，提交单站的距离、速度与耗油结果。之后可开始六站巡视，把注意力转向辨认环境。</span></li>
          </ol>
        </>:chapter==='handover'?<>
          <p className="story-lead">{launch?'基准火箭已完成一圈轨道验证，发射记录已生成。现在把注意力从“怎样离开地面”转向“怎样靠近而不撞上目标”。':'你跳过了发射观摩，不会生成入轨记录。现在直接练习“怎样靠近而不撞上目标”，报告会保留这一区别。'}</p>
          {launch&&<dl className="story-report-grid"><div><dt>近地点 / 远地点</dt><dd>{launch.periapsisKm.toFixed(1)} / {launch.apoapsisKm.toFixed(1)} km</dd></div><div><dt>已计算的滑行时间</dt><dd>{(launch.coastSeconds/60).toFixed(1)} min</dd></div></dl>}
          <div className="story-boundary"><h2>这次交接了什么？</h2><p>交接的是你的观察与操作任务。下一场景从目标前方 125 m、相对静止、推进剂 100 kg 的教学起点开始。</p><p>这是一段新训练，火箭的燃料、位置和速度不传入飞船；两段尚未连接成连续的载人实飞。</p></div>
          <p>你决定采用自动还是手动驾驶，ORBIT 解释当前现象。可直接开启自动驾驶，跳过手动检查；也可跟随引导练习。目标相同：在观察区停稳 5 秒，再由你提交记录。</p>
          <p className="story-control-note">W/S 推进，A/D 与上下键调整朝向，B 辅助减速，空格暂停。转向需要先起转、再制转，也消耗推进剂；船头转了，原有滑行方向不会立刻跟着转。</p>
        </>:<>
          <p className="story-lead">第一次单站巡视完成：飞船已通过实际距离、速度和停稳时间的检查。下方只记录本次发生的操作；自动驾驶与手动输入分开计算，未做的手动检查不算完成。</p>
          <dl className="story-report-grid"><div><dt>发射观摩</dt><dd>{launch?'完成入轨验证':'已跳过 · 未生成记录'}</dd></div><div><dt>单站训练总用时</dt><dd>{report?.totalTime.toFixed(1)} s</dd></div><div><dt>单站训练总耗油</dt><dd>{report?.fuelUsed.toFixed(2)} kg</dd></div><div><dt>结束接触余量</dt><dd>{report?.approach.clearance.toFixed(1)} m</dd></div><div><dt>结束速率</dt><dd>{report?.approach.speed.toFixed(2)} m/s</dd></div><div><dt>辅助对准</dt><dd>{report?.helperUsed?'本次使用过':'未使用'}</dd></div></dl>
          <dl className="story-report-grid"><div><dt>自动控制时长</dt><dd>{report?.automaticSeconds.toFixed(1)} s</dd></div><div><dt>手动输入时长</dt><dd>{report?.manualSeconds.toFixed(1)} s</dd></div><div><dt>从自动驾驶接管</dt><dd>{report?.takeovers} 次</dd></div></dl>
          <ul className="story-evidence" aria-label="本次实际操作记录">{report?.phenomena.map(item=><li key={item}>✓ {item}</li>)}</ul>
          <p className="story-control-note">这份报告是位置和操控记录，没有生成照片、检修成果或对接结果。</p>
          {onExplore&&<div className="story-next-leg"><small className="story-eyebrow">NEXT / 六站巡视</small><h2>从会接近，到看懂周围</h2><p>沿六站路线辨认卫星、级段与平台，看看地球和岩体，再回到出发航点比较整段航程。自动驾驶负责航行，你选择看什么，也可随时接管。</p><p className="story-control-note">将开启新的近地教学航区，重新给定初始位置、速度与推进剂；不继承火箭或本次单站训练的剩余燃料。</p></div>}
        </>}
      </article>
      <aside>
        <small className="story-eyebrow">CREW / 谁在做什么</small><h2>驾驶员：你</h2><p>授权自动驾驶、观察舷窗和仪表；也可以亲自控制。任一驾驶键或操控按钮会接管，位置、速度和推进剂不重置。</p>
        <h3>随航讲解：ORBIT</h3><p>根据当前状态解释现象，提示下一步；这是本地教学讲解，不是真实地面通信，也不会替你完成手动检查。暂停和辅助对准都由你决定。</p>
        <h3>自动驾驶：飞行系统</h3><p>发射段执行自动制导；局部巡视按你的授权转向、接近和停稳。姿态喷口与推进都受燃料约束。抵达后，由你提交单站记录。</p>
        <div className="story-actions">{chapter==='briefing'?<><button className="story-begin" disabled={!frame} onClick={()=>setChapter('launch')}>接受任务，前往发射场 →</button><button className="story-direct" onClick={()=>handover(null)}>已了解发射，直接准备驾驶</button>{!frame&&<small>太阳系基础数据尚未就绪；暂可直接体验局部驾驶。</small>}</>:chapter==='handover'?<button className="story-take-control" onClick={()=>setChapter('pilot')}>确认练习起点，接手驾驶 →</button>:<>{onExplore&&<><button className="story-explore" onClick={onExplore}>开始六站巡视（新航程） →</button><small>新航程重新给定位置、速度与推进剂，本次报告不会自动保存。</small></>}<button className="story-replay" onClick={()=>{setReport(null);setLaunch(null);setChapter('briefing');}}>重新开始故事</button>{!onExplore&&<button onClick={onClose}>返回探索（新航程）</button>}</>}</div>
        <small>本次故事不自动保存，退出后从头开始。已有发射存档不会被覆盖。</small>
      </aside>
    </div>
  </section>;
}
