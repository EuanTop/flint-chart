import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';

const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="3"/>';
const house = {
    id: 'c', label: 'C', ink: { surface: { canvas: '#ffffff' } },
    furniture: [
        { kind: 'image', at: 'aboveTitle', align: 'start', svg: LOGO, width: 40, height: 14, alt: 'Logo' },
        { kind: 'tab', at: 'canvasTop', frame: 'content', align: 'start', color: '#e3120b', width: 26, height: 9 },
        { kind: 'footerRule', anchor: 'bottomLeft', color: '#222222', height: 1 },
    ],
    source: { credit: { text: 'BBC', placement: 'end', image: { svg: LOGO, width: 60, height: 17 } } },
} as any;
const chart = (chrome?: unknown) => assembleVegaLite({
    data: { values: [{ K: 'a', V: 1 }, { K: 'b', V: 2 }] },
    semantic_types: { K: 'Category', V: 'Quantity' },
    chart_spec: { chartType: 'Bar Chart', encodings: { x: 'K', y: 'V' }, title: 'Title', source: 'Gapminder', ...(chrome !== undefined ? { chrome } : {}) },
    theme_spec: house,
} as any) as any;
const items = (spec: any) => (spec.usermeta?.flintCanvasFurniture ?? []) as any[];
const kinds = (spec: any) => items(spec).map((i) => i.kind);

describe('chart_spec.chrome: what a chart keeps of its house chrome', () => {
    it('follows the theme when unset', () => {
        const spec = chart();
        expect(kinds(spec).filter((k) => k === 'image')).toHaveLength(2);
        expect(kinds(spec)).toContain('rect');
        expect(kinds(spec)).toContain('rule');
    });

    it('drops every logo with logos: false, and the footer credit shows its words', () => {
        const spec = chart({ logos: false });
        expect(kinds(spec)).not.toContain('image');
        expect(kinds(spec)).toContain('rect');
        expect(items(spec).some((i) => i.text === 'BBC')).toBe(true);
    });

    it('drops the header with header: false and keeps the footer', () => {
        const spec = chart({ header: false });
        expect(kinds(spec)).not.toContain('rect');
        expect(items(spec).filter((i) => i.kind === 'image')).toHaveLength(1);
        expect(kinds(spec)).toContain('rule');
    });

    it('drops the footer rule and the credit with footer: false, keeping the source', () => {
        const spec = chart({ footer: false });
        expect(items(spec).some((i) => i.text === 'BBC' || (i.kind === 'image' && i.alt === 'BBC'))).toBe(false);
        expect(items(spec).some((i) => /Gapminder/.test(i.text ?? ''))).toBe(true);
    });

    it('drops it all with false', () => {
        const spec = chart(false);
        expect(kinds(spec)).not.toContain('image');
        expect(kinds(spec)).not.toContain('rect');
        expect(items(spec).some((i) => /Gapminder/.test(i.text ?? ''))).toBe(true);
    });
});
