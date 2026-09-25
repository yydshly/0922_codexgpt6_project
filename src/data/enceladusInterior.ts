import manifest from '../../public/data/enceladus-interior/manifest.json';
export const ENCELADUS_INTERIOR=manifest;
export interface EnceladusChoices {jets:boolean;cutaway:boolean;ice:boolean;ocean:boolean;core:boolean}
export const defaultEnceladusChoices=():EnceladusChoices=>({jets:true,cutaway:false,ice:true,ocean:true,core:true});
