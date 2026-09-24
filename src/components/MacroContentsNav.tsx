import {useId, type RefObject} from 'react';
import {INTEGRATED_ITEMS} from '../data/integratedScene';
import type {StageFlags} from '../data/stages';

const bodySections = [
 {id:'distances',name:'尺度与距离 · 真实与压缩对照',selector:'.panorama-distances'},
 {id:'motion',name:'行星运动 · 速度与周期',selector:'.panorama-motion'},
 {id:'sizes',name:'天体大小 · 统一比例比较',selector:'.panorama-sizes'},
 {id:'orbits',name:'行星轨道 · 尺度与方向',selector:'.panorama-orbits'},
 {id:'primary',name:'太阳与八大行星 · 位置与参数',selector:'.panorama-primary'},
 {id:'earth',name:'地球外观 · 云层与大气',selector:'.panorama-earth'},
 {id:'members',name:'区域成员 · 小行星与矮行星',selector:'.panorama-members'},
 {id:'comets',name:'彗星 · 历表路径与彗尾',selector:'.panorama-comets'},
 {id:'families',name:'卫星与环系 · 母星家族',selector:'[aria-label="全景卫星与环系"]'},
 {id:'binary',name:'冥王星—卡戎 · 双体运动',selector:'.panorama-binary'},
];
const phenomenonSections = INTEGRATED_ITEMS.map(item=>({id:item.id,name:item.title,selector:`[data-panorama-phenomenon="${item.id}"]`}));
const readingSections = [
 {id:'demo',name:'示意进度 · 播放与暂停',selector:'.panorama-demo'},
 {id:'reading',name:'独立详解与来源',selector:'.panorama-reading'},
];
const groups = [{name:'天体与运动',items:bodySections},{name:'空间现象',items:phenomenonSections},{name:'演示与阅读',items:readingSections}];

export function MacroContentsNav({scroller,stages}:{scroller:RefObject<HTMLDivElement|null>;stages:StageFlags}) {
 const id=useId();
 const available=(key:string)=>{
  if(key==='members')return stages.structure||stages.members;
  if(key==='families'||key==='binary')return stages.families;
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
  <label htmlFor={id}>内容目录</label>
  <select id={id} value="" onChange={event=>jump(event.target.value)} aria-describedby={`${id}-hint`}>
   <option value="" disabled>跳转到模块…</option><option value="start">回到全景介绍</option>
   {groups.map(group=><optgroup key={group.name} label={group.name}>{group.items.map(item=><option key={item.id} value={item.id}>{item.name}{available(item.id)?'':'（阶段未开启）'}</option>)}</optgroup>)}
  </select>
  <p id={`${id}-hint`}>只跳转介绍与控制；点击模块内“定位”再移动镜头。</p>
 </nav>;
}
