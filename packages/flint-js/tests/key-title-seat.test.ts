import { describe, expect, it } from 'vitest';
import { vegaLiteStages } from '../src/vegalite/assemble';

const ROWS = ['2020', '2021', '2022'].flatMap((Year) => ['Laptop', 'Phone', 'Tablet'].map((Device, index) => ({ Year, Device, Hours: 200 + index * 90 })));

const house = (legend: Record<string, unknown>) => ({
    id: 'house', label: 'House',
    ink: { surface: { canvas: '#ffffff' }, series: { single: '#333333', categorical: ['#1f77b4', '#d62728', '#2ca02c'] } },
    legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'always', ...legend },
});

const keyOf = (legend: Record<string, unknown>, encodings: Record<string, string> = { x: 'Hours', y: 'Year', color: 'Device' }) => {
    const { plan, spec } = vegaLiteStages({
        data: { values: ROWS },
        semantic_types: { Year: 'Year', Device: 'Category', Hours: 'Quantity' },
        chart_spec: { chartType: 'Stacked Bar Chart', title: 'Weekly hours', encodings, baseSize: { width: 400, height: 300 } },
        theme_spec: house(legend),
        options: { canvasFit: 'off' },
    } as any);
    const drawn: any[] = [];
    JSON.stringify(spec, (_key, value) => { if (value && typeof value === 'object' && value.field === 'Device' && value.legend) drawn.push(value.legend); return value; });
    return { planned: plan.legend.layout!.keys.find(Boolean)!, drawn: drawn[0] };
};

describe('a key\'s title above or below the plot', () => {
    it('stays on its entries\' line where the house states no seat and the row holds it', () => {
        const { planned, drawn } = keyOf({});
        expect(planned.inlineTitle).toBe(true);
        expect(drawn.titleOrient).toBe('left');
    });

    it('stands further from its first entry than the entries stand apart', () => {
        const { planned, drawn } = keyOf({});
        expect(planned.titlePadding).toBeGreaterThan(10);
        expect(drawn.titlePadding).toBe(planned.titlePadding);
    });

    it('stands above its entries where the house asks', () => {
        const { planned } = keyOf({ titlePosition: 'above' });
        expect(planned.inlineTitle).toBe(false);
    });

    it('stands above its entries where the row would not hold it on one line', () => {
        // Three year bands make a narrow plot: the title and its entries do not fit across it.
        const { planned } = keyOf({}, { x: 'Year', y: 'Hours', color: 'Device' });
        expect(planned.inlineTitle).toBe(false);
    });
});

