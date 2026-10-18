// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { assembleVegaLite } from '../src/vegalite/assemble';
import { parseColor, luminance } from '../src/core/theme/presence';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';

/**
 * Zero is set apart where the chart crosses it, but as a step past the grid, not an axis — unless a
 * house states it strongly. A floor that is not zero carries no base: the value grid draws it, where a tick stands.
 */

const temps = ['Seattle', 'Chicago'].flatMap((City, c) => Array.from({ length: 12 }, (_, m) => ({ City, Month: m + 1, Temp: (c ? -3 : 4) + 14 * Math.sin((m / 11) * Math.PI) })));
const line = (theme: string, rows = temps) => assembleVegaLite({
    data: { values: rows },
    semantic_types: { City: 'Category', Month: 'Quantity', Temp: 'Temperature' },
    chart_spec: { chartType: 'Line Chart', encodings: { x: 'Month', y: 'Temp', color: 'City' }, baseSize: { width: 400, height: 300 } },
    theme_spec: theme,
} as any) as any;

const zeroRules = (spec: any) => (spec.layer ?? []).filter((layer: any) => (layer.mark?.type ?? layer.mark) === 'rule' && layer.encoding?.y?.datum === 0);
const light = (hex: string) => luminance(parseColor(hex)!);

describe('the zero rule', () => {
    it('stands a step past the grid where the house states it plainly', () => {
        const spec = line('nyt');
        const [zero] = zeroRules(spec);
        const grid = spec.config.axisY.gridColor;
        expect(zero).toBeDefined();
        // Darker than the gridlines, lighter than an axis in the house's ink.
        expect(light(zero.mark.color)).toBeLessThan(light(grid));
        expect(light(zero.mark.color)).toBeGreaterThan(light('#333333'));
        expect(zero.mark.strokeWidth).toBe(spec.config.axisY.gridWidth);
    });

    it('keeps a house’s own ink where it states one', () => {
        const [zero] = zeroRules(line('economist'));
        expect(zero.mark.color.toLowerCase()).toBe('#121317');
    });
});

