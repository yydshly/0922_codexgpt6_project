export interface ObservationPanels {
  regions:boolean;
  info:boolean;
  restore:{regions:boolean;info:boolean}|null;
}
export const initialObservationPanels:ObservationPanels={regions:true,info:true,restore:null};
export type PanelAction={type:'toggle'|'show';panel:'regions'|'info'}|{type:'focus'};
/** Panel layout never changes the observation, time or saved camera. */
export function observationPanels(state:ObservationPanels,action:PanelAction):ObservationPanels {
  if(action.type==='show')return {...state,[action.panel]:true,restore:null};
  if(action.type==='toggle')return {...state,[action.panel]:!state[action.panel],restore:null};
  if(state.restore)return {...state.restore,restore:null};
  if(!state.regions&&!state.info)return {...initialObservationPanels};
  return {regions:false,info:false,restore:{regions:state.regions,info:state.info}};
}
