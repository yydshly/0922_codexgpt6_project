import { useId, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, CircleDot, Compass, Flag, History, Layers3, Orbit, Rocket, Route, ShieldCheck, Sparkles, Telescope } from 'lucide-react';
import { PRODUCT_DIRECTIONS, PRODUCT_FOUNDATION, PLANET_CONTROL_LEVELS, PRODUCT_FIRST_SLICE } from '../data/productDirections';
import './ProductDirections.css';

const directionIcons = [Telescope, Rocket, Sparkles, History, Orbit];

export function ProductDirections({ onViewRoadmap }: { onViewRoadmap: () => void }) {
  const [selectedId, setSelectedId] = useState('xianxia');
  const selected = PRODUCT_DIRECTIONS.find(direction => direction.id === selectedId) ?? PRODUCT_DIRECTIONS[0];
  const detailId = useId();
  const titleId = useId();

  return <section className={`product-directions ${selected?.fantasy ? 'product-directions-fantasy' : ''}`} aria-label="候选产品方向">
    <div className="product-directions-intro">
      <span className="product-planning-notice"><i/>候选产品方向 · 尚未实现</span>
      <h2>同一片星空，五种探索方式。</h2>
      <p>真实太阳系观测已可使用。下面是尚未完成的产品体验设想：选择一个方向，看看你能做什么，以及哪些规则需要另外建立。</p>
    </div>

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
      <div className="product-section-heading"><span className="product-mini-label">SHARED FOUNDATION</span><h3 id="product-foundation-title">不同世界，共用五个基础模块。</h3><p>真实观测、科幻与仙侠可以各自发展，让角色、任务与存档等能力在各方向之间复用。</p></div>
      <div className="product-foundation-modules">{PRODUCT_FOUNDATION.map((module, index) => <article key={module.title}><span className="product-module-number">{String(index + 1).padStart(2, '0')}</span><div><h4>{module.title}</h4><p>{module.description}</p></div></article>)}</div>
    </section>

    <section className="product-first-slice" aria-labelledby="product-first-slice-title">
      <div className="product-slice-heading"><Flag size={20}/><div><span className="product-mini-label">FIRST PLAYABLE SLICE / 建议</span><h3 id="product-first-slice-title">{PRODUCT_FIRST_SLICE.title}</h3></div><span>规划中</span></div>
      <p className="product-slice-summary">{PRODUCT_FIRST_SLICE.summary}</p>
      <div className="product-slice-grid"><section><h4><Route size={15}/>体验经过</h4><ol>{PRODUCT_FIRST_SLICE.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></section><section className="product-slice-acceptance"><h4><BookOpen size={15}/>什么时候算做成了</h4><ul>{PRODUCT_FIRST_SLICE.acceptance.map(criterion => <li key={criterion}><i/>{criterion}</li>)}</ul></section></div>
    </section>

    <div className="product-directions-footer"><p>这些是可讨论的方向，不代表已上线功能或发布日期。</p><button onClick={onViewRoadmap}><Route size={15}/>查看接入路线<ArrowRight size={14}/></button></div>
  </section>;
}
