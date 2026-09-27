export interface MissionSummary { time: number; baseTime: number; released: boolean; verified: boolean; satelliteMassKg: number; altitudeKm: number }
export interface MissionRequest { id: number; view: 'controls' | 'overview' | 'satellite' }
