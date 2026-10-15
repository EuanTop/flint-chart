// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { roundSample, sizeKeySwatches } from '../src/core/legend-plan';
import { assembleVegaLite } from '../src/vegalite/assemble';

/**
 * A size key lists round values, as many as the edge it stands on has room for — three on a small
 * tile, five on a large chart — each symbol clearly larger than the last.
 */

const rows = (max: number) => Array.from({ length: 12 }, (_, i) => ({ v: 3 + (max - 3) * (i / 11) }));

describe('how many entries a size key lists', () => {
    it('one for every 80px of its edge, from three to five', () => {
        expect(sizeKeySwatches('right', { width: 400, height: 180 })).toBe(3);
        expect(sizeKeySwatches('right', { width: 400, height: 320 })).toBe(4);
        expect(sizeKeySwatches('right', { width: 400, height: 600 })).toBe(5);
        // Above or below, the plot's width is its run.
        expect(sizeKeySwatches('top', { width: 400, height: 180 })).toBe(5);
    });
});

describe('the values a size key lists', () => {
    it('are round — one, two, two and a half or five of a power of ten', () => {
        for (const count of [3, 4, 5]) {
            for (const value of roundSample(rows(1350), 'v', count)!) {
                const mantissa = value / 10 ** Math.floor(Math.log10(value));
                expect([1, 2, 2.5, 5]).toContain(Number(mantissa.toFixed(6)));
            }
        }
    });

    it('take as many as asked where the values hold them apart, the largest near the data’s largest', () => {
        expect(roundSample(rows(1350), 'v', 3)).toEqual([200, 500, 1000]);
        expect(roundSample(rows(1350), 'v', 4)).toEqual([100, 250, 500, 1000]);
        expect(roundSample(rows(1350), 'v', 5)).toHaveLength(5);
    });

    it('keep each symbol clearly larger than the last', () => {
        const values = roundSample(rows(1350), 'v', 5)!;
        for (let i = 1; i < values.length; i++) expect(Math.sqrt(values[i]) - Math.sqrt(values[i - 1])).toBeGreaterThan(Math.sqrt(1350) * 0.1);
    });

    it('never list zero', () => {
        expect(roundSample([{ v: 0 }, { v: 40 }, { v: 90 }], 'v', 5)!.every((v) => v > 0)).toBe(true);
    });
});

describe('a size key without a theme', () => {
    it('lists the planned round values rather than every tick of the scale', () => {
        const spec: any = assembleVegaLite({
            data: { values: rows(1350).map((row, i) => ({ ...row, x: i, y: i * 2 })) },
            semantic_types: { x: 'Quantity', y: 'Quantity', v: 'Quantity' },
            chart_spec: { chartType: 'Scatter Plot', encodings: { x: 'x', y: 'y', size: 'v' }, baseSize: { width: 300, height: 300 } },
        } as any);
        const values = spec.encoding?.size?.legend?.values ?? spec.layer?.find((layer: any) => layer.encoding?.size)?.encoding.size.legend?.values;
        expect(values).toBeDefined();
        expect(values.length).toBeGreaterThanOrEqual(3);
        expect(values.length).toBeLessThanOrEqual(5);
        expect(values).not.toContain(0);
    });
});
