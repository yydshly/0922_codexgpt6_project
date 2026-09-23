import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BODIES, AU_KM, bodyById } from '../data/catalog';
import { publicAsset } from '../data/publicAsset';
import { SATELLITES } from '../data/satellites';
import type { OverviewSatelliteState } from '../hooks/useOverviewSatellites';
import { BODY_IDS, type BodyId, type StateFrame, type SimulationMode, type ViewOptions, type BodyDefinition } from '../types';
import './SolarSystem.css';
import { makeAtlasMesh, makeSunAtmosphere, updateSunAtmosphere } from './celestialEffects';
import { comparisonLayout } from './comparison-layout';
import { mapOrbitalDistance, spatialRadius } from './spatial-layout';
import { overviewSatelliteOffset, overviewSatelliteRadius, satelliteFamilyCounts } from './overview-layout';
import { satelliteOrbitPoints } from './SatelliteSystem';
import { createEarthEffects } from './earthEffects';
import { bindSatelliteSunlight } from './satelliteLighting';
import { createOrbitMaterial, updateOrbitMaterial, createSolarHalo } from './presentationEffects';
import { createObservatoryBackdrop, updateObservatoryBackdrop } from './observatoryBackdrop';

interface Props {
  frame: StateFrame | null; mode: SimulationMode; selectedId: BodyId;
  options: ViewOptions; onSelect: (id: BodyId) => void; onReady?: () => void;
  satellites?: OverviewSatelliteState[];
  onSelectSatellite?: (id: string) => void;
  onExploreRegion?: (region: 'asteroid' | 'kuiper') => void;
  onCameraInteraction?: () => void;
}
const LABEL_BODIES = [...BODIES, ...SATELLITES];
const FAMILY_COUNTS = satelliteFamilyCounts(SATELLITES);
const RAD = Math.PI / 180;
const toScene = (x: number, y: number, z: number) => new THREE.Vector3(x / AU_KM, z / AU_KM, -y / AU_KM);
const bodyPosition = (frame: StateFrame, index: number) => toScene(...Array.from(frame.positions.slice(index * 3, index * 3 + 3)) as [number, number, number]);
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

function makePlanetMaterial(body: BodyDefinition, loader: THREE.TextureLoader) {
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

/** Local +X is the prime meridian, +Y north, -Z east (Three sphere UV convention). */
function orientation(body: BodyDefinition, secondsTdb: number, out: THREE.Quaternion) {
  const alpha=(body.poleRaDeg ?? 0)*RAD, delta=(body.poleDecDeg ?? 90)*RAD;
  const rotationRate=body.rotationRateDegPerDay ?? 8640/body.rotationHours;
  const w=((body.primeMeridianDeg ?? 0)+secondsTdb/86400*rotationRate)%360*RAD;
  const pole = new THREE.Vector3(Math.cos(delta)*Math.cos(alpha),Math.cos(delta)*Math.sin(alpha),Math.sin(delta));
  const q = new THREE.Vector3(-Math.sin(alpha),Math.cos(alpha),0);
  const u = pole.clone().cross(q);
  const x=q.clone().multiplyScalar(Math.cos(w)).addScaledVector(u,Math.sin(w));
  const west=q.clone().multiplyScalar(Math.sin(w)).addScaledVector(u,-Math.cos(w));
  const transform=(v:THREE.Vector3)=>{
    const y=v.y*Math.cos(23.439291111*RAD)+v.z*Math.sin(23.439291111*RAD);
    const z=-v.y*Math.sin(23.439291111*RAD)+v.z*Math.cos(23.439291111*RAD);
    return v.set(v.x,z,-y);
  };
  out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(transform(x),transform(pole),transform(west)));
}

/** Instantaneous Kepler conic, explicitly a reference curve rather than a future ephemeris. */
function referenceOrbit(frame: StateFrame, index: number): THREE.Vector3[] {
  if(index===0) return [];
  const parent=index===4?3:0;
  const offset=index*3, center=parent*3;
  const r=new THREE.Vector3(...Array.from(frame.positions.slice(offset,offset+3)) as [number,number,number])
    .sub(new THREE.Vector3(...Array.from(frame.positions.slice(center,center+3)) as [number,number,number]));
  const v=new THREE.Vector3(...Array.from(frame.velocities.slice(offset,offset+3)) as [number,number,number])
    .sub(new THREE.Vector3(...Array.from(frame.velocities.slice(center,center+3)) as [number,number,number]));
  const mu=BODIES[parent].simulationGm+BODIES[index].simulationGm;
  const h=r.clone().cross(v);
  const evec=v.clone().cross(h).divideScalar(mu).sub(r.clone().normalize());
  const e=evec.length(), a=1/(2/r.length()-v.lengthSq()/mu);
  if(!Number.isFinite(a)||a<=0||e>=0.99) return [];
  const p=e>1e-7?evec.clone().normalize():r.clone().normalize();
  const q=h.clone().normalize().cross(p);
  const points:THREE.Vector3[]=[];
  for(let k=0;k<=360;k++) {
    const t=k/360*Math.PI*2, radius=a*(1-e*e)/(1+e*Math.cos(t));
    const pos=p.clone().multiplyScalar(radius*Math.cos(t)).addScaledVector(q,radius*Math.sin(t));
    points.push(toScene(pos.x,pos.y,pos.z));
  }
  return points;
}

