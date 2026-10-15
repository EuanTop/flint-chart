import { describe, expect, it } from 'vitest';
import { conditionUpdates, selectionParts, type ChartLink } from '../src/link';

const marks = (...values: Record<string, unknown>[]) => values.map((value) => ({ value }));
const link = (receives: string[]): ChartLink => ({ sends: [], receives, gestures: {}, notes: [] });

describe('board condition', () => {
  it('reads a brush as the span of its axis field and a click as the values it holds', () => {
    const brushed = marks({ month: 3, region: 'Asia' }, { month: 6, region: 'Europe' }, { month: 4, region: 'Asia' });
    expect(selectionParts(brushed, { preset: 'brush-x', fields: ['month'], hover: false })).toEqual({ month: { range: [3, 6] } });
    expect(selectionParts(brushed, { preset: 'click-highlight', fields: ['month', 'region'], hover: false }))
      .toEqual({ month: { in: [3, 6, 4] }, region: { in: ['Asia', 'Europe'] } });
  });

  it('shows each chart the parts on fields its marks carry, as one where target', () => {
    const condition = { region: { in: ['Asia'] }, month: { range: [3, 6] as [number, number] } };
    const updates = conditionUpdates({ both: link(['month', 'region']), regions: link(['region']), other: link(['product']) }, condition);
    expect(updates.get('both')!.ops[0]).toMatchObject({ targets: [{ select: { where: condition } }] });
    expect(updates.get('regions')!.ops[0]).toMatchObject({ targets: [{ select: { where: { region: { in: ['Asia'] } } } }] });
    expect(updates.has('other')).toBe(false);
  });

  it('reads several marks field by field, so two fields that vary apart admit combinations no mark had', () => {
    // Asia in March and Europe in June also admit Asia in June: the condition is per field.
    const parts = selectionParts(marks({ month: 3, region: 'Asia' }, { month: 6, region: 'Europe' }), { preset: 'select', fields: ['month', 'region'], hover: false });
    expect(parts).toEqual({ month: { in: [3, 6] }, region: { in: ['Asia', 'Europe'] } });
  });
});
