import {mkdirSync,writeFileSync} from 'node:fs';
import {Quaternion,Vector3} from 'three';
import {createCrewMission,CREW_VEHICLE} from '../src/flight/crewMission';
import {crewDirections} from '../src/flight/crewDirections';
const folder='docs/qa/crewed-logic-2026-10-01',fixtures='.cache/crewed-return-fixtures';mkdirSync(folder,{recursive:true});mkdirSync(fixtures,{recursive:true});
const m=createCrewMission();m.start();let prev=m.snapshot(),maxBodyStepDeg=0,maxAccelerationRadS2=0,maxThrustNoseDeg=0,maxEntryShieldDeg=0,capsuleJetSteps=0;
const phases:Record<string,{maxBodyStepDeg:number;maxAngularSpeedRadS:number}>={},boundaries:unknown[]=[];let coastFixture=false,insertionFixture=false;
while(!['complete','failed'].includes(m.phase)){
 m.step();const s=m.snapshot(),d=crewDirections(s),bodyAngle=new Quaternion(...prev.attitude).angleTo(new Quaternion(...s.attitude))*180/Math.PI,w=new Vector3(...s.angularVelocity),thrust=new Vector3(...s.thrust);
 maxBodyStepDeg=Math.max(maxBodyStepDeg,bodyAngle);maxAccelerationRadS2=Math.max(maxAccelerationRadS2,w.clone().sub(new Vector3(...prev.angularVelocity)).length()/.1);
 const record=phases[s.phase]??={maxBodyStepDeg:0,maxAngularSpeedRadS:0};record.maxBodyStepDeg=Math.max(record.maxBodyStepDeg,bodyAngle);record.maxAngularSpeedRadS=Math.max(record.maxAngularSpeedRadS,w.length());
 if(thrust.length()>100&&['ascent','upper','insertion','deorbit','landing'].includes(s.phase))maxThrustNoseDeg=Math.max(maxThrustNoseDeg,d.forward.angleTo(thrust)*180/Math.PI);
 if(s.phase==='entry')maxEntryShieldDeg=Math.max(maxEntryShieldDeg,d.heatShieldAirDeg??0);
 if(s.phase!==prev.phase)boundaries.push({from:prev.phase,to:s.phase,time:s.time,altitudeM:s.altitudeM,bodyStepDeg:bodyAngle});
 if(s.phase==='return-coast'&&new Vector3(...s.attitudeEffort).length()>.05){capsuleJetSteps++;if(!coastFixture&&s.time-(s.events.find(e=>e.phase==='return-coast')?.time??0)>1){writeFileSync(`${fixtures}/return-coast.json`,JSON.stringify(m.save()),'utf8');coastFixture=true;}}
 if(s.phase==='insertion'&&!insertionFixture&&w.length()>.08){writeFileSync(`${fixtures}/insertion.json`,JSON.stringify(m.save()),'utf8');insertionFixture=true;}
 prev=s;
}
const report={scope:'当前 crew-earth-3 教学模型全程姿态连续性；不等于实飞验证。姿态与实际推力共用船体轴。',vehicleVersion:CREW_VEHICLE.version,fixedStepSeconds:.1,phase:m.phase,maxBodyStepDeg,maxAccelerationRadS2,maxThrustNoseDeg,maxEntryShieldDeg,capsuleJetSteps,phases,boundaries,capsuleRcsFuelRemainingKg:m.capsuleRcsFuel};
writeFileSync(`${folder}/attitude-checks.json`,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));
if(m.phase!=='complete'||maxBodyStepDeg>.69||maxAccelerationRadS2>.06000001||maxThrustNoseDeg>.01||maxEntryShieldDeg>5||capsuleJetSteps<10||!coastFixture||!insertionFixture||m.capsuleRcsFuel<=0)process.exitCode=1;
