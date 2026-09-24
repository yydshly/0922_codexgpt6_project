import {describe,it,expect} from 'vitest';
import {macroVisualHierarchy,primaryVisibleInCloseup} from './macroVisualHierarchy';
import {PRIMARY_BODIES,type PrimaryId} from './macroPrimary';
describe('macro visual hierarchy',()=>{
 it('prioritizes regions only in an unfocused distant view',()=>{expect(macroVisualHierarchy(60,null,null).regionLabels).toBe(true);expect(macroVisualHierarchy(20,null,null).regionLabels).toBe(false);expect(macroVisualHierarchy(60,'body:earth',null).regionLabels).toBe(false);expect(macroVisualHierarchy(60,null,'eris').regionLabels).toBe(false);});
 it('isolates each primary closeup and restores every primary on return',()=>{for(const selected of PRIMARY_BODIES){expect(PRIMARY_BODIES.filter(b=>primaryVisibleInCloseup(b.id as PrimaryId,selected.id as PrimaryId)).map(b=>b.id)).toEqual([selected.id]);}expect(PRIMARY_BODIES.every(b=>primaryVisibleInCloseup(b.id as PrimaryId,null))).toBe(true);});
});
