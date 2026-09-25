import {BODIES,bodyById} from './catalog';
import {SATELLITES} from './satellites';
import {REGION_MEMBERS} from './regionMembers';
import {PLUTO_MOONS} from './plutoMoons';
import {dynamicDwarfById} from './dwarfs';
import {COMETS} from '../ephemeris/comets';
import {COORBITAL_SOURCE} from './coorbital';
import type {StageFlags,StageId} from './stages';
export type MemberKind='primary'|'moon'|'member'|'pluto'|'eris'|'patroclus'|'comet'|'coorbital'|'history';
export interface DirectoryMember {id:string;name:string;alias:string;group:string;kind:MemberKind;stages:StageId[];dataset:string;selector:string;source:string;}
const core='/data/manifest.json',sat='/data/satellites/manifest.json';
export const MEMBER_DIRECTORY:DirectoryMember[]=[
 ...BODIES.filter(b=>b.kind!=='moon').map(b=>({id:b.id,name:b.name,alias:b.englishName,group:'太阳与行星',kind:'primary' as const,stages:[],dataset:core,selector:'.panorama-primary',source:b.sourceUrl})),
 ...[{...bodyById.moon,parentId:'earth'},...SATELLITES].map(b=>({id:b.id,name:b.name,alias:b.englishName,group:`${bodyById[b.parentId as keyof typeof bodyById].name}卫星`,kind:'moon' as const,stages:['families'] as StageId[],dataset:b.id==='moon'?core:sat,selector:'[aria-label="全景卫星与环系"]',source:b.sourceUrl})),
 ...REGION_MEMBERS.map(b=>({id:b.id,name:b.name,alias:b.englishName,group:'区域成员',kind:'member' as const,stages:(['ceres','pluto'].includes(b.id)?[]:['members']) as StageId[],dataset:`/data/${b.id==='eris'?'eris-system':b.id==='patroclus'?'patroclus-system':['ceres','pluto'].includes(b.id)?'dwarfs':'small-bodies'}/manifest.json`,selector:'.region-member-detail',source:b.sourceUrl})),
 ...[{id:'charon',name:dynamicDwarfById.charon.name,englishName:'Charon'},...PLUTO_MOONS].map(b=>({id:b.id,name:b.name,alias:b.englishName,group:'冥王星卫星',kind:'pluto' as const,stages:['families'] as StageId[],dataset:`/data/${b.id==='charon'?'dwarfs':'pluto-moons'}/manifest.json`,selector:'.panorama-binary',source:b.id==='charon'?dynamicDwarfById.charon.sourceUrl:'/data/pluto-moons/physical.json'})),
 {id:'dysnomia',name:'阋卫一',alias:'Dysnomia',group:'阋神星卫星',kind:'eris',stages:['members','families'],dataset:'/data/eris-system/manifest.json',selector:'[data-eris-system]',source:'/data/eris-system/physical.json'},
 {id:'menoetius',name:'墨诺提俄斯',alias:'Menoetius',group:'双小行星伴星',kind:'patroclus',stages:['members','families'],dataset:'/data/patroclus-system/manifest.json',selector:'[data-patroclus-system]',source:'/data/patroclus-system/physical.json'},
 ...COMETS.map(b=>({id:b.id,name:b.name,alias:b.id,group:'彗星',kind:'comet' as const,stages:['comets'] as StageId[],dataset:'/data/comets/manifest.json',selector:'.panorama-comets',source:'/data/comets/manifest.json'})),
 {id:'kamo',name:'Kamoʻoalewa',alias:'469219 地球准卫星',group:'共轨小天体',kind:'coorbital',stages:['structure','members'],dataset:'/data/coorbital/manifest.json',selector:'[data-motion-current]',source:COORBITAL_SOURCE},
 {id:'borisov',name:'2I/Borisov',alias:'鲍里索夫 星际访客',group:'独立历史案例',kind:'history',stages:[],dataset:'/data/borisov/manifest.json',selector:'.historical-visitor',source:'https://science.nasa.gov/solar-system/comets/2i-borisov/'},
];
export function memberStageMissing(member:DirectoryMember,flags:StageFlags):StageId[]{return ['ceres','pluto'].includes(member.id)&&!flags.structure&&!flags.members?['structure']:member.stages.filter(id=>!flags[id]);}
export function searchMembers(query:string){const key=query.trim().toLocaleLowerCase();return MEMBER_DIRECTORY.filter(m=>`${m.name} ${m.alias} ${m.id} ${m.group}`.toLocaleLowerCase().includes(key));}
