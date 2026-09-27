import { useRef, useState } from 'react';
import type { FlightSave } from '../launch/flightSession';
import { readFlight } from '../launch/flightStorage';
import { flightTime } from './LaunchControl';
interface Props { ready: boolean; saved: FlightSave | null; status: string; onSave: () => void; onRestore: (raw: string) => void; onClose: () => void }
export function FlightSavePanel({ ready, saved, status, onSave, onRestore, onClose }: Props) {
  const [error, setError] = useState(''), input = useRef<HTMLInputElement>(null);
  const read = () => { try { const raw = readFlight(); if (!raw) throw Error('此浏览器还没有飞行存档。'); setError(''); onRestore(raw); } catch (e) { setError((e as Error).message); } };
  const download = () => { if (!saved) return; const url = URL.createObjectURL(new Blob([JSON.stringify(saved)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'ORBIT-E01-flight.json'; a.hidden = true; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); };
  return <section className="launch-save-panel" aria-label="飞行存档"><header><h2>留住这次旅程</h2><button onClick={onClose}>关闭存档面板</button></header><p>保存会暂停任务，并覆盖此浏览器的上次飞行存档。恢复会替换当前任务，校验通过后停在保存时刻；原文件不会被改写。</p><div className="launch-flight-actions"><button disabled={!ready} onClick={() => { setError(''); onSave(); }}>保存当前飞行</button><button disabled={!ready} onClick={read}>恢复浏览器存档</button><button disabled={!ready} onClick={() => input.current?.click()}>导入飞行文件</button><button disabled={!saved} onClick={download}>导出最近一次保存</button></div>
    <input hidden ref={input} type="file" accept=".json,application/json" aria-label="导入飞行文件" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { if (file.size > 2_000_000) throw Error('文件不能超过 2 MB。'); const raw = await file.text(); setError(''); onRestore(raw); } catch (err) { setError((err as Error).message); } }}/>
    <p role="status">{error || status || '保存配置、任务日期、计算进度和事件。重开网页后，从这里恢复。'}</p>{saved && <small>最近保存：{flightTime(saved.snapshot.time)} · {new Date(saved.savedAt).toLocaleString('zh-CN')}。导出的是该次保存；继续飞行后请重新保存。</small>}<small>存档按模型版本校验；跨版本或不同计算环境恢复不一致时会拒绝替换。建议导出文件备份。</small>
  </section>;
}
