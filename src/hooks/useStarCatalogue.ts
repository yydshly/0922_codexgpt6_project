import {useEffect,useState} from 'react';
import {parseStarCatalogue,type StarCatalogue} from '../data/starCatalogue';
export function useStarCatalogue(enabled:boolean){
 const [data,setData]=useState<StarCatalogue|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!enabled||data)return;const abort=new AbortController();let live=true;setError('');
 fetch(`${import.meta.env.BASE_URL}data/stars/hip2-subset.json`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}).then(parseStarCatalogue).then(c=>{if(live)setData(c);}).catch(e=>{if(live)setError(`恒星目录加载失败：${e.message}`);});
 return()=>{live=false;abort.abort();};},[enabled,data,attempt]);
 return {data,error,retry:()=>setAttempt(n=>n+1)};
}
