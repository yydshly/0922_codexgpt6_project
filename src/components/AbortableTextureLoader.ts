import * as THREE from 'three';

/** Limit decorative transfers so pending images cannot occupy every connection.
 * Decode through an HTML image to retain TextureLoader flipY / color behavior.
 */
export class AbortableTextureLoader extends THREE.TextureLoader {
  private queued: (()=>void)[]=[];
  private active=0;
  private cancellations=new WeakMap<THREE.Texture,()=>void>();
  cancel(texture:THREE.Texture){this.cancellations.get(texture)?.();}
  override load(url:string,onLoad?:(texture:THREE.Texture)=>void,_onProgress?:(event:ProgressEvent)=>void,onError?:(error:unknown)=>void):THREE.Texture {
    const texture=new THREE.Texture(),controller=new AbortController();
    let cancelled=false,image:HTMLImageElement|undefined,objectUrl:string|undefined;
    const cleanup=()=>{if(image){image.onload=null;image.onerror=null;}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=undefined;}this.cancellations.delete(texture);};
    this.cancellations.set(texture,()=>{cancelled=true;controller.abort();if(image)image.src='';cleanup();});
    this.queued.push(()=>{
      if(cancelled)return;
      this.active++;
      void (async()=>{
        try {
          const response=await fetch(url,{signal:controller.signal,priority:'low'});
          if(!response.ok)throw new Error(`贴图 HTTP ${response.status}`);
          const blob=await response.blob();
          if(cancelled)return;
          objectUrl=URL.createObjectURL(blob);image=new Image();
          await new Promise<void>((resolve,reject)=>{
            const abort=()=>reject(new DOMException('Aborted','AbortError'));
            controller.signal.addEventListener('abort',abort,{once:true});
            image!.onload=()=>{controller.signal.removeEventListener('abort',abort);resolve();};
            image!.onerror=()=>{controller.signal.removeEventListener('abort',abort);reject(new Error('贴图解码失败'));};
            image!.src=objectUrl!;
          });
          if(!cancelled){texture.image=image;texture.needsUpdate=true;onLoad?.(texture);}
        }catch(error){if(!cancelled)onError?.(error);}
        finally{cleanup();this.active--;this.pump();}
      })();
    });
    this.pump();return texture;
  }
  private pump(){while(this.active<2&&this.queued.length)this.queued.shift()!();}
}
