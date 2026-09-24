import {NEAR_EARTH_LAYERS,NEAR_EARTH_SOURCES,type NearEarthLayer} from '../data/nearEarth';
import {makeNearEarthRegion} from './nearEarthRegions';
import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {publicAsset} from '../data/publicAsset';
import {ENVIRONMENT_LAYERS,ENVIRONMENT_SOURCES,defaultEnvironmentLayers,filterEnvironmentLayers,environmentRadius,windPoint,type EnvironmentLayers} from '../data/spaceEnvironment';
import './SpaceEnvironment.css';

type View='overview'|'side'|'polar'|'inner';
interface CanvasOptions {layers:EnvironmentLayers;playing:boolean;view:View;reset:number;labels:boolean;cutaway:boolean}
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
  const groups={shock:shell(true),boundary:shell(false),field:fields(),aurora:aurora(),wind:new THREE.Group(),innerBelt:makeNearEarthRegion('innerBelt'),outerBelt:makeNearEarthRegion('outerBelt'),plasmasphere:makeNearEarthRegion('plasmasphere')};Object.values(groups).forEach(g=>scene.add(g));
  const windPositions=new Float32Array(180*3),windGeometry=new THREE.BufferGeometry();windGeometry.setAttribute('position',new THREE.BufferAttribute(windPositions,3));
  const windMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=3.5;gl_Position=projectionMatrix*p;}',fragmentShader:'void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(1.,.7,.35,(1.-d*2.)*.8);}'});
  groups.wind.add(new THREE.Points(windGeometry,windMaterial));
  for(const y of [-5,0,5])groups.wind.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-12,y,0),2.3,'#f4b56d',.4,.2));
  const anchors=[{text:'内辐射带',point:new THREE.Vector3(-1.7,.8,0),layer:'innerBelt'},{text:'外辐射带',point:new THREE.Vector3(3.5,1.5,-.7),layer:'outerBelt'},{text:'等离子体层',point:new THREE.Vector3(-1.8,-1.3,0),layer:'plasmasphere'},{text:'太阳方向 ←',point:new THREE.Vector3(-11,7,0),layer:'wind'},{text:'弓形激波',point:new THREE.Vector3(-7.3,3,0),layer:'shock'},{text:'磁层顶',point:new THREE.Vector3(-3.7,4.6,0),layer:'boundary'},{text:'磁尾 → 继续延伸',point:new THREE.Vector3(17,5.6,0),layer:'boundary'},{text:'地球',point:new THREE.Vector3(0,-1.4,0),layer:null}].map(a=>{const label=document.createElement('span');label.className='environment-label';label.textContent=a.text;element.appendChild(label);return {...a,label};});
  let width=1,height=1,lastView='',lastReset=-1,raf=0,previous=performance.now(),phase=0;
  const resize=()=>{width=element.clientWidth;height=element.clientHeight;renderer.setSize(width,height);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();lastView='';};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const draw=(now:number)=>{
   raf=requestAnimationFrame(draw);const current=latest.current,delta=Math.min((now-previous)/1000,.1);previous=now;if(current.playing)phase+=delta*.035;
   if(lastView!==current.view||lastReset!==current.reset){controls.enableDamping=false;controls.update();controls.target.set(current.view==='polar'||current.view==='inner'?0:4,0,0);const distance=Math.max(49,49/camera.aspect);if(current.view==='inner'){const scale=Math.max(1,1/camera.aspect);camera.position.set(8*scale,6*scale,11*scale);}else if(current.view==='polar')camera.position.set(-1.8,3.4,2.4);else if(current.view==='side')camera.position.set(4,0,distance);else camera.position.set(-4,distance*.42,distance*.84);controls.update();controls.enableDamping=true;lastView=current.view;lastReset=current.reset;}
   for(const key of Object.keys(groups) as (keyof typeof groups)[])groups[key].visible=current.layers[key];
   for(const id of ['innerBelt','outerBelt','plasmasphere'] as NearEarthLayer[])groups[id].userData.cutaway.value=current.cutaway;
   for(let i=0;i<180;i++){const p=windPoint((i*.61803398875+phase)%1,i*2.399963,(i%17)/17*7+.5);windPositions.set(p,i*3);}windGeometry.attributes.position.needsUpdate=true;
   controls.update();for(const a of anchors){const p=a.point.clone().project(camera);a.label.style.display=current.labels&&(!a.layer||current.layers[a.layer as keyof EnvironmentLayers])&&p.z>-1&&p.z<1&&Math.abs(p.x)<.92&&Math.abs(p.y)<.9?'block':'none';a.label.style.left=`${(p.x*.5+.5)*width}px`;a.label.style.top=`${(-p.y*.5+.5)*height}px`;}
   renderer.render(scene,camera);
  };raf=requestAnimationFrame(draw);
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Points){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if('map'in m)(m.map as THREE.Texture|null)?.dispose();m.dispose();}}});renderer.dispose();renderer.domElement.remove();anchors.forEach(a=>a.label.remove());};
 },[]);
 return <div className="environment-canvas" ref={host}>{error&&<p className="environment-error" role="status">{error}</p>}</div>;
}
export function SpaceEnvironment({onClose,onOpenStages,onEarth,outerEnabled,innerEnabled,focusRequest=0,initialView='overview'}:{onClose:()=>void;onOpenStages:()=>void;onEarth:()=>void;outerEnabled:boolean;innerEnabled:boolean;focusRequest?:number;initialView?:'overview'|'inner'}){
 const [layers,setLayers]=useState(defaultEnvironmentLayers),[view,setView]=useState<View>(initialView),[reset,setReset]=useState(0),[labels,setLabels]=useState(true),[cutaway,setCutaway]=useState(true);
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),root=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{setView(initialView);setReset(n=>n+1);},[initialView,focusRequest]);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus();else document.querySelector<HTMLElement>('.app-header [aria-label="阶段导览"]')?.focus();};},[]);
 const activeView=!outerEnabled&&view!=='inner'?'inner':!innerEnabled&&view==='inner'?'overview':view;
 const effectiveLayers=filterEnvironmentLayers(layers,outerEnabled,innerEnabled);
 const shownLayers=[...(innerEnabled?NEAR_EARTH_LAYERS:[]),...(outerEnabled?ENVIRONMENT_LAYERS:[])];
 const innerView=activeView==='inner';
 const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){const items=[...root.current!.querySelectorAll<HTMLElement>('button,input,a,summary')].filter(x=>x.getClientRects().length&&(!x.closest('details:not([open])')||x.matches('summary')));if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}};
 return <section ref={root} className="space-environment" role="dialog" aria-modal="true" aria-labelledby="environment-title" onKeyDown={key}>
  <header><div><span>{innerView?'06 / PARTICLE POPULATIONS':'05 / EARTH’S SPACE ENVIRONMENT'}</span><h1 id="environment-title">{innerView?'地球周围，不同粒子聚集在哪里？':'地球之外，还有看不见的空间结构'}</h1><p>{innerView?'内辐射带 · 外辐射带 · 等离子体层':'太阳风 → 弓形激波 → 磁层与磁尾 → 极光'}</p></div><nav><button onClick={onOpenStages}>阶段导览</button><button ref={close} onClick={onClose}>返回原观测</button></nav></header>
  <div className="environment-layout"><div className="environment-stage">
   <EnvironmentCanvas layers={effectiveLayers} playing={playing&&effectiveLayers.wind} view={activeView} reset={reset} labels={labels} cutaway={cutaway}/>
   <div className="environment-badge">原理示意 · 非当天实测 · 非等比例{innerEnabled&&cutaway?' · 切去四分之一便于观察':''}</div>
   <div className="environment-views" aria-label="近地空间观察角度">{([['overview','立体总览'],['side','侧面看磁尾'],['polar','靠近看极光'],['inner','近地粒子区域']] as const).filter(([id])=>id==='inner'?innerEnabled:outerEnabled).map(([id,title])=><button key={id} aria-pressed={activeView===id} onClick={()=>{setView(id);setReset(n=>n+1);}}>{title}</button>)}<button onClick={()=>setReset(n=>n+1)}>复位镜头</button></div>
   <p className="environment-caption">拖动旋转 · 滚轮缩放<br/>{innerView?'点云是粒子群的分布示意，不是逐粒子轨迹。切口为教学剖示，真实区域没有这个缺口。':'地球放大、磁尾截短；太阳在画面外。磁轴与贴图方位为示意，光带不是实测极光范围。'}</p>
  </div><aside>
   <h2>{innerView?'看的是空间区域，不是固体环':'先看形状，再看每一层'}</h2>
   <p>{innerView?'辐射带与等离子体层都含带电粒子，但粒子的能量、密度和来源不同。它们具有纵向厚度，范围也可能重叠，不能理解成围绕地球铺开的三条平面轨道。':'磁层是一个受太阳风影响的三维区域：迎风一侧受压，背后拖出长尾。它既不是平面圆环，也不是包住地球的硬球壳。'}</p>
   <div className="environment-controls">{outerEnabled&&<button disabled={!layers.wind} aria-pressed={playing&&layers.wind} onClick={()=>setPlaying(v=>!v)}>{!layers.wind?'太阳风已隐藏':playing?'暂停太阳风示意':'播放太阳风示意'}</button>}<button aria-pressed={labels} onClick={()=>setLabels(v=>!v)}>{labels?'隐藏结构名称':'显示结构名称'}</button>{innerEnabled&&<button aria-pressed={cutaway} onClick={()=>setCutaway(v=>!v)}>{cutaway?'恢复完整区域':'切开看内部'}</button>}</div>
   <p className="environment-note">{innerView?'第六批点云为静态结构，点数、颜色与透明度不表示真实粒子数量、能量或辐射剂量。':'本页太阳风动画有独立节奏。'} 不改变主页的日期、倍率和播放设置；主页原先若在播放，时间会继续推进。</p>
   <div className="environment-layers">{shownLayers.map(layer=><label key={layer.id}><span><input type="checkbox" checked={layers[layer.id]} onChange={e=>setLayers(v=>({...v,[layer.id]:e.target.checked}))}/><i style={{background:layer.color}}/><strong>{layer.name}</strong></span><p>{layer.description}</p></label>)}</div>
   {innerEnabled&&<section className="environment-facts"><h3>三个容易混淆的概念</h3><table className="environment-comparison"><thead><tr><th>结构</th><th>主要含义</th></tr></thead><tbody><tr><td>磁层</td><td>受地球磁场影响的空间区域</td></tr><tr><td>辐射带</td><td>其中高能粒子聚集的区域</td></tr><tr><td>等离子体层</td><td>较冷、较稠密的低能粒子群</td></tr></tbody></table><p>“冷”是相对粒子能量而言，不意味着它像日常冷空气。边界随空间环境、粒子种类和能量变化；示意空隙不是航天安全通道。</p></section>}
   <section className="environment-facts"><h3>真实尺度应该怎样理解？</h3><p>{innerView?'本图只比较空间形态，不采用固定边界公里数。太阳活动和粒子能量不同，观测到的分布范围也可能不同；本版没有辐射通量或剂量计算。':'NASA 给出的向日侧量级约为距地心 6–10 个地球半径；背日侧磁尾可以伸展数百个地球半径。边界会变化，本图不能用来测量距离。'}</p><p>这些彩色点云、线和透明面是帮助理解不可见结构的标记；极光才是高层大气发光的现象。</p><button onClick={onEarth}>进入真实地球近景</button></section>
   <details><summary>数据来源与本版限制</summary><p>核对日期：2026-09-24。此页依据 NASA 科学说明绘制，没有当天的粒子、磁场或极光数据，也不进行磁流体、带电粒子或辐射剂量计算。未包含磁重联、环电流与粒子加速的完整过程。第六批剖示仅为看清内部结构，不代表空间中存在缺口。</p>{[...(innerEnabled?NEAR_EARTH_SOURCES:[]),...(outerEnabled?ENVIRONMENT_SOURCES:[])].map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><small>{source.note}</small></p>)}</details>
  </aside></div>
 </section>;
}
