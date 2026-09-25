import { R02_ATLAS } from './r02Members';
import { R01_ATLAS } from './r01Members';
import type { BodyId, CameraView } from '../types';

/** Educational atlas metadata. Three entries now also have an independent
 * dynamic observation layer; none are inserted into the ten-body StateFrame.
 * Appearance/color are illustrative art directions, not measured albedos or maps.
 * Sources and radius derivations: docs/ATLAS-SOURCES.md (checked 2026-09-22).
 */
export interface AtlasBody {
  id: string;
  name: string;
  englishName: string;
  category: 'dwarf' | 'moon' | 'small';
  /** Human-readable Chinese name of the primary body. */
  parent: string;
  radiusKm: number | null;
  radiusNote?: string;
  description: string;
  features: string[];
  color: string;
  appearance: 'rock' | 'ice' | 'volcanic' | 'haze' | 'comet';
  sourceUrl: string;
}

export const ATLAS_NOTICE = '真实观测覆盖太阳、八大行星、选定卫星，以及谷神星、冥王星与卡戎。图鉴预览仅说明外观；带有历表的成员可进入动态观测，区域小天体、海王星外成员与 67P 的历表在宏观页展示，可从相关入口查看。扩展对象不参与当前十体引力验证。';

export const ATLAS_BODIES: AtlasBody[] = [
 {id:'patroclus',name:'帕特罗克洛斯',englishName:'617 Patroclus',category:'small',parent:'太阳',radiusKm:56.5,radiusNote:'JPL 2023 卫星解参考半径；与墨诺提俄斯的 52 km 共同用于局部比例，未复原不规则形状。',description:'木星 L5 特洛伊群中的双小行星主星；与墨诺提俄斯一起绕太阳运行，局部又构成相互绕转的双体。不是木星的卫星，也不是两个接触粘合的天体。',features:['两颗分离且尺寸接近的小天体','同一套 JPL 解提供两颗本体中心的位置','主全景可查看同日的相对运动'],color:'#b6aa91',appearance:'rock',sourceUrl:'https://science.nasa.gov/solar-system/planets/jupiter/nasas-lucy-mission-a-journey-to-the-young-solar-system/'},
  {
    id:'ceres',name:'谷神星',englishName:'Ceres',category:'dwarf',parent:'太阳',
    radiusKm:469.7,radiusNote:'JPL 物理参数表的体积等效平均半径；NASA 入门资料常约写 476 km',color:'#b0ada4',appearance:'rock',
    description:'位于火星与木星之间的小行星主带，是这一区域最大的天体，也是内太阳系唯一获正式认可的矮行星。',
    features:['绕太阳一周约 4.6 年','曙光号于 2015 年抵达，首次近距离探测矮行星','它属于主带，不能把所有矮行星都放在海王星之外'],
    sourceUrl:'https://science.nasa.gov/dwarf-planets/ceres/facts/',
  },
  {
    id:'pluto',name:'冥王星',englishName:'Pluto',category:'dwarf',parent:'太阳',
    radiusKm:1188.3,radiusNote:'JPL 物理参数表的平均半径；NASA 入门资料约写直径 2,377 km',color:'#d3b5a1',appearance:'ice',
    description:'柯伊伯带中有冰山、冰川和稀薄大气的世界。2006 年被重新归为矮行星，2015 年新视野号完成飞掠。',
    features:['明亮的心形区域是它最醒目的地貌之一','表面有氮冰平原与水冰山脉','公转约 248 年；卡戎是其最大的卫星'],
    sourceUrl:'https://science.nasa.gov/dwarf-planets/pluto/facts/',
  },
  {
    id:'charon',name:'卡戎',englishName:'Charon',category:'moon',parent:'冥王星',
    radiusKm:606,radiusNote:'JPL 所列平均半径 606.0 ± 0.5 km',color:'#aeb6bc',appearance:'ice',
    description:'冥王星最大的卫星。两者彼此潮汐锁定，卡戎约每 6.4 天绕冥王星系统运行一周。',
    features:['直径约为冥王星的一半','两者中心相距约 19,640 km','灰色外观与北极红色区域为说明性重建'],
    sourceUrl:'https://science.nasa.gov/dwarf-planets/pluto/moons/charon/',
  },
  {
    id:'haumea',name:'妊神星',englishName:'Haumea',category:'dwarf',parent:'太阳',
    radiusKm:null,radiusNote:'明显呈长椭球形，不能用一个球体半径准确描述',color:'#e1e2dd',appearance:'ice',
    description:'柯伊伯带中快速自转的矮行星，外形被拉长，接近一只椭圆球。它还有卫星和环。',
    features:['约 4 小时自转一周','已知两颗卫星：Hiʻiaka 与 Namaka','2017 年恒星掩星观测揭示了它的环'],
    sourceUrl:'https://science.nasa.gov/dwarf-planets/haumea/',
  },
  {
    id:'makemake',name:'鸟神星',englishName:'Makemake',category:'dwarf',parent:'太阳',
    radiusKm:715,radiusNote:'约，NASA 概览值',color:'#c98f72',appearance:'ice',
    description:'一颗遥远的柯伊伯带矮行星，平均日距约为地日距离的 46 倍，体积比冥王星小。',
    features:['平均日距约 45.8 AU','阳光到达这里需要六个多小时','已发现一颗昵称为 MK 2 的小卫星'],
    sourceUrl:'https://science.nasa.gov/dwarf-planets/makemake/',
  },
  {
    id:'eris',name:'阋神星',englishName:'Eris',category:'dwarf',parent:'太阳',
    radiusKm:1163,radiusNote:'1163 ± 6 km，来自本项目保存的 JPL TNO 卫星解本体响应头；不是精确表面形状',color:'#e2e4e7',appearance:'ice',
    description:'大小与冥王星相近的遥远矮行星，轨道倾斜明显，远伸到柯伊伯带之外。它的发现推动了行星定义的讨论。',
    features:['平均日距约 68 AU','绕太阳一周约需 557 年','卫星 Dysnomia 的运动帮助研究者测量它的质量'],
    sourceUrl:'https://science.nasa.gov/dwarf-planets/eris/',
  },
  {
    id:'io',name:'木卫一',englishName:'Io',category:'moon',parent:'木星',
    radiusKm:1821.6,radiusNote:'约，NASA 平均半径',color:'#e5c267',appearance:'volcanic',
    description:'太阳系火山活动最强烈的天体之一。木星与邻近卫星的引力拉扯，使它的内部不断获得潮汐热。',
    features:['表面存在大量活火山','潮汐加热作用于岩石内部，而不只发生在海洋','与木卫二、木卫三处于轨道共振关系'],
    sourceUrl:'https://science.nasa.gov/jupiter/jupiter-moons/io/facts/',
  },
  {
    id:'europa',name:'木卫二',englishName:'Europa',category:'moon',parent:'木星',
    radiusKm:1560.8,radiusNote:'约，NASA 平均半径',color:'#d4c9b8',appearance:'ice',
    description:'冰壳表面布满裂纹。多项观测支持冰层下存在盐水海洋，是研究潜在宜居环境的重要目标。',
    features:['地下海洋有强观测证据，但尚未直接进入采样','可能适合生命的环境不等于已经发现生命','NASA 于 2024 年发射 Europa Clipper 开展后续探索'],
    sourceUrl:'https://science.nasa.gov/jupiter/jupiter-moons/europa/',
  },
  {
    id:'ganymede',name:'木卫三',englishName:'Ganymede',category:'moon',parent:'木星',
    radiusKm:2631,radiusNote:'约，NASA 平均半径',color:'#aaa29b',appearance:'ice',
    description:'太阳系最大的天然卫星，直径超过水星。冰与岩石构成的表面保留着明暗不同的古老地形。',
    features:['拥有自身产生的磁场','约 7.155 天绕木星一周','它公转一周时，木卫二约转两周、木卫一约转四周'],
    sourceUrl:'https://science.nasa.gov/jupiter/jupiter-moons/ganymede/facts/',
  },
  {
    id:'callisto',name:'木卫四',englishName:'Callisto',category:'moon',parent:'木星',
    radiusKm:2410,radiusNote:'约，NASA 平均半径',color:'#99918a',appearance:'rock',
    description:'布满撞击坑的冰岩世界，保留了漫长的撞击历史。它是木星第二大卫星，也是太阳系第三大卫星。',
    features:['约 16.689 天绕木星一周','同一面长期朝向木星，即潮汐锁定','地下盐水海洋是一种可能解释，仍存在不确定性'],
    sourceUrl:'https://science.nasa.gov/jupiter/jupiter-moons/callisto/facts/',
  },
  {
    id:'titan',name:'土卫六',englishName:'Titan',category:'moon',parent:'土星',
    radiusKm:2575,radiusNote:'约，NASA 概览值',color:'#d6a358',appearance:'haze',
    description:'浓厚大气与金色雾霾遮住了这颗大卫星的地表。它有河流、湖泊和海洋，表面液体主要是甲烷与乙烷。',
    features:['大气主要成分是氮','低温下甲烷参与降雨、流动和蒸发循环','这是太阳系第二大的天然卫星'],
    sourceUrl:'https://science.nasa.gov/saturn/moons/titan/facts/',
  },
  {
    id:'enceladus',name:'土卫二',englishName:'Enceladus',category:'moon',parent:'土星',
    radiusKm:252.1,radiusNote:'约，依据 NASA/NAIF 三轴半径换算的体积等效值',color:'#e9f4fa',appearance:'ice',
    description:'明亮的冰壳下藏着全球性海洋，南极裂隙把水汽和冰粒喷向太空，卡西尼号曾穿过喷流取样。',
    features:['南极的条状裂隙被昵称为“虎纹”','喷出的冰粒为土星 E 环提供物质','海洋、化学物质与热源使它成为宜居性研究目标'],
    sourceUrl:'https://science.nasa.gov/saturn/moons/enceladus/',
  },
  {
    id:'mimas',name:'土卫一',englishName:'Mimas',category:'moon',parent:'土星',
    radiusKm:Math.cbrt(207.8*196.7*190.6),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值；实际形状略呈椭球',color:'#c8c6b8',appearance:'ice',
    description:'布满撞击坑的冰质卫星，是土星主要卫星中最靠内、最小的一颗。巨大的赫歇尔撞击坑让它具有非常醒目的外观。',
    features:['赫歇尔撞击坑直径约 130 km，约为卫星直径的三分之一','与土星潮汐锁定，长期以同一面朝向母星','场景中的大坑仅为特征示意，不是实测地形或真实纹理'],
    sourceUrl:'https://science.nasa.gov/saturn/moons/mimas/',
  },
  {
    id:'tethys',name:'土卫三',englishName:'Tethys',category:'moon',parent:'土星',
    radiusKm:Math.cbrt(538.4*528.3*526.3),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值，与动态目录采用同一口径',color:'#dfded1',appearance:'ice',
    description:'表面明亮、富含水冰的卫星。奥德修斯撞击坑与伊萨卡大裂谷占据很大的地表范围，记录了它早期的撞击与地质变化。',
    features:['奥德修斯撞击坑直径约 400 km','伊萨卡大裂谷延伸约 2,000 km，形成机制仍有不同解释','表面不断接收土卫二喷流供给土星 E 环的冰粒'],
    sourceUrl:'https://science.nasa.gov/saturn/moons/tethys/',
  },
  {
    id:'dione',name:'土卫四',englishName:'Dione',category:'moon',parent:'土星',
    radiusKm:Math.cbrt(563.4*561.3*559.6),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值，与动态目录采用同一口径',color:'#bdc8cc',appearance:'ice',
    description:'冰质外层中保留着密集撞击坑和明亮的断裂地形。卡西尼号发现，曾被称作“丝状纹理”的亮线，是谷壁上暴露的水冰。',
    features:['明亮冰崖提示表面曾发生构造活动','与土卫二存在约 2:1 的公转周期关系','长期以同一面朝向土星，外观与姿态仍以示意方式呈现'],
    sourceUrl:'https://science.nasa.gov/saturn/moons/dione/',
  },
  {
    id:'rhea',name:'土卫五',englishName:'Rhea',category:'moon',parent:'土星',
    radiusKm:Math.cbrt(765*763.1*762.4),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值，与动态目录采用同一口径',color:'#c4c3bb',appearance:'ice',
    description:'土星第二大的天然卫星，冰质表面保存着大量古老撞击坑。明亮的断裂谷壁与撞击地形，共同记录了它漫长的地质历史。',
    features:['是土星第二大的天然卫星，小于土卫六','表面水冰在极低温下像岩石一样坚硬','卡西尼号在 2006 年影像中辨认出明亮峡谷冰壁'],
    sourceUrl:'https://science.nasa.gov/saturn/moons/rhea/',
  },
  {
    id:'iapetus',name:'土卫八',englishName:'Iapetus',category:'moon',parent:'土星',
    radiusKm:Math.cbrt(745.7*745.7*712.1),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值；实际外形带有扁率与赤道山脊',color:'#d2c9b6',appearance:'ice',
    description:'一颗有明显明暗两面的遥远卫星，沿倾斜轨道绕土星运行。迎向公转方向的一侧较暗，背向的一侧较亮，赤道附近还有醒目的山脊。',
    features:['明暗两面来自表面反照率差异，不是昼夜分界','轨道远于土卫六且倾角明显，约 79 天绕土星一周','暗物质吸热与冰升华可能强化明暗差异；具体材质分布在场景中仅作示意'],
    sourceUrl:'https://science.nasa.gov/saturn/moons/iapetus/',
  },
  {
    id:'miranda',name:'天卫五',englishName:'Miranda',category:'moon',parent:'天王星',
    radiusKm:Math.cbrt(240.4*234.2*232.9),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值，与动态目录采用同一口径',color:'#c8c6bc',appearance:'ice',
    description:'天王星五颗主要卫星中最小、最靠近母星的一颗。断崖、谷地和不同年代的地形拼接在一起，呈现复杂的地质历史。',
    features:['三个大型冕状地形由脊与谷组成，形成机制仍有争议','主要成分被认为是水冰与岩石','轨道比另外四颗主要卫星更倾斜，场景保留历表中的这一差异'],
    sourceUrl:'https://science.nasa.gov/uranus/moons/miranda/',
  },
  {
    id:'ariel',name:'天卫一',englishName:'Ariel',category:'moon',parent:'天王星',
    radiusKm:Math.cbrt(581.1*577.9*577.7),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值，与动态目录采用同一口径',color:'#d2d4d0',appearance:'ice',
    description:'五颗主要天王星卫星中表面最明亮的一颗。交错的断层谷与较少的大型撞击坑，记录了表面曾发生更新的线索。',
    features:['表面存在由断层限定的谷地','已在表面探测到二氧化碳','与天王星潮汐锁定，长期以同一面朝向母星'],
    sourceUrl:'https://science.nasa.gov/uranus/moons/ariel/',
  },
  {
    id:'umbriel',name:'天卫二',englishName:'Umbriel',category:'moon',parent:'天王星',
    radiusKm:Math.cbrt(584.7*584.7*584.7),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值，与动态目录采用同一口径',color:'#86858b',appearance:'ice',
    description:'天王星主要卫星中较暗的古老世界，表面遍布撞击坑。旅行者 2 号拍到的明亮环状地貌，与周围暗色地表形成鲜明对照。',
    features:['是五颗主要天王星卫星中表面最暗的一颗','明亮环状地貌可能与撞击坑中的霜沉积有关，成因尚未确定','旅行者 2 号在 1986 年飞掠期间拍摄了它的南半球'],
    sourceUrl:'https://science.nasa.gov/uranus/moons/umbriel/',
  },
  {
    id:'titania',name:'天卫三',englishName:'Titania',category:'moon',parent:'天王星',
    radiusKm:Math.cbrt(788.9*788.9*788.9),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值，与动态目录采用同一口径',color:'#bdb8b2',appearance:'ice',
    description:'天王星最大的卫星。旅行者 2 号影像中可见横跨表面的长断层谷，提示它的冰质外壳曾经历拉伸与地质活动。',
    features:['是天王星已知卫星中最大的一颗','部分断层谷长达约 1,600 km','谷壁上的明亮沉积物可能是霜，不把这种解释当作直接取样结论'],
    sourceUrl:'https://science.nasa.gov/uranus/moons/titania/',
  },
  {
    id:'oberon',name:'天卫四',englishName:'Oberon',category:'moon',parent:'天王星',
    radiusKm:Math.cbrt(761.4*761.4*761.4),radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值，与动态目录采用同一口径',color:'#a99e93',appearance:'ice',
    description:'天王星第二大的卫星，保留了大量撞击坑。与地形较活跃的天卫一相比，它的表面呈现出更明显的古老撞击记录。',
    features:['与天卫三同在 1787 年由威廉·赫歇尔发现','主要成分被认为是水冰与岩石','旅行者 2 号影像显示一座高出表面约 6 km 的山峰'],
    sourceUrl:'https://science.nasa.gov/uranus/moons/oberon/',
  },
  {
    id:'triton',name:'海卫一',englishName:'Triton',category:'moon',parent:'海王星',
    radiusKm:1350,radiusNote:'约，由 NASA 概览中的约 2,700 km 直径换算',color:'#cec7c3',appearance:'ice',
    description:'海王星最大的卫星，公转方向与海王星自转相反。研究者认为它可能曾是被捕获的柯伊伯带天体。',
    features:['逆行轨道是其独特的动力学线索','表面有氮霜与稀薄的氮气大气','旅行者 2 号在 1989 年飞掠时发现活跃喷泉'],
    sourceUrl:'https://science.nasa.gov/neptune/moons/triton/',
  },
  {
    id:'phobos',name:'火卫一',englishName:'Phobos',category:'moon',parent:'火星',
    radiusKm:null,radiusNote:'不规则形状，三轴全长约 27 × 22 × 18 km',color:'#a99986',appearance:'rock',
    description:'火星较大的卫星，形状像带着撞击坑的岩块。它的轨道离火星很近，绕行速度很快。',
    features:['约 7 小时 39 分钟绕火星一周','巨大撞击坑与表面沟槽十分醒目','尺寸应按三个方向描述，不能当作标准球体'],
    sourceUrl:'https://science.nasa.gov/mars/moons/phobos/',
  },
  {
    id:'deimos',name:'火卫二',englishName:'Deimos',category:'moon',parent:'火星',
    radiusKm:null,radiusNote:'不规则形状，三轴全长约 15 × 12 × 11 km',color:'#b0a38f',appearance:'rock',
    description:'火星较小、较远的卫星，也呈不规则岩块形状。覆盖在表面的细碎物质让它看起来比火卫一平缓。',
    features:['约 30 小时绕火星一周','表面遍布撞击坑','没有火卫一那样明显的沟槽与脊状地形'],
    sourceUrl:'https://science.nasa.gov/mars/moons/deimos/',
  },
  {
    id:'vesta',name:'灶神星',englishName:'4 Vesta',category:'small',parent:'太阳',
    radiusKm:262.5,radiusNote:'约，由 NASA 所列平均直径 525 km 换算；实际并非规则球体',color:'#b3aaa0',appearance:'rock',
    description:'小行星主带中质量仅次于谷神星的大型天体。撞击盆地和地球上相关陨石，记录了它复杂的早期历史。',
    features:['曙光号于 2011—2012 年绕行探测','南极的 Rheasilvia 撞击盆地接近其自身尺度','与地球上部分 HED 陨石存在联系'],
    sourceUrl:'https://science.nasa.gov/solar-system/asteroids/4-vesta/',
  },
  {
    id:'67p',name:'67P 彗星',englishName:'67P/Churyumov–Gerasimenko',category:'small',parent:'太阳',
    radiusKm:null,radiusNote:'双叶形不规则彗核，单一半径不能准确描述',color:'#807a72',appearance:'comet',
    description:'罗塞塔号与菲莱着陆器探测过的彗星。它的多孔彗核会受太阳加热而释放气体与尘埃。',
    features:['首颗被航天器环绕并着陆的彗星','木星的引力曾显著改变它的轨道','彗核中的冰、尘埃和有机物保存着太阳系早期线索'],
    sourceUrl:'https://science.nasa.gov/solar-system/comets/67p-churyumov-gerasimenko/',
  },
  ...R02_ATLAS, ...R01_ATLAS,
];

