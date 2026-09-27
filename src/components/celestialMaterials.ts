import * as THREE from 'three';
import type { BodyDefinition } from '../types';
import { bodyById } from '../data/catalog';
import { publicAsset } from '../data/publicAsset';
import { ringSystemBounds } from '../data/rings';
import { makeSaturnRingGeometry } from './saturnRingGeometry';

const vs = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocal;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vUv = uv;
    vLocal = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position,1.0);
    vPosition = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <logdepthbuf_vertex>
  }
`;
const fs = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 baseColor;
  uniform vec3 sunDirection;
  uniform float hasTexture;
  uniform float emissive;
  uniform float isEarth;
  uniform float visualTime;
  uniform float ambientLevel;
  uniform float presentationLight;
  uniform sampler2D cloudShadowMap;
  uniform float cloudShadowReady;
  uniform float showCloudShadows;
  uniform mat3 earthWorldToLocal;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vLocal;
  #include <common>
  #include <logdepthbuf_pars_fragment>
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  void main() {
    #include <logdepthbuf_fragment>
    vec3 n = normalize(vNormal);
    vec3 albedo = mix(baseColor, texture2D(dayMap, vUv).rgb, hasTexture);
    float ndl = dot(n, normalize(sunDirection));
    float daylight = max(0.0, ndl);
    float cloudTransmission=1.;
    if(isEarth>.5&&cloudShadowReady>.5&&showCloudShadows>.5&&ndl>0.){
      vec3 localNormal=normalize(vLocal),localSun=normalize(earthWorldToLocal*sunDirection);
      float b=dot(localNormal,localSun);
      float travel=-b+sqrt(b*b+1.002*1.002-1.);
      vec3 cloudPoint=normalize(localNormal+travel*localSun);
      vec2 cloudUv=vec2(fract(atan(cloudPoint.z,-cloudPoint.x)/(2.*PI)+1.),1.-acos(clamp(cloudPoint.y,-1.,1.))/PI);
      float cover=pow(smoothstep(.065,.90,texture2D(cloudShadowMap,cloudUv).r),.67);
      cloudTransmission=1.-.25*cover*smoothstep(.03,.18,ndl);
    }
    vec3 light = albedo * (ambientLevel + daylight * 1.25 * cloudTransmission);
    // Explicit illustration fill reveals the night-side curvature without moving the Sun.
    vec3 viewDir = normalize(cameraPosition-vPosition);
    float facing = max(0.,dot(n,viewDir));
    vec3 fillDirection = normalize(viewDir + vec3(-.35,.55,.15));
    float fill = pow(max(0.,dot(n,fillDirection)),1.7);
    light += albedo * vec3(.62,.78,1.) * presentationLight * (.045 + .34*fill);
    light += baseColor * presentationLight * pow(1.-facing,3.) * .035;
    float spec = pow(max(0.0,dot(reflect(-normalize(sunDirection),n),normalize(cameraPosition-vPosition))),48.0);
    float ocean = smoothstep(.015,.12,albedo.b-max(albedo.r,albedo.g)*.92);
    light += vec3(.75,.85,1.) * spec * isEarth * ocean * daylight * 1.2;
    light += texture2D(nightMap,vUv).rgb * isEarth * (1.0-smoothstep(-.18,.05,ndl))*.6;
    if(emissive>.5){
      vec3 p=normalize(vLocal)*24.;
      float granule=noise3(p+vec3(0.,visualTime*.025,0.))*.65+noise3(p*3.-visualTime*.015)*.35;
      float limb=.4+.6*pow(max(0.,dot(n,normalize(cameraPosition-vPosition))),.42);
      vec3 plasma=mix(vec3(.75,.12,.008),vec3(2.5,1.1,.18),granule);
      light=mix(plasma,albedo*2.0,.3)*limb;
    }
    gl_FragColor=vec4(light,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function makePlanetMaterial(body: BodyDefinition, loader: THREE.TextureLoader) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: new THREE.Texture() }, nightMap: { value: new THREE.Texture() }, baseColor: { value: new THREE.Color(body.color) },
      sunDirection: { value: new THREE.Vector3(1,0,0) }, hasTexture: { value: 0 },
      emissive: { value: body.id === 'sun' ? 1 : 0 }, isEarth: { value: body.id === 'earth' ? 1 : 0 },
      visualTime: { value: 0 },
      ambientLevel: { value: .014 },
      presentationLight: { value: 0 },
      cloudShadowMap:{value:new THREE.Texture()},cloudShadowReady:{value:0},showCloudShadows:{value:0},earthWorldToLocal:{value:new THREE.Matrix3()},
    }, vertexShader: vs, fragmentShader: fs,
  });
  if (body.texture) loader.load(body.texture, texture => {
    if(material.userData.disposed){texture.dispose();return;}
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    material.uniforms.dayMap.value.dispose();
    material.uniforms.dayMap.value = texture;
    material.uniforms.hasTexture.value = 1;
  }, undefined, () => { /* The scientific scene remains usable without a texture. */ });
  if(body.id==='earth') loader.load(publicAsset('/textures/earth-night.jpg'),texture=>{
    if(material.userData.disposed){texture.dispose();return;}
    texture.colorSpace=THREE.SRGBColorSpace;
    material.uniforms.nightMap.value.dispose();material.uniforms.nightMap.value=texture;
  });
  return material;
}

export function makeSaturnRing(loader:THREE.TextureLoader) {
  const [inner,outer]=ringSystemBounds('saturn',bodyById.saturn.radiusKm);
  const material=new THREE.ShaderMaterial({
    vertexShader:vs,uniforms:{sunDirection:{value:new THREE.Vector3(1,0,0)},ringMap:{value:new THREE.Texture()},bodyCenter:{value:new THREE.Vector3()},bodyRadius:{value:1},presentationLight:{value:0},ringBounds:{value:new THREE.Vector2(inner,outer)}},
    fragmentShader:`
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
      uniform vec3 sunDirection; uniform sampler2D ringMap; uniform vec3 bodyCenter; uniform float bodyRadius;uniform float presentationLight; uniform vec2 ringBounds;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        float r=length(vUv-.5)*2.0;
        vec4 rings=texture2D(ringMap,vec2(clamp((r*ringBounds.y-ringBounds.x)/(ringBounds.y-ringBounds.x),0.,1.),.5));
        vec3 relative=(vPosition-bodyCenter)/bodyRadius;
        float along=dot(relative,normalize(sunDirection));
        float closest=dot(relative,relative)-along*along;
        float shadow=along<0.?smoothstep(.998,1.002,closest):1.;
        float light=.12+presentationLight*.16+shadow*1.1*abs(dot(normalize(vNormal),normalize(sunDirection)));
        gl_FragColor=vec4(rings.rgb*light,rings.a*.95);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,transparent:true,side:THREE.DoubleSide,depthWrite:false,
  });
  loader.load(publicAsset('/textures/saturn-ring.png'),texture=>{
    if(material.userData.disposed){texture.dispose();return;}
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
    material.uniforms.ringMap.value.dispose();material.uniforms.ringMap.value=texture;
  });
  const ring=new THREE.Mesh(makeSaturnRingGeometry(1,'planar'),material);
  ring.name='saturn-rings';ring.rotation.x=Math.PI/2;return ring;
}

