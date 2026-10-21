import { describe, expect, it } from 'vitest';
import { parse, View } from 'vega';
import { compile } from 'vega-lite';
import { generatedVegaLiteCases } from './generated-inputs';
import { openVegaLiteSession } from '../src/vegalite/assemble';
import { readDrawnLayout } from '../src/vegalite/drawn-layout';
import type { ViewNode } from '../src/core/views';

/** The planned views one per drawn view, in draw order. */
function leaves(node: ViewNode): Array<Extract<ViewNode, { kind: 'view' }>> {
    if (node.kind === 'view') return [node];
    if (node.kind === 'facet') return Array.from({ length: node.panels }, () => leaves(node.panel)).flat();
    return node.children.flatMap(leaves);
}

describe('the layout a mounted chart reports', () => {
    // Each view's box, read from the drawn chart, is the planned view's, and the block holds them all.
    it('reads each drawn view and the block, for every chart of several views', async () => {
        const departures: string[] = [];
        for (const { section, testCase, theme, input } of generatedVegaLiteCases()) {
            if (![undefined, 'nyt', 'datawrapper'].includes(theme)) continue;
            const session = openVegaLiteSession(input);
            const planned = session.plan.views;
            if (!planned || planned.kind === 'view') continue;
            const view = new View(parse(compile(session.spec as any).spec as any), { renderer: 'none' });
            await view.runAsync();
            const layout = readDrawnLayout(view, planned);
            view.finalize();
            const expected = leaves(planned);
            const at = `${section} | ${testCase.title} | ${theme ?? 'none'}`;
            if (!layout?.views || layout.views.length !== expected.length) {
                departures.push(`${at}: ${expected.length} views planned, ${layout?.views?.length ?? 0} read`);
                continue;
            }
            layout.views.forEach(({ role, box }, index) => {
                const want = expected[index];
                if (role !== want.role || Math.abs(box.width - want.width) > 0.5 || Math.abs(box.height - want.height) > 0.5) {
                    departures.push(`${at} [${index}]: ${want.role} ${want.width}x${want.height} planned, ${role} ${box.width}x${box.height} read`);
                }
                const block = layout.block!;
                if (box.x < block.x - 0.5 || box.y < block.y - 0.5 || box.x + box.width > block.x + block.width + 0.5 || box.y + box.height > block.y + block.height + 0.5) {
                    departures.push(`${at} [${index}]: box outside the block`);
                }
            });
        }
        expect(departures).toEqual([]);
    }, 300_000);
});

describe('the plot a single-view session reports', () => {
    // A figure label and a source line take their height from the plot where it gives it; the plot
    // the session reports is the one Vega lays out.
    it('is the plot Vega lays out, with a header and a source line', async () => {
        const departures: string[] = [];
        for (const { section, testCase, theme, input } of generatedVegaLiteCases()) {
            if (!['nyt', 'economist', 'datawrapper'].includes(theme as string)) continue;
            const session = openVegaLiteSession({ ...input, chart_spec: { ...input.chart_spec, label: 'Chart 1', source: 'Source: Somewhere official' } });
            if (!session.plot) continue;
            const view = new View(parse(compile(session.spec as any).spec as any), { renderer: 'none' });
            await view.runAsync();
            const height = view.signal('height');
            view.finalize();
            if (Math.abs(session.plot.height - height) > 0.5) departures.push(`${section} | ${testCase.title} | ${theme}: ${session.plot.height} reported, ${height} drawn`);
        }
        expect(departures).toEqual([]);
    }, 120_000);
});
