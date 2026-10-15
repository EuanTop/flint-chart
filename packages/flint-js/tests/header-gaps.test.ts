// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { gapEase, keyGap, keyGaps, headerInnerGap, keyRowGap, keyStackGap } from '../src/core/header-gaps';
import { assembleVegaLite } from '../src/vegalite/assemble';
import { vegaLiteStages } from '../src/vegalite/assemble';

/**
 * A key stands an em of its type from the plot, by the house's density; a title over keys above
 * the plot makes one header block with them, one rhythm through it, the title's own gap below.
 * Every gap eases with the plot's size, and a theme may set each.
 */

const institutions = ['Small business', 'Scientists', 'The military', 'The police', 'The Supreme Court', 'The press', 'Congress'];
const answers = ['A great deal', 'Some', 'Not much', 'None at all'];
const likert = (theme?: string | object, title = 'Confidence in US institutions') => ({
    data: { values: institutions.flatMap((Institution, i) => answers.map((Answer, k) => ({ Institution, Answer, Share: 10 + ((i + k) % 4) * 10 }))) },
    semantic_types: { Institution: 'Category', Answer: 'Category', Share: 'Percentage' },
    chart_spec: {
        chartType: 'Stacked Bar Chart', encodings: { x: 'Share', y: 'Institution', color: 'Answer' },
        baseSize: { width: 300, height: 260 }, ...(title ? { title } : {}),
    },
    ...(theme ? { theme_spec: theme } : {}),
    options: { canvasFit: 'off' },
}) as any;

/** The drawn bounds of the title and keys, and the plot's top, in the drawing's coordinates. */
async function drawnHeader(spec: any): Promise<{ title?: { y2: number }; keys: Array<{ y1: number; y2: number }> }> {
    const view = new View(parse(compile(spec).spec), { renderer: 'none' });
    await view.runAsync();
    const out: { title?: { y2: number }; keys: Array<{ y1: number; y2: number }> } = { keys: [] };
    const walk = (node: any, dy: number) => {
        for (const item of node?.items ?? []) {
            const role = item.mark?.role;
            if (role === 'title' && item.bounds) out.title = { y2: item.bounds.y2 + dy };
            if (role === 'legend' && item.bounds) out.keys.push({ y1: item.bounds.y1 + dy, y2: item.bounds.y2 + dy });
            if (item.items) walk(item, item.mark?.marktype === 'group' ? (item.y ?? 0) + dy : dy);
        }
    };
    walk((view.scenegraph() as any).root, 0);
    view.finalize();
    return out;
}

describe('key gaps', () => {
    it('stand an em of the keys’ type from the plot, by the house’s density', () => {
        expect(keyGap(11)).toBe(11);
        expect(keyGap(11, 'compact')).toBe(9);
        expect(keyGap(11, 'airy')).toBe(15);
        expect(keyGap(2)).toBeGreaterThanOrEqual(6);
    });

    it('move the title’s gap below keys standing under it, the title half an em over them', () => {
        const gaps = keyGaps({ labelFontSize: 12, titled: true, topKeys: true, titleGap: 15 });
        expect(gaps.offsets.top).toBe(15);
        expect(gaps.offsets.right).toBe(12);
        expect(gaps.headerGap).toBe(headerInnerGap(12));
        expect(keyGaps({ labelFontSize: 12, titled: false, topKeys: true, titleGap: 15 }).headerGap).toBeUndefined();
        expect(keyGaps({ labelFontSize: 12, titled: true, topKeys: false, titleGap: 15 }).offsets.top).toBe(12);
    });

    it('keep one rhythm through the header: the title to the keys as one key to the next', () => {
        for (const size of [9, 10, 11, 12, 14]) for (const side of [120, 200, 300, 450]) {
            expect(headerInnerGap(size, side)).toBe(keyStackGap(size, side));
        }
        expect(keyStackGap(11, 300)).toBe(6);
        expect(keyRowGap(11, 300)).toBeGreaterThan(keyStackGap(11, 300));
    });

    it('ease with the plot: closer on a small tile, a little more air on a large chart', () => {
        expect(gapEase(150)).toBe(0.75);
        expect(gapEase(300)).toBe(1);
        expect(gapEase(600)).toBe(1.25);
        expect(keyStackGap(11, 180)).toBeLessThan(keyStackGap(11, 300));
        expect(keyStackGap(11, 450)).toBeGreaterThan(keyStackGap(11, 300));
        expect(keyGap(11, 'normal', 180)).toBeLessThan(keyGap(11, 'normal', 450));
    });

    it('take a theme’s own gaps, each apart', () => {
        const spec = { title: 1, stack: 0.25, row: 2, plot: 0.5 };
        expect(headerInnerGap(12, 300, spec)).toBe(12);
        expect(keyStackGap(12, 300, spec)).toBe(4);
        expect(keyRowGap(12, 300, spec)).toBe(24);
        expect(keyGap(12, 'normal', 300, spec)).toBe(6);
    });

    it('hold an edge clear of what stands there', () => {
        expect(keyGaps({ labelFontSize: 11, titled: false, topKeys: true, titleGap: 15, atLeast: { top: 40 } }).offsets.top).toBe(40);
    });
});

