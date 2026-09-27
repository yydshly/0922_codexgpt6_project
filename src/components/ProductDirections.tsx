import { useId, useState } from 'react';
import { ArrowRight, Check, ChevronRight, CircleDot, Compass, History, Layers3, Orbit, Rocket, Route, ShieldCheck, Sparkles, Telescope } from 'lucide-react';
import { HUMAN_SPACE_REMAINING, HUMAN_SPACE_ROUTES, PRODUCT_DECISION_PATHS, PRODUCT_DIRECTIONS, PRODUCT_FOUNDATION, PLANET_CONTROL_LEVELS } from '../data/productDirections';
import futurePlanUrl from '../../docs/POST-ACCEPTANCE-PLAN.md?url';
import launchDeliveryUrl from '../../docs/EARTH-LAUNCH-DELIVERY.md?url';
import earthLaunchPlanUrl from '../../docs/EARTH-TO-ORBIT-PLAN.md?url';
import './ProductDirections.css';

const directionIcons = [Telescope, Rocket, Sparkles, History, Orbit];

export function ProductDirections({ onViewRoadmap, onOpenLaunchBase, canOpenLaunchBase }: { onViewRoadmap: () => void; onOpenLaunchBase: () => void; canOpenLaunchBase: boolean }) {
  const [selectedId, setSelectedId] = useState('observatory');
  const selected = PRODUCT_DIRECTIONS.find(direction => direction.id === selectedId) ?? PRODUCT_DIRECTIONS[0];
  const detailId = useId();
  const titleId = useId();

  return <section className={`product-directions ${selected?.fantasy ? 'product-directions-fantasy' : ''}`} aria-label="当前主线与候选产品方向">
    <div className="product-directions-intro">
      <span className="product-planning-notice"><i/>地球出发六步已交付 · 等待本轮体验验收</span>
      <h2>从地球出发，亲历一次航天任务。</h2>
      <p>地球成为任务基地与出发点：组装载具、检查点火、上升分级、进入轨道，再部署一颗卫星。认知版与沉浸观景已经归档；这里展示本轮交付和后续候选方向。</p>
      <button className="product-launch-entry" onClick={onOpenLaunchBase} disabled={!canOpenLaunchBase} title={canOpenLaunchBase ? '进入三维基地，保留原观测状态' : '请在真实太阳系模式下等待历表就绪'}><Rocket size={16}/>进入地球基地<ArrowRight size={15}/></button>
      {!canOpenLaunchBase && <p>基地入口需要真实太阳系模式及已就绪的历表。</p>}
      <a className="product-plan-link" href={launchDeliveryUrl} download="地球出发首版交付与验收.md">查看本批交付与三组验收操作 ↗</a><a className="product-plan-link" href={earthLaunchPlanUrl} download="从地球启航六步规划.md">下载地球出发六步规划 ↗</a>
    </div>

    <section className="product-human-space" aria-labelledby="product-earth-launch-title">
      <div className="product-section-heading"><span className="product-mini-label">EARTH TO ORBIT / 教学首版</span><h3 id="product-earth-launch-title">一个起点，六步完成首次入轨任务。</h3><p>首版范围：一个简化发射场、一套有限兼容部件、一种无人载荷和辅助飞行。组装同时包含运载火箭与载荷，部件选择会影响质量、推力和燃料。</p></div>
      <ol className="product-launch-steps">{[
        ['地球基地', '从地球进入发射场，明确任务和目标轨道，建立地面到太空的空间关系。'],
        ['组装载具', '选择发动机、燃料级段与载荷，检查兼容性、质量和起飞条件。'],
        ['检查与点火', '完成准备、倒计时和点火；推力与燃料驱动起飞，支持取消与失败重试。'],
        ['上升与分级', '经历稠密到稀薄大气、辅助转弯和级段分离，连续观察地球曲率变化。'],
        ['入轨与关机', '根据位置、速度和目标轨道判断结果；达到高度不等于已经入轨。'],
        ['部署与观察', '释放一颗卫星，切换全景与沉浸观察，保存、恢复或重新开始任务。'],
      ].map(([title, description], index) => <li key={title}><span>{String(index + 1).padStart(2, '0')} · {'功能已交付，待体验验收'}</span><h4>{title}</h4><p>{description}</p></li>)}</ol>
      <p className="product-human-other">六步已交付：从组装点火到分级入轨，完成实际滑行一圈后释放独立卫星，切换近景、全景或沉浸观察，保存并恢复飞行。当前待用户体验验收；月球航程、再入回收和更远任务另行规划。</p>
      <p className="product-human-sources">原理参考：<a href="https://spaceplace.nasa.gov/launching-into-space/en/" target="_blank" rel="noreferrer">NASA 发射与入轨 ↗</a> · <a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/guide-to-rockets/" target="_blank" rel="noreferrer">NASA 火箭基础 ↗</a></p>
    </section>

    <section className="product-decision-section" aria-labelledby="product-decision-title">
      <h3 id="product-decision-title">其他候选方向与启动条件</h3>
      <a className="product-plan-link" href={futurePlanUrl} download="认知版归档后的完整发展规划.md">下载完整候选规划 ↗</a>
      <div className="product-decision-grid">{PRODUCT_DECISION_PATHS.map(path => <article key={path.title}><h4>{path.title}</h4><p><strong>先问：</strong>{path.goal}</p><p><strong>启动条件：</strong>{path.condition}</p></article>)}</div>
      <p className="product-decision-dependency">天体碰撞依赖可复现实验；飞船可以从已有观测直接建立，不需要先实现天体编辑与合并。</p>
    </section>

    <section className="product-human-space" aria-labelledby="product-human-space-title">
      <div className="product-section-heading"><span className="product-mini-label">HUMAN SPACEFLIGHT / 路线说明</span><h3 id="product-human-space-title">人造航天器的三类能力。</h3><p>当前主线从地面发射开始，延伸到在轨部署。真实任务观察可独立扩展，三类能力不要求按下列顺序开发；天然卫星、真实航天器与模拟卫星分别说明。</p></div>
      <div className="product-human-routes">{HUMAN_SPACE_ROUTES.map((route, index) => <article key={route.title}><span>{String(index + 1).padStart(2, '0')}</span><h4>{route.title}</h4><p>{route.purpose}</p><p><strong>先做：</strong>{route.first}</p><p><strong>前提：</strong>{route.condition}</p></article>)}</div>
      <p className="product-human-other"><strong>其他候选缺口：</strong>{HUMAN_SPACE_REMAINING.join('、')}。按选定的学习或任务目标逐项启动。</p>
      <p className="product-human-sources">轨迹来源需逐项核查：<a href="https://celestrak.org/NORAD/documentation/gp-data-formats.php" target="_blank" rel="noreferrer">CelesTrak GP/OMM ↗</a> · <a href="https://naif.jpl.nasa.gov/" target="_blank" rel="noreferrer">NASA NAIF SPICE ↗</a> · <a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">JPL Horizons ↗</a></p>
    </section>

    <nav className="product-direction-choices" aria-label="选择产品方向">
      {PRODUCT_DIRECTIONS.map((direction, index) => {
        const Icon = directionIcons[index % directionIcons.length];
        const active = selected?.id === direction.id;
        return <button key={direction.id} className={`product-direction-choice ${active ? 'selected' : ''} ${direction.fantasy ? 'fantasy-choice' : ''}`} aria-pressed={active} aria-controls={detailId} onClick={() => setSelectedId(direction.id)}>
          <span className="product-choice-top"><Icon size={20}/><span>{String(index + 1).padStart(2, '0')}</span></span>
          <strong>{direction.title}</strong><span className="product-choice-tagline">{direction.tagline}</span>
          <span className="product-choice-bottom">{active ? <><Check size={12}/>正在查看</> : <>查看方向<ChevronRight size={12}/></>}</span>
        </button>;
      })}
    </nav>

    {selected && <article className="product-direction-detail" id={detailId} aria-labelledby={titleId}>
      <div className="product-detail-title"><div><span className="product-eyebrow">{selected.eyebrow}</span><h3 id={titleId}>{selected.title}</h3><p>{selected.tagline}</p></div><span className={`product-rules-badge ${selected.fantasy ? 'fiction' : ''}`}>{selected.fantasy ? <Sparkles size={13}/> : <ShieldCheck size={13}/>}<span>{selected.fantasy ? '含独立虚构规则' : '以真实模型为基础'}</span></span></div>
      <p className="product-audience"><Compass size={14}/><span><b>适合谁</b>{selected.audience}</span></p>

      <section className="product-play-loop"><h4>你会反复做的事</h4><ol>{selected.loop.map((step, index) => <li key={step}><span className="product-loop-number">{String(index + 1).padStart(2, '0')}</span><span>{step}</span>{index < selected.loop.length - 1 && <ArrowRight size={12} aria-hidden="true"/>}</li>)}</ol></section>

      <div className="product-experience-grid">
        <section className="product-abilities"><h4><Sparkles size={15}/>可以获得的能力</h4><ul>{selected.abilities.map(ability => <li key={ability}><i/>{ability}</li>)}</ul></section>
        <section className="product-first-experience"><span className="product-mini-label">FIRST EXPERIENCE / 体验设想</span><h4>第一次进入，会发生什么？</h4><p>{selected.firstExperience}</p></section>
      </div>

      <div className="product-detail-conditions"><section><h4><Layers3 size={15}/>实现前，需要什么</h4><p>{selected.dependency}</p></section><section className="product-rule-boundary"><h4><ShieldCheck size={15}/>科学与游戏规则的边界</h4><p>{selected.boundary}</p></section></div>
    </article>}

    <section className="product-control-section" aria-labelledby="product-control-title">
      <div className="product-section-heading"><span className="product-mini-label">PLANET CONTROL</span><h3 id="product-control-title">“控制星球”，可以分成三层。</h3><p>从物理干预、经营改造到虚构神通，每一层分别定义能改什么、后果由什么规则决定。</p></div>
      <ol className="product-control-levels">{PLANET_CONTROL_LEVELS.map((level, index) => <li key={level.title}><div className="product-control-heading"><span>{String(index + 1).padStart(2, '0')}</span><h4>{level.title}</h4></div><p className="product-control-example">{level.example}</p><p className="product-control-rule"><CircleDot size={13}/><span>{level.rule}</span></p></li>)}</ol>
    </section>

    <section className="product-foundation-section" aria-labelledby="product-foundation-title">
      <div className="product-section-heading"><span className="product-mini-label">SHARED FOUNDATION</span><h3 id="product-foundation-title">不同方向，按需复用五类基础。</h3><p>真实观测、科幻与仙侠按目标选用场景、角色、任务和存档；没有必要一次建设全部模块。</p></div>
      <div className="product-foundation-modules">{PRODUCT_FOUNDATION.map((module, index) => <article key={module.title}><span className="product-module-number">{String(index + 1).padStart(2, '0')}</span><div><h4>{module.title}</h4><p>{module.description}</p></div></article>)}</div>
    </section>

    <div className="product-directions-footer"><p>当前主线为地球出发的航天流程；其他方向保持候选，已归档观测能力独立可用。</p><button onClick={onViewRoadmap}><Route size={15}/>查看接入路线<ArrowRight size={14}/></button></div>
  </section>;
}
