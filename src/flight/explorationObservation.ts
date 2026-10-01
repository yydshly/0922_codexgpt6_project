import { PerspectiveCamera,Quaternion,Vector3,Matrix4 } from 'three';

export interface ObservationPart {id:string;label:string;point:[number,number,number];detail:string}
export interface ObservationProfile {title:string;summary:string;distance:number;parts:ObservationPart[]}
export const OBSERVATIONS:Record<string,ObservationProfile>={
  satellite:{title:'卫星的几个部分分别做什么',summary:'这是合成教学卫星。标注跟随三维部件；这里只解释结构，没有模拟它正在通信或拍照。',distance:42,parts:[
    {id:'panel',label:'太阳能板',point:[6,.15,0],detail:'蓝色电池片把日照转为电能。这一模型展示板面与框架，当前探索航区没有计算发电功率。'},
    {id:'payload',label:'载荷镜头',point:[0,0,-2.5],detail:'朝外的深色圆筒表示观测载荷。接近能看清外形，不代表已经采集到图像。'},
    {id:'antenna',label:'天线',point:[0,2.5,.2],detail:'顶部天线表示与外界收发信号的结构。当前没有执行下传任务。'}]},
  stage:{title:'它不是仍在工作的卫星',summary:'级段的中心固定，外壳按教学设定缓慢翻滚；观察计时期间也会继续旋转。',distance:36,parts:[
    {id:'shell',label:'筒状外壳',point:[2,0,0],detail:'筒体表示运载级段的主要外壳。这里展示整体形态，不据此推断内部还剩多少推进剂。'},
    {id:'connector',label:'连接端',point:[0,0,6],detail:'较窄的金色短段是教学构型的连接端，不是正在点火的发动机。'},
    {id:'end',label:'端部框架',point:[1.7,0,-5],detail:'深色端环帮助辨认物体转动。它的翻滚与当前飞船的运动彼此独立。'}]},
  station:{title:'组合结构与独立部件',summary:'这是一座原创中继平台模型，不对应真实空间站，也没有载人驻留模拟。',distance:62,parts:[
    {id:'module',label:'延伸舱段',point:[0,1.5,8],detail:'浅色筒体是延伸舱段。将它和卫星主体比较，可以辨认组合平台的结构尺度。'},
    {id:'wing',label:'太阳能翼',point:[8,.3,0],detail:'两侧展开的电池片与主体连接，提供比机身更大的受光板面；此处只展示结构。'},
    {id:'body',label:'设备主体',point:[0,1.5,1.5],detail:'金色主体与顶部天线组成设备区，功能仅作教学说明，未运行真实中继服务。'}]},
  rock:{title:'从轮廓和光影认识岩体',summary:'不规则网格是真正的三维形状；这是合成演练物体，不是近地小行星的实测模型。',distance:220,parts:[
    {id:'outline',label:'不规则轮廓',point:[-49,0,0],detail:'不同方向看到的轮廓不一样。拖动观察镜头，可辨认凸起、凹陷和自转带来的变化。'},
    {id:'surface',label:'表面纹理',point:[12,13,40],detail:'表面复用了项目已有的月面纹理，增加凹凸观感，不代表这块合成岩体的真实地质资料。'}]},
  view:{title:'看地球，不是看一个空间建筑',summary:'该航点没有实体。观察镜头转向地球弧面；飞船仍保持在到达位置。',distance:0,parts:[]},
  home:{title:'返回以后仍是同一趟航程',summary:'镜头回看你的飞船。出发点是导航标记，返回不会补充燃料、复原时间或清空轨迹。',distance:65,parts:[]},
};

export interface CameraPose {position:Vector3;quaternion:Quaternion;target:Vector3;fov:number}
export function lookPose(position:Vector3,target:Vector3,fov=48):CameraPose {
  return {position:position.clone(),target:target.clone(),fov,quaternion:new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position,target,new Vector3(0,1,0)))};
}
/** Camera-only interpolation: it has no access to a vessel's position, attitude or fuel. */
export class ObservationCameraTransition {
  private from:CameraPose|null=null;
  elapsed=0;
  readonly duration=1.15;
  get active(){return !!this.from;}
  start(camera:PerspectiveCamera,target:Vector3){this.from={position:camera.position.clone(),quaternion:camera.quaternion.clone(),target:target.clone(),fov:camera.fov};this.elapsed=0;}
  cancel(){this.from=null;}
  update(camera:PerspectiveCamera,target:Vector3,goal:CameraPose,dt:number){
    if(!this.from)return false;
    this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,dt));const t=this.elapsed/this.duration,ease=t*t*(3-2*t);
    camera.position.lerpVectors(this.from.position,goal.position,ease);camera.quaternion.slerpQuaternions(this.from.quaternion,goal.quaternion,ease);target.lerpVectors(this.from.target,goal.target,ease);
    camera.fov=this.from.fov+(goal.fov-this.from.fov)*ease;camera.updateProjectionMatrix();
    if(t===1)this.from=null;return true;
  }
}
