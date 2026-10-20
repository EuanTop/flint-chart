// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';

describe('KPI Card captions', () => {
    it('wraps long captions and constrains them to the card width', () => {
        const spec = assembleVegaLite({
            data: {
                values: [
                    { Metric: 'Renewable electricity (%)', Value: 30.3, Goal: 45 },
                    { Metric: 'EV share of car sales (%)', Value: 18, Goal: 40 },
                    { Metric: 'World online (%)', Value: 67, Goal: 90 },
                    { Metric: 'Electricity access (%)', Value: 91, Goal: 100 },
                ],
            },
            semantic_types: { Metric: 'Category', Value: 'Quantity', Goal: 'Quantity' },
            chart_spec: {
                chartType: 'KPI Card',
                encodings: { metric: 'Metric', value: 'Value', goal: 'Goal' },
                chartProperties: { layout: 'horizontal' },
                baseSize: { width: 560, height: 240 },
            },
        } as any) as any;

        const captionMarks = spec.hconcat.map((tile: any) =>
            tile.layer.find((layer: any) =>
                layer.mark?.type === 'text' && String(layer.mark.text).includes('%')),
        );

        expect(captionMarks).toHaveLength(4);
        expect(captionMarks.every((layer: any) => layer.mark.limit > 0)).toBe(true);
        expect(captionMarks.some((layer: any) => layer.mark.text.includes('\n'))).toBe(true);
        expect(captionMarks.every((layer: any) => layer.mark.text.split('\n').length <= 2)).toBe(true);
    });
});

describe('KPI Card numbers', () => {
    const tileTexts = (values: any[], semantic_types: Record<string, any>, encodings: Record<string, string> = { metric: 'Metric', value: 'Value' }) => {
        const spec = assembleVegaLite({
            data: { values },
            semantic_types,
            chart_spec: { chartType: 'KPI Card', encodings, chartProperties: { layout: 'horizontal' }, baseSize: { width: 560, height: 200 } },
        } as any) as any;
        const tiles = spec.hconcat ?? [spec];
        return tiles.map((tile: any) => tile.layer.filter((l: any) => l.mark?.type === 'text').map((l: any) => l.mark.text));
    };

    it('compacts large amounts and prints the declared currency', () => {
        const texts = tileTexts(
            [{ Metric: 'Revenue', Value: 1184320 }, { Metric: 'Orders', Value: 12345 }, { Metric: 'Returns', Value: 812 }],
            { Metric: 'Category', Value: { semanticType: 'Amount', unit: 'USD' } },
        );
        expect(texts.map((t: string[]) => t[1])).toEqual(['$1.18M', '$12.3k', '$812']);
    });

    it('prints fractional percentages as percents and whole ones with a sign', () => {
        expect(tileTexts([{ Metric: 'Churn', Value: 0.0425 }, { Metric: 'Retention', Value: 0.91 }], { Metric: 'Category', Value: 'Percentage' })
            .map((t: string[]) => t[1])).toEqual(['4.3%', '91%']);
        expect(tileTexts([{ Metric: 'Churn', Value: 4.25 }, { Metric: 'Retention', Value: 91 }], { Metric: 'Category', Value: 'Percentage' })
            .map((t: string[]) => t[1])).toEqual(['4.25%', '91%']);
    });

    it('leaves years and values already in millions uncompacted', () => {
        expect(tileTexts([{ Metric: 'Launch', Value: 2024 }], { Metric: 'Category', Value: 'Year' })[0][1]).toBe('2024');
        expect(tileTexts([{ Metric: 'Sales ($m)', Value: 18250 }], { Metric: 'Category', Value: 'Amount' })[0][1]).toBe('18,250');
    });

    it('prints the goal in the value\'s units', () => {
        const [texts] = tileTexts(
            [{ Metric: 'Revenue', Value: 1184320, Goal: 1500000 }],
            { Metric: 'Category', Value: { semanticType: 'Amount', unit: 'USD' }, Goal: 'Amount' },
            { metric: 'Metric', value: 'Value', goal: 'Goal' },
        );
        expect(texts).toContain('79% of $1.5M');
    });

    it('passes strings through', () => {
        expect(tileTexts([{ Metric: 'Status', Value: 'Green' }], { Metric: 'Category', Value: 'Category' })[0][1]).toBe('Green');
    });
});
