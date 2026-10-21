// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { vegaLiteStages } from '../src/vegalite/assemble';
import { naturalAspectRange, shapeDivergence, widenRange } from '../src/core/natural-shape';

/**
 * A plot sized by its bands is judged with the labels it cannot drop, against the shapes a chart
 * of its base takes on its own (its base stretched on either side). Inside that range it keeps the
 * shape its bands give it; past it, its free sides lean it back to the nearer end, or, where that
 * is out of reach, to a looser range round its base. Grids answer to their square-cell rule.
 */

const names = (n: number, prefix = 'C') => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

function plan(chart: { type: string; x: string; y: string; color?: string }, values: Record<string, unknown>[], options: Record<string, unknown> = {}, base = { width: 300, height: 300 }, stretch = 1.5) {
    const { plan } = vegaLiteStages({
        data: { values },
        semantic_types: { Cat: 'Category', Day: 'Category', Value: 'Quantity' },
        chart_spec: {
            chartType: chart.type,
            encodings: { x: chart.x, y: chart.y, ...(chart.color ? { color: chart.color } : {}) },
            baseSize: base,
            canvasSize: { width: base.width * stretch, height: base.height * stretch },
        },
        options,
    } as any);
    const trace = plan.layout.trace as any;
    const notes = [...trace.width, ...trace.height, ...trace.xStep, ...trace.yStep].filter((s: any) => s.rule === 'band balance').map((s: any) => s.note as string);
    return { width: plan.plot.width, height: plan.plot.height, xStep: plan.layout.xStep, yStep: plan.layout.yStep, notes };
}

const bars = (labels: string[]) => labels.map((Cat, i) => ({ Cat, Value: 10 + i }));
const grid = (nx: number, ny: number) => names(nx).flatMap((Cat, i) => names(ny, 'D').map((Day, j) => ({ Cat, Day, Value: i + j })));
const rows = { type: 'Bar Chart', x: 'Value', y: 'Cat' };
const columns = { type: 'Bar Chart', x: 'Cat', y: 'Value' };

describe('natural shape', () => {
    it('runs from the base with its height stretched to the base with its width stretched', () => {
        expect(naturalAspectRange({ width: 300, height: 300 }, { x: 1.5, y: 1.5 })).toEqual({ lo: 1 / 1.5, hi: 1.5 });
        expect(naturalAspectRange({ width: 400, height: 300 }, { x: 1.5, y: 1.5 }).hi).toBeCloseTo(2);
    });

    it('allows some shape where the host allows no stretch', () => {
        const range = naturalAspectRange({ width: 300, height: 300 }, { x: 1, y: 1 });
        expect(range.lo).toBeCloseTo(0.8);
        expect(range.hi).toBeCloseTo(1.25);
    });

    it('measures a shape by how far it lies past the nearer end, 1 where it meets the range', () => {
        const range = { lo: 0.5, hi: 2 };
        expect(shapeDivergence({ lo: 1.5, hi: 3 }, range)).toBe(1);
        expect(shapeDivergence({ lo: 3, hi: 4 }, range)).toBe(1.5);
        expect(shapeDivergence({ lo: 0.1, hi: 0.25 }, range)).toBe(0.5);
        expect(widenRange(range, 2)).toEqual({ lo: 0.25, hi: 4 });
    });
});

describe('band balance', () => {
    it('gives a few rows thicker bands, so the chart is not a strip', () => {
        const off = plan(rows, bars(names(4)), { bandBalance: false });
        const on = plan(rows, bars(names(4)));
        expect(on.yStep).toBeGreaterThan(off.yStep);
        expect(on.notes.length).toBeGreaterThan(0);
    });

    it('lengthens the value axis of many bars with short names, without touching their step', () => {
        const off = plan(rows, bars(names(30)), { bandBalance: false }, { width: 400, height: 300 });
        const on = plan(rows, bars(names(30)), {}, { width: 400, height: 300 });
        expect(on.yStep).toBe(off.yStep);
        expect(on.width).toBeGreaterThan(off.width);
    });

    it('counts the names beside the plot: long ones already widen the chart, so it leans less', () => {
        const short = plan(rows, bars(names(30)), {}, { width: 400, height: 300 });
        const long = plan(rows, bars(names(30, 'Department of ')), {}, { width: 400, height: 300 });
        expect(long.width).toBeLessThan(short.width);
    });

    it('keeps a shape inside its range as the bands make it', () => {
        expect(plan(columns, bars(names(10)))).toEqual(plan(columns, bars(names(10)), { bandBalance: false }));
    });

    it('aims for a looser range round the base where its own cannot be reached readably', () => {
        const on = plan(rows, bars(names(2)), {}, { width: 300, height: 300 }, 1);
        expect(on.notes.some((note) => note.includes('looser range'))).toBe(true);
    });

    it('leaves a grid to its own square-cell rule', () => {
        const chart = { type: 'Heatmap', x: 'Cat', y: 'Day', color: 'Value' };
        expect(plan(chart, grid(24, 7))).toEqual(plan(chart, grid(24, 7), { bandBalance: false }));
    });

    it('aims for a stated shape', () => {
        const square = plan(columns, bars(names(30)));
        const tall = plan(columns, bars(names(30)), { targetAspect: 0.5, aspectTolerance: 1.2 });
        expect(tall.height).toBeGreaterThan(square.height);
    });
});
