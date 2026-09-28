import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MacroPanelNavigation,type MacroPanel} from './MacroPanelNavigation';
import {MacroContentsNav} from './MacroContentsNav';
import {MemberDirectory} from './MemberDirectory';
import {allStages} from '../data/stages';

const noop=()=>{};
describe('panorama reading and observation entry points',()=>{
  it('marks exactly one selected panel even when it is inside reference material',()=>{
    for(const panel of ['integrated','members','layers','learn','coverage','sources'] as MacroPanel[]){
      const html=renderToStaticMarkup(<MacroPanelNavigation panel={panel} onSelect={noop}/>);
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(html.includes('data-active="true"')).toBe(['learn','coverage','sources'].includes(panel));
    }
  });
  it('does not offer dead jumps to modules whose required stages are closed',()=>{
    const html=renderToStaticMarkup(<MacroContentsNav scroller={{current:null}} stages={{...allStages(),members:false,families:false}} onStages={noop}/>);
    for(const key of ['coorbital-module','eros-shape','families','enceladus','binary']){
      expect(html).toMatch(new RegExp(`<option value="${key}" disabled=""`));
    }
    // Base-region members remain available through the structure stage.
    expect(html).toContain('<option value="members">');
    expect(html).toContain('<option value="primary">');
    expect(html).toContain('查看阶段开关');
  });
  it('keeps searching available while preventing location of unavailable members',()=>{
    const html=renderToStaticMarkup(<MemberDirectory query="地球" onQuery={noop} status={()=>({text:'等待当前日期历表',blocked:true,retry:false,stages:false})} onVisit={noop} onRetry={noop} onStages={noop}/>);
    expect(html).toContain('type="search"');
    const visits=html.match(/<button[^>]*>定位并查看参数<\/button>/g)??[];
    expect(visits.length).toBeGreaterThan(0);
    expect(visits.every(button=>button.includes('disabled=""'))).toBe(true);
    expect(html.indexOf('type="search"')).toBeLessThan(html.indexOf('<details'));
  });
  it('offers a clear empty search result instead of a missing panel',()=>{
    const html=renderToStaticMarkup(<MemberDirectory query="no-such-member-2026" onQuery={noop} status={()=>({text:'ready',blocked:false,retry:false,stages:false})} onVisit={noop} onRetry={noop} onStages={noop}/>);
    expect(html).toContain('未找到已收录成员');
    expect(html).toContain('清除筛选');
    expect(html).not.toContain('data-directory-member=');
  });
});
