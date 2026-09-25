export interface ErosShapeChoices { shape:boolean; wireframe:boolean }
export const defaultErosShapeChoices=():ErosShapeChoices=>({shape:true,wireframe:false});
export interface ErosShapeData {
 metadata:{bodyId:string;version:string;units:string;vertices:number;facets:number;equivalentRadiusKm:number;maxRadiusKm:number;volumeKm3:number;boundsKm:number[][];poleRaDeg:number;poleDecDeg:number;primeMeridianDeg:number;rotationRateDegPerDay:number};
 positionsKm:number[];indices:number[];
}
export function validateErosShape(value:unknown):ErosShapeData {
 const d=value as ErosShapeData,m=d?.metadata;
 if(!m||m.bodyId!=='eros'||m.version!=='NEARMOD-EROS007790-200204'||m.units!=='km'||m.vertices!==3897||m.facets!==7790||!Array.isArray(d.positionsKm)||!Array.isArray(d.indices)||d.positionsKm.length!==m.vertices*3||d.indices.length!==m.facets*3||!d.positionsKm.every(Number.isFinite)||!d.indices.every(i=>Number.isInteger(i)&&i>=0&&i<m.vertices)||!(m.equivalentRadiusKm>8&&m.equivalentRadiusKm<9)||!(m.maxRadiusKm>17&&m.maxRadiusKm<18)||m.poleRaDeg!==11.350||m.poleDecDeg!==17.216||m.primeMeridianDeg!==326.027||m.rotationRateDegPerDay!==1639.38864745)throw Error('爱神星形状资料格式或版本不符');
 return d;
}
