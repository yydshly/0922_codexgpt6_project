import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {validateErosShape,defaultErosShapeChoices} from '../data/erosShape';
import {erosGeometry,erosAttitude,createErosShape} from './macroErosShape';
const raw=JSON.parse(readFileSync('public/data/eros-shape/model.json','utf8'));
const data=validateErosShape(raw);
describe('PDS Eros shape provenance and geometry',()=>{
 it('retains archived bytes and zero-based vertex references',()=>{
  for(const source of raw.metadata.sources)expect(createHash('sha256').update(readFileSync('data-sources/eros-shape/'+source.file)).digest('hex')).toBe(source.sha256);
  const lines=readFileSync('data-sources/eros-shape/eros007790.tab','utf8').trim().split(/\r?\n/).map(l=>l.trim().split(/\s+/));
  expect(lines.filter(l=>l[0]==='v').flatMap(l=>l.slice(1).map(Number))).toEqual(data.positionsKm);
  expect(lines.filter(l=>l[0]==='f').flatMap(l=>l.slice(1).map(Number))).toEqual(data.indices);
 });
 it('rejects wrong units, version, corrupt indices and invalid positions',()=>{
  for(const mutate of [(d:typeof raw)=>d.metadata.units='m',(d:typeof raw)=>d.metadata.version='other',(d:typeof raw)=>d.indices[0]=3897,(d:typeof raw)=>d.positionsKm[0]=NaN]){const d=structuredClone(raw);mutate(d);expect(()=>validateErosShape(d)).toThrow();}
 });
 it('is closed with consistently oriented, nondegenerate faces and sphere-equivalent volume',()=>{
  const edges=new Map<string,number>();let volume=0;
  for(let i=0;i<data.indices.length;i+=3){
   const ids=data.indices.slice(i,i+3),[a,b,c]=ids.map(n=>new THREE.Vector3(...data.positionsKm.slice(n*3,n*3+3)));
   expect(new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).length()).toBeGreaterThan(1e-8);
   volume+=a.dot(new THREE.Vector3().crossVectors(b,c))/6;
   for(let j=0;j<3;j++){const key=ids[j]+','+ids[(j+1)%3];edges.set(key,(edges.get(key)??0)+1);}
  }
  for(const [key,n] of edges){expect(n).toBe(1);expect(edges.get(key.split(',').reverse().join(','))).toBe(1);}
  expect(volume).toBeCloseTo(data.metadata.volumeKm3,6);
  expect(Math.cbrt(3*volume/(4*Math.PI))).toBeCloseTo(data.metadata.equivalentRadiusKm,8);
 });
 it('uses one size scale without normalizing or stretching individual axes',()=>{
  const geometry=erosGeometry(data),pos=geometry.getAttribute('position');
  for(const i of [0,1,327,3896])for(let j=0;j<3;j++)expect(pos.array[i*3+j]).toBeCloseTo(data.positionsKm[i*3+j]*.13/data.metadata.equivalentRadiusKm,6);
  expect(pos.count).toBe(3897);expect(geometry.index?.count).toBe(7790*3);geometry.dispose();
 });
 it('keeps the published pole and periodic phase independent of frame rate',()=>{
  const t=8e8,p=86400*360/data.metadata.rotationRateDegPerDay,q=erosAttitude(t,data);
  expect(q.angleTo(erosAttitude(t+p,data))).toBeLessThan(1e-6);
  expect(q.angleTo(erosAttitude(t+p/2,data))).toBeCloseTo(Math.PI,5);
  const pole=new THREE.Vector3(0,0,1).applyQuaternion(q),after=new THREE.Vector3(0,0,1).applyQuaternion(erosAttitude(t+10000,data));
  expect(pole.distanceTo(after)).toBeLessThan(1e-10);
  const a=11.35*Math.PI/180,d=17.216*Math.PI/180,e=23.439291111*Math.PI/180;
  const expected=new THREE.Vector3(Math.cos(d)*Math.cos(a),-Math.cos(d)*Math.sin(a)*Math.sin(e)+Math.sin(d)*Math.cos(e),-Math.cos(d)*Math.sin(a)*Math.cos(e)-Math.sin(d)*Math.sin(e));
  expect(pole.distanceTo(expected)).toBeLessThan(1e-10);
 });
 it('replaces the marker only with loaded geometry and supports sphere comparison',()=>{
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.13),new THREE.MeshStandardMaterial()),shape=createErosShape(marker),choices=defaultErosShapeChoices();
  shape.update({data:null,choices},100);expect(marker.material.visible).toBe(true);expect(shape.mesh.visible).toBe(false);
  shape.update({data,choices},100);expect(marker.material.visible).toBe(false);expect(shape.mesh.visible).toBe(true);expect(shape.mesh.userData.memberId).toBe('eros');
  const phase=shape.mesh.quaternion.clone();shape.update({data,choices},100);expect(phase.equals(shape.mesh.quaternion)).toBe(true);
  shape.update({data,choices:{shape:false,wireframe:true}},100);expect(marker.material.visible).toBe(true);expect(shape.mesh.visible).toBe(false);
  shape.update({data,choices:{shape:true,wireframe:true}},100);expect(shape.mesh.material.wireframe).toBe(true);
 });
});
