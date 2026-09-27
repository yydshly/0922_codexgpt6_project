import type { FlightState } from '../launch/liftoff';
import { ATMOSPHERE_LAYERS, atmosphereLayer, ENVIRONMENT_SOURCES, SPACE_OBJECT_KINDS, type EnvironmentOptions, type SpaceObjectKind } from '../launch/flightEnvironment';
interface Props {
  state: FlightState; options: EnvironmentOptions; onChange: (options: EnvironmentOptions) => void;
  overview: boolean; onOverview: () => void; onFollow: () => void; onClose: () => void;
  kind: SpaceObjectKind | 'all'; onKind: (kind: SpaceObjectKind | 'all') => void;
}
export function FlightEnvironmentPanel({ state, options, onChange, overview, onOverview, onFollow, onClose, kind, onKind }: Props) {
  const a = state.ascent!, layer = atmosphereLayer(a.altitudeM);
  return <section className="flight-environment-panel" aria-label="飞行环境">
    <header><div><small>EARTH / ENVIRONMENT</small><h3>沿途有什么？</h3></div><button onClick={onClose} aria-label="收起飞行环境">收起</button></header>
    <p className="environment-current" role="status">{(a.altitudeM / 1000).toFixed(2)} km · {layer.name}<span>{layer.description}</span></p>
    <ol className="environment-layers">{ATMOSPHERE_LAYERS.map(item => <li key={item.id} aria-current={item.id === layer.id ? 'step' : undefined}><i style={{ background: item.color }}/><strong>{item.name}</strong><span>{item.range}</span></li>)}</ol>
    <p>层界随纬度和太阳活动等变化；以上是认识顺序，不是五层硬壳。</p>
    <div className="environment-switches">{([
      ['clouds', '天气云 · 教学场景'], ['atmosphere', '大气蓝边'], ['airflow', '相对气流与阻力提示'],
    ] as const).map(([id, label]) => <label key={id}><input type="checkbox" checked={options[id]} onChange={event => onChange({ ...options, [id]: event.target.checked })}/>{label}</label>)}</div>
    <p>云层留在低空。青色线表示相对气流，橙色箭头表示阻力方向；空气本身不可见。开关只改变显示，阻力仍按同一密度与速度计算。</p>
    <dl><div><dt>空气密度 / 海平面</dt><dd>{(a.density / 1.225 * 100).toPrecision(3)}%</dd></div><div><dt>当前空气阻力</dt><dd>{(state.dragN / 1000).toFixed(2)} kN</dd></div></dl>
    <div className="environment-space-head"><h4>近地空间物体</h4><button onClick={overview ? onFollow : onOverview}>{overview ? '返回火箭' : '查看环境总览 →'}</button></div>
    <p>本次分离一级：{a.detached ? '已出现，位置由本次飞行计算。' : state.orbit?.boosterRetired ? '已下降至 80 km，结束跟踪；未模拟再入与回收。' : '分离后出现，当前没有。'} 不等于已经成为轨道碎片。</p>
    <label className="environment-object-switch"><input type="checkbox" checked={options.objects} onChange={event => onChange({ ...options, objects: event.target.checked })}/>总览中的空间物体示意</label>
    <div className="environment-kinds"><button aria-pressed={kind === 'all'} onClick={() => { onKind('all'); onChange({ ...options, objects: true }); onOverview(); }}>全部类别</button>{SPACE_OBJECT_KINDS.map(item => <button key={item.id} aria-pressed={kind === item.id} onClick={() => { onKind(item.id); onChange({ ...options, objects: true }); onOverview(); }}><i style={{ background: item.color }}/>{item.name}</button>)}</div>
    <p>{SPACE_OBJECT_KINDS.find(item => item.id === kind)?.description ?? '示意点分为工作卫星、废弃箭体、人造碎片和自然流星体。圆轨道与开放掠过路径是教学设定，标记大小经过放大。'}</p>
    <p className="environment-boundary">这些示例不表示火箭附近实际有这些物体，不是实时卫星目录、真实密度或碰撞预警。暂未加入风、真实天气、再入烧蚀和碎片碰撞。</p>
    <details><summary>环境依据与模型范围</summary><p>大气层说明参考 NASA；当前空气密度与压力仍采用 8.5 km 标高指数教学近似，不能用于长期轨道阻力预测。局部云团为教学布置，地球云图为静态贴图；没有实时下载天气或空间物体数据。</p><a href={ENVIRONMENT_SOURCES.atmosphere} target="_blank" rel="noreferrer">NASA · 地球大气分层 ↗</a><a href={ENVIRONMENT_SOURCES.debris} target="_blank" rel="noreferrer">ESA · 空间碎片的类型 ↗</a><a href={ENVIRONMENT_SOURCES.meteoroids} target="_blank" rel="noreferrer">NASA · 流星体、流星与陨石 ↗</a></details>
  </section>;
}
