import {useState} from 'react';
import {BaselineReview} from './BaselineReview';
import {CONTENT_COVERAGE,COVERAGE_DATASETS,type CoverageEntry,type PlanTab} from '../data/contentCoverage';
import {OBSERVATION_COUNTS} from '../data/observationCatalog';
import type {StageFlags} from '../data/stages';
import {publicAsset} from '../data/publicAsset';
import {MASTER_PLAN} from '../data/masterPlan';
import coverageUrl from '../../docs/CONTENT-COVERAGE.md?url';
import planUrl from '../../docs/MASTER-PLAN.md?url';
import './MasterPlan.css';
export function MasterPlan({onVisit,stages,initialTab='baseline',initialFilter='全部'}:{onVisit:(entry:CoverageEntry,tab:PlanTab,filter?:string)=>void;stages:StageFlags;initialTab?:PlanTab;initialFilter?:string}){
 const [tab,setTab]=useState<PlanTab>(initialTab),[phase,setPhase]=useState('M0'),[filter,setFilter]=useState(initialFilter);
 const m=MASTER_PLAN.phases.find(item=>item.id===phase)!;
 const rows=CONTENT_COVERAGE.filter(r=>filter==='全部'||r.status===filter);
 return <div className="master-plan">
  {tab==='baseline'?<section className="master-plan-intro baseline-intro"><span>当前执行 M0.1 / M1.1 · 交付待验收</span><h2>先验收已有能力，再补齐整体空间</h2><p>先完成下方五项检查；完整范围、20 类内容与后续顺序可切换页签查看。</p></section>:<section className="master-plan-intro"><span>产品总规划 · {MASTER_PLAN.updated} · 待评审</span><h2>先拥有整张地图，再决定下一步。</h2><p>目标：从宏观结构到天体、家族与现象，建立有来源、能观察、可理解的太阳系认知产品，再扩展可干预的世界。</p><div className="master-plan-counts"><strong>{MASTER_PLAN.phases.length}<small>主线里程碑</small></strong><strong>{MASTER_PLAN.phases.flatMap(m=>m.packages).length}<small>工作包</small></strong><strong>{MASTER_PLAN.coverage.length}<small>核心主题</small></strong><strong>{MASTER_PLAN.branches.length}<small>后续分支</small></strong></div><p>当前已有 {OBSERVATION_COUNTS.allDynamic} 个动态目标、九批图层和 17 项全景目录。近期“四批优化”只是其中的观察体验子项目；完成它们不等于太阳系内容全部完成。数量取自当前对象目录；覆盖状态经代码与数据清单核对，尚未逐类完成用户验收。</p><a href={planUrl} download="太阳系产品总规划.md">下载完整总规划 ↗</a></section>}
  <nav className="master-plan-tabs" aria-label="总规划内容">{[['baseline','当前版本验收'],['route','总路线'],['coverage','元素覆盖'],['data','数据与实现'],['delivery','验收与后续']].map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key as PlanTab)}>{label}</button>)}</nav>
  {tab==='baseline'&&<BaselineReview onVisit={entry=>onVisit(entry,'baseline')} onCoverage={()=>setTab('coverage')}/> }
  {tab==='route'&&<section><h3>七个里程碑 · 从基线到完整认知版</h3><p>主线按 M0 → M6 推进；数据准备和画面工作可按依赖交错。所有里程碑仍需各自验收，已有功能可以复用。</p><div className="master-milestones">{MASTER_PLAN.phases.map(item=><button key={item.id} aria-pressed={phase===item.id} onClick={()=>setPhase(item.id)}><b>{item.id}</b><strong>{item.title}</strong><small>{item.status}</small></button>)}</div><article className="master-phase" aria-live="polite"><span>{m.id} · {m.status}</span><h3>{m.title}</h3><p>{m.goal}</p><p><strong>前置依赖：</strong>{m.dependency}</p>{m.packages.map(w=><section key={w.id}><h4>{w.id} · {w.title}</h4><p>{w.scope}</p><p className="master-acceptance"><strong>完成标准：</strong>{w.acceptance}</p></section>)}</article><p className="master-plan-note">当前正在推进 M0.1 + M1.1：20 类内容已关联现有模块、数据包和入口；集中验收与统一供数仍待完成，然后进入 M2 宏观整体。不是直接从当前优化跳到游戏，也不是重新从零开发。</p></section>}
  {tab==='coverage'&&<section><h3>核心元素覆盖 · 当前有什么，还缺什么</h3><p>“已有基础”不等于整体验收通过。真实对象、结构示意和推断模型使用不同完成标准；奥尔特云不以虚构逐体实测位置补齐。</p><a href={coverageUrl} download="太阳系20类内容覆盖清单.md">下载内容清单与实现对应 ↗</a><label className="master-filter">查看层级<select value={filter} onChange={e=>setFilter(e.target.value)}>{['全部',...new Set(MASTER_PLAN.coverage.map(r=>r.status))].map(s=><option key={s}>{s}</option>)}</select></label><p role="status">当前显示 {rows.length} / {MASTER_PLAN.coverage.length} 类</p><div className="master-coverage">{rows.map(r=>{
 const blocked=r.stages.some(id=>!stages[id]);
 return <article key={r.id} data-coverage={r.id}><div><h4>{r.id} · {r.title}</h4><span>{r.status}</span></div>
 <p><strong>当前显示：</strong>{r.current}</p><p><strong>数据依据：</strong>{r.evidence}</p>
 <p><strong>还需补齐：</strong>{r.target}</p><small>归属 {r.phase} · {r.acceptance}</small>
 <p>{r.how}</p>{r.entry?<button disabled={blocked} onClick={()=>onVisit(r.entry!,'coverage',filter)}>查看现有{r.id==='E07'?'分类':r.id==='E18'?'示意':'入口'} ↗</button>:<p>暂无观测入口</p>}
 {blocked&&<p role="status">相关阶段已关闭，请从主页“阶段导览”开启；不会自动更改你的开关。</p>}
 <details><summary>验证、发布与数据版本</summary><p><strong>验证：</strong>{r.validation}</p><p><strong>发布：</strong>{r.release}</p>
 {r.datasets.map(key=>{const d=COVERAGE_DATASETS[key];return <p key={key} className="coverage-version"><a href={publicAsset(d.path)} target="_blank" rel="noreferrer">{d.version} ↗</a><br/>数据覆盖：{d.startUtc.slice(0,10)} 至 {d.endUtc.slice(0,10)}（UTC，含边界插值样本；可选日期以主时间轴为准）</p>;})}
 {!r.datasets.length&&<p>无逐体历表包；资料出处见现有入口的来源说明。{!r.entry&&'新增对象的数据来源和有效期仍待确定。'}</p>}
 </details></article>;
 })}</div></section>}
  {tab==='data'&&<section><h3>从权威资料到产品画面</h3><p className="master-plan-note">来源快照 → 单位与身份检查 → 时间 / 坐标 / 中心统一 → 分包与独立验证 → 场景和参数共用 → 来源解释 → 用户验收与发布</p><div className="master-source-grid">{MASTER_PLAN.sources.map(s=><article key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><p>{s.use}</p></article>)}</div><h3>每项内容都要交代清楚</h3><ul><li>它是什么、属于哪个系统，哪里有入口，采用何种数据或模型。</li><li>来源版本、时间范围、单位和参照中心；天体中心与系统质心不能混用。</li><li>实际尺寸 / 距离与显示缩放分开；真实观测、示意进度和物理实验分开。</li><li>插值误差、简化模型差异和观测不确定性分开报告；没有数据时不造值。</li><li>资料、供数、物理 Worker、绘图、交互与知识说明分离；新增显示对象不自动进入引力积分。</li></ul><p>基础窗口继续采用 2026—2027 年。其他时期的事件或对象须明确独立有效期；不静默外推。真实恒星目录仍待导入，当前背景不能被称为已完成星表。</p></section>}
  {tab==='delivery'&&<section><h3>认知版什么时候算完成？</h3><ol><li>20 类主题达到各自约定层级，每项有入口、表示、控制/观察、说明与来源。</li><li>六条路线走通：整体边界、地月、巨行星、小天体、太阳风与地球、宇宙位置。</li><li>科学数据与关键异常流程通过；在冻结参考设备上检查性能和连续切换。</li><li>代码、数据版本、验证报告、已知限制与发布记录齐备，用户验收确认。</li></ol><p>每轮绑定工作包编号，分别记录“实现、验证、用户验收、发布”。规划包不是等量工作，不按提交数计算完成率。具体工期在数据可得性和资源预算核查后估算。</p><h3>后续分支 · 保留在总图，单独启动</h3><div className="master-coverage">{MASTER_PLAN.branches.map(b=><article key={b.id}><h4>{b.id} · {b.title}</h4><p><strong>启动条件：</strong>{b.dependency}</p><p>{b.scope}</p></article>)}</div><p className="master-plan-note">九批阶段开关控制已实现内容；建设记录报告实际变化；总规划决定完整范围与顺序。旧工程扩展页保留作参考细分，优先级服从总规划。</p></section>}
 </div>;
}
