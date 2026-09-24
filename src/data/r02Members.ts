import type {AtlasBody} from './atlas';
export const R02_ATLAS:AtlasBody[]=[
 {id:'quaoar',name:'夸奥尔',englishName:'50000 Quaoar',category:'small',parent:'太阳',radiusKm:null,radiusNote:'本批未纳入经统一审核的形状尺寸参数；球体仅作放大的位置标记，不据此比较实际大小。',description:'经典柯伊伯带天体代表。它绕太阳运行，可与受到海王星共振约束的冥王星对照。',features:['经典柯伊伯带成员','位置与速度采用 JPL 几何历表','本批不绘制它的环和卫星，留待家族与环批次'],color:'#c6b09b',appearance:'ice',sourceUrl:'https://science.nasa.gov/asset/hubble/quaoars-size-compared-with-earths-moon-pluto-and-charon/'},
 {id:'sedna',name:'塞德娜',englishName:'90377 Sedna',category:'small',parent:'太阳',radiusKm:null,radiusNote:'本批不以未经统一审核的尺寸估计驱动画面半径；球体是位置标记。',description:'脱离轨道天体代表，近日点也远在海王星之外。它有实测轨道，但形成机制仍有研究分歧，不能据此声称奥尔特云已被逐体观测。',features:['离散 / 脱离轨道（detached）','与散射族的当前动力学关系不同','不是第九行星，也不计入五颗正式矮行星'],color:'#c79178',appearance:'ice',sourceUrl:'https://science.nasa.gov/solar-system/kuiper-belt/facts/'},
];
export const OUTER_CLASSES=[
 {id:'classical',name:'经典族',member:'quaoar',label:'夸奥尔',description:'不处于强海王星平均运动共振的带内群体；“经典”不等于轨道完全共面或完全圆形。',source:'https://arxiv.org/abs/1910.09988'},
 {id:'resonant',name:'共振族',member:'pluto',label:'冥王星',description:'冥王星绕日两周期间，海王星约绕日三周。共振是长期公转关系，不是此刻两个天体间固定的角度。',source:'https://science.nasa.gov/solar-system/kuiper-belt/facts/'},
 {id:'scattered',name:'散射族',member:null,label:'查看分布区域',description:'与海王星引力散射有关的远伸轨道群体。这里的紫色点云只画分布示意，不是具名天体清单；不能仅凭当天距离判定分类。',source:'https://science.nasa.gov/solar-system/kuiper-belt/facts/'},
 {id:'detached',name:'离散 / 脱离族',member:'sedna',label:'塞德娜',description:'近日点已很远，与海王星当前的直接散射作用较弱。塞德娜的起源仍有多种解释，不把它标为已证实的奥尔特云成员。',source:'https://science.nasa.gov/solar-system/kuiper-belt/facts/'},
] as const;
