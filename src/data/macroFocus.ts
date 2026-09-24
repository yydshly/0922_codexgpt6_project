import type {MacroLayerVisibility} from './macroLayers';
import type {IntegratedFlags} from './integratedScene';
/** A temporary presentation mask; saved user selections and stage flags are never modified. */
export function planetFocusLayers(layers:MacroLayerVisibility,active:boolean):MacroLayerVisibility {
 return active?Object.fromEntries(Object.entries(layers).map(([id,value])=>[id,id==='planetary'&&value])) as MacroLayerVisibility:layers;
}
export function planetFocusPhenomena(flags:IntegratedFlags,active:boolean):IntegratedFlags {
 return active?{solar:false,environment:false,belts:false,dust:false,helio:false}:flags;
}
