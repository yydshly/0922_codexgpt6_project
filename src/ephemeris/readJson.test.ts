import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { readDataJson, DATA_REQUEST_TIMEOUT_MS } from './readJson';
import { LocalMonthlyStateProvider } from './stateProvider';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('bounded ephemeris requests', () => {
  it('aborts a stalled connection and settles even if the transport ignores abort', async () => {
    vi.useFakeTimers(); let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, options) => {
      signal = options.signal; return new Promise(() => {});
    }));
    const result = readDataJson('/data/manifest.json', '历表目录');
    const rejected = expect(result).rejects.toThrow('读取超时（30 秒）');
    await vi.advanceTimersByTimeAsync(DATA_REQUEST_TIMEOUT_MS);
    await rejected; expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('includes response-body stalls in the deadline', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: () => new Promise(() => {}) })));
    const result = expect(readDataJson('/data/month.json', '当月历表')).rejects.toThrow('读取超时');
    await vi.advanceTimersByTimeAsync(DATA_REQUEST_TIMEOUT_MS); await result;
  });

  it('clears timers after success and preserves decoded data', async () => {
    vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{"value":42}')));
    expect(await readDataJson('/data/month.json', '当月历表')).toEqual({ value: 42 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports HTTP, network, and JSON errors without leaving timers', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('<html>'));
    vi.stubGlobal('fetch', fetcher);
    for (const expected of ['HTTP 503', '网络读取失败', '格式无法识别'])
      await expect(readDataJson('/data/month.json', '当月历表')).rejects.toThrow(expected);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('evicts timed-out shared month requests, retries, and ignores late old responses', async () => {
    vi.useFakeTimers();
    const manifest = JSON.parse(readFileSync('public/data/dwarfs/manifest.json', 'utf8'));
    const chunk = JSON.parse(readFileSync('public/data/dwarfs/' + manifest.chunks[0].file, 'utf8'));
    let finishOld: (value: unknown) => void = () => {};
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => manifest })
      .mockResolvedValueOnce({ ok: true, json: () => new Promise(resolve => { finishOld = resolve; }) })
      .mockResolvedValueOnce({ ok: true, json: async () => chunk });
    vi.stubGlobal('fetch', fetcher);
    const provider = new LocalMonthlyStateProvider('dwarfs', manifest.bodyIds);
    const failures = [provider.get(manifest.startTdb), provider.get(manifest.startTdb)].map(p => expect(p).rejects.toThrow('超时'));
    await vi.advanceTimersByTimeAsync(DATA_REQUEST_TIMEOUT_MS); await Promise.all(failures);
    expect(fetcher).toHaveBeenCalledTimes(2); expect(provider.sample(manifest.startTdb)).toBeNull();
    const recovered = await provider.get(manifest.startTdb);
    expect(fetcher).toHaveBeenCalledTimes(3); expect(recovered.states).toHaveLength(3);
    finishOld({ series: [] }); await Promise.resolve(); await Promise.resolve();
    expect(provider.sample(manifest.startTdb)?.states).toEqual(recovered.states);
  });

  it('retries a timed-out directory instead of caching its failure', async () => {
    vi.useFakeTimers();
    const manifest = JSON.parse(readFileSync('public/data/dwarfs/manifest.json', 'utf8'));
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce({ ok: true, json: async () => manifest });
    vi.stubGlobal('fetch', fetcher);
    const provider = new LocalMonthlyStateProvider('dwarfs', manifest.bodyIds);
    const failed = expect(provider.loadManifest()).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(DATA_REQUEST_TIMEOUT_MS); await failed;
    expect(await provider.loadManifest()).toEqual(manifest);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
