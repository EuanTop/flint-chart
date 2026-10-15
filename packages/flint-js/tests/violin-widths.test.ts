import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { assembleVegaLite } from '../src/index';
import { violinWidths } from '../src/vegalite/templates/violin';

/** Bonds keep within a point or two; crypto swings thirty: a spread fifteen times wider. */
const RETURNS = Array.from({ length: 60 }, (_, index) => {
    const wave = Math.sin(index * 1.7) + Math.cos(index * 0.9);
    return [
        { Asset: 'Bonds', Return: wave * 0.8 },
        { Asset: 'Crypto', Return: wave * 14 },
        { Asset: 'Equities', Return: wave * 5 },
    ];
}).flat();
const EVEN = RETURNS.map((row) => ({ ...row, Return: row.Asset === 'Bonds' ? row.Return * 6 : row.Asset === 'Crypto' ? row.Return / 2.5 : row.Return }));

async function drawnWidths(rows: any[], widths?: string): Promise<{ shapes: number[]; panel: number }> {
    const spec: any = assembleVegaLite({
        data: { values: rows },
        semantic_types: { Asset: 'Category', Return: 'Percentage' },
        chart_spec: { chartType: 'Violin Plot', encodings: { x: 'Asset', y: 'Return' }, ...(widths ? { chartProperties: { widths } } : {}) },
        theme_spec: 'economist',
    } as any);
    const { _theme, _canvasFit, _legendLayout, ...vl } = spec;
    const view = new View(parse(compile(vl).spec), { renderer: 'none' });
    await view.runAsync();
    const shapes: number[] = [];
    const walk = (item: any) => {
        if (!item) return;
        for (const child of item.items ?? []) walk(child);
        if (item.marktype === 'area' && item.role === 'mark' && item.items?.length) shapes.push(item.bounds.x2 - item.bounds.x1);
    };
    walk((view as any).scenegraph().root);
    view.finalize();
    return { shapes, panel: spec.width };
}

describe('violin widths', () => {
    it('keeps equal areas where every violin reads', () => {
        expect(violinWidths(EVEN, 'Return', ['Asset'])).toBe('area');
    });

    it('fills each band where equal areas would draw a violin too thin to read', async () => {
        expect(violinWidths(RETURNS, 'Return', ['Asset'])).toBe('band');
        const { shapes, panel } = await drawnWidths(RETURNS);
        expect(shapes).toHaveLength(3);
        for (const width of shapes) expect(width).toBeGreaterThan(panel * 0.7);
    });

    it('holds the author\'s choice', async () => {
        expect(violinWidths(RETURNS, 'Return', ['Asset'], 'area')).toBe('area');
        expect(violinWidths(EVEN, 'Return', ['Asset'], 'band')).toBe('band');
        const { shapes } = await drawnWidths(RETURNS, 'area');
        expect(Math.min(...shapes) / Math.max(...shapes)).toBeLessThan(0.25);
    });
});
