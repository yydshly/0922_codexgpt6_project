import type { FlightState } from './liftoff';
import { AVOIDANCE, AVOIDANCE_RUNNING } from './avoidance';
import { DEORBIT, DEORBIT_RUNNING } from './deorbit';
import { REENTRY_RUNNING } from './reentry';
import { OPS, OPS_RUNNING } from './satelliteOperations';
import { LIFE_RUNNING } from './satelliteLifecycle';

export type PackageStatus = 'pending' | 'unvisited' | 'checkpoint' | 'active' | 'complete' | 'boundary' | 'stopped';
export const PACKAGE_STATUS_TEXT: Record<PackageStatus, string> = {
  pending: '尚未进行', unvisited: '本次未执行', checkpoint: '检查点 · 等待操作', active: '已开始 · 尚未完成',
  complete: '本段计算完成', boundary: '到达模型边界', stopped: '本段停止',
};
export interface PackageProgress {
  id: 'P1' | 'P2' | 'P3' | 'P4' | 'P5'; title: string; status: PackageStatus; detail: string; facts: string[];
}
export interface ObjectRecord { id: 'carrier' | 'satellite'; title: string; historical: boolean; time: number; outcome: string; facts: string[]; boundary: string }
const km = (v: number) => `${(v / 1000).toFixed(2)} km`;
const kg = (v: number) => `${v.toFixed(2)} kg`;
export const recordTime = (v: number) => `T ${v < 0 ? '−' : '+'} ${Math.abs(v).toFixed(1)} s`;

/** Read-only projection: no new solver milestones, journal actions or saved-state fields. */
export function postDeploymentProgress(s: FlightState) {
  const d = s.deployment, p = d?.avoidance, q = d?.deorbit, r = s.reentry, o = s.operations, l = s.lifecycle;
  const p1Done = !!p?.started && p.elapsedS >= AVOIDANCE.horizonS - 1e-7;
  const p2Done = !!q?.cutoffVerified && q.restartLocked && q.passivationElapsedS >= DEORBIT.passivateS - 1e-7;
  const p4Done = !!o && (s.phase === 'ops-complete' || !!l) && o.collectedMB >= OPS.targetMB - 1e-7 && o.bufferMB <= 1e-7 && o.deliveredMB >= o.collectedMB - 1e-7;
  const at = (exists: boolean, running: readonly string[]): PackageStatus => exists ? running.includes(s.phase) ? 'active' : 'checkpoint' : 'pending';
  const steps: PackageProgress[] = [
    { id: 'P1', title: '分离分析与避让对照', status: p1Done ? 'complete' : p && s.phase === 'deployment-failed' ? 'stopped' : at(!!p, AVOIDANCE_RUNNING),
      detail: p1Done ? '15 分钟对照已算完；这只覆盖本次有限时段，不证明长期无碰撞。' : p ? '分析、对准或点火不等于完成；需继续滑行对照。' : '部署检查通过后，可以进入分离分析。',
      facts: p ? [`对照已推进 ${p.elapsedS.toFixed(1)} / ${AVOIDANCE.horizonS} s`, `二级机动耗油 ${kg(p.fuelUsedKg)}`] : [] },
    { id: 'P2', title: '二级离轨点火与简化钝化', status: s.phase === 'deorbit-failed' ? 'stopped' : p2Done ? 'complete' : !q && o ? 'unvisited' : at(!!q, DEORBIT_RUNNING),
      detail: p2Done ? '点火检查与简化钝化完成；近地点降低并不等于已烧毁或安全落地。' : !q && o ? '本次从 P1 直接进入卫星路线，未执行二级离轨。此后没有继续计算二级位置。' : '需要点火结果通过，再完成剩余能量处理；重启锁定本身不算完成。',
      facts: q ? [`点火耗油 ${kg(q.fuelBurnedKg)} · 排放推进剂 ${kg(q.propellantVentedKg)}`, `简化钝化 ${q.passivationElapsedS.toFixed(1)} / ${DEORBIT.passivateS} s`] : [] },
    { id: 'P3', title: '二级下降、减速与受热', status: r?.outcome === 'surface-reference' ? 'complete' : r?.outcome === 'stopped' ? 'stopped' : r?.outcome === 'model-boundary' ? 'boundary' : !r && o ? 'unvisited' : at(!!r, REENTRY_RUNNING),
      detail: r?.outcome === 'surface-reference' ? '等效物体参考下降已到 0 m。未求解材料存活或真实落区，不等于安全着陆或完整处置。' : r?.outcome === 'model-boundary' ? '计算停在 20 km 教学边界。未计算后续落点、解体与残骸，不判定处置完成。' : !r && o ? '这次任务没有执行二级再入段，不能把卫星工作成功当作二级已处置。' : '从同一次二级离轨结果继续，依次观察 120 km 检查点与大气段。',
      facts: r ? [`再入段已推进 ${r.elapsedS.toFixed(1)} s`, r.peakHeat ? `已算驻点热流峰值 ${(r.peakHeat.value / 1000).toFixed(1)} kW/m²（不是温度）` : '尚无有效驻点热流峰值'] : [] },
    { id: 'P4', title: '卫星发电、观测与下传', status: s.phase === 'ops-failed' ? 'stopped' : p4Done ? 'complete' : at(!!o, OPS_RUNNING),
      detail: p4Done ? '本次观测数据已交付地面；这不等于卫星退役，也不包含二级处置。' : '翼板展开后，仍需定向、检查日夜能源、采集并等待通信窗口下传。',
      facts: o ? [`已采集 ${o.collectedMB.toFixed(1)} MB · 已交付 ${o.deliveredMB.toFixed(1)} MB`, `待传 ${o.bufferMB.toFixed(1)} MB`] : [] },
    { id: 'P5', title: '卫星维护与任务结束', status: s.phase === 'life-failed' ? 'stopped' : s.phase === 'life-observed' ? 'complete' : at(!!l, LIFE_RUNNING),
      detail: s.phase === 'life-observed' ? '无推进分支完成：业务已结束，退役卫星仍保留，未完成空间处置。' : l?.mode === 'retired' ? '业务已结束；还可完成 10 分钟退役后观察，不能把退役当作主动离轨。' : s.phase === 'life-working' ? '已选择保留工作状态，尚未退役；当前停在检查点。' : '先维护能源，再选择保留工作或结束任务；无推进器就不能主动离轨。',
      facts: l && o ? [`本段已推进 ${(l.elapsedS / 60).toFixed(1)} min`, `电池 ${(o.energyJ / 3600).toFixed(1)} / ${(o.capacityJ / 3600).toFixed(0)} Wh · ${l.isolated ? '充电已隔离' : '充电回路连接'}`] : [] },
  ];
  const records: ObjectRecord[] = d ? [
    { id: 'carrier', title: '运载二级', historical: !!o, time: o?.carrierRecordTime ?? s.time,
      outcome: r?.outcome === 'surface-reference' ? '等效物体到达地表 · 参考结果' : r?.outcome === 'model-boundary' ? '记录停在 20 km 模型边界' : r?.outcome === 'stopped' || s.phase === 'deorbit-failed' ? '二级计算停止' : p2Done ? '离轨与简化钝化完成，尚无最终处置结论' : !q && o ? '未执行离轨，保留原记录' : '尚未完成处置',
      facts: [`${o ? '记录' : '当前'}高度 ${km(d.carrier.altitudeM)}`, `质量 ${kg(d.carrier.massKg)}`],
      boundary: o ? '这是进入卫星工作段时冻结的历史记录，不是当前二级位置；未推断它后来烧毁、落地或仍在哪里。' : '当前计算对象；模型尚未判定烧毁、落区或安全着陆。' },
    { id: 'satellite', title: 'E01 卫星', historical: false, time: s.time,
      outcome: l?.mode === 'retired' ? '已退役 · 未完成处置' : s.phase === 'ops-failed' || s.phase === 'life-failed' ? '本段停止 · 保留状态' : l?.isolated ? '结束任务 · 电能收尾' : l?.mode === 'maintaining' ? '低负载能源维护' : o ? '工作任务 · 尚未退役' : d.released ? '已释放 · 独立飞行' : '仍与二级连接',
      facts: [`当前高度 ${km(d.satellite.altitudeM)}`, `近地点 ${km(d.satellite.elements.periapsisM)} · 质量 ${kg(d.satellite.massKg)}`, ...(o ? [`电池 ${(o.energyJ / o.capacityJ * 100).toFixed(1)}% · 已交付 ${o.deliveredMB.toFixed(1)} MB`] : [])],
      boundary: l?.mode === 'retired' ? '无推进器，没有主动离轨；卫星仍保留在模型中，不预测长期衰减日期。' : '卫星的能源、业务状态与二级分开判断。它未接受二级的离轨推力。' },
  ] : [];
  const stopped = s.phase === 'aborted' || s.phase.endsWith('-failed');
  const next = stopped ? `当前计算停止：${s.message}` : s.phase === 'life-observed' ? '本次无推进教学分支已到终点。查看结果与模型边界，导出摘要并保存飞行，再进行使用体验验收。'
    : s.phase === 'ops-complete' ? '回到当前操作，选择“下一段：维护与退役”。沿用现有电量与轨道。'
    : s.phase === 'avoidance-complete' ? '回到当前操作，可先看二级离轨与再入，也可直接进入卫星工作。未走的路线会如实标为本次未执行。'
    : s.phase === 'reentry-surface' ? '参考下降已到地表。可继续卫星工作；材料存活和实际落点仍未计算。' : s.phase === 'reentry-complete' ? '20 km 是检查点。可继续等效物体到地表的参考下降，或转入卫星路线。'
    : '返回当前步骤，按条件继续操作。这里的状态来自计算记录，阅读摘要不会推进飞行或通过验收。';
  return { steps, records, next, stopped, branchFinished: s.phase === 'life-observed' };
}

