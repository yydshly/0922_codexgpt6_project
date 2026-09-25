import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { CONTENT_COVERAGE } from './contentCoverage';
import { SCOPE_ADDITIONS } from './executionPlan';
import { MASTER_PLAN } from './masterPlan';
import { COVERAGE_AUDIT, OPEN_FINDINGS, RESOLVED_FINDINGS } from './closeoutPlan';

describe('closeout scope and evidence integrity', () => {
 it('gives every agreed topic and required addition exactly one evidence-backed review entry', () => {
  const expected = [...CONTENT_COVERAGE, ...SCOPE_ADDITIONS.filter(s => s.level === '首版必补')].map(s => s.id);
  expect(COVERAGE_AUDIT.map(s => s.id).sort()).toEqual(expected.sort());
  expect(new Set(COVERAGE_AUDIT.map(s => s.id)).size).toBe(25);
  for (const entry of COVERAGE_AUDIT) {
   expect(entry.check.length).toBeGreaterThan(10);
   expect(entry.reports.length).toBeGreaterThan(0);
   entry.reports.forEach(path => expect(existsSync(path), path).toBe(true));
  }
 });
 it('keeps unresolved findings attached to real work packages and their evidence', () => {
  const packages = new Set(MASTER_PLAN.phases.flatMap(p => p.packages.map(w => w.id)));
  const findings = new Set(OPEN_FINDINGS.map(f => f.id));
  expect(findings.size).toBe(OPEN_FINDINGS.length);
  for (const finding of OPEN_FINDINGS) {
   finding.packages.forEach(id => expect(packages.has(id), id).toBe(true));
   finding.evidence.forEach(path => expect(existsSync(path), path).toBe(true));
   expect(finding.close.length).toBeGreaterThan(10);
  }
  COVERAGE_AUDIT.forEach(row => row.findingIds.forEach(id => expect(findings.has(id), id).toBe(true)));
  expect(findings.has('F01')).toBe(false);
  expect(RESOLVED_FINDINGS.find(f=>f.id==='F01')?.status).toContain('用户验收待确认');
  RESOLVED_FINDINGS.forEach(f=>f.evidence.forEach(path=>expect(existsSync(path),path).toBe(true)));
 });
});
