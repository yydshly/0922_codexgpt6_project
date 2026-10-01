import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect } from 'vitest';
import { ExplorationSession } from '../flight/exploration';
import { buildExplorationReport } from '../flight/explorationReport';
import { createExplorationNotebook } from '../flight/explorationNotebook';
import { ExplorationReportPanel } from './ExplorationReportPanel';

const noop=()=>{};
describe('read-only voyage review',()=>{
  it('offers incomplete records without claiming a finished mission or saved notes',()=>{
    const report=buildExplorationReport(new ExplorationSession(),createExplorationNotebook());
    const html=renderToStaticMarkup(<ExplorationReportPanel report={report} detailsRef={createRef()} paused disabled={false} onOpen={noop} onResume={noop} onDownload={noop}/>);
    expect(html).toContain('巡视尚未完成');expect(html).toContain('已抵达 0 / 6');expect(html).toContain('主动保存笔记 0 / 6');
    expect(html).toContain('展开会暂停');expect(html).toContain('下载文字记录');expect(html).toContain('不能恢复飞行');
    expect(html).not.toContain('首次完成往返：');expect(html).not.toContain('class="exploration-depart"');
  });
  it('labels a stale report after an explicit resume and disables resume for a stopped error',()=>{
    const report=buildExplorationReport(new ExplorationSession(),createExplorationNotebook());
    const html=renderToStaticMarkup(<ExplorationReportPanel report={report} detailsRef={createRef()} paused={false} disabled onOpen={noop} onResume={noop} onDownload={noop}/>);
    expect(html).toContain('当前已继续运行，以下仍是旧记录');expect(html).toContain('class="exploration-report-resume" disabled=""');
  });
});
