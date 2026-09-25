import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {idealDaylight,noonAltitude,seasonGeometry,seasonDate,earthSeasonPole} from './seasons';
import {utcToTdb,tdbToUtc} from './time';
import {interpolateChunk,type EphemerisChunk} from '../ephemeris/ephemeris';
import {createSeasonScene} from '../components/seasonScene';
import {isolateFamilyContext,restoreFamilyContext} from '../components/familyIsolation';
const sample=(year:number,month:number,day:number)=>{const chunk=JSON.parse(readFileSync(`public/data/${year}-${String(month).padStart(2,'0')}.json`,'utf8')) as EphemerisChunk;return interpolateChunk(chunk,utcToTdb(Date.UTC(year,month-1,day,4)));};
it('matches ideal equinox, hemisphere symmetry and polar limits',()=>{
 for(const lat of [-80,-40,0,40,80])expect(idealDaylight(lat,0)).toBeCloseTo(12,10);
 expect(idealDaylight(40,23.44)).toBeCloseTo(14.844,2);expect(idealDaylight(40,23.44)+idealDaylight(-40,23.44)).toBeCloseTo(24,10);
 expect(idealDaylight(80,23.44)).toBe(24);expect(idealDaylight(-80,23.44)).toBe(0);expect(noonAltitude(40,23.44)).toBeCloseTo(73.44,9);expect(idealDaylight(100,0)).toBeNaN();
});
it('keeps June/December hemispheres opposite for both stored ephemeris years',()=>{
 for(const year of [2026,2027]){const june=seasonGeometry(sample(year,6,21))!,dec=seasonGeometry(sample(year,12,21))!;expect(june.declination).toBeGreaterThan(23);expect(dec.declination).toBeLessThan(-23);expect(june.north).toBeGreaterThan(14);expect(dec.north).toBeLessThan(10);expect(june.south).toBeLessThan(10);expect(dec.south).toBeGreaterThan(14);expect(june.distanceAu).toBeGreaterThan(dec.distanceAu);for(const [m,d] of [[3,20],[9,23]])expect(Math.abs(seasonGeometry(sample(year,m,d))!.declination)).toBeLessThan(.6);}
});
it('date comparison preserves the observed year and uses Beijing noon, not an event time',()=>{
 const time=utcToTdb(Date.UTC(2027,4,3));expect(tdbToUtc(seasonDate(time,6,21)).toISOString()).toBe('2027-06-21T04:00:00.000Z');expect(earthSeasonPole().length()).toBeCloseTo(1,12);expect(seasonGeometry(null)).toBeNull();
});
it('references follow Earth translation but retain the static inertial pole',()=>{
 const scene=new THREE.Scene(),ref=createSeasonScene(scene),anchor=new THREE.Vector3(4,2,1);expect(ref.root.visible).toBe(false);ref.update(sample(2026,6,21),true,anchor);const pole=(ref.root.children[0] as THREE.ArrowHelper).quaternion.clone();const marker=ref.root.children.find(c=>c instanceof THREE.Mesh)!;const before=marker.position.clone();ref.update(sample(2026,12,21),true,anchor.clone().addScalar(1));expect(ref.root.position.toArray()).toEqual([5,3,2]);expect(pole.angleTo(ref.root.children[0].quaternion)).toBeCloseTo(0,10);expect(before.distanceTo(marker.position)).toBeGreaterThan(.18);
 const saved=new Map<THREE.Object3D,boolean>();isolateFamilyContext(scene,'earth',saved);expect(ref.root.visible).toBe(true);restoreFamilyContext(saved);ref.update(null,false,anchor);expect(ref.root.visible).toBe(false);
});
