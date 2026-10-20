// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';
import type { ThemeSpec } from '../src/core/theme/types';

const theme: ThemeSpec = {
    id: 'series-end-test',
    label: 'Series end test',
    ink: {
        surface: { canvas: '#fff', plot: '#fff' },
        text: { primary: '#111' },
        series: { single: '#333', categorical: ['#1261a0', '#d1495b', '#2a9d8f', '#725ac1'] },
    },
    legend: { show: 'always', placement: ['seriesEnd', 'right'] },
} as ThemeSpec;

function rows(endValues: number[], endYears?: number[]): any[] {
    return endValues.flatMap((endValue, seriesIndex) => {
        const endYear = endYears?.[seriesIndex] ?? 2020;
        return [1950, 1980, endYear].map((year, index) => ({
            year,
            series: `S${seriesIndex + 1}`,
            value: index === 2 ? endValue : 70 - seriesIndex * 4 - index * 5,
        }));
    });
}

function build(endValues: number[], endYears?: number[]): any {
    return assembleVegaLite({
        data: { values: rows(endValues, endYears) },
        semantic_types: { year: 'Year', series: 'Category', value: 'Quantity' },
        chart_spec: {
            chartType: 'Line Chart',
            encodings: { x: 'year', y: 'value', color: 'series' },
            baseSize: { width: 480, height: 300 },
        },
        theme_spec: theme,
    } as any) as any;
}

function layers(spec: any): any[] {
    const body = spec.layer ?? [];
    return Array.isArray(body) ? body : [];
}

function endLabel(spec: any): any | undefined {
    return layers(spec).find((layer) => {
        const mark = typeof layer.mark === 'string' ? layer.mark : layer.mark?.type;
        return mark === 'text' && ['series', '__seriesEndLabel'].includes(layer.encoding?.text?.field);
    });
}

function messages(spec: any): string {
    return (spec._theme?.report ?? [])
        .filter((entry: any) => entry.path === 'legend.placement')
        .map((entry: any) => entry.message)
        .join(' ');
}

describe('series-end collision policy', () => {
    it('keeps aligned, separated endpoints directly labelled', () => {
        const spec = build([20, 40, 60]);
        expect(endLabel(spec)?.encoding.y.field).toBe('value');
        expect(endLabel(spec)?.mark.fontSize).toBe(10);
    });

    it('slightly dodges close labels without adding connector ticks', () => {
        const spec = build([50, 52]);
        expect(endLabel(spec)?.encoding.y.field).toBe('__seriesEndLabelValue');
        expect(layers(spec).some((layer) => {
            const mark = typeof layer.mark === 'string' ? layer.mark : layer.mark?.type;
            return mark === 'rule' && layer.encoding?.y2?.field === '__seriesEndLabelValue';
        })).toBe(false);
    });

    it.each([
        { edge: 'top', values: [25, 48, 72] },
        { edge: 'bottom', values: [0, 25, 48] },
    ])('keeps a label on the $edge boundary anchored to its endpoint', ({ values }) => {
        const spec = build(values);
        expect(endLabel(spec)?.encoding.y.field).toBe('value');
    });

    it('falls back as a set when dense labels need too much displacement', () => {
        const spec = build([50, 51, 52, 53]);
        expect(endLabel(spec)).toBeUndefined();
        expect(messages(spec)).toMatch(/more than one line of text/);
    });

    it('keeps staggered endpoints direct when their labels do not collide', () => {
        const spec = build([20, 45, 70], [2020, 2010, 2000]);
        expect(endLabel(spec)?.encoding.y.field).toBe('value');
        expect(messages(spec)).not.toContain('key is drawn');
    });

    it('falls back when staggered endpoint labels actually collide', () => {
        const spec = build([50, 52], [2020, 2000]);
        expect(endLabel(spec)).toBeUndefined();
        expect(messages(spec)).toMatch(/labels overlap.*cannot be dodged as one column/);
    });
});

