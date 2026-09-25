import {SOLAR_ECLIPSE_SOURCE} from './solarEclipse';
import {eclipseCase} from './eclipseCases';
import {LUNAR_ECLIPSE_SOURCE} from './lunarEclipse';
import {COORBITAL_SOURCE,isCoorbital} from './coorbital';
import {GANYMEDE_PERIOD,ORBIT_RESONANCE_SOURCE} from './tidalModule';
import {LOCK_SOURCE} from './spinOrbit';
import {SEASONS_SOURCE} from './seasons';
import {MEAN_PHASE_DAYS,MOON_PHASE_SOURCE} from './moonPhase';
import {bodyById} from './catalog';
import type {IntegratedTarget} from './integratedScene';
export const MOTION_LESSONS=[
 {id:'earth-spin',target:'body:earth',body:'earth',name:'地球自转',title:'地球自转：表面标记绕轴运动',text:'定位地球并跟随它。金色轴线与赤道参考圈帮助辨认自转，粉色参考标记固定在球体上。向前推进四分之一自转周期，观察标记朝向变化。',note:'恒星自转周期约 23 小时 56 分；日常平均太阳日约 24 小时。两者参照不同，不能直接画等号。',source:'https://science.nasa.gov/earth/facts/'},
 {id:'earth-orbit',target:'body:sun',body:'earth',name:'地球公转',title:'地球公转：固定太阳参照观察位置',text:'镜头改为以太阳为中心，保留地球与其参考轨道。每次推进 30 天，观察地球位置与运动方向。公转用真实历表，不用匀速圆周替代。',note:'轨道线是当期二体参考轨道，不是两年完整历表轨迹；箭头仅示方向。球体放大、日心距离压缩，不能用画面尺寸判断真实距离。',source:'https://science.nasa.gov/earth/facts/'},
 {id:'venus-spin',target:'body:venus',body:'venus',name:'金星逆向自转',title:'金星自转：与地球相反的参考转向',text:'定位金星，用相同参考标记观察缓慢逆行自转。图中采用已保存的带符号自转率；表面的云纹不代表固体表面，也不能用来测真实云层速度。',note:'一次恒星自转约 243 地球日，绕日约 225 日；从一次正午到下一次的太阳日约 117 日。“自转比一年长”不能解释成两次日出相隔 243 日。',source:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html'},
 {id:'moon-phase',target:'earth',body:'earth',name:'月相变化',title:'月相：空间位置与地球视角',text:'主画面沿用地月系统：金色箭头表示来自画面外太阳的光传播方向，青色虚线连接地球与月球。旁边的小圆面以地球中心为观察点，显示同一日期能看见的月球受照部分。',note:'月相主要来自观察方向与太阳照明方向的变化，不是地球影子逐渐遮住月球。月食才涉及地影；本课未计算遮挡，不能据此判断当天是否发生食。',source:MOON_PHASE_SOURCE},
 {id:'earth-seasons',target:'body:earth',body:'earth',name:'季节与地轴',title:'季节：地轴倾斜与南北半球受照',text:'跟随地球，比较地轴与黄道面法线。地轴在本课参考模型中保持空间方向；随地球公转，朝向太阳的一侧在南北半球间交替，昼长和正午太阳高度随日期变化。',note:'地轴不是每到夏季才倾斜。地球季节的主要成因是轴倾与公转共同改变受照条件，不是单看日地远近；南北半球同日季节相反。这里不模拟气温、降水或热量滞后。',source:SEASONS_SOURCE},
 {id:'tidal-cause',target:'earth',body:'earth',name:'锁定原理',title:'潮汐锁定原理：形变、耗散与力矩',text:'先理解机制，再观察当前月球案例。右侧三步原理图讲解引力差、形变响应和长期力矩；主画面仍是当前日期的地月系统，并非锁定形成过程的重演。',note:'这里是形成机制的定性说明，不是潮汐演化求解器。切换说明步骤不会改变真实日期、月球形状或现有轨道。',source:LOCK_SOURCE},
 {id:'moon-lock',target:'earth',body:'earth',name:'月球同步自转',title:'潮汐锁定：同一面朝地球也在自转',text:'沿用当前地月历表与月球姿态。观察月球旁的粉色本体参考箭头：它在空间中转向，同时大致指向地球。青色箭头保持固定空间方向，帮助分清绕地球运动与自身转动。',note:'同步自转是平均自转周期与平均公转周期相同，不是不自转，也不是月球一半永远黑暗。实际轨道速度与朝向有变化，地球上会看到天平动；本课未做高精度天平动计算。',source:LOCK_SOURCE},
 {id:'mercury-resonance',target:'body:sun',body:'mercury',name:'水星 3:2 共振',title:'水星共振：自转三圈，绕日两圈',text:'同时观察太阳、水星参考轨道和固定在水星上的粉色方向标记。绿色箭头只示绕日运动方向，粉色箭头随本体自转，两者含义不同。按课程起点后的一个、两个平均公转周期比较自转计数；太阳居中，实际水星位置继续读取历表。',note:'3:2 说的是相同时间内自转与公转的次数比，周期比反过来是 2:3。水星不是同一面始终朝太阳；恒星自转周期约 59 天，平均太阳日约 176 天，两者不能混用。',source:'https://science.nasa.gov/mercury/facts/'},
 {id:'jupiter-resonance',target:'jupiter',body:'earth',name:'木星卫星轨道共振',title:'轨道共振：木卫一、二、三约 4:2:1',text:'在同一主画面只保留木星及木卫一、木卫二、木卫三。播放当前日期的卫星历表，比较内侧与外侧卫星的运动；再用一个木卫三平均公转周期进行计数对照。',note:'这是不同卫星之间的轨道共振，不是卫星自身的自转—公转比。轨道按真实历表运行，不为展示整数比而改成匀速圆轨道。',source:ORBIT_RESONANCE_SOURCE},
 {id:'coorbital-sun',target:'body:sun',body:'earth',name:'准卫星 · 日心视角',title:'共轨与准卫星：先看它们都绕太阳',text:'蓝色地球与橙色 Kamoʻoalewa 沿同年历表轨迹运动，太阳固定在中心。先观察两者相近的绕日运行，再切换随地球公转的旋转视角。',note:'线为当年采样轨迹，不是实体环；球体是放大的定位符号，不表示真实大小比例。',source:COORBITAL_SOURCE},
 {id:'coorbital-earth',target:'body:sun',body:'earth',name:'准卫星 · 地心旋转视角',title:'共轨与准卫星：旋转参照系中的伴随路径',text:'地球设为原点，坐标轴随日地连线在黄道面上的投影旋转。橙色曲线是同一组历表换参照系后的路径；金色箭头指示黄道面投影的太阳方向，太阳在局部画面外。',note:'旋转参照系不是地面观测视角；环绕形态不等于受地球束缚的卫星轨道。日期与日心视角完全相同。',source:COORBITAL_SOURCE},
 {id:'lunar-eclipse',target:'body:sun',body:'earth',name:'2026 年 3 月月全食',title:'月食案例：月球穿过地球的本影与半影',text:'主画面切到月球所在距离的影区截面，用同日太阳、地球和月球位置计算。太阳和地球在截面之外；截面圆圈不是轨道或实体壳层。',note:'所有截面半径与偏移采用同一千米比例。可旋转检查，但默认正视最适合比较；月球暗化仅帮助辨认影区，不是实拍或亮度预测。',source:LUNAR_ECLIPSE_SOURCE},
 {id:'solar-eclipse',target:'body:sun',body:'earth',name:'2026 年 8 月日全食',title:'日食案例：月影落在地球球面上',text:'从月球一侧看地球参考球面，观察月影随日期移动。主画面保留球面曲率与真实比例的局部影区；太阳与月球在局部画面外，右侧顺序图解释三者关系。',note:'网格为形状参考，不是经纬线或地理全食带。阴影颜色为教学编码，不是实际亮度。日期驱动同刻历表，未计算地面城市可见性。',source:SOLAR_ECLIPSE_SOURCE},
] as const;
export type MotionLessonId=typeof MOTION_LESSONS[number]['id'];
export type MotionLesson=typeof MOTION_LESSONS[number];
export function motionLessonForView(id:MotionLessonId|null,target:IntegratedTarget|null){return MOTION_LESSONS.find(s=>s.id===id&&s.target===target)??null;}
export function spinPeriodSeconds(id:'earth'|'venus'|'mercury'){return 360/Math.abs(bodyById[id].rotationRateDegPerDay!)*86400;}
export function motionStepSeconds(id:MotionLessonId){return eclipseCase(id)?900:isCoorbital(id)?30*86400:id==='jupiter-resonance'?GANYMEDE_PERIOD/4:id==='moon-lock'?bodyById.moon.orbitalPeriodDays*86400/4:id==='mercury-resonance'?bodyById.mercury.orbitalPeriodDays*86400/2:id==='moon-phase'?3*86400:(id==='earth-orbit'||id==='earth-seasons')?30*86400:spinPeriodSeconds(id==='venus-spin'?'venus':'earth')/4;}
export function motionSeek(time:number,delta:number,start:number,end:number):number|null{const next=time+delta;return Number.isFinite(next)&&next>=start&&next<=end?next:null;}

// Observation seconds per wall-clock second; these never alter the physical rates.
export function motionPlaybackSpeed(id:MotionLessonId){return eclipseCase(id)?240:isCoorbital(id)?10*86400:id==='jupiter-resonance'?21600:id==='moon-lock'||id==='moon-phase'?86400:id==='mercury-resonance'?5*86400:id==='earth-spin'?3600:10*86400;}
export function motionCycleSeconds(id:MotionLessonId){return eclipseCase(id)?8*3600:isCoorbital(id)?365.25*86400:id==='jupiter-resonance'?GANYMEDE_PERIOD:id==='moon-lock'?bodyById.moon.orbitalPeriodDays*86400:id==='mercury-resonance'?2*bodyById.mercury.orbitalPeriodDays*86400:id==='moon-phase'?MEAN_PHASE_DAYS*86400:(id==='earth-orbit'||id==='earth-seasons')?bodyById.earth.orbitalPeriodDays*86400:spinPeriodSeconds(id==='venus-spin'?'venus':'earth');}
export function motionSpeedLabel(speed:number){return speed===1?'实时 · 1 秒/秒':speed>=60&&speed<3600?`${(speed/60).toLocaleString('zh-CN',{maximumFractionDigits:2})} 分钟/秒`:speed>=86400?`${(speed/86400).toLocaleString('zh-CN',{maximumFractionDigits:2})} 天/秒`:`${(speed/3600).toLocaleString('zh-CN',{maximumFractionDigits:2})} 小时/秒`;}
