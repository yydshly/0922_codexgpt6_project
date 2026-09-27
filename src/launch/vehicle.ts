import { LAUNCH_EARTH, LAUNCH_MISSION } from '../data/launchMission';

export const VEHICLE_SCHEMA = 1;
export const VEHICLE_STORAGE_KEY = 'orbit.earth-launch.vehicle.v1';
export const STANDARD_GRAVITY = 9.80665;
export const PAD_GRAVITY = LAUNCH_EARTH.gmM3S2 / LAUNCH_EARTH.semiMajorM ** 2;
export const ENGINE_OPTIONS = [
  { id: 'b-standard', stage: 'booster', name: '标准海平面组', dryDeltaKg: 0, thrustN: 3200000, ispSeaS: 285, ispVacuumS: 315, nozzles: 4, description: '基准方案，四喷口；海平面推力 3.2 MN。' },
  { id: 'b-light', stage: 'booster', name: '轻型海平面组', dryDeltaKg: -1000, thrustN: 2000000, ispSeaS: 290, ispVacuumS: 320, nozzles: 2, description: '少 1 t 干质量，双喷口；推力降为 2.0 MN，满载时无法离台。' },
  { id: 'u-standard', stage: 'upper', name: '标准真空发动机', dryDeltaKg: 0, thrustN: 420000, ispSeaS: 300, ispVacuumS: 345, nozzles: 1, description: '基准上面级，真空推力 420 kN。' },
  { id: 'u-efficient', stage: 'upper', name: '高比冲真空发动机', dryDeltaKg: 350, thrustN: 340000, ispSeaS: 280, ispVacuumS: 365, nozzles: 1, description: '比冲更高，增加 350 kg 干质量；推力较低，燃烧更久。' },
] as const;
export type EngineId = typeof ENGINE_OPTIONS[number]['id'];
export interface VehicleConfig {
  boosterEngine: EngineId;
  upperEngine: EngineId;
  boosterFillPercent: number;
  upperFillPercent: number;
  payloadKg: 250 | 500;
}
export const BASELINE_VEHICLE: Readonly<VehicleConfig> = Object.freeze({ boosterEngine: 'b-standard', upperEngine: 'u-standard', boosterFillPercent: 100, upperFillPercent: 100, payloadKg: 500 });
export const engineById = (id: EngineId) => ENGINE_OPTIONS.find(engine => engine.id === id)!;
export const sameVehicle = (a: VehicleConfig, b: VehicleConfig) => Object.keys(BASELINE_VEHICLE).every(key => a[key as keyof VehicleConfig] === b[key as keyof VehicleConfig]);

/** Validate at the data boundary; untrusted storage cannot supply an engine, mass or percentage. */
export function parseVehicle(value: unknown): VehicleConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('载具配置格式无效。');
  const v = value as Record<string, unknown>;
  for (const stage of ['booster', 'upper'] as const) {
    const engine = ENGINE_OPTIONS.find(e => e.id === v[`${stage}Engine`]);
    if (!engine || engine.stage !== stage) throw new Error(`${stage === 'booster' ? '一级' : '二级'}发动机不兼容。`);
    const fill = v[`${stage}FillPercent`];
    if (typeof fill !== 'number' || !Number.isFinite(fill) || fill < 0 || fill > 100 || fill % 25 !== 0) throw new Error('加注比例必须是 0–100% 内的 25% 档位。');
  }
  if (v.payloadKg !== 250 && v.payloadKg !== 500) throw new Error('只支持 250 kg 或 500 kg 教学载荷。');
  return { boosterEngine: v.boosterEngine as EngineId, upperEngine: v.upperEngine as EngineId, boosterFillPercent: v.boosterFillPercent as number, upperFillPercent: v.upperFillPercent as number, payloadKg: v.payloadKg };
}

