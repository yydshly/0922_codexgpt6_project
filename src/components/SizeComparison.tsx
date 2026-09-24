import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {BODIES,PHYSICAL_SOURCE} from '../data/catalog';
import {publicAsset} from '../data/publicAsset';
import {sizePair,sizePairFrustum} from '../data/sizeComparison';
import type {BodyId} from '../types';
import './SizeComparison.css';

function PairScene({left,right}:{left:BodyId;right:BodyId}){
 const host=useRef<HTMLDivElement>(null),labels=useRef<HTMLDivElement>(null);
 const [status,setStatus]=useState('正在读取本地静态贴图…');
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setStatus('当前设备无法显示三维比较，仍可阅读下方直径与比例。');return;}
  let disposed=false,loaded=0,failed=0;
  setStatus('正在读取本地静态贴图…');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','两颗球体按参考直径统一比例陈列；间距为排版，不是实际距离');element.appendChild(renderer.domElement);
  const pair=sizePair(left,right),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,1.2,-1.2,.1,20);camera.position.z=6;
  scene.add(new THREE.AmbientLight(0xd6e8ff,1.1));const light=new THREE.DirectionalLight(0xfff3e1,2.7);light.position.set(-3,4,7);scene.add(light);
  const geometry=new THREE.SphereGeometry(1,80,48),textures:THREE.Texture[]=[];
  const materials=pair.bodies.map(b=>b.id==='sun'?new THREE.MeshBasicMaterial({color:b.color}):new THREE.MeshStandardMaterial({color:b.color,roughness:1}));
  const draw=()=>{if(!disposed)renderer.render(scene,camera);};
  pair.bodies.forEach((body,i)=>{
   const mesh=new THREE.Mesh(geometry,materials[i]);mesh.scale.setScalar(pair.radii[i]);mesh.position.x=pair.x[i];mesh.rotation.y=.5;scene.add(mesh);
   const finish=()=>{if(!disposed&&++loaded===2)setStatus(failed?'部分贴图未加载，使用单色球体；尺寸比例仍有效。':'静态贴图已加载 · 固定展示光照与朝向');};
   if(body.texture)new THREE.TextureLoader().load(body.texture,map=>{if(disposed){map.dispose();return;}textures.push(map);map.colorSpace=THREE.SRGBColorSpace;materials[i].map=map;materials[i].color.set('white');materials[i].needsUpdate=true;draw();finish();},undefined,()=>{failed++;finish();});else finish();
  });
  const resize=()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h||disposed)return;const f=sizePairFrustum(pair.halfWidth,w/h);camera.left=-f.halfWidth;camera.right=f.halfWidth;camera.top=f.halfHeight;camera.bottom=-f.halfHeight;camera.updateProjectionMatrix();renderer.setSize(w,h);pair.x.forEach((x,i)=>{const label=labels.current?.children[i] as HTMLElement|undefined;if(label)label.style.left=`${(x/f.halfWidth+1)*50}%`;});draw();};
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  return()=>{disposed=true;observer.disconnect();textures.forEach(t=>t.dispose());geometry.dispose();materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[left,right]);
 return <><div className="size-pair-viewport"><div ref={host} className="size-pair-canvas"/><div ref={labels} className="size-pair-labels"><span>{BODIES.find(b=>b.id===left)!.name}</span><span>{BODIES.find(b=>b.id===right)!.name}</span></div><span className="size-pair-mode">直径统一比例 · 间距为排版</span></div><p className="size-pair-status" role="status">{status}</p></>;
}

export function SizeComparison({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const returnFocus=useRef(document.activeElement);
 const [left,setLeft]=useState<BodyId>('earth'),[right,setRight]=useState<BodyId>('moon');
 useEffect(()=>{const d=dialog.current!;d.showModal();return()=>{d.close();const previous=returnFocus.current;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};},[]);
 const pair=sizePair(left,right);
 const presets:[BodyId,BodyId,string][]=[['earth','moon','地球与月球'],['jupiter','earth','木星与地球'],['sun','jupiter','太阳与木星'],['sun','earth','太阳与地球']];
 return <dialog ref={dialog} className="size-comparison" aria-labelledby="size-comparison-title" onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();onClose();}}}>
  <header><div><span>同一把尺，比较天体本体</span><h2 id="size-comparison-title">天体大小比较</h2></div><button autoFocus onClick={onClose} aria-label="关闭大小比较">关闭</button></header>
  <div className="size-comparison-content">
   <p>全景为了辨认天体放大了球体。这里按资料中的参考半径使用同一比例，两颗球体没有各自放大。</p>
   <div className="size-pair-presets">{presets.map(([a,b,name])=><button key={name} aria-pressed={left===a&&right===b} onClick={()=>{setLeft(a);setRight(b);}}>{name}</button>)}</div>
   <div className="size-pair-selectors"><label>左侧天体<select value={left} onChange={e=>setLeft(e.target.value as BodyId)}>{BODIES.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><button onClick={()=>{setLeft(right);setRight(left);}}>交换左右</button><label>右侧天体<select value={right} onChange={e=>setRight(e.target.value as BodyId)}>{BODIES.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
   <PairScene left={left} right={right}/>
   <p className="size-pair-ratio" aria-live="polite">{pair.bodies[0].name}的参考直径约为{pair.bodies[1].name}的 <strong>{pair.diameterRatio.toLocaleString('zh-CN',{maximumSignificantDigits:5})} 倍</strong></p>
   <dl className="size-pair-values">{pair.bodies.map((b,i)=><div key={i}><dt>{i===0?'左':'右'} · {b.name}参考直径</dt><dd>{(b.radiusKm*2).toLocaleString('zh-CN',{maximumFractionDigits:4})} km</dd></div>)}</dl>
   <p>这里只比较本体直径，不含环、日冕和大气光晕。按参考半径绘制理想球体，未重建扁率；摆放位置、间距、光照与朝向不对应观测日期。没有播放自转或公转。</p>
   <p>选择太阳与小天体时，小球可能仅有几像素；不会为了清楚而单独放大。更换组合有助于辨认细节。关闭窗口回到原全景；若日期原本正在播放，会继续推进。</p>
   <details><summary>参数来源与换算方式</summary><p>直径 = 2 × 本项目保存的参考半径；比例 = 左侧半径 ÷ 右侧半径。行星与月球采用 JPL 表中的平均半径。太阳采用 695,700 km 的参考值，与 IAU 2015 B3 名义太阳半径一致；该名义值是换算常数，不是当日测量。</p><p>三维画面使用正交投影，避免近大远小改变两者的视直径比例；静态贴图只用于辨识外观，不是实时影像。</p><a href={PHYSICAL_SOURCE} target="_blank" rel="noreferrer">JPL 行星参数</a><a href="https://ssd.jpl.nasa.gov/sats/phys_par/" target="_blank" rel="noreferrer">JPL 卫星参数</a><a href="https://www.iau.org/static/resolutions/IAU2015_English.pdf" target="_blank" rel="noreferrer">IAU 2015 B3 · 名义太阳半径</a><a href={publicAsset('/textures/sources.json')} target="_blank" rel="noreferrer">贴图与许可</a></details>
  </div>
 </dialog>;
}
