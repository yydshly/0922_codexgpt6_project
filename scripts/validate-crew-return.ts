import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {Quaternion,Vector3} from 'three';
import {createCrewMission} from '../src/flight/crewMission';
import {crewDirections,crewForceBalance} from '../src/flight/crewDirections';
import {crewReturnFrame} from '../src/flight/crewReturnVisuals';
import {surfaceAt} from '../src/launch/ascent';
import {crewContactFrame} from '../src/flight/crewContact';
const out='docs/qa/crewed-logic-2026-10-01',fixtures='.cache/crewed-return-fixtures';mkdirSync(out,{recursive:true});mkdirSync(fixtures,{recursive:true});
const m=createCrewMission();m.start();const seen=new Set<string>(),samples:unknown[]=[];
let maxFootClearanceM=0,maxParachuteAreaErrorM2=0,maxDragAirAngleErrorDeg=0,maxChuteAirAngleErrorDeg=0;
while(!['complete','failed'].includes(m.phase)){
  m.step();const s=m.snapshot(),d=crewDirections(s),frame=crewReturnFrame(s),q=new Quaternion(...s.attitude),up=new Vector3(...surfaceAt(s.position).up);
  if(['touchdown','complete'].includes(s.phase))maxFootClearanceM=Math.max(maxFootClearanceM,Math.abs(crewContactFrame(s.position,q,true,frame.footBottoms).footClearanceM));
  maxParachuteAreaErrorM2=Math.max(maxParachuteAreaErrorM2,Math.abs(frame.canopies.reduce((sum,c)=>sum+Math.PI*c.radiusM**2,0)-s.chuteAreaM2));
  if(['entry','drogue','main-chute','landing'].includes(s.phase)&&d.airRelativeVelocity.length()>.05){
    for(const [name,f] of [['drag',s.drag],['chute',s.chuteForce]] as const){const force=new Vector3(...f);if(force.length()>1){const error=180-force.angleTo(d.airRelativeVelocity)*180/Math.PI;if(name==='drag')maxDragAirAngleErrorDeg=Math.max(maxDragAirAngleErrorDeg,error);else maxChuteAirAngleErrorDeg=Math.max(maxChuteAirAngleErrorDeg,error);}}
  }
  const key=s.phase==='entry'&&s.altitudeM<50000?'entry':s.phase==='drogue'&&s.drogueFraction===1?'drogue':s.phase==='main-chute'&&s.altitudeM<500?'main-chute':s.phase==='landing'&&s.altitudeM<7?'landing':s.phase==='touchdown'?'touchdown':s.phase==='complete'?'complete':null;
  if(key&&!seen.has(key)){seen.add(key);writeFileSync(`${fixtures}/${key}.json`,JSON.stringify(m.save()),'utf8');samples.push({key,time:s.time,altitudeM:s.altitudeM,verticalMS:s.verticalMS,chuteAreaM2:s.chuteAreaM2,heatShieldAirDeg:d.heatShieldAirDeg,thrustAirDeg:d.thrustAirDeg,verticalNetForceN:crewForceBalance(s).verticalN});}
}
const s=m.snapshot(),result={phase:s.phase,timeSeconds:s.time,inspection:s.inspection,touchdownSpeedMS:s.touchdownSpeedMS,touchdownHorizontalMS:s.touchdownHorizontalMS,serviceFuelKg:s.serviceFuelKg,capsuleRcsFuelKg:s.capsuleRcsFuelKg,serviceAttached:s.serviceAttached,landingFuelKg:s.landingFuelKg,peakProperG:s.peakG,altitudeM:s.altitudeM};
const reference=JSON.parse(readFileSync('docs/qa/crewed-logic-2026-10-01/nominal-result.json','utf8'));
const report={scope:'原创教学模型的返回几何/方向检查，数值不等于实飞验证。浏览器夹具来自该完整积分，不是伪造的任意阶段。',fixedStepSeconds:.1,matchesCurrentNominalResult:isDeepStrictEqual(result,reference.result),maxFootClearanceM,maxParachuteAreaErrorM2,maxDragAirAngleErrorDeg,maxChuteAirAngleErrorDeg,result,samples};
writeFileSync(`${out}/return-checks.json`,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));
if(s.phase!=='complete'||!report.matchesCurrentNominalResult||maxFootClearanceM>1e-5||maxParachuteAreaErrorM2>1e-6||maxDragAirAngleErrorDeg>.2||maxChuteAirAngleErrorDeg>.2)process.exitCode=1;
