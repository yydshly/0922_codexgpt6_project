import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, ChevronRight, CircleHelp, Orbit, RotateCcw, X } from 'lucide-react';
import { ATLAS_BODIES } from '../data/atlas';
import { bodyById } from '../data/catalog';
import { satelliteById } from '../data/satellites';
import type { BodyId } from '../types';
import './SolarKnowledge.css';

type Topic = 'body' | 'motion' | 'paths';

interface Props {
  bodyId: BodyId;
  satelliteId: string | null;
  satelliteParentId: BodyId | null;
  physics: boolean;
  spatial: boolean;
  onShowPaths: () => void;
  onClose: () => void;
}

const number = (value: number, digits = 1) => value.toLocaleString('zh-CN', { maximumFractionDigits: digits });
const duration = (hours: number) => Math.abs(hours) >= 72 ? number(Math.abs(hours) / 24, 2) + ' 天' : number(Math.abs(hours), 2) + ' 小时';
const orbitDuration = (days: number) => days >= 730 ? '约 ' + number(days / 365.25, 1) + ' 年' : days >= 2 ? '约 ' + number(days, 2) + ' 天' : '约 ' + number(days * 24, 1) + ' 小时';

export function SolarKnowledge({ bodyId, satelliteId, satelliteParentId, physics, spatial, onShowPaths, onClose }: Props) {
  const [topic, setTopic] = useState<Topic>('body');
  const satellite = satelliteId ? satelliteById[satelliteId] : undefined;
  const body = bodyById[bodyId];
  const parent = satellite ? bodyById[satellite.parentId] : satelliteParentId ? bodyById[satelliteParentId] : undefined;
  const name = satellite?.name ?? (satelliteParentId ? parent!.name + '系统' : body.name);
  const atlas = satellite ? ATLAS_BODIES.find(item => item.id === satellite.id) : undefined;
  const hierarchy = satellite ? ['太阳', parent!.name, satellite.name] : satelliteParentId ? ['太阳', parent!.name, '选定卫星'] : bodyId === 'sun' ? ['太阳系质心', '太阳'] : bodyId === 'moon' ? ['太阳', '地球', '月球'] : ['太阳', body.name];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="knowledge-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="knowledge-dialog" role="dialog" aria-modal="true" aria-label="太阳系运行知识">
      <header className="knowledge-header"><div><span className="eyebrow">EXPLORE THE MOTION</span><h2>读懂{name}的运行</h2><p>从天体本身，到它的运动与画面中的轨迹。</p></div><button className="knowledge-close" onClick={onClose} aria-label="关闭运行知识"><X size={18}/></button></header>
      <nav className="knowledge-tabs" aria-label="知识主题">
        <button className={topic === 'body' ? 'active' : ''} onClick={() => setTopic('body')} aria-current={topic === 'body' ? 'page' : undefined}><BookOpen size={15}/>认识天体</button>
        <button className={topic === 'motion' ? 'active' : ''} onClick={() => setTopic('motion')} aria-current={topic === 'motion' ? 'page' : undefined}><RotateCcw size={15}/>如何运动</button>
        <button className={topic === 'paths' ? 'active' : ''} onClick={() => setTopic('paths')} aria-current={topic === 'paths' ? 'page' : undefined}><Orbit size={15}/>读懂轨迹</button>
      </nav>
      <div className="knowledge-content">
        {topic === 'body' && <>
          <div className="knowledge-hierarchy">{hierarchy.map((item, index) => <span key={item + index}>{index > 0 && <ChevronRight size={13}/>}<strong>{item}</strong></span>)}</div>
          <h3>{satellite?.name ?? body.name}是什么？</h3>
          <p>{satellite?.description ?? (satelliteParentId ? parent!.name + '围绕太阳运行，这里的选定卫星又分别围绕它运行。它们公转一周的时间并不相同。' : body.description)}</p>
          <div className="knowledge-highlight"><CircleHelp size={16}/><p>{satellite ? atlas?.features[0] ?? '这颗天然卫星围绕' + parent!.name + '运行。' : satelliteParentId ? '卫星的大小、距离与轨道倾角各不相同；本观测站只接入了部分卫星样本。' : body.fact}</p></div>
          <p className="knowledge-caveat">球体贴图与光效帮助辨认天体；它们不是所选时刻的实时影像。空间观测模式还会压缩距离、增强球体可见性。</p>
          <a href={satellite?.sourceUrl ?? body.sourceUrl} target="_blank" rel="noreferrer" className="knowledge-source">查看 NASA / JPL 天体资料 <ArrowUpRight size={13}/></a>
        </>}
        {topic === 'motion' && <>
          <div className="knowledge-terms"><article><span>自转 · 天体自身朝向改变</span><strong>{satellite || satelliteParentId ? '参考示意' : duration(body.rotationHours)}</strong><p>{satellite ? '卫星表面大致保持朝向母星；目前未逐颗接入精密自转姿态。' : satelliteParentId ? '选定卫星的公转由历表驱动；表面朝向采用示意模型。' : bodyId === 'moon' ? '月球约 27.32 天自转一周，也约用同样时间绕地球一周，因此大致以同一面朝向地球。' : bodyId === 'sun' ? '太阳不是固体，各纬度自转速度不同；画面采用一个参考速率。' : (body.rotationHours < 0 ? '逆向自转。' : '按参考方向自转。') + '画面使用参考转轴与自转速率，未计算长期姿态变化。'}</p></article>
          <article><span>公转 · 天体中心位置改变</span><strong>{satellite ? orbitDuration(satellite.orbitalPeriodDays) : satelliteParentId ? '周期各不相同' : bodyId === 'sun' ? '没有单一绕日周期' : orbitDuration(body.orbitalPeriodDays)}</strong><p>{satellite ? '这里指绕' + parent!.name + '一周的参考时间；母星也在绕太阳运行。' : satelliteParentId ? '这组卫星分别绕' + parent!.name + '运行，所需时间可以在卫星详情中比较。' : bodyId === 'sun' ? '太阳也受行星引力影响，在太阳系质心附近运动。' : bodyId === 'moon' ? '这里指绕地球一周；地月系统同时绕太阳运行。' : '这里指绕太阳一周的参考时间；实际轨道受多天体引力影响，并非完美圆形。'}</p></article></div>
          <p className="knowledge-caveat">{physics ? '当前「物理验证」从真实状态开始积分天体中心的引力运动；球体自转仍使用参考速率，不由引力积分计算。' : satelliteParentId ? '当前卫星的位置和速度来自 JPL 相对母星历表；表面朝向仅作同步示意。自动环绕只移动镜头。' : '当前「真实太阳系」的位置和速度来自 JPL 历表；自转按参考参数计算。自动环绕只移动镜头，不改变天体运动。'}</p>
          <a href="https://science.nasa.gov/solar-system/orbits-and-keplers-laws/" target="_blank" rel="noreferrer" className="knowledge-source">NASA：轨道与开普勒定律 <ArrowUpRight size={13}/></a>
        </>}
        {topic === 'paths' && <>
          <div className="knowledge-path-list">
            <div><i className="knowledge-line fine"/><span><strong>细线 · 瞬时参考轨道</strong><small>根据当前的位置与速度估计的轨道形状；不是已经走过的路，也不是未来必然经过的精确路径。</small></span></div>
            <div><i className="knowledge-line bright"/><span><strong>亮线 · 已运行轨迹</strong><small>{satelliteParentId ? '当前卫星视图只显示参考轨道；返回太阳系总览可查看已运行轨迹。' : '记录当前播放过程中的采样位置；切换日期、视图或模式时会重新开始。'}</small></span></div>
            <div><i className="knowledge-arrow">➜</i><span><strong>速度箭头 · 此刻方向</strong><small>太阳系视图可开启速度方向箭头：行星相对太阳、月球相对地球、太阳相对太阳系质心。箭头长度经过展示处理，不能用来量取速度。</small></span></div>
          </div>
          <p className="knowledge-caveat">轨迹线是辅助读图的参考图层。{spatial ? '当前空间观测压缩了画面距离，不能从线的长度量取真实公里数；切换「真实比例」查看尺度。' : '当前使用真实距离比例，但屏幕投影仍受镜头角度影响。'}小行星带和柯伊伯带散点仅表示区域，不是逐颗天体的真实轨迹。</p>
          <button className="knowledge-action" onClick={onShowPaths}><Orbit size={14}/>返回场景并显示轨迹<ArrowUpRight size={13}/></button>
          <a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer" className="knowledge-source">JPL：历表与几何状态说明 <ArrowUpRight size={13}/></a>
        </>}
      </div>
    </section>
  </div>;
}
