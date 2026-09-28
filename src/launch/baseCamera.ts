import * as THREE from 'three';

/** Ground and ascent use the same metre axes; only the render origin changes. */
export function rebaseLaunchCamera(position: THREE.Vector3, target: THREE.Vector3, origin: THREE.Vector3) {
  return { position: position.clone().sub(origin), target: target.clone().sub(origin) };
}

export type PadView='overview'|'ground'|'service';
export const PAD_VIEWS:{id:PadView;name:string;description:string}[]=[
  {id:'overview',name:'箭体与塔架',description:'先看完整箭体与服务塔，再观察连接臂和平台。场地布局为教学设定。'},
  {id:'ground',name:'地面仰望',description:'镜头位于地面上方约 2 米；向上观察箭体、服务塔和连接臂。只改变观察位置，不启动火箭。'},
  {id:'service',name:'连接臂近景',description:'观察塔架伸向箭体的连接臂与管线；这是静置结构示意，未模拟流体和实际作业。'},
];

/** Fit a preset's target volume inside the usable central portion of a desktop canvas. */
export function padCameraPose(view:PadView,aspect:number,fovDeg=44) {
  const target=new THREE.Vector3(-6,43,0);
  const radius=view==='service'?27:52;
  const halfFov=Math.atan(Math.tan(THREE.MathUtils.degToRad(fovDeg/2))*Math.min(1,Math.max(.3,aspect)));
  const distance=radius/Math.sin(halfFov)*1.16;
  const direction=new THREE.Vector3(...(view==='service'?[1,.05,1.65]:[-.6,.1,1]) as [number,number,number]).normalize();
  const position=target.clone().addScaledVector(direction,distance);
  if(view==='ground'){
    const horizontal=Math.sqrt(Math.max(1,distance*distance-(target.y-2.2)**2));
    position.copy(target).addScaledVector(new THREE.Vector3(-.55,0,1).normalize(),horizontal);position.y=2.2;
  }
  return {target,position};
}
