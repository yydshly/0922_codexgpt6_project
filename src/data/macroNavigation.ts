import {INTEGRATED_ITEMS,type IntegratedFlags,type IntegratedId,type IntegratedTarget} from './integratedScene';
/** A shared spatial anchor does not imply the same viewing intent. */
export const defaultFocusPhenomenon=(target:IntegratedTarget):IntegratedId|null=>target==='earth'?'environment':target==='sun'?'solar':target==='dust'?'dust':target==='helio'?'helio':null;
export function focusPhenomena(flags:IntegratedFlags,target:IntegratedTarget,intent:IntegratedId|null):IntegratedFlags{
 const next={...flags};
 // Keep unrelated choices, but do not silently enable every phenomenon at the Earth anchor.
 if(target==='earth'||target==='body:earth'){next.environment=false;next.belts=false;next.dust=false;}
 if(intent)next[intent]=true;
 return next;
}
export const focusPhenomenonTitle=(intent:IntegratedId|null,target:IntegratedTarget|null)=>intent==='dust'&&target==='earth'?'地球旁流星示例':INTEGRATED_ITEMS.find(i=>i.id===intent)?.title;
/** Close enough to identify a named marker; preserve bespoke compound-model framing. */
export const memberFocusDistance=(id:string|null)=>id==='eros'?1.7:id==='patroclus'?4:id==='chariklo'?2.8:id==='eris'?22:2.8;
