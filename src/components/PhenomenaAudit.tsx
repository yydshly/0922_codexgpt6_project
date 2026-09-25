import {useEffect,useState} from 'react';
import {publicAsset} from '../data/publicAsset';
interface EventEvidence {id:string;title:string;meaning:string;limit:string;report:string;deltaSeconds:number;reference:string;source:string;extra:string|null;}
interface Evidence {schemaVersion:number;generatedAt:string;integrityPassed:boolean;accuracyCertified:boolean;events:EventEvidence[];attitude:{source:string;appearanceObjects:number;limit:string;objects:{id:string;name:string;renderedHours:number;note:string;model:string}[]};schematics:{id:string;manifest:string}[];parts:{id:string;name:string;group:string}[];remaining:string[];}
const signed=(n:number)=>`${n>=0?'+':''}${n.toFixed(1)}`;
export function PhenomenaAudit(){
 const [report,setReport]=useState<Evidence|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setReport(null);setError('');
  fetch(publicAsset('/data/validation/phenomena-audit.json'),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('现象与显示核验报告暂时无法读取');return r.json();}).then((r:Evidence)=>{
   if(r.schemaVersion!==1||r.integrityPassed!==true||r.accuracyCertified!==false||!Number.isFinite(Date.parse(r.generatedAt))||!Array.isArray(r.events)||r.events.length!==3||!r.events.every(e=>Number.isFinite(e.deltaSeconds))||!Array.isArray(r.attitude?.objects)||!r.attitude.objects.length||!Array.isArray(r.schematics)||!Array.isArray(r.parts)||!Array.isArray(r.remaining))throw Error('报告不完整或未通过一致性检查，请查看原始记录');
   setReport(r);
  }).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();
 },[attempt]);
 return <section className="science-audit phenomena-audit" aria-label="现象与显示核验"><h3>画面里的效果，有多接近真实？</h3>
 <p>位置有历表依据，不代表表面天气、磁场或每个天体现时朝向都已还原。下面分别说明。</p>
 {!report&&!error&&<p role="status">正在读取现象与显示核验记录…</p>}
 {error&&<div role="alert"><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)}>重试现象核验报告</button></div>}
 {report&&<div className="phenomena-audit-results">
 <div className="science-audit-scope">三例事件已重新计算并核对输入文件；一致性检查通过。以下差异是简化模型与参考预报之差，不是插值误差，也不是精度认证。</div>
 <div className="science-audit-results">{report.events.map(e=><article key={e.id} className="phenomena-event"><strong>{e.title}</strong><p>{e.meaning}：<b>{signed(e.deltaSeconds)} 秒</b>（正值表示模型较晚）。</p><p>{e.limit}</p>{e.extra&&<p>{e.extra}</p>}<details><summary>对照来源与原始结果</summary><small>参考：{e.reference}；统一换算为 TDB 后比较。</small><div className="data-journey-links"><a href={e.source} target="_blank" rel="noreferrer">权威参考 ↗</a><a href={publicAsset('/'+e.report)} target="_blank" rel="noreferrer">完整计算结果 ↗</a></div></details></article>)}</div>
 <details><summary>自转和表面 · {report.attitude.objects.length} 个参考姿态 / {report.attitude.appearanceObjects} 个外观登记对象</summary><p>{report.attitude.limit}</p><p>负自转周期表示模型相对子午线约定的逆向转动；模型周期不等于大气云层的风速周期。</p>{report.attitude.objects.map(b=><article className="science-audit-package" key={b.id}><h4>{b.name} · 模型周期 {signed(b.renderedHours)} 小时</h4><p>{b.model}</p><p>{b.note}</p></article>)}<div className="data-journey-links"><a href={report.attitude.source} target="_blank" rel="noreferrer">NAIF 姿态系数与历史版本 ↗</a></div></details>
 <details><summary>环境与剖面 · {report.parts.length} 个可控现象部件是如何绘制的？</summary><p>太阳分层、黑子、日珥、耀斑与 CME 用几何形状帮助理解。日冕没有这里球壳所画的固定外边界；层厚、颜色与活动进度是教学设置，不是所选日期的太阳观测。</p><p>云层为静态纹理。磁层、极光、辐射带、日球层场线与粒子是说明性结构，没有接入当天的磁场强度、粒子通量或天气。点云数量、密度和粒子速度不能作为实测读数。</p><p>土卫二内部剖面的海洋、冰壳与岩核按资料解释；绘图半径和南极方向是教学设置，不代表实测层厚或该时刻的朝向。奥尔特云分布是推测模型，不是已测绘的天体点名册。</p><p>登记部件：{report.parts.map(p=>p.name).join('、')}。这个数字不代表所有太阳系实体数量。</p><div className="data-journey-links">{report.schematics.map(s=><a key={s.id} href={publicAsset('/'+s.manifest)} target="_blank" rel="noreferrer">{s.id==='solar-atmosphere'?'太阳分层':'土卫二剖面'}来源与绘图限制 ↗</a>)}<a href="https://science.nasa.gov/solar-system/oort-cloud/facts/" target="_blank" rel="noreferrer">NASA 奥尔特云说明 ↗</a></div></details>
 <details><summary>还没有完成什么？</summary><ul>{report.remaining.map(s=><li key={s}>{s}</li>)}</ul></details>
 <small>报告时间：{new Date(report.generatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}（北京时间）</small><div className="data-journey-links"><a href={publicAsset('/data/validation/phenomena-audit.json')} download="phenomena-audit.json">下载现象与显示核验记录</a></div>
 </div>}
 </section>;
}