export interface SolarLesson {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  content: string;
  sourceUrl: string;
  /** Optional related view of the existing ten bodies; never a live atlas object. */
  bodyId?: BodyId;
  view: CameraView;
  speed: number;
  playing: boolean;
}

export const SOLAR_LESSONS: SolarLesson[] = [
  {id:'rocky-worlds',title:'四颗岩质行星',eyebrow:'TERRESTRIAL WORLDS',
    description:'水星、金星、地球和火星都有岩石地表，却拥有迥异的环境。',
    content:'太阳附近的四颗行星主要由岩石与金属构成，体积较小、密度较高。对照地球和金星，可以发现“大小相近”并不代表大气、温度或宜居条件相似。切到内行星视图并加速，观察各自公转快慢。',
    sourceUrl:'https://science.nasa.gov/solar-system/planets/',bodyId:'earth',view:'inner',speed:86400,playing:true},
  {id:'gas-giants',title:'云层下的气体巨行星',eyebrow:'GAS GIANTS',
    description:'木星和土星主要由氢与氦组成，没有像地球那样的固体地表。',
    content:'我们看到的是大气中的云带。越向内部，压力和温度越高，物质状态也会变化。环与众多卫星让巨行星像小型天体系统；图鉴中的卫星资料可以帮助认识这一层结构。',
    sourceUrl:'https://science.nasa.gov/solar-system/planets/',bodyId:'jupiter',view:'follow',speed:3600,playing:true},
  {id:'ice-giants',title:'冰巨行星不是大冰球',eyebrow:'ICE GIANTS',
    description:'天王星与海王星的组成不同于木星、土星，“冰”主要指它们富含的物质类别。',
    content:'冰巨行星内部含有较多水、氨和甲烷等物质，并不是一颗能站上去的巨大冰球。外层仍有厚重大气。天王星的自转轴倾斜尤其明显，接近侧躺着绕太阳运行。',
    sourceUrl:'https://science.nasa.gov/uranus/facts/',bodyId:'uranus',view:'follow',speed:3600,playing:true},
  {id:'dwarf-planets',title:'矮行星也是完整的世界',eyebrow:'DWARF PLANETS',
    description:'谷神星、冥王星、妊神星、鸟神星和阋神星，拓展了八大行星之外的视野。',
    content:'矮行星绕太阳运行，自身引力使其接近圆整，但没有在轨道邻域占据主导地位；它们也不是卫星。分类描述的是天体的性质与轨道环境，不意味着地质或探索价值更低。',
    sourceUrl:'https://science.nasa.gov/dwarf-planets/',view:'overview',speed:1,playing:false},
  {id:'comets',title:'彗星如何长出尾巴',eyebrow:'COMETS',
    description:'彗核由冰、尘埃和岩石组成；靠近太阳时，释放的气体与尘埃形成彗发和彗尾。',
    content:'彗尾并非一直存在，也不是单纯拖在运动方向的后方。太阳辐射和太阳风推动气体、尘埃，使尾部总体背向太阳。67P 的近距离探测把这些小天体变成了可以研究地形与物质组成的世界。',
    sourceUrl:'https://science.nasa.gov/solar-system/comets/facts/',view:'overview',speed:1,playing:false},
  {id:'solar-regions',title:'行星之间与更远处',eyebrow:'REGIONS OF THE SOLAR SYSTEM',
    description:'小行星主带在火星与木星之间；柯伊伯带位于海王星之外。',
    content:'这些带状区域保存着行星形成时期留下的物质，天体之间相隔很远，不像密集的碎石墙。更远的奥尔特云是根据彗星等证据推测的巨大储库，尚无直接整体影像。场景里的带状粒子只表示分布范围。',
    sourceUrl:'https://science.nasa.gov/solar-system/solar-system-facts/',view:'overview',speed:1,playing:false},
];
