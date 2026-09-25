import manifest from '../../public/data/enceladus-interior/manifest.json';
export const ENCELADUS_INTERIOR=manifest;
export interface EnceladusChoices {eRing?:boolean;jets:boolean;cutaway:boolean;ice:boolean;ocean:boolean;core:boolean}
export const defaultEnceladusChoices=():EnceladusChoices=>({eRing:false,jets:true,cutaway:false,ice:true,ocean:true,core:true});
