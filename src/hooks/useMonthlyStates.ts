import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tdbToUtc } from '../data/time';
import type { LocalMonthlyStateProvider } from '../ephemeris/stateProvider';
import type { StateBatch } from '../ephemeris/stateProvider';

/** Date changes never display an old month while the new pack is loading. */
export function useMonthlyStates(provider: LocalMonthlyStateProvider, time: number | undefined, enabled: boolean) {
  const [revision, setRevision] = useState(0);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const generation = useRef(0);
  const key = time === undefined || !Number.isFinite(time) ? 'none' : tdbToUtc(time).toISOString().slice(0, 7);
  const current = useRef({ key, enabled });
  current.current = { key, enabled };
  const result = useMemo(() => {
    if (!enabled || time === undefined) return { batch: null as StateBatch | null, error: '' };
    try { return { batch: provider.sample(time), error: '' }; }
    catch (error) { return { batch: null, error: error instanceof Error ? error.message : '扩展历表读取失败' }; }
  }, [provider, time, enabled, revision]);

  useEffect(() => {
    if (!enabled || time === undefined || result.batch || result.error || failure?.key === key) return;
    const token = ++generation.current;
    void provider.get(time).then(() => {
      if (token === generation.current && current.current.enabled && current.current.key === key)
        setRevision(value => value + 1);
    }).catch(error => {
      if (token === generation.current && current.current.enabled && current.current.key === key)
        setFailure({ key, message: error instanceof Error ? error.message : '扩展历表读取失败' });
    });
    return () => { if (token === generation.current) generation.current++; };
  }, [provider, enabled, key, result.batch, result.error, failure]);

  const retry = useCallback(() => { setFailure(null); setRevision(value => value + 1); }, []);
  const error = enabled && !result.batch ? result.error || (failure?.key === key ? failure.message : '') : '';
  return { batch: result.batch, loading: enabled && time !== undefined && !result.batch && !error, error, retry };
}
