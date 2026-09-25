import {Component, Suspense, lazy, useEffect, useRef, type ComponentType, type ReactNode} from 'react';
import './DeferredDialog.css';

class DialogBoundary extends Component<{fallback:ReactNode;children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}

function DialogStatus({title,failed=false,onClose,onRetry}:{title:string;failed?:boolean;onClose:()=>void;onRetry?:()=>void}){
  const root=useRef<HTMLDivElement>(null);
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{root.current?.querySelector<HTMLButtonElement>('button')?.focus();},[]);
  return <div className="deferred-dialog-backdrop"><div ref={root} className="deferred-dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDown={event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();close.current();}
    if(event.key==='Tab'){
      const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button')??[]);
      const next=(buttons.indexOf(document.activeElement as HTMLButtonElement)+(event.shiftKey?-1:1)+buttons.length)%buttons.length;
      event.preventDefault();buttons[next]?.focus();
    }
  }}>
    <h2>{title}</h2><p role={failed?'alert':'status'}>{failed?'暂时无法打开。关闭可保留当前观察；网络恢复后，可重新加载页面再打开此窗口。重载会恢复默认观察。':'正在准备内容…'}</p>
    <div>{failed&&<button onClick={onRetry}>重新加载页面</button>}<button onClick={onClose}>关闭</button></div>
  </div></div>;
}

/** The browser caches failed module imports too: recovery requires an explicit page reload. */
export function deferDialog<P extends {onClose:()=>void}>(title:string,load:()=>Promise<{default:ComponentType<P>}>){
  const Loaded=lazy(load);
  return function DeferredDialog(props:P){
    const opener=useRef(document.activeElement as HTMLElement|null);
    useEffect(()=>()=>{
      const target=opener.current;
      if(target?.isConnected){
        const visible=target.getClientRects().length?target:target.closest('details')?.querySelector('summary');
        visible?.focus({preventScroll:true});
      }
    },[]);
    return <DialogBoundary fallback={<DialogStatus title={title} failed onClose={props.onClose} onRetry={()=>window.location.reload()}/>}>
      <Suspense fallback={<DialogStatus title={title} onClose={props.onClose}/>}><Loaded {...props}/></Suspense>
    </DialogBoundary>;
  };
}
