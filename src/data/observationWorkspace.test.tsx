import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {initialObservationPanels,observationPanels} from './observationPanels';
import {observationScale} from './observationScale';
import {ObservationPanelControls,ObservationScaleTrail} from '../components/ObservationWorkspace';

const context={title:'太阳系整体结构',target:null,member:null,zone:'all' as const,category:false,special:false};
describe('observation space and hierarchy',()=>{
  it('restores the prior partial panel layout after focused viewing',()=>{
    const partial=observationPanels(initialObservationPanels,{type:'toggle',panel:'regions'});
    const focused=observationPanels(partial,{type:'focus'});
    expect(focused.regions).toBe(false);expect(focused.info).toBe(false);
    expect(observationPanels(focused,{type:'focus'})).toEqual(partial);
    expect(initialObservationPanels).toEqual({regions:true,info:true,restore:null});
  });
  it('can recover from both panels manually closed and open requested information from focus',()=>{
    const closed={regions:false,info:false,restore:null};
    expect(observationPanels(closed,{type:'focus'})).toEqual(initialObservationPanels);
    const focus=observationPanels(initialObservationPanels,{type:'focus'});
    expect(observationPanels(focus,{type:'show',panel:'info'})).toEqual({regions:false,info:true,restore:null});
    expect(observationPanels(focus,{type:'toggle',panel:'info'})).toEqual({regions:false,info:true,restore:null});
    expect(observationPanels(focus,{type:'toggle',panel:'regions'})).toEqual({regions:true,info:false,restore:null});
  });
  it('keeps panel controls available with the scene alone',()=>{
    const html=renderToStaticMarkup(<ObservationPanelControls panels={observationPanels(initialObservationPanels,{type:'focus'})} id="qa" onChange={()=>{}}/>);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).toContain('aria-controls="qa-info"');
    expect(html).toContain('恢复面板');
  });
  it('links the overall view to the planetary region, Earth and its moon family',()=>{
    expect(observationScale(context).next?.destination).toEqual({kind:'region',id:'planetary'});
    expect(observationScale({...context,zone:'planetary',title:'行星区域'}).next?.destination).toEqual({kind:'body',id:'earth'});
    expect(observationScale({...context,target:'body:earth',title:'地球本体'}).next?.destination).toEqual({kind:'family',id:'earth'});
    const moon=observationScale({...context,target:'earth',title:'地月系统 · 月球',moonName:'月球'});
    expect(moon.stops.map(s=>s.label)).toEqual(['太阳系整体','行星区域','地月系统','月球']);
    expect(moon.stops[2].destination).toEqual({kind:'family',id:'earth'});
  });
  it('returns small bodies to their catalogue region without implying they are planetary moons',()=>{
    expect(observationScale({...context,member:'vesta'}).stops[1].destination).toEqual({kind:'region',id:'asteroid'});
    expect(observationScale({...context,member:'eros'}).stops[1].destination).toEqual({kind:'region',id:'planetary'});
    expect(observationScale({...context,member:'eris'}).stops[1].destination).toEqual({kind:'region',id:'scattered'});
    expect(observationScale({...context,target:'pluto-system'}).stops[1].destination).toEqual({kind:'region',id:'kuiper'});
    expect(observationScale({...context,member:'pluto'}).next?.destination).toEqual({kind:'binary'});
  });
  it('does not mislabel an environment or event anchored at Earth as the Moon family',()=>{
    const trail=observationScale({...context,target:'earth',title:'地球磁层',special:true});
    expect(trail.stops.map(s=>s.label)).toEqual(['太阳系整体','地球磁层']);
    expect(trail.next).toBeNull();
  });
  it('explains unavailable close-ups and prevents their invocation',()=>{
    const trail=observationScale({...context,target:'body:earth',title:'地球本体'});
    const html=renderToStaticMarkup(<ObservationScaleTrail {...trail} reason={d=>d.kind==='family'?'卫星阶段未开启':''} onVisit={()=>{}}/>);
    expect(html).toContain('disabled=""');expect(html).toContain('卫星阶段未开启');
    expect(html.match(/aria-current="location"/g)).toHaveLength(1);
  });
});
