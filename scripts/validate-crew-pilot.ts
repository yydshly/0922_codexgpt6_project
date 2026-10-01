import {mkdirSync,writeFileSync} from 'node:fs';
import {createCrewMission,type CrewPhase} from '../src/flight/crewMission';
import type {CrewPilotAction} from '../src/flight/crewPilotControl';

const out='docs/qa/crew-pilot-mode-2026-10-01',fixtures='.cache/crew-pilot-fixtures';
mkdirSync(out,{recursive:true});mkdirSync(fixtures,{recursive:true});
const mission=createCrewMission(),actions:{action:string;phase:string;time:number}[]=[],seen=new Set<string>();
const capture=(name:string)=>{if(seen.has(name))return;seen.add(name);writeFileSync(`${fixtures}/${name}.json`,JSON.stringify(mission.save()),'utf8');};
mission.startPilot();capture('checkpoint-ignite');
let lastPhase: CrewPhase='ground';
for(let steps=0;steps<260000&&!['complete','failed'].includes(mission.phase);steps++){
  if(mission.phase==='countdown'&&mission.time>=-.4&&mission.time<-1e-8)capture('countdown-before-release');
  if(steps%10===0||mission.phase!==lastPhase){
    const state=mission.snapshot();
    if(state.phase!==lastPhase){lastPhase=state.phase;capture(`phase-${state.phase}`);}
    if(state.pilot.pendingAction){
      const action=state.pilot.pendingAction,available=state.pilot.actions.find(a=>a.action===action);
      capture(`checkpoint-${action}`);
      if(available?.allowed){
        const before=mission.snapshot();
        if(!mission.pilotAction(action))throw Error(`Ready action rejected: ${action}`);
        actions.push({action,phase:before.phase,time:before.time});
      }else if(action!=='recover')throw Error(`Checkpoint deadlock: ${action}: ${available?.reason}`);
    }else if(state.phase==='observe'&&state.distanceM>=30&&state.distanceM<=100&&state.relativeSpeedMS<=.15&&state.pointingDeg<=6){
      capture('observation-ready');if(!mission.observe())throw Error('Actual observation rejected');
      actions.push({action:'record-observation',phase:state.phase,time:state.time});
    }
  }
  mission.step();
}
capture('result');
const result=mission.snapshot(),required: CrewPilotAction[]=['ignite','release','separate-booster','ignite-upper','separate-ship','begin-deorbit','separate-service','open-drogue','open-main','enable-landing','recover'];
const missing=required.filter(action=>!actions.some(a=>a.action===action));
const report={scope:'自主教学任务实际积分；每次授权沿用原状态，无位置、速度、姿态或燃料重置。',physicsStepSeconds:.1,route:'self-directed',control:'assisted',actions,missingActions:missing,result:{phase:result.phase,time:result.time,inspection:result.inspection,touchdownSpeedMS:result.touchdownSpeedMS,touchdownHorizontalMS:result.touchdownHorizontalMS,touchdownTiltDeg:result.touchdownTiltDeg,landingFuelKg:result.landingFuelKg,capsuleRcsFuelKg:result.capsuleRcsFuelKg,peakG:result.peakG,recoveryChecksPassed:result.recoveryChecks.every(check=>check.passed)},events:result.events};
writeFileSync(`${out}/assisted-flight.json`,JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify(report.result,null,2));console.log(`Authorized ${actions.length} actions, generated ${seen.size} real-state fixtures.`);
if(result.phase!=='complete'||missing.length)throw Error(`Autonomous route incomplete: ${result.phase}: ${result.message}; missing=${missing}`);

// Real pad departure with the pilot cutting thrust: first carrier contact must stop
// while the ship reference remains above ground, without a scripted position reset.
const lost=createCrewMission();lost.startPilot();lost.pilotAction('ignite');
for(let i=0;i<200&&lost.awaitingPilotAction!=='release';i++)lost.step();
if(!lost.pilotAction('release'))throw Error('Failure scenario cannot release');
lost.takeOver();lost.setPilotThrottle(0);
for(let i=0;i<1000&&lost.phase!=='failed';i++)lost.step();
const failed=lost.snapshot();
if(failed.phase!=='failed'||failed.altitudeM<60||Math.abs(failed.lowestPointClearanceM)>.001)throw Error(`Carrier contact did not stop at its actual envelope: ${failed.phase}, reference=${failed.altitudeM}, clearance=${failed.lowestPointClearanceM}`);
writeFileSync(`${fixtures}/failed-carrier.json`,JSON.stringify(lost.save()),'utf8');
writeFileSync(`${out}/carrier-contact-failure.json`,JSON.stringify({phase:failed.phase,time:failed.time,referenceAltitudeM:failed.altitudeM,bodyClearanceM:failed.lowestPointClearanceM,velocity:failed.velocity,attitude:failed.attitude,carrierStage:failed.carrierStage,message:failed.message},null,2)+'\n','utf8');
console.log(`Carrier failure retained reference ${failed.altitudeM.toFixed(3)} m, body clearance ${failed.lowestPointClearanceM.toFixed(6)} m.`);
