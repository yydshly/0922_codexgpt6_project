import {writeFileSync,mkdirSync} from 'node:fs';
import {createCrewMission,CREW_VEHICLE} from '../src/flight/crewMission';
const mission=createCrewMission(),stages:unknown[]=[];mission.start();let previous='';
while(!['complete','failed'].includes(mission.phase)&&mission.time<=24001){
  if(mission.phase!==previous){previous=mission.phase;const s=mission.snapshot();stages.push({phase:s.phase,timeSeconds:s.time,altitudeM:s.altitudeM,orbitalSpeedMS:s.orbitalSpeedMS,relativeSpeedMS:s.relativeSpeedMS,massKg:s.massKg,serviceFuelKg:s.serviceFuelKg,capsuleRcsFuelKg:s.capsuleRcsFuelKg,landingFuelKg:s.landingFuelKg});}
  mission.step();
}
const s=mission.snapshot(),report={scope:'原创载人教学任务；计算值，非实测或实飞认证。',stepSeconds:.1,vehicle:CREW_VEHICLE,stages,result:{phase:s.phase,timeSeconds:s.time,inspection:s.inspection,touchdownSpeedMS:s.touchdownSpeedMS,touchdownHorizontalMS:s.touchdownHorizontalMS,serviceFuelKg:s.serviceFuelKg,capsuleRcsFuelKg:s.capsuleRcsFuelKg,serviceAttached:s.serviceAttached,landingFuelKg:s.landingFuelKg,peakProperG:s.peakG,altitudeM:s.altitudeM},events:s.events};
mkdirSync('docs/qa/crewed-logic-2026-10-01',{recursive:true});writeFileSync('docs/qa/crewed-logic-2026-10-01/nominal-result.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify(report.result,null,2));if(s.phase!=='complete')process.exitCode=1;