describe('series-end names follow the rows the chart draws', () => {
    /** Each series' name position, as the compiled chart places it. */
    async function namePositions(spec: any, values?: any[]): Promise<Map<string, number>> {
        const { compile } = await import('vega-lite');
        const { parse, View } = await import('vega');
        const view = new View(parse(compile(spec).spec), { renderer: 'none' });
        await view.runAsync();
        if (values) {
            const { changeset } = await import('vega');
            const source = view.getState({ data: (name?: string) => /^source/.test(name ?? '') }).data;
            const name = Object.keys(source ?? {})[0] ?? 'source_0';
            view.change(name, changeset().remove(() => true).insert(values));
            await view.runAsync();
        }
        const out = new Map<string, number>();
        const visit = (item: any) => {
            if (item?.mark?.marktype === 'text' && item.datum?.__seriesEndLabelValue !== undefined) {
                out.set(item.datum.series, item.datum.__seriesEndLabelValue);
            }
            (item?.items ?? []).forEach(visit);
        };
        visit((view.scenegraph() as any).root); // Scene typings omit the root item.
        return out;
    }

    it('packs the names the way the plan did', async () => {
        const spec = build([50, 52]);
        const placed = await namePositions(spec);
        expect(placed.size).toBe(2);
        const [high, low] = [placed.get('S2')!, placed.get('S1')!];
        expect(high).toBe(52);
        expect(high - low).toBeGreaterThan(2);
    });

    it('moves the names with replaced rows, still a line apart', async () => {
        const spec = build([50, 52]);
        const moved = await namePositions(spec, rows([20, 21]));
        expect(moved.get('S2')).toBe(21);
        expect(moved.get('S1')!).toBeLessThan(21);
        expect(moved.get('S1')!).toBeGreaterThan(10);
        // Apart again, each name stands at its own line's end.
        const apart = await namePositions(spec, rows([10, 60]));
        expect(apart.get('S1')).toBe(10);
        expect(apart.get('S2')).toBe(60);
    });
});

describe('the planned ticks of a time axis are the ones drawn', () => {
    // Vega-Lite states `ceil(width / 40)` ticks by default and Vega strides explicit values down to
    // it, so on a narrow plot every other tick — the January that names the year — would vanish.
    it('states its own tick count beside its planned values', async () => {
        const dates = ['2013-05-13', '2013-11-08', '2014-05-13', '2014-11-10', '2015-05-13', '2015-11-10', '2016-05-12', '2016-11-09', '2017-05-12', '2017-11-09'];
        const spec = assembleVegaLite({
            data: { values: dates.flatMap((date, i) => ['A', 'B'].map((s, j) => ({ date, s, v: i * (j + 1) }))) },
            semantic_types: { date: 'Date', s: 'Category', v: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'date', y: 'v', color: 's' }, baseSize: { width: 380, height: 260 } },
        } as any) as any;
        const x = (spec.layer?.[0] ?? spec).encoding?.x ?? spec.encoding.x;
        expect(Array.isArray(x.axis.values)).toBe(true);
        expect(x.axis.tickCount).toBe(x.axis.values.length);

        const { compile } = await import('vega-lite');
        const { parse, View } = await import('vega');
        const view = new View(parse(compile(spec).spec), { renderer: 'none' });
        await view.runAsync();
        const labels: string[] = [];
        const visit = (item: any) => { if (item?.mark?.role === 'axis-label' && item.text) labels.push(String(item.text)); (item?.items ?? []).forEach(visit); };
        visit((view.scenegraph() as any).root); // Scene typings omit the root item.
        // The years survive: they are the labels a stride would have dropped.
        expect(labels.filter((label) => /^\d{4}$/.test(label)).length).toBeGreaterThan(1);
    });
});

describe('names at the line ends with their last value', () => {
    it('writes the value in the field\u2019s unit after the name', () => {
        const spec = assembleVegaLite({
            data: { values: rows([50, 20]).map((row) => ({ ...row })) },
            semantic_types: { year: 'Year', series: 'Category', value: { semanticType: 'Quantity', unit: '%' } },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'year', y: 'value', color: 'series' }, baseSize: { width: 480, height: 300 } },
            theme_spec: { ...theme, legend: { ...theme.legend, endValue: true } },
        } as any) as any;
        const label = endLabel(spec);
        expect(label?.encoding.text.field).toBe('__seriesEndLabel');
        const calc = label.transform.find((t: any) => t.as === '__seriesEndLabel').calculate;
        expect(calc).toContain('"%"');
        expect(endLabel(build([50, 20]))?.encoding.text.field).toBe('series');
    });
});
