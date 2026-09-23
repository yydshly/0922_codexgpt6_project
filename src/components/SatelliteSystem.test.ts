import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { bodyById } from '../data/catalog';
import { fitSatelliteOverviewDistance, layoutSatelliteLabels, satelliteDisplayPosition, satelliteOrbitPoints, satelliteRadius, satelliteFamilyNormal, satelliteOverviewDirection, satelliteParentAttitude } from './SatelliteSystem';
import type { SatelliteBodyState } from './SatelliteSystem';
import { SATELLITES } from '../data/satellites';
import { ATLAS_BODIES } from '../data/atlas';
import { interpolateSatelliteChunk, type SatelliteChunk } from '../ephemeris/satellites';
import type { Vec3 } from '../types';

describe('satellite display and reference orbit', () => {
  it('uses a single kilometre scale in physical mode and retains direction when compressed', () => {
    const r: [number, number, number] = [300_000, -400_000, 120_000];
    const physical = satelliteDisplayPosition(r, bodyById.jupiter.radiusKm, true);
    expect(physical.toArray()).toEqual([15, 6, 20]);
    expect(physical.length() * 20_000).toBeCloseTo(Math.hypot(...r), 9);
    const compressed = satelliteDisplayPosition(r, bodyById.jupiter.radiusKm, false);
    expect(compressed.clone().normalize().distanceTo(physical.clone().normalize())).toBeLessThan(1e-14);
    expect(satelliteDisplayPosition(r.map(v => v * 2) as typeof r, bodyById.jupiter.radiusKm, false).length()).toBeGreaterThan(compressed.length());
  });

  it('recovers a bound ellipse from its actual periapsis state, including the satellite GM', () => {
    const parent = bodyById.jupiter, gm = 9887.832752719638, a = 1_000_000, e = .13;
    const periapsis = a * (1 - e), speed = Math.sqrt((parent.gm + gm) * (1 + e) / periapsis);
    const body: SatelliteBodyState = { id: 'test', name: 'test', radiusKm: 1000, gm, color: '#fff', appearance: 'ice', position: [periapsis, 0, 0], velocity: [0, speed, 0] };
    const points = satelliteOrbitPoints(body, parent, true);
    expect(points).toHaveLength(257);
    expect(points[0].distanceTo(satelliteDisplayPosition(body.position, parent.radiusKm, true))).toBeLessThan(1e-11);
    expect(points[128].length() * 20_000).toBeCloseTo(a * (1 + e), 6);
    expect(points[256].distanceTo(points[0])).toBeLessThan(1e-12);
    // Input state is read-only; the display never advances the authoritative frame.
    expect(body.position).toEqual([periapsis, 0, 0]);
    expect(body.velocity).toEqual([0, speed, 0]);
  });

  it('does not fabricate a closed orbit for an escaping state', () => {
    const parent = bodyById.mars, r = 10_000;
    const body: SatelliteBodyState = { id: 'test', name: 'test', radiusKm: 1, color: '#fff', appearance: 'rock', position: [r, 0, 0], velocity: [0, Math.sqrt(3 * parent.gm / r), 0] };
    expect(satelliteOrbitPoints(body, parent, false)).toEqual([]);
  });

  it('retains an inclined retrograde orbital plane and direction', () => {
    const parent = bodyById.neptune, r = 354_760, speed = Math.sqrt(parent.gm / r), inclination = .47;
    const body: SatelliteBodyState = { id: 'test', name: 'test', radiusKm: 1, color: '#fff', appearance: 'ice', position: [r, 0, 0], velocity: [0, -speed * Math.cos(inclination), -speed * Math.sin(inclination)] };
    const points = satelliteOrbitPoints(body, parent, true);
    const velocity = new THREE.Vector3(body.velocity[0], body.velocity[2], -body.velocity[1]);
    const normal = new THREE.Vector3().crossVectors(points[0], velocity).normalize();
    for (const point of points) expect(Math.abs(point.dot(normal))).toBeLessThan(1e-12);
    expect(points[1].clone().sub(points[0]).dot(velocity)).toBeGreaterThan(0);
    expect(points[256].distanceTo(points[0])).toBeLessThan(1e-12);
  });

  it('keeps crowded labels separated and below the toolbar', () => {
    const labels = Array.from({ length: 5 }, (_, i) => ({ id: String(i), x: 180, y: 235, radius: 5, width: 60, priority: i === 4 ? 10 : 2 }));
    const positions = layoutSatelliteLabels(labels, 500, 600, 230);
    expect(positions.has('4')).toBe(true);
    expect(positions.size).toBe(5);
    const list = [...positions.values()];
    for (let i = 0; i < list.length; i++) {
      expect(list[i].y - 12).toBeGreaterThanOrEqual(230);
      for (let j = i + 1; j < list.length; j++) expect(Math.abs(list[i].x - list[j].x) >= 68 || Math.abs(list[i].y - list[j].y) >= 28).toBe(true);
    }
  });

  it('shows distinguishable Jupiter moons and a readable parent in a constrained overview', () => {
    const parent = bodyById.jupiter, parentRadius = parent.radiusKm / 20_000;
    const width = 748, height = 538, usableHeight = 252, tanFov = Math.tan(21 * Math.PI / 180);
    const view = new THREE.Vector3(.776, .63, 0).normalize();
    const bounds = [{ position: new THREE.Vector3(), radius: parentRadius }];
    const radii: number[] = [];
    for (const [radiusKm, orbitKm] of [[1821, 421_700], [1561, 671_100], [2631, 1_070_400], [2410, 1_882_700]]) {
      const body: SatelliteBodyState = { id: 'test', name: 'test', radiusKm, color: '#fff', appearance: 'ice', position: [orbitKm, 0, 0], velocity: [0, 0, 0] };
      const radius = satelliteRadius(body, parent.radiusKm, false); radii.push(radius);
      for (let i = 0; i < 256; i++) {
        const angle = i / 256 * Math.PI * 2;
        bounds.push({ position: satelliteDisplayPosition([orbitKm * Math.cos(angle), orbitKm * Math.sin(angle), 0], parent.radiusKm, false), radius });
      }
    }
    const tanX = tanFov * width / height * .90, tanY = tanFov * usableHeight / height;
    const distance = fitSatelliteOverviewDistance(bounds, view, tanX, tanY);
    const pixelsPerUnit = height / (2 * tanFov * distance);
    expect(2 * parentRadius * pixelsPerUnit).toBeGreaterThan(55);
    for (const radius of radii) expect(2 * radius * pixelsPerUnit).toBeGreaterThan(12);
    expect(radii[1]).toBeLessThan(radii[0]);
    expect(radii[0]).toBeLessThan(radii[2]);
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), view).normalize();
    const up = new THREE.Vector3().crossVectors(view, right).normalize();
    for (const bound of bounds) {
      const depth = distance - bound.position.dot(view);
      expect((Math.abs(bound.position.dot(right)) + bound.radius) / depth).toBeLessThan(tanX);
      expect((Math.abs(bound.position.dot(up)) + bound.radius) / depth).toBeLessThan(tanY);
    }
  });
});

