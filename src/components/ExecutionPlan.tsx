import r06ReportUrl from '../../docs/R06-MOTION-AND-EVENTS.md?url';
import r05ReportUrl from '../../docs/R05-ENVIRONMENT-LINKS.md?url';
import r04ReportUrl from '../../docs/R04-APPEARANCE.md?url';
import r03ReportUrl from '../../docs/R03-SYSTEMS-AND-RINGS.md?url';
import r02ReportUrl from '../../docs/R02-OUTER-VISITORS.md?url';
import {useState} from 'react';
import {MASTER_PLAN} from '../data/masterPlan';
import {DELIVERY_BATCHES,SCOPE_ADDITIONS,EXECUTION_VERSION} from '../data/executionPlan';
import r01ReportUrl from '../../docs/R01-SMALL-BODIES.md?url';
import executionUrl from '../../docs/EXECUTION-PLAN.md?url';
export function ExecutionPlan({onTopic}:{onTopic:(id:string)=>void}){
 const [selected,setSelected]=useState('R01');
 const batch=DELIVERY_BATCHES.find(b=>b.id===selected)!;
 const additions=SCOPE_ADDITIONS.filter(s=>s.batches.includes(selected));
 return <section className="execution-plan" aria-label="九批交付计划">
 <p className="master-plan-note">当前版本包含 R03 家族、双体与环代表，R04 不规则形状、太阳分层、土卫二内部示意，以及本轮比例和近景修复。R04 约定基础已实现，用户整批验收仍待完成；高精度表面、天气与完整姿态等缺口保留。R05–R09 继续按顺序推进。发布结果与本地工作分别见建设记录。</p>
 <h3>九批交付顺序 · 先补太阳系内部，再完善宇宙背景</h3>
 <p>{EXECUTION_VERSION} · 各批状态分别记录。原 M0–M6 的编号保留，下面按可验收版本安排交付。</p>
 <p className="master-plan-note">这九批是后续建设的交付顺序；主页“阶段导览”的九批开关控制已有画面。两者互不对应。选择下面的批次只查看计划，不会开启场景或增加天体。</p>
 <a href={executionUrl} download="太阳系九批交付与范围补正.md">下载九批动作与验收标准 ↗</a>
 <ol className="execution-sequence">{DELIVERY_BATCHES.map((b,i)=><li key={b.id}><button aria-pressed={selected===b.id} aria-controls="execution-detail" onClick={()=>setSelected(b.id)}><b>{String(i+1).padStart(2,'0')}</b><span>{b.title}<small>{b.id==='R01'?'四个代表已接入 · 待验收':b.id==='R02'?'远缘与访客已接入 · 待验收':b.id==='R03'?'代表已接入 · 待验收':b.id==='R04'?'已核对 · 缺口见记录':b.id==='R05'?'已发布 · 整批待验收':b.id==='R06'?'运动第一课 · 本地验收':'待执行'}</small></span></button></li>)}</ol>
 <article id="execution-detail" className="master-phase" aria-live="polite">
 <span>{batch.id} · {batch.status}</span>{batch.id==='R01'&&<p><a href={r01ReportUrl} download="R01小天体来源与验收.md">下载本批数据验证与验收路径 ↗</a></p>}{batch.id==='R02'&&<p><a href={r02ReportUrl} download="R02远缘与历史访客来源验收.md">下载 R02 数据与验收说明 ↗</a></p>}{batch.id==='R03'&&<p><a href={r03ReportUrl} download="R03家族与环接入记录.md">下载 R03 当前进度与验收说明 ↗</a></p>}{batch.id==='R04'&&<p><a href={r04ReportUrl} download="R04外观与形状接入记录.md">下载 R04 进度与验收说明 ↗</a></p>}{batch.id==='R05'&&<p><a href={r05ReportUrl} download="R05环境联系进度与验收.md">下载 R05 当前进度与验收说明 ↗</a></p>}{batch.id==='R06'&&<p><a href={r06ReportUrl} download="R06运动与天象进度.md">下载 R06 分步规划与验收说明 ↗</a></p>}<h3>{batch.title}</h3>
 <p><strong>可复用与前置：</strong>{batch.dependency}</p><p><strong>依赖：</strong>{batch.after.join('、')||'从现有基线开始'}；<strong>对应工作包：</strong>{batch.packages.join('、')}</p>
 <h4>本批必须完成</h4><ol>{batch.must.map(item=><li key={item}>{item}</li>)}</ol>
 <h4>验收时检查</h4><ul>{batch.acceptance.map(item=><li key={item}>{item}</li>)}</ul>
 <p className="master-acceptance"><strong>范围边界：</strong>{batch.boundary}</p>
 {additions.length>0&&<p><strong>本批关联补项：</strong>{additions.map(s=>s.title).join('、')}</p>}
 <div className="execution-topic-links" aria-label="关联的现状清单">{batch.topics.map(id=><button key={id} onClick={()=>onTopic(id)}>{MASTER_PLAN.coverage.find(t=>t.id===id)?.title??id} · 现状</button>)}</div>
 </article>
 <h3>补正后的首版范围</h3><p>20 类是产品目录，不能据此宣称穷尽全部天文学分类。下列补项跨目录关联，既有功能可复用，补项本身尚未计为实现。</p>
 <div className="master-coverage execution-additions">{SCOPE_ADDITIONS.map(s=><article key={s.id} data-scope-addition={s.id}><div><h4>{s.title}</h4><span>{s.level}</span></div><p>{s.scope}</p><p><strong>本版标准：</strong>{s.acceptance}</p><p><strong>延期边界：</strong>{s.deferred}</p><small>{s.batches.length?s.batches.join(' / '):'单独范围记录，不新增交付批次'} · {s.status}</small>{s.sources.map((url,i)=><p key={url}><a href={url} target="_blank" rel="noreferrer">科学依据{s.sources.length>1?` ${i+1}`:''} ↗</a></p>)}</article>)}</div>
 <h3>什么情况下才能说这一版完成？</h3>
 <p>主要构成有覆盖，选定代表有可用体验，五项首版必补内容有证据，六条专题路线走通，数据与性能检查通过，并由用户确认验收。收录每颗天体、全部地形和历史事件不属于本版承诺。</p>
 <p>每批按“数据准入 → 显示与交互 → 介绍与来源 → 本地验证 → 用户验收与发布记录”执行。数据无法满足时先说明阻塞或范围调整，不用虚构样本凑数；不按提交次数或批次数计算完成百分比。</p>
 </section>;
}
