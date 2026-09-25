import type {IntegratedId,IntegratedTarget} from './integratedScene';
import type {PhenomenonParts} from './phenomenonParts';
import type {EnceladusChoices} from './enceladusInterior';
export const MATERIAL_STEPS=[
 {id:'comet',name:'彗星代表',stage:'comets',title:'彗星：释放碎屑的来源之一',text:'先定位真实哈雷彗星。哈雷留下的碎屑与宝瓶座 η、猎户座流星雨有关；此处显示当日彗星位置，不代表当天正在爆发流星雨。',legend:'具名彗星来自历表；下一步是独立的通用碎屑流，不是哈雷粒子的重建。',source:'https://science.nasa.gov/solar-system/meteors-meteorites/meteor-showers/'},
 {id:'stream',name:'碎屑分布',stage:'dustExplorer',title:'碎屑流：物质沿轨道附近分布',text:'彗星释放的尘粒可逐渐分散；地球经过碎屑分布区域时可能产生流星雨。也有与小行星有关的流星雨，不能把所有流星都归给彗星。',legend:'青色点带是通用倾斜分布示意，没有对应某一场流星雨；不根据当前日期预测相交。',source:'https://science.nasa.gov/solar-system/meteors-meteorites/meteor-showers/'},
 {id:'meteor',name:'进入大气',stage:'dustExplorer',title:'流星：固体进入大气产生的光迹',text:'太空中的小固体称为流星体；进入大气后发光的现象称为流星。若有残余落地，才称为陨石。本例最后消融，没有落地残余。',legend:'仅演示一颗流星体，不是流星雨预报；颗粒、光迹及大气层厚度均增强。播放进度与观测日期独立。',source:'https://science.nasa.gov/solar-system/meteors-meteorites/facts/'},
 {id:'zodiacal',name:'尘埃与光',stage:'dustExplorer',title:'黄道光：尘埃散射太阳光',text:'行星际尘埃散射的太阳光可被地球上的观察者看到，形成黄道光。它不是尘埃燃烧，也不是一条真实发光管道。',legend:'浅金点云是尘埃分布；金色折线示意太阳 → 尘埃 → 地球方向的散射路径。这是空间原理图，不是地面夜空亮度图。',source:'https://www.nasa.gov/missions/serendipitous-juno-spacecraft-detections-shatter-ideas-about-origin-of-zodiacal-light/'},
 {id:'plume',name:'土卫二喷流',stage:'families',title:'土卫二：冰粒从南极裂隙喷出',text:'卡西尼观测到土卫二喷出的水蒸气与冰粒。先近看喷流结构，再拉远到土星附近，理解部分喷出物如何补给 E 环。',legend:'土卫二位置来自当日历表；喷流方向、长度和点数为静态示意，未重建当前极轴或喷发。',source:'https://science.nasa.gov/saturn/moons/enceladus/'},
 {id:'e-ring',name:'补给 E 环',stage:'families',title:'E 环：土卫二补给的稀薄冰粒环',text:'部分喷出的冰粒散布在土星周围，补给稀薄的 E 环。它与明亮的 A/B/C 主环不同，也与木卫一周围的带电等离子体环不同。',legend:'浅蓝点云为 E 环区域示意，厚度和亮度增强，无实测密度；土卫二随日期运行。未逐颗模拟从喷流到环的输运。',source:'https://science.nasa.gov/saturn/moons/enceladus/'},
] as const;
export type MaterialStepId=typeof MATERIAL_STEPS[number]['id'];
export type MaterialStep=typeof MATERIAL_STEPS[number];
export function materialParts(parts:PhenomenonParts,id:MaterialStepId):PhenomenonParts{return {...parts,stream:id==='stream',meteor:id==='meteor',zodiacal:id==='zodiacal'};}
export function materialStepForView(target:IntegratedTarget|null,intent:IntegratedId|null,parts:PhenomenonParts,selected:string|null,choices:EnceladusChoices):MaterialStep|null{
 let id:MaterialStepId|undefined;
 if(target==='halley'&&!intent)id='comet';
 if(intent==='dust'){
  if(target==='dust'&&parts.stream&&!parts.meteor&&!parts.zodiacal)id='stream';
  if(target==='earth'&&parts.meteor&&!parts.stream&&!parts.zodiacal)id='meteor';
  if(target==='dust'&&parts.zodiacal&&!parts.meteor&&!parts.stream)id='zodiacal';
 }
 if(target==='saturn'&&!intent){if(selected==='enceladus'&&choices.jets&&!choices.cutaway&&!choices.eRing)id='plume';if(!selected&&choices.eRing)id='e-ring';}
 return MATERIAL_STEPS.find(s=>s.id===id)??null;
}
/** Seeded illustration sample; radial bounds are drawing choices, not measured dust density. */
export function dustSample(i:number):[number,number,number]{const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};const a=hash(i+8)*Math.PI*2,r=.65+2.8*Math.sqrt(hash(i+89));return [r*Math.cos(a),(hash(i+162)-.5)*.24,r*Math.sin(a)];}
