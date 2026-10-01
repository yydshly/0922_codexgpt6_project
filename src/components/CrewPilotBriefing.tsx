import {CREW_PHASES,type CrewPhase,type CrewSnapshot} from '../flight/crewMission';
import {crewObservationReady} from '../flight/crewPilotControl';
import {crewPropulsionReadout} from '../flight/crewFlightReadout';

const goals:Record<CrewPhase,string>={
  ground:'从地球出发，完成平台观察，再将驾驶员带回地面。',
  countdown:'发动机建压，发射台仍约束火箭；确认条件后才释放。',
  ascent:'保持上升，使用一级推进剂克服重力与空气阻力。',
  upper:'一级已分离；完成级间滑行，再由二级继续加速。',
  insertion:'二级建立目标轨道；确认轨道和关机状态后分离飞船。',
  approach:'与教学平台逐渐接近并减小相对速度，完成结构观察。',
  observe:'辨认平台舱段、太阳能翼和天线，并记录本次观察。',
  'return-ready':'观察已完成；用仍连接的服务舱发动机开始返回。',
  deorbit:'改变轨迹使近地点下降；发动机关机后分离服务舱。',
  'return-coast':'仅乘员舱继续返回，独立姿态喷口逐渐将热盾转向迎风方向。',
  entry:'借助空气阻力减速，监测动压与下降状态，等待减速伞窗口。',
  drogue:'减速伞正在拉伸并减速，等待满足主伞展开条件。',
  'main-chute':'在主伞下降中准备软着陆设备；授权与实际启动是两个步骤。',
  landing:'用专用喷口减小下降速度，检测支脚或舱体首次接地。',
  touchdown:'等待接地缓冲和停稳检查通过，再发出回收信号。',
  complete:'本次教学飞行与回收检查已完成，可以查看或下载实际记录。',
  failed:'本次任务已停止，保留失败时的实际状态与原因。',
};

/** Failure belongs to the last flown chapter, not automatically to landing. */
export function crewMissionChapter(s:CrewSnapshot){
  const phase=s.phase==='failed'?[...s.events].reverse().find(event=>!['failed','complete'].includes(event.phase))?.phase??'ground':s.phase;
  return ['ground','countdown'].includes(phase)?0:['ascent','upper','insertion'].includes(phase)?1:['approach','observe'].includes(phase)?2:['return-ready','deorbit','return-coast','entry','drogue','main-chute'].includes(phase)?3:4;
}

export function CrewPilotBriefing({state:s,playing}:{state:CrewSnapshot;playing:boolean}){
  const terminal=s.phase==='failed'||s.phase==='complete';
  const action=s.pilot.actions.find(a=>a.action===s.pilot.pendingAction)??s.pilot.actions[0];
  const observationReady=crewObservationReady(s),propulsion=crewPropulsionReadout(s);
  const next=terminal?s.phase==='failed'?'查看失败原因，恢复已保存的任务或重新开始。':'下载记录或重新开始。'
    :s.phase==='observe'?observationReady?'记录平台结构观察。':'先满足观察条件，再记录平台结构观察。'
      :s.phase==='upper'&&s.pilot.engineEnabled?propulsion.thrustN>1?'二级推力已建立，继续加速，随后检查目标轨道。':!s.automatic&&s.pilot.throttle===0?`二级点火授权保留，当前油门为零；${playing?'增加油门':'继续后增加油门'}，或恢复飞控辅助。`:'二级点火已授权，等待实际推力建立。'
        :action?action.allowed?`${action.label}。按钮已可用，确认后执行。`:action.reason
        :s.phase==='approach'?'先相对平台停稳，再进入结构观察。'
          :s.phase==='return-coast'?'保持热盾转姿，继续至再入阶段。'
            :s.phase==='landing'?'继续下降与接地计算，监测下降速度和倾角。':CREW_PHASES[s.phase].action;
  const status=s.phase==='failed'?'任务已停止':s.phase==='complete'?'任务已完成'
    :s.pilot.pendingAction?'等待你的授权':observationReady&&!playing?'等待你记录观察':!playing?'模拟已暂停':'任务正在运行';
  const metrics=s.carrierStage!=='none'
    ?[['火箭总剩余推进剂',`${(s.launchFuelKg/1000).toFixed(2)} t`],['实际推力',`${(Math.hypot(...s.thrust)/1000).toFixed(1)} kN`]]
    :['approach','observe','return-ready'].includes(s.phase)
      ?[['平台中心距离',`${s.distanceM.toFixed(1)} m`],['平台相对速率',`${s.relativeSpeedMS.toFixed(3)} m/s`],['船头偏角',`${s.pointingDeg.toFixed(1)}°`]]
      :[['离地参考点高度',`${s.altitudeM<1000?s.altitudeM.toFixed(2)+' m':(s.altitudeM/1000).toFixed(2)+' km'}`],['地面参照竖直速度',`${s.verticalMS.toFixed(2)} m/s`]];
  return <section className="crew-briefing" aria-label="当前任务指引" data-mission-status={terminal?s.phase:s.pilot.pendingAction?'checkpoint':observationReady&&!playing?'observation':playing?'running':'paused'}>
    <div className="crew-briefing-status"><b>{status}</b>{!terminal&&<span>{s.automatic?'飞控辅助':'本人驾驶 · 1×'}</span>}</div>
    <p data-phase-goal>{s.phase==='countdown'?propulsion.thrustN>1?'发动机正在建压，发射台仍约束火箭；倒计时完成后确认释放。':'倒计时进行中，发动机尚无主推力；发射台保持约束。':goals[s.phase]}</p>
    <p className="crew-next-step" data-next-step><b>接下来</b>{next}</p>
    {observationReady&&!playing&&<p className="crew-briefing-record">观察条件已满足，可保持暂停切换镜头，直接点击「记录平台结构观察」，无需先继续模拟。</p>}
    {!terminal&&!playing&&!s.pilot.pendingAction&&!observationReady&&<p className="crew-briefing-paused">确认读数后点击「继续」；当前暂停不推进时间，也不执行驾驶输入。</p>}
    {!terminal&&<dl className="crew-briefing-readings">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {!terminal&&<details className="crew-propulsion-state" data-propulsion-state={propulsion.kind}><summary>{propulsion.title}</summary><p>{propulsion.detail}</p></details>}
  </section>;
}
