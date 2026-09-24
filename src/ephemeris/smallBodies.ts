import { LocalMonthlyStateProvider, type StateBatch } from './stateProvider';
import { NEW_MEMBER_IDS } from '../data/regionMembers';
import type { StateFrame } from '../types';
export const smallBodyProvider = new LocalMonthlyStateProvider('small-bodies',NEW_MEMBER_IDS);
/** Accept ready batches independently; a slow new pack never hides already loaded members. */
export function matchingMemberBatch(frame:StateFrame|null,...batches:(StateBatch|null)[]):StateBatch|null {
  if(!frame)return null;
  const ready=batches.filter((batch):batch is StateBatch=>!!batch && Math.abs(batch.timeTdb-frame.time)<1e-5 && batch.originId==='ssb' && batch.frame==='ECLIPJ2000' && batch.positionUnit==='km' && batch.velocityUnit==='km/s');
  if(!ready.length)return null;
  const states=ready.flatMap(batch=>batch.states);
  if(new Set(states.map(state=>state.id)).size!==states.length)throw new Error('区域成员出现重复身份');
  return {...ready[0],sourceVersion:ready.map(batch=>batch.sourceVersion).join(' + '),states};
}
