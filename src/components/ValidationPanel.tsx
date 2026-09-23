import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, ChevronDown, LoaderCircle, X } from 'lucide-react';
import { BODIES } from '../data/catalog';
import { publicAsset } from '../data/publicAsset';
import { BODY_IDS, type BodyId, type ValidationPoint, type ValidationReport } from '../types';

const number = (n: number) => n === 0 ? '0' : n < .001 || n >= 1e6 ? n.toExponential(2) : n.toLocaleString('zh-CN', { maximumFractionDigits: n < 1 ? 5 : 2 });

function ErrorChart({ points, index, velocity }: { points: ValidationPoint[]; index: number; velocity?: boolean }) {
  const width = 720, height = 190, left = 65, right = 20, top = 18, bottom = 29;
  const total = points.map(p => velocity ? p.velocityKmS[index] : p.positionKm[index]);
  const model = points.map(p => velocity ? p.modelVelocityKmS?.[index] : p.modelPositionKm?.[index]);
  const numerical = points.map(p => velocity ? p.numericalVelocityKmS?.[index] : p.numericalPositionKm[index]);
  const all = [...total, ...model, ...numerical].filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const max = Math.max(1e-8, ...all);
  const floor = max / 10000;
  const transform = (n: number) => Math.log10(1 + n / floor);
  const extent = transform(max) || 1;
  const x = (i: number) => left + i / Math.max(1, points.length - 1) * (width - left - right);
  const y = (n: number) => top + (1 - transform(n) / extent) * (height - top - bottom);
  const line = (values: (number | undefined)[]) => values.map((v, i) => v === undefined || !Number.isFinite(v) ? '' : `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  return <div className="error-chart">
    <div className="chart-heading"><span>{velocity ? '速度差异' : '位置差异'}</span><span>{velocity ? 'km/s' : 'km'} · 对数刻度</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${velocity ? '速度' : '位置'}逐日差异图，灰色为正式步长的总差异，青色为细步长估计的模型差异，金色为数值积分误差估计`}>
      {[0, .25, .5, .75, 1].map(t => { const value = floor * (Math.pow(10, t * extent) - 1); const yy = top + (1-t) * (height-top-bottom); return <g key={t}><line x1={left} y1={yy} x2={width-right} y2={yy} className="chart-grid"/><text x={left-10} y={yy+4} textAnchor="end">{number(value)}</text></g>; })}
      <path d={line(total)} className="total-line"/><path d={line(model)} className="model-line"/><path d={line(numerical)} className="numerical-line"/>
      {[0, .25, .5, .75, 1].map(t => <text key={t} x={left+t*(width-left-right)} y={height-6} textAnchor="middle">第 {Math.round(t * (points.at(-1)?.day || 1))} 天</text>)}
    </svg>
  </div>;
}

export function ValidationPanel({ selectedId, onClose }: { selectedId: BodyId; onClose: () => void }) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState(30);
  const [body, setBody] = useState<BodyId>(selectedId);
  useEffect(() => { const controller = new AbortController(); fetch(publicAsset('/data/validation-report.json'), { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('验证报告暂未生成。请运行项目内的物理验证命令。'); return r.json(); }).then((data: ValidationReport) => { if (!data.points?.length) throw new Error('报告中没有可用的验证数据。'); setReport(data); }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => controller.abort(); }, []);
  const index = BODY_IDS.indexOf(body);
  const points = useMemo(() => report?.points.filter(p => p.day <= range) ?? [], [report, range]);
  const last = points.at(-1);
  const tenYears = report?.summary.tenYears as { maximumRelativeEnergyError: number; maximumRelativeAngularMomentumError: number } | undefined;
  const convergence = report?.summary.convergence as { ratio: number } | undefined;
  return <section className="validation-panel" aria-label="物理验证报告">
    <div className="report-title"><div><div className="eyebrow">BENCHMARK / PHYSICS</div><h2><Activity size={20}/> 让误差可以被看见</h2></div><button className="icon-button" onClick={onClose} title="关闭报告"><X size={19}/></button></div>
    <p className="report-intro">从相同的真实状态出发，检查牛顿引力模型与 JPL 历表的逐日差异。此处展示离线完成的验证，不代表当前交互运行的结果。</p>
    <div className="report-filters"><div className="segmented"><button className={range === 30 ? 'active' : ''} onClick={() => setRange(30)}>30 天</button><button className={range === 365 ? 'active' : ''} onClick={() => setRange(365)}>1 年</button></div><label className="select-wrapper"><select value={body} onChange={e => setBody(e.target.value as BodyId)} aria-label="验证天体">{BODIES.map(b => <option key={b.id} value={b.id}>{b.name} / {b.englishName}</option>)}</select><ChevronDown size={14}/></label></div>
    {!report && !error && <div className="report-status"><LoaderCircle className="spin"/>正在读取验证报告…</div>}
    {error && <div className="inline-error" role="alert">{error}</div>}
    {report && <>
      <div className="report-meta">起始时刻 {new Date(report.epochUtc).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}（UTC+8） · 步长 {report.steps.join(' / ')} s</div>
      <div className="chart-legend"><span><i className="legend-total"/>总差异</span><span><i className="legend-model"/>模型差异估计</span><span><i className="legend-numerical"/>数值积分误差估计</span></div>
      <ErrorChart points={points} index={index}/><ErrorChart points={points} index={index} velocity/>
      {last && <div className="report-endpoints"><div><span>第 {last.day} 天 · 位置总差异</span><strong>{number(last.positionKm[index])}<small> km</small></strong></div><div><span>数值积分位置误差估计</span><strong>{number(last.numericalPositionKm[index])}<small> km</small></strong></div></div>}
      <div className="report-explanation"><h3>区分模型的局限，与计算的误差</h3><p><b>总差异</b>比较正式的 300 秒推演与 JPL 历表；<b>模型差异估计</b>使用更精细的 37.5 秒推演与历表比较；<b>数值积分误差估计</b>比较同一模型的 300 秒与 37.5 秒推演。三者是向量差的大小，不能直接加减。</p><p>参照对象保持一致：太阳相对太阳系质心，行星相对太阳，月球相对地球。未展开卫星的行星系统采用系统质心及总引力参数。</p><p>细步长参考仍有有限数值误差，另外记录 75 秒与 37.5 秒之差。模型省略相对论、非球形引力和部分小天体；历表插值误差独立检验。</p>{tenYears && <details className="validation-details"><summary>十年稳定性与步长收敛检查 <ChevronDown size={12}/></summary><p>十年最大相对能量变化：{number(tenYears.maximumRelativeEnergyError)}<br/>最大相对角动量变化：{number(tenYears.maximumRelativeAngularMomentumError)}<br/>{convergence && <>步长减半后的误差改善倍数：{number(convergence.ratio)}（二阶方法预期约 4）</>}</p><p>此实验检验孤立十体模型的数值稳定性，不表示拥有十年真实历表覆盖或天文预测精度。</p></details>}<a href={publicAsset('/data/validation-report.json')} target="_blank" rel="noreferrer">查看完整验证数据 <ArrowUpRight size={13}/></a></div>
    </>}
  </section>;
}
