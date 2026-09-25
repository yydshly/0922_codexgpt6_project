import { ATLAS_BODIES, type AtlasBody } from './atlas';
import type { MacroZoneId } from './macroStructure';
import type { SolarFamilyId } from './cosmicContext';

export const NEW_MEMBER_IDS = ['vesta','haumea','makemake','eris','eros','achilles','aneas','chariklo','quaoar','sedna'] as const;
export const DYNAMIC_MEMBER_IDS:readonly string[]=[...NEW_MEMBER_IDS,'patroclus'];
const entries = [
  ['patroclus','planetary','木星特洛伊群 · L5 双体','两颗小行星相互绕转，整体在木星 L5 群中绕太阳运行；L5 不是实体，也不表示两者绕木星公转。'],
  ['eros','planetary','近地小行星 · Amor','从地球附近轨道区域开始：爱神星绕太阳运动，并不是地球的卫星。当前地心距离随日期变化，近地分类不表示此刻很近。'],
  ['achilles','planetary','木星特洛伊群 · L4','沿木星公转方向领先的一组；与 L5 代表对照。绕太阳运行，和木星共享相近的平均公转周期。'],
  ['aneas','planetary','木星特洛伊群 · L5','沿木星公转方向落后的一组；两组与木星形成的关系不意味着三个对象始终构成等边三角形。'],
  ['chariklo','planetary','巨行星区域 · 半人马族','从木星轨道继续向外：这类小天体活动在巨行星区域。本体日心轨道不是某颗巨行星的卫星轨道。'],
  ['ceres','asteroid','小行星主带','主带中的矮行星，与灶神星共同说明主带成员的差异。'],
  ['vesta','asteroid','小行星主带','主带中的岩质小行星；与谷神星属于同一区域，但分类不同。'],
  ['pluto','kuiper','柯伊伯带','海王星外的矮行星；可在当前全景中展开冥王星—卡戎双体，观察局部间距和质心。'],
  ['haumea','kuiper','柯伊伯带','快速自转且形状拉长的矮行星；黄道高度由历表给出。'],
  ['makemake','kuiper','柯伊伯带','遥远的冰质矮行星；它与冥王星并不位于同一个方向。'],
  ['quaoar','kuiper','经典柯伊伯带','对照冥王星的共振轨道，观察经典族成员的位置与黄道高度。'],
  ['sedna','scattered','离散 / 脱离轨道','它不属于当前正被海王星强烈散射的近海王星轨道；起源与奥尔特云关系仍属研究问题。'],
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
  if(family==='asteroids')return REGION_MEMBERS.filter(body=>body.zone==='asteroid'||body.id==='eros');
  if(family==='centaurs')return REGION_MEMBERS.filter(body=>['patroclus','achilles','aneas','chariklo'].includes(body.id));
  if(family)return [];
  return zone==='all'?REGION_MEMBERS:REGION_MEMBERS.filter(body=>body.zone===zone);
}
