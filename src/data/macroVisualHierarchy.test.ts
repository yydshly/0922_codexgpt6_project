import {describe,it,expect} from 'vitest';
import {macroVisualHierarchy,primaryVisibleInCloseup} from './macroVisualHierarchy';
import {PRIMARY_BODIES,type PrimaryId} from './macroPrimary';
describe('macro visual hierarchy',()=>{
 it('prioritizes regions only in an unfocused distant view',()=>{expect(macroVisualHierarchy(60,null,null).regionLabels).toBe(true);expect(macroVisualHierarchy(20,null,null).regionLabels).toBe(false);expect(macroVisualHierarchy(60,'body:earth',null).regionLabels).toBe(false);expect(macroVisualHierarchy(60,null,'eris').regionLabels).toBe(false);});
 it('keeps the surrounding bodies when locating a primary',()=>{for(const selected of PRIMARY_BODIES){expect(PRIMARY_BODIES.every(b=>primaryVisibleInCloseup(b.id as PrimaryId,selected.id as PrimaryId))).toBe(true);expect(PRIMARY_BODIES.filter(b=>primaryVisibleInCloseup(b.id as PrimaryId,selected.id as PrimaryId,true)).map(b=>b.id)).toEqual([selected.id]);}});
});
