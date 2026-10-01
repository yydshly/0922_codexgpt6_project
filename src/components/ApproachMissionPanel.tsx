import { APPROACH_PHASES, APPROACH_RULES, type ApproachMission } from '../flight/approachMission';

export function ApproachMissionPanel({mission,target,playing,automaticHint,onStart,onLeave}:{mission:ApproachMission|null;target:string;playing:boolean;automaticHint?:string;onStart:()=>void;onLeave:()=>void}) {
  if(!mission)return <section className="flight-mission flight-mission-entry">
    <small>第一次驾驶 / 接近与停稳</small><h3>飞到目标附近，停下来观察</h3>
    <p>从起点出发，找到{target}，轻推接近，再减速停稳。右侧提示会跟随实际操作变化。</p>
    <button className="flight-mission-start" onClick={onStart}>手动接近任务</button>
    <small>会重置当前练习的位置、速度与推进剂。</small>
  </section>;
  const ended=mission.status!=='running',result=mission.result;
  return <section className="flight-mission" data-status={mission.status} data-phase={mission.phase}>
    <small>{ended?'本次结果':`接近任务 / ${playing?'进行中':'已暂停'}`}</small>
    <h3>{ended?mission.status==='success'?'接近任务完成':'本次任务未完成':target}</h3>
    {!ended&&<ol className="flight-mission-steps" aria-label="接近任务步骤">{APPROACH_PHASES.map((phase,index)=><li key={phase.id} aria-current={mission.phase===phase.id?'step':undefined}><span>{index+1}</span>{phase.label}</li>)}</ol>}
    <p className="flight-mission-instruction" role="status">{automaticHint??mission.hint}</p>
    {result?<dl className="flight-mission-result">
      <div><dt>练习用时</dt><dd>{result.elapsed.toFixed(1)} s</dd></div><div><dt>推进剂消耗</dt><dd>{result.fuelUsed.toFixed(2)} kg</dd></div>
      <div><dt>结束接触余量</dt><dd>{result.clearance.toFixed(1)} m</dd></div><div><dt>结束速率</dt><dd>{result.speed.toFixed(2)} m/s</dd></div>
      <div><dt>最高速率</dt><dd>{result.peakSpeed.toFixed(2)} m/s</dd></div><div><dt>使用辅助对准</dt><dd>{result.assistedAimCount} 次</dd></div>
    </dl>:<>
      <ul className="flight-mission-criteria">
        <li data-met={mission.clearance>=APPROACH_RULES.minClearance&&mission.clearance<=APPROACH_RULES.maxClearance}><span>接触余量 15–30 m</span><b>{mission.clearance.toFixed(1)} m</b></li>
        <li data-met={mission.speed<=APPROACH_RULES.maxSpeed}><span>速率 ≤ 0.15 m/s</span><b>{mission.speed.toFixed(2)} m/s</b></li>
        <li data-met={mission.bearing<=APPROACH_RULES.maxBearing}><span>船头偏角 ≤ 8°</span><b>{mission.bearing.toFixed(1)}°</b></li>
      </ul>
      <p className="flight-mission-stop">现在持续减速，预计停止余量：<b>{mission.predictedClearance===null?'不可用':`${mission.predictedClearance.toFixed(1)} m`}</b></p>
      {mission.stopWarning&&<p className="flight-mission-warning">{mission.stopWarning}</p>}
      <label className="flight-mission-hold">松开推进并保持 <b>{mission.heldFor.toFixed(1)} / 5 s</b><progress max={5} value={mission.heldFor}/></label>
    </>}
    <details className="flight-mission-rules"><summary>观察区和任务规则</summary><p>青绿色线圈是观察区的辅助边界，不是实物。余量按目标与飞船的保守接触球面计算，不是中心距离或精确外壳间距。先对准 1 秒、向目标靠近至少 10 m，再同时满足上方条件并松开推进保持 5 秒。</p><p>暂停不计时；接触、越界或耗尽推进剂结束任务。结果暂停在结束位置。辅助对准会计入结果；这里练习局部操控，不模拟真实交会轨道。切换环境或退出页面不保留任务。</p></details>
    <div className="flight-mission-actions"><button className="flight-mission-retry" onClick={onStart}>{ended?'再试一次':'重新开始'}</button><button className="flight-mission-leave" onClick={onLeave}>{ended?'回到自由练习':'退出任务'}</button></div>
  </section>;
}
