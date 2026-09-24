import { LocalMonthlyStateProvider } from './stateProvider';
export const COMETS = [{ id: 'halley', name: '哈雷彗星', color: '#8ce4eb' }, { id: '67p', name: '67P 彗星', color: '#f3c389' }] as const;
export const cometProvider = new LocalMonthlyStateProvider('comets', COMETS.map(body => body.id));
