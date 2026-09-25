import type {Vec3} from '../types';
export const OBSERVATION_HISTORY_LIMIT=12;
export interface ObservationHistory<T>{past:T[];future:T[]}
export const emptyHistory=<T>():ObservationHistory<T>=>({past:[],future:[]});
export function recordObservation<T>(history:ObservationHistory<T>,current:T):ObservationHistory<T>{return {past:[...history.past,current].slice(-OBSERVATION_HISTORY_LIMIT),future:[]};}
export function traverseObservation<T>(history:ObservationHistory<T>,current:T,direction:'back'|'forward'){
 const source=direction==='back'?history.past:history.future,destination=source.at(-1);
 if(destination===undefined)return null;
 return direction==='back'?{destination,history:{past:source.slice(0,-1),future:[...history.future,current].slice(-OBSERVATION_HISTORY_LIMIT)}}:{destination,history:{past:[...history.past,current].slice(-OBSERVATION_HISTORY_LIMIT),future:source.slice(0,-1)}};
}
export interface CameraBookmark{position:Vec3;target:Vec3;up:Vec3;anchor:Vec3|null;minDistance:number}
/** Keep the same relative viewpoint if a followed object moved since recording. */
export function relocateBookmark(view:CameraBookmark,anchor:Vec3|null):CameraBookmark{
 const delta=view.anchor&&anchor?anchor.map((v,i)=>v-view.anchor![i]):[0,0,0];
 return {...view,position:view.position.map((v,i)=>v+delta[i]) as Vec3,target:view.target.map((v,i)=>v+delta[i]) as Vec3,up:[...view.up],anchor:anchor?[...anchor]:null};
}
export interface CameraHistoryBridge{capture:(()=>CameraBookmark)|null;pending:CameraBookmark|null;pendingKey:string;route:string}

/** Reorient around the current target; keep distance and follow anchor unchanged. */
export function orientBookmark(view:CameraBookmark,angle:'oblique'|'edge'|'top'):CameraBookmark{
 const distance=Math.hypot(...view.position.map((v,i)=>v-view.target[i]));
 const direction=angle==='top'?[0,1,0]:angle==='edge'?[.28,.13,.94]:[.56,.58,.63];
 const length=Math.hypot(...direction);
 return {...view,position:view.target.map((v,i)=>v+direction[i]/length*distance) as Vec3,target:[...view.target],up:angle==='top'?[0,0,-1]:[0,1,0],anchor:view.anchor?[...view.anchor]:null};
}

export interface SolarObservationRoute {
 target:string|null;member:string|null;zone:string;tab:string;family:string;view:string;reset:number;
 familySelected:string|null;binarySelected:string|null;intent:string|null;environment:string|null;
 material:string|null;medium:string|null;boundary:string|null;motion:string|null;occultationView:'space'|'earth';
}
/** Use the same route identity for live views, history restoration and camera presets. */
export function solarObservationKey(v:SolarObservationRoute){
 return JSON.stringify([v.target,v.member,v.zone,v.tab,v.family,v.view,v.reset,v.familySelected,v.binarySelected,v.intent,v.environment,v.material,v.medium,v.boundary,v.motion,v.motion==='io-occultation'?v.occultationView:null]);
}
