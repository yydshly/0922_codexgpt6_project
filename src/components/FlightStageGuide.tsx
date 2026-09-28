interface Props { steps: readonly string[]; current: number | null; complete?: boolean; children: React.ReactNode }

/** The summary stays visible; the full procedure is optional reading. */
export function FlightStageGuide({ steps, current, complete = false, children }: Props) {
  return <details className="flight-stage-guide">
    <summary><span>{complete ? '本段完成' : current === null ? '本段中断' : `第 ${current + 1} / ${steps.length} 步`} · 展开流程说明</span>
      <strong>{complete ? '本段记录已保留，可查看结果' : current === null ? '查看下方原因与任务记录' : steps[current]}</strong>
    </summary>
    {children}
    <ol className="orbit-procedure">{steps.map((text, i) => <li key={text} aria-current={!complete && current === i ? 'step' : undefined}>{i + 1}　{text}</li>)}</ol>
  </details>;
}
