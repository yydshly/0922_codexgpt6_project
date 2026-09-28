import { parseFlightSave, type FlightSave } from './flightSession';
export const FLIGHT_STORAGE_KEY = 'orbit.earth-launch.flight.v1';
export function storeFlight(save: FlightSave): string { try { localStorage.setItem(FLIGHT_STORAGE_KEY, JSON.stringify(save)); return '已保存本次飞行；恢复时先暂停，可继续原来的任务。'; } catch { throw Error('浏览器未能保存飞行，请导出文件保留。'); } }
export function readFlight(): string | null { try { return localStorage.getItem(FLIGHT_STORAGE_KEY); } catch { throw Error('无法读取本浏览器飞行存档，可导入已导出的文件。'); } }

export type FlightArchive = { kind: 'stored'; raw: string; save: FlightSave } | { kind: 'empty' } | { kind: 'error'; message: string };
/** Read only. Full deterministic replay remains the worker's restore boundary. */
export function readFlightArchive(): FlightArchive {
  try {
    const raw = readFlight();
    if (raw === null) return { kind: 'empty' };
    return { kind: 'stored', raw, save: parseFlightSave(raw) };
  } catch (error) {
    return { kind: 'error', message: `浏览器存档不可用：${error instanceof Error ? error.message : '读取失败'} 原记录未改写。` };
  }
}

export function hasSessionCopy(saved: FlightSave | null, archive: FlightArchive): saved is FlightSave {
  return !!saved && (archive.kind !== 'stored' || JSON.stringify(saved) !== JSON.stringify(archive.save));
}
