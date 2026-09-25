import type {CoverageEntry,PlanTab} from '../data/contentCoverage';
import type {StageFlags} from '../data/stages';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Boxes, ChevronDown, ChevronRight, CircleDot, Compass, Download, Flag, Layers3, ListChecks, Orbit, Route, ShieldCheck } from 'lucide-react';
import { ROADMAP_BASELINE, ROADMAP_FOUNDATION, ROADMAP_NEXT, ROADMAP_SOURCES, ROADMAP_STAGES, ROADMAP_UPDATED } from '../data/roadmap';
import roadmapDocumentUrl from '../../docs/ROADMAP.md?url';
import { MasterPlan } from './MasterPlan';
import { ProductDirections } from './ProductDirections';
import './ExpansionRoadmap.css';

interface ExpansionRoadmapProps {
  onVisit:(entry:CoverageEntry,tab:PlanTab,scroll:number,filter?:string)=>void;
  initialFilter?:string;
  initialScroll?:number;
  stages:StageFlags;
  initialTab?:PlanTab;
  onClose: () => void;
  onExplore: () => void;
  onValidation: () => void;
}

function RoadmapList({ items }: { items: string[] }) {
  return <ul className="roadmap-list">{items.map(item => <li key={item}><i aria-hidden="true"/><span>{item}</span></li>)}</ul>;
}

