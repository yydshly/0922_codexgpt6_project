import {useState} from 'react';
import {BASELINE_VERSION,type CoverageEntry} from '../data/contentCoverage';
import {REVIEW_STEPS,REVIEW_STORAGE_KEY,parseReview,type ReviewMarks,type ReviewMark,type ReviewStatus} from '../data/baselineReview';
import auditUrl from '../../docs/LEARNING-FLOW-AUDIT.md?url';
import releaseUrl from '../../docs/FIRST-RELEASE-CLOSEOUT.md?url';
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
 <h3>我的验收记录 · 五项操作检查</h3><p>本次检查基线：{BASELINE_VERSION}。记录只覆盖下列操作体验，不替代 20 类主题、5 项必补及性能总验收。</p>
 <div className="master-plan-note"><strong>当前已交付能力与证据</strong><p>53 个动态目标、1 个历史案例、14 节运动课、六路线 27 步及数据/恢复报告已上线。用户验收仍由你逐项确认。</p><button onClick={onCoverage}>查看20类内容与缺口 →</button></div>
 <p>按下方顺序打开场景检查；使用场景右上角“返回整体规划”继续记录。不会自动修改日期、播放或阶段开关。</p>
 <div className="baseline-record-summary" role="status">待检查 {count('pending')} · 符合预期 {count('pass')} · 发现问题 {count('issue')}</div>
 <p className="baseline-record-note">本基线不继承旧版的通过标记，旧版浏览器存储保留；检查结果由你选择，保存在当前浏览器，可随时修改；不代表系统已通过总验收，也不会触发提交或发布。</p>
 {saveError&&<p role="alert">{saveError}</p>}
 <ol className="baseline-checklist">{REVIEW_STEPS.map(step=><li key={step.id}>
 <h4>{step.title}</h4><p><strong>操作：</strong>{step.action}</p><p><strong>预期：</strong>{step.expected}</p>
 <div className="baseline-check-actions"><button onClick={()=>onVisit(step.entry)}>打开检查场景 ↗</button><label>我的检查结果<select value={marks[step.id]?.status??'pending'} onChange={e=>update(step.id,{status:e.target.value as ReviewStatus})}><option value="pending">待检查</option><option value="pass">符合预期</option><option value="issue">发现问题</option></select></label></div>
 <label className="baseline-note-label">问题或补充说明<textarea rows={2} maxLength={2000} value={marks[step.id]?.note??''} onChange={e=>update(step.id,{note:e.target.value})} placeholder="例如：切换侧视后，地球仍被标签遮挡"/></label>
 </li>)}</ol>
 <div className="baseline-links"><button onClick={download}>导出我的检查记录</button><a href={releaseUrl} download="当前版本变更与验收说明.md">下载本批变更说明</a><a href={auditUrl} download="学习流程检查报告.md">下载已有流程检查报告</a></div>
 <p>接下来的实现与总验收以“收尾进度”五步及未关闭事项为准；本页个人标记不会自动关闭全局工作包。</p>
 </section>;
}
