import * as THREE from 'three';
import type { FlightState } from './liftoff';
import { fixedToLocal } from './coordinates';
import { EARTH_RADII, observationFootprint, type FootprintOptions } from './observationFootprint';
import { add, dot, scale, unit, type V3 } from './ascent';

const SEGMENTS=96,RINGS=8;
/** Annotated geometry, depth-tested against the planet; never a visible optical beam. */
export function createObservationFootprintView(){
 const root=new THREE.Group();root.name='observation-footprint';
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array((RINGS+1)*SEGMENTS*3);
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const indices:number[]=[];
 for(let r=0;r<RINGS;r++)for(let i=0;i<SEGMENTS;i++){const j=(i+1)%SEGMENTS,a=r*SEGMENTS+i,b=r*SEGMENTS+j,c=(r+1)*SEGMENTS+i,d=(r+1)*SEGMENTS+j;indices.push(a,c,b,b,c,d);}
 geometry.setIndex(indices);
 const fill=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#ee9d5e',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));fill.frustumCulled=false;fill.renderOrder=4;root.add(fill);
 const edges=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array((SEGMENTS+1)*3),3));
 const outline=new THREE.Line(edges,new THREE.LineBasicMaterial({color:'#ffb971',transparent:true,opacity:.95,depthWrite:false}));outline.frustumCulled=false;outline.renderOrder=5;root.add(outline);
 const rays=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(8*3),3));
 const cone=new THREE.LineSegments(rays,new THREE.LineDashedMaterial({color:'#f5bd7a',transparent:true,opacity:.65,depthWrite:false,dashSize:12000,gapSize:9000}));cone.frustumCulled=false;cone.renderOrder=5;root.add(cone);
 let lastKey='',lastValid=false;const anchor={center:null as THREE.Vector3|null};
 return {root,anchor,hide(){root.visible=false;anchor.center=null;lastKey='';},update(s:FlightState,origin:THREE.Vector3,overview:boolean,options:FootprintOptions){
  const body=s.deployment?.satellite;
  root.visible=options.enabled&&overview&&!!s.deployment?.released&&!!s.operations&&s.phase.startsWith('ops-');
  if(!root.visible||!body){anchor.center=null;lastKey='';return;}
  const key=[...body.fixedPosition,...origin.toArray(),options.angle].join(',');if(key===lastKey){root.visible=lastValid;return;}lastKey=key;
  const footprint=observationFootprint(body.fixedPosition,options.angle);root.visible=lastValid=footprint.valid;if(!footprint.valid){anchor.center=null;return;}
  const local=(p:V3)=>fixedToLocal(new THREE.Vector3(...p)).sub(origin);
  // Place annotations 250 m above the reference surface to avoid z-fighting, after cloud artwork.
  const lifted=(p:V3)=>{const s=p.map((v,i)=>v/EARTH_RADII[i]) as V3,ground=scale(p,1/Math.sqrt(dot(s,s))),normal=unit(ground.map((v,i)=>v/(EARTH_RADII[i]**2)) as V3);return add(ground,scale(normal,250));};
  anchor.center=local(lifted(footprint.center));
  for(let r=0;r<=RINGS;r++)for(let i=0;i<SEGMENTS;i++)local(lifted(add(scale(footprint.center,1-r/RINGS),scale(footprint.boundary[i],r/RINGS)))).toArray(positions,(r*SEGMENTS+i)*3);
  geometry.attributes.position.needsUpdate=true;
  for(let i=0;i<=SEGMENTS;i++)local(lifted(footprint.boundary[i%SEGMENTS])).toArray(edges.attributes.position.array,i*3);edges.attributes.position.needsUpdate=true;
  for(let i=0;i<4;i++){local(body.fixedPosition).toArray(rays.attributes.position.array,i*6);local(lifted(footprint.boundary[i*SEGMENTS/4])).toArray(rays.attributes.position.array,i*6+3);}
  rays.attributes.position.needsUpdate=true;cone.computeLineDistances();
 }};
}
