import * as THREE from 'three';

export type TextureLoadStatus = 'loading' | 'ready' | 'error';
export interface TextureLoadItem { url: string; status: TextureLoadStatus }
type Job = TextureLoadItem & {
  generation: number; texture?: THREE.Texture; timer?: ReturnType<typeof setTimeout>;
  onLoad?: (texture: THREE.Texture) => void;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (error: unknown) => void;
};
export const TEXTURE_WAIT_MS = 30_000;

/** Callback-based panorama consumers own successful textures; late/failed textures stay here.
 * ImageLoader's underlying browser transfer cannot be aborted through TextureLoader.
 * A deadline ends UI waiting and rejects late callbacks, not the browser transfer itself.
 */
export class PanoramaTextureLoader extends THREE.TextureLoader {
  private jobs = new Map<string, Job>();
  private closed = false;
  constructor(private readonly changed: (items: TextureLoadItem[]) => void,
    private readonly native = new THREE.TextureLoader()) { super(); }

  override load(url: string, onLoad?: (texture: THREE.Texture) => void,
    onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void): THREE.Texture {
    const previous = this.jobs.get(url);
    if (previous) this.cancel(previous);
    const job: Job = { url, status: 'loading', generation: 0, onLoad, onProgress, onError };
    if (this.closed) return new THREE.Texture();
    this.jobs.set(url, job);
    return this.start(job);
  }

  retryFailed(): void {
    for (const job of this.jobs.values()) if (job.status === 'error') this.start(job);
  }

  dispose(): void {
    this.closed = true;
    for (const job of this.jobs.values()) this.cancel(job);
    this.jobs.clear();
  }

  private emit(): void {
    if (!this.closed) this.changed([...this.jobs.values()].map(({ url, status }) => ({ url, status })));
  }
  private cancel(job: Job): void {
    clearTimeout(job.timer); job.generation++;
    if (job.status !== 'ready') job.texture?.dispose();
  }
  private start(job: Job): THREE.Texture {
    const generation = ++job.generation;
    job.status = 'loading'; this.emit();
    const current = () => !this.closed && this.jobs.get(job.url) === job && job.generation === generation && job.status === 'loading';
    const fail = (error: unknown) => {
      if (!current()) return;
      clearTimeout(job.timer); job.status = 'error'; job.texture?.dispose();
      job.onError?.(error); this.emit();
    };
    job.timer = setTimeout(() => fail(new Error('贴图等待超过 30 秒')), TEXTURE_WAIT_MS);
    try {
      job.texture = this.native.load(job.url, texture => {
        if (!current()) { texture.dispose(); return; }
        clearTimeout(job.timer); job.status = 'ready'; job.onLoad?.(texture); this.emit();
      }, job.onProgress, fail);
    } catch (error) { fail(error); }
    return job.texture ?? new THREE.Texture();
  }
}
