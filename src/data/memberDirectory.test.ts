import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {MEMBER_DIRECTORY,memberStageMissing,searchMembers} from './memberDirectory';
import {BODIES} from './catalog';
import {SATELLITES} from './satellites';
import {DYNAMIC_DWARFS} from './dwarfs';
import {NEW_MEMBER_IDS} from './regionMembers';
import {COMETS} from '../ephemeris/comets';
import {PLUTO_MOON_IDS} from './plutoMoons';
import {OBSERVATION_COUNTS} from './observationCatalog';
import {allStages} from './stages';
describe('member directory coverage',()=>{
 it('covers the independent observation registry exactly once, excluding history from current members',()=>{
  const expected=new Set([...BODIES.map(b=>b.id),...SATELLITES.map(b=>b.id),...DYNAMIC_DWARFS.map(b=>b.id),...NEW_MEMBER_IDS,...COMETS.map(b=>b.id),...PLUTO_MOON_IDS,'dysnomia','patroclus','menoetius','kamo']);
  const entries=MEMBER_DIRECTORY.filter(m=>m.kind!=='history');
  expect(entries).toHaveLength(expected.size);expect(new Set(entries.map(m=>m.id))).toEqual(expected);expect(entries).toHaveLength(OBSERVATION_COUNTS.allDynamic);expect(MEMBER_DIRECTORY.filter(m=>m.kind==='history').map(m=>m.id)).toEqual(['borisov']);
 });
 it('resolves every packaged data/source link and every ordinary satellite identity',()=>{
  for(const m of MEMBER_DIRECTORY){expect(m.selector).toBeTruthy();for(const link of [m.source,m.dataset])if(link.startsWith('/'))expect(existsSync('public'+link),link).toBe(true);else expect(new URL(link).protocol).toBe('https:');
   if(m.kind==='moon')expect(m.id==='moon'||SATELLITES.some(s=>s.id===m.id)).toBe(true);
  }
 });
 it('requires both gates for paired systems while retaining Ceres/Pluto either-stage access',()=>{
  const flags=allStages();flags.members=false;
  expect(memberStageMissing(MEMBER_DIRECTORY.find(m=>m.id==='dysnomia')!,flags)).toEqual(['members']);
  expect(memberStageMissing(MEMBER_DIRECTORY.find(m=>m.id==='ceres')!,flags)).toEqual([]);
  flags.structure=false;expect(memberStageMissing(MEMBER_DIRECTORY.find(m=>m.id==='ceres')!,flags)).toEqual(['structure']);
  flags.members=true;expect(memberStageMissing(MEMBER_DIRECTORY.find(m=>m.id==='pluto')!,flags)).toEqual([]);
 });
 it('finds English aliases, parent systems, and the separate history case',()=>{
  expect(searchMembers(' nIX ').map(m=>m.id)).toEqual(['nix']);expect(searchMembers('海王星卫星').every(m=>SATELLITES.some(s=>s.id===m.id&&s.parentId==='neptune'))).toBe(true);expect(searchMembers('海王星卫星').length).toBeGreaterThan(0);
  expect(searchMembers('准卫星').map(m=>m.id)).toEqual(['kamo']);expect(searchMembers('星际访客').map(m=>m.id)).toEqual(['borisov']);expect(searchMembers('no-such-object')).toEqual([]);
 });
});
