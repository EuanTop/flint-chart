// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import type { ChartAssemblyInput } from 'flint-chart';
import { chipText, partText, valueText } from '../ui/src/selection-chips.js';

const years = {
  data: { values: [{ Year: 1880, Anomaly: -0.18 }, { Year: 1881, Anomaly: -0.1 }] },
  semantic_types: { Year: 'Year', Anomaly: 'Quantity' },
  chart_spec: { chartType: 'Line Chart', encodings: { x: { field: 'Year' }, y: { field: 'Anomaly' } } },
} as ChartAssemblyInput;

const months = {
  data: { values: [{ Month: '2024-01', Sales: 3 }] },
  semantic_types: { Month: 'YearMonth', Sales: 'Quantity' },
  chart_spec: { chartType: 'Line Chart', encodings: { x: { field: 'Month' }, y: { field: 'Sales' } } },
} as ChartAssemblyInput;

describe('selection chips', () => {
  it('prints a time read from a year number as that year', () => {
    const range = { range: [Date.UTC(1967, 0, 1), Date.UTC(2010, 0, 1)] as [number, number] };
    expect(chipText('Year', range, years)).toBe('Year: 1967–2010');
    expect(partText('Year', range, years)).toBe('Year from 1967 to 2010');
  });

  it('keeps a year the chart already reports as a year', () => {
    expect(valueText(1967, years, 'Year')).toBe('1967');
  });

  it('prints a time read from a date string as that date', () => {
    expect(valueText(Date.UTC(2024, 2, 1), months, 'Month')).toBe('2024-03');
  });
});