function seededRandom(seed:number) {
  return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
}
function makeBelt(min:number,max:number,count:number,color:string,seed:number) {
  const random=seededRandom(seed), positions=new Float32Array(count*3), colors=new Float32Array(count*3), sizes=new Float32Array(count), tint=new THREE.Color(color);
  for(let i=0;i<count;i++) {
    const angle=random()*Math.PI*2, radial=random(),radius=min+(max-min)*radial;
    positions.set([Math.cos(angle)*radius,(random()+random()-1)*radius*.038,Math.sin(angle)*radius],i*3);
    const edge=Math.pow(Math.sin(radial*Math.PI),.65);
    const light=(.35+random()*.65)*edge; colors.set([tint.r*light,tint.g*light,tint.b*light],i*3);
    sizes[i]=.75+Math.pow(random(),4)*1.8;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
  const material=new THREE.ShaderMaterial({
    uniforms:{uDistance:{value:50},uPixelRatio:{value:Math.min(window.devicePixelRatio,1.75)},uEnhanced:{value:0},uBodyPositions:{value:BODIES.map(()=>new THREE.Vector3())},uBodyRadii:{value:new Float32Array(BODIES.length)}},
    vertexShader:`#include <common>
      #include <logdepthbuf_pars_vertex>
      attribute float aSize; varying vec3 vColor; varying float vDepth; varying float vClearance;uniform float uDistance; uniform float uPixelRatio;
      uniform float uEnhanced;uniform vec3 uBodyPositions[10];uniform float uBodyRadii[10];
      void main(){vColor=color; vec4 mvPosition=modelViewMatrix*vec4(position,1.); vDepth=clamp(uDistance/max(1.,-mvPosition.z),.35,2.);
        vClearance=1.;if(uEnhanced>.5){vec3 world=(modelMatrix*vec4(position,1.)).xyz;
          for(int i=0;i<10;i++){float radius=uBodyRadii[i];if(radius>0.)vClearance=min(vClearance,smoothstep(radius*1.35,radius*2.,distance(world,uBodyPositions[i])));}}
        gl_Position=projectionMatrix*mvPosition;gl_PointSize=aSize*uPixelRatio*clamp(vDepth,.65,2.1);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`#include <common>
      #include <logdepthbuf_pars_fragment>
      varying vec3 vColor;varying float vDepth;varying float vClearance;
      void main(){
        #include <logdepthbuf_fragment>
        float r=length(gl_PointCoord-.5)*2.; if(r>1.)discard;
        gl_FragColor=vec4(vColor*1.5,exp(-r*r*2.)*(1.-smoothstep(.65,1.,r))*.7*clamp(vDepth,.4,1.4)*vClearance);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,vertexColors:true,transparent:true,depthWrite:false,depthTest:true,
  });
  return new THREE.Points(geometry,material);
}
function makeSaturnRing(loader:THREE.TextureLoader) {
  const material=new THREE.ShaderMaterial({
    vertexShader:vs,uniforms:{sunDirection:{value:new THREE.Vector3(1,0,0)},ringMap:{value:new THREE.Texture()},bodyCenter:{value:new THREE.Vector3()},bodyRadius:{value:1},presentationLight:{value:0}},
    fragmentShader:`
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
      uniform vec3 sunDirection; uniform sampler2D ringMap; uniform vec3 bodyCenter; uniform float bodyRadius;uniform float presentationLight;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        float r=length(vUv-.5)*2.0;
        vec4 rings=texture2D(ringMap,vec2(clamp((r*2.33-1.24)/(2.33-1.24),0.,1.),.5));
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
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.24,2.33,160),material);
  ring.rotation.x=Math.PI/2;return ring;
}

export function SolarSystem(props:Props) {
  const host=useRef<HTMLDivElement>(null);
  const labels=useRef<(HTMLButtonElement|null)[]>([]);
  const leaders=useRef<(SVGLineElement|null)[]>([]);
  const regionLabels=useRef<(HTMLButtonElement|null)[]>([]);
  const scale=useRef<HTMLSpanElement>(null);
  const latest=useRef(props);latest.current=props;
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!host.current) return;
    const element=host.current;
    let renderer:THREE.WebGLRenderer;
    try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});}
    catch {setError('无法启动 3D 场景。请使用支持 WebGL 2 的浏览器，并开启硬件加速。');latest.current.onReady?.();return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
    renderer.setClearColor(0x070b10,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-label','太阳系三维场景，拖动旋转，滚轮缩放');
    renderer.domElement.className='solar-canvas';
    renderer.domElement.tabIndex=0;
    element.prepend(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(43,1,1e-8,1500);
    camera.position.set(4,35,54);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=.085;
    controls.listenToKeyEvents(renderer.domElement);
    controls.minDistance=1e-7;controls.maxDistance=160;controls.zoomSpeed=.9;
    const loader=new THREE.TextureLoader();
    const sphere=new THREE.SphereGeometry(1,64,48);
    const groups=BODIES.map(body=>{
      const group=new THREE.Group();
      const mesh=new THREE.Mesh(sphere,makePlanetMaterial(body,loader));
      mesh.userData.bodyId=body.id;group.add(mesh);
      if(body.id==='earth'){
        const {clouds,atmosphere}=createEarthEffects(loader);group.add(clouds,atmosphere);
        mesh.material.uniforms.cloudShadowMap.value.dispose();
        mesh.material.uniforms.cloudShadowMap=clouds.material.uniforms.cloudMap;
        mesh.material.uniforms.cloudShadowReady=clouds.material.uniforms.cloudMapReady;
      }
      if(body.id==='saturn')group.add(makeSaturnRing(loader));
      scene.add(group);return group;
    });
    const satelliteGroups=SATELLITES.map(body=>{
      const group=makeAtlasMesh(body);group.userData.satelliteId=body.id;group.visible=false;scene.add(group);return group;
    });
    const satelliteLights=satelliteGroups.map(bindSatelliteSunlight);
    const satelliteOrbits=SATELLITES.map(body=>{
      const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:body.color,transparent:true,opacity:.21,depthWrite:false}));
      line.visible=false;scene.add(line);return line;
    });
    // Direct light follows uncompressed scientific coordinates for every moon.
    const satelliteAmbient=new THREE.AmbientLight(0x9bb9dc,.19);scene.add(satelliteAmbient);
    const orbitLines=BODIES.map(body=>{
      const line=new THREE.Line(new THREE.BufferGeometry(),createOrbitMaterial(body.color));
      scene.add(line);return line;
    });
    const historyLines=BODIES.map(body=>{
      const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:body.color,transparent:true,opacity:.65,depthWrite:false}));
      scene.add(line);return line;
    });
    const histories:THREE.Vector3[][]=BODIES.map(()=>[]);
    const solarAtmosphere=makeSunAtmosphere();groups[0].add(solarAtmosphere);
    const solarHalo=createSolarHalo();scene.add(solarHalo);
    const stars=createObservatoryBackdrop();scene.add(stars);
    const asteroidBelt=makeBelt(2.2,3.2,7500,'#aa9980',8),kuiperBelt=makeBelt(30,50,14000,'#6b9caa',98);
    const originalBeltPositions=[asteroidBelt,kuiperBelt].map(belt=>(belt.geometry.getAttribute('position').array as Float32Array).slice());
    scene.add(asteroidBelt,kuiperBelt);
    const plane=new THREE.PolarGridHelper(55,12,11,160,0x254449,0x1b2a36);
    (plane.material as THREE.Material).transparent=true;(plane.material as THREE.Material).opacity=.36;scene.add(plane);
    const axes=new THREE.AxesHelper(2);scene.add(axes);
    const arrowMaterials:THREE.ArrowHelper[]=[];
    for(let i=0;i<BODIES.length;i++){
      const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.2,BODIES[i].color,.04,.02);
      scene.add(arrow);arrowMaterials.push(arrow);
    }
    let width=1,height=1,sizeChanged=true;
    const resize=new ResizeObserver(()=>{
      width=element.clientWidth;height=element.clientHeight;
      if(width<=0||height<=0)return;
      renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
      sizeChanged=true;
    });resize.observe(element);
    let disposed=false, raf=0,initialized=false,lastView='',lastSelected='',lastComparison='',lastPresentation='',lastTime=NaN,lastHistory=NaN,lastOrbit=NaN,lastMode='';
    let satelliteFramed=false,userNavigated=false,lastCameraAngle='',orbitPhase=0,visualFrameTime=performance.now();
    const markNavigation=()=>{userNavigated=true;latest.current.onCameraInteraction?.();};controls.addEventListener('start',markNavigation);
    const visualStart=performance.now();
    const origin=new THREE.Vector3(),projected=new THREE.Vector3(),sun=new THREE.Vector3();
    const previousPairCenter=new THREE.Vector3();
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
    let downX=0,downY=0;
    const onDown=(event:PointerEvent)=>{downX=event.clientX;downY=event.clientY;};
    const onClick=(event:PointerEvent)=>{
      if(Math.hypot(event.clientX-downX,event.clientY-downY)>5)return;
      const rect=element.getBoundingClientRect();pointer.set((event.clientX-rect.left)/width*2-1,-(event.clientY-rect.top)/height*2+1);
      raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObjects([...groups.filter(g=>g.visible).map(g=>g.children[0]),...satelliteGroups.filter(g=>g.visible)],true)[0];
      if(hit){
        let object:THREE.Object3D|null=hit.object;
        while(object&&!object.userData.bodyId&&!object.userData.satelliteId)object=object.parent;
        if(object?.userData.satelliteId)latest.current.onSelectSatellite?.(object.userData.satelliteId);
        else if(object?.userData.bodyId)latest.current.onSelect(object.userData.bodyId);
      }
    };
    renderer.domElement.addEventListener('pointerdown',onDown);
    renderer.domElement.addEventListener('pointerup',onClick);
    const lost=(event:Event)=>{event.preventDefault();setError('图形上下文已中断，请重新加载页面恢复场景。');};
    renderer.domElement.addEventListener('webglcontextlost',lost);

    const animate=()=>{
      if(disposed)return;raf=requestAnimationFrame(animate);
      const {frame,options,selectedId,mode,satellites=[]}=latest.current;
      if(!frame)return;
      const selectedIndex=BODY_IDS.indexOf(selectedId);
      const comparison=options.view==='comparison';
      const earthMoon=options.view==='earth-moon';
      const region=options.view==='overview'||options.view==='inner'||options.view==='outer';
      const spatial=(options.presentation ?? 'spatial')==='spatial'&&(region||earthMoon);
      const cameraAngle=options.cameraAngle??'perspective';
      const visualNow=performance.now(),visualDelta=Math.min(.05,(visualNow-visualFrameTime)/1000);visualFrameTime=visualNow;
      const orbitalView=options.view==='inner'?'inner':options.view==='outer'?'outer':'overview';
      const layout=comparisonLayout(options.comparisonSet ?? 'planets');
      sun.copy(bodyPosition(frame,0));
      const focusIndex=options.view==='follow'?selectedIndex:options.view==='earth-moon'?3:0;
      const nextOrigin=bodyPosition(frame,focusIndex);
      const actualPositions=BODIES.map((_,i)=>bodyPosition(frame,i));
      const earth=actualPositions[3], lunarVector=actualPositions[4].clone().sub(earth);
      const lunarScale=(earthMoon?6.5:orbitalView==='inner'?.7:1.8)/(384400/AU_KM);
      const mapSolarVector=(vector:THREE.Vector3)=>{
        const length=vector.length();
        return length>0?vector.multiplyScalar(mapOrbitalDistance(length,orbitalView)/length):vector;
      };
      const positions=actualPositions.map((position,i)=>{
        if(comparison)return layout.positions[i].clone();
        if(!spatial)return position.clone().sub(nextOrigin);
        if(earthMoon)return i===4?lunarVector.clone().multiplyScalar(lunarScale):new THREE.Vector3();
        if(i===4)return mapSolarVector(earth.clone().sub(sun)).addScaledVector(lunarVector,lunarScale);
        return mapSolarVector(position.clone().sub(sun));
      });
      const radii=BODIES.map(body=>spatial?(earthMoon?(body.id==='earth'?1:body.id==='moon'?body.radiusKm/BODIES[3].radiusKm:0):spatialRadius(body,orbitalView)):body.radiusKm/AU_KM);
      const visibleBodies=BODIES.map((_,i)=>earthMoon?(i===3||i===4):comparison?layout.visible[i]:options.view==='inner'?i<=5:true);
      const satelliteLayout=SATELLITES.map(body=>{
        const state=satellites.find(s=>s.id===body.id),parentIndex=BODY_IDS.indexOf(body.parentId),parent=bodyById[body.parentId];
        const visible=!!state&&mode==='ephemeris'&&!comparison&&!earthMoon&&options.view!=='follow'&&visibleBodies[parentIndex];
        const radius=overviewSatelliteRadius(body.radiusKm,parent.radiusKm,radii[parentIndex],spatial);
        const position=state?positions[parentIndex].clone().add(overviewSatelliteOffset(state.position,parent.radiusKm,radii[parentIndex],spatial,parent.id==='saturn'?.03:0)):new THREE.Vector3();
        return {state,parentIndex,parent,visible,radius,position};
      });
      const changedViewSettings=sizeChanged||lastView!==options.view||lastPresentation!==(options.presentation ?? 'spatial')||lastCameraAngle!==cameraAngle||(options.view==='follow'&&lastSelected!==selectedId)||(comparison&&lastComparison!==options.comparisonSet);
      if(changedViewSettings){satelliteFramed=false;userNavigated=false;}
      const changedView=changedViewSettings||(region&&mode==='ephemeris'&&satellites.length===SATELLITES.length&&!satelliteFramed&&!userNavigated);
      if(changedView||!initialized){
        controls.target.set(0,0,0);
        orbitPhase=0;
        camera.fov=spatial&&region?52:43;camera.updateProjectionMatrix();
        camera.up.set(0,1,0);
        if(options.view==='overview')camera.position.set(4,34,51);
        if(options.view==='inner')camera.position.set(.28,2.35,3.3);
        if(options.view==='outer')camera.position.set(4,29,44);
        if(options.view==='earth-moon')camera.position.set(.001,.0044,.0057);
        if(options.view==='overview'||options.view==='outer'||options.view==='inner'){
          const extent=options.view==='inner'?1.9:33;
          const framingDistance=extent/(Math.tan(camera.fov*RAD/2)*Math.min(1,camera.aspect));
          camera.position.normalize().multiplyScalar(framingDistance);
        }
        if(spatial){
          const bounds=new THREE.Box3();
          positions.forEach((position,i)=>{if(visibleBodies[i]){
            const extent=radii[i]*(i===7?2.33:1.08);
            bounds.expandByPoint(position.clone().addScalar(extent));bounds.expandByPoint(position.clone().addScalar(-extent));
          }});
          satelliteLayout.forEach(s=>{if(s.visible){bounds.expandByPoint(s.position.clone().addScalar(s.radius));bounds.expandByPoint(s.position.clone().addScalar(-s.radius));}});
          const center=bounds.getCenter(new THREE.Vector3());
          let direction=new THREE.Vector3(.58,.52,1).normalize();
          if(region&&cameraAngle==='top')direction.set(0,1,.001).normalize();
          if(earthMoon){
            const moonDirection=lunarVector.clone().normalize();
            const solarDirection=sun.clone().sub(earth).normalize();
            direction.copy(solarDirection).addScaledVector(moonDirection,-solarDirection.dot(moonDirection));
            if(direction.lengthSq()<.01)direction.crossVectors(moonDirection,new THREE.Vector3(0,1,0));
            const relativeVelocity=toScene(frame.velocities[12]-frame.velocities[9],frame.velocities[13]-frame.velocities[10],frame.velocities[14]-frame.velocities[11]);
            const normal=lunarVector.clone().cross(relativeVelocity).normalize();
            if(normal.y<0)normal.negate();
            direction.normalize().addScaledVector(normal,.38).normalize();
          }
          const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize();
          const up=direction.clone().cross(right).normalize();
          let fit=0;
          positions.forEach((position,i)=>{if(visibleBodies[i]){
            const delta=position.clone().sub(center), radius=radii[i]*(i===7?2.33:1.08);
            const depth=delta.dot(direction);
            fit=Math.max(fit,depth+(Math.abs(delta.dot(right))+radius)/(Math.tan(camera.fov*RAD/2)*camera.aspect*.84),depth+(Math.abs(delta.dot(up))+radius)/(Math.tan(camera.fov*RAD/2)*.70));
          }});
          satelliteLayout.forEach(s=>{if(s.visible){const delta=s.position.clone().sub(center),depth=delta.dot(direction);fit=Math.max(fit,depth+(Math.abs(delta.dot(right))+s.radius)/(Math.tan(camera.fov*RAD/2)*camera.aspect*.84),depth+(Math.abs(delta.dot(up))+s.radius)/(Math.tan(camera.fov*RAD/2)*.70));}});
          controls.target.copy(center);
          camera.position.copy(center).addScaledVector(direction,fit*(earthMoon?1.02:1.04));
          if(earthMoon)previousPairCenter.copy(center);
        }
        if(options.view==='follow'){
          const radius=BODIES[selectedIndex].radiusKm/AU_KM;
          // A sunward viewpoint opens on the illuminated hemisphere, preserving real illumination.
          const lit=sun.clone().sub(nextOrigin).normalize();
          if(selectedId==='sun')lit.set(1,.3,1).normalize();
          lit.applyAxisAngle(new THREE.Vector3(0,1,0),.85);
          if(selectedId==='saturn'){
            const attitude=new THREE.Quaternion();orientation(BODIES[selectedIndex],frame.time,attitude);
            const pole=new THREE.Vector3(0,1,0).applyQuaternion(attitude);
            lit.addScaledVector(pole,.6).normalize();
          }
          camera.position.copy(lit).multiplyScalar(radius*(selectedId==='saturn'?8.5:selectedId==='sun'?6.1:5.1));
          camera.position.y+=radius*.7;
        }
        if(comparison){
          const fit=Math.max(layout.width/Math.max(.2,camera.aspect),layout.height*1.55)/(2*Math.tan(camera.fov*RAD/2));
          camera.position.set(0,layout.height*.12,fit*1.32);
        }
        initialized=true;if(satellites.length===SATELLITES.length)satelliteFramed=true;
      }
      if(spatial&&earthMoon&&!changedView){
        const bounds=new THREE.Box3();
        [3,4].forEach(i=>{bounds.expandByPoint(positions[i].clone().addScalar(radii[i]*1.08));bounds.expandByPoint(positions[i].clone().addScalar(-radii[i]*1.08));});
        const center=bounds.getCenter(new THREE.Vector3()),delta=center.clone().sub(previousPairCenter);
        camera.position.add(delta);controls.target.add(delta);previousPairCenter.copy(center);
      }
      origin.copy(nextOrigin);
      if(spatial&&region&&cameraAngle==='perspective'&&options.cameraOrbit){
        const nextPhase=orbitPhase+visualDelta*.14;
        const angle=(Math.sin(nextPhase)-Math.sin(orbitPhase))*.20;
        camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(controls.target);
        orbitPhase=nextPhase;
      }
      controls.update();
      const relativeSun=sun.clone().sub(origin);
      const near=options.view==='follow'||options.view==='earth-moon'||comparison;
      const distance=camera.position.distanceTo(controls.target);
      controls.minDistance=options.view==='follow'?BODIES[selectedIndex].radiusKm/AU_KM*1.15:1e-7;
      if(options.view==='follow'||comparison||spatial)camera.setViewOffset(width,height,0,-height*(spatial?.085:.055),width,height);else camera.clearViewOffset();
      camera.near=Math.max(1e-10,Math.min(distance*1e-5,.00001));
      camera.updateProjectionMatrix();
      if(!Number.isFinite(lastOrbit)||Math.abs(frame.time-lastOrbit)>3600||changedView||lastMode!==mode){
        orbitLines.forEach((line,i)=>{
          let points=referenceOrbit(frame,i);
          if(spatial)points=points.map(p=>i===4?p.multiplyScalar(lunarScale):earthMoon?p:mapSolarVector(p));
          line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(points);
        });lastOrbit=frame.time;
      }
      if(changedView||lastMode!==mode||!Number.isFinite(lastTime)||frame.time<lastTime||Math.abs(frame.time-lastTime)>86400*7){
        histories.forEach(h=>h.length=0);lastHistory=NaN;
      }
      if(!Number.isFinite(lastHistory)||Math.abs(frame.time-lastHistory)>=1800){
        BODIES.forEach((_,i)=>{
          histories[i].push(spatial?positions[i].clone():earthMoon?actualPositions[i].clone().sub(earth):bodyPosition(frame,i));if(histories[i].length>720)histories[i].shift();
          historyLines[i].geometry.dispose();historyLines[i].geometry=new THREE.BufferGeometry().setFromPoints(histories[i]);
        });lastHistory=frame.time;
      }
      const desiredLabels:{i:number,x:number,y:number,visible:boolean,anchorX:number,anchorY:number}[]=[];
      const bodyAvoidance:{x:number,y:number,r:number}[]=[];
      const comparisonIndices=layout.visible.flatMap((shown,i)=>shown?[i]:[]);
      BODIES.forEach((body,i)=>{
        const pos=positions[i],group=groups[i];group.position.copy(pos);
        const withinRegion=visibleBodies[i];
        group.visible=withinRegion;
        const radius=radii[i];
        // Fixed world-space sizes: approaching a body really changes its apparent size.
        const displayRadius=radius;
        group.scale.setScalar(displayRadius);
        orientation(body,frame.time,group.quaternion);
        if(body.id==='earth'){
          const surface=(group.children[0] as THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>).material;
          surface.uniforms.earthWorldToLocal.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(group.quaternion).invert());
          surface.uniforms.showCloudShadows.value=options.earthClouds===false?0:1;
          group.getObjectByName('earth-clouds')!.visible=options.earthClouds!==false;
          group.getObjectByName('earth-atmosphere')!.visible=options.earthAtmosphere!==false;
        }
        group.children.forEach(child=>{
          const material=(child as THREE.Mesh).material as THREE.ShaderMaterial;
          if(material?.uniforms?.sunDirection){if(comparison)material.uniforms.sunDirection.value.set(-.7,.6,1).normalize();else material.uniforms.sunDirection.value.copy(sun).sub(actualPositions[i]).normalize();}
          if(material?.uniforms?.visualTime)material.uniforms.visualTime.value=(performance.now()-visualStart)/1000;
          if(material?.uniforms?.ambientLevel)material.uniforms.ambientLevel.value=spatial?.07:.014;
          if(material?.uniforms?.presentationLight)material.uniforms.presentationLight.value=spatial?1:0;
          if(material?.uniforms?.bodyCenter){material.uniforms.bodyCenter.value.copy(pos);material.uniforms.bodyRadius.value=displayRadius;}
        });
        const parent=i===4?3:0;
        orbitLines[i].position.copy(spatial?positions[parent]:bodyPosition(frame,parent).sub(origin));
        orbitLines[i].visible=withinRegion&&!comparison&&options.trajectories&&i!==0&&(options.view!=='earth-moon'||i===4)&&options.view!=='follow';
        (orbitLines[i].material as THREE.LineBasicMaterial).opacity=spatial?(i===selectedIndex?.55:.34):i===selectedIndex?.37:.13;
        updateOrbitMaterial(orbitLines[i].material,distance,spatial);
        if(spatial||earthMoon)historyLines[i].position.set(0,0,0);else historyLines[i].position.copy(origin).negate();
        historyLines[i].visible=withinRegion&&!comparison&&options.trajectories&&histories[i].length>1&&options.view!=='follow'&&(options.view!=='earth-moon'||i===3||i===4);
        const velocity=toScene(frame.velocities[i*3],frame.velocities[i*3+1],frame.velocities[i*3+2]);
        const parentVelocity=toScene(frame.velocities[parent*3],frame.velocities[parent*3+1],frame.velocities[parent*3+2]);
        if(i!==0)velocity.sub(parentVelocity);
        const arrow=arrowMaterials[i];arrow.visible=withinRegion&&!comparison&&options.velocityVectors&&(i===selectedIndex||!near)&&velocity.length()>0;
        arrow.position.copy(pos);arrow.setDirection(velocity.clone().normalize());
        const arrowLength=Math.max(displayRadius*2,distance*.065);arrow.setLength(arrowLength,arrowLength*.18,arrowLength*.075);
        projected.copy(pos).project(camera);
        const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;
        let visible=withinRegion&&projected.z>-1&&projected.z<1&&x>12&&x<width-12&&y>24&&y<height-20;
        if(i===4&&!near&&distance>1&&selectedId!=='moon'&&options.view!=='overview'&&options.view!=='inner')visible=false;
        if(!spatial&&region){
          if(options.view==='overview'&&i===4&&selectedId!=='moon')visible=false;
          if(options.view==='inner'&&i===4&&selectedId!=='moon')visible=false;
          if(options.view==='outer'&&i>0&&i<6)visible=false;
        }
        if(options.view==='follow')visible=false;
        if(options.view==='earth-moon'&&i!==3&&i!==4)visible=false;
        if(comparison)visible=visible&&layout.visible[i];
        const offset=i===selectedIndex?16:12;
        const apparentRadius=spatial?radius*height/(2*camera.position.distanceTo(pos)*Math.tan(camera.fov*RAD/2)):0;
        if(spatial&&group.visible&&projected.z>-1&&projected.z<1)bodyAvoidance.push({x,y,r:apparentRadius*(i===7?1.35:1)+5});
        const anchorX=x+apparentRadius*.72,anchorY=y-apparentRadius*.55;
        let labelY=y-10;
        if(spatial)labelY=anchorY-10;
        if(comparison){projected.set(pos.x,pos.y-radius*1.08,pos.z).project(camera);labelY=(-projected.y*.5+.5)*height+15;}
        const comparisonRank=comparisonIndices.indexOf(i);
        desiredLabels.push({i,
          x:comparison?14+Math.max(0,comparisonRank)*(width-82)/Math.max(1,comparisonIndices.length-1):Math.min(width-95,Math.max(12,x>width*.75?x-apparentRadius*.75-85:anchorX+offset)),
          y:comparison?Math.min(height-88,height*.79)+(width<580?Math.max(0,comparisonRank)%2*24:0):Math.min(height-100,Math.max(130,labelY)),
          visible,anchorX:spatial?anchorX:x,anchorY:spatial?anchorY:y});
      });
      satelliteLayout.forEach((layout,i)=>{
        const group=satelliteGroups[i],line=satelliteOrbits[i];
        group.visible=layout.visible;line.visible=layout.visible&&options.trajectories&&options.view!=='follow';
        if(!layout.state)line.userData.waiting=true;
        if(layout.visible&&layout.state){
          satelliteLights[i].direction.copy(sun).sub(actualPositions[layout.parentIndex]).sub(toScene(...layout.state.position)).normalize();
          group.position.copy(layout.position);group.scale.setScalar(layout.radius);
          const localX=new THREE.Vector3(...layout.state.position).normalize().negate();
          const localY=new THREE.Vector3().crossVectors(new THREE.Vector3(...layout.state.position),new THREE.Vector3(...layout.state.velocity)).normalize();
          const localZ=new THREE.Vector3().crossVectors(localX,localY).normalize();
          const sceneAxis=(v:THREE.Vector3)=>v.set(v.x,v.z,-v.y);
          group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(sceneAxis(localX),sceneAxis(localY),sceneAxis(localZ)));
          line.position.copy(positions[layout.parentIndex]);
          if(changedView||lastMode!==mode||line.userData.waiting||!Number.isFinite(line.userData.epoch)||Math.abs(frame.time-line.userData.epoch)>300){
            // The shared orbital helper returns scene axes in units of 20,000 km.
            const points=satelliteOrbitPoints(layout.state,layout.parent,true).map(p=>overviewSatelliteOffset([p.x*20000,-p.z*20000,p.y*20000],layout.parent.radiusKm,radii[layout.parentIndex],spatial,layout.parent.id==='saturn'?.03:0));
            line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(points);
            line.userData.epoch=frame.time;line.userData.waiting=false;
          }
        }
        projected.copy(layout.position).project(camera);
        const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;
        const apparentRadius=layout.radius*height/(2*Math.max(layout.radius,camera.position.distanceTo(layout.position))*Math.tan(camera.fov*RAD/2));
        let visible=layout.visible&&projected.z>-1&&projected.z<1&&x>12&&x<width-12&&y>24&&y<height-65;
        // All moons remain rendered. Names expand with the selected family or a
        // closer camera, so a global view is not covered by crossing satellite labels.
        if(!spatial&&region)visible=false;
        if(spatial&&selectedId!==layout.parent.id&&apparentRadius<8)visible=false;
        // An occulted moon is still part of the system, but its label must not appear on the foreground planet.
        if(visible){
          const sight=layout.position.clone().sub(camera.position),parentVector=positions[layout.parentIndex].clone().sub(camera.position);
          const t=parentVector.dot(sight)/sight.lengthSq();
          if(t>0&&t<1&&parentVector.addScaledVector(sight,-t).length()<radii[layout.parentIndex])visible=false;
        }
        if(visible)bodyAvoidance.push({x,y,r:apparentRadius+4});
        desiredLabels.push({i:BODIES.length+i,x:Math.min(width-105,Math.max(12,x+apparentRadius+10)),y:Math.min(height-90,Math.max(170,y-8)),visible,anchorX:x+apparentRadius*.6,anchorY:y-apparentRadius*.5});
      });
      // Resolve label overlaps without changing physical positions or projection anchors.
      const occupied:{x:number,y:number}[]=[];
      const sceneBounds=element.getBoundingClientRect();
      const reserved=Array.from(element.parentElement?.querySelectorAll('.view-controls,.overview-members,.scene-top,.view-switcher,.presentation-controls,.scale-navigator,.solar-region-label')??[]).map(panel=>{
        const rect=panel.getBoundingClientRect();return {x:rect.left-sceneBounds.left,y:rect.top-sceneBounds.top,w:rect.width,h:rect.height};
      }).filter(rect=>rect.w>0&&rect.h>0);
      desiredLabels.sort((a,b)=>(a.i===selectedIndex?-1:b.i===selectedIndex?1:a.y-b.y));
      desiredLabels.forEach(label=>{
        const button=labels.current[label.i],leader=leaders.current[label.i];if(!button||!leader)return;
        if(label.visible&&!comparison){
          const minY=spatial?Math.min(240,height*.46):130,maxY=Math.max(minY,height-72);
          const candidates:{x:number,y:number,cost:number}[]=[];
          for(let dx=-3;dx<=3;dx++)for(let dy=-9;dy<=9;dy++){
            const x=Math.min(width-110,Math.max(12,label.x+dx*108));
            const y=Math.min(maxY,Math.max(minY,label.y+dy*29));
            candidates.push({x,y,cost:(x-label.x)**2+(y-label.y)**2});
          }
          candidates.sort((a,b)=>a.cost-b.cost);
          const freeOfLabels=(p:{x:number,y:number})=>!occupied.some(q=>Math.abs(p.x-q.x)<100&&Math.abs(p.y-q.y)<27);
          const freeOfPanels=(p:{x:number,y:number})=>!reserved.some(r=>p.x<r.x+r.w+5&&p.x+100>r.x-5&&p.y<r.y+r.h+4&&p.y+22>r.y-4);
          const freeOfBodies=(p:{x:number,y:number})=>!bodyAvoidance.some(b=>{
            const dx=Math.max(p.x-b.x,0,b.x-p.x-92),dy=Math.max(p.y-b.y,0,b.y-p.y-20);
            return dx*dx+dy*dy<b.r*b.r;
          });
          const candidate=candidates.find(p=>freeOfLabels(p)&&freeOfBodies(p)&&freeOfPanels(p))??candidates.find(p=>freeOfLabels(p)&&freeOfPanels(p));
          if(candidate){label.x=candidate.x;label.y=candidate.y;occupied.push({x:label.x,y:label.y});}else label.visible=false;
        }
        button.style.display=label.visible?'flex':'none';button.style.left=`${label.x}px`;button.style.top=`${label.y}px`;
        leader.style.display=label.visible?'block':'none';
        leader.setAttribute('x1',String(label.anchorX));leader.setAttribute('y1',String(label.anchorY));
        leader.setAttribute('x2',String(label.x+(comparison?20:0)));leader.setAttribute('y2',String(label.y+9));
        leader.setAttribute('stroke',LABEL_BODIES[label.i].color);
      });
      if(changedView){
        [asteroidBelt,kuiperBelt].forEach((belt,index)=>{
          const source=originalBeltPositions[index],attribute=belt.geometry.getAttribute('position') as THREE.BufferAttribute;
          for(let i=0;i<attribute.count;i++){
            const point=new THREE.Vector3(source[i*3],source[i*3+1],source[i*3+2]);if(spatial)mapSolarVector(point);
            attribute.setXYZ(i,point.x,point.y,point.z);
          }attribute.needsUpdate=true;belt.geometry.computeBoundingSphere();
        });
      }
      if(spatial){asteroidBelt.position.set(0,0,0);kuiperBelt.position.set(0,0,0);}else{asteroidBelt.position.copy(relativeSun);kuiperBelt.position.copy(relativeSun);}
      asteroidBelt.visible=options.belts&&!near;kuiperBelt.visible=options.belts&&!near&&distance>10;
      asteroidBelt.material.uniforms.uDistance.value=distance;kuiperBelt.material.uniforms.uDistance.value=distance;
      // Compressed distances and enlarged spheres can visually intersect the schematic belts.
      // Fade those illustrative particles near displayed surfaces so the solid globes stay legible.
      [asteroidBelt,kuiperBelt].forEach(belt=>{
        belt.material.uniforms.uEnhanced.value=spatial?1:0;
        positions.forEach((pos,i)=>{belt.material.uniforms.uBodyPositions.value[i].copy(pos);belt.material.uniforms.uBodyRadii.value[i]=visibleBodies[i]?radii[i]:0;});
      });
      [asteroidBelt,kuiperBelt].forEach((belt,i)=>{
        const label=regionLabels.current[i];if(!label)return;
        const radius=i===0?2.7:42,angle=i===0?-2.3:-1.05;
        const point=new THREE.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius);
        if(spatial)mapSolarVector(point);point.add(belt.position);point.project(camera);
        const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;
        label.style.display=belt.visible&&region&&point.z>-1&&point.z<1&&x>12&&x<width-130&&y>210&&y<height-80?'flex':'none';
        label.style.left=`${x}px`;label.style.top=`${y}px`;
      });
      plane.position.copy(spatial?new THREE.Vector3():relativeSun);plane.scale.setScalar(spatial?mapOrbitalDistance(55,orbitalView)/55:1);plane.visible=options.referencePlane&&!near;
      axes.visible=options.referencePlane&&!comparison;axes.position.set(0,0,0);axes.scale.setScalar(near?distance*.1:1);
      updateObservatoryBackdrop(stars,camera,spatial,(performance.now()-visualStart)/1000);
      satelliteAmbient.intensity=spatial?.8:.19;
      solarHalo.visible=spatial&&!earthMoon;
      solarHalo.position.copy(positions[0]);solarHalo.scale.setScalar(radii[0]*8);
      solarHalo.quaternion.copy(camera.quaternion);
      updateSunAtmosphere(solarAtmosphere,(performance.now()-visualStart)/1000);
      if(scale.current){
        const kmPerPixel=2*distance*Math.tan(camera.fov*RAD/2)*AU_KM/height;
        const span=kmPerPixel*80;
        scale.current.textContent=span>AU_KM*.1?`${(span/AU_KM).toFixed(2)} AU`:span>100000?`${(span/10000).toFixed(1)} 万 km`:`${Math.round(span).toLocaleString()} km`;
      }
      renderer.render(scene,camera);
      if(!lastMode)latest.current.onReady?.();
      lastView=options.view;lastSelected=selectedId;lastTime=frame.time;lastMode=mode;
      lastComparison=options.comparisonSet ?? 'planets';
      lastPresentation=options.presentation ?? 'spatial';
      lastCameraAngle=cameraAngle;
      sizeChanged=false;
    };
    animate();
    return ()=>{
      disposed=true;cancelAnimationFrame(raf);resize.disconnect();controls.removeEventListener('start',markNavigation);controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onClick);renderer.domElement.removeEventListener('webglcontextlost',lost);
      scene.traverse(object=>{
        if(object instanceof THREE.Mesh||object instanceof THREE.Line||object instanceof THREE.Points){
          object.geometry?.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];
          materials.forEach(material=>{
            if(material instanceof THREE.ShaderMaterial){material.userData.disposed=true;Object.values(material.uniforms).forEach(uniform=>{if(uniform.value instanceof THREE.Texture)uniform.value.dispose();});}
            material.dispose();
          });
        }
      });renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
  },[]);

  const spatialPresentation=(props.options.presentation ?? 'spatial')==='spatial'&&['overview','inner','outer','earth-moon'].includes(props.options.view);
  return <div className={`solar-viewport ${props.options.view==='comparison'?'comparison-viewport':''} ${spatialPresentation?'spatial-viewport':''}`} ref={host} data-testid="solar-viewport">
    <svg className="solar-leaders" aria-hidden="true">{LABEL_BODIES.map((body,i)=><line key={body.id} ref={node=>{leaders.current[i]=node;}} strokeWidth=".6" opacity={i<BODIES.length?'.48':'.25'} />)}</svg>
    <div className="solar-labels">{LABEL_BODIES.map((body,i)=><button key={body.id} ref={node=>{labels.current[i]=node;}} onClick={()=>i<BODIES.length?props.onSelect(body.id as BodyId):props.onSelectSatellite?.(body.id)} className={`solar-label ${i>=BODIES.length?'solar-moon-label ':''}${props.selectedId===body.id?'is-selected':''}`} style={{'--body-color':body.color} as React.CSSProperties} aria-label={`选择${body.name}`}>
      <span className="solar-label-dot" /><span>{body.name}</span><small>{body.englishName.toUpperCase()}</small>
      {i<BODIES.length&&props.mode==='ephemeris'&&props.options.view==='overview'&&(FAMILY_COUNTS[body.id as BodyId]??0)>0&&<span className="solar-family-count" title="本观测站已接入历表的卫星样本，不表示该行星的卫星总数">已接入 {FAMILY_COUNTS[body.id as BodyId]} 颗</span>}
    </button>)}{(['asteroid','kuiper'] as const).map((region,i)=><button className="solar-region-label" key={region} ref={node=>{regionLabels.current[i]=node;}} onClick={()=>props.onExploreRegion?.(region)} aria-label={i===0?'了解小行星带成员':'了解柯伊伯带成员'}><i/><span>{i===0?'小行星主带':'柯伊伯带'}<small>区域示意 · 探索成员 ↗</small></span></button>)}</div>
    {props.options.scale&&!spatialPresentation&&<div className="solar-scale"><i/><span ref={scale}>1 AU</span><small>中心深度处 · 近似视野标尺</small></div>}
    <div className="solar-coordinate"><span className="solar-axis">3D</span> {props.options.view==='comparison'?'真实直径 · 对比陈列':spatialPresentation&&props.options.view==='overview'?'点行星展开卫星名称 · 滚轮靠近':spatialPresentation?'真实方位 · 空间展示':'黄道坐标系 J2000'}</div>
    <div className="solar-caption">{props.options.view==='comparison'?'统一半径比例 · 排列与照明为示意 · 拖动旋转 / 滚轮缩放':props.options.view==='follow'?'拖动环绕球体 · 滚轮靠近 · 贴图非实时影像':props.options.trajectories?'细线：瞬时参考轨道 · 亮线：已运行轨迹':'拖动环绕系统 · 滚轮向球体靠近'}{props.options.velocityVectors&&props.options.view!=='comparison'?' · 箭头示意真实速度方向':''}<br />{props.selectedId==='sun'&&props.options.view==='follow'?'太阳为等离子体 · 日冕 / 日珥动态为增强示意':props.options.view==='comparison'?'所有球体使用真实平均半径比':spatialPresentation?props.options.view==='earth-moon'?'地月大小比真实 · 间距缩短展示':'轨道距离压缩 · 球体大小层次增强':'距离与天体半径均为真实比例'} · 背景星空为示意{props.options.belts&&['overview','inner','outer'].includes(props.options.view)&&<><br/>带区为随机区域示意点 · 无逐体轨道 · 点数不代表实际数量</>}</div>
    {error&&<div className="solar-error" role="alert"><strong>3D 场景暂不可用</strong><p>{error}</p></div>}
  </div>;
}

