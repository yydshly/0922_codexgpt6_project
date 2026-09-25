import {useEffect,useState} from 'react';
import {publicAsset} from '../data/publicAsset';
interface AuditPackage {id:string;title:string;version:string;manifest:string;sourceUrl:string;startUtc:string;endUtc:string;origin:string;chunks:number;recordedInterpolationMaxKm:number;interpolationEvidence:string;historical:boolean;}
interface AuditReport {schemaVersion:number;passed:boolean;generatedAt:string;counts:{packages:number;chunks:number;currentDynamicObjects:number;satellites:number;physicsBodies:number;historicalVisitors:number};packages:AuditPackage[];coreInterpolation:{checkpoints:number;maxPositionKm:number;thresholdKm:number};physics:{generatedAt:string;epochUtc:string;report:string;checks:Record<string,boolean>;convergenceRatio:number};limits:string[];}
export function ScienceAudit(){
 const [report,setReport]=useState<AuditReport|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError('');setReport(null);fetch(publicAsset('/data/validation/science-audit.json'),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('科学核验报告暂时无法读取');return r.json();}).then((r:AuditReport)=>{if(r.schemaVersion!==1||r.passed!==true||!Array.isArray(r.packages)||!r.packages.length||!Number.isFinite(r.coreInterpolation?.maxPositionKm))throw Error('报告未通过或格式不兼容，请先检查原始结果');setReport(r);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[attempt]);
 return <section className="science-audit" aria-label="科学核验清单"><h3>科学核验：哪些重新检查了？</h3>
 <p>核验数据如何进入产品，与判断模型有多接近真实世界，是不同的问题。</p>
 {!report&&!error&&<p role="status">正在读取本地科学核验清单…</p>}
 {error&&<div role="alert"><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)}>重试科学核验报告</button></div>}
 {report&&<><div className="science-audit-results">
 <article><strong>数据包与档案 · 本轮复核通过</strong><p>{report.counts.packages} 组 / {report.counts.chunks} 个数据包：校验值、数值格式、时间覆盖和跨月衔接一致。文件一致不等于天文观测没有误差。</p></article>
 <article><strong>核心历表插值 · 本轮重新计算</strong><p>用浏览器实际插值函数检查 {report.coreInterpolation.checkpoints.toLocaleString()} 个未参与插值的中点。最大位置差 {(report.coreInterpolation.maxPositionKm*1000).toFixed(2)} 米，门槛 {report.coreInterpolation.thresholdKm} 公里；不是所有时刻的严格上界。</p></article>
 <article><strong>十体物理模型 · 最近一次离线复验</strong><p>从 {report.physics.epochUtc.slice(0,10)} UTC 的相同状态出发，完成 30 天 / 一年差异、步长收敛和十年守恒检查。细化步长的差异比为 {report.physics.convergenceRatio.toFixed(5)}；十年结果只说明模型数值稳定，不代表真实十年预测精度。</p><small>物理报告生成时间：{new Date(report.physics.generatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}（北京时间）</small></article>
 </div><p className="science-audit-scope">当前有 {report.counts.currentDynamicObjects} 个动态观测目标，其中 {report.counts.satellites} 个为选定卫星或伴星；仅 {report.counts.physicsBodies} 体进入引力推演。另有 {report.counts.historicalVisitors} 个独立历史访客案例。</p>
 <details><summary>逐组查看数据范围、来源和核验程度</summary>{report.packages.map(p=><article key={p.id} className="science-audit-package"><h4>{p.title}{p.historical?' · 历史时段':''}</h4><p>{p.startUtc.slice(0,10)} 至 {p.endUtc.slice(0,10)} UTC · {p.chunks} 个数据包</p><p>{p.interpolationEvidence}。报告最大位置差 {p.recordedInterpolationMaxKm.toPrecision(4)} km，不是轨道绝对精度。</p><small>版本：{p.version}<br/>参照原点：{p.origin}</small><div className="data-journey-links"><a href={publicAsset('/'+p.manifest)} target="_blank" rel="noreferrer">数据清单与来源记录 ↗</a><a href={p.sourceUrl} target="_blank" rel="noreferrer">原始资料说明 ↗</a></div></article>)}</details>
 <details><summary>尚未等同于完成的事项</summary><ul>{report.limits.map(text=><li key={text}>{text}</li>)}</ul><p>事件案例、自转及示意说明另见下方“画面里的效果，有多接近真实？”；本清单通过不表示全部科学验收已完成。</p></details>
 <small>本轮报告：{new Date(report.generatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}（北京时间）</small>
 <div className="data-journey-links"><a href={publicAsset('/data/validation/science-audit.json')} download="science-audit.json">下载本轮科学核验清单</a><a href={publicAsset('/'+report.physics.report)} target="_blank" rel="noreferrer">查看最新逐日物理验证数据 ↗</a></div></>}
 </section>;
}
