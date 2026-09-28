import type { FlightState } from './liftoff';
import { LIFTOFF } from './liftoff';

export const PHENOMENA_SOURCES = [
  ['NASA · 动压的定义', 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/dynamic-pressure/'],
  ['NASA · 上升气动加热与喷流受热', 'https://ntrs.nasa.gov/api/citations/19700009523/downloads/19700009523.pdf'],
  ['NASA · 低压环境下的喷流膨胀', 'https://aviationsystems.arc.nasa.gov/publications/2014/NASA-TM-2014-216622.pdf'],
  ['NASA · 发射喷流与喷水抑声', 'https://www.nasa.gov/aeronautics/artemis-sls-launch-sim/'],
  ['NASA JPL · 水汽如何凝结成云', 'https://www.jpl.nasa.gov/edu/resources/project/make-a-cloud-in-a-bottle/'],
] as const;

/** Read-only presentation values. No new forces, temperatures or save fields. */
export function flightEnvironmentReading(state: FlightState) {
  const a = state.ascent;
  // E3 measures height from the pad, and its solver uses that same density origin.
  const density = a?.density ?? LIFTOFF.densityKgM3 * Math.exp(-Math.max(0, state.heightM) / LIFTOFF.scaleHeightM);
  const pressurePa = a?.pressurePa ?? 101325 * density / LIFTOFF.densityKgM3;
  const airSpeedMS = a?.airSpeedMS ?? Math.abs(state.speedMS);
  return { density, pressurePa, airSpeedMS, dynamicPressurePa: .5 * density * airSpeedMS ** 2,
    dragPowerW: Math.abs(state.dragN) * airSpeedMS, altitudeM: a?.altitudeM ?? state.heightM + LIFTOFF.padHeightM,
    powered: state.thrustN > 0 && state.throttle > 0 };
}

/** Art direction mapping, not a nozzle-flow solution or measured plume dimensions. */
export function plumeAppearance(pressurePa: number, throttle: number, stage: 0 | 1) {
  const rarefaction = 1 - Math.pow(Math.max(0, Math.min(1, pressurePa / 101325)), .32);
  const power = Math.max(0, Math.min(1, throttle));
  return { rarefaction, lengthM: (stage === 0 ? 30 : 20) * power * (1 + .9 * rarefaction),
    widthM: (stage === 0 ? 1.3 : 1) * (1 + 8 * rarefaction), opacity: power * (.8 - .25 * rarefaction) };
}

export const FLIGHT_PHENOMENA = [
  { id: 'pad', title: '点火与离台', seen: '喷口先出现亮焰，发射台附近烟雾向外扩散；火箭建立推力后离台。', why: '发动机把自身携带的推进剂变成高速喷流，不需要靠摩擦点燃。真实发射还会有强声压，喷水系统可用于抑声和降温。', scope: '喷焰、烟雾与点火同步；成分与扩散为示意。未计算声场、喷水或结构振动。' },
  { id: 'air', title: '穿过较稠密的大气', seen: '掠过低空云层；可打开青色气流线和橙色阻力箭头，查看动压与耗能。', why: '速度增加、密度下降，两者共同决定动压。全程动压的最高点才是 Max Q；它不是最高温度或必然出现白雾的时刻。压缩、激波和黏性作用会改变气体能量，并向箭体传热。', scope: '阻力参与运动；流线和可选的箭体头部着色是教学辅助。未求解激波、结构载荷或表面温度。' },
  { id: 'thin', title: '空气变稀，喷流展开', seen: '天空渐暗、云层留在下方；持续点火时，喷流逐渐展开，周围气流提示变淡。', why: '外界压力下降，喷流可在喷口外继续膨胀。实际形状还取决于喷管、燃料与工况；发动机自带氧化剂，进入稀薄大气后仍能工作。', scope: '膨胀效果读取本次压力与节流量，尺寸和颜色是示意；星点亮度也经过展示调整。' },
  { id: 'separation', title: '燃尽、分级与再次点火', seen: '一级燃尽时喷焰消失；两级分开，二级点火后出现自己的喷流。', why: '燃尽与关机由推进剂和控制状态决定。分离冲量使两级获得不同速度，正常分级不等于爆炸。', scope: '两级分别计算运动。没有凭空添加爆炸火球；一级再入、烧蚀与回收尚未模拟。' },
  { id: 'coast', title: '关机入轨与卫星释放', seen: '关机后喷焰消失，箭体继续运动；开舱释放后，卫星和二级各自绕地飞行。', why: '继续前进不需要持续喷火。地球引力使航天器持续自由落体；近地轨道仍有极稀薄大气，不能把空间当成完全无气体。', scope: '独立运动和部署已接入。长期稀薄大气阻力、辐射、热平衡与姿态控制需要后续模型。' },
] as const;
export type PhenomenonId = typeof FLIGHT_PHENOMENA[number]['id'];
export function currentPhenomenon(state: FlightState): { id: PhenomenonId; title: string; description: string } {
  const r = flightEnvironmentReading(state);
  if (state.phase === 'aborted' || state.phase.endsWith('-failed')) return { id: state.deployment || state.orbit ? 'coast' : state.ascent ? 'air' : 'pad', title: '任务已停止', description: '画面保留停止时刻；先查看任务原因，冻结画面不表示发动机仍在持续耗油。' };
  if (state.satelliteDisposal) return { id: state.satelliteDisposal.entryAt != null ? 'air' : 'coast', title: state.phase === 'disposal-burn' ? '卫星自身点火 · 降低轨道' : state.satelliteDisposal.entryAt != null ? '卫星等效物体 · 再入参考下降' : '结束业务 · 保留离轨控制能力', description: 'E02 从发射前携带推进设备。推力、燃料与轨迹共同计算；再入包络是热流假彩色，质点不代表完整卫星或真实残骸。二级仅保留历史记录。' };
  if (state.lifecycle) return { id: 'coast', title: state.lifecycle.mode === 'retired' ? '退役在轨 · 尚未处置' : state.lifecycle.isolated ? '电源隔离 · 电能收尾' : '能源维护 · 无变轨推力', description: '卫星继承原轨道和电量，当前没有推进器。停止业务不等于离轨；储能处理、运动与任务状态分别说明。' };
  if (state.operations) return { id: 'coast', title: state.operations.transmitting ? '通信窗口 · 正在下传' : state.operations.shadow ? '地影中 · 电池供电' : '日照中 · 太阳翼发电', description: '发电、电池与数据库存随任务时间计算；地面站仰角达到 10° 才能下传。当前只推进卫星，二级为历史记录。' };
  if (state.reentry) return { id: 'air', title: state.phase === 'reentry-complete' ? '停在教学边界 · 存活情况未判定' : '无推力下降 · 大气减速与受热', description: '橙色迎风包络读取估算热流，属于放大的假彩色提示；不是发动机喷焰，也不表示已烧毁。卫星独立在轨。' };
  if (state.phase === 'deorbit-burn') return { id: 'thin', title: '反向点火 · 降低近地点', description: '发动机喷流向前排出，对二级产生逆向推力。当前高度与预测近地点不同；卫星不接受此推力。' };
  if (state.phase === 'deorbit-passivating') return { id: 'coast', title: '泄放剩余物质 · 无发动机推力', description: '放大的蓝白粒子表示对称排放，理想净反冲为零；压力与电能按简化模型降低，不是再入火焰。' };
  if (state.phase === 'avoidance-burn') return { id: 'thin', title: '二级侧向点火 · 卫星保持滑行', description: '喷流沿二级尾部排出，推力朝相反方向；推进剂减少，二级轨道随之变化。这次机动尚未安排离轨。' };
  if (state.phase === 'avoidance-align' || state.phase === 'avoidance-armed') return { id: 'coast', title: '先转向，再点火', description: '二级朝向改变，卫星不跟着转动；此时发动机关闭。这里使用理想姿态辅助，尚未计算姿态力矩和控制耗能。' };
  if (state.deployment || state.orbit && !r.powered) return { id: 'coast', title: '关机后，仍在绕地运动', description: '推力为零，喷流消失；运动由已有速度和地球引力继续驱动。' };
  if (['stage-ready', 'separating'].includes(state.phase)) return { id: 'separation', title: state.phase === 'stage-ready' ? '一级燃尽 · 喷流消失' : '两级分开 · 等待二级点火', description: '正常分级没有爆炸火球；二级建立推力后，喷流才重新出现。' };
  if (state.phase === 'ready' || state.phase === 'countdown') return { id: 'pad', title: '点火之前', description: '尚未产生发动机喷流。点火后先建立推力，再释放支撑。' };
  if (!state.ascent) return { id: 'pad', title: '喷焰来自发动机', description: '喷口亮焰与地面扩散烟雾由点火驱动，此时不是“空气摩擦起火”。' };
  if (r.altitudeM < 25000) return { id: 'air', title: '空气阻力与气动加热', description: '速度和空气密度共同影响动压；气动加热确实存在，但箭体不一定发光。' };
  return { id: 'thin', title: '稀薄大气 · 喷流膨胀', description: '气压降低，喷流逐渐展开；空气阻力减弱，云层留在低空。' };
}
