import type {CrewPhase,CrewSnapshot} from './crewMission';

/** Task authorization is independent of the attitude/thrust flight controller. */
export type CrewPilotAction='ignite'|'release'|'separate-booster'|'ignite-upper'|'separate-ship'|'begin-deorbit'|'separate-service'|'open-drogue'|'open-main'|'enable-landing'|'recover';
export interface CrewPilotActionStatus {action:CrewPilotAction;label:string;allowed:boolean;reason:string}
export interface CrewPilotState {active:boolean;throttle:number;pendingAction:CrewPilotAction|null;engineLit:boolean;engineEnabled:boolean;actions:CrewPilotActionStatus[]}
export const CREW_PILOT_FLIGHT_PHASES:readonly CrewPhase[]=['ascent','upper','insertion','approach','observe','return-ready','deorbit','return-coast','entry','drogue','main-chute','landing'];
export const CREW_PILOT_THROTTLE_PHASES:readonly CrewPhase[]=['ascent','upper','insertion','deorbit','landing'];
export const CREW_PILOT_RCS_PHASES:readonly CrewPhase[]=['approach','observe','return-ready'];
export const CREW_PILOT_ACTION_LABELS:Record<CrewPilotAction,string>={
  ignite:'授权点火与倒计时',release:'释放发射台约束',
  'separate-booster':'分离燃尽的一级','ignite-upper':'点火二级',
  'separate-ship':'确认轨道并分离飞船','begin-deorbit':'授权离轨点火',
  'separate-service':'分离服务舱','open-drogue':'展开减速伞','open-main':'展开主伞',
  'enable-landing':'授权近地软着陆推进','recover':'检查并发送回收信号',
};
export const CREW_PILOT_ACTIONS=Object.keys(CREW_PILOT_ACTION_LABELS) as CrewPilotAction[];

/** Shared by the recorder and its UI; pausing does not invalidate a satisfied window. */
export function crewObservationReady(s:Pick<CrewSnapshot,'phase'|'distanceM'|'relativeSpeedMS'|'pointingDeg'>){
  return s.phase==='observe'&&s.distanceM>=30&&s.distanceM<=100&&s.relativeSpeedMS<=.15&&s.pointingDeg<=6;
}
