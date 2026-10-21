import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';

const house = { id: 'in', label: 'In', ink: { surface: { canvas: '#ffffff' } }, legend: { show: 'always', placement: ['inside', 'right'], direction: 'vertical', title: 'omit' } } as any;
const codes = (spec: any) => spec._theme.report.map((r: any) => r.code);
const orient = (spec: any) => spec.config?.legend?.orient;

describe('LG1: a key inside the plot gives way where the marks fill its corner', () => {
    it('moves a pie’s key to the next placement: the pie fills the plot', () => {
        const spec = assembleVegaLite({
            data: { values: [{ B: 'Chrome', S: 65 }, { B: 'Safari', S: 18 }, { B: 'Edge', S: 5 }, { B: 'Firefox', S: 3 }] },
            semantic_types: { B: 'Category', S: 'Percentage' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'B', size: 'S' }, baseSize: { width: 300, height: 300 } },
            theme_spec: house,
        } as any) as any;
        expect(orient(spec)).toBe('right');
        expect(codes(spec)).toContain('legend-inside-covered');
    });

    it('moves a rising line chart’s key: the lines end in the top-right corner', () => {
        const values = ['Norway', 'China'].flatMap((C, s) => [2018, 2019, 2020, 2021, 2022, 2023].map((Year, i) => ({ Year, C, V: 10 + i * (s ? 6 : 16) })));
        const spec = assembleVegaLite({
            data: { values }, semantic_types: { Year: 'Year', C: 'Country', V: 'Percentage' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'V', color: 'C' }, baseSize: { width: 400, height: 260 } },
            theme_spec: house,
        } as any) as any;
        expect(orient(spec)).toBe('right');
    });

    it('keeps the key inside where its corner is clear', () => {
        const values = ['A', 'B'].flatMap((C, s) => [2018, 2019, 2020, 2021, 2022, 2023].map((Year, i) => ({ Year, C, V: 90 - i * 12 - s * 10 })));
        const spec = assembleVegaLite({
            data: { values }, semantic_types: { Year: 'Year', C: 'Category', V: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'V', color: 'C' }, baseSize: { width: 400, height: 260 } },
            theme_spec: house,
        } as any) as any;
        expect(orient(spec)).toBe('top-right');
        expect(codes(spec)).not.toContain('legend-inside-covered');
    });
});
