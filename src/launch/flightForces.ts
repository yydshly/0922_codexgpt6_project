import { add, airVelocity, dot, norm, rotateEarth, scale, unit, type V3 } from './ascent';
import { baseBasis } from './coordinates';
import type { FlightState } from './liftoff';

export const FORCE_KINDS = [
  { id: 'thrust', name: '发动机推力', color: '#80e4b4' },
  { id: 'gravity', name: '地球引力', color: '#83bdff' },
  { id: 'drag', name: '空气阻力', color: '#ffb46d' },
  { id: 'support', name: '地面约束', color: '#d5b6fc' },
] as const;
export type ForceId = typeof FORCE_KINDS[number]['id'];
export interface FlightForce { id: ForceId; name: string; color: string; localN: V3; magnitudeN: number; arrowLengthM: number; drawn: boolean }
const basis = baseBasis();
const axes = [basis.east.toArray(), basis.up.toArray(), basis.south.toArray()] as V3[];
const localVector = (inertial: V3, time: number): V3 => { const fixed = rotateEarth(inertial, -time); return axes.map(axis => dot(fixed, axis)) as V3; };

/** Forces from the current solver state, in the existing east/up/south render basis. */
export function flightForces(s: FlightState): FlightForce[] {
  const a = s.ascent;
  const vectors: Record<ForceId, V3> = a ? {
    thrust: localVector(scale(a.direction, s.thrustN), s.time),
    gravity: localVector(scale(unit(a.position), -s.weightN), s.time),
    drag: localVector(scale(unit(add(a.velocity, scale(airVelocity(a.position), -1))), -Math.abs(s.dragN)), s.time),
    support: [0, 0, 0],
  } : {
    thrust: [0, s.thrustN, 0], gravity: [0, -s.weightN, 0], drag: [0, -s.dragN, 0],
    support: [0, s.released ? 0 : s.weightN + s.dragN - s.thrustN, 0],
  };
  const maximum = Math.max(1, ...Object.values(vectors).map(norm));
  return FORCE_KINDS.map(kind => { const magnitudeN = norm(vectors[kind.id]), relative = magnitudeN / maximum; return {
    ...kind, localN: vectors[kind.id], magnitudeN,
    // One linear scale for the current frame. Small nonzero forces remain in numeric readouts.
    arrowLengthM: 36 * relative, drawn: magnitudeN > 0 && relative >= .01,
  }; });
}

export function flightForceInsight(s: FlightState) {
  if (s.reentry) return { title: '无推力下降 · 引力与阻力共同作用', text: '引力指向地心，阻力反向于相对共转空气的速度。阻力减速度与包含重力的总加速度不同；驻点热流也不能直接从阻力耗能率换算。' };
  if (s.phase === 'deorbit-burn') return { title: '反向推力降低轨道能量', text: '推力逆着分析起点的速度方向，关机后的参考近地点降低；这不是直接向地心坠落的动画。' };
  if (s.phase === 'deorbit-passivating') return { title: '对称泄放 · 理想净反冲为零', text: '两个方向的喷流反冲理想抵消，质量仍随排放减少；读数不包含阀门不对称和真实流场。' };
  if (s.phase === 'avoidance-burn') return { title: '侧向推力改变二级的轨道', text: '推力沿二级新的朝向，引力仍指向地心。卫星没有获得这次推力；两者的轨道开始产生额外差异。' };
  if (s.phase === 'aborted' || s.phase.endsWith('-failed')) return { title: '任务已停止，先看停止原因', text: s.message };
  if (!s.released && !s.ascent) return s.thrustN > 0
    ? { title: '已经点火，为什么还不升起？', text: '地面约束力抵消推力与引力的合力。推力超过引力时，约束会向下锁住火箭；到 T=0 满足条件后才释放。' }
    : s.phase === 'ignition' ? { title: '点火指令刚发出，推力从零建立', text: '当前处于推力建立的起点，接下来的物理步会逐渐增加推力；支撑仍然锁定。' }
    : { title: '未点火时，发射台托住整箭', text: '推力为零，地面支撑抵消引力。发射前准备与倒计时不表示发动机已经产生推力。' };
  if (s.phase === 'stage-ready' || s.phase === 'separating') return { title: s.phase === 'stage-ready' ? '一级燃尽，运动没有立刻停止' : '分离后，等待二级建立推力', text: '此刻推力为零，仍有引力和阻力。已有速度让载具继续运动；二级点火后，推力箭头才重新出现。' };
  if (s.thrustN <= 0) return { title: '关机后，仍有引力', text: s.orbit ? '已有速度与指向地心的引力共同决定后续轨迹。推力为零不等于停在太空；实际绕地结果仍由任务验证。' : '喷焰消失不会让速度瞬间变成零；后续运动由当前速度、引力与阻力决定。' };
  return s.ascent ? { title: '转弯后，三个力不再共线', text: '推力沿当前制导方向，引力指向地心，阻力反向于相对空气的速度。空气变稀与速度变化共同决定动压，不能仅凭高度判断阻力。' }
    : { title: '支撑释放，净力让火箭加速', text: '现在推力向上，引力和上升中的阻力向下；它们的合力决定加速度。阻力还随空气密度和速度变化。' };
}
