import { ATLAS_BODIES, type AtlasBody } from './atlas';
import type { MacroZoneId } from './macroStructure';
import type { SolarFamilyId } from './cosmicContext';

export const NEW_MEMBER_IDS = ['vesta','haumea','makemake','eris'] as const;
const entries = [
  ['ceres','asteroid','小行星主带','主带中的矮行星，与灶神星共同说明主带成员的差异。'],
  ['vesta','asteroid','小行星主带','主带中的岩质小行星；与谷神星属于同一区域，但分类不同。'],
  ['pluto','kuiper','柯伊伯带','海王星外的矮行星；该尺度只定位冥王星，卡戎需进入系统近景。'],
  ['haumea','kuiper','柯伊伯带','快速自转且形状拉长的矮行星；黄道高度由历表给出。'],
  ['makemake','kuiper','柯伊伯带','遥远的冰质矮行星；它与冥王星并不位于同一个方向。'],
  ['eris','scattered','海王星外远伸轨道','作为高倾角、远伸轨道的代表展示；区域关联不是按当天距离划定的硬边界。'],
] as const;
export type RegionMember = AtlasBody & {zone:MacroZoneId; region:string; relation:string};
export const REGION_MEMBERS: RegionMember[] = entries.map(([id,zone,region,relation])=>{
  const body=ATLAS_BODIES.find(b=>b.id===id);
  if(!body)throw new Error(`缺少代表天体资料：${id}`);
  return {...body,zone,region,relation};
});
export const regionMemberById=(id:string|null|undefined)=>REGION_MEMBERS.find(body=>body.id===id);
export function membersForRegion(zone:MacroZoneId,family?:SolarFamilyId):RegionMember[]{
  if(family==='dwarfs')return REGION_MEMBERS.filter(body=>body.category==='dwarf');
  if(family==='asteroids')return REGION_MEMBERS.filter(body=>body.zone==='asteroid');
  if(family)return [];
  return zone==='all'?REGION_MEMBERS:REGION_MEMBERS.filter(body=>body.zone===zone);
}
