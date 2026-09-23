import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { satelliteById } from '../data/satellites';
import { tdbToUtc } from '../data/time';
import { getSatelliteFrame, sampleSatelliteFrame } from '../ephemeris/satellites';
import type { BodyId } from '../types';

/** The observational satellite layer shares the main clock, never the ten-body integrator. */
export function useSatellites(parentId: BodyId, time: number | undefined, enabled: boolean) {
  const [revision, setRevision] = useState(0);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const generation = useRef(0);
  const requestKey = `${parentId}:${time === undefined || !Number.isFinite(time) ? 'none' : tdbToUtc(time).toISOString().slice(0, 7)}`;
  const current = useRef({ requestKey, enabled });
  current.current = { requestKey, enabled };
  const result = useMemo(() => {
    if (!enabled || time === undefined) return { frame: null, error: '' };
    try { return { frame: sampleSatelliteFrame(time, parentId), error: '' }; }
    catch (error) { return { frame: null, error: error instanceof Error ? error.message : '卫星历表读取失败' }; }
  }, [enabled, time, parentId, revision]);

  useEffect(() => {
    if (!enabled || time === undefined || result.frame || result.error || failure?.key === requestKey) return;
    const token = ++generation.current;
    // Network requests are deduplicated by the provider. After a seek/parent change,
    // a superseded request may warm its cache but must never display its old state.
    void getSatelliteFrame(time, parentId).then(() => {
      if (token === generation.current && current.current.enabled) setRevision(value => value + 1);
    }).catch(error => {
      if (token !== generation.current || !current.current.enabled || current.current.requestKey !== requestKey) return;
      setFailure({ key: requestKey, message: error instanceof Error ? error.message : '卫星历表读取失败，请重试' });
    });
    return () => { if (token === generation.current) generation.current++; };
  }, [enabled, parentId, time, requestKey, result.frame, result.error, failure, revision]);

  const retry = useCallback(() => { setFailure(null); setRevision(value => value + 1); }, []);
  const error = enabled && !result.frame ? result.error || (failure?.key === requestKey ? failure.message : '') : '';
  const states = useMemo(() => result.frame?.states.map(state => ({ ...satelliteById[state.id], ...state })) ?? [], [result.frame]);
  return { states, loading: enabled && time !== undefined && !result.frame && !error, error, retry };
}
