// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { assembleVegaLite } from '../src';
import { vegaLiteStructures } from '../src/vegalite/assemble';
import { structureDifferences } from '../src/core/structure';
import type { ChartAssemblyInput } from '../src/core/types';

/**
 * The Ridgeline Plot's perspective additions: the value axis, the marked values joined across the
 * ridges, a quantitative colour's gradient legend, the opacity set in perspective, quantitative series
 * order, and the depth axis title.
 */

const values: any[] = [];
for (let level = 0; level <= 6; level++) {
    for (let round = 0; round <= 14; round++) {
        values.push({ A1: level, Round: round, Rate: Math.round((0.2 + level * 0.05 + round * 0.02) * 100) / 100 });
    }
}

function input(chartProperties: Record<string, any>): ChartAssemblyInput {
    return {
        data: { values },
        semantic_types: { A1: 'Quantity', Round: 'Quantity', Rate: 'Percentage' },
        chart_spec: {
            chartType: 'Ridgeline Plot',
            encodings: { x: 'Round', y: 'Rate', color: 'A1' },
            baseSize: { width: 560, height: 420 },
            chartProperties,
        },
    } as ChartAssemblyInput;
}

const layersOf = (spec: any): any[] => spec.layer ?? [spec];
const ridgeLayer = (spec: any) => layersOf(spec).find((layer) => (layer.mark?.type ?? layer.mark) === 'area');
const textLayers = (spec: any) => layersOf(spec).filter((layer) => layer.mark?.type === 'text');
// The marked values' dots; the key layer's points are drawn at no size.
const dotLayer = (spec: any) => layersOf(spec).find((layer) => layer.mark?.type === 'point' && layer.mark.size !== 0);
const keyLayer = (spec: any) => layersOf(spec).find((layer) => layer.mark?.type === 'point' && layer.mark.size === 0);

