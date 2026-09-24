import type {PrimaryId} from './macroPrimary';
/** Screen presentation only; physical states and saved layer choices are untouched. */
export function macroVisualHierarchy(distance:number,target:string|null,member:string|null){
 return {regionLabels:distance>=42&&!target&&!member,focused:!!target||!!member};
}
export function primaryVisibleInCloseup(id:PrimaryId,active:PrimaryId|null,isolate=false){return !isolate||!active||id===active;}