export function deriveVehicle(input: VehicleConfig) {
  const config = parseVehicle(input);
  const stages = LAUNCH_MISSION.stages.map(stage => {
    const engine = engineById(config[`${stage.id}Engine`]);
    const fuelKg = stage.fuelKg * config[`${stage.id}FillPercent`] / 100;
    const dryKg = stage.dryKg + engine.dryDeltaKg;
    // Engine thrust is rated at sea level for the booster, vacuum for the upper stage.
    const ratedIspS = stage.id === 'booster' ? engine.ispSeaS : engine.ispVacuumS;
    const massFlowKgS = engine.thrustN / (STANDARD_GRAVITY * ratedIspS);
    return { id: stage.id, engineId: engine.id, dryKg, fuelKg, wetKg: dryKg + fuelKg, thrustN: engine.thrustN,
      ispSeaS: engine.ispSeaS, ispVacuumS: engine.ispVacuumS, massFlowKgS, ratedBurnSeconds: fuelKg / massFlowKgS };
  });
  const carriedKg = config.payloadKg + LAUNCH_MISSION.fairingKg;
  const wetKg = stages[0].wetKg + stages[1].wetKg + carriedKg;
  const fuelKg = stages[0].fuelKg + stages[1].fuelKg;
  const twr = stages[0].thrustN / (wetKg * PAD_GRAVITY);
  const upperStartKg = stages[1].wetKg + carriedKg;
  // Vacuum upper-bound budget. Booster discarded after its burn; fairing retained in both stages.
  const deltaV1MS = STANDARD_GRAVITY * stages[0].ispVacuumS * Math.log(wetKg / (wetKg - stages[0].fuelKg));
  const deltaV2MS = STANDARD_GRAVITY * stages[1].ispVacuumS * Math.log(upperStartKg / (stages[1].dryKg + carriedKg));
  const issues: string[] = [];
  if (!stages[0].fuelKg) issues.push('一级推进剂为空，无法产生持续推力。');
  if (!stages[1].fuelKg) issues.push('二级推进剂为空，无法完成两级任务。');
  if (twr <= 1) issues.push(`起飞推重比仅 ${twr.toFixed(2)}，推力不大于整箭重量；请换标准一级发动机或减少加注量。`);
  return { config, stages, payloadKg: config.payloadKg, fairingKg: LAUNCH_MISSION.fairingKg, wetKg, fuelKg,
    dryAndPayloadKg: wetKg - fuelKg, twr, deltaV1MS, deltaV2MS, idealDeltaVMS: deltaV1MS + deltaV2MS,
    issues, canApply: issues.length === 0 };
}

/** Future flight code consumes this same validated state; E2 does not integrate a trajectory. */
export function compileVehicle(input: VehicleConfig) {
  const vehicle = deriveVehicle(input);
  if (!vehicle.canApply) throw new Error(vehicle.issues.join(' '));
  return { schema: VEHICLE_SCHEMA, missionVersion: LAUNCH_MISSION.version, ...vehicle,
    initialFuelKg: vehicle.stages.map(stage => stage.fuelKg), activeStage: 0 as const };
}

interface VehicleSave { schema: number; missionVersion: string; savedAt: string; draft: VehicleConfig; applied: VehicleConfig }
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadVehicleResult = { kind: 'loaded'; value: VehicleSave } | { kind: 'empty' | 'error'; message: string };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '读取失败';
export function loadVehicle(storage?: StoragePort): LoadVehicleResult {
  try {
    const raw = (storage ?? window.localStorage).getItem(VEHICLE_STORAGE_KEY);
    if (!raw) return { kind: 'empty', message: '此浏览器尚无已保存方案。' };
    const save = JSON.parse(raw) as VehicleSave;
    if (!save || save.schema !== VEHICLE_SCHEMA || save.missionVersion !== LAUNCH_MISSION.version) throw new Error('存档版本不兼容，未替换当前方案。');
    const draft = parseVehicle(save.draft), applied = parseVehicle(save.applied);
    compileVehicle(applied);
    if (typeof save.savedAt !== 'string' || !Number.isFinite(Date.parse(save.savedAt))) throw new Error('存档时间无效。');
    return { kind: 'loaded', value: { schema: VEHICLE_SCHEMA, missionVersion: LAUNCH_MISSION.version, savedAt: save.savedAt, draft, applied } };
  } catch (error) { return { kind: 'error', message: `无法恢复方案：${errorMessage(error)}` }; }
}
export function saveVehicle(draft: VehicleConfig, applied: VehicleConfig, storage?: StoragePort) {
  try {
    const record: VehicleSave = { schema: VEHICLE_SCHEMA, missionVersion: LAUNCH_MISSION.version, savedAt: new Date().toISOString(), draft: parseVehicle(draft), applied: compileVehicle(applied).config };
    (storage ?? window.localStorage).setItem(VEHICLE_STORAGE_KEY, JSON.stringify(record));
    return { ok: true as const, message: '方案已保存到此浏览器；刷新或下次进入可恢复。' };
  } catch (error) { return { ok: false as const, message: `保存失败，当前方案仍保留在本页：${errorMessage(error)}` }; }
}
