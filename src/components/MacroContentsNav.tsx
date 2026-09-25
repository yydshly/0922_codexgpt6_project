import {useId, type RefObject} from 'react';
import {INTEGRATED_ITEMS} from '../data/integratedScene';
import type {StageFlags} from '../data/stages';

const bodySections = [
 {id:'tidal-module',name:'潮汐锁定与共振 · 原理到案例',selector:'[data-tidal-module]'},
 {id:'motion-lessons',name:'运动课程 · 自转到锁定与共振',selector:'[data-motion-lessons]'},
 {id:'boundary-comparison',name:'太阳系边界 · 日球层与奥尔特云',selector:'[data-boundary-comparison]'},
 {id:'space-medium',name:'场、光与粒子 · 五种解释',selector:'[data-space-medium]'},
 {id:'material-journey',name:'物质联系 · 碎屑、黄道光与 E 环',selector:'[data-material-journey]'},
 {id:'environment-journey',name:'太阳与行星环境 · 地球到木星七步对照',selector:'[data-environment-journey]'},
 {id:'appearance',name:'外观与参数核对 · 真实与示意',selector:'[data-appearance-audit]'},
 {id:'enceladus',name:'土卫二 · 喷流与内部结构',selector:'[data-enceladus]'},
 {id:'eros-shape',name:'爱神星形状 · 资料模型与同体积球',selector:'[data-eros-shape]'},
 {id:'distances',name:'尺度与距离 · 真实与压缩对照',selector:'.panorama-distances'},
 {id:'motion',name:'行星运动 · 速度与周期',selector:'.panorama-motion'},
 {id:'sizes',name:'天体大小 · 统一比例比较',selector:'.panorama-sizes'},
 {id:'orbits',name:'行星轨道 · 尺度与方向',selector:'.panorama-orbits'},
 {id:'primary',name:'太阳与八大行星 · 位置与参数',selector:'.panorama-primary'},
 {id:'earth',name:'地球外观 · 云层与大气',selector:'.panorama-earth'},
 {id:'members',name:'区域成员 · 小行星与矮行星',selector:'.region-members'},
 {id:'comets',name:'彗星 · 历表路径与彗尾',selector:'.panorama-comets'},
 {id:'families',name:'卫星与环系 · 母星家族',selector:'[aria-label="全景卫星与环系"]'},
 {id:'binary',name:'冥王星—卡戎 · 双体运动',selector:'.panorama-binary'},
];
const phenomenonSections = INTEGRATED_ITEMS.map(item=>({id:item.id,name:item.title,selector:`[data-panorama-phenomenon="${item.id}"]`}));
const readingSections = [
 {id:'demo',name:'示意进度 · 播放与暂停',selector:'.panorama-demo'},
 {id:'reading',name:'独立详解与来源',selector:'.panorama-reading'},
];
const pick=(ids:string[])=>ids.map(id=>bodySections.find(item=>item.id===id)!);
const groups = [{name:'1 · 整体与尺度',items:pick(['distances','sizes','orbits'])},{name:'2 · 恒星与行星',items:pick(['primary','motion','motion-lessons','earth','appearance'])},{name:'3 · 卫星家族',items:pick(['families','tidal-module','binary','enceladus'])},{name:'4 · 区域与小天体',items:pick(['members','eros-shape','comets'])},{name:'5 · 空间现象（延伸）',items:[...pick(['environment-journey','material-journey','space-medium','boundary-comparison']),...phenomenonSections]},{name:'6 · 演示与来源',items:readingSections}];

export function MacroContentsNav({scroller,stages}:{scroller:RefObject<HTMLDivElement|null>;stages:StageFlags}) {
 const id=useId();
 const available=(key:string)=>{
  if(key==='boundary-comparison')return stages.structure&&stages.heliosphereExplorer;
  if(key==='space-medium')return stages.heliosphereExplorer;
  if(key==='eros-shape')return stages.members;
  if(key==='members')return stages.structure||stages.members;
  if(key==='families'||key==='binary'||key==='enceladus')return stages.families;
  if(key==='comets')return stages.comets;
  const item=INTEGRATED_ITEMS.find(item=>item.id===key);
  return !item||stages[item.stage];
 };
 const jump=(key:string)=>{
  const root=scroller.current;
  if(!root)return;
  if(key==='start'){root.scrollTo({top:0,behavior:'instant'});return;}
  const section=groups.flatMap(group=>group.items).find(item=>item.id===key);
  const target=section&&root.querySelector<HTMLElement>(section.selector);
  if(!target)return;
  // Scroll only the sidebar, never the page or the 3D camera.
  if(target instanceof HTMLDetailsElement)target.open=true;
  root.scrollTo({top:root.scrollTop+target.getBoundingClientRect().top-root.getBoundingClientRect().top-12,behavior:'instant'});
  target.tabIndex=-1;
  target.focus({preventScroll:true});
 };
 return <nav className="macro-contents-nav" aria-label="全景内容目录">
  <label htmlFor={id}>自由浏览</label>
  <select id={id} value="" onChange={event=>jump(event.target.value)} aria-describedby={`${id}-hint`}>
   <option value="" disabled>按层级查找模块…</option><option value="start">回到全景介绍</option>
   {groups.map(group=><optgroup key={group.name} label={group.name}>{group.items.map(item=><option key={item.id} value={item.id}>{item.name}{available(item.id)?'':'（阶段未开启）'}</option>)}</optgroup>)}
  </select>
  <p id={`${id}-hint`}>这里是自由查阅，不是学习顺序；按主线请用“学习路线”。</p>
 </nav>;
}
