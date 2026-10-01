import { explorationReportMarkdown,type ExplorationReport } from './explorationReport';

/** Download a read-only snapshot; this never changes flight or pretends to save a resumable game. */
export function downloadExplorationReport(report:ExplorationReport,format:'md'|'json'){
  const body=format==='md'?explorationReportMarkdown(report):JSON.stringify(report,null,2);
  const url=URL.createObjectURL(new Blob([format==='md'?'\uFEFF':'',body],{type:format==='md'?'text/markdown;charset=utf-8':'application/json;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=`orbit-exploration-T${Math.floor(report.capturedAt)}.${format}`;
  document.body.append(anchor);
  try{anchor.click();}finally{anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
