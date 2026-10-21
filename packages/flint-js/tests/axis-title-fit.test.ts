// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { fitAxisTitle } from '../src/core/axis-title-fit';
import { tableTextMeasurer } from '../src/core/text-width';
import { assembleVegaLite, vegaLiteStages } from '../src/vegalite/assemble';

/**
 * An axis title longer than its axis wraps onto two lines at the axis's length, split most evenly,
 * a second line past it cut with an ellipsis — rather than run past the plot and stretch the
 * drawing to hold it.
 */

const widthOf = tableTextMeasurer(11, 'sans-serif', 'bold', 'normal');
const LONG = 'Afternoon alertness score on the standardized scale (0–100)';

describe('fitting an axis title to its axis', () => {
    it('leaves a title that stands within its axis on one line', () => {
        expect(fitAxisTitle('Score', 200, widthOf, 11)).toBeUndefined();
    });

    it('wraps a longer one onto two lines, split most evenly', () => {
        const fit = fitAxisTitle(LONG, 220, widthOf, 11)!;
        expect(fit.lines).toHaveLength(2);
        expect(fit.cut).toBe(false);
        expect(Math.max(...fit.lines.map(widthOf))).toBeLessThanOrEqual(220);
        expect(fit.lines.join(' ')).toBe(LONG);
    });

    it('cuts the second line where two will not hold it', () => {
        const fit = fitAxisTitle(LONG, 120, widthOf, 11)!;
        expect(fit.lines).toHaveLength(2);
        expect(fit.cut).toBe(true);
        expect(widthOf(fit.lines[0])).toBeLessThanOrEqual(120);
        expect(fit.limit).toBe(120);
    });
});

describe('a chart with long axis titles', () => {
    const input = {
        data: { values: Array.from({ length: 20 }, (_, i) => ({ Sleep: 5 + (i % 8) * 0.4, Alert: 40 + (i * 7) % 45 })) },
        semantic_types: { Sleep: 'Quantity', Alert: 'Score' },
        chart_spec: {
            chartType: 'Scatter Plot',
            encodings: { x: { field: 'Sleep', title: 'Hours of sleep on a typical weeknight (self-reported)' }, y: { field: 'Alert', title: LONG } },
            baseSize: { width: 200, height: 200 }, canvasSize: { width: 240, height: 240 },
        },
    } as any;

    it('keeps each title within its axis, the drawing no taller than the plot asks', async () => {
        const { plan } = vegaLiteStages(input);
        expect(plan.axisTitleFit?.y?.lines).toHaveLength(2);
        const spec: any = assembleVegaLite(input);
        const view = new View(parse(compile(spec).spec), { renderer: 'none' });
        await view.runAsync();
        const titles: Array<{ y1: number; y2: number; x1: number; x2: number }> = [];
        const walk = (node: any, dx: number, dy: number) => {
            for (const item of node?.items ?? []) {
                if (item.mark?.role === 'axis-title' && item.bounds) titles.push({ y1: item.bounds.y1 + dy, y2: item.bounds.y2 + dy, x1: item.bounds.x1 + dx, x2: item.bounds.x2 + dx });
                const group = item.mark?.marktype === 'group';
                if (item.items) walk(item, group ? (item.x ?? 0) + dx : dx, group ? (item.y ?? 0) + dy : dy);
            }
        };
        walk((view.scenegraph() as any).root, 0, 0);
        const yTitle = titles.find((t) => t.x2 <= 0)!;
        expect(yTitle.y1).toBeGreaterThanOrEqual(-2);
        expect(yTitle.y2).toBeLessThanOrEqual(view.height() + 2);
        const xTitle = titles.find((t) => t.y1 >= view.height())!;
        expect(xTitle.x2 - xTitle.x1).toBeLessThanOrEqual(view.width() + 2);
        view.finalize();
    });
});