describe('the header block', () => {
    it('draws the keys under a title at the header’s rhythm, and the title’s gap between them and the plot', async () => {
        const { plan, spec } = vegaLiteStages(likert('datawrapper'));
        const layout = plan.legend.layout!;
        expect(layout.footprint.some((edge) => edge.orient === 'top')).toBe(true);
        expect(layout.headerGap).toBeDefined();
        expect(spec.config.title.offset).toBe(layout.headerGap);
        const header = await drawnHeader(spec);
        const key = header.keys[0];
        expect(Math.abs(key.y1 - header.title!.y2 - layout.headerGap!)).toBeLessThanOrEqual(2);
        // The plot's top is 0: the keys stand the title's gap above it.
        expect(Math.abs(-key.y2 - layout.offsets!.top)).toBeLessThanOrEqual(2);
    });

    it('draws a theme’s own gaps', async () => {
        const gaps = { title: 1.5, plot: 2 };
        const { plan, spec } = vegaLiteStages(likert({ extends: 'datawrapper', legend: { gaps } }));
        const layout = plan.legend.layout!;
        const key = layout.keys.find(Boolean)!;
        const side = Math.min(layout.plot.width, layout.plot.height);
        expect(layout.headerGap).toBe(headerInnerGap(key.labelFontSize, side, gaps));
        const header = await drawnHeader(spec);
        expect(Math.abs(header.keys[0].y1 - header.title!.y2 - layout.headerGap!)).toBeLessThanOrEqual(2);
    });

    it('keeps a key beside the plot an em away, and reserves what it draws', () => {
        const { plan, spec } = vegaLiteStages(likert(undefined));
        const layout = plan.legend.layout!;
        const side = layout.keys.find((key) => key?.orient === 'right');
        expect(side).toBeDefined();
        const legend = spec.encoding?.color?.legend ?? spec.layer?.find((layer: any) => layer.encoding?.color)?.encoding.color.legend;
        expect(legend.offset).toBe(layout.offsets!.right);
        expect(layout.offsets!.right).toBe(keyGap(side!.labelFontSize, 'normal', Math.min(layout.plot.width, layout.plot.height)));
    });
});

describe('a pie in a plot a broken title shortened', () => {
    it('keeps its wedges, hole and labels inside the plot', () => {
        const spec: any = assembleVegaLite({
            data: { values: [{ OS: 'Android', Share: 71 }, { OS: 'iOS', Share: 28 }, { OS: 'Other', Share: 1 }] },
            semantic_types: { OS: 'Category', Share: 'Quantity' },
            chart_spec: {
                chartType: 'Donut Chart', encodings: { size: 'Share', color: 'OS' },
                title: 'Mobile OS market share, 2024', subtitle: 'Share of mobile operating systems worldwide',
                baseSize: { width: 200, height: 200 }, canvasSize: { width: 240, height: 240 },
            },
            theme_spec: 'pop',
        } as any);
        const find = (node: any): any => (node?.mark && (node.mark.type ?? node.mark) === 'arc' ? node : (node?.layer ?? []).map(find).find(Boolean));
        const host = [spec, ...(spec.vconcat ?? []), ...(spec.hconcat ?? [])].find((node: any) => typeof node.height === 'number' && find(node));
        const arc = find(host);
        expect(arc.mark.outerRadius).toBeLessThanOrEqual(Math.min(host.width, host.height) / 2);
        if (typeof arc.mark.innerRadius === 'number') expect(arc.mark.innerRadius).toBeLessThan(arc.mark.outerRadius);
    });
});