describe('the floor of a value axis that is not zero', () => {
    it('is not a base: the index axis leaves its line to the value grid', () => {
        const spec = line('nyt');
        expect(spec.config.axisX.domain).toBe(false);
        expect(spec.config.axisY.grid).toBe(true);
    });

    it('carries no plainly stated baseline', () => {
        const above = temps.map((row) => ({ ...row, Temp: row.Temp + 20 }));
        const spec = line('nyt', above);
        const floorRules = (spec.layer ?? []).filter((layer: any) => (layer.mark?.type ?? layer.mark) === 'rule' && layer.encoding?.y?.value === 'height');
        expect(floorRules).toHaveLength(0);
    });

    it('treats a scatter as a line chart: the same floor, the same answer, in every house', () => {
        const scatter = (theme: string): any => assembleVegaLite({
            data: { values: temps.map((row) => ({ ...row, Temp: row.Temp + 20 })) },
            semantic_types: { City: 'Category', Month: 'Quantity', Temp: 'Temperature' },
            chart_spec: { chartType: 'Scatter Plot', encodings: { x: 'Month', y: 'Temp', color: 'City' }, baseSize: { width: 400, height: 300 } },
            theme_spec: theme,
        } as any);
        const above = temps.map((row) => ({ ...row, Temp: row.Temp + 20 }));
        for (const theme of ['nyt', 'economist', 'swiss']) {
            expect(scatter(theme).config.axisX.domain).toBe(line(theme, above).config.axisX.domain);
        }
        // Swiss rules both axes: its scatter keeps the frame.
        expect(scatter('swiss').config.axisX.domain).toBe(true);
        expect(scatter('swiss').config.axisX.tickColor).toBe(scatter('swiss').config.axisX.domainColor);
    });

    it('withholds the ticks with the line they hang from', () => {
        // A house that rules only the category axis drops its line and ticks together off a floating floor.
        const spec = line('economist');
        expect(spec.config.axisX.domain).toBe(false);
        expect(spec.config.axisX.ticks).toBe(false);
    });

    it('lays no paler base over a darker floor line', () => {
        const bars = (theme: string): any => assembleVegaLite({
            data: { values: [{ D: 'a', A: 2 }, { D: 'b', A: 3 }, { D: 'c', A: 1 }] },
            semantic_types: { D: 'Category', A: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' }, baseSize: { width: 300, height: 200 } },
            theme_spec: theme,
        } as any);
        // Nature's black frame already states the base; its grey baseline would only cover it.
        const spec = bars('nature');
        expect(spec.config.axisX.domain).toBe(true);
        expect((spec.layer ?? []).filter((layer: any) => layer.__themeSynthetic && (layer.mark?.type ?? layer.mark) === 'rule')).toHaveLength(0);
        // A house with no floor line still draws its base.
        expect((bars('mckinsey').layer ?? []).some((layer: any) => layer.__themeSynthetic && (layer.mark?.type ?? layer.mark) === 'rule')).toBe(true);
    });

    it('keeps the line where the house rules the value axis too: the two are one frame', () => {
        const spec = line('swiss', temps.map((row) => ({ ...row, Temp: row.Temp + 20 })));
        expect(spec.config.axisY.domain).toBe(true);
        expect(spec.config.axisX.domainColor).toBe(spec.config.axisY.domainColor);
        expect(spec.config.axisX.tickColor).not.toBe(spec.config.axisY.gridColor);
    });

    it('keeps the base of bars standing on zero', () => {
        const spec: any = assembleVegaLite({
            data: { values: [{ D: 'a', A: 2 }, { D: 'b', A: 3 }, { D: 'c', A: 1 }] },
            semantic_types: { D: 'Category', A: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' }, baseSize: { width: 300, height: 200 } },
            theme_spec: 'nyt',
        } as any);
        expect(spec.config.axisX.domain).toBe(true);
        expect(spec.config.axisX.domainColor).not.toBe(spec.config.axisY.gridColor);
    });
});

describe('a gridline under the other axis’s line', () => {
    // The grid's lines as drawn: where each one stands across its axis, and whether it is inked.
    async function gridLines(spec: any, channel: 'x' | 'y'): Promise<Array<{ at: number; drawn: boolean }>> {
        const view = new View(parse(compile(spec).spec), { renderer: 'none' });
        await view.runAsync();
        const out: Array<{ at: number; drawn: boolean }> = [];
        const visit = (item: any): void => {
            if (item?.mark?.role === 'axis-grid') {
                for (const line of item.mark.items) {
                    const vertical = (line.x2 ?? 0) === 0;
                    if (vertical === (channel === 'x')) out.push({ at: channel === 'x' ? line.x : line.y, drawn: !!line.stroke && line.stroke !== 'transparent' });
                }
            }
            for (const child of item?.items ?? []) visit(child);
        };
        visit(view.scenegraph().root);
        const unique = new Map(out.map((line) => [Math.round(line.at * 10) / 10, line]));
        return [...unique.values()].sort((a, b) => a.at - b.at);
    }
    const dots = (theme: string): any => assembleVegaLite({
        data: { values: [{ C: 'a', V: 51 }, { C: 'b', V: 64 }, { C: 'c', V: 89 }] },
        semantic_types: { C: 'Category', V: 'Quantity' },
        chart_spec: { chartType: 'Strip Plot', encodings: { x: 'V', y: 'C' }, baseSize: { width: 300, height: 160 } },
        theme_spec: theme,
    } as any);

    it('gives up only the line the spine lies on, read off the drawn scale', async () => {
        // Swiss rules the category axis; a padded value scale starts clear of its first tick.
        const lines = await gridLines(dots('swiss'), 'x');
        expect(lines.length).toBeGreaterThan(2);
        for (const line of lines) expect(line.drawn).toBe(line.at < 0.5 ? false : true);
    });

    it('still gives up the edge line where the scale is rounded to it', async () => {
        const spec: any = assembleVegaLite({
            data: { values: [{ D: 'a', A: 20 }, { D: 'b', A: 30 }, { D: 'c', A: 10 }] },
            semantic_types: { D: 'Category', A: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' }, baseSize: { width: 300, height: 200 } },
            theme_spec: 'swiss',
        } as any);
        const lines = await gridLines(spec, 'y');
        const bottom = lines[lines.length - 1];
        expect(bottom.drawn).toBe(false);
        expect(lines.slice(0, -1).every((line) => line.drawn)).toBe(true);
    });
});

describe('what the axis lines are where the values float (structure.axis.floating)', () => {
    const above = temps.map((row) => ({ ...row, Temp: row.Temp + 20 }));
    const scatter = (theme: any): any => assembleVegaLite({
        data: { values: above },
        semantic_types: { City: 'Category', Month: 'Quantity', Temp: 'Temperature' },
        chart_spec: { chartType: 'Scatter Plot', encodings: { x: 'Month', y: 'Temp', color: 'City' }, baseSize: { width: 400, height: 300 } },
        theme_spec: theme,
    } as any);
    const rangeRules = (spec: any) => (spec.layer ?? []).filter((layer: any) => layer.__themeSynthetic && (layer.mark?.type ?? layer.mark) === 'rule' && (layer.encoding?.x2 || layer.encoding?.y2));

    it('infers it from the house when unset: a framed house keeps its lines, a gridded one omits the floor', () => {
        expect(scatter('swiss').config.axisX.domain).toBe(true);
        expect(scatter('nyt').config.axisX.domain).toBe(false);
    });

    it('lets the house say so either way', () => {
        expect(scatter({ extends: 'swiss', structure: { axis: { floating: 'omit' } } }).config.axisX.domain).toBe(false);
        expect(scatter({ extends: 'nyt', structure: { axis: { floating: 'keep' } } }).config.axisX.domain).toBe(true);
    });

    it('draws a range frame: each continuous line spans the data alone, set off from the plot', () => {
        const spec = scatter({ extends: 'swiss', structure: { axis: { floating: 'rangeFrame' } } });
        for (const key of ['axisX', 'axisY']) {
            expect(spec.config[key].domain).toBe(false);
            expect(spec.config[key].offset).toBeGreaterThan(0);
        }
        const rules = rangeRules(spec);
        expect(rules).toHaveLength(2);
        const x = rules.find((rule: any) => rule.encoding.x2).encoding;
        expect([x.x.datum, x.x2.datum]).toEqual([1, 12]);
        const temps = above.map((row) => row.Temp);
        const y = rules.find((rule: any) => rule.encoding.y2).encoding;
        expect([y.y.datum, y.y2.datum]).toEqual([Math.min(...temps), Math.max(...temps)]);
    });

    it('governs a strongly stated base along a floating floor too', () => {
        const line = (theme: any): any => assembleVegaLite({
            data: { values: above },
            semantic_types: { City: 'Category', Month: 'Quantity', Temp: 'Temperature' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Month', y: 'Temp', color: 'City' }, baseSize: { width: 400, height: 300 } },
            theme_spec: theme,
        } as any);
        const floorRule = (spec: any) => (spec.layer ?? []).some((layer: any) => layer.__themeSynthetic && layer.encoding?.y?.value === 'height');
        // Datawrapper states its base with its own ink, so, unset, it draws it along any floor.
        expect(floorRule(line('datawrapper'))).toBe(true);
        expect(floorRule(line({ extends: 'datawrapper', structure: { axis: { floating: 'omit' } } }))).toBe(false);
        expect(floorRule(line({ extends: 'datawrapper', structure: { axis: { floating: 'rangeFrame' } } }))).toBe(false);
    });

    it('leaves a chart that starts at zero alone', () => {
        const bars: any = assembleVegaLite({
            data: { values: [{ D: 'a', A: 2 }, { D: 'b', A: 3 }, { D: 'c', A: 1 }] },
            semantic_types: { D: 'Category', A: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' }, baseSize: { width: 300, height: 200 } },
            theme_spec: { extends: 'swiss', structure: { axis: { floating: 'rangeFrame' } } },
        } as any);
        expect(bars.config.axisY.domain).toBe(true);
        expect(rangeRules(bars)).toHaveLength(0);
    });
});

describe('a histogram takes the house rules a bar chart does', () => {
    const histogram = (theme: string): any => assembleVegaLite({
        data: { values: [1.6, 1.8, 2.1, 2.4, 3.3, 3.6, 3.9, 4.1, 4.3, 4.4, 4.6, 4.9].map((v) => ({ D: v })) },
        semantic_types: { D: 'Quantity' },
        chart_spec: { chartType: 'Histogram', encodings: { x: 'D' }, baseSize: { width: 300, height: 200 } },
        theme_spec: theme,
    } as any);
    const bars = (theme: string): any => assembleVegaLite({
        data: { values: [{ D: 'a', A: 2 }, { D: 'b', A: 3 }, { D: 'c', A: 1 }] },
        semantic_types: { D: 'Category', A: 'Quantity' },
        chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' }, baseSize: { width: 300, height: 200 } },
        theme_spec: theme,
    } as any);

    it('states its count as a field, titled as Vega-Lite titles a count', () => {
        const spec = histogram('swiss');
        const y = (spec.layer ?? [spec]).find((layer: any) => layer.encoding?.y).encoding.y;
        expect(y.field).toBeTruthy();
        expect(y.aggregate).toBeUndefined();
        expect(y.title).toBe('Count of Records');
    });

    it('in Swiss: the count axis drops its line under the spine, and the bin axis is lifted over the bars', () => {
        const first = (spec: any) => (spec.layer ?? [spec]).find((layer: any) => layer.encoding?.y) ?? spec;
        const hist = first(histogram('swiss')).encoding;
        const bar = first(bars('swiss')).encoding;
        expect(typeof hist.y.axis?.gridColor).toBe(typeof bar.y.axis?.gridColor);
        expect(hist.y.axis.gridColor.condition).toBeDefined();
        expect(hist.x.axis?.zindex).toBe(1);
    });
});
