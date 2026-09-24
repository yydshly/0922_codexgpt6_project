import {describe,it,expect} from 'vitest';
import {emptyHistory,recordObservation,traverseObservation,relocateBookmark,type CameraBookmark} from './observationHistory';
describe('observation history',()=>{
 it('walks back and forward without reversing or duplicating destinations',()=>{
  let h=recordObservation(recordObservation(emptyHistory<string>(),'overview'),'earth');
  const back=traverseObservation(h,'moon','back')!;expect(back.destination).toBe('earth');
  const back2=traverseObservation(back.history,'earth','back')!;expect(back2.destination).toBe('overview');expect(back2.history.future).toEqual(['moon','earth']);
  const forward=traverseObservation(back2.history,'overview','forward')!;expect(forward.destination).toBe('earth');
  expect(traverseObservation(forward.history,'earth','forward')!.destination).toBe('moon');
 });
 it('clears abandoned forward destinations on a new observation and bounds memory',()=>{
  const h=recordObservation({past:['overview'],future:['moon']},'earth');expect(h.future).toEqual([]);
  let many=emptyHistory<number>();for(let i=0;i<40;i++)many=recordObservation(many,i);
  expect(many.past).toEqual(Array.from({length:12},(_,i)=>i+28));expect(traverseObservation(emptyHistory(),'present','back')).toBeNull();
 });
 it('restores the same relative camera after a body moves, preserving orientation and source snapshot',()=>{
  const view:CameraBookmark={position:[11,24,35],target:[10,20,30],up:[0,0,-1],anchor:[10,20,30],minDistance:.4};
  const moved=relocateBookmark(view,[40,50,60]);expect(moved.position).toEqual([41,54,65]);expect(moved.target).toEqual([40,50,60]);expect(moved.up).toEqual([0,0,-1]);expect(moved.minDistance).toBe(.4);
  expect(view.position).toEqual([11,24,35]);moved.target[0]=99;expect(view.target[0]).toBe(10);
 });
 it('keeps global region cameras fixed when there is no moving anchor',()=>{
  const view:CameraBookmark={position:[1,2,3],target:[0,0,0],up:[0,1,0],anchor:null,minDistance:3};
  expect(relocateBookmark(view,[10,20,30]).position).toEqual(view.position);
  expect(relocateBookmark(view,null)).toEqual(view);
 });
});
