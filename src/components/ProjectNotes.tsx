import { useEffect, useRef, useState, type ReactNode } from 'react';
import './ProjectNotes.css';

// Bundle authored notes as Unicode strings; never navigate to raw Markdown or execute HTML.
const documents = import.meta.glob<string>('../../docs/**/*.md', { query: '?raw', import: 'default' });
const images = import.meta.glob<string>('../../docs/qa/satellite-demo-2026-09-28/*.png', { query: '?url', import: 'default', eager: true });
const root = '../../docs/';

function relativePath(file: string, href: string) {
  const url = new URL(href, `https://project.invalid/docs/${file}`);
  return url.origin === 'https://project.invalid' && url.pathname.startsWith('/docs/')
    ? decodeURIComponent(url.pathname.slice(6)) : null;
}

/** Small, read-only renderer for the headings, tables, lists and links in project notes. */
function NoteBody({ text, file, onDocument }: { text: string; file: string; onDocument: (file: string) => void }) {
  const inline = (value: string): ReactNode[] => value.split(/(!?\[[^\]]+\]\([^\s)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = part.match(/^(!?)\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (!link) return part;
    const [, image, label, href] = link;
    const local = relativePath(file, href);
    if (image) return local && images[root + local] ? <img key={i} src={images[root + local]} alt={label} loading="lazy"/> : <span key={i}>{label}</span>;
    if (local && documents[root + local]) return <button className="project-note-link" key={i} onClick={() => onDocument(local)}>{label}</button>;
    if (/^https?:\/\//i.test(href)) return <a key={i} href={href} target="_blank" rel="noreferrer">{label}</a>;
    return <span key={i}>{label}</span>;
  });
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i], key = i;
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const code: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++; blocks.push(<pre key={key}>{code.join('\n')}</pre>); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push(heading[1].length === 1 ? <h3 key={key}>{inline(heading[2])}</h3> : <h4 key={key}>{inline(heading[2])}</h4>);
      i++; continue;
    }
    if (/^\|/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
      const headers = cells(line), rows: string[][] = []; i += 2;
      while (i < lines.length && lines[i].startsWith('|')) rows.push(cells(lines[i++]));
      blocks.push(<div key={key} className="project-notes-table" tabIndex={0} role="region" aria-label="说明表格，可横向滚动"><table><thead><tr>{headers.map((cell, j) => <th scope="col" key={j}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>); continue;
    }
    const list = line.match(/^(?:([-*])|\d+\.)\s+(.+)$/);
    if (list) {
      const ordered = !list[1], items: ReactNode[] = [];
      const pattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
      while (i < lines.length) { const item = lines[i].match(pattern); if (!item) break; items.push(<li key={i++}>{inline(item[1])}</li>); }
      blocks.push(ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>); continue;
    }
    blocks.push(<p key={key}>{inline(line)}</p>); i++;
  }
  return blocks;
}

export function ProjectNotes({ file, label }: { file: string; label: string }) {
  const [page, setPage] = useState<{ file: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(false);
  const request = useRef(0), body = useRef<HTMLDivElement>(null), disclosure = useRef<HTMLDetailsElement>(null), summary = useRef<HTMLElement>(null);
  useEffect(() => () => { request.current++; }, []);
  const close = () => {
    request.current++; setLoading(false);
    if (disclosure.current) disclosure.current.open = false;
    summary.current?.scrollIntoView({ block: 'nearest' }); summary.current?.focus({ preventScroll: true });
  };
  const load = async (next: string) => {
    const id = ++request.current; setLoading(true); setError(false);
    try {
      const loader = documents[root + next];
      if (!loader) throw new Error('Missing project note');
      const text = await loader();
      if (id !== request.current) return;
      setPage({ file: next, text });
      requestAnimationFrame(() => {
        if (id !== request.current || !disclosure.current?.open) return;
        body.current?.scrollTo(0, 0); body.current?.scrollIntoView({ block: 'nearest' }); body.current?.focus({ preventScroll: true });
      });
    } catch { if (id === request.current) setError(true); }
    finally { if (id === request.current) setLoading(false); }
  };
  return <details ref={disclosure} className="project-notes" onToggle={e => {
    if (e.currentTarget.open) { if (!page && !loading) void load(file); }
    else { request.current++; setLoading(false); }
  }} onKeyDown={e => { if (e.key === 'Escape' && disclosure.current?.open) { e.preventDefault(); e.stopPropagation(); close(); } }}>
    <summary ref={summary}>{label}</summary>
    <p>网页内阅读，不离开当前场景。此处是说明与检查记录，实际效果在主画面演示。</p>
    {loading && <p role="status">正在打开说明…</p>}
    {error && <p role="alert">说明暂未打开，当前场景保留。<button onClick={() => void load(file)}>重试打开说明</button></p>}
    <div className="project-notes-toolbar"><button onClick={close}>收起说明</button><span>也可按 Esc 返回说明入口</span></div>
    {page && !loading && !error && <>
      <div className="project-notes-tools">{page.file !== file && <button onClick={() => void load(file)}>返回本阶段说明</button>}<a href={`data:text/markdown;charset=utf-8,${encodeURIComponent('\uFEFF' + page.text.replace(/^\uFEFF/, ''))}`} download={page.file.split('/').at(-1)}>下载中文原文（UTF-8）</a></div>
      <div ref={body} className="project-notes-body" tabIndex={-1} role="region" aria-label="中文说明正文"><NoteBody text={page.text} file={page.file} onDocument={next => void load(next)}/></div>
      <button className="project-notes-close" onClick={close}>阅读完毕，收起说明</button>
    </>}
  </details>;
}
