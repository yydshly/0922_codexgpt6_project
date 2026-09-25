import type {PhenomenonParts} from './phenomenonParts';
export const SOLAR_PART_IDS=['chromosphere','transition','corona','sunspots','prominence','flare','cme'] as const;
export const SOLAR_LESSONS=[
 {id:'surface',title:'1 · 光球',color:'#ffd58b',text:'通常所说的太阳表面，是可见光主要逃逸的光球；不是固体地壳。此处橙黄色静态纹理用于识别太阳，不是当天白光照片。'},
 {id:'chromosphere',title:'2 · 色球',color:'#ff7c6f',text:'光球上方较稀薄的大气。特定谱线能显示其结构；画面红色薄层用来辨别位置，不代表肉眼总能看到这一圈。'},
 {id:'transition',title:'3 · 过渡区',color:'#c5a8ff',text:'色球与日冕之间温度急剧变化的薄而不规则区域。紫色边缘是教学定位，不是均匀硬壳，也没有固定的全球高度。'},
 {id:'corona',title:'4 · 日冕',color:'#ffe9bd',text:'更外层、稀薄而高温的太阳大气，向外延伸并与太阳风相连。淡光只示意层次，外沿不是日冕的真实边界。'},
 {id:'features',title:'5 · 黑子与日珥',color:'#ffb08a',text:'黑子是光球中较冷、较暗的磁活动区域，不是洞。日珥是磁场支撑的较冷、较密等离子体结构，拱环只示意其一种形态；与耀斑、CME 分别理解。'},
] as const;
export type SolarLesson=typeof SOLAR_LESSONS[number]['id'];
/** A lesson only changes the solar display; no ephemeris or other environment is modified. */
export function solarLessonParts(current:PhenomenonParts,lesson:SolarLesson):PhenomenonParts {
 const next={...current};for(const id of SOLAR_PART_IDS)next[id]=false;
 const n=SOLAR_LESSONS.findIndex(s=>s.id===lesson);
 if(n>=1)next.chromosphere=true;if(n>=2)next.transition=true;if(n>=3)next.corona=true;
 if(lesson==='features'){next.sunspots=true;next.prominence=true;}
 return next;
}
export function matchesSolarLesson(parts:PhenomenonParts,lesson:SolarLesson){const preset=solarLessonParts(parts,lesson);return SOLAR_PART_IDS.every(id=>preset[id]===parts[id]);}
export const SOLAR_LAYER_SOURCES=[
 {title:'NASA · 太阳分层与过渡区',url:'https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/'},
 {title:'NASA · 黑子为何较暗',url:'https://science.nasa.gov/sun/sunspots/'},
 {title:'NASA · 日珥是什么',url:'https://www.nasa.gov/image-article/what-solar-prominence/'},
 {title:'NASA · 耀斑与 CME 的区别',url:'https://science.nasa.gov/blogs/solar-cycle-25/2022/06/10/solar-flares-faqs/'},
];
