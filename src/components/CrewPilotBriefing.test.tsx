import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createCrewMission} from '../flight/crewMission';
import {CrewPilotBriefing,crewMissionChapter} from './CrewPilotBriefing';

describe('failed mission remains in the chapter that was actually flown',()=>{
  it('does not put a launch failure into the landing chapter',()=>{
    const mission=createCrewMission();mission.startPilot();mission.pilotAction('ignite');
    for(let i=0;i<120&&!mission.awaitingPilotAction;i++)mission.step();
    expect(mission.pilotAction('release')).toBe(true);mission.takeOver();mission.setPilotThrottle(0);
    for(let i=0;i<1000&&mission.phase!=='failed';i++)mission.step();
    const state=mission.snapshot();expect(state.phase).toBe('failed');
    expect(crewMissionChapter(state)).toBe(1);
    const markup=renderToStaticMarkup(<CrewPilotBriefing state={state} playing={false}/>);
    expect(markup).toContain('data-mission-status="failed"');
    expect(markup).not.toContain('飞控辅助');
    expect(markup).not.toContain('模拟已暂停');
  });
});
