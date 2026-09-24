import {describe,it,expect} from 'vitest';
import {learningMatches,LEARNING_STEPS,type LearningView} from './learningRoute';
const base:LearningView={scope:'solar',zone:'planetary',tab:'zones',target:null,member:null,cosmic:'neighbors'};
const step=(id:string)=>LEARNING_STEPS.find(s=>s.id===id)!;
describe('learning route distinguishes lessons from browsing',()=>{
 it('does not confuse Earth itself with its satellite family',()=>{expect(learningMatches(step('earth'),{...base,target:'earth'})).toBe(false);expect(learningMatches(step('moon'),{...base,target:'body:earth'})).toBe(false);expect(learningMatches(step('moon'),{...base,target:'earth'})).toBe(true);});
 it('does not mark an old region current when focusing a member or changing content tab',()=>{expect(learningMatches(step('planets'),base)).toBe(true);expect(learningMatches(step('planets'),{...base,target:'body:earth'})).toBe(false);expect(learningMatches(step('planets'),{...base,member:'vesta'})).toBe(false);expect(learningMatches(step('planets'),{...base,tab:'families'})).toBe(false);});
 it('requires both the correct universe scope and level',()=>{expect(learningMatches(step('neighbors'),base)).toBe(false);expect(learningMatches(step('neighbors'),{...base,scope:'cosmic'})).toBe(true);expect(learningMatches(step('neighbors'),{...base,scope:'cosmic',cosmic:'milkyway'})).toBe(false);});
 it('matches the selected named body rather than its shared region',()=>{expect(learningMatches(step('vesta'),{...base,zone:'asteroid',member:'ceres'})).toBe(false);expect(learningMatches(step('vesta'),{...base,member:'vesta'})).toBe(true);});
});