describe('Ridgeline Plot in perspective', () => {
    const marked = { perspective: true, valueMax: 1, markAt: [3, 7, 14] };

    it('marks each ridge at every marked x, joined by dashed segments', () => {
        const spec: any = assembleVegaLite(input(marked));
        const join = layersOf(spec).find((layer) => layer.mark?.type === 'rule' && layer.mark.strokeDash);
        const point = dotLayer(spec);
        expect(join.encoding.x2.field).toBe('__x2');
        // Six segments join the seven ridges at each of the three marked x.
        expect(join.data.values).toHaveLength(3 * 6);
        expect(point.data.values).toHaveLength(3 * 7);
        // A1 = 0 at round 7 stands on the front baseline, its value scaled to its height.
        const front = point.data.values.find((row: any) => row.__depth === 0 && row.__mark === 1);
        expect(front.label).toBe('0.34');
    });

    it.each(['swiss', 'pop'])('keeps the flat axes out under a house that rules its axes (%s)', (house) => {
        for (const properties of [{ perspective: true }, { perspective: true, tilt: 1 }]) {
            const spec: any = assembleVegaLite({ ...input(properties), theme_spec: house } as ChartAssemblyInput);
            for (const layer of layersOf(spec)) {
                for (const channel of ['x', 'y']) {
                    if (layer.encoding?.[channel]) expect(layer.encoding[channel].axis).toBeNull();
                }
            }
            // The front edge carries its own tick labels and the x title instead.
            const labels = textLayers(spec).flatMap((layer) => layer.data.values.map((row: any) => row.label));
            expect(labels).toEqual(expect.arrayContaining(['0', 'Round']));
        }
    });

    it('draws a value axis with ticks up to the value max', () => {
        const spec: any = assembleVegaLite(input(marked));
        const labels = textLayers(spec).flatMap((layer) => layer.data.values.map((row: any) => row.label));
        expect(labels).toEqual(expect.arrayContaining(['0.20', '0.40', '0.60', '0.80', '1.00', 'Rate', 'A1']));
    });

    it('keeps a quantitative colour continuous, with a gradient key drawn by fill alone', () => {
        const spec: any = assembleVegaLite(input(marked));
        expect(ridgeLayer(spec).encoding.color.type).toBe('quantitative');
        const key = keyLayer(spec);
        expect(key.encoding.color.type).toBe('quantitative');
        expect(key.encoding.color.legend).not.toBeNull();
        expect(spec.resolve.legend.color).toBe('independent');
    });

    it('stands a quantitative series lowest at the front, and reverses on request', () => {
        const front = (properties: Record<string, any>) => {
            const point = dotLayer(assembleVegaLite(input(properties)));
            const row = point.data.values.find((r: any) => r.__depth === 0 && r.__mark === 0);
            return row.label;
        };
        // At round 3, A1 = 0 reads 0.26 and A1 = 6 reads 0.56.
        expect(front(marked)).toBe('0.26');
        expect(front({ ...marked, order: 'reverse' })).toBe('0.56');
    });

    it('sets the labels at the right end of x to the left of their dots', () => {
        const spec: any = assembleVegaLite(input(marked));
        const [inner, end] = textLayers(spec).filter((layer) => layer.mark.fontSize === 10);
        expect(inner.mark.align).toBe('left');
        expect(end.mark.align).toBe('right');
        expect(end.data.values.every((row: any) => row.__mark === 2)).toBe(true);
    });

    it('draws each ridge in its own layer, back to front, so a ridge hides the lines behind it', () => {
        const ridges = layersOf(assembleVegaLite(input({ perspective: true }))).filter((layer) => (layer.mark?.type ?? layer.mark) === 'area');
        expect(ridges.map((layer) => layer.transform[0].filter.equal)).toEqual([6, 5, 4, 3, 2, 1, 0]);
    });

    it('reads valueMax in perspective only', () => {
        const tallest = (properties: Record<string, any>) =>
            Math.max(...(assembleVegaLite(input(properties)) as any).data.values.map((row: any) => row.__ridge_top - row.__ridge_base));
        expect(tallest({ valueMax: 2 })).toBe(tallest({}));
        expect(tallest({ perspective: true, valueMax: 2 })).toBeLessThan(tallest({ perspective: true }));
    });

    it('keeps every ridge name under a house that caps its tick count', () => {
        const small = input({});
        small.chart_spec.baseSize = { width: 350, height: 200 };
        const spec: any = assembleVegaLite({ ...small, theme_spec: 'nyt' });
        const axis = ridgeLayer(spec)?.encoding?.y?.axis ?? spec.encoding.y.axis;
        expect(spec.config?.axisY?.tickCount).toBeLessThan(7);
        expect(axis.values).toHaveLength(7);
        expect(axis.tickCount).toBe(7);
    });

    it('keeps a series of categories named by numbers in data order', () => {
        const nominal = { ...input({ perspective: true, markAt: [3] }) };
        nominal.chart_spec.encodings = { x: 'Round', y: 'Rate', color: { field: 'A1', type: 'nominal' } } as any;
        const row = dotLayer(assembleVegaLite(nominal)).data.values.find((r: any) => r.__depth === 0);
        // Data order puts A1 = 0 first, at the back, so A1 = 6 stands at the front.
        expect(row.label).toBe('0.56');
    });

    it('plans the depth to 40% of the width, and pins what is set', () => {
        const xDomain = (properties: Record<string, any>) => ridgeLayer(assembleVegaLite(input(properties))).encoding.x.scale.domain;
        const [from, to] = xDomain({ perspective: true });
        // Round runs 0–14; the depth takes 40% of the domain left of it.
        expect((0 - from) / (to - from)).toBeCloseTo(0.4, 5);
        const pinned = xDomain({ perspective: true, skew: 0.05 });
        expect(pinned[0]).toBeCloseTo(-6 * 0.05 * 14, 5);
    });

    it('gives the depth more of the height as ridges are added', () => {
        const depthShare = (levels: number) => {
            const rows = values.filter((row) => row.A1 < levels);
            const spec: any = assembleVegaLite({ ...input({ perspective: true }), data: { values: rows } });
            const [, top] = ridgeLayer(spec).encoding.y.scale.domain;
            return (levels - 1) / top;
        };
        expect(depthShare(4)).toBeCloseTo(0.4, 2);
        expect(depthShare(7)).toBeGreaterThan(depthShare(4));
    });

    it('lays long names level, and keeps the names a line of type apart at any size', () => {
        const long = values.map((row) => ({ ...row, A1: `Level number ${row.A1}` }));
        const spec: any = assembleVegaLite({ ...input({ perspective: true }), data: { values: long }, semantic_types: { A1: 'Category', Round: 'Quantity', Rate: 'Percentage' } });
        const feet = textLayers(spec).find((layer) => layer.data.values.some((row: any) => row.label === 'Level number 0'));
        expect(feet.mark.angle).toBeUndefined();
        expect(feet.data.values).toHaveLength(7);
        for (const baseSize of [{ width: 560, height: 420 }, { width: 240, height: 120 }, { width: 200, height: 60 }]) {
            const small = input({ perspective: true });
            small.chart_spec.baseSize = baseSize;
            const built: any = assembleVegaLite(small);
            const names = textLayers(built).find((layer) => layer.mark.fontWeight === 'bold' && layer.data.values.some((row: any) => row.__ridge_base === 0 && row.label === '0'));
            const { x, y } = ridgeLayer(built).encoding;
            const pxPerBaseline = built.config.view.continuousHeight / y.scale.domain[1];
            const pxPerX = built.config.view.continuousWidth / (x.scale.domain[1] - x.scale.domain[0]);
            const feet = [...names.data.values].sort((a: any, b: any) => a.__ridge_base - b.__ridge_base);
            const gaps = feet.slice(1).map((foot: any, index: number) => {
                const dy = (foot.__ridge_base - feet[index].__ridge_base) * pxPerBaseline;
                const dx = (foot.__ridge_x - feet[index].__ridge_x) * pxPerX;
                // A name along the depth axis needs its own length of it; a level one, a line of type.
                return names.mark.angle !== undefined ? Math.hypot(dx, dy) : dy;
            });
            expect(Math.min(...gaps)).toBeGreaterThanOrEqual((names.mark.angle !== undefined ? 10 : 14) - 1e-6);
        }
    });

    it('marks the inner x ticks when markAt is on, and lines the flat axis up with them', () => {
        const columns = (spec: any) => [...new Set(dotLayer(spec).data.values.map((row: any) => row.__mark))].length;
        const flat: any = assembleVegaLite(input({ markAt: true }));
        const axisValues: number[] = ridgeLayer(flat).encoding.x.axis.values;
        const marked = [...new Set(dotLayer(flat).data.values.map((row: any) => row.Round))];
        expect(marked).toEqual(axisValues.filter((tick) => tick > 0 && tick < 14));
        expect(columns(assembleVegaLite(input({ perspective: true, markAt: true })))).toBeGreaterThan(0);
        expect(dotLayer(assembleVegaLite(input({ markAt: [3] }))).data.values.every((row: any) => row.Round === 3)).toBe(true);
    });

    it('keeps an opacity set in perspective', () => {
        expect(ridgeLayer(assembleVegaLite(input({ perspective: true, opacity: 0.4 }))).mark.opacity).toBe(0.4);
        expect(ridgeLayer(assembleVegaLite(input({ perspective: true }))).mark.opacity).toBe(1);
    });

    it.each([
        { perspective: true, markAt: [3, 7] },
        { markAt: 5 },
        { perspective: true, opacity: 0.5 },
    ])('describes what it builds (%o)', (properties) => {
        const { planned, built } = vegaLiteStructures(input(properties));
        expect(structureDifferences(planned, built)).toEqual([]);
    });
});
