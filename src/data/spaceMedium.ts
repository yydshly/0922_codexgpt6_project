import type {PhenomenonParts} from './phenomenonParts';
import type {IntegratedTarget,IntegratedId} from './integratedScene';
export const MEDIUM_LESSONS=[
 {id:'parkerField',name:'行星际磁场',title:'磁场：帕克螺旋参考形态',text:'太阳风向外流动，同时太阳自转，使大尺度行星际磁场常呈螺旋形态。线用于表达场的方向与连接，不是实体轨道；磁场也分布在这些线之间的三维空间。',legend:'青色曲线是选取的参考场线；上下倾角、疏密和弯曲均为绘图选值，没有当日磁场强度或磁极方向数据。',source:'https://science.nasa.gov/sun/facts/'},
 {id:'currentSheet',name:'日球电流片',title:'电流片：起伏的磁极性分界面',text:'太阳磁场的不同极性区域之间存在电流片。磁轴倾斜及自转使这片结构在空间中起伏；它不是固体薄膜，也不是行星运行所在的盘面。',legend:'半透明紫色曲面标记参考分界；高度增强，不表示真实厚度、电流强度或当前形状。拖动镜头可从侧面看起伏。',source:'https://www.nasa.gov/image-article/heliospheric-current-sheet/'},
 {id:'photonRays',name:'光与电磁辐射',title:'光：太阳向外传出的电磁辐射',text:'可见光只是太阳电磁辐射的一部分，还包括无线电、紫外和 X 射线等。图中的黄色箭头表示向外传播的方向；太阳风则是物质流，两者不能混称。',legend:'黄色直线是传播方向示意，不是可见光柱；不计算光谱、强度、吸收或传播时间，也不与粒子图比较动画速度。',source:'https://ael.gsfc.nasa.gov/670/aboutheliophysics.html'},
 {id:'chargedParticles',name:'带电粒子',title:'带电粒子：局部磁场中的运动示意',text:'电子、质子等带电粒子的运动会受到磁场影响。这里用局部均匀磁场中的螺旋路径帮助理解沿场运动与绕场回旋；真实太阳高能粒子的传播还涉及更复杂的过程。',legend:'放大局部示意：青色平行线为均匀参考磁场，粉色螺旋为单条轨迹示例；不是日心轨道，不是帕克场线，也不提供能量、通量或剂量。',source:'https://cosmicopia.gsfc.nasa.gov/magfield.html'},
 {id:'neutralAtoms',name:'中性原子',title:'中性原子：不带净电荷的物质',text:'星际中性原子能进入日球层；离子通过电荷交换也能成为中性原子。高能中性原子可携带远处环境的信息。它们不是光子，不受带电粒子那样的磁场偏转。',legend:'绿色点和直线只说明简化的自由飞行方向；未模拟电荷交换、引力、辐射压力或电离，并非 IBEX 当日观测图。',source:'https://science.nasa.gov/learn/heat/resource/components-of-the-heliosphere/'},
] as const;
export type MediumId=typeof MEDIUM_LESSONS[number]['id'];
export type MediumLesson=typeof MEDIUM_LESSONS[number];
export function mediumParts(parts:PhenomenonParts,id:MediumId):PhenomenonParts{return {...parts,sheath:false,medium:false,neutrals:false,...Object.fromEntries(MEDIUM_LESSONS.map(s=>[s.id,s.id===id]))};}
export function mediumLessonForView(target:IntegratedTarget|null,intent:IntegratedId|null,parts:PhenomenonParts):MediumLesson|null{
 if(target!=='helio'||intent!=='helio'||parts.sheath||parts.medium||parts.neutrals)return null;
 const shown=MEDIUM_LESSONS.filter(s=>parts[s.id]);return shown.length===1?shown[0]:null;
}
/** Reference geometry in arbitrary drawing units; no measured field or current density. */
export function parkerPoint(t:number,az:number,latitude:number):[number,number,number]{const r=.55+4.6*t,a=az-1.6*t;return [r*Math.cos(a)*Math.cos(latitude),r*Math.sin(latitude),r*Math.sin(a)*Math.cos(latitude)];}
export function sheetPoint(t:number,az:number):[number,number,number]{const r=.55+4.6*t;return [r*Math.cos(az),r*.36*Math.sin(az+4.8*t),r*Math.sin(az)];}
