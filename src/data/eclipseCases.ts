import {OCCULTATION_START,OCCULTATION_END,OCCULTATION_REFERENCE} from './occultation';
import {LUNAR_REFERENCE_TDB,LUNAR_START,LUNAR_END} from './lunarEclipse';
import {SOLAR_REFERENCE_TDB,SOLAR_START,SOLAR_END} from './solarEclipse';
export function eclipseCase(id:string|null|undefined){
 if(id==='lunar-eclipse')return {start:LUNAR_START,end:LUNAR_END,entry:LUNAR_REFERENCE_TDB,reference:LUNAR_REFERENCE_TDB};
 if(id==='solar-eclipse')return {start:SOLAR_START,end:SOLAR_END,entry:SOLAR_REFERENCE_TDB,reference:SOLAR_REFERENCE_TDB};
 if(id==='io-occultation')return {start:OCCULTATION_START,end:OCCULTATION_END,reference:OCCULTATION_REFERENCE,entry:OCCULTATION_REFERENCE-600};
 return null;
}
