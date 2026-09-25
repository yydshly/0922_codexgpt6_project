import type {CatalogueStar} from './starCatalogue';
// Horizons ECLIPJ2000: ICRF rotated about X by the fixed IAU 1976 obliquity.
// https://ssd.jpl.nasa.gov/horizons/manual.html (Ecliptic coordinates)
export const HORIZONS_OBLIQUITY=84381.448*Math.PI/(180*3600);
export function panoramaStarDirection(ra:number,dec:number):[number,number,number]{
 const x=Math.cos(dec)*Math.cos(ra),y=Math.cos(dec)*Math.sin(ra),z=Math.sin(dec);
 const c=Math.cos(HORIZONS_OBLIQUITY),s=Math.sin(HORIZONS_OBLIQUITY);
 // Equatorial -> ecliptic -> existing Three axes (X,Z,-Y), all proper rotations.
 return [x,z*c-y*s,-(y*c+z*s)];
}
export function panoramaStarSize(star:Pick<CatalogueStar,'hp'>){return Math.max(1.5,Math.min(5,4.5-star.hp*.5));}
