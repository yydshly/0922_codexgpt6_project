import { Activity, ArrowUpRight, ChevronDown, Circle, Compass, Info, Orbit, RotateCcw } from 'lucide-react';
import { dynamicDwarfById, type DwarfId } from '../data/dwarfs';
import type { StateBatch } from '../ephemeris/stateProvider';
import { publicAsset } from '../data/publicAsset';

const AU_KM = 149597870.7;
const fmt = (value: number, digits = 2) => value.toLocaleString('zh-CN', { maximumFractionDigits: digits });

export function DwarfInspector({ id, observations, loading, error, onRetry, onFollow, onSystem }: {
  id: DwarfId;
  observations: StateBatch | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onFollow: () => void;
  onSystem: () => void;
}) {
  const body = dynamicDwarfById[id];
  const target = observations?.states.find(state => state.id === id);
  const reference = observations?.states.find(state => state.id === (id === 'charon' ? 'pluto' : 'sun'));
  const distance = target && reference ? Math.hypot(...target.position.map((component, axis) => component-reference.position[axis])) : null;
  const speed = target && reference ? Math.hypot(...target.velocity.map((component, axis) => component-reference.velocity[axis])) : null;
  return <aside className="inspector" aria-label={`${body.name}天体详情`}>
    <div className="inspector-header"><div className="eyebrow">DYNAMIC MINOR WORLD</div><div className="inspector-title-line"><h2>{body.name}</h2><span className="body-orb inspector-big-orb" style={{ '--body-color': body.color } as React.CSSProperties}/></div><div className="inspector-english">{body.englishName.toUpperCase()}</div><div className="body-type"><span className="tag">{body.category === 'moon' ? '天然卫星' : '矮行星'}</span><span className="material-tag">{body.parent}系统</span></div><p className="body-description">{body.description}</p><button className="follow-button" onClick={onFollow}><Compass size={13}/>跟随{body.name}<ArrowUpRight size={12}/></button>{id !== 'ceres' && <button className="follow-button related-system-button" onClick={onSystem}><Orbit size={13}/>观察冥王星—卡戎公转<ArrowUpRight size={12}/></button>}</div>
    <div className="inspector-section"><h3 className="section-label"><Circle size={12}/>参考参数</h3><dl className="property-grid"><div className="property"><dt>平均半径</dt><dd>{fmt(body.radiusKm,1)}<small>km</small></dd></div><div className="property"><dt>质量</dt><dd>{body.massKg.toExponential(3)}<small>kg</small></dd></div><div className="property"><dt>自转周期</dt><dd>{fmt(Math.abs(body.rotationHours),2)}<small>小时{body.rotationHours<0 ? " · 逆行" : id === "charon" ? " · 潮汐锁定" : ""}</small></dd></div><div className="property"><dt>{id === "charon" ? "双体公转" : "绕日公转"}</dt><dd>{id === "charon" ? fmt(body.orbitalPeriodDays,2) : fmt(body.orbitalPeriodDays/365.25,2)}<small>{id === "charon" ? "天" : "年"}</small></dd></div><div className="property"><dt>归属</dt><dd>{body.parent}</dd></div></dl><p className="reference-note">{body.radiusNote}。外观颜色与表面形态为说明性重建，不是实时影像。</p></div>
    <div className="inspector-section"><div className="realtime-title"><h3 className="section-label"><Activity size={13}/>当前状态</h3><span className="live-badge"><i className="status-dot"/>JPL HORIZONS</span></div><div className="state-value"><span>相对距离</span><strong>{distance === null ? '—' : fmt(id === 'charon' ? distance : distance/AU_KM, id === 'charon' ? 0 : 4)}<small>{id === 'charon' ? 'km' : 'AU'}</small></strong></div><div className="state-value"><span>相对速度</span><strong>{speed === null ? '—' : fmt(speed,3)}<small>km/s</small></strong></div><p className="reference-note">参照对象：{id === 'charon' ? '冥王星中心' : '太阳中心'}。历表原点为太阳系质心，几何状态未经光行时修正。{loading && '正在读取当前月份数据。'}{error && <><br/><Info size={12}/>{error} <button onClick={onRetry}><RotateCcw size={11}/>重试</button></>}</p></div>
    <div className="inspector-section"><p className="body-fact">{body.features[0]}</p><p className="reference-note">冥王星—卡戎近景以 JPL 引力参数估计双体质心，两颗球体各自运动；自转周期来自参考资料，场景自转相位和极轴仍为视觉近似；卡戎保持面向冥王星的潮汐锁定示意。所绘轨迹是由当前的位置和速度推算的瞬时参考轨道；运动中的天体位置逐时读取并插值自 JPL 历表。谷神星、冥王星和卡戎不参与当前十体引力验证。</p></div>
    <div className="inspector-source"><details><summary>数据、图像与科学边界<ChevronDown size={12}/></summary><div className="source-details"><p>位置与速度：<a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">NASA / JPL Horizons</a>。目标：{id === 'ceres' ? '1 Ceres (小天体中心)' : id === 'pluto' ? 'Pluto 999 (天体中心)' : 'Charon 901 (天体中心)'}；ECLIPJ2000 / ICRF；TDB；km 与 km/s。</p><p>质量、平均半径、自转和公转参考：<a href={body.physicalSourceUrl} target="_blank" rel="noreferrer">JPL 物理参数表</a>；卡戎质量由 JPL GM 与 CODATA 2018 引力常数换算。天体介绍：<a href={body.sourceUrl} target="_blank" rel="noreferrer">NASA 资料</a>。表面为艺术化示意。</p><a href={publicAsset('/data/dwarfs/manifest.json')} target="_blank" rel="noreferrer">扩展天体历表版本、查询与验证结果 ↗</a></div></details></div>
  </aside>;
}
