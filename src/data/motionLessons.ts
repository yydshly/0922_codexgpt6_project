import {MEAN_PHASE_DAYS,MOON_PHASE_SOURCE} from './moonPhase';
import {bodyById} from './catalog';
import type {IntegratedTarget} from './integratedScene';
export const MOTION_LESSONS=[
 {id:'earth-spin',target:'body:earth',body:'earth',name:'地球自转',title:'地球自转：表面标记绕轴运动',text:'定位地球并跟随它。金色轴线与赤道参考圈帮助辨认自转，粉色参考标记固定在球体上。向前推进四分之一自转周期，观察标记朝向变化。',note:'恒星自转周期约 23 小时 56 分；日常平均太阳日约 24 小时。两者参照不同，不能直接画等号。',source:'https://science.nasa.gov/earth/facts/'},
 {id:'earth-orbit',target:'body:sun',body:'earth',name:'地球公转',title:'地球公转：固定太阳参照观察位置',text:'镜头改为以太阳为中心，保留地球与其参考轨道。每次推进 30 天，观察地球位置与运动方向。公转用真实历表，不用匀速圆周替代。',note:'轨道线是当期二体参考轨道，不是两年完整历表轨迹；箭头仅示方向。球体放大、日心距离压缩，不能用画面尺寸判断真实距离。',source:'https://science.nasa.gov/earth/facts/'},
 {id:'venus-spin',target:'body:venus',body:'venus',name:'金星逆向自转',title:'金星自转：与地球相反的参考转向',text:'定位金星，用相同参考标记观察缓慢逆行自转。图中采用已保存的带符号自转率；表面的云纹不代表固体表面，也不能用来测真实云层速度。',note:'一次恒星自转约 243 地球日，绕日约 225 日；从一次正午到下一次的太阳日约 117 日。“自转比一年长”不能解释成两次日出相隔 243 日。',source:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html'},
 {id:'moon-phase',target:'earth',body:'earth',name:'月相变化',title:'月相：空间位置与地球视角',text:'主画面沿用地月系统：金色箭头表示来自画面外太阳的光传播方向，青色虚线连接地球与月球。旁边的小圆面以地球中心为观察点，显示同一日期能看见的月球受照部分。',note:'月相主要来自观察方向与太阳照明方向的变化，不是地球影子逐渐遮住月球。月食才涉及地影；本课未计算遮挡，不能据此判断当天是否发生食。',source:MOON_PHASE_SOURCE},
] as const;
export type MotionLessonId=typeof MOTION_LESSONS[number]['id'];
export type MotionLesson=typeof MOTION_LESSONS[number];
export function motionLessonForView(id:MotionLessonId|null,target:IntegratedTarget|null){return MOTION_LESSONS.find(s=>s.id===id&&s.target===target)??null;}
export function spinPeriodSeconds(id:'earth'|'venus'){return 360/Math.abs(bodyById[id].rotationRateDegPerDay!)*86400;}
export function motionStepSeconds(id:MotionLessonId){return id==='moon-phase'?3*86400:id==='earth-orbit'?30*86400:spinPeriodSeconds(id==='venus-spin'?'venus':'earth')/4;}
export function motionSeek(time:number,delta:number,start:number,end:number):number|null{const next=time+delta;return Number.isFinite(next)&&next>=start&&next<=end?next:null;}

// Observation seconds per wall-clock second; these never alter the physical rates.
export function motionPlaybackSpeed(id:MotionLessonId){return id==='moon-phase'?86400:id==='earth-spin'?3600:10*86400;}
export function motionCycleSeconds(id:MotionLessonId){return id==='moon-phase'?MEAN_PHASE_DAYS*86400:id==='earth-orbit'?bodyById.earth.orbitalPeriodDays*86400:spinPeriodSeconds(id==='venus-spin'?'venus':'earth');}
export function motionSpeedLabel(speed:number){return speed===1?'实时 · 1 秒/秒':speed>=86400?`${(speed/86400).toLocaleString('zh-CN',{maximumFractionDigits:2})} 天/秒`:`${(speed/3600).toLocaleString('zh-CN',{maximumFractionDigits:2})} 小时/秒`;}
