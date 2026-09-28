import type { FlightState } from './liftoff';
import { dot, norm } from './ascent';
import { OPS } from './satelliteOperations';

/** Geometry is 0–180 degrees; the power model separately clips the rear face to zero. */
export function solarPointingReading(s: FlightState) {
  const o = s.operations;
  if (!o || !s.phase.startsWith('ops-') || !s.deployment?.released) return null;
  const cosine = Math.max(-1, Math.min(1, dot(o.arrayNormal, o.sunDirection) / (norm(o.arrayNormal) * norm(o.sunDirection))));
  const angleDeg = Math.acos(cosine) * 180 / Math.PI;
  const aligned = angleDeg < .1;
  const progress = Math.max(0, Math.min(1, (s.time - o.startTime) / OPS.alignS));
  const alignment = s.phase === 'ops-ready' ? '尚未开始定向' : aligned ? '板面已对准太阳方向' : '太阳翼转向中';
  const deficit = o.generationW < o.loadW - 1e-6;
  const supplyKind = deficit && o.energyJ <= 0 ? 'unserved' : o.shadow ? 'eclipse'
    : cosine <= 0 ? 'rear' : deficit ? 'deficit' : Math.abs(o.generationW - o.loadW) <= 1e-6 ? 'balanced'
      : o.energyJ >= o.capacityJ ? 'full' : 'charging';
  const supplyTitle = { unserved: '电力不足：电池已耗尽', eclipse: '地影中：电池供电', rear: '发电面背向太阳：电池供电',
    deficit: '发电不足：电池补充', balanced: '发电与用电平衡', full: '电池已满：剩余功率不再接收', charging: '太阳翼供电：余量为电池充电' }[supplyKind];
  const supply = supplyKind === 'unserved' ? '发电不足且电池已耗尽；当前不能供应全部负载，不能标为正常供电。'
    : o.shadow ? '地球遮挡阳光，发电为 0 W；当前由电池供电。'
    : cosine <= 0 ? '发电正面背向太阳，余弦有效系数为 0；当前由电池供电。'
      : deficit ? '阳光可达，但发电小于用电；差额由电池补充。'
        : supplyKind === 'balanced' ? '发电恰好供应负载，当前没有剩余功率充电。'
          : supplyKind === 'full' ? '阳光可达，太阳翼供应负载；电池已满，不再接收剩余功率。'
            : '阳光可达，太阳翼供电；剩余功率可用于充电，满电后不再接收。';
  return { angleDeg, aligned, progress, alignment, supplyKind, supplyTitle, supply, cosine, shadow: o.shadow,
    generationW: o.generationW, loadW: o.loadW, batteryPercent: o.energyJ / o.capacityJ * 100 };
}
