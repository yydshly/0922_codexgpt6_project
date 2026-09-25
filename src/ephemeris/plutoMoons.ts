import {PLUTO_MOON_IDS} from '../data/plutoMoons';
import {LocalMonthlyStateProvider} from './stateProvider';
export const plutoMoonProvider=new LocalMonthlyStateProvider('pluto-moons',PLUTO_MOON_IDS);
