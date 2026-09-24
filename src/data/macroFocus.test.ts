import {describe,it,expect} from 'vitest';
import {planetFocusLayers,planetFocusPhenomena} from './macroFocus';
import {defaultMacroLayers} from './macroLayers';
import {defaultIntegratedFlags} from './integratedScene';
import {stagedLayers,onlyStage} from './stages';
describe('temporary planet-only presentation',()=>{
 it('keeps only the existing planet visibility and hides every other layer',()=>{const raw=defaultMacroLayers(),out=planetFocusLayers(raw,true);expect(Object.entries(out).filter(([,v])=>v).map(([k])=>k)).toEqual(['planetary']);expect(Object.values(raw).every(Boolean)).toBe(true);expect(planetFocusLayers({...raw,planetary:false},true).planetary).toBe(false);});
 it('restores custom choices rather than enabling every layer',()=>{const raw={...defaultMacroLayers(),comets:false,oort:false};planetFocusLayers(raw,true);const restored=planetFocusLayers(raw,false);expect(restored).toEqual(raw);expect(restored.comets).toBe(false);expect(restored.oort).toBe(false);});
 it('does not bypass stage gates when focus ends',()=>{const staged=stagedLayers(defaultMacroLayers(),onlyStage('comets'));planetFocusLayers(staged,true);const restored=planetFocusLayers(staged,false);expect(restored.comets).toBe(true);expect(restored.dwarfs).toBe(false);expect(restored.moons).toBe(false);});
 it('temporarily hides phenomena while retaining individual selections for restoration',()=>{const raw={...defaultIntegratedFlags(),solar:false};expect(Object.values(planetFocusPhenomena(raw,true)).every(v=>!v)).toBe(true);expect(planetFocusPhenomena(raw,false)).toEqual(raw);expect(raw.environment).toBe(true);});
});
