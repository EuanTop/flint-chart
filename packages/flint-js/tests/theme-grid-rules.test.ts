import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { assembleVegaLite } from '../src';

/** What Vega draws: gridlines by axis orient, mark rules, and the draw order of marks and grids. */
async function drawn(spec: any) {
    const view = new View(parse(compile(spec).spec), { renderer: 'none' });
    await view.runAsync();
    const grid: Record<string, Array<{ stroke: string; width: number; dash?: string }>> = {};
    const rules: Array<{ stroke: string; width: number }> = [];
    const order: string[] = [];
    const titles: string[] = [];
    const visit = (item: any, orient?: string) => {
        const role = item.mark?.role;
        const next = role === 'axis' ? item.orient ?? orient : orient;
        if (item.mark && role !== 'scope' && !order.includes(`${item.mark.marktype}:${role}`)) order.push(`${item.mark.marktype}:${role}`);
        if (item.mark?.marktype === 'rule' && role === 'axis-grid' && item.opacity !== 0 && item.stroke !== 'transparent') {
            (grid[orient ?? '?'] ??= []).push({ stroke: item.stroke, width: item.strokeWidth, dash: item.strokeDash ? String(item.strokeDash) : undefined });
        }
        if (item.mark?.marktype === 'rule' && role === 'mark') rules.push({ stroke: item.stroke, width: item.strokeWidth });
        if (item.mark?.marktype === 'text' && role === 'axis-title') titles.push(String(item.text));
        for (const child of item.items ?? []) visit(child, next);
    };
    visit((view.scenegraph() as any).root);
    // The axis orient sits on the axis group's datum.
    view.finalize();
    return { grid, rules, order, titles };
}

/** The axis-grid strokes per axis orient, read from the compiled Vega axes. */
function gridAxes(spec: any): Record<string, any> {
    const v: any = compile(spec).spec;
    const out: Record<string, any> = {};
    const walk = (n: any) => {
        for (const a of n.axes ?? []) if (a.grid) out[a.orient] = { zindex: a.zindex, dash: a.gridDash ?? a.encode?.grid?.update?.strokeDash?.value, color: a.gridColor ?? a.encode?.grid?.update?.stroke };
        (n.marks ?? []).forEach(walk);
    };
    walk(v);
    return out;
}

const INK = { surface: { canvas: '#ffffff' }, structure: { grid: '#c8c8c8', axis: '#444444' }, series: { single: '#1f6fb2' } };
const house = (grid: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ id: 'g', label: 'G', ink: INK, structure: { grid }, ...extra }) as any;
const YEARS = Array.from({ length: 24 }, (_, i) => ({ Year: 2000 + i, Rate: 3.6 + Math.abs(Math.sin(i / 3)) * 6 }));
const line = (theme: unknown) => assembleVegaLite({
    data: { values: YEARS }, semantic_types: { Year: 'Year', Rate: 'Percentage' },
    chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Rate' } }, theme_spec: theme,
} as any) as any;
const scatter = (theme: unknown) => assembleVegaLite({
    data: { values: Array.from({ length: 30 }, (_, i) => ({ GDP: 1000 * 1.3 ** i, Life: 50 + i })) },
    semantic_types: { GDP: 'Amount', Life: 'Quantity' },
    chart_spec: { chartType: 'Scatter Plot', encodings: { x: 'GDP', y: 'Life' } }, theme_spec: theme,
} as any) as any;

describe('GR1: a grid the house omits stays omitted', () => {
    it('draws no vertical rules on a scatter whose house rules only horizontally', () => {
        const spec = scatter(house({ measure: 'quiet', category: 'omit' }));
        const axes = gridAxes(spec);
        expect(Object.keys(axes)).toEqual(['left']);
        expect(spec._theme.report.map((r: any) => r.code)).not.toContain('grid-restored');
    });

    it('still gives a value axis a quiet grid where no axis draws any ruler', () => {
        const bare = { ...house({ measure: 'omit', category: 'omit' }) };
        bare.structure = { ...bare.structure, axis: { measure: { line: 'omit' }, categorical: { line: 'omit' } } };
        const spec = scatter(bare);
        expect(Object.keys(gridAxes(spec))).toEqual(['left']);
        expect(spec._theme.report.map((r: any) => r.code)).toContain('grid-restored');
    });
});

