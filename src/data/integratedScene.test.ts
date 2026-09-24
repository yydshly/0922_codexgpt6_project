import {describe,it,expect} from 'vitest';
import {defaultIntegratedFlags,integratedFlags,integratedDetailVisible} from './integratedScene';
import {allStages,onlyStage} from './stages';
describe('integrated scene gates and level of detail',()=>{
 it('never displays anchored Earth environments without ephemeris and leaves Sun/outer structures available',()=>{
  const state=integratedFlags(defaultIntegratedFlags(),allStages(),false);
  expect(state.environment).toBe(false);expect(state.belts).toBe(false);expect(state.solar).toBe(true);expect(state.helio).toBe(true);
 });
 it('preserves independent stage gates and user choices without mutation',()=>{
  const flags=defaultIntegratedFlags();flags.belts=false;
  const copy={...flags};expect(integratedFlags(flags,onlyStage('nearEarth'),true).belts).toBe(false);
  expect(integratedFlags(defaultIntegratedFlags(),onlyStage('nearEarth'),true)).toEqual({solar:false,environment:false,belts:true,dust:false,helio:false});expect(flags).toEqual(copy);
 });
 it('shows details based on distance to the actual anchor or explicit focus, not distance to an unrelated camera target',()=>{
  expect(integratedDetailVisible('earth',70,null)).toBe(false);expect(integratedDetailVisible('earth',3,null)).toBe(true);
  expect(integratedDetailVisible('earth',70,'earth')).toBe(true);expect(integratedDetailVisible('earth',70,'sun')).toBe(false);
 });
});
