import {useEffect,useState} from 'react';
import {coorbitalProvider,coorbitalTrackTimes} from '../data/coorbital';
import type {StateBatch} from '../ephemeris/stateProvider';
export function useCoorbitalTracks(time:number|undefined,enabled:boolean){
 const year=time===undefined?null:coorbitalTrackTimes(time).year;
 const [result,setResult]=useState<{year:number;tracks:StateBatch[];error:string}|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!enabled||year===null)return;let live=true;
 const {times}=coorbitalTrackTimes(time!);
 void Promise.all(times.map(t=>coorbitalProvider.get(t))).then(tracks=>{if(live)setResult({year,tracks,error:''});}).catch(e=>{if(live)setResult({year,tracks:[],error:e instanceof Error?e.message:'轨迹读取失败'});});return ()=>{live=false;};
 },[year,enabled,retry]);
 return {year,tracks:enabled&&result?.year===year?result.tracks:[],error:enabled&&result?.year===year?result.error:'',retry:()=>setRetry(n=>n+1)};
}
