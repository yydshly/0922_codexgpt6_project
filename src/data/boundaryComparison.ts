import {MACRO_LAYERS,type MacroLayerVisibility} from './macroLayers';
import type {MacroZoneId} from './macroStructure';
import type {IntegratedFlags,IntegratedTarget} from './integratedScene';
export const BOUNDARY_STEPS=[
 {id:'heliosphere',name:'太阳风边界',title:'日球层：太阳风与星际介质的边界',text:'金色轮廓是终止激波，蓝色轮廓是日球层顶，中间是日鞘。它们划分等离子体环境，不是固体外壳，也不是太阳引力在此归零。',legend:'轮廓取约 90 / 120 AU 作绘图参考，不是当前球形边界；实际位置随方向和时间变化。',evidence:'原位探测：旅行者 1 号于 2012 年、2 号于 2018 年穿过日球层顶。',source:'https://science.nasa.gov/mission/voyager/interstellar-mission/'},
 {id:'oort',name:'遥远冰质天体',title:'奥尔特云：由彗星与动力学推断的区域',text:'外层淡蓝点云表达遥远冰质天体可能形成的球状分布。它不是气体云，也不是一层实体球壳；每个点都不对应一颗已观测成员。',legend:'内缘估计约 2,000–5,000 AU，外缘约 10,000–100,000 AU。此处沿用 2,000–100,000 AU 绘图样本；内外结构、边界和密度均不确定。',evidence:'模型推断：没有直接拍到整片奥尔特云，球状点云只是参考结构。',source:'https://science.nasa.gov/solar-system/oort-cloud/facts/'},
 {id:'all',name:'放在同一空间',title:'边界对照：环境分界与遥远成员',text:'日球层顶附近的空间已经可称为星际空间，但更远处仍可能有受太阳引力束缚的成员。太阳系的范围取决于讨论的是太阳风环境还是天体归属，不能共用一堵外墙。',legend:'同屏沿用一致的日心距离压缩，视觉半径比不是真实距离比；灰蓝点为奥尔特云模型，中心蓝线为日球层示意。',evidence:'两类证据并列：探测器穿越记录不等于奥尔特云已被直接观测。',source:'https://science.nasa.gov/solar-system/oort-cloud/facts/'},
] as const;
export type BoundaryId=typeof BOUNDARY_STEPS[number]['id'];
export type BoundaryStep=typeof BOUNDARY_STEPS[number];
export function boundaryLayers(id:BoundaryId):MacroLayerVisibility{return Object.fromEntries(MACRO_LAYERS.map(layer=>[layer.id,layer.id==='planetary'||layer.id==='heliosphere'&&id!=='oort'||layer.id==='oort'&&id!=='heliosphere'])) as MacroLayerVisibility;}
export function boundaryForView(zone:MacroZoneId,tab:string,target:IntegratedTarget|null,member:string|null,layers:MacroLayerVisibility,choices:IntegratedFlags):BoundaryStep|null{
 if(tab!=='zones'||target||member||Object.values(choices).some(Boolean))return null;
 const step=BOUNDARY_STEPS.find(s=>s.id===zone);if(!step)return null;
 const expected=boundaryLayers(step.id);return MACRO_LAYERS.every(l=>layers[l.id]===expected[l.id])?step:null;
}
export const BOUNDARY_SCALE={referenceHeliopauseAu:120,oortInnerAu:[2000,5000],oortOuterAu:[10000,100000]} as const;
