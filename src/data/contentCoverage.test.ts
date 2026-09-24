import {DELIVERY_BATCHES,SCOPE_ADDITIONS} from './executionPlan';
import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {CONTENT_COVERAGE,COVERAGE_DATASETS,BASELINE_VERSION} from './contentCoverage';
import {MASTER_PLAN} from './masterPlan';
import {MACRO_ZONES} from './macroStructure';
import {SOLAR_FAMILIES,COSMIC_LEVELS} from './cosmicContext';
import {STAGES} from './stages';
import {OBSERVATION_COUNTS} from './observationCatalog';
import {parseReview,REVIEW_STEPS} from './baselineReview';

describe('coverage bindings and versioned review',()=>{
 it('covers the agreed scope without losing gaps, bindings or valid navigation destinations',()=>{
  expect(CONTENT_COVERAGE.map(r=>r.id)).toEqual(MASTER_PLAN.coverage.map(r=>r.id));
  for(const row of CONTENT_COVERAGE){
   const planned=MASTER_PLAN.coverage.find(r=>r.id===row.id)!;
   expect([row.title,row.current,row.target,row.phase]).toEqual([planned.title,planned.current,planned.target,planned.phase]);
   row.modules.forEach(path=>expect(existsSync(path),path).toBe(true));
   row.stages.forEach(id=>expect(STAGES.some(s=>s.id===id)).toBe(true));
   if(row.entry){
    const ids=row.entry.kind==='zone'?['all',...MACRO_ZONES.map(r=>r.id)]:row.entry.kind==='family'?SOLAR_FAMILIES.map(r=>r.id):COSMIC_LEVELS.map(r=>r.id);
    expect(ids).toContain(row.entry.id);
    expect(row.modules.length).toBeGreaterThan(0);
   }
  }
  expect(CONTENT_COVERAGE.find(r=>r.id==='E20')?.entry).toEqual({kind:'family',id:'comets'});
 });
 it('binds displayed versions to actual packaged manifests and deduplicated targets',()=>{
  const ids=new Set<string>();
  for(const d of Object.values(COVERAGE_DATASETS)){
   const manifest=JSON.parse(readFileSync('public/'+d.path,'utf8'));
   expect(d.version).toBe(manifest.version);
   expect(d.startUtc).toBe(manifest.startUtc);expect(d.endUtc).toBe(manifest.endUtc);
   for(const id of manifest.bodyIds??manifest.satelliteIds)ids.add(id);
  }
  expect(ids.size).toBe(OBSERVATION_COUNTS.allDynamic);
 });
 it('keeps delivery dependencies acyclic and binds required scope to real topics and work packages',()=>{
  const packages=new Set(MASTER_PLAN.phases.flatMap(p=>p.packages.map(w=>w.id)));
  const topics=new Set(MASTER_PLAN.coverage.map(t=>t.id));
  const delivered=new Set<string>(),covered=new Set<string>();
  for(const batch of DELIVERY_BATCHES){
   expect(delivered.has(batch.id)).toBe(false);
   batch.after.forEach(id=>expect(delivered.has(id),`${batch.id} depends on earlier ${id}`).toBe(true));
   batch.packages.forEach(id=>expect(packages.has(id),id).toBe(true));
   batch.topics.forEach(id=>{expect(topics.has(id),id).toBe(true);if(batch.id!=='R09')covered.add(id);});
   delivered.add(batch.id);
  }
  expect([...covered].sort()).toEqual([...topics].sort());
  for(const item of SCOPE_ADDITIONS){
   item.topics.forEach(id=>expect(topics.has(id)).toBe(true));
   item.batches.forEach(id=>expect(delivered.has(id)).toBe(true));
   if(item.level==='首版必补'){
    expect(item.batches.length).toBeGreaterThan(0);
    expect(item.sources.length).toBeGreaterThan(0);
    expect(item.topics.every(id=>DELIVERY_BATCHES.some(b=>item.batches.includes(b.id)&&b.topics.includes(id)))).toBe(true);
   }
  }
 });
 it('never carries pass marks from older or corrupt reviews into this baseline',()=>{
  expect(parseReview('invalid')).toEqual({});
  expect(parseReview(JSON.stringify({version:'old',marks:{panorama:{status:'pass',note:''}}}))).toEqual({});
  expect(parseReview(JSON.stringify({version:BASELINE_VERSION,marks:{panorama:{status:'published',note:''},sun:{status:'pass',note:12}}}))).toEqual({});
  const marks={panorama:{status:'issue',note:'视角问题'},unknown:{status:'pass',note:''}};
  expect(parseReview(JSON.stringify({version:BASELINE_VERSION,marks}))).toEqual({panorama:marks.panorama});
  expect(new Set(REVIEW_STEPS.map(s=>s.id)).size).toBe(REVIEW_STEPS.length);
 });
});
