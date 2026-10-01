import { AUTOPILOT_LABELS, type Autopilot } from '../flight/autopilot';

export function AutopilotPanel({pilot,playing,ended,canStart,onStart,onTakeover}:{pilot:Autopilot;playing:boolean;ended:boolean;canStart:boolean;onStart:()=>void;onTakeover:()=>void}) {
  return <section className="flight-autopilot" data-enabled={pilot.enabled} data-phase={pilot.phase} aria-label="自动驾驶控制">
    <div className="flight-autopilot-title"><span>AUTO PILOT / 局部接近</span><b>{pilot.enabled&&!playing?'已暂停':AUTOPILOT_LABELS[pilot.phase]}</b></div>
    <h3>{ended?'本次驾驶记录':pilot.enabled?'系统在驾驶，你来观察':'让飞船自己飞到目标附近'}</h3>
    <p role="status">{pilot.enabled&&!playing?'已冻结运动与自动驾驶计时，继续练习后恢复。':pilot.message}</p>
    {!ended&&<button className={pilot.enabled?'flight-auto-takeover':'flight-auto-start'} disabled={!pilot.enabled&&!canStart} onClick={pilot.enabled?onTakeover:onStart}>{pilot.enabled?'接管驾驶 · 保留当前状态':pilot.automaticSeconds>0?'恢复自动驾驶':'开启自动驾驶 →'}</button>}
    {!ended&&!pilot.enabled&&!canStart&&<small>新任务需要接触余量至少 40 m；可重置回到起点。接触后请先重置。</small>}
    {pilot.automaticSeconds>0&&<dl><div><dt>自动控制</dt><dd>{pilot.automaticSeconds.toFixed(1)} s</dd></div><div><dt>手动输入</dt><dd>{pilot.manualSeconds.toFixed(1)} s</dd></div><div><dt>接管次数</dt><dd>{pilot.takeovers}</dd></div></dl>}
    <small>点按钮即可从当前状态出发；约一分钟完成起点接近。按任一驾驶键或操控按钮立即接管。暂停、环顾和切换镜头不会退出自动驾驶。</small>
    <details><summary>自动驾驶能做什么？</summary><p>检查已有滑行 → 转动船身 → 点火 → 滑行 → 反推 → 停稳。与手动驾驶使用相同的推力、推进剂和接触检测。只处理局部静止目标；前方被挡会中止并减速，不会自动规划绕障路线。当前不含真实轨道交会、对接或返航。</p></details>
  </section>;
}
