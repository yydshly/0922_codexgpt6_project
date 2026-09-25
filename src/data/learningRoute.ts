import type {MacroZoneId} from './macroStructure';
import type {IntegratedTarget} from './integratedScene';
import type {CosmicLevelId} from './cosmicContext';
import type {StageId} from './stages';
export type LearningDestination={kind:'zone';id:MacroZoneId}|{kind:'target';id:IntegratedTarget}|{kind:'member';id:string}|{kind:'cosmic';id:CosmicLevelId};
export interface LearningStep {id:string;chapter:number;title:string;path:string;why:string;look:string;boundary:string;destination:LearningDestination;stages:StageId[];}
export const LEARNING_CHAPTERS=['整体结构','太阳与行星','卫星家族','小天体','外围边界','宇宙位置'];
export const LEARNING_STEPS:LearningStep[]=[
 {id:'overview',chapter:0,title:'先看太阳系整体',path:'太阳系',why:'先建立区域地图，再进入具体天体。',look:'旋转和侧视，分辨中心行星区域与遥远外围；暂时不追逐每个亮点。',boundary:'距离压缩；点云是结构示意，奥尔特云为推断。',destination:{kind:'zone',id:'all'},stages:['structure']},
 {id:'sun',chapter:1,title:'太阳：太阳系中的恒星',path:'太阳系 › 恒星 › 太阳',why:'先认识主要恒星，再看围绕它运行的行星。',look:'观察太阳本体，阅读质量和半径；太阳活动可在更多工具中延伸观察。',boundary:'外观是静态纹理；补光与球体大小为展示调整。',destination:{kind:'target',id:'body:sun'},stages:[]},
 {id:'planets',chapter:1,title:'行星：从轨道看整体关系',path:'太阳系 › 太阳 › 行星区域',why:'从太阳退回区域尺度，建立各行星的位置关系。',look:'用斜视与侧视比较轨道方向、倾角；再进入地球作为行星样本。',boundary:'行星位置来自历表，曲线为瞬时参考轨道。',destination:{kind:'zone',id:'planetary'},stages:[]},
 {id:'earth',chapter:1,title:'地球：观察一颗行星',path:'太阳系 › 行星 › 地球',why:'先认识行星本体，下一节再展开它的卫星。',look:'看球面、昼夜、云层和大气；在地球模块查询参数与外观说明。',boundary:'云图不代表当日天气，球体放大。',destination:{kind:'target',id:'body:earth'},stages:[]},
 {id:'moon',chapter:2,title:'地月：从母星到卫星',path:'太阳系 › 地球 › 月球',why:'沿用刚才的地球，扩大局部视野理解卫星关系。',look:'点选月球，查看相对地球的距离与速度；改变日期观察相对位置。',boundary:'地月本体大小同比例，间距压缩；轨道线属于月球。其他成员默认暂隐，返回全景恢复。',destination:{kind:'target',id:'earth'},stages:['families']},
 {id:'jupiter',chapter:2,title:'木星家族：多个卫星与环',path:'太阳系 › 木星 › 卫星与环',why:'从一颗卫星的地月系统，扩展到多卫星家族。',look:'先辨认中央木星，再点选外围卫星，对照环和轨道线。',boundary:'仅展示已接入样本；细环亮度与宽度可增强。',destination:{kind:'target',id:'jupiter'},stages:['families']},
 {id:'belt',chapter:3,title:'主带：先认识小天体所在区域',path:'太阳系 › 小行星主带',why:'离开行星家族，转向分布在区域中的小天体。',look:'辨认主带位置，比较区域点云与具名成员。',boundary:'点数、大小和密度不代表真实天体清单。',destination:{kind:'zone',id:'asteroid'},stages:['structure']},
 {id:'vesta',chapter:3,title:'灶神星：从区域进入代表成员',path:'太阳系 › 主带 › 灶神星',why:'从上一节的主带中选一个可追溯的真实对象。',look:'查看日心距离、速度和黄道高度，再对照所属区域。',boundary:'位置来自历表；放大外观不是实测地形。',destination:{kind:'member',id:'vesta'},stages:['members']},
 {id:'comet',chapter:3,title:'哈雷：不同类型的运行轨迹',path:'太阳系 › 彗星 › 哈雷',why:'接着比较彗星，避免把所有小天体理解成同一条环。',look:'对比当前位置、两年路径和参考椭圆；彗尾要到独立示例中阅读。',boundary:'彗尾示例不表示当前活动，路径线也不是实体。',destination:{kind:'target',id:'halley'},stages:['comets']},
 {id:'kuiper',chapter:3,title:'柯伊伯带：再进入远缘区域',path:'太阳系 › 海王星外 › 柯伊伯带',why:'先认识更远的区域，再看其中的矮行星家族。',look:'侧视区域厚度，找到冥王星等具名代表的入口。',boundary:'区域点云为示意，不是完整逐体位置。',destination:{kind:'zone',id:'kuiper'},stages:['structure']},
 {id:'pluto',chapter:3,title:'冥王星—卡戎：远缘双体',path:'太阳系 › 远缘天体 › 冥王星 › 卡戎',why:'延续区域到成员、母体到卫星的观察顺序。',look:'对照两颗球体、共同质心和相对运行，比较与地月系统的呈现。',boundary:'双体局部统一比例；到太阳的距离仍被压缩。',destination:{kind:'target',id:'pluto-system'},stages:['families']},
 {id:'heliosphere',chapter:4,title:'日球层：太阳风的环境边界',path:'太阳系 › 空间环境 › 日球层',why:'看完主要成员后，再理解包围它们的空间环境。',look:'区分环境边界与天体轨道；从侧栏可展开日球层详解。',boundary:'轮廓为模型示意，不是太阳系硬壳或引力终点。',destination:{kind:'zone',id:'heliosphere'},stages:['structure']},
 {id:'oort',chapter:4,title:'奥尔特云：认识推断的外围',path:'太阳系 › 遥远外围 › 奥尔特云',why:'与日球层对照，理解不同“边界”回答不同问题。',look:'观察远缘球状分布，并阅读它的证据和不确定范围。',boundary:'这是推断模型，不能把散点当作逐颗实测天体。',destination:{kind:'zone',id:'oort'},stages:['structure']},
 {id:'neighbors',chapter:5,title:'邻近恒星：离开太阳系尺度',path:'太阳系 › 恒星邻域',why:'先建立太阳系内部关系，再把它放回更大的空间。',look:'比较太阳与其他恒星系统，注意尺度单位切换到光年。',boundary:'邻域已接入筛选星表；固定 J1991.25，不是完整普查或今晚星图。',destination:{kind:'cosmic',id:'neighbors'},stages:[]},
 {id:'galaxy',chapter:5,title:'银河系：太阳系所属的星系',path:'太阳系 › 银河系',why:'把刚才的恒星邻域放到整个星系中理解。',look:'辨认太阳所在区域与银河结构，区分恒星系统和星系。',boundary:'银河形态与画面标记为模型示意，不是外部实拍。',destination:{kind:'cosmic',id:'milkyway'},stages:[]},
 {id:'galaxies',chapter:5,title:'邻近星系：更大的宇宙背景',path:'银河系 › 邻近星系',why:'完成由整体到成员、再回到更大尺度的主线。',look:'比较星系尺度；回顾太阳、行星、卫星、星系的所属关系。',boundary:'独立取景，图中大小与方位不等于真实共同尺度。',destination:{kind:'cosmic',id:'galaxies'},stages:[]},
];
export interface LearningView{phenomenon?:string|null;scope:'solar'|'cosmic';zone:MacroZoneId;tab:'zones'|'families';target:IntegratedTarget|null;member:string|null;cosmic:CosmicLevelId;}
export function learningMatches(step:LearningStep,view:LearningView){const d=step.destination;if(d.kind==='cosmic')return view.scope==='cosmic'&&view.cosmic===d.id;if(view.scope!=='solar')return false;if(d.kind==='target')return !view.phenomenon&&view.target===d.id;if(d.kind==='member')return view.member===d.id;return !view.target&&!view.member&&view.tab==='zones'&&view.zone===d.id;}
