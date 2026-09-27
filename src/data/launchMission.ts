/** E1 freezes a teaching scenario; these values are not specifications of a real vehicle. */
export const LAUNCH_SITE = {
  id: 'coast-01', name: '海岸教学基地', latitudeDeg: 28.5, longitudeDeg: -80.6, altitudeM: 0,
  region: '佛罗里达沿海区域', description: '坐标固定，建筑、海岸与场地布局为教学设定，非真实发射中心复原。',
} as const;

export const LAUNCH_EARTH = {
  semiMajorM: 6378137, inverseFlattening: 298.257223563, gmM3S2: 3.986004418e14,
  source: 'https://earth-info.nga.mil/?action=wgs84&dir=wgs84',
} as const;

export const LAUNCH_MISSION = {
  id: 'E01', version: 'earth-launch-0.1', name: '把第一颗卫星送入轨道',
  orbitAltitudeKm: 400, minOrbitAltitudeKm: 380, maxOrbitAltitudeKm: 420,
  inclinationDeg: 28.5, inclinationToleranceDeg: 1, coastRevolutions: 1,
  payloadKg: 500, payloadOptionsKg: [250, 500], fairingKg: 600, heightM: 60, diameterM: 3.7,
  stages: [
    { id: 'booster', name: '一级推进段', dryKg: 14000, fuelKg: 180000, thrustN: 3200000, ispSeaS: 285, ispVacuumS: 315 },
    { id: 'upper', name: '二级推进段', dryKg: 2200, fuelKg: 36000, thrustN: 420000, ispSeaS: 300, ispVacuumS: 345 },
  ],
  validation: { poweredStepSeconds: .05, refinedStepSeconds: .025, convergencePositionM: 10, convergenceSpeedMS: .1,
    orbitRelativeEnergyDrift: 1e-5, coordinateRoundTripM: 1e-5, targetFps: 30, canvasWidth: 1440, canvasHeight: 900 },
} as const;

export const LAUNCH_STEPS = ['地球基地', '组装载具', '检查点火', '上升分级', '入轨关机', '部署卫星'] as const;
export type BaseLocation = 'overview' | 'pad' | 'assembly' | 'control';
export const BASE_LOCATIONS: { id: BaseLocation; title: string; label: string; description: string; target: [number, number, number]; offset: [number, number, number] }[] = [
  { id: 'overview', title: '海岸上的航天基地', label: '基地全貌', description: '从组装厂房，沿运输道路到发射台；任务中心负责观测与指挥。点选设施，靠近查看。', target: [-85, 23, 25], offset: [-330, 165, 390] },
  { id: 'pad', title: '旅程，从这里开始。', label: '发射台', description: '60 米教学箭体静置在发射平台上。沿塔架向上看连接臂，向下看导流槽与管线。', target: [-6, 37, 0], offset: [-83, -12, 120] },
  { id: 'assembly', title: '02 / 组装厂房', label: '组装厂房', description: '点击底部「组装载具」，选择发动机、加注量和载荷。参数与预览同步变化，检查后可应用到发射台。', target: [-205, 17, 55], offset: [-105, 30, 155] },
  { id: 'control', title: '03 / 任务中心', label: '任务中心', description: '确认目标轨道、载具状态和飞行阶段。达到太空高度只是过程，关机后能持续绕地球运行才算入轨。', target: [-130, 9, 175], offset: [85, 16, 90] },
];

export function launchWetMassKg() { return LAUNCH_MISSION.stages.reduce((sum, stage) => sum + stage.dryKg + stage.fuelKg, LAUNCH_MISSION.payloadKg + LAUNCH_MISSION.fairingKg); }
