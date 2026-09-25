import * as THREE from 'three';
import {parkerPoint,sheetPoint,type MediumId,MEDIUM_LESSONS} from '../data/spaceMedium';
import type {PhenomenonParts} from '../data/phenomenonParts';
export function createSpaceMedium(texture:THREE.Texture){
 const root=new THREE.Group();root.name='space-medium-explanations';root.userData.sceneElement='helio';
 const groups=Object.fromEntries(MEDIUM_LESSONS.map(s=>{const g=new THREE.Group();g.name=s.id;root.add(g);return [s.id,g];})) as Record<MediumId,THREE.Group>;
 const line=(p:THREE.Vector3[],color:string,opacity=.7)=>new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
 for(const lat of [-.55,0,.55])for(let k=0;k<8;k++)groups.parkerField.add(line(Array.from({length:100},(_,j)=>new THREE.Vector3(...parkerPoint(j/99,k*Math.PI/4,lat))),'#69cdd6',lat===0?.8:.4));
 const verts:number[]=[],indices:number[]=[];const nr=36,na=96;
 for(let r=0;r<=nr;r++)for(let a=0;a<=na;a++)verts.push(...sheetPoint(r/nr,a/na*Math.PI*2));
 for(let r=0;r<nr;r++)for(let a=0;a<na;a++){const k=r*(na+1)+a;indices.push(k,k+1,k+na+1,k+1,k+na+2,k+na+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setIndex(indices);geometry.computeVertexNormals();groups.currentSheet.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#c49cea',transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false})));
 for(let a=0;a<12;a++)groups.currentSheet.add(line(Array.from({length:50},(_,j)=>new THREE.Vector3(...sheetPoint(j/49,a/12*Math.PI*2))),'#d6b3eb',.55));
 for(const t of [.25,.5,.75,1])groups.currentSheet.add(line(Array.from({length:129},(_,j)=>new THREE.Vector3(...sheetPoint(t,j/128*Math.PI*2))),'#d6b3eb',.4));
 for(let i=0;i<22;i++){const y=1-2*(i+.5)/22,a=i*2.399963,d=new THREE.Vector3(Math.sqrt(1-y*y)*Math.cos(a),y,Math.sqrt(1-y*y)*Math.sin(a));groups.photonRays.add(new THREE.ArrowHelper(d,d.clone().multiplyScalar(.5),4.4,0xf0d481,.2,.09));}
 for(const z of [-.7,0,.7])groups.chargedParticles.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-4,0,z),8,0x69cdd6,.2,.09));
 groups.chargedParticles.add(line(Array.from({length:401},(_,j)=>{const t=j/400;return new THREE.Vector3(-3.8+7.6*t,.42*Math.cos(t*Math.PI*16),.42*Math.sin(t*Math.PI*16));}),'#efa0cb',.9));
 const charged=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),new THREE.MeshBasicMaterial({color:'#efa0cb'}));charged.position.set(0,.42,0);groups.chargedParticles.add(charged);
 const np:THREE.Vector3[]=[];for(let i=0;i<16;i++){const y=(i%4-1.5)*1.1,z=(Math.floor(i/4)-1.5)*1.1,x=-3.5+(i*.618%1)*7;np.push(new THREE.Vector3(x,y,z));groups.neutralAtoms.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(x-.8,y,z),.8,0x9ed7b0,.12,.065));}
 groups.neutralAtoms.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(np),new THREE.PointsMaterial({color:'#b6eed0',map:texture,size:.14,transparent:true,depthWrite:false})));
 return {root,update(parts:PhenomenonParts,localParticles=false){for(const s of MEDIUM_LESSONS)groups[s.id].visible=parts[s.id]&&(s.id!=='chargedParticles'||localParticles);}};
}
