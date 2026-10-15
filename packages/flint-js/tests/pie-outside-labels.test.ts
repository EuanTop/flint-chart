import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { assembleVegaLite } from '../src/index';

const BROWSERS = [
    { Browser: 'Chrome', Share: 65 }, { Browser: 'Safari', Share: 12 }, { Browser: 'Edge', Share: 12 },
    { Browser: 'Firefox', Share: 6 }, { Browser: 'Other', Share: 5 },
];

describe('a pie that prints its values outside', () => {
    it('keeps them on its plot, clear of a key above it', async () => {
        // Swiss, McKinsey and Cartoon print values outside and set the key above the plot: a pie
        // that filled its square hung the small top slice's label onto the key.
        for (const theme of ['swiss', 'mckinsey', 'cartoon']) {
            const spec: any = assembleVegaLite({
                data: { values: BROWSERS },
                semantic_types: { Browser: 'Category', Share: 'Percentage' },
                chart_spec: { chartType: 'Pie Chart', title: 'Chrome holds two-thirds of the desktop market', encodings: { color: 'Browser', size: 'Share' }, baseSize: { width: 340, height: 230 } },
                theme_spec: theme,
            } as any);
            const { _theme, _canvasFit, _legendLayout, ...vl } = spec;
            const view = new View(parse(compile(vl).spec), { renderer: 'none' });
            await view.runAsync();
            const labels: any[] = [];
            const keys: any[] = [];
            const walk = (item: any) => {
                if (!item) return;
                for (const child of item.items ?? []) walk(child);
                if (item.mark?.marktype === 'text' && item.mark.role === 'mark' && item.text != null) labels.push(item.bounds);
                if (item.marktype === 'group' && item.role === 'legend') keys.push(item.bounds);
            };
            walk((view as any).scenegraph().root);
            expect(labels.length, theme).toBeGreaterThan(0);
            for (const b of labels) {
                expect(b.y1, theme).toBeGreaterThanOrEqual(-1);
                expect(b.y2, theme).toBeLessThanOrEqual(view.height() + 1);
                expect(keys.some((k) => b.x1 < k.x2 && b.x2 > k.x1 && b.y1 < k.y2 && b.y2 > k.y1), theme).toBe(false);
            }
            view.finalize();
        }
    });
});

describe('a pie sized by where its numbers fall', () => {
    const pie = (theme: string) => assembleVegaLite({
        data: { values: BROWSERS },
        semantic_types: { Browser: 'Category', Share: 'Percentage' },
        chart_spec: { chartType: 'Pie Chart', title: 'Desktop browser market share, 2024', encodings: { color: 'Browser', size: 'Share' }, baseSize: { width: 300, height: 200 } },
        theme_spec: theme,
    } as any) as any;

    it('takes room only on the sides that hold a number, and the plot comes in to the drawing', async () => {
        // No slice ends at the bottom, so no number stands there: the plot ends at the pie's rim.
        for (const theme of ['swiss', 'cartoon']) {
            const { _theme, _canvasFit, _legendLayout, ...vl } = pie(theme);
            const arc = vl.layer.find((unit: any) => unit.mark?.type === 'arc').mark;
            expect(typeof arc.x, theme).toBe('number');
            expect(vl.height, theme).toBeLessThan(vl.width);
            const view = new View(parse(compile(vl).spec), { renderer: 'none' });
            await view.runAsync();
            const drawn = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
            const walk = (item: any) => {
                for (const child of item.items ?? []) walk(child);
                const shown = item.mark?.marktype === 'arc' || (item.mark?.marktype === 'text' && item.mark.role === 'mark' && item.opacity !== 0);
                if (shown && item.bounds) {
                    drawn.x1 = Math.min(drawn.x1, item.bounds.x1); drawn.x2 = Math.max(drawn.x2, item.bounds.x2);
                    drawn.y1 = Math.min(drawn.y1, item.bounds.y1); drawn.y2 = Math.max(drawn.y2, item.bounds.y2);
                }
            };
            walk((view as any).scenegraph().root);
            for (const slack of [drawn.y1, view.height() - drawn.y2]) {
                expect(slack, theme).toBeGreaterThanOrEqual(-1);
                expect(slack, theme).toBeLessThanOrEqual(10);
            }
            view.finalize();
        }
    });
});

describe('a value printed on a slice', () => {
    // Mixed order and a repeated value, so a label stacked by its own text lands elsewhere.
    const ROWS = [['Beta', 9], ['Alpha', 40], ['Delta', 21], ['Gamma', 30], ['Epsilon', 9]].map(([Name, Share]) => ({ Name, Share }));
    const onTheirSlices = async (encodings: Record<string, string>, chartProperties?: Record<string, unknown>) => {
        const { _theme, _canvasFit, _legendLayout, ...vl } = assembleVegaLite({
            data: { values: ROWS },
            semantic_types: { Name: 'Category', Share: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', title: 'Shares', encodings, baseSize: { width: 300, height: 300 }, ...(chartProperties ? { chartProperties } : {}) },
            theme_spec: 'swiss',
        } as any) as any;
        const view = new View(parse(compile(vl).spec), { renderer: 'none' });
        await view.runAsync();
        const slices = new Map<string, [number, number]>();
        const labels: Array<[string, number]> = [];
        const walk = (item: any) => {
            if (item.mark?.marktype === 'arc' && item.mark.role === 'mark') slices.set(item.datum.Name, [Math.min(item.startAngle, item.endAngle), Math.max(item.startAngle, item.endAngle)]);
            if (item.mark?.marktype === 'text' && item.mark.role === 'mark' && item.opacity !== 0 && typeof item.theta === 'number') labels.push([item.datum.Name, item.theta]);
            for (const child of item.items ?? []) walk(child);
        };
        walk((view as any).scenegraph().root);
        view.finalize();
        expect(labels.length).toBeGreaterThan(0);
        for (const [name, theta] of labels) {
            const [from, to] = slices.get(name)!;
            expect(theta, name).toBeGreaterThanOrEqual(from - 1e-6);
            expect(theta, name).toBeLessThanOrEqual(to + 1e-6);
        }
    };

    it('sits on its own slice, whether or not a colour names the slices, in data order or sorted', async () => {
        await onTheirSlices({ size: 'Share', color: 'Name' });
        await onTheirSlices({ size: 'Share' });
        await onTheirSlices({ size: 'Share' }, { sortSlices: 'ascending' });
        await onTheirSlices({ size: 'Share', color: 'Name' }, { sortSlices: 'descending' });
    });
});
