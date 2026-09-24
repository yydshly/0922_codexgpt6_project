import { LocalMonthlyStateProvider } from './stateProvider';
export const COMETS = [{ id: 'halley', name: '哈雷彗星', color: '#8ce4eb' }, { id: '67p', name: '67P 彗星', color: '#f3c389' }, {id:'hale-bopp',name:'海尔—波普彗星',color:'#cfb6ff'}] as const;
export const cometProvider = new LocalMonthlyStateProvider('comets', COMETS.map(body => body.id));

export type CometId=typeof COMETS[number]['id'];
export const isCometId=(id:string|null):id is CometId=>COMETS.some(c=>c.id===id);
