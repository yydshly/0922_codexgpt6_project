import { useEffect, useRef } from 'react';
import type { FlightState } from '../launch/liftoff';
import { currentPhenomenon, flightEnvironmentReading, FLIGHT_PHENOMENA, PHENOMENA_SOURCES } from '../launch/flightPhenomena';
import type { EnvironmentOptions } from '../launch/flightEnvironment';
import phenomenaDocument from '../../docs/FLIGHT-PHENOMENA.md?url';
import { AscentRecordChart } from './AscentRecordChart';
import type { AscentRecordData } from '../launch/ascentRecord';
import './FlightPhenomenaPanel.css';

interface Props { state: FlightState; record: AscentRecordData; options: EnvironmentOptions; onChange: (options: EnvironmentOptions) => void; onClose: () => void; onEnvironment: () => void }
export function FlightPhenomenaPanel({ state, record, options, onChange, onClose, onEnvironment }: Props) {
  const close = useRef<HTMLButtonElement>(null), chartHost = useRef<HTMLDivElement>(null), r = flightEnvironmentReading(state), current = currentPhenomenon(state);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; close.current?.focus(); return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  return <section className="flight-phenomena-panel" aria-label="沿途现象">
    <header><div><small>FLIGHT / PHENOMENA</small><h2>从喷焰，到无动力飞行</h2></div><button ref={close} onClick={onClose} aria-label="关闭沿途现象">关闭</button></header>
    <div className="phenomena-current"><small>当前 · T {state.time >= 0 ? '+' : '−'} {Math.abs(state.time).toFixed(1)} s</small><h3>{current.title}</h3><p>{current.description}</p><small>打开说明已暂停任务；关闭后请在操作区继续。</small><button className="record-jump" onClick={() => chartHost.current?.scrollIntoView({ block: 'start' })}>回看本次上升曲线 ↓</button></div>
    <dl className="phenomena-readings">
      <div><dt>相对空气速度</dt><dd data-phenomena-speed>{r.airSpeedMS.toFixed(1)} <small>m/s</small></dd></div>
      <div><dt>当前动压 q</dt><dd data-phenomena-q>{(r.dynamicPressurePa / 1000).toFixed(2)} <small>kPa</small></dd></div>
      <div><dt>空气阻力</dt><dd>{(Math.abs(state.dragN) / 1000).toFixed(2)} <small>kN</small></dd></div>
      <div><dt>阻力耗能率 D × v</dt><dd data-phenomena-power>{(r.dragPowerW / 1e6).toFixed(3)} <small>MW</small></dd></div>
    </dl>
    <p className="phenomena-meaning">q = ½ρv²，描述当前气流动压，不是温度。D × v 是相对空气运动的机械能耗散率；能量在流场与箭体间分配，不能把这个数当作箭体吸收的热功率。</p>
    <div ref={chartHost} className="record-anchor"><AscentRecordChart record={record}/></div>
    <label className="phenomena-overlay"><input type="checkbox" disabled={!state.ascent || !!state.orbit} checked={options.aerodynamic} onChange={e => onChange({ ...options, aerodynamic: e.target.checked })}/>箭体头部气动作用着色 · 教学辅助</label>
    <p>第 4 步上升近景可打开；着色帮助找到迎风区域，亮度随动压变化，不是火光或温度图。默认关闭，入轨后不显示。</p>
    <ol className="phenomena-sequence">{FLIGHT_PHENOMENA.map((item, i) => <li key={item.id} aria-current={item.id === current.id ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')} {item.id === current.id ? '· 当前现象' : ''}</span><h3>{item.title}</h3><p>{item.seen}</p><details open={item.id === current.id}><summary>为什么出现 · 当前实现范围</summary><p>{item.why}</p><p className="phenomena-scope">{item.scope}</p></details></li>)}</ol>
    <section className="phenomena-conditional"><h3>为什么没有“每次必出的白圈”？</h3><p>局部低压、降温和足够的水汽可能形成凝结云，白色的是小水滴或冰晶，水汽本身看不见。是否出现取决于温湿度与局部流动；当前没有这些计算，所以不把白圈当作突破音速或 Max Q 的固定动画。</p><p>再入时的强烈受热、烧蚀和等离子体现象属于另一段飞行，不能直接套用到正常发射全程。</p></section>
    {state.ascent && <button onClick={onEnvironment}>查看大气分层、云与空间物体 →</button>}
    <details className="phenomena-sources"><summary>依据与数据范围</summary><p>数值来自本次教学飞行，采用既有指数大气。未增加温湿度、热流、温度或热损伤求解；喷流大小与颜色不用于工程判断。来源核对：2026-09-27。</p>{PHENOMENA_SOURCES.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer">{label} ↗</a>)}<a href={phenomenaDocument} download="发射沿途现象与实现说明.md">下载本轮实现与查看说明 ↗</a></details>
  </section>;
}
