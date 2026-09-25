import atmosphereManifest from '../../public/data/solar-atmosphere/manifest.json';
import * as THREE from 'three';
import type {PhenomenonParts} from '../data/phenomenonParts';
/** Display radii only: deliberately separated to make thin atmospheric regions readable. */
export const SOLAR_DISPLAY_RADII=atmosphereManifest.displayRadii;
function rim(radius:number,color:string,strength:number,diffuse=false){
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,64,40),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{tint:{value:new THREE.Color(color)},strength:{value:strength},diffuse:{value:diffuse?1:0}},
  vertexShader:'varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=-p.xyz;gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec3 n;varying vec3 eye;uniform vec3 tint;uniform float strength;uniform float diffuse;void main(){float d=abs(dot(normalize(n),normalize(eye)));float edge=1.-d;float r=sqrt(max(0.,1.-d*d));float thin=pow(edge,3.)*(1.-smoothstep(.85,1.,edge));float soft=smoothstep(.4,.62,r)*(1.-smoothstep(.62,1.,r));float a=mix(thin,soft,diffuse)*strength;gl_FragColor=vec4(tint,a);}',
 }));return mesh;
}
/** Both footpoints lie on the photosphere; the arch is a non-observed teaching example. */
export function prominencePoints(radius:number,offset=0){
 const normal=new THREE.Vector3(-.83,.45,.3).normalize(),tangent=new THREE.Vector3(.4,.83,-.15).projectOnPlane(normal).normalize();
 return Array.from({length:65},(_,i)=>{const u=i/64,angle=(u-.5)*.54;return normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent,Math.sin(angle)).multiplyScalar(radius*(1+.65*Math.sin(Math.PI*u))+offset*Math.sin(Math.PI*u));});
}
export function createSolarAtmosphere(){
 const root=new THREE.Group();root.name='solar-atmosphere-layers';
 const chromosphere=rim(SOLAR_DISPLAY_RADII.chromosphere,'#ff655e',.7),transition=rim(SOLAR_DISPLAY_RADII.transition,'#bc91ff',.4),corona=rim(SOLAR_DISPLAY_RADII.corona,'#ffdbad',.18,true);
 const sunspots=new THREE.Group(),prominence=new THREE.Group();root.add(chromosphere,transition,corona,sunspots,prominence);
 for(const [id,obj] of Object.entries({chromosphere,transition,corona,sunspots,prominence}))obj.name='solar-'+id;
 for(const [direction,width] of [[new THREE.Vector3(.25,.38,.89),.12],[new THREE.Vector3(.02,.25,.97),.075]] as const){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
   vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec2 p;void main(){float r=(1.-p.y)*(1.+.06*sin(p.x*44.)+.035*cos(p.x*81.));float edge=1.-smoothstep(.65,1.,r);vec3 c=mix(vec3(.12,.075,.04),vec3(.34,.19,.07),smoothstep(.28,.52,r));gl_FragColor=vec4(c,edge*.94);}',
  });
  const patch=new THREE.Mesh(new THREE.SphereGeometry(.341,48,24,0,Math.PI*2,0,width),material);patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());sunspots.add(patch);
 }
 for(let i=0;i<5;i++){
  const curve=new THREE.CatmullRomCurve3(prominencePoints(.341,i*.008));
  prominence.add(new THREE.Mesh(new THREE.TubeGeometry(curve,64,.0038,6,false),new THREE.MeshBasicMaterial({color:i%2?'#ffbc78':'#ef6956',transparent:true,opacity:.8})));
 }
 return {root,chromosphere,transition,corona,sunspots,prominence,update(parts:PhenomenonParts){chromosphere.visible=parts.chromosphere;transition.visible=parts.transition;corona.visible=parts.corona;sunspots.visible=parts.sunspots;prominence.visible=parts.prominence;}};
}
