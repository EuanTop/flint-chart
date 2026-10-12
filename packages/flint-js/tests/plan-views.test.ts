import { describe, expect, it } from 'vitest';
import { parse, View } from 'vega';
import { compile } from 'vega-lite';
import { generatedVegaLiteCases } from './generated-inputs';
import { openVegaLiteSession } from '../src/vegalite/assemble';
import type { ViewNode } from '../src/core/views';

/** Charts that draw other views than the plan states, and why; an entry no case uses fails. */
const KNOWN: Array<{ title: string; themes?: Array<string | undefined>; reason: string }> = [];

const near = (a: number, b: number) => Math.abs(a - b) <= 0.5;

/** Groups under a group item, looking through wrappers up to `depth` levels. */
function groupsUnder(item: any, test: (mark: any) => boolean, depth: number): any[] {
    const out: any[] = [];
    for (const mark of (item.items ?? []).filter((child: any) => child.marktype === 'group')) {
        if (test(mark)) out.push(mark);
        else if (depth > 0) for (const child of mark.items ?? []) out.push(...groupsUnder(child, test, depth - 1));
    }
    return out;
}

/** Where the drawn views differ from the planned ones: each view's plot size, the panel and view counts. */
function drawnDepartures(node: ViewNode, item: any, path: string, out: string[]): void {
    if (node.kind === 'view') {
        if (!near(item.width ?? 0, node.width) || !near(item.height ?? 0, node.height)) {
            out.push(`${path}: ${node.width}x${node.height} planned, ${item.width}x${item.height} drawn`);
        }
        return;
    }
    if (node.kind === 'facet') {
        const cells = groupsUnder(item, (mark) => /cell$/.test(mark.name ?? ''), 3).flatMap((mark) => mark.items ?? []);
        if (cells.length !== node.panels) {
            out.push(`${path}: ${node.panels} panels planned, ${cells.length} drawn`);
            return;
        }
        const across = new Set(cells.map((cell: any) => Math.round(cell.x))).size;
        const down = new Set(cells.map((cell: any) => Math.round(cell.y))).size;
        if (across !== Math.min(node.columns, node.panels) || down !== node.rows) out.push(`${path}: ${node.columns}x${node.rows} grid planned, ${across}x${down} drawn`);
        cells.forEach((cell: any, index: number) => drawnDepartures(node.panel, cell, `${path}.panel[${index}]`, out));
        return;
    }
    const children = groupsUnder(item, (mark) => /_group$/.test(mark.name ?? '') && mark.role === 'scope', 0).flatMap((mark) => mark.items ?? []);
    if (children.length !== node.children.length) {
        out.push(`${path}: ${node.children.length} views planned, ${children.length} drawn`);
        return;
    }
    node.children.forEach((child, index) => drawnDepartures(child, children[index], `${path}[${index}]`, out));
}

/** The facets and concats of a tree, outermost first, as Vega lays them out. */
function layoutsOf(node: ViewNode): Array<Exclude<ViewNode, { kind: 'view' }>> {
    if (node.kind === 'view') return [];
    if (node.kind === 'facet') return [node, ...layoutsOf(node.panel)];
    return [node, ...node.children.flatMap(layoutsOf)];
}

/** Where the gaps Vega keeps between views' bounds, its layout padding, differ from the planned gaps. */
function gapDepartures(views: ViewNode, vega: any, out: string[]): void {
    const drawn: any[] = [];
    const walk = (node: any): void => {
        if (node.layout) drawn.push(node.layout.padding);
        for (const mark of node.marks ?? []) if (mark.type === 'group') walk(mark);
    };
    walk(vega);
    const planned = layoutsOf(views);
    if (planned.length !== drawn.length) {
        out.push(`${planned.length} layouts planned, ${drawn.length} drawn`);
        return;
    }
    planned.forEach((node, index) => {
        const padding = drawn[index];
        const pad = typeof padding === 'number' ? { row: padding, column: padding } : { row: padding?.row ?? 0, column: padding?.column ?? 0 };
        const ok = node.kind === 'facet'
            ? near(pad.row, node.gap.row) && near(pad.column, node.gap.column)
            : near(node.direction === 'row' ? pad.column : pad.row, node.gap);
        if (!ok) out.push(`layout ${index}: gap ${JSON.stringify(node.gap)} planned, ${JSON.stringify(padding)} drawn`);
    });
}

describe('the views as drawn', () => {
    // Each chart of several views draws the views, sizes and gaps the plan states, read from Vega's scenegraph and layout.
    it('draws the planned views, for every test case and theme', async () => {
        const departures: string[] = [];
        const used = new Set<(typeof KNOWN)[number]>();
        for (const { section, testCase, theme, input } of generatedVegaLiteCases()) {
            const session = openVegaLiteSession(input);
            const views = session.plan.views;
            if (!views || views.kind === 'view') continue;
            const vega = compile(session.spec as any).spec as any;
            const view = new View(parse(structuredClone(vega)), { renderer: 'none' });
            await view.runAsync();
            const found: string[] = [];
            drawnDepartures(views, (view.scenegraph() as any).root.items[0], '$', found);
            gapDepartures(views, vega, found);
            view.finalize();
            if (!found.length) continue;
            const known = KNOWN.find((entry) => entry.title === testCase.title && (!entry.themes || entry.themes.includes(theme)));
            if (known) {
                used.add(known);
                continue;
            }
            departures.push(`${section} | ${testCase.title} | ${theme ?? 'none'} | ${found.slice(0, 3).join('; ')}`);
        }
        expect(departures).toEqual([]);
        expect(KNOWN.filter((entry) => !used.has(entry))).toEqual([]);
    }, 900_000);
});
