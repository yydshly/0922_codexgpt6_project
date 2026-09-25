import {useEffect,useState} from 'react';
import {publicAsset} from '../data/publicAsset';
import {validateErosShape,type ErosShapeData} from '../data/erosShape';
export function useErosShape(enabled:boolean){
 const [data,setData]=useState<ErosShapeData|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!enabled||data)return;const controller=new AbortController();setError('');
  fetch(publicAsset('/data/eros-shape/model.json'),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(validateErosShape).then(d=>{if(!controller.signal.aborted)setData(d);}).catch(()=>{if(!controller.signal.aborted)setError('形状资料读取失败，暂用球形位置标记。');});
  return ()=>controller.abort();
 },[enabled,data,attempt]);
 return {data,error,retry:()=>setAttempt(n=>n+1)};
}
