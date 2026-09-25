import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {EnceladusPanel} from './EnceladusPanel';
import {SolarLayersPanel} from './SolarLayersPanel';
import {defaultEnceladusChoices} from '../data/enceladusInterior';
import {defaultPhenomenonParts} from '../data/phenomenonParts';
import {solarLessonParts} from '../data/solarLayers';
const noop=()=>{};
const enceladus=(active:boolean,choices=defaultEnceladusChoices())=>renderToStaticMarkup(<EnceladusPanel choices={choices} active={active} enabled ready status="视野内" error="" onRetry={noop} onLocate={noop} onParent={noop} onChange={noop}/>);
const solar=(active:boolean,enabled=true)=>renderToStaticMarkup(<SolarLayersPanel parts={solarLessonParts(defaultPhenomenonParts(),'corona')} active={active} enabled={enabled} onLesson={noop} onActivities={noop}/>);
describe('teaching step selection follows the observed scene',()=>{
 it('does not announce an Enceladus cutaway after returning to its parent system',()=>{
  const saved={...defaultEnceladusChoices(),cutaway:true};
  expect(enceladus(true,saved)).toContain('aria-pressed="true"');
  expect(enceladus(false,saved)).not.toContain('aria-pressed="true"');
  expect(enceladus(false,saved)).toContain('当前未进入土卫二近景');
 });
 it('does not select cutaway when every interior layer is hidden, or surface-and-jets when jets are off',()=>{
  const empty={...defaultEnceladusChoices(),cutaway:true,ice:false,ocean:false,core:false};
  expect(enceladus(true,empty)).not.toContain('aria-pressed="true"');
  expect(enceladus(true,empty)).toContain('当前显示本体位置标记');
  expect(enceladus(true,{...defaultEnceladusChoices(),jets:false})).not.toContain('aria-pressed="true"');
 });
 it('preserves solar settings without presenting them as the current lesson elsewhere',()=>{
  expect(solar(true)).toContain('正在观察：4 · 日冕');
  expect(solar(false)).not.toContain('aria-pressed="true"');
  expect(solar(false)).toContain('已保留分层设置');
 });
 it('does not select a solar step while its layer is disabled',()=>{
  expect(solar(true,false)).not.toContain('aria-pressed="true"');
  expect(solar(true,false)).toContain('太阳活动未显示');
 });
});
