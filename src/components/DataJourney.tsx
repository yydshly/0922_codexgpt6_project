import { useEffect } from 'react';
import { ArrowUpRight, Database, GitBranch, MonitorPlay, PackageCheck, X } from 'lucide-react';
import { publicAsset } from '../data/publicAsset';
import type { EphemerisManifest, SimulationMode } from '../types';
import './DataJourney.css';

interface Props {
  manifest: EphemerisManifest | null;
  mode: SimulationMode;
  onClose: () => void;
}

const stages = [
  { number: '01', icon: Database, title: '从哪里来', detail: '太阳、八大行星和月球的位置与速度取自 NASA/JPL Horizons；另外 19 颗选定卫星取自 NASA/JPL NAIF 的卫星 SPK；谷神星、冥王星与卡戎的中心几何状态取自 JPL Horizons。半径、质量和朝向参考 JPL/NAIF 资料。' },
  { number: '02', icon: PackageCheck, title: '如何整理', detail: '开发阶段离线采集原始状态，统一到 J2000 黄道坐标、公里与公里/秒、TDB 时间。按月份生成数据包，保存来源与版本，并用未参与插值的检查点核对。' },
  { number: '03', icon: GitBranch, title: '如何计算', detail: '浏览器按所选日期读取本网站内对应月份的数据包，再根据相邻位置和速度做三次 Hermite 插值。物理验证则从同一时刻的状态出发，在独立线程中计算十体引力。' },
  { number: '04', icon: MonitorPlay, title: '如何呈现', detail: '同一份时间、位置和速度状态驱动三维球体、卫星公转、距离与速度读数。贴图、云层、日冕、背景星点和带区用于理解与辨认，不是所选时刻的实时照片。' },
] as const;

export function DataJourney({ manifest, mode, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="data-journey-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="data-journey-dialog" role="dialog" aria-modal="true" aria-label="太阳系数据来源与实现原理">
      <header className="data-journey-header"><div><span className="eyebrow">FROM SCIENCE TO SCENE</span><h2>数据如何来到眼前？</h2><p>从权威状态到可操作的太阳系场景。</p></div><button className="data-journey-close" onClick={onClose} aria-label="关闭数据与实现"><X size={18}/></button></header>
      <div className="data-journey-content">
        <div className="data-journey-callout"><strong>这里读取的是预置历表，不是 NASA 实时直播。</strong><span>“正在读取真实太阳系历表”表示浏览器正在从本网站加载相应月份的本地数据包。选取的日期必须在 2026—2027 年范围内。</span></div>
        <div className="data-journey-flow">{stages.map(({ number, icon: Icon, title, detail }) => <article key={number} className="data-journey-stage"><div className="data-journey-stage-head"><span>{number}</span><Icon size={17}/><h3>{title}</h3></div><p>{detail}</p></article>)}</div>
        <div className="data-journey-mode"><span className="eyebrow">TWO WAYS TO ADVANCE TIME</span><div><strong>真实太阳系</strong><p>历表给出指定时刻的几何状态，经验证的插值补足采样点之间的时间。</p></div><div><strong>物理验证</strong><p>从历表初始状态出发，用牛顿点质量引力和 300 秒固定步长推演；它是简化模型，会逐渐偏离历表。</p></div><small>当前画面：{mode === 'ephemeris' ? '真实太阳系' : '物理验证'} · 十体物理模型不包含另外 19 颗卫星及谷神星、冥王星、卡戎。</small></div>
        <div className="data-journey-boundary"><strong>怎样理解精度？</strong><p>留出检查点的最大插值差：原十体约 0.078 km，扩展卫星约 0.930 km，谷神星、冥王星与卡戎约 0.166 km。它只衡量项目插值相对原始历表/SPK 的差，不代表历表本身的绝对位置误差，也不代表物理验证模型的误差。默认全景还会压缩距离并增强球体可见性；准确比较尺寸和距离请切换“真实比例”。</p></div>
        <div className="data-journey-meta"><span>主历表版本：{manifest?.version ?? '正在载入'}</span><span>坐标：ECLIPJ2000 · 时间：TDB · 单位：km / km/s</span></div>
        <nav className="data-journey-links" aria-label="数据与方法来源"><a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">JPL Horizons 说明 <ArrowUpRight size={12}/></a><a href="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/" target="_blank" rel="noreferrer">NAIF 卫星数据 <ArrowUpRight size={12}/></a><a href={publicAsset('/data/manifest.json')} target="_blank" rel="noreferrer">主历表清单 <ArrowUpRight size={12}/></a><a href={publicAsset('/data/satellites/manifest.json')} target="_blank" rel="noreferrer">卫星清单 <ArrowUpRight size={12}/></a><a href={publicAsset('/data/dwarfs/manifest.json')} target="_blank" rel="noreferrer">矮行星与卡戎清单 <ArrowUpRight size={12}/></a><a href="https://github.com/yydshly/0922_codexgpt6_project/blob/main/docs/DATA-PIPELINE.md" target="_blank" rel="noreferrer">完整实现与校验方法 <ArrowUpRight size={12}/></a></nav>
      </div>
    </section>
  </div>;
}
