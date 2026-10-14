import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import { parse, View } from 'vega';
import { assembleVegaLite } from '../src';

const nodes = (spec: any, type: string): any[] => {
    const out: any[] = [];
    const visit = (n: any) => {
        if (!n || typeof n !== 'object') return;
        if ((typeof n.mark === 'string' ? n.mark : n.mark?.type) === type) out.push(n);
        for (const c of [...(n.layer ?? []), ...(n.vconcat ?? []), ...(n.hconcat ?? []), n.spec].filter(Boolean)) visit(c);
    };
    visit(spec);
    return out;
};

const MIX = [2019, 2020, 2021, 2022].flatMap((Year, i) => ['Coal', 'Gas', 'Wind'].map((Source, s) => ({ Year, Source, TWh: 30 + i * 4 + s * 7 })));
const stackedArea = (theme: unknown) => assembleVegaLite({
    data: { values: MIX }, semantic_types: { Year: 'Year', Source: 'Category', TWh: 'Quantity' },
    chart_spec: { chartType: 'Area Chart', encodings: { x: 'Year', y: 'TWh', color: 'Source' } },
    theme_spec: theme,
} as any) as any;
const stackedBars = (theme: unknown) => assembleVegaLite({
    data: { values: MIX }, semantic_types: { Year: 'Category', Source: 'Category', TWh: 'Quantity' },
    chart_spec: { chartType: 'Stacked Bar Chart', encodings: { x: 'Year', y: 'TWh', color: 'Source' } },
    theme_spec: theme,
} as any) as any;

describe('M1: an area’s edge is its own line', () => {
    const EDGE = { id: 'edge', geometry: { area: { opacity: 0.2, edge: 'full', edgeWidth: 2 } } };

    it('draws a line along each stacked band, in the band’s own ink', () => {
        const [area] = nodes(stackedArea(EDGE), 'area');
        expect(area.mark.line).toEqual(expect.objectContaining({ strokeWidth: 2 }));
    });

    it('no longer outlines bars with the area’s edge', () => {
        const spec = stackedBars(EDGE);
        for (const bar of nodes(spec, 'bar')) expect(bar.mark.stroke).toBeUndefined();
        expect(spec.config.arc?.stroke).toBeUndefined();
    });

    it('draws no edge where the house omits it, and leaves a house’s bar outline alone', () => {
        const [area] = nodes(stackedArea({ id: 'none', geometry: { area: { edge: 'omit' } } }), 'area');
        expect(area.mark.line).toBeUndefined();
        const outlined = stackedBars({ id: 'o', geometry: { band: { outline: 'full', outlineWidth: 1 } } });
        expect(nodes(outlined, 'bar').some((bar: any) => bar.mark.stroke)).toBe(true);
    });
});

describe('M2: a bar’s fill and its edge', () => {
    const bars = (theme: unknown) => assembleVegaLite({
        data: { values: [{ C: 'A', V: 3 }, { C: 'B', V: 5 }, { C: 'C', V: 4 }] },
        semantic_types: { C: 'Category', V: 'Quantity' },
        chart_spec: { chartType: 'Bar Chart', encodings: { x: 'C', y: 'V' }, baseSize: { width: 300, height: 200 } },
        theme_spec: theme,
    } as any) as any;

    it('draws `band.opacity` on bars, and keeps an area’s opacity for areas', () => {
        const spec = bars({ id: 'op', geometry: { band: { opacity: 0.6 }, area: { opacity: 0.2 } } });
        expect(spec.config.bar.fillOpacity).toBe(0.6);
        expect(stackedArea({ id: 'op', geometry: { area: { opacity: 0.2 } } }).config.area.fillOpacity).toBe(0.2);
        expect(stackedArea({ id: 'op', geometry: { band: { opacity: 0.6 } } }).config.area?.fillOpacity).toBeUndefined();
    });

    it('edges each bar in its own series ink with `outlineInk: "series"`', () => {
        const theme = { id: 'edge', geometry: { band: { opacity: 0.2, outline: 'full', outlineWidth: 1, outlineInk: 'series' } } };
        const [single] = nodes(bars({ ...theme, ink: { series: { single: '#617ae2' } } }), 'bar');
        expect(single.mark.stroke).toBe('#617ae2');
        const stacked = stackedBars(theme);
        const bar = nodes(stacked, 'bar').find((n: any) => n.encoding?.stroke);
        expect(bar.encoding.stroke.field).toBe('Source');
        expect(bar.encoding.stroke.legend).toBeNull();
        expect(stacked.config.arc?.stroke).toBeUndefined();
    });

    it('leaves bars opaque, as before, where the house states no band opacity', () => {
        expect(bars({ id: 'plain', geometry: { area: { opacity: 0.3 } } }).config.bar?.fillOpacity).toBeUndefined();
    });
});

