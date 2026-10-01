import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExplorationObservationPanel } from './ExplorationObservationPanel';

const noop = () => {};
const panel = (id: string, name: string, nextId: string | null, next: string | null) => renderToStaticMarkup(
  <ExplorationObservationPanel
    id={id} name={name} staying dwell={12} paused={false} nextId={nextId} next={next}
    part={null} onPart={noop} onObserve={noop} onStay={noop} onContinue={noop}
    book={{ opened: {}, notes: [] }} canSave={false} onSave={noop}
  />,
);

describe('observation departure follows the actual remaining route', () => {
  it('introduces the platform when resuming from the satellite skips the spent stage', () => {
    const html = panel('satellite', '教学卫星', 'station', '中继平台');

    expect(html).toContain('接下来前往 中继平台');
    expect(html).toContain('沿途留意舱段、桁架和太阳能翼');
    expect(html).toContain('继续下一站');
    expect(html).not.toContain('废弃级段');
  });

  it('introduces the rock when resuming from the platform skips the Earth viewpoint', () => {
    const html = panel('station', '中继平台', 'rock', '岩体演练区');

    expect(html).toContain('接下来前往 岩体演练区');
    expect(html).toContain('它的凹凸轮廓比圆筒更难判断距离');
    expect(html).not.toContain('下一站把注意力从飞行器移向地球');
    expect(html).not.toContain('空的观景航点');
  });

  it('offers no onward transition when there is no next destination', () => {
    const html = panel('rock', '岩体演练区', null, null);

    expect(html).toContain('已抵达 · 岩体演练区');
    expect(html).not.toContain('接下来前往');
    expect(html).not.toContain('继续下一站');
    expect(html).not.toContain('最后返回出发航点');
  });
});
