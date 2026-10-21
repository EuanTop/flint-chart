import { describe, expect, it } from 'vitest';
import { THEME_PRESETS, planFrameFurniture } from '../src';

describe('planFrameFurniture', () => {
  it('plans the Economist red tab on the frame top edge, as a chart draws it', () => {
    const frame = planFrameFurniture('economist', 600);
    expect(frame?.header?.pieces).toEqual([
      expect.objectContaining({ kind: 'rect', zone: 'canvasTop', frame: 'content', align: 'start', width: 44, height: 12, color: '#e3120b' }),
    ]);
    expect(frame?.header?.edge).toBe(12);
  });

  it('plans a footer rule across the frame for a theme that closes its charts with one', () => {
    const frame = planFrameFurniture('bbc', 600);
    expect(frame?.rules).toEqual([expect.objectContaining({ edge: 'bottom', width: 600, height: 1 })]);
  });

  it('reads the earlier furniture names', () => {
    const frame = planFrameFurniture({ furniture: [{ kind: 'mastheadTab', color: '#123456' }, { kind: 'headerRule', height: 3 }] }, 500);
    expect(frame?.header?.pieces[0]).toMatchObject({ kind: 'rect', zone: 'aboveTitle', color: '#123456' });
    expect(frame?.rules).toEqual([expect.objectContaining({ edge: 'top', width: 500, height: 3 })]);
  });

  it('plans nothing for a theme without furniture, and runs for every preset', () => {
    expect(planFrameFurniture(undefined, 600)).toBeUndefined();
    for (const id of Object.keys(THEME_PRESETS)) expect(() => planFrameFurniture(id, 600)).not.toThrow();
  });
});
