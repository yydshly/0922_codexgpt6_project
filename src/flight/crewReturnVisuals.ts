import * as THREE from 'three';
import {surfaceAt} from '../launch/ascent';
import {CREW_VEHICLE,type CrewSnapshot} from './crewMission';
import {CAPSULE_REACTION_JETS,reactionJetStrength} from './reactionControl';
import {CREW_RETURN_GEOMETRY,crewSupportedFeet,crewLegsDeployed} from './crewContact';
export {CREW_RETURN_GEOMETRY} from './crewContact';

/** Capsule model coordinates: nose −Z, exposed heat shield at Z=−0.25, aft +Z. */
const bodyPoint=(radius:number,angle:number,z:number)=>new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,z);
const contactAge=(s:CrewSnapshot)=>s.phase==='complete'?6:['touchdown'].includes(s.phase)?Math.max(0,s.time-(s.events.find(e=>e.phase==='touchdown')?.time??s.time)):0;

/** Pure geometry calculation, shared by rendering and attachment/contact checks. */
export function crewReturnFrame(s:CrewSnapshot){
  const g=CREW_RETURN_GEOMETRY,q=new THREE.Quaternion(...s.attitude),up=new THREE.Vector3(...surfaceAt(s.position).up);
  const axis=new THREE.Vector3(...s.chuteForce);if(axis.length()<1)axis.copy(up);else axis.normalize();
  const canopyQ=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
  const nose=new THREE.Vector3(0,0,g.anchorZ).applyQuaternion(q),age=contactAge(s);
  const release=1-THREE.MathUtils.smoothstep(age,.3,2);
  const mainArea=CREW_VEHICLE.mainChuteAreaM2*s.mainChuteFraction;
  const drogueArea=CREW_VEHICLE.drogueAreaM2*s.drogueFraction*(1-s.mainChuteFraction);
  const canopies=[{kind:'drogue',areaM2:drogueArea,lengthM:10},{kind:'main',areaM2:mainArea,lengthM:32}].map(c=>({
    ...c,radiusM:Math.sqrt(c.areaM2/Math.PI),center:nose.clone().addScaledVector(axis,c.lengthM),orientation:canopyQ.clone(),opacity:release,
    // The fore attachment is on the capsule, not on the removed service module or heat shield.
    anchors:Array.from({length:16},(_,i)=>bodyPoint(g.anchorRadiusM,i*Math.PI/8,g.anchorZ).applyQuaternion(q)),
  }));
  const contact=['touchdown','complete'].includes(s.phase),feetZ=contact?s.altitudeM:g.contactHeightM;
  const footBottoms=crewSupportedFeet(s.altitudeM,q,up,contact);
  return {canopies,axis,feetZ,nose:new THREE.Vector3(0,0,g.noseZ),shield:new THREE.Vector3(0,0,g.shieldZ),
    nozzles:Array.from({length:4},(_,i)=>bodyPoint(g.nozzleRadiusM,i*Math.PI/2+Math.PI/4,g.nozzleExitZ)),
    footBottoms,
  };
}

