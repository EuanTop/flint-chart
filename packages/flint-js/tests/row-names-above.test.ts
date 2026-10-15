// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { vegaLiteStages } from '../src/vegalite/assemble';
import { rowNamesGeometry, rowNamesLeastStep } from '../src/core/plan';

/**
 * A house may set the names of horizontal bars each on its own line above its bar (Datawrapper's
 * "labels on a separate line"): the band takes twice its room by the same stretch, and where the
 * canvas cannot give it, the names stand beside as before.
 */

const CAUSES = [
    ['Diseases of heart', 703], ['Malignant neoplasms', 608], ['Unintentional injuries', 227],
    ['Cerebrovascular diseases', 165], ['Chronic lower respiratory diseases', 148], ['Alzheimer disease', 120],
    ['Diabetes mellitus', 102], ['Nephritis, nephrotic syndrome and nephrosis', 58],
    ['Chronic liver disease and cirrhosis', 55], ['Intentional self-harm (suicide)', 49],
].map(([Cause, Deaths]) => ({ Cause, Deaths }));
const SHORT = ['UK', 'France', 'Spain', 'Italy', 'Japan'].map((Country, i) => ({ Country, Deaths: 10 + i * 7 }));

const bars = (theme: unknown, base = { width: 300, height: 300 }, stretch = 1.5, rows: any[] = CAUSES, chartType = 'Bar Chart', encodings?: any) => ({
    data: { values: rows },
    semantic_types: { Cause: 'Category', Country: 'Category', Deaths: 'Quantity', Group: 'Category' },
    chart_spec: {
        chartType, title: 'What Americans die of', baseSize: base,
        canvasSize: { width: base.width * stretch, height: base.height * stretch },
        encodings: encodings ?? (rows === CAUSES ? { x: 'Deaths', y: 'Cause' } : { x: 'Deaths', y: 'Country' }),
    },
    theme_spec: theme,
}) as any;

async function drawn(spec: any) {
    const view = new View(parse(compile(spec).spec), { renderer: 'none' });
    await view.runAsync();
    const names: any[] = [];
    const rects: any[] = [];
    const visit = (item: any, group: string | undefined) => {
        const name = item.mark?.name ?? group;
        if (item.mark?.marktype === 'text' && String(name ?? '').includes('row_names') && item.text) names.push({ text: item.text, ...item.bounds });
        if (item.mark?.marktype === 'rect' && item.mark.role === 'mark' && item.datum?.Cause) rects.push({ cause: item.datum.Cause, ...item.bounds });
        for (const child of item.items ?? []) visit(child, name);
    };
    visit((view.scenegraph() as any).root, undefined);
    view.finalize();
    return { names, rects };
}

describe('names above their bars', () => {
    it('set each name over its own bar, nearer it than the bar before, where the house asks and the canvas holds it', async () => {
        const { plan, spec } = vegaLiteStages(bars('datawrapper'));
        expect(plan.rowNames).toBeDefined();
        expect(plan.report.some((note) => note.code === 'row-names-above')).toBe(true);
        expect(plan.layout.yStep).toBeGreaterThanOrEqual(rowNamesLeastStep(plan.rowNames!.fontSize));
        // The axis prints no names and keeps no gutter for them.
        expect(plan.design.axes.y?.label.show).toBe(false);
        const bar = spec.layer.find((unit: any) => unit.mark?.type === 'bar');
        expect(bar.encoding.y.axis.labels).toBe(false);
        expect(bar.mark.height).toBe(plan.rowNames!.bar);
        // No rule up the zero line through the names.
        expect(spec.layer.some((unit: any) => unit.mark?.type === 'rule' && unit.encoding?.x?.datum === 0)).toBe(false);

        const { names, rects } = await drawn(spec);
        expect(names.map((name) => name.text)).toEqual(CAUSES.map((row) => row.Cause));
        rects.sort((a, b) => a.y1 - b.y1);
        names.sort((a, b) => a.y1 - b.y1);
        rects.forEach((rect, index) => {
            const own = names[index];
            expect(own.y2).toBeLessThanOrEqual(rect.y1 + 1);
            if (index > 0) expect(rect.y1 - own.y2).toBeLessThan(own.y1 - rects[index - 1].y2);
            // The names start where the bars do (the bars carry a hairline outline).
            expect(Math.abs(own.x1 - rect.x1)).toBeLessThanOrEqual(2);
        });
    });

    it('stand beside where the stretch cannot give the bands twice their room', () => {
        const { plan } = vegaLiteStages(bars('datawrapper', { width: 300, height: 160 }));
        expect(plan.rowNames).toBeUndefined();
        expect(plan.report.some((note) => note.code === 'row-names-beside')).toBe(true);
        expect(plan.design.axes.y?.label.show).not.toBe(false);
    });

    it('stand above, under `auto`, only where beside a name would be cut or wrapped', () => {
        expect(vegaLiteStages(bars('datawrapper', undefined, 1.5, SHORT)).plan.rowNames).toBeUndefined();
        const always = { extends: 'datawrapper', labels: { truncation: 'never', rowNames: 'above' } };
        expect(vegaLiteStages(bars(always, undefined, 1.5, SHORT)).plan.rowNames).toBeDefined();
    });

    it('are left beside by a house that does not ask, and by charts with more than one bar to a band', () => {
        for (const theme of ['nyt', 'economist', 'mckinsey', 'swiss', undefined]) {
            expect(vegaLiteStages(bars(theme)).plan.rowNames, String(theme)).toBeUndefined();
        }
        const always = { extends: 'datawrapper', labels: { truncation: 'never', rowNames: 'above' } };
        const grouped = CAUSES.slice(0, 4).flatMap((row) => ['2021', '2022'].map((Group) => ({ ...row, Group })));
        expect(vegaLiteStages(bars(always, undefined, 1.5, grouped, 'Grouped Bar Chart', { x: 'Deaths', y: 'Cause', color: 'Group' })).plan.rowNames).toBeUndefined();
        expect(vegaLiteStages(bars(always, undefined, 1.5, CAUSES.slice(0, 5), 'Bar Chart', { x: 'Cause', y: 'Deaths' })).plan.rowNames).toBeUndefined();
    });
});

describe('a band holding a name over its bar', () => {
    it('holds the name, a gap, a readable bar and more air under the bar than over the name', () => {
        for (const fontSize of [10, 11, 12, 14]) for (const extra of [0, 6, 20]) {
            const step = rowNamesLeastStep(fontSize) + extra;
            const g = rowNamesGeometry(step, fontSize, 0.7, 300)!;
            expect(g).toBeDefined();
            expect(g.top + g.line + g.gap + g.bar).toBeLessThanOrEqual(step);
            expect(g.bar).toBeGreaterThanOrEqual(6);
            const under = step - (g.top + g.line + g.gap + g.bar);
            expect(under + g.top).toBeGreaterThan(g.gap);
        }
        expect(rowNamesGeometry(rowNamesLeastStep(11) - 1, 11, 0.7, 300)).toBeUndefined();
    });
});
