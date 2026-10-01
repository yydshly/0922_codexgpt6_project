import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect } from 'vitest';
import { ExplorationSession } from '../flight/exploration';
import { createExplorationNotebook } from '../flight/explorationNotebook';
import { buildExplorationReport } from '../flight/explorationReport';
import { ExplorationTransitionDialog,type ExplorationTransition } from './ExplorationTransitionDialog';

const noop=()=>{};
function panel(intent:ExplorationTransition,resume:boolean){
  const s=new ExplorationSession();s.state.time=85;s.state.fuel=96;s.visits=[{id:'satellite',time:60,fuel:97,travel:80}];
  const book=createExplorationNotebook();book.notes=[{id:'satellite',time:65,parts:['panel','payload','antenna']}];
  return renderToStaticMarkup(<ExplorationTransitionDialog intent={intent} report={buildExplorationReport(s,book)} resumeOnCancel={resume} onCancel={noop} onConfirm={noop} onDownload={noop}/>);
}
describe('leaving the continuous voyage describes the actual destination and preserved snapshot',()=>{
  it('shows current evidence and a cancellation action before leaving for the overview',()=>{
    const html=panel('overview',true);
    expect(html).toContain('role="alertdialog"');expect(html).toContain('aria-describedby="exploration-transition-description"');
    expect(html).toContain('准备返回太阳系全景');expect(html).toContain('85.0 s');expect(html).toContain('4.00 kg');
    expect(html).toContain('取消，继续当前航程');expect(html).toContain('结束航程，返回全景');
    expect(html).toContain('不能恢复驾驶进度');expect(html).toContain('状态尚未清空');
  });
  it('does not promise to resume an already paused or interrupted voyage',()=>{
    const html=panel('restart',false);
    expect(html).toContain('取消，保持当前暂停');expect(html).toContain('清空本次，重新开始');
    expect(html).toContain('推进剂重新设为 100 kg');expect(html).not.toContain('取消，继续当前航程');
  });
  it('distinguishes story and independent practice initialization from a return to the overview',()=>{
    const story=panel('story',true),practice=panel('practice',true);
    expect(story).toContain('结束航程，开始故事');expect(story).toContain('分别初始化');
    expect(practice).toContain('结束航程，进入练习');expect(practice).toContain('不继承本次六站的状态');
    expect(story).not.toContain('结束航程，返回全景');expect(practice).not.toContain('结束航程，返回全景');
  });
});
