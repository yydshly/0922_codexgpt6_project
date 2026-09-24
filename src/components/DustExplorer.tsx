import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {publicAsset} from '../data/publicAsset';
import {advanceDustDemo,debrisPoint,meteorDemoState,DUST_SOURCES} from '../data/dust';
import './SpaceEnvironment.css';
import './SolarActivity.css';
import './DustExplorer.css';

type View='cloud'|'entry';
const LAYERS=[
 {id:'dust',view:'cloud',name:'行星际尘埃云',color:'#d7bb8a',description:'金色点是稀薄固体颗粒的分布示意，集中于黄道附近但具有厚度；不是恒星，也不是所有尘埃都在同一平面。'},
 {id:'stream',view:'cloud',name:'倾斜的碎屑流',color:'#a0dedb',description:'青色点表示沿一条倾斜轨道分布的碎屑示例；不对应某一颗彗星或某次流星雨。'},
 {id:'orbit',view:'cloud',name:'地球参考路径',color:'#7facdf',description:'蓝线只帮助理解地球绕日路径与碎屑流的交会；不是实体环。地球与太阳均被放大。'},
 {id:'atmosphere',view:'entry',name:'大气示意层',color:'#78bde2',description:'蓝色壳层为可见性大幅增厚；没有硬边界，不表示实际发光高度。'},
 {id:'trail',view:'entry',name:'流星发光与短迹',color:'#ffe2a4',description:'高速进入大气时的加热、消融与周围气体发光。不是恒星坠落，也不是太空中一直拖着火尾。'},
] as const;
type Layers=Record<typeof LAYERS[number]['id'],boolean>;
const defaults=():Layers=>({dust:true,stream:true,orbit:true,atmosphere:true,trail:true});

