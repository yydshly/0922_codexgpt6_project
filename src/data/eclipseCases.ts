import {LUNAR_REFERENCE_TDB,LUNAR_START,LUNAR_END} from './lunarEclipse';
import {SOLAR_REFERENCE_TDB,SOLAR_START,SOLAR_END} from './solarEclipse';
export function eclipseCase(id:string|null|undefined){
 if(id==='lunar-eclipse')return {start:LUNAR_START,end:LUNAR_END,reference:LUNAR_REFERENCE_TDB};
 if(id==='solar-eclipse')return {start:SOLAR_START,end:SOLAR_END,reference:SOLAR_REFERENCE_TDB};
 return null;
}
