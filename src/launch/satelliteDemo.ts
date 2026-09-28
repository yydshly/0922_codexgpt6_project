import type { FlightState } from './liftoff';
import { OPS } from './satelliteOperations';

export const SATELLITE_DEMO_STEPS = ['定向与供电', '对地观测与保存', '窗口下传', '核对交付'] as const;

/** Presentation-only wording: preserve journalled state messages for strict save replay. */
export function satelliteDeliveryExplanation(s: FlightState) {
  if (s.phase !== 'ops-complete' || !s.operations) return null;
  return `${s.operations.deliveredMB.toFixed(0)} MB 教学数据已交付，卫星当前仍在轨。${s.satelliteEquipment
    ? 'E02 已预装离轨设备，下一步准备使用自身推进器离轨；此刻尚未执行离轨点火。'
    : 'E01 没有推进器，下一步进入能源维护与无推进退役；结束业务后仍会留在轨道上。'}`;
}

/** Presentation reads the existing task. It never awards data or invents a link. */
export function satelliteDemoCue(s: FlightState) {
  const o = s.operations;
  if (!o || !s.deployment?.released || !s.phase.startsWith('ops-') || s.phase === 'ops-failed') return null;
  if (s.phase === 'ops-complete') return {
    step: 3, view: 'orbit', title: '地面收到了什么？',
    detail: `本次地面已收 ${o.deliveredMB.toFixed(0)} MB，机上剩余 ${o.bufferMB.toFixed(0)} MB。接下来进入维护或任务末期处置。`,
  } as const;
  if (s.phase === 'ops-downlink') return {
    step: 2, view: 'orbit', title: o.transmitting ? '正在把数据送到地面' : '保留数据，等待下传条件',
    detail: o.transmitting
      ? '绿实线连接当前下传站：机上数据减少，地面已收增加。采集与交付是两个步骤。'
      : o.reserveMode ? '当前处于低电量保护，暂不下传。先恢复电量，数据仍保存在机上。'
        : '当前没有有效下传窗口。卫星继续绕地，等教学站进入可见范围后才传送；没有绿实线不代表画面故障。',
  } as const;
  if (['ops-cycle', 'ops-data-ready'].includes(s.phase)) return {
    step: 1, view: 'surface', title: '看清卫星此刻朝向哪片地表',
    detail: s.phase === 'ops-data-ready' ? '日夜观察完成，数据保存在机上。橙色轮廓仍是当前几何范围，下一步才向地面交付。'
      : o.collecting ? `正在以 ${OPS.observeMBs} MB/s 计入教学数据；橙色轮廓随卫星移动。可切换窄、中、宽比较范围。`
        : o.collectedMB >= OPS.targetMB ? '本次采集量已足够，数据留在机上；继续观察一圈日夜。移动的轮廓不表示仍在采集。'
          : o.shadow ? '卫星进入地影，当前教学采集暂停。橙色轮廓只保留为方向与几何范围参考。'
            : '当前处于低电量保护，暂停采集；等待供电条件恢复。',
  } as const;
  return {
    step: 0, view: 'power', title: '看太阳翼怎样转向太阳',
    detail: s.phase === 'ops-power-ready' ? '定向完成，先核对两种箭头和夹角。对准不保证此刻发电：地影中仍靠电池，稍后沿轨道回到日照区。' : '近看蓝色发电面与太阳翼转动。黄箭头指向太阳，蓝箭头表示板面朝向；卫星主体与太阳翼分别定向。',
  } as const;
}

/** Slow down visible work even in fast-demo mode; long idle coasts remain accelerated. */
export function satelliteDemoPacing(s: FlightState) {
  const o = s.operations;
  const observingStart = s.phase === 'ops-cycle' && o?.cycleStart != null && s.time - o.cycleStart < 120;
  const visibleWork = !!o && (s.phase === 'ops-align' || s.phase === 'ops-cycle' && (observingStart || o.collecting)
    || s.phase === 'ops-downlink' && o.transmitting);
  const holdS = ['ops-ready', 'ops-power-ready', 'ops-data-ready', 'ops-complete'].includes(s.phase) ? 6 : null;
  return { visibleWork, holdS };
}