describe('Uranus family orientation and framing', () => {
  const chunk = JSON.parse(readFileSync('public/data/satellites/uranus-2026-01.json', 'utf8')) as { series: Array<{ id: string; samples: number[][] }> };
  const moons: SatelliteBodyState[] = chunk.series.map(series => {
    const body = SATELLITES.find(satellite => satellite.id === series.id)!;
    const sample = series.samples[0];
    return { ...body, position: sample.slice(0, 3) as Vec3, velocity: sample.slice(3, 6) as Vec3 };
  });

  it('uses the same measured radius for each atlas entry and the dynamic catalog', () => {
    expect(moons).toHaveLength(5);
    for (const moon of moons) {
      const entry = ATLAS_BODIES.find(body => body.id === moon.id)!;
      expect(entry.parent).toBe('天王星');
      expect(entry.radiusKm).toBe(moon.radiusKm);
      expect(entry.sourceUrl).toBe(`https://science.nasa.gov/uranus/moons/${moon.id}/`);
    }
  });

  it('preserves the tilted parent spin pole and each actual moon orbital plane and direction', () => {
    const parent = bodyById.uranus;
    const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(satelliteParentAttitude(parent, 0));
    const laterPole = new THREE.Vector3(0, 1, 0).applyQuaternion(satelliteParentAttitude(parent, 100_000));
    expect(pole.distanceTo(laterPole)).toBeLessThan(1e-12);
    const spinAxis = pole.clone().multiplyScalar(Math.sign(parent.rotationRateDegPerDay!));
    expect(Math.abs(Math.acos(spinAxis.y) * 180 / Math.PI - parent.obliquityDeg)).toBeLessThan(.5);
    for (const moon of moons) {
      const before = JSON.stringify([moon.position, moon.velocity]);
      const r = new THREE.Vector3(moon.position[0], moon.position[2], -moon.position[1]);
      const v = new THREE.Vector3(moon.velocity[0], moon.velocity[2], -moon.velocity[1]);
      const normal = r.clone().cross(v).normalize();
      expect(normal.dot(spinAxis)).toBeGreaterThan(.99);
      for (const physical of [false, true]) {
        const orbit = satelliteOrbitPoints(moon, parent, physical);
        expect(orbit).toHaveLength(257);
        for (const point of orbit) expect(Math.abs(point.dot(normal))).toBeLessThan(1e-10);
        expect(orbit[0].clone().cross(orbit[1]).normalize().dot(normal)).toBeGreaterThan(.9999);
        expect(satelliteDisplayPosition(moon.position, parent.radiusKm, physical).normalize().dot(r.clone().normalize())).toBeGreaterThan(.999999);
      }
      expect(JSON.stringify([moon.position, moon.velocity])).toBe(before);
    }
    const mirandaNormal = satelliteFamilyNormal([moons.find(body => body.id === 'miranda')!]);
    const otherNormal = satelliteFamilyNormal(moons.filter(body => body.id !== 'miranda'));
    expect(mirandaNormal.angleTo(otherNormal)).toBeGreaterThan(3 * Math.PI / 180);
  });

  it('keeps an oblique sun-facing view even when the light is along either family pole', () => {
    const normal = satelliteFamilyNormal(moons);
    for (const sun of [normal, normal.clone().negate(), new THREE.Vector3(1, 0, 0)]) {
      const before = sun.clone();
      const direction = satelliteOverviewDirection(moons, sun);
      expect(direction.toArray().every(Number.isFinite)).toBe(true);
      expect(direction.length()).toBeCloseTo(1, 12);
      expect(Math.abs(direction.dot(normal))).toBeGreaterThan(.62);
      expect(Math.abs(direction.dot(normal))).toBeLessThan(.64);
      expect(direction.dot(sun)).toBeGreaterThan(.6);
      expect(sun.distanceTo(before)).toBe(0);
      expect(direction.distanceTo(satelliteOverviewDirection([...moons].reverse(), sun))).toBeLessThan(1e-12);
    }
  });

  it('fits five real inclined reference orbits in the available overview and keeps Miranda visible', () => {
    const parent = bodyById.uranus, parentRadius = parent.radiusKm / 20_000;
    const width = 748, height = 538, usableHeight = 252, tanFov = Math.tan(21 * Math.PI / 180);
    const direction = satelliteOverviewDirection(moons, new THREE.Vector3(1, 0, 0));
    const bounds = [{ position: new THREE.Vector3(), radius: parentRadius }];
    for (const moon of moons) {
      const radius = satelliteRadius(moon, parent.radiusKm, false);
      for (const position of satelliteOrbitPoints(moon, parent, false)) bounds.push({ position, radius });
    }
    const tanX = tanFov * width / height * .9, tanY = tanFov * usableHeight / height;
    const distance = fitSatelliteOverviewDistance(bounds, direction, tanX, tanY);
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right).normalize();
    for (const bound of bounds) {
      const depth = distance - bound.position.dot(direction);
      expect((Math.abs(bound.position.dot(right)) + bound.radius) / depth).toBeLessThan(tanX);
      expect((Math.abs(bound.position.dot(up)) + bound.radius) / depth).toBeLessThan(tanY);
    }
    const pixelsPerUnit = height / (2 * tanFov * distance);
    expect(2 * parentRadius * pixelsPerUnit).toBeGreaterThan(50);
    const miranda = moons.find(body => body.id === 'miranda')!;
    expect(2 * satelliteRadius(miranda, parent.radiusKm, false) * pixelsPerUnit).toBeGreaterThan(8);
  });
});

