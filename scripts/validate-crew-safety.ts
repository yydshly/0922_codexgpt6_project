import {mkdirSync,writeFileSync} from 'node:fs';
import {Quaternion,Vector3} from 'three';
import {createCrewMission,CrewMission,CREW_VEHICLE,type CrewPhase} from '../src/flight/crewMission';
import {crewContactFrame} from '../src/flight/crewContact';
import {airVelocity,surfaceAt,type V3} from '../src/launch/ascent';
const folder='docs/qa/crewed-logic-2026-10-01',fixtures='.cache/crewed-return-fixtures';mkdirSync(folder,{recursive:true});mkdirSync(fixtures,{recursive:true});
const saves=new Map<CrewPhase,ReturnType<CrewMission['save']>>(),m=createCrewMission();m.start();const boundaries:unknown[]=[];
while(!['complete','failed'].includes(m.phase)&&m.time<24001){
 const old=m.snapshot();m.step();const s=m.snapshot();
 if(!saves.has(s.phase)&&(['upper','insertion','landing'].includes(s.phase)||s.phase==='touchdown'&&s.recoveryReady))saves.set(s.phase,m.save());
 if(old.phase!==s.phase)boundaries.push({from:old.phase,to:s.phase,clock:s.time,event:s.events.at(-1)?.time,clearanceM:s.lowestPointClearanceM});
}
if(m.phase!=='complete')throw Error(m.message);saves.set('complete',m.save());
const restored=(phase:CrewPhase)=>CrewMission.restore(structuredClone(saves.get(phase)!));
const coast=restored('upper');let maxCoastTorqueNm=0,maxCoastThrustN=0;const w=coast.angularVelocity.clone();
writeFileSync(`${fixtures}/upper-coast.json`,JSON.stringify(coast.save()),'utf8');
for(let i=0;i<30;i++){coast.step();const s=coast.snapshot();maxCoastTorqueNm=Math.max(maxCoastTorqueNm,Math.hypot(...s.attitudeTorqueNm));maxCoastThrustN=Math.max(maxCoastThrustN,Math.hypot(...s.thrust));}
const faults:unknown[]=[],checks:{name:string;passed:boolean}[]=[];
checks.push({name:'3 s unpowered carrier has zero TVC torque and inherits angular velocity',passed:maxCoastTorqueNm===0&&maxCoastThrustN===0&&coast.angularVelocity.distanceTo(w)===0});
for(const spec of [{name:'60deg-tilt',tilt:60,v:1,h:0,rate:0},{name:'inverted-hull',tilt:180,v:1,h:0,rate:0},{name:'vertical-impact',tilt:0,v:4,h:0,rate:0},{name:'horizontal-impact',tilt:0,v:1,h:6,rate:0},{name:'spinning-contact',tilt:0,v:1,h:0,rate:.2}]){
 const f=restored('landing');f.fullDemo=false;const local=surfaceAt(f.position),up=new Vector3(...local.up),east=new Vector3(...local.east);
 f.attitude.setFromUnitVectors(new Vector3(0,0,-1),up).premultiply(new Quaternion().setFromAxisAngle(east,spec.tilt*Math.PI/180));f.angularVelocity.set(spec.rate,0,0);f.capsuleRcsFuel=0;
 const frame=crewContactFrame(f.position,f.attitude,true);f.position=new Vector3(...f.position).addScaledVector(up,.01-frame.clearanceM).toArray() as V3;
 f.velocity=new Vector3(...airVelocity(f.position)).addScaledVector(up,-spec.v).addScaledVector(east,spec.h).toArray() as V3;f.step();const s=f.snapshot();
 faults.push({name:spec.name,phase:s.phase,reason:s.message,altitudeM:s.altitudeM,clearanceM:s.lowestPointClearanceM,tiltDeg:s.touchdownTiltDeg,angularRateDegS:s.touchdownAngularRateDegS,verticalMS:s.touchdownSpeedMS,horizontalMS:s.touchdownHorizontalMS});
 checks.push({name:`${spec.name}: fails at first contact without recording completion`,passed:s.phase==='failed'&&!s.recoveryReady&&Math.abs(s.lowestPointClearanceM)<1e-5});
 if(spec.name==='60deg-tilt')writeFileSync(`${fixtures}/failed-tilt.json`,JSON.stringify(f.save()),'utf8');
}
const launch=restored('insertion');launch.upperFuel=0;const mass=launch.mass;launch.step();writeFileSync(`${fixtures}/failed-launch.json`,JSON.stringify(launch.save()),'utf8');
checks.push({name:'failed launch retains connected upper-stage mass and geometry',passed:launch.phase==='failed'&&launch.mass===mass&&launch.carrierStage==='upper'&&CrewMission.restore(launch.save()).mass===mass});
const missing=restored('touchdown');missing.inspection=undefined;const accepted=missing.recover();checks.push({name:'recovery requires a real observation record',passed:!accepted&&missing.phase==='touchdown'&&missing.message.includes('平台观察')});
const result=m.snapshot(),report={scope:'crew-earth-3 原创教学模型：名义任务与受控故障注入。故障夹具明确标注，不表示名义航程发生故障。',vehicleVersion:CREW_VEHICLE.version,unpoweredCarrier:{steps:30,maxCoastTorqueNm,maxCoastThrustN,angularVelocityChangeRadS:coast.angularVelocity.distanceTo(w)},boundaries,faults,checks,nominalContact:{verticalMS:result.touchdownSpeedMS,horizontalMS:result.touchdownHorizontalMS,tiltDeg:result.touchdownTiltDeg,angularRateDegS:result.touchdownAngularRateDegS,clearanceM:result.lowestPointClearanceM,recoveryChecks:result.recoveryChecks}};
writeFileSync(`${folder}/safety-checks.json`,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify({checks,nominalContact:report.nominalContact},null,2));if(checks.some(c=>!c.passed))process.exitCode=1;