function DustCanvas({view,layers,progress,reset,side}:{view:View;layers:Layers;progress:number;reset:number;side:boolean}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({view,layers,progress,reset,side});latest.current={view,layers,progress,reset,side};const [error,setError]=useState('');
 useEffect(()=>{
  const element=host.current;if(!element)return;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError('当前设备无法绘制三维场景，右侧介绍和来源仍可阅读。');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor('#091421');renderer.outputColorSpace=THREE.SRGBColorSpace;element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,1,.1,150),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=6;controls.maxDistance=60;
  scene.add(new THREE.AmbientLight('#bbd4ff',1.8));const light=new THREE.DirectionalLight('#fff0d5',2.4);light.position.set(-5,8,10);scene.add(light);
  const cloud=new THREE.Group(),entry=new THREE.Group();scene.add(cloud,entry);
  const sphere=(r:number,color:string)=>new THREE.Mesh(new THREE.SphereGeometry(r,48,32),new THREE.MeshStandardMaterial({color,roughness:1}));
  const sun=new THREE.Mesh(new THREE.SphereGeometry(.6,32,24),new THREE.MeshBasicMaterial({color:'#ffcf81'}));cloud.add(sun);
  const earth=sphere(.22,'#86b6d1');earth.position.set(4,0,0);cloud.add(earth);
  const globe=sphere(2.5,'#91bad2');globe.position.y=-2.5;entry.add(globe);let disposed=false;
  new THREE.TextureLoader().load(publicAsset('/textures/earth.jpg'),texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;globe.material.map=texture;globe.material.color.set('white');globe.material.needsUpdate=true;},undefined,()=>{if(!disposed)setError('地球纹理未读取，保留球体与过程示意。');});
  const pointCloud=(positions:number[],color:string,size:number)=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return new THREE.Points(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:new THREE.Color(color)},size:{value:size}},vertexShader:'uniform float size;void main(){gl_PointSize=size;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 color;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(color,(1.-2.*d)*.8);}'}));};
  new THREE.TextureLoader().load(publicAsset('/textures/sun.jpg'),texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;sun.material.map=texture;sun.material.color.set('white');sun.material.needsUpdate=true;},undefined,()=>{});
  const dustPositions:number[]=[],streamPositions:number[]=[];
  let seed=82341;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<3200;i++){const a=random()*Math.PI*2,r=.9+7.1*Math.pow(random(),.65),h=(random()+random()+random()-1.5)*(.22+r*.13);dustPositions.push(r*Math.cos(a),h,r*Math.sin(a));}
  for(let i=0;i<720;i++){const p=debrisPoint(i/720*Math.PI*2);streamPositions.push(p[0]+Math.sin(i*13)*.08,p[1]+Math.sin(i*7)*.1,p[2]+Math.cos(i*11)*.08);}
  const dust=pointCloud(dustPositions,'#eac991',3),stream=pointCloud(streamPositions,'#92e2da',4);cloud.add(dust,stream);
  const orbit=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:180},(_,i)=>new THREE.Vector3(4*Math.cos(i/180*Math.PI*2),0,4*Math.sin(i/180*Math.PI*2)))),new THREE.LineBasicMaterial({color:'#688ab1',transparent:true,opacity:.6}));cloud.add(orbit);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(3.3,64,48),new THREE.MeshBasicMaterial({color:'#5aacf0',transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide}));atmosphere.position.copy(globe.position);entry.add(atmosphere);
  const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.10,1),new THREE.MeshStandardMaterial({color:'#baa998',roughness:1}));entry.add(rock);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.16,24,16),new THREE.MeshBasicMaterial({color:'#ffdc98',transparent:true,opacity:.85}));entry.add(glow);
  const trailGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),trail=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:'#ffdca0',transparent:true,opacity:.85}));entry.add(trail);
  const labelData=[{text:'太阳 · 放大',view:'cloud',layer:null,point:new THREE.Vector3(0,-.9,0)},{text:'地球参考路径 · 非实体环',view:'cloud',layer:'orbit',point:new THREE.Vector3(4,-.6,0)},{text:'倾斜碎屑流 · 示意',view:'cloud',layer:'stream',point:new THREE.Vector3(...debrisPoint(Math.PI/2)).add(new THREE.Vector3(0,.6,0))},{text:'地球 · 静态纹理',view:'entry',layer:null,point:new THREE.Vector3(0,-2.5,2.6)},{text:'大气 · 厚度增强',view:'entry',layer:'atmosphere',point:new THREE.Vector3(2.6,-.5,1)}].map(item=>{const label=document.createElement('span');label.className='environment-label';label.textContent=item.text;element.appendChild(label);return {...item,label};});
  let width=1,height=1,raf=0,lastView='';
  const resize=()=>{width=element.clientWidth;height=element.clientHeight;camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();renderer.setSize(width,height);lastView='';};const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const draw=()=>{raf=requestAnimationFrame(draw);const c=latest.current,key=`${c.view}/${c.reset}/${c.side}`;
   if(key!==lastView){controls.enableDamping=false;controls.update();controls.target.set(c.view==='cloud'?-1:-.8,c.view==='cloud'?0:.1,0);const scale=Math.max(1,1/camera.aspect);camera.position.set(c.view==='cloud'?9:1,c.view==='cloud'?(c.side?1:12):5,(c.view==='cloud'?21:17)*scale);controls.update();controls.enableDamping=true;lastView=key;}
   cloud.visible=c.view==='cloud';entry.visible=c.view==='entry';dust.visible=c.layers.dust;stream.visible=c.layers.stream;orbit.visible=c.layers.orbit;atmosphere.visible=c.layers.atmosphere;
   const a=c.progress*Math.PI*2;earth.position.set(4*Math.cos(a),0,4*Math.sin(a));
   const m=meteorDemoState(c.progress);rock.position.set(m.x,m.y,0);rock.visible=m.visible;rock.scale.setScalar(m.inAtmosphere?Math.max(.08,1-(c.progress-.7)*3):1);glow.position.copy(rock.position);glow.visible=c.layers.trail&&m.glow;trail.visible=glow.visible;
   const tail=meteorDemoState(Math.max(0,c.progress-.055));trailGeometry.setFromPoints([rock.position,new THREE.Vector3(tail.x,tail.y,0)]);
   controls.update();for(const item of labelData){if(item.layer==='orbit')item.point.copy(earth.position).add(new THREE.Vector3(0,-.6,0));const p=item.point.clone().project(camera);item.label.style.display=c.view===item.view&&(!item.layer||c.layers[item.layer as keyof Layers])&&p.z>-1&&p.z<1&&Math.abs(p.x)<.88&&Math.abs(p.y)<.82?'block':'none';item.label.style.left=`${(p.x*.5+.5)*width}px`;item.label.style.top=`${(-p.y*.5+.5)*height}px`;}
   renderer.render(scene,camera);
  };draw();return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.Line){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if('map'in m)(m.map as THREE.Texture|null)?.dispose();m.dispose();}}});renderer.dispose();renderer.domElement.remove();labelData.forEach(l=>l.label.remove());};
 },[]);
 return <div ref={host} className="environment-canvas">{error&&<p className="environment-error" role="status">{error}</p>}</div>;
}

