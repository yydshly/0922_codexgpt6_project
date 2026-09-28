import {bodyById} from './catalog';
import {isMacroFamily,type MacroFamilyId} from './macroFamilies';
import {primaryId,type PrimaryId} from './macroPrimary';
import {MACRO_ZONES,type MacroZoneId} from './macroStructure';
import {regionMemberById} from './regionMembers';

export type ScaleDestination={kind:'overview'}|{kind:'region';id:MacroZoneId}|{kind:'body';id:PrimaryId}|{kind:'family';id:MacroFamilyId}|{kind:'member';id:string}|{kind:'binary'};
export interface ScaleStop {label:string;destination?:ScaleDestination}
interface ScaleContext {title:string;target:string|null;member:string|null;zone:MacroZoneId;category:boolean;special:boolean;moonName?:string}
const familyName=(id:MacroFamilyId)=>id==='earth'?'地月系统':`${bodyById[id].name}卫星系统`;
/** This is an observation hierarchy, not a new physical distance or coordinate mapping. */
export function observationScale(c:ScaleContext):{stops:ScaleStop[];next:ScaleStop|null} {
  const root:ScaleStop={label:'太阳系整体',destination:{kind:'overview'}};
  const region=(id:MacroZoneId):ScaleStop=>({label:MACRO_ZONES.find(z=>z.id===id)?.name??'太阳系整体',destination:{kind:'region',id}});
  const end:ScaleStop={label:c.title};
  if(c.special)return {stops:[root,end],next:null};
  const body=primaryId(c.target);
  if(body)return {stops:[root,region('planetary'),end],next:isMacroFamily(body)?{label:`展开${familyName(body)}`,destination:{kind:'family',id:body}}:null};
  if(isMacroFamily(c.target))return {
    stops:[root,region('planetary'),...(c.moonName?[{label:familyName(c.target),destination:{kind:'family' as const,id:c.target}},{label:c.moonName}]:[end])],
    next:{label:`查看${bodyById[c.target].name}本体`,destination:{kind:'body',id:c.target}},
  };
  if(c.target==='pluto-system')return {stops:[root,region('kuiper'),end],next:{label:'查看冥王星本体',destination:{kind:'member',id:'pluto'}}};
  const member=regionMemberById(c.member);
  if(member)return {stops:[root,region(member.zone),end],next:member.id==='pluto'?{label:'展开冥王星卫星家族',destination:{kind:'binary'}}:null};
  if(c.target||c.category)return {stops:[root,end],next:null};
  if(c.zone==='all')return {stops:[{label:'太阳系整体'}],next:{label:'靠近行星区域',destination:{kind:'region',id:'planetary'}}};
  return {stops:[root,end],next:c.zone==='planetary'?{label:'靠近地球',destination:{kind:'body',id:'earth'}}:null};
}
