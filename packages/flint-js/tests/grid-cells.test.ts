// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { vegaLiteStages } from '../src/vegalite/assemble';

/**
 * A grid's cells sit at a reading target; a house that lets bands grow into spare room lets them grow
 * a little too, by as much as it lets bands grow, to twice the target at most. Columns widened for
 * their names take the rows with them, so the cells stay square.
 */

const grid = (theme?: string) => vegaLiteStages({
    data: { values: ['North', 'East', 'South', 'West'].flatMap((Region, r) => ['Goods', 'Services', 'Energy'].map((Segment, s) => ({ Region, Segment, Load: 40 + r * 9 + s * 7 }))) },
    semantic_types: { Region: 'Category', Segment: 'Category', Load: 'Quantity' },
    chart_spec: { chartType: 'Heatmap', encodings: { x: 'Region', y: 'Segment', color: 'Load' }, baseSize: { width: 300, height: 300 }, canvasSize: { width: 450, height: 450 } },
    ...(theme ? { theme_spec: theme } : {}),
    options: { canvasFit: 'off' },
} as any).plan;

describe('a small grid', () => {
    it('keeps its cells square, the rows widening with columns widened for their names', () => {
        const { layout } = grid();
        expect(layout.xStep).toBe(layout.yStep);
    });

    it('stays near its reading target where the house does not let bands grow', () => {
        expect(grid().layout.yStep).toBeLessThan(40);
    });

    it('grows by as much as the house lets bands grow, to twice the target at most', () => {
        const steps = ['mckinsey', 'nyt', 'datawrapper'].map((theme) => grid(theme).layout.yStep);
        expect(steps[0]).toBeLessThan(steps[1]);
        expect(steps[1]).toBeLessThan(steps[2]);
        expect(steps[2]).toBeLessThanOrEqual(56);
        for (const theme of ['mckinsey', 'nyt', 'datawrapper']) expect(grid(theme).layout.xStep).toBe(grid(theme).layout.yStep);
    });
});
