import { describe, expect, it } from 'vitest';
import { fullValueFormat } from '../src/core/field-semantics';
import { selectorRowTest } from '../src/core/target-selector';

describe('selectorRowTest', () => {
    it('compares only the fields the chart reads as time by their time', () => {
        const comparison = { temporalFields: ['month'], semanticTypes: { month: 'YearMonth' } };
        const test = selectorRowTest({ select: { key: { month: Date.UTC(2025, 2, 1), region: 'Asia' } } }, ['month', 'region'], comparison)!;
        expect(test({ month: '2025-03', region: 'Asia' })).toBe(true);
        expect(test({ month: '2025-03', region: 'Europe' })).toBe(false);
        expect(test({ month: '2025-04', region: 'Asia' })).toBe(false);
    });
});

describe('fullValueFormat', () => {
    const of = (semanticType: string, values: number[], extra = {}) =>
        fullValueFormat({ semanticAnnotation: { semanticType }, ...extra }, values);
    it('prints a year as written', () => {
        expect(of('Year', [2024])).toBeUndefined();
    });
    it('takes the tooltip format, then the axis format', () => {
        expect(of('Amount', [1], { tooltipFormat: { pattern: ',.2f' }, format: { pattern: ',d' } })).toEqual({ pattern: ',.2f' });
        expect(of('Amount', [1], { format: { pattern: ',d' } })).toEqual({ pattern: ',d' });
    });
    it('falls back to the data\'s precision', () => {
        expect(of('Count', [1200, 3400])).toEqual({ pattern: ',d' });
        expect(of('Quantity', [1.25])).toEqual({ pattern: ',.2f' });
    });
});

