import { CLOSEOUT_STEPS, COVERAGE_AUDIT, CURRENT_RELEASE, OPEN_FINDINGS } from '../data/closeoutPlan';
import { CONTENT_COVERAGE } from '../data/contentCoverage';
import { SCOPE_ADDITIONS } from '../data/executionPlan';
import closeoutUrl from '../../docs/FIRST-RELEASE-CLOSEOUT.md?url';
const evidenceUrl = (path: string) => `https://github.com/yydshly/0922_codexgpt6_project/blob/main/${path}`;
export function CloseoutPlan({ onTopic }: { onTopic: (id: string) => void }) {
 return <section className="closeout-plan" data-closeout>
  <h3>首版收尾 · 固定五步</h3>
  <p>当前版本 {CURRENT_RELEASE.version}。第 1 步已整理；第 2 步已有 20 类主题与 5 项必补的核对表，E01–E20 与 S01–S05 的入口及代表操作已复验，完整子项与异常场景继续按台账检查。第 3—5 步继续执行。工作包不等于修改次数，不按提交数量估算完成率。</p>
  <a href={closeoutUrl} download="首版收尾与25项核对表.md">下载收尾计划、核对表与未关闭事项 ↗</a>
  <ol className="closeout-steps">{CLOSEOUT_STEPS.map(step => <li key={step.id} data-closeout-step={step.id}><h4>{step.id} · {step.title}</h4><strong>{step.status}</strong><p>{step.done}</p></li>)}</ol>
  <h3>已确认的 {OPEN_FINDINGS.length} 项未关闭事项</h3>
  <p>这里包含实现差距、工程验收和用户验收，不是“只剩四个代码错误”。核对中发现的新问题必须登记归属和关闭标准；不静默扩展首版范围。</p>
  <div className="master-coverage">{OPEN_FINDINGS.map(item => <article key={item.id} data-finding={item.id}><h4>{item.id} · {item.title}</h4><small>{item.kind} · {item.packages.join(' / ')} · 未关闭</small><p>{item.current}</p><p><strong>关闭标准：</strong>{item.close}</p><details><summary>查看依据</summary>{item.evidence.map(path => <p key={path}><a href={evidenceUrl(path)} target="_blank" rel="noreferrer">{path.split('/').at(-1)} ↗</a></p>)}</details></article>)}</div>
  <h3>20 类主题 + 5 项首版必补 · 逐项核对</h3>
  <p>每项单独记录复验范围；已检查代表画面不等于该类全部能力或科学精度验收通过。已上线、验证依据、用户验收分别记录；所有用户验收保持待确认。</p>
  <div className="closeout-audit">{COVERAGE_AUDIT.map(row => {
   const topic = CONTENT_COVERAGE.find(t => t.id === row.id);
   const addition = SCOPE_ADDITIONS.find(t => t.id === row.id);
   return <details key={row.id} data-audit-id={row.id}><summary>{row.id} · {topic?.title ?? addition?.title}</summary><p><strong>当前：</strong>{topic?.current ?? addition?.status}</p><p><strong>核对层级：</strong>{row.review}</p><p><strong>验收动作：</strong>{row.check}</p><p><strong>用户验收：</strong>待确认{row.findingIds.length > 0 && `；关联未关闭事项 ${row.findingIds.join('、')}`}</p>{row.reports.map(path => <p key={path}><a href={evidenceUrl(path)} target="_blank" rel="noreferrer">已有证据 · {path.split('/').at(-1)} ↗</a></p>)}{(topic ? [topic.id] : addition?.topics ?? []).map(id => <button key={id} onClick={() => onTopic(id)}>查看 {id} 的现有入口与范围</button>)}</details>;
  })}</div>
  <p className="master-plan-note">首版完成标准：主要构成与约定代表体验达到标准、关键问题关闭、科学和体验证据齐备，并由用户确认。全部天体、实时天气、精细地形、飞船/碰撞/仙侠和更广宇宙专题属于已登记的后续范围。</p>
 </section>;
}
