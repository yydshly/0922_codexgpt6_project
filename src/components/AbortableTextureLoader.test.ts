import {afterEach,describe,expect,it,vi} from 'vitest';
import {AbortableTextureLoader} from './AbortableTextureLoader';
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function setup(){
 const requests:{signal:AbortSignal;resolve:(r:unknown)=>void}[]=[];
 const fetcher=vi.fn((_url:string,init:RequestInit)=>new Promise((resolve,reject)=>{requests.push({signal:init.signal!,resolve});init.signal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});}));
 vi.stubGlobal('fetch',fetcher);
 const images:{onload:(()=>void)|null;onerror:(()=>void)|null;src:string}[]=[];
 vi.stubGlobal('Image',class {onload=null;onerror=null;src='';constructor(){images.push(this);}});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const loader=new AbortableTextureLoader();
 const respond=async(index:number)=>{requests[index].resolve({ok:true,blob:async()=>new Blob(['image'])});await flush();};
 return {loader,fetcher,requests,images,revoke,respond};
}
describe('abortable panorama transfers',()=>{
 it('bounds concurrency and retains HTML image texture orientation after decoding',async()=>{
  const {loader,requests,fetcher,respond,images,revoke}=setup(),done=vi.fn();
  const a=loader.load('a',done);loader.load('b');loader.load('c');expect(fetcher).toHaveBeenCalledTimes(2);
  await respond(0);expect(done).not.toHaveBeenCalled();images[0].onload!();await flush();
  expect(done).toHaveBeenCalledWith(a);expect(a.image).toBe(images[0]);expect(a.flipY).toBe(true);expect(a.version).toBe(1);expect(requests).toHaveLength(3);expect(revoke).toHaveBeenCalledWith('blob:test');
 });
 it('aborts active work and never starts cancelled queued requests',async()=>{
  const {loader,requests,fetcher}=setup(),done=vi.fn(),error=vi.fn();
  const a=loader.load('a',done,undefined,error);loader.load('b');const c=loader.load('c');loader.cancel(c);loader.cancel(a);await flush();
  expect(requests[0].signal.aborted).toBe(true);expect(fetcher).toHaveBeenCalledTimes(2);expect(done).not.toHaveBeenCalled();expect(error).not.toHaveBeenCalled();
 });
 it('cancels decoding, revokes its blob URL and releases the queue slot',async()=>{
  const {loader,respond,images,revoke,requests}=setup(),done=vi.fn();const a=loader.load('a',done);loader.load('b');loader.load('c');
  await respond(0);loader.cancel(a);await flush();expect(images[0].onload).toBeNull();expect(images[0].src).toBe('');expect(revoke).toHaveBeenCalled();expect(requests).toHaveLength(3);expect(done).not.toHaveBeenCalled();
 });
 it('reports HTTP and decode failures and still starts queued work',async()=>{
  const {loader,requests,respond,images,revoke}=setup(),error=vi.fn();loader.load('a',undefined,undefined,error);loader.load('b',undefined,undefined,error);loader.load('c');
  requests[0].resolve({ok:false,status:503});await flush();expect(error.mock.calls[0][0].message).toContain('503');expect(requests).toHaveLength(3);
  await respond(1);images[0].onerror!();await flush();expect(error).toHaveBeenCalledTimes(2);expect(revoke).toHaveBeenCalled();
 });
});
