import type {IntegratedId} from './integratedScene';
export const PHENOMENON_PARTS=[
 {id:'chromosphere',group:'solar',name:'色球（层厚增强）'}, {id:'transition',group:'solar',name:'过渡区（层厚增强）'}, {id:'sunspots',group:'solar',name:'黑子示例'}, {id:'prominence',group:'solar',name:'日珥示例'},
 {id:'corona',group:'solar',name:'日冕'}, {id:'flare',group:'solar',name:'耀斑亮斑'}, {id:'cme',group:'solar',name:'CME 物质云团'},
 {id:'incomingWind',group:'environment',name:'太阳风来流示意'}, {id:'magnet',group:'environment',name:'磁层与边界'}, {id:'dipole',group:'environment',name:'磁场参考线'}, {id:'aurora',group:'environment',name:'极光'},
 {id:'jupiterMagnet',group:'environment',name:'木星磁层示意'}, {id:'ioTorus',group:'environment',name:'木卫一等离子体环'}, {id:'jupiterAurora',group:'environment',name:'木星极光示意'},
 {id:'innerBelt',group:'belts',name:'内辐射带'}, {id:'outerBelt',group:'belts',name:'外辐射带'}, {id:'plasmasphere',group:'belts',name:'等离子体层'},
 {id:'zodiacal',group:'dust',name:'尘埃与散射路径示意'}, {id:'stream',group:'dust',name:'碎屑流'}, {id:'meteor',group:'dust',name:'地球旁流星示例'},
 {id:'parkerField',group:'helio',name:'帕克螺旋参考场'}, {id:'currentSheet',group:'helio',name:'起伏电流片示意'}, {id:'photonRays',group:'helio',name:'光传播方向示意'}, {id:'chargedParticles',group:'helio',name:'局部带电粒子轨迹'}, {id:'neutralAtoms',group:'helio',name:'中性原子自由飞行示意'},
 {id:'sheath',group:'helio',name:'日鞘'}, {id:'medium',group:'helio',name:'外部星际介质'}, {id:'neutrals',group:'helio',name:'中性原子示例'},
] as const satisfies readonly {id:string;group:IntegratedId;name:string}[];
export type PhenomenonPart=typeof PHENOMENON_PARTS[number]['id'];
export type PhenomenonParts=Record<PhenomenonPart,boolean>;
export const defaultPhenomenonParts=():PhenomenonParts=>Object.fromEntries(PHENOMENON_PARTS.map(p=>[p.id,!['incomingWind','zodiacal','parkerField','currentSheet','photonRays','chargedParticles','neutralAtoms'].includes(p.id)])) as PhenomenonParts;
