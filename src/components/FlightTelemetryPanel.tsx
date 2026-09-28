import { useEffect, useRef, useState } from 'react';
import type { FlightState } from '../launch/liftoff';
import type { VehicleConfig } from '../launch/vehicle';
import { flightTelemetry, FLIGHT_RUNNING_PHASES, telemetryNumber as number } from '../launch/flightTelemetry';
import { flightPhaseName, flightTime } from './LaunchControl';
import { IgnitionSequence } from './IgnitionSequence';
import { flightForceInsight } from '../launch/flightForces';
import './FlightTelemetryPanel.css';

interface Props { state: FlightState; config: VehicleConfig; ready: boolean; paused: boolean; forces: boolean; forcesVisible: boolean; onForces: (value: boolean) => void; onPause: () => void; onClose: () => void; onPhenomena: () => void }
export function FlightTelemetryPanel({ state: s, config, ready, paused, forces, forcesVisible, onForces, onPause, onClose, onPhenomena }: Props) {
  const [tab, setTab] = useState<'motion' | 'air' | 'engine'>('air'), close = useRef<HTMLButtonElement>(null);
  const r = flightTelemetry(s, config), running = FLIGHT_RUNNING_PHASES.includes(s.phase), status = !ready ? '等待计算就绪' : running ? paused ? '已暂停 · 保留当前读数' : '飞行中 · 实时更新' : s.phase === 'ready' ? '准备中 · 发动机未启动' : '检查点或停止状态 · 读数已冻结';
  const insight = flightForceInsight(s);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; close.current?.focus(); return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  const metric = (id: string, label: string, value: number | null, unit: string, note?: string, digits = 2) => <div key={id}><dt>{label}</dt><dd data-telemetry={id}>{value === null ? '尚未计算' : number(value, digits)} {value !== null && <small>{unit}</small>}</dd>{note && <p>{note}</p>}</div>;
  return <section className="flight-telemetry-panel" aria-label="飞行实时参数">
    <header><div><small>FLIGHT / TELEMETRY</small><h2>全程飞行参数</h2></div><button ref={close} onClick={onClose} aria-label="关闭飞行参数">收起</button></header>
    <div className="telemetry-current"><strong data-telemetry-time>{flightTime(s.time)}</strong><span data-telemetry-status>{status}</span><small>{flightPhaseName(s)}</small><p>参数对象：{r.object}。{s.operations ? '当前推进卫星；二级为独立标时的历史记录。' : s.deployment ? '跟随卫星时，这里仍显示运载二级。' : '与主画面共用任务时间。'}</p>{running && <button disabled={!ready} onClick={onPause}>{paused ? '继续飞行' : '暂停飞行'}</button>}</div>
    <p className="telemetry-live-note">打开、关闭和切换参数不会自动暂停；需要停下来阅读时，点击「暂停飞行」。以下为本次教学计算，不是实测遥测。</p>
    {ready && !s.operations && <section className="telemetry-force-guide"><h3 data-force-insight>{insight.title}</h3><p>{insight.text}</p><label><input type="checkbox" checked={forces} onChange={e => onForces(e.target.checked)}/>在主画面显示三维受力图</label>{forces && !forcesVisible && <button onClick={() => onForces(true)}>回到运载火箭近景查看受力 →</button>}{forces && <p>图例显示力的大小；方向看箭头。读数与主画面共用同一时刻。</p>}<details><summary>受力与箭长的含义 · 来源</summary><p>各力按本帧同一比例画长短；缩放比例会随时间调整，小于最大力 1% 的箭头省略，数值保留。箭头并排移开便于阅读，不表示真实作用点。</p><p>推力、引力、阻力沿用本次模型的方向和数值；地面约束只在支撑未释放时存在。本模型尚未计算升力、气动力矩或结构变形，受力图也不新增这些计算。合力决定加速度，速度并不需要与合力同向。</p><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/four-rocket-forces/" target="_blank" rel="noreferrer">NASA · 火箭受力与矢量合成 ↗</a></details></section>}
    <div className="telemetry-tabs" role="group" aria-label="参数分类">{([['motion', '运动与受力'], ['air', '空气与受热'], ['engine', '动力与燃料']] as const).map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
    {!ready ? <p>计算尚未就绪，暂不显示数值。</p> : <>
      {tab === 'motion' && <><dl className="telemetry-grid">
        {metric('altitude', '距地球椭球面的高度', r.altitudeM / 1000, 'km', '离台段采用发射台局部高度加平台高度。', 3)}
        {metric('vertical-speed', '向上速度', r.verticalMS, 'm/s', '正值向上，负值下降。')}
        {metric('air-speed', '相对空气速度', r.airSpeedMS, 'm/s', '用于空气阻力；上升段大气随地球共转。')}
        {metric('horizontal-speed', '相对共转空气的水平速度', r.horizontalMS, 'm/s')}
        {metric('inertial-speed', '地心惯性速度', r.inertialMS, 'm/s', !s.ascent ? '离台段只计算竖直运动。' : undefined)}
        {metric('acceleration', '合加速度向上分量', r.upwardAccelerationMS2, 'm/s²', '含重力，不是乘客感受的过载。')}
        {metric('thrust', '发动机推力', r.thrustN / 1000, 'kN')}
        {metric('weight', '地球引力大小', r.weightN / 1000, 'kN')}
        {metric('drag', '空气阻力大小', r.dragN / 1000, 'kN', '方向与相对空气运动相反。')}
        {metric('gravity', '当地引力加速度', r.gravityMS2, 'm/s²')}
        {metric('twr', '瞬时推重比', r.twr, '', '推力 ÷ 引力；支撑锁定时大于 1 也不离台。')}
        {metric('support', '地面约束反力 · 向上为正', r.supportN / 1000, 'kN', r.held ? '负值表示支撑把火箭向下锁住。' : '已离台，无地面约束力。')}
      </dl><p className="telemetry-model-note">推力、引力和阻力有各自方向；转弯后不能简单用三个大小相减当成净加速度。这里不计算升力、侧风或结构弯曲。</p></>}
      {tab === 'air' && <><dl className="telemetry-grid">
        {metric('density', '空气密度 ρ', r.density, 'kg/m³', '每立方米空气的质量；不是氧气占比。', 4)}
        {metric('density-percent', '相对海平面密度', r.densityFraction * 100, '%', '以模型 1.225 kg/m³ 为 100%。', 3)}
        {metric('pressure', '环境静压 p', r.pressurePa / 1000, 'kPa', '与迎风动压不同。', 3)}
        {metric('q', '气流动压 q', r.dynamicPressurePa / 1000, 'kPa', 'q = ½ρv²；不是温度。')}
        {metric('air-speed', '相对空气速度 v', r.airSpeedMS, 'm/s')}
        {metric('drag', '空气阻力 D', r.dragN / 1000, 'kN')}
        {metric('drag-power', '阻力耗能率 D × v', r.dragPowerW / 1e6, 'MW', '运动机械能的耗散率，不等于传入箭体的热功率。', 3)}
        {metric('cd', '阻力系数 Cd', r.cd, '', '固定教学参数，未随马赫数变化。')}
        {metric('area', '阻力参考面积 A', r.areaM2, 'm²', s.operations ? '当前卫星的等效参考面积。' : '按直径 4.3 m 整流罩截面；沿用当前各阶段模型。')}
      </dl><section className="telemetry-thermal"><h3>“热度”需要分开看</h3><dl className="telemetry-grid">
        {metric('air-temperature', '周围空气温度', r.ambientTemperatureK, 'K', r.thermalModel ? '本地标准参考大气，非实际天气或激波后气温。' : '当前指数大气没有温度随高度的模型。')}
        {metric('surface-temperature', '当前对象表面温度', r.surfaceTemperatureK, 'K', '还需要材料、热容量、初温及冷却条件。')}
        {metric('heat-flux', r.thermalModel ? '参考驻点冷壁对流热流' : '进入表面的热流密度', r.heatFluxWm2, 'W/m²', r.thermalModel ? '等效钝体估算；仅高度 ≤80 km 且 Mach ≥5 输出，空白不是零。' : '还需要外形、局部流动与传热模型。')}
        {metric('mach', '马赫数', r.mach, '', r.thermalModel ? '86 km 以下采用固定组成理想气体音速近似，高空留空。' : '缺少当地温度和音速，暂不输出。')}
      </dl><p>尚未计算不代表为零或没有受热。喷焰颜色、迎风着色和动压都不能作为温度计。湿度、风场与凝结条件也未接入。</p></section><button className="telemetry-more" onClick={onPhenomena}>暂停并查看现象、曲线与来源 →</button><p className="telemetry-model-note">{r.thermalModel ? '当前对象的空气密度、静压和环境温度来自本地标准大气表；热流为等效钝体估算，不是天气或真实再入预报。' : '空气密度和静压来自既有指数教学大气；高空仍显示模型极小值，不因显示取整而写成真空。它不是实测天气，也不适用于精确热层或再入预报。'}</p></>}
      {tab === 'engine' && <><dl className="telemetry-grid">
        {metric('mass', '当前所示载具质量', r.massKg / 1000, 't', '分级、释放卫星会改变该对象质量。', 3)}
        {metric('throttle', '发动机指令水平', r.throttle * 100, '%', '点火建压时从 0 增至 100%；不是燃烧室压力。', 1)}
        {metric('flow', '当前推进剂质量流率', r.flowKgS, 'kg/s', '燃烧中的当前级；关机后为 0。')}
        {metric('thrust', '当前发动机推力', r.thrustN / 1000, 'kN')}
        {s.operations ? metric('satellite-fuel', '卫星剩余推进剂', r.satelliteFuelKg, 'kg', r.satelliteFuelKg===null?'本型号没有推进系统。':'燃烧与对称排放分别记账。',3) : <>
        {metric('booster-fuel', s.ascent?.stage === 1 ? '已分离一级的剩余推进剂' : '一级剩余推进剂', r.boosterFuelKg / 1000, 't', undefined, 3)}
        {metric('upper-fuel', '二级剩余推进剂', r.upperFuelKg / 1000, 't', undefined, 3)}
        {metric('pitch', '箭轴相对当地水平仰角', r.pitchDeg, '°', '90° 表示竖直；入轨后为参考朝向，不是攻角。')}</>}
      </dl>{!s.ascent && <IgnitionSequence state={s}/>}<p className="telemetry-model-note">本面板只读取已应用的载具与本次计算。切换参数、镜头和图层不会改变燃料；暂停保留瞬时推力，表示时间冻结，不表示发动机已关机。</p></>}
    </>}
  </section>;
}
