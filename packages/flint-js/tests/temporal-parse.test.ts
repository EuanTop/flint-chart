// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from 'vitest';
import { assembleVegaLite, convertTemporalData } from '../src';
import { temporalFieldValue } from '../src/core/resolve-semantics';
import { parseTemporalByType } from '../src/core/temporal-parse';

describe('parseTemporalByType', () => {
  it.each([
    [202501, '2025-01'],
    ['202512', '2025-12'],
    ['2025-7', '2025-07'],
    ['2025/07', '2025-07'],
    ['2025.07', '2025-07'],
    ['2025M07', '2025-07'],
    ['07/2025', '2025-07'],
    ['2025-Jul', '2025-07'],
    ['2025-July', '2025-07'],
    ['2025 Jul', '2025-07'],
    ['2025Jul', '2025-07'],
    ['Jul2025', '2025-07'],
    ['Jul-2025', '2025-07'],
    ['July 2025', '2025-07'],
    ['July, 2025', '2025-07'],
    ['Sept 2025', '2025-09'],
    ['sep. 2025', '2025-09'],
    ["Jul '25", '2025-07'],
    ['Jul-25', '2025-07'],
  ])('reads YearMonth %j as %s', (value, expected) => {
    expect(parseTemporalByType(value, 'YearMonth')).toBe(expected);
  });

  it.each([202513, 202500, 'Julember 2025', '2025', 'Q1 2025', 1735689600000, 2025.5])(
    'leaves YearMonth %j to the usual handling',
    (value) => {
      expect(parseTemporalByType(value, 'YearMonth')).toBeNull();
    },
  );

  it.each([
    [20250115, '2025-01-15'],
    ['2025/1/15', '2025-01-15'],
    ['2025-Jan-15', '2025-01-15'],
    ['Jan 15, 2025', '2025-01-15'],
    ['January 15th 2025', '2025-01-15'],
    ['15 Jan 2025', '2025-01-15'],
    ['15-Jan-2025', '2025-01-15'],
  ])('reads Date %j as %s', (value, expected) => {
    expect(parseTemporalByType(value, 'Date')).toBe(expected);
  });

  it('rejects impossible dates', () => {
    expect(parseTemporalByType(20250230, 'Date')).toBeNull();
  });

  it('acts only when the type guides it', () => {
    expect(parseTemporalByType(202501, 'Quantity')).toBeNull();
    expect(parseTemporalByType(202501, '')).toBeNull();
    expect(convertTemporalData([{ code: 202501 }], {})).toEqual([{ code: 202501 }]);
  });
});

describe('YearMonth integers in a chart', () => {
  const rows = [202501, 202502, 202503].flatMap((period) => ['A', 'B'].map((game, i) => ({ period, game, users: period % 100 + i })));

  it('converts the rows and reads three months on a heatmap as discrete bands', () => {
    expect(convertTemporalData(rows, { period: 'YearMonth' })[0].period).toBe('2025-01');
    const vl = assembleVegaLite({
      data: { values: rows },
      semantic_types: { period: 'YearMonth', game: 'Category', users: 'Quantity' },
      chart_spec: { chartType: 'Heatmap', encodings: { x: { field: 'period' }, y: { field: 'game' }, color: { field: 'users' } } },
    }) as any;
    expect(vl.encoding.x.type).toBe('ordinal');
    expect(vl.data.values.map((r: any) => r.period)).toContain('2025-02');
  });
});

describe('Date values in update keys', () => {
  it('reads a Date built from calendar parts as that calendar day for a date-grain field', () => {
    expect(temporalFieldValue('Month', new Date(2025, 5, 1), { Month: 'YearMonth' })).toBe(Date.UTC(2025, 5, 1));
  });

  it('keeps an instant for a date-time field', () => {
    const instant = new Date(2025, 5, 1, 9, 30);
    expect(temporalFieldValue('At', instant, { At: 'DateTime' })).toBe(instant.getTime());
  });
});

describe('Chart.js date ticks', () => {
  it('label UTC calendar months as themselves, west of UTC too', async () => {
    const { assembleChartjs } = await import('../src');
    const rows = ['2025-01', '2025-02', '2025-03', '2025-04'].map((period, i) => ({ period, users: 10 + i }));
    const cj = assembleChartjs({
      data: { values: rows },
      semantic_types: { period: 'YearMonth', users: 'Quantity' },
      chart_spec: { chartType: 'Line Chart', encodings: { x: 'period', y: 'users' } },
    } as any) as any;
    const tick = cj.options.scales.x.ticks.callback(Date.UTC(2025, 0, 1));
    expect(tick).toMatch(/Jan/);
  });
});
