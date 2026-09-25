import type {CosmicLevelId} from './cosmicContext';
import type {StellarView} from './starCatalogue';
import type {BoundaryId} from './boundaryComparison';
import type {EnvironmentStepId} from './environmentJourney';
import type {MotionLessonId} from './motionLessons';
import type {StageId} from './stages';
export type TopicAction={kind:'cosmic';id:CosmicLevelId;view?:StellarView}|{kind:'learning';id:string}|{kind:'boundary';id:BoundaryId}|{kind:'motion';id:MotionLessonId}|{kind:'environment';id:EnvironmentStepId}|{kind:'family';id:'saturn'}|{kind:'member';id:'sedna'}|{kind:'detail';id:'eros'|'enceladus'};
export interface TopicStep {title:string;look:string;limit:string;action:TopicAction;stages:StageId[];selector:string;}
export interface TopicRoute {id:string;name:string;question:string;steps:TopicStep[];}
export const TOPIC_ROUTES:TopicRoute[]=[
 {id:'boundaries',name:'整体与边界',question:'从行星区域到远缘，哪些是成员分布，哪些是环境边界？',steps:[
  {title:'先建立整体地图',look:'拖动再侧视，区分中心盘状区域与遥远球状分布。',limit:'距离压缩；区域散点不是逐颗实测天体。',action:{kind:'learning',id:'overview'},stages:['structure'],selector:'.panorama-distances'},
  {title:'靠近行星区域',look:'比较轨道倾角，分清天体、参考轨道和黄道面。',limit:'没有额外夸大高度，球体仍放大、距离仍压缩。',action:{kind:'learning',id:'planets'},stages:['structure'],selector:'.panorama-orbits'},
  {title:'太阳风的环境边界',look:'辨认终止激波、日鞘与日球层顶。',limit:'轮廓为示意，不是硬壳或太阳引力终点。',action:{kind:'boundary',id:'heliosphere'},stages:['structure','heliosphereExplorer'],selector:'[data-boundary-comparison]'},
  {title:'遥远成员的推断区域',look:'观察奥尔特云球状分布，对照证据说明。',limit:'奥尔特云为模型推断，点不对应已发现的单体。',action:{kind:'boundary',id:'oort'},stages:['structure','heliosphereExplorer'],selector:'[data-boundary-comparison]'},
  {title:'把两种边界放回一起',look:'回看同一空间：环境分界与成员归属回答不同问题。',limit:'画面半径比不是真实距离比。',action:{kind:'boundary',id:'all'},stages:['structure','heliosphereExplorer'],selector:'[data-boundary-comparison]'},
 ]},
 {id:'earth-moon',name:'地球到月球',question:'先看母星，再理解卫星、月相和同步自转。',steps:[
  {title:'地球本体与外观',look:'观察球面昼夜、云层和大气，再查看外观开关。',limit:'云图不是当天的天气。',action:{kind:'learning',id:'earth'},stages:[],selector:'.panorama-earth'},
  {title:'展开地月系统',look:'从地球扩大视野，辨认月球及绕地轨道。',limit:'本体大小同比例，地月间距压缩。',action:{kind:'learning',id:'moon'},stages:['families'],selector:'[aria-label="全景卫星与环系"]'},
  {title:'从空间位置到月相',look:'播放或步进，对照主画面与固定地心月相圆面。',limit:'自由镜头所见亮面不一定等于地心月相。',action:{kind:'motion',id:'moon-phase'},stages:['structure','families'],selector:'[data-motion-current]'},
  {title:'同一面朝地球也在自转',look:'对照月球本体箭头与固定空间方向，理解同步自转。',limit:'当前姿态近似，不是锁定形成或精确天平动模拟。',action:{kind:'motion',id:'moon-lock'},stages:['structure','families'],selector:'[data-motion-current]'},
 ]},
 {id:'giants',name:'巨行星与卫星',question:'从母星家族到环，再看卫星如何联系周围环境。',steps:[
  {title:'木星与多个卫星',look:'先辨认母星，再看不同距离上的卫星与参考轨道。',limit:'代表样本不是木星全部卫星，间距压缩。',action:{kind:'learning',id:'jupiter'},stages:['families'],selector:'[aria-label="全景卫星与环系"]'},
  {title:'对照土星家族与环',look:'辨认连续的环与单颗卫星，分别查看环和轨道开关。',limit:'细环可增强；轨道线不是实体环。',action:{kind:'family',id:'saturn'},stages:['families'],selector:'[aria-label="全景卫星与环系"]'},
  {title:'走近土卫二',look:'定位具名卫星，再查看喷流与内部剖示说明。',limit:'内部结构与喷流是模型示意，不是当天实拍。',action:{kind:'detail',id:'enceladus'},stages:['families'],selector:'[data-enceladus]'},
  {title:'回到木卫一的物质联系',look:'区分卫星本体、紫色等离子体环与行星尘埃环。',limit:'点云示意物质分布，不是实测密度。',action:{kind:'environment',id:'io-torus'},stages:['environment','families'],selector:'[data-environment-journey]'},
 ]},
 {id:'small-bodies',name:'区域与小天体',question:'从区域分布进入真实成员，再比较形状、轨迹与远缘。',steps:[
  {title:'从小行星主带开始',look:'区分区域点云与具名成员；区域不是完整清单。',limit:'点数、尺寸和密度没有逐体测量含义。',action:{kind:'learning',id:'belt'},stages:['structure'],selector:'.region-members'},
  {title:'爱神星：真实成员与形状',look:'看资料形状，并与同体积球形对照。',limit:'爱神星是近地小行星案例，不是主带中的当前位置。',action:{kind:'detail',id:'eros'},stages:['members'],selector:'[data-eros-shape]'},
  {title:'哈雷：倾斜的彗星轨迹',look:'比较当前位置、两年路径和参考轨道。',limit:'当前画面不代表彗星正在形成可见彗尾。',action:{kind:'learning',id:'comet'},stages:['comets'],selector:'.panorama-comets'},
  {title:'进入海王星外区域',look:'侧看柯伊伯带厚度，理解分布区域与具名成员。',limit:'区域点云仍为结构示意。',action:{kind:'learning',id:'kuiper'},stages:['structure'],selector:'.region-members'},
  {title:'塞德娜：更遥远的代表',look:'查看日心距离、黄道高度及来源，回顾远缘轨道的多样性。',limit:'这个已知对象不等于已逐颗观测奥尔特云。',action:{kind:'member',id:'sedna'},stages:['members'],selector:'.region-members'},
 ]},
 {id:'solar-earth',name:'太阳风与地球',question:'从太阳出发，理解来流、磁层和极光之间的关系。',steps:[
  {title:'太阳与日冕',look:'从太阳外层认识太阳风的来源。',limit:'日冕外观增强，不是当前活动监测。',action:{kind:'environment',id:'sun'},stages:['solarActivity'],selector:'[data-environment-journey]'},
  {title:'来到地球附近',look:'观察黄色来流及其传播方向。',limit:'不是追踪同一群粒子从太阳抵达地球。',action:{kind:'environment',id:'wind'},stages:['environment'],selector:'[data-environment-journey]'},
  {title:'磁层如何响应',look:'侧看迎风侧与背日磁尾，区分磁场线与轨道。',limit:'边界、磁轴与尺寸为教学示意。',action:{kind:'environment',id:'magnet'},stages:['environment'],selector:'[data-environment-journey]'},
  {title:'靠近极区的发光',look:'查看地球极区光带，并阅读能量输入与大气发光说明。',limit:'不预报当天极光、亮度或当地可见性。',action:{kind:'environment',id:'aurora'},stages:['environment'],selector:'[data-environment-journey]'},
 ]},
 {id:'cosmic',name:'太阳系在宇宙中的位置',question:'从我们的太阳系出发，区分恒星距离、天空方向和星系结构。',steps:[
  {title:'从太阳系整体出发',look:'先认出太阳和行星区域；接下来离开太阳系尺度，看太阳周围的其他恒星。',limit:'太阳系距离压缩；后续换到光年尺度，画面大小不可直接相除。',action:{kind:'learning',id:'overview'},stages:['structure'],selector:'.panorama-distances'},
  {title:'太阳与邻星：看空间远近',look:'太阳和波江座 ε 同屏。辨认黄色距离连线，拖动观察上下前后的分布。',limit:'固定 J1991.25 星表样本，三轴距离同比例；光点是放大标记。',action:{kind:'cosmic',id:'neighbors',view:'space'},stages:[],selector:'[data-star-panel]'},
  {title:'同一颗星：从太阳看方向',look:'保留波江座 ε，回到太阳附近向外看。距离来自资料，不能从点的大小判断。',limit:'天球只显示方向；无地平遮挡，不是今晚地面星空。',action:{kind:'cosmic',id:'neighbors',view:'sky'},stages:[],selector:'[data-star-panel]'},
  {title:'太阳系属于银河系',look:'将太阳与邻星放回所属星系。看太阳所在区域，理解恒星系统与星系的区别。',limit:'切换为银河概念模型；点云和太阳位置为概略示意，并非实测星表重建。',action:{kind:'cosmic',id:'milkyway'},stages:[],selector:'[data-cosmic-module]'},
  {title:'银河系之外还有星系',look:'辨认银河系、大麦哲伦云和仙女座星系；再返回太阳系回顾层次。',limit:'各星系为独立示意，不共用真实位置、大小和距离比例。',action:{kind:'cosmic',id:'galaxies'},stages:[],selector:'[data-cosmic-module]'},
 ]},
];
export interface TopicSelection {route:string;index:number;}
export function topicSelection(selection:TopicSelection|null){const route=TOPIC_ROUTES.find(r=>r.id===selection?.route);const step=route?.steps[selection?.index??-1];return route&&step?{route,step,index:selection!.index}:null;}
