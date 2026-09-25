import * as THREE from 'three';
import {macroFamilyFocusDistance} from '../components/macroFamilyScene';
import {familyLocalPosition,familyMoonRadius,type MacroMoon} from './macroFamilies';
import {describe,it,expect} from 'vitest';
import {defaultIntegratedFlags} from './integratedScene';
import {defaultFocusPhenomenon,focusPhenomena,focusPhenomenonTitle,memberFocusDistance} from './macroNavigation';
import {LEARNING_STEPS,learningMatches} from './learningRoute';
describe('navigation intent and visible target',()=>{
 it('separates Earth family from environment at the same anchor without mutating saved flags',()=>{
  const before=defaultIntegratedFlags();const family=focusPhenomena(before,'earth',null);
  expect(family.environment).toBe(false);expect(family.belts).toBe(false);expect(family.dust).toBe(false);expect(family.solar).toBe(true);expect(before.environment).toBe(true);
  const belts=focusPhenomena(before,'earth','belts');expect(belts.belts).toBe(true);expect(belts.environment).toBe(false);
  const meteor=focusPhenomena(before,'earth','dust');expect(meteor.dust).toBe(true);expect(meteor.environment).toBe(false);expect(meteor.belts).toBe(false);
 });
 it('never counts environmental viewing as the Moon lesson',()=>{
  const moon=LEARNING_STEPS.find(s=>s.id==='moon')!;
  const view={scope:'solar' as const,zone:'planetary' as const,tab:'zones' as const,target:'earth' as const,member:null,cosmic:'neighbors' as const};
  expect(learningMatches(moon,{...view,phenomenon:null})).toBe(true);
  expect(learningMatches(moon,{...view,phenomenon:'environment'})).toBe(false);
  expect(learningMatches(moon,{...view,phenomenon:'belts'})).toBe(false);
 });
 it('uses explicit names and distinguishes surface from environment',()=>{
  expect(defaultFocusPhenomenon('body:earth')).toBeNull();expect(defaultFocusPhenomenon('earth')).toBe('environment');
  expect(focusPhenomenonTitle('belts','earth')).toContain('辐射带');expect(focusPhenomenonTitle('dust','earth')).toBe('地球旁流星示例');
 });
 it('fits both parent and moon inside perspective bounds in wide and narrow canvases',()=>{
  const moon:MacroMoon={id:'moon',name:'月球',parentId:'earth',radiusKm:1737.4,position:[384400,0,0],velocity:[0,1,0],appearance:'rock',color:'#fff',sourceUrl:'',orbitalPeriodDays:27.32};
  const direction=new THREE.Vector3(.55,.38,.74).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
  for(const aspect of [.6,1.3,2]){const distance=macroFamilyFocusDistance('earth',[moon],direction,aspect,false),point=new THREE.Vector3(...familyLocalPosition(moon.position,'earth')),r=familyMoonRadius(moon.radiusKm,'earth'),depth=distance-point.dot(direction),tan=Math.tan(44*Math.PI/360);
   expect((Math.abs(point.dot(right))+r)/depth).toBeLessThan(tan*aspect);expect((Math.abs(point.dot(up))+r)/depth).toBeLessThan(tan);
  }
 });
 it('frames a standard named marker at a legible close distance, preserving compound models',()=>{
  const diameter=.13*1.5*2,verticalFov=44*Math.PI/180;
  const fraction=diameter/(2*memberFocusDistance('vesta')*Math.tan(verticalFov/2));
  expect(fraction).toBeGreaterThan(.15);expect(fraction).toBeLessThan(.25);
  expect(memberFocusDistance('eris')).toBe(22);expect(memberFocusDistance('patroclus')).toBe(4);
 });
});
