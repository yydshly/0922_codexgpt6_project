import {Quaternion,Vector3} from 'three';
import {surfaceAt,type V3} from '../launch/ascent';

/** Shared render/physics dimensions, metres. Ship reference at 70.5 m; aft is +Z. */
export const CREW_CARRIER_AXIAL_SCALE=(62.4-8)/53.1;
export const CREW_CARRIER_GEOMETRY=Object.freeze({radiusM:3.1,upperEndZ:8,
  upperExitZ:62.4-33.7*CREW_CARRIER_AXIAL_SCALE,boosterExitZ:62.4,shipReferenceHeightM:70.5,padDeckM:8.1});
const radialScale=CREW_CARRIER_GEOMETRY.radiusM/1.85;
export const CREW_CARRIER_SOLID_EXTENTS=Object.freeze({
  boosterLipZ:CREW_CARRIER_GEOMETRY.boosterExitZ+.028*CREW_CARRIER_AXIAL_SCALE,
  upperLipZ:CREW_CARRIER_GEOMETRY.upperExitZ+.028*CREW_CARRIER_AXIAL_SCALE,
  boosterLipEnvelopeRadiusM:(Math.sqrt(2)*.8+.58+.028)*radialScale,
  upperLipRadiusM:(.8+.028)*radialScale,
});
type Section=readonly [radiusM:number,zM:number];
// Conservative circular sections cover solid hardware, including small feed pipes,
// lips, attachment rings and the retained solar-wing mounts. Deployed arrays are
// hidden during launch. Exhaust/plasma never count as solid contact geometry.
const ship:readonly Section[]=[[.9,-5.3],[1.3,-4.1],[2.9,-2.5],[2.45,-.25],
  [3.65,1.8],[2.9,2.5],[2.05,3.95],[1.48,7.57],[3.18,11.2],[3.18,11.655]];
const upper:readonly Section[]=[[1.5,7.95],[3.25,10.7],[3.25,26.04],
  [CREW_CARRIER_SOLID_EXTENTS.upperLipRadiusM,CREW_CARRIER_SOLID_EXTENTS.upperLipZ]];
const booster:readonly Section[]=[[3.3,26],[3.25,28.6],[3.45,58.2],[3.45,60.21],
  [3.25,61.43],[CREW_CARRIER_SOLID_EXTENTS.boosterLipEnvelopeRadiusM,CREW_CARRIER_SOLID_EXTENTS.boosterLipZ]];

/** Flat zero-altitude teaching ground, as in capsule contact. This is an authored
 * body envelope, not mesh collision; raised pad structures and tower are excluded.
 * Each circular section's minimum is analytic, so roll cannot miss a sampled point. */
export function crewCarrierContactFrame(position:V3,q:Quaternion,stage:'booster'|'upper'){
  const local=surfaceAt(position),up=new Vector3(...local.up),bodyUp=up.clone().applyQuaternion(q.clone().invert());
  const radial=new Vector3(-bodyUp.x,-bodyUp.y,0);if(radial.lengthSq()>1e-20)radial.normalize();
  const sections=stage==='booster'?[...ship,...upper,...booster]:[...ship,...upper];
  let clearanceM=Infinity,lowestBodyPoint=new Vector3();
  for(const [radius,z] of sections){
    const point=radial.clone().multiplyScalar(radius).setZ(z),clearance=local.height+point.dot(bodyUp);
    if(clearance<clearanceM){clearanceM=clearance;lowestBodyPoint=point;}
  }
  return {clearanceM,lowestBodyPoint,bodyUp,up,referenceHeightM:local.height};
}
