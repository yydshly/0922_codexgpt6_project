import {Component, Suspense, lazy, useEffect, useRef, useState, type ComponentType, type ReactNode} from 'react';
import './DeferredDialog.css';

class DialogBoundary extends Component<{fallback:ReactNode;children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}

function DialogStatus({title,failed=false,onClose,onRetry}:{title:string;failed?:boolean;onClose:()=>void;onRetry?:()=>void}){
  const root=useRef<HTMLDivElement>(null);
  const [slow,setSlow]=useState(false);
  useEffect(()=>{
    if(failed)return;
    const timer=window.setTimeout(()=>setSlow(true),12000);
    return ()=>window.clearTimeout(timer);
  },[failed]);
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{root.current?.querySelector<HTMLButtonElement>('button')?.focus();},[]);
  return <div className="deferred-dialog-backdrop"><div ref={root} className="deferred-dialog" data-load-state={failed?'failed':slow?'slow':'pending'} role="dialog" aria-modal="true" aria-label={title} onKeyDown={event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();close.current();}
    if(event.key==='Tab'){
      const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button')??[]);
      const next=(buttons.indexOf(document.activeElement as HTMLButtonElement)+(event.shiftKey?-1:1)+buttons.length)%buttons.length;
      event.preventDefault();buttons[next]?.focus();
    }
  }}>
    <h2>{title}</h2><p role={failed?'alert':'status'}>{failed?'内容加载失败。可以关闭窗口，保留当前观察。':slow?'加载时间较长，仍在等待内容。你可以继续等待，或关闭窗口返回观察；内容就绪后会在此处显示。':'正在准备内容…'}</p>
    {(failed||slow)&&<p>若网络已恢复但仍无法打开，可主动重新加载页面。重载会回到默认观察，当前日期、镜头和开关可能重置。</p>}
    <div><button onClick={onClose}>关闭</button>{(failed||slow)&&<button onClick={onRetry}>重新加载页面</button>}</div>
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
      <Suspense fallback={<DialogStatus title={title} onClose={props.onClose} onRetry={()=>window.location.reload()}/>}><Loaded {...props}/></Suspense>
    </DialogBoundary>;
  };
}