export function taskResultMarkdown(s: FlightState, phaseLabel: string) {
  const report = postDeploymentProgress(s);
  return ['# 本次 E01 任务结果摘要', '', `任务时刻：${recordTime(s.time)}；阶段：${phaseLabel}。`,
    '本文件只描述导出时的教学计算结果，不是可恢复的飞行存档，不代表用户验收或真实任务遥测。', '', '## 部署后任务路径', '',
    ...report.steps.flatMap(step => [`### ${step.id} ${step.title} · ${PACKAGE_STATUS_TEXT[step.status]}`, '', step.detail, '', ...step.facts.map(f => `- ${f}`), '']),
    '## 两个对象分别在哪里', '', ...(report.records.length ? report.records.flatMap(record => [`### ${record.title}`, '', `${record.historical ? '历史记录' : '当前计算'}：${recordTime(record.time)}；${record.outcome}。`, '', ...record.facts.map(f => `- ${f}`), '', record.boundary, '']) : ['尚未进入部署段，没有二级与卫星的独立记录。', '']),
    '## 接下来', '', report.next, '', '需要恢复这次任务，请另用“飞行存档”保存并导出 JSON 文件。此摘要不会覆盖浏览器存档。', '',
    '## 共同边界', '', '近地点降低、简化钝化、到达 20 km 检查点、等效物体参考下降到 0 m、卫星业务结束，是不同结果。均不能单独证明完整空间处置。主动卫星离轨、材料解体、落区及长期寿命尚未实现。', ''].join('\n');
}
