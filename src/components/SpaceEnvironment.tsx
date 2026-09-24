import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {publicAsset} from '../data/publicAsset';
import {ENVIRONMENT_LAYERS,ENVIRONMENT_SOURCES,defaultEnvironmentLayers,environmentRadius,windPoint,type EnvironmentLayers} from '../data/spaceEnvironment';
import './SpaceEnvironment.css';

type View='overview'|'side'|'polar';
interface CanvasOptions {layers:EnvironmentLayers;playing:boolean;view:View;reset:number;labels:boolean}
function line(points:THREE.Vector3[],color:string,opacity=.55){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));}
function shell(shock:boolean){
 const group=new THREE.Group(),nose=shock?-8:-6,color=shock?'#e9a261':'#66cada';
 const points:THREE.Vector2[]=[];for(let i=0;i<=90;i++){const x=nose+(20-nose)*i/90;points.push(new THREE.Vector2(environmentRadius(x,shock),x));}
 const surface=new THREE.Mesh(new THREE.LatheGeometry(points,64),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:shock?.025:.045,depthWrite:false}));surface.rotation.z=-Math.PI/2;group.add(surface);
 for(let j=0;j<12;j++){const angle=j/12*Math.PI*2,curve=[];for(let i=0;i<=90;i++){const x=nose+(20-nose)*i/90,r=environmentRadius(x,shock);curve.push(new THREE.Vector3(x,r*Math.cos(angle),r*Math.sin(angle)));}group.add(line(curve,color,shock?.27:.42));}
 for(const x of [-3,3,10,19]){const r=environmentRadius(x,shock);group.add(line(Array.from({length:97},(_,i)=>new THREE.Vector3(x,r*Math.cos(i/96*Math.PI*2),r*Math.sin(i/96*Math.PI*2))),color,.16));}
 return group;
}
function fields(){
 const group=new THREE.Group();
 for(const length of [1.8,2.8,4])for(let a=0;a<8;a++){
  const start=Math.asin(Math.sqrt(1/length)),az=a/8*Math.PI*2;
  const points=Array.from({length:100},(_,i)=>{const theta=start+(Math.PI-2*start)*i/99,r=length*Math.sin(theta)**2,x=r*Math.sin(theta)*Math.cos(az);return new THREE.Vector3(x*(x>0?1.4:.85),r*Math.cos(theta),r*Math.sin(theta)*Math.sin(az));});
  group.add(line(points,'#68aebe',.30));
 }
 for(const sign of [-1,1])for(const z of [-2,0,2]){
  const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(.35,sign*.94,z*.1),new THREE.Vector3(4,sign*3.4,z),new THREE.Vector3(12,sign*3.2,z),new THREE.Vector3(20,sign*3,z));group.add(line(curve.getPoints(70),'#8acede',.38));
 }
 return group;
}
function aurora(){
 const group=new THREE.Group();
 for(const sign of [-1,1]){
  const positions:number[]=[],colors:number[]=[],heights:number[]=[],angles:number[]=[],indices:number[]=[];
  for(let i=0;i<=180;i++)for(let j=0;j<2;j++){
   const a=i/180*Math.PI*2,t=.30+.035*Math.sin(a*7),r=j?1.12+.015*Math.sin(a*11):1.025;
   positions.push(r*Math.sin(t)*Math.cos(a),sign*r*Math.cos(t),r*Math.sin(t)*Math.sin(a));
   const color=new THREE.Color(j?'#725fa5':'#65efaa');colors.push(color.r,color.g,color.b);heights.push(j);angles.push(a);
  }
  for(let i=0;i<180;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('curtainHeight',new THREE.Float32BufferAttribute(heights,1));geometry.setAttribute('curtainAngle',new THREE.Float32BufferAttribute(angles,1));geometry.setIndex(indices);
  group.add(new THREE.Mesh(geometry,new THREE.ShaderMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,depthWrite:false,vertexShader:'attribute float curtainHeight;attribute float curtainAngle;varying float h;varying float a;varying vec3 c;void main(){h=curtainHeight;a=curtainAngle;c=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float h;varying float a;varying vec3 c;void main(){float alpha=.65*pow(1.-h,1.4)*(.4+.6*pow(sin(a*75.),2.));gl_FragColor=vec4(c,alpha);}'})));
 }
 return group;
}
function EnvironmentCanvas(options:CanvasOptions){
 const host=useRef<HTMLDivElement>(null),latest=useRef(options);latest.current=options;
 const [error,setError]=useState('');
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError('当前设备无法显示三维场景；右侧介绍与来源仍可阅读。');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#071521',1);element.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','地球磁层三维原理示意，拖动旋转，滚轮缩放');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.01,500),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2.2;controls.maxDistance=100;
  scene.add(new THREE.AmbientLight('#bad9f4',1.2));const sunlight=new THREE.DirectionalLight('#fff2d5',2.5);sunlight.position.set(-12,3,5);scene.add(sunlight);
  const material=new THREE.MeshStandardMaterial({color:'#8bbdd5',roughness:.82}),earth=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),material);scene.add(earth);
  const loader=new THREE.TextureLoader();let disposed=false;
  loader.load(publicAsset('/textures/earth.jpg'),texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;},undefined,()=>{if(!disposed)setError('地球纹理暂未读取，球体和结构图仍可使用。');});
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.035,48,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),2.);gl_FragColor=vec4(.22,.57,.9,a*.55);}'}));scene.add(atmosphere);
  const groups={shock:shell(true),boundary:shell(false),field:fields(),aurora:aurora(),wind:new THREE.Group()};Object.values(groups).forEach(g=>scene.add(g));
  const windPositions=new Float32Array(180*3),windGeometry=new THREE.BufferGeometry();windGeometry.setAttribute('position',new THREE.BufferAttribute(windPositions,3));
  const windMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=3.5;gl_Position=projectionMatrix*p;}',fragmentShader:'void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(1.,.7,.35,(1.-d*2.)*.8);}'});
  groups.wind.add(new THREE.Points(windGeometry,windMaterial));
  for(const y of [-5,0,5])groups.wind.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-12,y,0),2.3,'#f4b56d',.4,.2));
  const anchors=[{text:'太阳方向 ←',point:new THREE.Vector3(-11,7,0),layer:'wind'},{text:'弓形激波',point:new THREE.Vector3(-7.3,3,0),layer:'shock'},{text:'磁层顶',point:new THREE.Vector3(-3.7,4.6,0),layer:'boundary'},{text:'磁尾 → 继续延伸',point:new THREE.Vector3(17,5.6,0),layer:'boundary'},{text:'地球',point:new THREE.Vector3(0,-1.4,0),layer:null}].map(a=>{const label=document.createElement('span');label.className='environment-label';label.textContent=a.text;element.appendChild(label);return {...a,label};});
  let width=1,height=1,lastView='',lastReset=-1,raf=0,previous=performance.now(),phase=0;
  const resize=()=>{width=element.clientWidth;height=element.clientHeight;renderer.setSize(width,height);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();lastView='';};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const draw=(now:number)=>{
   raf=requestAnimationFrame(draw);const current=latest.current,delta=Math.min((now-previous)/1000,.1);previous=now;if(current.playing)phase+=delta*.035;
   if(lastView!==current.view||lastReset!==current.reset){controls.enableDamping=false;controls.update();controls.target.set(current.view==='polar'?0:4,0,0);const distance=Math.max(49,49/camera.aspect);if(current.view==='polar')camera.position.set(-1.8,3.4,2.4);else if(current.view==='side')camera.position.set(4,0,distance);else camera.position.set(-4,distance*.42,distance*.84);controls.update();controls.enableDamping=true;lastView=current.view;lastReset=current.reset;}
   for(const key of Object.keys(groups) as (keyof typeof groups)[])groups[key].visible=current.layers[key];
   for(let i=0;i<180;i++){const p=windPoint((i*.61803398875+phase)%1,i*2.399963,(i%17)/17*7+.5);windPositions.set(p,i*3);}windGeometry.attributes.position.needsUpdate=true;
   controls.update();for(const a of anchors){const p=a.point.clone().project(camera);a.label.style.display=current.labels&&(!a.layer||current.layers[a.layer as keyof EnvironmentLayers])&&p.z>-1&&p.z<1&&Math.abs(p.x)<.92&&Math.abs(p.y)<.9?'block':'none';a.label.style.left=`${(p.x*.5+.5)*width}px`;a.label.style.top=`${(-p.y*.5+.5)*height}px`;}
   renderer.render(scene,camera);
  };raf=requestAnimationFrame(draw);
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Points){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if('map'in m)(m.map as THREE.Texture|null)?.dispose();m.dispose();}}});renderer.dispose();renderer.domElement.remove();anchors.forEach(a=>a.label.remove());};
 },[]);
 return <div className="environment-canvas" ref={host}>{error&&<p className="environment-error" role="status">{error}</p>}</div>;
}
export function SpaceEnvironment({onClose,onOpenStages,onEarth}:{onClose:()=>void;onOpenStages:()=>void;onEarth:()=>void}){
 const [layers,setLayers]=useState(defaultEnvironmentLayers),[view,setView]=useState<View>('overview'),[reset,setReset]=useState(0),[labels,setLabels]=useState(true);
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),root=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus();else document.querySelector<HTMLElement>('.app-header [aria-label="阶段导览"]')?.focus();};},[]);
 const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){const items=[...root.current!.querySelectorAll<HTMLElement>('button,input,a,summary')].filter(x=>x.getClientRects().length&&(!x.closest('details:not([open])')||x.matches('summary')));if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}};
 return <section ref={root} className="space-environment" role="dialog" aria-modal="true" aria-labelledby="environment-title" onKeyDown={key}>
  <header><div><span>05 / EARTH’S SPACE ENVIRONMENT</span><h1 id="environment-title">地球之外，还有看不见的空间结构</h1><p>太阳风 → 弓形激波 → 磁层与磁尾 → 极光</p></div><nav><button onClick={onOpenStages}>阶段导览</button><button ref={close} onClick={onClose}>返回原观测</button></nav></header>
  <div className="environment-layout"><div className="environment-stage"><EnvironmentCanvas layers={layers} playing={playing} view={view} reset={reset} labels={labels}/><div className="environment-badge">原理示意 · 非当天实测 · 非等比例</div><div className="environment-views" aria-label="磁层观察角度">{([['overview','立体总览'],['side','侧面看磁尾'],['polar','靠近看极光']] as const).map(([id,title])=><button key={id} aria-pressed={view===id} onClick={()=>{setView(id);setReset(n=>n+1);}}>{title}</button>)}<button onClick={()=>setReset(n=>n+1)}>复位镜头</button></div><p className="environment-caption">拖动旋转 · 滚轮缩放<br/>地球放大、磁尾截短；太阳在画面外。磁轴与贴图方位为示意，光带不是实测极光范围。</p></div>
  <aside><h2>先看形状，再看每一层</h2><p>磁层是一个受太阳风影响的三维区域：迎风一侧受压，背后拖出长尾。它既不是平面圆环，也不是包住地球的硬球壳。</p><div className="environment-controls"><button aria-pressed={playing} onClick={()=>setPlaying(v=>!v)}>{playing?'暂停太阳风示意':'播放太阳风示意'}</button><button aria-pressed={labels} onClick={()=>setLabels(v=>!v)}>{labels?'隐藏结构名称':'显示结构名称'}</button></div>
  <p className="environment-note">本页动画有独立节奏，不改变主页的日期、倍率和播放设置；主页原先若在播放，时间会继续推进。</p>
  <div className="environment-layers">{ENVIRONMENT_LAYERS.map(layer=><label key={layer.id}><span><input type="checkbox" checked={layers[layer.id]} onChange={e=>setLayers(v=>({...v,[layer.id]:e.target.checked}))}/><i style={{background:layer.color}}/><strong>{layer.name}</strong></span><p>{layer.description}</p></label>)}</div>
  <section className="environment-facts"><h3>真实尺度应该怎样理解？</h3><p>NASA 给出的向日侧量级约为距地心 6–10 个地球半径；背日侧磁尾可以伸展数百个地球半径。边界会变化，本图不能用来测量距离。</p><p>极光是高层大气发光，磁力线本身并不会发光。这里的青色线和透明面，是帮助理解不可见结构的标记。</p><button onClick={onEarth}>进入真实地球近景</button></section>
  <details><summary>数据来源与本版限制</summary><p>核对日期：2026-09-24。此页采用 NASA 科学说明绘制结构，不读取当日太阳风、磁场或极光数据；没有进行磁流体或带电粒子积分。未绘制辐射带、等离子体层、磁重联等完整过程。</p>{ENVIRONMENT_SOURCES.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><small>{source.note}</small></p>)}</details>
  </aside></div>
 </section>;
}
