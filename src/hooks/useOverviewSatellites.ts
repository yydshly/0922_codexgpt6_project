import { useCallback, useMemo } from 'react';
import type { SatelliteDefinition } from '../data/satellites';
import type { SatelliteState } from '../ephemeris/satellites';
import { useSatellites } from './useSatellites';

export type OverviewSatelliteState = SatelliteDefinition & SatelliteState;
export interface OverviewSatellitesResult {
  states: OverviewSatelliteState[];
  loading: boolean;
  error: string;
  retry: () => void;
}

/** The additional satellites at the main clock's exact current epoch.
 * Positions/velocities remain parent-centered ECLIPJ2000 in km and km/s.
 * A missing month yields no states from that system, never an older frame.
 * Each system shares the provider's cache with its dedicated close-up view.
 */
export function useOverviewSatellites(time:number|undefined,enabled:boolean):OverviewSatellitesResult {
  // Fixed hook order is intentional; no conditional hooks or dynamic parent loop.
  const jupiter=useSatellites('jupiter',time,enabled);
  const saturn=useSatellites('saturn',time,enabled);
  const neptune=useSatellites('neptune',time,enabled);
  const mars=useSatellites('mars',time,enabled);
  const uranus=useSatellites('uranus',time,enabled);
  const states=useMemo(()=>[
    ...jupiter.states,...saturn.states,...neptune.states,...mars.states,...uranus.states,
  ],[jupiter.states,saturn.states,neptune.states,mars.states,uranus.states]);
  const retry=useCallback(()=>{
    jupiter.retry();saturn.retry();neptune.retry();mars.retry();uranus.retry();
  },[jupiter.retry,saturn.retry,neptune.retry,mars.retry,uranus.retry]);
  const error=[
    jupiter.error&&`木星卫星：${jupiter.error}`,
    saturn.error&&`土星卫星：${saturn.error}`,
    neptune.error&&`海王星卫星：${neptune.error}`,
    mars.error&&`火星卫星：${mars.error}`,
    uranus.error&&`天王星卫星：${uranus.error}`,
  ].filter(Boolean).join('；');
  return {states,loading:jupiter.loading||saturn.loading||neptune.loading||mars.loading||uranus.loading,error,retry};
}
