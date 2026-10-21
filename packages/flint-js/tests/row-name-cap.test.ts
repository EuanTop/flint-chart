// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { adaptiveRowNameCap, rowNameCap } from '../src/core/compute-layout';
import { vegaLiteStages } from '../src/vegalite/assemble';

/**
 * Names down a y axis may run wider than names along x, but not without end: past a cap — a little
 * inside two-fifths of the chart, never under twelve of their size — they wrap there, then are cut
 * with an ellipsis, whatever the theme's truncation. Codes are never cut.
 */

const causes = ['Diseases of heart', 'Malignant neoplasms', 'Unintentional injuries', 'Cerebrovascular diseases',
    'Chronic lower respiratory diseases', 'Alzheimer disease', 'Diabetes mellitus', 'Nephritis, nephrotic syndrome and nephrosis',
    'Chronic liver disease and cirrhosis', 'Intentional self-harm (suicide)'];

const bars = (names: string[], theme?: string, semantic = 'Category') => vegaLiteStages({
    data: { values: names.map((Cause, i) => ({ Cause, Deaths: 700 - i * 60 })) },
    semantic_types: { Cause: semantic, Deaths: 'Count' },
    chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Deaths', y: 'Cause' }, baseSize: { width: 300, height: 200 }, canvasSize: { width: 450, height: 300 } },
    ...(theme ? { theme_spec: theme } : {}),
    options: { canvasFit: 'off' },
} as any);

describe('the cap on names down y', () => {
    it('stands a little inside two-fifths of the chart, never under twelve of the names’ size', () => {
        expect(rowNameCap(300, 10)).toBe(170);
        expect(rowNameCap(100, 10)).toBe(120);
    });

    it('cuts only the few where few names pass it', () => {
        const widths = [60, 70, 80, 90, 100, 110, 120, 130, 140, 260];
        expect(adaptiveRowNameCap(widths, 300, 10)).toBe(rowNameCap(300, 10));
    });

    it('rises toward the width the long names run to where many pass it, the longest still cut', () => {
        const widths = [150, 180, 200, 210, 220, 230, 240, 250, 260, 400];
        const cap = adaptiveRowNameCap(widths, 300, 10);
        expect(cap).toBeGreaterThan(rowNameCap(300, 10));
        // The nine past the tolerant cap run to 236 on average, the 400 held to the ceiling.
        expect(cap).toBeCloseTo((180 + 200 + 210 + 220 + 230 + 240 + 250 + 260 + 290) / 9, 0);
        expect(cap).toBeLessThan(400);
    });

    it('never rises past the names taking half the chart', () => {
        const widths = Array.from({ length: 10 }, () => 500);
        expect(adaptiveRowNameCap(widths, 300, 10)).toBe(290);
    });

    it('eases in, so no one name tips it', () => {
        // Names lengthen one at a time past the tolerant cap: the cap never jumps.
        const base = Array.from({ length: 20 }, () => 100);
        let last = adaptiveRowNameCap(base, 300, 10);
        for (let i = 0; i < base.length; i++) {
            base[i] = 250;
            const next = adaptiveRowNameCap(base, 300, 10);
            expect(Math.abs(next - last)).toBeLessThan(25);
            last = next;
        }
    });

    it('holds even a theme that never truncates', () => {
        const { plan, spec } = bars(causes, 'economist');
        const y = plan.layout.yLabel;
        // Many of these names are long, so the cap rises toward them — but stays short of the longest.
        expect(y.labelLimit).toBeGreaterThanOrEqual(rowNameCap(plan.layout.subplotWidth, y.fontSize) - 1);
        expect(y.labelLimit).toBeLessThan(plan.layout.subplotWidth);
        expect(y.labelCut).toBe(true);
        expect(spec.config.axisY.labelLimit).toBe(y.labelLimit);
        expect(spec.config.axisY.labelLimit).toBeGreaterThan(0);
    });

    it('leaves names that stand within it as they were', () => {
        const short = ['North', 'South', 'East', 'West'];
        expect(bars(short, 'economist').plan.layout.yLabel.labelCut).toBeUndefined();
    });

    it('never cuts codes', () => {
        const codes = causes.map((cause) => cause.replace(/\W+/g, '').toUpperCase());
        expect(bars(codes, 'economist', 'ID').plan.layout.yLabel.labelCut).toBeUndefined();
    });

    it('reserves the width the names are cut to', () => {
        const { plan } = bars(causes, 'economist');
        const reserved = plan.axisLabels.y.limit;
        expect(reserved).toBe(plan.layout.yLabel.labelLimit);
    });
});
