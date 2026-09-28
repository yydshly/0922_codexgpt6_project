import type { FlightState } from './liftoff';
import { OPS, OPS_RUNNING } from './satelliteOperations';
import { solarPointingReading } from './solarPointing';

/** Read-only interpretations: never advance, repair or replace the simulation. */
export function powerExplanation(s: FlightState, paused: boolean) {
  const solar = solarPointingReading(s), o = s.operations;
  if (!solar || !o) return null;
  const running = OPS_RUNNING.includes(s.phase) && !paused;
  const differenceW = o.generationW - o.loadW;
  const batteryAction = solar.supplyKind === 'unserved' ? '无储能可补足'
    : differenceW < -1e-6 ? '向负载补电'
      : solar.supplyKind === 'full' ? '已满，不再充入'
        : differenceW > 1e-6 ? '接收剩余电力' : '不充不放';
  return { ...solar, differenceW, batteryAction, running,
    status: running ? '随任务更新' : paused && OPS_RUNNING.includes(s.phase) ? '已暂停 · 该帧关系' : '检查点 · 该帧关系',
    result: solar.supplyKind === 'unserved' ? `负载缺口 ${Math.max(0, -differenceW).toFixed(0)} W，当前不能完全供电。`
      : differenceW < -1e-6 ? `发电比需求少 ${(-differenceW).toFixed(0)} W，差额需要电池补充。`
        : solar.supplyKind === 'full' ? `多出的 ${differenceW.toFixed(0)} W 不再存入电池。`
          : differenceW > 1e-6 ? `扣除负载后余下 ${differenceW.toFixed(0)} W，可用于充电。` : '发电与需求相等，当前没有充放电余量。',
  };
}

export function observationExplanation(s: FlightState, paused: boolean) {
  const o = s.operations;
  if (!o || !s.phase.startsWith('ops-')) return null;
  const complete = o.deliveredMB >= OPS.targetMB - 1e-8 && o.bufferMB <= 1e-8;
  const running = OPS_RUNNING.includes(s.phase) && !paused;
  const station = o.links.find(l => l.id === o.activeStation && l.visible);
  const shortfall = o.energyJ <= 0 && o.generationW < o.loadW;
  const reason = s.phase === 'ops-failed' ? '本段已停止；未交付的数据保留在机上，请查看停止原因。'
    : complete ? '地面已收到本次目标数据；完成交付不代表卫星已退役或离轨。'
      : shortfall ? '供电不足，不能保证采集或下传；机上数据不会自动变成地面成果。'
        : o.reserveMode ? '低电量保护中，暂停采集和下传，优先维持基础用电。'
          : s.phase === 'ops-downlink' ? station && o.transmitting
            ? `${station.name} 满足可见条件，机上数据通过窗口传给地面。`
            : '当前无可用下传窗口，数据留在机上；继续运行才能等待后续窗口。'
          : s.phase === 'ops-cycle' ? o.collectedMB >= OPS.targetMB - 1e-8
            ? '目标数据已收集；仍在完成一圈日夜观察，尚未开启下传。'
            : o.shadow ? '卫星在地影中，本教学任务暂停采集；已采集数据仍保存在机上。'
              : '日照与电量条件满足时采集并保存；本阶段不会直接传到地面。'
          : s.phase === 'ops-data-ready' ? '采集已完成，机上仍有待传数据；下一步申请下传窗口。'
            : '先完成太阳翼定向与能源检查，再开始对地观测。';
  return { reason, collecting: running && o.collecting && !shortfall,
    transmitting: running && o.transmitting && !!station && !shortfall,
    status: running ? '随任务更新' : '时间冻结 · 数据量不变', complete };
}

/** Work duration must stop at handoff: operations.elapsedS continues in later stages. */
export function satelliteTaskReceipt(s: FlightState) {
  const o = s.operations;
  if (!o) return null;
  const end = s.satelliteDisposal?.startTime ?? s.lifecycle?.startTime ?? s.time;
  const delivered = o.deliveredMB >= OPS.targetMB - 1e-8 && o.bufferMB <= 1e-8;
  const q = s.satelliteDisposal, l = s.lifecycle;
  const disposition = q ? q.groundAt !== null ? 'E02 · 等效物体已到达地表参考面'
    : s.phase === 'disposal-failed' ? 'E02 · 处置中止，不能判定已完成'
      : q.entryAt !== null ? 'E02 · 已进入参考大气，下降尚未结束'
        : q.burnAt !== null ? 'E02 · 已开始离轨机动，尚未到达地表'
          : 'E02 · 正在核对或准备离轨，尚未实施'
    : l?.mode === 'retired' ? 'E01 · 已退役仍在轨，未完成处置'
      : l ? 'E01 · 维护或结束流程中，尚未退役'
        : '尚未进入任务末期处理';
  return { start: o.startTime, end, duration: Math.max(0, end - o.startTime),
    collectedMB: o.collectedMB, bufferMB: o.bufferMB, deliveredMB: o.deliveredMB,
    delivered, historical: !!(l || q), disposition,
    outcome: delivered ? '目标数据已交付' : '目标数据尚未全部交付',
  };
}

const MARKERS: Record<string, { label: string; kind: 'power' | 'data' }> = {
  '卫星进入几何地影，太阳翼发电降为零': { label: '进入地影', kind: 'power' },
  '卫星离开几何地影，恢复日照发电': { label: '恢复日照', kind: 'power' },
  '启动日夜与一次对地观测任务': { label: '开始观测', kind: 'data' },
  '申请教学地面站下传': { label: '申请下传', kind: 'data' },
};
export function operationsEventMarkers(s: FlightState) {
  const o = s.operations;
  if (!o) return [];
  const duration = o.samples.at(-1)?.t ?? 0;
  return s.events.flatMap(event => {
    const marker = MARKERS[event.label], t = event.time - o.startTime;
    return marker && t >= 0 && t <= duration ? [{ ...marker, t }] : [];
  });
}