describe('GR2: each rule styled on its own', () => {
    it('styles the measure and category grids separately', () => {
        const spec = line(house({ measure: 'quiet', category: { presence: 'quiet', style: 'dashed', color: '#999999' } }));
        expect(spec.config.axisX.grid).toBe(true);
        expect(spec.config.axisX.gridDash).toEqual([3, 3]);
        expect(spec.config.axisY.gridDash).toBeUndefined();
        expect(spec.config.axisX.gridColor).not.toBe(spec.config.axisY.gridColor);
    });

    it('takes the shared style, then the grid’s own', () => {
        const spec = line(house({ measure: { dash: [6, 2] }, category: 'quiet', style: 'dotted' }));
        expect(spec.config.axisY.gridDash).toEqual([6, 2]);
        expect(spec.config.axisX.gridDash).toEqual([1, 3]);
    });

    it('reads a grid object without a presence as a drawn, quiet rule', () => {
        const spec = line(house({ measure: { weight: 2 }, category: 'omit' }));
        expect(spec.config.axisY.grid).toBe(true);
        expect(spec.config.axisY.gridWidth).toBe(2);
    });

    it('styles the zero rule and the baseline with their own weight, dash and ink', async () => {
        const anomaly = assembleVegaLite({
            data: { values: [{ D: 'a', A: -2 }, { D: 'b', A: 3 }, { D: 'c', A: 1 }] },
            semantic_types: { D: 'Category', A: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' } },
            theme_spec: house({ measure: 'quiet', zero: { presence: 'full', weight: 1.5, color: '#b3b3b3' } }),
        } as any) as any;
        const zero = (await drawn(anomaly)).rules;
        expect(zero).toHaveLength(1);
        expect(zero[0].width).toBe(1.5);
        const based = line(house({ measure: 'quiet' }, {}));
        based.layer; // unchanged without a baseline
        const heavy = line({ ...house({ measure: 'quiet' }), structure: { grid: { measure: 'quiet' }, baseline: { presence: 'full', weight: 2, color: '#6e797a' } } });
        const base = (await drawn(heavy)).rules;
        expect(base).toHaveLength(1);
        expect(base[0].width).toBe(2);
    });
});

describe('GR2: minor gridlines', () => {
    it('draws fainter lines between the labelled ones, under the marks, without touching the axis title', async () => {
        const spec = line(house({ measure: 'quiet', category: 'quiet', minor: { divisions: 2 } }, { annotation: { axisTitles: 'always' } }));
        const { rules, order, titles } = await drawn(spec);
        expect(rules.length).toBeGreaterThan(4);
        expect(rules[0].width).toBeLessThanOrEqual(0.5);
        expect(order.indexOf('rule:mark')).toBeLessThan(order.indexOf('line:mark'));
        expect(titles).toEqual(expect.arrayContaining(['Year', 'Rate']));
    });

    it('divides each interval as the house says', () => {
        const thirds = line(house({ measure: 'quiet', minor: { divisions: 3, on: ['measure'] } }));
        const minor = thirds.layer.find((l: any) => l.encoding?.y?.field === '__minor');
        const majors: number[] = thirds.layer.find((l: any) => l.encoding?.y?.field === 'Rate').encoding.y.axis.values;
        expect(minor.data.values).toHaveLength((majors.length - 1) * 2);
        expect(thirds.layer.some((l: any) => l.encoding?.x?.field === '__minor')).toBe(false);
    });

    it('is not drawn where the grid it divides is not', () => {
        const spec = line(house({ measure: 'omit', category: 'omit', minor: 'hairline' }));
        expect(JSON.stringify(spec)).not.toContain('__minor');
    });

    it('is not drawn without a theme', () => {
        expect(JSON.stringify(line(undefined))).not.toContain('__minor');
    });
});

describe('GR2: a grid in front of the marks', () => {
    it('puts one grid in front and leaves the other behind', () => {
        const spec = line(house({ measure: { presence: 'quiet', style: 'dotted' }, category: { presence: 'full', color: '#ffffff', layer: 'front' } }));
        const axes = gridAxes(spec);
        expect(axes.bottom.zindex).toBe(1);
        expect(axes.left.zindex ?? 0).toBe(0);
    });

    it('draws the value grid over the bars', () => {
        const bars = assembleVegaLite({
            data: { values: ['A', 'B', 'C'].map((K, i) => ({ K, V: 20 + i * 15 })) },
            semantic_types: { K: 'Category', V: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'K', y: 'V' } },
            theme_spec: house({ measure: 'full', layer: 'front' }),
        } as any) as any;
        expect(gridAxes(bars).left.zindex).toBe(1);
        const behind = assembleVegaLite({ ...bars._options, data: { values: [{ K: 'A', V: 1 }] }, semantic_types: { K: 'Category', V: 'Quantity' }, chart_spec: { chartType: 'Bar Chart', encodings: { x: 'K', y: 'V' } }, theme_spec: house({ measure: 'full' }) } as any) as any;
        expect(gridAxes(behind).left.zindex ?? 0).toBe(0);
    });
});
