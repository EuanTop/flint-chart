import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';

/** The colour scale on the first encoding that has one. */
function colorScale(spec: any): any {
    if (spec && typeof spec === 'object') {
        if (spec.encoding?.color?.scale) return spec.encoding.color.scale;
        for (const value of Object.values(spec)) {
            const found = colorScale(value);
            if (found) return found;
        }
    }
    return undefined;
}

const rows = [
    { game: 'A', month: '2025-01', value: -5 },
    { game: 'A', month: '2025-02', value: 0 },
    { game: 'B', month: '2025-01', value: 4 },
    { game: 'B', month: '2025-02', value: 2 },
];

function heatmapRange(semanticType: string, theme: string): string[] {
    const spec = assembleVegaLite({
        data: { values: rows },
        semantic_types: { game: 'Category', month: 'YearMonth', value: semanticType },
        chart_spec: { chartType: 'Heatmap', encodings: { x: 'month', y: 'game', color: 'value' } },
        theme_spec: theme,
    } as any);
    return colorScale(spec).range;
}

const warmth = (hex: string) => parseInt(hex.slice(1, 3), 16) - parseInt(hex.slice(5, 7), 16);

describe('a house diverging ramp keeps the side the field means', () => {
    it.each(['economist', 'nyt'])('puts losses on the warm end of %s for a signed gain', (theme) => {
        for (const type of ['Profit', 'PercentageChange']) {
            const range = heatmapRange(type, theme);
            expect(warmth(range[0])).toBeGreaterThan(warmth(range[range.length - 1]));
        }
    });

    it('keeps heat on the warm end for a temperature', () => {
        const range = heatmapRange('Temperature', 'economist');
        expect(warmth(range[range.length - 1])).toBeGreaterThan(warmth(range[0]));
    });
});
