import { useEffect, useRef } from 'react';
import { flightTime } from './LaunchControl';
import './FlightRecoveryPanel.css';

export function FlightRecoveryPanel({ message, time, busy, onRestart, onArchive }: {
  message: string; time: number; busy: boolean; onRestart: () => void; onArchive: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); title.current?.scrollIntoView({ block: 'nearest' }); }, []);
  return <section className="flight-recovery" aria-label="计算中断与恢复" aria-busy={busy}>
    <h2 ref={title} tabIndex={-1}>{busy ? '正在恢复计算…' : '计算已中断'}</h2>
    <p role="alert">{message}</p>
    <strong data-recovery-time>最后收到的时刻 · {flightTime(time)}</strong>
    <p>画面与读数已冻结，仍可拖动镜头查看。当前不能继续播放或回看章节，也不能把这一帧保存为完整任务。</p>
    <p>已有浏览器存档未被覆盖。未保存的任务和演示进度无法继续；恢复后从存档时刻开始，需由你继续播放。</p>
    <button disabled={busy} onClick={onArchive}>选择存档恢复</button>
    <small>可恢复浏览器存档，或导入以前导出的飞行文件。</small>
    <button disabled={busy} onClick={onRestart}>重新开始地面任务</button>
    <small>结束本次中断的会话，回到未点火状态；已有存档继续保留。</small>
  </section>;
}