describe('M5: dots on lines', () => {
    const line = (n: number, theme: unknown, width = 600) => assembleVegaLite({
        data: { values: Array.from({ length: n }, (_, i) => ({ Year: 2000 + i, V: 10 + (i % 5) })) },
        semantic_types: { Year: 'Year', V: 'Quantity' },
        chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'V' }, baseSize: { width, height: 240 } },
        theme_spec: theme,
    } as any) as any;
    const lineMark = (spec: any) => nodes(spec, 'line')[0]?.mark;

    it('keeps the countable dozen by default, and every reading where the house says `all`', () => {
        const countable = { id: 'c', geometry: { point: { presence: 'full', size: 30 } } };
        expect(lineMark(line(14, countable)).point).toBe(false);
        const every = { id: 'a', geometry: { point: { presence: 'full', size: 30, density: 'all' } } };
        expect(lineMark(line(14, every)).point).not.toBe(false);
    });

    it('draws `sparse` dots only where readings stand 20px apart', () => {
        const sparse = { id: 's', geometry: { point: { presence: 'full', size: 30, density: 'sparse' } } };
        expect(lineMark(line(6, sparse)).point).not.toBe(false);
        expect(lineMark(line(10, sparse, 160)).point).toBe(false);
    });

    it('draws hollow end markers for a house with hollow dots', () => {
        const spec = line(30, { id: 'h', geometry: { point: { presence: 'omit', fill: 'hollow' } }, annotation: { pointEmphasis: 'endpoints' } });
        const end = nodes(spec, 'point').find((n: any) => n.__themeSynthetic);
        expect(end.mark.filled).toBe(false);
        expect(end.mark.fill).toBeDefined();
    });
});

describe('M6: a bar too short to see keeps a stub', () => {
    const columns = (theme: unknown) => assembleVegaLite({
        data: { values: [{ C: 'A', V: 1000 }, { C: 'B', V: 2 }, { C: 'C', V: 0 }, { C: 'D', V: -1 }] },
        semantic_types: { C: 'Category', V: 'Quantity' },
        chart_spec: { chartType: 'Bar Chart', encodings: { x: 'C', y: 'V' }, baseSize: { width: 300, height: 200 } },
        theme_spec: theme,
    } as any) as any;

    it('draws every non-zero bar at least the least length, and leaves zero empty', async () => {
        const spec = columns({ id: 'min', geometry: { band: { minLength: 3 } } });
        const view = new View(parse(compile(spec).spec), { renderer: 'none' });
        await view.runAsync();
        const heights = new Map<string, number>();
        const visit = (item: any) => {
            if (item.mark?.marktype === 'rect' && item.mark.role === 'mark' && item.datum?.C) {
                const h = Math.abs((item.y2 ?? item.y) - item.y) || item.height || 0;
                heights.set(item.datum.C, Math.max(heights.get(item.datum.C) ?? 0, h));
            }
            for (const c of item.items ?? []) visit(c);
        };
        visit((view.scenegraph() as any).root);
        view.finalize();
        expect(heights.get('B')).toBeGreaterThanOrEqual(3 - 0.01);
        expect(heights.get('D')).toBeGreaterThanOrEqual(3 - 0.01);
        expect(heights.get('C') ?? 0).toBeLessThan(0.5);
    });

    it('adds nothing for a house that states no least length', () => {
        expect(nodes(columns({ id: 'none' }), 'bar').filter((n: any) => n.__themeSynthetic)).toHaveLength(0);
    });
});

