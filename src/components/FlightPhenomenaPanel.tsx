import { useEffect, useRef } from 'react';
import type { FlightState } from '../launch/liftoff';
import { currentPhenomenon, flightEnvironmentReading, FLIGHT_PHENOMENA, PHENOMENA_SOURCES } from '../launch/flightPhenomena';
import type { EnvironmentOptions } from '../launch/flightEnvironment';
import reentryDocument from '../../docs/REENTRY.md?url';
import disposalDocument from '../../docs/SATELLITE-DISPOSAL-CHOICES.md?url';
import phenomenaDocument from '../../docs/FLIGHT-PHENOMENA.md?url';
import { AscentRecordChart } from './AscentRecordChart';
import type { AscentRecordData } from '../launch/ascentRecord';
import './FlightPhenomenaPanel.css';

interface Props { state: FlightState; record: AscentRecordData; options: EnvironmentOptions; onChange: (options: EnvironmentOptions) => void; onClose: () => void; onEnvironment: () => void }
export function FlightPhenomenaPanel({ state, record, options, onChange, onClose, onEnvironment }: Props) {
  const close = useRef<HTMLButtonElement>(null), chartHost = useRef<HTMLDivElement>(null), r = flightEnvironmentReading(state), current = currentPhenomenon(state);
  const thermal = state.satelliteDisposal ?? (!state.operations ? state.reentry : undefined);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; close.current?.focus(); return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  return <section className="flight-phenomena-panel" aria-label="沿途现象">
    <header><div><small>FLIGHT / PHENOMENA</small><h2>{state.satelliteDisposal ? 'E02 · 点火、减轨与再入' : thermal ? '二级 · 下降与受热' : '从喷焰，到无动力飞行'}</h2></div><button ref={close} onClick={onClose} aria-label="关闭沿途现象">关闭</button></header>
    <div className="phenomena-current"><small>当前 · T {state.time >= 0 ? '+' : '−'} {Math.abs(state.time).toFixed(1)} s</small><h3>{current.title}</h3><p>{current.description}</p><small>打开说明已暂停任务；关闭后请在操作区继续。</small><button className="record-jump" onClick={() => chartHost.current?.scrollIntoView({ block: 'start' })}>回看本次上升曲线 ↓</button></div>
    <dl className="phenomena-readings">
      <div><dt>相对空气速度</dt><dd data-phenomena-speed>{r.airSpeedMS.toFixed(1)} <small>m/s</small></dd></div>
      <div><dt>当前动压 q</dt><dd data-phenomena-q>{(r.dynamicPressurePa / 1000).toFixed(2)} <small>kPa</small></dd></div>
      <div><dt>空气阻力</dt><dd>{(Math.abs(state.dragN) / 1000).toFixed(2)} <small>kN</small></dd></div>
      <div><dt>阻力耗能率 D × v</dt><dd data-phenomena-power>{(r.dragPowerW / 1e6).toFixed(3)} <small>MW</small></dd></div>
    </dl>
    <p>当前读数属于{state.operations ? '卫星；二级只保留历史记录' : '运载火箭'}。下方「上升曲线」是先前的发射记录，不是当前再入曲线。</p>
    {thermal && <p>环境温度 {thermal.temperatureK.toFixed(1)} K；参考热流 {thermal.heatFluxWm2==null?'超出估算范围，留空':(thermal.heatFluxWm2/1000).toFixed(2)+' kW/m²'}。温度来自标准参考大气；热流仅在高度 ≤80 km、Mach ≥5 时估算，未求解表面温度、烧蚀或解体。</p>}
    <p className="phenomena-meaning">q = ½ρv²，描述当前气流动压，不是温度。D × v 是相对空气运动的机械能耗散率；能量在流场与物体间分配，不能把这个数当作物体吸收的热功率。</p>
    <div ref={chartHost} className="record-anchor"><AscentRecordChart record={record}/></div>
    <details><summary>回顾：发射上升段的现象与辅助图层</summary>
    <label className="phenomena-overlay"><input type="checkbox" disabled={!state.ascent || !!state.orbit} checked={options.aerodynamic} onChange={e => onChange({ ...options, aerodynamic: e.target.checked })}/>箭体头部气动作用着色 · 教学辅助</label>
    <p>第 4 步上升近景可打开；着色帮助找到迎风区域，亮度随动压变化，不是火光或温度图。默认关闭，入轨后不显示。</p>
    <ol className="phenomena-sequence">{FLIGHT_PHENOMENA.map((item, i) => <li key={item.id} aria-current={!state.orbit && item.id === current.id ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')} {!state.orbit && item.id === current.id ? '· 当前现象' : ''}</span><h3>{item.title}</h3><p>{item.seen}</p><details open={!state.orbit && item.id === current.id}><summary>为什么出现 · 当前实现范围</summary><p>{item.why}</p><p className="phenomena-scope">{item.scope}</p></details></li>)}</ol></details>
    <section className="phenomena-conditional"><h3>为什么没有“每次必出的白圈”？</h3><p>局部低压、降温和足够的水汽可能形成凝结云，白色的是小水滴或冰晶，水汽本身看不见。是否出现取决于温湿度与局部流动；当前没有这些计算，所以不把白圈当作突破音速或 Max Q 的固定动画。</p><p>再入时的强烈受热、烧蚀和等离子体现象属于另一段飞行，不能直接套用到正常发射全程。</p></section>
    {state.ascent && <button onClick={onEnvironment}>查看大气分层、云与空间物体 →</button>}
    <details className="phenomena-sources"><summary>依据与数据范围</summary><p>{thermal ? '当前下降/离轨段读取本地标准参考大气；显示环境温度及限定条件下的冷壁驻点热流估算。' : '当前上升或在轨段使用指数教学大气，不输出未经求解的温度和热流。'}表面温度、材料热损伤、实际天气与湿度均未求解；喷流颜色不是温度计。</p>{thermal && <a href={state.satelliteDisposal ? disposalDocument : reentryDocument}>当前阶段：大气、热流模型与范围 ↗</a>}{PHENOMENA_SOURCES.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer">{label} ↗</a>)}<a href={phenomenaDocument} download="发射沿途现象与实现说明.md">下载本轮实现与查看说明 ↗</a></details>
  </section>;
}
