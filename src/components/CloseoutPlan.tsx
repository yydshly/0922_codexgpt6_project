import acceptanceRecordUrl from '../../docs/ACCEPTANCE-RECORD.md?url';
import acceptanceUrl from '../../docs/FINAL-ACCEPTANCE.md?url';
import finalReportUrl from '../../docs/FINAL-TECHNICAL-REPORT.md?url';
import { CLOSEOUT_STEPS, COVERAGE_AUDIT, CURRENT_RELEASE, FINAL_CLOSEOUT, OPEN_FINDINGS, RESOLVED_FINDINGS } from '../data/closeoutPlan';
import { CONTENT_COVERAGE } from '../data/contentCoverage';
import { SCOPE_ADDITIONS } from '../data/executionPlan';
import closeoutUrl from '../../docs/FIRST-RELEASE-CLOSEOUT.md?url';
const evidenceUrl = (path: string) => `https://github.com/yydshly/0922_codexgpt6_project/blob/main/${path}`;
export function CloseoutPlan({ onTopic }: { onTopic: (id: string) => void }) {
 return <section className="closeout-plan" data-closeout>
  <h3>本轮验收通过 · 认知版已冻结</h3>
  <p>2026-09-26 用户反馈“暂时没有看到问题”，确认本轮通过。当前版本冻结；后续问题另行登记，不自动追加优化。</p><p><a href={acceptanceRecordUrl} download="ACCEPTANCE-RECORD.md">查看用户确认与版本冻结记录 ↗</a></p>
  <ol className="closeout-steps" data-final-closeout>{FINAL_CLOSEOUT.map(step=><li key={step.id} data-final-step={step.id}><h4>{step.title}</h4><strong>{step.status}</strong><p>{step.detail}</p></li>)}</ol>
  <p><a href={acceptanceUrl} download="FINAL-ACCEPTANCE.md">下载五步用户验收清单 ↗</a> · <a href={finalReportUrl} download="FINAL-TECHNICAL-REPORT.md">查看集中技术收尾记录 ↗</a></p>
  <h3>既有五步台账与证据</h3>
  <p>当前版本 {CURRENT_RELEASE.version}。技术收尾与本轮用户确认已完成；验收依据和范围见冻结记录。下面保留五步台账和各类证据，未覆盖的科学细节不因技术检查而变为已实现。</p>
  <a href={closeoutUrl} download="首版收尾与25项核对表.md">下载收尾计划、核对表与未关闭事项 ↗</a>
  <ol className="closeout-steps">{CLOSEOUT_STEPS.map(step => <li key={step.id} data-closeout-step={step.id}><h4>{step.id} · {step.title}</h4><strong>{step.status}</strong><p>{step.done}</p></li>)}</ol>
  <h3>本版未关闭事项：{OPEN_FINDINGS.length} 项</h3>
  <p>本轮验收事项已按确认范围关闭；跨设备、长期表现与科学模型边界仍保留，不视为全面验证。</p>
  <div className="master-coverage">{OPEN_FINDINGS.map(item => <article key={item.id} data-finding={item.id}><h4>{item.id} · {item.title}</h4><small>{item.kind} · {item.packages.join(' / ')} · 未关闭</small><p>{item.current}</p><p><strong>关闭标准：</strong>{item.close}</p><details><summary>查看依据</summary>{item.evidence.map(path => <p key={path}><a href={evidenceUrl(path)} target="_blank" rel="noreferrer">{path.split('/').at(-1)} ↗</a></p>)}</details></article>)}</div>
  <h3>已完成的收尾与用户确认</h3><div className="master-coverage">{RESOLVED_FINDINGS.map(item=><article key={item.id} data-resolved-finding={item.id}><h4>{item.id} · {item.title}</h4><small>{item.status}</small><p>{item.result}</p>{item.evidence.map(path=><p key={path}><a href={evidenceUrl(path)} target="_blank" rel="noreferrer">{path.split('/').at(-1)} ↗</a></p>)}</article>)}</div>
  <h3>20 类主题 + 5 项首版必补 · 逐项核对</h3>
  <p>每项单独记录复验范围；已检查代表画面不等于该类全部能力或科学精度验收通过。已上线、验证依据、用户验收分别记录；版本整体验收已通过，逐项个人勾选未自动修改。</p>
  <div className="closeout-audit">{COVERAGE_AUDIT.map(row => {
   const topic = CONTENT_COVERAGE.find(t => t.id === row.id);
   const addition = SCOPE_ADDITIONS.find(t => t.id === row.id);
   return <details key={row.id} data-audit-id={row.id}><summary>{row.id} · {topic?.title ?? addition?.title}</summary><p><strong>当前：</strong>{topic?.current ?? addition?.status}</p><p><strong>核对层级：</strong>{row.review}</p><p><strong>验收动作：</strong>{row.check}</p><p><strong>用户验收：</strong>版本整体验收通过；本项未单独登记{row.findingIds.length > 0 && `；关联未关闭事项 ${row.findingIds.join('、')}`}</p>{row.reports.map(path => <p key={path}><a href={evidenceUrl(path)} target="_blank" rel="noreferrer">已有证据 · {path.split('/').at(-1)} ↗</a></p>)}{(topic ? [topic.id] : addition?.topics ?? []).map(id => <button key={id} onClick={() => onTopic(id)}>查看 {id} 的现有入口与范围</button>)}</details>;
  })}</div>
  <p className="master-plan-note">首版完成标准：主要构成与约定代表体验达到标准、关键问题关闭、科学和体验证据齐备，并由用户确认。全部天体、实时天气、精细地形、飞船/碰撞/仙侠和更广宇宙专题属于已登记的后续范围。</p>
 </section>;
}
