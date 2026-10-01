import {Quaternion,Vector3} from 'three';
import {surfaceAt,type V3} from '../launch/ascent';

/** Shared body coordinates, metres. Nose −Z; aft / deployed feet +Z. */
export const CREW_RETURN_GEOMETRY=Object.freeze({
  noseZ:-5.2,shieldZ:-.25,anchorZ:-5.18,anchorRadiusM:1.02,
  nozzleRadiusM:2.5,nozzleExitZ:.3,footRadiusM:2.65,footHalfWidthM:.325,contactHeightM:2,
});
/** Original teaching limits, not certified landing or human safety limits. */
export const CREW_CONTACT_LIMITS=Object.freeze({verticalMS:3,horizontalMS:5,tiltDeg:15,angularRateDegS:5,
  stableTiltDeg:5,stableRateRadS:.01,stableSpeedMS:.1,compressionSeconds:.8,inspectionSeconds:3});
export const crewLegsDeployed=(height:number,mainFraction:number)=>height<120&&mainFraction>.2;
const bodyPoint=(r:number,a:number,z:number)=>new Vector3(r*Math.cos(a),r*Math.sin(a),z);
export const crewDeployedFeet=()=>Array.from({length:4},(_,i)=>bodyPoint(CREW_RETURN_GEOMETRY.footRadiusM,i*Math.PI/2,CREW_RETURN_GEOMETRY.contactHeightM));

/** Local tangent ground, identical to the close landing scene. Hull is a conservative
 * rotational envelope of this fictional capsule and its external return hardware. */
export function crewContactFrame(position:V3,q:Quaternion,deployed:boolean,feet=crewDeployedFeet()){
  const local=surfaceAt(position),up=new Vector3(...local.up),bodyUp=up.clone().applyQuaternion(q.clone().invert());
  const hullProfile:[[number,number],...[number,number][]]=[[.9,-5.3],[1.3,-4.1],[1.85,-2.8],[2.4,-1.45],[2.45,-.25],[2.75,.3]];
  const radial=new Vector3(-bodyUp.x,-bodyUp.y,0);if(radial.lengthSq()>1e-20)radial.normalize();
  const hullPoints=hullProfile.map(([r,z])=>radial.clone().multiplyScalar(r).setZ(z));
  const footPoints=feet.flatMap(p=>[-1,1].flatMap(x=>[-1,1].map(y=>p.clone().add(new Vector3(x*CREW_RETURN_GEOMETRY.footHalfWidthM,y*CREW_RETURN_GEOMETRY.footHalfWidthM,0)))));
  const clearance=(p:Vector3)=>local.height+p.dot(bodyUp);
  const hullClearanceM=Math.min(...hullPoints.map(clearance)),footClearanceM=Math.min(...footPoints.map(clearance));
  const points=deployed?[...hullPoints,...footPoints]:hullPoints;
  const lowest=points.reduce((a,b)=>clearance(a)<clearance(b)?a:b);
  return {up,bodyUp,tiltDeg:new Vector3(0,0,-1).applyQuaternion(q).angleTo(up)*180/Math.PI,
    hullClearanceM,footClearanceM,clearanceM:clearance(lowest),lowestBodyPoint:lowest};
}

/** Struts may compress, never extend beyond deployment to hide an invalid landing.
 * At first contact other feet can remain raised; suspension settles them afterwards. */
export function crewSupportedFeet(height:number,q:Quaternion,up:Vector3,contact:boolean){
  const feet=crewDeployedFeet(),bodyUp=up.clone().applyQuaternion(q.clone().invert());
  if(!contact||-bodyUp.z<Math.cos(CREW_CONTACT_LIMITS.tiltDeg*Math.PI/180))return feet;
  const cornerDrop=CREW_RETURN_GEOMETRY.footHalfWidthM*(Math.abs(bodyUp.x)+Math.abs(bodyUp.y));
  for(const p of feet)p.z=Math.max(0,Math.min(CREW_RETURN_GEOMETRY.contactHeightM,-(height+p.x*bodyUp.x+p.y*bodyUp.y-cornerDrop)/bodyUp.z));
  return feet;
}
