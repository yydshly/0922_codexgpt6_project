import integrationReport from '../../docs/HOME-INTEGRATION.md?url';
import {CONTENT_COVERAGE,type CoverageItem} from '../data/contentCoverage';
import {OBSERVATION_COUNTS} from '../data/observationCatalog';
import type {StageFlags} from '../data/stages';
export function HomeContentIndex({stages,ready,onVisit,onStages}:{stages:StageFlags;ready:number;onVisit:(item:CoverageItem)=>void;onStages:()=>void}){
 return <section className="home-content-index" aria-label="全景接入总表"><h2>已有内容都在哪里？</h2>
 <p>已收录 {OBSERVATION_COUNTS.allDynamic} 个动态目标；当前供数 {ready} 个。供数数量不代表此刻可见数量：阶段开关、日期加载和观察尺度都会影响显示。</p>
 <p>另有 1 个星际访客历史案例，不计入当前供数。从主体到环境逐项进入。真实天体使用统一日期；点云、磁场、太阳活动等是原理示意，靠近才展开，奥尔特云属于模型推断。</p>
 <a href={integrationReport} download="已有内容的全景整合与验收.md">查看整合清单与验收说明 ↗</a>
 {CONTENT_COVERAGE.map(row=>{const gates=row.id==='E16'?(['environment','nearEarth'] as const):row.stages;const hidden=gates.length>0&&gates.every(id=>!stages[id]);return <article key={row.id} data-home-content={row.id}><h3>{row.title}</h3><small>{row.entry?(hidden?'相关阶段已关闭':row.evidence):'尚未接入'}</small><p>{row.current}</p>{row.entry?<button onClick={()=>hidden?onStages():onVisit(row)}>{hidden?'查看阶段开关':'进入观察'}</button>:<p>规划中的内容，不计为已有能力。</p>}<details><summary>尚待补充</summary><p>{row.target}</p></details></article>;})}
 </section>;
}
