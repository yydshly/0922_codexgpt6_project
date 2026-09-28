import { useState } from 'react';
import { satelliteName } from '../launch/satellitePlan';
import type { FlightState } from '../launch/liftoff';
import { PACKAGE_STATUS_TEXT, postDeploymentProgress, recordTime, taskResultMarkdown, type PackageProgress } from '../launch/postDeploymentProgress';
import { flightPhaseName } from './LaunchControl';

function PackageCard({ step }: { step: PackageProgress }) {
  return <article className="task-package" data-package={step.id} data-result={step.status}>
    <div><span>{step.id}</span><strong>{step.title}</strong></div><small>{PACKAGE_STATUS_TEXT[step.status]}</small>
    <p>{step.detail}</p>{step.facts.length > 0 && <details><summary>本段记录数值</summary><ul>{step.facts.map(f => <li key={f}>{f}</li>)}</ul></details>}
  </article>;
}

export function TaskResultSummary({ state, ready, onCurrent, onSave }: { state: FlightState; ready: boolean; onCurrent: () => void; onSave: () => void }) {
  const result = postDeploymentProgress(state), [downloadStatus, setDownloadStatus] = useState('');
  const download = () => {
    const url = URL.createObjectURL(new Blob([taskResultMarkdown(state, flightPhaseName(state))], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${satelliteName(state)}-任务结果摘要.md`; link.hidden = true;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    setDownloadStatus('已生成当前结果摘要；摘要不能恢复飞行。自动演示为临时任务，不覆盖原存档。');
  };
  return <section className="task-result-summary" aria-label="本次部署后任务结果">
    <h3>同一次任务，两条结果线。</h3><p>共同起点 P1 之后，二级走 P2 → P3，卫星走 P4 → P5。可以从 P1 直接进入卫星工作；未执行的路线不会自动算完成。</p>
    <div className="task-result-verdict" data-task-finished={result.branchFinished}>
      <strong>{result.stopped ? '本段已停止，先看原因' : result.branchFinished ? state.satelliteDisposal ? '动力离轨教学分支已到参考终点' : '无推进教学分支已到终点' : '按本次记录继续'}</strong><p>{result.next}</p>
      <div><button disabled={!ready} onClick={onCurrent}>返回当前步骤操作 →</button><button onClick={download}>下载本次结果摘要</button><button disabled={!ready} onClick={onSave}>打开飞行存档</button></div>
      <small role="status">{downloadStatus || '摘要记录结论；飞行存档用于恢复。两者都不会自动标记用户验收通过。'}</small>
    </div>
    <div className="task-object-records">{result.records.map(record => <article key={record.id} data-object-record={record.id}>
      <span>{record.title} · {record.historical ? '历史记录' : '当前计算'}</span><h4>{record.outcome}</h4><small>{recordTime(record.time)}</small>
      <ul>{record.facts.map(f => <li key={f}>{f}</li>)}</ul><p>{record.boundary}</p>
    </article>)}</div>
    <div className="task-route-map" role="group" aria-label="共同起点与二级、卫星两条路线">
      <PackageCard step={result.steps[0]}/><div className="task-route-lanes">
        <section aria-label="二级路线"><h4>二级火箭 ↓</h4>{result.steps.slice(1, 3).map(step => <PackageCard key={step.id} step={step}/>)}</section>
        <section aria-label="卫星路线"><h4>{satelliteName(state)} 卫星 ↓</h4>{result.steps.slice(3).map(step => <PackageCard key={step.id} step={step}/>)}</section>
      </div>
    </div>
    <p className="task-result-note">“本段计算完成”只针对标明的教学范围。二级到达 20 km 检查点、等效物体继续至 0 m 参考面、卫星退役，都不能证明完整空间处置；无需为了补齐绿色状态重跑未选择的路线。</p>
  </section>;
}
