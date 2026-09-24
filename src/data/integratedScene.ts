import type {MacroFamilyId} from './macroFamilies';
import type {StageFlags} from './stages';
export const INTEGRATED_ITEMS=[
 {id:'solar',title:'太阳活动',target:'sun',stage:'solarActivity',detail:'太阳位置展开日冕、耀斑和 CME；方位、大小和进度为示意，不代表当日活动。'},
 {id:'environment',title:'地球磁层与极光',target:'earth',stage:'environment',detail:'跟随历表中的地球位置，磁尾指向背日侧。形态、磁轴和极光均为放大示意。'},
 {id:'belts',title:'辐射带与等离子体层',target:'earth',stage:'nearEarth',detail:'地球周围的三类粒子区域，空间可重叠，不是固体环或卫星轨道。'},
 {id:'dust',title:'碎屑流与流星示例',target:'dust',stage:'dustExplorer',detail:'太阳附近的倾斜碎屑流与地球旁的流星示例。两者没有逐颗追踪关系，不是当日事件。'},
 {id:'helio',title:'日鞘与星际介质',target:'helio',stage:'heliosphereExplorer',detail:'在原有日球层轮廓处补日鞘体积分布、外部介质和中性原子示意。'},
] as const;
export type IntegratedId=typeof INTEGRATED_ITEMS[number]['id'];
export type PhenomenonTarget=typeof INTEGRATED_ITEMS[number]['target'];
export type IntegratedTarget=PhenomenonTarget|MacroFamilyId;
export type IntegratedFlags=Record<IntegratedId,boolean>;
export const defaultIntegratedFlags=():IntegratedFlags=>({solar:true,environment:true,belts:true,dust:true,helio:true});
export function integratedFlags(flags:IntegratedFlags,stages:StageFlags,hasFrame:boolean):IntegratedFlags{
 return Object.fromEntries(INTEGRATED_ITEMS.map(item=>[item.id,flags[item.id]&&stages[item.stage]&&(item.target!=='earth'||hasFrame)])) as IntegratedFlags;
}
export const INTEGRATED_FOCUS_DISTANCE:Record<IntegratedTarget,number>={sun:6,earth:3.4,dust:13,helio:29,mars:2.8,jupiter:2.7,saturn:2.7,uranus:2.7,neptune:2.7};
export function integratedDetailVisible(target:PhenomenonTarget,distance:number,focused:IntegratedTarget|null){
 return focused===target||distance<({sun:13,earth:8,dust:22,helio:45}[target]);
}