describe('M4: the house’s wedge rules', () => {
    const SHARES = [{ B: 'Safari', S: 19 }, { B: 'Chrome', S: 64 }, { B: 'Edge', S: 5 }, { B: 'Firefox', S: 3 }, { B: 'Other', S: 9 }];
    const pie = (arc: Record<string, unknown> | undefined, chartType = 'Pie Chart', labels = false) => assembleVegaLite({
        data: { values: SHARES }, semantic_types: { B: 'Category', S: 'Quantity' },
        chart_spec: { chartType, encodings: { color: 'B', size: 'S' }, baseSize: { width: 300, height: 300 }, ...(labels ? { chartProperties: { showValueLabels: true } } : {}) },
        theme_spec: { id: 'pie', ...(arc ? { geometry: { arc } } : {}), ...(labels ? { dataLabels: { show: 'always' } } : {}) },
    } as any) as any;
    /** Each wedge's start angle (radians, from 12 o'clock), by name. */
    const angles = async (spec: any) => {
        const view = new View(parse(compile(spec).spec), { renderer: 'none' });
        await view.runAsync();
        const out = new Map<string, number>();
        const visit = (item: any) => {
            if (item.mark?.marktype === 'arc' && item.mark.role === 'mark' && item.datum?.B) out.set(item.datum.B, Math.min(item.startAngle, item.endAngle));
            for (const c of item.items ?? []) visit(c);
        };
        visit((view.scenegraph() as any).root);
        view.finalize();
        return out;
    };
    const order = (m: Map<string, number>) => [...m.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);

    it('runs the wedges in the data’s order from 12 o’clock', async () => {
        expect(order(await angles(pie({ order: 'data' })))).toEqual(['Safari', 'Chrome', 'Edge', 'Firefox', 'Other']);
    });

    it('runs them largest first, the key in the same order, and keeps it with labels on', async () => {
        const spec = pie({ order: 'largestFirst' }, 'Pie Chart', true);
        expect(order(await angles(spec))).toEqual(['Chrome', 'Safari', 'Other', 'Edge', 'Firefox']);
        const colour = [spec, ...(spec.layer ?? [])].map((n: any) => n.encoding?.color).find((c: any) => c?.field);
        expect(colour.scale.domain).toEqual(['Chrome', 'Safari', 'Other', 'Edge', 'Firefox']);
    });

    it('starts the first wedge where the house says, and sizes the hole as a share of the radius', async () => {
        const start = await angles(pie({ order: 'data', startAngle: 90 }));
        expect(start.get('Safari')).toBeCloseTo(Math.PI / 2, 3);
        const donut = pie({ hole: 0.6 }, 'Donut Chart');
        const arc = [donut, ...(donut.layer ?? [])].find((n: any) => (n.mark?.type ?? n.mark) === 'arc');
        expect(arc.mark.innerRadius).toBe(Math.round(arc.mark.outerRadius * 0.6));
    });

    it('runs wedges in the data’s order by default, themed or not (M3)', async () => {
        expect(order(await angles(pie(undefined)))).toEqual(['Safari', 'Chrome', 'Edge', 'Firefox', 'Other']);
        const plain: any = assembleVegaLite({
            data: { values: SHARES }, semantic_types: { B: 'Category', S: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'B', size: 'S' }, baseSize: { width: 300, height: 300 } },
        } as any);
        expect(order(await angles(plain))).toEqual(['Safari', 'Chrome', 'Edge', 'Firefox', 'Other']);
    });

    it('keeps a chart’s own slice sort over the house’s order', async () => {
        const spec: any = assembleVegaLite({
            data: { values: SHARES }, semantic_types: { B: 'Category', S: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'B', size: 'S' }, baseSize: { width: 300, height: 300 }, chartProperties: { sortSlices: 'ascending' } },
            theme_spec: { id: 'pie', geometry: { arc: { order: 'largestFirst' } } },
        } as any);
        expect(order(await angles(spec))[0]).toBe('Firefox');
    });
});

describe('M3: dashes and shapes follow the colours’ order', () => {
    it('gives the first series in the data the first dash, whatever its name', () => {
        const rows = ['Norway', 'China', 'Germany'].flatMap((Country, c) => [2020, 2021, 2022].map((Year, i) => ({ Year, Country, V: 10 + c * 5 + i })));
        const spec: any = assembleVegaLite({
            data: { values: rows }, semantic_types: { Year: 'Year', Country: 'Country', V: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'V', color: 'Country' } },
            theme_spec: { id: 'dash', marks: { redundantEncoding: 'always', redundantChannels: ['dash'] } },
        } as any);
        const line = nodes(spec, 'line')[0];
        const enc = { ...(spec.encoding ?? {}), ...(line.encoding ?? {}) };
        expect(enc.strokeDash.sort).toEqual(enc.color.sort);
    });
});
