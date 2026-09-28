import { useMemo, useState } from 'react';
import { ascentCurve, type AscentRecordData, type AscentSample } from '../launch/ascentRecord';

const stamp = (time: number) => `T ${time < 0 ? '−' : '+'}${Math.abs(time).toFixed(2)} s`;
export function AscentRecordChart({ record }: { record: AscentRecordData }) {
  const points = useMemo(() => ascentCurve(record), [record]);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const selectedIndex = selectedTime === null ? points.length - 1 : points.reduce((best, p, i) => Math.abs(p.time - selectedTime) < Math.abs(points[best].time - selectedTime) ? i : best, 0);
  const selected = points[selectedIndex], end = record.status === 'cutoff', stopped = record.status === 'stopped';
  const firstTime = points[0]?.time ?? -10, lastTime = points.at(-1)?.time ?? -10;
  const x = (p: AscentSample) => 38 + 354 * (p.time - firstTime) / Math.max(1, lastTime - firstTime);
  function curve(key: 'qPa' | 'dragPowerW', label: string, unit: string, divisor: number, peak: AscentSample | null, color: string) {
    const maximum = Math.max(divisor, ...points.map(p => p[key]));
    const y = (p: AscentSample) => 101 - 66 * p[key] / maximum;
    return <svg viewBox="0 0 410 130" role="img" aria-label={`${label}随任务时间变化，${peak ? `已记录最大值 ${(peak[key] / divisor).toFixed(2)} ${unit}` : '尚无峰值'}`}>
      <text x="8" y="16" className="record-chart-title">{label} · {unit}</text><text x="390" y="16" textAnchor="end">{(maximum / divisor).toFixed(1)}</text>
      <line x1="38" x2="392" y1="35" y2="35" className="record-grid"/><line x1="38" x2="392" y1="101" y2="101" className="record-grid"/>
      <path d={points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(2)},${y(p).toFixed(2)}`).join(' ')} stroke={color} fill="none" strokeWidth="2"/>
      {peak && <circle cx={x(peak)} cy={y(peak)} r="4" fill={color}/>}
      {selected && <><line x1={x(selected)} x2={x(selected)} y1="28" y2="103" className="record-cursor"/><circle cx={x(selected)} cy={y(selected)} r="3.5" fill="#10232b" stroke="#e6eee6"/></>}
      <text x="8" y="104">0</text><text x="38" y="122">{stamp(firstTime)}</text><text x="392" y="122" textAnchor="end">{stamp(lastTime)}</text>
    </svg>;
  }
  return <section className="ascent-record" aria-label="本次上升记录">
    <h3>空气作用，怎样一路变化？</h3>
    <p className="record-status" data-record-status>{end ? '本次动力上升记录已结束 · 终点为二级关机' : stopped ? '任务提前停止 · 仅有已飞过部分的记录' : record.status === 'waiting' ? '开始任务后，逐步记录本次飞行' : `记录中 · 截至 ${stamp(record.latest?.time ?? -10)}`}</p>
    <div className="record-peaks"><button disabled={!record.peakQ} onClick={() => setSelectedTime(record.peakQ!.time)} aria-pressed={selectedTime !== null && selectedTime === record.peakQ?.time}><span>{end ? '动力上升 Max Q' : '截至当前最大动压'}</span><strong data-record-q-peak>{record.peakQ ? `${(record.peakQ.qPa / 1000).toFixed(2)} kPa` : '尚无记录'}</strong><small>{record.peakQ ? `${stamp(record.peakQ.time)} · ${(record.peakQ.altitudeM / 1000).toFixed(2)} km` : '由逐步计算结果确定'}</small></button>
      <button disabled={!record.peakPower} onClick={() => setSelectedTime(record.peakPower!.time)} aria-pressed={selectedTime !== null && selectedTime === record.peakPower?.time}><span>{end ? '最大阻力耗能率' : '截至当前最大耗能率'}</span><strong data-record-power-peak>{record.peakPower ? `${(record.peakPower.dragPowerW / 1e6).toFixed(2)} MW` : '尚无记录'}</strong><small>{record.peakPower ? stamp(record.peakPower.time) : '这不是峰值温度'}</small></button></div>
    {points.length > 1 && <>
      <div className="record-plots">{curve('qPa', '动压', 'kPa', 1000, record.peakQ, '#e9c27c')}{curve('dragPowerW', '阻力耗能率', 'MW', 1e6, record.peakPower, '#8dced7')}</div>
      <label className="record-slider">回看读数 · 不改变飞行与镜头<input aria-label="回看上升读数" type="range" min="0" max={points.length - 1} step="1" value={selectedIndex} onChange={e => setSelectedTime(points[Number(e.target.value)].time)}/></label>
      <div className="record-reading" data-record-reading><strong>{stamp(selected.time)} · {(selected.altitudeM / 1000).toFixed(2)} km</strong><span>动压 {(selected.qPa / 1000).toFixed(2)} kPa · 耗能率 {(selected.dragPowerW / 1e6).toFixed(2)} MW</span><span>相对空气速度 {selected.speedMS.toFixed(1)} m/s · 密度为海平面 {(selected.density / 1.225 * 100).toPrecision(3)}%</span><button onClick={() => setSelectedTime(null)}>回到记录末端</button></div>
    </>}
    <p className="record-explanation">速度增大与空气变稀共同影响动压；两个峰值可能出现在不同时间，均不代表最高温度。点击峰值卡或拖动滑条，只回看数据。</p>
    <details><summary>记录范围与精度</summary><p>从本次倒计时开始，包含两级交接，到二级关机或提前停止为止。逐个物理步比较峰值；曲线约每 {record.sampleIntervalS} 秒留一点并补入峰值和末端。不是按画面帧数取峰值，也不是连续时间的解析极值。快速进入第 4 步和恢复存档会重算前序记录；当前并未添加自动限动压节流。</p></details>
  </section>;
}
