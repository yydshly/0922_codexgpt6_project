import type { FlightSave } from './flightSession';
export const FLIGHT_STORAGE_KEY = 'orbit.earth-launch.flight.v1';
export function storeFlight(save: FlightSave): string { try { localStorage.setItem(FLIGHT_STORAGE_KEY, JSON.stringify(save)); return '已保存本次飞行；恢复时先暂停，可继续原来的任务。'; } catch { throw Error('浏览器未能保存飞行，请导出文件保留。'); } }
export function readFlight(): string | null { try { return localStorage.getItem(FLIGHT_STORAGE_KEY); } catch { throw Error('无法读取本浏览器飞行存档，可导入已导出的文件。'); } }
