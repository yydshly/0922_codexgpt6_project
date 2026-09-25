import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PanoramaTextureLoader, TEXTURE_WAIT_MS, type TextureLoadItem } from './PanoramaTextureLoader';

afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  const requests: { url: string; texture: THREE.Texture; done: (texture: THREE.Texture) => void; fail: (error: unknown) => void }[] = [];
  const native = { load: (url: string, done: (texture: THREE.Texture) => void, _progress: unknown, fail: (error: unknown) => void) => {
    const texture = new THREE.Texture(); requests.push({ url, texture, done, fail }); return texture;
  }} as unknown as THREE.TextureLoader;
  let items: TextureLoadItem[] = [];
  const changed = vi.fn((next: TextureLoadItem[]) => { items = next; });
  const loader = new PanoramaTextureLoader(changed, native);
  return { loader, requests, changed, items: () => items };
}

describe('panorama texture recovery', () => {
  it('times out, ignores a late image and disposes its GPU resource', async () => {
    const { loader, requests, items } = setup(); const apply = vi.fn(), fail = vi.fn();
    loader.load('/earth.jpg', apply, undefined, fail);
    const old = requests[0], dispose = vi.spyOn(old.texture, 'dispose');
    await vi.advanceTimersByTimeAsync(TEXTURE_WAIT_MS);
    expect(items()[0].status).toBe('error'); expect(fail).toHaveBeenCalledTimes(1);
    old.done(old.texture); expect(apply).not.toHaveBeenCalled(); expect(dispose).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('retries only failed items and replaces their callback texture', () => {
    const { loader, requests, items } = setup(); const apply = vi.fn();
    loader.load('/sun.jpg'); loader.load('/earth.jpg', apply);
    requests[0].done(requests[0].texture); requests[1].fail(new Error('offline'));
    loader.retryFailed(); loader.retryFailed();
    expect(requests.map(r => r.url)).toEqual(['/sun.jpg', '/earth.jpg', '/earth.jpg']);
    requests[2].done(requests[2].texture);
    expect(apply).toHaveBeenCalledWith(requests[2].texture);
    expect(items().map(i => i.status)).toEqual(['ready', 'ready']); expect(vi.getTimerCount()).toBe(0);
  });
  it('old attempts cannot change a retry that is still loading', async () => {
    const { loader, requests, items } = setup(); const apply = vi.fn();
    loader.load('/moon.jpg', apply); await vi.advanceTimersByTimeAsync(TEXTURE_WAIT_MS);
    loader.retryFailed(); requests[0].done(requests[0].texture); requests[0].fail(new Error());
    expect(items()[0].status).toBe('loading'); expect(apply).not.toHaveBeenCalled();
    requests[1].done(requests[1].texture); expect(apply).toHaveBeenCalledTimes(1); loader.dispose();
  });
  it('scene disposal prevents all later callbacks and leaves successful textures to their scene owner', () => {
    const { loader, requests, changed } = setup(); const apply = vi.fn();
    loader.load('/sun.jpg'); requests[0].done(requests[0].texture);
    const releaseReady = vi.spyOn(requests[0].texture, 'dispose'); loader.load('/clouds.jpg', apply);
    loader.dispose(); const changes = changed.mock.calls.length;
    requests[1].done(requests[1].texture); requests[1].fail(new Error()); loader.retryFailed();
    expect(apply).not.toHaveBeenCalled(); expect(changed).toHaveBeenCalledTimes(changes);
    expect(releaseReady).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('cloud-shell recreation supersedes its old callbacks without duplicating the status row', () => {
    const { loader, requests, items } = setup(); const old = vi.fn(), fresh = vi.fn();
    loader.load('/clouds.jpg', old); loader.load('/clouds.jpg', fresh);
    requests[0].done(requests[0].texture); requests[1].done(requests[1].texture);
    expect(old).not.toHaveBeenCalled(); expect(fresh).toHaveBeenCalledTimes(1);
    expect(items()).toEqual([{ url: '/clouds.jpg', status: 'ready' }]); expect(vi.getTimerCount()).toBe(0);
  });
});
