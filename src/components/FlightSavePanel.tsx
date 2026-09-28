import { useEffect, useRef, useState } from 'react';
import type { FlightSave } from '../launch/flightSession';
import { hasSessionCopy, readFlightArchive } from '../launch/flightStorage';
import { flightTime } from './LaunchControl';

interface Props { ready: boolean; paused: boolean; time: number; phase: string; saved: FlightSave | null; status: string; onSave: () => void; onRestore: (raw: string) => void; onClose: () => void }
const savedDate = (date: string) => new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

export function FlightSavePanel({ ready, paused, time, phase, saved, status, onSave, onRestore, onClose }: Props) {
  const [error, setError] = useState(''), [archive, setArchive] = useState(readFlightArchive);
  const input = useRef<HTMLInputElement>(null), close = useRef<HTMLButtonElement>(null);
  useEffect(() => { setArchive(readFlightArchive()); }, [saved]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  const restore = () => {
    const current = readFlightArchive(); setArchive(current); setError('');
    if (current.kind === 'stored') onRestore(current.raw);
    else if (current.kind === 'empty') setError('此浏览器还没有飞行存档。');
  };
  const download = (raw: string) => {
    let url: string | undefined;
    const anchor = document.createElement('a');
    try {
      url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      anchor.href = url; anchor.download = 'ORBIT-flight.json'; anchor.hidden = true;
      document.body.append(anchor); anchor.click(); setError('');
    } catch { setError('无法发起文件下载，请检查浏览器下载设置；原存档仍保留。'); }
    finally { anchor.remove(); if (url) { const resource = url; setTimeout(() => URL.revokeObjectURL(resource), 30000); } }
  };
  return <section className="launch-save-panel" role="dialog" aria-modal="true" aria-label="飞行存档" onKeyDown={event => {
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), summary')].filter(el => el.getClientRects().length);
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
  }}>
    <header><h2>留住这次旅程</h2><button ref={close} onClick={onClose}>关闭存档面板</button></header>
    <div className="flight-save-current" aria-live="polite"><span>{paused ? '当前飞行已暂停' : ready ? '正在暂停飞行…' : '正在准备飞行数据…'}</span><strong>{flightTime(time)}</strong><small>{phase} · 关闭面板后，由你继续推进。</small></div>
    <small>保存将覆盖下方的浏览器存档；导入文件不会自动覆盖它。</small>
    <div className="launch-flight-actions"><button className="launch-ignite" disabled={!ready} onClick={() => { setError(''); onSave(); }}>保存当前飞行</button><button disabled={!ready} onClick={() => input.current?.click()}>导入飞行文件</button></div>
    <section className="flight-archive-record" aria-label="浏览器中的存档"><h3>浏览器中的存档</h3>
      {archive.kind === 'stored' ? <><strong data-archive-time>{flightTime(archive.save.snapshot.time)}</strong><small>保存于 {savedDate(archive.save.savedAt)}（北京时间）</small><div className="launch-flight-actions"><button disabled={!ready} onClick={restore}>恢复浏览器存档</button><button onClick={() => download(archive.raw)}>导出浏览器存档</button></div><small>导出的是上面这个时刻。飞行继续后，需要重新保存才会更新。</small></> : <p>{archive.kind === 'empty' ? '还没有存档。可保存当前飞行，或导入以前导出的文件。' : archive.message}</p>}
    </section>
    {hasSessionCopy(saved, archive) && <section className="flight-archive-record" aria-label="本次会话副本"><h3>本次会话中的另一份副本</h3><strong>{flightTime(saved.snapshot.time)}</strong><small>保存于 {savedDate(saved.savedAt)}（北京时间）。这份副本尚未确认写入当前浏览器存档；关闭网页前请导出保留。</small><button onClick={() => download(JSON.stringify(saved))}>导出本次会话副本</button></section>}
    <input hidden ref={input} type="file" accept=".json,application/json" aria-label="导入飞行文件" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      try { if (file.size > 2_000_000) throw Error('文件不能超过 2 MB。'); const raw = await file.text(); setError(''); onRestore(raw); }
      catch (err) { setError((err as Error).message); }
    }}/>
    {error && <p role="alert">{error}</p>}{status && <p role="status">最近操作：{status}</p>}
    <details><summary>保存、恢复与兼容说明</summary><p>打开此面板会暂停飞行。保存会覆盖浏览器中的上次存档；导入和恢复会替换当前任务，但不会自动改写浏览器存档或原文件。</p><p>文件结构与校验码检查通过后，还需按模型版本重算；跨版本或不同计算环境重算不一致时，会拒绝替换当前飞行。建议导出文件备份。</p></details>
  </section>;
}
