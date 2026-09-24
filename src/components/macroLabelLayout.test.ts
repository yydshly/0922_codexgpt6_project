import { describe, it, expect } from 'vitest';
import { placeMacroLabels } from './macroLabelLayout';
describe('screen-space macro annotations',()=>{
  it('places labels inside the scene safe area without overlap',()=>{
    const labels=placeMacroLabels(Array.from({length:8},(_,n)=>({id:String(n),x:260+n*12,y:270+n*10,width:120,height:27})),700,600);
    expect(labels.length).toBeGreaterThan(1);
    for(const [i,a] of labels.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(12);expect(a.y).toBeGreaterThanOrEqual(90);
      expect(a.x+a.width).toBeLessThanOrEqual(688);expect(a.y+a.height).toBeLessThanOrEqual(490);
      for(const b of labels.slice(i+1))expect(a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y).toBe(false);
    }
  });
  it('avoids celestial bodies as well as other labels',()=>{
    const [box]=placeMacroLabels([{id:'tail',x:250,y:270,width:120,height:27}],700,600,90,110,[{x:265,y:222,width:125,height:60}]);
    expect(box).toBeDefined();expect(box.x+box.width).toBeLessThan(265);
  });
  it('rejects offscreen/nonfinite anchors and makes deterministic choices',()=>{
    const anchors=[{id:'off',x:-20,y:100,width:100,height:25},{id:'bad',x:NaN,y:200,width:100,height:25},{id:'ok',x:300,y:250,width:100,height:25}];
    expect(placeMacroLabels(anchors,700,600).map(a=>a.id)).toEqual(['ok']);
    expect(placeMacroLabels(anchors,700,600)).toEqual(placeMacroLabels(anchors,700,600));
  });
});
