import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {publicAsset} from '../data/publicAsset';
import {HELIO_LAYERS,HELIO_RADII,HELIO_SOURCES,advanceHelioDemo,defaultHelioLayers,helioWindPoint,neutralPoint,inHelioCut,type HelioLayer,type HelioLayers} from '../data/heliosphere';
import './SpaceEnvironment.css';
import './SolarActivity.css';
import './HeliosphereExplorer.css';

interface CanvasState {layers:HelioLayers;cut:boolean;side:boolean;progress:number;reset:number}
function HelioCanvas(props:CanvasState){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;const [error,setError]=useState('');
 useEffect(()=>{
  const element=host.current;if(!element)return;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError('当前设备无法绘制三维图，分层说明和资料来源仍可阅读。');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor('#091522');renderer.outputColorSpace=THREE.SRGBColorSpace;element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,180),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=10;controls.maxDistance=65;
  const sun=new THREE.Mesh(new THREE.SphereGeometry(.55,40,28),new THREE.MeshBasicMaterial({color:'#ffd095'}));scene.add(sun);let disposed=false;
  new THREE.TextureLoader().load(publicAsset('/textures/sun.jpg'),texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;sun.material.map=texture;sun.material.color.set('white');sun.material.needsUpdate=true;},undefined,()=>{if(!disposed)setError('太阳纹理未读取，保留球体与区域示意。');});
  const shells=(radius:number,color:string)=>{
   const variants=[false,true].map(cut=>{const group=new THREE.Group();
    group.add(new THREE.Mesh(new THREE.SphereGeometry(radius,64,40,cut?Math.PI:0,cut?Math.PI*1.5:Math.PI*2),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.045,depthWrite:false})));
    const start=cut?Math.PI:0,span=cut?Math.PI*1.5:Math.PI*2;
    const curve=(values:THREE.Vector3[])=>group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(values),new THREE.LineBasicMaterial({color,transparent:true,opacity:.24,depthWrite:false})));
    for(let j=1;j<8;j++){const theta=j*Math.PI/8;curve(Array.from({length:97},(_,i)=>{const phi=start+span*i/96;return new THREE.Vector3(-radius*Math.cos(phi)*Math.sin(theta),radius*Math.cos(theta),radius*Math.sin(phi)*Math.sin(theta));}));}
    for(let j=0;j<=(cut?9:12);j++){const phi=start+span*j/(cut?9:12);curve(Array.from({length:65},(_,i)=>{const theta=i*Math.PI/64;return new THREE.Vector3(-radius*Math.cos(phi)*Math.sin(theta),radius*Math.cos(theta),radius*Math.sin(phi)*Math.sin(theta));}));}
    scene.add(group);return group;
   });return variants;
  };
  const shock=shells(HELIO_RADII.shock,'#eeb78a'),pause=shells(HELIO_RADII.pause,'#80cbdc');
  const points=(positions:number[]|Float32Array,color:string,size:number,canCut=false)=>{
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:new THREE.Color(color)},size:{value:size},cut:{value:0}},vertexShader:'uniform float size;varying vec3 p;void main(){p=position;gl_PointSize=size;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 color;uniform float cut;varying vec3 p;void main(){if(cut>0.5&&p.x>0.&&p.z>0.)discard;float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(color,(1.-2.*d)*.85);}'});
   const object=new THREE.Points(geometry,material);object.userData.canCut=canCut;object.frustumCulled=false;scene.add(object);return object;
  };
  let seed=91642;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const region=(count:number,lo:number,hi:number)=>{const values:number[]=[];for(let i=0;i<count;i++){const y=2*random()-1,a=random()*Math.PI*2,r=Math.cbrt(lo**3+random()*(hi**3-lo**3)),rad=Math.sqrt(1-y*y);values.push(r*rad*Math.cos(a),r*y,r*rad*Math.sin(a));}return values;};
  const sheath=points(region(1300,5.5,7.9),'#b8a2dc',3,true),medium=points(region(750,8.5,12),'#94aecf',2.5),wind=points(new Float32Array(240*3),'#f4c27c',4),neutrals=points(new Float32Array(75*3),'#a8ebc7',5);
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-11,-5,0),4,'#a8ebc7',.6,.3);scene.add(arrow);
  const labelData:[string,HelioLayer|null,THREE.Vector3][]=[['太阳 · 放大',null,new THREE.Vector3(0,-1,0)],['终止激波','shock',new THREE.Vector3(-4.8,2.5,0)],['日球层顶','pause',new THREE.Vector3(5,6.2,0)],['日鞘 · 区域示意','sheath',new THREE.Vector3(-5,-4,0)],['外部星际介质','medium',new THREE.Vector3(-8,8,0)],['中性原子示意方向','neutrals',new THREE.Vector3(-9,-8,0)]];
  const labels=labelData.map(([text,layer,point])=>{const elementLabel=document.createElement('span');elementLabel.className='environment-label';elementLabel.textContent=text;element.appendChild(elementLabel);return {elementLabel,layer,point};});
  let width=1,height=1,raf=0,lastView='';
  const resize=()=>{width=element.clientWidth;height=element.clientHeight;camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();renderer.setSize(width,height);lastView='';};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const draw=()=>{raf=requestAnimationFrame(draw);const c=latest.current,key=`${c.side}/${c.reset}`;
   if(key!==lastView){controls.enableDamping=false;controls.update();controls.target.set(0,0,0);camera.position.set(c.side?0:14,c.side?1:11,Math.max(29,29/camera.aspect));controls.update();controls.enableDamping=true;lastView=key;}
   shock.forEach((o,i)=>o.visible=c.layers.shock&&i===(c.cut?1:0));pause.forEach((o,i)=>o.visible=c.layers.pause&&i===(c.cut?1:0));
   sheath.visible=c.layers.sheath;sheath.material.uniforms.cut.value=c.cut?1:0;medium.visible=c.layers.medium;wind.visible=c.layers.wind;neutrals.visible=c.layers.neutrals;arrow.visible=c.layers.neutrals;
   for(let i=0;i<240;i++)wind.geometry.attributes.position.setXYZ(i,...helioWindPoint(i,c.progress));wind.geometry.attributes.position.needsUpdate=true;
   for(let i=0;i<75;i++)neutrals.geometry.attributes.position.setXYZ(i,...neutralPoint(i,c.progress));neutrals.geometry.attributes.position.needsUpdate=true;
   controls.update();for(const l of labels){const p=l.point.clone().project(camera),cutHidden=c.cut&&l.layer==='sheath'&&inHelioCut(l.point.x,l.point.z);l.elementLabel.style.display=(!l.layer||c.layers[l.layer])&&!cutHidden&&p.z>-1&&p.z<1&&Math.abs(p.x)<.87&&Math.abs(p.y)<.87?'block':'none';l.elementLabel.style.left=`${(p.x*.5+.5)*width}px`;l.elementLabel.style.top=`${(-p.y*.5+.5)*height}px`;}
   renderer.render(scene,camera);
  };draw();return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Points){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if('map'in m)(m.map as THREE.Texture|null)?.dispose();m.dispose();}}});renderer.dispose();renderer.domElement.remove();labels.forEach(l=>l.elementLabel.remove());};
 },[]);
 return <div ref={host} className="environment-canvas">{error&&<p className="environment-error" role="status">{error}</p>}</div>;
}