describe('Saturn seven-moon family', () => {
  const chunk = JSON.parse(readFileSync('public/data/satellites/saturn-2026-01.json', 'utf8')) as SatelliteChunk;
  // Different moons use different sample spacing and padding. Interpolate them at
  // one shared instant, rather than accidentally comparing their first rows.
  const time = Math.max(...chunk.series.map(series => series.startTdb)) + 14 * 86400;
  const moons: SatelliteBodyState[] = interpolateSatelliteChunk(chunk, time).states.map(state => ({
    ...SATELLITES.find(body => body.id === state.id)!, ...state,
  }));
  const parent = bodyById.saturn, parentRadius = parent.radiusKm / 20_000;

  it('uses the same measured radius and official body source in atlas and catalog', () => {
    expect(moons).toHaveLength(7);
    for (const id of ['mimas', 'tethys', 'dione', 'rhea', 'iapetus']) {
      const moon = moons.find(body => body.id === id)!;
      const entry = ATLAS_BODIES.find(body => body.id === id)!;
      expect(entry.parent).toBe('土星');
      expect(entry.radiusKm).toBe(moon.radiusKm);
      expect(entry.sourceUrl).toBe(`https://science.nasa.gov/saturn/moons/${id}/`);
      expect(satelliteRadius(moon, parent.radiusKm, true) / parentRadius).toBeCloseTo(moon.radiusKm / parent.radiusKm, 14);
    }
  });

  it('retains Iapetus outside Titan with its distinctly inclined orbit and real direction', () => {
    const iapetus = moons.find(body => body.id === 'iapetus')!, titan = moons.find(body => body.id === 'titan')!;
    const inclination = satelliteFamilyNormal([iapetus]).angleTo(satelliteFamilyNormal([titan]));
    expect(inclination).toBeGreaterThan(10 * Math.PI / 180);
    const realRatio = Math.hypot(...iapetus.position) / Math.hypot(...titan.position);
    expect(realRatio).toBeGreaterThan(2.5);
    for (const physical of [false, true]) {
      const r = satelliteDisplayPosition(iapetus.position, parent.radiusKm, physical);
      const t = satelliteDisplayPosition(titan.position, parent.radiusKm, physical);
      expect(r.length()).toBeGreaterThan(t.length());
      if (physical) expect(r.length() / t.length()).toBeCloseTo(realRatio, 12);
      else expect(r.length() / t.length()).toBeLessThan(realRatio);
      for (const moon of moons) {
        const before = JSON.stringify(moon);
        const normal = satelliteFamilyNormal([moon]);
        const orbit = satelliteOrbitPoints(moon, parent, physical);
        expect(orbit).toHaveLength(257);
        for (const point of orbit) expect(Math.abs(point.dot(normal))).toBeLessThan(1e-10);
        expect(orbit[0].clone().cross(orbit[1]).normalize().dot(normal)).toBeGreaterThan(.9999);
        expect(JSON.stringify(moon)).toBe(before);
      }
    }
  });

  it('keeps the compressed Mimas sphere clear of the displayed outer ring throughout its reference orbit', () => {
    const mimas = moons.find(body => body.id === 'mimas')!;
    const surfaceRadius = satelliteRadius(mimas, parent.radiusKm, false);
    const minimumCenterDistance = Math.min(...satelliteOrbitPoints(mimas, parent, false).map(point => point.length()));
    // A spherical envelope for the entire ring is more conservative than its
    // actual tilted annulus, so this clearance works at every orbital phase.
    expect(minimumCenterDistance - parentRadius * 2.33 - surfaceRadius).toBeGreaterThan(parentRadius * .05);
  });

  it('fits the rings and all seven inclined reference orbits in a short overview with readable Mimas', () => {
    const width = 748, height = 538, usableHeight = 252, tanFov = Math.tan(21 * Math.PI / 180);
    const direction = satelliteOverviewDirection(moons, new THREE.Vector3(1, 0, 0));
    const bounds = [{ position: new THREE.Vector3(), radius: parentRadius * 2.33 }];
    for (const moon of moons) {
      const radius = satelliteRadius(moon, parent.radiusKm, false);
      for (const position of satelliteOrbitPoints(moon, parent, false)) bounds.push({ position, radius });
    }
    const tanX = tanFov * width / height * .9, tanY = tanFov * usableHeight / height;
    const distance = fitSatelliteOverviewDistance(bounds, direction, tanX, tanY);
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right).normalize();
    for (const bound of bounds) {
      const depth = distance - bound.position.dot(direction);
      expect((Math.abs(bound.position.dot(right)) + bound.radius) / depth).toBeLessThan(tanX);
      expect((Math.abs(bound.position.dot(up)) + bound.radius) / depth).toBeLessThan(tanY);
    }
    const pixelsPerUnit = height / (2 * tanFov * distance);
    expect(2 * parentRadius * pixelsPerUnit).toBeGreaterThan(50);
    const mimas = moons.find(body => body.id === 'mimas')!;
    // At least six pixels across: a visible sphere next to a separate clickable
    // label; detailed terrain is intentionally reserved for the close-up view.
    expect(2 * satelliteRadius(mimas, parent.radiusKm, false) * pixelsPerUnit).toBeGreaterThan(6);
  });
});