export function ExpansionRoadmap({ onClose, onExplore, onValidation,onVisit,stages,initialTab,initialFilter,initialScroll=0 }: ExpansionRoadmapProps) {
  const [page, setPage] = useState<'master' | 'integration' | 'products'>('master');
  const [selectedId, setSelectedId] = useState('satellites');
  const selected = ROADMAP_STAGES.find(stage => stage.id === selectedId) ?? ROADMAP_STAGES[0];
  const container = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const masterButton = useRef<HTMLButtonElement>(null);
  const integrationButton = useRef<HTMLButtonElement>(null);
  const productsButton = useRef<HTMLButtonElement>(null);

  const showPage = (nextPage: 'master' | 'integration' | 'products') => {
    setPage(nextPage);
    scroll.current?.scrollTo({ top: 0 });
    (nextPage === 'master' ? masterButton : nextPage === 'integration' ? integrationButton : productsButton).current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus({ preventScroll: true });
    scroll.current?.scrollTo({top:initialScroll});
    return () => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') event.stopPropagation();
    if (event.key !== 'Tab') return;
    const focusable = Array.from(container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !container.current?.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  return <section className="expansion-roadmap" ref={container} role="dialog" aria-modal="true" aria-labelledby="expansion-roadmap-title" onKeyDown={handleKeyDown} onKeyUp={event => { if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Escape') event.stopPropagation(); }}>
    <header className="roadmap-header">
      <div className="roadmap-header-title"><Route size={20} aria-hidden="true"/><div><span className="roadmap-eyebrow">PRODUCT MASTER PLAN</span><h1 id="expansion-roadmap-title">整体规划</h1></div></div>
      <button ref={closeButton} className="roadmap-return" onClick={onClose}><ArrowLeft size={15}/><span>返回观测</span><kbd>Esc</kbd></button>
    </header>

    <nav className="roadmap-page-nav" aria-label="规划类别">
      <button ref={masterButton} aria-pressed={page === 'master'} aria-controls="roadmap-page-content" onClick={() => showPage('master')}><Route size={15}/>总规划</button>
      <button ref={integrationButton} aria-pressed={page === 'integration'} aria-controls="roadmap-page-content" onClick={() => showPage('integration')}><Route size={15}/>工程扩展</button>
      <button ref={productsButton} aria-pressed={page === 'products'} aria-controls="roadmap-page-content" onClick={() => showPage('products')}><Compass size={15}/>产品方向<span>卫星 · 飞船 · 仙侠</span></button>
    </nav>
    <div className="roadmap-scroll" ref={scroll}>
      <div className="roadmap-content" id="roadmap-page-content">
        {page === 'master' ? <MasterPlan onVisit={(entry,tab,filter)=>onVisit(entry,tab,scroll.current?.scrollTop??0,filter)} initialFilter={initialFilter} stages={stages} initialTab={initialTab}/> : page === 'products' ? <ProductDirections onViewRoadmap={() => showPage('integration')}/> : <>
        <p className="master-legacy-note">这里保留天体接入、沙盒和飞船的工程细分。认知版已完成本轮验收并冻结。以下六组是历史工程细分与候选能力，是否启动由「产品方向」中的目标和前提决定。</p>
        <section className="roadmap-baseline" aria-labelledby="roadmap-baseline-title">
          <div className="roadmap-baseline-copy"><span className="roadmap-section-kicker"><i/>当前已有</span><h2 id="roadmap-baseline-title">从真实观测出发。</h2><p>{ROADMAP_BASELINE.summary}</p><div className="roadmap-existing-actions"><button onClick={onExplore}><Compass size={14}/>查看当前天体<ArrowRight size={13}/></button><button onClick={onValidation}><ShieldCheck size={14}/>查看物理验证<ArrowRight size={13}/></button></div></div>
          <dl className="roadmap-baseline-counts"><div><dt>主观测动态天体</dt><dd>{ROADMAP_BASELINE.dynamicCount}<small>个</small></dd><span>本观测站的样本</span></div><div><dt>另有图鉴条目</dt><dd>{ROADMAP_BASELINE.knowledgeCount}<small>个</small></dd><span>与宏观目标有重叠</span></div><div><dt>物理验证模型</dt><dd>{ROADMAP_BASELINE.physicsCount}<small>体</small></dd><span>共用真实初始状态</span></div></dl>
        </section>

        <section className="roadmap-foundation" aria-labelledby="roadmap-foundation-title">
          <span className="roadmap-foundation-mark">P0</span><div><div className="roadmap-foundation-title"><h2 id="roadmap-foundation-title">{ROADMAP_FOUNDATION.title}</h2><span>共同前置基础 · 待完善</span></div><p>{ROADMAP_FOUNDATION.summary}</p><details><summary>查看基础要求<ChevronDown size={12}/></summary><RoadmapList items={ROADMAP_FOUNDATION.requirements}/></details></div>
        </section>

        <div className="roadmap-plan-heading"><div><span className="roadmap-section-kicker future"><i/>工程能力细分</span><h2>六组历史工程能力，按目标选用。</h2></div><p>选择候选能力，查看前提、范围与完成标准。</p></div>
        <div className="roadmap-workspace" ref={workspace}>
          <nav className="roadmap-stage-nav" aria-label="扩展阶段">
            {ROADMAP_STAGES.map(stage => <button key={stage.id} className={`roadmap-stage-button ${selected?.id === stage.id ? 'selected' : ''}`} aria-pressed={selected?.id === stage.id} aria-controls="roadmap-stage-detail" onClick={() => { setSelectedId(stage.id); workspace.current?.scrollIntoView({ block: 'start' }); }}><span className="roadmap-stage-number">{stage.number}</span><span className="roadmap-stage-label"><strong>{stage.title}</strong><small className={stage.status === '建议下一步' ? 'is-next' : ''}>{stage.status}</small></span><ChevronRight size={14}/></button>)}
            <p className="roadmap-nav-note">对应总规划 M1–M3 与后续 G1–G3 分支。</p>
          </nav>

          {selected && <article className="roadmap-stage-detail" id="roadmap-stage-detail" aria-labelledby="roadmap-selected-title">
            <div className="roadmap-detail-heading"><div><span className="roadmap-eyebrow">阶段 {selected.number} / {selected.status}</span><h2 id="roadmap-selected-title">{selected.title}</h2></div><span className="roadmap-planned-status"><i/>{selected.progress ?? '规划中 · 未实现'}</span></div>
            <p className="roadmap-stage-summary">{selected.summary}</p>
            <div className="roadmap-detail-grid">
              <section className="roadmap-outcomes"><h3><Compass size={15}/>完成后，你能做什么</h3><RoadmapList items={selected.outcomes}/></section>
              <section className="roadmap-candidates"><h3><Orbit size={15}/>候选对象与范围</h3><RoadmapList items={selected.candidates}/><a className="roadmap-source-jump" href="#roadmap-source-links">参考资料与完整规划<ArrowRight size={11}/></a></section>
            </div>
            <section className="roadmap-dependency"><Layers3 size={15}/><div><h3>前置条件</h3><p>{selected.dependency}</p></div></section>
            <section className="roadmap-acceptance"><h3><ListChecks size={15}/>完成时需要达到的标准</h3><RoadmapList items={selected.acceptance}/></section>
            <p className="roadmap-stage-boundary"><CircleDot size={13}/><span>{selected.boundary}</span></p>
          </article>}
        </div>

        <section className="roadmap-next" aria-labelledby="roadmap-next-title"><div className="roadmap-next-heading"><Flag size={19}/><div><span className="roadmap-eyebrow">NEXT ITERATION / 建议</span><h2 id="roadmap-next-title">{ROADMAP_NEXT.title}</h2></div><span className="roadmap-next-status">候选 · 尚未启动</span></div><p>{ROADMAP_NEXT.summary}</p><ol>{ROADMAP_NEXT.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ol></section>

        </>}
        {page !== 'master' && <div className="roadmap-references" id="roadmap-source-links"><div>{page === 'integration' ? <><span>来源资料</span><nav aria-label="扩展路线资料来源">{ROADMAP_SOURCES.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={11}/></a>)}</nav></> : <span>完整规划包含接入路线、产品分支与后续能力接口。</span>}</div><a className="roadmap-download" href={roadmapDocumentUrl} download="太阳系扩展实施规划.md"><Download size={13}/>下载工程细分</a></div>}
        <footer className="roadmap-footer"><p><Boxes size={13}/>规划不代表已上线；顺序按依赖调整，暂未承诺日期。</p><span>规划更新 {ROADMAP_UPDATED}</span></footer>
      </div>
    </div>
  </section>;
}
