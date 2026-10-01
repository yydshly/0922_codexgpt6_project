import type {CrewSnapshot} from './crewMission';
import {CREW_PILOT_FLIGHT_PHASES,CREW_PILOT_RCS_PHASES,CREW_PILOT_THROTTLE_PHASES} from './crewPilotControl';

/** Equipment availability only. Playing/ownership/checkpoint gates belong to the UI. */
export function crewPilotInputAvailability(s:CrewSnapshot){
  const flight=CREW_PILOT_FLIGHT_PHASES.includes(s.phase),carrier=s.carrierStage!=='none';
  const attitude=flight&&(carrier?Math.hypot(...s.thrust)>1:s.serviceAttached?s.serviceFuelKg>0:s.capsuleRcsFuelKg>0);
  const attitudeReason=!flight?'当前阶段不接受驾驶输入。':carrier
    ?attitude?'火箭通过当前发动机的推力矢量转姿。':'火箭当前无推力，不能通过推力矢量转姿；有点火授权和推进剂时，可先增大油门。'
    :s.serviceAttached
      ?attitude?'服务舱姿态喷口可用。':'服务舱推进剂已耗尽，主动转姿与平移不可用。'
      :attitude?'返回舱独立姿态喷口可用。':'返回舱姿态推进剂已耗尽；气动与伞恢复力矩仍参与运动。';
  const engineFuel=carrier?s.launchFuelKg:s.phase==='landing'?s.landingFuelKg:s.serviceFuelKg;
  const throttle=flight&&CREW_PILOT_THROTTLE_PHASES.includes(s.phase)&&s.pilot.engineEnabled&&engineFuel>0;
  const rcs=flight&&CREW_PILOT_RCS_PHASES.includes(s.phase)&&s.serviceAttached&&s.serviceFuelKg>0;
  return {flight,attitude,attitudeReason,throttle,rcs};
}

export function crewPilotKeyAvailable(s:CrewSnapshot,code:string){
  const available=crewPilotInputAvailability(s);
  if(code==='KeyW'||code==='KeyS')return available.throttle||available.rcs;
  if(code==='KeyB')return available.rcs;
  if(['KeyA','KeyD','ArrowUp','ArrowDown','KeyQ','KeyE'].includes(code))return available.attitude;
  return false;
}