export function DustExplorer({onClose,onOpenStages,onComets}:{onClose:()=>void;onOpenStages:()=>void;onComets:()=>void}){
 const [view,setView]=useState<View>('cloud'),[layers,setLayers]=useState(defaults),[progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[side,setSide]=useState(false),[reset,setReset]=useState(0),root=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus();else document.querySelector<HTMLElement>('.app-header [aria-label="阶段导览"]')?.focus();};},[]);
 useEffect(()=>{if(!playing)return;let raf=0,last=performance.now();const tick=(now:number)=>{const seconds=(now-last)/1000;last=now;setProgress(p=>advanceDustDemo(p,seconds));raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[playing]);
 useEffect(()=>{if(progress>=1)setPlaying(false);},[progress]);
 const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){const items=[...root.current!.querySelectorAll<HTMLElement>('button,input,a,summary')].filter(x=>!x.hasAttribute('disabled')&&x.getClientRects().length&&(!x.closest('details:not([open])')||x.matches('summary')));if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}};
 return <section ref={root} className="space-environment dust-explorer" role="dialog" aria-modal="true" aria-labelledby="dust-title" onKeyDown={key}>
  <header><div><span>08 / DUST & METEORS</span><h1 id="dust-title">行星之间，还有什么？</h1><p>尘埃云 · 碎屑流 · 从流星体到流星</p></div><nav><button onClick={onOpenStages}>阶段导览</button><button ref={close} onClick={onClose}>返回原观测</button></nav></header>
  <div className="environment-layout"><div className="environment-stage"><DustCanvas view={view} layers={layers} progress={progress} reset={reset} side={side}/><div className="dust-view-switch" aria-label="尘埃观察尺度">{(['cloud','entry'] as const).map(v=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);setPlaying(false);setProgress(0);}}>{v==='cloud'?'① 行星际分布':'② 进入地球大气'}</button>)}</div><div className="environment-badge">原理示意 · 非当日位置 · 两个镜头独立缩放</div>
   <div className="solar-demo-controls"><strong>{view==='cloud'?'地球与碎屑流可交会 · 非当日轨道':meteorDemoState(progress).phase}</strong><label>演示进度 · {Math.round(progress*100)}%<input aria-label="尘埃演示进度" type="range" min="0" max="1" step=".001" value={progress} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value));}}/></label><div><button aria-pressed={playing} onClick={()=>{if(progress>=1)setProgress(0);setPlaying(v=>!v);}}>{playing?'暂停演示':progress>=1?'重播演示':'播放演示'}</button><button onClick={()=>{setProgress(0);setPlaying(false);}}>回到开始</button><button onClick={()=>setReset(n=>n+1)}>复位镜头</button>{view==='cloud'&&<button aria-pressed={side} onClick={()=>setSide(v=>!v)}>{side?'恢复斜视':'从侧面看厚度'}</button>}</div></div>
   <p className="environment-caption">拖动旋转 · 滚轮缩放 · 演示不改变主页日期<br/>{view==='cloud'?'金色点：尘埃；青色点：碎屑流。点数、亮度、厚度及运动节奏均为示意。':'本例在大气中消融，不落地。大气厚度、碎块与发光均增强；不计算高度、温度或撞击风险。'}</p></div>
  <aside><h2>{view==='cloud'?'看不见的小颗粒，也是太阳系的一部分':'太空固体、光迹与落地残余'}</h2><p>{view==='cloud'?'彗星释放物质、小行星碰撞等过程会产生尘埃。太阳光被行星际尘埃散射，在合适的地面观测条件下可形成黄道光；尘埃不是自行发光的恒星。':'流星体是太空中的固体；流星是它高速进入大气后产生的发光现象；若残余到达地面，才称陨石。并非每次流星都会留下陨石。'}</p><p className="environment-note">{view==='cloud'?'图中没有绘制地面看到的黄道光光锥。尘埃云与碎屑流是不同概念；倾角、宽度及路径为教学选择，不是某次流星雨的轨道解。':'本例展示完全消融的一种结果。发光与大气相互作用有关；隐藏蓝色大气层只是关掉图形，不会取消示意中的大气作用。'}</p>
   <div className="environment-layers">{LAYERS.filter(l=>l.view===view).map(l=><label key={l.id}><span><input type="checkbox" checked={layers[l.id]} onChange={e=>setLayers(v=>({...v,[l.id]:e.target.checked}))}/><i style={{background:l.color}}/><strong>{l.name}</strong></span><p>{l.description}</p></label>)}</div>
   <section className="environment-facts"><h3>为什么会有流星雨？</h3><p>地球经过富含碎屑的区域时，进入大气的流星体增多，可形成流星雨。许多碎屑流与彗星有关，也有与小行星相关的流星雨。交会不代表所有碎屑都会撞上地球。</p><p>碎屑流不是彗星此刻的彗尾。完整云团也不是有硬边界的实体环。</p><button onClick={onComets}>接着看真实彗星</button></section>
   <details><summary>来源与科学边界</summary><p>资料核对：2026-09-24。本图没有读取新历表、尘埃密度或流星事件；没有求解颗粒引力、辐射力、散射、消融或气体动力学。点云静态，地球与流星体按独立示意进度移动，不用于流星雨或撞击预报。两幅图没有逐颗追踪关系。</p>{DUST_SOURCES.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><small>{s.note}</small></p>)}</details>
  </aside></div>
 </section>;
}
