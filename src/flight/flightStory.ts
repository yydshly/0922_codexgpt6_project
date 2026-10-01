import type { FlightState as LaunchState } from '../launch/liftoff';
import type { FlightInput, FlightState } from './flightPractice';
import type { ApproachResult } from './approachMission';
import type { Autopilot } from './autopilot';

export interface LaunchStoryRecord { time:number; altitudeKm:number; periapsisKm:number; apoapsisKm:number; coastSeconds:number }
export function launchStoryRecord(state:LaunchState):LaunchStoryRecord|null {
  const orbit=state.orbit;
  if(state.phase!=='orbit-complete'||!orbit?.targetHeld||orbit.elements.apoapsisM===null)return null;
  return {time:state.time,altitudeKm:(state.ascent?.altitudeM??state.heightM)/1000,periapsisKm:orbit.elements.periapsisM/1000,apoapsisKm:orbit.elements.apoapsisM/1000,coastSeconds:orbit.coastElapsedS};
}
export const STORY_CHAPTERS=['任务简报','发射与现象','驾驶交接','飞船巡视','任务报告'] as const;
export type LessonPhase='look'|'aim'|'power'|'coast'|'brake'|'ready'|'approach';
export interface PilotLesson { phase:LessonPhase; coastSeconds:number; aimedByHelper:boolean; brakeUsed:boolean; startedAt:number; completed:LessonPhase[] }
export interface PilotReport { approach:ApproachResult; totalTime:number; fuelUsed:number; helperUsed:boolean; phenomena:string[]; automaticSeconds:number; manualSeconds:number; takeovers:number }
export const LESSONS:Record<LessonPhase,{title:string;action:string;phenomenon:string}>= {
  look:{title:'01 · 环顾与认位',action:'拖动前窗，向侧边看一眼，再用「回正视线」回到船头。',phenomenon:'窗框和仪表属于同一艘三维飞船；环顾改变视线，不改变飞船姿态。'},
  aim:{title:'02 · 接手姿态控制',action:'用 A / D 转向、上下键俯仰，使船头偏角不超过 8°；也可使用辅助对准。',phenomenon:'蓝色标记是船头方向。转向决定下一次推力朝向，不会让已有速度立即跟着转。'},
  power:{title:'03 · 短促点火',action:'按住 W，使速率达到 0.6 m/s 后松开。不要持续加速。',phenomenon:'输入驱动操纵杆；推力建立后喷流出现、速度增加，推进剂开始减少。'},
  coast:{title:'04 · 松开后观察',action:'不推、不刹车，保持滑行 2 秒，比较速率和燃料。',phenomenon:'关闭主推进后，本局部模型仍保持滑行。若姿态喷口还在制转，仍会耗油；全部喷口关闭才不再消耗推进剂。'},
  brake:{title:'05 · 主动减速',action:'按住 B，把总速率降低到 0.15 m/s 以下。',phenomenon:'减速也需要推力和推进剂。B 使用本教学构型的多方向 RCS 喷口，逐渐抵消速度，不是瞬间停止。'},
  ready:{title:'操控检查完成',action:'现在从当前位置开始接近任务；位置、速度和燃料会接着使用。',phenomenon:'接近目标要同时管理方向、距离和速度；停稳后才能留下巡视记录。'},
  approach:{title:'06 · 接近并巡视',action:'跟随接近任务提示，在观察区停稳，然后提交巡视记录。',phenomenon:'教学卫星与旁边级段是独立实体；没有把随机碎片铺满近地空间。'},
};
export function createPilotLesson(time=0):PilotLesson {return {phase:'look',coastSeconds:0,aimedByHelper:false,brakeUsed:false,startedAt:time,completed:[]};}
/** Evidence comes from the live controller and physics clock, never from clicking Next. */
export function advancePilotLesson(lesson:PilotLesson,state:FlightState,input:FlightInput,dt:number,headAngle:number,bearing:number) {
  if(dt<=0||state.contact)return;
  const speed=state.velocity.length(),previous=lesson.phase;
  switch(lesson.phase){
    case 'look':if(headAngle>.12)lesson.phase='aim';break;
    case 'aim':if(bearing<=8)lesson.phase='power';break;
    case 'power':if(state.firing>0&&input.thrust>0&&speed>=.6)lesson.phase='coast';break;
    case 'coast':
      lesson.coastSeconds=state.firing<.001&&!input.brake&&speed>=.3?lesson.coastSeconds+dt:0;
      if(lesson.coastSeconds>=2){lesson.coastSeconds=2;lesson.phase='brake';}break;
    case 'brake':
      if(input.brake&&state.firing>0)lesson.brakeUsed=true;
      if(lesson.brakeUsed&&speed<=.15)lesson.phase='ready';break;
  }
  if(lesson.phase!==previous&&!lesson.completed.includes(previous))lesson.completed.push(previous);
}

export function createPilotReport(lesson:PilotLesson,approach:ApproachResult,time:number,fuel:number,pilot:Autopilot):PilotReport {
  const evidence:Partial<Record<LessonPhase,string>>={look:'亲自环顾并辨认驾驶方向',aim:lesson.aimedByHelper?'使用辅助对准完成姿态检查':'亲自对准完成姿态检查',power:'手动点火并消耗推进剂',coast:'手动训练中松开推进，连续滑行 2 秒',brake:'手动使用反向推力主动减速'};
  return {approach,totalTime:time-lesson.startedAt,fuelUsed:100-fuel,helperUsed:lesson.aimedByHelper||approach.assistedAimCount>0,
    automaticSeconds:pilot.automaticSeconds,manualSeconds:pilot.manualSeconds,takeovers:pilot.takeovers,
    phenomena:[...lesson.completed.flatMap(phase=>evidence[phase]?[evidence[phase]!]:[]),
      ...(pilot.automaticSeconds>0?['使用过自动驾驶；自动控制时长单独记录，未完成的手动检查不记为通过']:[]),
      '由实际运动验证：在观察区停稳保持 5 秒']};
}