export function createCrewReturnVisuals(){
  const g=CREW_RETURN_GEOMETRY,body=new THREE.Group(),parachutes=new THREE.Group(),attitudeBody=new THREE.Group();
  body.name='capsule-return-hardware';parachutes.name='return-parachutes';attitudeBody.name='capsule-attitude-hardware';
  const metal=new THREE.MeshStandardMaterial({color:'#566571',metalness:.7,roughness:.35});
  const nozzleMaterial=new THREE.MeshStandardMaterial({color:'#242d33',metalness:.65,roughness:.4,side:THREE.DoubleSide});
  const attitudeJets=CAPSULE_REACTION_JETS.map(spec=>{
    const pod=new THREE.Group();pod.position.set(...spec.position);attitudeBody.add(pod);
    const radial=new THREE.Vector3(spec.position[0],spec.position[1],0).normalize(),bracket=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.65,12),metal);
    bracket.position.copy(radial).multiplyScalar(-.325);bracket.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),radial);pod.add(bracket);
    const normal=new THREE.Vector3(...spec.exhaust),nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.11,.045,.25,16,1,true),nozzleMaterial);
    nozzle.position.copy(normal).multiplyScalar(.1);nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);pod.add(nozzle);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.14,1,12).translate(0,-.5,0),new THREE.MeshBasicMaterial({color:'#c2d9ef',transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));
    flame.position.copy(normal).multiplyScalar(.225);flame.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),normal);flame.name=spec.id;pod.add(flame);flame.visible=false;
    return {spec,pod,flame};
  });
  const legParts=Array.from({length:4},(_,i)=>{
    const angle=i*Math.PI/2,mount=bodyPoint(2.28,angle,-.55);
    const strut=new THREE.Mesh(new THREE.CylinderGeometry(.085,.11,1,12),metal);
    const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.6,12),metal);
    const foot=new THREE.Mesh(new THREE.BoxGeometry(.65,.65,.18),metal);foot.name=`landing-foot-${i}`;
    const group=new THREE.Group();group.add(strut,sleeve,foot);group.traverse(n=>{if(n instanceof THREE.Mesh)n.castShadow=true;});body.add(group);
    return {group,mount,strut,sleeve,foot};
  });
  const jets=Array.from({length:4},(_,i)=>{
    const a=i*Math.PI/2+Math.PI/4,exit=bodyPoint(g.nozzleRadiusM,a,g.nozzleExitZ);
    const bracket=new THREE.Mesh(new THREE.BoxGeometry(.5,.28,.28),metal);bracket.position.copy(bodyPoint(2.3,a,-.2));bracket.rotation.z=a;body.add(bracket);
    const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.09,.24,.52,20,1,true),nozzleMaterial);nozzle.rotation.x=-Math.PI/2;nozzle.position.copy(exit).add(new THREE.Vector3(0,0,-.26));nozzle.name=`soft-landing-nozzle-${i}`;body.add(nozzle);
    // Translate the tip to the origin before scaling, so the exhaust always starts at the fixed outlet.
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.32,1,20,1,true).translate(0,-.5,0),new THREE.MeshBasicMaterial({color:'#ffd69b',transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    flame.rotation.x=-Math.PI/2;flame.position.copy(exit);flame.name=`soft-landing-exhaust-${i}`;body.add(flame);return {nozzle,flame,exit};
  });
  for(let i=0;i<4;i++){
    const loop=new THREE.Mesh(new THREE.TorusGeometry(.11,.045,8,16),metal);loop.position.copy(bodyPoint(g.anchorRadiusM,i*Math.PI/2,g.anchorZ));body.add(loop);
  }
  const canopies=Array.from({length:2},(_,i)=>{
    const group=new THREE.Group();parachutes.add(group);
    const clothMaterial=new THREE.MeshStandardMaterial({color:i?'#e5d8bd':'#d59358',roughness:1,side:THREE.DoubleSide,transparent:true});
    const cloth=new THREE.Mesh(new THREE.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),clothMaterial);cloth.scale.y=.38;group.add(cloth);
    const seamPoints:number[]=[];for(let line=0;line<16;line++){const a=line*Math.PI/8;for(let j=0;j<16;j++){for(const t of [j*Math.PI/32,(j+1)*Math.PI/32])seamPoints.push(Math.sin(t)*Math.cos(a),Math.cos(t)*.38,Math.sin(t)*Math.sin(a));}}
    const seamMaterial=new THREE.LineBasicMaterial({color:'#8c7257',transparent:true,opacity:.6});const seams=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(seamPoints,3)),seamMaterial);group.add(seams);
    const cordsGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(16*6),3));
    const cordsMaterial=new THREE.LineBasicMaterial({color:'#e6e6db',transparent:true,opacity:.9});const cords=new THREE.LineSegments(cordsGeometry,cordsMaterial);parachutes.add(cords);
    return {group,clothMaterial,seamMaterial,cords,cordsGeometry,cordsMaterial};
  });
  const update=(s:CrewSnapshot)=>{
    const frame=crewReturnFrame(s);body.visible=!s.serviceAttached;
    const effort=new THREE.Vector3(...s.attitudeEffort);
    for(const {spec,flame} of attitudeJets){const strength=reactionJetStrength(spec,effort,new THREE.Vector3());
      flame.visible=!s.serviceAttached&&!['touchdown','complete','failed'].includes(s.phase)&&s.capsuleRcsFuelKg>0&&strength>.005;flame.scale.y=.25+Math.min(1,strength)*1.3;}
    for(let i=0;i<4;i++){
      const leg=legParts[i],bottom=frame.footBottoms[i],center=bottom.clone().add(new THREE.Vector3(0,0,-.09)),delta=center.clone().sub(leg.mount);
      leg.group.visible=crewLegsDeployed(s.altitudeM,s.mainChuteFraction);
      leg.strut.position.copy(leg.mount).addScaledVector(delta,.5);leg.strut.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());leg.strut.scale.y=delta.length();
      leg.sleeve.position.copy(leg.mount).addScaledVector(delta,.2);leg.sleeve.quaternion.copy(leg.strut.quaternion);leg.foot.position.copy(center);
      const {flame}=jets[i],fraction=Math.min(1,new THREE.Vector3(...s.thrust).length()/CREW_VEHICLE.landingThrustN);
      flame.visible=s.phase==='landing'&&fraction>.001;flame.scale.y=Math.min(2.8*fraction,Math.max(0,s.altitudeM-g.nozzleExitZ));
    }
    canopies.forEach((visual,i)=>{
      const c=frame.canopies[i];visual.group.visible=visual.cords.visible=c.areaM2>.001&&c.opacity>0;
      visual.group.position.copy(c.center);visual.group.quaternion.copy(c.orientation);visual.group.scale.setScalar(c.radiusM);
      visual.clothMaterial.opacity=c.opacity;visual.seamMaterial.opacity=.6*c.opacity;visual.cordsMaterial.opacity=.9*c.opacity;
      if(visual.cords.visible){const attr=visual.cordsGeometry.getAttribute('position');for(let j=0;j<16;j++){
        const a=j*Math.PI/8,top=new THREE.Vector3(Math.cos(a)*c.radiusM,0,Math.sin(a)*c.radiusM).applyQuaternion(c.orientation).add(c.center);
        attr.setXYZ(j*2,...c.anchors[j].toArray());attr.setXYZ(j*2+1,...top.toArray());
      }attr.needsUpdate=true;visual.cordsGeometry.computeBoundingSphere();}
    });
    return frame;
  };
  return {body,parachutes,attitudeBody,update,canopies,jets,legParts,attitudeJets};
}
