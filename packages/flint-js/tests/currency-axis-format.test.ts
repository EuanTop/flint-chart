import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { assembleVegaLite } from '../src/vegalite/assemble';

/** The tick labels Vega draws on the bottom axis. */
async function bottomLabels(spec: any): Promise<string[]> {
    const view = new View(parse(compile(spec).spec), { renderer: 'none' });
    await view.runAsync();
    const svg = await view.toSVG();
    return [...svg.matchAll(/<text[^>]*>(\$[^<]*)<\/text>/g)].map((match) => match[1]);
}

describe('a currency axis', () => {
    // GDP per person carries seven decimals; the ticks it is read against do not.
    const rows = [974.5803384, 4797.231267, 12779.37964, 34435.36744, 42951.65309, 1441.284873, 3820.17523, 711.5, 2452.21, 9065.800825]
        .map((gdp, i) => ({ country: `c${i}`, gdp, life: 50 + i * 3 }));
    const input = (log: boolean) => ({
        data: { values: rows },
        semantic_types: { country: 'Name', life: 'Quantity', gdp: { semanticType: 'Amount', unit: 'USD' } },
        chart_spec: { chartType: 'Scatter Plot', encodings: { x: 'gdp', y: 'life' }, ...(log ? { chartProperties: { logScale_x: true } } : {}) },
    }) as any;

    it.each([false, true])('labels round ticks without the data’s decimals (log %s)', async (log) => {
        const labels = await bottomLabels(assembleVegaLite(input(log)));
        expect(labels.length).toBeGreaterThan(2);
        for (const label of labels) expect(label).toMatch(/^\$[\d,]+(\.\d{1,2})?$/);
        expect(labels.some((label) => label.includes('.0000'))).toBe(false);
    });
});
