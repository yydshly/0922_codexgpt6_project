import type {IntegratedId, IntegratedTarget} from './integratedScene';
import type {PhenomenonPart, PhenomenonParts} from './phenomenonParts';

const WIND_SOURCE='https://science.nasa.gov/sun/what-is-the-solar-wind/';
const MAGNET_SOURCE='https://science.nasa.gov/heliophysics/focus-areas/magnetosphere-ionosphere/';
const AURORA_SOURCE='https://science.nasa.gov/sun/auroras/';
export const ENVIRONMENT_STEPS=[
 {id:'sun',name:'太阳与活动',target:'sun',intent:'solar',stage:'solarActivity',title:'太阳：持续释放太阳风，也会发生爆发',description:'太阳风持续从日冕向外流出；耀斑是辐射增强，CME 是磁化等离子体的大规模抛射。三者不能画上等号。',look:'观察日冕，再与下方太阳活动开关对照。此处只保留日冕，避免把所有爆发现象同时出现误认为常态。',legend:'淡色外层：日冕形态示意，亮度与厚度增强。',source:WIND_SOURCE,parts:['corona']},
 {id:'wind',name:'太阳风',target:'earth',intent:'environment',stage:'environment',title:'到达地球附近：流动的带电粒子',description:'太阳风携带粒子与磁场进入行星际空间。这里在地球向阳侧画一段来流，帮助识别太阳到地球的方向。',look:'播放示意，观察黄色点朝地球方向移动；这不是从太阳逐颗追踪到地球的同一群粒子。',legend:'黄色点与箭头：来流方向；点数、速度、间距没有实测含义。',source:WIND_SOURCE,parts:['incomingWind']},
 {id:'magnet',name:'磁层响应',target:'earth',intent:'environment',stage:'environment',title:'磁层：向阳侧受压，背阳侧拖成长尾',description:'太阳风与地球磁场相互作用，形成不对称的磁层环境。磁场线表示场的方向与结构，并不是粒子的运动轨道。',look:'对照黄色来流与青色磁层轮廓；转动镜头，辨认迎风侧和背日侧。',legend:'青色长轮廓：磁层；淡色曲线：磁场参考线，均非可见实体。',source:MAGNET_SOURCE,parts:['incomingWind','magnet','dipole']},
 {id:'aurora',name:'极光',target:'earth',intent:'environment',stage:'environment',title:'极光：上层大气发光',description:'太阳风与磁层的相互作用可向近地空间输入能量；高能粒子碰撞上层大气中的原子和分子，使其发光。不是每次太阳爆发都会在地球产生明显极光。',look:'此步收起大尺度来流与磁尾，滚轮靠近地球两极，观察淡绿色发光带。',legend:'绿色极区带：极光位置示意，不是固体环；未计算真实磁轴、强度及当日边界。',source:AURORA_SOURCE,parts:['aurora']},
 {id:'jupiter-magnet',name:'木星磁层',target:'jupiter',intent:'environment',stage:'environment',title:'对照木星：磁层不仅受太阳风影响',description:'木星磁场约束着周围带电粒子；太阳风影响外部形状，快速自转及内部物质来源也参与塑造环境。这里用轮廓表示区域，不是可见外壳。',look:'侧看向阳侧和背日磁尾，再回到第 3 步对照地球。两处镜头独立缩放，不能用画面大小比较真实磁层大小。',legend:'蓝色线：木星磁层参考轮廓；边界与磁尾长度为压缩示意，不是当天测量。',source:'https://science.nasa.gov/jupiter/jupiter-facts/',parts:['jupiterMagnet']},
 {id:'io-torus',name:'木卫一供给',target:'jupiter',intent:'environment',stage:'environment',title:'木卫一：火山物质补给等离子体环',description:'木卫一火山释放的物质经电离后形成离子和电子，在其轨道附近构成等离子体环。它与由尘粒组成的木星行星环不同，也不是卫星轨道线。',look:'查看具名的木卫一及周围紫色点云；卫星位置随观测日期更新，点云只示意物质分布。',legend:'小球：当日木卫一，保留与木星的本体大小比；紫色点云：等离子体，不表示实测密度。距离压缩，环带截面增强。',source:'https://science.nasa.gov/resource/jupiters-magnetosphere/',parts:['ioTorus']},
 {id:'jupiter-aurora',name:'木星极光',target:'jupiter',intent:'environment',stage:'environment',title:'木星极光：与磁层和卫星相联系',description:'高能粒子进入木星大气可产生极光；木卫一还会在极光区留下与其磁相互作用相关的足迹。这里仅显示极区发光带，不把全部木星极光归因于木卫一。',look:'对照第 4 步地球极光。木星常用紫外等波段观测极光，这里的蓝紫色为解释用着色，不代表肉眼颜色。',legend:'蓝紫色带：极光示意；未重建当日极光、木卫一足迹及准确磁轴。',source:'https://science.nasa.gov/asset/hubble/jupiters-northern-and-southern-auroras/',parts:['jupiterAurora']},
] as const;
export type EnvironmentStepId=typeof ENVIRONMENT_STEPS[number]['id'];
export type EnvironmentStep=typeof ENVIRONMENT_STEPS[number];
const CONTROLLED:PhenomenonPart[]=['chromosphere','transition','sunspots','prominence','corona','flare','cme','incomingWind','magnet','dipole','aurora','jupiterMagnet','ioTorus','jupiterAurora'];
export function environmentStepParts(previous:PhenomenonParts,id:EnvironmentStepId):PhenomenonParts{
 const enabled:readonly string[]=ENVIRONMENT_STEPS.find(step=>step.id===id)!.parts;
 return {...previous,...Object.fromEntries(CONTROLLED.map(key=>[key,enabled.includes(key)]))};
}
/** Derive selection from the actual view; manual changes must not leave a stale lesson badge. */
export function environmentStepForView(target:IntegratedTarget|null,intent:IntegratedId|null,parts:PhenomenonParts):EnvironmentStep|null{
 return ENVIRONMENT_STEPS.find(step=>step.target===target&&step.intent===intent&&CONTROLLED.every(key=>parts[key]===(step.parts as readonly string[]).includes(key)))??null;
}
/** Diagram coordinates: +X is anti-solar. The short segment ends before the magnetopause. */
export function incomingWindPoint(index:number,progress:number):[number,number,number]{
 const phase=((index*.618034+progress)%1+1)%1;
 const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 const radius=.32*Math.sqrt(hash(index+1)),angle=hash(index+97)*Math.PI*2;
 return [-1.25+.66*phase,radius*Math.sin(angle),radius*Math.cos(angle)];
}
