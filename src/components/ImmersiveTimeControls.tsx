import { useEffect, useState } from 'react';
import { immersiveDate, parseImmersiveDate } from '../data/immersiveClock';
import { utcToTdb } from '../data/time';
import type { useImmersiveClock } from '../hooks/useImmersiveClock';

export function ImmersiveTimeControls({ clock, start, end, entryTime }: { clock: ReturnType<typeof useImmersiveClock>; start: number; end: number; entryTime: number }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(immersiveDate(clock.frame.time)), [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setDraft(immersiveDate(clock.frame.time)); }, [clock.frame.time, dirty]);
  return <div className="imm-time-controls" onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); } }}>
    <button disabled={!clock.playing && (clock.loading || !!clock.error || clock.atEnd)} onClick={clock.toggle} aria-pressed={clock.playing}>{clock.playing ? '暂停天体运动' : '播放天体运动'}</button>
    <label><span className="imm-sr-only">天体运动倍率</span><select aria-label="天体运动倍率" value={clock.speed} onChange={e => clock.setSpeed(Number(e.target.value))}>
      <option value={1}>实时</option><option value={3600}>1 小时/秒</option><option value={21600}>6 小时/秒</option><option value={86400}>1 天/秒</option>
    </select></label>
    <button aria-expanded={open} aria-controls="imm-date-panel" onClick={() => setOpen(v => !v)}>日期 {open ? '▴' : '▾'}</button>
    {open && <form id="imm-date-panel" className="imm-date-panel" aria-label="沉浸观景日期" onSubmit={e => { e.preventDefault(); clock.seek(parseImmersiveDate(draft)); setDirty(false); }}>
      <div><strong>北京时间 · UTC+8</strong><button type="button" aria-label="收起日期面板" onClick={() => setOpen(false)}>×</button></div>
      <input aria-label="沉浸观景北京时间" type="datetime-local" step="1" min={immersiveDate(start)} max={immersiveDate(end)} value={draft} onChange={e => { setDraft(e.target.value); setDirty(true); }}/>
      <div className="imm-date-actions"><button type="submit" disabled={!dirty}>应用日期</button><button type="button" onClick={() => { setDirty(false); clock.seek(utcToTdb(Date.now())); }}>现在</button><button type="button" onClick={() => { setDirty(false); clock.seek(entryTime); }}>进入时刻</button></div>
      <p>{immersiveDate(start).replace('T', ' ')} 至 {immersiveDate(end).replace('T', ' ')}</p>
      <small>{dirty ? '日期尚未应用，场景继续使用上方观测时刻。' : '应用日期后暂停。返回全景保留当前日期，恢复进入前的播放状态。'}</small>
    </form>}
  </div>;
}
