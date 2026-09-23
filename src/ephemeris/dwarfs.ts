import { DWARF_IDS } from '../data/dwarfs';
import { LocalMonthlyStateProvider } from './stateProvider';

export const dwarfProvider = new LocalMonthlyStateProvider('dwarfs', DWARF_IDS);
