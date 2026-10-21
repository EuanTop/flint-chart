// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { assembleVegaLite, vegaLiteStages } from '../src/vegalite/assemble';

/**
 * A radar draws its spoke labels outside its square plot and fills the plot with its polygons: a key
 * beside it stands its gap past the labels, and a key inside it has no free corner.
 */

const table: Record<string, Record<string, number>> = {
    Almonds: { Protein: 21, Fat: 50, Carbs: 22, Fiber: 12, Sugar: 4 },
    Oats: { Protein: 17, Fat: 7, Carbs: 66, Fiber: 11, Sugar: 1 },
    'Greek yogurt': { Protein: 10, Fat: 5, Carbs: 4, Fiber: 0, Sugar: 4 },
};
const rows = Object.entries(table).flatMap(([Food, by]) => Object.entries(by).map(([Nutrient, grams]) => ({ Food, Nutrient, 'Grams/100g': grams })));
const radar = (theme: string | undefined, base: { width: number; height: number }, stretch: number) => ({
    data: { values: rows },
    semantic_types: { Nutrient: 'Category', Food: 'Category', 'Grams/100g': 'Quantity' },
    chart_spec: {
        chartType: 'Radar Chart', encodings: { x: 'Nutrient', y: 'Grams/100g', color: 'Food' }, title: 'Almonds, oats and yogurt',
        baseSize: base, canvasSize: { width: base.width * stretch, height: base.height * stretch },
    },
    ...(theme ? { theme_spec: theme } : {}),
}) as any;

const overlap = (a: any, b: any) => Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) > 1 && Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) > 1;

async function keyHits(spec: any): Promise<string[]> {
    const view = new View(parse(compile(spec).spec), { renderer: 'none' });
    await view.runAsync();
    const keys: any[] = [];
    const marks: any[] = [];
    const walk = (node: any, dx: number, dy: number, inKey: boolean) => {
        for (const item of node?.items ?? []) {
            const role = item.mark?.role;
            const key = inKey || role === 'legend';
            const b = item.bounds;
            const box = b && { x1: b.x1 + dx, x2: b.x2 + dx, y1: b.y1 + dy, y2: b.y2 + dy };
            if (role === 'legend' && box) keys.push(box);
            if (!key && role === 'mark' && box && ['text', 'line', 'area'].includes(item.mark?.marktype)) marks.push({ ...box, kind: item.mark.marktype });
            const group = item.mark?.marktype === 'group';
            if (item.items) walk(item, group ? (item.x ?? 0) + dx : dx, group ? (item.y ?? 0) + dy : dy, key);
        }
    };
    walk((view.scenegraph() as any).root, 0, 0, false);
    view.finalize();
    return keys.flatMap((k) => marks.filter((m) => overlap(k, m)).map((m) => m.kind));
}

describe('a key beside a radar', () => {
    it.each([
        [undefined, { width: 300, height: 200 }, 1.5],
        ['nature', { width: 300, height: 200 }, 1.5],
        ['datawrapper', { width: 200, height: 200 }, 1.2],
        ['nyt', { width: 300, height: 300 }, 1.5],
    ] as const)('stands clear of its spoke labels and polygons (%s, %o)', async (theme, base, stretch) => {
        expect(await keyHits(assembleVegaLite(radar(theme, base, stretch)))).toEqual([]);
    });

    it('stands its gap past the labels, not past the plot', () => {
        const { plan } = vegaLiteStages(radar(undefined, { width: 300, height: 200 }, 1.5));
        const layout = plan.legend.layout!;
        const side = layout.keys.find(Boolean)!.orient as 'right';
        expect(layout.offsets![side]).toBeGreaterThan(20);
    });
});

describe('a key inside a radar', () => {
    it('takes the theme’s next placement: the radar fills its plot', () => {
        const { plan } = vegaLiteStages(radar('nature', { width: 300, height: 300 }, 1.5));
        expect(plan.legend.placement).not.toBe('inside');
    });
});

describe('a radar with a flat top edge', () => {
    it('comes in to its drawing, the key above it no further off than its gap', async () => {
        // Five spokes from twelve o'clock, drawn y-up: a corner at the bottom, an edge across the top
        // with the labels hanging inside it — the square's top band holds nothing.
        const { plan, spec } = vegaLiteStages(radar('cartoon', { width: 300, height: 300 }, 1.5));
        expect(plan.plot.height).toBeLessThan(plan.plot.width);
        const domain = spec.layer[0].encoding.y.scale.domain;
        expect(domain[1]).toBeLessThan(-domain[0]);
        const view = new View(parse(compile(spec).spec), { renderer: 'none' });
        await view.runAsync();
        let top = Infinity;
        const walk = (item: any) => {
            for (const child of item.items ?? []) walk(child);
            if (item.mark && item.mark.role !== 'legend' && !item.mark.role?.startsWith('legend') && item.mark.marktype !== 'group' && item.bounds && item.mark.role === 'mark') top = Math.min(top, item.bounds.y1);
        };
        walk((view as any).scenegraph().root);
        expect(top).toBeGreaterThanOrEqual(-1);
        expect(top).toBeLessThanOrEqual(10);
        // The overhang is read the way the radar is drawn: the bottom spoke's label hangs below.
        expect(plan.legend.layout?.offsets?.top ?? 0).toBeLessThanOrEqual(20);
        view.finalize();
    });
});
