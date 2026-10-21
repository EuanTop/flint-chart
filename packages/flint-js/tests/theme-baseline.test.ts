import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { assembleVegaLite } from '../src';

/** The rules Vega draws as marks (not axis lines or gridlines), and the plot's height. */
async function rules(spec: any): Promise<{ rules: Array<{ x?: number; y?: number; stroke: string; width: number }>; height: number; width: number }> {
    const view = new View(parse(compile(spec).spec), { renderer: 'none' });
    await view.runAsync();
    const out: Array<{ x?: number; y?: number; stroke: string; width: number }> = [];
    const visit = (item: any) => {
        if (item.mark?.marktype === 'rule' && item.mark.role === 'mark') out.push({ x: item.x, y: item.y, stroke: item.stroke, width: item.strokeWidth });
        for (const child of item.items ?? []) visit(child);
    };
    visit((view.scenegraph() as any).root);
    const size = { height: view.height(), width: view.width() };
    view.finalize();
    return { rules: out, ...size };
}

const INK = '#333333';
const house = (structure: Record<string, unknown>) => ({
    id: 'h', label: 'H',
    ink: { surface: { canvas: '#ffffff' }, structure: { axis: INK, grid: '#cbcbcb' }, series: { single: '#1380a1' } },
    structure: { grid: { measure: 'quiet' }, axis: { categorical: { line: 'omit' } }, ...structure },
}) as any;
const UNEMPLOYMENT = Array.from({ length: 24 }, (_, i) => ({ Year: 2000 + i, Rate: 3.6 + Math.abs(Math.sin(i / 3)) * 6 }));
const line = (theme: unknown, zero?: boolean) => assembleVegaLite({
    data: { values: UNEMPLOYMENT },
    semantic_types: { Year: 'Year', Rate: 'Percentage' },
    chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Rate' }, baseSize: { width: 480, height: 300 }, ...(zero === undefined ? {} : { chartProperties: { includeZero: zero } }) },
    theme_spec: theme,
} as any) as any;

describe('B1: the baseline the theme states', () => {
    it('is drawn along the floor of an axis the chart did not start at zero', async () => {
        const spec = line(house({ baseline: 'emphasised' }));
        // The chart, not the theme, chose not to start at zero.
        expect(spec.layer[0].encoding.y.scale.zero).toBe(false);
        const { rules: drawn, height } = await rules(spec);
        expect(drawn).toHaveLength(1);
        expect(drawn[0].y).toBeCloseTo(height, 0);
        expect(drawn[0].width).toBeGreaterThan(1);
    });

    it('is drawn at zero where zero is inside the domain', async () => {
        const bars = assembleVegaLite({
            data: { values: [{ D: '1880s', A: -0.17 }, { D: '1920s', A: -0.27 }, { D: '2000s', A: 0.4 }, { D: '2020s', A: 1.02 }] },
            semantic_types: { D: 'Category', A: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' }, baseSize: { width: 400, height: 300 } },
            theme_spec: house({ baseline: 'full' }),
        } as any) as any;
        const { rules: drawn, height } = await rules(bars);
        expect(drawn).toHaveLength(1);
        expect(drawn[0].y).toBeGreaterThan(0);
        expect(drawn[0].y).toBeLessThan(height);
    });

    it('gives way to the house’s own zero rule where the data crosses zero', async () => {
        const bars = assembleVegaLite({
            data: { values: [{ D: 'a', A: -2 }, { D: 'b', A: 3 }] },
            semantic_types: { D: 'Category', A: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' } },
            theme_spec: house({ baseline: 'full', grid: { measure: 'quiet', zero: 'emphasised' } }),
        } as any) as any;
        const { rules: drawn } = await rules(bars);
        expect(drawn).toHaveLength(1);
    });

    it('is not drawn twice over the index axis line in the same ink', async () => {
        const spec = line(house({ baseline: 'full', axis: { categorical: { line: 'full' } } }));
        const { rules: drawn } = await rules(spec);
        expect(drawn).toHaveLength(0);
    });

    it('is not drawn where the theme states none, nor without a theme', async () => {
        expect((await rules(line(house({})))).rules).toHaveLength(0);
        expect((await rules(line(house({ baseline: 'omit' })))).rules).toHaveLength(0);
        expect((await rules(line(undefined))).rules).toHaveLength(0);
    });

    it('runs down a pyramid’s spine, on both halves, without widening the ruler', async () => {
        const rows = ['0–14', '15–29', '30–44', '75+'].flatMap((Age, i) => [
            { Age, Sex: 'Male', Population: [31, 34, 33, 10][i] }, { Age, Sex: 'Female', Population: [30, 32, 33, 15][i] }]);
        const input = (theme: unknown) => ({
            data: { values: rows }, semantic_types: { Age: 'Category', Sex: 'Category', Population: 'Count' },
            chart_spec: { chartType: 'Pyramid Chart', encodings: { y: 'Age', x: 'Population', color: 'Sex' }, baseSize: { width: 480, height: 300 } },
            theme_spec: theme,
        }) as any;
        const ticks = async (spec: any) => {
            const view = new View(parse(compile(spec).spec), { renderer: 'none' });
            await view.runAsync();
            const out: string[] = [];
            const visit = (item: any) => { if (item.mark?.role === 'axis-label') out.push(String(item.text)); for (const c of item.items ?? []) visit(c); };
            visit((view.scenegraph() as any).root);
            view.finalize();
            return out.filter((t) => /^\d+$/.test(t));
        };
        const themed = assembleVegaLite(input(house({ baseline: 'full' })));
        expect((await rules(themed)).rules).toHaveLength(2);
        expect(await ticks(themed)).toEqual(await ticks(assembleVegaLite(input(house({})))));
    });

    it('is not drawn under a scatter', async () => {
        const spec = assembleVegaLite({
            data: { values: [{ a: 1, b: 2 }, { a: 3, b: 5 }, { a: 4, b: 3 }] },
            semantic_types: { a: 'Quantity', b: 'Quantity' },
            chart_spec: { chartType: 'Scatter Plot', encodings: { x: 'a', y: 'b' } },
            theme_spec: house({ baseline: 'emphasised' }),
        } as any) as any;
        expect((await rules(spec)).rules).toHaveLength(0);
    });
});
