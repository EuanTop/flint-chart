import { describe, expect, it } from 'vitest';
import { planKeyLayout, type KeyToLayout } from '../src/core/legend-layout';
import { tableTextMeasurer } from '../src/core/text-width';

const style = {
    labelFont: 'Helvetica', labelFontSize: 10, labelFontWeight: 'normal', labelFontStyle: 'normal',
    titleFont: 'Helvetica', titleFontSize: 10, titleFontWeight: 'bold', titleFontStyle: 'normal', padding: 0,
} as const;
const key = (title: string | null, labels: string[]): KeyToLayout => ({
    gradient: false, labels, count: labels.length, title, style: { ...style }, orient: 'top', edges: ['top'], fixed: false, fixedTitle: false,
});
const keys = () => [key(null, ['North', 'South']), key('Tier', ['Gold', 'Silver'])];
const plot = { width: 600, height: 300 };

describe('how several keys stand, as a theme prefers', () => {
    it('stands keys in a row or a stack as asked', () => {
        expect(planKeyLayout(keys(), plot, tableTextMeasurer, { arrangement: 'row' }).edges[0].direction).toBe('horizontal');
        expect(planKeyLayout(keys(), plot, tableTextMeasurer, { arrangement: 'stack' }).edges[0].direction).toBe('vertical');
    });

    it('sets a titled key\'s title as asked', () => {
        const inline = planKeyLayout(keys(), plot, tableTextMeasurer, { arrangement: 'stack', titlePosition: 'inline' });
        const above = planKeyLayout(keys(), plot, tableTextMeasurer, { arrangement: 'stack', titlePosition: 'above' });
        expect(inline.keys[1]?.inlineTitle).toBe(true);
        expect(above.keys[1]?.inlineTitle).toBe(false);
    });

    it('anchors the keys along their edge, and spreads them across the room they leave', () => {
        expect(planKeyLayout(keys(), plot, tableTextMeasurer, { arrangement: 'row', align: 'end' }).edges[0].anchor).toBe('end');
        const together = planKeyLayout(keys(), plot, tableTextMeasurer, { arrangement: 'row' }).edges[0];
        const spread = planKeyLayout(keys(), plot, tableTextMeasurer, { arrangement: 'row', align: 'spread' });
        expect(spread.edges[0].anchor).toBe('start');
        expect(spread.edges[0].gap).toBeGreaterThan(together.gap);
        expect(spread.notes).toEqual([]);
    });

    it('gives way and says why where the keys would overflow', () => {
        const pinned = (index: number) => ({ ...key(null, Array.from({ length: 3 }, (_, entry) => `Long category ${index}-${entry}`)), fixed: true });
        const narrow = planKeyLayout([pinned(0), pinned(1), pinned(2)], { width: 240, height: 600 }, tableTextMeasurer, { arrangement: 'row' });
        expect(narrow.edges.find((edge) => edge.orient === 'top')?.direction).toBe('vertical');
        expect(narrow.notes.some((note) => note.code === 'keys-arrangement-gave-way')).toBe(true);
    });
});
