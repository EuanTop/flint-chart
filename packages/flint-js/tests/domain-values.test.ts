import { describe, expect, it } from 'vitest';
import { parse, View } from 'vega';
import { compile } from 'vega-lite';
import { assembleVegaLite } from '../src/vegalite/assemble';
import { findVegaAxisScale } from '../src/vegalite/interactions/compile';
import { domainForPlotGeometry } from '../src/vegalite/interactions/runtime';
import type { ChartAssemblyInput } from '../src/core/types';

const MONTHS = ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01'];

async function drawn(chartType: string, rows: Record<string, unknown>[], semantic_types: Record<string, string>) {
    const spec = assembleVegaLite({ data: { values: rows }, semantic_types, chart_spec: { chartType, encodings: { x: { field: 'x' }, y: { field: 'y' } } } } as ChartAssemblyInput);
    const vega = compile(spec).spec as any;
    const view = new View(parse(vega), { renderer: 'none' });
    await view.runAsync();
    const scales = { x: findVegaAxisScale(vega, 'x')!.name, y: findVegaAxisScale(vega, 'y')!.name };
    return { view, scales, width: view.width(), height: view.height() };
}

describe('domain values read back from the drawn scales', () => {
    it('gives Dates on a time axis and numbers on a linear one, navigated or not', async () => {
        const { view, scales, width, height } = await drawn('Line Chart', MONTHS.map((x, i) => ({ x, y: i * 10 })), { x: 'Date', y: 'Quantity' });
        const rect = { kind: 'rect', rect: { x: width / 4, y: height / 4, width: width / 2, height: height / 2 }, axis: 'xy' } as any;
        const read = (name: string) => view.scale(name);
        const overlay = domainForPlotGeometry(rect, undefined, read, scales)!;
        const navigated = domainForPlotGeometry(rect, { x: { scale: scales.x }, y: { scale: scales.y } } as any, read)!;
        for (const domain of [overlay, navigated]) {
            const x = domain.x as { kind: 'interval'; start: unknown; end: unknown };
            expect(x.kind).toBe('interval');
            expect(x.start).toBeInstanceOf(Date);
            expect(x.end).toBeInstanceOf(Date);
            expect(typeof (domain.y as { start: unknown }).start).toBe('number');
        }
    });

    it('gives the category on a discrete axis', async () => {
        const { view, scales, width, height } = await drawn('Bar Chart', [{ x: 'A', y: 1 }, { x: 'B', y: 2 }], { x: 'Category', y: 'Quantity' });
        const point = { kind: 'point', point: { x: width * 0.75, y: height / 2 } } as any;
        const domain = domainForPlotGeometry(point, undefined, (name) => view.scale(name), scales)!;
        expect(domain.x).toEqual({ kind: 'value', value: 'B' });
    });
});