export function HeliosphereExplorer({onClose,onOpenStages,onSolarActivity,onOort}:{onClose:()=>void;onOpenStages:()=>void;onSolarActivity:()=>void;onOort:()=>void}){
 const [layers,setLayers]=useState(defaultHelioLayers),[cut,setCut]=useState(true),[side,setSide]=useState(false),[progress,setProgress]=useState(.25),[playing,setPlaying]=useState(false),[reset,setReset]=useState(0),root=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus();else document.querySelector<HTMLElement>('.app-header [aria-label="阶段导览"]')?.focus();};},[]);
 useEffect(()=>{if(!playing)return;let raf=0,last=performance.now();const tick=(now:number)=>{const delta=(now-last)/1000;last=now;setProgress(p=>advanceHelioDemo(p,delta));raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[playing]);
 useEffect(()=>{if(progress>=1)setPlaying(false);},[progress]);
 const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){const items=[...root.current!.querySelectorAll<HTMLElement>('button,input,a,summary')].filter(x=>!x.hasAttribute('disabled')&&x.getClientRects().length&&(!x.closest('details:not([open])')||x.matches('summary')));if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}};
 return <section ref={root} className="space-environment heliosphere-explorer" role="dialog" aria-modal="true" aria-labelledby="helio-title" onKeyDown={key}>
  <header><div><span>09 / HELIOSPHERE & INTERSTELLAR SPACE</span><h1 id="helio-title">太阳风的边界，在哪里？</h1><p>从日球层内部，看到周围的星际介质</p></div><nav><button onClick={onOpenStages}>阶段导览</button><button ref={close} onClick={onClose}>返回原观测</button></nav></header>
  <div className="environment-layout"><div className="environment-stage"><HelioCanvas layers={layers} cut={cut} side={side} progress={progress} reset={reset}/><div className="environment-badge">科学结构示意 · 球面不是实测外形 · 非等比例</div><div className="helio-cut-note">{cut?'已移去前方四分之一，便于看内部；缺口不是实际开口。':'完整概念轮廓；实际形状仍在研究，并非已知的完美球体。'}</div>
   <div className="solar-demo-controls"><strong>{playing?'正在播放粒子流动示意':'粒子流动示意已暂停'} · 不控制观测日期</strong><label>示意进度 · {Math.round(progress*100)}%<input aria-label="日球层演示进度" type="range" min="0" max="1" step=".001" value={progress} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value));}}/></label><div><button onClick={()=>{if(progress>=1)setProgress(0);setPlaying(v=>!v);}} aria-pressed={playing}>{playing?'暂停演示':progress>=1?'重播演示':'播放演示'}</button><button onClick={()=>{setProgress(0);setPlaying(false);}}>回到开始</button><button aria-pressed={cut} onClick={()=>setCut(v=>!v)}>{cut?'恢复完整轮廓':'切开看内部'}</button><button aria-pressed={side} onClick={()=>setSide(v=>!v)}>{side?'恢复斜视':'侧面观察'}</button><button onClick={()=>setReset(n=>n+1)}>复位镜头</button></div></div>
   <p className="environment-caption">拖动旋转 · 滚轮缩放 · 金色点向外流动，绿色点示意中性原子进入<br/>网格与点数不是物质实体或密度；没有按比例绘制行星、磁场、日球尾与奥尔特云。</p></div>
   <aside><h2>这是一种环境边界</h2><p>太阳风在星际介质中形成日球层。终止激波、日鞘与日球层顶描述不同区域，不能看成同一条环，也不是围着行星轨道转动的外壳。</p><p className="environment-note">默认暂停并剖示。轮廓用同心球面帮助阅读，不拟合真实边界；没有 AU 标尺，不能据图量出日鞘厚度。真实外形随方向、太阳活动与外部环境变化。</p>
    <div className="environment-layers">{HELIO_LAYERS.map(l=><label key={l.id}><span><input type="checkbox" checked={layers[l.id]} onChange={e=>setLayers(v=>({...v,[l.id]:e.target.checked}))}/><i style={{background:l.color}}/><strong>{l.name}</strong></span><p>{l.description}</p></label>)}</div>
    <section className="environment-facts"><h3>我们怎么知道它存在？</h3><p>旅行者 1、2 分别在 2012、2018 年越过日球层顶；沿各自路径测到的变化，结合远程观测，帮助科学家研究边界。两条路径不等于完整三维地图。本批没有新增探测器模型或轨迹。</p><h3>越过边界，就离开太阳系了吗？</h3><p>按太阳风环境，已经进入星际空间；按太阳引力束缚的遥远成员，太阳系还延伸得更远。推断中的奥尔特云位于日球层之外。引力不会在这层轮廓处突然消失。</p><button onClick={onOort}>对照奥尔特云位置</button><button onClick={onSolarActivity}>回看太阳活动</button></section>
    <details><summary>来源与科学边界</summary><p>资料核对：2026-09-24。此图仅解释空间分层；太阳风只画内部流段，中性原子只给出可进入的方向示例，未求解磁流体、激波、电离、电荷交换或宇宙线输运。日球层对宇宙线有调制作用，并不阻挡所有粒子；本图不画屏蔽率。不把日球尾或上游激波的示意画成已确定结构。</p>{HELIO_SOURCES.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><small>{s.note}</small></p>)}</details>
   </aside></div>
 </section>;
}
