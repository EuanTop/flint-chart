// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { assembleVegaLite } from '../src';
import { vegaLiteStructures } from '../src/vegalite/assemble';
import { structureDifferences } from '../src/core/structure';
import type { ChartAssemblyInput } from '../src/core/types';

/**
 * The Ridgeline Plot's perspective additions: the value axis, the marked values joined across the
 * ridges, a quantitative colour's gradient legend, the opacity set in perspective, numeric series
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

    it('marks each ridge at every marked x, joined by a dashed line', () => {
        const spec: any = assembleVegaLite(input(marked));
        const line = layersOf(spec).find((layer) => layer.mark?.type === 'line');
        const point = dotLayer(spec);
        expect(line.mark.strokeDash).toBeDefined();
        expect(line.encoding.detail.field).toBe('__mark');
        expect(point.data.values).toHaveLength(3 * 7);
        // A1 = 0 at round 7 stands on the front baseline, its value scaled to its height.
        const front = point.data.values.find((row: any) => row.__depth === 0 && row.__mark === 1);
        expect(front.label).toBe('0.34');
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

    it('stands numeric series lowest at the front, and reverses on request', () => {
        const front = (properties: Record<string, any>) => {
            const point = dotLayer(assembleVegaLite(input(properties)));
            const row = point.data.values.find((r: any) => r.__depth === 0 && r.__mark === 0);
            return row.label;
        };
        // At round 3, A1 = 0 reads 0.26 and A1 = 6 reads 0.56.
        expect(front(marked)).toBe('0.26');
        expect(front({ ...marked, order: 'reverse' })).toBe('0.56');
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
