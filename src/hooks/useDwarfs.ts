import { dwarfProvider } from '../ephemeris/dwarfs';
import { useMonthlyStates } from './useMonthlyStates';

export const useDwarfs = (time: number | undefined, enabled: boolean) => useMonthlyStates(dwarfProvider, time, enabled);
