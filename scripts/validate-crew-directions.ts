import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {createCrewMission} from '../src/flight/crewMission';
import {crewDirections} from '../src/flight/crewDirections';
const mission=createCrewMission(),samples:unknown[]=[],seen=new Set<string>();mission.start();
let maxLaunchThrustAngleDeg=0,maxDeorbitThrustAngleDeg=0,minDeorbitThrustVelocityDeg=180,maxAtmosphericShieldAngleDeg=0,maxLandingThrustAngleDeg=0;
while(!['complete','failed'].includes(mission.phase)&&mission.time<=24001){
  mission.step();const s=mission.snapshot(),d=crewDirections(s),thrust=d.inertialVelocity.clone().set(...s.thrust),thrustAngle=thrust.length()>100?d.forward.angleTo(thrust)*180/Math.PI:null;
  if(s.phase==='ascent'&&thrustAngle!==null)maxLaunchThrustAngleDeg=Math.max(maxLaunchThrustAngleDeg,thrustAngle);
  if(s.phase==='deorbit'&&thrustAngle!==null){maxDeorbitThrustAngleDeg=Math.max(maxDeorbitThrustAngleDeg,thrustAngle);minDeorbitThrustVelocityDeg=Math.min(minDeorbitThrustVelocityDeg,d.thrustVelocityDeg!);}
  if(s.phase==='entry'&&s.density>1e-7)maxAtmosphericShieldAngleDeg=Math.max(maxAtmosphericShieldAngleDeg,d.heatShieldAirDeg!);
  if(s.phase==='landing'&&thrustAngle!==null)maxLandingThrustAngleDeg=Math.max(maxLandingThrustAngleDeg,thrustAngle);
  const key=s.phase==='deorbit'&&s.mainFraction>0?'deorbit-burning':s.phase==='entry'&&s.altitudeM<80000?'atmospheric-entry':s.phase;
  if(!seen.has(key)){seen.add(key);samples.push({phase:s.phase,key,timeSeconds:s.time,altitudeM:s.altitudeM,forwardVelocityDeg:d.forwardVelocityDeg,thrustVelocityDeg:d.thrustVelocityDeg,heatShieldAirDeg:d.heatShieldAirDeg});}
}
const s=mission.snapshot(),result={phase:s.phase,timeSeconds:s.time,inspection:s.inspection,touchdownSpeedMS:s.touchdownSpeedMS,touchdownHorizontalMS:s.touchdownHorizontalMS,serviceFuelKg:s.serviceFuelKg,capsuleRcsFuelKg:s.capsuleRcsFuelKg,serviceAttached:s.serviceAttached,landingFuelKg:s.landingFuelKg,peakProperG:s.peakG,altitudeM:s.altitudeM};
const reference=JSON.parse(readFileSync('docs/qa/crewed-logic-2026-10-01/nominal-result.json','utf8'));
const report={scope:'原创教学模型的方向与回归检查；非实飞或工程认证。',fixedStepSeconds:.1,
  anglesDeg:{maxLaunchThrustAngleDeg,maxDeorbitThrustAngleDeg,minDeorbitThrustVelocityDeg,maxAtmosphericShieldAngleDeg,maxLandingThrustAngleDeg},
  matchesCurrentNominalResult:isDeepStrictEqual(result,reference.result),result,samples};
const folder='docs/qa/crewed-logic-2026-10-01';mkdirSync(folder,{recursive:true});writeFileSync(`${folder}/direction-checks.json`,JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify({anglesDeg:report.anglesDeg,matchesCurrentNominalResult:report.matchesCurrentNominalResult,result},null,2));
if(s.phase!=='complete'||!report.matchesCurrentNominalResult||maxLaunchThrustAngleDeg>.1||maxDeorbitThrustAngleDeg>.1||minDeorbitThrustVelocityDeg<178||maxAtmosphericShieldAngleDeg>5||maxLandingThrustAngleDeg>.1)process.exitCode=1;
