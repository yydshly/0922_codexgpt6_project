import type { RefObject } from 'react';
import { explorationReportTitle,type ExplorationReport } from '../flight/explorationReport';
import './ExplorationReportPanel.css';

export function ExplorationReportPanel({report,detailsRef,paused,disabled,onOpen,onResume,onDownload}:{
  report:ExplorationReport|null;detailsRef:RefObject<HTMLDetailsElement|null>;paused:boolean;disabled:boolean;
  onOpen:()=>void;onResume:()=>void;onDownload:(format:'md'|'json')=>void;
}){
  return <details className="exploration-report" ref={detailsRef} onToggle={e=>{if(e.target===e.currentTarget&&e.currentTarget.open)onOpen();}}>
    <summary>航程回顾 <small>展开会暂停</small></summary>
    {report&&<>
      <small className="exploration-report-time">记录时刻 T+{report.capturedAt.toFixed(1)} s · {paused?'运行已暂停':'当前已继续运行，以下仍是旧记录'}</small>
      <h2>{explorationReportTitle(report)}</h2>
      <p>已抵达 {report.totals.arrivedCount} / {report.totals.stationCount} · 主动保存笔记 {report.totals.noteCount} / {report.totals.stationCount}。未保存笔记不等于未观察。</p>
      {report.progress==='awaiting-return'&&<p>到齐地点以后，还需再次抵达出发航点并停稳，才算完成往返。</p>}
      {report.completion&&<p className="exploration-report-completion">首次完成往返：T+{report.completion.time.toFixed(1)} s · {report.completion.travel.toFixed(0)} m · 耗油 {report.completion.fuelUsed.toFixed(2)} kg。再访地点不会改写此节点。</p>}
      <dl className="exploration-report-metrics"><div><dt>截至记录时的用时（含停留）</dt><dd>{report.totals.time.toFixed(1)} s</dd></div><div><dt>累计路程</dt><dd>{report.totals.travel.toFixed(0)} m</dd></div><div><dt>已用推进剂</dt><dd>{report.totals.fuelUsed.toFixed(2)} kg</dd></div><div><dt>剩余推进剂</dt><dd>{report.totals.fuelRemaining.toFixed(2)} kg</dd></div></dl>
      <p>当前关注 {report.current.targetName} · 速率 {report.current.speed.toFixed(2)} m/s。{report.current.contact??(report.current.status==='arrived'&&report.current.staying?'已停稳，主动停留观察；准备好后再继续。':report.current.message)}</p>
      <div className="exploration-report-downloads"><button className="exploration-report-download" onClick={()=>onDownload('md')}>下载文字记录</button><button className="exploration-report-json" onClick={()=>onDownload('json')}>下载 JSON 数据</button></div>
      <ol className="exploration-report-stations" aria-label="六站记录，按理解顺序排列">{report.stations.map(station=><li key={station.id} data-id={station.id} data-arrived={station.arrivalCount>0} data-saved={!!station.note}>
        <strong>{station.chapter}</strong><span>{station.name}</span>
        <small>{station.firstArrival?`已抵达 ${station.arrivalCount} 次 · 首次 T+${station.firstArrival.time.toFixed(0)} s`:'尚未抵达'}</small>
        <small>{station.note?`笔记已保存 · T+${station.note.time.toFixed(0)} s`:'未保存阅读笔记'}{station.totalParts?` · 打开介绍 ${station.openedParts.length} / ${station.totalParts}`:''}</small>
        <details><summary>本章观察问题与模型说明</summary><p>{station.question}</p><p>{station.explanation}</p></details>
      </li>)}</ol>
      <details className="exploration-report-arrivals"><summary>实际抵达顺序 · {report.arrivals.length} 次</summary><p>以下区间包含上一站停留、手动飞行及绕行，用时与耗油不能当作纯自动驾驶指标。</p>{report.arrivals.length?<ol>{report.arrivals.map(v=><li key={v.sequence}>{v.name}<small>T+{v.time.toFixed(0)} s · 区间 {v.elapsed.toFixed(1)} s / {v.distance.toFixed(0)} m / {v.fuelUsed.toFixed(2)} kg</small></li>)}</ol>:<p>尚无停稳确认后的抵达记录。</p>}</details>
      <p className="exploration-report-limits">{report.scope}下载文件可自行保存，不能恢复飞行；退出网页会清空本次内存记录。</p>
      <button className="exploration-report-resume" disabled={disabled} onClick={onResume}>收起回顾，继续运行</button><small className="exploration-report-time">仅收起面板不会恢复运动；重新打开时读取最新记录。</small>
    </>}
  </details>;
}
