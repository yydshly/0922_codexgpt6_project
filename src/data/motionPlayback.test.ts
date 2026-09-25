import {describe,it,expect} from 'vitest';
import {motionPlaybackBlock} from './motionPlayback';
const ready={enabled:true,now:150,loading:false,error:'',start:100,end:200};
describe('shared lesson playback boundaries',()=>{
 it('allows the first instant and interior, but not a completed event or an out-of-window date',()=>{
  expect(motionPlaybackBlock({...ready,now:100})).toBe('');
  expect(motionPlaybackBlock(ready)).toBe('');
  for(const now of [99,200,201,null,NaN])expect(motionPlaybackBlock({...ready,now})).not.toBe('');
 });
 it('does not allow stale frames to start motion during loading, failure or a closed stage',()=>{
  expect(motionPlaybackBlock({...ready,loading:true})).toContain('正在读取');
  expect(motionPlaybackBlock({...ready,error:'missing chunk'})).toContain('读取失败');
  expect(motionPlaybackBlock({...ready,enabled:false})).toContain('阶段 01');
 });
});
