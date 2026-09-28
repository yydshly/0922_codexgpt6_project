import type { FlightState } from './liftoff';

export type MissionStepStatus = 'available' | 'configured' | 'pending' | 'active' | 'passed' | 'stopped';
export const MISSION_STATUS_TEXT: Record<MissionStepStatus, string> = { available: '基地就绪', configured: '配置已应用', pending: '尚未进行', active: '当前步骤', passed: '计算检查通过', stopped: '已停止 · 查看原因' };
export const MISSION_STEPS = [
  { title: '认识地球基地', detail: '确认出发位置、目标轨道，以及教学场景的范围。' },
  { title: '组装并应用载具', detail: '发动机、推进剂和载荷共同决定质量与推力；可使用基准配置。' },
  { title: '检查、点火与离台', detail: '完成检查与倒计时；依靠推力离台，升高约 150 m 后复查。' },
  { title: '上升、转弯与分级', detail: '一级燃尽后手动分离；二级点火 30 秒后停下检查。' },
  { title: '入轨、关机与绕地验证', detail: '检查近远地点和倾角，关机后实际绕地一圈；只到高空不算通过。' },
  { title: '部署卫星与保存任务', detail: '开舱、释放，再独立飞行 120 秒检查；最后观察并保存。' },
] as const;

/** Progress is derived from solver milestones, never from clicks, altitude or a manual checklist. */
export function missionProgress(s: FlightState) {
  const current = s.deployment ? 5 : s.orbit ? 4 : s.ascent ? 3 : 2;
  const basicFailed = ['aborted', 'ascent-failed', 'orbit-failed', 'deployment-failed'].includes(s.phase);
  const failed = s.phase === 'aborted' || s.phase.endsWith('-failed');
  const checks = [
    s.phase === 'complete' || !!s.ascent,
    s.phase === 'ascent-complete' || !!s.orbit,
    s.phase === 'orbit-complete' || !!s.deployment,
    !!s.deployment?.verified,
  ];
  const statuses: MissionStepStatus[] = ['available', 'configured', ...checks.map((passed, i): MissionStepStatus => i + 2 === current && basicFailed ? 'stopped' : passed ? 'passed' : i + 2 === current && s.phase !== 'ready' ? 'active' : 'pending')];
  return { current, failed, checksPassed: checks.filter(Boolean).length, statuses,
    result: failed ? `当前阶段已停止：${s.message} 已有检查记录保留，请先查看原因。` : s.deployment?.verified ? '出发到部署的四段检查已通过；后续二级与卫星的结果分别列在下方，不能用部署通过代替任务完成。' : '按当前步骤完成操作，再进入下一段；不需要重跑已经通过的检查点。' };
}
