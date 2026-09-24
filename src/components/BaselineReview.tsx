import {useState} from 'react';
import {BASELINE_VERSION,type CoverageEntry} from '../data/contentCoverage';
import {REVIEW_STEPS,REVIEW_STORAGE_KEY,parseReview,type ReviewMarks,type ReviewMark,type ReviewStatus} from '../data/baselineReview';
import auditUrl from '../../docs/LEARNING-FLOW-AUDIT.md?url';
import releaseUrl from '../../docs/BASELINE-REVIEW.md?url';
export function BaselineReview({onVisit,onCoverage}:{onVisit:(entry:CoverageEntry)=>void;onCoverage:()=>void}) {
 const [marks,setMarks]=useState<ReviewMarks>(()=>{try{return parseReview(localStorage.getItem(REVIEW_STORAGE_KEY));}catch{return {};}});
 const [saveError,setSaveError]=useState('');
 const update=(id:string,change:Partial<ReviewMark>)=>{
  const next={...marks,[id]:{...(marks[id]??{status:'pending' as ReviewStatus,note:''}),...change}};
  setMarks(next);try{localStorage.setItem(REVIEW_STORAGE_KEY,JSON.stringify({version:BASELINE_VERSION,marks:next}));setSaveError('');}catch{setSaveError('浏览器无法保存记录。本次页面内仍可使用，请导出记录后再离开。');}
 };
 const count=(status:ReviewStatus)=>REVIEW_STEPS.filter(s=>(marks[s.id]?.status??'pending')===status).length;
 const download=()=>{const blob=new Blob([JSON.stringify({version:BASELINE_VERSION,recordedAt:new Date().toISOString(),meaning:'用户个人检查记录；不等于科学总验收或发布',marks},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='太阳系当前版本检查记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section className="baseline-review">
 <h3>当前版本 · 先检查这五件事</h3><p>当前交付版，待用户验收；部署状态以 GitHub 发布记录为准。本次整理包括整体规划、紧凑工具栏、太阳亮斑、学习主线和观察流程修复；没有新增天体或更改历表。</p>
 <div className="master-plan-note"><strong>M0.1 / M1.1 · 正在核对基础与覆盖</strong><p>覆盖清单已关联 20 类主题的入口、实现模块和五组数据包。这里只整理当前能力；真实性总验收、性能预算和六条专题路线仍待完成。</p><button onClick={onCoverage}>查看20类内容与缺口 →</button></div>
 <p>按下方顺序打开场景检查；使用场景右上角“返回整体规划”继续记录。不会自动修改日期、播放或阶段开关。</p>
 <div className="baseline-record-summary" role="status">待检查 {count('pending')} · 符合预期 {count('pass')} · 发现问题 {count('issue')}</div>
 <p className="baseline-record-note">检查结果由你选择，保存在当前浏览器，可随时修改；不代表系统已通过总验收，也不会触发提交或发布。</p>
 {saveError&&<p role="alert">{saveError}</p>}
 <ol className="baseline-checklist">{REVIEW_STEPS.map(step=><li key={step.id}>
 <h4>{step.title}</h4><p><strong>操作：</strong>{step.action}</p><p><strong>预期：</strong>{step.expected}</p>
 <div className="baseline-check-actions"><button onClick={()=>onVisit(step.entry)}>打开检查场景 ↗</button><label>我的检查结果<select value={marks[step.id]?.status??'pending'} onChange={e=>update(step.id,{status:e.target.value as ReviewStatus})}><option value="pending">待检查</option><option value="pass">符合预期</option><option value="issue">发现问题</option></select></label></div>
 <label className="baseline-note-label">问题或补充说明<textarea rows={2} maxLength={2000} value={marks[step.id]?.note??''} onChange={e=>update(step.id,{note:e.target.value})} placeholder="例如：切换侧视后，地球仍被标签遮挡"/></label>
 </li>)}</ol>
 <div className="baseline-links"><button onClick={download}>导出我的检查记录</button><a href={releaseUrl} download="当前版本变更与验收说明.md">下载本批变更说明</a><a href={auditUrl} download="学习流程检查报告.md">下载已有流程检查报告</a></div>
 <p>完成这批验收后，下一步是宏观区域层次与真实恒星背景。当前记录仅覆盖本批界面和观察流程，不把既有 166 项测试当作所有科学内容已验收的证明。</p>
 </section>;
}
