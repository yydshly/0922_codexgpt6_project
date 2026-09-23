import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { NBodySystem } from '../src/physics/core';
import { BODIES } from '../src/data/catalog';
import { utcToTdb, DAY_SECONDS } from '../src/data/time';
import { getFrame, loadManifest } from '../src/ephemeris/ephemeris';
import { BODY_IDS, type StateFrame, type ValidationPoint, type ValidationReport } from '../src/types';

/** Uses exactly the bundled data / interpolation path used by the browser. */
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://local');
  if (!url.pathname.startsWith('/data/')) throw new Error(`Unexpected validation URL: ${url.pathname}`);
  const path = resolve(publicRoot, `.${decodeURIComponent(url.pathname)}`);
  if (!path.startsWith(publicRoot.endsWith(sep) ? publicRoot : publicRoot + sep)) throw new Error('Data path outside public directory');
  return new Response(await readFile(path, 'utf8'), { headers: { 'Content-Type': 'application/json' } });
};

const DAY = DAY_SECONDS;
const epochUtc = process.argv.find(argument => argument.startsWith('--epoch='))?.slice(8) ?? '2026-09-22T00:00:00.000Z';
const epochTdb = utcToTdb(new Date(epochUtc));
const steps = [300, 150, 75, 37.5];
const moonIndex = BODY_IDS.indexOf('moon'), earthIndex = BODY_IDS.indexOf('earth');
type DetailedPoint = ValidationPoint & {
  numericalVelocityKmS: number[];
  modelPositionKm: number[]; modelVelocityKmS: number[];
  referenceRefinementPositionKm: number[]; referenceRefinementVelocityKmS: number[];
};

function differences(a: StateFrame, b: StateFrame, property: 'positions' | 'velocities'): number[] {
  return BODY_IDS.map((_, body) => {
    // Sun: SSB. Planets: Sun. Moon: Earth. Both sides use the same target ID.
    const origin = body === 0 ? -1 : body === moonIndex ? earthIndex : 0;
    let squared = 0;
    for (let axis = 0; axis < 3; axis++) {
      const av = a[property][body * 3 + axis] - (origin < 0 ? 0 : a[property][origin * 3 + axis]);
      const bv = b[property][body * 3 + axis] - (origin < 0 ? 0 : b[property][origin * 3 + axis]);
      squared += (av - bv) ** 2;
    }
    return Math.sqrt(squared);
  });
}

function peak(points: DetailedPoint[], property: keyof Pick<DetailedPoint, 'positionKm' | 'velocityKmS' | 'numericalPositionKm' | 'numericalVelocityKmS' | 'modelPositionKm' | 'modelVelocityKmS' | 'referenceRefinementPositionKm'>, body: number): number {
  return Math.max(...points.map(point => point[property][body]));
}

function summaryFor(points: DetailedPoint[], days: number) {
  const selected = points.filter(point => point.day > 0 && point.day <= days);
  return {
    days,
    bodies: BODIES.map((body, index) => ({
      id: body.id, name: body.name, naifId: body.simulationNaifId,
      origin: index === 0 ? 'SSB' : index === moonIndex ? 'Earth' : 'Sun',
      maximumPositionKm: peak(selected, 'positionKm', index),
      rmsPositionKm: Math.sqrt(selected.reduce((sum, point) => sum + point.positionKm[index] ** 2, 0) / selected.length),
      maximumVelocityKmS: peak(selected, 'velocityKmS', index),
      rmsVelocityKmS: Math.sqrt(selected.reduce((sum, point) => sum + point.velocityKmS[index] ** 2, 0) / selected.length),
      maximumNumericalPositionKm: peak(selected, 'numericalPositionKm', index),
      maximumNumericalVelocityKmS: peak(selected, 'numericalVelocityKmS', index),
      maximumModelPositionKm: peak(selected, 'modelPositionKm', index),
      maximumModelVelocityKmS: peak(selected, 'modelVelocityKmS', index),
      maximumReferenceRefinementPositionKm: peak(selected, 'referenceRefinementPositionKm', index),
    })),
  };
}

