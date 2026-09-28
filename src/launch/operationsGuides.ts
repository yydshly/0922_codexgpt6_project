import type { FlightState } from './liftoff';

export const DEFAULT_OPERATIONS_GUIDES = { power: true, observation: true, contact: true };
export type OperationsGuides = typeof DEFAULT_OPERATIONS_GUIDES;

/** Only the active work stage supplies live readings; later stages retain historical records. */
export function operationsGuideReading(s: FlightState) {
  const o = s.operations;
  if (!o || !s.deployment?.released || !s.phase.startsWith('ops-')) return null;
  const station = o.links.find(l => l.id === o.activeStation && l.visible)
    ?? [...o.links].filter(l => l.visible).sort((a, b) => b.elevationDeg - a.elevationDeg)[0];
  const transmitting = !!station && o.transmitting && station.id === o.activeStation;
  return {
    station, transmitting, collecting: o.collecting, shadow: o.shadow,
    power: o.shadow ? '地影中 · 电池供电，箭头仅指向太阳' : `日照中 · 太阳翼发电 ${o.generationW.toFixed(0)} W`,
    observation: o.collecting ? '正在采集 · 指向星下点，不表示拍摄面积' : '未采集 · 虚线仅表示星下点方向',
    contact: station ? `${station.name} · ${station.elevationDeg.toFixed(1)}° · ${transmitting ? '正在下传' : '可见，未下传'}` : '没有可见地面站 · 不画通信连线，数据留在机上',
  };
}
