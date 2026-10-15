// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { assembleVegaLite } from '../src/vegalite/assemble';
import { parseColor, luminance } from '../src/core/theme/presence';

/**
 * Zero is set apart where the chart crosses it, but as a step past the grid, not an axis — unless a
 * house states it strongly. A floor that is not zero carries no base: the line along it is a gridline.
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
    it('is a gridline, not a base: the index axis’s line along it takes the grid’s ink', () => {
        const spec = line('nyt');
        expect(spec.config.axisX.domainColor).toBe(spec.config.axisY.gridColor);
    });

    it('carries no plainly stated baseline', () => {
        const above = temps.map((row) => ({ ...row, Temp: row.Temp + 20 }));
        const spec = line('nyt', above);
        const floorRules = (spec.layer ?? []).filter((layer: any) => (layer.mark?.type ?? layer.mark) === 'rule' && layer.encoding?.y?.value === 'height');
        expect(floorRules).toHaveLength(0);
    });

    it('keeps the base of bars standing on zero', () => {
        const spec: any = assembleVegaLite({
            data: { values: [{ D: 'a', A: 2 }, { D: 'b', A: 3 }, { D: 'c', A: 1 }] },
            semantic_types: { D: 'Category', A: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'D', y: 'A' }, baseSize: { width: 300, height: 200 } },
            theme_spec: 'nyt',
        } as any);
        expect(spec.config.axisX.domainColor).not.toBe(spec.config.axisY.gridColor);
    });
});
