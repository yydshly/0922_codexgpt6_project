import reference from '../../public/data/rings/chariklo.json';
export const CHARIKLO_RINGS=reference;
export interface SmallRingChoices {inner:boolean;outer:boolean;enhanced:boolean}
export interface SmallRingOptions extends SmallRingChoices {enabled:boolean}
export const defaultSmallRings=():SmallRingChoices=>({inner:true,outer:true,enhanced:false});
/** Normalized to the same published body radius; enhancement changes width only. */
export function smallRingBounds(band:{radiusKm:number;widthKm:number},enhanced:boolean):[number,number]{
 const half=band.widthKm*(enhanced?2:1)/2;
 return [(band.radiusKm-half)/reference.bodyReferenceRadiusKm,(band.radiusKm+half)/reference.bodyReferenceRadiusKm];
}