try {
  const manifest = await loadManifest();
  if (epochTdb < manifest.startTdb || epochTdb + 365 * DAY > manifest.endTdb) throw new Error('Validation epoch must have 365 days of bundled Horizons coverage.');
  const initial = await getFrame(epochTdb, 'simulation');
  const gms = BODIES.map(body => body.simulationGm);
  const systems = steps.map(step => new NBodySystem(initial, gms, step));
  const points: DetailedPoint[] = [];
  let coarseDifferenceMaximum = 0, fineDifferenceMaximum = 0;
  console.log(`Validating ${BODY_IDS.length} bodies from ${epochUtc}: 300 / 150 / 75 / 37.5 s.`);
  for (let day = 0; day <= 365; day++) {
    if (day > 0) for (const system of systems) system.advance(DAY);
    const frames = systems.map(system => system.snapshot());
    const authoritative = await getFrame(epochTdb + day * DAY, 'simulation');
    const reference = frames[3];
    const coarse = differences(frames[0], frames[1], 'positions');
    const fine = differences(frames[1], frames[2], 'positions');
    coarseDifferenceMaximum = Math.max(coarseDifferenceMaximum, ...coarse);
    fineDifferenceMaximum = Math.max(fineDifferenceMaximum, ...fine);
    points.push({
      day,
      positionKm: differences(frames[0], authoritative, 'positions'),
      velocityKmS: differences(frames[0], authoritative, 'velocities'),
      numericalPositionKm: differences(frames[0], reference, 'positions'),
      numericalVelocityKmS: differences(frames[0], reference, 'velocities'),
      modelPositionKm: differences(reference, authoritative, 'positions'),
      modelVelocityKmS: differences(reference, authoritative, 'velocities'),
      referenceRefinementPositionKm: differences(frames[2], reference, 'positions'),
      referenceRefinementVelocityKmS: differences(frames[2], reference, 'velocities'),
    });
    if (day === 30 || day === 365) console.log(`Completed ${day}-day Horizons comparison.`);
  }

  console.log('Running 10 Julian years of daily conservation checks and 75 s refinement.');
  const stable = new NBodySystem(initial, gms, 300);
  const longReference = new NBodySystem(initial, gms, 75);
  const baseline = stable.diagnostics();
  const angularNorm = Math.hypot(...baseline.scaledAngularMomentum);
  let maximumEnergyError = 0, maximumAngularError = 0;
  const maximumLongNumericalPositionKm = BODY_IDS.map(() => 0);
  const totalDays = 3652.5;
  for (let previousDay = 0; previousDay < totalDays;) {
    const nextDay = Math.min(previousDay + 1, totalDays);
    stable.advance((nextDay - previousDay) * DAY);
    longReference.advance((nextDay - previousDay) * DAY);
    const value = stable.diagnostics();
    maximumEnergyError = Math.max(maximumEnergyError, Math.abs((value.scaledEnergy - baseline.scaledEnergy) / baseline.scaledEnergy));
    maximumAngularError = Math.max(maximumAngularError, Math.hypot(...value.scaledAngularMomentum.map((v, i) => v - baseline.scaledAngularMomentum[i])) / angularNorm);
    differences(stable.snapshot(), longReference.snapshot(), 'positions').forEach((value, i) => {
      maximumLongNumericalPositionKm[i] = Math.max(maximumLongNumericalPositionKm[i], value);
    });
    previousDay = nextDay;
  }
  const year = summaryFor(points, 365);
  const maxPlanetNumerical = Math.max(...year.bodies.filter(body => body.id !== 'sun' && body.id !== 'moon').map(body => body.maximumNumericalPositionKm));
  const maxMoonNumerical = year.bodies[moonIndex].maximumNumericalPositionKm;
  const maxLongPlanet = Math.max(...maximumLongNumericalPositionKm.filter((_, i) => i !== 0 && i !== moonIndex));
  const convergenceRatio = coarseDifferenceMaximum / fineDifferenceMaximum;
  const finite = points.every(point => [point.positionKm, point.velocityKmS, point.numericalPositionKm, point.numericalVelocityKmS, point.modelPositionKm, point.modelVelocityKmS].every(values => values.every(Number.isFinite)));
  const checks = {
    allFinite: finite,
    energyBelow1e8: maximumEnergyError < 1e-8,
    angularMomentumBelow1e10: maximumAngularError < 1e-10,
    secondOrderConvergence: convergenceRatio > 3.5 && convergenceRatio < 4.5,
    oneYearPlanetNumericalBelow100Km: maxPlanetNumerical < 100,
    oneYearMoonNumericalBelow30Km: maxMoonNumerical < 30,
    tenYearPlanetNumericalBelow500Km: maxLongPlanet < 500,
    tenYearMoonNumericalBelow150Km: maximumLongNumericalPositionKm[moonIndex] < 150,
  };
  const report: ValidationReport = {
    generatedAt: new Date().toISOString(), epochUtc, epochTdb, steps, points,
    source: { version: manifest.version, sourceUrl: manifest.sourceUrl, frame: manifest.frame, units: manifest.units, timeScale: manifest.timeScale },
    bodyIds: BODY_IDS, comparisonNaifIds: BODIES.map(body => body.simulationNaifId),
    summary: {
      passed: Object.values(checks).every(Boolean), checks,
      convergence: { coarseDifferenceMaximumKm: coarseDifferenceMaximum, fineDifferenceMaximumKm: fineDifferenceMaximum, ratio: convergenceRatio },
      thirtyDays: summaryFor(points, 30), oneYear: year,
      tenYears: { days: totalDays, stepSeconds: 300, referenceStepSeconds: 75, sampling: 'daily plus final half-day', maximumRelativeEnergyError: maximumEnergyError, maximumRelativeAngularMomentumError: maximumAngularError, maximumNumericalPositionKm: maximumLongNumericalPositionKm },
    },
    notes: [
      'positionKm / velocityKmS 是正式 300 秒推演对 JPL 历表的总差异，不等同于数值积分误差。',
      'numericalPositionKm / numericalVelocityKmS 为同一十体模型 300 秒与 37.5 秒参考的差异；参考仍有有限数值误差。',
      'modelPositionKm / modelVelocityKmS 为 37.5 秒参考对 JPL 的差异；75 秒与 37.5 秒之差单独记录，用于评估参考积分余量。',
      '比较使用同历元、同 ECLIPJ2000 坐标和同 NAIF 目标；太阳相对 SSB，行星相对太阳，月球相对地球。',
      '火星和外行星推演使用系统质心及系统 GM；不能把行星自身中心与系统质心的摆动当作积分误差。',
      '模型忽略相对论、非球形引力、更小天体及未单独建模的卫星结构；历表差异不采用必须为零的验收门槛。',
      '历表位置和速度经过独立验证的 Hermite 插值；其误差见 interpolation-report.json，与物理模型误差分别报告。',
      '10 年检验仅考察孤立十体模型的数值稳定性，不表示具有 10 年真实历表覆盖或对应天文预测精度。',
    ],
  };
  await mkdir(resolve(publicRoot, 'data'), { recursive: true });
  await writeFile(resolve(publicRoot, 'data/validation-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checks, convergenceRatio, maximumEnergyError, maximumAngularError, oneYearMaxPlanetKm: maxPlanetNumerical, oneYearMaxMoonKm: maxMoonNumerical, tenYearMaxPlanetKm: maxLongPlanet, tenYearMaxMoonKm: maximumLongNumericalPositionKm[moonIndex] }, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
}
